# Business Partner Service - D1 Database Migration Guide

This document explains how to manage database migrations for the Business Partner Service using Cloudflare D1 and Drizzle ORM.

## Overview

The Business Partner Service uses:
- **Cloudflare D1**: SQLite-compatible serverless database
- **Drizzle ORM**: TypeScript ORM for type-safe database operations
- **Drizzle Kit**: CLI tool for generating and managing migrations

## Project Structure

```
services/business-partner-service/
├── drizzle.config.ts         # Drizzle Kit configuration
├── wrangler.jsonc            # Cloudflare Workers configuration (D1 binding)
├── migrations/               # SQL migration files
│   ├── 0000_initial_schema.sql
│   ├── 0001_add_geospatial_fields.sql
│   ├── 0002_add_analytics_fields.sql
│   └── meta/                 # Drizzle migration metadata
└── src/
    └── infrastructure/
        └── db/
            └── schema.ts     # Drizzle schema definitions
```

## Database Configuration

### wrangler.jsonc

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",           // How you access the database in code
      "database_name": "business-partner-db",
      "database_id": "placeholder-run-wrangler-d1-create"  // Replace with actual ID
    }
  ]
}
```

### drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
});
```

## Migration Commands

### 1. Generate a New Migration

When you modify the schema in `src/infrastructure/db/schema.ts`, generate a migration:

```bash
cd services/business-partner-service

# Generate migration from schema changes
pnpm drizzle-kit generate

# Or with a custom name
pnpm drizzle-kit generate --name add_new_feature
```

### 2. Apply Migrations Locally (Development)

For local development with Wrangler:

```bash
# Apply all pending migrations to local D1
wrangler d1 migrations apply business-partner-db --local
```

### 3. Apply Migrations to Production

For production deployment:

```bash
# First, create the D1 database (one-time setup)
wrangler d1 create business-partner-db

# Apply migrations to production D1
wrangler d1 migrations apply business-partner-db --remote
```

### 4. View Migration Status

```bash
# List applied migrations (local)
wrangler d1 migrations list business-partner-db --local

# List applied migrations (remote)
wrangler d1 migrations list business-partner-db --remote
```

## Current Migrations

### 0000_initial_schema.sql
Creates the base tables:
- `customers` - Customer records with loyalty, credit, and type information
- `suppliers` - Supplier records with bank info, payment terms, and ratings
- `employees` - Employee records with HR data
- `addresses` - Shared address table for all partner types

### 0001_add_geospatial_fields.sql
Adds location tracking capabilities:
- Geospatial fields on customers (lat/lng, geohash)
- Enhanced address location fields
- `customer_location_history` table for mobile tracking

### 0002_add_analytics_fields.sql
Adds customer analytics:
- Demographic data
- Face recognition fields (AWS Rekognition)
- Behavioral analytics
- Engagement tracking
- Social/network analytics
- Predictive analytics (RFM, CLV, Churn)

## Local Development Workflow

### Initial Setup

```bash
# Navigate to the service
cd services/business-partner-service

# Install dependencies
pnpm install

# Create local D1 database and apply migrations
wrangler d1 migrations apply business-partner-db --local

# Start the development server
pnpm dev
```

### Making Schema Changes

1. **Modify the schema** in `src/infrastructure/db/schema.ts`

2. **Generate migration**:
   ```bash
   pnpm drizzle-kit generate
   ```

3. **Review the generated SQL** in `migrations/` directory

4. **Apply locally**:
   ```bash
   wrangler d1 migrations apply business-partner-db --local
   ```

5. **Test your changes**

6. **Commit the migration files**

## Production Deployment Workflow

### First-Time Setup

1. **Create the D1 database**:
   ```bash
   wrangler d1 create business-partner-db
   ```

2. **Copy the database_id** from the output and update `wrangler.jsonc`

3. **Apply all migrations**:
   ```bash
   wrangler d1 migrations apply business-partner-db --remote
   ```

### Deploying Updates

1. **Deploy the worker** (migrations are applied automatically if configured):
   ```bash
   wrangler deploy
   ```

2. **Or apply migrations manually first**:
   ```bash
   wrangler d1 migrations apply business-partner-db --remote
   wrangler deploy
   ```

## Common Issues & Solutions

### Migration Failed

If a migration fails:

1. Check the error message for SQL syntax issues
2. For local dev, you can reset the database:
   ```bash
   rm -rf .wrangler/state
   wrangler d1 migrations apply business-partner-db --local
   ```

### Schema Out of Sync

If Drizzle schema doesn't match the database:

```bash
# Pull current database schema (introspection)
pnpm drizzle-kit introspect

# Compare and generate migration
pnpm drizzle-kit generate
```

### Viewing Database Contents

```bash
# Execute SQL directly (local)
wrangler d1 execute business-partner-db --local --command "SELECT * FROM customers LIMIT 10"

# Execute SQL directly (remote)
wrangler d1 execute business-partner-db --remote --command "SELECT COUNT(*) FROM customers"
```

## Best Practices

1. **Always generate migrations** - Never modify the database directly in production
2. **Review generated SQL** - Drizzle Kit generates SQL, but always verify it
3. **Test locally first** - Apply and test migrations locally before production
4. **Backup before major migrations** - Use D1 time-travel or export data
5. **Keep migrations small** - One logical change per migration
6. **Never delete migrations** - Even after they're applied, keep them for history

## Environment Variables

The service uses these environment variables:

| Variable | Description |
|----------|-------------|
| `DB` | D1 database binding (configured in wrangler.jsonc) |

## Related Documentation

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit Migrations](https://orm.drizzle.team/kit-docs/overview)
- [BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md](./BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
