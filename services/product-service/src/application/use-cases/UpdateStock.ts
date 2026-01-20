import type { IProductRepository } from '../../domain/repositories/IProductRepository';
import type { EventPublisher } from '../../infrastructure/events/EventPublisher';

interface UpdateStockInput {
  productId: string;
  adjustment: number;
  reason: string;
  performedBy: string;
}

interface UpdateStockOutput {
  productId: string;
  previousStock: number;
  newStock: number;
  message: string;
}

/**
 * Use Case: Update Stock
 * Adjusts product stock and publishes event
 */
export class UpdateStock {
  constructor(
    private repository: IProductRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(input: UpdateStockInput): Promise<UpdateStockOutput> {
    // Find product
    const product = await this.repository.findById(input.productId);
    if (!product) {
      throw new Error(`Product ${input.productId} not found`);
    }

    const previousStock = product.getStock();

    // Adjust stock (domain logic)
    product.adjustStock(input.adjustment, input.reason, input.performedBy);

    // Persist
    await this.repository.save(product);

    // Publish domain events
    await this.eventPublisher.publishAll(product.getDomainEvents());
    product.clearDomainEvents();

    return {
      productId: product.getId(),
      previousStock,
      newStock: product.getStock(),
      message: 'Stock updated successfully',
    };
  }
}
