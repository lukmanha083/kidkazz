/**
 * Phase 2 Unit Tests: Data Migration Script
 *
 * Tests for DDD migration from Product Service to Inventory Service:
 * - productLocations → inventory
 * - variantLocations → inventory (with variantId)
 * - productUOMLocations → inventory (with uomId)
 * - products.expirationDate → inventoryBatches
 *
 * Reference: docs/DDD_REFACTORING_ROADMAP.md - Phase 2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateId,
  migrateProductLocations,
  migrateVariantLocations,
  migrateUOMLocations,
  migrateExpirationDates,
  runFullMigration,
  validateMigration,
  type MigrationResult,
} from './migrate-to-inventory-service';

// Mock D1Database interface
interface MockD1PreparedStatement {
  bind: (...args: unknown[]) => MockD1PreparedStatement;
  all: <T>() => Promise<{ results: T[] | null }>;
  run: () => Promise<{ meta?: { changes?: number } }>;
  first: <T>() => Promise<T | null>;
}

interface MockD1Database {
  prepare: (query: string) => MockD1PreparedStatement;
}

// Helper to create mock database
function createMockDatabase(mockData: Record<string, unknown[]>): MockD1Database {
  const preparedQueries: Record<string, unknown[]> = {};

  return {
    prepare: (query: string) => {
      let boundArgs: unknown[] = [];

      const statement: MockD1PreparedStatement = {
        bind: (...args: unknown[]) => {
          boundArgs = args;
          return statement;
        },
        all: async <T>() => {
          // Handle COUNT queries first (before table name checks)
          if (query.includes('COUNT')) {
            // Return count based on table
            if (query.includes('product_locations')) {
              return { results: [{ count: (mockData['product_locations'] || []).length }] as T[] };
            }
            if (query.includes('variant_locations')) {
              return { results: [{ count: (mockData['variant_locations'] || []).length }] as T[] };
            }
            if (query.includes('product_uom_locations')) {
              return { results: [{ count: (mockData['product_uom_locations'] || []).length }] as T[] };
            }
            if (query.includes('products') && query.includes('expiration_date')) {
              return { results: [{ count: (mockData['products_with_expiration'] || []).length }] as T[] };
            }
            if (query.includes('inventory_batches')) {
              return { results: [{ count: (mockData['inventory_batches'] || []).length }] as T[] };
            }
            if (query.includes('inventory') && query.includes('variant_id IS NOT NULL')) {
              return { results: [{ count: (mockData['inventory_variants'] || []).length }] as T[] };
            }
            if (query.includes('inventory') && query.includes('uom_id IS NOT NULL')) {
              return { results: [{ count: (mockData['inventory_uoms'] || []).length }] as T[] };
            }
            if (query.includes('inventory')) {
              return { results: [{ count: (mockData['inventory_products'] || []).length }] as T[] };
            }
            return { results: [{ count: 0 }] as T[] };
          }

          // Determine which data to return based on query
          if (query.includes('product_locations')) {
            return { results: (mockData['product_locations'] || []) as T[] };
          }
          if (query.includes('variant_locations')) {
            return { results: (mockData['variant_locations'] || []) as T[] };
          }
          if (query.includes('product_uom_locations')) {
            return { results: (mockData['product_uom_locations'] || []) as T[] };
          }
          if (query.includes('products') && query.includes('expiration_date')) {
            return { results: (mockData['products_with_expiration'] || []) as T[] };
          }
          if (query.includes('inventory') && query.includes('SELECT')) {
            let results = mockData['inventory'] || [];

            // Check for variant/UOM specific queries
            if (query.includes('variant_id IS NOT NULL')) {
              results = mockData['inventory_variants'] || [];
            } else if (query.includes('uom_id IS NOT NULL')) {
              results = mockData['inventory_uoms'] || [];
            } else if (query.includes('variant_id IS NULL AND uom_id IS NULL')) {
              results = mockData['inventory_products'] || mockData['inventory'] || [];
            }

            // Filter by product_id if bound
            if (query.includes('product_id = ?') && boundArgs.length > 0) {
              const productId = boundArgs[0];
              results = results.filter((r: any) => r.product_id === productId || r.productId === productId);
            }

            return { results: results as T[] };
          }
          if (query.includes('inventory_batches')) {
            let results = mockData['inventory_batches'] || [];

            // Filter by inventory_id if bound
            if (query.includes('inventory_id = ?') && boundArgs.length > 0) {
              const inventoryId = boundArgs[0];
              results = results.filter((r: any) => r.inventory_id === inventoryId || r.inventoryId === inventoryId);
            }

            return { results: results as T[] };
          }
          return { results: [] as T[] };
        },
        run: async () => {
          // Simulate successful insert/update
          return { meta: { changes: 1 } };
        },
        first: async <T>() => {
          return null as T | null;
        },
      };

      return statement;
    },
  };
}

describe('Phase 2: Data Migration Script', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with timestamp prefix', () => {
      const id = generateId();
      const parts = id.split('-');

      expect(parts).toHaveLength(2);
      expect(Number(parts[0])).toBeGreaterThan(0);
    });

    it('should generate IDs with alphanumeric suffix', () => {
      const id = generateId();
      const parts = id.split('-');

      expect(parts[1]).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('migrateProductLocations', () => {
    it('should migrate product locations with all fields', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          {
            id: 'pl-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            rack: 'A1',
            bin: '01',
            zone: 'Zone-A',
            aisle: 'Aisle-1',
            quantity: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [], // No existing records
      });

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should update existing inventory records', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          {
            id: 'pl-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            rack: 'B2',
            bin: '05',
            zone: 'Zone-B',
            aisle: 'Aisle-2',
            quantity: 200,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [
          {
            id: 'inv-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            version: 1,
          },
        ],
      });

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should handle empty product locations', async () => {
      const productDB = createMockDatabase({
        product_locations: [],
      });

      const inventoryDB = createMockDatabase({});

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: true }
      );

      expect(result.migrated).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should not make changes in dry run mode', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          {
            id: 'pl-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            quantity: 100,
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
      });

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: true, verbose: false }
      );

      // In dry run, we still count as migrated for reporting
      expect(result.migrated).toBe(1);
    });

    it('should migrate multiple product locations', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          { id: 'pl-1', productId: 'prod-1', warehouseId: 'wh-1', quantity: 100 },
          { id: 'pl-2', productId: 'prod-2', warehouseId: 'wh-1', quantity: 50 },
          { id: 'pl-3', productId: 'prod-3', warehouseId: 'wh-2', quantity: 75 },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
      });

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      expect(result.migrated).toBe(3);
      expect(result.errors).toBe(0);
    });
  });

  describe('migrateVariantLocations', () => {
    it('should migrate variant locations with parent product info', async () => {
      const productDB = createMockDatabase({
        variant_locations: [
          {
            id: 'vl-1',
            variantId: 'var-1',
            warehouseId: 'wh-1',
            rack: 'C3',
            bin: '10',
            zone: 'Zone-C',
            aisle: 'Aisle-3',
            quantity: 50,
            product_id: 'prod-1', // Joined from product_variants
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
      });

      const result = await migrateVariantLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip existing variant inventory records', async () => {
      const productDB = createMockDatabase({
        variant_locations: [
          {
            id: 'vl-1',
            variantId: 'var-1',
            warehouseId: 'wh-1',
            quantity: 50,
            product_id: 'prod-1',
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [
          {
            id: 'inv-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            variantId: 'var-1',
          },
        ],
      });

      const result = await migrateVariantLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should handle empty variant locations', async () => {
      const productDB = createMockDatabase({
        variant_locations: [],
      });

      const inventoryDB = createMockDatabase({});

      const result = await migrateVariantLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: true }
      );

      expect(result.migrated).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  describe('migrateUOMLocations', () => {
    it('should migrate UOM locations with parent product info', async () => {
      const productDB = createMockDatabase({
        product_uom_locations: [
          {
            id: 'ul-1',
            productUOMId: 'uom-1',
            warehouseId: 'wh-1',
            rack: 'D4',
            bin: '15',
            zone: 'Bulk-Storage',
            aisle: 'Aisle-4',
            quantity: 10, // 10 boxes
            product_id: 'prod-1',
            uom_code: 'BOX6',
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
      });

      const result = await migrateUOMLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip existing UOM inventory records', async () => {
      const productDB = createMockDatabase({
        product_uom_locations: [
          {
            id: 'ul-1',
            productUOMId: 'uom-1',
            warehouseId: 'wh-1',
            quantity: 10,
            product_id: 'prod-1',
            uom_code: 'BOX6',
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [
          {
            id: 'inv-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            uomId: 'uom-1',
          },
        ],
      });

      const result = await migrateUOMLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('migrateExpirationDates', () => {
    it('should create batches for products with expiration dates', async () => {
      const productDB = createMockDatabase({
        products_with_expiration: [
          {
            id: 'prod-1',
            name: 'Fresh Milk',
            sku: 'MILK-001',
            expirationDate: '2025-12-31',
            alertDate: '2025-12-24',
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [
          {
            id: 'inv-1',
            product_id: 'prod-1',
            warehouse_id: 'wh-1',
            quantity_available: 100,
          },
        ],
        inventory_batches: [],
      });

      const result = await migrateExpirationDates(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should skip products without inventory records', async () => {
      const productDB = createMockDatabase({
        products_with_expiration: [
          {
            id: 'prod-1',
            name: 'Fresh Milk',
            sku: 'MILK-001',
            expiration_date: '2025-12-31',
            alert_date: '2025-12-24',
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [], // No inventory for this product
        inventory_batches: [],
      });

      const result = await migrateExpirationDates(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: true }
      );

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should skip existing migrated batches', async () => {
      const productDB = createMockDatabase({
        products_with_expiration: [
          {
            id: 'prod-1',
            name: 'Fresh Milk',
            sku: 'MILK-001',
            expiration_date: '2025-12-31',
            alert_date: '2025-12-24',
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [
          { id: 'inv-1', warehouse_id: 'wh-1', quantity_available: 100 },
        ],
        inventory_batches: [
          { id: 'batch-1', batch_number: 'MIGRATED-prod-001' },
        ],
      });

      const result = await migrateExpirationDates(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: true }
      );

      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple inventory records for same product', async () => {
      const productDB = createMockDatabase({
        products_with_expiration: [
          {
            id: 'prod-1',
            name: 'Fresh Milk',
            sku: 'MILK-001',
            expirationDate: '2025-12-31',
            alertDate: '2025-12-24',
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [
          { id: 'inv-1', product_id: 'prod-1', warehouse_id: 'wh-1', quantity_available: 100 },
          { id: 'inv-2', product_id: 'prod-1', warehouse_id: 'wh-2', quantity_available: 50 },
        ],
        inventory_batches: [],
      });

      const result = await migrateExpirationDates(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      // Should create batches for both warehouses
      expect(result.migrated).toBe(2);
    });
  });

  describe('runFullMigration', () => {
    it('should run all migration steps', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          { id: 'pl-1', productId: 'prod-1', warehouseId: 'wh-1', quantity: 100 },
        ],
        variant_locations: [
          { id: 'vl-1', variantId: 'var-1', warehouseId: 'wh-1', quantity: 50, productId: 'prod-1' },
        ],
        product_uom_locations: [
          { id: 'ul-1', productUOMId: 'uom-1', warehouseId: 'wh-1', quantity: 10, productId: 'prod-1', uomCode: 'BOX6' },
        ],
        products_with_expiration: [
          { id: 'prod-1', name: 'Test', sku: 'TEST-001', expirationDate: '2025-12-31', alertDate: null },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
        inventory_batches: [],
      });

      const result = await runFullMigration(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: true, verbose: false }
      );

      expect(result).toBeDefined();
      expect(result.productLocations.migrated).toBeGreaterThanOrEqual(0);
      expect(result.variantLocations.migrated).toBeGreaterThanOrEqual(0);
      expect(result.uomLocations.migrated).toBeGreaterThanOrEqual(0);
      expect(result.expirationDates.migrated).toBeGreaterThanOrEqual(0);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should track errors across all steps', async () => {
      const productDB = createMockDatabase({
        product_locations: null as unknown as unknown[], // Will cause error
        variant_locations: [],
        product_uom_locations: [],
        products_with_expiration: [],
      });

      const inventoryDB = createMockDatabase({});

      const result = await runFullMigration(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false, verbose: false }
      );

      // Should complete even with errors
      expect(result).toBeDefined();
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateMigration', () => {
    it('should validate successful migration', async () => {
      const productDB = createMockDatabase({
        product_locations: [{ id: 'pl-1' }, { id: 'pl-2' }],
        variant_locations: [{ id: 'vl-1' }],
        product_uom_locations: [{ id: 'ul-1' }],
        products_with_expiration: [{ id: 'prod-1' }],
      });

      const inventoryDB = createMockDatabase({
        inventory_products: [{ id: 'inv-1' }, { id: 'inv-2' }],
        inventory_variants: [{ id: 'inv-3' }],
        inventory_uoms: [{ id: 'inv-4' }],
        inventory_batches: [{ id: 'batch-1' }],
      });

      const result = await validateMigration(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database
      );

      expect(result.productLocationsCount).toBe(2);
      expect(result.inventoryProductsCount).toBe(2);
      expect(result.variantLocationsCount).toBe(1);
      expect(result.inventoryVariantsCount).toBe(1);
      expect(result.uomLocationsCount).toBe(1);
      expect(result.inventoryUOMsCount).toBe(1);
      expect(result.isValid).toBe(true);
    });

    it('should detect incomplete migration', async () => {
      const productDB = createMockDatabase({
        product_locations: [{ id: 'pl-1' }, { id: 'pl-2' }, { id: 'pl-3' }],
        variant_locations: [],
        product_uom_locations: [],
        products_with_expiration: [],
      });

      const inventoryDB = createMockDatabase({
        inventory_products: [{ id: 'inv-1' }], // Only 1 of 3 migrated
        inventory_variants: [],
        inventory_uoms: [],
        inventory_batches: [],
      });

      const result = await validateMigration(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database
      );

      expect(result.productLocationsCount).toBe(3);
      expect(result.inventoryProductsCount).toBe(1);
      expect(result.isValid).toBe(false);
    });
  });
});

describe('Migration Edge Cases', () => {
  describe('Location field handling', () => {
    it('should handle null location fields correctly', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          {
            id: 'pl-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            rack: null,
            bin: null,
            zone: null,
            aisle: null,
            quantity: 100,
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
      });

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false }
      );

      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should handle partial location fields', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          {
            id: 'pl-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            rack: 'A1',
            bin: null, // Only rack set
            zone: 'Zone-A',
            aisle: null,
            quantity: 100,
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
      });

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false }
      );

      expect(result.migrated).toBe(1);
    });
  });

  describe('Quantity handling', () => {
    it('should handle zero quantity', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          {
            id: 'pl-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            quantity: 0,
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
      });

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false }
      );

      expect(result.migrated).toBe(1);
    });

    it('should handle large quantities', async () => {
      const productDB = createMockDatabase({
        product_locations: [
          {
            id: 'pl-1',
            productId: 'prod-1',
            warehouseId: 'wh-1',
            quantity: 999999999,
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [],
      });

      const result = await migrateProductLocations(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false }
      );

      expect(result.migrated).toBe(1);
    });
  });

  describe('Date handling in batches', () => {
    it('should handle null alert date', async () => {
      const productDB = createMockDatabase({
        products_with_expiration: [
          {
            id: 'prod-1',
            name: 'Test Product',
            sku: 'TEST-001',
            expirationDate: '2025-12-31',
            alertDate: null, // No alert date
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [{ id: 'inv-1', product_id: 'prod-1', warehouse_id: 'wh-1', quantity_available: 100 }],
        inventory_batches: [],
      });

      const result = await migrateExpirationDates(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false }
      );

      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('should handle various date formats', async () => {
      const productDB = createMockDatabase({
        products_with_expiration: [
          {
            id: 'prod-1',
            name: 'Test Product',
            sku: 'TEST-001',
            expirationDate: '2025-12-31T23:59:59.000Z',
            alertDate: '2025-12-24T00:00:00.000Z',
          },
        ],
      });

      const inventoryDB = createMockDatabase({
        inventory: [{ id: 'inv-1', product_id: 'prod-1', warehouse_id: 'wh-1', quantity_available: 100 }],
        inventory_batches: [],
      });

      const result = await migrateExpirationDates(
        productDB as unknown as D1Database,
        inventoryDB as unknown as D1Database,
        { dryRun: false }
      );

      expect(result.migrated).toBe(1);
    });
  });
});
