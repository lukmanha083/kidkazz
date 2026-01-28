# Accounting Service - Phase 11: Advanced Accounting Features Implementation

## Overview

This document describes the implementation of Advanced Accounting Features for the KidKazz ERP accounting service. Phase 11 introduces event-driven integration, multi-currency support (USD/IDR), advanced reporting (budgets, AR/AP aging), and audit trail with Indonesian tax compliance.

**Branch**: `feat/accounting-phase-11-advanced-features`
**Tests**: 596 passing
**Database**: Cloudflare D1 (Remote)
**Wrangler**: Updated to v4.61.0

---

## Features Implemented

| Sub-Phase | Feature | Description |
|-----------|---------|-------------|
| 11a | Event-Driven Integration | Outbox pattern, domain events, cross-service handlers |
| 11b | Multi-Currency Support | USD/IDR currencies with exchange rate management |
| 11c | Advanced Reporting | Budget management, Budget vs Actual, AR/AP Aging |
| 11d | Audit Trail & Compliance | Audit logs, Indonesian tax summary, data archival |

---

## Phase 11a: Event-Driven Integration

### Purpose
Enable reliable event publishing from accounting service and handle events from other services (Order, Inventory) for automatic journal entry creation.

### Database Schema

```sql
-- Domain Events (Outbox Pattern)
CREATE TABLE domain_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  payload TEXT NOT NULL,  -- JSON
  occurred_at TEXT NOT NULL,
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | published | failed
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL
);

-- Processed Events (Idempotency)
CREATE TABLE processed_events (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  result TEXT NOT NULL,  -- success | failed | skipped
  error_message TEXT,
  created_at TEXT NOT NULL
);
```

### Domain Events Published

| Event | Trigger | Payload |
|-------|---------|---------|
| `JournalEntryPosted` | Journal entry status -> Posted | entryId, entryNumber, totalAmount, lines |
| `JournalEntryVoided` | Journal entry voided | entryId, voidedBy, reason |
| `AccountBalanceUpdated` | Balance recalculation | accountId, accountCode, newBalance |
| `FiscalPeriodClosed` | Period close | periodId, year, month, closedBy |
| `FiscalPeriodReopened` | Period reopen | periodId, year, month, reopenedBy, reason |

### Event Handlers (Incoming)

| Source Service | Event | Handler Action |
|----------------|-------|----------------|
| order-service | `OrderCompleted` | Create revenue journal entry |
| order-service | `OrderCancelled` | Create reversal journal entry |
| inventory-service | `InventoryAdjusted` | Create inventory adjustment entry |
| inventory-service | `COGSCalculated` | Create COGS journal entry |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Accounting Service                        │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer                                                │
│  ├── DomainEvent (base class)                               │
│  ├── JournalEntryPosted, JournalEntryVoided                 │
│  ├── FiscalPeriodClosed, FiscalPeriodReopened               │
│  └── EventPublisher (outbox pattern)                        │
├─────────────────────────────────────────────────────────────┤
│  Application Layer                                           │
│  ├── OrderCompletedHandler                                  │
│  ├── OrderCancelledHandler                                  │
│  └── InventoryAdjustedHandler (+ COGS)                      │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                        │
│  ├── DrizzleDomainEventRepository                           │
│  ├── DrizzleProcessedEventRepository                        │
│  ├── CloudflareQueuePublisher                               │
│  └── QueueConsumer                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Cloudflare Queue      │
              │  (accounting-events)   │
              └────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/events` | List domain events |
| GET | `/api/v1/events/:id` | Get event by ID |
| GET | `/api/v1/events/pending` | Get pending events |
| POST | `/api/v1/events/:id/retry` | Retry failed event |

---

## Phase 11b: Multi-Currency Support

### Purpose
Support foreign currency transactions with USD and IDR (Indonesian Rupiah as base currency).

### Database Schema

```sql
-- Currencies
CREATE TABLE currencies (
  code TEXT PRIMARY KEY,  -- ISO 4217: USD, IDR
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_base_currency INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Exchange Rates
CREATE TABLE exchange_rates (
  id TEXT PRIMARY KEY,
  from_currency TEXT NOT NULL REFERENCES currencies(code),
  to_currency TEXT NOT NULL REFERENCES currencies(code),
  rate REAL NOT NULL,
  effective_date TEXT NOT NULL,
  source TEXT,  -- manual | api | bank
  created_by TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(from_currency, to_currency, effective_date)
);

-- Currency Revaluations (month-end)
CREATE TABLE currency_revaluations (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  revaluation_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_unrealized_gain REAL NOT NULL DEFAULT 0,
  total_unrealized_loss REAL NOT NULL DEFAULT 0,
  net_gain_loss REAL NOT NULL DEFAULT 0,
  journal_entry_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### Seed Data

```sql
-- Base currency (IDR)
INSERT INTO currencies VALUES ('IDR', 'Indonesian Rupiah', 'Rp', 0, 1, 1, ...);

-- Foreign currency (USD)
INSERT INTO currencies VALUES ('USD', 'US Dollar', '$', 2, 1, 0, ...);
```

### Domain Services

**ExchangeRateService**:
- `getRate(date)` - Get USD/IDR exchange rate for date
- `convert(amount, from, to, date)` - Convert currency amount
- `getLatestRate()` - Get most recent rate
- `fetchAndSaveLatestRate()` - **NEW** Fetch live rate from external APIs
- `getRateWithAutoFetch(date, maxAgeHours)` - Get rate with auto-fetch if stale

**Live Exchange Rate Providers** (automatic fallback):
1. **ExchangeRate-API** (https://open.er-api.com) - Primary, daily updates
2. **GitHub Exchange API** (fawazahmed0/exchange-api) - Backup, no rate limits
3. **Frankfurter API** (ECB rates) - Fallback, central bank source

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/currencies` | List currencies |
| GET | `/api/v1/currencies/:code` | Get currency by code |
| GET | `/api/v1/currencies/exchange-rates` | List exchange rate history |
| GET | `/api/v1/currencies/exchange-rates/latest` | Get latest rate |
| POST | `/api/v1/currencies/exchange-rates` | Set exchange rate manually |
| POST | `/api/v1/currencies/exchange-rates/fetch` | **NEW** Fetch live rate from APIs |
| POST | `/api/v1/currencies/exchange-rates/convert` | Convert amount |

### Example Usage

```bash
# Get currencies
curl https://accounting-service.../api/v1/currencies

# Response
{
  "success": true,
  "data": [
    { "code": "IDR", "name": "Indonesian Rupiah", "symbol": "Rp", "isBaseCurrency": true },
    { "code": "USD", "name": "US Dollar", "symbol": "$", "isBaseCurrency": false }
  ]
}

# Fetch live exchange rate from external APIs
curl -X POST https://accounting-service.../api/v1/currencies/exchange-rates/fetch

# Response
{
  "success": true,
  "data": {
    "id": "er-abc123",
    "fromCurrency": "USD",
    "toCurrency": "IDR",
    "rate": 16245.50,
    "effectiveDate": "2026-01-28",
    "source": "api"
  },
  "message": "Exchange rate fetched from exchangerate-api"
}

# Set exchange rate manually
curl -X POST https://accounting-service.../api/v1/currencies/exchange-rates \
  -H "Content-Type: application/json" \
  -d '{"rate": 16300, "effectiveDate": "2026-01-28", "source": "manual"}'
```

---

## Phase 11c: Advanced Reporting

### Purpose
Implement budget management with variance analysis and AR/AP aging reports.

### Database Schema

```sql
-- Budgets
CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | approved | locked
  approved_by TEXT,
  approved_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(fiscal_year, name)
);

-- Budget Lines
CREATE TABLE budget_lines (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
  fiscal_month INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(budget_id, account_id, fiscal_month)
);

-- Budget Revisions (audit trail)
CREATE TABLE budget_revisions (
  id TEXT PRIMARY KEY,
  budget_line_id TEXT NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  previous_amount REAL NOT NULL,
  new_amount REAL NOT NULL,
  reason TEXT NOT NULL,
  revised_by TEXT NOT NULL,
  revised_at TEXT NOT NULL
);
```

### Budget Entity

```typescript
interface Budget {
  id: string;
  name: string;
  fiscalYear: number;
  status: 'draft' | 'approved' | 'locked';
  lines: BudgetLine[];
  revisions: BudgetRevision[];

  // Methods
  addLine(accountId, month, amount): void;
  updateLine(lineId, amount, reason, userId): void;
  approve(userId): void;
  getAmountForAccount(accountId, month?): number;
}
```

### Budget vs Actual Report

```typescript
interface BudgetVsActualReport {
  budgetId: string;
  budgetName: string;
  fiscalYear: number;
  fiscalMonth?: number;
  sections: {
    accountId: string;
    accountCode: string;
    accountName: string;
    budgetAmount: number;
    actualAmount: number;
    variance: number;           // budget - actual
    variancePercent: number;    // (variance / budget) * 100
    isFavorable: boolean;       // variance >= 0
  }[];
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;
}
```

### AR/AP Aging Reports

```typescript
interface AgingBucket {
  current: number;      // 0-30 days
  days31_60: number;
  days61_90: number;
  over90: number;
  total: number;
}

interface ARAgingReport {
  asOfDate: string;
  summary: AgingBucket;
  totalReceivables: number;
}

interface APAgingReport {
  asOfDate: string;
  summary: AgingBucket;
  totalPayables: number;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/budgets` | List budgets |
| POST | `/api/v1/budgets` | Create budget |
| GET | `/api/v1/budgets/:id` | Get budget |
| PUT | `/api/v1/budgets/:id/lines` | Update budget lines |
| POST | `/api/v1/budgets/:id/approve` | Approve budget |
| DELETE | `/api/v1/budgets/:id` | Delete draft budget |
| GET | `/api/v1/reports/budget-vs-actual` | Budget variance report |
| GET | `/api/v1/reports/ar-aging` | AR aging report |
| GET | `/api/v1/reports/ap-aging` | AP aging report |

---

## Phase 11d: Audit Trail & Compliance

### Purpose
Implement comprehensive audit logging, Indonesian tax compliance, and data archival.

### Database Schema

```sql
-- Audit Logs
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL,  -- CREATE | UPDATE | DELETE | VOID | APPROVE | POST | CLOSE | REOPEN
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values TEXT,  -- JSON
  new_values TEXT,  -- JSON
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,    -- JSON
  created_at TEXT NOT NULL
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Tax Summary (Indonesian compliance)
CREATE TABLE tax_summary (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  tax_type TEXT NOT NULL,  -- PPN | PPH21 | PPH23 | PPH4_2
  gross_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(fiscal_year, fiscal_month, tax_type)
);

-- Archived Data
CREATE TABLE archived_data (
  id TEXT PRIMARY KEY,
  archive_type TEXT NOT NULL,  -- journal_entries | audit_logs
  fiscal_year INTEGER NOT NULL,
  record_count INTEGER NOT NULL,
  archive_path TEXT,
  archived_at TEXT NOT NULL,
  archived_by TEXT NOT NULL,
  checksum TEXT NOT NULL,  -- SHA-256
  created_at TEXT NOT NULL
);
```

### Indonesian Tax Types

| Tax Type | Description | Rate |
|----------|-------------|------|
| PPN | Pajak Pertambahan Nilai (VAT) | 11% |
| PPH21 | Employee Income Tax | Variable |
| PPH23 | Service Withholding Tax | 2% |
| PPH4_2 | Final Tax (Rent, etc.) | 10% |

### Retention Policy

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Journal Entries | 10 years | Indonesian tax compliance |
| Audit Logs | 5 years | Standard audit retention |

### AuditService

```typescript
class AuditService {
  // Log methods for different actions
  logCreate(userId, entityType, entityId, newValues, context?): Promise<AuditLog>;
  logUpdate(userId, entityType, entityId, oldValues, newValues, context?): Promise<AuditLog>;
  logDelete(userId, entityType, entityId, oldValues, context?): Promise<AuditLog>;
  logVoid(userId, entityType, entityId, oldValues, reason, context?): Promise<AuditLog>;
  logApprove(userId, entityType, entityId, oldValues, newValues, context?): Promise<AuditLog>;
  logPost(userId, entityType, entityId, oldValues, newValues, context?): Promise<AuditLog>;
  logClose(userId, entityType, entityId, oldValues, newValues, context?): Promise<AuditLog>;
  logReopen(userId, entityType, entityId, oldValues, newValues, context?): Promise<AuditLog>;

  // Query methods
  getEntityHistory(entityType, entityId): Promise<AuditLog[]>;
  getLogsByUser(userId, limit?): Promise<AuditLog[]>;
  getRecentLogs(limit): Promise<AuditLog[]>;
}
```

### DataArchivalService

```typescript
class DataArchivalService {
  // Default retention policy
  retentionPolicy = {
    journal_entries: 10,  // years
    audit_logs: 5         // years
  };

  // Archive methods
  archiveJournalEntries(fiscalYear, archivedBy): Promise<ArchiveResult>;
  archiveAuditLogs(fiscalYear, archivedBy): Promise<ArchiveResult>;

  // Status
  getArchiveStatus(): Promise<{ archives, eligible }>;
  verifyArchiveIntegrity(archiveId, data): Promise<boolean>;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/audit/audit-logs` | Query audit logs |
| GET | `/api/v1/audit/audit-logs/entity/:type/:id` | Get entity history |
| GET | `/api/v1/audit/audit-logs/recent` | Get recent logs |
| POST | `/api/v1/audit/tax-summary/calculate` | Calculate tax summary |
| GET | `/api/v1/audit/tax-summary` | Get tax report |
| GET | `/api/v1/audit/archive/status` | Get archive status |
| POST | `/api/v1/audit/archive/execute` | Execute archival |

### Example Usage

```bash
# Get recent audit logs
curl "https://accounting-service.../api/v1/audit/audit-logs/recent?limit=10"

# Get entity audit history
curl "https://accounting-service.../api/v1/audit/audit-logs/entity/JournalEntry/je-123"

# Get tax summary
curl "https://accounting-service.../api/v1/audit/tax-summary?fiscalYear=2026&fiscalMonth=1"

# Get archive status
curl "https://accounting-service.../api/v1/audit/archive/status"

# Response
{
  "success": true,
  "data": {
    "archives": [],
    "eligible": {
      "journalEntries": [2006, 2007, ..., 2016],
      "auditLogs": [2006, 2007, ..., 2021]
    }
  }
}
```

---

## File Structure

```
services/accounting-service/
├── migrations/
│   ├── 0005_event_driven_integration.sql
│   ├── 0006_multi_currency_support.sql
│   ├── 0007_advanced_reporting.sql
│   └── 0008_audit_trail.sql
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── audit-log.entity.ts
│   │   │   ├── archived-data.entity.ts
│   │   │   ├── budget.entity.ts
│   │   │   ├── currency.entity.ts
│   │   │   ├── exchange-rate.entity.ts
│   │   │   └── tax-summary.entity.ts
│   │   ├── events/
│   │   │   ├── domain-event.ts
│   │   │   ├── journal-entry-events.ts
│   │   │   └── fiscal-period-events.ts
│   │   ├── repositories/
│   │   │   ├── audit.repository.ts
│   │   │   ├── budget.repository.ts
│   │   │   ├── currency.repository.ts
│   │   │   └── domain-event.repository.ts
│   │   └── services/
│   │       ├── AuditService.ts
│   │       ├── DataArchivalService.ts
│   │       ├── EventPublisher.ts
│   │       ├── ExchangeRateService.ts
│   │       └── TaxSummaryService.ts
│   ├── application/
│   │   ├── commands/
│   │   │   └── budget.commands.ts
│   │   ├── queries/
│   │   │   └── budget-reports.queries.ts
│   │   ├── event-handlers/
│   │   │   ├── order-completed.handler.ts
│   │   │   ├── order-cancelled.handler.ts
│   │   │   └── inventory-adjusted.handler.ts
│   │   └── dtos/
│   │       ├── audit.dto.ts
│   │       ├── budget.dto.ts
│   │       ├── currency.dto.ts
│   │       └── event.dto.ts
│   └── infrastructure/
│       ├── db/schema.ts (updated)
│       ├── http/routes/
│       │   ├── audit.routes.ts
│       │   ├── budget.routes.ts
│       │   ├── currency.routes.ts
│       │   └── event.routes.ts
│       ├── messaging/
│       │   ├── queue-publisher.ts
│       │   └── queue-consumer.ts
│       └── repositories/
│           ├── audit.repository.ts
│           ├── budget.repository.ts
│           ├── currency.repository.ts
│           └── domain-event.repository.ts
└── test/
    └── unit/
        ├── domain/events/
        ├── domain/services/
        └── application/event-handlers/
```

---

## Testing

### Run Tests

```bash
cd services/accounting-service
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm type-check        # TypeScript validation
```

### Test Coverage

| Category | Tests |
|----------|-------|
| Domain Events | 6 |
| Event Publisher | 6 |
| Event Handlers | 4 |
| Budget Entity | (included in existing) |
| Total | 596 passing |

---

## Deployment

### Apply Migrations

```bash
# Apply to remote D1
npx wrangler d1 migrations apply accounting-db --remote
```

### Deploy

```bash
npx wrangler deploy
```

### Verify

```bash
# Health check
curl https://accounting-service.tesla-hakim.workers.dev/health

# Check currencies
curl https://accounting-service.tesla-hakim.workers.dev/api/v1/currencies

# Check audit logs
curl "https://accounting-service.tesla-hakim.workers.dev/api/v1/audit/audit-logs/recent?limit=5"
```

---

## Cloudflare Queue Configuration

The accounting service uses Cloudflare Queues for event publishing:

```toml
# wrangler.toml
[[queues.producers]]
binding = "ACCOUNTING_EVENTS_QUEUE"
queue = "accounting-events"
```

Events are published to the queue and can be consumed by other services for cross-service integration.

---

## Summary

Phase 11 adds four major feature sets:

1. **Event-Driven Integration** - Reliable event publishing with outbox pattern, handlers for Order/Inventory events
2. **Multi-Currency Support** - USD/IDR with exchange rate management
3. **Advanced Reporting** - Budget management with variance analysis, AR/AP aging
4. **Audit Trail & Compliance** - Comprehensive audit logs, Indonesian tax compliance, data archival

**Total Files**: 54 changed
**Lines of Code**: +7,963 / -577
**Tests**: 596 passing

---

**Last Updated**: 2026-01-28
