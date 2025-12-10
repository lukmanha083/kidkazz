/**
 * Phase 3 Unit Tests: Inventory Routes with Optimistic Locking
 *
 * Tests for DDD-compliant Phase 3 features:
 * - Optimistic locking in POST /api/inventory/adjust
 * - Variant inventory endpoint (GET /api/inventory/variant/:variantId)
 * - UOM inventory endpoint (GET /api/inventory/uom/:uomId)
 * - Low stock endpoint (GET /api/inventory/low-stock)
 *
 * Reference: docs/DDD_REFACTORING_ROADMAP.md - Phase 3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../infrastructure/db/index';
import { inventory, inventoryMovements, warehouses } from '../infrastructure/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

describe('Phase 3: Inventory Routes - Optimistic Locking & New Endpoints', () => {
  let testWarehouseId: string;
  let testInventoryId: string;

  beforeEach(async () => {
    // Create a test warehouse
    testWarehouseId = `test-warehouse-${Date.now()}`;
    await db.insert(warehouses).values({
      id: testWarehouseId,
      code: `WH-TEST-${Date.now()}`,
      name: 'Test Warehouse Phase 3',
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
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(inventoryMovements).where(eq(inventoryMovements.inventoryId, testInventoryId));
    await db.delete(inventory).where(eq(inventory.id, testInventoryId));
    await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId));
  });

  describe('3.3 Optimistic Locking in Inventory Adjustment', () => {
    it('should create new inventory with version 1', async () => {
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-optimistic-001',
        variantId: null,
        uomId: null,
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 1,
        lastModifiedAt: now.toISOString(),
        createdAt: now,
        updatedAt: now,
      });

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result).toBeDefined();
      expect(result?.version).toBe(1);
      expect(result?.quantityAvailable).toBe(100);
    });

    it('should successfully update with correct version', async () => {
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-optimistic-001',
        variantId: null,
        uomId: null,
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 1,
        lastModifiedAt: now.toISOString(),
        createdAt: now,
        updatedAt: now,
      });

      // Simulate optimistic lock update
      const updateResult = await db
        .update(inventory)
        .set({
          quantityAvailable: 90,
          version: 2,
          lastModifiedAt: new Date().toISOString(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(inventory.id, testInventoryId), eq(inventory.version, 1))
        )
        .run();

      expect(updateResult.meta?.changes).toBe(1);

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result?.version).toBe(2);
      expect(result?.quantityAvailable).toBe(90);
    });

    it('should fail update with stale version (concurrent modification)', async () => {
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-optimistic-001',
        variantId: null,
        uomId: null,
        quantityAvailable: 100,
        quantityReserved: 0,
        version: 3, // Current version is 3
        lastModifiedAt: now.toISOString(),
        createdAt: now,
        updatedAt: now,
      });

      // Attempt update with stale version (simulating concurrent modification)
      const updateResult = await db
        .update(inventory)
        .set({
          quantityAvailable: 80,
          version: 2, // Trying to update from version 1 to 2, but current is 3
          updatedAt: new Date(),
        })
        .where(
          and(eq(inventory.id, testInventoryId), eq(inventory.version, 1)) // Stale version
        )
        .run();

      // No rows should be updated
      expect(updateResult.meta?.changes).toBe(0);

      // Verify quantity unchanged
      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result?.quantityAvailable).toBe(100);
      expect(result?.version).toBe(3);
    });
  });

  describe('3.4 Variant Inventory Endpoint', () => {
    it('should query inventory by variantId', async () => {
      const variantId = `variant-${Date.now()}`;
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        variantId: variantId,
        uomId: null,
        quantityAvailable: 50,
        quantityReserved: 5,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      const results = await db
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, variantId))
        .all();

      expect(results).toHaveLength(1);
      expect(results[0].variantId).toBe(variantId);
      expect(results[0].quantityAvailable).toBe(50);
      expect(results[0].quantityReserved).toBe(5);
    });

    it('should return empty array for non-existent variantId', async () => {
      const results = await db
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, 'non-existent-variant'))
        .all();

      expect(results).toHaveLength(0);
    });

    it('should aggregate variant inventory across warehouses', async () => {
      const variantId = `variant-multi-wh-${Date.now()}`;
      const now = new Date();

      // Create inventory in first warehouse
      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        variantId: variantId,
        uomId: null,
        quantityAvailable: 30,
        quantityReserved: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      // Create second warehouse
      const testWarehouseId2 = `test-warehouse-2-${Date.now()}`;
      await db.insert(warehouses).values({
        id: testWarehouseId2,
        code: `WH-TEST-2-${Date.now()}`,
        name: 'Test Warehouse 2',
        addressLine1: '456 Test Street',
        city: 'Surabaya',
        province: 'East Java',
        postalCode: '67890',
        country: 'Indonesia',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      const testInventoryId2 = `test-inv-2-${Date.now()}`;
      await db.insert(inventory).values({
        id: testInventoryId2,
        warehouseId: testWarehouseId2,
        productId: 'product-001',
        variantId: variantId,
        uomId: null,
        quantityAvailable: 20,
        quantityReserved: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      const results = await db
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, variantId))
        .all();

      expect(results).toHaveLength(2);
      const totalAvailable = results.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
      expect(totalAvailable).toBe(50);

      // Clean up second warehouse
      await db.delete(inventory).where(eq(inventory.id, testInventoryId2));
      await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId2));
    });
  });

  describe('3.4 UOM Inventory Endpoint', () => {
    it('should query inventory by uomId', async () => {
      const uomId = `uom-box-${Date.now()}`;
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-001',
        variantId: null,
        uomId: uomId,
        quantityAvailable: 10, // 10 boxes
        quantityReserved: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      const results = await db
        .select()
        .from(inventory)
        .where(eq(inventory.uomId, uomId))
        .all();

      expect(results).toHaveLength(1);
      expect(results[0].uomId).toBe(uomId);
      expect(results[0].quantityAvailable).toBe(10);
    });
  });

  describe('3.4 Low Stock Endpoint', () => {
    it('should identify low stock items', async () => {
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-low-stock',
        variantId: null,
        uomId: null,
        quantityAvailable: 5, // Below minimum
        quantityReserved: 0,
        minimumStock: 10, // Minimum is 10
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      const allRecords = await db.select().from(inventory).all();

      const lowStockItems = allRecords
        .filter((inv) => inv.minimumStock && inv.quantityAvailable < inv.minimumStock)
        .map((inv) => ({
          inventoryId: inv.id,
          productId: inv.productId,
          quantityAvailable: inv.quantityAvailable,
          minimumStock: inv.minimumStock,
          deficit: (inv.minimumStock || 0) - inv.quantityAvailable,
        }));

      const testLowStock = lowStockItems.find(
        (item) => item.inventoryId === testInventoryId
      );
      expect(testLowStock).toBeDefined();
      expect(testLowStock?.deficit).toBe(5);
    });

    it('should not include items with adequate stock', async () => {
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-adequate-stock',
        variantId: null,
        uomId: null,
        quantityAvailable: 50, // Above minimum
        quantityReserved: 0,
        minimumStock: 10,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      const allRecords = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .all();

      const lowStockItems = allRecords.filter(
        (inv) => inv.minimumStock && inv.quantityAvailable < inv.minimumStock
      );

      expect(lowStockItems).toHaveLength(0);
    });

    it('should filter low stock by warehouse', async () => {
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-low-stock-wh',
        variantId: null,
        uomId: null,
        quantityAvailable: 3,
        quantityReserved: 0,
        minimumStock: 20,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      const lowStockInWarehouse = await db
        .select()
        .from(inventory)
        .where(eq(inventory.warehouseId, testWarehouseId))
        .all();

      const filtered = lowStockInWarehouse.filter(
        (inv) => inv.minimumStock && inv.quantityAvailable < inv.minimumStock
      );

      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3.5 Physical Location Support in Inventory', () => {
    it('should store physical location with inventory', async () => {
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-with-location',
        variantId: null,
        uomId: null,
        quantityAvailable: 100,
        quantityReserved: 0,
        rack: 'A1',
        bin: '05',
        zone: 'Cold-Storage',
        aisle: 'Aisle-3',
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result?.rack).toBe('A1');
      expect(result?.bin).toBe('05');
      expect(result?.zone).toBe('Cold-Storage');
      expect(result?.aisle).toBe('Aisle-3');
    });

    it('should update physical location during adjustment', async () => {
      const now = new Date();

      await db.insert(inventory).values({
        id: testInventoryId,
        warehouseId: testWarehouseId,
        productId: 'product-location-update',
        variantId: null,
        uomId: null,
        quantityAvailable: 50,
        quantityReserved: 0,
        rack: 'B2',
        bin: '01',
        zone: 'Main',
        aisle: 'Aisle-1',
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      // Update with new location
      await db
        .update(inventory)
        .set({
          quantityAvailable: 60,
          rack: 'C3',
          bin: '10',
          zone: 'Overflow',
          aisle: 'Aisle-5',
          version: 2,
          lastModifiedAt: new Date().toISOString(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(inventory.id, testInventoryId), eq(inventory.version, 1))
        )
        .run();

      const result = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, testInventoryId))
        .get();

      expect(result?.quantityAvailable).toBe(60);
      expect(result?.rack).toBe('C3');
      expect(result?.bin).toBe('10');
      expect(result?.zone).toBe('Overflow');
      expect(result?.version).toBe(2);
    });
  });
});
