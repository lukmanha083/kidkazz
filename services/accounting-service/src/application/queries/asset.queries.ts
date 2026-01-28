import type { AssetCategory, FixedAsset } from '@/domain/entities';
import type {
  FixedAssetFilter,
  IAssetCategoryRepository,
  IFixedAssetRepository,
  PaginatedResult,
  PaginationOptions,
} from '@/domain/repositories';
import type { AssetStatus } from '@/domain/value-objects';

// ============================================================================
// Asset Category Queries
// ============================================================================

export interface GetAssetCategoryQuery {
  id: string;
}

export interface GetAssetCategoryResult {
  id: string;
  code: string;
  name: string;
  description?: string;
  defaultUsefulLifeMonths: number;
  defaultDepreciationMethod: string;
  defaultSalvageValuePercent: number;
  assetAccountId: string;
  accumulatedDepreciationAccountId: string;
  depreciationExpenseAccountId: string;
  gainLossOnDisposalAccountId: string;
  taxUsefulLifeMonths?: number;
  taxDepreciationMethod?: string;
  taxAssetGroup?: string;
  isActive: boolean;
}

export class GetAssetCategoryHandler {
  constructor(private readonly categoryRepo: IAssetCategoryRepository) {}

  async execute(query: GetAssetCategoryQuery): Promise<GetAssetCategoryResult | null> {
    const category = await this.categoryRepo.findById(query.id);
    if (!category) {
      return null;
    }

    return this.toResult(category);
  }

  private toResult(category: AssetCategory): GetAssetCategoryResult {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      defaultUsefulLifeMonths: category.defaultUsefulLifeMonths,
      defaultDepreciationMethod: category.defaultDepreciationMethod,
      defaultSalvageValuePercent: category.defaultSalvageValuePercent,
      assetAccountId: category.assetAccountId,
      accumulatedDepreciationAccountId: category.accumulatedDepreciationAccountId,
      depreciationExpenseAccountId: category.depreciationExpenseAccountId,
      gainLossOnDisposalAccountId: category.gainLossOnDisposalAccountId,
      taxUsefulLifeMonths: category.taxUsefulLifeMonths,
      taxDepreciationMethod: category.taxDepreciationMethod,
      taxAssetGroup: category.taxAssetGroup,
      isActive: category.isActive,
    };
  }
}

export interface ListAssetCategoriesQuery {
  includeInactive?: boolean;
}

export class ListAssetCategoriesHandler {
  constructor(private readonly categoryRepo: IAssetCategoryRepository) {}

  async execute(query: ListAssetCategoriesQuery): Promise<GetAssetCategoryResult[]> {
    const categories = await this.categoryRepo.findAll(query.includeInactive ?? false);
    return categories.map((cat) => ({
      id: cat.id,
      code: cat.code,
      name: cat.name,
      description: cat.description,
      defaultUsefulLifeMonths: cat.defaultUsefulLifeMonths,
      defaultDepreciationMethod: cat.defaultDepreciationMethod,
      defaultSalvageValuePercent: cat.defaultSalvageValuePercent,
      assetAccountId: cat.assetAccountId,
      accumulatedDepreciationAccountId: cat.accumulatedDepreciationAccountId,
      depreciationExpenseAccountId: cat.depreciationExpenseAccountId,
      gainLossOnDisposalAccountId: cat.gainLossOnDisposalAccountId,
      taxUsefulLifeMonths: cat.taxUsefulLifeMonths,
      taxDepreciationMethod: cat.taxDepreciationMethod,
      taxAssetGroup: cat.taxAssetGroup,
      isActive: cat.isActive,
    }));
  }
}

// ============================================================================
// Fixed Asset Queries
// ============================================================================

export interface GetAssetQuery {
  id: string;
}

export interface AssetResult {
  id: string;
  assetNumber: string;
  name: string;
  description?: string;
  categoryId: string;
  serialNumber?: string;
  barcode?: string;
  manufacturer?: string;
  model?: string;
  locationId?: string;
  departmentId?: string;
  assignedToUserId?: string;
  acquisitionDate: string;
  acquisitionMethod: string;
  acquisitionCost: number;
  purchaseOrderId?: string;
  supplierId?: string;
  invoiceNumber?: string;
  usefulLifeMonths: number;
  salvageValue: number;
  depreciationMethod: string;
  depreciationStartDate: string;
  accumulatedDepreciation: number;
  bookValue: number;
  lastDepreciationDate?: string;
  status: string;
  disposalDate?: string;
  disposalMethod?: string;
  disposalValue?: number;
  disposalReason?: string;
  gainLossOnDisposal?: number;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  warrantyExpiryDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class GetAssetHandler {
  constructor(private readonly assetRepo: IFixedAssetRepository) {}

  async execute(query: GetAssetQuery): Promise<AssetResult | null> {
    const asset = await this.assetRepo.findById(query.id);
    if (!asset) {
      return null;
    }

    return this.toResult(asset);
  }

  private toResult(asset: FixedAsset): AssetResult {
    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      description: asset.description,
      categoryId: asset.categoryId,
      serialNumber: asset.serialNumber,
      barcode: asset.barcode,
      manufacturer: asset.manufacturer,
      model: asset.model,
      locationId: asset.locationId,
      departmentId: asset.departmentId,
      assignedToUserId: asset.assignedToUserId,
      acquisitionDate: asset.acquisitionDate.toISOString().split('T')[0],
      acquisitionMethod: asset.acquisitionMethod,
      acquisitionCost: asset.acquisitionCost,
      purchaseOrderId: asset.purchaseOrderId,
      supplierId: asset.supplierId,
      invoiceNumber: asset.invoiceNumber,
      usefulLifeMonths: asset.usefulLifeMonths,
      salvageValue: asset.salvageValue,
      depreciationMethod: asset.depreciationMethod,
      depreciationStartDate: asset.depreciationStartDate.toISOString().split('T')[0],
      accumulatedDepreciation: asset.accumulatedDepreciation,
      bookValue: asset.bookValue,
      lastDepreciationDate: asset.lastDepreciationDate?.toISOString().split('T')[0],
      status: asset.status,
      disposalDate: asset.disposalDate?.toISOString().split('T')[0],
      disposalMethod: asset.disposalMethod,
      disposalValue: asset.disposalValue,
      disposalReason: asset.disposalReason,
      gainLossOnDisposal: asset.gainLossOnDisposal,
      insurancePolicyNumber: asset.insurancePolicyNumber,
      insuranceExpiryDate: asset.insuranceExpiryDate?.toISOString().split('T')[0],
      warrantyExpiryDate: asset.warrantyExpiryDate?.toISOString().split('T')[0],
      createdBy: asset.createdBy,
      createdAt: asset.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: asset.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}

export interface ListAssetsQuery {
  categoryId?: string;
  status?: AssetStatus;
  locationId?: string;
  departmentId?: string;
  assignedToUserId?: string;
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAssetResult {
  data: AssetResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ListAssetsHandler {
  constructor(private readonly assetRepo: IFixedAssetRepository) {}

  async execute(query: ListAssetsQuery): Promise<PaginatedAssetResult> {
    const filter: FixedAssetFilter = {
      categoryId: query.categoryId,
      status: query.status,
      locationId: query.locationId,
      departmentId: query.departmentId,
      assignedToUserId: query.assignedToUserId,
      acquisitionDateFrom: query.acquisitionDateFrom
        ? new Date(query.acquisitionDateFrom)
        : undefined,
      acquisitionDateTo: query.acquisitionDateTo ? new Date(query.acquisitionDateTo) : undefined,
      search: query.search,
    };

    const pagination: PaginationOptions = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };

    const result = await this.assetRepo.findAll(filter, pagination);

    return {
      data: result.data.map((asset) => this.toResult(asset)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  private toResult(asset: FixedAsset): AssetResult {
    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      description: asset.description,
      categoryId: asset.categoryId,
      serialNumber: asset.serialNumber,
      barcode: asset.barcode,
      manufacturer: asset.manufacturer,
      model: asset.model,
      locationId: asset.locationId,
      departmentId: asset.departmentId,
      assignedToUserId: asset.assignedToUserId,
      acquisitionDate: asset.acquisitionDate.toISOString().split('T')[0],
      acquisitionMethod: asset.acquisitionMethod,
      acquisitionCost: asset.acquisitionCost,
      purchaseOrderId: asset.purchaseOrderId,
      supplierId: asset.supplierId,
      invoiceNumber: asset.invoiceNumber,
      usefulLifeMonths: asset.usefulLifeMonths,
      salvageValue: asset.salvageValue,
      depreciationMethod: asset.depreciationMethod,
      depreciationStartDate: asset.depreciationStartDate.toISOString().split('T')[0],
      accumulatedDepreciation: asset.accumulatedDepreciation,
      bookValue: asset.bookValue,
      lastDepreciationDate: asset.lastDepreciationDate?.toISOString().split('T')[0],
      status: asset.status,
      disposalDate: asset.disposalDate?.toISOString().split('T')[0],
      disposalMethod: asset.disposalMethod,
      disposalValue: asset.disposalValue,
      disposalReason: asset.disposalReason,
      gainLossOnDisposal: asset.gainLossOnDisposal,
      insurancePolicyNumber: asset.insurancePolicyNumber,
      insuranceExpiryDate: asset.insuranceExpiryDate?.toISOString().split('T')[0],
      warrantyExpiryDate: asset.warrantyExpiryDate?.toISOString().split('T')[0],
      createdBy: asset.createdBy,
      createdAt: asset.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: asset.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}

export interface GetAssetByBarcodeQuery {
  barcode: string;
}

export class GetAssetByBarcodeHandler {
  constructor(private readonly assetRepo: IFixedAssetRepository) {}

  async execute(query: GetAssetByBarcodeQuery): Promise<AssetResult | null> {
    const asset = await this.assetRepo.findByBarcode(query.barcode);
    if (!asset) {
      return null;
    }

    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      description: asset.description,
      categoryId: asset.categoryId,
      serialNumber: asset.serialNumber,
      barcode: asset.barcode,
      manufacturer: asset.manufacturer,
      model: asset.model,
      locationId: asset.locationId,
      departmentId: asset.departmentId,
      assignedToUserId: asset.assignedToUserId,
      acquisitionDate: asset.acquisitionDate.toISOString().split('T')[0],
      acquisitionMethod: asset.acquisitionMethod,
      acquisitionCost: asset.acquisitionCost,
      purchaseOrderId: asset.purchaseOrderId,
      supplierId: asset.supplierId,
      invoiceNumber: asset.invoiceNumber,
      usefulLifeMonths: asset.usefulLifeMonths,
      salvageValue: asset.salvageValue,
      depreciationMethod: asset.depreciationMethod,
      depreciationStartDate: asset.depreciationStartDate.toISOString().split('T')[0],
      accumulatedDepreciation: asset.accumulatedDepreciation,
      bookValue: asset.bookValue,
      lastDepreciationDate: asset.lastDepreciationDate?.toISOString().split('T')[0],
      status: asset.status,
      disposalDate: asset.disposalDate?.toISOString().split('T')[0],
      disposalMethod: asset.disposalMethod,
      disposalValue: asset.disposalValue,
      disposalReason: asset.disposalReason,
      gainLossOnDisposal: asset.gainLossOnDisposal,
      insurancePolicyNumber: asset.insurancePolicyNumber,
      insuranceExpiryDate: asset.insuranceExpiryDate?.toISOString().split('T')[0],
      warrantyExpiryDate: asset.warrantyExpiryDate?.toISOString().split('T')[0],
      createdBy: asset.createdBy,
      createdAt: asset.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: asset.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}

export type GetDepreciableAssetsQuery = {};

export class GetDepreciableAssetsHandler {
  constructor(private readonly assetRepo: IFixedAssetRepository) {}

  async execute(_query: GetDepreciableAssetsQuery): Promise<AssetResult[]> {
    const assets = await this.assetRepo.findDepreciable();

    return assets.map((asset) => ({
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      description: asset.description,
      categoryId: asset.categoryId,
      serialNumber: asset.serialNumber,
      barcode: asset.barcode,
      manufacturer: asset.manufacturer,
      model: asset.model,
      locationId: asset.locationId,
      departmentId: asset.departmentId,
      assignedToUserId: asset.assignedToUserId,
      acquisitionDate: asset.acquisitionDate.toISOString().split('T')[0],
      acquisitionMethod: asset.acquisitionMethod,
      acquisitionCost: asset.acquisitionCost,
      purchaseOrderId: asset.purchaseOrderId,
      supplierId: asset.supplierId,
      invoiceNumber: asset.invoiceNumber,
      usefulLifeMonths: asset.usefulLifeMonths,
      salvageValue: asset.salvageValue,
      depreciationMethod: asset.depreciationMethod,
      depreciationStartDate: asset.depreciationStartDate.toISOString().split('T')[0],
      accumulatedDepreciation: asset.accumulatedDepreciation,
      bookValue: asset.bookValue,
      lastDepreciationDate: asset.lastDepreciationDate?.toISOString().split('T')[0],
      status: asset.status,
      disposalDate: asset.disposalDate?.toISOString().split('T')[0],
      disposalMethod: asset.disposalMethod,
      disposalValue: asset.disposalValue,
      disposalReason: asset.disposalReason,
      gainLossOnDisposal: asset.gainLossOnDisposal,
      insurancePolicyNumber: asset.insurancePolicyNumber,
      insuranceExpiryDate: asset.insuranceExpiryDate?.toISOString().split('T')[0],
      warrantyExpiryDate: asset.warrantyExpiryDate?.toISOString().split('T')[0],
      createdBy: asset.createdBy,
      createdAt: asset.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: asset.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));
  }
}
