import { Budget, type BudgetStatus, type BudgetRevision } from '../entities/budget.entity';

/**
 * Budget filter options
 */
export interface BudgetFilter {
  fiscalYear?: number;
  status?: BudgetStatus;
}

/**
 * Budget repository interface
 */
export interface IBudgetRepository {
  findById(id: string): Promise<Budget | null>;
  findByYearAndName(fiscalYear: number, name: string): Promise<Budget | null>;
  findAll(filter?: BudgetFilter): Promise<Budget[]>;
  save(budget: Budget): Promise<void>;
  saveRevision(revision: BudgetRevision): Promise<void>;
  delete(id: string): Promise<void>;
}
