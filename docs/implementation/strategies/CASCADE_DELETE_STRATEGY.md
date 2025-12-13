# Cascade Delete Strategy for KidKazz ERP

## Executive Summary

This document outlines the cascade delete strategy for the KidKazz ERP system based on research from industry-leading ERPs (Odoo, ERPNext, SAP) and analysis of our current database schema.

**Key Findings:**
- **Odoo**: Uses database-level CASCADE constraints with `onDelete='cascade'` for dependent data
- **ERPNext**: Uses application-level delete management with soft delete capability
- **SAP**: Emphasizes data archival over deletion, especially for financial/transactional data

**Our Recommendation**: Hybrid approach combining database-level CASCADE for dependent data and RESTRICT for critical references, with soft delete support for transactional data.

---

## 1. Research Findings from Major ERPs

### 1.1 Odoo ERP

**Approach**: Database-level CASCADE constraints

**Implementation**:
```python
# Odoo field definition
product_id = fields.Many2one('product.product', ondelete='cascade')
```

**Key Principles**:
- CASCADE: Child records deleted automatically when parent is deleted
- RESTRICT: Prevents deletion if references exist
- SET NULL: Sets foreign key to NULL on parent deletion
- Uses PostgreSQL's `ON DELETE CASCADE` for referential integrity
- Transactions ensure consistency and rollback capability

**Best Practices**:
- Only use CASCADE where parent-child relationship is strong (e.g., Order → OrderLines)
- Use RESTRICT for critical relationships to prevent accidental data loss
- Always wrap operations in database transactions

### 1.2 ERPNext/Frappe Framework

**Approach**: Application-level delete management

**Key Features**:
1. **Link Validation**: System checks for dependent records before allowing deletion
2. **Soft Delete**: Deleted documents moved to "Deleted Documents" table
3. **Document Lifecycle**: Submitted documents must be cancelled before deletion
4. **Event Hooks**: `on_trash` event handlers manage cascading logic

**Implementation**:
```python
# ERPNext delete logic
def delete_doc(doctype, name):
    # Check links
    # Move to deleted_documents table
    # Trigger on_trash hooks
    # Delete children via application code
```

**Advantages**:
- Audit trail through Deleted Documents
- Recovery capability
- Controlled deletion process
- Prevents accidental deletion of linked data

### 1.3 SAP ERP

**Approach**: Archival over deletion

**Key Principles**:
1. **Delete Transactional Data First**: Always delete transactions before master data
2. **Information Lifecycle Management (ILM)**: Data retention rules based on regulations
3. **Transaction Codes**: Specific codes for deletion operations (OBR1, OBR2)
4. **Complex Data Structures**: Data spread across multiple tables requires careful handling

**Delete Order**:
```
1. Transactional Data (OBR1) → Financial/CO transactions
2. Master Data (OBR2) → Customers, Vendors, Products
```

**Philosophy**: Archive rather than delete, especially for financial and regulatory data

---

## 2. Current Database Schema Analysis

### 2.1 Product Service Relationships (DDD Refactored)

```
products (Master Data)
├── productUOMs ───────────────── CASCADE ✓ (Product-specific UOM definitions)
│   └── productUOMLocations ──── CASCADE ✓ (UOM subdivisions at warehouses)
├── productVariants ───────────── CASCADE ✓ (Product variations)
│   └── variantLocations ──────── CASCADE ✓ (Variant subdivisions at warehouses)
├── productBundles
│   └── bundleItems ──────────── CASCADE ✓ (Bundle components)
├── pricingTiers ──────────────── CASCADE ✓ (Product pricing)
├── customPricing ─────────────── CASCADE ✓ (Customer-specific pricing)
├── productImages ─────────────── CASCADE ✓ (Product media)
├── productVideos ─────────────── CASCADE ✓ (Product media)
└── productLocations ──────────── ⚠️ COMPLEX - See Section 2.6

categories (Master Data)
└── products.categoryId ────────── SET NULL ✓ (Products can exist without category)
```

**Current Status**: ⚠️ **NEEDS ATTENTION**

**Critical Changes from DDD Refactoring**:
1. **Product Locations** now serve as the **Single Source of Truth** for inventory
2. **UOM/Variant Locations** are **subdivisions**, not additions to inventory
3. Deleting a product with locations requires inventory cleanup in Inventory Service

### 2.2 Subdivision Model (DDD Pattern)

**⚠️ CRITICAL UNDERSTANDING**: UOM and Variant locations are **subdivisions**, not separate inventory!

```
Product Location (100 PCS at Warehouse A)
├── UOM Subdivisions (how it's packaged):
│   ├── 10 boxes × 6 = 60 PCS
│   └── Remaining: 40 PCS loose
│
└── Variant Subdivisions (how it's distributed):
    ├── Red variant: 30 PCS
    ├── Blue variant: 50 PCS
    └── Other: 20 PCS
    ─────────────────────────────
    Total: ALWAYS = 100 PCS (product location quantity)
```

**Delete Behavior**:
- ✅ Delete Product → CASCADE to all locations (product, UOM, variant)
- ✅ Delete UOM Location → No inventory change (just subdivision removed)
- ✅ Delete Variant Location → No inventory change (just subdivision removed)
- ❌ Delete Product Location → Must update Inventory Service!

### 2.3 Inventory Service Relationships

```
warehouses (Master Data)
├── inventory ──────────────────── CASCADE ✓ (Warehouse-specific inventory)
│   ├── inventoryReservations ─── CASCADE ✓ (Reservation records)
│   ├── inventoryMovements ────── SOFT DELETE ⚠️ (Audit trail)
│   └── inventoryBatches ──────── CASCADE ✓ (Batch tracking)
└── productLocations ──────────── ⚠️ CROSS-SERVICE (Product Service)
```

**Current Status**: ⚠️ **NEEDS ATTENTION**

**Issue**: `productLocations` table in Product Service references `warehouseId` but has NO foreign key constraint.

**Reason**: Cross-service reference (Inventory Service → Product Service)

**Risk**: When warehouse is deleted, orphaned `productLocations` records remain

**DDD Impact**: Product locations create/update inventory, so warehouse deletion requires coordination

### 2.4 Accounting Service Relationships

```
chartOfAccounts
├── parentAccountId ───────────── RESTRICT ✓ (Correct - prevents hierarchy breakage)
├── journalLines.accountId ────── RESTRICT ✓ (Correct - prevents GL data loss)
└── accountBalances ───────────── CASCADE ✓ (Correct - derived data)

journalEntries (Transactional Data)
└── journalLines ──────────────── CASCADE ✓ (Correct - dependent data)
```

**Current Status**: ✅ **WELL DESIGNED**
- Chart of Accounts uses RESTRICT (correct for master data)
- Journal Lines use CASCADE (correct for dependent data)
- Prevents deletion of accounts with posted transactions
- Protects financial data integrity

### 2.5 Cross-Service References (No Foreign Keys)

These relationships exist logically but have NO database constraints:

```
Product Service ──→ Accounting Service
├── revenueAccountId
├── cogsAccountId
└── inventoryAccountId

Product Service ──→ Inventory Service (DDD Critical!)
├── productLocations.warehouseId ──→ warehouses.id
├── productUOMLocations.warehouseId ──→ warehouses.id
└── variantLocations.warehouseId ──→ warehouses.id

Inventory Service ──→ Product Service (DDD Critical!)
└── inventory.productId ──→ products.id

Journal Lines ──→ External Services
├── customerId
├── vendorId
├── productId
├── warehouseId
└── salesPersonId
```

**Risk**: These are cross-service references without referential integrity enforcement.

**DDD-Specific Risks**:
1. **Product deletion** leaves orphaned inventory records in Inventory Service
2. **Warehouse deletion** leaves orphaned location records in Product Service
3. **Product Location deletion** must synchronize with Inventory Service

### 2.6 Product Location Deletion Complexity (DDD Pattern)

**Problem**: Product locations are the **Single Source of Truth** for inventory.

**Deletion Scenarios**:

```typescript
// Scenario 1: Delete Product (parent)
DELETE FROM products WHERE id = 'prod-123';
// ✅ CASCADE to productLocations (Product Service)
// ⚠️ Orphans inventory records (Inventory Service) - NEEDS HANDLING

// Scenario 2: Delete Product Location (child)
DELETE FROM productLocations WHERE id = 'loc-456';
// ⚠️ Must update/delete inventory record (Inventory Service) - NEEDS HANDLING

// Scenario 3: Delete UOM/Variant Location (subdivision)
DELETE FROM productUOMLocations WHERE id = 'uomloc-789';
// ✅ No inventory impact (just subdivision removed)

// Scenario 4: Delete Warehouse (external service)
DELETE FROM warehouses WHERE id = 'wh-123'; // In Inventory Service
// ⚠️ Orphans productLocations in Product Service - NEEDS HANDLING
```

**Required Delete Logic**:

```typescript
// Product Service: Before deleting product
async deleteProduct(productId: string) {
  // 1. Get all product locations
  const locations = await db.select()
    .from(productLocations)
    .where(eq(productLocations.productId, productId));

  // 2. For each location, delete inventory in Inventory Service
  for (const location of locations) {
    await inventoryService.deleteInventory(productId, location.warehouseId);
  }

  // 3. Delete product (CASCADE handles productLocations, UOMs, variants, etc.)
  await db.delete(products).where(eq(products.id, productId));
}

// Product Service: Before deleting product location
async deleteProductLocation(locationId: string) {
  const location = await db.select()
    .from(productLocations)
    .where(eq(productLocations.id, locationId))
    .get();

  // 1. Delete inventory record in Inventory Service
  await inventoryService.deleteInventory(location.productId, location.warehouseId);

  // 2. Delete product location (CASCADE handles UOM/variant subdivisions)
  await db.delete(productLocations).where(eq(productLocations.id, locationId));
}
```

---

## 3. Identified Issues & Risks

### 3.1 Critical Issues

#### Issue #1: Orphaned Product Locations on Warehouse Delete

**Problem**:
```sql
-- Warehouse in Inventory Service
DELETE FROM warehouses WHERE id = 'wh-123';

-- Product Service productLocations table still has:
-- warehouseId = 'wh-123' → ORPHANED REFERENCE ⚠️
```

**Impact**:
- Stale data in productLocations table
- Reports showing non-existent warehouses
- Data integrity violations

**Solution**: Implement application-level cascade delete or soft delete

#### Issue #2: Orphaned Accounting References on Account Delete

**Problem**:
```sql
-- Accounting Service
DELETE FROM chartOfAccounts WHERE id = 'acc-4010';

-- Product Service products table still has:
-- revenueAccountId = 'acc-4010' → ORPHANED REFERENCE ⚠️
```

**Impact**:
- Products reference deleted accounts
- Revenue posting will fail
- Accounting reports incorrect

**Solution**: RESTRICT deletion of accounts referenced by products

#### Issue #3: Orphaned Inventory References on Product Delete

**Problem**:
```sql
-- Product Service
DELETE FROM products WHERE id = 'prod-123';

-- Inventory Service inventory table still has:
-- productId = 'prod-123' → ORPHANED REFERENCE ⚠️
```

**Impact**:
- Inventory records for non-existent products
- Stock reports showing phantom products
- Data cleanup nightmares

**Solution**: Application-level validation before product deletion

---

## 4. Recommended Cascade Delete Strategy

### 4.1 Three-Tier Delete Strategy

#### Tier 1: Dependent Data (Use CASCADE)
**Rule**: Data that has no independent meaning without parent

**Examples**:
- ✅ Product → ProductUOMs (UOMs are product-specific)
- ✅ Product → ProductVariants (variants belong to product)
- ✅ Product → ProductImages (images belong to product)
- ✅ Bundle → BundleItems (bundle items belong to bundle)
- ✅ JournalEntry → JournalLines (lines belong to entry)
- ✅ Warehouse → Inventory (inventory is warehouse-specific)
- ✅ Inventory → InventoryMovements (movements track inventory)

**Drizzle Implementation**:
```typescript
references(() => products.id, { onDelete: 'cascade' })
```

#### Tier 2: Master Data References (Use RESTRICT or SET NULL)
**Rule**: Data that has independent business meaning

**Examples**:
- ✅ Product → Category: **SET NULL** (products can exist without category)
- ✅ JournalLine → Account: **RESTRICT** (prevent deletion of accounts with GL entries)
- ✅ ChartOfAccounts → ParentAccount: **RESTRICT** (prevent hierarchy breakage)

**Drizzle Implementation**:
```typescript
// SET NULL - allow orphaning
references(() => categories.id, { onDelete: 'set null' })

// RESTRICT - prevent deletion
references(() => chartOfAccounts.id, { onDelete: 'restrict' })
```

#### Tier 3: Transactional Data (Use SOFT DELETE)
**Rule**: Financial/transactional data that affects accounting/audit trail

**Examples**:
- ⚠️ Journal Entries (financial records)
- ⚠️ Orders (sales transactions)
- ⚠️ Inventory Movements (audit trail)

**Implementation**: Add `deleted_at` field and filter queries

**Soft Delete Pattern**:
```typescript
// Schema
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  // ... other fields
  deletedAt: integer('deleted_at', { mode: 'timestamp' }), // NULL = active
  deletedBy: text('deleted_by'),
});

// Query (always filter)
const activeEntries = await db
  .select()
  .from(journalEntries)
  .where(isNull(journalEntries.deletedAt));

// Soft delete
await db
  .update(journalEntries)
  .set({
    deletedAt: new Date(),
    deletedBy: userId
  })
  .where(eq(journalEntries.id, entryId));
```

### 4.2 Cross-Service Delete Handling

#### Strategy A: Application-Level Cascade (Recommended)
When deleting master data referenced across services:

```typescript
// Warehouse deletion in Inventory Service
async deleteWarehouse(warehouseId: string) {
  // 1. Check cross-service references
  const productLocations = await productServiceClient.getLocationsByWarehouse(warehouseId);

  if (productLocations.length > 0) {
    throw new Error(
      `Cannot delete warehouse. ${productLocations.length} product locations still reference it.`
    );
  }

  // 2. Delete warehouse (will CASCADE to inventory, movements, etc.)
  await db.delete(warehouses).where(eq(warehouses.id, warehouseId));

  // 3. Optionally: Notify other services
  await eventBus.publish('warehouse.deleted', { warehouseId });
}
```

#### Strategy B: Soft Delete (Alternative)
Prevents hard deletion of cross-service referenced data:

```typescript
// Warehouse soft delete
async softDeleteWarehouse(warehouseId: string) {
  await db
    .update(warehouses)
    .set({
      deletedAt: new Date(),
      status: 'inactive'
    })
    .where(eq(warehouses.id, warehouseId));

  // UI hides deleted warehouses
  // Cross-service references remain valid
  // Can be restored if needed
}
```

---

## 5. Implementation Plan

### 5.1 Immediate Actions (Critical)

#### Action 1: Add Soft Delete to Warehouses
**Why**: Prevent orphaned `productLocations` in Product Service

```typescript
// File: services/inventory-service/src/infrastructure/db/schema.ts
export const warehouses = sqliteTable('warehouses', {
  // ... existing fields
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deletedBy: text('deleted_by'),
});
```

**Migration**:
```sql
-- Add columns
ALTER TABLE warehouses ADD COLUMN deleted_at INTEGER;
ALTER TABLE warehouses ADD COLUMN deleted_by TEXT;
```

**Update Queries**: Filter by `deletedAt IS NULL`

#### Action 2: Add Validation Before Product Deletion
**Why**: Prevent deletion of products with inventory or accounting references

```typescript
// File: services/product-service/src/application/use-cases/DeleteProduct.ts
export class DeleteProductUseCase {
  async execute(productId: string): Promise<void> {
    // 1. Check inventory references
    const inventoryRecords = await inventoryServiceClient.checkProductInventory(productId);
    if (inventoryRecords.totalStock > 0) {
      throw new Error(
        `Cannot delete product. It has ${inventoryRecords.totalStock} units in inventory across warehouses.`
      );
    }

    // 2. Check accounting references (journal lines)
    const journalLineCount = await accountingServiceClient.checkProductJournalLines(productId);
    if (journalLineCount > 0) {
      throw new Error(
        `Cannot delete product. It has ${journalLineCount} posted journal entries.`
      );
    }

    // 3. Check order references
    const orderCount = await orderServiceClient.checkProductOrders(productId);
    if (orderCount > 0) {
      throw new Error(
        `Cannot delete product. It has ${orderCount} related orders.`
      );
    }

    // 4. Safe to delete (will CASCADE to UOMs, variants, images, etc.)
    await this.productRepository.delete(productId);
  }
}
```

#### Action 3: Add Soft Delete to Journal Entries
**Why**: Financial data should never be hard deleted

```typescript
// File: services/accounting-service/src/infrastructure/db/schema.ts
export const journalEntries = sqliteTable('journal_entries', {
  // ... existing fields
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deletedBy: text('deleted_by'),
  deleteReason: text('delete_reason'),
});
```

### 5.2 Medium Priority Actions

#### Action 4: Implement Cleanup Job for Orphaned References
**Why**: Clean up stale cross-service references periodically

```typescript
// File: services/product-service/src/jobs/CleanupOrphanedReferences.ts
export class CleanupOrphanedReferencesJob {
  async execute() {
    // 1. Find productLocations with invalid warehouseId
    const orphanedLocations = await db
      .select()
      .from(productLocations)
      .where(notInArray(
        productLocations.warehouseId,
        await inventoryServiceClient.getActiveWarehouseIds()
      ));

    // 2. Log and optionally delete
    console.log(`Found ${orphanedLocations.length} orphaned product locations`);

    // 3. Delete or mark as invalid
    for (const location of orphanedLocations) {
      await db.delete(productLocations).where(eq(productLocations.id, location.id));
    }
  }
}
```

#### Action 5: Add Delete Confirmation UI
**Why**: Prevent accidental deletion of critical data

```typescript
// Admin Dashboard: Show impact before deletion
const confirmDeleteWarehouse = async (warehouseId: string) => {
  // Get impact analysis
  const impact = await api.analyzeWarehouseDeletionImpact(warehouseId);

  // Show confirmation dialog
  const confirmed = await showDialog({
    title: 'Delete Warehouse?',
    message: `This will affect:
      - ${impact.inventoryRecords} inventory records (will be deleted)
      - ${impact.productLocations} product locations (will be deleted)
      - ${impact.transfers} pending transfers (will be cancelled)
    `,
    severity: 'danger'
  });

  if (confirmed) {
    await api.deleteWarehouse(warehouseId);
  }
};
```

### 5.3 Long-Term Improvements

#### Action 6: Event-Driven Cascade
**Why**: Decouple services while maintaining referential integrity

```typescript
// Inventory Service publishes event
eventBus.publish('warehouse.deleted', {
  warehouseId: 'wh-123',
  timestamp: new Date()
});

// Product Service listens and reacts
eventBus.subscribe('warehouse.deleted', async (event) => {
  // Delete all productLocations for this warehouse
  await db
    .delete(productLocations)
    .where(eq(productLocations.warehouseId, event.warehouseId));
});
```

#### Action 7: Archived Records Table
**Why**: Compliance and audit trail for deleted data

```typescript
export const archivedRecords = sqliteTable('archived_records', {
  id: text('id').primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  recordData: text('record_data').notNull(), // JSON
  deletedAt: integer('deleted_at', { mode: 'timestamp' }).notNull(),
  deletedBy: text('deleted_by').notNull(),
  deleteReason: text('delete_reason'),
});
```

---

## 6. Delete Strategy Decision Matrix (DDD Updated)

| Entity Type | Delete Strategy | Rationale |
|-------------|----------------|-----------|
| **Master Data** |||
| Products | **RESTRICT + Validation** | Check inventory, orders, journal entries. Also sync Inventory Service |
| Categories | **SET NULL on children** | Products can exist without category |
| Warehouses | **SOFT DELETE** | Referenced across services (productLocations) |
| Chart of Accounts | **RESTRICT** | Cannot delete accounts with posted transactions |
| UOMs | **RESTRICT** | Prevent deletion if used by products |
| **Dependent Data** |||
| ProductUOMs | **CASCADE** ✓ | No independent meaning, has subdivisions (locations) |
| ProductVariants | **CASCADE** ✓ | Belongs to product, has subdivisions (locations) |
| ProductImages | **CASCADE** ✓ | Belongs to product |
| ProductVideos | **CASCADE** ✓ | Belongs to product |
| ProductLocations | **CASCADE + SYNC** ⚠️ | CASCADE from product, but must sync with Inventory Service |
| BundleItems | **CASCADE** ✓ | Belongs to bundle |
| PricingTiers | **CASCADE** ✓ | Belongs to product |
| CustomPricing | **CASCADE** ✓ | Belongs to product |
| **Subdivision Data (DDD)** |||
| ProductUOMLocations | **CASCADE** ✓ | Subdivision of product location (NOT separate inventory) |
| VariantLocations | **CASCADE** ✓ | Subdivision of product location (NOT separate inventory) |
| **Inventory Data** |||
| Inventory | **CASCADE** (via warehouse) | Warehouse-specific, source is productLocation |
| InventoryReservations | **CASCADE** (via inventory) | Belongs to inventory record |
| InventoryMovements | **SOFT DELETE** | Audit trail - never hard delete |
| InventoryBatches | **CASCADE** (via inventory) | Batch tracking for inventory |
| **Transactional/Financial** |||
| JournalEntries | **SOFT DELETE** | Financial records - audit trail required |
| JournalLines | **CASCADE** (via entry) | Belongs to journal entry |
| AccountBalances | **CASCADE** | Derived data - can be recalculated |
| Orders | **SOFT DELETE** | Business transactions - audit trail required |

---

## 7. Best Practices

### 7.1 Before Implementing Cascade Delete

1. **Analyze Impact**: Understand which records will be affected
2. **Check Business Rules**: Ensure deletion aligns with business logic
3. **Test in Staging**: Never test cascade delete in production
4. **Create Backups**: Always backup before bulk deletions
5. **Use Transactions**: Wrap deletes in DB transactions for rollback capability

### 7.2 Cascade Delete Checklist

```typescript
// Before deleting a product:
const canDeleteProduct = async (productId: string): Promise<boolean> => {
  const checks = {
    hasInventory: await inventoryService.hasStock(productId),
    hasOrders: await orderService.hasPendingOrders(productId),
    hasJournalEntries: await accountingService.hasPostedEntries(productId),
    hasCustomPricing: await checkCustomPricing(productId),
    inActiveBundle: await checkActiveBundles(productId),
  };

  const canDelete = Object.values(checks).every(v => !v);

  if (!canDelete) {
    console.log('Cannot delete product:', checks);
  }

  return canDelete;
};
```

### 7.3 Error Messages

Provide clear, actionable error messages:

```typescript
// ❌ Bad
throw new Error('Cannot delete');

// ✅ Good
throw new Error(
  `Cannot delete product "${product.name}" (SKU: ${product.sku}).
  The product has:
  - 150 units in stock across 3 warehouses
  - 5 pending orders
  - 12 posted journal entries

  To delete this product, you must first:
  1. Transfer or adjust inventory to zero
  2. Complete or cancel all pending orders
  3. Contact accounting to handle journal entries`
);
```

---

## 8. Migration Plan

### Phase 1: Add Soft Delete (Week 1)
- [x] Add `deletedAt` to warehouses
- [ ] Add `deletedAt` to journalEntries
- [ ] Update all queries to filter `deletedAt IS NULL`
- [ ] Add soft delete endpoints

### Phase 2: Add Validation (Week 2)
- [ ] Implement cross-service reference checks
- [ ] Add deletion impact analysis API
- [ ] Update UI to show deletion warnings

### Phase 3: Cleanup Jobs (Week 3)
- [ ] Implement orphaned reference cleanup
- [ ] Add monitoring/alerts for orphaned data
- [ ] Create archived records table

### Phase 4: Event-Driven (Week 4)
- [ ] Implement event bus
- [ ] Add cascade delete event listeners
- [ ] Migrate existing logic to events

---

## 9. Conclusion

**Current State**: ✅ Good foundation with CASCADE on dependent data

**Identified Risks**:
- ⚠️ Cross-service orphaned references (warehouses, products, accounts)
- ⚠️ No soft delete for transactional data
- ⚠️ Missing validation before master data deletion

**Recommended Approach**:
1. **Database CASCADE** for dependent data (already implemented ✓)
2. **SOFT DELETE** for master data with cross-service references
3. **RESTRICT** for critical references (accounts, hierarchy)
4. **Application-level validation** before deletion
5. **Event-driven cascade** for cross-service coordination

**Priority Order**:
1. **Critical**: Soft delete for warehouses and journal entries
2. **High**: Validation before product deletion
3. **Medium**: Cleanup jobs for orphaned references
4. **Low**: Event-driven architecture and archived records

---

## References

- [Odoo: ondelete Cascade Documentation](https://www.odoo.com/forum/help-1/what-is-ondeletecascade-in-openerp-73895)
- [ERPNext: Delete Doc Implementation](https://github.com/frappe/frappe/blob/develop/frappe/model/delete_doc.py)
- [SAP: Deletion of Master and Transactional Data](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-sap/deletion-of-master-and-transactional-data-ilm-in-sap-s-4hana-cloud-public/ba-p/13600948)
- [PostgreSQL: Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [SQLite: Foreign Key Support](https://www.sqlite.org/foreignkeys.html)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Author**: KidKazz Development Team
