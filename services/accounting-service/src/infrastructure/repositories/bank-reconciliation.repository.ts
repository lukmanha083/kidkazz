import { eq, and, sql, ne } from 'drizzle-orm';
import { BankReconciliation, type ReconcilingItem } from '@/domain/entities/bank-reconciliation.entity';
import { ReconciliationStatus, ReconciliationItemType, ReconciliationItemStatus } from '@/domain/value-objects';
import type { IBankReconciliationRepository, BankReconciliationFilter } from '@/domain/repositories/bank-reconciliation.repository';
import type { PaginationOptions, PaginatedResult } from '@/domain/repositories';
import {
  bankReconciliations,
  reconciliationItems,
  type BankReconciliationRecord,
  type ReconciliationItemRecord,
} from '@/infrastructure/db/schema';

// Generic database type that works with both D1 and SQLite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IBankReconciliationRepository
 */
export class DrizzleBankReconciliationRepository implements IBankReconciliationRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<BankReconciliation | null> {
    const result = await this.db
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    // Load reconciling items
    const items = await this.db
      .select()
      .from(reconciliationItems)
      .where(eq(reconciliationItems.reconciliationId, id));

    return this.toDomain(result[0], items);
  }

  async findByAccountAndPeriod(
    bankAccountId: string,
    fiscalYear: number,
    fiscalMonth: number
  ): Promise<BankReconciliation | null> {
    const result = await this.db
      .select()
      .from(bankReconciliations)
      .where(
        and(
          eq(bankReconciliations.bankAccountId, bankAccountId),
          eq(bankReconciliations.fiscalYear, fiscalYear),
          eq(bankReconciliations.fiscalMonth, fiscalMonth)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const items = await this.db
      .select()
      .from(reconciliationItems)
      .where(eq(reconciliationItems.reconciliationId, result[0].id));

    return this.toDomain(result[0], items);
  }

  async findByBankAccountId(bankAccountId: string): Promise<BankReconciliation[]> {
    const results = await this.db
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.bankAccountId, bankAccountId))
      .orderBy(bankReconciliations.fiscalYear, bankReconciliations.fiscalMonth);

    return Promise.all(
      results.map(async (row: BankReconciliationRecord) => {
        const items = await this.db
          .select()
          .from(reconciliationItems)
          .where(eq(reconciliationItems.reconciliationId, row.id));
        return this.toDomain(row, items);
      })
    );
  }

  async findByPeriod(fiscalYear: number, fiscalMonth: number): Promise<BankReconciliation[]> {
    const results = await this.db
      .select()
      .from(bankReconciliations)
      .where(
        and(
          eq(bankReconciliations.fiscalYear, fiscalYear),
          eq(bankReconciliations.fiscalMonth, fiscalMonth)
        )
      );

    return Promise.all(
      results.map(async (row: BankReconciliationRecord) => {
        const items = await this.db
          .select()
          .from(reconciliationItems)
          .where(eq(reconciliationItems.reconciliationId, row.id));
        return this.toDomain(row, items);
      })
    );
  }

  async findAll(
    filter?: BankReconciliationFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<BankReconciliation>> {
    const conditions = [];

    if (filter?.bankAccountId) {
      conditions.push(eq(bankReconciliations.bankAccountId, filter.bankAccountId));
    }

    if (filter?.fiscalYear) {
      conditions.push(eq(bankReconciliations.fiscalYear, filter.fiscalYear));
    }

    if (filter?.fiscalMonth) {
      conditions.push(eq(bankReconciliations.fiscalMonth, filter.fiscalMonth));
    }

    if (filter?.status) {
      conditions.push(eq(bankReconciliations.status, filter.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(bankReconciliations)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Apply pagination
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const results = await this.db
      .select()
      .from(bankReconciliations)
      .where(whereClause)
      .orderBy(bankReconciliations.fiscalYear, bankReconciliations.fiscalMonth)
      .limit(limit)
      .offset(offset);

    const data = await Promise.all(
      results.map(async (row: BankReconciliationRecord) => {
        const items = await this.db
          .select()
          .from(reconciliationItems)
          .where(eq(reconciliationItems.reconciliationId, row.id));
        return this.toDomain(row, items);
      })
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findIncomplete(): Promise<BankReconciliation[]> {
    const results = await this.db
      .select()
      .from(bankReconciliations)
      .where(ne(bankReconciliations.status, ReconciliationStatus.APPROVED));

    return Promise.all(
      results.map(async (row: BankReconciliationRecord) => {
        const items = await this.db
          .select()
          .from(reconciliationItems)
          .where(eq(reconciliationItems.reconciliationId, row.id));
        return this.toDomain(row, items);
      })
    );
  }

  async save(reconciliation: BankReconciliation): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: bankReconciliations.id })
      .from(bankReconciliations)
      .where(eq(bankReconciliations.id, reconciliation.id))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await this.db
        .update(bankReconciliations)
        .set({
          statementEndingBalance: reconciliation.statementEndingBalance,
          bookEndingBalance: reconciliation.bookEndingBalance,
          adjustedBankBalance: reconciliation.adjustedBankBalance ?? null,
          adjustedBookBalance: reconciliation.adjustedBookBalance ?? null,
          totalTransactions: reconciliation.totalTransactions,
          matchedTransactions: reconciliation.matchedTransactions,
          unmatchedTransactions: reconciliation.unmatchedTransactions,
          status: reconciliation.status,
          completedAt: reconciliation.completedAt?.toISOString() || null,
          completedBy: reconciliation.completedBy || null,
          approvedAt: reconciliation.approvedAt?.toISOString() || null,
          approvedBy: reconciliation.approvedBy || null,
          notes: reconciliation.notes || null,
          updatedAt: now,
          updatedBy: reconciliation.updatedBy || null,
        })
        .where(eq(bankReconciliations.id, reconciliation.id));
    } else {
      // Insert
      await this.db.insert(bankReconciliations).values({
        id: reconciliation.id,
        bankAccountId: reconciliation.bankAccountId,
        fiscalYear: reconciliation.fiscalYear,
        fiscalMonth: reconciliation.fiscalMonth,
        statementEndingBalance: reconciliation.statementEndingBalance,
        bookEndingBalance: reconciliation.bookEndingBalance,
        adjustedBankBalance: reconciliation.adjustedBankBalance ?? null,
        adjustedBookBalance: reconciliation.adjustedBookBalance ?? null,
        totalTransactions: reconciliation.totalTransactions,
        matchedTransactions: reconciliation.matchedTransactions,
        unmatchedTransactions: reconciliation.unmatchedTransactions,
        status: reconciliation.status,
        completedAt: reconciliation.completedAt?.toISOString() || null,
        completedBy: reconciliation.completedBy || null,
        approvedAt: reconciliation.approvedAt?.toISOString() || null,
        approvedBy: reconciliation.approvedBy || null,
        notes: reconciliation.notes || null,
        createdAt: now,
        updatedAt: now,
        createdBy: reconciliation.createdBy,
        updatedBy: reconciliation.updatedBy || null,
      });
    }

    // Save all reconciling items
    for (const item of reconciliation.reconcilingItems) {
      await this.saveItem(item);
    }
  }

  async saveItem(item: ReconcilingItem): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: reconciliationItems.id })
      .from(reconciliationItems)
      .where(eq(reconciliationItems.id, item.id))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await this.db
        .update(reconciliationItems)
        .set({
          description: item.description,
          amount: item.amount,
          transactionDate: item.transactionDate.toISOString(),
          reference: item.reference || null,
          requiresJournalEntry: item.requiresJournalEntry,
          journalEntryId: item.journalEntryId || null,
          status: item.status,
          clearedAt: item.clearedAt?.toISOString() || null,
          clearedInReconciliationId: item.clearedInReconciliationId || null,
          updatedAt: now,
        })
        .where(eq(reconciliationItems.id, item.id));
    } else {
      // Insert
      await this.db.insert(reconciliationItems).values({
        id: item.id,
        reconciliationId: item.reconciliationId,
        itemType: item.itemType,
        description: item.description,
        amount: item.amount,
        transactionDate: item.transactionDate.toISOString(),
        reference: item.reference || null,
        requiresJournalEntry: item.requiresJournalEntry,
        journalEntryId: item.journalEntryId || null,
        status: item.status,
        clearedAt: item.clearedAt?.toISOString() || null,
        clearedInReconciliationId: item.clearedInReconciliationId || null,
        createdAt: now,
        createdBy: item.createdBy || null,
        updatedAt: now,
      });
    }
  }

  async delete(id: string): Promise<void> {
    // Items are deleted by cascade
    await this.db.delete(bankReconciliations).where(eq(bankReconciliations.id, id));
  }

  /**
   * Convert database record to domain entity
   */
  private toDomain(
    row: BankReconciliationRecord,
    itemRows: ReconciliationItemRecord[]
  ): BankReconciliation {
    const items: ReconcilingItem[] = itemRows.map((item) => ({
      id: item.id,
      reconciliationId: item.reconciliationId,
      itemType: item.itemType as ReconciliationItemType,
      description: item.description,
      amount: item.amount,
      transactionDate: new Date(item.transactionDate),
      reference: item.reference ?? undefined,
      requiresJournalEntry: item.requiresJournalEntry,
      journalEntryId: item.journalEntryId ?? undefined,
      status: item.status as ReconciliationItemStatus,
      clearedAt: item.clearedAt ? new Date(item.clearedAt) : undefined,
      clearedInReconciliationId: item.clearedInReconciliationId ?? undefined,
      createdAt: new Date(item.createdAt),
      createdBy: item.createdBy ?? undefined,
      updatedAt: new Date(item.updatedAt),
    }));

    return BankReconciliation.fromPersistence({
      id: row.id,
      bankAccountId: row.bankAccountId,
      fiscalYear: row.fiscalYear,
      fiscalMonth: row.fiscalMonth,
      statementEndingBalance: row.statementEndingBalance,
      bookEndingBalance: row.bookEndingBalance,
      adjustedBankBalance: row.adjustedBankBalance ?? undefined,
      adjustedBookBalance: row.adjustedBookBalance ?? undefined,
      totalTransactions: row.totalTransactions,
      matchedTransactions: row.matchedTransactions,
      unmatchedTransactions: row.unmatchedTransactions,
      status: row.status as ReconciliationStatus,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      completedBy: row.completedBy ?? undefined,
      approvedAt: row.approvedAt ? new Date(row.approvedAt) : undefined,
      approvedBy: row.approvedBy ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      createdBy: row.createdBy ?? '',
      updatedBy: row.updatedBy ?? undefined,
      reconcilingItems: items,
    });
  }
}
