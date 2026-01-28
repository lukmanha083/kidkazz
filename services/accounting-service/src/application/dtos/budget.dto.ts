import type { Budget, BudgetLine } from '@/domain/entities/budget.entity';
import { z } from 'zod';

/**
 * Schema for creating a budget
 */
export const createBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required').max(100),
  fiscalYear: z.number().int().min(2000).max(2100),
  lines: z
    .array(
      z.object({
        accountId: z.string(),
        fiscalMonth: z.number().int().min(1).max(12),
        amount: z.number(),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

export type CreateBudgetRequest = z.infer<typeof createBudgetSchema>;

/**
 * Schema for updating budget lines
 */
export const updateBudgetLinesSchema = z.object({
  lines: z.array(
    z.object({
      accountId: z.string(),
      fiscalMonth: z.number().int().min(1).max(12),
      amount: z.number(),
      notes: z.string().optional(),
    })
  ),
});

export type UpdateBudgetLinesRequest = z.infer<typeof updateBudgetLinesSchema>;

/**
 * Query schema for listing budgets
 */
export const listBudgetsQuerySchema = z.object({
  fiscalYear: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().min(2000).max(2100))
    .optional(),
  status: z.enum(['draft', 'approved', 'locked']).optional(),
});

export type ListBudgetsQuery = z.infer<typeof listBudgetsQuerySchema>;

/**
 * Query schema for budget vs actual report
 */
export const budgetVsActualQuerySchema = z.object({
  budgetId: z.string(),
  fiscalMonth: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().min(1).max(12))
    .optional(),
});

export type BudgetVsActualQuery = z.infer<typeof budgetVsActualQuerySchema>;

/**
 * Query schema for aging reports
 */
export const agingReportQuerySchema = z.object({
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
});

export type AgingReportQuery = z.infer<typeof agingReportQuerySchema>;

/**
 * Budget line response DTO
 */
export interface BudgetLineResponse {
  id: string;
  accountId: string;
  fiscalMonth: number;
  amount: number;
  notes: string | null;
}

/**
 * Budget response DTO
 */
export interface BudgetResponse {
  id: string;
  name: string;
  fiscalYear: number;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: BudgetLineResponse[];
  totalBudget: number;
}

/**
 * Transform Budget to response DTO
 */
export function toBudgetResponse(budget: Budget): BudgetResponse {
  return {
    id: budget.id,
    name: budget.name,
    fiscalYear: budget.fiscalYear,
    status: budget.status,
    approvedBy: budget.approvedBy,
    approvedAt: budget.approvedAt?.toISOString() || null,
    createdBy: budget.createdBy,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
    lines: budget.lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      fiscalMonth: l.fiscalMonth,
      amount: l.amount,
      notes: l.notes || null,
    })),
    totalBudget: budget.getTotalForYear(),
  };
}
