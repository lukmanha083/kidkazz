import type {
  IAssetMovementRepository,
  IFixedAssetRepository,
  AssetMovement,
} from '@/domain/repositories';

// ============================================================================
// Movement Response
// ============================================================================

export interface MovementResponse {
  id: string;
  assetId: string;
  assetNumber?: string;
  assetName?: string;
  movementType: string;
  fromLocationId?: string;
  toLocationId?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  fromUserId?: string;
  toUserId?: string;
  movementDate: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  createdAt: string;
}

// ============================================================================
// Get Movement Query
// ============================================================================

export interface GetMovementQuery {
  id: string;
}

export class GetMovementHandler {
  constructor(
    private readonly movementRepo: IAssetMovementRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(query: GetMovementQuery): Promise<MovementResponse | null> {
    const movement = await this.movementRepo.findById(query.id);
    if (!movement) return null;

    const asset = await this.assetRepo.findById(movement.assetId);

    return this.mapToResponse(movement, asset?.assetNumber, asset?.name);
  }

  private mapToResponse(
    movement: AssetMovement,
    assetNumber?: string,
    assetName?: string
  ): MovementResponse {
    return {
      id: movement.id,
      assetId: movement.assetId,
      assetNumber,
      assetName,
      movementType: movement.movementType,
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
    };
  }
}

// ============================================================================
// List Asset Movements Query
// ============================================================================

export interface ListAssetMovementsQuery {
  assetId: string;
}

export class ListAssetMovementsHandler {
  constructor(
    private readonly movementRepo: IAssetMovementRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(query: ListAssetMovementsQuery): Promise<MovementResponse[]> {
    const asset = await this.assetRepo.findById(query.assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const movements = await this.movementRepo.findByAsset(query.assetId);

    return movements.map((m) => ({
      id: m.id,
      assetId: m.assetId,
      assetNumber: asset.assetNumber,
      assetName: asset.name,
      movementType: m.movementType,
      fromLocationId: m.fromLocationId,
      toLocationId: m.toLocationId,
      fromDepartmentId: m.fromDepartmentId,
      toDepartmentId: m.toDepartmentId,
      fromUserId: m.fromUserId,
      toUserId: m.toUserId,
      movementDate: m.movementDate.toISOString().split('T')[0],
      reason: m.reason,
      notes: m.notes,
      performedBy: m.performedBy,
      createdAt: m.createdAt.toISOString(),
    }));
  }
}

// ============================================================================
// List Movements by Date Range Query
// ============================================================================

export interface ListMovementsByDateRangeQuery {
  from: Date;
  to: Date;
}

export class ListMovementsByDateRangeHandler {
  constructor(
    private readonly movementRepo: IAssetMovementRepository,
    private readonly assetRepo: IFixedAssetRepository
  ) {}

  async execute(query: ListMovementsByDateRangeQuery): Promise<MovementResponse[]> {
    const movements = await this.movementRepo.findByDateRange(query.from, query.to);

    // Get all assets for the movements
    const assetMap = new Map<string, { assetNumber: string; name: string }>();
    for (const m of movements) {
      if (!assetMap.has(m.assetId)) {
        const asset = await this.assetRepo.findById(m.assetId);
        if (asset) {
          assetMap.set(m.assetId, { assetNumber: asset.assetNumber, name: asset.name });
        }
      }
    }

    return movements.map((m) => {
      const asset = assetMap.get(m.assetId);
      return {
        id: m.id,
        assetId: m.assetId,
        assetNumber: asset?.assetNumber,
        assetName: asset?.name,
        movementType: m.movementType,
        fromLocationId: m.fromLocationId,
        toLocationId: m.toLocationId,
        fromDepartmentId: m.fromDepartmentId,
        toDepartmentId: m.toDepartmentId,
        fromUserId: m.fromUserId,
        toUserId: m.toUserId,
        movementDate: m.movementDate.toISOString().split('T')[0],
        reason: m.reason,
        notes: m.notes,
        performedBy: m.performedBy,
        createdAt: m.createdAt.toISOString(),
      };
    });
  }
}
