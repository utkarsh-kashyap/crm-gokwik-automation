import { productTest as test, expect } from '../../../src/fixtures/product.fixture';
import { authTest } from '../../../src/fixtures/auth.fixture';
import { ProductsListPage } from '../../../src/pages/products/products-list.page';
import { ProductFormPage } from '../../../src/pages/products/product-form.page';
import { TestDataGenerator } from '../../../src/data/test-data';

test.describe('@regression @products @delete Delete Product — From Detail Page', () => {

  test('@regression @products @delete TC_PRD_DELETE_001 — delete from detail page removes product', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);

    // Open product
    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.clickProduct(existingProduct.name);

    // Delete from detail — auto-navigates back to listing once done
    await formPage.deleteFromDetailPage();

    // Already on listing — search directly to confirm product is gone
    await listPage.searchProduct(existingProduct.name);
    await listPage.expectNoDataVisible();
  });

  test('@regression @products @delete TC_PRD_DELETE_002 — delete from detail auto-navigates to listing', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);

    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.clickProduct(existingProduct.name);

    await formPage.deleteFromDetailPage();

    // Verify landed back on products listing URL
    await expect(authenticatedPage).toHaveURL(/\/products$/, { timeout: 10000 });
  });

});

test.describe('@regression @products @delete Delete Product — Bulk Delete from Listing', () => {

  test('@regression @products @delete TC_PRD_DELETE_003 — bulk delete from listing removes product', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();
    await listPage.deleteProductFromListing(existingProduct.name);

    // Verify product is gone after delete
    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.expectNoDataVisible();
  });

  test('@regression @products @delete TC_PRD_DELETE_004 — cancel bulk delete keeps product in listing', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();
    await listPage.cancelDeleteFromListing(existingProduct.name);

    // Product must still exist
    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.expectProductVisible(existingProduct.name);
  });

  test('@regression @products @delete TC_PRD_DELETE_005 — confirmation modal appears before bulk delete', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);

    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.expectProductVisible(existingProduct.name);

    // Select checkbox
    const checkboxes = authenticatedPage.locator(`//input[@type='checkbox']`);
    await checkboxes.nth(1).click();

    // Open more actions
    const moreActionsBtn = authenticatedPage.locator(
      `//button[@data-test-id='bulk_action_toolbar_more_actions_button']`
    );
    await moreActionsBtn.click();

    const deleteOption = authenticatedPage.locator(`//span[normalize-space()='Delete products']`);
    await deleteOption.waitFor({ state: 'visible' });
    await deleteOption.click();

    // Confirmation modal must appear — product not yet deleted
    const modal = authenticatedPage.locator(`//*[contains(text(),'Are you sure you want to delete')]`);
    await expect(modal, 'Confirmation modal must appear before deletion').toBeVisible();

    // Cancel to avoid deleting (fixture handles cleanup)
    const cancelBtn = authenticatedPage.locator(
      `//div[contains(@class,'delete-products-modal')]//span[text()='Cancel']/ancestor::button`
    );
    await cancelBtn.click();
  });

});