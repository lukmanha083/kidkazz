# CLAUDE.md - AI Assistant Quick Reference

**Project**: Kidkazz - Real-Time Omnichannel ERP
**Stack**: Cloudflare Workers (Hono) + D1 + Durable Objects + Tanstack + ShadCN
**Architecture**: Microservices + DDD + Hexagonal + Event-Driven

---

## IMPORTANT: Always Read First

**Before planning or implementing ANY task, read the graph files:**
```bash
cat SERVICE_GRAPH.yaml      # Backend services
cat FRONTEND_GRAPH.yaml     # Frontend apps index
```

These files are the **single source of truth** for:
- Service relationships and dependencies
- Event flows between bounded contexts
- API contracts and endpoint mappings
- Frontend-to-backend connections
- Domain entity relationships across services

---

## Essential Reading Order

1. **SERVICE_GRAPH.yaml** - Backend services knowledge graph **← READ THIS FIRST**
2. **FRONTEND_GRAPH.yaml** - Frontend apps index and service connections
3. **apps/{app}/APP_GRAPH.yaml** - Per-app detailed graphs
4. **docs/ddd/BUSINESS_RULES.md** - Domain constraints (source of truth)
5. **docs/bounded-contexts/{context}/** - Service-specific docs

---

## Core Services

| Service | Responsibility |
|---------|---------------|
| Product | Catalog, pricing, UOM, variants, virtual bundles (NO stock) |
| Inventory | Stock (single source of truth), batches, FEFO, movements |
| Order | Retail/wholesale orders, Saga pattern |
| Accounting | Double-entry bookkeeping, assets, depreciation |
| Payment | Midtrans, QRIS, EDC integration |
| Chatbot | AI customer service (Grok + Vercel AI SDK) |

---

## Service Endpoints

| Service | Production URL | Local Port | Status |
|---------|---------------|------------|--------|
| API Gateway | `https://api-gateway.tesla-hakim.workers.dev` | 8787 | Deployed |
| Accounting | `https://accounting-service.tesla-hakim.workers.dev` | 8794 | Deployed |
| Product | `https://product-service.tesla-hakim.workers.dev` | 8788 | Deployed |
| Inventory | `https://inventory-service.tesla-hakim.workers.dev` | 8792 | Deployed |
| Business Partner | `https://business-partner-service.tesla-hakim.workers.dev` | 8793 | Deployed |
| Order | `https://order-service.tesla-hakim.workers.dev` | 8789 | Deployed |
| Payment | `https://payment-service.tesla-hakim.workers.dev` | 8790 | Deployed |
| Shipping | `https://shipping-service.tesla-hakim.workers.dev` | 8791 | Deployed |

**Frontend Environment Variables:**
```bash
# Production (all services deployed)
VITE_API_GATEWAY_URL=https://api-gateway.tesla-hakim.workers.dev
VITE_ACCOUNTING_SERVICE_URL=https://accounting-service.tesla-hakim.workers.dev
VITE_PRODUCT_SERVICE_URL=https://product-service.tesla-hakim.workers.dev
VITE_INVENTORY_SERVICE_URL=https://inventory-service.tesla-hakim.workers.dev
VITE_BUSINESS_PARTNER_SERVICE_URL=https://business-partner-service.tesla-hakim.workers.dev
VITE_ORDER_SERVICE_URL=https://order-service.tesla-hakim.workers.dev
VITE_PAYMENT_SERVICE_URL=https://payment-service.tesla-hakim.workers.dev
VITE_SHIPPING_SERVICE_URL=https://shipping-service.tesla-hakim.workers.dev

# WebSocket for real-time inventory updates
VITE_WEBSOCKET_URL=wss://inventory-service.tesla-hakim.workers.dev/ws
```

---

## Critical Architecture Rules

### 1. Inventory is Single Source of Truth
```
Product Service → delegates to → Inventory Service (GET /api/inventory/product/:id/total-stock)
```
**Never** store stock in Product Service.

### 2. Bundles
- **Virtual**: Stock calculated real-time from components (Product Service)
- **Physical**: Pre-assembled with own stock (Inventory Service, Phase 8)

### 3. Batch-Level Expiration
Expiration tracked per batch (`inventoryBatches.expirationDate`), not per product.

### 4. Negative Stock
Only POS sales can create negative stock. Warehouse operations must validate.

### 5. Optimistic Locking
All inventory mutations use `version` field.

### 6. ACID Transactions (Accounting)
Journal entries use `db.batch()` for atomic writes. Header + lines commit together or rollback together.

---

## Current Development Setup (Infancy Phase)

**Project Status:** Early development, no real users yet.

```
┌─────────────────────────────────────────────────────┐
│  Frontend: localhost:5173 (pnpm dev)               │
│      ↓                                              │
│  Backend: *.tesla-hakim.workers.dev (production)   │
│      ↓                                              │
│  Security: IP Whitelist (180.252.172.69)           │
└─────────────────────────────────────────────────────┘
```

### Start Development
```bash
# Frontend (hot reload)
cd apps/erp-dashboard
pnpm dev
# Opens http://localhost:5173

# Backend (redeploy after changes)
cd services/accounting-service
wrangler deploy
```

### Why No Staging Yet?
- No real users to protect
- Only test data in database
- IP whitelist protects endpoints
- Simpler = faster iteration

**Add staging when:** Ready for beta users (see `docs/guides/STAGING_DEPLOYMENT_GUIDE.md`)

---

## Development Workflow

### TDD (Mandatory)
```bash
# 1. Write failing test first
# 2. Write minimal code to pass
# 3. Refactor while green
pnpm test                    # Run all tests
pnpm test:unit              # Unit tests only
pnpm test:coverage          # With coverage
```

### Code Quality
```bash
pnpm check:fix              # Auto-fix lint/format (Biome)
pnpm type-check             # TypeScript validation
```

### Git
```bash
gh pr create --title "..." --body "..."   # Create PR
gh pr merge <num> --squash --delete-branch # Merge PR
```

---

## Quick Commands

```bash
# Graph Generation
pnpm generate:service-graph   # Backend services graph
pnpm generate:frontend-graph  # Frontend apps graphs
pnpm generate:graphs          # Both graphs

# View Graphs
cat SERVICE_GRAPH.yaml
cat FRONTEND_GRAPH.yaml
cat apps/erp-dashboard/APP_GRAPH.yaml

# Migrations (SQLite/D1)
wrangler d1 execute db --local --file=migrations/000X.sql

# Tests
pnpm test -- --grep "FeatureName"
```

---

## SQLite Migration Rules

- **No** `ALTER TABLE ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP`
- **Yes** Use `UPDATE` after adding column
- **All migrations must be idempotent** (use table recreation pattern)

---

## Common Pitfalls

- Don't add stock fields to Product Service
- Don't use product-level expirationDate (use batches)
- Don't bypass optimistic locking
- Don't skip migrations order
- Don't mix POS/warehouse adjustment logic

---

## Key Documentation Links

| Topic | Doc |
|-------|-----|
| Business Rules | `docs/ddd/BUSINESS_RULES.md` |
| Inventory | `docs/bounded-contexts/inventory/BUSINESS_RULES.md` |
| Accounting | `docs/bounded-contexts/accounting/BUSINESS_RULES.md` |
| Frontend/UI | `docs/guides/UI_DESIGN_GUIDELINE.md` |
| Testing | `docs/testing/DDD_REFACTORING_TESTING_GUIDE.md` |
| Saga Pattern | `docs/architecture/SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md` |
| Dependency Updates | `docs/guides/DEPENDENCY_MIGRATION_GUIDE.md` |
| Staging Setup | `docs/guides/STAGING_DEPLOYMENT_GUIDE.md` |
| IP Whitelist | `docs/bounded-contexts/business-partner/TEMPORARY_IP_WHITELIST.md` |

### Frontend Form Validation
```typescript
// Use createFormValidator (not deprecated zodValidator)
import { createFormValidator, schema } from '@/lib/form-schemas';
const form = useForm({
  validators: { onChange: createFormValidator(schema) }
});
```

---

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1-6 | DDD Refactoring (Inventory integration, batches, FEFO) | Complete |
| 7 | Inter-Warehouse Transfer | Pending |
| 8 | Stock Opname & Physical Bundles | Pending |

---

**Last Updated**: 2026-02-04
