import type { BankTransaction } from '@/domain/entities/bank-transaction.entity';
import type { BankTransactionMatchStatus } from '@/domain/value-objects';
import type { PaginationOptions, PaginatedResult } from './journal-entry.repository';

/**
 * Bank Transaction Filter
 */
export interface BankTransactionFilter {
  bankStatementId?: string;
  bankAccountId?: string;
  matchStatus?: BankTransactionMatchStatus;
  transactionDateFrom?: Date;
  transactionDateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  search?: string;
}

/**
 * Bank Transaction Repository Interface
 */
export interface IBankTransactionRepository {
  /**
   * Find bank transaction by ID
   */
  findById(id: string): Promise<BankTransaction | null>;

  /**
   * Find bank transaction by fingerprint (for duplicate detection)
   */
  findByFingerprint(fingerprint: string): Promise<BankTransaction | null>;

  /**
   * Find bank transactions by statement ID
   */
  findByStatementId(statementId: string): Promise<BankTransaction[]>;

  /**
   * Find bank transactions by bank account ID
   */
  findByBankAccountId(bankAccountId: string): Promise<BankTransaction[]>;

  /**
   * Find unmatched transactions for a bank account
   */
  findUnmatched(bankAccountId: string): Promise<BankTransaction[]>;

  /**
   * Find all bank transactions with optional filter and pagination
   */
  findAll(filter?: BankTransactionFilter, pagination?: PaginationOptions): Promise<PaginatedResult<BankTransaction>>;

  /**
   * Check if fingerprint exists (for duplicate detection)
   */
  fingerprintExists(fingerprint: string): Promise<boolean>;

  /**
   * Save bank transaction (create or update)
   */
  save(transaction: BankTransaction): Promise<void>;

  /**
   * Save multiple transactions (batch insert)
   */
  saveMany(transactions: BankTransaction[]): Promise<void>;

  /**
   * Delete bank transaction by ID
   */
  delete(id: string): Promise<void>;
}
