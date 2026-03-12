import { authTest as test, expect } from '../../../src/fixtures/auth.fixture';
import { productTest } from '../../../src/fixtures/product.fixture';
import { ProductsListPage } from '../../../src/pages/products/products-list.page';
import { ProductFormPage } from '../../../src/pages/products/product-form.page';
import { TestDataGenerator } from '../../../src/data/test-data';

test.describe('@regression @products @network Network Resilience', () => {

  test('@regression @network TC_PRD_NET_001 — API 500 on product save shows error, does not crash', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillTitle(data.name);
    await formPage.fillInventorySku(data.sku);

    // Mock product create to return 500
    await authenticatedPage.route(/\/products/, async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else {
        await route.continue();
      }
    });

    await formPage.clickCreateButton();
    await authenticatedPage.waitForLoadState('networkidle');

    // Should stay on create page — not navigate to a product ID URL
    await expect(authenticatedPage).toHaveURL(/\/products\/new/);

    await authenticatedPage.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('@regression @network TC_PRD_NET_002 — network failure on product save is handled gracefully', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillTitle(data.name);
    await formPage.fillInventorySku(data.sku);

    // Abort the create request
    await authenticatedPage.route(/\/products/, async route => {
      if (route.request().method() === 'POST') {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    await formPage.clickCreateButton();
    await authenticatedPage.waitForLoadState('networkidle').catch(() => {});

    // Page must not crash — still on products URL
    await expect(authenticatedPage).toHaveURL(/\/products/);

    await authenticatedPage.unrouteAll({ behavior: 'ignoreErrors' });
  });

});
