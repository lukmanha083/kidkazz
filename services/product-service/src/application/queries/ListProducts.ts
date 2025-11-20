import { IProductRepository } from '../../domain/repositories/IProductRepository';

interface ListProductsInput {
  status?: string;
  category?: string;
  search?: string;
}

/**
 * Query: List Products
 * Returns filtered list of products
 */
export class ListProducts {
  constructor(private repository: IProductRepository) {}

  async execute(filters?: ListProductsInput) {
    const products = await this.repository.findAll(filters);

    return {
      products: products.map(p => p.toData()),
      total: products.length,
    };
  }
}
