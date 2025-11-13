# Database Migration: Retail + Wholesale Support

## Overview

This migration adds support for dual-market (Retail + Wholesale) functionality to the platform.

---

## Schema Changes

### 1. Users Table - Update Role Enum

**Old:**
```sql
role TEXT CHECK(role IN ('admin', 'supplier', 'buyer'))
```

**New:**
```sql
role TEXT CHECK(role IN ('admin', 'supplier', 'wholesale_buyer', 'retail_buyer'))
```

**Migration SQL:**
```sql
-- SQLite doesn't support ALTER COLUMN directly
-- Option 1: Add new column, migrate data, drop old
ALTER TABLE users ADD COLUMN role_new TEXT CHECK(role_new IN ('admin', 'supplier', 'wholesale_buyer', 'retail_buyer')) DEFAULT 'retail_buyer';

-- Migrate existing data
UPDATE users
SET role_new = CASE
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'supplier' THEN 'supplier'
  WHEN role = 'buyer' AND (SELECT COUNT(*) FROM companies WHERE companies.user_id = users.id) > 0 THEN 'wholesale_buyer'
  WHEN role = 'buyer' THEN 'retail_buyer'
  ELSE 'retail_buyer'
END;

-- Drop old column (requires recreating table in SQLite)
-- OR keep both columns during transition period
```

### 2. Products Table - Add Retail/Wholesale Fields

**New Columns:**
```sql
ALTER TABLE products ADD COLUMN available_for_retail INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN available_for_wholesale INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN retail_price REAL;
ALTER TABLE products ADD COLUMN retail_discount_percent REAL DEFAULT 0;
```

**Field Descriptions:**
- `available_for_retail` - Boolean (0 or 1): Product visible to retail customers
- `available_for_wholesale` - Boolean (0 or 1): Product visible to wholesale buyers
- `retail_price` - Retail price per unit (nullable if not available for retail)
- `retail_discount_percent` - Optional discount percentage for retail

---

## Migration Strategy

### Step 1: Backup Database

```bash
# Export current database
wrangler d1 export wholesale-db --remote > backup_$(date +%Y%m%d).sql

# Or for local development
wrangler d1 export wholesale-db --local > backup_local.sql
```

### Step 2: Apply Schema Changes

```bash
cd apps/backend

# Generate new migration
pnpm db:generate

# Review migration files in drizzle/ folder

# Apply locally
pnpm db:migrate

# Test thoroughly

# Apply to production
pnpm db:migrate:prod
```

### Step 3: Migrate Existing Data

```typescript
// Migration script to set default values
import { db } from './src/lib/db';
import { products, users } from './src/db/schema';

async function migrateData() {
  // Set all existing products to be available for both markets
  await db.update(products).set({
    availableForRetail: true,
    availableForWholesale: true,
    // Calculate retail price as basePrice * 1.67 (example markup)
    retailPrice: products.basePrice * 1.67,
    retailDiscountPercent: 0,
  });

  console.log('Migration complete');
}

migrateData();
```

---

## Data Migration Examples

### Example 1: Migrate Buyers to Wholesale or Retail

```sql
-- Buyers with company → wholesale_buyer
UPDATE users
SET role_new = 'wholesale_buyer'
WHERE role = 'buyer'
  AND id IN (SELECT user_id FROM companies);

-- Buyers without company → retail_buyer
UPDATE users
SET role_new = 'retail_buyer'
WHERE role = 'buyer'
  AND id NOT IN (SELECT user_id FROM companies);
```

### Example 2: Set Initial Product Availability

```sql
-- Make all existing products available for both markets
UPDATE products
SET
  available_for_retail = 1,
  available_for_wholesale = 1,
  retail_price = base_price * 1.5,  -- 50% markup example
  retail_discount_percent = 0;
```

### Example 3: Configure Product-Specific Availability

```sql
-- High-value items: Wholesale only
UPDATE products
SET
  available_for_retail = 0,
  available_for_wholesale = 1,
  retail_price = NULL
WHERE base_price > 1000;

-- Small items: Retail only
UPDATE products
SET
  available_for_retail = 1,
  available_for_wholesale = 0
WHERE minimum_order_quantity < 10;
```

---

## Validation Queries

### Check User Role Distribution

```sql
SELECT role_new, COUNT(*) as count
FROM users
GROUP BY role_new;

-- Expected output:
-- admin: 1-5
-- supplier: 5-50
-- wholesale_buyer: 100-1000
-- retail_buyer: 1000-10000
```

### Check Product Availability

```sql
SELECT
  COUNT(*) as total_products,
  SUM(CASE WHEN available_for_retail = 1 THEN 1 ELSE 0 END) as retail_products,
  SUM(CASE WHEN available_for_wholesale = 1 THEN 1 ELSE 0 END) as wholesale_products,
  SUM(CASE WHEN available_for_retail = 1 AND available_for_wholesale = 1 THEN 1 ELSE 0 END) as both_markets
FROM products;
```

### Verify Retail Pricing

```sql
SELECT
  name,
  base_price,
  retail_price,
  (retail_price - base_price) / base_price * 100 as markup_percent
FROM products
WHERE available_for_retail = 1
ORDER BY markup_percent DESC
LIMIT 10;
```

---

## Rollback Plan

### If Migration Fails

1. **Restore from backup:**
   ```bash
   # Stop all API servers
   wrangler d1 execute wholesale-db --file=backup_20250112.sql --remote
   ```

2. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   git push
   ```

3. **Redeploy previous version:**
   ```bash
   wrangler deploy
   ```

---

## Testing Checklist

### Backend API Testing

- [ ] `GET /api/retail/products` returns only retail products
- [ ] `GET /api/wholesale/products` returns only wholesale products
- [ ] Retail endpoint does NOT expose `basePrice` or `pricingTiers`
- [ ] Wholesale endpoint does NOT expose `retailPrice`
- [ ] User with `retail_buyer` role can access retail routes
- [ ] User with `wholesale_buyer` role can access wholesale routes
- [ ] Product with `available_for_retail = false` is NOT visible in retail catalog

### Data Integrity

- [ ] All users have valid `role_new` value
- [ ] All retail products have `retail_price` set
- [ ] All wholesale products have `base_price` set
- [ ] No orphaned data after migration

---

## Post-Migration Tasks

1. **Update Admin Dashboard:**
   - Add UI to set retail vs wholesale availability
   - Add retail price input field
   - Update product list to show availability flags

2. **Build Retail Frontend:**
   - Product catalog consuming `/api/retail/products`
   - Display retail prices only
   - No MOQ requirements

3. **Build Wholesale Frontend:**
   - Product catalog consuming `/api/wholesale/products`
   - Display tiered pricing
   - Enforce MOQ

4. **Update Documentation:**
   - API endpoints for retail vs wholesale
   - User registration flows
   - Product configuration guide

---

## Monitoring

### Metrics to Track

```sql
-- Daily: Track user registrations by type
SELECT DATE(created_at) as date, role_new, COUNT(*) as registrations
FROM users
WHERE created_at >= DATE('now', '-30 days')
GROUP BY DATE(created_at), role_new
ORDER BY date DESC;

-- Weekly: Product availability breakdown
SELECT
  available_for_retail,
  available_for_wholesale,
  COUNT(*) as product_count
FROM products
WHERE status = 'active'
GROUP BY available_for_retail, available_for_wholesale;

-- Monthly: Revenue by market
SELECT
  CASE
    WHEN u.role_new = 'retail_buyer' THEN 'Retail'
    WHEN u.role_new = 'wholesale_buyer' THEN 'Wholesale'
  END as market,
  COUNT(o.id) as orders,
  SUM(o.total_amount) as revenue
FROM orders o
JOIN users u ON o.buyer_id = u.id
WHERE o.order_date >= DATE('now', '-30 days')
GROUP BY market;
```

---

**Migration Date:** TBD
**Estimated Downtime:** 5-10 minutes
**Rollback Time:** < 5 minutes
**Status:** Ready for Testing
