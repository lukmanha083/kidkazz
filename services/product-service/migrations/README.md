# Database Migrations for Product Service

## Overview
This directory contains SQL migration scripts for the Product Service database (Cloudflare D1).

## Migration Naming Convention
Migrations are numbered sequentially:
- `001_initial_schema.sql` - Initial database schema
- `002_add_category_colors.sql` - Add colors to categories
- `003_*.sql` - Next migration

## Running Migrations

### Local Development (D1 Local)
```bash
# Apply migrations to local D1 database
cd services/product-service
wrangler d1 execute kidkazz-product-db --local --file=./migrations/002_add_category_colors.sql

# Or apply all migrations in order
for file in migrations/*.sql; do
  wrangler d1 execute kidkazz-product-db --local --file="$file"
done
```

### Production (Cloudflare D1)
```bash
# Apply to production database
cd services/product-service
wrangler d1 execute kidkazz-product-db --file=./migrations/002_add_category_colors.sql

# Or use Cloudflare Dashboard Console
# 1. Go to Dashboard > Workers & Pages > D1
# 2. Select database
# 3. Open Console tab
# 4. Paste and execute SQL
```

## Current Migrations

### 002_add_category_colors.sql
**Purpose:** Add default colors to product categories for better visual distinction

**What it does:**
- Updates existing categories with appropriate colors based on their names
- Maps Baby/Kids products to pink/cyan
- Maps Electronics to blue/orange
- Maps Toys to purple
- Maps Food to green/teal
- Assigns default colors to remaining categories

**When to run:**
- After initial setup
- When categories are missing colors
- When adding new category types

## Best Practices

1. **Always test locally first:**
   ```bash
   wrangler d1 execute kidkazz-product-db --local --file=./migrations/xxx.sql
   ```

2. **Use transactions:**
   ```sql
   BEGIN TRANSACTION;
   -- Your changes here
   COMMIT;
   ```

3. **Make migrations idempotent:**
   ```sql
   -- Good: Check before updating
   UPDATE table SET color = 'blue' WHERE color IS NULL;

   -- Avoid: Unconditional updates
   -- UPDATE table SET color = 'blue';
   ```

4. **Include rollback instructions:**
   Document how to undo the migration if needed

## Verification

After running a migration, verify the changes:
```bash
# Query to check the changes
wrangler d1 execute kidkazz-product-db --local --command="SELECT * FROM categories WHERE color IS NOT NULL LIMIT 10"
```

## Troubleshooting

### Migration fails halfway
If a migration fails, check the transaction:
- D1 supports transactions, so failed migrations should rollback
- Check the error message in the output
- Fix the SQL and re-run

### Applied migration needs changes
- Create a new migration with the changes
- Don't modify existing migration files after they've been applied

## Related Documentation
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
