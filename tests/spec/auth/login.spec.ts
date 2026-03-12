import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../src/pages/login.page';
import { config } from '../../../config/env.config';

test.describe('@smoke @auth Login Flow', () => {

  test('@smoke @auth TC_AUTH_001 — valid credentials and OTP redirects to dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login();
    await loginPage.expectRedirectedToDashboard();
  });

  test('@smoke @auth TC_AUTH_002 — Next button is disabled before entering email', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.expectNextButtonDisabled();
  });

  test('@smoke @auth TC_AUTH_003 — Next button enables after email is entered', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.fillEmail(config.auth.email);
    await loginPage.expectNextButtonEnabled();
  });

  test('@smoke @auth TC_AUTH_004 — password field appears after email submitted', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.submitEmail(config.auth.email);
    await loginPage.expectPasswordVisible();
  });

  test('@smoke @auth TC_AUTH_005 — OTP screen appears after valid email and password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.submitEmailAndPassword(config.auth.email, config.auth.password);
    await loginPage.expectOtpScreenVisible();
  });

});

test.describe('@regression @auth Login — Negative Scenarios', () => {

  test('@regression @auth TC_AUTH_006 — wrong password does not proceed to OTP screen', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.submitEmailAndPassword(config.auth.email, 'WrongPassword!999');

    // Should NOT show OTP screen after wrong password
    const otpPresent = await loginPage.isOtpPresent();
    expect(otpPresent).toBeFalsy();
  });

  test('@regression @auth TC_AUTH_007 — wrong OTP stays on OTP screen', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.submitEmailAndPassword(config.auth.email, config.auth.password);
    await loginPage.expectOtpScreenVisible();

    await loginPage.submitOtp('000000');

    // Should remain on OTP screen — not redirected
    await loginPage.expectStillOnOtpScreen();
  });

  test('@regression @auth TC_AUTH_008 — Next button disabled with empty email', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    // Do not type anything — button should remain disabled
    await loginPage.expectNextButtonDisabled();
  });

});

test.describe('@regression @auth Login — Session Behaviour', () => {

  test('@regression @auth TC_AUTH_009 — session persists after page refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login();
    await loginPage.expectRedirectedToDashboard();

    await page.reload();
    await loginPage.expectRedirectedToDashboard();
  });

  test('@regression @auth TC_AUTH_010 — unauthenticated access to products redirects to login', async ({ page }) => {
    await page.goto(config.baseUrl + config.productsPath);
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

});
