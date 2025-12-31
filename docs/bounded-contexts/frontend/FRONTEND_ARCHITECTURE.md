# Frontend Architecture with Real-Time WebSocket + React Query

## Overview

This document describes how the frontend (Real Time ERP Dashboard) integrates with the DDD-based microservices architecture using **WebSocket for real-time updates**, **TanStack React Query for data management**, and REST APIs.

**Key Technologies:**
- **@tanstack/react-query**: Modern data fetching and caching
- **WebSocket**: Real-time bidirectional communication
- **React Hooks**: Composable data management patterns
- **TypeScript**: End-to-end type safety

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Real Time ERP Dashboard (Frontend)                     │
│              React + TanStack Router + React Query                │
│                                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │      React Query Layer (@tanstack/react-query)            │  │
│  │  - Automatic caching and cache invalidation               │  │
│  │  - Optimistic updates for instant UI feedback             │  │
│  │  - Automatic retry and error handling                     │  │
│  │  - Query key management and cache coordination            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Modern React Hooks (src/hooks/queries/)         │  │
│  │  - useWarehouses: Warehouse CRUD + real-time WebSocket   │  │
│  │  - useInventory: Inventory operations + real-time sync   │  │
│  │  - useProducts: Product operations + real-time updates   │  │
│  │  - useWebSocket: WebSocket connection management         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           API Client Layer (src/lib/api.ts)               │  │
│  │  - Type-safe interfaces matching DDD domain models        │  │
│  │  - Service URL configuration                              │  │
│  │  - Error handling and validation                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Validation Layer (src/lib/validation.ts)          │  │
│  │  - Business rule validation                               │  │
│  │  - User-friendly error messages                           │  │
│  │  - Frontend validation matching domain rules              │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
            REST API                  WebSocket (ws://)
                 │                         │
                 ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Microservices Backend                          │
│                                                                   │
│  ┌────────────────────┐         ┌────────────────────┐          │
│  │  Product Service   │         │ Inventory Service  │          │
│  │                    │         │                    │          │
│  │  REST: /api/*      │         │  REST: /api/*      │          │
│  │  tRPC: /trpc/*     │◄────────┤  tRPC: /trpc/*     │          │
│  │                    │  tRPC   │  WebSocket:        │          │
│  │  DDD Architecture  │         │    /ws/inventory   │          │
│  │  - Domain Layer    │         │    /ws/warehouses  │          │
│  │  - Application     │         │                    │          │
│  │  - Infrastructure  │         │  DDD Architecture  │          │
│  │                    │         │  + Durable Objects │          │
│  └────────────────────┘         └────────────────────┘          │
│          │                              │                        │
│          ▼                              ▼                        │
│  ┌────────────────┐           ┌────────────────┐               │
│  │   Product DB   │           │  Inventory DB  │               │
│  │  (D1 SQLite)   │           │  (D1 SQLite)   │               │
│  └────────────────┘           └────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. React Query Layer

**Location**: `apps/erp-dashboard/src/lib/query-client.ts`

**Responsibilities**:
- Configure React Query client with optimal defaults
- Define query keys for consistent cache management
- Handle automatic retries and error states
- Manage cache invalidation strategies

**Configuration**:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,              // Data fresh for 30s
      gcTime: 5 * 60 * 1000,             // Cache for 5 min
      retry: 2,                           // Retry failed requests
      refetchOnWindowFocus: false,        // Disabled - using WebSocket
      refetchOnReconnect: true,
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
```

**Query Keys** (Centralized):
```typescript
export const queryKeys = {
  warehouses: {
    all: ['warehouses'],
    lists: () => [...queryKeys.warehouses.all, 'list'],
    list: (filters?) => [...queryKeys.warehouses.lists(), filters],
    details: () => [...queryKeys.warehouses.all, 'detail'],
    detail: (id: string) => [...queryKeys.warehouses.details(), id],
  },
  inventory: {
    all: ['inventory'],
    lists: () => [...queryKeys.inventory.all, 'list'],
    list: (filters?) => [...queryKeys.inventory.lists(), filters],
    detail: (productId, warehouseId?) => [...queryKeys.inventory.details(), productId, warehouseId],
    movements: (productId) => [...queryKeys.inventory.all, 'movements', productId],
  },
};
```

---

### 2. WebSocket Integration

**Location**: `apps/erp-dashboard/src/hooks/useWebSocket.ts`

**Purpose**: Manage real-time WebSocket connections with automatic reconnection and React Query integration.

**Features**:
- ✅ Automatic reconnection with exponential backoff
- ✅ Heartbeat/ping-pong to keep connection alive
- ✅ Subscription management
- ✅ Automatic React Query cache invalidation
- ✅ Type-safe message handling

**Usage**:
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

const { isConnected, send } = useWebSocket({
  type: 'inventory',                    // or 'warehouses'
  subscription: { productId: '123' },   // Optional filters
  enabled: true,                        // Enable/disable connection
  onMessage: (message) => {
    console.log('Received:', message);
  },
});
```

**How It Works**:
1. Connects to WebSocket endpoint (`ws://localhost:8792/ws/inventory`)
2. Automatically subscribes to updates based on subscription filters
3. Listens for messages from server (inventory_adjusted, warehouse_created, etc.)
4. **Automatically invalidates React Query cache** when updates are received
5. Reconnects automatically if connection drops

**Message Types Handled**:
- `inventory_adjusted`: Invalidates inventory queries
- `inventory_updated`: Invalidates inventory queries
- `stock_low`: Invalidates specific inventory item
- `warehouse_created`: Invalidates warehouse queries
- `warehouse_updated`: Invalidates warehouse queries
- `warehouse_deleted`: Invalidates warehouse queries

---

### 3. React Query Hooks

**Location**: `apps/erp-dashboard/src/hooks/queries/`

Modern hooks that combine React Query with WebSocket for a complete data management solution.

#### useWarehouses

Fetch and manage warehouses with real-time updates.

```typescript
import { useWarehouses } from '@/hooks/queries/useWarehouses';

const {
  warehouses,      // Array of warehouses
  total,           // Total count
  isLoading,       // Loading state
  isError,         // Error state
  error,           // Error object
  refetch,         // Manual refetch function
  wsConnected,     // WebSocket connection status
} = useWarehouses({
  enabled: true,      // Enable query
  realtime: true,     // Enable WebSocket real-time updates
});
```

**Features**:
- Fetches warehouses from API
- Automatically connects to WebSocket for real-time updates
- Cache automatically invalidated when updates received
- Returns connection status

#### useCreateWarehouse

Create warehouse with optimistic updates.

```typescript
import { useCreateWarehouse } from '@/hooks/queries/useWarehouses';

const createMutation = useCreateWarehouse();

const handleCreate = async (data) => {
  try {
    await createMutation.mutateAsync(data);
    toast.success('Warehouse created!');
  } catch (error) {
    toast.error('Failed to create warehouse');
  }
};
```

**Features**:
- **Optimistic updates**: UI updates immediately before server confirms
- **Automatic rollback**: Reverts on error
- **Cache invalidation**: Refreshes all warehouse queries on success

#### useInventory

Fetch and manage inventory with real-time sync.

```typescript
import { useInventory } from '@/hooks/queries/useInventory';

const {
  inventory,       // Array of inventory items
  total,           // Total count
  isLoading,
  wsConnected,     // WebSocket connected
} = useInventory(
  { productId: '123', warehouseId: '456' },  // Filters
  { realtime: true }                          // Options
);
```

**Features**:
- Filters by productId and/or warehouseId
- Real-time WebSocket updates
- Automatic cache invalidation
- Subscription to specific product/warehouse combinations

#### useAdjustInventory

Adjust inventory levels with optimistic updates and business rule validation.

```typescript
import { useAdjustInventory } from '@/hooks/queries/useInventory';

const adjustMutation = useAdjustInventory();

const handleAdjust = async () => {
  try {
    await adjustMutation.mutateAsync({
      productId: '123',
      warehouseId: '456',
      quantity: 10,
      movementType: 'in',    // 'in' | 'out' | 'adjustment'
      source: 'warehouse',   // 'warehouse' | 'pos'
      reason: 'Restock',
    });
  } catch (error) {
    toast.error(error.message);
  }
};
```

**Features**:
- **Optimistic updates** with business rule validation
- **POS vs Warehouse** source handling
- Prevents warehouse operations that would create negative stock
- Allows POS sales with negative stock
- Automatic rollback on error

---

### 4. API Client Layer

**Location**: `apps/erp-dashboard/src/lib/api.ts`

**Responsibilities**:
- Define TypeScript interfaces matching backend domain models
- Provide type-safe API methods for all operations
- Handle HTTP communication with microservices
- Configure service URLs via environment variables

**Example**:
```typescript
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export const warehouseApi = {
  getAll: async (): Promise<{ warehouses: Warehouse[]; total: number }> => {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/warehouses`);
    return await response.json();
  },

  create: async (data: CreateWarehouseInput): Promise<{ warehouse: Warehouse }> => {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  },

  // ... other methods
};
```

---

## Data Flow

### Example 1: Real-Time Inventory Update Flow

```
User adjusts inventory → useAdjustInventory mutation
                              ↓
                    Optimistic UI update (instant)
                              ↓
                    POST /api/inventory/adjust
                              ↓
                    Inventory Service processes
                              ↓
                    Database updated
                              ↓
                    Durable Object broadcasts WebSocket event
                              ↓
                    All connected clients receive message
                              ↓
                    useWebSocket receives message
                              ↓
                    Automatically invalidates React Query cache
                              ↓
                    React Query refetches inventory data
                              ↓
                    UI updates with latest data
```

**Result**: Instant feedback + automatic sync across all clients

---

### Example 2: Warehouse Creation with Optimistic Updates

```
User creates warehouse → useCreateWarehouse mutation
                              ↓
                    Optimistic: Add temp warehouse to cache
                              ↓
                    UI shows new warehouse immediately
                              ↓
                    POST /api/warehouses
                              ↓
                    Warehouse Service creates
                              ↓
                    Database persists
                              ↓
          ┌─────────────────┴──────────────────┐
          │                                    │
    Success Path                         Error Path
          │                                    │
    WebSocket broadcasts                 Rollback optimistic update
          │                                    │
    Cache invalidated                    Restore previous state
          │                                    │
    Refetch with real data               Show error message
          │                                    │
    UI updates with server ID            User sees original state
```

**Result**: Instant UI updates with automatic error recovery

---

## Service Communication

### Frontend ↔ Backend: REST + WebSocket

**REST API** (for mutations and queries):
- All CRUD operations use REST endpoints
- Format: `http://service-url/api/{resource}`
- Content-Type: `application/json`

**WebSocket** (for real-time updates):
- Bidirectional communication
- Server pushes updates to clients
- Format: `ws://service-url/ws/{type}`
- Automatic reconnection and heartbeat

**Example Endpoints**:
```typescript
// Inventory Service
POST   /api/inventory/adjust        // Adjust inventory
GET    /api/inventory/:productId    // Get inventory
GET    /ws/inventory                // WebSocket for inventory updates
GET    /ws/warehouses               // WebSocket for warehouse updates
```

---

## Real-Time Updates Strategy

### Why WebSocket Instead of Polling?

| Feature | Polling (Old) | WebSocket (Current) |
|---------|---------------|---------------------|
| **Latency** | 10-30s | < 100ms |
| **Network Overhead** | High (constant requests) | Low (single connection) |
| **Server Load** | High (N requests/interval) | Low (push when needed) |
| **Battery Usage** | High | Low |
| **Scalability** | Poor | Excellent |
| **Real-time Accuracy** | Delayed | Instant |

### WebSocket Implementation with Durable Objects

**Backend**: Cloudflare Workers + Durable Objects

```typescript
// Inventory Service uses Durable Objects for WebSocket management
export class InventoryUpdatesBroadcaster {
  async fetch(request: Request) {
    // Upgrade HTTP to WebSocket
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    // Handle messages, subscriptions, broadcasts
    server.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'subscribe') {
        // Subscribe to specific product/warehouse
        this.subscribe(server, message.payload);
      }
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // Broadcast to all subscribed clients
  broadcast(message: any) {
    this.connections.forEach(conn => {
      conn.send(JSON.stringify(message));
    });
  }
}
```

**Frontend**: Automatic cache invalidation

```typescript
// useWebSocket automatically invalidates React Query cache
const handleMessage = (message) => {
  switch (message.type) {
    case 'inventory_adjusted':
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.all,
      });
      break;
    // ... other message types
  }
};
```

---

## Environment Configuration

### Development

**`.env` for Real Time ERP Dashboard**:
```bash
VITE_PRODUCT_SERVICE_URL=http://localhost:8788
VITE_INVENTORY_SERVICE_URL=http://localhost:8792
```

### Production

Configure via Cloudflare Workers environment variables:
```bash
wrangler secret put PRODUCT_SERVICE_URL
wrangler secret put INVENTORY_SERVICE_URL
```

---

## Error Handling

### Backend Error Format

```json
{
  "error": "Insufficient stock for warehouse adjustment",
  "available": 50,
  "requested": 70
}
```

### Frontend Handling

```typescript
try {
  await adjustInventory(data);
} catch (error) {
  if (error.message.includes('Insufficient stock')) {
    toast.error('Cannot adjust: Not enough stock available');
  } else {
    toast.error('Adjustment failed. Please try again.');
  }
}
```

### React Query Error Handling

```typescript
const { error, isError } = useInventory();

if (isError) {
  return (
    <div className="error">
      <p>Failed to load inventory</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );
}
```

---

## Best Practices

### 1. Always Use React Query Hooks

**✅ Good**:
```typescript
const { warehouses } = useWarehouses({ realtime: true });
```

**❌ Bad**:
```typescript
const [warehouses, setWarehouses] = useState([]);

useEffect(() => {
  fetch('/api/warehouses')
    .then(res => res.json())
    .then(data => setWarehouses(data.warehouses));
}, []);
```

### 2. Enable Real-Time Updates

**✅ Good**:
```typescript
const { inventory, wsConnected } = useInventory(
  { productId: '123' },
  { realtime: true }  // ← Enable WebSocket
);
```

**❌ Bad**:
```typescript
const { inventory } = useInventory(
  { productId: '123' },
  { realtime: false }  // ← Missing real-time updates
);
```

### 3. Use Optimistic Updates for Better UX

**✅ Good**:
```typescript
const createMutation = useCreateWarehouse();
// Optimistic updates built-in - UI updates immediately
```

**❌ Bad**:
```typescript
await createWarehouse(data);
await refetch(); // Slow - waits for server confirmation
```

### 4. Show Connection Status

**✅ Good**:
```typescript
const { wsConnected } = useInventory({}, { realtime: true });

return (
  <div>
    <Badge color={wsConnected ? 'green' : 'red'}>
      {wsConnected ? 'Live' : 'Offline'}
    </Badge>
    {/* ... rest of UI */}
  </div>
);
```

---

## Performance Considerations

### React Query Caching Strategy

- **Stale Time**: 30 seconds (data considered fresh)
- **Cache Time**: 5 minutes (data kept in cache when unused)
- **Refetch on Mount**: Always (ensures fresh data)
- **Refetch on Focus**: Disabled (WebSocket handles updates)

### WebSocket Connection Management

- **Automatic Reconnection**: Exponential backoff (1s, 2s, 5s, 10s, 30s)
- **Heartbeat**: Ping every 30 seconds to keep connection alive
- **Subscription**: Filters reduce unnecessary messages
- **Single Connection**: One WebSocket per type (inventory, warehouses)

### Optimistic Updates

- **Instant Feedback**: UI updates before server confirms
- **Automatic Rollback**: Reverts on error
- **No Loading States**: Better UX for mutations

---

## Testing

### Unit Tests (Hooks)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWarehouses } from './useWarehouses';

test('fetches warehouses', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useWarehouses(), { wrapper });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.warehouses.length).toBeGreaterThan(0);
});
```

### Integration Tests

See `test-e2e-complete-workflow.js` for complete workflow testing.

---

## Troubleshooting

### Common Issues

**1. WebSocket not connecting**

Check:
- Service is running (`npm run dev` in `services/inventory-service`)
- URL starts with `ws://` not `http://`
- Port is correct (8792 for inventory service)

**2. Data not updating in real-time**

Check:
- `realtime: true` is set in hook options
- WebSocket connection status: `wsConnected === true`
- Browser console for WebSocket errors

**3. React Query cache not updating**

Check:
- Query keys are consistent
- Cache invalidation is called after mutations
- WebSocket messages are handled correctly

---

## Migration from Polling

If you have old code using polling, here's how to migrate:

**Before (Polling)**:
```typescript
const [warehouses, setWarehouses] = useState([]);

useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/warehouses');
    const data = await response.json();
    setWarehouses(data.warehouses);
  }, 30000); // Poll every 30 seconds

  return () => clearInterval(interval);
}, []);
```

**After (React Query + WebSocket)**:
```typescript
const { warehouses, wsConnected } = useWarehouses({
  realtime: true,  // Automatic real-time updates
});
```

**Benefits**:
- Less code
- Better performance
- Instant updates
- Automatic error handling
- Type safety

---

## Future Enhancements

### Planned Improvements

1. **Offline Support**: Service Workers + IndexedDB
2. **GraphQL**: Consider if tRPC doesn't meet needs
3. **Suspense**: React Suspense for cleaner loading states
4. **DevTools**: React Query DevTools for debugging

### Current vs. Future

| Feature | Current | Future |
|---------|---------|--------|
| **Data Fetching** | React Query | React Query + Suspense |
| **Real-time** | WebSocket | WebSocket + Server-Sent Events |
| **Offline** | None | Service Worker + IndexedDB |
| **State** | React Query cache | React Query + Zustand |

---

**Last Updated**: 2025-11-21
**Version**: 3.0 (WebSocket + React Query Implementation)
**Author**: Development Team
