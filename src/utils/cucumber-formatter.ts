const { Formatter } = require('@cucumber/cucumber');

const PASS  = '\x1b[32m✔\x1b[0m';
const FAIL  = '\x1b[31m✘\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const CYAN  = '\x1b[36m';
const RESET = '\x1b[0m';

class CRMFormatter extends Formatter {
  constructor(options) {
    super(options);

    this.pickleNames  = new Map();
    this.pickleUris   = new Map();
    this.caseToPickle = new Map();
    this.stepResults  = new Map();
    this.scenarioIndex = 0;
    this.passCount     = 0;
    this.failCount     = 0;
    this.startTime     = Date.now();

    options.eventBroadcaster.on('envelope', (envelope) => {

      if (envelope.pickle) {
        this.pickleNames.set(envelope.pickle.id, envelope.pickle.name);
        this.pickleUris.set(envelope.pickle.id, envelope.pickle.uri ?? '');
      }

      if (envelope.testCase) {
        this.caseToPickle.set(envelope.testCase.id, envelope.testCase.pickleId);
      }

      if (envelope.testRunStarted) {
        this.startTime = Date.now();
        this.log(`\n${BOLD}${CYAN}CRM Automation Suite${RESET}\n${'─'.repeat(50)}\n`);
      }

      if (envelope.testCaseStarted) {
        this.scenarioIndex++;
        const { id, testCaseId } = envelope.testCaseStarted;
        this.stepResults.set(id, []);

        const pickleId = this.caseToPickle.get(testCaseId) ?? '';
        const name     = this.pickleNames.get(pickleId) ?? 'Unknown scenario';
        const uri      = this.pickleUris.get(pickleId) ?? '';

        this.log(`\n${BOLD}[${this.scenarioIndex}] ${name}${RESET}\n${DIM}  ${uri}${RESET}\n`);
      }

      if (envelope.testStepFinished) {
        const { testCaseStartedId, testStepResult } = envelope.testStepFinished;
        const results = this.stepResults.get(testCaseStartedId) ?? [];
        results.push(testStepResult.status);
        this.stepResults.set(testCaseStartedId, results);
      }

      if (envelope.testCaseFinished) {
        const { testCaseStartedId } = envelope.testCaseFinished;
        const steps  = this.stepResults.get(testCaseStartedId) ?? [];
        const failed = steps.some(s => s === 'FAILED');

        if (failed) {
          this.failCount++;
          this.log(`  ${FAIL} ${RED}FAILED${RESET}\n`);
        } else {
          this.passCount++;
          this.log(`  ${PASS} ${GREEN}PASSED${RESET}\n`);
        }
      }

      if (envelope.testRunFinished) {
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const total    = this.passCount + this.failCount;
        const color    = this.failCount === 0 ? GREEN : RED;

        this.log(`\n${'─'.repeat(50)}\n`);
        this.log(`${BOLD}${color}${total} scenarios: ${this.passCount} passed`);
        if (this.failCount > 0) this.log(`, ${this.failCount} failed`);
        this.log(`${RESET}\n`);
        this.log(`${DIM}Duration: ${duration}s${RESET}\n`);
        this.log(`${'─'.repeat(50)}\n\n`);
      }
    });
  }
}

module.exports = CRMFormatter;