import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Warehouses table
 * Stores warehouse locations for multi-warehouse inventory
 */
export const warehouses = sqliteTable('warehouses', {
  id: text('id').primaryKey(),

  code: text('code').unique().notNull(),
  name: text('name').notNull(),

  // Location
  addressLine1: text('address_line1').notNull(),
  addressLine2: text('address_line2'),
  city: text('city').notNull(),
  province: text('province').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').default('Indonesia').notNull(),

  // Contact
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),

  // Status
  status: text('status').default('active').notNull(), // 'active' | 'inactive'

  // Soft delete fields
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deletedBy: text('deleted_by'),

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Inventory table
 * Stores product stock levels per warehouse
 * Enhanced for DDD compliance with variant/UOM support and optimistic locking
 */
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),

  warehouseId: text('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),

  productId: text('product_id').notNull(),

  // NEW: Variant and UOM support (Phase 1 DDD Enhancement)
  variantId: text('variant_id'),
  uomId: text('uom_id'),

  // Stock levels
  quantityAvailable: integer('quantity_available').default(0).notNull(),
  quantityReserved: integer('quantity_reserved').default(0).notNull(),
  quantityInTransit: integer('quantity_in_transit').default(0),

  // Minimum stock level for reordering
  minimumStock: integer('minimum_stock').default(0),

  // NEW: Physical location (moved from Product Service - Phase 1 DDD Enhancement)
  rack: text('rack'),
  bin: text('bin'),
  zone: text('zone'),
  aisle: text('aisle'),

  // NEW: Optimistic locking (Phase 1 DDD Enhancement)
  version: integer('version').default(1).notNull(),
  lastModifiedAt: text('last_modified_at'),

  // Audit fields
  lastRestockedAt: integer('last_restocked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Inventory reservations table
 * Tracks stock reservations for pending orders
 */
export const inventoryReservations = sqliteTable('inventory_reservations', {
  id: text('id').primaryKey(),

  inventoryId: text('inventory_id')
    .notNull()
    .references(() => inventory.id, { onDelete: 'cascade' }),

  orderId: text('order_id').notNull(),
  productId: text('product_id').notNull(),

  quantityReserved: integer('quantity_reserved').notNull(),

  status: text('status').notNull(), // 'active' | 'confirmed' | 'released' | 'expired'

  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
  releasedAt: integer('released_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Inventory movements table
 * Audit trail for all inventory changes
 */
export const inventoryMovements = sqliteTable('inventory_movements', {
  id: text('id').primaryKey(),

  inventoryId: text('inventory_id')
    .notNull()
    .references(() => inventory.id, { onDelete: 'cascade' }),

  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),

  movementType: text('movement_type').notNull(), // 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: integer('quantity').notNull(),

  // Source of the operation (for negative stock business rule tracking)
  source: text('source').default('warehouse'), // 'warehouse' | 'pos'

  // Reference to the operation that caused this movement
  referenceType: text('reference_type'), // 'order' | 'restock' | 'adjustment' | 'transfer'
  referenceId: text('reference_id'),

  reason: text('reason'),
  notes: text('notes'),

  performedBy: text('performed_by'),

  // Soft delete fields (audit trail - never hard delete)
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deletedBy: text('deleted_by'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Inventory Batches table (Phase 3 - DDD Compliance)
 * Tracks batch/lot-level inventory with expiration dates
 * Enables FEFO (First Expired, First Out) picking strategy
 */
export const inventoryBatches = sqliteTable('inventory_batches', {
  id: text('id').primaryKey(),

  // Links to parent inventory record
  inventoryId: text('inventory_id')
    .notNull()
    .references(() => inventory.id, { onDelete: 'cascade' }),

  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),

  // Batch identification
  batchNumber: text('batch_number').notNull(), // e.g., "A001", "B002", "LOT-2025-001"
  lotNumber: text('lot_number'), // Optional lot number (supplier-provided)

  // Batch-specific expiration (DDD: expiration is a batch characteristic, not product!)
  expirationDate: text('expiration_date'), // ISO date string
  alertDate: text('alert_date'), // Alert before expiration (e.g., 7 days before)
  manufactureDate: text('manufacture_date'), // ISO date string

  // Stock for this specific batch
  quantityAvailable: integer('quantity_available').default(0).notNull(),
  quantityReserved: integer('quantity_reserved').default(0).notNull(),

  // Traceability information
  receivedDate: text('received_date'), // When this batch was received
  supplier: text('supplier'), // Supplier name or ID
  purchaseOrderId: text('purchase_order_id'), // Reference to PO (if applicable)
  cost: integer('cost'), // Unit cost for this batch (in cents/smallest currency unit)

  // Batch status
  status: text('status').default('active').notNull(), // 'active' | 'expired' | 'quarantined' | 'recalled'
  quarantineReason: text('quarantine_reason'), // If status = 'quarantined'
  recallReason: text('recall_reason'), // If status = 'recalled'

  // NEW: Optimistic locking (Phase 1 DDD Enhancement)
  version: integer('version').default(1).notNull(),
  lastModifiedAt: text('last_modified_at'),

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

// Types inferred from the schema
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

export type InventoryReservation = typeof inventoryReservations.$inferSelect;
export type InsertInventoryReservation = typeof inventoryReservations.$inferInsert;

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

export type InventoryBatch = typeof inventoryBatches.$inferSelect;
export type InsertInventoryBatch = typeof inventoryBatches.$inferInsert;
