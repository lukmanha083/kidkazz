import { DomainEvent } from '@kidkazz/ddd-core';

export class PriceChanged extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly priceType: 'retail' | 'wholesale' | 'base',
    public readonly oldPrice: number,
    public readonly newPrice: number
  ) {
    super('PriceChanged');
  }

  toData() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      payload: {
        productId: this.productId,
        priceType: this.priceType,
        oldPrice: this.oldPrice,
        newPrice: this.newPrice,
      },
    };
  }
}
