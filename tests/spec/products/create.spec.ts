import { authTest as test, expect } from '../../../src/fixtures/auth.fixture';
import { ProductsListPage } from '../../../src/pages/products/products-list.page';
import { ProductFormPage } from '../../../src/pages/products/product-form.page';
import { TestDataGenerator, TestConstants } from '../../../src/data/test-data';
import { config } from '../../../config/env.config';

// UI cleanup helper — deletes product via detail page after test
async function cleanup(page: any, productName: string) {
  if (!productName) return;
  try {
    const listPage = new ProductsListPage(page);
    const formPage = new ProductFormPage(page);
    await listPage.goto();
    await listPage.searchProduct(productName);
    const exists = await page.locator(`//a[normalize-space()='${productName}']`).count();
    if (exists > 0) {
      await listPage.clickProduct(productName);
      await formPage.deleteFromDetailPage();
    }
  } catch {
    // cleanup failure must never affect test result
  }
}

test.describe('@smoke @products @create Create Product', () => {

  test('@smoke @products @create TC_PRD_CREATE_001 — create product with title and inventory SKU only', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillTitle(data.name);
    await formPage.fillInventorySku(data.sku);
    await formPage.submitCreate();

    await listPage.goto();
    await listPage.searchProduct(data.name);
    await listPage.expectProductVisible(data.name);

    await cleanup(authenticatedPage, data.name);
  });

  test('@smoke @products @create TC_PRD_CREATE_002 — create product with category selected', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillTitle(data.name);
    await formPage.selectCategory(TestConstants.category);
    await formPage.fillInventorySku(data.sku);
    await formPage.submitCreate();

    await listPage.goto();
    await listPage.searchProduct(data.name);
    await listPage.expectProductVisible(data.name);

    await cleanup(authenticatedPage, data.name);
  });

  test('@smoke @products @create TC_PRD_CREATE_003 — create product with size variant and variant SKU', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillTitle(data.name);
    await formPage.addSizeVariant(TestConstants.variantSize, data.sku, 0);
    await formPage.fillInventorySku(data.sku);
    await formPage.submitCreate();

    await listPage.goto();
    await listPage.searchProduct(data.name);
    await listPage.expectProductVisible(data.name);

    await cleanup(authenticatedPage, data.name);
  });

  test('@regression @products @create TC_PRD_CREATE_004 — product ID is captured from URL after creation', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillTitle(data.name);
    await formPage.fillInventorySku(data.sku);
    const productId = await formPage.submitCreate();

    expect(productId, 'Product ID should be captured from URL after creation').toBeTruthy();
    expect(productId).toMatch(/^\d+$/);

    await cleanup(authenticatedPage, data.name);
  });

  test('@regression @products @create TC_PRD_CREATE_005 — URL updates to product ID after creation', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillTitle(data.name);
    await formPage.fillInventorySku(data.sku);
    const productId = await formPage.submitCreate();

    await expect(authenticatedPage).toHaveURL(
      new RegExp(`/products/${productId}`),
      { timeout: config.timeouts.navigation }
    );

    await cleanup(authenticatedPage, data.name);
  });

  test('@regression @products @negative TC_PRD_CREATE_006 — cannot create product without title', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillInventorySku(data.sku);

    await formPage.expectCreateButtonVisible();
    await expect(authenticatedPage).toHaveURL(/\/products\/new/);
  });

  test('@regression @products @create TC_PRD_CREATE_007 — navigate to products via nav menu', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    await listPage.gotoViaNav();
    await listPage.expectOnProductsPage();
  });

});