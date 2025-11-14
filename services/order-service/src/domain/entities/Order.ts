import { OrderId, UserId, ProductId, Result, ResultFactory, InvalidOperationError, Price } from '@kidkazz/types';
import { OrderCreated, OrderConfirmed, OrderCancelled } from '@kidkazz/domain-events';
import { generateId, generateTimestamp } from '@kidkazz/utils';
import { OrderStatus, OrderStatusType } from '../value-objects/OrderStatus';

/**
 * Order Item Value Object
 */
export class OrderItem {
  private constructor(
    private readonly productId: ProductId,
    private readonly productName: string,
    private readonly sku: string,
    private readonly unitPrice: Price,
    private readonly quantity: number,
    private readonly discount: number
  ) {}

  static create(params: {
    productId: ProductId;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    discount?: number;
  }): Result<OrderItem> {
    if (params.quantity <= 0) {
      return ResultFactory.fail(new InvalidOperationError('Quantity must be greater than 0'));
    }

    if (params.unitPrice <= 0) {
      return ResultFactory.fail(new InvalidOperationError('Unit price must be greater than 0'));
    }

    const discount = params.discount || 0;
    if (discount < 0 || discount > params.unitPrice * params.quantity) {
      return ResultFactory.fail(new InvalidOperationError('Invalid discount amount'));
    }

    return ResultFactory.ok(
      new OrderItem(
        params.productId,
        params.productName,
        params.sku,
        Price.create(params.unitPrice),
        params.quantity,
        discount
      )
    );
  }

  getProductId(): ProductId {
    return this.productId;
  }

  getSubtotal(): number {
    return this.unitPrice.getValue() * this.quantity - this.discount;
  }

  getQuantity(): number {
    return this.quantity;
  }

  toJSON() {
    return {
      productId: this.productId,
      productName: this.productName,
      sku: this.sku,
      unitPrice: this.unitPrice.getValue(),
      quantity: this.quantity,
      discount: this.discount,
      subtotal: this.getSubtotal(),
    };
  }
}

/**
 * Order Entity (Domain Model)
 * Rich domain object with business logic
 */
export class Order {
  private domainEvents: any[] = [];

  private constructor(
    private readonly id: OrderId,
    private readonly orderNumber: string,
    private readonly userId: UserId,
    private readonly customerType: 'retail' | 'wholesale',
    private items: OrderItem[],
    private status: OrderStatus,
    private paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
    private readonly shippingAddress: any,
    private shippingCost: number
  ) {}

  /**
   * Factory method to create a new Order
   */
  static create(params: {
    userId: UserId;
    customerType: 'retail' | 'wholesale';
    items: OrderItem[];
    shippingAddress: any;
    shippingCost?: number;
  }): Result<Order> {
    // Business Rule: Order must have at least one item
    if (params.items.length === 0) {
      return ResultFactory.fail(new InvalidOperationError('Order must have at least one item'));
    }

    // Generate order number (format: ORD-YYYYMMDD-XXXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `ORD-${dateStr}-${randomStr}`;

    const order = new Order(
      generateId(),
      orderNumber,
      params.userId,
      params.customerType,
      params.items,
      OrderStatus.pending(),
      'pending',
      params.shippingAddress,
      params.shippingCost || 0
    );

    // Raise domain event
    order.addDomainEvent({
      eventId: generateId(),
      eventType: 'OrderCreated',
      aggregateId: order.id,
      timestamp: generateTimestamp(),
      version: 1,
      orderId: order.id,
      userId: order.userId,
      customerType: order.customerType,
      orderNumber: order.orderNumber,
      items: order.items.map((item) => item.toJSON()),
      totalAmount: order.getTotalAmount(),
    } as OrderCreated);

    return ResultFactory.ok(order);
  }

  /**
   * Confirm the order
   */
  confirm(): Result<void> {
    if (!this.status.canTransitionTo('confirmed')) {
      return ResultFactory.fail(
        new InvalidOperationError(`Cannot confirm order in ${this.status.getValue()} status`)
      );
    }

    this.status = OrderStatus.confirmed();

    this.addDomainEvent({
      eventId: generateId(),
      eventType: 'OrderConfirmed',
      aggregateId: this.id,
      timestamp: generateTimestamp(),
      version: 1,
      orderId: this.id,
      orderNumber: this.orderNumber,
    } as OrderConfirmed);

    return ResultFactory.ok(undefined);
  }

  /**
   * Cancel the order
   */
  cancel(reason?: string): Result<void> {
    if (!this.status.canTransitionTo('cancelled')) {
      return ResultFactory.fail(
        new InvalidOperationError(`Cannot cancel order in ${this.status.getValue()} status`)
      );
    }

    this.status = OrderStatus.cancelled();

    this.addDomainEvent({
      eventId: generateId(),
      eventType: 'OrderCancelled',
      aggregateId: this.id,
      timestamp: generateTimestamp(),
      version: 1,
      orderId: this.id,
      orderNumber: this.orderNumber,
      reason: reason || 'No reason provided',
    } as OrderCancelled);

    return ResultFactory.ok(undefined);
  }

  /**
   * Calculate total amount
   */
  getTotalAmount(): number {
    const itemsTotal = this.items.reduce((sum, item) => sum + item.getSubtotal(), 0);
    return itemsTotal + this.shippingCost;
  }

  // Getters
  getId(): OrderId {
    return this.id;
  }

  getOrderNumber(): string {
    return this.orderNumber;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getCustomerType(): 'retail' | 'wholesale' {
    return this.customerType;
  }

  getStatus(): OrderStatus {
    return this.status;
  }

  getPaymentStatus(): string {
    return this.paymentStatus;
  }

  getItems(): OrderItem[] {
    return this.items;
  }

  getShippingAddress(): any {
    return this.shippingAddress;
  }

  getShippingCost(): number {
    return this.shippingCost;
  }

  // Domain Events Management
  private addDomainEvent(event: any): void {
    this.domainEvents.push(event);
  }

  getDomainEvents(): any[] {
    return this.domainEvents;
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
