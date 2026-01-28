import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { BankStatement } from '@/domain/entities/bank-statement.entity';
import type { IBankStatementRepository, BankStatementFilter } from '@/domain/repositories/bank-statement.repository';
import type { PaginationOptions, PaginatedResult } from '@/domain/repositories';
import { bankStatements, type BankStatementRecord } from '@/infrastructure/db/schema';

// Generic database type that works with both D1 and SQLite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle ORM implementation of IBankStatementRepository
 */
export class DrizzleBankStatementRepository implements IBankStatementRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<BankStatement | null> {
    const result = await this.db
      .select()
      .from(bankStatements)
      .where(eq(bankStatements.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByBankAccountId(bankAccountId: string): Promise<BankStatement[]> {
    const results = await this.db
      .select()
      .from(bankStatements)
      .where(eq(bankStatements.bankAccountId, bankAccountId))
      .orderBy(bankStatements.statementDate);

    return results.map((row: BankStatementRecord) => this.toDomain(row));
  }

  async findByPeriod(bankAccountId: string, periodStart: Date, periodEnd: Date): Promise<BankStatement[]> {
    const results = await this.db
      .select()
      .from(bankStatements)
      .where(
        and(
          eq(bankStatements.bankAccountId, bankAccountId),
          gte(bankStatements.periodStart, periodStart.toISOString()),
          lte(bankStatements.periodEnd, periodEnd.toISOString())
        )
      )
      .orderBy(bankStatements.statementDate);

    return results.map((row: BankStatementRecord) => this.toDomain(row));
  }

  async findAll(filter?: BankStatementFilter, pagination?: PaginationOptions): Promise<PaginatedResult<BankStatement>> {
    const conditions = [];

    if (filter?.bankAccountId) {
      conditions.push(eq(bankStatements.bankAccountId, filter.bankAccountId));
    }

    if (filter?.periodStart) {
      conditions.push(gte(bankStatements.periodStart, filter.periodStart.toISOString()));
    }

    if (filter?.periodEnd) {
      conditions.push(lte(bankStatements.periodEnd, filter.periodEnd.toISOString()));
    }

    if (filter?.importedBy) {
      conditions.push(eq(bankStatements.importedBy, filter.importedBy));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(bankStatements)
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    // Apply pagination
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const results = await this.db
      .select()
      .from(bankStatements)
      .where(whereClause)
      .orderBy(bankStatements.statementDate)
      .limit(limit)
      .offset(offset);

    return {
      data: results.map((row: BankStatementRecord) => this.toDomain(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async save(statement: BankStatement): Promise<void> {
    const now = new Date().toISOString();

    // Use atomic upsert to avoid SELECT-then-write race conditions
    await this.db
      .insert(bankStatements)
      .values({
        id: statement.id,
        bankAccountId: statement.bankAccountId,
        statementDate: statement.statementDate.toISOString(),
        periodStart: statement.periodStart.toISOString(),
        periodEnd: statement.periodEnd.toISOString(),
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        totalDebits: statement.totalDebits,
        totalCredits: statement.totalCredits,
        transactionCount: statement.transactionCount,
        importSource: statement.importSource || null,
        importedAt: statement.importedAt.toISOString(),
        importedBy: statement.importedBy || null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: bankStatements.id,
        set: {
          bankAccountId: statement.bankAccountId,
          statementDate: statement.statementDate.toISOString(),
          periodStart: statement.periodStart.toISOString(),
          periodEnd: statement.periodEnd.toISOString(),
          openingBalance: statement.openingBalance,
          closingBalance: statement.closingBalance,
          totalDebits: statement.totalDebits,
          totalCredits: statement.totalCredits,
          transactionCount: statement.transactionCount,
          importSource: statement.importSource || null,
          importedBy: statement.importedBy || null,
          updatedAt: now,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(bankStatements).where(eq(bankStatements.id, id));
  }

  /**
   * Convert database record to domain entity
   */
  private toDomain(row: BankStatementRecord): BankStatement {
    return BankStatement.fromPersistence({
      id: row.id,
      bankAccountId: row.bankAccountId,
      statementDate: new Date(row.statementDate),
      periodStart: new Date(row.periodStart),
      periodEnd: new Date(row.periodEnd),
      openingBalance: row.openingBalance,
      closingBalance: row.closingBalance,
      totalDebits: row.totalDebits,
      totalCredits: row.totalCredits,
      transactionCount: row.transactionCount,
      importSource: row.importSource ?? undefined,
      importedAt: new Date(row.importedAt),
      importedBy: row.importedBy ?? undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}
