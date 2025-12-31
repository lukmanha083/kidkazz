# Service Startup Guide

## Correct Port Configuration

Based on your microservices architecture, here are the **correct ports** for each service:

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **product-service** | 8788 | ✅ Active | Product catalog, SKU, pricing, images, videos |
| **inventory-service** | 8792 | ⚠️ Not Running | Stock tracking, warehouses, movements |
| **accounting-service** | 8794 | ⚠️ Not Running | Chart of Accounts, Journal Entries, GL reports |
| api-gateway | 8787 | ❌ Legacy | Not needed (direct service calls) |
| order-service | 8789 | ❌ Legacy | To be replaced |
| payment-service | 8790 | ❌ Legacy | To be integrated |
| user-service | 8791 | ❌ Legacy | Not needed yet |
| shipping-service | 8793 | ❌ Legacy | Not needed yet |

---

## How to Start the Core Services

### Terminal 1: Product Service (Port 8788)
```bash
cd services/product-service
pnpm dev
```

**Expected Output:**
```
⎔ Starting local server...
⎔ Ready on http://localhost:8788
```

**Test:**
```bash
curl http://localhost:8788/health
# {"status":"healthy","service":"product-service","timestamp":"..."}

curl http://localhost:8788/api/products
curl http://localhost:8788/api/categories
curl http://localhost:8788/api/uoms
```

---

### Terminal 2: Inventory Service (Port 8792)
```bash
cd services/inventory-service
pnpm dev
```

**Expected Output:**
```
⎔ Starting local server...
⎔ Ready on http://localhost:8792
```

**Test:**
```bash
curl http://localhost:8792/health
# {"status":"healthy","service":"inventory-service","timestamp":"..."}

curl http://localhost:8792/api/warehouses
curl http://localhost:8792/api/inventory
```

---

### Terminal 3: Accounting Service (Port 8794)
```bash
cd services/accounting-service
pnpm dev
```

**Expected Output:**
```
⎔ Starting local server...
⎔ Ready on http://localhost:8794
```

**Test:**
```bash
curl http://localhost:8794/health
# {"status":"healthy","service":"accounting-service","timestamp":"..."}

curl "http://localhost:8794/api/reports/sales-by-warehouse?startDate=2025-11-01&endDate=2025-11-30"
curl "http://localhost:8794/api/reports/sales-by-person?startDate=2025-11-01&endDate=2025-11-30"
```

---

### Terminal 4: Real Time ERP Dashboard (Port 5173)
```bash
cd apps/erp-dashboard
pnpm dev
```

**Expected Output:**
```
VITE v5.4.21  ready in 2677 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Access:** http://localhost:5173/dashboard

---

## Troubleshooting

### Issue: "Port already in use"

**Find what's using the port:**
```bash
# Linux
lsof -i :8788
lsof -i :8792
lsof -i :8794

# Then kill it
kill -9 <PID>
```

---

### Issue: Wrong service showing on port

**You're running:** Port 8789 shows "order-service"
**But you wanted:** inventory-service

**Solution:** You're testing the wrong port! Inventory is on **8792**, not 8789.

---

### Issue: 404 errors on API endpoints

**Check you're using the correct base URL:**
- ❌ Wrong: `http://localhost:8789/api/warehouses` (order-service port)
- ✅ Correct: `http://localhost:8792/api/warehouses` (inventory-service port)

- ❌ Wrong: `http://localhost:8790/api/reports/...` (payment-service port)
- ✅ Correct: `http://localhost:8794/api/reports/...` (accounting-service port)

---

## Frontend API Configuration

The ERP dashboard needs to know which ports to call. Update your API configuration:

**File:** `apps/erp-dashboard/src/lib/api.ts` (or wherever you configure API endpoints)

```typescript
const API_CONFIG = {
  productService: 'http://localhost:8788',
  inventoryService: 'http://localhost:8792',
  accountingService: 'http://localhost:8794',
};

export const productApi = {
  baseURL: API_CONFIG.productService,
  // ...
};

export const inventoryApi = {
  baseURL: API_CONFIG.inventoryService,
  // ...
};

export const accountingApi = {
  baseURL: API_CONFIG.accountingService,
  // ...
};
```

---

## Quick Test All Services

Run this script to test all services at once:

```bash
#!/bin/bash

echo "Testing Product Service (8788)..."
curl -s http://localhost:8788/health | jq '.'

echo "\nTesting Inventory Service (8792)..."
curl -s http://localhost:8792/health | jq '.'

echo "\nTesting Accounting Service (8794)..."
curl -s http://localhost:8794/health | jq '.'

echo "\nProduct Service - Products:"
curl -s http://localhost:8788/api/products | jq '.products | length'

echo "\nInventory Service - Warehouses:"
curl -s http://localhost:8792/api/warehouses | jq '.warehouses | length'

echo "\nAccounting Service - Sales by Warehouse:"
curl -s "http://localhost:8794/api/reports/sales-by-warehouse?startDate=2025-11-01&endDate=2025-11-30" | jq '.'
```

Save as `test-services.sh`, make executable (`chmod +x test-services.sh`), and run (`./test-services.sh`).

---

## Summary

**Stop running these (legacy services):**
- ❌ order-service on port 8789
- ❌ payment-service on port 8790

**Start running these (microservices):**
- ✅ product-service on port 8788 (already running)
- ✅ inventory-service on port 8792 (not started)
- ✅ accounting-service on port 8794 (not started)

**Then test with the correct ports!**
