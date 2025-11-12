# Database Migration for Xendit Payment Integration

## Overview

This migration adds payment-related fields to the `orders` table to support Xendit payment integration (QRIS and Virtual Accounts).

## Changes to `orders` Table

### New Columns Added

| Column Name | Type | Description |
|-------------|------|-------------|
| `payment_method` | TEXT | Payment method: 'qris', 'virtual_account', 'manual', 'cod' |
| `payment_provider` | TEXT | Payment provider: 'xendit', 'stripe', 'manual' (default: 'xendit') |
| `payment_provider_id` | TEXT | External payment ID from Xendit (QR ID or VA ID) |
| `payment_details` | TEXT | JSON string with payment details (QR string, VA number, etc.) |
| `payment_expires_at` | INTEGER | Unix timestamp when payment expires |
| `paid_at` | INTEGER | Unix timestamp when payment was completed |

## SQL Migration Script

```sql
-- Add payment-related columns to orders table
ALTER TABLE orders ADD COLUMN payment_method TEXT CHECK(payment_method IN ('qris', 'virtual_account', 'manual', 'cod'));
ALTER TABLE orders ADD COLUMN payment_provider TEXT DEFAULT 'xendit';
ALTER TABLE orders ADD COLUMN payment_provider_id TEXT;
ALTER TABLE orders ADD COLUMN payment_details TEXT;
ALTER TABLE orders ADD COLUMN payment_expires_at INTEGER;
ALTER TABLE orders ADD COLUMN paid_at INTEGER;
```

## Drizzle ORM Migration

If using Drizzle Kit, run:

```bash
cd apps/backend

# Generate migration
pnpm db:generate

# Apply migration locally
pnpm db:migrate

# Apply migration to production
pnpm db:migrate:prod
```

## Payment Details JSON Structure

### QRIS Payment Details
```json
{
  "qr_string": "00020101021126660014ID...",
  "amount": 150000,
  "created": "2025-01-12T10:00:00.000Z"
}
```

### Virtual Account Payment Details
```json
{
  "bank_code": "BCA",
  "account_number": "888881234567890",
  "merchant_code": "88888",
  "name": "Toko Grosir ABC",
  "expected_amount": 150000,
  "expiration_date": "2025-01-15T23:59:59.000Z"
}
```

## Example Query

### Find unpaid orders with QRIS
```sql
SELECT
  id,
  order_number,
  payment_method,
  payment_status,
  payment_expires_at
FROM orders
WHERE payment_method = 'qris'
  AND payment_status = 'pending'
  AND payment_expires_at > unixepoch();
```

### Find orders paid via Virtual Account
```sql
SELECT
  id,
  order_number,
  payment_method,
  paid_at
FROM orders
WHERE payment_method = 'virtual_account'
  AND payment_status = 'paid'
ORDER BY paid_at DESC;
```

## Rollback (if needed)

```sql
-- Remove payment columns (destructive!)
ALTER TABLE orders DROP COLUMN payment_method;
ALTER TABLE orders DROP COLUMN payment_provider;
ALTER TABLE orders DROP COLUMN payment_provider_id;
ALTER TABLE orders DROP COLUMN payment_details;
ALTER TABLE orders DROP COLUMN payment_expires_at;
ALTER TABLE orders DROP COLUMN paid_at;
```

⚠️ **Note**: SQLite doesn't support DROP COLUMN natively. You may need to:
1. Create a new table without these columns
2. Copy data
3. Drop old table
4. Rename new table

## Testing

1. Create a test order
2. Generate QRIS payment
3. Verify payment_details contains QR code
4. Simulate webhook callback
5. Verify order status updated to 'paid'

## Verification

After migration, verify with:

```sql
-- Check schema
PRAGMA table_info(orders);

-- Should show new columns:
-- payment_method
-- payment_provider
-- payment_provider_id
-- payment_details
-- payment_expires_at
-- paid_at
```

---

**Migration Date**: January 2025
**Status**: Ready to Apply
