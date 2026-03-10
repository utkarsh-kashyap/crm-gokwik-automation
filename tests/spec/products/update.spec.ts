import { productTest as test, expect } from '../../../src/fixtures/product.fixture';
import { ProductsListPage } from '../../../src/pages/products/products-list.page';
import { ProductFormPage } from '../../../src/pages/products/product-form.page';
import { TestDataGenerator } from '../../../src/data/test-data';

test.describe('@regression @products @update Update Product', () => {

  test('@regression @products @update TC_PRD_UPDATE_001 — edit product name and verify in listing', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);

    // Updated name generated fresh — timestamp unique to this test
    const updatedName = TestDataGenerator.product().updatedName;

    // Open the product via search and click
    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.clickProduct(existingProduct.name);

    // Verify form is pre-populated with existing name
    await formPage.expectTitleValue(existingProduct.name);

    // Update name and save
    await formPage.fillTitle(updatedName);
    await formPage.submitSaveChanges();

    // Navigate to fresh listing before asserting
    await listPage.goto();
    await listPage.searchProduct(updatedName);
    await listPage.expectProductVisible(updatedName);

    // Verify old name is gone
    await listPage.clearSearch();
    await listPage.searchProduct(existingProduct.name);
    await listPage.expectNoDataVisible();
  });

  test('@regression @products @update TC_PRD_UPDATE_002 — edit form is pre-populated with existing product name', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);

    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.clickProduct(existingProduct.name);

    await formPage.expectTitleValue(existingProduct.name);
  });

  test('@regression @products @update TC_PRD_UPDATE_003 — URL remains same after saving changes', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);

    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.clickProduct(existingProduct.name);

    const urlBeforeSave = authenticatedPage.url();

    const updatedName = TestDataGenerator.product().updatedName;
    await formPage.fillTitle(updatedName);
    await formPage.submitSaveChanges();

    const urlAfterSave = authenticatedPage.url();
    expect(urlAfterSave, 'URL should remain the same after saving changes').toBe(urlBeforeSave);
  });

  test('@regression @products @update TC_PRD_UPDATE_004 — Save Changes button is visible on edit page', async ({
    authenticatedPage, existingProduct
  }) => {
    const listPage = new ProductsListPage(authenticatedPage);
    const formPage = new ProductFormPage(authenticatedPage);

    await listPage.goto();
    await listPage.searchProduct(existingProduct.name);
    await listPage.clickProduct(existingProduct.name);

    await formPage.expectSaveChangesVisible();
  });

});