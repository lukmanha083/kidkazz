# Phase 7: Inter-Warehouse Transfer (Inbound/Outbound Workflow)

## Overview

Phase 7 implements a complete inter-warehouse stock transfer system with document-based state transitions, full audit trail, and real-time tracking. This follows DDD pure approach where stock transfers use proper warehouse management workflow.

**Status:** ⏳ Pending

---

## Business Context

### Why Inter-Warehouse Transfer?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTER-WAREHOUSE TRANSFER USE CASES                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. STOCK BALANCING                                                          │
│     • Warehouse A has excess stock                                           │
│     • Warehouse B running low                                                │
│     • Transfer to optimize inventory distribution                            │
│                                                                              │
│  2. LOW STOCK REPLENISHMENT                                                  │
│     • Retail store needs stock                                               │
│     • Central warehouse supplies                                             │
│     • Triggered automatically or manually                                    │
│                                                                              │
│  3. SEASONAL REBALANCING                                                     │
│     • Move stock to high-demand locations                                    │
│     • Pre-position for sales events                                          │
│     • Regional demand variations                                             │
│                                                                              │
│  4. WAREHOUSE CONSOLIDATION                                                  │
│     • Closing a warehouse                                                    │
│     • Merging inventory                                                      │
│     • Facility relocation                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7.1 Transfer Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTER-WAREHOUSE TRANSFER WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DESTINATION WAREHOUSE (Inbound)          SOURCE WAREHOUSE (Outbound)        │
│  ─────────────────────────────           ──────────────────────────          │
│                                                                              │
│  1. CREATE TRANSFER REQUEST ───────────→ 2. RECEIVE & APPROVE REQUEST        │
│     (Low stock trigger or manual)           (Warehouse manager approval)     │
│     Status: REQUESTED                       Status: APPROVED / REJECTED      │
│                                                     │                        │
│                                                     ▼                        │
│                                          3. PICK & PACK STOCK                │
│                                             (Picking list generated)         │
│                                             Status: PICKING → PACKED         │
│                                                     │                        │
│                                                     ▼                        │
│                                          4. GOODS ISSUE (GI)                 │
│                                             - Deduct from quantityAvailable  │
│                                             - Add to quantityInTransit       │
│                                             Status: SHIPPED                  │
│                                                     │                        │
│                              ◄───────────────────────                        │
│                                                                              │
│  5. IN TRANSIT                                                               │
│     (Stock cannot be sold)                                                   │
│     Status: IN_TRANSIT                                                       │
│              │                                                               │
│              ▼                                                               │
│  6. GOODS RECEIPT (GR)                                                       │
│     - Receive & verify shipment                                              │
│     - Record discrepancies (damaged, missing)                                │
│     Status: RECEIVED                                                         │
│              │                                                               │
│              ▼                                                               │
│  7. PUTAWAY                                                                  │
│     - Deduct from quantityInTransit                                          │
│     - Add to quantityAvailable (destination)                                 │
│     - Assign rack/bin/zone/aisle                                             │
│     Status: COMPLETED                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7.2 State Machine

```
                                    ┌──────────┐
                                    │ REJECTED │
                                    └──────────┘
                                         ▲
                                         │
┌───────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐    ┌─────────┐
│ REQUESTED │───→│ APPROVED │───→│ PICKING  │───→│ PACKED │───→│ SHIPPED │
└───────────┘    └──────────┘    └──────────┘    └────────┘    └─────────┘
                      │                │              │              │
                      ▼                ▼              ▼              ▼
                ┌───────────┐   ┌───────────┐  ┌───────────┐        │
                │ CANCELLED │   │ CANCELLED │  │ CANCELLED │        │
                └───────────┘   └───────────┘  └───────────┘        │
                                                                    ▼
┌───────────┐    ┌──────────┐    ┌────────────┐              ┌────────────┐
│ COMPLETED │◄───│ PUTAWAY  │◄───│  RECEIVED  │◄─────────────│ IN_TRANSIT │
└───────────┘    └──────────┘    └────────────┘              └────────────┘
```

### Valid Status Transitions

| Current Status | Allowed Next Status |
|----------------|---------------------|
| `requested` | `approved`, `rejected`, `cancelled` |
| `approved` | `picking`, `cancelled` |
| `picking` | `packed`, `cancelled` |
| `packed` | `shipped`, `cancelled` |
| `shipped` | `in_transit` |
| `in_transit` | `received` |
| `received` | `putaway` |
| `putaway` | `completed` |

### Status Descriptions

| Status | Description | Who Acts |
|--------|-------------|----------|
| `requested` | Transfer requested, awaiting approval | Destination |
| `approved` | Source warehouse approved the request | Source |
| `rejected` | Source warehouse rejected the request | Source |
| `picking` | Items being picked from shelves | Source |
| `packed` | Items packed and ready for shipment | Source |
| `shipped` | Goods issued, in transit | Source |
| `in_transit` | Stock is being transported | - |
| `received` | Destination received the shipment | Destination |
| `putaway` | Items being placed on shelves | Destination |
| `completed` | Transfer fully completed | Destination |
| `cancelled` | Transfer cancelled (before shipping) | Either |

---

## 7.3 Database Schema

### Migration File

**Location:** `services/inventory-service/migrations/0006_stock_transfer.sql`

```sql
-- Stock Transfer Orders (Main document)
CREATE TABLE stock_transfer_orders (
  id TEXT PRIMARY KEY,

  -- Document identification
  transfer_number TEXT UNIQUE NOT NULL,  -- e.g., "STO-2025-0001"

  -- Warehouses
  source_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  destination_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),

  -- Request info
  requested_by TEXT,                     -- User who requested
  request_reason TEXT,                   -- 'low_stock' | 'replenishment' | 'rebalancing' | 'manual'
  priority TEXT DEFAULT 'normal',        -- 'low' | 'normal' | 'high' | 'urgent'

  -- Approval info
  approved_by TEXT,
  approved_at TEXT,
  rejection_reason TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'requested',
  -- 'requested' | 'approved' | 'rejected' | 'picking' | 'packed' | 'shipped'
  -- | 'in_transit' | 'received' | 'putaway' | 'completed' | 'cancelled'

  -- Shipping info
  shipped_at TEXT,
  carrier TEXT,
  tracking_number TEXT,
  estimated_arrival TEXT,

  -- Receipt info
  received_at TEXT,
  received_by TEXT,
  putaway_at TEXT,
  completed_at TEXT,

  -- Notes
  notes TEXT,
  cancellation_reason TEXT,

  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Stock Transfer Items (Line items)
CREATE TABLE stock_transfer_items (
  id TEXT PRIMARY KEY,

  transfer_order_id TEXT NOT NULL REFERENCES stock_transfer_orders(id) ON DELETE CASCADE,

  -- Product reference
  product_id TEXT NOT NULL,
  variant_id TEXT,
  uom_id TEXT,

  -- Quantities
  quantity_requested INTEGER NOT NULL,    -- Originally requested
  quantity_approved INTEGER,              -- Approved by source warehouse
  quantity_picked INTEGER DEFAULT 0,      -- Actually picked
  quantity_shipped INTEGER DEFAULT 0,     -- Actually shipped
  quantity_received INTEGER DEFAULT 0,    -- Received at destination
  quantity_putaway INTEGER DEFAULT 0,     -- Put away to shelf

  -- Discrepancy tracking
  quantity_damaged INTEGER DEFAULT 0,     -- Damaged during transit
  quantity_missing INTEGER DEFAULT 0,     -- Missing/lost
  discrepancy_notes TEXT,

  -- Batch tracking (if using batches)
  source_batch_id TEXT,
  destination_batch_id TEXT,

  -- Source location
  source_rack TEXT,
  source_bin TEXT,
  source_zone TEXT,
  source_aisle TEXT,

  -- Destination location
  destination_rack TEXT,
  destination_bin TEXT,
  destination_zone TEXT,
  destination_aisle TEXT,

  -- Status (item-level)
  item_status TEXT DEFAULT 'pending',
  -- 'pending' | 'picked' | 'packed' | 'shipped' | 'received' | 'putaway' | 'completed'

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Stock Transfer Logs (Audit trail)
CREATE TABLE stock_transfer_logs (
  id TEXT PRIMARY KEY,

  transfer_order_id TEXT NOT NULL REFERENCES stock_transfer_orders(id) ON DELETE CASCADE,
  transfer_item_id TEXT REFERENCES stock_transfer_items(id),

  -- Action details
  action TEXT NOT NULL,  -- 'created' | 'approved' | 'rejected' | 'picking_started' | etc.
  previous_status TEXT,
  new_status TEXT,

  -- Context
  performed_by TEXT,
  notes TEXT,
  metadata TEXT,  -- JSON for additional data

  -- Timestamp
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_sto_source_warehouse ON stock_transfer_orders(source_warehouse_id);
CREATE INDEX idx_sto_dest_warehouse ON stock_transfer_orders(destination_warehouse_id);
CREATE INDEX idx_sto_status ON stock_transfer_orders(status);
CREATE INDEX idx_sto_transfer_number ON stock_transfer_orders(transfer_number);
CREATE INDEX idx_sto_created_at ON stock_transfer_orders(created_at);
CREATE INDEX idx_sti_transfer_order ON stock_transfer_items(transfer_order_id);
CREATE INDEX idx_sti_product ON stock_transfer_items(product_id);
CREATE INDEX idx_stl_transfer_order ON stock_transfer_logs(transfer_order_id);
```

---

## 7.4 TypeScript Schema

**Location:** `services/inventory-service/src/infrastructure/db/schema.ts`

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { warehouses } from './warehouses';

// Stock Transfer Orders
export const stockTransferOrders = sqliteTable('stock_transfer_orders', {
  id: text('id').primaryKey(),

  transferNumber: text('transfer_number').unique().notNull(),

  sourceWarehouseId: text('source_warehouse_id').notNull()
    .references(() => warehouses.id),
  destinationWarehouseId: text('destination_warehouse_id').notNull()
    .references(() => warehouses.id),

  requestedBy: text('requested_by'),
  requestReason: text('request_reason'), // 'low_stock' | 'replenishment' | 'rebalancing' | 'manual'
  priority: text('priority').default('normal'),

  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  rejectionReason: text('rejection_reason'),

  status: text('status').notNull().default('requested'),

  shippedAt: text('shipped_at'),
  carrier: text('carrier'),
  trackingNumber: text('tracking_number'),
  estimatedArrival: text('estimated_arrival'),

  receivedAt: text('received_at'),
  receivedBy: text('received_by'),
  putawayAt: text('putaway_at'),
  completedAt: text('completed_at'),

  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),

  version: integer('version').default(1).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

// Stock Transfer Items
export const stockTransferItems = sqliteTable('stock_transfer_items', {
  id: text('id').primaryKey(),

  transferOrderId: text('transfer_order_id').notNull()
    .references(() => stockTransferOrders.id, { onDelete: 'cascade' }),

  productId: text('product_id').notNull(),
  variantId: text('variant_id'),
  uomId: text('uom_id'),

  quantityRequested: integer('quantity_requested').notNull(),
  quantityApproved: integer('quantity_approved'),
  quantityPicked: integer('quantity_picked').default(0),
  quantityShipped: integer('quantity_shipped').default(0),
  quantityReceived: integer('quantity_received').default(0),
  quantityPutaway: integer('quantity_putaway').default(0),

  quantityDamaged: integer('quantity_damaged').default(0),
  quantityMissing: integer('quantity_missing').default(0),
  discrepancyNotes: text('discrepancy_notes'),

  sourceBatchId: text('source_batch_id'),
  destinationBatchId: text('destination_batch_id'),

  sourceRack: text('source_rack'),
  sourceBin: text('source_bin'),
  sourceZone: text('source_zone'),
  sourceAisle: text('source_aisle'),

  destinationRack: text('destination_rack'),
  destinationBin: text('destination_bin'),
  destinationZone: text('destination_zone'),
  destinationAisle: text('destination_aisle'),

  itemStatus: text('item_status').default('pending'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Stock Transfer Logs
export const stockTransferLogs = sqliteTable('stock_transfer_logs', {
  id: text('id').primaryKey(),

  transferOrderId: text('transfer_order_id').notNull()
    .references(() => stockTransferOrders.id, { onDelete: 'cascade' }),
  transferItemId: text('transfer_item_id'),

  action: text('action').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),

  performedBy: text('performed_by'),
  notes: text('notes'),
  metadata: text('metadata'), // JSON

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Types
export type StockTransferOrder = typeof stockTransferOrders.$inferSelect;
export type InsertStockTransferOrder = typeof stockTransferOrders.$inferInsert;

export type StockTransferItem = typeof stockTransferItems.$inferSelect;
export type InsertStockTransferItem = typeof stockTransferItems.$inferInsert;

export type StockTransferLog = typeof stockTransferLogs.$inferSelect;
export type InsertStockTransferLog = typeof stockTransferLogs.$inferInsert;

// Status enum for type safety
export const TransferStatus = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PICKING: 'picking',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  RECEIVED: 'received',
  PUTAWAY: 'putaway',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type TransferStatusType = typeof TransferStatus[keyof typeof TransferStatus];
```

---

## 7.5 API Endpoints

### Transfer API Reference

| Method | Endpoint | Description | Actor |
|--------|----------|-------------|-------|
| POST | `/api/transfers/request` | Create transfer request | Destination |
| POST | `/api/transfers/:id/approve` | Approve transfer | Source |
| POST | `/api/transfers/:id/reject` | Reject transfer | Source |
| POST | `/api/transfers/:id/start-picking` | Start picking process | Source |
| POST | `/api/transfers/:id/confirm-picked` | Confirm items picked & pack | Source |
| POST | `/api/transfers/:id/ship` | **Goods Issue** - ship items | Source |
| POST | `/api/transfers/:id/receive` | **Goods Receipt** - receive items | Destination |
| POST | `/api/transfers/:id/putaway` | Complete transfer - putaway | Destination |
| POST | `/api/transfers/:id/cancel` | Cancel transfer | Either |
| GET | `/api/transfers/warehouse/:id` | Get transfers for warehouse | - |
| GET | `/api/transfers/:id` | Get transfer details | - |
| GET | `/api/transfers/number/:num` | Get by transfer number | - |

### Request/Response Examples

#### Create Transfer Request

```
POST /api/transfers/request
```

**Request:**
```json
{
  "sourceWarehouseId": "wh_central",
  "destinationWarehouseId": "wh_retail_01",
  "requestReason": "low_stock",
  "priority": "high",
  "notes": "Urgent replenishment for weekend sale",
  "items": [
    {
      "productId": "prod_001",
      "variantId": null,
      "uomId": null,
      "quantityRequested": 100
    },
    {
      "productId": "prod_002",
      "quantityRequested": 50
    }
  ]
}
```

**Response:**
```json
{
  "transferOrder": {
    "id": "sto_abc123",
    "transferNumber": "STO-2025-0042",
    "sourceWarehouseId": "wh_central",
    "destinationWarehouseId": "wh_retail_01",
    "status": "requested",
    "priority": "high",
    "items": [
      {
        "id": "item_001",
        "productId": "prod_001",
        "quantityRequested": 100
      },
      {
        "id": "item_002",
        "productId": "prod_002",
        "quantityRequested": 50
      }
    ],
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "message": "Transfer request created"
}
```

#### Goods Issue (Ship)

```
POST /api/transfers/:id/ship
```

**Request:**
```json
{
  "carrier": "JNE",
  "trackingNumber": "JNE1234567890",
  "estimatedArrival": "2025-01-17",
  "notes": "Shipped via JNE REG"
}
```

**What happens:**
1. Stock deducted from source warehouse `quantityAvailable`
2. Stock added to source warehouse `quantityInTransit`
3. Inventory movement recorded as `transfer_out`
4. Status changes to `SHIPPED` then `IN_TRANSIT`
5. WebSocket event broadcast to both warehouses

#### Goods Receipt (Receive)

```
POST /api/transfers/:id/receive
```

**Request:**
```json
{
  "items": [
    {
      "itemId": "item_001",
      "quantityReceived": 98,
      "quantityDamaged": 2,
      "quantityMissing": 0,
      "discrepancyNotes": "2 units arrived with damaged packaging"
    },
    {
      "itemId": "item_002",
      "quantityReceived": 50,
      "quantityDamaged": 0,
      "quantityMissing": 0
    }
  ],
  "notes": "Received shipment, minor damage noted"
}
```

#### Putaway (Complete)

```
POST /api/transfers/:id/putaway
```

**Request:**
```json
{
  "items": [
    {
      "itemId": "item_001",
      "quantityPutaway": 98,
      "destinationRack": "A",
      "destinationBin": "01",
      "destinationZone": "FAST-MOVING",
      "destinationAisle": "1"
    },
    {
      "itemId": "item_002",
      "quantityPutaway": 50,
      "destinationRack": "B",
      "destinationBin": "05",
      "destinationZone": "BEVERAGES",
      "destinationAisle": "2"
    }
  ]
}
```

**What happens:**
1. Stock deducted from source warehouse `quantityInTransit`
2. Stock added to destination warehouse `quantityAvailable`
3. Inventory movement recorded as `transfer_in`
4. New inventory record created at destination (if needed)
5. Status changes to `COMPLETED`
6. WebSocket event broadcast

---

## 7.6 WebSocket Events

### Event Types

```typescript
export interface TransferEvent {
  type:
    | 'transfer.requested'
    | 'transfer.approved'
    | 'transfer.rejected'
    | 'transfer.picking_started'
    | 'transfer.packed'
    | 'transfer.shipped'
    | 'transfer.received'
    | 'transfer.completed'
    | 'transfer.cancelled';
  data: {
    transferId: string;
    transferNumber: string;
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    timestamp: string;
    [key: string]: any;
  };
}
```

### Broadcast Logic

Events are broadcast to:
1. Source warehouse channel: `warehouse:{sourceWarehouseId}`
2. Destination warehouse channel: `warehouse:{destinationWarehouseId}`
3. Global channel: `global`

### Example Event

```json
{
  "type": "transfer.shipped",
  "channel": "warehouse:wh_central",
  "data": {
    "transferId": "sto_abc123",
    "transferNumber": "STO-2025-0042",
    "sourceWarehouseId": "wh_central",
    "destinationWarehouseId": "wh_retail_01",
    "carrier": "JNE",
    "trackingNumber": "JNE1234567890",
    "itemCount": 2,
    "timestamp": "2025-01-15T14:30:00Z"
  }
}
```

---

## 7.7 Auto-Trigger on Low Stock

### Optional Feature: Automatic Transfer Requests

```typescript
async function checkAndTriggerTransfer(
  env: Env,
  productId: string,
  warehouseId: string
) {
  const db = drizzle(env.DB);

  // Get inventory at this warehouse
  const inv = await db.select().from(inventory)
    .where(and(
      eq(inventory.productId, productId),
      eq(inventory.warehouseId, warehouseId)
    )).get();

  if (!inv || !inv.minimumStock) return;

  // Check if below minimum
  if (inv.quantityAvailable < inv.minimumStock) {
    // Find warehouse with highest stock of this product
    const otherWarehouses = await db.select().from(inventory)
      .where(and(
        eq(inventory.productId, productId),
        ne(inventory.warehouseId, warehouseId)
      ))
      .orderBy(desc(inventory.quantityAvailable))
      .all();

    const sourceWarehouse = otherWarehouses.find(
      w => w.quantityAvailable > inv.minimumStock
    );

    if (sourceWarehouse) {
      const quantityNeeded = inv.minimumStock - inv.quantityAvailable;

      // Create automatic transfer request
      await createTransferRequest({
        sourceWarehouseId: sourceWarehouse.warehouseId,
        destinationWarehouseId: warehouseId,
        requestReason: 'low_stock',
        priority: 'high',
        items: [{
          productId,
          quantityRequested: quantityNeeded
        }]
      });

      console.log(`Auto-triggered transfer: ${quantityNeeded} units`);
    }
  }
}
```

---

## 7.8 Inventory Movement Types

### Related Good Receipt/Issue Types

| Movement Type | Direction | Context | Creates |
|--------------|-----------|---------|---------|
| `transfer_out` | OUT | Goods Issue at source | Deduct available, Add in-transit |
| `transfer_in` | IN | Goods Receipt at destination | Deduct in-transit, Add available |

### Integration with Good Receipt/Issue Workflow

This phase integrates with the general [Good Receipt/Issue Workflow](./GOOD_RECEIPT_ISSUE_WORKFLOW.md):

| GR/GI Type | Transfer Phase |
|------------|----------------|
| `TRANSFER_OUT` | Step 4: Ship (Goods Issue) |
| `TRANSFER_IN` | Step 7: Putaway (Goods Receipt) |

---

## 7.9 Discrepancy Handling

### Types of Discrepancies

| Type | Description | Handling |
|------|-------------|----------|
| **Damaged** | Items arrived damaged | Record qty, create loss entry |
| **Missing** | Items not in shipment | Record qty, investigate |
| **Overage** | More items than shipped | Record qty, return or accept |

### Discrepancy Report

When transfer completes with discrepancies:

```json
{
  "transferNumber": "STO-2025-0042",
  "discrepancies": [
    {
      "productId": "prod_001",
      "productName": "Indomie Goreng",
      "quantityShipped": 100,
      "quantityReceived": 98,
      "quantityDamaged": 2,
      "quantityMissing": 0,
      "notes": "2 units damaged - crushed packaging"
    }
  ],
  "totalDamagedValue": 7000,
  "totalMissingValue": 0,
  "requiresInvestigation": false
}
```

---

## 7.10 Accounting Integration

### Journal Entries

Inter-warehouse transfers within the same legal entity do **NOT** create accounting journal entries (no change in asset value, just location).

However, discrepancies may create entries:

| Event | Journal Entry |
|-------|---------------|
| Damaged goods | DR Inventory Loss (6820), CR Inventory (1210) |
| Missing goods | DR Inventory Shortage (6821), CR Inventory (1210) |

See [Asset Accounting Business Rules - Rule 19](../accounting/ASSET_ACCOUNTING_BUSINESS_RULES.md) for details.

---

## 7.11 UI Components

### Transfer List Page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📦 Stock Transfers                                              [+ New]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Warehouse: [All ▼]   Direction: [All ▼]   Status: [All ▼]   [🔍 Search]    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ STO#          │ From          │ To            │ Status     │ Date      │ │
│  ├───────────────┼───────────────┼───────────────┼────────────┼───────────┤ │
│  │ STO-2025-0042 │ Central WH    │ Retail Store 1│ 🚚 Transit │ 15 Jan    │ │
│  │ STO-2025-0041 │ Central WH    │ Retail Store 2│ ✅ Complete│ 14 Jan    │ │
│  │ STO-2025-0040 │ Retail Store 1│ Central WH    │ ⏳ Pending │ 13 Jan    │ │
│  │ STO-2025-0039 │ Central WH    │ Retail Store 1│ ❌ Rejected│ 12 Jan    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Showing 1-10 of 42 transfers                              [< 1 2 3 4 5 >]  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Transfer Detail Page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📦 Transfer STO-2025-0042                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Status: 🚚 IN TRANSIT                     Priority: 🔴 HIGH                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  REQUESTED → APPROVED → PICKING → PACKED → SHIPPED → IN_TRANSIT    │    │
│  │      ✓          ✓          ✓         ✓         ✓          ●        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  From: Central Warehouse           To: Retail Store 1                        │
│  Carrier: JNE                      Tracking: JNE1234567890                   │
│  Shipped: 15 Jan 2025 14:30        ETA: 17 Jan 2025                          │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│  Items                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Product           │ Requested │ Shipped │ Received │ Status           │ │
│  ├───────────────────┼───────────┼─────────┼──────────┼──────────────────┤ │
│  │ Indomie Goreng    │ 100       │ 100     │ -        │ 🚚 In Transit    │ │
│  │ Teh Botol Sosro   │ 50        │ 50      │ -        │ 🚚 In Transit    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│  Activity Log                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 15 Jan 14:30 │ Shipped by warehouse_staff_01                          │ │
│  │ 15 Jan 11:00 │ Packed and ready for shipment                          │ │
│  │ 15 Jan 10:00 │ Picking started by warehouse_staff_01                  │ │
│  │ 15 Jan 09:30 │ Approved by warehouse_manager_01                       │ │
│  │ 15 Jan 09:00 │ Transfer requested by retail_manager_01                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [Cancel Transfer]                                      [Mark as Received]   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7.12 Deliverables Checklist

- [ ] Migration SQL created (`0006_stock_transfer.sql`)
- [ ] Schema.ts updated with transfer entities
- [ ] Transfer routes implemented with state machine
- [ ] Goods Issue deducts from source, adds to in-transit
- [ ] Goods Receipt deducts from in-transit, adds to destination
- [ ] WebSocket events for all transfer status changes
- [ ] Auto-trigger transfer on low stock (optional)
- [ ] Complete audit trail in `stock_transfer_logs`
- [ ] Discrepancy handling (damaged, missing)
- [ ] UI components (list, detail, forms)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

---

## Related Documentation

- [DDD Refactoring Roadmap](../../ddd/DDD_REFACTORING_ROADMAP.md) - Master plan (lines 1101-2399)
- [Good Receipt/Issue Workflow](./GOOD_RECEIPT_ISSUE_WORKFLOW.md) - GR/GI integration
- [WebSocket Real-Time Inventory](./WEBSOCKET_REALTIME_INVENTORY.md) - Real-time events
- [Business Rules](./BUSINESS_RULES.md) - Inventory business rules
- [Phase 6: Testing & Validation](./PHASE_6_TESTING_VALIDATION.md) - Previous phase
- [Phase 8: Stock Opname & Physical Bundles](../../ddd/DDD_REFACTORING_ROADMAP.md) - Next phase
