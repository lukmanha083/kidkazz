import { eq, and, gte, lte, like, or, sql } from 'drizzle-orm';
import { BankTransaction } from '@/domain/entities/bank-transaction.entity';
import { BankTransactionType, BankTransactionMatchStatus } from '@/domain/value-objects';
import type { IBankTransactionRepository, BankTransactionFilter } from '@/domain/repositories/bank-transaction.repository';
import type { PaginationOptions, PaginatedResult } from '@/domain/repositories';
import { bankTransactions, type BankTransactionRecord } from '@/infrastructure/db/schema';

// Generic database type that works with both D1 and SQLite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IBankTransactionRepository
 */
export class DrizzleBankTransactionRepository implements IBankTransactionRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<BankTransaction | null> {
    const result = await this.db
      .select()
      .from(bankTransactions)
      .where(eq(bankTransactions.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByFingerprint(fingerprint: string): Promise<BankTransaction | null> {
    const result = await this.db
      .select()
      .from(bankTransactions)
      .where(eq(bankTransactions.fingerprint, fingerprint))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByStatementId(statementId: string): Promise<BankTransaction[]> {
    const results = await this.db
      .select()
      .from(bankTransactions)
      .where(eq(bankTransactions.bankStatementId, statementId))
      .orderBy(bankTransactions.transactionDate);

    return results.map((row: BankTransactionRecord) => this.toDomain(row));
  }

  async findByBankAccountId(bankAccountId: string): Promise<BankTransaction[]> {
    const results = await this.db
      .select()
      .from(bankTransactions)
      .where(eq(bankTransactions.bankAccountId, bankAccountId))
      .orderBy(bankTransactions.transactionDate);

    return results.map((row: BankTransactionRecord) => this.toDomain(row));
  }

  async findUnmatched(bankAccountId: string): Promise<BankTransaction[]> {
    const results = await this.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.bankAccountId, bankAccountId),
          eq(bankTransactions.matchStatus, BankTransactionMatchStatus.UNMATCHED)
        )
      )
      .orderBy(bankTransactions.transactionDate);

    return results.map((row: BankTransactionRecord) => this.toDomain(row));
  }

  async findAll(filter?: BankTransactionFilter, pagination?: PaginationOptions): Promise<PaginatedResult<BankTransaction>> {
    const conditions = [];

    if (filter?.bankStatementId) {
      conditions.push(eq(bankTransactions.bankStatementId, filter.bankStatementId));
    }

    if (filter?.bankAccountId) {
      conditions.push(eq(bankTransactions.bankAccountId, filter.bankAccountId));
    }

    if (filter?.matchStatus) {
      conditions.push(eq(bankTransactions.matchStatus, filter.matchStatus));
    }

    if (filter?.transactionDateFrom) {
      conditions.push(gte(bankTransactions.transactionDate, filter.transactionDateFrom.toISOString()));
    }

    if (filter?.transactionDateTo) {
      conditions.push(lte(bankTransactions.transactionDate, filter.transactionDateTo.toISOString()));
    }

    if (filter?.amountMin !== undefined) {
      conditions.push(gte(bankTransactions.amount, filter.amountMin));
    }

    if (filter?.amountMax !== undefined) {
      conditions.push(lte(bankTransactions.amount, filter.amountMax));
    }

    if (filter?.search) {
      const escapedSearch = filter.search.replace(/[%_]/g, '\\$&');
      conditions.push(
        or(
          like(bankTransactions.description, `%${escapedSearch}%`),
          like(bankTransactions.reference, `%${escapedSearch}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(bankTransactions)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Apply pagination
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const results = await this.db
      .select()
      .from(bankTransactions)
      .where(whereClause)
      .orderBy(bankTransactions.transactionDate)
      .limit(limit)
      .offset(offset);

    return {
      data: results.map((row: BankTransactionRecord) => this.toDomain(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async fingerprintExists(fingerprint: string): Promise<boolean> {
    const result = await this.db
      .select({ id: bankTransactions.id })
      .from(bankTransactions)
      .where(eq(bankTransactions.fingerprint, fingerprint))
      .limit(1);

    return result.length > 0;
  }

  async save(transaction: BankTransaction): Promise<void> {
    const existing = await this.db
      .select({ id: bankTransactions.id })
      .from(bankTransactions)
      .where(eq(bankTransactions.id, transaction.id))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await this.db
        .update(bankTransactions)
        .set({
          matchStatus: transaction.matchStatus,
          matchedJournalLineId: transaction.matchedJournalLineId || null,
          matchedAt: transaction.matchedAt?.toISOString() || null,
          matchedBy: transaction.matchedBy || null,
        })
        .where(eq(bankTransactions.id, transaction.id));
    } else {
      // Insert
      await this.db.insert(bankTransactions).values({
        id: transaction.id,
        bankStatementId: transaction.bankStatementId,
        bankAccountId: transaction.bankAccountId,
        transactionDate: transaction.transactionDate.toISOString(),
        postDate: transaction.postDate?.toISOString() || null,
        description: transaction.description,
        reference: transaction.reference || null,
        amount: transaction.amount,
        transactionType: transaction.transactionType,
        runningBalance: transaction.runningBalance ?? null,
        fingerprint: transaction.fingerprint,
        matchStatus: transaction.matchStatus,
        matchedJournalLineId: transaction.matchedJournalLineId || null,
        matchedAt: transaction.matchedAt?.toISOString() || null,
        matchedBy: transaction.matchedBy || null,
        createdAt: transaction.createdAt.toISOString(),
      });
    }
  }

  async saveMany(transactions: BankTransaction[]): Promise<void> {
    if (transactions.length === 0) {
      return;
    }

    const values = transactions.map((tx) => ({
      id: tx.id,
      bankStatementId: tx.bankStatementId,
      bankAccountId: tx.bankAccountId,
      transactionDate: tx.transactionDate.toISOString(),
      postDate: tx.postDate?.toISOString() || null,
      description: tx.description,
      reference: tx.reference || null,
      amount: tx.amount,
      transactionType: tx.transactionType,
      runningBalance: tx.runningBalance ?? null,
      fingerprint: tx.fingerprint,
      matchStatus: tx.matchStatus,
      matchedJournalLineId: tx.matchedJournalLineId || null,
      matchedAt: tx.matchedAt?.toISOString() || null,
      matchedBy: tx.matchedBy || null,
      createdAt: tx.createdAt.toISOString(),
    }));

    await this.db.insert(bankTransactions).values(values);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(bankTransactions).where(eq(bankTransactions.id, id));
  }

  /**
   * Convert database record to domain entity
   */
  private toDomain(row: BankTransactionRecord): BankTransaction {
    return BankTransaction.fromPersistence({
      id: row.id,
      bankStatementId: row.bankStatementId,
      bankAccountId: row.bankAccountId,
      transactionDate: new Date(row.transactionDate),
      postDate: row.postDate ? new Date(row.postDate) : undefined,
      description: row.description,
      reference: row.reference ?? undefined,
      amount: row.amount,
      transactionType: row.transactionType as BankTransactionType,
      runningBalance: row.runningBalance ?? undefined,
      fingerprint: row.fingerprint,
      matchStatus: row.matchStatus as BankTransactionMatchStatus,
      matchedJournalLineId: row.matchedJournalLineId ?? undefined,
      matchedAt: row.matchedAt ? new Date(row.matchedAt) : undefined,
      matchedBy: row.matchedBy ?? undefined,
      createdAt: new Date(row.createdAt),
    });
  }
}
