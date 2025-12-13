# WebSocket Real-Time Inventory Implementation Guide

**Status**: 📋 Planned - To be implemented after Phase 1-4 testing completion
**Priority**: High - Critical for omnichannel sales and race condition prevention
**Branch**: TBD (create after DDD testing passes)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Race Condition Prevention](#race-condition-prevention)
4. [WebSocket Implementation](#websocket-implementation)
5. [Frontend Integration](#frontend-integration)
6. [Testing Guide](#testing-guide)
7. [Migration Plan](#migration-plan)

---

## Overview

### Problem Statement

**Omnichannel Sales Challenges**:
- Multiple sales channels (online store, mobile app, admin dashboard, POS terminals)
- Concurrent inventory updates causing race conditions
- Stock displayed in one channel becomes outdated when another channel makes a sale
- Risk of overselling when stock updates aren't synchronized in real-time

**Current Limitation**:
- Frontend fetches stock via polling or manual refresh
- No instant notification of stock changes
- Race conditions possible during concurrent updates

**Solution**:
- WebSocket-based real-time inventory updates
- Optimistic locking to prevent lost updates
- Broadcast inventory changes to all connected clients
- Instant low-stock and out-of-stock alerts

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Workers                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐         ┌───────────────────────────────┐  │
│  │ Inventory Service  │◄───────►│  WebSocket Durable Object     │  │
│  │   (HTTP + WS)      │         │   (Connection Manager)        │  │
│  │                    │         │                               │  │
│  │ - REST API         │         │ - Manage connections          │  │
│  │ - Inventory ops    │         │ - Broadcast events            │  │
│  │ - Optimistic lock  │         │ - Handle reconnection         │  │
│  └──────────┬─────────┘         └────────────┬──────────────────┘  │
│             │                                 │                     │
│             │ Stock changes                   │ Push events         │
│             │ trigger broadcast               │                     │
│             ▼                                 ▼                     │
│  ┌────────────────────┐         ┌───────────────────────────────┐  │
│  │  D1 Database       │         │     Connected Clients         │  │
│  │                    │         │                               │  │
│  │ + version field    │         │ - Admin dashboards            │  │
│  │ + lastModified     │         │ - POS terminals               │  │
│  │                    │         │ - Mobile apps                 │  │
│  └────────────────────┘         │ - Web storefronts             │  │
│                                 └───────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Inventory Service (HTTP API)**:
- Handle inventory CRUD operations
- Implement optimistic locking
- Trigger WebSocket broadcasts on changes
- Validate concurrent updates

**WebSocket Durable Object**:
- Manage persistent WebSocket connections
- Broadcast events to all subscribers
- Handle connection lifecycle
- Implement room-based subscriptions (per warehouse, per product)

**Frontend Clients**:
- Establish WebSocket connection on load
- Subscribe to relevant inventory channels
- Update UI in real-time on events
- Handle reconnection with exponential backoff

---

## Race Condition Prevention

### Optimistic Locking Strategy

**Problem**: Two users simultaneously update the same inventory record

```
Time    User A                      User B                    Stock
────────────────────────────────────────────────────────────────────
T0      Reads stock = 100           -                         100
T1      -                           Reads stock = 100         100
T2      Sells 10 units             -                          100
T3      -                           Sells 5 units             100
T4      Writes stock = 90          -                          90
T5      -                           Writes stock = 95         95 ❌

Result: Lost update! User A's sale overwritten by User B
```

**Solution**: Add version field

```sql
-- Inventory table with version field
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  warehouseId TEXT NOT NULL,
  quantityAvailable INTEGER NOT NULL DEFAULT 0,
  quantityReserved INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,  -- ✅ Optimistic lock
  lastModifiedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  -- ... other fields
);

-- Index for quick version checks
CREATE INDEX idx_inventory_version
  ON inventory(productId, warehouseId, version);
```

### Update Flow with Optimistic Locking

**Step 1: Read with Version**
```typescript
const inventory = await db
  .select()
  .from(inventoryTable)
  .where(
    and(
      eq(inventoryTable.productId, productId),
      eq(inventoryTable.warehouseId, warehouseId)
    )
  )
  .get();

// Store current version
const currentVersion = inventory.version;
```

**Step 2: Update with Version Check**
```typescript
const result = await db
  .update(inventoryTable)
  .set({
    quantityAvailable: inventory.quantityAvailable - quantity,
    version: currentVersion + 1,  // Increment version
    lastModifiedAt: new Date().toISOString(),
  })
  .where(
    and(
      eq(inventoryTable.productId, productId),
      eq(inventoryTable.warehouseId, warehouseId),
      eq(inventoryTable.version, currentVersion)  // ✅ Must match!
    )
  )
  .run();

// Check if update succeeded
if (result.changes === 0) {
  // Version mismatch - concurrent update detected!
  throw new Error('Concurrent update detected. Please retry.');
}
```

**Step 3: Broadcast Change via WebSocket**
```typescript
// After successful update, broadcast to all connected clients
await env.INVENTORY_WS.broadcast({
  type: 'inventory.updated',
  data: {
    productId,
    warehouseId,
    quantityAvailable: newQuantity,
    quantityReserved,
    version: currentVersion + 1,
    timestamp: new Date().toISOString(),
  }
});
```

### Conflict Resolution Flow

```
Time    User A                      User B                    Version
────────────────────────────────────────────────────────────────────
T0      Read (v=1, stock=100)       -                         1
T1      -                           Read (v=1, stock=100)     1
T2      UPDATE where v=1            -                         1
        SET stock=90, v=2
        → Success ✅                                           2
T3      -                           UPDATE where v=1          2
                                    SET stock=95, v=2
                                    → FAILS (v≠1) ❌          2
T4      -                           Retry: Read (v=2, stock=90)  2
T5      -                           UPDATE where v=2          2
                                    SET stock=85, v=3
                                    → Success ✅                 3

Result: Both updates applied correctly, no lost updates!
```

---

## WebSocket Implementation

### Phase 5A: Database Migration

**File**: `services/inventory-service/migrations/0004_add_optimistic_locking.sql`

```sql
-- Add version and timestamp fields for optimistic locking
ALTER TABLE inventory
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE inventory
  ADD COLUMN lastModifiedAt TEXT DEFAULT CURRENT_TIMESTAMP;

-- Create index for efficient version checks
CREATE INDEX idx_inventory_version
  ON inventory(productId, warehouseId, version);

-- Update existing records to version 1
UPDATE inventory SET version = 1 WHERE version IS NULL;

-- Same for inventory_batches
ALTER TABLE inventory_batches
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE inventory_batches
  ADD COLUMN lastModifiedAt TEXT DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_batches_version
  ON inventory_batches(batchNumber, version);
```

### Phase 5B: WebSocket Durable Object

**File**: `services/inventory-service/src/websocket/InventoryWebSocket.ts`

```typescript
import { DurableObject } from 'cloudflare:workers';

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channel?: string; // e.g., "product:123", "warehouse:456", "global"
}

export interface InventoryEvent {
  type: 'inventory.updated' | 'inventory.low_stock' | 'inventory.out_of_stock' | 'batch.expiring_soon';
  data: {
    productId?: string;
    warehouseId?: string;
    batchId?: string;
    quantityAvailable?: number;
    quantityReserved?: number;
    version?: number;
    timestamp: string;
    [key: string]: any;
  };
}

export class InventoryWebSocket extends DurableObject {
  private sessions: Map<WebSocket, Set<string>> = new Map(); // WebSocket -> subscribed channels

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Upgrade HTTP connection to WebSocket
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept connection
    this.ctx.acceptWebSocket(server);

    // Initialize session with empty subscriptions
    this.sessions.set(server, new Set(['global'])); // Subscribe to global by default

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const msg = JSON.parse(message.toString()) as WebSocketMessage;
      const subscriptions = this.sessions.get(ws);

      if (!subscriptions) return;

      switch (msg.type) {
        case 'subscribe':
          if (msg.channel) {
            subscriptions.add(msg.channel);
            ws.send(JSON.stringify({
              type: 'subscribed',
              channel: msg.channel
            }));
          }
          break;

        case 'unsubscribe':
          if (msg.channel) {
            subscriptions.delete(msg.channel);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              channel: msg.channel
            }));
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.sessions.delete(ws);
  }

  // Broadcast event to all subscribers
  async broadcast(event: InventoryEvent): Promise<void> {
    const eventChannel = this.getEventChannel(event);
    const message = JSON.stringify(event);

    for (const [ws, subscriptions] of this.sessions.entries()) {
      // Send if subscribed to specific channel or global
      if (subscriptions.has(eventChannel) || subscriptions.has('global')) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('Failed to send to client:', error);
          this.sessions.delete(ws);
        }
      }
    }
  }

  private getEventChannel(event: InventoryEvent): string {
    const { productId, warehouseId } = event.data;

    if (productId && warehouseId) {
      return `product:${productId}:warehouse:${warehouseId}`;
    } else if (productId) {
      return `product:${productId}`;
    } else if (warehouseId) {
      return `warehouse:${warehouseId}`;
    }

    return 'global';
  }
}
```

**Wrangler Configuration**: `services/inventory-service/wrangler.jsonc`

```jsonc
{
  // ... existing config
  "durable_objects": {
    "bindings": [
      {
        "name": "INVENTORY_WS",
        "class_name": "InventoryWebSocket",
        "script_name": "inventory-service"
      }
    ]
  }
}
```

### Phase 5C: Inventory Service Updates

**File**: `services/inventory-service/src/routes/inventory.ts`

Add broadcast helper function:

```typescript
async function broadcastInventoryChange(
  env: Env,
  type: InventoryEvent['type'],
  data: InventoryEvent['data']
) {
  try {
    const wsId = env.INVENTORY_WS.idFromName('inventory-updates');
    const wsStub = env.INVENTORY_WS.get(wsId);

    await wsStub.fetch('http://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });
  } catch (error) {
    console.error('Failed to broadcast inventory change:', error);
    // Don't fail the operation if broadcast fails
  }
}
```

Update inventory adjustment endpoint with optimistic locking:

```typescript
// POST /api/inventory/adjust - Adjust inventory with optimistic locking
app.post('/adjust', async (c) => {
  const data = await c.req.json() as InventoryAdjustmentInput;
  const { productId, warehouseId, quantity, movementType, reason, performedBy } = data;

  // Retry logic for optimistic locking conflicts
  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // 1. Get current inventory with version
      const inventory = await db
        .select()
        .from(inventoryTable)
        .where(
          and(
            eq(inventoryTable.productId, productId),
            eq(inventoryTable.warehouseId, warehouseId)
          )
        )
        .get();

      if (!inventory) {
        return c.json({ error: 'Inventory not found' }, 404);
      }

      const currentVersion = inventory.version;
      const previousQuantity = inventory.quantityAvailable;

      // 2. Calculate new quantity
      let newQuantity: number;
      if (movementType === 'in' || movementType === 'adjustment' && quantity > 0) {
        newQuantity = previousQuantity + Math.abs(quantity);
      } else {
        newQuantity = Math.max(0, previousQuantity - Math.abs(quantity));
      }

      // 3. Update with version check (optimistic lock)
      const updateResult = await db
        .update(inventoryTable)
        .set({
          quantityAvailable: newQuantity,
          version: currentVersion + 1,  // Increment version
          lastModifiedAt: new Date().toISOString(),
          lastRestockedAt: movementType === 'in' ? new Date().toISOString() : inventory.lastRestockedAt,
        })
        .where(
          and(
            eq(inventoryTable.productId, productId),
            eq(inventoryTable.warehouseId, warehouseId),
            eq(inventoryTable.version, currentVersion)  // Version must match
          )
        )
        .run();

      // 4. Check if update succeeded
      if (updateResult.changes === 0) {
        retries++;
        if (retries >= MAX_RETRIES) {
          return c.json({
            error: 'Concurrent update detected. Maximum retries exceeded.',
            reason: 'Multiple simultaneous updates to the same inventory record'
          }, 409);
        }
        // Retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
        continue;  // Retry the loop
      }

      // 5. Create movement record
      const movement = await db
        .insert(movementTable)
        .values({
          id: crypto.randomUUID(),
          inventoryId: inventory.id,
          productId,
          warehouseId,
          movementType,
          quantity,
          reason,
          performedBy,
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get();

      // 6. Broadcast inventory change via WebSocket
      const eventType: InventoryEvent['type'] =
        newQuantity === 0 ? 'inventory.out_of_stock' :
        newQuantity < (inventory.minimumStock || 0) ? 'inventory.low_stock' :
        'inventory.updated';

      await broadcastInventoryChange(c.env, eventType, {
        productId,
        warehouseId,
        quantityAvailable: newQuantity,
        quantityReserved: inventory.quantityReserved,
        minimumStock: inventory.minimumStock,
        version: currentVersion + 1,
        previousQuantity,
        changeAmount: quantity,
        movementType,
        timestamp: new Date().toISOString(),
      });

      // Success!
      return c.json({
        inventoryId: inventory.id,
        productId,
        warehouseId,
        previousQuantity,
        newQuantity,
        version: currentVersion + 1,
        message: `Inventory adjusted successfully`,
        movement,
      });

    } catch (error) {
      console.error('Inventory adjustment error:', error);
      return c.json({ error: 'Failed to adjust inventory' }, 500);
    }
  }

  // Should never reach here
  return c.json({ error: 'Unexpected error' }, 500);
});
```

Add WebSocket endpoint:

```typescript
// GET /ws - WebSocket endpoint for real-time updates
app.get('/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');

  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected WebSocket' }, 426);
  }

  // Get or create the Durable Object instance
  const wsId = c.env.INVENTORY_WS.idFromName('inventory-updates');
  const wsStub = c.env.INVENTORY_WS.get(wsId);

  // Forward the WebSocket upgrade to the Durable Object
  return wsStub.fetch(c.req.raw);
});
```

---

## Frontend Integration

### Phase 5D: WebSocket Client Hook

**File**: `apps/admin-dashboard/src/hooks/useInventoryWebSocket.ts`

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface InventoryEvent {
  type: 'inventory.updated' | 'inventory.low_stock' | 'inventory.out_of_stock' | 'batch.expiring_soon';
  data: {
    productId?: string;
    warehouseId?: string;
    quantityAvailable?: number;
    quantityReserved?: number;
    version?: number;
    timestamp: string;
    [key: string]: any;
  };
}

export interface UseInventoryWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onEvent?: (event: InventoryEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useInventoryWebSocket(options: UseInventoryWebSocketOptions = {}) {
  const {
    url = import.meta.env.VITE_INVENTORY_WS_URL || 'ws://localhost:8792/ws',
    autoConnect = true,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('[InventoryWS] Connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        onConnect?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle internal messages
          if (message.type === 'pong' || message.type === 'subscribed' || message.type === 'unsubscribed') {
            return;
          }

          // Handle inventory events
          const inventoryEvent = message as InventoryEvent;

          // Invalidate relevant queries to refetch data
          if (inventoryEvent.data.productId) {
            queryClient.invalidateQueries({
              queryKey: ['products', inventoryEvent.data.productId, 'stock']
            });
          }

          if (inventoryEvent.data.warehouseId) {
            queryClient.invalidateQueries({
              queryKey: ['inventory', 'warehouse', inventoryEvent.data.warehouseId]
            });
          }

          queryClient.invalidateQueries({ queryKey: ['inventory'] });

          // Call custom event handler
          onEvent?.(inventoryEvent);

        } catch (error) {
          console.error('[InventoryWS] Failed to parse message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('[InventoryWS] Disconnected');
        setIsConnected(false);
        onDisconnect?.();

        // Attempt reconnection with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimeout.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, delay);
      };

      ws.current.onerror = (error) => {
        console.error('[InventoryWS] Error:', error);
        onError?.(error);
      };

    } catch (error) {
      console.error('[InventoryWS] Connection failed:', error);
    }
  }, [url, reconnectAttempts, onConnect, onDisconnect, onError, onEvent, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    ws.current?.close();
    ws.current = null;
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((channel: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}
```

### Phase 5E: Update Product Table with Real-Time Stock

**File**: `apps/admin-dashboard/src/routes/dashboard/products/all.tsx`

```typescript
import { useInventoryWebSocket } from '@/hooks/useInventoryWebSocket';
import { toast } from 'sonner';

function AllProductsPage() {
  // ... existing code ...

  // Connect to WebSocket for real-time updates
  const { isConnected } = useInventoryWebSocket({
    onEvent: (event) => {
      // Show toast notification for important events
      if (event.type === 'inventory.out_of_stock') {
        toast.error('Product out of stock', {
          description: `Product ${event.data.productId} is now out of stock`,
        });
      } else if (event.type === 'inventory.low_stock') {
        toast.warning('Low stock alert', {
          description: `Product ${event.data.productId} is running low`,
        });
      }

      // Update specific product stock in state if it's in current view
      if (event.data.productId && productStocks[event.data.productId]) {
        setProductStocks(prev => ({
          ...prev,
          [event.data.productId!]: {
            totalStock: event.data.quantityAvailable || 0,
            isLoading: false,
          }
        }));
      }
    },
  });

  return (
    <div>
      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'Live updates active' : 'Connecting...'}
        </span>
      </div>

      {/* ... rest of the component ... */}
    </div>
  );
}
```

---

## Testing Guide

### Test 1: Optimistic Locking

**Goal**: Verify concurrent updates are handled correctly

```bash
# Terminal 1: Start first update (with delay)
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_123",
    "warehouseId": "wh_456",
    "quantity": -10,
    "movementType": "out",
    "reason": "Sale from Terminal 1"
  }'

# Terminal 2: Immediately start second update
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_123",
    "warehouseId": "wh_456",
    "quantity": -5,
    "movementType": "out",
    "reason": "Sale from Terminal 2"
  }'

# Expected:
# - Both updates succeed (after retries)
# - Final stock = initial - 10 - 5
# - No lost updates
# - Version incremented by 2
```

### Test 2: WebSocket Connection

```javascript
// Browser console test
const ws = new WebSocket('ws://localhost:8792/ws');

ws.onopen = () => {
  console.log('Connected!');
  // Subscribe to specific product
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'product:prod_123'
  }));
};

ws.onmessage = (event) => {
  console.log('Event received:', JSON.parse(event.data));
};
```

### Test 3: Real-Time Stock Updates

```bash
# Step 1: Open admin dashboard in browser
# Navigate to products page

# Step 2: In terminal, adjust inventory
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_visible_in_dashboard",
    "warehouseId": "wh_456",
    "quantity": -20,
    "movementType": "out",
    "reason": "Testing real-time update"
  }'

# Expected:
# - Stock value in dashboard updates instantly
# - No manual refresh needed
# - Toast notification appears
# - "Live" indicator shows green
```

### Test 4: Concurrent Sales Scenario

```bash
# Simulate 5 concurrent sales from different channels
for i in {1..5}; do
  curl -X POST http://localhost:8792/api/inventory/adjust \
    -H "Content-Type: application/json" \
    -d "{
      \"productId\": \"prod_123\",
      \"warehouseId\": \"wh_456\",
      \"quantity\": -1,
      \"movementType\": \"out\",
      \"reason\": \"Concurrent sale $i\"
    }" &
done
wait

# Verify: All 5 sales processed correctly, stock reduced by exactly 5
```

---

## Migration Plan

### Prerequisites

✅ Phase 1-4 testing complete (DDD_REFACTORING_TESTING_GUIDE.md)
✅ All existing features working correctly
✅ Database backups created

### Step 1: Database Migration

```bash
# Apply migration 0004
cd services/inventory-service
npx wrangler d1 migrations apply inventory-db --local

# Verify migration
sqlite3 .wrangler/state/v3/d1/inventory-db/*.sqlite
> PRAGMA table_info(inventory);
# Should show 'version' and 'lastModifiedAt' columns
```

### Step 2: Deploy Inventory Service with WebSocket

```bash
# Update wrangler.jsonc with Durable Object binding
# Deploy to Cloudflare
cd services/inventory-service
npx wrangler deploy

# Test WebSocket endpoint
wscat -c wss://your-worker.workers.dev/ws
```

### Step 3: Update Frontend

```bash
# Add WebSocket hook
# Update components to use real-time updates
cd apps/admin-dashboard
npm run build
npm run deploy
```

### Step 4: Monitor and Verify

- Monitor WebSocket connections in Cloudflare dashboard
- Check for version conflicts in logs
- Verify real-time updates working
- Monitor performance metrics

### Rollback Plan

If issues occur:

```sql
-- Remove version columns
ALTER TABLE inventory DROP COLUMN version;
ALTER TABLE inventory DROP COLUMN lastModifiedAt;
ALTER TABLE inventory_batches DROP COLUMN version;
ALTER TABLE inventory_batches DROP COLUMN lastModifiedAt;
```

---

## Performance Considerations

### WebSocket Scaling

- Durable Objects handle up to 1000 concurrent connections each
- Use multiple DO instances for higher scale
- Monitor connection count and CPU usage

### Optimistic Locking Overhead

- Version check adds minimal latency (<5ms)
- Retries only occur on conflicts (rare in normal operation)
- Max 3 retries prevents infinite loops

### Broadcast Efficiency

- Room-based subscriptions reduce unnecessary messages
- Only send events to relevant subscribers
- Message size kept minimal (<1KB per event)

---

## Security Considerations

### Authentication

```typescript
// Add auth check before accepting WebSocket
app.get('/ws', async (c) => {
  const token = c.req.header('Authorization');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Verify JWT token
  const user = await verifyToken(token);

  if (!user) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Proceed with WebSocket upgrade
  // ...
});
```

### Rate Limiting

```typescript
// Limit broadcast frequency per client
const rateLimiter = new Map<string, number>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const lastSent = rateLimiter.get(clientId) || 0;

  if (now - lastSent < 100) { // Max 10 messages/second
    return false;
  }

  rateLimiter.set(clientId, now);
  return true;
}
```

---

## Summary

**Implementation Phases**:
1. ✅ Phase 1-4: Complete DDD refactoring (current)
2. 🔄 Phase 5A: Add optimistic locking (database migration)
3. 🔄 Phase 5B: Implement WebSocket Durable Object
4. 🔄 Phase 5C: Update Inventory Service with broadcasts
5. 🔄 Phase 5D: Frontend WebSocket integration
6. 🔄 Phase 5E: Real-time UI updates

**Benefits**:
- ✅ Prevents overselling in omnichannel sales
- ✅ Instant stock updates across all channels
- ✅ Race condition prevention via optimistic locking
- ✅ Low-stock alerts in real-time
- ✅ Better user experience with live data

**Next Steps**:
1. Complete Phase 1-4 testing
2. Review this documentation with team
3. Plan Phase 5 implementation sprint
4. Implement and test optimistic locking first
5. Add WebSocket incrementally

---

**Document Status**: Draft
**Last Updated**: 2025-12-04
**Author**: Claude AI Assistant
**Review Required**: Yes
