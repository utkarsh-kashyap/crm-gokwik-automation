import { defineConfig } from '@playwright/test';
import { config } from './config/env.config';

export default defineConfig({
  // ─── Test Discovery ────────────────────────────────────────
  testDir: './tests/spec',
  testMatch: '**/*.spec.ts',

  // ─── Execution ─────────────────────────────────────────────
  // fullyParallel: true means tests within a file also run in parallel
  // Workers control how many browser instances run simultaneously
  // Each worker gets its own browser context — no shared state between workers
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,

  // ─── Retry Strategy ────────────────────────────────────────
  retries: process.env.CI ? 2 : 1,

  // ─── Timeouts ──────────────────────────────────────────────
  timeout: 180000, // 180s per individual test

  // globalTimeout removed — no artificial cap on full suite duration
  // Suite time grows naturally as test count grows

  expect: {
    timeout: 10000,
  },

  // ─── Reporters ─────────────────────────────────────────────
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { detail: true, outputFolder: 'allure-results', suiteTitle: false }],
    ['json', { outputFile: 'reports/test-results.json' }],
    // ['./src/utils/ai-reporter.ts'], // Enable when OPENAI_API_KEY is set
  ],

  // ─── Global Test Settings ──────────────────────────────────
  use: {
    baseURL:           config.baseUrl,
    navigationTimeout: config.timeouts.navigation,
    actionTimeout:     config.timeouts.default,

    launchOptions: {
      headless: config.isHeadless,
      slowMo:   config.slowMo,
      args:     ['--start-maximized'],
    },

    viewport:          null,

    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    trace:             'retain-on-failure',

    ignoreHTTPSErrors: true,

    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // ─── Output Directories ────────────────────────────────────
  outputDir: 'test-results',

  // ─── Projects ──────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use:  { channel: 'chrome' },
    },
  ],
});