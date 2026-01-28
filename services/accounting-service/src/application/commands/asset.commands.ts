import { AssetCategory, FixedAsset } from '@/domain/entities';
import type { IAssetCategoryRepository, IFixedAssetRepository } from '@/domain/repositories';
import type {
  AcquisitionMethod,
  AssetStatus,
  DepreciationMethod,
  DisposalMethod,
  TaxAssetGroup,
} from '@/domain/value-objects';

// ============================================================================
// Asset Category Commands
// ============================================================================

export interface CreateAssetCategoryCommand {
  code: string;
  name: string;
  description?: string;
  defaultUsefulLifeMonths: number;
  defaultDepreciationMethod: DepreciationMethod;
  defaultSalvageValuePercent: number;
  assetAccountId: string;
  accumulatedDepreciationAccountId: string;
  depreciationExpenseAccountId: string;
  gainLossOnDisposalAccountId: string;
  taxUsefulLifeMonths?: number;
  taxDepreciationMethod?: DepreciationMethod;
  taxAssetGroup?: TaxAssetGroup;
}

export interface CreateAssetCategoryResult {
  id: string;
  code: string;
  name: string;
}

export class CreateAssetCategoryHandler {
  constructor(private readonly categoryRepo: IAssetCategoryRepository) {}

  async execute(command: CreateAssetCategoryCommand): Promise<CreateAssetCategoryResult> {
    // Check for duplicate code
    const existing = await this.categoryRepo.findByCode(command.code);
    if (existing) {
      throw new Error(`Category code already exists: ${command.code}`);
    }

    const category = AssetCategory.create(command);
    await this.categoryRepo.save(category);

    return {
      id: category.id,
      code: category.code,
      name: category.name,
    };
  }
}

export interface UpdateAssetCategoryCommand {
  id: string;
  name?: string;
  description?: string;
  defaultUsefulLifeMonths?: number;
  defaultDepreciationMethod?: DepreciationMethod;
  defaultSalvageValuePercent?: number;
  assetAccountId?: string;
  accumulatedDepreciationAccountId?: string;
  depreciationExpenseAccountId?: string;
  gainLossOnDisposalAccountId?: string;
}

export class UpdateAssetCategoryHandler {
  constructor(private readonly categoryRepo: IAssetCategoryRepository) {}

  async execute(command: UpdateAssetCategoryCommand): Promise<void> {
    const category = await this.categoryRepo.findById(command.id);
    if (!category) {
      throw new Error('Category not found');
    }

    category.update(command);
    await this.categoryRepo.save(category);
  }
}

export interface DeleteAssetCategoryCommand {
  id: string;
}

export class DeleteAssetCategoryHandler {
  constructor(
    private readonly categoryRepo: IAssetCategoryRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(command: DeleteAssetCategoryCommand): Promise<void> {
    const category = await this.categoryRepo.findById(command.id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check if any assets use this category
    const assets = await this.assetRepo.findByCategory(command.id);
    if (assets.length > 0) {
      throw new Error(`Cannot delete category with ${assets.length} assets`);
    }

    await this.categoryRepo.delete(command.id);
  }
}

// ============================================================================
// Fixed Asset Commands
// ============================================================================

export interface CreateAssetCommand {
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
  acquisitionDate: Date;
  acquisitionMethod: AcquisitionMethod;
  acquisitionCost: number;
  purchaseOrderId?: string;
  supplierId?: string;
  invoiceNumber?: string;
  usefulLifeMonths?: number; // Override category default
  salvageValue?: number; // Override category default
  depreciationMethod?: DepreciationMethod; // Override category default
  depreciationStartDate?: Date;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  warrantyExpiryDate?: Date;
  createdBy: string;
}

export interface CreateAssetResult {
  id: string;
  assetNumber: string;
  name: string;
  status: AssetStatus;
  bookValue: number;
}

export class CreateAssetHandler {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly categoryRepo: IAssetCategoryRepository
  ) {}

  async execute(command: CreateAssetCommand): Promise<CreateAssetResult> {
    // Get category for defaults
    const category = await this.categoryRepo.findById(command.categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check for duplicate barcode
    if (command.barcode) {
      const existingBarcode = await this.assetRepo.findByBarcode(command.barcode);
      if (existingBarcode) {
        throw new Error(`Barcode already exists: ${command.barcode}`);
      }
    }

    // Generate asset number
    const assetNumber = await this.assetRepo.generateAssetNumber(
      category.code,
      command.acquisitionDate
    );

    // Use category defaults if not provided
    const usefulLifeMonths = command.usefulLifeMonths ?? category.defaultUsefulLifeMonths;
    const salvageValue =
      command.salvageValue ?? category.calculateSalvageValue(command.acquisitionCost);
    const depreciationMethod = command.depreciationMethod ?? category.defaultDepreciationMethod;
    const depreciationStartDate =
      command.depreciationStartDate ??
      new Date(command.acquisitionDate.getFullYear(), command.acquisitionDate.getMonth() + 1, 1);

    const asset = FixedAsset.create({
      assetNumber,
      name: command.name,
      description: command.description,
      categoryId: command.categoryId,
      serialNumber: command.serialNumber,
      barcode: command.barcode,
      manufacturer: command.manufacturer,
      model: command.model,
      locationId: command.locationId,
      departmentId: command.departmentId,
      assignedToUserId: command.assignedToUserId,
      acquisitionDate: command.acquisitionDate,
      acquisitionMethod: command.acquisitionMethod,
      acquisitionCost: command.acquisitionCost,
      purchaseOrderId: command.purchaseOrderId,
      supplierId: command.supplierId,
      invoiceNumber: command.invoiceNumber,
      usefulLifeMonths,
      salvageValue,
      depreciationMethod,
      depreciationStartDate,
      insurancePolicyNumber: command.insurancePolicyNumber,
      insuranceExpiryDate: command.insuranceExpiryDate,
      warrantyExpiryDate: command.warrantyExpiryDate,
      createdBy: command.createdBy,
    });

    await this.assetRepo.save(asset);

    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      status: asset.status,
      bookValue: asset.bookValue,
    };
  }
}

export interface ActivateAssetCommand {
  id: string;
}

export interface ActivateAssetResult {
  id: string;
  assetNumber: string;
  status: AssetStatus;
}

export class ActivateAssetHandler {
  constructor(private readonly assetRepo: IFixedAssetRepository) {}

  async execute(command: ActivateAssetCommand): Promise<ActivateAssetResult> {
    const asset = await this.assetRepo.findById(command.id);
    if (!asset) {
      throw new Error('Asset not found');
    }

    asset.activate();
    await this.assetRepo.save(asset);

    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      status: asset.status,
    };
  }
}

export interface UpdateAssetCommand {
  id: string;
  name?: string;
  description?: string;
  serialNumber?: string;
  barcode?: string;
  manufacturer?: string;
  model?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  warrantyExpiryDate?: Date;
}

export class UpdateAssetHandler {
  constructor(private readonly assetRepo: IFixedAssetRepository) {}

  async execute(command: UpdateAssetCommand): Promise<void> {
    const asset = await this.assetRepo.findById(command.id);
    if (!asset) {
      throw new Error('Asset not found');
    }

    // Check barcode uniqueness if changing
    if (command.barcode && command.barcode !== asset.barcode) {
      const existingBarcode = await this.assetRepo.findByBarcode(command.barcode);
      if (existingBarcode) {
        throw new Error(`Barcode already exists: ${command.barcode}`);
      }
    }

    // Note: For simplicity, we're using the entity directly
    // In a full implementation, you'd have an update method on the entity
    await this.assetRepo.save(asset);
  }
}

export interface TransferAssetCommand {
  id: string;
  locationId?: string;
  departmentId?: string;
  assignedToUserId?: string;
  reason?: string;
  transferredBy: string;
}

export interface TransferAssetResult {
  id: string;
  assetNumber: string;
  locationId?: string;
  departmentId?: string;
  assignedToUserId?: string;
}

export class TransferAssetHandler {
  constructor(private readonly assetRepo: IFixedAssetRepository) {}

  async execute(command: TransferAssetCommand): Promise<TransferAssetResult> {
    const asset = await this.assetRepo.findById(command.id);
    if (!asset) {
      throw new Error('Asset not found');
    }

    asset.transfer({
      locationId: command.locationId,
      departmentId: command.departmentId,
      assignedToUserId: command.assignedToUserId,
    });

    await this.assetRepo.save(asset);

    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      locationId: asset.locationId,
      departmentId: asset.departmentId,
      assignedToUserId: asset.assignedToUserId,
    };
  }
}

export interface DisposeAssetCommand {
  id: string;
  method: DisposalMethod;
  value: number;
  reason: string;
  disposedBy: string;
}

export interface DisposeAssetResult {
  id: string;
  assetNumber: string;
  status: AssetStatus;
  bookValueAtDisposal: number;
  disposalValue: number;
  gainLoss: number;
  isGain: boolean;
}

export class DisposeAssetHandler {
  constructor(private readonly assetRepo: IFixedAssetRepository) {}

  async execute(command: DisposeAssetCommand): Promise<DisposeAssetResult> {
    const asset = await this.assetRepo.findById(command.id);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const result = asset.dispose({
      method: command.method,
      value: command.value,
      reason: command.reason,
      disposedBy: command.disposedBy,
    });

    await this.assetRepo.save(asset);

    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      status: asset.status,
      ...result,
    };
  }
}
