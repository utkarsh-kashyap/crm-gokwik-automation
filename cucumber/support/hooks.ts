import { Before, After, Status, ITestCaseHookParameter, setDefaultTimeout } from '@cucumber/cucumber';

// Login + merchant switch + navigation takes 10-15s per scenario
setDefaultTimeout(120 * 1000);
import { CRMWorld } from './world';
import { getLogger } from '../../src/utils/logger';
import * as path from 'path';
import * as fs from 'fs';

const log = getLogger('CucumberHooks');

Before(async function (this: CRMWorld) {
  await this.init();
  log.debug('Scenario started');
});

After(async function (this: CRMWorld, scenario: ITestCaseHookParameter) {
  const { result } = scenario;

  if (result?.status === Status.FAILED) {
    try {
      const screenshotDir = path.resolve('./test-results/screenshots');
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

      const screenshotName = `${scenario.pickle.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
      const screenshot = await this.page.screenshot({
        path: path.join(screenshotDir, screenshotName),
        fullPage: true,
      });
      this.attach(screenshot, 'image/png');
      log.info(`Screenshot saved: ${screenshotName}`);
    } catch (e) {
      log.warn('Could not capture screenshot', { error: e });
    }
  }

  await this.cleanup();
  log.debug(`Scenario ended — status: ${result?.status}`);
});