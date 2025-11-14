import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Result, ResultFactory } from '@kidkazz/types';

/**
 * List Orders Use Case
 */
export class ListOrdersUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(input: ListOrdersInput): Promise<Result<ListOrdersOutput>> {
    const result = await this.orderRepository.findAll({
      status: input.status,
      customerType: input.customerType,
    });

    if (!result.isSuccess) {
      return ResultFactory.fail(result.error!);
    }

    const orders = result.value!.map((order) => ({
      orderId: order.getId(),
      orderNumber: order.getOrderNumber(),
      userId: order.getUserId(),
      customerType: order.getCustomerType(),
      status: order.getStatus().getValue(),
      paymentStatus: order.getPaymentStatus(),
      totalAmount: order.getTotalAmount(),
    }));

    return ResultFactory.ok({
      orders,
      total: orders.length,
    });
  }
}

export interface ListOrdersInput {
  status?: string;
  customerType?: 'retail' | 'wholesale';
}

export interface ListOrdersOutput {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    userId: string;
    customerType: 'retail' | 'wholesale';
    status: string;
    paymentStatus: string;
    totalAmount: number;
  }>;
  total: number;
}
