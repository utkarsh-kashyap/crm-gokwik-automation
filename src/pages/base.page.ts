import { Page, Locator, expect } from '@playwright/test';
import { getLogger } from '../utils/logger';

// ─────────────────────────────────────────────
// BasePage
//
// All page objects extend this class.
// Provides shared navigation, interaction, and
// state-checking utilities that keep page objects DRY.
// ─────────────────────────────────────────────
export abstract class BasePage {
  protected readonly log;

  constructor(protected readonly page: Page) {
    this.log = getLogger(this.constructor.name);
  }

  // ─── Navigation ──────────────────────────────

  /**
   * Navigates to a path and waits for the page to settle.
   * Always prefer this over page.goto() in page objects.
   */
  async navigateTo(path: string): Promise<void> {
    this.log.info(`Navigating to: ${path}`);
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();
  }

  /**
   * Waits for the page to reach a stable, interactive state.
   * Called after any navigation or major state change.
   */
  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');

  }

  // ─── Safe Interactions ────────────────────────

  /**
   * Clicks an element with a meaningful error message if it fails.
   * Never use page.locator().click() directly in page objects.
   */
  protected async safeClick(locator: Locator, description: string): Promise<void> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 15000 });
      await locator.click();
      this.log.debug(`Clicked: ${description}`);
    } catch (error) {
      throw new Error(
        `[${this.constructor.name}] Failed to click "${description}". ` +
        `Element may be hidden, disabled, or covered by an overlay.\n` +
        `Original error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Fills a text input, clearing existing content first.
   */
  protected async safeFill(locator: Locator, value: string, description: string): Promise<void> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 15000 });
      await locator.clear();
      await locator.fill(value);
      this.log.debug(`Filled "${description}": "${value}"`);
    } catch (error) {
      throw new Error(
        `[${this.constructor.name}] Failed to fill "${description}" with "${value}". ` +
        `Original error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Selects an option from a native <select> element.
   */
  protected async safeSelectOption(
    locator: Locator,
    value: string,
    description: string
  ): Promise<void> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      await locator.selectOption(value);
      this.log.debug(`Selected "${value}" in: ${description}`);
    } catch (error) {
      throw new Error(
        `[${this.constructor.name}] Failed to select "${value}" in "${description}". ` +
        `Original error: ${(error as Error).message}`
      );
    }
  }

  // ─── State Checks ─────────────────────────────

  /**
   * Returns true if an element is visible on the page right now.
   * Non-throwing — use for conditional logic, not assertions.
   */
  protected async isVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the current page URL.
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Extracts a segment from the current URL by regex capture group.
   * Used to extract productId, merchantId etc from URL patterns.
   *
   * @example
   * const productId = this.extractFromUrl(/\/products\/([^\/]+)/);
   */
  protected extractFromUrl(pattern: RegExp): string | null {
    const match = this.page.url().match(pattern);
    return match?.[1] ?? null;
  }

  /**
   * Asserts the page is on the expected URL.
   */
  async assertOnPage(expectedUrlPattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expectedUrlPattern);
  }

  // ─── Scroll ───────────────────────────────────

  /**
   * Scrolls element into view before interaction.
   * Prevents "element not in viewport" errors on long pages.
   */
  protected async scrollIntoViewAndClick(locator: Locator, description: string): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    await this.safeClick(locator, description);
  }
}