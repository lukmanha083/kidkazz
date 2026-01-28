import type { AssetMovement, IAssetMovementRepository } from '@/domain/repositories';
import * as schema from '@/infrastructure/db/schema';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { nanoid } from 'nanoid';

/**
 * Drizzle implementation of Asset Movement Repository
 */
export class DrizzleAssetMovementRepository implements IAssetMovementRepository {
  constructor(private readonly db: DrizzleD1Database<typeof schema>) {}

  async findById(id: string): Promise<AssetMovement | null> {
    const result = await this.db
      .select()
      .from(schema.assetMovements)
      .where(eq(schema.assetMovements.id, id))
      .get();

    if (!result) return null;
    return this.mapToEntity(result);
  }

  async findByAsset(assetId: string): Promise<AssetMovement[]> {
    const results = await this.db
      .select()
      .from(schema.assetMovements)
      .where(eq(schema.assetMovements.assetId, assetId))
      .orderBy(desc(schema.assetMovements.movementDate))
      .all();

    return results.map((r) => this.mapToEntity(r));
  }

  async findByDateRange(from: Date, to: Date): Promise<AssetMovement[]> {
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    const results = await this.db
      .select()
      .from(schema.assetMovements)
      .where(
        and(
          gte(schema.assetMovements.movementDate, fromStr),
          lte(schema.assetMovements.movementDate, toStr)
        )
      )
      .orderBy(desc(schema.assetMovements.movementDate))
      .all();

    return results.map((r) => this.mapToEntity(r));
  }

  async save(movement: AssetMovement): Promise<void> {
    const existing = await this.findById(movement.id);

    if (existing) {
      // Movements are immutable, no update needed
      return;
    }

    // Insert new movement
    await this.db.insert(schema.assetMovements).values({
      id: movement.id,
      assetId: movement.assetId,
      movementType: movement.movementType as schema.AssetMovementRecord['movementType'],
      fromLocationId: movement.fromLocationId,
      toLocationId: movement.toLocationId,
      fromDepartmentId: movement.fromDepartmentId,
      toDepartmentId: movement.toDepartmentId,
      fromUserId: movement.fromUserId,
      toUserId: movement.toUserId,
      movementDate: movement.movementDate.toISOString().split('T')[0],
      reason: movement.reason,
      notes: movement.notes,
      performedBy: movement.performedBy,
      createdAt: movement.createdAt.toISOString(),
    });
  }

  private mapToEntity(record: schema.AssetMovementRecord): AssetMovement {
    return {
      id: record.id,
      assetId: record.assetId,
      movementType: record.movementType,
      fromLocationId: record.fromLocationId ?? undefined,
      toLocationId: record.toLocationId ?? undefined,
      fromDepartmentId: record.fromDepartmentId ?? undefined,
      toDepartmentId: record.toDepartmentId ?? undefined,
      fromUserId: record.fromUserId ?? undefined,
      toUserId: record.toUserId ?? undefined,
      movementDate: new Date(record.movementDate),
      reason: record.reason ?? undefined,
      notes: record.notes ?? undefined,
      performedBy: record.performedBy,
      createdAt: new Date(record.createdAt),
    };
  }
}

/**
 * Factory function to create asset movements
 */
export function createAssetMovement(props: {
  assetId: string;
  movementType: string;
  fromLocationId?: string;
  toLocationId?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  fromUserId?: string;
  toUserId?: string;
  reason?: string;
  notes?: string;
  performedBy: string;
}): AssetMovement {
  const now = new Date();
  return {
    id: `mov-${nanoid(12)}`,
    assetId: props.assetId,
    movementType: props.movementType,
    fromLocationId: props.fromLocationId,
    toLocationId: props.toLocationId,
    fromDepartmentId: props.fromDepartmentId,
    toDepartmentId: props.toDepartmentId,
    fromUserId: props.fromUserId,
    toUserId: props.toUserId,
    movementDate: now,
    reason: props.reason,
    notes: props.notes,
    performedBy: props.performedBy,
    createdAt: now,
  };
}
