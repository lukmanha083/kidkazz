import { AccountBalance } from '@/domain/entities/account-balance.entity';

/**
 * Repository interface for AccountBalance
 */
export interface IAccountBalanceRepository {
  /**
   * Find an account balance by its ID
   */
  findById(id: string): Promise<AccountBalance | null>;

  /**
   * Find an account balance by account ID and period
   */
  findByAccountAndPeriod(
    accountId: string,
    year: number,
    month: number
  ): Promise<AccountBalance | null>;

  /**
   * Find all account balances for a fiscal period
   */
  findByPeriod(year: number, month: number): Promise<AccountBalance[]>;

  /**
   * Find all account balances for a specific account
   */
  findByAccount(accountId: string): Promise<AccountBalance[]>;

  /**
   * Find the previous period's closing balance for an account
   * Used as the opening balance for the next period
   */
  findPreviousPeriodBalance(
    accountId: string,
    year: number,
    month: number
  ): Promise<AccountBalance | null>;

  /**
   * Save an account balance (insert or update)
   */
  save(balance: AccountBalance): Promise<void>;

  /**
   * Save multiple account balances
   */
  saveMany(balances: AccountBalance[]): Promise<void>;

  /**
   * Delete all account balances for a fiscal period
   * Used when reopening a period
   */
  deleteByPeriod(year: number, month: number): Promise<void>;

  /**
   * Delete an account balance by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Get the sum of all debits and credits for an account up to a specific period
   * Used for YTD balance calculation
   */
  getYearToDateBalance(
    accountId: string,
    year: number,
    upToMonth: number
  ): Promise<{
    debitTotal: number;
    creditTotal: number;
  }>;
}
