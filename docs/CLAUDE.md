# CLAUDE.md - AI Assistant Quick Reference

**Project**: Kidkazz - Real-Time Omnichannel ERP
**Architecture**: Microservices + DDD + Hexagonal + Event-Driven (Cloudflare Workers)
**Status**: Phases 1-6 Complete | Phases 7-8 Pending
**Last Updated**: 2025-12-13

---

## Quick Start: What You Need to Know

### Project Overview

Kidkazz is Real-Time Omnichannel ERP with Real-Time multi-warehouse inventory management using websocket, built on Cloudflare Workers using microservices architecture for backend. The frontend will using tanstack router, query, table, virtual table, form. For UIDesign it will leverage Shadcn UI as UI Component. We will have several frontend app such as admin-dashboard web for internal ERP, Point of Sale for on-store offline sales, E-Commerce Web for Retail, E-Commerce Web for Wholesale, Mobile Android App for kidkazz admin, Mobile Android and IOS App for Retail.

**Key Technologies**:
- Backend: Cloudflare Workers (Hono framework)
- Database: D1 (SQLite-based)
- Saga Pattern: Cloudflare workflow
- Real-time: Durable Objects + WebSocket
- Frontend: Tanstack + ShadCN UI
- Testing: Vitest

**Core Services**:
1. **Product Service** - Catalog, pricing, bundles (virtual)
2. **Inventory Service** - Stock management, batches, movements (single source of truth)
3. **Order Service** - Retail/wholesale orders, Saga pattern
4. **Payment Service** - midtrans integration/direct rest api integration for BCA, BRI and CIMB Niaga
5. **User Service** - Authentication, RBAC
6. **Accounting Service** - Double-entry bookkeeping
7. **Shipping Service** - Lalamove & J&T integration through Rest-Api

---

## Current Status: DDD Refactoring Progress

| Phase | Description | Status | Docs |
|-------|-------------|--------|------|
| **Phase 1** | Inventory Integration | ✅ Complete | [Summary](implementation/phases/PHASE1_IMPLEMENTATION_SUMMARY.md) |
| **Phase 2** | Single Source of Truth | ✅ Complete | [Summary](implementation/phases/PHASE2_IMPLEMENTATION_SUMMARY.md) |
| **Phase 3** | Batch Tracking & FEFO | ✅ Complete | [Summary](ddd/DDD_REFACTORING_COMPLETE_SUMMARY.md) |
| **Phase 4** | Schema Cleanup | ✅ Complete | [Roadmap](ddd/DDD_REFACTORING_ROADMAP.md) |
| **Phase 5** | API Refactoring | ✅ Complete | [Roadmap](ddd/DDD_REFACTORING_ROADMAP.md) |
| **Phase 6** | Testing & Validation | ✅ Complete | [Testing Guide](testing/DDD_REFACTORING_TESTING_GUIDE.md) |
| **Phase 7** | Inter-Warehouse Transfer | ⏳ **PENDING** | [Roadmap Lines 1101+](ddd/DDD_REFACTORING_ROADMAP.md#phase-7-inter-warehouse-transfer-inboundoutbound-workflow) |
| **Phase 8** | Stock Opname & Physical Bundles | ⏳ **PENDING** | [Roadmap Lines 2400+](ddd/DDD_REFACTORING_ROADMAP.md#phase-8-stock-opname--physical-bundles) |

**Recent Commits**:
- `f00e4ff` - Merge PR #98 (Review test docs)
- `1a311d8` - Fix batches endpoint URL in phase6-validation
- `8138e27` - Add seed data script and WebSocket test page
- `f8c3b3a` - Comprehensive unit testing for phases 1-6

---

## Architecture Principles: What NOT to Break

### 1. Single Source of Truth for Inventory
**CRITICAL**: Inventory Service is the ONLY source of stock data.

```
✅ CORRECT:
Product Service → delegates to → Inventory Service (GET /api/inventory/product/:id/total-stock)

❌ WRONG:
Product Service → returns products.stock (REMOVED in Phase 4!)
```

**Why**: Previously, stock was duplicated in 3 places (products.stock, productBundles.availableStock, inventory.quantityAvailable), causing data divergence and empty Low Stock Reports.

### 2. Virtual Bundles vs Physical Bundles

**Virtual Bundles** (Phase 2):
- NO stock stored
- Stock calculated real-time from components
- Lives in Product Service
- Example: "Holiday Gift Set" = 1 Mug + 2 Cookies

**Physical Bundles** (Phase 8 - Pending):
- Pre-assembled inventory
- Has own stock in Inventory Service
- Can be nested (bundle from bundle)
- ONLY Physical Bundles can be nested
- Tracked in stock opname as single unit

### 3. Batch-Level Expiration (Not Product-Level!)

**Before (WRONG)**:
```typescript
products.expirationDate  // ❌ Single date for all batches
```

**After (CORRECT)**:
```typescript
inventoryBatches.expirationDate  // ✅ Each batch has own expiration
```

**Why**: Products can have multiple batches with different expiration dates. FEFO (First Expired, First Out) requires batch-level tracking.

### 4. Negative Stock Rules

**Business Rule**: Only POS sales can create negative stock. Warehouse operations CANNOT.

```typescript
// POS Sale - Allows negative (customer always gets product)
POST /api/inventory/adjust { source: "pos" }  // ✅ Can go negative

// Warehouse Adjustment - Strict validation
POST /api/inventory/adjust { source: "warehouse" }  // ❌ Fails if insufficient stock
```

**Implementation**: `docs/ddd/BUSINESS_RULES.md` Line 13

### 5. Optimistic Locking for Race Conditions

All inventory mutations use `version` field:

```typescript
inventory.version  // Incremented on every update
```

**WebSocket Events**: Real-time stock updates broadcast to all connected clients when inventory changes.

### 6. Hexagonal Architecture Layers

```
┌─────────────────────────────────────┐
│  Infrastructure (HTTP, DB, Queue)   │  ← Routes, Repositories
├─────────────────────────────────────┤
│  Application (Use Cases)            │  ← Orchestration logic
├─────────────────────────────────────┤
│  Domain (Business Logic)            │  ← Aggregates, Entities, Value Objects
└─────────────────────────────────────┘
```

**Golden Rule**: Domain layer NEVER depends on infrastructure. Use dependency injection.

---

## Bounded Context Map

### Product Context (Product Service)
**Responsibilities**:
- Product catalog (name, SKU, barcode, description)
- Pricing (retail, wholesale, minimum order quantity)
- UOM definitions (conversion factors)
- Variants (size, color, etc.)
- Physical locations (rack, bin, zone, aisle)
- Virtual bundles (composition only, NO stock)

**What it does NOT own**:
- ❌ Stock quantities (delegated to Inventory Service)
- ❌ Batch/lot tracking (owned by Inventory Service)

**Key Files**:
- Schema: `services/product-service/src/infrastructure/db/schema.ts`
- Domain: `services/product-service/src/domain/`
- Docs: `docs/bounded-contexts/product/`

### Inventory Context (Inventory Service)
**Responsibilities**:
- Stock quantities (quantityAvailable, quantityReserved, quantityInTransit)
- Batch/lot tracking (expiration, FEFO)
- Inventory movements (audit trail)
- Stock transfers (inter-warehouse - Phase 7)
- Stock opname/cycle count (Phase 8)
- Physical bundles (Phase 8)
- Real-time WebSocket broadcasts

**Single Source of Truth**: ALL stock data lives here.

**Key Files**:
- Schema: `services/inventory-service/src/infrastructure/db/schema.ts`
- Domain: `services/inventory-service/src/domain/`
- WebSocket: `services/inventory-service/src/websocket/`
- Docs: `docs/bounded-contexts/inventory/`

### Accounting Context (Accounting Service)
**Responsibilities**:
- Double-entry bookkeeping
- Chart of accounts
- Journal entries (automatic from sales/purchases)
- Financial reports (balance sheet, P&L)

**Integration Points**:
- Listens to OrderCompleted events → creates journal entries
- Listens to PaymentReceived events → creates payment entries

**Key Files**:
- Schema: `services/accounting-service/src/infrastructure/db/schema.ts`
- Docs: `docs/bounded-contexts/accounting/`

### Frontend Context
**Technologies**:
- Tanstack Framework
- ShadCN UI components
- Zustand (state management)
- TanStack Query (API caching)

**Key Files**:
- API Client: `apps/web/lib/api/`
- Components: `apps/web/components/`
- Docs: `docs/bounded-contexts/frontend/`

---

## Common Tasks: Where to Look

### Task: Create New Frontend Feature/UI Component
1. **Read First**: `docs/guides/UI_DESIGN_GUIDELINE.md` - **MANDATORY**
2. **Review**: Responsive design patterns section (comprehensive checklist)
3. **Key Concepts**:
   - Standard Tailwind breakpoints (sm:, md:, lg:, xl:)
   - Button patterns (page headers, drawer footers)
   - Card/grid layouts (responsive grids)
   - Table column visibility (hide non-essential on mobile)
   - Search component (global search, compact width)
   - Form layouts (responsive grids)
   - Drawer positioning (left for forms, right for details)
4. **Follow Checklist**:
   - Page header buttons: `self-start sm:self-auto`
   - Stat cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-X`
   - Table columns: `hidden lg:table-cell` for non-essential
   - Form grids: `grid-cols-1 sm:grid-cols-2`
   - Drawer buttons: `flex flex-col sm:flex-row gap-2 w-full`
5. **Test**: Multiple breakpoints (320px, 375px, 768px, 1024px, 1440px)

### Task: Implement Phase 7 (Inter-Warehouse Transfer)
1. **Read First**: `docs/ddd/DDD_REFACTORING_ROADMAP.md` (lines 1101-2399)
2. **Review**: Workflow diagram, state machine, schema design
3. **Key Concepts**:
   - Inbound workflow (destination requests)
   - Outbound workflow (source approves, picks, packs, ships)
   - State transitions: REQUESTED → APPROVED → PICKING → PACKED → IN_TRANSIT → COMPLETED
   - Inventory updates: deduct from source, add to quantityInTransit, then add to destination
4. **Deliverables**:
   - Migration: `services/inventory-service/migrations/0006_stock_transfer.sql`
   - Schema: Update `services/inventory-service/src/infrastructure/db/schema.ts`
   - Routes: `services/inventory-service/src/routes/transfers.ts`
   - WebSocket events for real-time transfer tracking

### Task: Implement Phase 8 (Stock Opname & Physical Bundles)
1. **Read First**: `docs/ddd/DDD_REFACTORING_ROADMAP.md` (lines 2400+)
2. **Review**: Stock opname workflow, physical bundle assembly
3. **Key Concepts**:
   - Stock opname: Reconcile system inventory with physical count
   - Physical bundles: Pre-assembled inventory with own stock
   - Nested bundles: ONLY from physical bundles (not virtual)
   - Variance adjustments with approval workflow
4. **Deliverables**:
   - Migration: `0007_stock_opname.sql` and `0008_physical_bundles.sql`
   - Routes: `stock-opname.ts` and `bundle-assembly.ts`

### Task: Add New Business Rule
1. **Document**: `docs/ddd/BUSINESS_RULES.md`
2. **Implement**: Domain layer (`src/domain/` in relevant service)
3. **Validate**: Application layer (use cases)
4. **Test**: Unit tests + integration tests

### Task: Add New API Endpoint
1. **Route**: `services/{service}/src/routes/{domain}.ts`
2. **Validation**: Zod schema for request/response
3. **Use Case**: Application layer orchestration
4. **Domain Logic**: Domain layer aggregates/entities
5. **Test**: E2E test in `services/{service}/test/`

### Task: Fix Failing Tests
1. **Check**: `docs/testing/DDD_REFACTORING_TESTING_GUIDE.md`
2. **Run**: `pnpm test` (unit) or `pnpm test:e2e` (integration)
3. **Debug**: Check migration order, seed data, schema changes

### Task: Understand Saga Pattern
1. **Read**: `docs/architecture/SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md`
2. **Example**: Order creation with payment coordination
3. **Compensating Actions**: Automatic rollback on failure

### Task: WebSocket Real-Time Updates
1. **Read**: `docs/bounded-contexts/inventory/WEBSOCKET_REALTIME_INVENTORY.md`
2. **Implementation**: Durable Objects in `services/inventory-service/src/websocket/`
3. **Events**: Stock updates, low stock alerts, transfer tracking

---

## Testing Strategy

### Unit Tests
- **Location**: `services/{service}/test/unit/`
- **Coverage**: Domain logic, business rules
- **Run**: `pnpm test`
- **Target**: >80% coverage

### Integration Tests
- **Location**: `services/{service}/test/integration/`
- **Coverage**: API endpoints, database operations
- **Run**: `pnpm test:integration`
- **Requires**: Local D1 database

### E2E Tests
- **Location**: `services/{service}/test/e2e/`
- **Coverage**: Full workflows (order → payment → fulfillment)
- **Run**: `pnpm test:e2e`

### Test Guidelines
- ✅ Use `beforeAll` for database setup
- ✅ Use `afterAll` for cleanup
- ✅ Run migrations before tests
- ✅ Seed data in fixtures
- ❌ Don't share state between tests
- ❌ Don't mock domain logic (only infrastructure)

**Reference**: `docs/testing/DDD_REFACTORING_TESTING_GUIDE.md`

---

## Database Migrations

### Naming Convention
```
0001_initial.sql
0002_add_variants.sql
0003_ddd_enhancement.sql
...
```

### SQLite Limitations
❌ **NO** `ALTER TABLE ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP`
❌ **NO** `ALTER TABLE ADD COLUMN ... DEFAULT gen_random_uuid()`

✅ **YES** - Use `UPDATE` statement after adding column:
```sql
ALTER TABLE inventory ADD COLUMN version INTEGER;
UPDATE inventory SET version = 1 WHERE version IS NULL;
```

### Migration Files Location
- Product Service: `services/product-service/migrations/`
- Inventory Service: `services/inventory-service/migrations/`
- Accounting Service: `services/accounting-service/migrations/`

### Running Migrations
```bash
# Local D1
wrangler d1 execute kidkazz-db --local --file=services/inventory-service/migrations/0006_stock_transfer.sql

# Production
wrangler d1 execute kidkazz-db --file=services/inventory-service/migrations/0006_stock_transfer.sql
```

---

## Key Business Rules to Remember

### Inventory Management
1. **Negative Stock**: Only POS can go negative (warehouse operations must validate)
2. **Minimum Stock**: Cannot be negative
3. **Reserved Quantity**: Auto-created on order placement, released on cancellation/completion
4. **Batch Expiration**: First Expired, First Out (FEFO) picking
5. **UOM Conversion**: Always convert to base UOM (e.g., BOX6 → PCS * 6)

### Bundles
1. **Virtual Bundles**: Stock calculated from components (real-time)
2. **Physical Bundles**: Pre-assembled inventory (Phase 8)
3. **Nested Bundles**: ONLY physical bundles can contain other bundles
4. **Stock Opname**: Virtual bundles not counted (only components); Physical bundles counted as units

### Orders
1. **Retail (B2C)**: Minimum order quantity = 1
2. **Wholesale (B2B)**: Minimum order quantity per product
3. **Order States**: PENDING → PAID → PROCESSING → PACKED → SHIPPED → DELIVERED
4. **Saga Pattern**: Payment failure → auto-cancel order → release reserved stock

### Accounting
1. **Double Entry**: Every transaction has debit and credit
2. **Auto Journal Entries**: Created from order completion, not order creation
3. **Payment Methods**: Cash/Bank affects different accounts (see `docs/bounded-contexts/accounting/PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md`)

**Full Reference**: `docs/ddd/BUSINESS_RULES.md`

---

## Git Workflow

### Branch Strategy
- **Main**: `main` (production-ready)
- **Feature Branches**: `claude/{description}-{session-id}`
- **Current Branch**: `claude/read-docs-phase-7-01Po6Jw3mnWRJbuEn8J7vJSg`

### Commit Guidelines
- feat: New feature
- fix: Bug fix
- refactor: Code restructuring
- docs: Documentation only
- test: Test additions/fixes
- chore: Build/tooling changes

### Push Requirements
- Always use: `git push -u origin <branch-name>`
- Branch naming: MUST start with `claude/` and end with session ID
- Retry logic: Up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Product stock query | < 100ms | Aggregate across warehouses |
| Bundle stock calculation | < 200ms | Component lookup + math |
| Batch FEFO query | < 50ms | Indexed by expirationDate |
| Order creation | < 300ms | Includes payment + inventory reserve |
| WebSocket message | < 10ms | Broadcast to all connections |

**Optimization**: Use caching (30s TTL) for frequently accessed data.

---

## Common Pitfalls to Avoid

1. ❌ **Don't add stock fields to Product Service** - Inventory Service owns all stock
2. ❌ **Don't query products.stock** - Field was removed in Phase 4
3. ❌ **Don't use product-level expirationDate** - Use inventoryBatches instead
4. ❌ **Don't bypass optimistic locking** - Always include version in updates
5. ❌ **Don't create inventory directly** - Use productLocations/variants to auto-create
6. ❌ **Don't mix POS and warehouse adjustment logic** - Different validation rules
7. ❌ **Don't forget compensating actions** - Every saga step needs rollback handler
8. ❌ **Don't skip migrations** - Run them sequentially in order

---

## Quick Links to Essential Docs

### Must Read Before Any Task
- [DDD Refactoring Roadmap](ddd/DDD_REFACTORING_ROADMAP.md) - THE master plan
- [Business Rules](ddd/BUSINESS_RULES.md) - Domain constraints
- [Architecture Overview](architecture/ARCHITECTURE.md) - System design

### For Phase 7 (Inter-Warehouse Transfer)
- [Roadmap Section 7](ddd/DDD_REFACTORING_ROADMAP.md) - Lines 1101-2399
- [Migration Strategy](ddd/DDD_MIGRATION_GUIDE.md)

### For Phase 8 (Stock Opname & Physical Bundles)
- [Roadmap Section 8](ddd/DDD_REFACTORING_ROADMAP.md) - Lines 2400+
- [Bundle Handling](bounded-contexts/inventory/PRODUCT_BUNDLES_STOCK_HANDLING.md)

### For Testing
- [Testing Guide](testing/DDD_REFACTORING_TESTING_GUIDE.md) - Comprehensive E2E scenarios
- [Phase 1 Testing](implementation/phases/PHASE1_TESTING_GUIDE.md)
- [Inventory Integration Testing](testing/INVENTORY_INTEGRATION_TESTING.md)

### For Frontend Work
- ⭐ [UI Design Guideline](guides/UI_DESIGN_GUIDELINE.md) - **MUST READ** for all frontend features
- [Frontend Architecture](bounded-contexts/frontend/FRONTEND_ARCHITECTURE.md)
- [Frontend Refactoring Roadmap](bounded-contexts/frontend/FRONTEND_REFACTORING_ROADMAP.md)
- [Phase 2B Migration Guide](implementation/phases/PHASE2B_FRONTEND_MIGRATION_GUIDE.md)

### For Integration
- [Microservices Integration](integration/MICROSERVICES_INTEGRATION_ROADMAP.md)
- [Saga Pattern](architecture/SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md)
- [Event-Driven Architecture](architecture/EVENT_DRIVEN_ARCHITECTURE_CLOUDFLARE.md)

### For Development Setup
- [Development Setup Guide](guides/DEVELOPMENT_SETUP_GUIDE.md)
- [Integration Quick Start](guides/INTEGRATION_QUICK_START.md)

---

## Documentation Organization

```
docs/
├── CLAUDE.md                    ← YOU ARE HERE (Quick context for AI)
├── README.md                    ← Navigation guide for humans
│
├── architecture/                ← System architecture
│   ├── ARCHITECTURE.md
│   ├── DDD_HEXAGONAL_BOUNDARY_REVIEW.md
│   └── SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md
│
├── ddd/                         ← DDD core (THE SOURCE OF TRUTH)
│   ├── DDD_REFACTORING_ROADMAP.md          ⭐ MASTER PLAN
│   ├── DDD_REFACTORING_COMPLETE_SUMMARY.md
│   ├── BUSINESS_RULES.md
│   └── DDD_MIGRATION_GUIDE.md
│
├── bounded-contexts/            ← Domain boundaries
│   ├── accounting/
│   ├── inventory/
│   ├── product/
│   └── frontend/
│
├── implementation/              ← Implementation tracking
│   ├── phases/                  ← Phase 1-6 summaries
│   └── strategies/              ← Implementation strategies
│
├── testing/                     ← Testing documentation
│   └── DDD_REFACTORING_TESTING_GUIDE.md
│
├── guides/                      ← How-to guides
│   └── DEVELOPMENT_SETUP_GUIDE.md
│
└── integration/                 ← Integration docs
    └── MICROSERVICES_INTEGRATION_ROADMAP.md
```

---

## When Working on a New Task

### Step 1: Read Relevant Documentation
- Check `docs/ddd/DDD_REFACTORING_ROADMAP.md` for context
- Review `docs/ddd/BUSINESS_RULES.md` for constraints
- Read bounded context docs for affected services

### Step 2: Understand Current State
- Check git status and recent commits
- Review existing schemas and migrations
- Run tests to ensure clean baseline

### Step 3: Plan Implementation
- Follow DDD Roadmap structure
- Create migration files
- Update schemas
- Implement domain logic → application logic → infrastructure
- Add tests

### Step 4: Validate
- Run unit tests
- Run integration tests
- Check business rules compliance
- Verify no DDD violations

### Step 5: Document
- Update relevant docs (if needed)
- Add inline comments for complex logic
- Update CHANGELOG (if exists)

---

## Final Reminders

1. **Always use TodoWrite** to track multi-step tasks
2. **Read documentation BEFORE coding** - avoid reinventing wheels
3. **Test incrementally** - don't batch tests at the end
4. **Follow hexagonal architecture** - keep domain pure
5. **Respect bounded contexts** - no cross-service data duplication
6. **Version everything** - optimistic locking for inventory
7. **Document business rules** - update BUSINESS_RULES.md when adding constraints
8. **Git hygiene** - meaningful commits, clear messages

---

**Version**: 1.0
**Maintained by**: Claude AI Assistant
**Last Sync**: 2025-12-13

For navigation help, see: [README.md](README.md)
