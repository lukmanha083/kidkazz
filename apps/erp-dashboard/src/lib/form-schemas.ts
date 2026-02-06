/**
 * Form Validation Schemas using Zod
 *
 * This file contains all Zod schemas for TanStack Form validation.
 * Following DDD principles - NO stock fields in Product forms.
 */

import { z } from 'zod';

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

/**
 * Indonesian mobile phone number validation regex
 * Accepts formats:
 * - +62XXXXXXXXXX (international with +)
 * - 62XXXXXXXXXX (international without +)
 * - 08XXXXXXXXXX (local format)
 * - Allows 9-13 digits after country code/prefix
 */
const indonesianMobileRegex = /^(?:\+62|62|0)8[1-9][0-9]{7,11}$/;

/**
 * Indonesian landline phone number validation regex
 * Accepts formats:
 * - 0[area code][number] (e.g., 021 72786383, 022 1234567)
 * - Area code: 2-3 digits (21=Jakarta, 22=Bandung, 31=Surabaya, etc.)
 * - Number: 6-8 digits
 */
const indonesianLandlineRegex = /^0[1-9][0-9]{1,2}[0-9]{6,8}$/;

/**
 * International phone number validation regex (E.164 format)
 * Accepts formats:
 * - +[country code][number] (e.g., +1234567890, +44123456789)
 * - Country code: 1-3 digits
 * - Number: 6-14 digits (total 7-15 digits per E.164 standard)
 */
const internationalPhoneRegex = /^\+[1-9][0-9]{6,14}$/;

/**
 * Validates phone number for Indonesian mobile, landline, and international formats
 */
function isValidPhoneNumber(phone: string): boolean {
  // Remove spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, '');

  // Check Indonesian mobile format (08xxx)
  if (indonesianMobileRegex.test(cleaned)) {
    return true;
  }

  // Check Indonesian landline format (021xxx, 022xxx, etc.)
  if (indonesianLandlineRegex.test(cleaned)) {
    return true;
  }

  // Check international E.164 format
  if (internationalPhoneRegex.test(cleaned)) {
    return true;
  }

  return false;
}

/**
 * Phone number schema with validation
 * - Optional field (empty string allowed)
 * - When provided, must match Indonesian or international phone format
 *
 * Supported formats:
 * - Indonesian mobile: +628xxx, 628xxx, 08xxx
 * - Indonesian landline: 021xxx, 022xxx (area code + number)
 * - International: +[country code][number] (E.164)
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || isValidPhoneNumber(val), {
    message:
      'Invalid phone number. Use format: +628xxx, 08xxx, 021xxx (ID) or +[country code][number]',
  });

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

export const productFormSchema = z
  .object({
    barcode: z.string().min(1, 'Barcode is required'),
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().min(1, 'SKU is required'),
    description: z.string().optional(),
    image: z.string().optional(),
    categoryId: z.string().optional().nullable(),
    price: z.coerce.number().positive('Price must be positive'),
    retailPrice: z.coerce.number().positive('Retail price must be positive').optional().nullable(),
    wholesalePrice: z.coerce
      .number()
      .positive('Wholesale price must be positive')
      .optional()
      .nullable(),
    baseUnit: z.string().min(1, 'Base unit is required').default('PCS'),
    wholesaleThreshold: z.coerce
      .number()
      .int()
      .positive('Wholesale threshold must be positive')
      .default(10),
    minimumOrderQuantity: z.coerce
      .number()
      .int()
      .positive('Minimum order quantity must be positive')
      .default(1),
    weight: z.coerce.number().positive('Weight must be positive').optional().nullable(),
    length: z.coerce.number().positive('Length must be positive').optional().nullable(),
    width: z.coerce.number().positive('Width must be positive').optional().nullable(),
    height: z.coerce.number().positive('Height must be positive').optional().nullable(),
    rating: z.coerce.number().min(0).max(5).default(0),
    reviews: z.coerce.number().int().nonnegative().default(0),
    availableForRetail: z.boolean().default(true),
    availableForWholesale: z.boolean().default(false),
    // Phase 3: Fixed to match ProductStatus type in api.ts:305
    status: z
      .enum(['online sales', 'offline sales', 'omnichannel sales', 'inactive', 'discontinued'])
      .default('offline sales'),
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
  })
  // Phase 4: Business Rule 1 - Wholesale price required when available for wholesale
  .refine(
    (data) => {
      if (data.availableForWholesale && !data.wholesalePrice) {
        return false;
      }
      return true;
    },
    {
      message: 'Wholesale price is required when product is available for wholesale',
      path: ['wholesalePrice'],
    }
  )
  // Phase 4: Business Rule 2 - Wholesale price must be less than or equal to retail price
  .refine(
    (data) => {
      if (data.wholesalePrice && data.retailPrice && data.wholesalePrice > data.retailPrice) {
        return false;
      }
      return true;
    },
    {
      message: 'Wholesale price must be less than or equal to retail price',
      path: ['wholesalePrice'],
    }
  )
  // Phase 4: Business Rule 3 - Wholesale threshold must be greater than minimum order quantity
  .refine(
    (data) => {
      if (data.availableForWholesale && data.wholesaleThreshold <= data.minimumOrderQuantity) {
        return false;
      }
      return true;
    },
    {
      message: 'Wholesale threshold must be greater than minimum order quantity',
      path: ['wholesaleThreshold'],
    }
  )
  // Phase 4: Date Validation - Alert date must be before expiration date
  .refine(
    (data) => {
      if (data.alertDate && data.expirationDate) {
        const alertDate = new Date(data.alertDate);
        const expirationDate = new Date(data.expirationDate);
        return alertDate < expirationDate;
      }
      return true;
    },
    {
      message: 'Alert date must be before expiration date',
      path: ['alertDate'],
    }
  );

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
  conversionFactor: z.coerce
    .number()
    .int('Conversion factor must be a whole number')
    .positive('Conversion factor must be positive')
    .default(1),
});
// Note: Conditional validation for baseUnitCode (required only when isBaseUnit=false)
// is handled in the form component's onSubmit handler

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
  quantityReserved: z.coerce
    .number()
    .int()
    .nonnegative('Reserved quantity must be non-negative')
    .default(0),
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
  quantityAvailable: z.coerce
    .number()
    .int()
    .nonnegative('Quantity must be non-negative')
    .default(0),
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
  discountPercentage: z.coerce
    .number()
    .min(0)
    .max(100, 'Discount must be between 0-100')
    .optional(),
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
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .nonnegative('Quantity cannot be negative'),
  reason: z.string().min(1, 'Reason is required'),
});

export type BatchQuantityAdjustmentFormData = z.infer<typeof batchQuantityAdjustmentFormSchema>;

// ============================================================================
// TRANSFER STOCK FORM SCHEMA
// ============================================================================

export const transferStockFormSchema = z
  .object({
    sourceWarehouseId: z.string().min(1, 'Source warehouse is required'),
    destinationWarehouseId: z.string().min(1, 'Destination warehouse is required'),
    notes: z.string().optional(),
  })
  .refine((data) => data.sourceWarehouseId !== data.destinationWarehouseId, {
    message: 'Source and destination warehouse must be different',
    path: ['destinationWarehouseId'],
  });

export type TransferStockFormData = z.infer<typeof transferStockFormSchema>;

// ============================================================================
// BUSINESS PARTNER - CUSTOMER FORM SCHEMA
// ============================================================================

export const customerFormSchema = z
  .object({
    name: z.string().min(1, 'Customer name is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: phoneSchema,
    customerType: z.enum(['retail', 'wholesale']),
    entityType: z.enum(['person', 'company']), // Person or Company entity
    birthDate: z.string().optional(), // For person entities (retail customers)
    npwp: z.string().optional(),
    creditLimit: z.coerce.number().min(0, 'Credit limit must be non-negative').optional(),
    paymentTermDays: z.coerce.number().min(0, 'Payment term days must be non-negative').optional(),
  })
  // Business Rule: At least one contact method (phone or email) is required
  .refine(
    (data) => {
      const hasPhone = data.phone && data.phone.trim().length > 0;
      const hasEmail = data.email && data.email.trim().length > 0;
      return hasPhone || hasEmail;
    },
    {
      message: 'Either phone number or email is required',
      path: ['phone'], // Show error on phone field (user can fill either)
    }
  );

export type CustomerFormData = z.infer<typeof customerFormSchema>;

// ============================================================================
// BUSINESS PARTNER - SUPPLIER FORM SCHEMA
// ============================================================================

export const supplierFormSchema = z
  .object({
    name: z.string().min(1, 'Supplier name is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: phoneSchema,
    entityType: z.enum(['person', 'company']), // Person or Company entity
    // Note: For company entity type, the "name" field IS the company name
    // Sales contacts are managed separately via supplierContactsApi
    npwp: z.string().optional(),
    paymentTermDays: z.coerce.number().min(0, 'Payment term days must be non-negative').optional(),
    // Note: leadTimeDays removed - tracked per purchase order in procurement service
    // See: docs/bounded-contexts/procurement/LEAD_TIME_TRACKING.md
    minimumOrderAmount: z.coerce
      .number()
      .min(0, 'Minimum order amount must be non-negative')
      .optional(),
  })
  // Business Rule: For person entity, at least one contact method (phone or email) is required
  // For company entity, contacts are managed via sales persons
  .refine(
    (data) => {
      // Company entities manage contacts via sales persons, so email/phone on supplier is optional
      if (data.entityType === 'company') {
        return true;
      }
      const hasPhone = data.phone && data.phone.trim().length > 0;
      const hasEmail = data.email && data.email.trim().length > 0;
      return hasPhone || hasEmail;
    },
    {
      message: 'Either phone number or email is required for person entity',
      path: ['phone'],
    }
  );

export type SupplierFormData = z.infer<typeof supplierFormSchema>;

export const supplierBankInfoFormSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  bankAccountNumber: z.string().min(10, 'Account number must be at least 10 characters'),
  bankAccountName: z.string().min(1, 'Account name is required'),
});

export type SupplierBankInfoFormData = z.infer<typeof supplierBankInfoFormSchema>;

// ============================================================================
// BUSINESS PARTNER - SUPPLIER CONTACT (SALES PERSON) FORM SCHEMA
// ============================================================================

// Required phone schema for sales persons - must have valid phone number
const requiredPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((val) => isValidPhoneNumber(val), {
    message:
      'Invalid phone number. Use format: +628xxx, 08xxx, 021xxx (ID) or +[country code][number]',
  });

export const supplierContactFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Sales person name is required')
    .min(2, 'Name must be at least 2 characters'),
  phone: requiredPhoneSchema,
});

export type SupplierContactFormData = z.infer<typeof supplierContactFormSchema>;

// ============================================================================
// BUSINESS PARTNER - EMPLOYEE FORM SCHEMA
// ============================================================================

/**
 * Indonesian KTP/NIK (National ID) validation
 * NIK format: 16 digits
 * Structure: PPKKCC DDMMYY XXXX
 * - PP: Province code (2 digits)
 * - KK: City/Regency code (2 digits)
 * - CC: District code (2 digits)
 * - DDMMYY: Birth date (6 digits, DD+40 for female)
 * - XXXX: Sequential number (4 digits)
 */
const ktpRegex = /^[0-9]{16}$/;

/**
 * Indonesian NPWP validation
 * Format: XX.XXX.XXX.X-XXX.XXX (with formatting) or 15 digits (without formatting)
 * Structure: 15 digits total
 */
const npwpFormattedRegex = /^[0-9]{2}\.[0-9]{3}\.[0-9]{3}\.[0-9]-[0-9]{3}\.[0-9]{3}$/;
const npwpDigitsOnlyRegex = /^[0-9]{15}$/;

function isValidNPWP(npwp: string): boolean {
  // Remove spaces
  const cleaned = npwp.replace(/\s/g, '');
  // Check formatted version or digits only
  return npwpFormattedRegex.test(cleaned) || npwpDigitsOnlyRegex.test(cleaned);
}

export const employeeFormSchema = z.object({
  // Name - required string
  name: z
    .string()
    .min(1, 'Employee name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),

  // Email - optional but must be valid if provided
  email: z.string().email('Invalid email address').optional().or(z.literal('')),

  // Phone - using shared phone schema (Indonesian mobile/landline or international)
  phone: phoneSchema,

  // Employee number - auto-generated by backend, not required from form
  // When provided (edit mode), it's read-only
  employeeNumber: z.string().optional(),

  // Department - required string
  department: z
    .string()
    .min(1, 'Department is required')
    .min(2, 'Department must be at least 2 characters')
    .max(50, 'Department must be less than 50 characters'),

  // Position - required string
  position: z
    .string()
    .min(1, 'Position is required')
    .min(2, 'Position must be at least 2 characters')
    .max(50, 'Position must be less than 50 characters'),

  // Manager ID - optional reference to another employee
  managerId: z.string().optional(),

  // Date of Birth - optional date string
  dateOfBirth: z.string().optional(),

  // Gender - optional enum
  gender: z.enum(['male', 'female']).optional(),

  // National ID (KTP/NIK) - exactly 16 digits
  nationalId: z
    .string()
    .optional()
    .refine((val) => !val || ktpRegex.test(val), {
      message: 'KTP/NIK must be exactly 16 digits',
    }),

  // NPWP - 15 digits, formatted as XX.XXX.XXX.X-XXX.XXX or just digits
  npwp: z
    .string()
    .optional()
    .refine((val) => !val || isValidNPWP(val), {
      message: 'NPWP must be 15 digits (format: XX.XXX.XXX.X-XXX.XXX)',
    }),

  // Join Date - optional date string
  joinDate: z.string().optional(),

  // Base Salary - required non-negative number with max limit
  baseSalary: z.coerce
    .number()
    .min(0, 'Base salary must be non-negative')
    .max(999999999999, 'Base salary cannot exceed Rp 999.999.999.999'),

  // Bank Info (for salary payment) - all optional but validated when provided
  bankName: z.string().max(50, 'Bank name must be less than 50 characters').optional(),

  bankAccountNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10,20}$/.test(val), {
      message: 'Bank account number must be 10-20 digits',
    }),

  bankAccountName: z.string().max(100, 'Account name must be less than 100 characters').optional(),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

// ============================================================================
// ACCOUNTING - CHART OF ACCOUNTS FORM SCHEMA
// ============================================================================

export const accountFormSchema = z
  .object({
    code: z
      .string()
      .min(4, 'Account code must be 4 digits')
      .max(4, 'Account code must be 4 digits')
      .regex(/^\d{4}$/, 'Account code must be exactly 4 digits'),
    name: z
      .string()
      .min(1, 'Account name is required')
      .min(2, 'Account name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters'),
    accountType: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense']),
    // Note: accountCategory is auto-derived from code by backend (PSAK-compliant)
    parentAccountId: z.string().optional().nullable(),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    taxType: z.string().max(50, 'Tax type must be less than 50 characters').optional(),
    isDetailAccount: z.boolean().default(true),
    status: z.enum(['Active', 'Inactive', 'Archived']).default('Active'),
    currency: z.string().default('IDR'),
    tags: z
      .array(
        z.string().min(1, 'Tag cannot be empty').max(30, 'Tag must be less than 30 characters')
      )
      .max(10, 'Maximum 10 tags allowed')
      .default([]),
  })
  // Business Rule: Account code must match account type range (PSAK-compliant)
  .refine(
    (data) => {
      const codeNum = Number.parseInt(data.code, 10);
      if (Number.isNaN(codeNum)) return true; // Let regex validation handle invalid codes

      const typeRanges: Record<string, [number, number]> = {
        Asset: [1000, 1999],
        Liability: [2000, 2999],
        Equity: [3000, 3999],
        Revenue: [4000, 4999],
        COGS: [5000, 5399],
        Expense: [6000, 8999],
      };

      const range = typeRanges[data.accountType];
      if (!range) return true;

      return codeNum >= range[0] && codeNum <= range[1];
    },
    {
      message: 'Account code must match account type range (e.g., 1000-1999 for Asset)',
      path: ['code'],
    }
  );

export type AccountFormData = z.infer<typeof accountFormSchema>;

// ============================================================================
// FORM VALIDATION HELPER
// ============================================================================

/**
 * Creates a TanStack Form validator function from a Zod schema.
 *
 * This is the clean way to integrate Zod validation with TanStack Form
 * when using schemas with .refine() or complex transformations that cause
 * type inference issues.
 *
 * @param schema - A Zod schema to use for validation
 * @returns A validation function compatible with TanStack Form's validators
 *
 * @example
 * const form = useForm({
 *   defaultValues: { name: '', email: '' },
 *   validators: {
 *     onChange: createFormValidator(customerFormSchema),
 *   },
 * });
 */
export function createFormValidator<TFormData>(schema: z.ZodType<TFormData>) {
  return ({ value }: { value: TFormData }) => {
    const result = schema.safeParse(value);
    if (result.success) {
      return undefined;
    }
    // Return field-level errors as a map
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { fields: fieldErrors };
  };
}
