import {
  JournalEntry,
  type JournalEntryStatus,
  type JournalEntryType,
  type JournalLine,
} from '@/domain/entities';
import type {
  IJournalEntryRepository,
  JournalEntryFilter,
  PaginatedResult,
  PaginationOptions,
} from '@/domain/repositories';
import { FiscalPeriod } from '@/domain/value-objects';
import {
  type JournalEntryRecord,
  type JournalLineRecord,
  journalEntries,
  journalLines,
} from '@/infrastructure/db/schema';
import { and, eq, gte, inArray, like, lte, sql } from 'drizzle-orm';

// Generic database type that works with both D1 and SQLite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IJournalEntryRepository
 */
export class DrizzleJournalEntryRepository implements IJournalEntryRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<JournalEntry | null> {
    const result = await this.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const lines = await this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, id))
      .orderBy(journalLines.lineSequence);

    return this.toDomain(result[0], lines);
  }

  async findByEntryNumber(entryNumber: string): Promise<JournalEntry | null> {
    const result = await this.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.entryNumber, entryNumber))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const lines = await this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, result[0].id))
      .orderBy(journalLines.lineSequence);

    return this.toDomain(result[0], lines);
  }

  async findAll(
    filter?: JournalEntryFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<JournalEntry>> {
    const conditions = [];

    if (filter?.status) {
      conditions.push(eq(journalEntries.status, filter.status));
    }

    if (filter?.entryType) {
      conditions.push(eq(journalEntries.entryType, filter.entryType));
    }

    if (filter?.fiscalPeriod) {
      conditions.push(eq(journalEntries.fiscalYear, filter.fiscalPeriod.year));
      conditions.push(eq(journalEntries.fiscalMonth, filter.fiscalPeriod.month));
    }

    if (filter?.fromDate) {
      conditions.push(gte(journalEntries.entryDate, filter.fromDate.toISOString().split('T')[0]));
    }

    if (filter?.toDate) {
      conditions.push(lte(journalEntries.entryDate, filter.toDate.toISOString().split('T')[0]));
    }

    if (filter?.createdBy) {
      conditions.push(eq(journalEntries.createdBy, filter.createdBy));
    }

    if (filter?.sourceService) {
      conditions.push(eq(journalEntries.sourceService, filter.sourceService));
    }

    if (filter?.sourceReferenceId) {
      conditions.push(eq(journalEntries.sourceReferenceId, filter.sourceReferenceId));
    }

    if (filter?.search) {
      conditions.push(like(journalEntries.description, `%${filter.search}%`));
    }

    // If filtering by accountId, we need a subquery
    if (filter?.accountId) {
      const entryIds = await this.db
        .select({ journalEntryId: journalLines.journalEntryId })
        .from(journalLines)
        .where(eq(journalLines.accountId, filter.accountId));

      if (entryIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: pagination?.page || 1,
          limit: pagination?.limit || 20,
          totalPages: 0,
        };
      }

      conditions.push(
        inArray(
          journalEntries.id,
          entryIds.map((e: { journalEntryId: string }) => e.journalEntryId)
        )
      );
    }

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(journalEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count || 0;

    // Pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get entries
    const sortOrder = pagination?.sortOrder === 'asc' ? 'asc' : 'desc';
    const query =
      conditions.length > 0
        ? this.db
            .select()
            .from(journalEntries)
            .where(and(...conditions))
            .orderBy(sql`${journalEntries.entryDate} ${sql.raw(sortOrder)}`)
            .limit(limit)
            .offset(offset)
        : this.db
            .select()
            .from(journalEntries)
            .orderBy(sql`${journalEntries.entryDate} ${sql.raw(sortOrder)}`)
            .limit(limit)
            .offset(offset);

    const entries = await query;

    // Get lines for all entries
    const entriesWithLines = await Promise.all(
      entries.map(async (entry: JournalEntryRecord) => {
        const lines = await this.db
          .select()
          .from(journalLines)
          .where(eq(journalLines.journalEntryId, entry.id))
          .orderBy(journalLines.lineSequence);
        return this.toDomain(entry, lines);
      })
    );

    return {
      data: entriesWithLines,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findByAccountId(accountId: string, filter?: JournalEntryFilter): Promise<JournalEntry[]> {
    // Find all entry IDs that have this account
    const entryIds = await this.db
      .select({ journalEntryId: journalLines.journalEntryId })
      .from(journalLines)
      .where(eq(journalLines.accountId, accountId));

    if (entryIds.length === 0) {
      return [];
    }

    const conditions = [
      inArray(
        journalEntries.id,
        entryIds.map((e: { journalEntryId: string }) => e.journalEntryId)
      ),
    ];

    if (filter?.status) {
      conditions.push(eq(journalEntries.status, filter.status));
    }

    if (filter?.fiscalPeriod) {
      conditions.push(eq(journalEntries.fiscalYear, filter.fiscalPeriod.year));
      conditions.push(eq(journalEntries.fiscalMonth, filter.fiscalPeriod.month));
    }

    const entries = await this.db
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(journalEntries.entryDate);

    return Promise.all(
      entries.map(async (entry: JournalEntryRecord) => {
        const lines = await this.db
          .select()
          .from(journalLines)
          .where(eq(journalLines.journalEntryId, entry.id))
          .orderBy(journalLines.lineSequence);
        return this.toDomain(entry, lines);
      })
    );
  }

  async findBySourceReference(
    sourceService: string,
    sourceReferenceId: string
  ): Promise<JournalEntry | null> {
    const result = await this.db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceService, sourceService),
          eq(journalEntries.sourceReferenceId, sourceReferenceId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const lines = await this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, result[0].id))
      .orderBy(journalLines.lineSequence);

    return this.toDomain(result[0], lines);
  }

  /**
   * Save journal entry with atomic transaction
   * Uses db.batch() for D1 (atomic), falls back to sequential for better-sqlite3 (tests)
   * All operations (header + lines) succeed or fail together (ACID)
   */
  async save(entry: JournalEntry): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(eq(journalEntries.id, entry.id))
      .limit(1);

    // Build all operations for atomic batch execution
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchOperations: any[] = [];

    if (existing.length > 0) {
      // Update: delete old lines first, then update header
      batchOperations.push(
        this.db.delete(journalLines).where(eq(journalLines.journalEntryId, entry.id))
      );

      batchOperations.push(
        this.db
          .update(journalEntries)
          .set({
            entryNumber: entry.entryNumber,
            entryDate: entry.entryDate.toISOString().split('T')[0],
            description: entry.description,
            reference: entry.reference || null,
            notes: entry.notes || null,
            entryType: entry.entryType,
            status: entry.status,
            fiscalYear: entry.fiscalPeriod.year,
            fiscalMonth: entry.fiscalPeriod.month,
            sourceService: entry.sourceService || null,
            sourceReferenceId: entry.sourceReferenceId || null,
            postedBy: entry.postedBy || null,
            postedAt: entry.postedAt?.toISOString() || null,
            voidedBy: entry.voidedBy || null,
            voidedAt: entry.voidedAt?.toISOString() || null,
            voidReason: entry.voidReason || null,
            updatedAt: now,
          })
          .where(eq(journalEntries.id, entry.id))
      );
    } else {
      // Insert new entry header
      batchOperations.push(
        this.db.insert(journalEntries).values({
          id: entry.id,
          entryNumber: entry.entryNumber,
          entryDate: entry.entryDate.toISOString().split('T')[0],
          description: entry.description,
          reference: entry.reference || null,
          notes: entry.notes || null,
          entryType: entry.entryType,
          status: entry.status,
          fiscalYear: entry.fiscalPeriod.year,
          fiscalMonth: entry.fiscalPeriod.month,
          sourceService: entry.sourceService || null,
          sourceReferenceId: entry.sourceReferenceId || null,
          createdBy: entry.createdBy,
          createdAt: now,
          postedBy: entry.postedBy || null,
          postedAt: entry.postedAt?.toISOString() || null,
          voidedBy: entry.voidedBy || null,
          voidedAt: entry.voidedAt?.toISOString() || null,
          voidReason: entry.voidReason || null,
          updatedAt: now,
        })
      );
    }

    // Add all line inserts to batch
    for (const line of entry.lines) {
      batchOperations.push(
        this.db.insert(journalLines).values({
          id: line.id,
          journalEntryId: entry.id,
          lineSequence: line.lineSequence,
          accountId: line.accountId,
          direction: line.direction,
          amount: line.amount,
          memo: line.memo || null,
          salesPersonId: line.salesPersonId || null,
          warehouseId: line.warehouseId || null,
          salesChannel: line.salesChannel || null,
          customerId: line.customerId || null,
          vendorId: line.vendorId || null,
          productId: line.productId || null,
          storeId: line.storeId || null,
          businessUnit: line.businessUnit || null,
        })
      );
    }

    // Execute atomically:
    // - D1: uses db.batch() for atomic execution (all or nothing)
    // - better-sqlite3 (tests): sequential execution (single-threaded, safe)
    if (typeof this.db.batch === 'function') {
      // D1 runtime: atomic batch
      await this.db.batch(batchOperations);
    } else {
      // Test environment (better-sqlite3): execute sequentially
      // Note: better-sqlite3 is single-threaded, so this is safe for tests
      for (const op of batchOperations) {
        await op;
      }
    }
  }

  async delete(id: string): Promise<void> {
    // Lines will be deleted automatically due to ON DELETE CASCADE
    await this.db.delete(journalEntries).where(eq(journalEntries.id, id));
  }

  async generateEntryNumber(fiscalPeriod: FiscalPeriod): Promise<string> {
    const prefix = `JE-${fiscalPeriod.year}${fiscalPeriod.month.toString().padStart(2, '0')}-`;

    // Find the highest sequence number for this period
    const result = await this.db
      .select({ entryNumber: journalEntries.entryNumber })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.fiscalYear, fiscalPeriod.year),
          eq(journalEntries.fiscalMonth, fiscalPeriod.month)
        )
      )
      .orderBy(sql`${journalEntries.entryNumber} desc`)
      .limit(1);

    let sequence = 1;

    if (result.length > 0) {
      const lastNumber = result[0].entryNumber;
      const lastSequence = Number.parseInt(lastNumber.split('-').pop() || '0', 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  async findByFiscalPeriod(
    period: FiscalPeriod,
    status?: JournalEntryStatus
  ): Promise<JournalEntry[]> {
    const conditions = [
      eq(journalEntries.fiscalYear, period.year),
      eq(journalEntries.fiscalMonth, period.month),
    ];

    if (status) {
      conditions.push(eq(journalEntries.status, status));
    }

    const entries = await this.db
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(journalEntries.entryDate);

    return Promise.all(
      entries.map(async (entry: JournalEntryRecord) => {
        const lines = await this.db
          .select()
          .from(journalLines)
          .where(eq(journalLines.journalEntryId, entry.id))
          .orderBy(journalLines.lineSequence);
        return this.toDomain(entry, lines);
      })
    );
  }

  /**
   * Convert database records to domain entity
   */
  private toDomain(
    entry: typeof journalEntries.$inferSelect,
    lines: (typeof journalLines.$inferSelect)[]
  ): JournalEntry {
    return JournalEntry.fromPersistence({
      id: entry.id,
      entryNumber: entry.entryNumber,
      entryDate: new Date(entry.entryDate),
      description: entry.description,
      reference: entry.reference || undefined,
      notes: entry.notes || undefined,
      entryType: entry.entryType as JournalEntryType,
      status: entry.status as JournalEntryStatus,
      fiscalPeriod: FiscalPeriod.create(entry.fiscalYear, entry.fiscalMonth),
      sourceService: entry.sourceService || undefined,
      sourceReferenceId: entry.sourceReferenceId || undefined,
      createdBy: entry.createdBy,
      createdAt: new Date(entry.createdAt),
      postedBy: entry.postedBy || undefined,
      postedAt: entry.postedAt ? new Date(entry.postedAt) : undefined,
      voidedBy: entry.voidedBy || undefined,
      voidedAt: entry.voidedAt ? new Date(entry.voidedAt) : undefined,
      voidReason: entry.voidReason || undefined,
      updatedAt: new Date(entry.updatedAt),
      lines: lines.map((line) => ({
        id: line.id,
        lineSequence: line.lineSequence,
        accountId: line.accountId,
        direction: line.direction as 'Debit' | 'Credit',
        amount: line.amount,
        memo: line.memo || undefined,
        salesPersonId: line.salesPersonId || undefined,
        warehouseId: line.warehouseId || undefined,
        salesChannel: line.salesChannel as JournalLine['salesChannel'],
        customerId: line.customerId || undefined,
        vendorId: line.vendorId || undefined,
        productId: line.productId || undefined,
        storeId: line.storeId || undefined,
        businessUnit: line.businessUnit as JournalLine['businessUnit'],
      })),
    });
  }
}
