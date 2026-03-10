import { Page, Route, Request, APIResponse } from '@playwright/test';
import { getLogger } from './logger';

const log = getLogger('NetworkInterceptor');

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface MockResponseOptions {
  status?: number;
  body?: Record<string, unknown> | string;
  headers?: Record<string, string>;
  delay?: number;
}

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

// ─────────────────────────────────────────────
// Token Capture — extracts Bearer token from
// login response for API cleanup calls
// ─────────────────────────────────────────────

/**
 * Intercepts the login API response to extract the Bearer token.
 * Call this BEFORE triggering the login action.
 *
 * 🔧 URL_PATTERN — replace with actual login endpoint pattern
 */
export async function captureBearerToken(page: Page): Promise<string> {
  log.debug('Setting up bearer token capture');

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('[NetworkInterceptor] Timed out waiting for auth token'));
    }, 30000);

    page.on('response', async (response) => {
      // 🔧 URL_PATTERN — replace with actual login API endpoint
      if (response.url().includes('/auth/login') || response.url().includes('/login')) {
        try {
          const body = await response.json();
          // 🔧 TOKEN_PATH — adjust based on actual response shape
          // Common patterns: body.token, body.data.token, body.accessToken
          const token =
            body?.token ??
            body?.data?.token ??
            body?.accessToken ??
            body?.data?.accessToken;

          if (token) {
            clearTimeout(timeout);
            log.debug('Bearer token captured successfully');
            resolve(token as string);
          }
        } catch {
          // Not the right response — keep listening
        }
      }
    });
  });
}

/**
 * Extracts Bearer token from localStorage/sessionStorage after login.
 * Alternative to network capture — use whichever the app actually uses.
 *
 * 🔧 STORAGE_KEY — replace with actual key used by the app
 */
export async function getTokenFromStorage(page: Page): Promise<string> {
  // 🔧 STORAGE_KEY — replace with actual localStorage/sessionStorage key
  const token = await page.evaluate(/* istanbul ignore next */ () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = globalThis as any;
    return (
      w.localStorage?.getItem('AUTH_TOKEN_KEY') ??
      w.localStorage?.getItem('token') ??
      w.sessionStorage?.getItem('token') ??
      ''
    );
  });

  if (!token) {
    throw new Error(
      '[NetworkInterceptor] Could not extract auth token from storage. ' +
      'Check the STORAGE_KEY in network-interceptor.ts'
    );
  }

  log.debug('Auth token extracted from browser storage');
  return token;
}

// ─────────────────────────────────────────────
// API Response Mocking
// ─────────────────────────────────────────────

/**
 * Mocks an API endpoint to return a specific response.
 * Used in network-resilience tests to simulate failures.
 *
 * @example
 * await mockApiResponse(page, 'products', { status: 500, body: { error: 'Server Error' } });
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: MockResponseOptions
): Promise<void> {
  const { status = 200, body = {}, headers = {}, delay = 0 } = options;

  log.debug(`Mocking API: ${urlPattern} → ${status}`);

  await page.route(urlPattern, async (route: Route) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  });
}

/**
 * Simulates a complete network failure for an endpoint.
 * Tests that the UI handles connection errors gracefully.
 */
export async function simulateNetworkFailure(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  log.debug(`Simulating network failure for: ${urlPattern}`);
  await page.route(urlPattern, (route: Route) => route.abort('failed'));
}

/**
 * Simulates a slow network response (timeout scenario).
 * Tests loading states and timeout error handling in the UI.
 */
export async function simulateSlowNetwork(
  page: Page,
  urlPattern: string | RegExp,
  delayMs: number
): Promise<void> {
  log.debug(`Simulating ${delayMs}ms delay for: ${urlPattern}`);

  await page.route(urlPattern, async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

/**
 * Removes all route overrides — restores real network calls.
 * Call this in afterEach if mocking was set up in a test.
 */
export async function clearAllMocks(page: Page): Promise<void> {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  log.debug('All network mocks cleared');
}

// ─────────────────────────────────────────────
// Request Capture — for API response validation
// ─────────────────────────────────────────────

/**
 * Waits for a specific API response and returns its parsed body.
 * Used to validate what the UI actually sent/received from the server.
 *
 * @example
 * const responseBody = await captureApiResponse(page, '/products', 'POST');
 * expect(responseBody.name).toBe('My Product');
 */
export async function captureApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  method?: string
): Promise<Record<string, unknown>> {
  log.debug(`Capturing API response for: ${urlPattern}`);

  const response = await page.waitForResponse(
    (res) => {
      const urlMatch = typeof urlPattern === 'string'
        ? res.url().includes(urlPattern)
        : urlPattern.test(res.url());
      const methodMatch = method ? res.request().method() === method.toUpperCase() : true;
      return urlMatch && methodMatch;
    },
    { timeout: 15000 }
  );

  const body = await response.json();
  log.debug(`API response captured: ${response.status()} from ${response.url()}`);
  return body as Record<string, unknown>;
}

/**
 * Captures the outgoing request payload for a given endpoint.
 * Useful for verifying the app sends correct data to the API.
 */
export async function captureRequestPayload(
  page: Page,
  urlPattern: string | RegExp,
  action: () => Promise<void>
): Promise<CapturedRequest> {
  let captured: CapturedRequest | null = null;

  page.on('request', (request: Request) => {
    const urlMatch = typeof urlPattern === 'string'
      ? request.url().includes(urlPattern)
      : urlPattern.test(request.url());

    if (urlMatch) {
      captured = {
        url: request.url(),
        method: request.method(),
        headers: request.headers() as Record<string, string>,
        body: request.postData(),
        timestamp: Date.now(),
      };
    }
  });

  await action();

  if (!captured) {
    throw new Error(`[NetworkInterceptor] No request captured for pattern: ${urlPattern}`);
  }

  return captured;
}