import { eq, and, like, sql, or, isNull, lt } from 'drizzle-orm';
import { BankAccount } from '@/domain/entities/bank-account.entity';
import { BankAccountType, BankAccountStatus } from '@/domain/value-objects';
import type { IBankAccountRepository, BankAccountFilter } from '@/domain/repositories/bank-account.repository';
import type { PaginationOptions, PaginatedResult } from '@/domain/repositories';
import { bankAccounts, type BankAccountRecord } from '@/infrastructure/db/schema';

// Generic database type that works with both D1 and SQLite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IBankAccountRepository
 */
export class DrizzleBankAccountRepository implements IBankAccountRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<BankAccount | null> {
    const result = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByAccountId(accountId: string): Promise<BankAccount | null> {
    const result = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.accountId, accountId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByAccountNumber(accountNumber: string): Promise<BankAccount | null> {
    const result = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.accountNumber, accountNumber))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findAll(filter?: BankAccountFilter, pagination?: PaginationOptions): Promise<PaginatedResult<BankAccount>> {
    const conditions = [];

    if (filter?.status) {
      conditions.push(eq(bankAccounts.status, filter.status));
    }

    if (filter?.accountType) {
      conditions.push(eq(bankAccounts.accountType, filter.accountType));
    }

    if (filter?.bankName) {
      const escapedBankName = filter.bankName.replace(/[%_]/g, '\\$&');
      conditions.push(like(bankAccounts.bankName, `%${escapedBankName}%`));
    }

    if (filter?.currency) {
      conditions.push(eq(bankAccounts.currency, filter.currency));
    }

    if (filter?.search) {
      const escapedSearch = filter.search.replace(/[%_]/g, '\\$&');
      conditions.push(
        or(
          like(bankAccounts.bankName, `%${escapedSearch}%`),
          like(bankAccounts.accountNumber, `%${escapedSearch}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(bankAccounts)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Apply pagination
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const results = await this.db
      .select()
      .from(bankAccounts)
      .where(whereClause)
      .orderBy(bankAccounts.bankName)
      .limit(limit)
      .offset(offset);

    return {
      data: results.map((row: BankAccountRecord) => this.toDomain(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findActive(): Promise<BankAccount[]> {
    const results = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.status, BankAccountStatus.ACTIVE))
      .orderBy(bankAccounts.bankName);

    return results.map((row: BankAccountRecord) => this.toDomain(row));
  }

  async findNeedingReconciliation(fiscalYear: number, fiscalMonth: number): Promise<BankAccount[]> {
    // Calculate the start date of the current period
    const periodStartDate = new Date(fiscalYear, fiscalMonth - 1, 1).toISOString();

    // Find active accounts that have never been reconciled or were last reconciled before current period
    const results = await this.db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.status, BankAccountStatus.ACTIVE),
          or(
            isNull(bankAccounts.lastReconciledDate),
            lt(bankAccounts.lastReconciledDate, periodStartDate)
          )
        )
      )
      .orderBy(bankAccounts.bankName);

    return results.map((row: BankAccountRecord) => this.toDomain(row));
  }

  async accountNumberExists(accountNumber: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(bankAccounts.accountNumber, accountNumber)];

    if (excludeId) {
      conditions.push(sql`${bankAccounts.id} != ${excludeId}`);
    }

    const result = await this.db
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0;
  }

  async save(bankAccount: BankAccount): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccount.id))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await this.db
        .update(bankAccounts)
        .set({
          accountId: bankAccount.accountId,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          accountType: bankAccount.accountType,
          currency: bankAccount.currency,
          status: bankAccount.status,
          lastReconciledDate: bankAccount.lastReconciledDate?.toISOString() || null,
          lastReconciledBalance: bankAccount.lastReconciledBalance ?? null,
          updatedAt: now,
          updatedBy: bankAccount.updatedBy || null,
        })
        .where(eq(bankAccounts.id, bankAccount.id));
    } else {
      // Insert
      await this.db.insert(bankAccounts).values({
        id: bankAccount.id,
        accountId: bankAccount.accountId,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountType: bankAccount.accountType,
        currency: bankAccount.currency,
        status: bankAccount.status,
        lastReconciledDate: bankAccount.lastReconciledDate?.toISOString() || null,
        lastReconciledBalance: bankAccount.lastReconciledBalance ?? null,
        createdAt: now,
        updatedAt: now,
        createdBy: bankAccount.createdBy || null,
        updatedBy: bankAccount.updatedBy || null,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(bankAccounts).where(eq(bankAccounts.id, id));
  }

  /**
   * Convert database record to domain entity
   */
  private toDomain(row: BankAccountRecord): BankAccount {
    return BankAccount.fromPersistence({
      id: row.id,
      accountId: row.accountId,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      accountType: row.accountType as BankAccountType,
      currency: row.currency,
      status: row.status as BankAccountStatus,
      lastReconciledDate: row.lastReconciledDate ? new Date(row.lastReconciledDate) : undefined,
      lastReconciledBalance: row.lastReconciledBalance ?? undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      createdBy: row.createdBy ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
    });
  }
}
