import type {
  AssetMaintenance,
  IAssetMaintenanceRepository,
  IFixedAssetRepository,
} from '@/domain/repositories';

// ============================================================================
// Get Maintenance Query
// ============================================================================

export interface GetMaintenanceQuery {
  id: string;
}

export interface MaintenanceResponse {
  id: string;
  assetId: string;
  assetNumber?: string;
  assetName?: string;
  maintenanceType: string;
  description: string;
  scheduledDate?: string;
  performedDate?: string;
  nextScheduledDate?: string;
  cost: number;
  isCapitalized: boolean;
  extendsUsefulLifeMonths: number;
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  status: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class GetMaintenanceHandler {
  constructor(
    private readonly maintenanceRepo: IAssetMaintenanceRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(query: GetMaintenanceQuery): Promise<MaintenanceResponse | null> {
    const maintenance = await this.maintenanceRepo.findById(query.id);
    if (!maintenance) return null;

    const asset = await this.assetRepo.findById(maintenance.assetId);

    return this.mapToResponse(maintenance, asset?.assetNumber, asset?.name);
  }

  private mapToResponse(
    maintenance: AssetMaintenance,
    assetNumber?: string,
    assetName?: string
  ): MaintenanceResponse {
    return {
      id: maintenance.id,
      assetId: maintenance.assetId,
      assetNumber,
      assetName,
      maintenanceType: maintenance.maintenanceType,
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
      status: maintenance.status,
      notes: maintenance.notes,
      createdBy: maintenance.createdBy,
      createdAt: maintenance.createdAt.toISOString(),
      updatedAt: maintenance.updatedAt.toISOString(),
    };
  }
}

// ============================================================================
// List Asset Maintenance Query
// ============================================================================

export interface ListAssetMaintenanceQuery {
  assetId: string;
}

export class ListAssetMaintenanceHandler {
  constructor(
    private readonly maintenanceRepo: IAssetMaintenanceRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(query: ListAssetMaintenanceQuery): Promise<MaintenanceResponse[]> {
    const asset = await this.assetRepo.findById(query.assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const maintenanceList = await this.maintenanceRepo.findByAsset(query.assetId);

    return maintenanceList.map((m) => ({
      id: m.id,
      assetId: m.assetId,
      assetNumber: asset.assetNumber,
      assetName: asset.name,
      maintenanceType: m.maintenanceType,
      description: m.description,
      scheduledDate: m.scheduledDate?.toISOString().split('T')[0],
      performedDate: m.performedDate?.toISOString().split('T')[0],
      nextScheduledDate: m.nextScheduledDate?.toISOString().split('T')[0],
      cost: m.cost,
      isCapitalized: m.isCapitalized,
      extendsUsefulLifeMonths: m.extendsUsefulLifeMonths,
      vendorId: m.vendorId,
      vendorName: m.vendorName,
      invoiceNumber: m.invoiceNumber,
      status: m.status,
      notes: m.notes,
      createdBy: m.createdBy,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }
}

// ============================================================================
// List Scheduled Maintenance Query
// ============================================================================

export type ListScheduledMaintenanceQuery = {};

export class ListScheduledMaintenanceHandler {
  constructor(
    private readonly maintenanceRepo: IAssetMaintenanceRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(_query: ListScheduledMaintenanceQuery): Promise<MaintenanceResponse[]> {
    const maintenanceList = await this.maintenanceRepo.findScheduled();

    // Get all assets for the maintenance records
    const assetMap = new Map<string, { assetNumber: string; name: string }>();
    for (const m of maintenanceList) {
      if (!assetMap.has(m.assetId)) {
        const asset = await this.assetRepo.findById(m.assetId);
        if (asset) {
          assetMap.set(m.assetId, { assetNumber: asset.assetNumber, name: asset.name });
        }
      }
    }

    return maintenanceList.map((m) => {
      const asset = assetMap.get(m.assetId);
      return {
        id: m.id,
        assetId: m.assetId,
        assetNumber: asset?.assetNumber,
        assetName: asset?.name,
        maintenanceType: m.maintenanceType,
        description: m.description,
        scheduledDate: m.scheduledDate?.toISOString().split('T')[0],
        performedDate: m.performedDate?.toISOString().split('T')[0],
        nextScheduledDate: m.nextScheduledDate?.toISOString().split('T')[0],
        cost: m.cost,
        isCapitalized: m.isCapitalized,
        extendsUsefulLifeMonths: m.extendsUsefulLifeMonths,
        vendorId: m.vendorId,
        vendorName: m.vendorName,
        invoiceNumber: m.invoiceNumber,
        status: m.status,
        notes: m.notes,
        createdBy: m.createdBy,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    });
  }
}

// ============================================================================
// List Overdue Maintenance Query
// ============================================================================

export type ListOverdueMaintenanceQuery = {};

export class ListOverdueMaintenanceHandler {
  constructor(
    private readonly maintenanceRepo: IAssetMaintenanceRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(_query: ListOverdueMaintenanceQuery): Promise<MaintenanceResponse[]> {
    const maintenanceList = await this.maintenanceRepo.findOverdue();

    // Get all assets for the maintenance records
    const assetMap = new Map<string, { assetNumber: string; name: string }>();
    for (const m of maintenanceList) {
      if (!assetMap.has(m.assetId)) {
        const asset = await this.assetRepo.findById(m.assetId);
        if (asset) {
          assetMap.set(m.assetId, { assetNumber: asset.assetNumber, name: asset.name });
        }
      }
    }

    return maintenanceList.map((m) => {
      const asset = assetMap.get(m.assetId);
      return {
        id: m.id,
        assetId: m.assetId,
        assetNumber: asset?.assetNumber,
        assetName: asset?.name,
        maintenanceType: m.maintenanceType,
        description: m.description,
        scheduledDate: m.scheduledDate?.toISOString().split('T')[0],
        performedDate: m.performedDate?.toISOString().split('T')[0],
        nextScheduledDate: m.nextScheduledDate?.toISOString().split('T')[0],
        cost: m.cost,
        isCapitalized: m.isCapitalized,
        extendsUsefulLifeMonths: m.extendsUsefulLifeMonths,
        vendorId: m.vendorId,
        vendorName: m.vendorName,
        invoiceNumber: m.invoiceNumber,
        status: m.status,
        notes: m.notes,
        createdBy: m.createdBy,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    });
  }
}
