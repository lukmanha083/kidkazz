import { BankStatement, BankTransaction } from '@/domain/entities';
import { BankTransactionType, BankTransactionMatchStatus } from '@/domain/value-objects';
import type {
  IBankAccountRepository,
  IBankStatementRepository,
  IBankTransactionRepository,
} from '@/domain/repositories';

// ============================================================================
// Import Bank Statement Command
// ============================================================================

export interface BankStatementTransactionData {
  transactionDate: Date;
  valueDate?: Date;
  description: string;
  reference?: string;
  amount: number;
  checkNumber?: string;
}

export interface ImportBankStatementCommand {
  bankAccountId: string;
  statementDate: Date;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: BankStatementTransactionData[];
  importSource?: string;
  importedBy?: string;
}

export interface ImportBankStatementResult {
  statementId: string;
  bankAccountId: string;
  statementDate: Date;
  transactionsImported: number;
  duplicatesSkipped: number;
}

export class ImportBankStatementHandler {
  constructor(
    private readonly bankAccountRepo: IBankAccountRepository,
    private readonly bankStatementRepo: IBankStatementRepository,
    private readonly bankTransactionRepo: IBankTransactionRepository
  ) {}

  async execute(command: ImportBankStatementCommand): Promise<ImportBankStatementResult> {
    // Verify bank account exists
    const bankAccount = await this.bankAccountRepo.findById(command.bankAccountId);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    if (!bankAccount.isActive()) {
      throw new Error('Cannot import statement for inactive bank account');
    }

    // Create bank statement
    const statement = BankStatement.create({
      bankAccountId: command.bankAccountId,
      statementDate: command.statementDate,
      periodStart: command.periodStart,
      periodEnd: command.periodEnd,
      openingBalance: command.openingBalance,
      closingBalance: command.closingBalance,
      importSource: command.importSource,
      importedBy: command.importedBy,
    });

    await this.bankStatementRepo.save(statement);

    // Import transactions, checking for duplicates via fingerprint
    let transactionsImported = 0;
    let duplicatesSkipped = 0;
    let totalDebits = 0;
    let totalCredits = 0;

    for (const txData of command.transactions) {
      // Determine transaction type based on amount sign
      const transactionType = txData.amount >= 0
        ? BankTransactionType.CREDIT
        : BankTransactionType.DEBIT;

      const transaction = BankTransaction.create({
        bankStatementId: statement.id,
        bankAccountId: command.bankAccountId,
        transactionDate: txData.transactionDate,
        postDate: txData.valueDate,
        description: txData.description,
        reference: txData.reference || txData.checkNumber,
        amount: txData.amount,
        transactionType,
      });

      // Check for duplicate using fingerprint
      const existingTx = await this.bankTransactionRepo.findByFingerprint(transaction.fingerprint);
      if (existingTx) {
        duplicatesSkipped++;
        continue;
      }

      await this.bankTransactionRepo.save(transaction);
      transactionsImported++;

      // Track totals
      if (txData.amount >= 0) {
        totalCredits += txData.amount;
      } else {
        totalDebits += Math.abs(txData.amount);
      }
    }

    // Update statement transaction count
    statement.updateCounts(transactionsImported, totalDebits, totalCredits);
    await this.bankStatementRepo.save(statement);

    return {
      statementId: statement.id,
      bankAccountId: command.bankAccountId,
      statementDate: command.statementDate,
      transactionsImported,
      duplicatesSkipped,
    };
  }
}

// ============================================================================
// Delete Bank Statement Command
// ============================================================================

export interface DeleteBankStatementCommand {
  statementId: string;
}

export class DeleteBankStatementHandler {
  constructor(
    private readonly bankStatementRepo: IBankStatementRepository,
    private readonly bankTransactionRepo: IBankTransactionRepository
  ) {}

  async execute(command: DeleteBankStatementCommand): Promise<void> {
    const statement = await this.bankStatementRepo.findById(command.statementId);
    if (!statement) {
      throw new Error('Bank statement not found');
    }

    // Check if any transactions are matched
    const transactions = await this.bankTransactionRepo.findByStatementId(command.statementId);
    const matchedTransactions = transactions.filter(
      (tx) => tx.matchStatus === BankTransactionMatchStatus.MATCHED
    );
    if (matchedTransactions.length > 0) {
      throw new Error(
        `Cannot delete statement with ${matchedTransactions.length} matched transactions`
      );
    }

    // Delete all transactions for this statement
    for (const tx of transactions) {
      await this.bankTransactionRepo.delete(tx.id);
    }

    // Delete the statement
    await this.bankStatementRepo.delete(command.statementId);
  }
}
