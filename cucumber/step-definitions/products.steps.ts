import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CRMWorld } from '../support/world';
import { LoginPage } from '../../src/pages/login.page';
import { DashboardPage } from '../../src/pages/dashboard.page';
import { ProductsListPage } from '../../src/pages/products/products-list.page';
import { ProductFormPage } from '../../src/pages/products/product-form.page';
import { TestDataGenerator, TestConstants } from '../../src/data/test-data';
import { config } from '../../config/env.config';
import { getLogger } from '../../src/utils/logger';

const log = getLogger('StepDefinitions');

// ─── Auth Steps ────────────────────────────────────────────────────────────

Given('I am on the login page', async function (this: CRMWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.navigateToLogin();
});

Given('I am logged in and on the Products page', async function (this: CRMWorld) {
  const loginPage  = new LoginPage(this.page);
  const dashboard  = new DashboardPage(this.page);
  const listPage   = new ProductsListPage(this.page);

  await loginPage.login(config.auth.email, config.auth.password, config.auth.otp);
  await dashboard.switchMerchant(config.merchantId);
  await listPage.goto();
});

When('I enter my email and click Next', async function (this: CRMWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.submitEmail(config.auth.email);
});

When('I enter my password and click Next', async function (this: CRMWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.submitEmailAndPassword(config.auth.email, config.auth.password);
  // submitEmailAndPassword re-submits email internally — for step isolation
  // we just enter password here via page directly
  await loginPage.expectPasswordVisible();
});

When('I enter the OTP and click Next', async function (this: CRMWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.submitOtp(config.auth.otp);
});

When('I enter an incorrect OTP {string} and click Next', async function (
  this: CRMWorld, otp: string
) {
  const loginPage = new LoginPage(this.page);
  await loginPage.submitOtp(otp);
});

Then('I should be redirected to the dashboard', async function (this: CRMWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.expectRedirectedToDashboard();
});

Then('the Next button should be disabled', async function (this: CRMWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.expectNextButtonDisabled();
});

Then('I should remain on the OTP screen', async function (this: CRMWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.expectStillOnOtpScreen();
});

// ─── Product Precondition Steps ────────────────────────────────────────────

Given('a product exists in the listing', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  const formPage = new ProductFormPage(this.page);

  // Generate fresh data — stored on World for reuse in subsequent steps
  const data = TestDataGenerator.product();
  this.currentProductName = data.name;
  this.currentProductSku  = data.sku;

  await listPage.goto();
  await listPage.clickAddProduct();
  await formPage.fillTitle(data.name);
  await formPage.fillInventorySku(data.sku);
  this.currentProductId = await formPage.submitCreate();

  await listPage.goto();
  await listPage.searchProduct(data.name);
  await listPage.expectProductVisible(data.name);

  log.debug(`Precondition: product created — "${data.name}"`);
});

// ─── Create Product Steps ──────────────────────────────────────────────────

When('I click Add product', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.clickAddProduct();
});

When('I fill the product title with a generated name', async function (this: CRMWorld) {
  const formPage = new ProductFormPage(this.page);

  // Generate once and store on World — reused in assertion steps
  if (!this.currentProductName) {
    const data = TestDataGenerator.product();
    this.currentProductName = data.name;
    this.currentProductSku  = data.sku;
  }

  await formPage.fillTitle(this.currentProductName);
});

When('I fill the inventory SKU with a generated SKU', async function (this: CRMWorld) {
  const formPage = new ProductFormPage(this.page);

  // Reuse SKU generated alongside product name, or generate fresh
  if (!this.currentProductSku) {
    this.currentProductSku = TestDataGenerator.sku();
  }

  await formPage.fillInventorySku(this.currentProductSku);
});

When('I add a size variant {string} with a generated SKU', async function (
  this: CRMWorld, size: string
) {
  const formPage = new ProductFormPage(this.page);
  const variantSku = TestDataGenerator.sku();
  await formPage.addSizeVariant(size, variantSku, 0);
});

When('I click Create Product', async function (this: CRMWorld) {
  const formPage = new ProductFormPage(this.page);
  this.currentProductId = await formPage.submitCreate();
  log.debug(`Product created — id: ${this.currentProductId}, name: ${this.currentProductName}`);
});

// ─── Update Steps ──────────────────────────────────────────────────────────

When('I open the product', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.searchProduct(this.currentProductName);
  await listPage.clickProduct(this.currentProductName);
});

When('I update the product title with a generated updated name', async function (this: CRMWorld) {
  const formPage = new ProductFormPage(this.page);
  this.updatedProductName = TestDataGenerator.product().updatedName;
  await formPage.fillTitle(this.updatedProductName);
});

When('I click Save Changes', async function (this: CRMWorld) {
  const formPage = new ProductFormPage(this.page);
  await formPage.submitSaveChanges();
});

// ─── Delete Steps ──────────────────────────────────────────────────────────

When('I delete the product from the detail page', async function (this: CRMWorld) {
  const formPage = new ProductFormPage(this.page);
  await formPage.deleteFromDetailPage();
});

When('I delete the product from the listing', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.deleteProductFromListing(this.currentProductName);
});

When('I cancel the bulk delete of the product', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.cancelDeleteFromListing(this.currentProductName);
});

// ─── Search Steps ──────────────────────────────────────────────────────────

When('I search for the product by name', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.searchProduct(this.currentProductName);
});

When('I search for {string}', async function (this: CRMWorld, searchTerm: string) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.searchProduct(searchTerm);
});

// ─── Assertion Steps ───────────────────────────────────────────────────────

Then('the product should appear in the listing', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.searchProduct(this.currentProductName);
  await listPage.expectProductVisible(this.currentProductName);
});

Then('the URL should contain the product ID', async function (this: CRMWorld) {
  expect(this.currentProductId, 'Product ID should be captured').toBeTruthy();
  expect(this.page.url()).toContain(this.currentProductId);
});

Then('the form should remain on the create page', async function (this: CRMWorld) {
  await expect(this.page).toHaveURL(/\/products\/new/);
});

Then('the updated product name should appear in the listing', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.searchProduct(this.updatedProductName);
  await listPage.expectProductVisible(this.updatedProductName);
});

Then('the original product name should not appear in the listing', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.searchProduct(this.currentProductName);
  await listPage.expectNoDataVisible();
});

Then('the page should navigate back to the products listing', async function (this: CRMWorld) {
  await expect(this.page).toHaveURL(/\/products$/, { timeout: 10000 });
});

Then('the deleted product should not appear in the listing', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.searchProduct(this.currentProductName);
  await listPage.expectNoDataVisible();
});

Then('the product should still appear in the listing', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.goto();
  await listPage.searchProduct(this.currentProductName);
  await listPage.expectProductVisible(this.currentProductName);
});

Then('the product should appear in the search results', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.expectProductVisible(this.currentProductName);
});

Then('the No data message should be visible', async function (this: CRMWorld) {
  const listPage = new ProductsListPage(this.page);
  await listPage.expectNoDataVisible();
});