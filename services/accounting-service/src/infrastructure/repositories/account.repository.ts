import { eq, and, like, isNull, sql } from 'drizzle-orm';
import { Account, AccountStatus } from '@/domain/entities';
import {
  AccountType,
  AccountCategory,
  FinancialStatementType,
  type NormalBalance,
} from '@/domain/value-objects';
import type { IAccountRepository, AccountFilter } from '@/domain/repositories';
import { chartOfAccounts, journalLines, type ChartOfAccountsRecord } from '@/infrastructure/db/schema';

// Generic database type that works with both D1 and SQLite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IAccountRepository
 */
export class DrizzleAccountRepository implements IAccountRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Account | null> {
    const result = await this.db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByCode(code: string): Promise<Account | null> {
    const result = await this.db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.code, code))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findAll(filter?: AccountFilter): Promise<Account[]> {
    const conditions = [];

    if (filter?.status) {
      conditions.push(eq(chartOfAccounts.status, filter.status));
    }

    if (filter?.accountType) {
      conditions.push(eq(chartOfAccounts.accountType, filter.accountType));
    }

    if (filter?.parentAccountId !== undefined) {
      if (filter.parentAccountId === null) {
        conditions.push(isNull(chartOfAccounts.parentAccountId));
      } else {
        conditions.push(eq(chartOfAccounts.parentAccountId, filter.parentAccountId));
      }
    }

    if (filter?.isDetailAccount !== undefined) {
      conditions.push(eq(chartOfAccounts.isDetailAccount, filter.isDetailAccount));
    }

    if (filter?.isSystemAccount !== undefined) {
      conditions.push(eq(chartOfAccounts.isSystemAccount, filter.isSystemAccount));
    }

    if (filter?.search) {
      // Escape LIKE wildcards to prevent injection
      const escapedSearch = filter.search.replace(/[%_]/g, '\\$&');
      conditions.push(like(chartOfAccounts.name, `%${escapedSearch}%`));
    }

    const query =
      conditions.length > 0
        ? this.db.select().from(chartOfAccounts).where(and(...conditions))
        : this.db.select().from(chartOfAccounts);

    const results = await query.orderBy(chartOfAccounts.code);

    return results.map((row: ChartOfAccountsRecord) => this.toDomain(row));
  }

  async findByParentId(parentId: string | null): Promise<Account[]> {
    const condition =
      parentId === null
        ? isNull(chartOfAccounts.parentAccountId)
        : eq(chartOfAccounts.parentAccountId, parentId);

    const results = await this.db
      .select()
      .from(chartOfAccounts)
      .where(condition)
      .orderBy(chartOfAccounts.code);

    return results.map((row: ChartOfAccountsRecord) => this.toDomain(row));
  }

  async getAccountTree(): Promise<Account[]> {
    const results = await this.db
      .select()
      .from(chartOfAccounts)
      .orderBy(chartOfAccounts.code);

    return results.map((row: ChartOfAccountsRecord) => this.toDomain(row));
  }

  async save(account: Account): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.id, account.id))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await this.db
        .update(chartOfAccounts)
        .set({
          code: account.code,
          name: account.name,
          nameEn: account.nameEn || null,
          description: account.description || null,
          accountType: account.accountType,
          accountCategory: account.accountCategory,
          normalBalance: account.normalBalance,
          financialStatementType: account.financialStatementType,
          parentAccountId: account.parentAccountId,
          level: account.level,
          isDetailAccount: account.isDetailAccount,
          isSystemAccount: account.isSystemAccount,
          status: account.status,
          updatedAt: now,
          updatedBy: account.updatedBy || null,
        })
        .where(eq(chartOfAccounts.id, account.id));
    } else {
      // Insert
      await this.db.insert(chartOfAccounts).values({
        id: account.id,
        code: account.code,
        name: account.name,
        nameEn: account.nameEn || null,
        description: account.description || null,
        accountType: account.accountType,
        accountCategory: account.accountCategory,
        normalBalance: account.normalBalance,
        financialStatementType: account.financialStatementType,
        parentAccountId: account.parentAccountId,
        level: account.level,
        isDetailAccount: account.isDetailAccount,
        isSystemAccount: account.isSystemAccount,
        status: account.status,
        createdAt: now,
        updatedAt: now,
        createdBy: account.createdBy || null,
        updatedBy: account.updatedBy || null,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(chartOfAccounts).where(eq(chartOfAccounts.id, id));
  }

  async hasTransactions(accountId: string): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(journalLines)
      .where(eq(journalLines.accountId, accountId))
      .limit(1);

    return result[0]?.count > 0;
  }

  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(chartOfAccounts.code, code)];

    if (excludeId) {
      conditions.push(sql`${chartOfAccounts.id} != ${excludeId}`);
    }

    const result = await this.db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Convert database record to domain entity
   */
  private toDomain(row: typeof chartOfAccounts.$inferSelect): Account {
    return Account.fromPersistence({
      id: row.id,
      code: row.code,
      name: row.name,
      nameEn: row.nameEn || undefined,
      description: row.description || undefined,
      accountType: row.accountType as AccountType,
      accountCategory: row.accountCategory as AccountCategory,
      normalBalance: row.normalBalance as NormalBalance,
      financialStatementType: row.financialStatementType as FinancialStatementType,
      parentAccountId: row.parentAccountId,
      level: row.level,
      isDetailAccount: row.isDetailAccount,
      isSystemAccount: row.isSystemAccount,
      status: row.status as AccountStatus,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      createdBy: row.createdBy || undefined,
      updatedBy: row.updatedBy || undefined,
    });
  }
}
