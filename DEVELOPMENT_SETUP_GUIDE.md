# Development Setup Guide - Microservices Architecture

This guide reflects the **current state** of the Kidkazz platform with microservices architecture and shows which databases should be migrated before you can test locally.

## 📋 Current Architecture

The platform uses a **microservices architecture** with the following services:

```
services/
├── product-service/      # Product catalog, SKU, pricing, images, videos
├── inventory-service/    # Stock tracking, warehouse management, movements
├── accounting-service/   # Chart of Accounts, Journal Entries, GL reporting
└── order-service/        # (Coming soon) Order processing, sales
```

Each service has its own:
- **D1 Database** - Isolated data storage
- **Migrations** - Database schema versions
- **API Endpoints** - RESTful + tRPC
- **Business Logic** - Domain-driven design

---

## 🗄️ Database Migration Order

**IMPORTANT:** Apply migrations in this order to ensure proper dependencies:

### 1️⃣ Product Service (FIRST)
**Why First:** Core product data needed by all other services.

**Database:** `product-db`
**Migrations:** 6 total (0000 → 0005)

**Status:** ✅ All migrations applied

**What's Created:**
- Products table with accounting integration fields
- Product categories (hierarchical)
- Product variants (size, color, etc.)
- Product images (R2 + KV cache)
- Product videos (R2 + Cloudflare Stream)
- UOM (Units of Measure) with conversion factors
- Product locations (warehouse + zone tracking)

**Apply Command:**
```bash
cd services/product-service

# Apply all migrations
npx wrangler d1 migrations apply DB --local

# Verify tables created
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

**Expected Tables:**
```
categories
product_images
product_locations
product_videos
products
uoms
variants
```

---

### 2️⃣ Inventory Service (SECOND)
**Why Second:** Depends on product data for stock tracking.

**Database:** `inventory-db`
**Migrations:** 2 total (0000 → 0001)

**Status:** ✅ All migrations applied

**What's Created:**
- Warehouses table with location details
- Stock levels per product per warehouse
- Inventory movements (receiving, shipping, transfers, adjustments)
- Movement tracking with references

**Apply Command:**
```bash
cd services/inventory-service

# Apply all migrations
npx wrangler d1 migrations apply DB --local

# Verify tables created
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**Expected Tables:**
```
warehouses
stock_levels
inventory_movements
```

---

### 3️⃣ Accounting Service (THIRD)
**Why Third:** Receives journal entries from sales/inventory transactions.

**Database:** `accounting-db`
**Migrations:** 1 total (0000)

**Status:** ✅ Migration applied

**What's Created:**
- Chart of Accounts (hierarchical GL structure)
- Journal Entries (transaction headers)
- Journal Lines (individual debit/credit postings)
- Account Balances (materialized view for performance)
- Pre-populated system accounts (Assets, Liabilities, Revenue, COGS, Expenses)

**GL Segmentation:**
- `warehouse_id` - Track sales by warehouse
- `sales_person_id` - Track sales by salesperson (commission)
- `sales_channel` - Track by channel (POS, Wholesale, Online, B2B, Marketplace)
- `customer_id`, `vendor_id`, `product_id` - Additional dimensions

**Apply Command:**
```bash
cd services/accounting-service

# Apply migration
npx wrangler d1 execute DB --local --file=migrations/0000_initial_accounting_schema.sql

# Verify tables and system accounts
npx wrangler d1 execute DB --local --command "SELECT code, name, account_type FROM chart_of_accounts ORDER BY code;"
```

**Expected Tables:**
```
chart_of_accounts
journal_entries
journal_lines
account_balances
```

**Pre-populated Accounts:**
```
1000 - Cash (Asset)
1010 - Inventory - Finished Goods (Asset)
1200 - Accounts Receivable (Asset)
2000 - Accounts Payable (Liability)
3000 - Owner Equity (Equity)
3100 - Retained Earnings (Equity)
4010 - Product Sales - Retail (Revenue)
4020 - Product Sales - Wholesale (Revenue)
5010 - Cost of Goods Sold (COGS)
6000 - Operating Expenses (Expense)
6100 - Salaries Expense (Expense)
6200 - Rent Expense (Expense)
```

---

## 🚀 Quick Start - Apply All Migrations

If starting fresh, run these commands in order:

```bash
# 1. Product Service
cd services/product-service
npx wrangler d1 migrations apply DB --local

# 2. Inventory Service
cd ../inventory-service
npx wrangler d1 migrations apply DB --local

# 3. Accounting Service
cd ../accounting-service
npx wrangler d1 execute DB --local --file=migrations/0000_initial_accounting_schema.sql

# Return to root
cd ../..
```

---

## 🧪 Testing Locally

### Start All Services

**Terminal 1 - Product Service:**
```bash
cd services/product-service
pnpm dev
# → http://localhost:8788
```

**Terminal 2 - Inventory Service:**
```bash
cd services/inventory-service
pnpm dev
# → http://localhost:8789 (or next available port)
```

**Terminal 3 - Accounting Service:**
```bash
cd services/accounting-service
pnpm dev
# → http://localhost:8790 (or next available port)
```

**Terminal 4 - Admin Dashboard:**
```bash
cd apps/admin-dashboard
pnpm dev
# → http://localhost:5173
```

---

## ✅ Verification Steps

### 1. Verify Product Service

**Check Health:**
```bash
curl http://localhost:8788/health
```

**Expected:**
```json
{
  "status": "healthy",
  "service": "product-service",
  "timestamp": "2025-11-22T..."
}
```

**Check Products:**
```bash
curl http://localhost:8788/api/products
```

**Check UOMs:**
```bash
curl http://localhost:8788/api/uoms
```

**Check Categories:**
```bash
curl http://localhost:8788/api/categories
```

---

### 2. Verify Inventory Service

**Check Health:**
```bash
curl http://localhost:8789/health
```

**Check Warehouses:**
```bash
curl http://localhost:8789/api/warehouses
```

**Check Stock Levels:**
```bash
curl http://localhost:8789/api/stock
```

---

### 3. Verify Accounting Service

**Check Health:**
```bash
curl http://localhost:8790/health
```

**Check Chart of Accounts:**
```bash
curl http://localhost:8790/api/accounts
```

**Check Sales by Warehouse Report:**
```bash
curl "http://localhost:8790/api/reports/sales-by-warehouse?startDate=2025-11-01&endDate=2025-11-30"
```

**Check Sales by Person Report:**
```bash
curl "http://localhost:8790/api/reports/sales-by-person?startDate=2025-11-01&endDate=2025-11-30"
```

---

### 4. Verify Admin Dashboard

**Open in Browser:**
```
http://localhost:5173/dashboard
```

**Check These Pages:**
- ✅ `/dashboard` - Main dashboard
- ✅ `/dashboard/products` - Product management
- ✅ `/dashboard/products/uoms` - UOM management
- ✅ `/dashboard/products/categories` - Category management
- ✅ `/dashboard/products/locations` - Product locations
- ✅ `/dashboard/inventory/warehouses` - Warehouse management
- ✅ `/dashboard/accounting` - Accounting dashboard
- ✅ `/dashboard/accounting/chart-of-accounts` - Chart of Accounts
- ✅ `/dashboard/accounting/reports/sales-by-warehouse` - Warehouse sales report
- ✅ `/dashboard/accounting/reports/sales-by-person` - Salesperson sales report

---

## 📊 Database Tools

### Drizzle Studio (Visual Database Browser)

**Product Service:**
```bash
cd services/product-service
pnpm db:studio
# Opens https://local.drizzle.studio
```

**Inventory Service:**
```bash
cd services/inventory-service
pnpm db:studio
```

**Accounting Service:**
```bash
cd services/accounting-service
pnpm db:studio
```

### Direct SQL Queries

**Query Product Database:**
```bash
cd services/product-service
npx wrangler d1 execute DB --local --command "SELECT id, name, sku FROM products LIMIT 5;"
```

**Query Inventory Database:**
```bash
cd services/inventory-service
npx wrangler d1 execute DB --local --command "SELECT * FROM warehouses;"
```

**Query Accounting Database:**
```bash
cd services/accounting-service
npx wrangler d1 execute DB --local --command "SELECT * FROM chart_of_accounts WHERE account_type = 'Revenue';"
```

---

## 🔧 Common Development Tasks

### Adding a New Product

**1. Create Product via API:**
```bash
curl -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "sku": "TEST-001",
    "category_id": "cat-1",
    "base_price": 100000,
    "cost_price": 60000,
    "uom_id": "uom-pcs",
    "revenue_account_code": "4010",
    "cogs_account_code": "5010",
    "inventory_account_code": "1010"
  }'
```

**2. Add Stock to Warehouse:**
```bash
curl -X POST http://localhost:8789/api/stock \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod-123",
    "warehouse_id": "WH-JKT-01",
    "quantity": 100
  }'
```

**3. Create Journal Entry (Manual):**
```bash
curl -X POST http://localhost:8790/api/journal-entries \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Product purchase",
    "lines": [
      {
        "account_id": "acc-1010",
        "direction": "Debit",
        "amount": 60000,
        "product_id": "prod-123"
      },
      {
        "account_id": "acc-1000",
        "direction": "Credit",
        "amount": 60000
      }
    ]
  }'
```

---

### Creating a Sale Transaction

**When implementing Order Service, the flow will be:**

1. **Create Order** → Order Service
2. **Reduce Stock** → Inventory Service (inventory movement)
3. **Create Journal Entry** → Accounting Service (automated)

**Example Journal Entry for Sale:**
```typescript
// POS Cash Sale
{
  entryDate: "2025-11-22",
  description: "POS Sale - Cash",
  reference: "ORDER-001",
  sourceService: "order-service",
  sourceReferenceId: "order-123",
  lines: [
    {
      accountId: "acc-1000",      // Debit: Cash
      direction: "Debit",
      amount: 100000,
      warehouseId: "WH-JKT-01",
      salesChannel: "POS"
    },
    {
      accountId: "acc-4010",      // Credit: Revenue - Retail
      direction: "Credit",
      amount: 100000,
      warehouseId: "WH-JKT-01",
      salesChannel: "POS"
    },
    {
      accountId: "acc-5010",      // Debit: COGS
      direction: "Debit",
      amount: 60000,
      productId: "prod-123"
    },
    {
      accountId: "acc-1010",      // Credit: Inventory
      direction: "Credit",
      amount: 60000,
      productId: "prod-123"
    }
  ]
}
```

**See:** `docs/PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md` for complete payment method logic.

---

## 📝 Migration Management

### Check Migration Status

**Product Service:**
```bash
cd services/product-service
npx wrangler d1 execute DB --local --command "SELECT * FROM d1_migrations ORDER BY id;"
```

**Expected:**
```
0000_free_firelord
0005_add_accounting_fields_to_products
```

**Inventory Service:**
```bash
cd services/inventory-service
npx wrangler d1 execute DB --local --command "SELECT * FROM d1_migrations;"
```

**Accounting Service:**
```bash
cd services/accounting-service
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

### Generate New Migration

**Example: Adding a field to products table:**

```bash
cd services/product-service

# 1. Edit schema
nano src/infrastructure/db/schema.ts

# 2. Generate migration SQL
pnpm db:generate

# 3. Review generated migration
cat migrations/0006_*.sql

# 4. Apply migration
npx wrangler d1 migrations apply DB --local

# 5. Verify
npx wrangler d1 execute DB --local --command "PRAGMA table_info(products);"
```

---

## 🚨 Troubleshooting

### Issue: "Couldn't find a D1 DB with the name 'product-db'"

**Solution:** Use the **binding name** (DB) instead of database name:

```bash
# Wrong
npx wrangler d1 execute product-db --local ...

# Correct
npx wrangler d1 execute DB --local ...
```

---

### Issue: Migration Already Applied

**Check what's applied:**
```bash
npx wrangler d1 execute DB --local --command "SELECT * FROM d1_migrations;"
```

**If you need to re-apply (CAUTION: Deletes data!):**
```bash
# Drop tables
npx wrangler d1 execute DB --local --command "DROP TABLE IF EXISTS products;"

# Re-apply migration
npx wrangler d1 execute DB --local --file=migrations/0000_initial_schema.sql
```

---

### Issue: Port Already in Use

**Find what's using the port:**
```bash
# Linux/Mac
lsof -i :8788

# Kill the process
kill -9 <PID>
```

**Or change port in wrangler.toml:**
```toml
[dev]
port = 8791  # Use different port
```

---

### Issue: CORS Errors in Frontend

**Make sure all services have CORS enabled:**

Check `src/index.ts` in each service:
```typescript
app.use('/*', cors({
  origin: '*',  // For development only
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));
```

---

## 📚 Additional Documentation

**Payment Logic:**
- `docs/PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md` - Cash vs A/R decision logic

**Architecture:**
- `ARCHITECTURE.md` - System architecture overview
- `RETAIL_WHOLESALE_ARCHITECTURE.md` - Retail/Wholesale design

**Setup:**
- `SETUP.md` - Original setup guide (legacy)
- `README.md` - Project overview

---

## 🎯 Current Status Summary

### ✅ Completed
- ✅ Product Service with 6 migrations (accounting integration)
- ✅ Inventory Service with 2 migrations (warehouses + stock)
- ✅ Accounting Service with initial schema (GL segmentation)
- ✅ Admin Dashboard with reports (sales by warehouse/person)
- ✅ Payment method logic (Cash, Card, Credit Terms)
- ✅ UOM management (real API integration)
- ✅ Warehouse management (real API integration)
- ✅ Product locations (warehouse + zone tracking)

### 🔄 In Progress
- 🔄 Order Service (not yet created)
- 🔄 Payment Service integration
- 🔄 User authentication/authorization

### ⏳ Planned
- ⏳ POS frontend
- ⏳ Wholesale frontend
- ⏳ Mobile app (Expo)
- ⏳ Email notifications
- ⏳ Reporting dashboard enhancements

---

## 🎉 You're Ready to Test!

Once all three services have migrations applied:

1. ✅ Start all 4 terminals (3 services + 1 dashboard)
2. ✅ Open admin dashboard at http://localhost:5173
3. ✅ Navigate to Products → Create a product
4. ✅ Navigate to Inventory → Add stock to warehouse
5. ✅ Navigate to Accounting → View Chart of Accounts
6. ✅ Navigate to Accounting → Sales Reports → View sales by warehouse

**All core functionality is working!** 🚀

---

**Last Updated:** 2025-11-22
**Migration Status:** Product (0000-0005) ✅ | Inventory (0000-0001) ✅ | Accounting (0000) ✅
