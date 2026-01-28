import type { Budget, BudgetRevision, BudgetStatus } from '../entities/budget.entity';

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
  /**
   * Save budget and revisions atomically in a single transaction
   */
  saveWithRevisions(budget: Budget, revisions: BudgetRevision[]): Promise<void>;
  delete(id: string): Promise<void>;
}
