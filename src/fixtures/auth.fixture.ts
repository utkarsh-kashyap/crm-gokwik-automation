import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { config } from '../../config/env.config';
import { getLogger } from '../utils/logger';

const log = getLogger('AuthFixture');

export interface AuthFixtures {
  authenticatedPage: Page;
}

export const authTest = base.extend<AuthFixtures>({

  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    const dashboard  = new DashboardPage(page);

    await loginPage.login(config.auth.email, config.auth.password, config.auth.otp);
    await dashboard.switchMerchant(config.merchantId);

    log.debug('Auth fixture: ready');
    await use(page);
  },
});

export { expect } from '@playwright/test';