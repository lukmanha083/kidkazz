import type { IProductRepository } from '../../domain/repositories/IProductRepository';
import type { EventPublisher } from '../../infrastructure/events/EventPublisher';

interface ChangePriceInput {
  productId: string;
  priceType: 'retail' | 'wholesale' | 'base';
  newPrice: number;
  performedBy: string;
}

interface ChangePriceOutput {
  productId: string;
  priceType: string;
  newPrice: number;
  message: string;
}

/**
 * Use Case: Change Price
 * Updates product price and publishes event
 */
export class ChangePrice {
  constructor(
    private repository: IProductRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(input: ChangePriceInput): Promise<ChangePriceOutput> {
    // Find product
    const product = await this.repository.findById(input.productId);
    if (!product) {
      throw new Error(`Product ${input.productId} not found`);
    }

    // Change price (domain logic with validation)
    product.changePrice(input.priceType, input.newPrice, input.performedBy);

    // Persist
    await this.repository.save(product);

    // Publish domain events
    await this.eventPublisher.publishAll(product.getDomainEvents());
    product.clearDomainEvents();

    return {
      productId: product.getId(),
      priceType: input.priceType,
      newPrice: input.newPrice,
      message: 'Price updated successfully',
    };
  }
}
