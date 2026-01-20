import type { IRepository } from '@kidkazz/ddd-core';
import type { Supplier } from '../entities/Supplier';

export interface SupplierFilter {
  status?: string;
  search?: string;
}

export interface ISupplierRepository extends IRepository<Supplier> {
  findByCode(code: string): Promise<Supplier | null>;
  findAll(filter?: SupplierFilter): Promise<Supplier[]>;
}
