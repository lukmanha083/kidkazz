# Audit Trail Feature (Future Implementation)

## Overview

The Audit Trail feature provides visibility into data deletion activities across all services. Since all entities now use **soft delete** (setting `deletedAt` timestamp instead of hard delete), we can track and potentially recover deleted data.

## Purpose

1. **Compliance**: Track who deleted what and when for regulatory compliance
2. **Recovery**: Restore accidentally deleted records
3. **Monitoring**: Identify unusual deletion patterns
4. **Data Retention**: Manage permanent purge of old soft-deleted records

## Soft Delete Fields

All major entities now have these fields:

```typescript
deletedAt: integer('deleted_at', { mode: 'timestamp' }),  // When deleted
deletedBy: text('deleted_by'),  // User ID who deleted (TODO: implement auth context)
```

### Entities with Soft Delete

| Service | Entity | Table |
|---------|--------|-------|
| product-service | Products | `products` |
| product-service | Categories | `categories` |
| inventory-service | Inventory Batches | `inventory_batches` |
| inventory-service | Warehouses | `warehouses` |
| business-partner-service | Customers | `customers` (via status) |
| business-partner-service | Suppliers | `suppliers` (via status) |
| business-partner-service | Employees | `employees` (via status) |
| business-partner-service | Addresses | `addresses` |
| business-partner-service | Supplier Contacts | `supplier_contacts` |
| business-partner-service | Partner Documents | `partner_documents` |

## Proposed UI Structure

### Route
```
/dashboard/admin/audit
```

### Page Sections

#### 1. Summary Cards
- Total soft-deleted records (last 30 days)
- Records pending permanent deletion
- Records restored this month
- Top deleters (users)

#### 2. Deletion History Table

| Column | Description |
|--------|-------------|
| Entity Type | Product, Category, Customer, etc. |
| Record Name/ID | Name or identifier of deleted record |
| Deleted By | User who performed deletion |
| Deleted At | Timestamp of deletion |
| Days Until Purge | Based on retention policy |
| Actions | View Details, Restore, Purge Now |

#### 3. Filters
- Date range picker
- Entity type filter (multi-select)
- Service filter (product, inventory, business-partner)
- Deleted by user filter
- Search by name/ID

#### 4. Bulk Actions
- Restore selected
- Purge selected (with confirmation)
- Export to CSV

## API Endpoints (To Be Implemented)

### Product Service

```typescript
// Get soft-deleted products
GET /api/products?includeDeleted=true&deletedOnly=true

// Restore product
POST /api/products/:id/restore

// Permanent delete (purge)
DELETE /api/products/:id/purge
```

### Inventory Service

```typescript
// Get soft-deleted batches
GET /api/batches?includeDeleted=true&deletedOnly=true

// Restore batch
POST /api/batches/:id/restore

// Get soft-deleted warehouses
GET /api/warehouses?includeDeleted=true&deletedOnly=true

// Restore warehouse
POST /api/warehouses/:id/restore
```

### Business Partner Service

```typescript
// Get soft-deleted addresses
GET /api/addresses?includeDeleted=true&deletedOnly=true

// Restore address
POST /api/addresses/:id/restore

// Similar endpoints for supplier contacts, documents
```

## Restore Logic

When restoring a soft-deleted record:

```typescript
// Example: Restore product
app.post('/:id/restore', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Find soft-deleted product
  const product = await db
    .select()
    .from(products)
    .where(and(
      eq(products.id, id),
      isNotNull(products.deletedAt)  // Must be soft-deleted
    ))
    .get();

  if (!product) {
    return c.json({ error: 'Deleted product not found' }, 404);
  }

  // Restore by clearing deletedAt
  await db
    .update(products)
    .set({
      deletedAt: null,
      deletedBy: null,
      status: 'inactive',  // Restore as inactive for review
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .run();

  return c.json({ message: 'Product restored successfully' });
});
```

## Permanent Purge Logic

For permanent deletion after retention period:

```typescript
// Example: Purge old soft-deleted products
app.delete('/:id/purge', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Find soft-deleted product
  const product = await db
    .select()
    .from(products)
    .where(and(
      eq(products.id, id),
      isNotNull(products.deletedAt)
    ))
    .get();

  if (!product) {
    return c.json({ error: 'Deleted product not found' }, 404);
  }

  // Check retention period (e.g., 90 days)
  const deletedAt = new Date(product.deletedAt);
  const daysSinceDeleted = Math.floor(
    (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceDeleted < 90) {
    return c.json({
      error: 'Cannot purge yet',
      message: `Record must be deleted for at least 90 days. Currently: ${daysSinceDeleted} days`,
      canPurgeAt: new Date(deletedAt.getTime() + 90 * 24 * 60 * 60 * 1000),
    }, 400);
  }

  // Permanently delete (cascade will handle related records)
  await db.delete(products).where(eq(products.id, id)).run();

  return c.json({ message: 'Product permanently deleted' });
});
```

## Data Retention Policy

### Accounting Compliance (7 Years)

Per Indonesian accounting regulations and general financial compliance standards, all business records must be retained for **7 years (2555 days)** before they can be permanently deleted. This applies to all entities that may be referenced in financial transactions.

### Retention Rules

| Entity Type | Retention Period | Auto-Purge | Export Required |
|-------------|------------------|------------|-----------------|
| Products | 7 years | No | Yes |
| Categories | 7 years | No | Yes |
| Customers | 7 years | No | Yes |
| Suppliers | 7 years | No | Yes |
| Employees | 7 years | No | Yes |
| Addresses | 7 years | No | Yes |
| Inventory Batches | 7 years | No | Yes |
| Warehouses | 7 years | No | Yes |
| Partner Documents | 7 years | No | Yes |
| Supplier Contacts | 7 years | No | Yes |

### Export Before Purge

Before any record can be permanently deleted, it **MUST** be exported to the Report Service for archival:

```typescript
// Purge workflow
1. Verify record is soft-deleted for >= 7 years
2. Export record to Report Service (archive)
3. Receive confirmation from Report Service
4. Only then perform permanent delete
```

## Scheduled Auto-Purge (Optional)

For entities with auto-purge enabled, a scheduled worker can run:

```typescript
// In scheduled.ts
export async function handleScheduled(event: ScheduledEvent, env: Bindings) {
  if (event.cron === '0 2 * * *') {  // Daily at 2 AM
    await purgeOldDeletedRecords(env);
  }
}

async function purgeOldDeletedRecords(env: Bindings) {
  const db = drizzle(env.DB);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);  // 90 days ago

  // Purge old addresses
  const purged = await db
    .delete(addresses)
    .where(and(
      isNotNull(addresses.deletedAt),
      lt(addresses.deletedAt, cutoffDate)
    ))
    .run();

  console.log(`Purged ${purged.changes} old deleted addresses`);
}
```

## Frontend Component Structure

```
src/routes/dashboard/admin/
├── audit.tsx                    # Main audit trail page
└── components/
    ├── AuditSummaryCards.tsx    # Summary statistics
    ├── DeletionHistoryTable.tsx # Main data table
    ├── AuditFilters.tsx         # Filter controls
    ├── RestoreDialog.tsx        # Confirmation for restore
    └── PurgeDialog.tsx          # Confirmation for permanent delete
```

## Dependencies

```typescript
// Required hooks (to be created)
import { useDeletedProducts } from '@/hooks/queries/useProducts';
import { useDeletedCategories } from '@/hooks/queries/useCategories';
import { useDeletedBatches } from '@/hooks/queries/useBatches';
// ... etc
```

## Security Considerations

1. **Permission Required**: Only admin users should access audit trail
2. **Restore Approval**: Consider requiring approval for restoring certain entities
3. **Purge Confirmation**: Double confirmation for permanent deletion
4. **Audit of Audits**: Log restore/purge actions themselves

## Implementation Priority

1. **Phase 1**: Read-only audit trail (view deleted records)
2. **Phase 2**: Restore functionality
3. **Phase 3**: Permanent purge with retention policy
4. **Phase 4**: Auto-purge scheduled jobs
5. **Phase 5**: Export and reporting

## Related Documentation

- [Soft Delete Implementation](../../../CLAUDE.md) - Form validation and patterns
- [Warehouse Lifecycle](../inventory/BUSINESS_RULES.md#rule-14) - Warehouse delete strategy
