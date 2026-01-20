import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';

/**
 * Query: Get Inventory for Product across Warehouses
 */
export class GetInventory {
  constructor(private repository: IInventoryRepository) {}

  async execute(productId: string) {
    const inventories = await this.repository.findByProduct(productId);

    return {
      productId,
      warehouses: inventories.map((inv) => inv.toData()),
      totalAvailable: inventories.reduce((sum, inv) => sum + inv.getAvailableQuantity(), 0),
    };
  }
}
