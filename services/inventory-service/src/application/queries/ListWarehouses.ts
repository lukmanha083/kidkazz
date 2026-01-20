import type { IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';

/**
 * Query: List Warehouses
 */
export class ListWarehouses {
  constructor(private repository: IWarehouseRepository) {}

  async execute(status?: string) {
    const warehouses = await this.repository.findAll(status);

    return {
      warehouses: warehouses.map((w) => w.toData()),
      total: warehouses.length,
    };
  }
}
