import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Result, ResultFactory, NotFoundError } from '@kidkazz/types';

/**
 * Get Product Use Case
 * Retrieves a product by ID
 */
export class GetProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(productId: string): Promise<Result<GetProductOutput>> {
    const result = await this.productRepository.findById(productId);

    if (!result.isSuccess) {
      return ResultFactory.fail(result.error!);
    }

    if (!result.value) {
      return ResultFactory.fail(new NotFoundError(`Product with ID ${productId} not found`));
    }

    const product = result.value;

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
}

export interface GetProductOutput {
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
