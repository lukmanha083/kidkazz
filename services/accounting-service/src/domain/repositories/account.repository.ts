import { Account, AccountStatus } from '../entities';
import { AccountType } from '../value-objects';

/**
 * Account filter options
 */
export interface AccountFilter {
  status?: AccountStatus;
  accountType?: AccountType;
  parentAccountId?: string | null;
  isDetailAccount?: boolean;
  isSystemAccount?: boolean;
  search?: string;
}

/**
 * Account Repository Interface (Port)
 * Defines operations for persisting and retrieving accounts
 */
export interface IAccountRepository {
  /**
   * Find account by ID
   */
  findById(id: string): Promise<Account | null>;

  /**
   * Find account by code
   */
  findByCode(code: string): Promise<Account | null>;

  /**
   * Find all accounts with optional filters
   */
  findAll(filter?: AccountFilter): Promise<Account[]>;

  /**
   * Find accounts by parent (for hierarchy)
   */
  findByParentId(parentId: string | null): Promise<Account[]>;

  /**
   * Get complete account hierarchy (tree structure)
   */
  getAccountTree(): Promise<Account[]>;

  /**
   * Save account (create or update)
   */
  save(account: Account): Promise<void>;

  /**
   * Delete account by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if account has any transactions
   */
  hasTransactions(accountId: string): Promise<boolean>;

  /**
   * Check if account code exists
   */
  codeExists(code: string, excludeId?: string): Promise<boolean>;
}
