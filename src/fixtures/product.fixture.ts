import { authTest } from './auth.fixture';
import { ProductsListPage } from '../pages/products/products-list.page';
import { ProductFormPage } from '../pages/products/product-form.page';
import { TestDataGenerator } from '../data/test-data';
import { getLogger } from '../utils/logger';

const log = getLogger('ProductFixture');

export interface CreatedProduct {
  id: string;
  name: string;
  sku: string;
}

export interface ProductFixtures {
  existingProduct: CreatedProduct;
}

export const productTest = authTest.extend<ProductFixtures>({

  existingProduct: async ({ authenticatedPage }, use) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);
    const data = TestDataGenerator.product();

    // ── SETUP: Create product via UI ───────────
    log.debug(`Product fixture: creating "${data.name}"`);
    await listPage.goto();
    await listPage.clickAddProduct();
    await formPage.fillTitle(data.name);
    await formPage.fillInventorySku(data.sku);
    const productId = await formPage.submitCreate();

    await listPage.goto();
    await listPage.searchProduct(data.name);
    await listPage.expectProductVisible(data.name);
    log.info(`Product fixture ready — name: "${data.name}", id: "${productId}"`);

    // ── TEST RUNS ──────────────────────────────
    await use({ id: productId, name: data.name, sku: data.sku });

    // ── TEARDOWN: Delete via UI ─────────────────
    log.debug(`Product fixture: cleaning up "${data.name}"`);
    try {
      await listPage.goto();
      await listPage.searchProduct(data.name);
      const exists = await authenticatedPage
        .locator(`//a[normalize-space()='${data.name}']`)
        .count();
      if (exists > 0) {
        await listPage.clickProduct(data.name);
        await formPage.deleteFromDetailPage();
      }
    } catch (e) {
      log.warn(`Cleanup failed for "${data.name}" — may need manual cleanup`);
    }
  },
});

export { expect } from '@playwright/test';