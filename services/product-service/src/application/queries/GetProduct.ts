import type { IProductRepository } from '../../domain/repositories/IProductRepository';

/**
 * Query: Get Product by ID
 * Returns product data
 */
export class GetProduct {
  constructor(private repository: IProductRepository) {}

  async execute(productId: string) {
    const product = await this.repository.findById(productId);

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    return product.toData();
  }
}
