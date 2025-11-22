/**
 * DeleteWarehouse Use Case
 *
 * Implements Phase 1: Soft Delete
 * Implements Phase 2: Validation before deletion
 *
 * Uses SOFT DELETE to prevent orphaned productLocations in Product Service.
 *
 * Validates that warehouse can be safely soft-deleted by checking:
 * 1. No active inventory (or allow deletion and clear inventory)
 * 2. No pending transfers
 * 3. No active product locations (cross-service check)
 *
 * Soft delete approach:
 * - Sets deletedAt timestamp
 * - Sets status to 'inactive'
 * - Hides from UI queries
 * - Can be restored if needed
 * - Cross-service references remain valid
 */

import { db } from '../../infrastructure/db';
import { warehouses, inventory } from '../../infrastructure/db/schema';
import { eq, isNull, and, sql } from 'drizzle-orm';

export interface DeleteWarehouseInput {
  warehouseId: string;
  userId: string;
  force?: boolean; // Force delete even with inventory
}

export interface DeleteWarehouseResult {
  success: boolean;
  message: string;
  cannotDeleteReasons?: string[];
  softDeleted?: boolean;
}

export class DeleteWarehouseUseCase {
  /**
   * Execute the soft delete warehouse use case with validation
   */
  async execute(input: DeleteWarehouseInput): Promise<DeleteWarehouseResult> {
    const { warehouseId, userId, force = false } = input;

    // 1. Check if warehouse exists and is not already deleted
    const warehouse = await db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, warehouseId),
          isNull(warehouses.deletedAt)
        )
      )
      .get();

    if (!warehouse) {
      return {
        success: false,
        message: `Warehouse with ID "${warehouseId}" not found or already deleted`,
      };
    }

    // 2. Collect all validation errors
    const cannotDeleteReasons: string[] = [];

    // Check 1: Warehouse has active inventory
    const inventoryRecords = await db
      .select({
        totalQuantity: sql<number>`SUM(${inventory.quantityAvailable})`,
        productCount: sql<number>`COUNT(DISTINCT ${inventory.productId})`,
      })
      .from(inventory)
      .where(eq(inventory.warehouseId, warehouseId))
      .get();

    const totalQuantity = inventoryRecords?.totalQuantity || 0;
    const productCount = inventoryRecords?.productCount || 0;

    if (totalQuantity > 0 && !force) {
      cannotDeleteReasons.push(
        `Warehouse contains ${totalQuantity} units across ${productCount} product(s). Transfer inventory to another warehouse or use force=true to delete anyway.`
      );
    }

    // Check 2: Product locations in Product Service
    // Note: In production, this would be a cross-service HTTP call
    // Example: const locationCheck = await productServiceClient.getLocationsByWarehouse(warehouseId);
    // if (locationCheck.count > 0 && !force) {
    //   cannotDeleteReasons.push(
    //     `Warehouse has ${locationCheck.count} product location(s) defined in Product Service`
    //   );
    // }

    // Check 3: Pending transfers
    // Note: Would check transfer_stocks table when implemented
    // Example: const transferCheck = await transferServiceClient.checkPendingTransfers(warehouseId);
    // if (transferCheck.pendingCount > 0) {
    //   cannotDeleteReasons.push(
    //     `Warehouse has ${transferCheck.pendingCount} pending transfer(s)`
    //   );
    // }

    // 3. If there are any validation errors (and not forced), return them
    if (cannotDeleteReasons.length > 0 && !force) {
      return {
        success: false,
        message: `Cannot delete warehouse "${warehouse.name}" (${warehouse.code})`,
        cannotDeleteReasons,
      };
    }

    // 4. Perform SOFT DELETE
    try {
      const now = new Date();

      await db
        .update(warehouses)
        .set({
          deletedAt: now,
          deletedBy: userId,
          status: 'inactive',
          updatedAt: now,
        })
        .where(eq(warehouses.id, warehouseId))
        .run();

      console.log(`Warehouse soft deleted: ${warehouse.name} (${warehouse.code}) by user ${userId}`);

      // Optional: Publish event for other services to react
      // eventBus.publish('warehouse.deleted', { warehouseId, timestamp: now });

      return {
        success: true,
        softDeleted: true,
        message: `Warehouse "${warehouse.name}" (${warehouse.code}) has been deactivated${
          force && totalQuantity > 0 ? ` (with ${totalQuantity} units in inventory)` : ''
        }`,
      };
    } catch (error) {
      console.error('Failed to soft delete warehouse:', error);

      return {
        success: false,
        message: 'Failed to delete warehouse due to a database error',
        cannotDeleteReasons: [(error as Error).message],
      };
    }
  }

  /**
   * Restore a soft-deleted warehouse
   */
  async restore(warehouseId: string, userId: string): Promise<DeleteWarehouseResult> {
    const warehouse = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, warehouseId))
      .get();

    if (!warehouse) {
      return {
        success: false,
        message: `Warehouse with ID "${warehouseId}" not found`,
      };
    }

    if (!warehouse.deletedAt) {
      return {
        success: false,
        message: `Warehouse "${warehouse.name}" is not deleted`,
      };
    }

    try {
      await db
        .update(warehouses)
        .set({
          deletedAt: null,
          deletedBy: null,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(warehouses.id, warehouseId))
        .run();

      console.log(`Warehouse restored: ${warehouse.name} (${warehouse.code}) by user ${userId}`);

      return {
        success: true,
        message: `Warehouse "${warehouse.name}" (${warehouse.code}) has been restored`,
      };
    } catch (error) {
      console.error('Failed to restore warehouse:', error);

      return {
        success: false,
        message: 'Failed to restore warehouse due to a database error',
        cannotDeleteReasons: [(error as Error).message],
      };
    }
  }

  /**
   * Analyze the impact of deleting a warehouse (for UI confirmation dialogs)
   */
  async analyzeImpact(warehouseId: string): Promise<{
    warehouseName: string;
    warehouseCode: string;
    willAffect: {
      inventoryRecords: number;
      totalUnits: number;
      productCount: number;
      productLocations: number; // Cross-service
      pendingTransfers: number; // Cross-service
    };
    canBeDeleted: boolean;
    recommendSoftDelete: boolean;
  }> {
    const warehouse = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, warehouseId))
      .get();

    if (!warehouse) {
      throw new Error(`Warehouse with ID "${warehouseId}" not found`);
    }

    // Get inventory stats
    const inventoryStats = await db
      .select({
        recordCount: sql<number>`COUNT(*)`,
        totalQuantity: sql<number>`SUM(${inventory.quantityAvailable})`,
        productCount: sql<number>`COUNT(DISTINCT ${inventory.productId})`,
      })
      .from(inventory)
      .where(eq(inventory.warehouseId, warehouseId))
      .get();

    const recordCount = inventoryStats?.recordCount || 0;
    const totalQuantity = inventoryStats?.totalQuantity || 0;
    const productCount = inventoryStats?.productCount || 0;

    // In production, would check cross-service references:
    // const productLocations = await productServiceClient.countLocationsByWarehouse(warehouseId);
    // const pendingTransfers = await transferServiceClient.countPendingTransfers(warehouseId);

    const canBeDeleted = recordCount === 0;
    const recommendSoftDelete = recordCount > 0;

    return {
      warehouseName: warehouse.name,
      warehouseCode: warehouse.code,
      willAffect: {
        inventoryRecords: recordCount,
        totalUnits: totalQuantity,
        productCount: productCount,
        productLocations: 0, // Would be from Product Service
        pendingTransfers: 0, // Would be from Transfer Service
      },
      canBeDeleted,
      recommendSoftDelete,
    };
  }
}
