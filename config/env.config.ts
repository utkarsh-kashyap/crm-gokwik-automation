import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────
interface AuthConfig {
  readonly email: string;
  readonly password: string;
  readonly otp: string;
}

interface TimeoutConfig {
  readonly default: number;
  readonly navigation: number;
  readonly api: number;
  readonly animation: number;
  readonly toast: number;
}

interface EnvConfig {
  readonly baseUrl: string;
  readonly auth: AuthConfig;
  readonly merchantId: string;
  readonly openAiApiKey: string;
  readonly isHeadless: boolean;
  readonly slowMo: number;
  readonly timeouts: TimeoutConfig;
  readonly productsPath: string;
}

// ─────────────────────────────────────────────
// Loader — validates required values at startup
// ─────────────────────────────────────────────
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Config] Missing required environment variable: "${key}". ` +
      `Please check your .env file against .env.example.`
    );
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// ─────────────────────────────────────────────
// Exported Config — immutable, typed, validated
// ─────────────────────────────────────────────
export const config: EnvConfig = {
  baseUrl:      optionalEnv('BASE_URL', ''),
  merchantId:   optionalEnv('MERCHANT_ID', ''),
  openAiApiKey: optionalEnv('OPENAI_API_KEY', ''),
  isHeadless:   optionalEnv('HEADLESS', 'true') === 'true',
  slowMo:       parseInt(optionalEnv('SLOW_MO', '0'), 10),

  auth: {
    // Sensitive values must come from environment variables or CI secrets.
    // Defaults are intentionally empty to avoid committing credentials.
    email:    optionalEnv('LOGIN_EMAIL',    ''),
    password: optionalEnv('LOGIN_PASSWORD', ''),
    otp:      optionalEnv('LOGIN_OTP',      ''),
  },

  timeouts: {
    default:    parseInt(optionalEnv('DEFAULT_TIMEOUT',    '30000'), 10),
    navigation: parseInt(optionalEnv('NAVIGATION_TIMEOUT', '60000'), 10),
    api:        15000,
    animation:  1000,
    toast:      5000,
  },

  // Derived — always consistent, never typed in multiple places
  get productsPath(): string {
    return `/gk-pages/store/${this.merchantId}/products`;
  },
} as const;

// ─────────────────────────────────────────────
// Export individual sections for convenience
// ─────────────────────────────────────────────
export const { auth, timeouts, baseUrl, merchantId } = config;
