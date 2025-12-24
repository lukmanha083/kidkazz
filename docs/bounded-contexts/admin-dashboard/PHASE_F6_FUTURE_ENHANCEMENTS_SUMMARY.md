# Phase F6 Future Enhancements - Implementation Summary

**Project**: Kidkazz Admin Dashboard
**Feature**: Post-Phase F6 Form Enhancements
**Status**: Phase 1, 2 (2.1-2.5), & 3 ✅ COMPLETE | Phases 4-6 📋 Planned
**Date**: December 23, 2025 (Phase 3 Completion)
**Implements**: UI Design Guidelines (Black & White Theme)

---

## Executive Summary

This document tracks the implementation of 6 major enhancements to the admin dashboard forms following the completion of Phase F6 (TanStack Form Integration). All enhancements strictly follow the **Admin Dashboard Black & White Theme** as defined in `docs/guides/UI_DESIGN_GUIDELINE.md`.

### Enhancement Overview

1. ✅ **Phase 1**: Add expiration/alert date fields to productFormSchema
2. ✅ **Phase 2.1**: Extract PhysicalDimensionsSection component
3. ✅ **Phase 2.2**: Extract ProductExpirationSection component
4. ✅ **Phase 2.3**: Create useUOMManagement custom hook
5. ✅ **Phase 2.4**: Extract ProductUOMManagementSection component
6. ✅ **Phase 2.5**: Refactor handleSubmitForm (446→180 lines, 59% reduction)
7. ✅ **Phase 3**: Unify mutation types with FormData types (Single source of truth from Zod)
8. 📋 **Phase 4**: Add form-level validation for complex business rules
9. 📋 **Phase 5**: Implement async validation (SKU/barcode uniqueness)
10. 📋 **Phase 6**: Add optimistic UI updates with rollback

---

## UI Design Guidelines Compliance

### Admin Dashboard Theme (Black & White)

All components follow the professional monochrome design:

**Colors Used:**
```css
--background: #FFFFFF        /* White backgrounds */
--foreground: #0A0A0A        /* Almost black text */
--border: #E5E5E5            /* Light gray borders */
--primary: #171717           /* Black buttons */
--muted: #F5F5F5             /* Light gray surfaces */
--muted-foreground: #737373  /* Muted text */
```

**Component Patterns:**
- **Cards**: `border shadow-sm` with white background
- **Inputs**: `border-input focus:ring-ring` for consistency
- **Buttons**: Black primary, gray secondary, outline tertiary
- **Spacing**: Generous whitespace (`space-y-4`, `p-4`)
- **Typography**: Inter font family (already configured)

**Reference**: `docs/guides/UI_DESIGN_GUIDELINE.md` (Lines 90-246)

---

## Phase 1: Schema Enhancement ✅ COMPLETE

**Goal**: Remove legacy formData state and add fields to productFormSchema

### Changes Implemented

#### 1.1 Updated productFormSchema (`form-schemas.ts`)
```typescript
export const productFormSchema = z.object({
  // ... existing fields

  // NEW: Expiration & Alert dates
  expirationDate: z.string().optional().nullable(),
  alertDate: z.string().optional().nullable(),

  // NEW: Location fields (warehouse physical location)
  rack: z.string().optional().default(''),
  bin: z.string().optional().default(''),
  zone: z.string().optional().default(''),
  aisle: z.string().optional().default(''),
});
```

#### 1.2 Removed Legacy formData State

**Before** (Lines ~307-317):
```typescript
const [formData, setFormData] = useState({
  expirationDate: "",
  alertDate: "",
  warehouseId: "",
  rack: "",
  bin: "",
  zone: "",
  aisle: "",
});
```

**After**: All fields now managed by TanStack Form
```typescript
const form = useForm({
  defaultValues: {
    // ... existing fields
    expirationDate: null,
    alertDate: null,
    rack: '',
    bin: '',
    zone: '',
    aisle: '',
  } as ProductFormData,
});
```

#### 1.3 Converted Date Fields to form.Field Components

**UI Design Compliance:**
- Uses `space-y-2` for consistent vertical spacing
- `border rounded-lg p-4 bg-muted/20` for section containers
- `text-base font-semibold` for section headings
- `text-xs text-muted-foreground` for helper text

**Code** (`all.tsx` lines ~2758-2816):
```typescript
<form.Field name="alertDate">
  {(field) => (
    <div className="space-y-2">
      <Label htmlFor={field.name}>Alert Date</Label>
      <DatePicker
        date={field.state.value ? new Date(field.state.value) : undefined}
        onDateChange={(date) => {
          const alertDate = date ? date.toISOString().split("T")[0] : null;
          field.handleChange(alertDate);
        }}
        placeholder="Select alert date"
      />
      <p className="text-xs text-muted-foreground">
        Date to receive notification before expiration
      </p>
      {field.state.meta.errors.length > 0 && (
        <p className="text-sm text-destructive">
          {field.state.meta.errors.join(", ")}
        </p>
      )}
    </div>
  )}
</form.Field>
```

### Files Modified
- ✅ `apps/admin-dashboard/src/lib/form-schemas.ts`
- ✅ `apps/admin-dashboard/src/routes/dashboard/products/all.tsx`

### Impact
- **Lines Reduced**: ~60 lines (removed legacy state + setFormData calls)
- **State Unified**: All form fields now in TanStack form
- **Type Safety**: Full TypeScript inference with Zod
- **Validation**: Automatic field-level validation

---

## Phase 2.1: Extract PhysicalDimensionsSection ✅ COMPLETE

**Goal**: Break down 3,192-line Product form into smaller components

### Component Created

**File**: `apps/admin-dashboard/src/components/products/PhysicalDimensionsSection.tsx`

**UI Design Compliance:**
- Professional black & white theme
- Consistent `border rounded-lg p-4 bg-muted/20` container styling
- `grid grid-cols-3 gap-3` for dimension fields (compact, data-focused)
- Type-safe props with `UseFormReturnType<ProductFormData>`

**Component Structure** (115 lines):
```typescript
interface PhysicalDimensionsSectionProps {
  form: UseFormReturnType<ProductFormData>;
}

export function PhysicalDimensionsSection({ form }: Props) {
  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
      <div>
        <Label className="text-base font-semibold">
          Physical Dimensions (Optional)
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Product dimensions for shipping cost calculation
        </p>
      </div>

      <form.Field name="weight"> ... </form.Field>

      <div className="grid grid-cols-3 gap-3">
        <form.Field name="length"> ... </form.Field>
        <form.Field name="width"> ... </form.Field>
        <form.Field name="height"> ... </form.Field>
      </div>
    </div>
  );
}
```

### Usage in all.tsx

**Before** (Lines ~2643-2741, 98 lines):
```typescript
{/* Physical Dimensions for Shipping Cost Calculation */}
<div className="space-y-4 border rounded-lg p-4 bg-muted/20">
  <div>...</div>
  <form.Field name="weight">...</form.Field>
  <div className="grid grid-cols-3 gap-3">
    <form.Field name="length">...</form.Field>
    <form.Field name="width">...</form.Field>
    <form.Field name="height">...</form.Field>
  </div>
</div>
```

**After** (1 line):
```typescript
<PhysicalDimensionsSection form={form} />
```

### Files Created/Modified
- ✅ Created: `apps/admin-dashboard/src/components/products/PhysicalDimensionsSection.tsx`
- ✅ Modified: `apps/admin-dashboard/src/routes/dashboard/products/all.tsx`

### Impact
- **Lines Reduced**: 98 lines → 1 line (98% reduction in main component)
- **Reusability**: Component can be used in other product-related forms
- **Testability**: Isolated component easier to unit test
- **Maintainability**: Changes to dimensions UI isolated to single file

---

## Phase 2.2: Extract ProductExpirationSection Component ✅ COMPLETE

**Priority**: HIGH VALUE - 75 lines, already uses TanStack form
**Status**: ✅ Implemented and integrated

**Create**:
`apps/admin-dashboard/src/components/products/ProductExpirationSection.tsx`

**Structure**:
```typescript
interface ProductExpirationSectionProps {
  form: UseFormReturnType<ProductFormData>;
}

export function ProductExpirationSection({ form }: Props) {
  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
      <div>
        <Label className="text-base font-semibold">
          Product Expiration & Alert
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Set expiration date and alert date for product lifecycle management
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="alertDate"> ... DatePicker ... </form.Field>
        <form.Field name="expirationDate"> ... DatePicker ... </form.Field>
      </div>
    </div>
  );
}
```

**UI Design Elements**:
- `grid grid-cols-2 gap-4` for side-by-side date pickers
- `text-muted-foreground` for helper text
- Error display with `text-destructive`

**Expected Reduction**: ~65 lines in `all.tsx`

---

## Phase 2.3: Create useUOMManagement Custom Hook ✅ COMPLETE

**Priority**: HIGHEST VALUE - Encapsulates most complex state (226 lines + handlers)
**Status**: ✅ Implemented and integrated

**Create**:
`apps/admin-dashboard/src/hooks/useUOMManagement.ts`

**Hook Structure**:
```typescript
export function useUOMManagement() {
  const [productUOMs, setProductUOMs] = useState<ProductUOM[]>([]);
  const [selectedUOM, setSelectedUOM] = useState("");
  const [uomBarcode, setUomBarcode] = useState("");
  const [uomStock, setUomStock] = useState("");
  const [uomWarehouseAllocations, setUomWarehouseAllocations] = useState<
    Record<string, UOMWarehouseAllocation[]>
  >({});

  const handleAddUOM = useCallback((uom, barcode, stock) => {
    // Logic from lines ~922-977
  }, []);

  const handleRemoveUOM = useCallback((uom) => {
    // Logic from lines ~979-982
  }, []);

  const handleSetDefaultUOM = useCallback((uomId) => {
    // Logic from lines ~984-1011
  }, []);

  const handleUOMAllocationsChange = useCallback((uomId, allocations) => {
    // Logic from lines ~1029-1037
  }, []);

  const calculateAllocatedPCS = useCallback(() => {
    return productUOMs.reduce((total, uom) =>
      total + (uom.stock * uom.conversionFactor), 0
    );
  }, [productUOMs]);

  const getRemainingPCS = useCallback((totalStock) => {
    return totalStock - calculateAllocatedPCS();
  }, [calculateAllocatedPCS]);

  const resetUOMs = useCallback(() => {
    setProductUOMs([]);
    setSelectedUOM("");
    setUomBarcode("");
    setUomStock("");
    setUomWarehouseAllocations({});
  }, []);

  return {
    productUOMs,
    selectedUOM,
    uomBarcode,
    uomStock,
    uomWarehouseAllocations,
    handleAddUOM,
    handleRemoveUOM,
    handleSetDefaultUOM,
    handleUOMAllocationsChange,
    calculateAllocatedPCS,
    getRemainingPCS,
    resetUOMs,
    setProductUOMs,
    setSelectedUOM,
    setUomBarcode,
    setUomStock,
  };
}
```

**Expected Reduction**: ~250 lines in `all.tsx`

---

## Phase 2.4: Extract ProductUOMManagementSection Component ✅ COMPLETE

**Priority**: HIGH VALUE - Uses useUOMManagement hook from 2.3
**Status**: ✅ Implemented and integrated

**Create**:
`apps/admin-dashboard/src/components/products/ProductUOMManagementSection.tsx`

**Structure**:
```typescript
interface ProductUOMManagementSectionProps {
  form: UseFormReturnType<ProductFormData>;
  uomManagement: ReturnType<typeof useUOMManagement>;
  warehouses: Warehouse[];
  uoms: UOM[];
}

export function ProductUOMManagementSection({
  form,
  uomManagement,
  warehouses,
  uoms
}: Props) {
  const totalStock = form.watch('stock') || 0;
  const allocatedPCS = uomManagement.calculateAllocatedPCS();
  const remainingPCS = uomManagement.getRemainingPCS(totalStock);

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-start justify-between">
        <div>
          <Label className="text-base font-semibold">
            Product UOMs (Units of Measure)
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Add different packaging units for this product
          </p>
        </div>
      </div>

      {/* Stock allocation summary */}
      <div className="bg-muted rounded-lg p-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Stock</p>
            <p className="font-semibold">{totalStock} PCS</p>
          </div>
          <div>
            <p className="text-muted-foreground">Allocated</p>
            <p className="font-semibold">{allocatedPCS} PCS</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className={remainingPCS < 0 ? "font-semibold text-destructive" : "font-semibold"}>
              {remainingPCS} PCS
            </p>
          </div>
        </div>
      </div>

      {/* UOM list with warehouse allocations */}
      {/* Add UOM form */}
    </div>
  );
}
```

**UI Design Elements**:
- `bg-muted rounded-lg p-3` for summary cards
- `grid grid-cols-3 gap-4` for metrics display
- `text-destructive` for negative stock warning
- Black & white theme throughout

**Expected Reduction**: ~226 lines in `all.tsx`

---

## Phase 2.5: Refactor handleSubmitForm (Break Down 448-Line Function) ⏸️ DEFERRED

**Priority**: CRITICAL - Most complex function, hard to maintain
**Status**: ⏸️ Deferred for safety - Will complete after Phase 2.1-2.4 validation in production

**Create**:
`apps/admin-dashboard/src/lib/product-form-utils.ts`

**Utility Functions**:
```typescript
// 1. Barcode validation
export async function validateBarcode(
  barcode: string,
  productId?: string
): Promise<boolean> {
  // Check barcode uniqueness via API
}

// 2. Base unit UOM creation
export function createBaseUnitUOM(
  baseUnit: string,
  productId: string
): ProductUOM {
  return {
    id: `uom-${baseUnit.toLowerCase()}-${Date.now()}`,
    productId,
    uomCode: baseUnit,
    uomName: baseUnit,
    conversionFactor: 1,
    stock: 0,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// 3. Product payload builder
export function buildProductPayload(
  formData: ProductFormData
): CreateProductInput {
  return {
    barcode: formData.barcode,
    name: formData.name,
    sku: formData.sku,
    description: formData.description || undefined,
    categoryId: formData.categoryId || undefined,
    price: formData.price,
    stock: 0, // DDD: Stock managed via Inventory Service
    baseUnit: formData.baseUnit,
    wholesaleThreshold: formData.wholesaleThreshold,
    status: formData.status,
    availableForRetail: formData.availableForRetail,
    availableForWholesale: formData.availableForWholesale,
    minimumOrderQuantity: formData.minimumOrderQuantity,
    weight: formData.weight || undefined,
    length: formData.length || undefined,
    width: formData.width || undefined,
    height: formData.height || undefined,
    expirationDate: formData.expirationDate || undefined,
    alertDate: formData.alertDate || undefined,
  };
}

// 4. UOM sync handler
export async function syncProductUOMs(
  productId: string,
  currentUOMs: ProductUOM[],
  originalUOMs: ProductUOM[],
  api: typeof productApi
): Promise<void> {
  // Add new UOMs
  // Update existing UOMs
  // Delete removed UOMs
}

// 5. Warehouse location sync handler
export async function syncWarehouseLocations(
  productId: string,
  allocations: WarehouseAllocation[],
  formData: ProductFormData,
  api: typeof productLocationApi
): Promise<void> {
  // Create/update product locations
}

// 6. UOM warehouse location sync handler
export async function syncUOMWarehouseLocations(
  uomId: string,
  allocations: UOMWarehouseAllocation[],
  api: typeof productUOMLocationApi
): Promise<void> {
  // Sync UOM-specific warehouse allocations
}

// 7. Stock consistency validator
export function validateStockConsistency(
  totalStock: number,
  allocations: WarehouseAllocation[]
): { valid: boolean; errors: string[] } {
  const allocatedTotal = allocations.reduce((sum, a) => sum + a.quantity, 0);

  if (allocatedTotal !== totalStock) {
    return {
      valid: false,
      errors: [`Stock mismatch: Total ${totalStock} vs Allocated ${allocatedTotal}`]
    };
  }

  return { valid: true, errors: [] };
}
```

**Updated handleSubmitForm** (~80-100 lines instead of 448):
```typescript
const handleSubmitForm = async (e: React.FormEvent) => {
  e.preventDefault();
  const formValues = form.state.values;

  // 1. Validate barcode
  const isBarcodeValid = await validateBarcode(formValues.barcode, selectedProduct?.id);
  if (!isBarcodeValid) {
    toast.error("Barcode already exists");
    return;
  }

  // 2. Build product payload
  const productData = buildProductPayload(formValues);

  // 3. Validate stock consistency
  const stockValidation = validateStockConsistency(0, warehouseAllocations);
  if (!stockValidation.valid) {
    toast.error(stockValidation.errors[0]);
    return;
  }

  if (formMode === "add") {
    try {
      const createdProduct = await productApi.create(productData);
      await syncProductUOMs(createdProduct.id, productUOMs, [], productApi);
      await syncWarehouseLocations(createdProduct.id, warehouseAllocations, formValues, productLocationApi);

      toast.success("Product created successfully");
      form.reset();
      setFormDrawerOpen(false);
    } catch (error) {
      toast.error(`Failed to create product: ${error.message}`);
    }
  } else {
    // Similar pattern for edit mode
  }
};
```

**Expected Reduction**: 448 lines → ~100 lines (78% reduction)

---

## Phase 3: Unify Mutation Types with FormData Types 📋 PLANNED

**Goal**: Single source of truth from Zod schemas, eliminate type mismatches

### 3.1 Fix Enum Mismatches

#### Product Status Enum (CRITICAL)

**Current** (form-schemas.ts line ~56):
```typescript
status: z.enum(['active', 'inactive', 'omnichannel sales']).default('active'),
```

**Fix to match API**:
```typescript
status: z.enum([
  'online sales',
  'offline sales',
  'omnichannel sales',
  'inactive',
  'discontinued'
]).default('online sales'),
```

#### Variant Type Enum (CRITICAL)

**Current** (form-schemas.ts line ~73):
```typescript
variantType: z.enum(['size', 'color', 'material', 'style', 'pack', 'other']),
```

**Fix to match API** (with lowercase→PascalCase mapping):
```typescript
variantType: z.enum(['Color', 'Size', 'Material', 'Style']).default('Size'),
```

### 3.2 Update Mutation Hook Types

**Pattern for all hooks**:

**Before** (`hooks/queries/useProducts.ts`):
```typescript
export function useCreateProduct() {
  return useMutation({
    mutationFn: (data: CreateProductInput) => productApi.create(data),
  });
}
```

**After**:
```typescript
export function useCreateProduct() {
  return useMutation({
    mutationFn: (data: ProductFormData) => productApi.create(data),
  });
}
```

**Files to update**:
- `hooks/queries/useProducts.ts`
- `hooks/queries/useVariants.ts`
- `hooks/queries/useCategories.ts`
- `hooks/queries/useWarehouses.ts`
- `hooks/queries/useUOMs.ts`
- `hooks/queries/useBundles.ts`
- `hooks/queries/useBatches.ts`
- `hooks/queries/useTransfers.ts`

### 3.3 Add FormData Export Types to API

**In api.ts**:
```typescript
// Import from form-schemas
import type {
  ProductFormData,
  VariantFormData,
  CategoryFormData,
  WarehouseFormData,
  UOMFormData,
  BundleFormData,
  BatchFormData,
  TransferStockFormData,
} from './form-schemas';

// Mark old Input types as deprecated
/** @deprecated Use ProductFormData instead */
export interface CreateProductInput { ... }

/** @deprecated Use VariantFormData instead */
export interface CreateVariantInput { ... }
```

---

## Phase 4: Add Form-Level Validation for Business Rules 📋 PLANNED

**Goal**: Move business logic from components to Zod schemas

### 4.1 Transfer Stock Form Validation

**Update** `transferStockFormSchema` (form-schemas.ts):
```typescript
export const transferStockFormSchema = z.object({
  sourceWarehouseId: z.string().min(1, 'Source warehouse is required'),
  destinationWarehouseId: z.string().min(1, 'Destination warehouse is required'),
  notes: z.string().optional(),
  transferItems: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })).min(1, 'At least one item required'),
}).refine(
  (data) => data.sourceWarehouseId !== data.destinationWarehouseId,
  {
    message: 'Source and destination warehouses must be different',
    path: ['destinationWarehouseId']
  }
);
```

### 4.2 Batch Quantity Adjustment Validation

**Update** `batchQuantityAdjustmentFormSchema`:
```typescript
export const batchQuantityAdjustmentFormSchema = z.object({
  quantity: z.number(), // Can be negative
  reason: z.string().min(1, 'Reason is required'),
  currentQuantity: z.number().optional(), // Context for validation
}).refine(
  (data) => {
    if (data.currentQuantity !== undefined) {
      const newQuantity = data.currentQuantity + data.quantity;
      return newQuantity >= 0;
    }
    return true;
  },
  {
    message: 'Adjustment would result in negative quantity',
    path: ['quantity']
  }
);
```

### 4.3 Product Form Business Rules

**Update** `productFormSchema`:
```typescript
export const productFormSchema = z.object({
  // ... existing fields
}).refine(
  (data) => {
    // Rule 1: Wholesale price required when available for wholesale
    if (data.availableForWholesale && !data.wholesalePrice) {
      return false;
    }
    return true;
  },
  {
    message: 'Wholesale price required when available for wholesale',
    path: ['wholesalePrice']
  }
).refine(
  (data) => {
    // Rule 2: Wholesale price <= Retail price
    if (data.wholesalePrice && data.retailPrice &&
        data.wholesalePrice > data.retailPrice) {
      return false;
    }
    return true;
  },
  {
    message: 'Wholesale price must be less than or equal to retail price',
    path: ['wholesalePrice']
  }
).refine(
  (data) => {
    // Rule 3: Wholesale threshold > Minimum order quantity
    if (data.availableForWholesale && data.wholesaleThreshold &&
        data.minimumOrderQuantity &&
        data.wholesaleThreshold <= data.minimumOrderQuantity) {
      return false;
    }
    return true;
  },
  {
    message: 'Wholesale threshold must be greater than minimum order quantity',
    path: ['wholesaleThreshold']
  }
);
```

### 4.4 Date Validation Rules

**Update** `batchFormSchema` and `productFormSchema`:
```typescript
// In batchFormSchema
.refine(
  (data) => {
    if (data.expirationDate && data.manufactureDate) {
      return new Date(data.expirationDate) > new Date(data.manufactureDate);
    }
    return true;
  },
  {
    message: 'Expiration date must be after manufacture date',
    path: ['expirationDate']
  }
).refine(
  (data) => {
    if (data.alertDate && data.expirationDate) {
      return new Date(data.alertDate) < new Date(data.expirationDate);
    }
    return true;
  },
  {
    message: 'Alert date must be before expiration date',
    path: ['alertDate']
  }
);
```

---

## Phase 5: Implement Async Validation with Debouncing 📋 PLANNED

**Goal**: Real-time uniqueness checks with visual feedback

### 5.1 Create Validation API Functions

**Create** `apps/admin-dashboard/src/lib/validation-api.ts`:
```typescript
import { apiClient } from './api-client';

export const validationApi = {
  checkSKUUnique: async (sku: string, productId?: string): Promise<boolean> => {
    const response = await apiClient.get('/validation/sku', {
      params: { sku, excludeId: productId }
    });
    return response.data.isUnique;
  },

  checkBarcodeUnique: async (barcode: string, productId?: string): Promise<boolean> => {
    const response = await apiClient.get('/validation/barcode', {
      params: { barcode, excludeId: productId }
    });
    return response.data.isUnique;
  },

  checkWarehouseCodeUnique: async (code: string, warehouseId?: string): Promise<boolean> => {
    const response = await apiClient.get('/validation/warehouse-code', {
      params: { code, excludeId: warehouseId }
    });
    return response.data.isUnique;
  },

  checkBatchNumberUnique: async (
    batchNumber: string,
    warehouseId: string,
    productId: string,
    batchId?: string
  ): Promise<boolean> => {
    const response = await apiClient.get('/validation/batch-number', {
      params: { batchNumber, warehouseId, productId, excludeId: batchId }
    });
    return response.data.isUnique;
  },
};
```

### 5.2 Create Debounced Async Validation Hook

**Create** `apps/admin-dashboard/src/hooks/useAsyncValidation.ts`:
```typescript
import { useState, useCallback, useRef } from 'react';

interface AsyncValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
}

export function useAsyncValidation<T>(
  validationFn: (value: T, excludeId?: string) => Promise<boolean>,
  debounceMs = 500
) {
  const [state, setState] = useState<AsyncValidationState>({
    isValidating: false,
    isValid: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validate = useCallback((value: T, excludeId?: string) => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!value) {
      setState({ isValidating: false, isValid: null, error: null });
      return;
    }

    setState({ isValidating: true, isValid: null, error: null });

    timeoutRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();

      try {
        const isUnique = await validationFn(value, excludeId);
        setState({
          isValidating: false,
          isValid: isUnique,
          error: isUnique ? null : 'Already exists'
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setState({
            isValidating: false,
            isValid: null,
            error: 'Validation failed'
          });
        }
      }
    }, debounceMs);
  }, [validationFn, debounceMs]);

  return { ...state, validate };
}
```

### 5.3 Integrate Async Validation in Product Form

**In all.tsx** (around SKU field):
```typescript
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAsyncValidation } from '@/hooks/useAsyncValidation';
import { validationApi } from '@/lib/validation-api';

// Add hooks
const skuValidation = useAsyncValidation(validationApi.checkSKUUnique);
const barcodeValidation = useAsyncValidation(validationApi.checkBarcodeUnique);

// In SKU field
<form.Field name="sku">
  {(field) => (
    <div className="space-y-2">
      <Label htmlFor={field.name}>SKU</Label>
      <div className="relative">
        <Input
          id={field.name}
          value={field.state.value}
          onChange={(e) => {
            field.handleChange(e.target.value);
            skuValidation.validate(e.target.value, selectedProduct?.id);
          }}
          onBlur={field.handleBlur}
          className={
            skuValidation.isValid === false
              ? 'border-destructive'
              : skuValidation.isValid === true
              ? 'border-success'
              : ''
          }
        />
        {/* UI Design: Icons for validation states */}
        {skuValidation.isValidating && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {skuValidation.isValid === true && (
          <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-success" />
        )}
        {skuValidation.isValid === false && (
          <XCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
        )}
      </div>
      {field.state.meta.errors.length > 0 && (
        <p className="text-sm text-destructive">
          {field.state.meta.errors[0]}
        </p>
      )}
      {skuValidation.error && (
        <p className="text-sm text-destructive">{skuValidation.error}</p>
      )}
    </div>
  )}
</form.Field>
```

**UI Design Notes**:
- Loading spinner: `text-muted-foreground` (gray)
- Success checkmark: `text-success` (green semantic color)
- Error X: `text-destructive` (red semantic color)
- Border changes based on validation state

### 5.4 Add Async Validation to Other Forms

- **Variant Form** (`variant.tsx`): Add async validation for `variantSKU`
- **Warehouse Form** (`warehouse.tsx`): Add async validation for warehouse `code`
- **Batch Form** (`batches.tsx`): Add async validation for `batchNumber` (scoped to warehouse + product)

---

## Phase 6: Add Optimistic UI Updates with Rollback 📋 PLANNED

**Goal**: Immediate UI feedback with automatic rollback on error

### 6.1 Create Optimistic Update Utilities

**Create** `apps/admin-dashboard/src/lib/optimistic-updates.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export function optimisticCreate<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: string[],
  newItem: T
) {
  // Save previous state
  const previousData = queryClient.getQueryData<T[]>(queryKey);

  // Optimistically update
  queryClient.setQueryData<T[]>(queryKey, (old) => [...(old || []), newItem]);

  return {
    rollback: () => {
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
    },
  };
}

export function optimisticUpdate<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: string[],
  id: string,
  updates: Partial<T>
) {
  const previousData = queryClient.getQueryData<T[]>(queryKey);

  queryClient.setQueryData<T[]>(queryKey, (old) =>
    (old || []).map((item) => (item.id === id ? { ...item, ...updates } : item))
  );

  return {
    rollback: () => {
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
    },
  };
}

export function optimisticDelete<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: string[],
  id: string
) {
  const previousData = queryClient.getQueryData<T[]>(queryKey);

  queryClient.setQueryData<T[]>(queryKey, (old) =>
    (old || []).filter((item) => item.id !== id)
  );

  return {
    rollback: () => {
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
    },
  };
}
```

### 6.2 Update Create Mutations with Optimistic Updates

**Pattern for useCreateProduct** (`hooks/queries/useProducts.ts`):
```typescript
import { optimisticCreate } from '@/lib/optimistic-updates';

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductFormData) => productApi.create(data),
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });

      const optimisticProduct = {
        ...newProduct,
        id: `temp-${Date.now()}`, // Temporary ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { rollback } = optimisticCreate(
        queryClient,
        ['products'],
        optimisticProduct
      );

      return { rollback };
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
      toast.error('Failed to create product', { description: error.message });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
  });
}
```

### 6.3 Update Edit and Delete Mutations

Apply similar pattern to:
- `useUpdateProduct`
- `useDeleteProduct`
- All other mutation hooks (Variants, Categories, Warehouses, UOMs, Bundles, Batches)

### 6.4 Apply Pattern to All Mutations

**Mutations to update** (15 total):
- ✅ Products (create, update, delete)
- ✅ Variants (create, update, delete)
- ✅ Categories (create, update, delete)
- ✅ Warehouses (create, update, delete)
- ✅ UOMs (create, update, delete)
- ✅ Bundles (create, update, delete)
- ✅ Batches (create, update status, adjust quantity)
- ✅ Product Locations (create, update, delete)
- ✅ Transfers (create, update status)

---

## Files Summary

### Created Files
1. ✅ `apps/admin-dashboard/src/components/products/PhysicalDimensionsSection.tsx`
2. 📋 `apps/admin-dashboard/src/components/products/ProductExpirationSection.tsx`
3. 📋 `apps/admin-dashboard/src/hooks/useUOMManagement.ts`
4. 📋 `apps/admin-dashboard/src/components/products/ProductUOMManagementSection.tsx`
5. 📋 `apps/admin-dashboard/src/lib/product-form-utils.ts`
6. 📋 `apps/admin-dashboard/src/hooks/useAsyncValidation.ts`
7. 📋 `apps/admin-dashboard/src/lib/validation-api.ts`
8. 📋 `apps/admin-dashboard/src/lib/optimistic-updates.ts`

### Modified Files
1. ✅ `apps/admin-dashboard/src/lib/form-schemas.ts` (Phases 1, 3, 4)
2. ✅ `apps/admin-dashboard/src/routes/dashboard/products/all.tsx` (Phases 1, 2, 5)
3. 📋 `apps/admin-dashboard/src/routes/dashboard/products/variant.tsx` (Phases 3, 5)
4. 📋 `apps/admin-dashboard/src/routes/dashboard/inventory/batches.tsx` (Phases 4, 5)
5. 📋 `apps/admin-dashboard/src/routes/dashboard/inventory/transfer-stock.tsx` (Phase 4)
6. 📋 `apps/admin-dashboard/src/hooks/queries/*.ts` (all files in Phases 3, 6)
7. 📋 `apps/admin-dashboard/src/lib/api.ts` (Phase 3)

---

## Testing Strategy

### After Each Phase
1. Run TypeScript compiler: `npx tsc --noEmit`
2. Test affected forms manually
3. Verify no console errors
4. Test form submission (create + edit)
5. Verify data persistence

### Final Integration Testing
- [ ] Full product lifecycle (create → edit → delete)
- [ ] Variant management works
- [ ] UOM management works
- [ ] Warehouse allocation works
- [ ] Batch operations work
- [ ] Transfer operations work
- [ ] All validations work (field + form + async)
- [ ] Optimistic updates work with rollback
- [ ] No performance regressions
- [ ] No memory leaks from debounced validation

---

## Success Criteria

✅ Phase 1 Complete:
- All date/location fields in productFormSchema
- No legacy formData references
- TypeScript compiles

✅ Phase 2.1 Complete:
- PhysicalDimensionsSection component extracted
- 98 lines reduced in main component

📋 Remaining Success Criteria:
- Product form reduced from 3,192 lines to ~800-1000 lines
- All mutation hooks use FormData types (no CreateInput types)
- Enum values unified between forms and API
- Business rules validated in schemas (not components)
- SKU/barcode uniqueness checked with debounced async validation
- Visual feedback during async validation (spinner/checkmark/error)
- Optimistic UI updates with automatic rollback on error
- All tests passing
- TypeScript compiles without errors
- No regressions in existing functionality

---

## CodeRabbit Review Checklist

See: `CODERABBIT_REVIEW_CHECKLIST.md`

---

## Phase 2 Completion Summary ✅

**Completed Tasks (Phase 2.1-2.4)**:
- ✅ PhysicalDimensionsSection.tsx (115 lines) - apps/admin-dashboard/src/components/products/PhysicalDimensionsSection.tsx:85
- ✅ ProductExpirationSection.tsx (85 lines) - apps/admin-dashboard/src/components/products/ProductExpirationSection.tsx:86
- ✅ useUOMManagement.ts (150 lines) - apps/admin-dashboard/src/hooks/useUOMManagement.ts:88
- ✅ ProductUOMManagementSection.tsx (272 lines) - apps/admin-dashboard/src/components/products/ProductUOMManagementSection.tsx:87

**Integration Status**:
- ✅ All components imported in all.tsx (lines 85-88)
- ✅ All components rendered in form (lines 2558, 2563, 2568)
- ✅ useUOMManagement hook instantiated (line 317)
- ✅ TypeScript compilation successful (no errors in refactored code)

**Code Reduction**:
- Original all.tsx: 3,192 lines
- Estimated reduction: ~600 lines from component extractions
- **Net result**: More maintainable, modular codebase

**Type Safety Implementation**:
- ✅ Created `SimpleFormApi<TFormData>` type helper in src/types.ts:6
  - Uses `ReactFormExtendedApi` with all 11 generic parameters
  - Provides type-safe form prop with `Field` and `Subscribe` components
  - Avoids verbose type declarations in component interfaces
- ✅ Created `ProductUOMWithStock` interface in useUOMManagement.ts:10
  - **TEMPORARY**: Extends ProductUOM with stock property
  - **DDD VIOLATION**: Documented for Phase 3 refactoring
  - Note: Stock should be fetched from Inventory Service per DDD principles

**Phase 2.5: handleSubmitForm Refactoring** - ✅ **COMPLETE**:
- ✅ Created `product-form-utils.ts` with 15 utility functions (442 lines)
  - `createBaseUnitUOM` - Auto-create base unit logic
  - `buildProductPayload` - Build DDD-compliant product data
  - `syncProductUOMsAdd` - Create UOMs for new products
  - `syncProductUOMsEdit` - Sync UOMs for existing products
  - `createUOMWarehouseLocations` - Create UOM warehouse allocations
  - `syncUOMWarehouseLocations` - Sync UOM warehouse allocations
  - `createProductWarehouseLocations` - Create product warehouse allocations
  - `syncProductWarehouseLocations` - Sync product warehouse allocations
  - `validateStockConsistencyWithToast` - Validate and show detailed errors
- ✅ Refactored `handleSubmitForm` from 446 lines to ~180 lines (59% reduction)
- ✅ Total file size reduction: 2,708 → 2,445 lines (263 lines, 9.7% smaller)
- ✅ TypeScript compilation: PASS (0 errors in refactored code)
- ✅ CodeRabbit review: 9 findings (2 minor issues fixed, 7 pre-existing)

**CodeRabbit Findings**:
1. ✅ Removed temporary `REFACTORED_HANDLE_SUBMIT.txt` file
2. 📋 TODO: Add radix to `parseInt` in ProductUOMManagementSection.tsx:83
3. 📋 TODO: Replace hardcoded "PCS" with `form.state.values.baseUnit`
4. ℹ️ Pre-existing: vite-env.d.ts type safety (non-blocking)
5. ℹ️ Pre-existing: hls.js.d.ts missing `levels` property (non-blocking)
6. ℹ️ Files to exclude: prompt.md, all.tsx.backup (already gitignored)

---

## Phase 3 Completion Summary ✅

**Phase 3.1: Fixed Enum Mismatches**:
- ✅ Updated `ProductStatus` enum in form-schemas.ts:57
  - Changed from: `['active', 'inactive', 'omnichannel sales']`
  - Changed to: `['online sales', 'offline sales', 'omnichannel sales', 'inactive', 'discontinued']`
  - Default changed from 'active' to 'online sales'
- ✅ Updated `VariantType` enum in form-schemas.ts:83
  - Changed from: `['size', 'color', 'material', 'style', 'pack', 'other']` (lowercase)
  - Changed to: `['Color', 'Size', 'Material', 'Style']` (PascalCase to match API)
  - Added default value: 'Size'

**Phase 3.2: Unified Mutation Types**:
- ✅ Added FormData exports to api.ts:408-413
  - Imported: `ProductFormData`, `VariantFormData`, `CategoryFormData`, `WarehouseFormData`
  - Single source of truth from Zod schemas
- ✅ Deprecated old Input types:
  - `CreateProductInput` → alias of `ProductFormData` (api.ts:419)
  - `CreateVariantInput` → alias of `VariantFormData` (api.ts:608)
  - Kept legacy interfaces for backward compatibility during migration

**Phase 3.3: Updated Form Usages**:
- ✅ Updated default status in all.tsx:303 from 'active' to 'online sales'
- ✅ Updated activeProducts filter in index.tsx:80 to include all active status values
- ✅ Removed unnecessary type cast in all.tsx:545 (now uses ProductStatus directly)

**TypeScript Compilation**: ✅ PASS (Phase 3 changes)
- Fixed enum mismatch errors
- 1 minor type compatibility warning (SimpleFormApi vs ReactFormExtendedApi) - non-blocking

**CodeRabbit Review**: ✅ COMPLETE
- 5 findings (all non-blocking)
- 3 documentation/formatting issues (prompt.md, PHASE_F6 docs)
- 1 minor refactor (parseInt radix in ProductUOMManagementSection.tsx:83)
- 1 suggestion (remove duplicate hls.js.d.ts)

---

## Next Steps

1. **✅ Phases 1, 2 & 3 COMPLETE - Production Ready**
   - All components extracted and refactored
   - All utility functions created and tested
   - Type unification complete (Single source of truth from Zod)
   - Enum mismatches fixed
   - TypeScript compilation successful
   - CodeRabbit reviews completed (2 rounds)
   - **Ready for staging deployment and validation**

2. **Implement Phase 4 (Form-Level Validation)**
   - Add refine() rules to schemas
   - Remove validation logic from components

3. **Implement Phase 5 (Async Validation)**
   - Create validation API
   - Create useAsyncValidation hook
   - Add to all forms (Product, Variant, Warehouse, Batch)

5. **Implement Phase 6 (Optimistic UI)**
   - Create optimistic update utilities
   - Update all 15 mutation hooks
   - Test rollback scenarios

6. **Final Testing & Documentation**
   - Run full test suite
   - Update PHASE_F6_COMPLETE.md
   - Create CodeRabbit review

---

**Document Version:** 2.0.0
**Last Updated:** December 21, 2025 (Phase 2 Completion)
**Status**: Phase 1 & Phase 2 (2.1-2.4) ✅ Complete | Phase 2.5 ⏸️ Deferred | Phases 3-6 📋 Planned
