# Staging Deployment Guide

This guide explains deployment environments and when to use them.

---

## Current Phase: Infancy (No Real Users)

**For early development, use the simplified workflow:**

```
┌─────────────────────────────────────────────────────┐
│  CURRENT SETUP (Recommended for Infancy Phase)     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Frontend: localhost:5173 (pnpm dev)               │
│      ↓                                              │
│  Backend: *.tesla-hakim.workers.dev (production)   │
│      ↓                                              │
│  Protected by: IP Whitelist (only your IP)         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Why This Works Now

| Concern | Why It's OK |
|---------|-------------|
| Breaking production? | No real users yet |
| Data loss? | Test data only |
| Downtime? | Only affects you |
| Cost? | One environment = lower cost |

### Current Workflow

```bash
# 1. Start frontend locally
cd apps/erp-dashboard
pnpm dev
# Opens http://localhost:5173

# 2. Backend already deployed (IP protected)
# Redeploy when you make backend changes
cd services/accounting-service
wrangler deploy

# 3. Test directly - only your IP can access
```

---

## When to Add Staging

Add staging environment when ANY of these apply:

- [ ] Ready to onboard real users/customers
- [ ] Have real production data to protect
- [ ] Multiple developers working simultaneously
- [ ] Need to test before affecting real users
- [ ] Preparing for beta/public launch

---

## Environment Progression

| Phase | Environments | When |
|-------|--------------|------|
| **Infancy** | Local + Production | Now ✅ |
| **Alpha** | Local + Production | Internal testing |
| **Beta** | Local + Staging + Production | Real users onboarding |
| **GA (Launch)** | Local + Staging + Production | Public release |

---

## Future: Full Staging Setup

When you're ready for staging, here's how to set it up:

### Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Local     │ →  │   Staging   │ →  │  Production │
│ Development │    │  (Testing)  │    │   (Live)    │
└─────────────┘    └─────────────┘    └─────────────┘
     pnpm dev       *-staging.        *.tesla-hakim.
                    workers.dev       workers.dev
```

## Cloudflare Staging Options

### Option 1: Wrangler Environments (Recommended)

Add environments to `wrangler.jsonc`:

```jsonc
{
  "name": "accounting-service",
  "main": "src/index.ts",

  // Shared config
  "compatibility_date": "2024-11-14",

  // Production (default)
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "accounting-db",
      "database_id": "prod-db-id-here"
    }
  ],

  // Staging environment
  "env": {
    "staging": {
      "name": "accounting-service-staging",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "accounting-db-staging",
          "database_id": "staging-db-id-here"
        }
      ],
      "vars": {
        "ENVIRONMENT": "staging"
      }
    }
  }
}
```

**Deploy commands:**
```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy
```

**URLs:**
- Staging: `https://accounting-service-staging.tesla-hakim.workers.dev`
- Production: `https://accounting-service.tesla-hakim.workers.dev`

---

### Option 2: Separate D1 Databases for Staging

Create staging databases:

```bash
# Create staging databases for each service
wrangler d1 create accounting-db-staging
wrangler d1 create product-db-staging
wrangler d1 create inventory-db-staging
wrangler d1 create order-db-staging
wrangler d1 create payment-db-staging
wrangler d1 create business-partner-db-staging
```

---

## Recommended Staging Setup

### Step 1: Create Staging Databases

```bash
# Run for each service
cd services/accounting-service
wrangler d1 create accounting-db-staging
# Note the database_id from output
```

### Step 2: Update wrangler.jsonc

Example for accounting-service:

```jsonc
{
  "name": "accounting-service",
  "main": "src/index.ts",
  "compatibility_date": "2024-11-14",
  "compatibility_flags": ["nodejs_compat"],

  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },

  // Production database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "accounting-db",
      "database_id": "your-prod-db-id"
    }
  ],

  // Staging environment
  "env": {
    "staging": {
      "name": "accounting-service-staging",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "accounting-db-staging",
          "database_id": "your-staging-db-id"
        }
      ],
      "vars": {
        "ENVIRONMENT": "staging"
      }
    }
  },

  "dev": {
    "port": 8794
  }
}
```

### Step 3: Run Migrations on Staging

```bash
# Apply migrations to staging database
wrangler d1 execute accounting-db-staging --file=migrations/0001_initial.sql
wrangler d1 execute accounting-db-staging --file=migrations/0002_xxx.sql
# ... all migrations
```

### Step 4: Deploy to Staging

```bash
# Deploy all services to staging
cd services/accounting-service && wrangler deploy --env staging
cd services/product-service && wrangler deploy --env staging
cd services/inventory-service && wrangler deploy --env staging
# ... etc
```

---

## Deployment Workflow

### For Regular Updates

```
1. Develop locally (pnpm dev)
       ↓
2. Create PR
       ↓
3. PR Review + Tests Pass
       ↓
4. Deploy to Staging
   wrangler deploy --env staging
       ↓
5. Test on Staging
   - Manual testing
   - Integration tests
       ↓
6. Deploy to Production
   wrangler deploy
       ↓
7. Monitor Production
```

### For Major Dependency Updates

```
1. Create migration branch
       ↓
2. Update dependencies
       ↓
3. Fix breaking changes
       ↓
4. All tests pass locally
       ↓
5. Deploy to Staging ← REQUIRED
       ↓
6. Full testing on Staging (24-48 hours)
       ↓
7. Deploy to Production
       ↓
8. Monitor for 48 hours
```

---

## CI/CD Integration (GitHub Actions)

Add to `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-staging:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test
      - run: pnpm type-check

      # Deploy to staging for PR testing
      - name: Deploy to Staging
        run: |
          cd services/accounting-service && wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test
      - run: pnpm type-check

      # Deploy to production
      - name: Deploy to Production
        run: |
          cd services/accounting-service && wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## Staging Environment Variables

For frontend (erp-dashboard), create `.env.staging`:

```bash
# Staging backend services
VITE_API_GATEWAY_URL=https://api-gateway-staging.tesla-hakim.workers.dev
VITE_ACCOUNTING_SERVICE_URL=https://accounting-service-staging.tesla-hakim.workers.dev
VITE_PRODUCT_SERVICE_URL=https://product-service-staging.tesla-hakim.workers.dev
VITE_INVENTORY_SERVICE_URL=https://inventory-service-staging.tesla-hakim.workers.dev
VITE_BUSINESS_PARTNER_SERVICE_URL=https://business-partner-service-staging.tesla-hakim.workers.dev
VITE_ORDER_SERVICE_URL=https://order-service-staging.tesla-hakim.workers.dev
VITE_PAYMENT_SERVICE_URL=https://payment-service-staging.tesla-hakim.workers.dev
VITE_SHIPPING_SERVICE_URL=https://shipping-service-staging.tesla-hakim.workers.dev
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `wrangler deploy` | Deploy to production |
| `wrangler deploy --env staging` | Deploy to staging |
| `wrangler d1 execute DB-staging --command "SELECT * FROM..."` | Query staging DB |
| `wrangler tail --env staging` | View staging logs |

---

## Checklist Before Production Deploy

- [ ] All tests pass locally
- [ ] Type check passes
- [ ] Deployed to staging
- [ ] Manual testing on staging
- [ ] No errors in staging logs
- [ ] Performance acceptable
- [ ] Ready for production

---

**Last Updated**: 2026-02-04
