import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Result, ResultFactory } from '@kidkazz/types';

/**
 * List Products Use Case
 * Retrieves all products with optional filters
 */
export class ListProductsUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: ListProductsInput): Promise<Result<ListProductsOutput>> {
    const result = await this.productRepository.findAll({
      availableForRetail: input.availableForRetail,
      availableForWholesale: input.availableForWholesale,
      status: input.status,
    });

    if (!result.isSuccess) {
      return ResultFactory.fail(result.error!);
    }

    const products = result.value!.map((product) => ({
      productId: product.getId(),
      name: product.getName(),
      sku: product.getSKU().getValue(),
      retailPrice: product.getRetailPrice()?.getValue() || null,
      wholesalePrice: product.getWholesalePrice().getValue(),
      availableForRetail: product.getAvailability().isAvailableForRetail(),
      availableForWholesale: product.getAvailability().isAvailableForWholesale(),
      minimumOrderQuantity: product.getMinimumOrderQuantity(),
      status: product.getStatus(),
    }));

    return ResultFactory.ok({
      products,
      total: products.length,
    });
  }
}

export interface ListProductsInput {
  availableForRetail?: boolean;
  availableForWholesale?: boolean;
  status?: 'active' | 'inactive' | 'discontinued';
}

export interface ListProductsOutput {
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    retailPrice: number | null;
    wholesalePrice: number;
    availableForRetail: boolean;
    availableForWholesale: boolean;
    minimumOrderQuantity: number;
    status: string;
  }>;
  total: number;
}
