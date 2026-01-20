/**
 * Route Search Schemas
 *
 * Zod schemas for validating and typing search parameters in TanStack Router routes.
 * These schemas enable type-safe URL search parameters with automatic validation.
 */

import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

/**
 * Common pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1).catch(1),
  pageSize: z.number().int().positive().max(100).default(20).catch(20),
});

/**
 * Common sorting parameters
 */
export const sortingSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').catch('desc'),
});

// ============================================
// PRODUCT SEARCH SCHEMAS
// ============================================

/**
 * Product status enum
 */
export const productStatusSchema = z.enum([
  'online sales',
  'offline sales',
  'omnichannel sales',
  'inactive',
  'discontinued',
]);

/**
 * Product list search parameters
 */
export const productListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  status: productStatusSchema.optional().catch(undefined),
  categoryId: z.string().optional().catch(undefined),
  isBundle: z.boolean().optional().catch(undefined),
  lowStock: z.boolean().optional().catch(undefined),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type ProductListSearch = z.infer<typeof productListSearchSchema>;

// ============================================
// INVENTORY SEARCH SCHEMAS
// ============================================

/**
 * Inventory list search parameters
 */
export const inventoryListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  warehouseId: z.string().optional().catch(undefined),
  productId: z.string().optional().catch(undefined),
  lowStock: z.boolean().optional().catch(undefined),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type InventoryListSearch = z.infer<typeof inventoryListSearchSchema>;

/**
 * Warehouse list search parameters
 */
export const warehouseListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  status: z.enum(['active', 'inactive']).optional().catch(undefined),
  ...paginationSchema.shape,
});

export type WarehouseListSearch = z.infer<typeof warehouseListSearchSchema>;

// ============================================
// BATCH SEARCH SCHEMAS
// ============================================

/**
 * Batch status enum
 */
export const batchStatusSchema = z.enum([
  'active',
  'expired',
  'depleted',
  'quarantined',
  'recalled',
]);

/**
 * Batch expiration filter enum
 */
export const batchExpirationFilterSchema = z.enum(['all', 'expired', 'expiring-7', 'expiring-30']);

/**
 * Batch list search parameters
 */
export const batchListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  status: batchStatusSchema.optional().catch(undefined),
  expirationFilter: batchExpirationFilterSchema.default('all').catch('all'),
  productId: z.string().optional().catch(undefined),
  warehouseId: z.string().optional().catch(undefined),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type BatchListSearch = z.infer<typeof batchListSearchSchema>;

// ============================================
// TRANSFER SEARCH SCHEMAS (Phase 7)
// ============================================

/**
 * Transfer status enum
 */
export const transferStatusSchema = z.enum([
  'requested',
  'approved',
  'rejected',
  'picking',
  'packed',
  'shipped',
  'in_transit',
  'received',
  'putaway',
  'completed',
  'cancelled',
]);

/**
 * Transfer priority enum
 */
export const transferPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

/**
 * Transfer direction enum
 */
export const transferDirectionSchema = z.enum(['inbound', 'outbound', 'all']);

/**
 * Transfer list search parameters
 */
export const transferListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  status: transferStatusSchema.optional().catch(undefined),
  priority: transferPrioritySchema.optional().catch(undefined),
  direction: transferDirectionSchema.default('all').catch('all'),
  warehouseId: z.string().optional().catch(undefined),
  sourceWarehouseId: z.string().optional().catch(undefined),
  destinationWarehouseId: z.string().optional().catch(undefined),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type TransferListSearch = z.infer<typeof transferListSearchSchema>;

// ============================================
// STOCK OPNAME SEARCH SCHEMAS (Phase 8)
// ============================================

/**
 * Stock Opname status enum
 */
export const opnameStatusSchema = z.enum([
  'draft',
  'in_progress',
  'pending_review',
  'approved',
  'rejected',
  'completed',
  'cancelled',
]);

/**
 * Stock Opname scope type enum
 */
export const opnameScopeTypeSchema = z.enum(['full', 'zone', 'category', 'product']);

/**
 * Stock Opname list search parameters
 */
export const stockOpnameListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  status: opnameStatusSchema.optional().catch(undefined),
  warehouseId: z.string().optional().catch(undefined),
  scopeType: opnameScopeTypeSchema.optional().catch(undefined),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type StockOpnameListSearch = z.infer<typeof stockOpnameListSearchSchema>;

// ============================================
// CATEGORY SEARCH SCHEMAS
// ============================================

/**
 * Category list search parameters
 */
export const categoryListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  status: z.enum(['active', 'inactive']).optional().catch(undefined),
  parentId: z.string().optional().catch(undefined),
  ...paginationSchema.shape,
});

export type CategoryListSearch = z.infer<typeof categoryListSearchSchema>;

// ============================================
// VARIANT SEARCH SCHEMAS
// ============================================

/**
 * Variant type enum
 */
export const variantTypeSchema = z.enum(['Color', 'Size', 'Material', 'Style']);

/**
 * Variant list search parameters
 */
export const variantListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  productId: z.string().optional().catch(undefined),
  status: z.enum(['active', 'inactive']).optional().catch(undefined),
  variantType: variantTypeSchema.optional().catch(undefined),
  ...paginationSchema.shape,
});

export type VariantListSearch = z.infer<typeof variantListSearchSchema>;

// ============================================
// BUNDLE SEARCH SCHEMAS
// ============================================

/**
 * Bundle list search parameters
 */
export const bundleListSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  status: productStatusSchema.optional().catch(undefined),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type BundleListSearch = z.infer<typeof bundleListSearchSchema>;

// ============================================
// LOW STOCK SEARCH SCHEMAS
// ============================================

/**
 * Low stock search parameters
 */
export const lowStockSearchSchema = z.object({
  warehouseId: z.string().optional().catch(undefined),
  categoryId: z.string().optional().catch(undefined),
  threshold: z.number().int().positive().optional().catch(undefined),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type LowStockSearch = z.infer<typeof lowStockSearchSchema>;

// ============================================
// EXPIRED STOCK SEARCH SCHEMAS
// ============================================

/**
 * Expired/expiring stock search parameters
 */
export const expiredStockSearchSchema = z.object({
  warehouseId: z.string().optional().catch(undefined),
  daysUntilExpiration: z.number().int().positive().default(30).catch(30),
  includeExpired: z.boolean().default(true).catch(true),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type ExpiredStockSearch = z.infer<typeof expiredStockSearchSchema>;

// ============================================
// ACCOUNTING SEARCH SCHEMAS
// ============================================

/**
 * Journal entry search parameters
 */
export const journalEntrySearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  accountId: z.string().optional().catch(undefined),
  startDate: z.string().optional().catch(undefined),
  endDate: z.string().optional().catch(undefined),
  ...paginationSchema.shape,
  ...sortingSchema.shape,
});

export type JournalEntrySearch = z.infer<typeof journalEntrySearchSchema>;

/**
 * Chart of accounts search parameters
 */
export const chartOfAccountsSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  type: z.string().optional().catch(undefined),
  status: z.enum(['active', 'inactive']).optional().catch(undefined),
  ...paginationSchema.shape,
});

export type ChartOfAccountsSearch = z.infer<typeof chartOfAccountsSearchSchema>;
