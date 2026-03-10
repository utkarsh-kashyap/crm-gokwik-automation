import { IConfiguration } from '@cucumber/cucumber/api';

const config: Partial<IConfiguration> = {
  paths:          ['cucumber/features/**/*.feature'],
  require:        [
    'cucumber/support/world.ts',
    'cucumber/support/hooks.ts',
    'cucumber/step-definitions/**/*.ts',
  ],
  requireModule:  ['ts-node/register'],
  format:         [
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-results.json',
  ],
  formatOptions:  { snippetInterface: 'async-await' },
};

export default config;