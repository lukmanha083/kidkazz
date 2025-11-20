import { DomainEvent } from '@kidkazz/ddd-core';

export class ProductDiscontinued extends DomainEvent {
  constructor(
    public readonly productId: string,
    public readonly reason?: string
  ) {
    super('ProductDiscontinued');
  }

  toData() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      payload: {
        productId: this.productId,
        reason: this.reason,
      },
    };
  }
}
