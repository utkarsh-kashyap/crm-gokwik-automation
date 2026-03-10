import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { config } from '../../../config/env.config';
import { logStep } from '../../utils/logger';
import { DashboardPage } from '../dashboard.page';

export class ProductsListPage extends BasePage {

  // ─── Locators ──────────────────────────────
  private readonly addProductButton      = this.page.locator(`//*[text()='Add product']/parent::button`);
  private readonly searchInput           = this.page.locator(`//input[@data-test-id='products_search_input']`);
  private readonly noDataMessage         = this.page.locator(`//*[text()='No data']`);
  private readonly loader                = this.page.locator(`//div[@class='loader-spinner']`);
  private readonly bulkMoreActionsButton = this.page.locator(`//button[@data-test-id='bulk_action_toolbar_more_actions_button']`);
  private readonly deleteProductsOption  = this.page.locator(`//span[normalize-space()='Delete products']`);
  private readonly deleteConfirmModal    = this.page.locator(`//*[contains(text(),'Are you sure you want to delete')]`);
  private readonly deleteOkButton        = this.page.locator(`//div[contains(@class,'delete-products-modal')]//span[text()='OK']/ancestor::button`);
  private readonly deleteCancelButton    = this.page.locator(`//div[contains(@class,'delete-products-modal')]//span[text()='Cancel']/ancestor::button`);
  private readonly successToast          = this.page.locator(`//*[text()='Product deleted successfully']`);
  private readonly productCheckboxes     = this.page.locator(`//input[@type='checkbox']`);

  // ─── Dynamic Locators ──────────────────────
  private productRowLink = (productName: string): Locator =>
    this.page.locator(`//a[normalize-space()='${productName}']`);

  // ─── Navigation ────────────────────────────

  async goto(): Promise<void> {
    const dashboard = new DashboardPage(this.page);
    await dashboard.navigateToProductsDirectly();
  }

  async gotoViaNav(): Promise<void> {
    const dashboard = new DashboardPage(this.page);
    await dashboard.navigateToProductsViaNav();
  }

  async clickAddProduct(): Promise<void> {
    logStep('Click Add product');
    await this.safeClick(this.addProductButton, 'Add product button');
    await this.page.waitForURL(/\/products\/new/, { timeout: config.timeouts.navigation });
    await this.waitForLoaderToDisappear();
  }

  async clickProduct(productName: string): Promise<void> {
    logStep('Click product to open detail', productName);
    await this.safeClick(this.productRowLink(productName), `Product link: ${productName}`);
    await this.waitForLoaderToDisappear();
  }

  // ─── Search ────────────────────────────────

  /**
   * Types into search and waits for auto-search to complete (~0.5-1s debounce).
   */
  async searchProduct(productName: string): Promise<void> {
    logStep('Search product', productName);
    await this.searchInput.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.searchInput.clear();

    // Register listener BEFORE fill — fill triggers search instantly and the
    // response can arrive before the promise is set up if registered after
    const searchResponsePromise = this.page.waitForResponse(
      res => res.url().includes('products') && res.status() === 200,
      { timeout: config.timeouts.default }
    );
    await this.safeFill(this.searchInput, productName, 'Search input');
    await searchResponsePromise;

    await this.waitForLoaderToDisappear();
  }

  async clearSearch(): Promise<void> {
    const searchResponsePromise = this.page.waitForResponse(
      res => res.url().includes('products') && res.status() === 200,
      { timeout: config.timeouts.default }
    );
    await this.searchInput.clear();
    await searchResponsePromise;
    await this.waitForLoaderToDisappear();
  }

  // ─── Bulk Delete from Listing ───────────────

  /**
   * Deletes a product from the listing using bulk delete flow:
   * Search → select checkbox → More Actions → Delete → Confirm
   */
  async deleteProductFromListing(productName: string): Promise<void> {
    logStep('Delete product from listing', productName);

    // Search first so only our product is visible
    await this.searchProduct(productName);
    await this.expectProductVisible(productName);

    // Select the product checkbox (index 1 = first data row, index 0 = header checkbox)
    const checkboxes = this.productCheckboxes;
    await checkboxes.nth(1).click();

    // More Actions → Delete products
    await this.safeClick(this.bulkMoreActionsButton, 'Bulk more actions button');
    await this.deleteProductsOption.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(this.deleteProductsOption, 'Delete products option');

    // Confirmation modal
    await this.deleteConfirmModal.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(this.deleteOkButton, 'OK button in delete modal');

    // Toast is very brief — wait for page to settle after OK click instead
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForLoaderToDisappear();
    this.log.info(`Product deleted from listing: ${productName}`);
  }

  async cancelDeleteFromListing(productName: string): Promise<void> {
    logStep('Cancel delete from listing', productName);

    await this.searchProduct(productName);
    await this.expectProductVisible(productName);

    const checkboxes = this.productCheckboxes;
    await checkboxes.nth(1).click();

    await this.safeClick(this.bulkMoreActionsButton, 'Bulk more actions button');
    await this.deleteProductsOption.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(this.deleteProductsOption, 'Delete products option');

    await this.deleteConfirmModal.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(this.deleteCancelButton, 'Cancel button in delete modal');
    // Wait for modal to fully close
    await this.deleteConfirmModal.waitFor({ state: 'hidden', timeout: config.timeouts.default });
  }

  // ─── Utilities ─────────────────────────────

  async waitForLoaderToDisappear(): Promise<void> {
    try {
      await this.loader.waitFor({ state: 'visible', timeout: 3000 });
      await this.loader.waitFor({ state: 'hidden', timeout: config.timeouts.navigation });
    } catch {
      // Loader may not appear for fast responses
    }
  }

  // ─── Assertions ────────────────────────────

  async expectProductVisible(productName: string): Promise<void> {
    await expect(
      this.productRowLink(productName),
      `Product "${productName}" should be visible in listing`
    ).toBeVisible({ timeout: config.timeouts.default });
  }

  async expectProductNotVisible(productName: string): Promise<void> {
    await expect(
      this.productRowLink(productName),
      `Product "${productName}" should NOT be in listing`
    ).toHaveCount(0);
  }

  async expectNoDataVisible(): Promise<void> {
    await expect(
      this.noDataMessage,
      'No data message should show when search has no results'
    ).toBeVisible({ timeout: config.timeouts.default });
  }

  async expectOnProductsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/products/, { timeout: config.timeouts.navigation });
  }
}