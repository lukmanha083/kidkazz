# Integration Tutorial: Connecting Frontend to Backend Services

This guide walks you through integrating the frontend Product and Warehouse modules with their respective backend services.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Configuration](#backend-configuration)
4. [Frontend Configuration](#frontend-configuration)
5. [Replacing Mock Data with API Calls](#replacing-mock-data-with-api-calls)
6. [Testing the Integration](#testing-the-integration)

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- Access to Cloudflare D1 database (or SQLite for local development)
- Backend running on port 8787
- Frontend running on port 5173

## Database Setup

### 1. Apply Database Migrations

The new schema includes tables for warehouses, product variants, and stock management.

**For Cloudflare D1 (Production):**

```bash
cd apps/backend

# Generate migration
npx wrangler d1 migrations create kidkazz_db add_warehouse_tables

# Apply the migration
npx wrangler d1 migrations apply kidkazz_db
```

**For Local Development (SQLite):**

```bash
cd apps/backend

# Apply to local database
npx wrangler d1 migrations apply kidkazz_db --local
```

### 2. Seed Initial Data (Optional)

Create a seed file to populate initial warehouse data:

```sql
-- apps/backend/migrations/seed_warehouses.sql

INSERT INTO warehouses (id, code, name, location, address, city, postalCode, phone, manager, rack, bin, status, createdAt, updatedAt)
VALUES
  ('WH-001', 'WH-JKT-01', 'Main Warehouse Jakarta', 'Jakarta', 'Jl. Raya Industri No. 123', 'Jakarta', '12345', '+62 21 1234 5678', 'Budi Santoso', 'A-01', 'BIN-001', 'Active', unixepoch(), unixepoch()),
  ('WH-002', 'WH-SBY-01', 'Distribution Center Surabaya', 'Surabaya', 'Jl. Industri Raya No. 456', 'Surabaya', '60234', '+62 31 2345 6789', 'Siti Rahayu', 'B-12', 'BIN-045', 'Active', unixepoch(), unixepoch()),
  ('WH-003', 'WH-BDG-01', 'Regional Hub Bandung', 'Bandung', 'Jl. Soekarno Hatta No. 789', 'Bandung', '40293', '+62 22 3456 7890', 'Ahmad Wijaya', 'C-05', 'BIN-023', 'Active', unixepoch(), unixepoch());
```

Run the seed:

```bash
# Local
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/your-db.sqlite < migrations/seed_warehouses.sql

# Production
npx wrangler d1 execute kidkazz_db --file=./migrations/seed_warehouses.sql
```

## Backend Configuration

### 1. Verify Routes are Registered

Check `apps/backend/src/index.ts`:

```typescript
import { warehousesRoutes } from './routes/warehouses';

// ...

app.route('/api/warehouses', warehousesRoutes);
```

### 2. Test Backend Endpoints

Start the backend server:

```bash
cd apps/backend
npm run dev
```

Test the warehouse endpoints:

```bash
# Get all warehouses
curl http://localhost:8787/api/warehouses

# Get active warehouses only
curl http://localhost:8787/api/warehouses/active

# Create a warehouse
curl -X POST http://localhost:8787/api/warehouses \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WH-TEST-01",
    "name": "Test Warehouse",
    "location": "Jakarta",
    "address": "Test Address",
    "city": "Jakarta",
    "postalCode": "12345",
    "phone": "+62 21 1234 5678",
    "manager": "Test Manager",
    "rack": "A-01",
    "bin": "BIN-001",
    "status": "Active"
  }'
```

## Frontend Configuration

### 1. Environment Variables

Create or update `.env` file in `apps/admin-dashboard`:

```env
# Development
VITE_API_BASE_URL=http://localhost:8787

# Production
# VITE_API_BASE_URL=https://your-backend.workers.dev
```

### 2. Install Dependencies (if needed)

```bash
cd apps/admin-dashboard
npm install
```

## Replacing Mock Data with API Calls

### 1. Update Warehouse Management Page

**File:** `apps/admin-dashboard/src/routes/dashboard/inventory/warehouse.tsx`

Replace mock data with API calls:

```typescript
import { useState, useEffect } from 'react';
import { warehouseApi } from '@/lib/api';
import type { Warehouse } from '@/lib/api';

function WarehouseManagementPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch warehouses on mount
  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await warehouseApi.getAll();
      setWarehouses(response.warehouses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses');
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (formMode === 'add') {
        const response = await warehouseApi.create(formData);
        setWarehouses([...warehouses, response.warehouse]);
        toast.success('Warehouse created successfully');
      } else if (formMode === 'edit' && selectedWarehouse) {
        const response = await warehouseApi.update(selectedWarehouse.id, formData);
        setWarehouses(warehouses.map(w =>
          w.id === selectedWarehouse.id ? response.warehouse : w
        ));
        toast.success('Warehouse updated successfully');
      }
      setFormDrawerOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const confirmDelete = async () => {
    if (!warehouseToDelete) return;

    try {
      await warehouseApi.delete(warehouseToDelete.id);
      setWarehouses(warehouses.filter(w => w.id !== warehouseToDelete.id));
      toast.success('Warehouse deleted successfully');
      setDeleteDialogOpen(false);
      setWarehouseToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete warehouse');
    }
  };

  // Add loading state to UI
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading warehouses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={loadWarehouses} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  // Rest of the component remains the same...
}
```

### 2. Update UOM Conversion Page

**File:** `apps/admin-dashboard/src/routes/dashboard/inventory/uom-conversion.tsx`

```typescript
import { useState, useEffect } from 'react';
import { warehouseApi } from '@/lib/api';
import type { Warehouse } from '@/lib/api';

function UOMConversionPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveWarehouses();
  }, []);

  const loadActiveWarehouses = async () => {
    try {
      setLoading(true);
      const response = await warehouseApi.getActive();
      setWarehouses(response.warehouses);
      if (response.warehouses.length > 0) {
        setSelectedWarehouse(response.warehouses[0].id);
      }
    } catch (err) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  // Replace the hardcoded activeWarehouses with the state
  const activeWarehouses = warehouses;

  // Rest of the component...
}
```

### 3. Update Transfer Stock Page

**File:** `apps/admin-dashboard/src/routes/dashboard/inventory/transfer-stock.tsx`

```typescript
import { useState, useEffect } from 'react';
import { warehouseApi } from '@/lib/api';
import type { Warehouse } from '@/lib/api';

function TransferStockPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveWarehouses();
  }, []);

  const loadActiveWarehouses = async () => {
    try {
      setLoading(true);
      const response = await warehouseApi.getActive();
      setWarehouses(response.warehouses);
    } catch (err) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  // Replace the hardcoded activeWarehouses with the state
  const activeWarehouses = warehouses;

  // Rest of the component...
}
```

## Testing the Integration

### 1. Start Both Services

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/admin-dashboard
npm run dev
```

### 2. Test Warehouse Management

1. Navigate to `http://localhost:5173/dashboard/inventory/warehouse`
2. Click "Add Warehouse"
3. Fill in the form and submit
4. Verify the warehouse appears in the list
5. Edit the warehouse and verify changes
6. Test delete functionality

### 3. Test Cross-Page Integration

1. Add a new warehouse in Warehouse Management
2. Navigate to UOM Conversion page
3. Verify the new warehouse appears in the warehouse selector
4. Navigate to Transfer Stock page
5. Verify the new warehouse appears in source/destination dropdowns

### 4. Test Error Handling

1. Stop the backend server
2. Try to create a warehouse
3. Verify error message appears
4. Restart backend and retry

## Common Issues and Solutions

### Issue 1: CORS Errors

**Problem:** Browser shows CORS policy errors

**Solution:** Verify backend CORS configuration in `apps/backend/src/index.ts`:

```typescript
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
```

### Issue 2: API Base URL Not Found

**Problem:** API requests fail with "Failed to fetch"

**Solution:**
1. Check `.env` file exists in `apps/admin-dashboard`
2. Verify `VITE_API_BASE_URL` is set correctly
3. Restart the frontend dev server after changing `.env`

### Issue 3: Database Not Found

**Problem:** Backend returns "Database not found" errors

**Solution:**
```bash
cd apps/backend
npx wrangler d1 migrations apply kidkazz_db --local
```

### Issue 4: TypeScript Errors

**Problem:** Type errors in API calls

**Solution:** Ensure types are properly imported:

```typescript
import { warehouseApi, type Warehouse } from '@/lib/api';
```

## Next Steps

1. **Add Loading States:** Implement skeleton loaders for better UX
2. **Add Pagination:** Implement server-side pagination for large datasets
3. **Add Caching:** Use React Query or SWR for data caching
4. **Add Optimistic Updates:** Update UI before API call completes
5. **Add Offline Support:** Implement service workers for offline functionality

## Best Practices

1. **Error Handling:** Always wrap API calls in try-catch blocks
2. **Loading States:** Show loading indicators during API calls
3. **User Feedback:** Use toast notifications for success/error messages
4. **Type Safety:** Use TypeScript types from the API client
5. **Separation of Concerns:** Keep API logic in the API client, not components

## Resources

- [API Client Documentation](./API_CLIENT.md)
- [Backend API Reference](./API_REFERENCE.md)
- [Database Schema](../apps/backend/src/db/schema.ts)
- [Frontend Components](../apps/admin-dashboard/src/routes/)

---

**Need Help?** Check the troubleshooting section or create an issue in the repository.
