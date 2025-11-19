import { Product } from '../../domain/entities/Product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Result, ResultFactory, ValidationError } from '../../shared/types';

/**
 * Create Product Use Case
 * Application layer - orchestrates domain logic
 */
export class CreateProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: CreateProductInput): Promise<Result<CreateProductOutput>> {
    // Validate input
    const validation = this.validate(input);
    if (!validation.isSuccess) {
      const error = validation.error || new ValidationError('Validation failed');
      return ResultFactory.fail(error);
    }

    // Check if SKU already exists
    const existingProduct = await this.productRepository.findBySKU(input.sku);
    if (!existingProduct.isSuccess) {
      const error = existingProduct.error || new Error('Failed to check SKU');
      return ResultFactory.fail(error);
    }

    if (existingProduct.value) {
      return ResultFactory.fail(
        new ValidationError(`Product with SKU ${input.sku} already exists`)
      );
    }

    // Create domain entity
    const productResult = Product.create({
      name: input.name,
      sku: input.sku,
      description: input.description,
      retailPrice: input.retailPrice,
      wholesalePrice: input.wholesalePrice,
      availability: {
        retail: input.availableForRetail,
        wholesale: input.availableForWholesale,
      },
      minimumOrderQuantity: input.minimumOrderQuantity,
    });

    if (!productResult.isSuccess) {
      const error = productResult.error || new ValidationError('Failed to create product');
      return ResultFactory.fail(error);
    }

    const product = productResult.value;
    if (!product) {
      return ResultFactory.fail(new ValidationError('Failed to create product'));
    }

    // Persist product
    const saveResult = await this.productRepository.save(product);
    if (!saveResult.isSuccess) {
      const error = saveResult.error || new Error('Failed to save product');
      return ResultFactory.fail(error);
    }

    // TODO: Publish domain events to queue
    // const events = product.getDomainEvents();
    // await this.eventPublisher.publishMany(events);
    // product.clearDomainEvents();

    return ResultFactory.ok({
      productId: product.getId(),
      name: product.getName(),
      sku: product.getSKU().getValue(),
      retailPrice: product.getRetailPrice()?.getValue() || null,
      wholesalePrice: product.getWholesalePrice().getValue(),
      availableForRetail: product.getAvailability().isAvailableForRetail(),
      availableForWholesale: product.getAvailability().isAvailableForWholesale(),
      minimumOrderQuantity: product.getMinimumOrderQuantity(),
      status: product.getStatus(),
    });
  }

  private validate(input: CreateProductInput): Result<void> {
    if (!input.name || input.name.trim().length === 0) {
      return ResultFactory.fail(new ValidationError('Product name is required'));
    }

    if (!input.sku || input.sku.trim().length === 0) {
      return ResultFactory.fail(new ValidationError('Product SKU is required'));
    }

    if (input.wholesalePrice <= 0) {
      return ResultFactory.fail(new ValidationError('Wholesale price must be greater than 0'));
    }

    if (input.availableForRetail && (input.retailPrice === null || input.retailPrice <= 0)) {
      return ResultFactory.fail(
        new ValidationError('Retail price is required for retail products')
      );
    }

    if (!input.availableForRetail && !input.availableForWholesale) {
      return ResultFactory.fail(
        new ValidationError('Product must be available for at least one market')
      );
    }

    return ResultFactory.ok(undefined);
  }
}

export interface CreateProductInput {
  name: string;
  sku: string;
  description: string;
  retailPrice: number | null;
  wholesalePrice: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  minimumOrderQuantity?: number;
}

export interface CreateProductOutput {
  productId: string;
  name: string;
  sku: string;
  retailPrice: number | null;
  wholesalePrice: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  minimumOrderQuantity: number;
  status: string;
}
