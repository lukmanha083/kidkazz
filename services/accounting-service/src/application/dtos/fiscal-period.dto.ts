import { z } from 'zod';
import { FiscalPeriodStatus } from '@/domain/value-objects';

/**
 * Create Fiscal Period Request Schema
 */
export const createFiscalPeriodSchema = z.object({
  fiscalYear: z.number().int().min(2020).max(2100),
  fiscalMonth: z.number().int().min(1).max(12),
});

export type CreateFiscalPeriodRequest = z.infer<typeof createFiscalPeriodSchema>;

/**
 * Close Fiscal Period Request Schema
 */
export const closeFiscalPeriodSchema = z.object({
  // closedBy comes from auth middleware, not request body
});

export type CloseFiscalPeriodRequest = z.infer<typeof closeFiscalPeriodSchema>;

/**
 * Reopen Fiscal Period Request Schema
 */
export const reopenFiscalPeriodSchema = z.object({
  reason: z.string().min(10, 'Reopen reason must be at least 10 characters').max(1000),
});

export type ReopenFiscalPeriodRequest = z.infer<typeof reopenFiscalPeriodSchema>;

/**
 * Lock Fiscal Period Request Schema
 */
export const lockFiscalPeriodSchema = z.object({
  // lockedBy comes from auth middleware, not request body
});

export type LockFiscalPeriodRequest = z.infer<typeof lockFiscalPeriodSchema>;

/**
 * List Fiscal Periods Query Schema
 */
export const listFiscalPeriodsQuerySchema = z.object({
  status: z.nativeEnum(FiscalPeriodStatus).optional(),
  fiscalYear: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(2020).max(2100))
    .optional(),
});

export type ListFiscalPeriodsQueryParams = z.infer<typeof listFiscalPeriodsQuerySchema>;

/**
 * Get Fiscal Period by Year/Month Path Params Schema
 * Matches route params :year and :month
 */
export const getFiscalPeriodByPeriodQuerySchema = z
  .object({
    year: z
      .string()
      .transform((v) => parseInt(v, 10))
      .pipe(z.number().int().min(2020).max(2100)),
    month: z
      .string()
      .transform((v) => parseInt(v, 10))
      .pipe(z.number().int().min(1).max(12)),
  })
  .transform((data) => ({
    fiscalYear: data.year,
    fiscalMonth: data.month,
  }));

export type GetFiscalPeriodByPeriodQueryParams = z.infer<typeof getFiscalPeriodByPeriodQuerySchema>;

/**
 * Fiscal Period Response
 */
export interface FiscalPeriodResponseDto {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  periodString: string;
  displayString: string;
  status: string;
  isOpen: boolean;
  isClosed: boolean;
  isLocked: boolean;
  closedAt?: string;
  closedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Map domain response to DTO
 */
export function toFiscalPeriodDto(response: {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  periodString: string;
  displayString: string;
  status: string;
  isOpen: boolean;
  isClosed: boolean;
  isLocked: boolean;
  closedAt?: Date;
  closedBy?: string;
  reopenedAt?: Date;
  reopenedBy?: string;
  reopenReason?: string;
  createdAt: Date;
  updatedAt: Date;
}): FiscalPeriodResponseDto {
  return {
    id: response.id,
    fiscalYear: response.fiscalYear,
    fiscalMonth: response.fiscalMonth,
    periodString: response.periodString,
    displayString: response.displayString,
    status: response.status,
    isOpen: response.isOpen,
    isClosed: response.isClosed,
    isLocked: response.isLocked,
    closedAt: response.closedAt?.toISOString(),
    closedBy: response.closedBy,
    reopenedAt: response.reopenedAt?.toISOString(),
    reopenedBy: response.reopenedBy,
    reopenReason: response.reopenReason,
    createdAt: response.createdAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  };
}
