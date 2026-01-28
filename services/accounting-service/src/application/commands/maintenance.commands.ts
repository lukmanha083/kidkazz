import type {
  AssetMaintenance,
  IAssetMaintenanceRepository,
  IFixedAssetRepository,
} from '@/domain/repositories';
import { MaintenanceStatus, type MaintenanceType } from '@/domain/value-objects';
import { nanoid } from 'nanoid';

// ============================================================================
// Create Maintenance Command
// ============================================================================

export interface CreateMaintenanceCommand {
  assetId: string;
  maintenanceType: MaintenanceType;
  description: string;
  scheduledDate?: Date;
  cost?: number;
  isCapitalized?: boolean;
  extendsUsefulLifeMonths?: number;
  vendorId?: string;
  vendorName?: string;
  notes?: string;
  createdBy: string;
}

export interface CreateMaintenanceResult {
  id: string;
  assetId: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
}

export class CreateMaintenanceHandler {
  constructor(
    private readonly maintenanceRepo: IAssetMaintenanceRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(command: CreateMaintenanceCommand): Promise<CreateMaintenanceResult> {
    // Verify asset exists
    const asset = await this.assetRepo.findById(command.assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const now = new Date();
    const maintenance: AssetMaintenance = {
      id: `mnt-${nanoid(12)}`,
      assetId: command.assetId,
      maintenanceType: command.maintenanceType,
      description: command.description,
      scheduledDate: command.scheduledDate,
      cost: command.cost ?? 0,
      isCapitalized: command.isCapitalized ?? false,
      extendsUsefulLifeMonths: command.extendsUsefulLifeMonths ?? 0,
      vendorId: command.vendorId,
      vendorName: command.vendorName,
      notes: command.notes,
      status: MaintenanceStatus.SCHEDULED,
      createdBy: command.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    await this.maintenanceRepo.save(maintenance);

    return {
      id: maintenance.id,
      assetId: maintenance.assetId,
      maintenanceType: command.maintenanceType,
      status: MaintenanceStatus.SCHEDULED,
    };
  }
}

// ============================================================================
// Update Maintenance Command
// ============================================================================

export interface UpdateMaintenanceCommand {
  id: string;
  description?: string;
  scheduledDate?: Date;
  cost?: number;
  isCapitalized?: boolean;
  extendsUsefulLifeMonths?: number;
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  notes?: string;
}

export class UpdateMaintenanceHandler {
  constructor(private readonly maintenanceRepo: IAssetMaintenanceRepository) {}

  async execute(command: UpdateMaintenanceCommand): Promise<void> {
    const maintenance = await this.maintenanceRepo.findById(command.id);
    if (!maintenance) {
      throw new Error('Maintenance record not found');
    }

    if (
      maintenance.status === MaintenanceStatus.COMPLETED ||
      maintenance.status === MaintenanceStatus.CANCELLED
    ) {
      throw new Error('Cannot update completed or cancelled maintenance');
    }

    // Update fields
    if (command.description !== undefined) maintenance.description = command.description;
    if (command.scheduledDate !== undefined) maintenance.scheduledDate = command.scheduledDate;
    if (command.cost !== undefined) maintenance.cost = command.cost;
    if (command.isCapitalized !== undefined) maintenance.isCapitalized = command.isCapitalized;
    if (command.extendsUsefulLifeMonths !== undefined)
      maintenance.extendsUsefulLifeMonths = command.extendsUsefulLifeMonths;
    if (command.vendorId !== undefined) maintenance.vendorId = command.vendorId;
    if (command.vendorName !== undefined) maintenance.vendorName = command.vendorName;
    if (command.invoiceNumber !== undefined) maintenance.invoiceNumber = command.invoiceNumber;
    if (command.notes !== undefined) maintenance.notes = command.notes;
    maintenance.updatedAt = new Date();

    await this.maintenanceRepo.save(maintenance);
  }
}

// ============================================================================
// Start Maintenance Command
// ============================================================================

export interface StartMaintenanceCommand {
  id: string;
}

export interface StartMaintenanceResult {
  id: string;
  status: MaintenanceStatus;
}

export class StartMaintenanceHandler {
  constructor(private readonly maintenanceRepo: IAssetMaintenanceRepository) {}

  async execute(command: StartMaintenanceCommand): Promise<StartMaintenanceResult> {
    const maintenance = await this.maintenanceRepo.findById(command.id);
    if (!maintenance) {
      throw new Error('Maintenance record not found');
    }

    if (maintenance.status !== MaintenanceStatus.SCHEDULED) {
      throw new Error('Can only start scheduled maintenance');
    }

    maintenance.status = MaintenanceStatus.IN_PROGRESS;
    maintenance.updatedAt = new Date();

    await this.maintenanceRepo.save(maintenance);

    return {
      id: maintenance.id,
      status: MaintenanceStatus.IN_PROGRESS,
    };
  }
}

// ============================================================================
// Complete Maintenance Command
// ============================================================================

export interface CompleteMaintenanceCommand {
  id: string;
  performedDate: Date;
  actualCost?: number;
  nextScheduledDate?: Date;
  notes?: string;
}

export interface CompleteMaintenanceResult {
  id: string;
  assetId: string;
  status: MaintenanceStatus;
  cost: number;
  isCapitalized: boolean;
  extendsUsefulLifeMonths: number;
}

export class CompleteMaintenanceHandler {
  constructor(
    private readonly maintenanceRepo: IAssetMaintenanceRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(command: CompleteMaintenanceCommand): Promise<CompleteMaintenanceResult> {
    const maintenance = await this.maintenanceRepo.findById(command.id);
    if (!maintenance) {
      throw new Error('Maintenance record not found');
    }

    if (maintenance.status === MaintenanceStatus.COMPLETED) {
      throw new Error('Maintenance already completed');
    }
    if (maintenance.status === MaintenanceStatus.CANCELLED) {
      throw new Error('Cannot complete cancelled maintenance');
    }

    // Update maintenance record
    maintenance.status = MaintenanceStatus.COMPLETED;
    maintenance.performedDate = command.performedDate;
    if (command.actualCost !== undefined) maintenance.cost = command.actualCost;
    if (command.nextScheduledDate !== undefined)
      maintenance.nextScheduledDate = command.nextScheduledDate;
    if (command.notes !== undefined) maintenance.notes = command.notes;
    maintenance.updatedAt = new Date();

    await this.maintenanceRepo.save(maintenance);

    // If capitalized, the asset's useful life should be extended
    // This would typically create a journal entry to capitalize the cost
    // For now, we just record the maintenance completion

    return {
      id: maintenance.id,
      assetId: maintenance.assetId,
      status: MaintenanceStatus.COMPLETED,
      cost: maintenance.cost,
      isCapitalized: maintenance.isCapitalized,
      extendsUsefulLifeMonths: maintenance.extendsUsefulLifeMonths,
    };
  }
}

// ============================================================================
// Cancel Maintenance Command
// ============================================================================

export interface CancelMaintenanceCommand {
  id: string;
  reason: string;
}

export interface CancelMaintenanceResult {
  id: string;
  status: MaintenanceStatus;
}

export class CancelMaintenanceHandler {
  constructor(private readonly maintenanceRepo: IAssetMaintenanceRepository) {}

  async execute(command: CancelMaintenanceCommand): Promise<CancelMaintenanceResult> {
    const maintenance = await this.maintenanceRepo.findById(command.id);
    if (!maintenance) {
      throw new Error('Maintenance record not found');
    }

    if (maintenance.status === MaintenanceStatus.COMPLETED) {
      throw new Error('Cannot cancel completed maintenance');
    }
    if (maintenance.status === MaintenanceStatus.CANCELLED) {
      throw new Error('Maintenance already cancelled');
    }

    maintenance.status = MaintenanceStatus.CANCELLED;
    maintenance.notes = maintenance.notes
      ? `${maintenance.notes}\n\nCancelled: ${command.reason}`
      : `Cancelled: ${command.reason}`;
    maintenance.updatedAt = new Date();

    await this.maintenanceRepo.save(maintenance);

    return {
      id: maintenance.id,
      status: MaintenanceStatus.CANCELLED,
    };
  }
}

// ============================================================================
// Delete Maintenance Command
// ============================================================================

export interface DeleteMaintenanceCommand {
  id: string;
}

export class DeleteMaintenanceHandler {
  constructor(private readonly maintenanceRepo: IAssetMaintenanceRepository) {}

  async execute(command: DeleteMaintenanceCommand): Promise<void> {
    const maintenance = await this.maintenanceRepo.findById(command.id);
    if (!maintenance) {
      throw new Error('Maintenance record not found');
    }

    if (maintenance.status === MaintenanceStatus.COMPLETED) {
      throw new Error('Cannot delete completed maintenance');
    }

    await this.maintenanceRepo.delete(command.id);
  }
}
