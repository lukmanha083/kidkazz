import { BankReconciliation } from '@/domain/entities';
import {
  ReconciliationService,
  type JournalLineForMatching,
  type MatchOptions,
  type JournalEntryData,
  type GLAccountMapping,
} from '@/domain/services';
import {
  ReconciliationStatus,
  ReconciliationItemType,
  BankTransactionMatchStatus,
} from '@/domain/value-objects';
import type {
  IBankAccountRepository,
  IBankReconciliationRepository,
  IBankTransactionRepository,
} from '@/domain/repositories';

// ============================================================================
// Create Reconciliation Command
// ============================================================================

export interface CreateReconciliationCommand {
  bankAccountId: string;
  fiscalYear: number;
  fiscalMonth: number;
  statementEndingBalance: number;
  bookEndingBalance: number;
  notes?: string;
  createdBy: string;
}

export interface CreateReconciliationResult {
  id: string;
  bankAccountId: string;
  fiscalYear: number;
  fiscalMonth: number;
  status: ReconciliationStatus;
}

export class CreateReconciliationHandler {
  constructor(
    private readonly bankAccountRepo: IBankAccountRepository,
    private readonly reconciliationRepo: IBankReconciliationRepository
  ) {}

  async execute(command: CreateReconciliationCommand): Promise<CreateReconciliationResult> {
    // Verify bank account exists
    const bankAccount = await this.bankAccountRepo.findById(command.bankAccountId);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    // Check for existing reconciliation for this period
    const existing = await this.reconciliationRepo.findByAccountAndPeriod(
      command.bankAccountId,
      command.fiscalYear,
      command.fiscalMonth
    );
    if (existing) {
      throw new Error(
        `Reconciliation already exists for ${command.fiscalYear}-${command.fiscalMonth}`
      );
    }

    const reconciliation = BankReconciliation.create({
      bankAccountId: command.bankAccountId,
      fiscalYear: command.fiscalYear,
      fiscalMonth: command.fiscalMonth,
      statementEndingBalance: command.statementEndingBalance,
      bookEndingBalance: command.bookEndingBalance,
      notes: command.notes,
      createdBy: command.createdBy,
    });

    await this.reconciliationRepo.save(reconciliation);

    return {
      id: reconciliation.id,
      bankAccountId: reconciliation.bankAccountId,
      fiscalYear: reconciliation.fiscalYear,
      fiscalMonth: reconciliation.fiscalMonth,
      status: reconciliation.status,
    };
  }
}

// ============================================================================
// Start Reconciliation Command
// ============================================================================

export interface StartReconciliationCommand {
  reconciliationId: string;
}

export class StartReconciliationHandler {
  constructor(private readonly reconciliationRepo: IBankReconciliationRepository) {}

  async execute(command: StartReconciliationCommand): Promise<void> {
    const reconciliation = await this.reconciliationRepo.findById(command.reconciliationId);
    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    reconciliation.startReconciliation();
    await this.reconciliationRepo.save(reconciliation);
  }
}

// ============================================================================
// Match Transaction Command
// ============================================================================

export interface MatchTransactionCommand {
  reconciliationId: string;
  bankTransactionId: string;
  journalLineId: string;
  matchedBy: string;
}

export interface MatchTransactionResult {
  matched: boolean;
  bankTransactionId: string;
  journalLineId: string;
}

export class MatchTransactionHandler {
  constructor(
    private readonly reconciliationRepo: IBankReconciliationRepository,
    private readonly bankTransactionRepo: IBankTransactionRepository
  ) {}

  async execute(command: MatchTransactionCommand): Promise<MatchTransactionResult> {
    const reconciliation = await this.reconciliationRepo.findById(command.reconciliationId);
    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    if (reconciliation.status !== ReconciliationStatus.IN_PROGRESS) {
      throw new Error('Reconciliation must be in progress to match transactions');
    }

    const bankTransaction = await this.bankTransactionRepo.findById(command.bankTransactionId);
    if (!bankTransaction) {
      throw new Error('Bank transaction not found');
    }

    if (bankTransaction.matchStatus === BankTransactionMatchStatus.MATCHED) {
      throw new Error('Bank transaction is already matched');
    }

    // Mark transaction as matched
    bankTransaction.match(command.journalLineId, command.matchedBy);
    await this.bankTransactionRepo.save(bankTransaction);

    return {
      matched: true,
      bankTransactionId: command.bankTransactionId,
      journalLineId: command.journalLineId,
    };
  }
}

// ============================================================================
// Auto-Match Transactions Command
// ============================================================================

export interface AutoMatchTransactionsCommand {
  reconciliationId: string;
  journalLines: JournalLineForMatching[];
  matchedBy: string;
  options?: MatchOptions;
}

export interface AutoMatchTransactionsResult {
  totalMatched: number;
  matchDetails: Array<{
    bankTransactionId: string;
    journalLineId: string;
  }>;
}

export class AutoMatchTransactionsHandler {
  private readonly reconciliationService: ReconciliationService;

  constructor(
    private readonly reconciliationRepo: IBankReconciliationRepository,
    private readonly bankTransactionRepo: IBankTransactionRepository
  ) {
    this.reconciliationService = new ReconciliationService();
  }

  async execute(command: AutoMatchTransactionsCommand): Promise<AutoMatchTransactionsResult> {
    const reconciliation = await this.reconciliationRepo.findById(command.reconciliationId);
    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    if (reconciliation.status !== ReconciliationStatus.IN_PROGRESS) {
      throw new Error('Reconciliation must be in progress to match transactions');
    }

    // Get unmatched bank transactions
    const unmatchedTransactions = await this.bankTransactionRepo.findUnmatched(
      reconciliation.bankAccountId
    );

    // Run auto-matching
    const autoMatchResult = this.reconciliationService.autoMatchTransactions(
      unmatchedTransactions,
      command.journalLines,
      command.matchedBy,
      command.options
    );

    // Build map of transactions for quick lookup (avoid re-fetching from DB)
    const transactionMap = new Map(
      unmatchedTransactions.map(tx => [tx.id, tx])
    );

    // Save matched transactions using in-memory objects (already mutated by autoMatchTransactions)
    const matchDetails: Array<{
      bankTransactionId: string;
      journalLineId: string;
    }> = [];

    for (const match of autoMatchResult.matches) {
      const bankTransaction = transactionMap.get(match.transactionId);
      if (bankTransaction) {
        // Transaction was already matched in-memory by the service, save it
        await this.bankTransactionRepo.save(bankTransaction);
        matchDetails.push({
          bankTransactionId: match.transactionId,
          journalLineId: match.journalLineId,
        });
      }
    }

    return {
      totalMatched: matchDetails.length,
      matchDetails,
    };
  }
}

// ============================================================================
// Add Reconciling Item Command
// ============================================================================

export interface AddReconcilingItemCommand {
  reconciliationId: string;
  itemType: ReconciliationItemType;
  description: string;
  amount: number;
  transactionDate: Date;
  reference?: string;
  requiresJournalEntry?: boolean;
  createdBy: string;
}

export interface AddReconcilingItemResult {
  itemId: string;
  type: ReconciliationItemType;
  amount: number;
}

export class AddReconcilingItemHandler {
  constructor(private readonly reconciliationRepo: IBankReconciliationRepository) {}

  async execute(command: AddReconcilingItemCommand): Promise<AddReconcilingItemResult> {
    const reconciliation = await this.reconciliationRepo.findById(command.reconciliationId);
    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    if (reconciliation.status !== ReconciliationStatus.IN_PROGRESS) {
      throw new Error('Reconciliation must be in progress to add items');
    }

    const item = reconciliation.addReconcilingItem({
      itemType: command.itemType,
      description: command.description,
      amount: command.amount,
      transactionDate: command.transactionDate,
      reference: command.reference,
      requiresJournalEntry: command.requiresJournalEntry,
      createdBy: command.createdBy,
    });

    await this.reconciliationRepo.save(reconciliation);

    return {
      itemId: item.id,
      type: command.itemType,
      amount: command.amount,
    };
  }
}

// ============================================================================
// Calculate Adjusted Balances Command
// ============================================================================

export interface CalculateAdjustedBalancesCommand {
  reconciliationId: string;
}

export interface CalculateAdjustedBalancesResult {
  adjustedBankBalance: number;
  adjustedBookBalance: number;
  difference: number;
  isBalanced: boolean;
}

export class CalculateAdjustedBalancesHandler {
  constructor(private readonly reconciliationRepo: IBankReconciliationRepository) {}

  async execute(command: CalculateAdjustedBalancesCommand): Promise<CalculateAdjustedBalancesResult> {
    const reconciliation = await this.reconciliationRepo.findById(command.reconciliationId);
    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    reconciliation.calculateAdjustedBalances();
    await this.reconciliationRepo.save(reconciliation);

    return {
      adjustedBankBalance: reconciliation.adjustedBankBalance!,
      adjustedBookBalance: reconciliation.adjustedBookBalance!,
      difference: reconciliation.getBalanceDifference(),
      isBalanced: reconciliation.isBalanced(),
    };
  }
}

// ============================================================================
// Generate Adjusting Entries Command
// ============================================================================

export interface GenerateAdjustingEntriesCommand {
  reconciliationId: string;
  glMapping: GLAccountMapping;
}

export interface GenerateAdjustingEntriesResult {
  entriesGenerated: JournalEntryData[];
}

export class GenerateAdjustingEntriesHandler {
  private readonly reconciliationService: ReconciliationService;

  constructor(private readonly reconciliationRepo: IBankReconciliationRepository) {
    this.reconciliationService = new ReconciliationService();
  }

  async execute(command: GenerateAdjustingEntriesCommand): Promise<GenerateAdjustingEntriesResult> {
    const reconciliation = await this.reconciliationRepo.findById(command.reconciliationId);
    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    const entries = this.reconciliationService.generateAdjustingEntries(
      reconciliation,
      command.glMapping
    );

    return {
      entriesGenerated: entries,
    };
  }
}

// ============================================================================
// Complete Reconciliation Command
// ============================================================================

export interface CompleteReconciliationCommand {
  reconciliationId: string;
  completedBy: string;
}

export interface CompleteReconciliationResult {
  id: string;
  status: ReconciliationStatus;
  isBalanced: boolean;
  adjustedBankBalance: number;
  adjustedBookBalance: number;
  difference: number;
}

export class CompleteReconciliationHandler {
  constructor(private readonly reconciliationRepo: IBankReconciliationRepository) {}

  async execute(command: CompleteReconciliationCommand): Promise<CompleteReconciliationResult> {
    const reconciliation = await this.reconciliationRepo.findById(command.reconciliationId);
    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    // Calculate adjusted balances if not already done
    reconciliation.calculateAdjustedBalances();

    // Complete the reconciliation
    reconciliation.complete(command.completedBy);
    await this.reconciliationRepo.save(reconciliation);

    return {
      id: reconciliation.id,
      status: reconciliation.status,
      isBalanced: reconciliation.isBalanced(),
      adjustedBankBalance: reconciliation.adjustedBankBalance!,
      adjustedBookBalance: reconciliation.adjustedBookBalance!,
      difference: reconciliation.getBalanceDifference(),
    };
  }
}

// ============================================================================
// Approve Reconciliation Command
// ============================================================================

export interface ApproveReconciliationCommand {
  reconciliationId: string;
  approvedBy: string;
}

export interface ApproveReconciliationResult {
  id: string;
  status: ReconciliationStatus;
  approvedBy: string;
  approvedAt: Date;
}

export class ApproveReconciliationHandler {
  constructor(
    private readonly reconciliationRepo: IBankReconciliationRepository,
    private readonly bankAccountRepo: IBankAccountRepository
  ) {}

  async execute(command: ApproveReconciliationCommand): Promise<ApproveReconciliationResult> {
    const reconciliation = await this.reconciliationRepo.findById(command.reconciliationId);
    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    reconciliation.approve(command.approvedBy);
    await this.reconciliationRepo.save(reconciliation);

    // Update bank account last reconciled date and balance
    const bankAccount = await this.bankAccountRepo.findById(reconciliation.bankAccountId);
    if (bankAccount) {
      bankAccount.recordReconciliation(reconciliation.adjustedBankBalance!);
      await this.bankAccountRepo.save(bankAccount);
    }

    return {
      id: reconciliation.id,
      status: reconciliation.status,
      approvedBy: command.approvedBy,
      approvedAt: reconciliation.approvedAt!,
    };
  }
}
