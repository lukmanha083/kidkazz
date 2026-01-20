import type { IRepository } from '@kidkazz/ddd-core';
import type { Customer } from '../entities/Customer';

export interface CustomerFilter {
  status?: string;
  customerType?: string;
  search?: string;
}

export interface ICustomerRepository extends IRepository<Customer> {
  findByCode(code: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findAll(filter?: CustomerFilter): Promise<Customer[]>;
}
