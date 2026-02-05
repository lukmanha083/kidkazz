import { JournalEntryStatus, JournalEntryType, type JournalLine } from '@/domain/entities';
import { z } from 'zod';

/**
 * Journal Line Input Schema
 */
const journalLineSchema = z.object({
  accountId: z.string().min(1),
  direction: z.enum(['Debit', 'Credit']),
  amount: z.number().positive(),
  memo: z.string().max(500).optional(),
  salesPersonId: z.string().optional(),
  warehouseId: z.string().optional(),
  salesChannel: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  productId: z.string().optional(),
  businessUnit: z.enum(['Trading', 'Restaurant']).optional(),
});

/**
 * Create Journal Entry Request Schema
 */
export const createJournalEntrySchema = z.object({
  entryDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s)),
  description: z.string().min(1).max(500),
  reference: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  entryType: z.nativeEnum(JournalEntryType).optional(),
  lines: z.array(journalLineSchema).min(2),
  sourceService: z.string().optional(),
  sourceReferenceId: z.string().optional(),
});

export type CreateJournalEntryRequest = z.infer<typeof createJournalEntrySchema>;

/**
 * Update Journal Entry Request Schema
 */
export const updateJournalEntrySchema = z.object({
  description: z.string().min(1).max(500).optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  entryDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
  lines: z.array(journalLineSchema).min(2).optional(),
});

export type UpdateJournalEntryRequest = z.infer<typeof updateJournalEntrySchema>;

/**
 * Post Journal Entry Request Schema
 */
export const postJournalEntrySchema = z.object({
  // postedBy will come from auth context
});

export type PostJournalEntryRequest = z.infer<typeof postJournalEntrySchema>;

/**
 * Void Journal Entry Request Schema
 */
export const voidJournalEntrySchema = z.object({
  reason: z.string().min(3).max(500),
});

export type VoidJournalEntryRequest = z.infer<typeof voidJournalEntrySchema>;

/**
 * List Journal Entries Query Schema
 */
export const listJournalEntriesQuerySchema = z.object({
  status: z.nativeEnum(JournalEntryStatus).optional(),
  entryType: z.nativeEnum(JournalEntryType).optional(),
  fromDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
  toDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
  accountId: z.string().optional(),
  createdBy: z.string().optional(),
  sourceService: z.string().optional(),
  sourceReferenceId: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

export type ListJournalEntriesQueryParams = z.infer<typeof listJournalEntriesQuerySchema>;

/**
 * Journal Line Response DTO
 */
export interface JournalLineResponse {
  id: string;
  lineSequence: number;
  accountId: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  memo?: string;
  salesPersonId?: string;
  warehouseId?: string;
  salesChannel?: string;
  customerId?: string;
  vendorId?: string;
  productId?: string;
  businessUnit?: 'Trading' | 'Restaurant';
}

/**
 * Journal Entry Response DTO
 */
export interface JournalEntryResponse {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  reference?: string;
  notes?: string;
  entryType: JournalEntryType;
  status: JournalEntryStatus;
  fiscalYear: number;
  fiscalMonth: number;
  sourceService?: string;
  sourceReferenceId?: string;
  lines: JournalLineResponse[];
  totalDebits: number;
  totalCredits: number;
  createdBy: string;
  createdAt: string;
  postedBy?: string;
  postedAt?: string;
  voidedBy?: string;
  voidedAt?: string;
  voidReason?: string;
  updatedAt: string;
}

/**
 * Transform JournalEntry entity to response DTO
 */
export function toJournalEntryResponse(entry: {
  id: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  reference?: string;
  notes?: string;
  entryType: JournalEntryType;
  status: JournalEntryStatus;
  fiscalPeriod: { year: number; month: number };
  sourceService?: string;
  sourceReferenceId?: string;
  lines: JournalLine[];
  totalDebits: number;
  totalCredits: number;
  createdBy: string;
  createdAt: Date;
  postedBy?: string;
  postedAt?: Date;
  voidedBy?: string;
  voidedAt?: Date;
  voidReason?: string;
  updatedAt: Date;
}): JournalEntryResponse {
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    entryDate: entry.entryDate.toISOString(),
    description: entry.description,
    reference: entry.reference,
    notes: entry.notes,
    entryType: entry.entryType,
    status: entry.status,
    fiscalYear: entry.fiscalPeriod.year,
    fiscalMonth: entry.fiscalPeriod.month,
    sourceService: entry.sourceService,
    sourceReferenceId: entry.sourceReferenceId,
    lines: entry.lines.map((line) => ({
      id: line.id,
      lineSequence: line.lineSequence,
      accountId: line.accountId,
      direction: line.direction,
      amount: line.amount,
      memo: line.memo,
      salesPersonId: line.salesPersonId,
      warehouseId: line.warehouseId,
      salesChannel: line.salesChannel,
      customerId: line.customerId,
      vendorId: line.vendorId,
      productId: line.productId,
      businessUnit: line.businessUnit,
    })),
    totalDebits: entry.totalDebits,
    totalCredits: entry.totalCredits,
    createdBy: entry.createdBy,
    createdAt: entry.createdAt.toISOString(),
    postedBy: entry.postedBy,
    postedAt: entry.postedAt?.toISOString(),
    voidedBy: entry.voidedBy,
    voidedAt: entry.voidedAt?.toISOString(),
    voidReason: entry.voidReason,
    updatedAt: entry.updatedAt.toISOString(),
  };
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
