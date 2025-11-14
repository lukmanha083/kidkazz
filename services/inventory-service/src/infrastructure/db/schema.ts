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

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Inventory table
 * Stores product stock levels per warehouse
 */
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),

  warehouseId: text('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),

  productId: text('product_id').notNull(),

  // Stock levels
  quantityAvailable: integer('quantity_available').default(0).notNull(),
  quantityReserved: integer('quantity_reserved').default(0).notNull(),
  quantityInTransit: integer('quantity_in_transit').default(0),

  // Minimum stock level for reordering
  minimumStock: integer('minimum_stock').default(0),

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

  // Reference to the operation that caused this movement
  referenceType: text('reference_type'), // 'order' | 'restock' | 'adjustment' | 'transfer'
  referenceId: text('reference_id'),

  reason: text('reason'),
  notes: text('notes'),

  performedBy: text('performed_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
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
