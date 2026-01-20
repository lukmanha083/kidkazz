/**
 * Phase 1 Unit Tests: Inventory Schema Enhancement
 *
 * Tests for DDD-compliant schema changes:
 * - Variant and UOM support (variantId, uomId)
 * - Physical location fields (rack, bin, zone, aisle)
 * - Optimistic locking (version, lastModifiedAt)
 *
 * Reference: docs/DDD_REFACTORING_ROADMAP.md - Phase 1
 */

import { and, eq, isNull } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './index';
import { inventory, inventoryBatches, warehouses } from './schema';

describe('Phase 1: Inventory Schema Enhancement', () => {
  let testWarehouseId: string;
  let testInventoryId: string;
  let testBatchId: string;

  beforeEach(async () => {
    // Create a test warehouse
    testWarehouseId = `test-warehouse-${Date.now()}`;
    await db.insert(warehouses).values({
      id: testWarehouseId,
      code: `WH-TEST-${Date.now()}`,
      name: 'Test Warehouse',
      addressLine1: '123 Test Street',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      country: 'Indonesia',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    testInventoryId = `test-inv-${Date.now()}`;
    testBatchId = `test-batch-${Date.now()}`;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(inventoryBatches).where(eq(inventoryBatches.id, testBatchId));
    await db.delete(inventory).where(eq(inventory.id, testInventoryId));
    await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId));
  });

  describe('1.1 Variant and UOM Support', () => {
    it('should create inventory record with variantId', async () => {
      const variantId = `variant-${Date.now()}`;

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        variantId: variantId,
        uomId: null,
        quantityAvailable: 100,
        quantityReserved: 0,
        minimumStock: 10,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result).toBeDefined();
      expect(result?.variantId).toBe(variantId);
      expect(result?.uomId).toBeNull();
    });

    it('should create inventory record with uomId', async () => {
      const uomId = `uom-${Date.now()}`;

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        variantId: null,
        uomId: uomId,
        quantityAvailable: 50,
        quantityReserved: 0,
        minimumStock: 5,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result).toBeDefined();
      expect(result?.uomId).toBe(uomId);
      expect(result?.variantId).toBeNull();
    });

    it('should query inventory by variantId', async () => {
      const variantId = `variant-${Date.now()}`;

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        variantId: variantId,
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const results = await db
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, variantId))
        .all();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(testInventoryId);
    });

    it('should query inventory by uomId', async () => {
      const uomId = `uom-${Date.now()}`;

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        uomId: uomId,
        quantityAvailable: 50,
        quantityReserved: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const results = await db.select().from(inventory).where(eq(inventory.uomId, uomId)).all();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(testInventoryId);
    });
  });

  describe('1.2 Physical Location Fields', () => {
    it('should create inventory with all location fields', async () => {
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        rack: 'A1',
        bin: '01',
        zone: 'Zone-A',
        aisle: 'Aisle-1',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result).toBeDefined();
      expect(result?.rack).toBe('A1');
      expect(result?.bin).toBe('01');
      expect(result?.zone).toBe('Zone-A');
      expect(result?.aisle).toBe('Aisle-1');
    });

    it('should allow null location fields', async () => {
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        rack: null,
        bin: null,
        zone: null,
        aisle: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result).toBeDefined();
      expect(result?.rack).toBeNull();
      expect(result?.bin).toBeNull();
      expect(result?.zone).toBeNull();
      expect(result?.aisle).toBeNull();
    });

    it('should query inventory by location', async () => {
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        rack: 'B2',
        bin: '05',
        zone: 'Cold-Storage',
        aisle: 'Aisle-3',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const results = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.warehouseId, testWarehouseId),
            eq(inventory.zone, 'Cold-Storage'),
            eq(inventory.rack, 'B2')
          )
        )
        .all();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(testInventoryId);
    });
  });

  describe('1.3 Optimistic Locking - Inventory', () => {
    it('should create inventory with default version 1', async () => {
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result).toBeDefined();
      expect(result?.version).toBe(1);
    });

    it('should increment version on update', async () => {
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update with version check
      const updateResult = await db
        .update(inventory)
        .set({
          quantityAvailable: 90,
          version: 2,
          lastModifiedAt: new Date().toISOString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventory.id, testInventoryId),
            eq(inventory.version, 1) // Optimistic lock check
          )
        )
        .run();

      // For better-sqlite3, changes is directly on the result object
      expect(updateResult.changes).toBe(1);

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result?.version).toBe(2);
      expect(result?.quantityAvailable).toBe(90);
    });

    it('should fail update with wrong version (concurrent modification)', async () => {
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 2, // Current version is 2
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Attempt update with wrong version (simulating concurrent modification)
      const updateResult = await db
        .update(inventory)
        .set({
          quantityAvailable: 80,
          version: 2,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventory.id, testInventoryId),
            eq(inventory.version, 1) // Wrong version - should fail
          )
        )
        .run();

      // No rows should be updated - for better-sqlite3, changes is directly on result
      expect(updateResult.changes).toBe(0);

      // Verify quantity unchanged
      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result?.quantityAvailable).toBe(100);
      expect(result?.version).toBe(2);
    });

    it('should store lastModifiedAt timestamp', async () => {
      const timestamp = new Date().toISOString();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 1,
        lastModifiedAt: timestamp,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result?.lastModifiedAt).toBe(timestamp);
    });
  });

  describe('1.4 Optimistic Locking - Inventory Batches', () => {
    it('should create batch with default version 1', async () => {
      // First create inventory record
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create batch
      await db.insert(inventoryBatches).values({
        id: testBatchId,
        inventoryId: testInventoryId,
        productId: 'product-001',
        warehouseId: testWarehouseId,
        batchNumber: 'BATCH-001',
        quantityAvailable: 50,
        quantityReserved: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await db
        .select()
        .from(inventoryBatches)
        .where(eq(inventoryBatches.id, testBatchId))
        .get();

      expect(result).toBeDefined();
      expect(result?.version).toBe(1);
    });

    it('should increment batch version on update', async () => {
      // Create inventory record
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create batch with expiration
      await db.insert(inventoryBatches).values({
        id: testBatchId,
        inventoryId: testInventoryId,
        productId: 'product-001',
        warehouseId: testWarehouseId,
        batchNumber: 'BATCH-002',
        expirationDate: '2025-12-31',
        quantityAvailable: 50,
        quantityReserved: 0,
        status: 'active',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update batch with version check
      await db
        .update(inventoryBatches)
        .set({
          quantityAvailable: 40,
          version: 2,
          lastModifiedAt: new Date().toISOString(),
          updatedAt: new Date(),
        })
        .where(and(eq(inventoryBatches.id, testBatchId), eq(inventoryBatches.version, 1)))
        .run();

      const result = await db
        .select()
        .from(inventoryBatches)
        .where(eq(inventoryBatches.id, testBatchId))
        .get();

      expect(result?.version).toBe(2);
      expect(result?.quantityAvailable).toBe(40);
      expect(result?.lastModifiedAt).toBeDefined();
    });
  });

  describe('1.5 Combined Queries (Variant/UOM + Location)', () => {
    it('should query variant inventory by location', async () => {
      const variantId = `variant-${Date.now()}`;

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        variantId: variantId,
        quantityAvailable: 100,
        quantityReserved: 0,
        rack: 'C3',
        bin: '10',
        zone: 'Main-Floor',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const results = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.variantId, variantId),
            eq(inventory.warehouseId, testWarehouseId),
            eq(inventory.zone, 'Main-Floor')
          )
        )
        .all();

      expect(results).toHaveLength(1);
      expect(results[0].rack).toBe('C3');
      expect(results[0].variantId).toBe(variantId);
    });

    it('should query base product inventory (null variant and uom)', async () => {
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        variantId: null,
        uomId: null,
        quantityAvailable: 200,
        quantityReserved: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const results = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, 'product-001'),
            eq(inventory.warehouseId, testWarehouseId),
            isNull(inventory.variantId),
            isNull(inventory.uomId)
          )
        )
        .all();

      expect(results).toHaveLength(1);
      expect(results[0].quantityAvailable).toBe(200);
    });
  });
});
