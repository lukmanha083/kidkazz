import { DomainEvent } from '@kidkazz/ddd-core';

export class InventoryCreated extends DomainEvent {
  constructor(
    public readonly inventoryId: string,
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly initialQuantity: number
  ) {
    super('InventoryCreated');
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
        initialQuantity: this.initialQuantity,
      },
    };
  }
}
