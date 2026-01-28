import type { BankReconciliation, ReconcilingItem } from '@/domain/entities/bank-reconciliation.entity';
import type { ReconciliationStatus } from '@/domain/value-objects';
import type { PaginationOptions, PaginatedResult } from './journal-entry.repository';

/**
 * Bank Reconciliation Filter
 */
export interface BankReconciliationFilter {
  bankAccountId?: string;
  fiscalYear?: number;
  fiscalMonth?: number;
  status?: ReconciliationStatus;
}

/**
 * Bank Reconciliation Repository Interface
 */
export interface IBankReconciliationRepository {
  /**
   * Find reconciliation by ID
   */
  findById(id: string): Promise<BankReconciliation | null>;

  /**
   * Find reconciliation by bank account and period
   */
  findByAccountAndPeriod(
    bankAccountId: string,
    fiscalYear: number,
    fiscalMonth: number
  ): Promise<BankReconciliation | null>;

  /**
   * Find reconciliations by bank account
   */
  findByBankAccountId(bankAccountId: string): Promise<BankReconciliation[]>;

  /**
   * Find reconciliations by period
   */
  findByPeriod(fiscalYear: number, fiscalMonth: number): Promise<BankReconciliation[]>;

  /**
   * Find all reconciliations with optional filter and pagination
   */
  findAll(
    filter?: BankReconciliationFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<BankReconciliation>>;

  /**
   * Find incomplete reconciliations (not approved)
   */
  findIncomplete(): Promise<BankReconciliation[]>;

  /**
   * Save reconciliation (create or update) with items
   */
  save(reconciliation: BankReconciliation): Promise<void>;

  /**
   * Save a reconciling item
   */
  saveItem(item: ReconcilingItem): Promise<void>;

  /**
   * Delete reconciliation by ID
   */
  delete(id: string): Promise<void>;
}
