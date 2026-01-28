import type { BankReconciliation } from '@/domain/entities/bank-reconciliation.entity';
import type { BankTransaction } from '@/domain/entities/bank-transaction.entity';
import { BankTransactionMatchStatus, ReconciliationItemType } from '@/domain/value-objects';

/**
 * Journal line info for matching
 */
export interface JournalLineForMatching {
  id: string;
  amount: number;
  date: Date;
  direction: 'Debit' | 'Credit';
}

/**
 * Match options
 */
export interface MatchOptions {
  dateTolerance?: number; // Days tolerance for date matching (default: 3)
  amountTolerance?: number; // Amount tolerance (default: 0)
}

/**
 * Match result
 */
export interface MatchResult {
  matched: boolean;
  reason?: string;
}

/**
 * Auto-match result
 */
export interface AutoMatchResult {
  matchedCount: number;
  unmatchedCount: number;
  skippedCount: number;
  matches: Array<{ transactionId: string; journalLineId: string }>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  difference?: number;
}

/**
 * GL Account mapping for adjusting entries
 */
export interface GLAccountMapping {
  bankAccountGLId: string;
  bankFeeExpenseGLId: string;
  interestIncomeGLId: string;
  nsfCheckExpenseGLId?: string;
}

/**
 * Journal entry line data
 */
export interface JournalEntryLineData {
  accountId: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  memo?: string;
}

/**
 * Journal entry data for creation
 */
export interface JournalEntryData {
  description: string;
  entryDate: Date;
  reference?: string;
  lines: JournalEntryLineData[];
  reconciliationItemId: string;
}

/**
 * ReconciliationService
 * Handles bank reconciliation matching and validation logic (Rules 20-22)
 */
export class ReconciliationService {
  /**
   * Match a single transaction to a journal line
   */
  matchTransactionToJournalLine(
    transaction: BankTransaction,
    journalLine: JournalLineForMatching,
    matchedBy: string,
    options?: MatchOptions
  ): MatchResult {
    const dateTolerance = options?.dateTolerance ?? 3;
    const amountTolerance = options?.amountTolerance ?? 0;

    // Check if already matched
    if (transaction.matchStatus !== BankTransactionMatchStatus.UNMATCHED) {
      return { matched: false, reason: 'Transaction is not unmatched' };
    }

    // Check amount match
    const amountDiff = Math.abs(transaction.amount) - journalLine.amount;
    if (Math.abs(amountDiff) > amountTolerance) {
      return { matched: false, reason: 'Amount mismatch' };
    }

    // Check date match (within tolerance)
    const transactionDate = new Date(transaction.transactionDate);
    const journalDate = new Date(journalLine.date);
    const daysDiff = Math.abs(
      (transactionDate.getTime() - journalDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > dateTolerance) {
      return { matched: false, reason: 'Date outside tolerance' };
    }

    // Match the transaction
    transaction.match(journalLine.id, matchedBy);

    return { matched: true };
  }

  /**
   * Auto-match multiple transactions against journal lines
   */
  autoMatchTransactions(
    transactions: BankTransaction[],
    journalLines: JournalLineForMatching[],
    matchedBy: string,
    options?: MatchOptions
  ): AutoMatchResult {
    const result: AutoMatchResult = {
      matchedCount: 0,
      unmatchedCount: 0,
      skippedCount: 0,
      matches: [],
    };

    // Track which journal lines have been matched
    const matchedJournalLineIds = new Set<string>();

    for (const transaction of transactions) {
      // Skip if already matched
      if (transaction.matchStatus !== BankTransactionMatchStatus.UNMATCHED) {
        result.skippedCount++;
        continue;
      }

      // Find matching journal line
      let matched = false;
      for (const journalLine of journalLines) {
        // Skip if already used
        if (matchedJournalLineIds.has(journalLine.id)) {
          continue;
        }

        const matchResult = this.matchTransactionToJournalLine(
          transaction,
          journalLine,
          matchedBy,
          options
        );

        if (matchResult.matched) {
          matchedJournalLineIds.add(journalLine.id);
          result.matchedCount++;
          result.matches.push({
            transactionId: transaction.id,
            journalLineId: journalLine.id,
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        result.unmatchedCount++;
      }
    }

    return result;
  }

  /**
   * Validate a reconciliation (Rule 20)
   */
  validateReconciliation(reconciliation: BankReconciliation): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if balances are calculated
    if (
      reconciliation.adjustedBankBalance === undefined ||
      reconciliation.adjustedBookBalance === undefined
    ) {
      errors.push('Adjusted balances have not been calculated');
      return { isValid: false, errors, warnings };
    }

    // Check if balanced
    const difference = Math.abs(
      reconciliation.adjustedBankBalance - reconciliation.adjustedBookBalance
    );

    if (!reconciliation.isBalanced()) {
      errors.push('Adjusted bank and book balances do not match');
    }

    // Check for unposted journal entries
    const itemsNeedingJE = reconciliation.getItemsRequiringJournalEntries();
    if (itemsNeedingJE.length > 0) {
      warnings.push(
        `${itemsNeedingJE.length} item(s) require journal entries that have not been created`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      difference: difference > 0.01 ? reconciliation.getBalanceDifference() : 0,
    };
  }

  /**
   * Generate adjusting journal entries for reconciling items (Rule 22)
   */
  generateAdjustingEntries(
    reconciliation: BankReconciliation,
    glMapping: GLAccountMapping
  ): JournalEntryData[] {
    const entries: JournalEntryData[] = [];
    const itemsNeedingJE = reconciliation.getItemsRequiringJournalEntries();

    for (const item of itemsNeedingJE) {
      let debitAccount: string;
      let creditAccount: string;

      switch (item.itemType) {
        case ReconciliationItemType.BANK_FEE:
          // Debit Bank Fee Expense, Credit Bank Account
          debitAccount = glMapping.bankFeeExpenseGLId;
          creditAccount = glMapping.bankAccountGLId;
          break;

        case ReconciliationItemType.BANK_INTEREST:
          // Debit Bank Account, Credit Interest Income
          debitAccount = glMapping.bankAccountGLId;
          creditAccount = glMapping.interestIncomeGLId;
          break;

        case ReconciliationItemType.NSF_CHECK:
          // Debit NSF Check Expense (or AR), Credit Bank Account
          debitAccount = glMapping.nsfCheckExpenseGLId || glMapping.bankFeeExpenseGLId;
          creditAccount = glMapping.bankAccountGLId;
          break;

        default:
          // Skip other types - they don't auto-generate JEs
          continue;
      }

      entries.push({
        description: `Bank Reconciliation: ${item.description}`,
        entryDate: item.transactionDate,
        reference: item.reference,
        reconciliationItemId: item.id,
        lines: [
          {
            accountId: debitAccount,
            direction: 'Debit',
            amount: item.amount,
            memo: item.description,
          },
          {
            accountId: creditAccount,
            direction: 'Credit',
            amount: item.amount,
            memo: item.description,
          },
        ],
      });
    }

    return entries;
  }
}
