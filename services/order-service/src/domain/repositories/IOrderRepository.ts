import type { Result } from '@kidkazz/types';
import type { Order } from '../entities/Order';

/**
 * Order Repository Port (Interface)
 */
export interface IOrderRepository {
  save(order: Order): Promise<Result<void>>;
  findById(id: string): Promise<Result<Order | null>>;
  findByOrderNumber(orderNumber: string): Promise<Result<Order | null>>;
  findByUserId(userId: string): Promise<Result<Order[]>>;
  findAll(filters?: {
    status?: string;
    customerType?: 'retail' | 'wholesale';
  }): Promise<Result<Order[]>>;
}
