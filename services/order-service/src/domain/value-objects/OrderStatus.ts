/**
 * Order Status Value Object
 * Represents the lifecycle status of an order
 */
export type OrderStatusType =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export class OrderStatus {
  private constructor(private readonly status: OrderStatusType) {}

  static create(status: OrderStatusType): OrderStatus {
    return new OrderStatus(status);
  }

  static pending(): OrderStatus {
    return new OrderStatus('pending');
  }

  static confirmed(): OrderStatus {
    return new OrderStatus('confirmed');
  }

  static cancelled(): OrderStatus {
    return new OrderStatus('cancelled');
  }

  getValue(): OrderStatusType {
    return this.status;
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isConfirmed(): boolean {
    return this.status === 'confirmed';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  canTransitionTo(newStatus: OrderStatusType): boolean {
    const transitions: Record<OrderStatusType, OrderStatusType[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    return transitions[this.status].includes(newStatus);
  }

  equals(other: OrderStatus): boolean {
    return this.status === other.status;
  }
}
