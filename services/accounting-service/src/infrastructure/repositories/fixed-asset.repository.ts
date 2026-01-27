import { eq, and, like, gte, lte, sql } from 'drizzle-orm';
import { FixedAsset } from '@/domain/entities';
import {
  AssetStatus,
  DepreciationMethod,
  AcquisitionMethod,
  DisposalMethod,
} from '@/domain/value-objects';
import type {
  IFixedAssetRepository,
  FixedAssetFilter,
  PaginationOptions,
  PaginatedResult,
} from '@/domain/repositories';
import { fixedAssets, assetCategories, type FixedAssetRecord } from '@/infrastructure/db/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IFixedAssetRepository
 */
export class DrizzleFixedAssetRepository implements IFixedAssetRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<FixedAsset | null> {
    const result = await this.db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByAssetNumber(assetNumber: string): Promise<FixedAsset | null> {
    const result = await this.db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.assetNumber, assetNumber))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByBarcode(barcode: string): Promise<FixedAsset | null> {
    const result = await this.db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.barcode, barcode))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findAll(
    filter?: FixedAssetFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<FixedAsset>> {
    const conditions = [];

    if (filter?.categoryId) {
      conditions.push(eq(fixedAssets.categoryId, filter.categoryId));
    }
    if (filter?.status) {
      conditions.push(eq(fixedAssets.status, filter.status));
    }
    if (filter?.locationId) {
      conditions.push(eq(fixedAssets.locationId, filter.locationId));
    }
    if (filter?.departmentId) {
      conditions.push(eq(fixedAssets.departmentId, filter.departmentId));
    }
    if (filter?.assignedToUserId) {
      conditions.push(eq(fixedAssets.assignedToUserId, filter.assignedToUserId));
    }
    if (filter?.acquisitionDateFrom) {
      conditions.push(gte(fixedAssets.acquisitionDate, filter.acquisitionDateFrom.toISOString().split('T')[0]));
    }
    if (filter?.acquisitionDateTo) {
      conditions.push(lte(fixedAssets.acquisitionDate, filter.acquisitionDateTo.toISOString().split('T')[0]));
    }
    if (filter?.search) {
      conditions.push(like(fixedAssets.name, `%${filter.search}%`));
    }

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(fixedAssets)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count || 0;

    // Pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get assets
    const query = conditions.length > 0
      ? this.db
          .select()
          .from(fixedAssets)
          .where(and(...conditions))
          .orderBy(fixedAssets.assetNumber)
          .limit(limit)
          .offset(offset)
      : this.db
          .select()
          .from(fixedAssets)
          .orderBy(fixedAssets.assetNumber)
          .limit(limit)
          .offset(offset);

    const results = await query;

    return {
      data: results.map((r: FixedAssetRecord) => this.toDomain(r)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findByStatus(status: AssetStatus): Promise<FixedAsset[]> {
    const results = await this.db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.status, status))
      .orderBy(fixedAssets.assetNumber);

    return results.map((r: FixedAssetRecord) => this.toDomain(r));
  }

  async findDepreciable(): Promise<FixedAsset[]> {
    const now = new Date().toISOString().split('T')[0];

    const results = await this.db
      .select()
      .from(fixedAssets)
      .where(
        and(
          eq(fixedAssets.status, AssetStatus.ACTIVE),
          lte(fixedAssets.depreciationStartDate, now)
        )
      )
      .orderBy(fixedAssets.assetNumber);

    // Filter in memory for book value > salvage value
    return results
      .map((r: FixedAssetRecord) => this.toDomain(r))
      .filter((asset: FixedAsset) => asset.bookValue > asset.salvageValue);
  }

  async findByCategory(categoryId: string): Promise<FixedAsset[]> {
    const results = await this.db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.categoryId, categoryId))
      .orderBy(fixedAssets.assetNumber);

    return results.map((r: FixedAssetRecord) => this.toDomain(r));
  }

  async findByLocation(locationId: string): Promise<FixedAsset[]> {
    const results = await this.db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.locationId, locationId))
      .orderBy(fixedAssets.assetNumber);

    return results.map((r: FixedAssetRecord) => this.toDomain(r));
  }

  async save(asset: FixedAsset): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: fixedAssets.id })
      .from(fixedAssets)
      .where(eq(fixedAssets.id, asset.id))
      .limit(1);

    const data = {
      assetNumber: asset.assetNumber,
      name: asset.name,
      description: asset.description || null,
      categoryId: asset.categoryId,
      serialNumber: asset.serialNumber || null,
      barcode: asset.barcode || null,
      manufacturer: asset.manufacturer || null,
      model: asset.model || null,
      locationId: asset.locationId || null,
      departmentId: asset.departmentId || null,
      assignedToUserId: asset.assignedToUserId || null,
      acquisitionDate: asset.acquisitionDate.toISOString().split('T')[0],
      acquisitionMethod: asset.acquisitionMethod,
      acquisitionCost: asset.acquisitionCost,
      purchaseOrderId: asset.purchaseOrderId || null,
      supplierId: asset.supplierId || null,
      invoiceNumber: asset.invoiceNumber || null,
      usefulLifeMonths: asset.usefulLifeMonths,
      salvageValue: asset.salvageValue,
      depreciationMethod: asset.depreciationMethod,
      depreciationStartDate: asset.depreciationStartDate.toISOString().split('T')[0],
      accumulatedDepreciation: asset.accumulatedDepreciation,
      bookValue: asset.bookValue,
      lastDepreciationDate: asset.lastDepreciationDate?.toISOString().split('T')[0] || null,
      status: asset.status,
      disposalDate: asset.disposalDate?.toISOString().split('T')[0] || null,
      disposalMethod: asset.disposalMethod || null,
      disposalValue: asset.disposalValue || null,
      disposalReason: asset.disposalReason || null,
      gainLossOnDisposal: asset.gainLossOnDisposal || null,
      insurancePolicyNumber: asset.insurancePolicyNumber || null,
      insuranceExpiryDate: asset.insuranceExpiryDate?.toISOString().split('T')[0] || null,
      warrantyExpiryDate: asset.warrantyExpiryDate?.toISOString().split('T')[0] || null,
      lastVerifiedAt: asset.lastVerifiedAt?.toISOString() || null,
      lastVerifiedBy: asset.lastVerifiedBy || null,
      updatedAt: now,
      version: asset.version,
    };

    if (existing.length > 0) {
      await this.db
        .update(fixedAssets)
        .set(data)
        .where(eq(fixedAssets.id, asset.id));
    } else {
      await this.db.insert(fixedAssets).values({
        id: asset.id,
        ...data,
        createdBy: asset.createdBy,
        createdAt: now,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(fixedAssets).where(eq(fixedAssets.id, id));
  }

  async generateAssetNumber(categoryCode: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const prefix = `AST-${categoryCode}-${year}-`;

    // Find the highest sequence number for this prefix
    const result = await this.db
      .select({ assetNumber: fixedAssets.assetNumber })
      .from(fixedAssets)
      .where(like(fixedAssets.assetNumber, `${prefix}%`))
      .orderBy(sql`${fixedAssets.assetNumber} desc`)
      .limit(1);

    let sequence = 1;

    if (result.length > 0) {
      const lastNumber = result[0].assetNumber;
      const lastSequence = parseInt(lastNumber.split('-').pop() || '0', 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  private toDomain(record: FixedAssetRecord): FixedAsset {
    return FixedAsset.fromPersistence({
      id: record.id,
      assetNumber: record.assetNumber,
      name: record.name,
      description: record.description || undefined,
      categoryId: record.categoryId,
      serialNumber: record.serialNumber || undefined,
      barcode: record.barcode || undefined,
      manufacturer: record.manufacturer || undefined,
      model: record.model || undefined,
      locationId: record.locationId || undefined,
      departmentId: record.departmentId || undefined,
      assignedToUserId: record.assignedToUserId || undefined,
      acquisitionDate: new Date(record.acquisitionDate),
      acquisitionMethod: record.acquisitionMethod as AcquisitionMethod,
      acquisitionCost: record.acquisitionCost,
      purchaseOrderId: record.purchaseOrderId || undefined,
      supplierId: record.supplierId || undefined,
      invoiceNumber: record.invoiceNumber || undefined,
      usefulLifeMonths: record.usefulLifeMonths,
      salvageValue: record.salvageValue,
      depreciationMethod: record.depreciationMethod as DepreciationMethod,
      depreciationStartDate: new Date(record.depreciationStartDate),
      accumulatedDepreciation: record.accumulatedDepreciation,
      bookValue: record.bookValue,
      lastDepreciationDate: record.lastDepreciationDate ? new Date(record.lastDepreciationDate) : undefined,
      status: record.status as AssetStatus,
      disposalDate: record.disposalDate ? new Date(record.disposalDate) : undefined,
      disposalMethod: record.disposalMethod as DisposalMethod || undefined,
      disposalValue: record.disposalValue || undefined,
      disposalReason: record.disposalReason || undefined,
      gainLossOnDisposal: record.gainLossOnDisposal || undefined,
      insurancePolicyNumber: record.insurancePolicyNumber || undefined,
      insuranceExpiryDate: record.insuranceExpiryDate ? new Date(record.insuranceExpiryDate) : undefined,
      warrantyExpiryDate: record.warrantyExpiryDate ? new Date(record.warrantyExpiryDate) : undefined,
      lastVerifiedAt: record.lastVerifiedAt ? new Date(record.lastVerifiedAt) : undefined,
      lastVerifiedBy: record.lastVerifiedBy || undefined,
      createdBy: record.createdBy,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      version: record.version,
    });
  }
}
