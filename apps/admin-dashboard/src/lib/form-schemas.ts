/**
 * Form Validation Schemas using Zod
 *
 * This file contains all Zod schemas for TanStack Form validation.
 * Following DDD principles - NO stock fields in Product forms.
 */

import { z } from 'zod';

// ============================================================================
// WAREHOUSE FORM SCHEMA
// ============================================================================

export const warehouseFormSchema = z.object({
  code: z.string().min(1, 'Warehouse code is required'),
  name: z.string().min(1, 'Warehouse name is required'),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required').default('Indonesia'),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type WarehouseFormData = z.infer<typeof warehouseFormSchema>;

// ============================================================================
// PRODUCT FORM SCHEMA (DDD Compliant - NO Stock Fields)
// ============================================================================

export const productFormSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  price: z.coerce.number().positive('Price must be positive'),
  retailPrice: z.coerce.number().positive('Retail price must be positive').optional().nullable(),
  wholesalePrice: z.coerce.number().positive('Wholesale price must be positive').optional().nullable(),
  baseUnit: z.string().min(1, 'Base unit is required').default('PCS'),
  wholesaleThreshold: z.coerce.number().int().positive('Wholesale threshold must be positive').default(10),
  minimumOrderQuantity: z.coerce.number().int().positive('Minimum order quantity must be positive').default(1),
  weight: z.coerce.number().positive('Weight must be positive').optional().nullable(),
  length: z.coerce.number().positive('Length must be positive').optional().nullable(),
  width: z.coerce.number().positive('Width must be positive').optional().nullable(),
  height: z.coerce.number().positive('Height must be positive').optional().nullable(),
  rating: z.coerce.number().min(0).max(5).default(0),
  reviews: z.coerce.number().int().nonnegative().default(0),
  availableForRetail: z.boolean().default(true),
  availableForWholesale: z.boolean().default(false),
  // Phase 3: Fixed to match ProductStatus type in api.ts:305
  status: z.enum(['online sales', 'offline sales', 'omnichannel sales', 'inactive', 'discontinued']).default('online sales'),
  isBundle: z.boolean().default(false),
  // Expiration & Alert dates
  expirationDate: z.string().optional().nullable(),
  alertDate: z.string().optional().nullable(),
  // Location fields (warehouse physical location)
  rack: z.string().optional().default(''),
  bin: z.string().optional().default(''),
  zone: z.string().optional().default(''),
  aisle: z.string().optional().default(''),
  // NOTE: NO stock fields - stock is managed via Inventory Service
});

export type ProductFormData = z.infer<typeof productFormSchema>;

// ============================================================================
// VARIANT FORM SCHEMA (DDD Compliant - NO Stock Fields)
// ============================================================================

export const variantFormSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  productSKU: z.string().min(1, 'Product SKU is required'),
  variantName: z.string().min(1, 'Variant name is required'),
  variantSKU: z.string().min(1, 'Variant SKU is required'),
  // Phase 3: Fixed to match VariantType in api.ts:219 (PascalCase)
  variantType: z.enum(['Color', 'Size', 'Material', 'Style']).default('Size'),
  price: z.coerce.number().positive('Price must be positive'),
  status: z.enum(['active', 'inactive']).default('active'),
  image: z.string().optional().nullable(),
  // NOTE: NO stock field - stock is managed via Inventory Service
});

export type VariantFormData = z.infer<typeof variantFormSchema>;

// ============================================================================
// CATEGORY FORM SCHEMA
// ============================================================================

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  parentId: z.string().optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

// ============================================================================
// UOM (UNIT OF MEASURE) FORM SCHEMA - Master UOM Units
// ============================================================================

export const uomFormSchema = z.object({
  code: z.string().min(1, 'UOM code is required'),
  name: z.string().min(1, 'UOM name is required'),
  isBaseUnit: z.boolean().default(false),
  baseUnitCode: z.string().optional().nullable(),
  conversionFactor: z.coerce.number().positive('Conversion factor must be positive').default(1),
});

export type UOMFormData = z.infer<typeof uomFormSchema>;

// ============================================================================
// PRODUCT UOM CONVERSION FORM SCHEMA - Product-specific UOM conversions
// ============================================================================

export const productUOMConversionFormSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  fromUnitId: z.string().min(1, 'From unit is required'),
  toUnitId: z.string().min(1, 'To unit is required'),
  conversionFactor: z.coerce.number().positive('Conversion factor must be positive'),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type ProductUOMConversionFormData = z.infer<typeof productUOMConversionFormSchema>;

// ============================================================================
// INVENTORY ADJUSTMENT FORM SCHEMA
// ============================================================================

export const inventoryAdjustmentFormSchema = z.object({
  inventoryId: z.string().min(1, 'Inventory ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  variantId: z.string().optional().nullable(),
  uomId: z.string().optional().nullable(),
  adjustmentType: z.enum(['increase', 'decrease', 'set']),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  source: z.enum(['pos', 'warehouse', 'system']).default('warehouse'),
});

export type InventoryAdjustmentFormData = z.infer<typeof inventoryAdjustmentFormSchema>;

// ============================================================================
// BATCH FORM SCHEMA (For Expiration Tracking)
// ============================================================================

export const batchFormSchema = z.object({
  inventoryId: z.string().min(1, 'Inventory ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  lotNumber: z.string().optional(),
  expirationDate: z.date().nullable().optional(),
  alertDate: z.date().nullable().optional(),
  quantityAvailable: z.coerce.number().int().nonnegative('Quantity must be non-negative'),
  quantityReserved: z.coerce.number().int().nonnegative('Reserved quantity must be non-negative').default(0),
  status: z.enum(['active', 'expired', 'depleted', 'quarantined', 'recalled']).default('active'),
});

export type BatchFormData = z.infer<typeof batchFormSchema>;

// ============================================================================
// BATCH CREATION FORM SCHEMA (Simplified for batch creation UI)
// ============================================================================

export const batchCreationFormSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  lotNumber: z.string().optional(),
  expirationDate: z.date().nullable().optional(),
  manufactureDate: z.date().nullable().optional(),
  quantityAvailable: z.coerce.number().int().nonnegative('Quantity must be non-negative').default(0),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export type BatchCreationFormData = z.infer<typeof batchCreationFormSchema>;

// ============================================================================
// BUNDLE FORM SCHEMA (Virtual Bundles)
// ============================================================================

export const bundleFormSchema = z.object({
  bundleName: z.string().min(1, 'Bundle name is required'),
  bundleSKU: z.string().min(1, 'Bundle SKU is required'),
  barcode: z.string().optional(),
  bundleDescription: z.string().optional(),
  bundlePrice: z.coerce.number().positive('Bundle price must be positive'),
  discountPercentage: z.coerce.number().min(0).max(100, 'Discount must be between 0-100').optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  warehouseId: z.string().optional().nullable(),
  // Bundle items array will be handled separately in the form
});

export type BundleFormData = z.infer<typeof bundleFormSchema>;

// ============================================================================
// BUNDLE ITEM FORM SCHEMA (Components of a bundle)
// ============================================================================

export const bundleItemFormSchema = z.object({
  bundleId: z.string().optional(), // Optional when creating new bundle
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional().nullable(),
  uomId: z.string().optional().nullable(),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  productName: z.string().optional(), // For display purposes
});

export type BundleItemFormData = z.infer<typeof bundleItemFormSchema>;

// ============================================================================
// PRODUCT LOCATION FORM SCHEMA (Physical location within warehouse)
// ============================================================================

export const productLocationFormSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  variantId: z.string().optional().nullable(),
  uomId: z.string().optional().nullable(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  quantity: z.coerce.number().int().nonnegative('Quantity must be non-negative').default(0),
});

export type ProductLocationFormData = z.infer<typeof productLocationFormSchema>;

// ============================================================================
// BATCH STATUS UPDATE FORM SCHEMA
// ============================================================================

export const batchStatusUpdateFormSchema = z.object({
  status: z.enum(['active', 'expired', 'depleted', 'quarantined', 'recalled']),
  reason: z.string().min(1, 'Reason is required'),
});

export type BatchStatusUpdateFormData = z.infer<typeof batchStatusUpdateFormSchema>;

// ============================================================================
// BATCH QUANTITY ADJUSTMENT FORM SCHEMA
// ============================================================================

export const batchQuantityAdjustmentFormSchema = z.object({
  quantity: z.coerce.number().int('Quantity must be an integer').nonnegative('Quantity cannot be negative'),
  reason: z.string().min(1, 'Reason is required'),
});

export type BatchQuantityAdjustmentFormData = z.infer<typeof batchQuantityAdjustmentFormSchema>;

// ============================================================================
// TRANSFER STOCK FORM SCHEMA
// ============================================================================

export const transferStockFormSchema = z.object({
  sourceWarehouseId: z.string().min(1, 'Source warehouse is required'),
  destinationWarehouseId: z.string().min(1, 'Destination warehouse is required'),
  notes: z.string().optional(),
}).refine(
  (data) => data.sourceWarehouseId !== data.destinationWarehouseId,
  {
    message: 'Source and destination warehouse must be different',
    path: ['destinationWarehouseId'],
  }
);

export type TransferStockFormData = z.infer<typeof transferStockFormSchema>;
