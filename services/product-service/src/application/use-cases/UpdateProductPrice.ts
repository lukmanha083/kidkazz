import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Result, ResultFactory, NotFoundError, ValidationError } from '../../shared/types';

/**
 * Update Product Price Use Case
 * Updates retail or wholesale price for a product
 */
export class UpdateProductPriceUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: UpdateProductPriceInput): Promise<Result<void>> {
    // Validate input
    if (input.newPrice <= 0) {
      return ResultFactory.fail(new ValidationError('Price must be greater than 0'));
    }

    if (input.priceType !== 'retail' && input.priceType !== 'wholesale') {
      return ResultFactory.fail(new ValidationError('Price type must be either retail or wholesale'));
    }

    // Find product
    const productResult = await this.productRepository.findById(input.productId);
    if (!productResult.isSuccess) {
      const error = productResult.error || new Error('Failed to find product');
      return ResultFactory.fail(error);
    }

    if (!productResult.value) {
      return ResultFactory.fail(new NotFoundError(`Product with ID ${input.productId} not found`));
    }

    const product = productResult.value;

    // Update price based on type
    let updateResult: Result<void>;
    if (input.priceType === 'retail') {
      updateResult = product.updateRetailPrice(input.newPrice);
    } else {
      updateResult = product.updateWholesalePrice(input.newPrice);
    }

    if (!updateResult.isSuccess) {
      const error = updateResult.error || new ValidationError('Failed to update price');
      return ResultFactory.fail(error);
    }

    // Persist changes
    const saveResult = await this.productRepository.save(product);
    if (!saveResult.isSuccess) {
      const error = saveResult.error || new Error('Failed to save product');
      return ResultFactory.fail(error);
    }

    // TODO: Publish domain events
    // const events = product.getDomainEvents();
    // await this.eventPublisher.publishMany(events);
    // product.clearDomainEvents();

    return ResultFactory.ok(undefined);
  }
}

export interface UpdateProductPriceInput {
  productId: string;
  priceType: 'retail' | 'wholesale';
  newPrice: number;
}
