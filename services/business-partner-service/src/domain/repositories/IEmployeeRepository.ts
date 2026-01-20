import type { IRepository } from '@kidkazz/ddd-core';
import type { Employee } from '../entities/Employee';

export interface EmployeeFilter {
  employmentStatus?: string;
  department?: string;
  managerId?: string;
  search?: string;
}

export interface IEmployeeRepository extends IRepository<Employee> {
  findByCode(code: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findAll(filter?: EmployeeFilter): Promise<Employee[]>;
  findByManager(managerId: string): Promise<Employee[]>;
}
