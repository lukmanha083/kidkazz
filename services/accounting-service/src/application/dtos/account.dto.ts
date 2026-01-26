import { z } from 'zod';
import { AccountType, AccountCategory, FinancialStatementType } from '@/domain/value-objects';

/**
 * Create Account Request Schema
 */
export const createAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  accountType: z.nativeEnum(AccountType),
  accountCategory: z.nativeEnum(AccountCategory).optional(),
  normalBalance: z.enum(['Debit', 'Credit']),
  financialStatementType: z.nativeEnum(FinancialStatementType).optional(),
  parentAccountId: z.string().optional(),
  level: z.number().int().min(0).max(10).optional(),
  isDetailAccount: z.boolean(),
  isSystemAccount: z.boolean().default(false),
});

export type CreateAccountRequest = z.infer<typeof createAccountSchema>;

/**
 * Update Account Request Schema
 */
export const updateAccountSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(255).optional(),
  nameEn: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
});

export type UpdateAccountRequest = z.infer<typeof updateAccountSchema>;

/**
 * List Accounts Query Schema
 */
export const listAccountsQuerySchema = z.object({
  accountType: z.nativeEnum(AccountType).optional(),
  isDetailAccount: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  isSystemAccount: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  search: z.string().optional(),
});

export type ListAccountsQueryParams = z.infer<typeof listAccountsQuerySchema>;

/**
 * Account Response DTO
 */
export interface AccountResponse {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  accountType: AccountType;
  accountCategory?: AccountCategory;
  normalBalance: 'Debit' | 'Credit';
  financialStatementType?: FinancialStatementType;
  parentAccountId?: string | null;
  level: number;
  isDetailAccount: boolean;
  isSystemAccount: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transform Account entity to response DTO
 */
export function toAccountResponse(account: {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  accountType: AccountType;
  accountCategory?: AccountCategory;
  normalBalance: 'Debit' | 'Credit';
  financialStatementType?: FinancialStatementType;
  parentAccountId?: string | null;
  level: number;
  isDetailAccount: boolean;
  isSystemAccount: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): AccountResponse {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    nameEn: account.nameEn || undefined,
    description: account.description || undefined,
    accountType: account.accountType,
    accountCategory: account.accountCategory,
    normalBalance: account.normalBalance,
    financialStatementType: account.financialStatementType,
    parentAccountId: account.parentAccountId,
    level: account.level,
    isDetailAccount: account.isDetailAccount,
    isSystemAccount: account.isSystemAccount,
    status: account.status,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
