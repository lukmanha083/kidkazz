import { AssetCategory } from '@/domain/entities';
import type { IAssetCategoryRepository } from '@/domain/repositories';
import type { DepreciationMethod, TaxAssetGroup } from '@/domain/value-objects';
import { type AssetCategoryRecord, assetCategories } from '@/infrastructure/db/schema';
import { eq } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IAssetCategoryRepository
 */
export class DrizzleAssetCategoryRepository implements IAssetCategoryRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<AssetCategory | null> {
    const result = await this.db
      .select()
      .from(assetCategories)
      .where(eq(assetCategories.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByCode(code: string): Promise<AssetCategory | null> {
    const result = await this.db
      .select()
      .from(assetCategories)
      .where(eq(assetCategories.code, code))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findAll(includeInactive = false): Promise<AssetCategory[]> {
    const query = includeInactive
      ? this.db.select().from(assetCategories)
      : this.db.select().from(assetCategories).where(eq(assetCategories.isActive, true));

    const results = await query;
    return results.map((r: AssetCategoryRecord) => this.toDomain(r));
  }

  async save(category: AssetCategory): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: assetCategories.id })
      .from(assetCategories)
      .where(eq(assetCategories.id, category.id))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(assetCategories)
        .set({
          code: category.code,
          name: category.name,
          description: category.description || null,
          defaultUsefulLifeMonths: category.defaultUsefulLifeMonths,
          defaultDepreciationMethod: category.defaultDepreciationMethod,
          defaultSalvageValuePercent: category.defaultSalvageValuePercent,
          assetAccountId: category.assetAccountId,
          accumulatedDepreciationAccountId: category.accumulatedDepreciationAccountId,
          depreciationExpenseAccountId: category.depreciationExpenseAccountId,
          gainLossOnDisposalAccountId: category.gainLossOnDisposalAccountId,
          taxUsefulLifeMonths: category.taxUsefulLifeMonths || null,
          taxDepreciationMethod: category.taxDepreciationMethod || null,
          taxAssetGroup: category.taxAssetGroup || null,
          isActive: category.isActive,
          updatedAt: now,
        })
        .where(eq(assetCategories.id, category.id));
    } else {
      await this.db.insert(assetCategories).values({
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description || null,
        defaultUsefulLifeMonths: category.defaultUsefulLifeMonths,
        defaultDepreciationMethod: category.defaultDepreciationMethod,
        defaultSalvageValuePercent: category.defaultSalvageValuePercent,
        assetAccountId: category.assetAccountId,
        accumulatedDepreciationAccountId: category.accumulatedDepreciationAccountId,
        depreciationExpenseAccountId: category.depreciationExpenseAccountId,
        gainLossOnDisposalAccountId: category.gainLossOnDisposalAccountId,
        taxUsefulLifeMonths: category.taxUsefulLifeMonths || null,
        taxDepreciationMethod: category.taxDepreciationMethod || null,
        taxAssetGroup: category.taxAssetGroup || null,
        isActive: category.isActive,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(assetCategories).where(eq(assetCategories.id, id));
  }

  private toDomain(record: AssetCategoryRecord): AssetCategory {
    return AssetCategory.fromPersistence({
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description || undefined,
      defaultUsefulLifeMonths: record.defaultUsefulLifeMonths,
      defaultDepreciationMethod: record.defaultDepreciationMethod as DepreciationMethod,
      defaultSalvageValuePercent: record.defaultSalvageValuePercent,
      assetAccountId: record.assetAccountId,
      accumulatedDepreciationAccountId: record.accumulatedDepreciationAccountId,
      depreciationExpenseAccountId: record.depreciationExpenseAccountId,
      gainLossOnDisposalAccountId: record.gainLossOnDisposalAccountId,
      taxUsefulLifeMonths: record.taxUsefulLifeMonths || undefined,
      taxDepreciationMethod: (record.taxDepreciationMethod as DepreciationMethod) || undefined,
      taxAssetGroup: (record.taxAssetGroup as TaxAssetGroup) || undefined,
      isActive: record.isActive,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }
}
