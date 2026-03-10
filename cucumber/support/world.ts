import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { config } from '../../config/env.config';

export class CRMWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  // Shared state between steps within a scenario
  currentProductName: string = '';
  currentProductSku:  string = '';
  currentProductId:   string = '';
  updatedProductName: string = '';

  constructor(options: IWorldOptions) {
    super(options);
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: config.isHeadless,
      slowMo:   config.slowMo,
    });

    this.context = await this.browser.newContext({
      viewport:          { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
      baseURL:           config.baseUrl,
    });

    this.page = await this.context.newPage();
  }

  async cleanup(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(CRMWorld);
