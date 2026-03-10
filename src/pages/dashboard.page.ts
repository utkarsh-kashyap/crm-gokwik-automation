import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { config } from '../../config/env.config';
import { logStep } from '../utils/logger';
import { TestConstants } from '../data/test-data';

export class DashboardPage extends BasePage {

  // ─── Locators ──────────────────────────────
  private readonly switchMerchantButton = this.page.locator(`//*[contains(text(),'Switch merchant')]/button`);
  private readonly merchantSearchInput  = this.page.locator(`//*[contains(text(),'Search merchant')]/following::input[@type='text']`);
  private readonly setMerchantButton    = this.page.locator(`//*[contains(text(),'Set Merchant')]/parent::button`);
  private readonly gkPagesNavItem       = this.page.locator(`//*[text()='GK Pages']`);
  private readonly productsNavItem      = this.page.locator(`//*[text()='Products']`);
  private readonly loader               = this.page.locator(`//div[@class='loader-spinner']`);

  private merchantOption = (merchantId: string) =>
    this.page.locator(`//*[contains(text(),'${merchantId}')]`);

  // ─── Actions ───────────────────────────────

  /**
   * Switches to the target merchant from the top-right dropdown.
   * Flow: click Switch Merchant → search by ID → select result → Set Merchant
   */
  async switchMerchant(merchantId = config.merchantId): Promise<void> {
    logStep('Switch merchant', merchantId);

    // Wait for dashboard to fully render before looking for switch button
    await this.page.waitForLoadState('networkidle', { timeout: config.timeouts.navigation });
    await this.switchMerchantButton.waitFor({ state: 'visible', timeout: config.timeouts.navigation });
    await this.safeClick(this.switchMerchantButton, 'Switch merchant button');

    await this.merchantSearchInput.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeFill(this.merchantSearchInput, merchantId, 'Merchant search input');

    // Wait for search result to appear then click the merchant row
    const option = this.merchantOption(merchantId);
    await option.waitFor({ state: 'visible', timeout: config.timeouts.default });
    // Use force:true — element is inside ant-modal which intercepts pointer events
    await option.click({ force: true });
    this.log.debug(`Clicked merchant option: ${merchantId}`);

    await this.safeClick(this.setMerchantButton, 'Set Merchant button');

    // Wait for popup to close
    await this.merchantSearchInput.waitFor({ state: 'hidden', timeout: config.timeouts.default });
    this.log.info(`Merchant switched to: ${merchantId}`);
  }

  /**
   * Navigates to Products via left nav: GK Pages → Products
   * Covers the navigation menu interaction as part of test coverage.
   */
  async navigateToProductsViaNav(): Promise<void> {
    logStep('Navigate to Products via nav');

    await this.safeClick(this.gkPagesNavItem, 'GK Pages nav item');

    // Wait for submenu to expand
    await this.productsNavItem.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(this.productsNavItem, 'Products nav item');

    await this.page.waitForURL(/\/products/, { timeout: config.timeouts.navigation });
    await this.waitForLoaderToDisappear();
    this.log.info('Navigated to Products page');
  }

  /**
   * Direct URL navigation to products — faster, used in fixtures.
   */
  async navigateToProductsDirectly(): Promise<void> {
    await this.page.goto(config.baseUrl + TestConstants.urls.products);
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoaderToDisappear();
  }

  async waitForLoaderToDisappear(): Promise<void> {
    try {
      await this.loader.waitFor({ state: 'visible', timeout: 3000 });
      await this.loader.waitFor({ state: 'hidden', timeout: config.timeouts.navigation });
    } catch {
      // Loader may not appear for fast responses — that's fine
    }
  }

  // ─── Assertions ────────────────────────────

  async expectMerchantSwitched(displayName = TestConstants.merchant.displayName): Promise<void> {
    const merchantDisplay = this.page.locator(`//*[contains(text(),'${displayName}')]`);
    await expect(merchantDisplay, `Merchant should show: ${displayName}`).toBeVisible();
  }
}