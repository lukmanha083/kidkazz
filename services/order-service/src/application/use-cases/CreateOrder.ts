import { Order, OrderItem } from '../../domain/entities/Order';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Result, ResultFactory, ValidationError } from '@kidkazz/types';

/**
 * Create Order Use Case
 */
export class CreateOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(input: CreateOrderInput): Promise<Result<CreateOrderOutput>> {
    // Validate input
    const validation = this.validate(input);
    if (!validation.isSuccess) {
      return ResultFactory.fail(validation.error!);
    }

    // Create order items
    const orderItems: OrderItem[] = [];
    for (const item of input.items) {
      const orderItemResult = OrderItem.create({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discount: item.discount,
      });

      if (!orderItemResult.isSuccess) {
        return ResultFactory.fail(orderItemResult.error!);
      }

      orderItems.push(orderItemResult.value!);
    }

    // Create order entity
    const orderResult = Order.create({
      userId: input.userId,
      customerType: input.customerType,
      items: orderItems,
      shippingAddress: input.shippingAddress,
      shippingCost: input.shippingCost,
    });

    if (!orderResult.isSuccess) {
      return ResultFactory.fail(orderResult.error!);
    }

    const order = orderResult.value!;

    // Persist order
    const saveResult = await this.orderRepository.save(order);
    if (!saveResult.isSuccess) {
      return ResultFactory.fail(saveResult.error!);
    }

    // TODO: Publish domain events
    // TODO: Trigger saga for inventory reservation and payment

    return ResultFactory.ok({
      orderId: order.getId(),
      orderNumber: order.getOrderNumber(),
      status: order.getStatus().getValue(),
      totalAmount: order.getTotalAmount(),
      items: order.getItems().map((item) => item.toJSON()),
    });
  }

  private validate(input: CreateOrderInput): Result<void> {
    if (!input.userId) {
      return ResultFactory.fail(new ValidationError('User ID is required'));
    }

    if (!input.items || input.items.length === 0) {
      return ResultFactory.fail(new ValidationError('Order must have at least one item'));
    }

    if (!input.shippingAddress) {
      return ResultFactory.fail(new ValidationError('Shipping address is required'));
    }

    return ResultFactory.ok(undefined);
  }
}

export interface CreateOrderInput {
  userId: string;
  customerType: 'retail' | 'wholesale';
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    discount?: number;
  }>;
  shippingAddress: any;
  shippingCost?: number;
}

export interface CreateOrderOutput {
  orderId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  items: any[];
}
