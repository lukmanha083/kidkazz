# Development Environment Setup Guide

**KidKazz - Complete Development Environment Setup**

This comprehensive guide will walk you through setting up the entire KidKazz development environment, from initial installation to testing real-time features with WebSocket and React Query.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Running Services Locally](#running-services-locally)
5. [Running the Frontend](#running-the-frontend)
6. [Testing the Application](#testing-the-application)
7. [Testing Real-Time Features](#testing-real-time-features)
8. [Troubleshooting](#troubleshooting)
9. [Development Workflow](#development-workflow)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v20 or later)
   ```bash
   node --version  # Should be v20.x.x or higher
   ```

   Download from: https://nodejs.org/

2. **npm** (comes with Node.js) or **pnpm** (recommended)
   ```bash
   npm --version   # Should be 10.x.x or higher

   # Install pnpm globally (recommended)
   npm install -g pnpm
   pnpm --version
   ```

3. **Wrangler** (Cloudflare Workers CLI)
   ```bash
   npm install -g wrangler
   wrangler --version  # Should be 4.x.x or higher
   ```

4. **Git**
   ```bash
   git --version  # Any recent version
   ```

### Optional but Recommended

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd kidkazz
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using pnpm (faster):
```bash
pnpm install
```

This will install dependencies for all workspaces:
- Root workspace
- All microservices in `services/`
- Frontend app in `apps/erp-dashboard`
- Shared packages in `packages/`

### 3. Verify Installation

```bash
# Check that all packages are installed
ls -la node_modules/

# Verify TypeScript compilation
npx tsc --version
```

---

## Database Setup

Each service has its own D1 database (Cloudflare's SQLite-based database). You need to create and migrate each database.

### Product Service Database

```bash
cd services/product-service

# Create database (local development)
wrangler d1 create product-db

# Note: The database ID will be displayed. Update wrangler.jsonc if needed.

# Apply migrations
wrangler d1 migrations apply product-db --local

# Verify migration
wrangler d1 execute product-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**Expected tables**: `products`, `categories`, `product_variants`, `product_uoms`, etc.

### Inventory Service Database

```bash
cd services/inventory-service

# Create database
wrangler d1 create inventory-db

# Apply migrations (includes the new 'source' field migration)
wrangler d1 migrations apply inventory-db --local

# Verify tables
wrangler d1 execute inventory-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**Expected tables**: `warehouses`, `inventory`, `inventory_movements`

**Important**: Check that the `inventory_movements` table has the `source` column:
```bash
wrangler d1 execute inventory-db --local --command "PRAGMA table_info(inventory_movements);"
```

### Other Services

Repeat similar steps for:
- **Order Service**: `order-db`
- **User Service**: `user-db`
- **Payment Service**: `payment-db`
- **Shipping Service**: `shipping-db`

---

## Running Services Locally

Each service runs on a different port to avoid conflicts. You'll need to run them in separate terminal windows/tabs.

### Terminal Window 1: Product Service

```bash
cd services/product-service
npm run dev
# or
pnpm dev
```

**Port**: `http://localhost:8788`

**Endpoints**:
- `GET /health` - Health check
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /trpc/*` - tRPC endpoints (service-to-service)

### Terminal Window 2: Inventory Service (with Durable Objects)

```bash
cd services/inventory-service
npm run dev
# or
pnpm dev
```

**Port**: `http://localhost:8792`

**Endpoints**:
- `GET /health` - Health check
- `GET /api/warehouses` - List warehouses
- `POST /api/warehouses` - Create warehouse
- `GET /api/inventory` - List inventory
- `POST /api/inventory/adjust` - Adjust inventory
- `GET /ws/inventory` - WebSocket for inventory updates
- `GET /ws/warehouses` - WebSocket for warehouse updates
- `GET /internal/stats/inventory` - WebSocket connection stats
- `GET /internal/stats/warehouses` - WebSocket connection stats

### Terminal Window 3: API Gateway (if using)

```bash
cd services/api-gateway
npm run dev
```

**Port**: Configured in `wrangler.jsonc`

### Verify Services are Running

```bash
# Product Service
curl http://localhost:8788/health

# Inventory Service
curl http://localhost:8792/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "product-service" | "inventory-service",
#   "timestamp": "2025-11-20T..."
# }
```

---

## Running the Frontend

### Terminal Window 4: Real Time ERP Dashboard

```bash
cd apps/erp-dashboard
npm run dev
# or
pnpm dev
```

**Port**: `http://localhost:5173` (default Vite port)

**Features**:
- Product management
- Warehouse management
- Inventory management
- Real-time updates via WebSocket
- React Query for data fetching

### Accessing the Dashboard

Open your browser and navigate to:
```
http://localhost:5173
```

You should see the KidKazz Real Time ERP Dashboard.

---

## Testing the Application

### Running Integration Tests

We have comprehensive test suites that verify all functionality.

#### Test 1: Negative Stock Fix (Issue #1)

```bash
# Make sure both services are running first!
node test-negative-stock-fix.js
```

**Expected Output**:
```
✅ Test 1 passed: Product created successfully
✅ Test 2 passed: Warehouses created successfully
✅ Test 3 passed: Initial stock added successfully
✅ Test 4 passed: Warehouse OUT prevented (business rule working)
✅ Test 5 passed: POS sale allowed negative stock
✅ Test 6 passed: Stock is now negative as expected

==================================
🎉 ALL TESTS PASSED! (6/6)
==================================
```

#### Test 2: End-to-End Complete Workflow

```bash
node test-e2e-complete-workflow.js
```

**Expected Output**:
```
✅ Test 1 passed: Product created with physical attributes
✅ Test 2 passed: Physical attributes persisted correctly
✅ Test 3 passed: Warehouses created successfully
✅ Test 4 passed: Stock added to Warehouse 1
✅ Test 5 passed: Transfer from WH1 to WH2 successful
✅ Test 6 passed: Warehouse OUT exceeding stock prevented
✅ Test 7 passed: POS sale creating negative stock allowed
✅ Test 8 passed: Restock successful
✅ Test 9 passed: Total inventory calculation correct
✅ Test 10 passed: Movement history recorded correctly

==================================
🎉 ALL TESTS PASSED! (10/10)
==================================
```

### Manual Testing via API

#### Create a Product

```bash
curl -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "TEST-001",
    "sku": "SKU-TEST-001",
    "name": "Test Product",
    "price": 50000,
    "weight": 2.5,
    "length": 30,
    "width": 20,
    "height": 15
  }'
```

#### Create a Warehouse

```bash
curl -X POST http://localhost:8792/api/warehouses \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WH-001",
    "name": "Main Warehouse",
    "addressLine1": "Jl. Sudirman No. 1",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "10110",
    "country": "Indonesia"
  }'
```

#### Add Inventory

```bash
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "<product-id>",
    "warehouseId": "<warehouse-id>",
    "quantity": 100,
    "movementType": "in",
    "source": "warehouse",
    "reason": "Initial stock"
  }'
```

#### Test Negative Stock Business Rule

**Warehouse OUT (should fail with insufficient stock)**:
```bash
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "<product-id>",
    "warehouseId": "<warehouse-id>",
    "quantity": 200,
    "movementType": "out",
    "source": "warehouse",
    "reason": "Warehouse operation"
  }'
```

**Expected**: HTTP 400 with error message "Insufficient stock for warehouse adjustment"

**POS Sale (should succeed even with insufficient stock)**:
```bash
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "<product-id>",
    "warehouseId": "<warehouse-id>",
    "quantity": 200,
    "movementType": "out",
    "source": "pos",
    "reason": "POS sale - first-pay-first-served"
  }'
```

**Expected**: HTTP 200 with negative `quantityAvailable`

---

## Testing Real-Time Features

### WebSocket Connection Testing

#### 1. Open WebSocket Connection Stats

In your browser, navigate to:
```
http://localhost:8792/internal/stats/inventory
http://localhost:8792/internal/stats/warehouses
```

This shows how many WebSocket connections are active.

#### 2. Test WebSocket in Browser Console

Open the browser console and run:

```javascript
// Connect to inventory updates
const ws = new WebSocket('ws://localhost:8792/ws/inventory');

ws.onopen = () => {
  console.log('✅ WebSocket connected');

  // Subscribe to all inventory updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    payload: {}  // Empty payload subscribes to all
  }));
};

ws.onmessage = (event) => {
  console.log('📨 Received:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = () => {
  console.log('🔌 WebSocket closed');
};
```

#### 3. Trigger an Update

In another terminal, adjust inventory:

```bash
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "<product-id>",
    "warehouseId": "<warehouse-id>",
    "quantity": 10,
    "movementType": "in",
    "source": "warehouse",
    "reason": "Test update"
  }'
```

**Expected**: You should immediately see a message in the browser console:

```javascript
{
  type: 'inventory_adjusted',
  data: {
    inventoryId: '...',
    productId: '...',
    warehouseId: '...',
    quantityAvailable: 110,
    quantityReserved: 0,
    timestamp: '2025-11-20T...'
  }
}
```

### React Query Integration Testing

#### 1. Open Real Time ERP Dashboard

Navigate to `http://localhost:5173`

#### 2. Open Browser DevTools

Go to:
- **Console** tab to see WebSocket connection status
- **Network** tab with "WS" filter to see WebSocket connections

#### 3. Use the New Hooks

In your components, import and use:

```typescript
import {
  useWarehouses,
  useInventory,
  useAdjustInventory,
} from './hooks/queries';

function InventoryManagement() {
  // Fetch inventory with real-time updates
  const { inventory, isLoading, wsConnected } = useInventory(
    { productId: 'some-id' },
    { realtime: true }
  );

  // Mutation for adjusting inventory
  const adjustMutation = useAdjustInventory();

  const handleAdjust = () => {
    adjustMutation.mutate({
      productId: 'some-id',
      warehouseId: 'warehouse-id',
      quantity: 10,
      movementType: 'in',
      source: 'warehouse',
      reason: 'Restock',
    });
  };

  return (
    <div>
      <p>WebSocket: {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      <button onClick={handleAdjust}>Add Stock</button>
    </div>
  );
}
```

#### 4. Test Optimistic Updates

1. Click a button that creates/updates data
2. Notice the UI updates immediately (optimistic update)
3. If the request fails, the UI rolls back
4. If the request succeeds, the UI stays updated

#### 5. Test Real-Time Sync

1. Open two browser windows side-by-side (both at `localhost:5173`)
2. In Window 1, create a warehouse
3. Window 2 should automatically update with the new warehouse (via WebSocket)
4. No manual refresh needed!

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Find and kill the process using the port
# For port 8792 (inventory service):
lsof -ti:8792 | xargs kill -9

# For port 8788 (product service):
lsof -ti:8788 | xargs kill -9

# For port 5173 (frontend):
lsof -ti:5173 | xargs kill -9
```

#### 2. Database Not Found

**Error**: `D1_ERROR: no such table: products`

**Solution**: Run migrations:
```bash
cd services/product-service
wrangler d1 migrations apply product-db --local
```

#### 3. WebSocket Connection Failed

**Error**: `WebSocket connection to 'ws://localhost:8792/ws/inventory' failed`

**Possible causes**:
1. Inventory service not running - Check `npm run dev` in `services/inventory-service`
2. Wrong URL - Verify the URL starts with `ws://` not `http://`
3. CORS issues - Check CORS middleware in `index.ts`

**Solution**:
```bash
# Restart inventory service
cd services/inventory-service
npm run dev

# Check if WebSocket endpoint is accessible
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:8792/ws/inventory
```

#### 4. TypeScript Errors

**Error**: `Cannot find module '@tanstack/react-query'`

**Solution**:
```bash
cd apps/erp-dashboard
npm install @tanstack/react-query
```

#### 5. Durable Object Not Found

**Error**: `Cannot read properties of undefined (reading 'idFromName')`

**Possible causes**:
1. Durable Objects not configured in `wrangler.jsonc`
2. Durable Objects not exported from `index.ts`

**Solution**: Verify configuration:
```bash
cd services/inventory-service
cat wrangler.jsonc | grep -A 10 "durable_objects"

# Should show:
# "durable_objects": {
#   "bindings": [
#     { "name": "INVENTORY_UPDATES", ... },
#     { "name": "WAREHOUSE_UPDATES", ... }
#   ]
# }
```

#### 6. React Query Cache Not Updating

**Issue**: Data doesn't update after mutation

**Solution**: Check that WebSocket is connected and broadcasting:
```bash
# Check WebSocket stats
curl http://localhost:8792/internal/stats/inventory

# Should show:
# {
#   "totalConnections": 1,
#   "subscriptionCounts": { "*": 1 }
# }
```

---

## Development Workflow

### Day-to-Day Development

1. **Start all services in separate terminals**:
   ```bash
   # Terminal 1
   cd services/product-service && npm run dev

   # Terminal 2
   cd services/inventory-service && npm run dev

   # Terminal 3
   cd apps/erp-dashboard && npm run dev
   ```

2. **Make code changes**
   - Services auto-reload with Wrangler
   - Frontend auto-reloads with Vite

3. **Run tests frequently**:
   ```bash
   node test-negative-stock-fix.js
   node test-e2e-complete-workflow.js
   ```

4. **Check WebSocket connections**:
   ```bash
   curl http://localhost:8792/internal/stats/inventory
   ```

### Before Committing

1. **Type check**:
   ```bash
   cd services/inventory-service && npm run type-check
   cd apps/erp-dashboard && npx tsc --noEmit
   ```

2. **Run all tests**:
   ```bash
   node test-negative-stock-fix.js
   node test-e2e-complete-workflow.js
   ```

3. **Verify no console errors**:
   - Open browser DevTools
   - Check Console tab for errors
   - Check Network tab for failed requests

4. **Commit with clear message**:
   ```bash
   git add .
   git commit -m "feat: add real-time WebSocket updates and React Query integration"
   ```

---

## Environment Variables

### Frontend (.env)

Create `apps/erp-dashboard/.env`:

```env
VITE_PRODUCT_SERVICE_URL=http://localhost:8788
VITE_INVENTORY_SERVICE_URL=http://localhost:8792
```

### Services

Services use `wrangler.jsonc` for configuration. No additional `.env` needed for local development.

---

## Production Deployment

### Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler authenticated: `wrangler login`

### Deploy Services

```bash
# Product Service
cd services/product-service
wrangler d1 create product-db  # Create production DB
wrangler d1 migrations apply product-db  # Run migrations
wrangler deploy

# Inventory Service
cd services/inventory-service
wrangler d1 create inventory-db
wrangler d1 migrations apply inventory-db
wrangler deploy

# Frontend
cd apps/erp-dashboard
npm run build
# Deploy to Cloudflare Pages or your hosting provider
```

### Update URLs

Update frontend `.env` with production URLs:

```env
VITE_PRODUCT_SERVICE_URL=https://product-service.your-domain.workers.dev
VITE_INVENTORY_SERVICE_URL=https://inventory-service.your-domain.workers.dev
```

---

## Next Steps

- [ ] Set up CI/CD pipeline
- [ ] Add monitoring and logging
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Add performance monitoring
- [ ] Create production deployment guide
- [ ] Set up staging environment

---

## Need Help?

- Check the [BUSINESS_RULES.md](./BUSINESS_RULES.md) for business logic
- Check the [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) for frontend patterns
- Check the [ALL_PHASES_COMPLETE.md](../ALL_PHASES_COMPLETE.md) for feature overview
- Open an issue in the repository

---

**Last Updated**: 2025-11-20
**Version**: 2.0 (Phase 7 & 8 - WebSocket + React Query)
