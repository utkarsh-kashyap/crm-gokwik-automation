import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { config } from '../../../config/env.config';
import { logStep } from '../../utils/logger';
import { TestConstants } from '../../data/test-data';

export class ProductFormPage extends BasePage {

  // ─── Locators ──────────────────────────────
  private readonly titleInput           = this.page.locator(`//input[@name='title']`);
  private readonly categoryTrigger      = this.page.locator(`//*[text()='Select category']/preceding-sibling::*/input`);
  private readonly addVariantsButton    = this.page.locator(`//*[text()='Add Variants']/parent::button`);
  private readonly sizeOption           = this.page.locator(`//*[text()='Size']`);
  private readonly selectSizeValues     = this.page.locator(`//span[contains(@class,'ant-select-selection-placeholder') and contains(text(),'Select size values')]/ancestor::div[contains(@class,'ant-select-selector')]`);
  private readonly inventorySkuInput    = this.page.locator(`//input[@placeholder='Enter SKU' and @name='sku']`);
  private readonly variantSkuInput      = this.page.locator(`//input[@placeholder='Enter SKU' and not(@data-test-id)]`);
  private readonly createProductButton  = this.page.locator(`//button[@data-test-id='create_product_submit_button']`);
  private readonly saveChangesButton    = this.page.locator(`//button[@data-test-id='product_form_save_button']`);
  private readonly moreActionsButton    = this.page.locator(`//button[@data-test-id='bulk_action_toolbar_more_actions_button']`);
  private readonly deleteActionButton   = this.page.locator(`//*[@datatestid='product_details_delete_action']`);
  private readonly loader               = this.page.locator(`//div[@class='loader-spinner']`);
  private readonly createdSuccessToast  = this.page.locator(`//*[text()='Product created successfully']`);
  private readonly deletedSuccessToast  = this.page.locator(`//*[text()='Product deleted successfully']`);

  // Dynamic locators
  private categoryOption = (name: string) =>
    this.page.locator(`//*[text()='${name}']`);

  private sizeValueOption = (size: string) =>
    this.page.locator(`//*[@title='${size}']`);

  /**
   * Variant expand toggle — uses index for multiple variants.
   * Index 0 = first variant section, 1 = second, etc.
   */
  private variantToggle = (index: number) =>
    this.page.locator(`//span[normalize-space()='1 variant']/following-sibling::span[@role='img']`).nth(index);

  // ─── Core Form Actions ─────────────────────

  async fillTitle(name: string): Promise<void> {
    logStep('Fill product title', name);
    await this.safeFill(this.titleInput, name, 'Title input');
  }

  async selectCategory(category = TestConstants.category): Promise<void> {
    logStep('Select category', category);
    await this.safeClick(this.categoryTrigger, 'Category trigger');

    const option = this.categoryOption(category);
    await option.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(option, `Category option: ${category}`);
  }

  /**
   * Adds a size variant and sets its SKU.
   * Handles the multi-step variant flow:
   *   Add Variants → Size → Select value → click outside to close → expand toggle → enter SKU
   *
   * @param size     The size value to select (e.g. 'X-Large')
   * @param sku      The SKU to enter for this variant
   * @param index    The variant section index (0 for first, 1 for second, etc.)
   */
  async addSizeVariant(size: string, sku: string, index = 0): Promise<void> {
    logStep('Add size variant', `${size} — SKU: ${sku}`);

    // Only click Add Variants for the first variant
    if (index === 0) {
      await this.safeClick(this.addVariantsButton, 'Add Variants button');
      await this.sizeOption.waitFor({ state: 'visible', timeout: config.timeouts.default });
      await this.safeClick(this.sizeOption, 'Size option');
    }

    // Select size value from dropdown
    await this.selectSizeValues.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(this.selectSizeValues, 'Select size values');

    const sizeOpt = this.sizeValueOption(size);
    await sizeOpt.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(sizeOpt, `Size value: ${size}`);

    // Click outside to close the size dropdown
    await this.titleInput.click();
    await this.page.waitForTimeout(300);

    // Expand the variant section to reveal SKU input
    const toggle = this.variantToggle(index);
    await toggle.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(toggle, `Variant toggle (index ${index})`);

    // Enter variant SKU
    await this.variantSkuInput.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeFill(this.variantSkuInput, sku, `Variant SKU (index ${index})`);
  }

  async fillInventorySku(sku: string): Promise<void> {
    logStep('Fill inventory SKU', sku);
    await this.inventorySkuInput.scrollIntoViewIfNeeded();
    await this.safeFill(this.inventorySkuInput, sku, 'Inventory SKU input');
  }

  // ─── Submit Actions ────────────────────────

  /**
   * Creates a new product (Create Product button).
   * Waits for URL to change and extracts the new product ID.
   * Returns the product ID from the URL.
   */
  async submitCreate(): Promise<string> {
    logStep('Submit create product');

    await this.createProductButton.scrollIntoViewIfNeeded();
    await this.safeClick(this.createProductButton, 'Create Product button');

    // Wait for loader then URL change to product ID
    await this.waitForLoaderToDisappear();
    await this.page.waitForURL(/\/products\/\d+/, { timeout: config.timeouts.navigation });

    // Extract product ID from URL
    const url = this.page.url();
    const match = url.match(/\/products\/(\d+)/);
    const productId = match?.[1] ?? '';

    this.log.info(`Product created — ID: ${productId}, URL: ${url}`);
    return productId;
  }

  /**
   * Saves changes on an existing product (Save Changes button).
   * URL stays the same after save.
   */
  async submitSaveChanges(): Promise<void> {
    logStep('Submit save changes');
    await this.saveChangesButton.scrollIntoViewIfNeeded();
    await this.safeClick(this.saveChangesButton, 'Save Changes button');
    await this.waitForLoaderToDisappear();
    this.log.info('Product changes saved');
  }

  // ─── Delete from Detail Page ───────────────

  /**
   * Deletes product from the product detail page.
   * Flow: More Actions → Delete → no confirmation — direct delete with toast
   * Auto-navigates back to listing after deletion.
   */
  async deleteFromDetailPage(): Promise<void> {
    logStep('Delete product from detail page');

    await this.safeClick(this.moreActionsButton, 'More Actions button');
    await this.deleteActionButton.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeClick(this.deleteActionButton, 'Delete action');

    // No confirmation modal — direct delete with toast
    await this.deletedSuccessToast.waitFor({ state: 'visible', timeout: config.timeouts.toast });
    this.log.info('Product deleted from detail page');

    // Wait for auto-navigation back to listing and for it to fully settle
    await this.page.waitForURL(/\/products$/, { timeout: config.timeouts.navigation });
    await this.page.waitForLoadState('networkidle', { timeout: config.timeouts.navigation });
    await this.waitForLoaderToDisappear();
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

  async getTitleValue(): Promise<string> {
    return await this.titleInput.inputValue();
  }

  // ─── Assertions ────────────────────────────

  async expectOnCreatePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/products\/new/, { timeout: config.timeouts.navigation });
    await expect(this.titleInput, 'Title input should be visible on create form').toBeVisible();
  }

  async expectTitleValue(expectedName: string): Promise<void> {
    await expect(
      this.titleInput,
      `Title field should contain: "${expectedName}"`
    ).toHaveValue(expectedName);
  }

  async expectCreateButtonVisible(): Promise<void> {
    await expect(this.createProductButton, 'Create product button should be visible').toBeVisible();
  }

  async expectSaveChangesVisible(): Promise<void> {
    await expect(this.saveChangesButton, 'Save Changes button should be visible').toBeVisible();
  }

  async expectSuccessToastVisible(): Promise<void> {
    await expect(
      this.createdSuccessToast,
      'Product created successfully toast should appear'
    ).toBeVisible({ timeout: config.timeouts.toast });
  }
}