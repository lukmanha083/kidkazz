# Phase 3 Implementation: WebSocket & Optimistic Locking

**Status**: Completed
**Reference**: [DDD Refactoring Roadmap](./DDD_REFACTORING_ROADMAP.md)

## Overview

Phase 3 implements real-time WebSocket communication and optimistic locking for concurrent inventory updates.

## Implemented Features

### 1. WebSocket Durable Object

**File**: `services/inventory-service/src/durable-objects/InventoryUpdatesBroadcaster.ts`

#### Event Types
```typescript
type InventoryEventType =
  | 'inventory.updated'
  | 'inventory.low_stock'
  | 'inventory.out_of_stock'
  | 'batch.expiring_soon'
  | 'transfer.requested'
  | 'transfer.approved'
  | 'transfer.rejected'
  | 'transfer.picking_started'
  | 'transfer.packed'
  | 'transfer.shipped'
  | 'transfer.received'
  | 'transfer.completed'
  | 'transfer.cancelled';
```

#### Event Structure
```typescript
interface InventoryEvent {
  type: InventoryEventType;
  data: {
    inventoryId?: string;
    productId?: string;
    warehouseId?: string;
    variantId?: string;
    uomId?: string;
    quantityAvailable?: number;
    quantityReserved?: number;
    version?: number;
    previousQuantity?: number;
    changeAmount?: number;
    movementType?: string;
    timestamp: string;
  };
}
```

#### Channel Subscriptions
Clients can subscribe to specific channels:
- `global` - Receive all updates (default)
- `product:{productId}` - Updates for a specific product
- `warehouse:{warehouseId}` - Updates for a specific warehouse
- `variant:{variantId}` - Updates for a specific variant
- `uom:{uomId}` - Updates for a specific UOM
- `product:{productId}:warehouse:{warehouseId}` - Specific product+warehouse
- `transfer:{transferId}` - Updates for a specific transfer

### 2. WebSocket Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /ws` | WebSocket connection for inventory updates |
| `GET /ws/warehouses` | WebSocket connection for warehouse updates |

### 3. WebSocket Client Usage

```javascript
// Connect
const ws = new WebSocket('wss://inventory-service/ws');

ws.onopen = () => {
  // Subscribe to specific channel
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'product:prod-123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.data);
};

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channel: 'product:prod-123'
}));

// Ping/pong for connection health
ws.send(JSON.stringify({ type: 'ping' }));
```

### 4. Optimistic Locking

**File**: `services/inventory-service/src/routes/inventory.ts`

#### How It Works
1. Read current inventory record with `version`
2. Update with `WHERE version = currentVersion`
3. If no rows updated (version mismatch), retry with exponential backoff
4. After 3 retries, return `409 Conflict`

#### Configuration
```typescript
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 100; // 100ms, 200ms, 400ms
```

#### Error Response
```json
{
  "error": "Concurrent update conflict. Please refresh and try again.",
  "code": "OPTIMISTIC_LOCK_FAILURE"
}
```

### 5. New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/variant/:variantId` | Get stock for variant across warehouses |
| GET | `/api/inventory/uom/:uomId` | Get stock for UOM across warehouses |
| GET | `/api/inventory/low-stock` | Get all low stock items |

#### Variant Endpoint Response
```json
{
  "variantId": "variant-123",
  "warehouses": [...],
  "totalAvailable": 150,
  "totalReserved": 10,
  "isLowStock": false
}
```

#### Low Stock Endpoint Response
```json
{
  "items": [
    {
      "inventoryId": "inv-123",
      "productId": "prod-456",
      "warehouseId": "wh-001",
      "variantId": null,
      "quantityAvailable": 5,
      "minimumStock": 10,
      "deficit": 5,
      "version": 3
    }
  ],
  "total": 1,
  "timestamp": "2025-12-10T..."
}
```

### 6. Adjust Inventory with Optimistic Locking

**Endpoint**: `POST /api/inventory/adjust`

```json
{
  "warehouseId": "wh-001",
  "productId": "prod-123",
  "variantId": "variant-456",
  "uomId": "uom-box",
  "quantity": 10,
  "movementType": "in",
  "source": "warehouse",
  "reason": "Restock",
  "rack": "A1",
  "bin": "05",
  "zone": "Main",
  "aisle": "Aisle-1"
}
```

### 7. Broadcast Utility

**File**: `services/inventory-service/src/infrastructure/broadcast.ts`

```typescript
import { broadcastInventoryEvent } from '../infrastructure/broadcast';

// Broadcast an event
await broadcastInventoryEvent(env, {
  type: 'inventory.updated',
  data: {
    productId: 'prod-123',
    warehouseId: 'wh-001',
    quantityAvailable: 100,
    version: 5,
    timestamp: new Date().toISOString(),
  },
});
```

## File Changes Summary

| File | Changes |
|------|---------|
| `durable-objects/InventoryUpdatesBroadcaster.ts` | New event types, channel subscriptions |
| `routes/inventory.ts` | Optimistic locking, variant/UOM endpoints |
| `infrastructure/broadcast.ts` | Simplified to single broadcast function |
| `index.ts` | Clean WebSocket endpoints |

## Testing

Unit tests are deferred to Phase 4 completion. After Phase 4:
1. Add integration tests for WebSocket connections
2. Add tests for optimistic locking scenarios
3. Add tests for new endpoints

## Next Steps

**Phase 4**: Product Service Schema Cleanup
- Remove stock fields from Product Service
- Keep location tables (rack, bin, zone, aisle)
- Update TypeScript types
