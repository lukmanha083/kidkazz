import { DomainEvent } from '@kidkazz/ddd-core';

export class InventoryAdjusted extends DomainEvent {
  constructor(
    public readonly inventoryId: string,
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly previousQuantity: number,
    public readonly newQuantity: number,
    public readonly adjustment: number,
    public readonly movementType: 'in' | 'out' | 'adjustment',
    public readonly reason?: string,
    public readonly performedBy?: string
  ) {
    super('InventoryAdjusted');
  }

  toData() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      payload: {
        inventoryId: this.inventoryId,
        productId: this.productId,
        warehouseId: this.warehouseId,
        previousQuantity: this.previousQuantity,
        newQuantity: this.newQuantity,
        adjustment: this.adjustment,
        movementType: this.movementType,
        reason: this.reason,
        performedBy: this.performedBy,
      },
    };
  }
}
