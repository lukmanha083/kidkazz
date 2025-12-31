# Integration Tutorial: Connecting Frontend to Backend Services

This guide walks you through integrating the frontend with backend services using **WebSocket for real-time updates** and **TanStack React Query for data management**.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Configuration](#backend-configuration)
4. [Frontend Configuration](#frontend-configuration)
5. [Using React Query Hooks](#using-react-query-hooks)
6. [Enabling Real-Time Updates](#enabling-real-time-updates)
7. [Testing the Integration](#testing-the-integration)

---

## Prerequisites

Before starting, ensure you have:
- Node.js 20+ installed
- Access to Cloudflare D1 database (or SQLite for local development)
- Product Service running on port 8788
- Inventory Service running on port 8792
- Frontend running on port 5173

---

## Database Setup

### 1. Apply Database Migrations

The schema includes tables for warehouses, inventory, and product integration.

**For Cloudflare D1 (Production)**:

```bash
cd services/inventory-service

# Apply migrations
wrangler d1 migrations apply inventory-db
```

**For Local Development (SQLite)**:

```bash
cd services/inventory-service

# Apply to local database
wrangler d1 migrations apply inventory-db --local
```

### 2. Verify Tables

```bash
wrangler d1 execute inventory-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**Expected tables**: `warehouses`, `inventory`, `inventory_movements`

---

## Backend Configuration

### 1. Start Inventory Service with WebSocket Support

```bash
cd services/inventory-service
npm run dev
```

The inventory service provides:
- **REST API**: `http://localhost:8792/api/*`
- **WebSocket**: `ws://localhost:8792/ws/inventory`
- **WebSocket**: `ws://localhost:8792/ws/warehouses`

### 2. Verify WebSocket Endpoints

Test WebSocket connection:

```bash
# Check WebSocket stats
curl http://localhost:8792/internal/stats/inventory

# Expected response:
# {
#   "totalConnections": 0,
#   "subscriptionCounts": {}
# }
```

---

## Frontend Configuration

### 1. Install Dependencies

```bash
cd apps/erp-dashboard

# Install React Query and WebSocket dependencies
npm install @tanstack/react-query
```

### 2. Environment Variables

Create `.env` file in `apps/erp-dashboard`:

```env
# Development
VITE_PRODUCT_SERVICE_URL=http://localhost:8788
VITE_INVENTORY_SERVICE_URL=http://localhost:8792
```

### 3. Setup React Query Provider

The Query Client is already configured in `src/main.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

---

## Using React Query Hooks

### Example 1: Warehouse Management Page

**File**: `apps/erp-dashboard/src/routes/dashboard/inventory/warehouse.tsx`

Replace useState/useEffect with React Query hooks:

**Before (Old Approach)**:
```typescript
import { useState, useEffect } from 'react';

function WarehouseManagementPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8792/api/warehouses');
      const data = await response.json();
      setWarehouses(data.warehouses);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    try {
      const response = await fetch('http://localhost:8792/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      setWarehouses([...warehouses, result.warehouse]);
    } catch (error) {
      console.error(error);
    }
  };

  // Manual polling for updates
  useEffect(() => {
    const interval = setInterval(loadWarehouses, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);
}
```

**After (Modern Approach with React Query + WebSocket)**:
```typescript
import { useWarehouses, useCreateWarehouse } from '@/hooks/queries/useWarehouses';
import { toast } from 'sonner';

function WarehouseManagementPage() {
  // Fetch warehouses with real-time WebSocket updates
  const {
    warehouses,
    isLoading,
    isError,
    error,
    wsConnected,  // WebSocket connection status
  } = useWarehouses({
    realtime: true,  // Enable real-time updates via WebSocket
  });

  // Create warehouse mutation with optimistic updates
  const createMutation = useCreateWarehouse();

  const handleCreate = async (formData) => {
    try {
      await createMutation.mutateAsync(formData);
      toast.success('Warehouse created successfully');
      // No need to manually update state - React Query handles it automatically!
    } catch (error) {
      toast.error(error.message || 'Failed to create warehouse');
    }
  };

  // Show WebSocket connection status
  return (
    <div>
      <div className="flex items-center gap-2">
        <h1>Warehouses</h1>
        <Badge color={wsConnected ? 'green' : 'red'}>
          {wsConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorMessage error={error} />}

      <WarehouseList
        warehouses={warehouses}
        onCreate={handleCreate}
      />
    </div>
  );
}
```

**Benefits**:
- ✅ Less code (no manual state management)
- ✅ Automatic caching
- ✅ Real-time updates via WebSocket (no polling!)
- ✅ Optimistic UI updates
- ✅ Automatic error handling
- ✅ Connection status indicator

---

### Example 2: Inventory Management with Real-Time Sync

**File**: `apps/erp-dashboard/src/routes/dashboard/inventory/index.tsx`

```typescript
import {
  useInventory,
  useAdjustInventory,
} from '@/hooks/queries/useInventory';
import { useWarehouses } from '@/hooks/queries/useWarehouses';

function InventoryManagementPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);

  // Fetch warehouses
  const { warehouses } = useWarehouses({ realtime: true });

  // Fetch inventory with real-time updates
  const {
    inventory,
    isLoading,
    wsConnected,
  } = useInventory(
    { warehouseId: selectedWarehouse },  // Filter by warehouse
    { realtime: true }                    // Enable WebSocket
  );

  // Adjust inventory mutation
  const adjustMutation = useAdjustInventory();

  const handleAdjust = async (data) => {
    try {
      await adjustMutation.mutateAsync({
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        movementType: data.movementType,  // 'in' | 'out' | 'adjustment'
        source: data.source,               // 'warehouse' | 'pos'
        reason: data.reason,
      });
      toast.success('Inventory adjusted');
      // UI automatically updates via optimistic update + WebSocket!
    } catch (error) {
      toast.error(error.message);
      // Automatic rollback on error
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <Select
          value={selectedWarehouse}
          onValueChange={setSelectedWarehouse}
        >
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </Select>

        <Badge color={wsConnected ? 'green' : 'gray'}>
          {wsConnected ? '🟢 Live' : '🔴 Offline'}
        </Badge>
      </div>

      <InventoryTable
        inventory={inventory}
        onAdjust={handleAdjust}
        loading={isLoading}
      />
    </div>
  );
}
```

---

## Enabling Real-Time Updates

### How WebSocket Integration Works

1. **Frontend hooks** (`useWarehouses`, `useInventory`) connect to WebSocket
2. **Backend broadcasts** when data changes (create, update, delete)
3. **WebSocket receives** message
4. **React Query cache** is automatically invalidated
5. **UI updates** with latest data

### Testing WebSocket Connection

#### 1. Open Browser DevTools

Navigate to `http://localhost:5173` and open DevTools:
- **Console** tab: See WebSocket connection logs
- **Network** tab → **WS** filter: See WebSocket connections

#### 2. Test Real-Time Sync

**Window 1**: Open `http://localhost:5173/inventory`
**Window 2**: Open `http://localhost:5173/inventory` in another browser window

In Window 1:
1. Create a new warehouse
2. Watch Window 2 automatically update (no refresh needed!)

#### 3. Monitor Connection Status

```typescript
const { wsConnected } = useWarehouses({ realtime: true });

console.log('WebSocket connected:', wsConnected);
// true = connected, false = disconnected
```

---

## Testing the Integration

### 1. Start All Services

**Terminal 1: Inventory Service**
```bash
cd services/inventory-service
npm run dev
```

**Terminal 2: Product Service**
```bash
cd services/product-service
npm run dev
```

**Terminal 3: Frontend**
```bash
cd apps/erp-dashboard
npm run dev
```

### 2. Test Warehouse Management

1. Navigate to `http://localhost:5173/dashboard/inventory/warehouse`
2. Click "Add Warehouse"
3. Fill in the form and submit
4. **Observe**: Warehouse appears immediately (optimistic update)
5. **Verify**: Check Network tab for POST request
6. **Verify**: Check WebSocket tab for broadcast message

### 3. Test Real-Time Sync

1. Open two browser windows side-by-side
2. In Window 1: Create a warehouse
3. In Window 2: Watch it appear automatically (< 100ms)
4. No manual refresh needed!

### 4. Test Inventory Adjustment

1. Navigate to inventory page
2. Adjust inventory for a product
3. **Observe**: UI updates immediately
4. **Verify**: WebSocket broadcasts update
5. **Test Error**: Try to adjust more than available (warehouse source)
6. **Observe**: Error message + automatic rollback

### 5. Test Connection Recovery

1. Stop inventory service (`Ctrl+C`)
2. **Observe**: Connection status turns red
3. **Observe**: UI shows "Offline" badge
4. Restart inventory service
5. **Observe**: Auto-reconnects within 1-30 seconds
6. **Observe**: Connection status turns green

---

## API Endpoints Reference

### Inventory Service

#### REST API
```
GET    /api/warehouses              # List all warehouses
POST   /api/warehouses              # Create warehouse
GET    /api/warehouses/:id          # Get warehouse by ID
PUT    /api/warehouses/:id          # Update warehouse
DELETE /api/warehouses/:id          # Delete warehouse

GET    /api/inventory               # List inventory
GET    /api/inventory/:productId    # Get inventory for product
POST   /api/inventory/adjust        # Adjust inventory
```

#### WebSocket
```
WS     /ws/inventory                # Real-time inventory updates
WS     /ws/warehouses               # Real-time warehouse updates

GET    /internal/stats/inventory    # WebSocket connection stats
GET    /internal/stats/warehouses   # WebSocket connection stats
```

### WebSocket Message Types

**Client → Server** (Subscribe):
```json
{
  "type": "subscribe",
  "payload": {
    "productId": "abc123",      // Optional filter
    "warehouseId": "xyz456"     // Optional filter
  }
}
```

**Server → Client** (Broadcast):
```json
{
  "type": "inventory_adjusted",
  "data": {
    "inventoryId": "inv-123",
    "productId": "prod-456",
    "warehouseId": "wh-789",
    "quantityAvailable": 100,
    "quantityReserved": 0,
    "timestamp": "2025-11-21T10:00:00Z"
  }
}
```

---

## Common Issues and Solutions

### Issue 1: WebSocket Not Connecting

**Symptoms**:
- `wsConnected` is always `false`
- Console shows WebSocket errors

**Solutions**:
1. Verify inventory service is running
2. Check port (should be 8792)
3. Verify URL uses `ws://` not `http://`
4. Check CORS configuration

```bash
# Test WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:8792/ws/inventory
```

### Issue 2: Data Not Updating in Real-Time

**Symptoms**:
- WebSocket connected but UI doesn't update
- Have to manually refresh to see changes

**Solutions**:
1. Check `realtime: true` is set in hook options
2. Verify WebSocket messages in Network tab
3. Check React Query cache invalidation

```typescript
// Make sure realtime is enabled
const { warehouses, wsConnected } = useWarehouses({
  realtime: true,  // ← Must be true
});
```

### Issue 3: React Query Not Caching

**Symptoms**:
- Data fetched on every render
- Slow performance

**Solutions**:
1. Verify QueryClientProvider wraps app
2. Check query keys are consistent
3. Verify staleTime/cacheTime settings

```typescript
// Check query client config
import { queryClient } from '@/lib/query-client';

console.log(queryClient.getDefaultOptions());
```

### Issue 4: Optimistic Updates Not Working

**Symptoms**:
- UI doesn't update until server responds
- Slow UX

**Solutions**:
1. Use mutation hooks (`useCreateWarehouse`, not direct API calls)
2. Check for errors in mutation callbacks
3. Verify cache invalidation

```typescript
// ✅ Good - uses mutation hook with optimistic updates
const createMutation = useCreateWarehouse();
await createMutation.mutateAsync(data);

// ❌ Bad - no optimistic updates
await warehouseApi.create(data);
```

---

## Development Workflow

### Day-to-Day Development

1. **Start services** in separate terminals:
   ```bash
   # Terminal 1
   cd services/inventory-service && npm run dev

   # Terminal 2
   cd services/product-service && npm run dev

   # Terminal 3
   cd apps/erp-dashboard && npm run dev
   ```

2. **Make changes** to hooks/components

3. **Watch real-time updates** work automatically

4. **Check WebSocket** connection stats:
   ```bash
   curl http://localhost:8792/internal/stats/inventory
   ```

### Before Committing

1. **Type check**:
   ```bash
   cd apps/erp-dashboard
   npx tsc --noEmit
   ```

2. **Test integration**:
   - Open multiple browser windows
   - Test CRUD operations
   - Verify real-time sync

3. **Check console** for errors:
   - No WebSocket errors
   - No React Query errors
   - No TypeScript errors

---

## Best Practices

1. **Always enable real-time updates** for better UX:
   ```typescript
   useWarehouses({ realtime: true })  // ✅ Good
   useWarehouses({ realtime: false }) // ❌ Bad
   ```

2. **Use mutation hooks** for optimistic updates:
   ```typescript
   const createMutation = useCreateWarehouse();  // ✅ Good
   await warehouseApi.create(data);              // ❌ Bad
   ```

3. **Show connection status** to users:
   ```typescript
   <Badge color={wsConnected ? 'green' : 'red'}>
     {wsConnected ? 'Live' : 'Offline'}
   </Badge>
   ```

4. **Handle errors gracefully**:
   ```typescript
   try {
     await mutation.mutateAsync(data);
     toast.success('Success!');
   } catch (error) {
     toast.error(error.message);
   }
   ```

5. **Keep query keys consistent**:
   ```typescript
   import { queryKeys } from '@/lib/query-client';

   // Use centralized query keys
   queryKey: queryKeys.warehouses.lists()
   ```

---

## Next Steps

- [ ] Implement error boundaries for better error handling
- [ ] Add React Query DevTools for debugging
- [ ] Set up E2E tests with Playwright
- [ ] Add offline support with Service Workers
- [ ] Implement data persistence with IndexedDB

---

**Last Updated**: 2025-11-21
**Version**: 2.0 (WebSocket + React Query Integration)
