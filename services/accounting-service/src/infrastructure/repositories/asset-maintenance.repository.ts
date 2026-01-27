import { eq, and, lt, isNull, or, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { IAssetMaintenanceRepository, AssetMaintenance } from '@/domain/repositories';
import * as schema from '@/infrastructure/db/schema';

/**
 * Drizzle implementation of Asset Maintenance Repository
 */
export class DrizzleAssetMaintenanceRepository implements IAssetMaintenanceRepository {
  constructor(private readonly db: DrizzleD1Database<typeof schema>) {}

  async findById(id: string): Promise<AssetMaintenance | null> {
    const result = await this.db
      .select()
      .from(schema.assetMaintenance)
      .where(eq(schema.assetMaintenance.id, id))
      .get();

    if (!result) return null;
    return this.mapToEntity(result);
  }

  async findByAsset(assetId: string): Promise<AssetMaintenance[]> {
    const results = await this.db
      .select()
      .from(schema.assetMaintenance)
      .where(eq(schema.assetMaintenance.assetId, assetId))
      .orderBy(desc(schema.assetMaintenance.scheduledDate))
      .all();

    return results.map((r) => this.mapToEntity(r));
  }

  async findScheduled(): Promise<AssetMaintenance[]> {
    const results = await this.db
      .select()
      .from(schema.assetMaintenance)
      .where(
        or(
          eq(schema.assetMaintenance.status, 'SCHEDULED'),
          eq(schema.assetMaintenance.status, 'IN_PROGRESS')
        )
      )
      .orderBy(schema.assetMaintenance.scheduledDate)
      .all();

    return results.map((r) => this.mapToEntity(r));
  }

  async findOverdue(): Promise<AssetMaintenance[]> {
    const today = new Date().toISOString().split('T')[0];

    const results = await this.db
      .select()
      .from(schema.assetMaintenance)
      .where(
        and(
          eq(schema.assetMaintenance.status, 'SCHEDULED'),
          lt(schema.assetMaintenance.scheduledDate, today)
        )
      )
      .orderBy(schema.assetMaintenance.scheduledDate)
      .all();

    return results.map((r) => this.mapToEntity(r));
  }

  async save(maintenance: AssetMaintenance): Promise<void> {
    const existing = await this.findById(maintenance.id);

    if (existing) {
      // Update existing
      await this.db
        .update(schema.assetMaintenance)
        .set({
          maintenanceType: maintenance.maintenanceType as schema.AssetMaintenanceRecord['maintenanceType'],
          description: maintenance.description,
          scheduledDate: maintenance.scheduledDate?.toISOString().split('T')[0],
          performedDate: maintenance.performedDate?.toISOString().split('T')[0],
          nextScheduledDate: maintenance.nextScheduledDate?.toISOString().split('T')[0],
          cost: maintenance.cost,
          isCapitalized: maintenance.isCapitalized,
          extendsUsefulLifeMonths: maintenance.extendsUsefulLifeMonths,
          vendorId: maintenance.vendorId,
          vendorName: maintenance.vendorName,
          invoiceNumber: maintenance.invoiceNumber,
          status: maintenance.status as schema.AssetMaintenanceRecord['status'],
          notes: maintenance.notes,
          updatedAt: maintenance.updatedAt.toISOString(),
        })
        .where(eq(schema.assetMaintenance.id, maintenance.id));
    } else {
      // Insert new
      await this.db.insert(schema.assetMaintenance).values({
        id: maintenance.id,
        assetId: maintenance.assetId,
        maintenanceType: maintenance.maintenanceType as schema.AssetMaintenanceRecord['maintenanceType'],
        description: maintenance.description,
        scheduledDate: maintenance.scheduledDate?.toISOString().split('T')[0],
        performedDate: maintenance.performedDate?.toISOString().split('T')[0],
        nextScheduledDate: maintenance.nextScheduledDate?.toISOString().split('T')[0],
        cost: maintenance.cost,
        isCapitalized: maintenance.isCapitalized,
        extendsUsefulLifeMonths: maintenance.extendsUsefulLifeMonths,
        vendorId: maintenance.vendorId,
        vendorName: maintenance.vendorName,
        invoiceNumber: maintenance.invoiceNumber,
        status: maintenance.status as schema.AssetMaintenanceRecord['status'],
        notes: maintenance.notes,
        createdBy: maintenance.createdBy,
        createdAt: maintenance.createdAt.toISOString(),
        updatedAt: maintenance.updatedAt.toISOString(),
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.assetMaintenance)
      .where(eq(schema.assetMaintenance.id, id));
  }

  private mapToEntity(record: schema.AssetMaintenanceRecord): AssetMaintenance {
    return {
      id: record.id,
      assetId: record.assetId,
      maintenanceType: record.maintenanceType,
      description: record.description,
      scheduledDate: record.scheduledDate ? new Date(record.scheduledDate) : undefined,
      performedDate: record.performedDate ? new Date(record.performedDate) : undefined,
      nextScheduledDate: record.nextScheduledDate ? new Date(record.nextScheduledDate) : undefined,
      cost: record.cost,
      isCapitalized: record.isCapitalized,
      extendsUsefulLifeMonths: record.extendsUsefulLifeMonths ?? 0,
      vendorId: record.vendorId ?? undefined,
      vendorName: record.vendorName ?? undefined,
      invoiceNumber: record.invoiceNumber ?? undefined,
      status: record.status,
      notes: record.notes ?? undefined,
      createdBy: record.createdBy,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };
  }
}
