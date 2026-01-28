import { eq, and, desc } from 'drizzle-orm';
import {
  budgets,
  budgetLines,
  budgetRevisions,
  type BudgetRecord,
  type BudgetLineRecord,
} from '../db/schema';
import type { IBudgetRepository, BudgetFilter } from '@/domain/repositories/budget.repository';
import { Budget, type BudgetStatus, type BudgetRevision } from '@/domain/entities/budget.entity';

// Generic database type that works with both D1 and SQLite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;

/**
 * Drizzle implementation of IBudgetRepository
 */
export class DrizzleBudgetRepository implements IBudgetRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Budget | null> {
    const results = await this.db
      .select()
      .from(budgets)
      .where(eq(budgets.id, id))
      .limit(1);

    if (results.length === 0) return null;

    const lines = await this.db
      .select()
      .from(budgetLines)
      .where(eq(budgetLines.budgetId, id));

    return this.toDomain(results[0], lines);
  }

  async findByYearAndName(fiscalYear: number, name: string): Promise<Budget | null> {
    const results = await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.fiscalYear, fiscalYear), eq(budgets.name, name)))
      .limit(1);

    if (results.length === 0) return null;

    const lines = await this.db
      .select()
      .from(budgetLines)
      .where(eq(budgetLines.budgetId, results[0].id));

    return this.toDomain(results[0], lines);
  }

  async findAll(filter?: BudgetFilter): Promise<Budget[]> {
    const conditions = [];

    if (filter?.fiscalYear !== undefined) {
      conditions.push(eq(budgets.fiscalYear, filter.fiscalYear));
    }

    if (filter?.status !== undefined) {
      conditions.push(eq(budgets.status, filter.status));
    }

    const query =
      conditions.length > 0
        ? this.db.select().from(budgets).where(and(...conditions))
        : this.db.select().from(budgets);

    const results = await query.orderBy(desc(budgets.fiscalYear), budgets.name);

    // Fetch lines for each budget
    const budgetList: Budget[] = [];
    for (const record of results) {
      const lines = await this.db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.budgetId, record.id));

      budgetList.push(this.toDomain(record, lines));
    }

    return budgetList;
  }

  async save(budget: Budget): Promise<void> {
    const data = {
      id: budget.id,
      name: budget.name,
      fiscalYear: budget.fiscalYear,
      status: budget.status,
      approvedBy: budget.approvedBy,
      approvedAt: budget.approvedAt?.toISOString() || null,
      createdBy: budget.createdBy,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };

    // Upsert budget
    await this.db
      .insert(budgets)
      .values(data)
      .onConflictDoUpdate({
        target: budgets.id,
        set: {
          name: data.name,
          status: data.status,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt,
          updatedAt: data.updatedAt,
        },
      });

    // Save lines
    for (const line of budget.lines) {
      const lineData = {
        id: line.id,
        budgetId: budget.id,
        accountId: line.accountId,
        fiscalMonth: line.fiscalMonth,
        amount: line.amount,
        notes: line.notes || null,
        createdAt: line.createdAt.toISOString(),
        updatedAt: line.updatedAt.toISOString(),
      };

      await this.db
        .insert(budgetLines)
        .values(lineData)
        .onConflictDoUpdate({
          target: budgetLines.id,
          set: {
            amount: lineData.amount,
            notes: lineData.notes,
            updatedAt: lineData.updatedAt,
          },
        });
    }
  }

  async saveRevision(revision: BudgetRevision): Promise<void> {
    await this.db.insert(budgetRevisions).values({
      id: revision.id,
      budgetLineId: revision.budgetLineId,
      previousAmount: revision.previousAmount,
      newAmount: revision.newAmount,
      reason: revision.reason,
      revisedBy: revision.revisedBy,
      revisedAt: revision.revisedAt.toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(budgets).where(eq(budgets.id, id));
  }

  private toDomain(record: BudgetRecord, lines: BudgetLineRecord[]): Budget {
    return Budget.fromPersistence({
      id: record.id,
      name: record.name,
      fiscalYear: record.fiscalYear,
      status: record.status as BudgetStatus,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt ? new Date(record.approvedAt) : null,
      createdBy: record.createdBy,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      lines: lines.map((l) => ({
        id: l.id,
        accountId: l.accountId,
        fiscalMonth: l.fiscalMonth,
        amount: l.amount,
        notes: l.notes || undefined,
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.updatedAt),
      })),
    });
  }
}
