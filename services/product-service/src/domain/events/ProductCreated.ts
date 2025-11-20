import { DomainEvent } from '@kidkazz/ddd-core';

export class ProductCreated extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly sku: string,
    public readonly price: number
  ) {
    super('ProductCreated');
  }

  toData() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      payload: {
        productId: this.productId,
        name: this.name,
        sku: this.sku,
        price: this.price,
      },
    };
  }
}
