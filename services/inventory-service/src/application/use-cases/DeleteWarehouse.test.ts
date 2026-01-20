/**
 * DeleteWarehouse Use Case Tests
 *
 * Tests soft delete behavior and validation logic
 */

import { eq, isNull } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../infrastructure/db';
import { inventory, warehouses } from '../../infrastructure/db/schema';
import { DeleteWarehouseUseCase } from './DeleteWarehouse';

describe('DeleteWarehouse Use Case', () => {
  let deleteWarehouseUseCase: DeleteWarehouseUseCase;
  let testWarehouseId: string;

  beforeEach(async () => {
    deleteWarehouseUseCase = new DeleteWarehouseUseCase();

    // Create a test warehouse
    testWarehouseId = `test-warehouse-${Date.now()}`;
    await db.insert(warehouses).values({
      id: testWarehouseId,
      code: `WH-TEST-${Date.now()}`,
      name: 'Test Warehouse for Deletion',
      addressLine1: '123 Test Street',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      country: 'Indonesia',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    // Clean up: Delete test data
    await db.delete(inventory).where(eq(inventory.warehouseId, testWarehouseId));
    await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId));
  });

  describe('Soft Delete - Success Cases', () => {
    it('should soft delete warehouse without inventory', async () => {
      const result = await deleteWarehouseUseCase.execute({
        warehouseId: testWarehouseId,
        userId: 'test-user',
      });

      expect(result.success).toBe(true);
      expect(result.softDeleted).toBe(true);
      expect(result.message).toContain('deactivated');

      // Verify warehouse is soft deleted
      const warehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, testWarehouseId))
        .get();

      expect(warehouse).toBeDefined();
      expect(warehouse?.deletedAt).toBeDefined();
      expect(warehouse?.deletedBy).toBe('test-user');
      expect(warehouse?.status).toBe('inactive');
    });

    it('should not appear in active warehouse queries after soft delete', async () => {
      // Soft delete the warehouse
      await deleteWarehouseUseCase.execute({
        warehouseId: testWarehouseId,
        userId: 'test-user',
      });

      // Query for active warehouses only
      const activeWarehouses = await db
        .select()
        .from(warehouses)
        .where(isNull(warehouses.deletedAt))
        .all();

      const deletedWarehouseInResults = activeWarehouses.find((w) => w.id === testWarehouseId);

      expect(deletedWarehouseInResults).toBeUndefined();
    });

    it('should allow force delete even with inventory', async () => {
      // Create inventory for the warehouse
      const inventoryId = `inv-${Date.now()}`;
      await db.insert(inventory).values({
        id: inventoryId,
        warehouseId: testWarehouseId,
        productId: 'prod-123',
        quantityAvailable: 100,
        quantityReserved: 0,
        minimumStock: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Attempt force delete
      const result = await deleteWarehouseUseCase.execute({
        warehouseId: testWarehouseId,
        userId: 'test-user',
        force: true,
      });

      expect(result.success).toBe(true);
      expect(result.softDeleted).toBe(true);
      expect(result.message).toContain('with 100 units in inventory');

      // Verify warehouse is soft deleted
      const warehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, testWarehouseId))
        .get();

      expect(warehouse?.deletedAt).toBeDefined();
      expect(warehouse?.deletedBy).toBe('test-user');
    });
  });

  describe('Validation - Cannot Delete', () => {
    it('should prevent deletion if warehouse has inventory (without force)', async () => {
      // Create inventory for the warehouse
      const inventoryId = `inv-${Date.now()}`;
      await db.insert(inventory).values({
        id: inventoryId,
        warehouseId: testWarehouseId,
        productId: 'prod-123',
        quantityAvailable: 50,
        quantityReserved: 0,
        minimumStock: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Attempt to delete without force
      const result = await deleteWarehouseUseCase.execute({
        warehouseId: testWarehouseId,
        userId: 'test-user',
        force: false,
      });

      expect(result.success).toBe(false);
      expect(result.cannotDeleteReasons).toHaveLength(1);
      expect(result.cannotDeleteReasons?.[0]).toContain('contains 50 units');

      // Verify warehouse is NOT deleted
      const warehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, testWarehouseId))
        .get();

      expect(warehouse?.deletedAt).toBeNull();
      expect(warehouse?.status).toBe('active');
    });

    it('should count inventory across multiple products', async () => {
      // Create inventory for multiple products
      const inv1Id = `inv-${Date.now()}-1`;
      const inv2Id = `inv-${Date.now()}-2`;
      const inv3Id = `inv-${Date.now()}-3`;

      await db.insert(inventory).values([
        {
          id: inv1Id,
          warehouseId: testWarehouseId,
          productId: 'prod-1',
          quantityAvailable: 50,
          quantityReserved: 0,
          minimumStock: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: inv2Id,
          warehouseId: testWarehouseId,
          productId: 'prod-2',
          quantityAvailable: 30,
          quantityReserved: 0,
          minimumStock: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: inv3Id,
          warehouseId: testWarehouseId,
          productId: 'prod-3',
          quantityAvailable: 20,
          quantityReserved: 0,
          minimumStock: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Attempt to delete
      const result = await deleteWarehouseUseCase.execute({
        warehouseId: testWarehouseId,
        userId: 'test-user',
        force: false,
      });

      expect(result.success).toBe(false);
      expect(result.cannotDeleteReasons?.[0]).toContain('100 units');
      expect(result.cannotDeleteReasons?.[0]).toContain('3 product');
    });
  });

  describe('Restore Functionality', () => {
    it('should restore a soft-deleted warehouse', async () => {
      // Soft delete the warehouse
      await deleteWarehouseUseCase.execute({
        warehouseId: testWarehouseId,
        userId: 'test-user',
      });

      // Verify it's deleted
      const deletedWarehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, testWarehouseId))
        .get();

      expect(deletedWarehouse?.deletedAt).toBeDefined();

      // Restore the warehouse
      const result = await deleteWarehouseUseCase.restore(testWarehouseId, 'admin-user');

      expect(result.success).toBe(true);
      expect(result.message).toContain('restored');

      // Verify warehouse is restored
      const restoredWarehouse = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, testWarehouseId))
        .get();

      expect(restoredWarehouse?.deletedAt).toBeNull();
      expect(restoredWarehouse?.deletedBy).toBeNull();
      expect(restoredWarehouse?.status).toBe('active');
    });

    it('should prevent restoring a warehouse that is not deleted', async () => {
      const result = await deleteWarehouseUseCase.restore(testWarehouseId, 'admin-user');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not deleted');
    });
  });

  describe('CASCADE to Dependent Data', () => {
    it('should CASCADE delete inventory when warehouse is hard deleted', async () => {
      // Note: This test demonstrates what would happen with hard delete
      // In practice, we use soft delete to preserve data

      // Create inventory
      const inventoryId = `inv-${Date.now()}`;
      await db.insert(inventory).values({
        id: inventoryId,
        warehouseId: testWarehouseId,
        productId: 'prod-123',
        quantityAvailable: 100,
        quantityReserved: 0,
        minimumStock: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Verify inventory exists
      const inventoryBefore = await db
        .select()
        .from(inventory)
        .where(eq(inventory.warehouseId, testWarehouseId))
        .all();

      expect(inventoryBefore).toHaveLength(1);

      // Hard delete warehouse (bypass soft delete for this test)
      await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId)).run();

      // Verify inventory is CASCADE deleted
      const inventoryAfter = await db
        .select()
        .from(inventory)
        .where(eq(inventory.warehouseId, testWarehouseId))
        .all();

      expect(inventoryAfter).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should return error when trying to delete non-existent warehouse', async () => {
      const result = await deleteWarehouseUseCase.execute({
        warehouseId: 'non-existent-id',
        userId: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return error when trying to delete already deleted warehouse', async () => {
      // Soft delete the warehouse
      await deleteWarehouseUseCase.execute({
        warehouseId: testWarehouseId,
        userId: 'test-user',
      });

      // Try to delete again
      const result = await deleteWarehouseUseCase.execute({
        warehouseId: testWarehouseId,
        userId: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already deleted');
    });
  });

  describe('Impact Analysis', () => {
    it('should analyze impact before deletion', async () => {
      // Create inventory
      const inv1Id = `inv-${Date.now()}-1`;
      const inv2Id = `inv-${Date.now()}-2`;

      await db.insert(inventory).values([
        {
          id: inv1Id,
          warehouseId: testWarehouseId,
          productId: 'prod-1',
          quantityAvailable: 50,
          quantityReserved: 0,
          minimumStock: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: inv2Id,
          warehouseId: testWarehouseId,
          productId: 'prod-2',
          quantityAvailable: 30,
          quantityReserved: 0,
          minimumStock: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const impact = await deleteWarehouseUseCase.analyzeImpact(testWarehouseId);

      expect(impact.warehouseName).toBe('Test Warehouse for Deletion');
      expect(impact.willAffect.inventoryRecords).toBe(2);
      expect(impact.willAffect.totalUnits).toBe(80);
      expect(impact.willAffect.productCount).toBe(2);
      expect(impact.canBeDeleted).toBe(false);
      expect(impact.recommendSoftDelete).toBe(true);
    });
  });
});
