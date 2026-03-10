import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { aiAnalyzer, TestFailureContext } from './ai-analyzer';
import { getLogger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

const log = getLogger('AIReporter');

// ─────────────────────────────────────────────
// AIReporter
//
// Custom Playwright reporter that triggers AI
// error analysis on final test failures only
// (after all retries are exhausted).
//
// Registered in playwright.config.ts reporters array.
// This is the correct Playwright pattern for
// global post-test hooks.
// ─────────────────────────────────────────────
class AIReporter implements Reporter {

  onBegin(_config: FullConfig, _suite: Suite): void {
    log.info('Test run started');
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const isLastAttempt = result.retry === test.retries;
    const hasFailed     = result.status === 'failed' || result.status === 'timedOut';

    if (!isLastAttempt || !hasFailed) return;

    try {
      const screenshot = result.attachments.find(
        a => a.name === 'screenshot' && a.contentType === 'image/png'
      );

      const context: TestFailureContext = {
        testName:       test.title,
        testFile:       test.location.file,
        errorMessage:   result.error?.message ?? 'Unknown error',
        stackTrace:     result.error?.stack   ?? '',
        pageUrl:        this.extractPageUrl(result),
        tags:           this.extractTags(test.title),
        retryCount:     result.retry,
        screenshotPath: screenshot?.path,
        duration:       result.duration,
      };

      const analysis = await aiAnalyzer.analyzeFailure(context);

      if (analysis) {
        console.log(aiAnalyzer.formatForConsole(analysis, test.title));

        // Save analysis JSON for Allure report pickup
        const outputDir = path.resolve('./test-results/ai-analysis');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const safeName = test.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
        fs.writeFileSync(
          path.join(outputDir, `${safeName}_${Date.now()}.json`),
          aiAnalyzer.formatForReport(analysis)
        );
      }
    } catch (error) {
      log.warn('AI analysis failed — test results unaffected', { error });
    }
  }

  onEnd(result: FullResult): void {
    log.info(`Test run finished — status: ${result.status}`);
  }

  private extractPageUrl(result: TestResult): string {
    const urlAttachment = result.attachments.find(a => a.name === 'pageUrl');
    if (urlAttachment?.body) return urlAttachment.body.toString();
    return 'unknown';
  }

  private extractTags(title: string): string[] {
    return title.match(/@\w+/g) ?? [];
  }
}

export default AIReporter;