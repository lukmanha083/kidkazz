import { NotFoundError, type Result, ResultFactory } from '@kidkazz/types';
import type { ShippingAddress } from '../../domain/entities/Order';
import type { IOrderRepository } from '../../domain/repositories/IOrderRepository';

/**
 * Get Order Use Case
 */
export class GetOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string): Promise<Result<GetOrderOutput>> {
    const result = await this.orderRepository.findById(orderId);

    if (!result.isSuccess) {
      const error = result.error || new Error('Failed to find order');
      return ResultFactory.fail(error);
    }

    if (!result.value) {
      return ResultFactory.fail(new NotFoundError(`Order with ID ${orderId} not found`));
    }

    const order = result.value;

    return ResultFactory.ok({
      orderId: order.getId(),
      orderNumber: order.getOrderNumber(),
      userId: order.getUserId(),
      customerType: order.getCustomerType(),
      status: order.getStatus().getValue(),
      paymentStatus: order.getPaymentStatus(),
      totalAmount: order.getTotalAmount(),
      shippingCost: order.getShippingCost(),
      shippingAddress: order.getShippingAddress(),
      items: order.getItems().map((item) => item.toJSON()),
    });
  }
}

export interface GetOrderOutput {
  orderId: string;
  orderNumber: string;
  userId: string;
  customerType: 'retail' | 'wholesale';
  status: string;
  paymentStatus: string;
  totalAmount: number;
  shippingCost: number;
  shippingAddress: ShippingAddress;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    discount: number;
    totalPrice: number;
  }>;
}
