import { JournalEntry, JournalEntryType } from '@/domain/entities';
import { FiscalPeriod, DisposalMethod, MovementType, AssetStatus } from '@/domain/value-objects';
import type {
  IFixedAssetRepository,
  IAssetCategoryRepository,
  IJournalEntryRepository,
  IAssetMovementRepository,
} from '@/domain/repositories';
import { createAssetMovement } from '@/infrastructure/repositories';

// ============================================================================
// Dispose Asset with Journal Entry Command
// ============================================================================

export interface DisposeAssetWithJournalCommand {
  assetId: string;
  method: DisposalMethod;
  value: number;
  reason: string;
  disposedBy: string;
  createJournalEntry?: boolean;
}

export interface DisposeAssetWithJournalResult {
  assetId: string;
  assetNumber: string;
  status: AssetStatus;
  bookValueAtDisposal: number;
  disposalValue: number;
  gainLoss: number;
  isGain: boolean;
  journalEntryId?: string;
  journalEntryNumber?: string;
  movementId: string;
}

/**
 * Dispose Asset with Journal Entry Handler
 * Creates journal entries:
 * - Dr. Cash/Receivable (disposal value)
 * - Dr. Accumulated Depreciation (total accumulated)
 * - Cr. Fixed Asset (acquisition cost)
 * - Dr/Cr. Gain/Loss on Disposal (difference)
 */
export class DisposeAssetWithJournalHandler {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly categoryRepo: IAssetCategoryRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly movementRepo: IAssetMovementRepository
  ) {}

  async execute(command: DisposeAssetWithJournalCommand): Promise<DisposeAssetWithJournalResult> {
    // Get asset
    const asset = await this.assetRepo.findById(command.assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    if (asset.status === AssetStatus.DISPOSED || asset.status === AssetStatus.WRITTEN_OFF) {
      throw new Error('Asset is already disposed');
    }

    // Get category for account IDs
    const category = await this.categoryRepo.findById(asset.categoryId);
    if (!category) {
      throw new Error('Asset category not found');
    }

    // Calculate disposal amounts
    const bookValueAtDisposal = asset.bookValue;
    const accumulatedDepreciation = asset.accumulatedDepreciation;
    const acquisitionCost = asset.acquisitionCost;
    const disposalValue = command.value;
    const gainLoss = disposalValue - bookValueAtDisposal;

    // Dispose the asset
    const disposalResult = asset.dispose({
      method: command.method,
      value: command.value,
      reason: command.reason,
      disposedBy: command.disposedBy,
    });

    await this.assetRepo.save(asset);

    // Record the disposal movement
    const movement = createAssetMovement({
      assetId: command.assetId,
      movementType: MovementType.DISPOSAL,
      fromLocationId: asset.locationId,
      fromDepartmentId: asset.departmentId,
      fromUserId: asset.assignedToUserId,
      reason: command.reason,
      notes: `Disposed via ${command.method}: ${command.reason}`,
      performedBy: command.disposedBy,
    });

    await this.movementRepo.save(movement);

    let journalEntryId: string | undefined;
    let journalEntryNumber: string | undefined;

    // Create journal entry if requested
    if (command.createJournalEntry !== false) {
      const now = new Date();
      const fiscalPeriod = FiscalPeriod.create(now.getFullYear(), now.getMonth() + 1);

      // Generate entry number
      const entryNumber = await this.journalEntryRepo.generateEntryNumber(fiscalPeriod);

      // Build journal lines
      const lines: Array<{
        accountId: string;
        direction: 'Debit' | 'Credit';
        amount: number;
        memo?: string;
      }> = [];

      // Debit: Accumulated Depreciation (remove from balance sheet)
      if (accumulatedDepreciation > 0) {
        lines.push({
          accountId: category.accumulatedDepreciationAccountId,
          direction: 'Debit',
          amount: accumulatedDepreciation,
          memo: `Remove accumulated depreciation for ${asset.assetNumber}`,
        });
      }

      // Credit: Fixed Asset Account (remove asset from books)
      lines.push({
        accountId: category.assetAccountId,
        direction: 'Credit',
        amount: acquisitionCost,
        memo: `Remove asset ${asset.assetNumber} from books`,
      });

      // Handle disposal proceeds and gain/loss
      if (disposalValue > 0) {
        // For simplicity, we use the gain/loss account for disposal proceeds
        // In practice, you might have a separate receivable or cash account
        lines.push({
          accountId: category.gainLossOnDisposalAccountId,
          direction: 'Debit',
          amount: disposalValue,
          memo: `Disposal proceeds for ${asset.assetNumber}`,
        });
      }

      // Record gain or loss
      if (gainLoss > 0) {
        // Gain on disposal (credit)
        lines.push({
          accountId: category.gainLossOnDisposalAccountId,
          direction: 'Credit',
          amount: gainLoss,
          memo: `Gain on disposal of ${asset.assetNumber}`,
        });
      } else if (gainLoss < 0) {
        // Loss on disposal (debit)
        lines.push({
          accountId: category.gainLossOnDisposalAccountId,
          direction: 'Debit',
          amount: Math.abs(gainLoss),
          memo: `Loss on disposal of ${asset.assetNumber}`,
        });
      }

      // Create journal entry
      const journalEntry = JournalEntry.create({
        entryNumber,
        entryDate: now,
        description: `Asset disposal: ${asset.assetNumber} - ${asset.name} (${command.method})`,
        reference: `DISPOSAL-${asset.assetNumber}`,
        notes: command.reason,
        entryType: JournalEntryType.SYSTEM,
        lines,
        createdBy: command.disposedBy,
        sourceService: 'accounting-service',
        sourceReferenceId: command.assetId,
      });

      // Post the entry immediately
      journalEntry.post(command.disposedBy);

      await this.journalEntryRepo.save(journalEntry);

      journalEntryId = journalEntry.id;
      journalEntryNumber = journalEntry.entryNumber;
    }

    return {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      status: asset.status,
      bookValueAtDisposal: disposalResult.bookValueAtDisposal,
      disposalValue: disposalResult.disposalValue,
      gainLoss: disposalResult.gainLoss,
      isGain: disposalResult.isGain,
      journalEntryId,
      journalEntryNumber,
      movementId: movement.id,
    };
  }
}

// ============================================================================
// Write Off Asset Command
// ============================================================================

export interface WriteOffAssetCommand {
  assetId: string;
  reason: string;
  writtenOffBy: string;
}

export interface WriteOffAssetResult {
  assetId: string;
  assetNumber: string;
  bookValueWrittenOff: number;
  journalEntryId: string;
  journalEntryNumber: string;
  movementId: string;
}

/**
 * Write Off Asset Handler
 * Writes off asset at zero value (total loss)
 */
export class WriteOffAssetHandler {
  constructor(
    private readonly assetRepo: IFixedAssetRepository,
    private readonly categoryRepo: IAssetCategoryRepository,
    private readonly journalEntryRepo: IJournalEntryRepository,
    private readonly movementRepo: IAssetMovementRepository
  ) {}

  async execute(command: WriteOffAssetCommand): Promise<WriteOffAssetResult> {
    const disposeHandler = new DisposeAssetWithJournalHandler(
      this.assetRepo,
      this.categoryRepo,
      this.journalEntryRepo,
      this.movementRepo
    );

    const result = await disposeHandler.execute({
      assetId: command.assetId,
      method: DisposalMethod.DESTRUCTION,
      value: 0,
      reason: command.reason,
      disposedBy: command.writtenOffBy,
      createJournalEntry: true,
    });

    return {
      assetId: result.assetId,
      assetNumber: result.assetNumber,
      bookValueWrittenOff: result.bookValueAtDisposal,
      journalEntryId: result.journalEntryId!,
      journalEntryNumber: result.journalEntryNumber!,
      movementId: result.movementId,
    };
  }
}
