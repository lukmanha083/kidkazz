import type { DepreciationMethod, TaxAssetGroup } from '@/domain/value-objects';
import { nanoid } from 'nanoid';

/**
 * Props for creating a new AssetCategory
 */
export interface AssetCategoryProps {
  code: string;
  name: string;
  description?: string;
  // Default depreciation settings
  defaultUsefulLifeMonths: number;
  defaultDepreciationMethod: DepreciationMethod;
  defaultSalvageValuePercent: number;
  // Accounting accounts
  assetAccountId: string;
  accumulatedDepreciationAccountId: string;
  depreciationExpenseAccountId: string;
  gainLossOnDisposalAccountId: string;
  // Tax settings (Indonesian PSAK 16)
  taxUsefulLifeMonths?: number;
  taxDepreciationMethod?: DepreciationMethod;
  taxAssetGroup?: TaxAssetGroup;
}

/**
 * Props for reconstituting from persistence
 */
export interface AssetCategoryPersistenceProps extends AssetCategoryProps {
  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AssetCategory Entity
 * Defines category defaults for fixed assets
 */
export class AssetCategory {
  private _id: string;
  private _code: string;
  private _name: string;
  private _description?: string;
  // Default depreciation settings
  private _defaultUsefulLifeMonths: number;
  private _defaultDepreciationMethod: DepreciationMethod;
  private _defaultSalvageValuePercent: number;
  // Accounting accounts
  private _assetAccountId: string;
  private _accumulatedDepreciationAccountId: string;
  private _depreciationExpenseAccountId: string;
  private _gainLossOnDisposalAccountId: string;
  // Tax settings
  private _taxUsefulLifeMonths?: number;
  private _taxDepreciationMethod?: DepreciationMethod;
  private _taxAssetGroup?: TaxAssetGroup;
  // Status
  private _isActive: boolean;
  // Audit
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AssetCategoryPersistenceProps) {
    this._id = props.id;
    this._code = props.code;
    this._name = props.name;
    this._description = props.description;
    this._defaultUsefulLifeMonths = props.defaultUsefulLifeMonths;
    this._defaultDepreciationMethod = props.defaultDepreciationMethod;
    this._defaultSalvageValuePercent = props.defaultSalvageValuePercent;
    this._assetAccountId = props.assetAccountId;
    this._accumulatedDepreciationAccountId = props.accumulatedDepreciationAccountId;
    this._depreciationExpenseAccountId = props.depreciationExpenseAccountId;
    this._gainLossOnDisposalAccountId = props.gainLossOnDisposalAccountId;
    this._taxUsefulLifeMonths = props.taxUsefulLifeMonths;
    this._taxDepreciationMethod = props.taxDepreciationMethod;
    this._taxAssetGroup = props.taxAssetGroup;
    this._isActive = props.isActive;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new AssetCategory
   */
  static create(props: AssetCategoryProps): AssetCategory {
    // Validation
    if (!props.code || props.code.trim().length === 0) {
      throw new Error('Category code is required');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Category name is required');
    }
    if (props.defaultUsefulLifeMonths <= 0) {
      throw new Error('Default useful life must be positive');
    }
    if (props.defaultSalvageValuePercent < 0 || props.defaultSalvageValuePercent > 100) {
      throw new Error('Salvage value percent must be between 0 and 100');
    }

    const now = new Date();

    return new AssetCategory({
      ...props,
      id: `cat-${nanoid(8)}`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: AssetCategoryPersistenceProps): AssetCategory {
    return new AssetCategory(props);
  }

  /**
   * Update category details
   */
  update(updates: Partial<AssetCategoryProps>): void {
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        throw new Error('Category name is required');
      }
      this._name = updates.name;
    }
    if (updates.description !== undefined) {
      this._description = updates.description;
    }
    if (updates.defaultUsefulLifeMonths !== undefined) {
      if (updates.defaultUsefulLifeMonths <= 0) {
        throw new Error('Default useful life must be positive');
      }
      this._defaultUsefulLifeMonths = updates.defaultUsefulLifeMonths;
    }
    if (updates.defaultDepreciationMethod !== undefined) {
      this._defaultDepreciationMethod = updates.defaultDepreciationMethod;
    }
    if (updates.defaultSalvageValuePercent !== undefined) {
      if (updates.defaultSalvageValuePercent < 0 || updates.defaultSalvageValuePercent > 100) {
        throw new Error('Salvage value percent must be between 0 and 100');
      }
      this._defaultSalvageValuePercent = updates.defaultSalvageValuePercent;
    }
    if (updates.assetAccountId !== undefined) {
      this._assetAccountId = updates.assetAccountId;
    }
    if (updates.accumulatedDepreciationAccountId !== undefined) {
      this._accumulatedDepreciationAccountId = updates.accumulatedDepreciationAccountId;
    }
    if (updates.depreciationExpenseAccountId !== undefined) {
      this._depreciationExpenseAccountId = updates.depreciationExpenseAccountId;
    }
    if (updates.gainLossOnDisposalAccountId !== undefined) {
      this._gainLossOnDisposalAccountId = updates.gainLossOnDisposalAccountId;
    }
    if (updates.taxUsefulLifeMonths !== undefined) {
      this._taxUsefulLifeMonths = updates.taxUsefulLifeMonths;
    }
    if (updates.taxDepreciationMethod !== undefined) {
      this._taxDepreciationMethod = updates.taxDepreciationMethod;
    }
    if (updates.taxAssetGroup !== undefined) {
      this._taxAssetGroup = updates.taxAssetGroup;
    }

    this._updatedAt = new Date();
  }

  /**
   * Deactivate category
   */
  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /**
   * Reactivate category
   */
  reactivate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /**
   * Calculate salvage value for a given acquisition cost
   */
  calculateSalvageValue(acquisitionCost: number): number {
    return Math.round(acquisitionCost * (this._defaultSalvageValuePercent / 100));
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get code(): string {
    return this._code;
  }
  get name(): string {
    return this._name;
  }
  get description(): string | undefined {
    return this._description;
  }
  get defaultUsefulLifeMonths(): number {
    return this._defaultUsefulLifeMonths;
  }
  get defaultDepreciationMethod(): DepreciationMethod {
    return this._defaultDepreciationMethod;
  }
  get defaultSalvageValuePercent(): number {
    return this._defaultSalvageValuePercent;
  }
  get assetAccountId(): string {
    return this._assetAccountId;
  }
  get accumulatedDepreciationAccountId(): string {
    return this._accumulatedDepreciationAccountId;
  }
  get depreciationExpenseAccountId(): string {
    return this._depreciationExpenseAccountId;
  }
  get gainLossOnDisposalAccountId(): string {
    return this._gainLossOnDisposalAccountId;
  }
  get taxUsefulLifeMonths(): number | undefined {
    return this._taxUsefulLifeMonths;
  }
  get taxDepreciationMethod(): DepreciationMethod | undefined {
    return this._taxDepreciationMethod;
  }
  get taxAssetGroup(): TaxAssetGroup | undefined {
    return this._taxAssetGroup;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
}
