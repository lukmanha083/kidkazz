import type { BankStatement } from '@/domain/entities/bank-statement.entity';
import type { PaginationOptions, PaginatedResult } from './journal-entry.repository';

/**
 * Bank Statement Filter
 */
export interface BankStatementFilter {
  bankAccountId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  importedBy?: string;
}

/**
 * Bank Statement Repository Interface
 */
export interface IBankStatementRepository {
  /**
   * Find bank statement by ID
   */
  findById(id: string): Promise<BankStatement | null>;

  /**
   * Find bank statements by bank account ID
   */
  findByBankAccountId(bankAccountId: string): Promise<BankStatement[]>;

  /**
   * Find bank statements for a period
   */
  findByPeriod(bankAccountId: string, periodStart: Date, periodEnd: Date): Promise<BankStatement[]>;

  /**
   * Find all bank statements with optional filter and pagination
   */
  findAll(filter?: BankStatementFilter, pagination?: PaginationOptions): Promise<PaginatedResult<BankStatement>>;

  /**
   * Save bank statement (create or update)
   */
  save(statement: BankStatement): Promise<void>;

  /**
   * Delete bank statement by ID (cascades to transactions)
   */
  delete(id: string): Promise<void>;
}
