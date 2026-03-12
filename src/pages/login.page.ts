import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { config } from '../../config/env.config';
import { logStep } from '../utils/logger';

export class LoginPage extends BasePage {

  private readonly emailInput    = this.page.locator(`//input[@name='email']`);
  private readonly passwordInput = this.page.locator(`//input[@type='password']`);
  private readonly nextButton    = this.page.locator(`//*[text()='Next']/parent::button`);
  private readonly otpInput      = this.page.locator(`//*[normalize-space()='Enter OTP']//input[@type='text']`);

  async navigateToLogin(): Promise<void> {
    await this.page.goto(config.baseUrl + '/login');
  }

  /**
   * Full 3-step login: email → password → OTP
   */
  async login(
    email    = config.auth.email,
    password = config.auth.password,
    otp      = config.auth.otp
  ): Promise<void> {
    logStep('Login', email);
    await this.navigateToLogin();

    // Step 1 — Email
    await this.safeFill(this.emailInput, email, 'Email input');
    await this.safeClick(this.nextButton, 'Next (after email)');

    // Step 2 — Password reveals after email submitted
    await this.passwordInput.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeFill(this.passwordInput, password, 'Password input');
    await this.safeClick(this.nextButton, 'Next (after password)');

    // Step 3 — OTP screen
    await this.otpInput.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeFill(this.otpInput, otp, 'OTP input');
    await this.safeClick(this.nextButton, 'Next (after OTP)');

    await this.page.waitForURL(/index\.html|executive-summary|gk-pages/, {
      timeout: config.timeouts.navigation,
    });
    this.log.info('Login successful');
  }

  async submitEmail(email: string): Promise<void> {
    await this.navigateToLogin();
    await this.safeFill(this.emailInput, email, 'Email input');
    await this.safeClick(this.nextButton, 'Next (after email)');
  }

  async submitEmailAndPassword(email: string, password: string): Promise<void> {
    await this.submitEmail(email);
    await this.passwordInput.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeFill(this.passwordInput, password, 'Password input');
    await this.safeClick(this.nextButton, 'Next (after password)');
  }

  async submitOtp(otp: string): Promise<void> {
    await this.otpInput.waitFor({ state: 'visible', timeout: config.timeouts.default });
    await this.safeFill(this.otpInput, otp, 'OTP input');
    await this.safeClick(this.nextButton, 'Next (after OTP)');
  }

  async fillEmail(email: string): Promise<void> {
    await this.navigateToLogin();
    await this.safeFill(this.emailInput, email, 'Email input');
  }

  async isOtpPresent(): Promise<boolean> {
    try {
      return await this.otpInput.count() > 0;
    } catch {
      return false;
    }
  }

  // ─── Assertions ────────────────────────────

  async expectNextButtonDisabled(): Promise<void> {
    await expect(this.nextButton, 'Next button should be disabled initially').toBeDisabled();
  }

  async expectNextButtonEnabled(): Promise<void> {
    await expect(this.nextButton, 'Next button should enable after input').toBeEnabled();
  }

  async expectPasswordVisible(): Promise<void> {
    await expect(this.passwordInput, 'Password field should appear after email submitted').toBeVisible();
  }

  async expectOtpScreenVisible(): Promise<void> {
    await expect(this.otpInput, 'OTP input should be visible after valid credentials').toBeVisible();
  }

  async expectRedirectedToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/index\.html|executive-summary|gk-pages/, {
      timeout: config.timeouts.navigation,
    });
  }

  async expectStillOnOtpScreen(): Promise<void> {
    await expect(this.otpInput, 'Should remain on OTP screen after invalid OTP').toBeVisible();
  }
}