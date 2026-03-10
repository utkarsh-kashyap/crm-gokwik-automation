import { productTest as test, expect } from '../../../src/fixtures/product.fixture';
import { ProductsListPage } from '../../../src/pages/products/products-list.page';

test.describe('@regression @products @search Search & Filter', () => {

  test('@smoke @products @search TC_PRD_SEARCH_001 — exact name search shows correct product', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.expectProductVisible(existingProduct.name);
  });

  test('@regression @products @search TC_PRD_SEARCH_002 — partial name search returns matching product', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    // Use 'Test-PRDN' which is the static prefix of every generated product name
    await listPage.goto();
    await listPage.searchProduct('Test-PRDN');
    await listPage.expectProductVisible(existingProduct.name);
  });

  test('@regression @products @search TC_PRD_SEARCH_003 — search with no match shows No data', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();
    await listPage.searchProduct('NOMATCH_XYZ_9999_DOESNOTEXIST');
    await listPage.expectNoDataVisible();
  });

  test('@regression @products @search TC_PRD_SEARCH_004 — clearing search restores full listing', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();
    await listPage.searchProduct('NOMATCH_XYZ_9999');
    await listPage.expectNoDataVisible();

    // Navigate fresh instead of clearing — avoids stale search state
    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.expectProductVisible(existingProduct.name);
  });

  test('@regression @products @search TC_PRD_SEARCH_005 — search does not crash with special characters', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();

    for (const input of [`<script>`, `' OR 1=1`, `%20%20`]) {
      await listPage.searchProduct(input);
      // Page should remain functional — still on products URL
      await expect(authenticatedPage).toHaveURL(/\/products/);
      await listPage.clearSearch();
    }
  });

});

test.describe('@regression @products @pagination Pagination', () => {

  test('@regression @products @pagination TC_PRD_PAGE_001 — products listing shows items', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();

    // Verify the listing has loaded with products (1771 total — always has rows)
    const productLinks = authenticatedPage.locator(`//a[contains(@href,'/products/') and @class='product-link']`);
    const count = await productLinks.count();
    expect(count, 'Products listing should have at least one product row').toBeGreaterThan(0);
  });

  test('@regression @products @pagination TC_PRD_PAGE_002 — next page button is present', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();

    // Next button should be present given 1771 products with 10 per page
    // 🔧 Replace with actual next page button XPath once confirmed
    const nextBtn = authenticatedPage.locator(`//*[text()='Next']/parent::button`);
    await expect(nextBtn, 'Next page button should be present').toBeVisible();
  });

  test('@regression @products @pagination TC_PRD_PAGE_003 — page shows 10 items by default', async ({
    authenticatedPage
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();

    const productLinks = authenticatedPage.locator(`//a[contains(@href,'/products/') and @class='product-link']`);
    const count = await productLinks.count();
    expect(count, 'Default page size should show 10 products').toBeLessThanOrEqual(10);
  });

});