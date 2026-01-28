import { BankStatement, BankTransaction } from '@/domain/entities';
import type {
  IBankAccountRepository,
  IBankStatementRepository,
  IBankTransactionRepository,
} from '@/domain/repositories';
import { BankTransactionMatchStatus, BankTransactionType } from '@/domain/value-objects';

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

    // Create all transactions first to get fingerprints
    const pendingTransactions: Array<{
      transaction: BankTransaction;
      txData: BankStatementTransactionData;
    }> = [];

    for (const txData of command.transactions) {
      const transactionType =
        txData.amount >= 0 ? BankTransactionType.CREDIT : BankTransactionType.DEBIT;

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

      pendingTransactions.push({ transaction, txData });
    }

    // Batch check for existing fingerprints (single query instead of N queries)
    const fingerprints = pendingTransactions.map((p) => p.transaction.fingerprint);
    const existingFingerprints = await this.bankTransactionRepo.fingerprintsExistMany(fingerprints);

    // Filter out duplicates and prepare for batch insert
    const newTransactions: BankTransaction[] = [];
    let duplicatesSkipped = 0;
    let totalDebits = 0;
    let totalCredits = 0;

    for (const { transaction, txData } of pendingTransactions) {
      if (existingFingerprints.has(transaction.fingerprint)) {
        duplicatesSkipped++;
        continue;
      }

      newTransactions.push(transaction);

      // Track totals
      if (txData.amount >= 0) {
        totalCredits += txData.amount;
      } else {
        totalDebits += Math.abs(txData.amount);
      }
    }

    // Batch save all new transactions (single batch operation)
    if (newTransactions.length > 0) {
      await this.bankTransactionRepo.saveMany(newTransactions);
    }

    const transactionsImported = newTransactions.length;

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
