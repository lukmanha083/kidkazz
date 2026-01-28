import {
  JournalEntry,
  type JournalEntryStatus,
  type JournalEntryType,
  type JournalLineInput,
} from '@/domain/entities';
import type { IAccountRepository, IJournalEntryRepository } from '@/domain/repositories';
import { FiscalPeriod } from '@/domain/value-objects';

/**
 * Create Journal Entry Command
 */
export interface CreateJournalEntryCommand {
  entryDate: Date;
  description: string;
  reference?: string;
  notes?: string;
  entryType?: JournalEntryType;
  lines: JournalLineInput[];
  createdBy: string;
  sourceService?: string;
  sourceReferenceId?: string;
}

/**
 * Create Journal Entry Result
 */
export interface CreateJournalEntryResult {
  id: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  reference?: string;
  notes?: string;
  entryType: JournalEntryType;
  status: JournalEntryStatus;
  sourceService?: string;
  sourceReferenceId?: string;
  totalDebits: number;
  totalCredits: number;
}

/**
 * Create Journal Entry Handler
 */
export class CreateJournalEntryHandler {
  constructor(
    private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly accountRepository: IAccountRepository
  ) {}

  async execute(command: CreateJournalEntryCommand): Promise<CreateJournalEntryResult> {
    // Validate all accounts exist and are detail accounts
    for (const line of command.lines) {
      const account = await this.accountRepository.findById(line.accountId);
      if (!account) {
        throw new Error(`Account not found: ${line.accountId}`);
      }
      if (!account.isDetailAccount) {
        throw new Error(`Cannot post to header account: ${account.code}`);
      }
    }

    // Generate entry number based on fiscal period
    const fiscalPeriod = FiscalPeriod.fromDate(command.entryDate);
    const entryNumber = await this.journalEntryRepository.generateEntryNumber(fiscalPeriod);

    // Create the journal entry
    const entry = JournalEntry.create({
      entryNumber,
      entryDate: command.entryDate,
      description: command.description,
      reference: command.reference,
      notes: command.notes,
      entryType: command.entryType,
      lines: command.lines,
      createdBy: command.createdBy,
      sourceService: command.sourceService,
      sourceReferenceId: command.sourceReferenceId,
    });

    await this.journalEntryRepository.save(entry);

    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate,
      description: entry.description,
      reference: entry.reference,
      notes: entry.notes,
      entryType: entry.entryType,
      status: entry.status,
      sourceService: entry.sourceService,
      sourceReferenceId: entry.sourceReferenceId,
      totalDebits: entry.totalDebits,
      totalCredits: entry.totalCredits,
    };
  }
}

/**
 * Update Journal Entry Command
 */
export interface UpdateJournalEntryCommand {
  id: string;
  description?: string;
  reference?: string;
  notes?: string;
  entryDate?: Date;
  lines?: JournalLineInput[];
}

/**
 * Update Journal Entry Result
 */
export interface UpdateJournalEntryResult {
  id: string;
  entryNumber: string;
  description: string;
  totalDebits: number;
  totalCredits: number;
}

/**
 * Update Journal Entry Handler
 */
export class UpdateJournalEntryHandler {
  constructor(
    private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly accountRepository: IAccountRepository
  ) {}

  async execute(command: UpdateJournalEntryCommand): Promise<UpdateJournalEntryResult> {
    const entry = await this.journalEntryRepository.findById(command.id);
    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (!entry.canEdit()) {
      throw new Error('Can only edit draft entries');
    }

    // Update basic fields if provided
    if (
      command.description !== undefined ||
      command.reference !== undefined ||
      command.notes !== undefined ||
      command.entryDate !== undefined
    ) {
      entry.update({
        description: command.description,
        reference: command.reference,
        notes: command.notes,
        entryDate: command.entryDate,
      });
    }

    // Update lines if provided
    if (command.lines) {
      // Validate all accounts
      for (const line of command.lines) {
        const account = await this.accountRepository.findById(line.accountId);
        if (!account) {
          throw new Error(`Account not found: ${line.accountId}`);
        }
        if (!account.isDetailAccount) {
          throw new Error(`Cannot post to header account: ${account.code}`);
        }
      }
      entry.updateLines(command.lines);
    }

    await this.journalEntryRepository.save(entry);

    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      description: entry.description,
      totalDebits: entry.totalDebits,
      totalCredits: entry.totalCredits,
    };
  }
}

/**
 * Delete Journal Entry Command
 */
export interface DeleteJournalEntryCommand {
  id: string;
}

/**
 * Delete Journal Entry Handler
 */
export class DeleteJournalEntryHandler {
  constructor(private readonly journalEntryRepository: IJournalEntryRepository) {}

  async execute(command: DeleteJournalEntryCommand): Promise<void> {
    const entry = await this.journalEntryRepository.findById(command.id);
    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (!entry.canDelete()) {
      throw new Error('Cannot delete posted entry');
    }

    await this.journalEntryRepository.delete(entry.id);
  }
}

/**
 * Post Journal Entry Command
 */
export interface PostJournalEntryCommand {
  id: string;
  postedBy: string;
}

/**
 * Post Journal Entry Result
 */
export interface PostJournalEntryResult {
  id: string;
  entryNumber: string;
  status: JournalEntryStatus;
  postedBy: string;
  postedAt: Date;
}

/**
 * Post Journal Entry Handler
 */
export class PostJournalEntryHandler {
  constructor(private readonly journalEntryRepository: IJournalEntryRepository) {}

  async execute(command: PostJournalEntryCommand): Promise<PostJournalEntryResult> {
    const entry = await this.journalEntryRepository.findById(command.id);
    if (!entry) {
      throw new Error('Journal entry not found');
    }

    // Post the entry (entity will validate and throw if can't post)
    entry.post(command.postedBy);

    await this.journalEntryRepository.save(entry);

    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      status: entry.status,
      postedBy: entry.postedBy!,
      postedAt: entry.postedAt!,
    };
  }
}

/**
 * Void Journal Entry Command
 */
export interface VoidJournalEntryCommand {
  id: string;
  voidedBy: string;
  reason: string;
}

/**
 * Void Journal Entry Result
 */
export interface VoidJournalEntryResult {
  id: string;
  entryNumber: string;
  status: JournalEntryStatus;
  voidedBy: string;
  voidReason: string;
}

/**
 * Void Journal Entry Handler
 */
export class VoidJournalEntryHandler {
  constructor(private readonly journalEntryRepository: IJournalEntryRepository) {}

  async execute(command: VoidJournalEntryCommand): Promise<VoidJournalEntryResult> {
    const entry = await this.journalEntryRepository.findById(command.id);
    if (!entry) {
      throw new Error('Journal entry not found');
    }

    // Void the entry (entity will validate and throw if can't void)
    entry.void(command.voidedBy, command.reason);

    await this.journalEntryRepository.save(entry);

    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      status: entry.status,
      voidedBy: entry.voidedBy!,
      voidReason: entry.voidReason!,
    };
  }
}
