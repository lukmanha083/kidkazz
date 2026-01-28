import {
  AcquisitionMethod,
  AssetStatus,
  DepreciationMethod,
  DisposalMethod,
  TaxAssetGroup,
} from '@/domain/value-objects';
import { z } from 'zod';

// ============================================================================
// Asset Category DTOs
// ============================================================================

/**
 * Create Asset Category Request Schema
 */
export const createAssetCategorySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  defaultUsefulLifeMonths: z.number().int().min(1).max(600),
  defaultDepreciationMethod: z.nativeEnum(DepreciationMethod),
  defaultSalvageValuePercent: z.number().min(0).max(100),
  assetAccountId: z.string().min(1),
  accumulatedDepreciationAccountId: z.string().min(1),
  depreciationExpenseAccountId: z.string().min(1),
  gainLossOnDisposalAccountId: z.string().min(1),
  taxUsefulLifeMonths: z.number().int().min(1).max(600).optional(),
  taxDepreciationMethod: z.nativeEnum(DepreciationMethod).optional(),
  taxAssetGroup: z.nativeEnum(TaxAssetGroup).optional(),
});

export type CreateAssetCategoryRequest = z.infer<typeof createAssetCategorySchema>;

/**
 * Update Asset Category Request Schema
 */
export const updateAssetCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  defaultUsefulLifeMonths: z.number().int().min(1).max(600).optional(),
  defaultDepreciationMethod: z.nativeEnum(DepreciationMethod).optional(),
  defaultSalvageValuePercent: z.number().min(0).max(100).optional(),
  assetAccountId: z.string().min(1).optional(),
  accumulatedDepreciationAccountId: z.string().min(1).optional(),
  depreciationExpenseAccountId: z.string().min(1).optional(),
  gainLossOnDisposalAccountId: z.string().min(1).optional(),
});

export type UpdateAssetCategoryRequest = z.infer<typeof updateAssetCategorySchema>;

/**
 * List Asset Categories Query Schema
 */
export const listAssetCategoriesQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type ListAssetCategoriesQueryParams = z.infer<typeof listAssetCategoriesQuerySchema>;

// ============================================================================
// Fixed Asset DTOs
// ============================================================================

/**
 * Create Asset Request Schema
 */
export const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  categoryId: z.string().min(1),
  serialNumber: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  manufacturer: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  locationId: z.string().optional(),
  departmentId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  acquisitionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acquisitionMethod: z.nativeEnum(AcquisitionMethod),
  acquisitionCost: z.number().positive(),
  purchaseOrderId: z.string().optional(),
  supplierId: z.string().optional(),
  invoiceNumber: z.string().max(100).optional(),
  usefulLifeMonths: z.number().int().min(1).max(600).optional(),
  salvageValue: z.number().min(0).optional(),
  depreciationMethod: z.nativeEnum(DepreciationMethod).optional(),
  depreciationStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  insurancePolicyNumber: z.string().max(100).optional(),
  insuranceExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  warrantyExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CreateAssetRequest = z.infer<typeof createAssetSchema>;

/**
 * Update Asset Request Schema
 */
export const updateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  serialNumber: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  manufacturer: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  insurancePolicyNumber: z.string().max(100).optional(),
  insuranceExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  warrantyExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type UpdateAssetRequest = z.infer<typeof updateAssetSchema>;

/**
 * Transfer Asset Request Schema
 */
export const transferAssetSchema = z.object({
  locationId: z.string().optional(),
  departmentId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  reason: z.string().max(1000).optional(),
});

export type TransferAssetRequest = z.infer<typeof transferAssetSchema>;

/**
 * Dispose Asset Request Schema
 */
export const disposeAssetSchema = z.object({
  method: z.nativeEnum(DisposalMethod),
  value: z.number().min(0),
  reason: z.string().min(1).max(1000),
});

export type DisposeAssetRequest = z.infer<typeof disposeAssetSchema>;

/**
 * List Assets Query Schema
 */
export const listAssetsQuerySchema = z.object({
  categoryId: z.string().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  locationId: z.string().optional(),
  departmentId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  acquisitionDateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  acquisitionDateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
  page: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(1))
    .optional(),
  limit: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
});

export type ListAssetsQueryParams = z.infer<typeof listAssetsQuerySchema>;
