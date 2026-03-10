// ─────────────────────────────────────────────
// Test Data Generator
//
// Single source of truth for all dynamic test data.
// All names and SKUs follow agreed standards:
//   Product Name : Test-PRDN-{timestamp}
//   Updated Name : Test-PRDN-UPDATED-{timestamp}
//   SKU          : SKN-{digitsOnlyTimestamp}
//
// Usage:
//   const data = TestDataGenerator.product();
//   data.name  → 'Test-PRDN-1720123456789'
//   data.sku   → 'SKN-1720123456789'
// ─────────────────────────────────────────────

export interface ProductTestData {
  name: string;
  sku: string;
  updatedName: string;
}

export interface VariantTestData {
  size: string;
  sku: string;
}

export class TestDataGenerator {
  /**
   * Generates a unique timestamp — digits only, no dashes.
   * Used as suffix for all dynamic names.
   */
  static timestamp(): string {
    return Date.now().toString();
  }

  /**
   * Generates a complete product test data set.
   * Call once per test and reuse within that test — do NOT call
   * multiple times in the same test or names will differ.
   *
   * @example
   * const data = TestDataGenerator.product();
   * // Use data.name for create, search, delete in same test
   */
  static product(): ProductTestData {
    const ts = TestDataGenerator.timestamp();
    return {
      name:        `Test-PRDN-${ts}`,
      sku:         `SKN-${ts}`,
      updatedName: `Test-PRDN-UPDATED-${ts}`,
    };
  }

  /**
   * Generates SKU only — for cases where just a SKU is needed.
   */
  static sku(): string {
    return `SKN-${TestDataGenerator.timestamp()}`;
  }

  /**
   * Generates variant test data for a given size.
   */
  static variant(size: string): VariantTestData {
    return {
      size,
      sku: `SKN-${TestDataGenerator.timestamp()}`,
    };
  }
}

// ─────────────────────────────────────────────
// Static Test Constants
// Values that never change between runs
// ─────────────────────────────────────────────
export const TestConstants = {
  category:     'Clothing > Men > Shirts',
  variantSize:  'X-Large',
  merchant: {
    id:          '19h577u3p4be',
    displayName: 'Weryzee QA',
  },
  // Credentials are in .env / env.config.ts — never hardcode here
  urls: {
    login:    '/login',
    products: '/gk-pages/store/19h577u3p4be/products',
    newProduct: '/gk-pages/store/19h577u3p4be/products/new',
  },
} as const;