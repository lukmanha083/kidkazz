import { DomainEvent } from '@kidkazz/ddd-core';

export class StockAdjusted extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly previousStock: number,
    public readonly newStock: number,
    public readonly adjustment: number,
    public readonly reason: string,
    public readonly performedBy: string
  ) {
    super('StockAdjusted');
  }

  toData() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      payload: {
        productId: this.productId,
        previousStock: this.previousStock,
        newStock: this.newStock,
        adjustment: this.adjustment,
        reason: this.reason,
        performedBy: this.performedBy,
      },
    };
  }
}
