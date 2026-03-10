# CRM Admin Automation Framework

> Playwright · TypeScript · Cucumber BDD · Allure · GitHub Actions

A production-grade end-to-end automation framework for the CRM Admin dashboard — Products module. Built with a dual-layer approach: Playwright spec files for technical depth and Cucumber BDD for business-readable scenarios, both sharing the same Page Object layer.


---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Test Runner | Playwright 1.44 + TypeScript 5.4 | Browser automation and assertions |
| BDD Layer | Cucumber 10 | Business-readable scenarios |
| Reporting | Allure + Playwright HTML + Cucumber HTML | Multi-format test reports |
| Logging | Winston | Structured step-level console logs |
| CI/CD | GitHub Actions | Automated pipeline on PR and push |

---

## 📁 Project Structure

```
crm-automation/
│
├── config/
│   └── env.config.ts              # Typed config — reads from .env, never hardcoded
│
├── src/
│   ├── pages/                     # Page Object Model
│   │   ├── base.page.ts           # safeClick, safeFill, waitForLoader — shared helpers
│   │   ├── login.page.ts          # 3-step login: email → password → OTP
│   │   ├── dashboard.page.ts      # Merchant switch, nav menu, direct navigation
│   │   └── products/
│   │       ├── products-list.page.ts   # Listing: search, delete, bulk actions
│   │       └── product-form.page.ts    # Create/edit form, variants, save/delete
│   │
│   ├── fixtures/
│   │   ├── auth.fixture.ts        # Login + merchant switch before each test
│   │   └── product.fixture.ts     # Creates product before test, cleans up after
│   │
│   ├── data/
│   │   └── test-data.ts           # TestDataGenerator — unique timestamped names per run
│   │
│   └── utils/
│       ├── logger.ts              # Winston logger with step tracking
│       ├── network-interceptor.ts # Intercept and mock network requests
│       ├── ai-analyzer.ts         # GPT-4o-mini failure analysis (optional)
│       └── ai-reporter.ts         # Playwright reporter that triggers AI analysis
│
├── tests/spec/                    # Playwright technical test specs
│   ├── auth/
│   │   └── login.spec.ts          # Login flows, validation, redirect
│   └── products/
│       ├── create.spec.ts         # Create product — all variations
│       ├── update.spec.ts         # Update product name and fields
│       ├── delete.spec.ts         # Delete from detail + bulk delete
│       ├── search-filter.spec.ts  # Search, pagination, no-results state
│       └── network-resilience.spec.ts  # API failures, timeouts, error handling
│
├── cucumber/
│   ├── features/
│   │   ├── login.feature                    # BDD login scenarios
│   │   └── products/
│   │       ├── create-product.feature       # Create product BDD scenarios
│   │       └── manage-product.feature       # Update, delete, search BDD scenarios
│   ├── step-definitions/
│   │   └── products.steps.ts      # All step implementations — reuse page objects
│   └── support/
│       ├── world.ts               # CRMWorld — shared browser context + scenario state
│       └── hooks.ts               # Before/After — browser init, screenshot on failure
│
├── .github/
│   └── workflows/
│       ├── smoke.yml              # Triggered on every PR — runs @smoke tests
|       ├── crud.yml               # Triggered on every PR — runs basic crud operation tests
│       └── regression.yml         # Triggered on push to main — full suite
│
├── cucumber.js                    # Cucumber root config (CommonJS bootstrap)
├── cucumber/cucumber.config.ts    # Cucumber config (TypeScript)
├── playwright.config.ts           # Playwright config
├── .env.example                   # Template — copy to .env and fill values
└── package.json
```

---

## ⚙️ Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd crm-automation
npm install
npx playwright install chromium
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
BASE_URL=https://qa-mdashboard.dev.gokwik.in
LOGIN_EMAIL=your@email.com
LOGIN_PASSWORD=yourpassword
LOGIN_OTP=123456
MERCHANT_ID=your_merchant_id
HEADLESS=true
SLOW_MO=0
DEFAULT_TIMEOUT=30000
NAVIGATION_TIMEOUT=60000
```

> ⚠️ Never commit `.env` — it is gitignored. Credentials must only live in `.env` locally and in GitHub Secrets for CI.

---

## 🚀 Running Tests

### Playwright Spec Tests

```bash
# Full suite (cleans allure-results before running)
npm test

# Smoke tests only — fast, ~3 min
npm run test:smoke

# Full regression suite
npm run test:regression

# Products module only
npm run test:products

# Auth/login tests only
npm run test:auth

# Network resilience tests
npm run test:network

# With browser visible — useful for debugging
npm run test:headed

# Step-through debug mode
npm run test:debug

# Playwright interactive UI mode
npm run test:ui
```

### Cucumber BDD Scenarios

```bash
# All scenarios (cleans allure-results before running)
npm run cucumber

# Smoke scenarios only
npm run cucumber:smoke

# Regression scenarios only
npm run cucumber:regression
```

> All `npm test` and `npm run cucumber` commands automatically clean `allure-results/` before running so reports always reflect the latest run only.

---

## 📊 Reports

### Playwright HTML Report

```bash
npm run report
```

Opens the built-in Playwright HTML report in your browser. Shows each test with:
- Pass/fail status per step
- Screenshots on failure
- Video recording on failure
- Full trace file for debugging

- <img width="1301" height="940" alt="image" src="https://github.com/user-attachments/assets/169336af-0a05-4f29-8f08-466f2c89fd6a" />


### Allure Report

```bash
# Step 1 — generate from latest results
npm run allure:generate

# Step 2 — open in browser
npm run allure:open

# Or use live server (auto-refresh as tests run)
npm run allure:serve
```

Allure report includes:
- Dashboard with pass/fail/skip breakdown
- Step-level timeline per test
- Screenshots attached on failure
- Test duration and trends
- Suite grouping by tag

- <img width="1906" height="945" alt="image" src="https://github.com/user-attachments/assets/48f7cd68-dc28-4d84-adeb-63de71a17ec9" />


### Cucumber HTML Report

After any cucumber run, open:
```
reports/cucumber-report.html
```

<img width="1603" height="949" alt="image" src="https://github.com/user-attachments/assets/a58c4b9c-d400-4ec7-a9bc-d67c21ecf605" />


### Clean all generated reports manually

```bash
npm run clean
```

Wipes `allure-results/`, `allure-report/`, `test-results/`, `playwright-report/`, and `reports/`.

---

## 🏷️ Tags

Tags control which tests run. Use `--grep` for Playwright and `--tags` for Cucumber.

### Playwright Tags

| Tag | Scope |
|---|---|
| `@smoke` | Critical happy path — fast, runs on every PR |
| `@regression` | Full coverage including edge cases |
| `@products` | All product module tests |
| `@create` | Create product tests |
| `@update` | Update product tests |
| `@delete` | Delete product tests |
| `@search` | Search and filter tests |
| `@pagination` | Pagination tests |
| `@network` | Network resilience tests |
| `@negative` | Negative/validation tests |
| `@auth` | Authentication tests |

```bash
# Single tag
npx playwright test --grep @smoke

# Combine tags (AND)
npx playwright test --grep "@products and @delete"

# Exclude a tag
npx playwright test --grep "@regression and not @network"
```

### Cucumber Tags

| Tag | Scope |
|---|---|
| `@smoke` | Core happy path BDD scenarios |
| `@regression` | Full BDD scenario suite |
| `@products` | Product-related scenarios |
| `@create` | Create product scenarios |
| `@negative` | Negative/validation scenarios |

```bash
# Single tag
npx cucumber-js --tags @smoke

# Combine tags
npx cucumber-js --tags "@smoke and @products"

# Exclude
npx cucumber-js --tags "not @regression"
```

---

## 📋 Logging

The framework uses Winston for structured step-level logging. Every significant action is logged automatically.

### Log Levels

| Level | When used |
|---|---|
| `info` | Step completion, navigation success, product created/deleted |
| `debug` | Fixture setup/teardown, internal state |
| `warn` | Non-blocking issues — cleanup failures, slow responses |
| `error` | Unhandled exceptions (auto-captured) |

### Sample Console Output

```
10:05:16 info [TestStep]      ▶ Login — sandboxuser1@gokwik.co
10:05:21 info [LoginPage]       Login successful
10:05:21 info [TestStep]      ▶ Switch merchant — 19h577u3p4be
10:05:24 info [DashboardPage]   Merchant switched to: 19h577u3p4be
10:05:33 info [TestStep]      ▶ Click Add product
10:05:34 info [TestStep]      ▶ Fill product title — Test-PRDN-1773116434915
10:05:34 info [TestStep]      ▶ Fill inventory SKU — SKN-1773116434915
10:05:35 info [TestStep]      ▶ Submit create product
10:05:37 info [ProductFormPage] Product created — ID: 17731164353929422
10:05:42 info [TestStep]      ▶ Search product — Test-PRDN-1773116434915
```

---

## 🧪 Test Data

All test data is generated fresh per test using `TestDataGenerator`:

```typescript
const data = TestDataGenerator.product();
// data.name        → 'Test-PRDN-1773116434915'       (timestamp-suffixed)
// data.sku         → 'SKN-1773116434915'
// data.updatedName → 'Test-PRDN-UPDATED-1773116434915'
```

**Rules:**
- Generated once per test, reused within that test
- Never shared across tests — each test owns its data
- Timestamp suffix prevents collision between parallel runs
- Never hardcoded in feature files — stored on `CRMWorld` and referenced in steps
- Credentials are never in test data — always sourced from `.env`

---

## 🏛️ Architecture

### Why Cucumber AND Playwright Spec files?

| Playwright Specs | Cucumber BDD |
|---|---|
| Technical edge cases | Business-readable happy paths |
| Network failures, race conditions | Stakeholder-facing scenarios |
| Boundary tests, negative validation | Acceptance criteria documentation |
| Deep assertion coverage | Feature behaviour specification |

Both layers share the **same Page Objects** — zero duplication of automation logic.

### Page Object Design

Every page object extends `BasePage` which provides:

```typescript
safeClick(locator, description)     // waits for visible, logs, wraps error
safeFill(locator, value, description) // clears first, fills, logs
waitForLoaderToDisappear()           // handles app loading states gracefully
```

### Fixture Strategy

| Fixture | Responsibility |
|---|---|
| `authTest` | Logs in + switches to correct merchant before each test |
| `productTest` | Extends authTest, creates a product before test, deletes it after via UI |

### Test Isolation

Each test:
1. Gets its own browser context — no shared state between tests
2. Logs in fresh — auth is always verified, not assumed
3. Generates unique data — timestamp-based names prevent collisions
4. Cleans up its own data — tests never leave orphaned data

---

## 🔁 CI / CD

### Pipelines

| Pipeline | Trigger | What runs | Expected time |
|---|---|---|---|
| `smoke.yml` | Every PR to any branch | `@smoke` tagged Playwright tests | ~7 min |
| `crud.yml` | Every PR to any branch | `test name based` tagged Playwright tests | ~4 min |
| `regression.yml` | Push to `main` branch | Full Playwright suite + Cucumber | ~20 min |

<img width="1857" height="930" alt="image" src="https://github.com/user-attachments/assets/6d80130e-da3e-4d42-8186-768f12d43921" />


### GitHub Secrets Required

Add these under `Settings → Secrets and variables → Actions` in your GitHub repository:

| Secret Name | Description |
|---|---|
| `BASE_URL` | App URL — `https://qa-mdashboard.dev.gokwik.in` |
| `LOGIN_EMAIL` | Test account email |
| `LOGIN_PASSWORD` | Test account password |
| `LOGIN_OTP` | OTP value for test environment |
| `MERCHANT_ID` | Merchant ID to switch to after login |
| `OPENAI_API_KEY` | OpenAI API key for AI Error Analyzer  |

---

## 🗂️ Test Coverage

### Playwright Specs

| Spec File | Test Cases | Tags |
|---|---|---|
| `login.spec.ts` | Valid login, wrong password, wrong OTP, empty fields, redirect | `@smoke` `@regression` `@auth` |
| `create.spec.ts` | Title only, with category, with size variant, URL update, no-title validation, nav via menu | `@smoke` `@regression` `@negative` |
| `update.spec.ts` | Update name, verify listing, old name removed | `@regression` |
| `delete.spec.ts` | Delete from detail, auto-navigate after delete, bulk delete, cancel bulk delete | `@regression` |
| `search-filter.spec.ts` | Exact name search, no-results state, pagination default count | `@regression` `@pagination` |
| `network-resilience.spec.ts` | API failure on save, network abort handling | `@regression` `@network` |

### Cucumber BDD Scenarios

| Feature File | Scenarios |
|---|---|
| `login.feature` | Successful login, wrong OTP stays on screen, Next button disabled initially |
| `create-product.feature` | Required fields only, with size variant, no title validation, URL contains product ID |
| `manage-product.feature` | Update name, delete from detail, bulk delete, cancel bulk delete, search by name, no-match search |

---

## 🛠️ Extending the Framework

### Adding a new Page Object

1. Create `src/pages/<module>/<name>.page.ts` extending `BasePage`
2. Define locators as `private readonly` class properties
3. Implement action methods using `safeClick` / `safeFill`
4. Add assertion methods prefixed with `expect`

### Adding a new Playwright Spec

1. Create `tests/spec/<module>/<name>.spec.ts`
2. Import `authTest` or `productTest` from fixtures
3. Tag each test with `@smoke` or `@regression` and the module tag
4. Follow the pattern: setup → action → assertion → cleanup

### Adding a new Cucumber Scenario

1. Add the scenario to the relevant `.feature` file under `cucumber/features/`
2. Implement any new steps in `cucumber/step-definitions/products.steps.ts`
3. Store scenario-level state on `this` (CRMWorld), never in module-level variables
4. Never write Playwright/browser logic directly in step definitions — always delegate to page objects

### Adding a new environment variable

1. Add the variable to `.env.example` with a comment
2. Add the typed property to `config/env.config.ts`
3. Reference it via `config.<property>` throughout the codebase — never call `process.env` directly in tests
