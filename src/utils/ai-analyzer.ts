import OpenAI from 'openai';
import { TestInfo } from '@playwright/test';
import { config } from '../../config/env.config';
import { getLogger } from './logger';
import * as fs from 'fs';

const log = getLogger('AIErrorAnalyzer');

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type FailureCategory =
  | 'LOCATOR_ISSUE'
  | 'TIMING_ISSUE'
  | 'DATA_ISSUE'
  | 'ENV_ISSUE'
  | 'ASSERTION_ISSUE'
  | 'NETWORK_ISSUE'
  | 'AUTH_ISSUE'
  | 'UNKNOWN';

export interface TestFailureContext {
  testName: string;
  testFile: string;
  errorMessage: string;
  stackTrace: string;
  pageUrl?: string;
  tags?: string[];
  retryCount: number;
  screenshotPath?: string;
  duration?: number;
}

export interface AIAnalysisResult {
  likelyCause: string;
  failureCategory: FailureCategory;
  suggestedFix: string;
  isLikelyFlaky: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  additionalNotes?: string;
}

// ─────────────────────────────────────────────
// Framework Context Prompt
// Pre-written system context sent with every analysis request.
// This is what makes AI responses relevant to OUR framework specifically.
// ─────────────────────────────────────────────
const FRAMEWORK_SYSTEM_PROMPT = `
You are a senior QA automation engineer specializing in Playwright + TypeScript frameworks.
You are analyzing test failures in a CRM Admin Panel automation suite.

=== FRAMEWORK CONTEXT ===
Application: GoKwik CRM Admin Panel — Products Module
Environment: QA (https://qa-mdashboard.dev.gokwik.in)
Tech Stack: Playwright 1.44, TypeScript 5.4, Page Object Model, Cucumber BDD + Playwright Spec hybrid

=== APPLICATION BEHAVIOR (KNOWN DYNAMIC ELEMENTS) ===
- Auth flow: Email → Password → OTP (hardcoded: 123456) → Dashboard → Merchant switch from top-right dropdown
- Merchant switch: Must select merchant ID "19h577u3p4be" before any product operation
- Loading: Full-page spinner appears on every navigation/page transition
- Toasts: Success/error toast notifications auto-dismiss in ~3 seconds — narrow capture window
- Search: Debounced input (~300ms) — typing triggers network call after delay
- Product listing: Table re-renders after API response — wait for specific row, not just table
- Product URL: /gk-pages/store/{merchantId}/products/{productId} — productId extracted from URL after creation
- Delete API: DELETE /bulk endpoint with storeId (merchantId) and productId in payload
- Auth token: Bearer token extracted from login API response or browser localStorage

=== FRAMEWORK ARCHITECTURE ===
- All locators are XPath-based and stored in Page Object classes (not in test files)
- Custom wait helpers: waitForSpinnerToDisappear, waitForToastMessage, waitForTableRowWithText
- Fixtures: auth.fixture (login + merchant switch), product.fixture (create via UI, delete via API)
- Network interceptor: captureBearerToken, mockApiResponse, simulateNetworkFailure
- AI analysis triggers only on FINAL failure (after all retries exhausted)

=== COMMON FAILURE PATTERNS IN THIS APP ===
1. TIMING_ISSUE: Spinner not waited for after merchant switch — element interaction blocked by overlay
2. TIMING_ISSUE: Toast captured too late — already dismissed before assertion
3. LOCATOR_ISSUE: XPath placeholder not replaced with actual selector (marked with //XPATH_ prefix)
4. AUTH_ISSUE: Bearer token not captured before product fixture makes API delete call
5. DATA_ISSUE: Product name collision — timestamp suffix missing, duplicate creation rejected
6. NETWORK_ISSUE: QA environment intermittent downtime — 503/504 responses

=== YOUR TASK ===
Analyze the test failure and return ONLY a valid JSON object (no prose, no markdown, no backticks).
Schema:
{
  "likelyCause": "string — specific, actionable explanation of what likely caused this failure",
  "failureCategory": "LOCATOR_ISSUE | TIMING_ISSUE | DATA_ISSUE | ENV_ISSUE | ASSERTION_ISSUE | NETWORK_ISSUE | AUTH_ISSUE | UNKNOWN",
  "suggestedFix": "string — exact code change or action to fix this",
  "isLikelyFlaky": boolean,
  "confidence": "HIGH | MEDIUM | LOW",
  "priority": "HIGH | MEDIUM | LOW",
  "additionalNotes": "string | null — any other relevant observations"
}
`.trim();

// ─────────────────────────────────────────────
// AI Error Analyzer Class
// ─────────────────────────────────────────────
export class AIErrorAnalyzer {
  private client: OpenAI | null = null;
  private readonly model = 'gpt-4o-mini';

  constructor() {
    if (config.openAiApiKey) {
      this.client = new OpenAI({ apiKey: config.openAiApiKey });
    } else {
      log.warn('OpenAI API key not configured — AI analysis disabled');
    }
  }

  /**
   * Determines whether AI analysis should run.
   * Only triggers on FINAL failure (all retries exhausted).
   */
  shouldAnalyze(testInfo: TestInfo): boolean {
    if (!this.client) return false;

    const isLastRetry = testInfo.retry === testInfo.project.retries;
    const hasFailed = testInfo.status === 'failed' || testInfo.status === 'timedOut';

    return isLastRetry && hasFailed;
  }

  /**
   * Core analysis method — sends failure context to GPT-4o-mini.
   * Returns structured analysis result.
   */
  async analyzeFailure(context: TestFailureContext): Promise<AIAnalysisResult | null> {
    if (!this.client) return null;

    try {
      log.info(`Running AI analysis for: "${context.testName}"`);

      const userPrompt = this.buildUserPrompt(context);

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 600,
        temperature: 0.2, // Low temperature for consistent, factual output
        messages: [
          { role: 'system', content: FRAMEWORK_SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
      });

      const rawContent = response.choices[0]?.message?.content ?? '';
      const result = this.parseResponse(rawContent);

      log.info(`AI analysis complete — Category: ${result.failureCategory}, Confidence: ${result.confidence}`);
      return result;

    } catch (error) {
      log.error('AI analysis failed — proceeding without it', { error });
      return null; // Non-blocking — test run continues
    }
  }

  /**
   * Builds the user-facing prompt from failure context.
   * Structured for GPT to give specific, actionable responses.
   */
  private buildUserPrompt(context: TestFailureContext): string {
    const lines = [
      `=== FAILED TEST ===`,
      `Name:     ${context.testName}`,
      `File:     ${context.testFile}`,
      `Tags:     ${context.tags?.join(', ') ?? 'none'}`,
      `Retry:    Attempt ${context.retryCount + 1} (final)`,
      `Duration: ${context.duration ? `${(context.duration / 1000).toFixed(1)}s` : 'unknown'}`,
      `URL:      ${context.pageUrl ?? 'unknown'}`,
      ``,
      `=== ERROR MESSAGE ===`,
      context.errorMessage,
      ``,
      `=== STACK TRACE ===`,
      context.stackTrace.slice(0, 2000), // Truncate to avoid token waste
    ];

    return lines.join('\n');
  }

  /**
   * Parses GPT response — handles edge cases where model adds prose despite instructions.
   */
  private parseResponse(raw: string): AIAnalysisResult {
    // Strip any accidental markdown fences
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as AIAnalysisResult;
      return this.validateResult(parsed);
    } catch {
      log.warn('Could not parse AI response as JSON — using fallback');
      return {
        likelyCause: raw.slice(0, 300),
        failureCategory: 'UNKNOWN',
        suggestedFix: 'Review the error manually — AI response was not structured.',
        isLikelyFlaky: false,
        confidence: 'LOW',
        priority: 'MEDIUM',
      };
    }
  }

  /**
   * Validates and sanitizes the parsed result against expected schema.
   */
  private validateResult(result: Partial<AIAnalysisResult>): AIAnalysisResult {
    const validCategories: FailureCategory[] = [
      'LOCATOR_ISSUE', 'TIMING_ISSUE', 'DATA_ISSUE', 'ENV_ISSUE',
      'ASSERTION_ISSUE', 'NETWORK_ISSUE', 'AUTH_ISSUE', 'UNKNOWN',
    ];

    return {
      likelyCause:      result.likelyCause      ?? 'Could not determine cause',
      failureCategory:  validCategories.includes(result.failureCategory as FailureCategory)
                          ? result.failureCategory as FailureCategory
                          : 'UNKNOWN',
      suggestedFix:     result.suggestedFix     ?? 'No suggestion available',
      isLikelyFlaky:    result.isLikelyFlaky    ?? false,
      confidence:       result.confidence       ?? 'LOW',
      priority:         result.priority         ?? 'MEDIUM',
      additionalNotes:  result.additionalNotes,
    };
  }

  // ─────────────────────────────────────────────
  // Output Formatters
  // ─────────────────────────────────────────────

  /**
   * Formats analysis for console output — colored box with key details.
   */
  formatForConsole(result: AIAnalysisResult, testName: string): string {
    const border = '═'.repeat(58);
    const categoryColor = this.getCategoryColor(result.failureCategory);
    const priorityIcon = result.priority === 'HIGH' ? '🔴' : result.priority === 'MEDIUM' ? '🟡' : '🟢';
    const flakyTag = result.isLikelyFlaky ? '  ⚠️  POSSIBLY FLAKY' : '';

    return [
      `\n╔${border}╗`,
      `║   🤖 AI Failure Analysis${' '.repeat(33)}║`,
      `╠${border}╣`,
      `║ Test:     ${this.pad(testName, 47)}║`,
      `║ Category: ${this.pad(`${categoryColor}${result.failureCategory}\x1b[0m`, 47)}║`,
      `║ Priority: ${this.pad(`${priorityIcon} ${result.priority}${flakyTag}`, 47)}║`,
      `║ Confidence: ${this.pad(result.confidence, 45)}║`,
      `╠${border}╣`,
      `║ Likely Cause:${' '.repeat(44)}║`,
      ...this.wrapText(result.likelyCause, 56).map(l => `║ ${this.pad(l, 56)}║`),
      `╠${border}╣`,
      `║ Suggested Fix:${' '.repeat(43)}║`,
      ...this.wrapText(result.suggestedFix, 56).map(l => `║ ${this.pad(l, 56)}║`),
      result.additionalNotes
        ? [`╠${border}╣`, `║ Notes:${' '.repeat(51)}║`,
           ...this.wrapText(result.additionalNotes, 56).map(l => `║ ${this.pad(l, 56)}║`)]
            .join('\n')
        : '',
      `╚${border}╝\n`,
    ].filter(Boolean).join('\n');
  }

  /**
   * Formats analysis as JSON string for Allure report attachment.
   */
  formatForReport(result: AIAnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  private pad(str: string, length: number): string {
    const plain = str.replace(/\x1b\[[0-9;]*m/g, ''); // strip ANSI for length calc
    return str + ' '.repeat(Math.max(0, length - plain.length));
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current + word).length > maxWidth) {
        if (current) lines.push(current.trim());
        current = word + ' ';
      } else {
        current += word + ' ';
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines.length ? lines : [''];
  }

  private getCategoryColor(category: FailureCategory): string {
    const colors: Record<FailureCategory, string> = {
      LOCATOR_ISSUE:    '\x1b[33m', // Yellow
      TIMING_ISSUE:     '\x1b[36m', // Cyan
      DATA_ISSUE:       '\x1b[35m', // Magenta
      ENV_ISSUE:        '\x1b[31m', // Red
      ASSERTION_ISSUE:  '\x1b[33m', // Yellow
      NETWORK_ISSUE:    '\x1b[31m', // Red
      AUTH_ISSUE:       '\x1b[31m', // Red
      UNKNOWN:          '\x1b[37m', // White
    };
    return colors[category] ?? '\x1b[0m';
  }
}

// Singleton — one instance reused across all test hooks
export const aiAnalyzer = new AIErrorAnalyzer();
