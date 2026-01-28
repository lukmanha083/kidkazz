import type { BankAccount } from '@/domain/entities/bank-account.entity';
import type { BankAccountType, BankAccountStatus } from '@/domain/value-objects';
import type { PaginationOptions, PaginatedResult } from './journal-entry.repository';

/**
 * Bank Account Filter
 */
export interface BankAccountFilter {
  status?: BankAccountStatus;
  accountType?: BankAccountType;
  bankName?: string;
  currency?: string;
  search?: string;
  needsReconciliation?: boolean;
}

/**
 * Bank Account Repository Interface
 */
export interface IBankAccountRepository {
  /**
   * Find bank account by ID
   */
  findById(id: string): Promise<BankAccount | null>;

  /**
   * Find bank account by GL account ID
   */
  findByAccountId(accountId: string): Promise<BankAccount | null>;

  /**
   * Find bank account by account number
   */
  findByAccountNumber(accountNumber: string): Promise<BankAccount | null>;

  /**
   * Find all bank accounts with optional filter and pagination
   */
  findAll(filter?: BankAccountFilter, pagination?: PaginationOptions): Promise<PaginatedResult<BankAccount>>;

  /**
   * Find active bank accounts
   */
  findActive(): Promise<BankAccount[]>;

  /**
   * Find bank accounts that need reconciliation for a given period (Rule 21)
   */
  findNeedingReconciliation(fiscalYear: number, fiscalMonth: number): Promise<BankAccount[]>;

  /**
   * Check if account number exists (for uniqueness validation)
   */
  accountNumberExists(accountNumber: string, excludeId?: string): Promise<boolean>;

  /**
   * Save bank account (create or update)
   */
  save(bankAccount: BankAccount): Promise<void>;

  /**
   * Delete bank account by ID
   */
  delete(id: string): Promise<void>;
}
