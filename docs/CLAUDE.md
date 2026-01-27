# CLAUDE.md - AI Assistant Quick Reference

**Project**: Kidkazz - Real-Time Omnichannel ERP
**Stack**: Cloudflare Workers (Hono) + D1 + Durable Objects + Tanstack + ShadCN
**Architecture**: Microservices + DDD + Hexagonal + Event-Driven

---

## Essential Reading Order

1. **SERVICE_GRAPH.yaml** - Codebase knowledge graph (auto-updated)
2. **docs/ddd/BUSINESS_RULES.md** - Domain constraints (source of truth)
3. **docs/bounded-contexts/{context}/** - Service-specific docs

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
# SERVICE_GRAPH
pnpm generate:service-graph  # Regenerate
cat SERVICE_GRAPH.yaml       # View

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

**Last Updated**: 2026-01-27
