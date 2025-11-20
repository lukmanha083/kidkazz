import { DomainEvent } from '@kidkazz/ddd-core';

export class WarehouseCreated extends DomainEvent {
  constructor(
    public readonly warehouseId: string,
    public readonly code: string,
    public readonly name: string
  ) {
    super('WarehouseCreated');
  }

  toData() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      payload: {
        warehouseId: this.warehouseId,
        code: this.code,
        name: this.name,
      },
    };
  }
}
