import { eq, and, sql, desc, lte } from 'drizzle-orm';
import { AccountBalance } from '@/domain/entities/account-balance.entity';
import { FiscalPeriod } from '@/domain/value-objects';
import type { IAccountBalanceRepository } from '@/domain/repositories/account-balance.repository';
import { accountBalances, type AccountBalanceRecord } from '@/infrastructure/db/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IAccountBalanceRepository
 */
export class DrizzleAccountBalanceRepository implements IAccountBalanceRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<AccountBalance | null> {
    const result = await this.db
      .select()
      .from(accountBalances)
      .where(eq(accountBalances.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByAccountAndPeriod(
    accountId: string,
    year: number,
    month: number
  ): Promise<AccountBalance | null> {
    const result = await this.db
      .select()
      .from(accountBalances)
      .where(
        and(
          eq(accountBalances.accountId, accountId),
          eq(accountBalances.fiscalYear, year),
          eq(accountBalances.fiscalMonth, month)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByPeriod(year: number, month: number): Promise<AccountBalance[]> {
    const results = await this.db
      .select()
      .from(accountBalances)
      .where(
        and(
          eq(accountBalances.fiscalYear, year),
          eq(accountBalances.fiscalMonth, month)
        )
      );

    return results.map((r: AccountBalanceRecord) => this.toDomain(r));
  }

  async findByAccount(accountId: string): Promise<AccountBalance[]> {
    const results = await this.db
      .select()
      .from(accountBalances)
      .where(eq(accountBalances.accountId, accountId))
      .orderBy(desc(accountBalances.fiscalYear), desc(accountBalances.fiscalMonth));

    return results.map((r: AccountBalanceRecord) => this.toDomain(r));
  }

  async findPreviousPeriodBalance(
    accountId: string,
    year: number,
    month: number
  ): Promise<AccountBalance | null> {
    const period = FiscalPeriod.create(year, month);
    const previous = period.previous();

    if (!previous) {
      return null;
    }

    return this.findByAccountAndPeriod(accountId, previous.year, previous.month);
  }

  async save(balance: AccountBalance): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.db
      .select({ id: accountBalances.id })
      .from(accountBalances)
      .where(eq(accountBalances.id, balance.id))
      .limit(1);

    const data = {
      accountId: balance.accountId,
      fiscalYear: balance.fiscalYear,
      fiscalMonth: balance.fiscalMonth,
      openingBalance: balance.openingBalance,
      debitTotal: balance.debitTotal,
      creditTotal: balance.creditTotal,
      closingBalance: balance.closingBalance,
      lastUpdatedAt: now,
    };

    if (existing.length > 0) {
      await this.db
        .update(accountBalances)
        .set(data)
        .where(eq(accountBalances.id, balance.id));
    } else {
      await this.db.insert(accountBalances).values({
        id: balance.id,
        ...data,
      });
    }
  }

  async saveMany(balances: AccountBalance[]): Promise<void> {
    if (balances.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    // For SQLite, we use INSERT OR REPLACE pattern
    for (const balance of balances) {
      const existing = await this.db
        .select({ id: accountBalances.id })
        .from(accountBalances)
        .where(eq(accountBalances.id, balance.id))
        .limit(1);

      const data = {
        accountId: balance.accountId,
        fiscalYear: balance.fiscalYear,
        fiscalMonth: balance.fiscalMonth,
        openingBalance: balance.openingBalance,
        debitTotal: balance.debitTotal,
        creditTotal: balance.creditTotal,
        closingBalance: balance.closingBalance,
        lastUpdatedAt: now,
      };

      if (existing.length > 0) {
        await this.db
          .update(accountBalances)
          .set(data)
          .where(eq(accountBalances.id, balance.id));
      } else {
        await this.db.insert(accountBalances).values({
          id: balance.id,
          ...data,
        });
      }
    }
  }

  async deleteByPeriod(year: number, month: number): Promise<void> {
    await this.db
      .delete(accountBalances)
      .where(
        and(
          eq(accountBalances.fiscalYear, year),
          eq(accountBalances.fiscalMonth, month)
        )
      );
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(accountBalances).where(eq(accountBalances.id, id));
  }

  async getYearToDateBalance(
    accountId: string,
    year: number,
    upToMonth: number
  ): Promise<{
    debitTotal: number;
    creditTotal: number;
  }> {
    const result = await this.db
      .select({
        debitTotal: sql<number>`COALESCE(SUM(${accountBalances.debitTotal}), 0)`,
        creditTotal: sql<number>`COALESCE(SUM(${accountBalances.creditTotal}), 0)`,
      })
      .from(accountBalances)
      .where(
        and(
          eq(accountBalances.accountId, accountId),
          eq(accountBalances.fiscalYear, year),
          lte(accountBalances.fiscalMonth, upToMonth)
        )
      );

    return {
      debitTotal: result[0]?.debitTotal || 0,
      creditTotal: result[0]?.creditTotal || 0,
    };
  }

  private toDomain(record: AccountBalanceRecord): AccountBalance {
    return AccountBalance.fromPersistence({
      id: record.id,
      accountId: record.accountId,
      fiscalYear: record.fiscalYear,
      fiscalMonth: record.fiscalMonth,
      openingBalance: record.openingBalance,
      debitTotal: record.debitTotal,
      creditTotal: record.creditTotal,
      closingBalance: record.closingBalance,
      lastUpdatedAt: new Date(record.lastUpdatedAt),
    });
  }
}
