# Multi-Warehouse Refactoring Plan

## Overview

This document outlines the refactoring plan to implement multi-warehouse support for products, bundles, and variants as defined in Business Rule #9.

## Current Status

### Products ✅ Partially Implemented
- **Current Implementation**: Products can have multiple warehouse locations via `productLocations` array
- **Form Limitation**: Product form only shows single warehouse selector
- **What Works**:
  - `productLocationApi.create()` can create multiple locations
  - Product detail view shows all warehouse locations (lines 1292-1338 in `all.tsx`)
  - API supports multiple warehouse allocations

### Bundles ❌ Not Implemented
- **Current State**: Bundles track stock globally, not per warehouse
- **Missing**: Warehouse allocation UI and API integration
- **Impact**: Cannot determine which warehouse a bundle is assembled in

### Variants ❌ Not Implemented
- **Current State**: Variants track stock globally, not per warehouse
- **Missing**: Warehouse allocation UI and API integration
- **Impact**: Cannot track variant stock per warehouse location

## Required Changes

### 1. Backend API Changes (Product Service)

**Required Endpoints**:
```typescript
// Get product stock breakdown by warehouse
GET /api/products/{productId}/warehouse-stock
Response: {
  productId: string;
  warehouses: [
    { warehouseId: string; warehouseName: string; quantity: number; }
  ];
  totalStock: number;
}

// Bulk update product locations
POST /api/products/{productId}/locations/bulk
Body: {
  locations: [
    { warehouseId: string; quantity: number; rack?: string; bin?: string; }
  ]
}

// Transfer stock between warehouses
POST /api/products/{productId}/transfer
Body: {
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
}
```

### 2. Frontend Changes (Product Form)

**File**: `/apps/admin-dashboard/src/routes/dashboard/products/all.tsx`

**Changes Needed**:
1. Replace single warehouse selector with multi-warehouse table
2. Allow adding multiple warehouse allocations
3. Show stock breakdown per warehouse
4. Validate total stock equals sum of warehouse allocations
5. Support editing existing warehouse allocations

**UI Mockup**:
```
┌─────────────────────────────────────────────────────────┐
│ Product Warehouse Allocations                           │
├─────────────────────────────────────────────────────────┤
│ Warehouse        │ Quantity │ Rack │ Bin │ Actions     │
├─────────────────┼──────────┼──────┼─────┼─────────────┤
│ Main Warehouse   │ 50       │ A1   │ TOP │ [Edit] [Del]│
│ Regional Hub     │ 30       │ B2   │ MID │ [Edit] [Del]│
│ Distribution Ctr │ 20       │ C3   │ BOT │ [Edit] [Del]│
├─────────────────────────────────────────────────────────┤
│ Total Stock: 100                    [+ Add Warehouse]   │
└─────────────────────────────────────────────────────────┘
```

**Implementation Steps**:
1. Create new component `ProductWarehouseAllocation.tsx`
2. Add state for managing multiple warehouse allocations
3. Update form submission to handle multiple locations
4. Add validation to ensure total stock matches allocations
5. Update existing location update logic

### 3. Bundle Warehouse Support

**File**: `/apps/admin-dashboard/src/routes/dashboard/products/bundle.tsx`

**Backend Requirements**:
- Add `warehouseId` field to bundle table
- Update bundle validation to check component stock at specific warehouse
- Add bundle location tracking

**Frontend Changes**:
1. Add warehouse selector to bundle form
2. Validate component products exist in selected warehouse
3. Show warehouse-specific stock availability
4. Update bundle stock calculation per warehouse

### 4. Variant Warehouse Support

**File**: `/apps/admin-dashboard/src/routes/dashboard/products/variant.tsx`

**Backend Requirements**:
- Add variant location table (similar to product locations)
- Track variant stock per warehouse
- Update variant stock allocation logic

**Frontend Changes**:
1. Add warehouse allocation table to variant form
2. Show parent product warehouse locations
3. Allow allocating variant stock from available warehouse stock
4. Update variant detail view to show warehouse breakdown

### 5. Inventory Report Updates

**File**: `/apps/admin-dashboard/src/routes/dashboard/inventory/index.tsx`

**Changes**:
1. Replace mock data with real API calls
2. Show product/bundle/variant breakdown per warehouse
3. Display low stock alerts per warehouse
4. Show expiration dates per warehouse location

## Migration Strategy

### Phase 1: Product Multi-Warehouse (Frontend)
1. ✅ Add business rule documentation
2. Update product form to support multiple warehouses
3. Update product detail view
4. Test with existing backend

### Phase 2: Backend API Support
1. Implement product warehouse stock endpoints
2. Add bundle warehouse support
3. Add variant warehouse support
4. Update database schema

### Phase 3: Bundle & Variant Frontend
1. Update bundle form with warehouse selector
2. Update variant form with warehouse allocation
3. Add warehouse-specific validation
4. Update reports and analytics

### Phase 4: Stock Transfer & Movement
1. Implement stock transfer between warehouses
2. Add transfer history tracking
3. Update inventory movements
4. Add audit trail

## Data Model Changes

### Product Locations (Already Exists)
```typescript
interface ProductLocation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  rack?: string;
  bin?: string;
  zone?: string;
  aisle?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Bundle Locations (New)
```typescript
interface BundleLocation {
  id: string;
  bundleId: string;
  warehouseId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Variant Locations (New)
```typescript
interface VariantLocation {
  id: string;
  variantId: string;
  productId: string;  // Parent product
  warehouseId: string;
  quantity: number;
  rack?: string;
  bin?: string;
  zone?: string;
  aisle?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Business Rules to Enforce

1. **Stock Integrity**: Total product stock = Sum of all warehouse quantities
2. **Bundle Components**: All bundle components must exist in the same warehouse
3. **Variant Allocation**: Variant warehouse allocations must not exceed parent product stock at that warehouse
4. **Transfer Validation**: Cannot transfer more stock than available at source warehouse
5. **Expiration Tracking**: Track expiration dates per warehouse location (different batches)

## Testing Requirements

### Unit Tests
- Multi-warehouse stock calculation
- Warehouse allocation validation
- Stock transfer logic
- Bundle warehouse validation
- Variant stock allocation

### Integration Tests
- Create product with multiple warehouses
- Transfer stock between warehouses
- Create bundle with warehouse-specific components
- Create variant with warehouse allocations
- Update warehouse quantities

### E2E Tests
- Complete product creation workflow with multiple warehouses
- Bundle creation with warehouse selection
- Variant creation with warehouse allocation
- Stock transfer workflow
- Inventory report accuracy

## Status: ✅ Frontend Complete - Backend Integration Pending

### Completed (Frontend):

**✅ Phase 1: Product Multi-Warehouse (DONE)**
- Created ProductWarehouseAllocation reusable component
- Updated product form with multi-warehouse UI
- Implemented warehouse allocation state management
- Updated form submission for create and edit modes
- Full CRUD operations for warehouse locations
- Real-time stock validation and allocation tracking

**✅ Phase 2: Bundle Warehouse Selection (DONE)**
- Added warehouse selector to bundle form
- Required field for assembly warehouse
- Updated bundle form state and submission
- UI highlights warehouse selection importance

**✅ Phase 3: Variant Warehouse Allocation (DONE)**
- Integrated ProductWarehouseAllocation into variant form
- Added warehouse allocation state management
- Updated variant form handlers
- UI ready for backend integration

### Pending (Backend):

**⚠️ Backend API Integration Required:**
- Variant warehouse location endpoints (CRUD)
- Bundle component validation (ensure components exist in warehouse)
- Stock transfer between warehouses endpoints
- Warehouse-specific stock queries and reporting
- Variant location data model and database tables

### Testing Plan:

**Frontend Unit Tests** (Ready to write):
- ProductWarehouseAllocation component tests
- Multi-warehouse stock calculation tests
- Form validation tests
- Warehouse allocation CRUD tests

**Backend Integration Tests** (Pending backend):
- Create product with multiple warehouse allocations
- Update product warehouse locations (add/edit/delete)
- Transfer stock between warehouses
- Bundle validation with warehouse components
- Variant warehouse allocation sync

**E2E Tests** (Pending backend):
- Complete product creation with multi-warehouse workflow
- Bundle creation with warehouse-specific validation
- Variant creation with warehouse allocations
- Stock transfer operations
- Inventory reports accuracy

**Next Steps**:
1. ✅ Frontend implementation complete
2. ⏳ Backend team: Implement variant warehouse location APIs
3. ⏳ Backend team: Add bundle component warehouse validation
4. ⏳ Integration testing (frontend + backend)
5. ⏳ Comprehensive E2E testing
6. ⏳ Production deployment

**Priority**: High
**Frontend Effort**: Complete (3 phases)
**Backend Effort**: Estimated 1-2 weeks

---

**Last Updated**: November 24, 2025
**Maintained By**: Development Team
