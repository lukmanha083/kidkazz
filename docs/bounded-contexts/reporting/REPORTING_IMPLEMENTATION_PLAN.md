# Reporting Service Implementation Plan

## Overview

This document provides a phased implementation roadmap for the Reporting Service. The service handles data archival, aggregation, and report generation as the OLAP (analytical) complement to the transactional OLTP services.

**Prerequisites**:
- Accounting Service with Asset Accounting Module completed
- Inventory Service completed
- Sales Service completed
- Payment Service completed
- Cloudflare Queues configured for event delivery

---

## ⚠️ TDD Approach (MANDATORY)

**This project uses Test-Driven Development (TDD).** All implementation MUST follow the Red-Green-Refactor cycle:

### TDD Workflow for Each Phase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TDD IMPLEMENTATION ORDER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Write Unit Tests (test/unit/)           ← Write FIRST, should FAIL    │
│      ↓                                                                      │
│   2. Implement Domain/Application Code       ← Minimal code to pass tests  │
│      ↓                                                                      │
│   3. Write Integration Tests (test/integration/)                            │
│      ↓                                                                      │
│   4. Implement Infrastructure Code           ← Repositories, handlers      │
│      ↓                                                                      │
│   5. Write E2E Tests (test/e2e/)                                           │
│      ↓                                                                      │
│   6. Implement Routes/Controllers            ← Wire everything together    │
│      ↓                                                                      │
│   7. Refactor (keep all tests green)                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Coverage Requirements

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Domain (entities, value objects, services) | >90% | Required |
| Application (commands, queries, handlers) | >80% | Required |
| Infrastructure (repositories, controllers) | >70% | Required |

### Example TDD for Reporting Service

```typescript
// Step 1: Write test FIRST (Red)
// test/unit/domain/fiscal-period.test.ts
describe('FiscalPeriod', () => {
  it('should calculate quarter correctly for month 1-3', () => {
    const period = new FiscalPeriod(2025, 2);
    expect(period.quarter).toBe(1);
  });

  it('should return previous period correctly', () => {
    const period = new FiscalPeriod(2025, 1);
    const previous = period.previous();
    expect(previous.year).toBe(2024);
    expect(previous.month).toBe(12);
  });

  it('should throw error for invalid month', () => {
    expect(() => new FiscalPeriod(2025, 13)).toThrow('Invalid fiscal month');
  });
});

// Step 2: Run test - FAILS (class doesn't exist)
// Step 3: Implement FiscalPeriod class
// Step 4: Run test - PASSES
// Step 5: Repeat for next test case
```

---

## Implementation Phases

| Phase | Description | Priority | Dependencies |
|-------|-------------|----------|--------------|
| 1 | Service Setup & Database Schema | Critical | None |
| 2 | Event Consumption Infrastructure | Critical | Phase 1 |
| 3 | Data Archival Handlers | Critical | Phase 2 |
| 4 | Aggregation Engine | High | Phase 3 |
| 5 | Financial Reports | High | Phase 4 |
| 6 | Asset Reports | High | Phase 4 |
| 7 | Inventory Reports | Medium | Phase 4 |
| 8 | Sales Reports | Medium | Phase 4 |
| 9 | Dashboard API | High | Phases 5-8 |
| 10 | Report Generation & Export | Medium | Phases 5-8 |
| 11 | Report Scheduling | Medium | Phase 10 |
| 12 | Data Purging & Monitoring | High | Phase 3 |

---

## Phase 1: Service Setup & Database Schema

### Objective
Set up the Reporting Service infrastructure including Cloudflare Workers configuration, D1 database, R2 storage, and KV cache.

### Deliverables

#### 1.1 Cloudflare Workers Configuration

**File**: `services/reporting-service/wrangler.toml`

```toml
name = "reporting-service"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 Database for reporting data
[[d1_databases]]
binding = "DB"
database_name = "kidkazz-reporting-db"
database_id = "your-reporting-db-id"

# R2 Bucket for generated reports
[[r2_buckets]]
binding = "REPORTS_BUCKET"
bucket_name = "kidkazz-reports"

# KV for caching
[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-kv-id"

# Queue consumer for events
[[queues.consumers]]
queue = "reporting-events"
max_batch_size = 100
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "reporting-events-dlq"

# Scheduled tasks
[triggers]
crons = [
  "0 19 * * *",     # Daily aggregation at 2 AM WIB (UTC+7)
  "0 20 1 * *",     # Monthly aggregation on 1st at 3 AM WIB
  "*/5 * * * *",    # Report scheduler check every 5 minutes
  "0 20 * * *"      # Database size monitoring at 3 AM WIB
]

[vars]
ENVIRONMENT = "production"
TIMEZONE = "Asia/Jakarta"
```

#### 1.2 Database Migrations

**File**: `services/reporting-service/migrations/0001_create_archive_tables.sql`

```sql
-- =====================================================
-- JOURNAL ENTRY ARCHIVE
-- =====================================================
CREATE TABLE journal_archive (
  id TEXT PRIMARY KEY,
  original_entry_id TEXT NOT NULL,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  entry_type TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount REAL NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,
  posted_by TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(original_entry_id, account_id)
);

CREATE INDEX idx_journal_archive_date ON journal_archive(entry_date);
CREATE INDEX idx_journal_archive_account ON journal_archive(account_id);
CREATE INDEX idx_journal_archive_type ON journal_archive(account_type);
CREATE INDEX idx_journal_archive_fiscal ON journal_archive(fiscal_year, fiscal_month);

-- =====================================================
-- ASSET ARCHIVE
-- =====================================================
CREATE TABLE asset_archive (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  asset_number TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  acquisition_cost REAL NOT NULL,
  salvage_value REAL NOT NULL,
  useful_life_months INTEGER NOT NULL,
  depreciation_method TEXT NOT NULL,
  period TEXT NOT NULL,
  period_depreciation REAL NOT NULL,
  accumulated_depreciation REAL NOT NULL,
  book_value REAL NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  asset_status TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(asset_id, period)
);

CREATE INDEX idx_asset_archive_period ON asset_archive(period);
CREATE INDEX idx_asset_archive_category ON asset_archive(category_id);
CREATE INDEX idx_asset_archive_status ON asset_archive(asset_status);

-- =====================================================
-- INVENTORY MOVEMENT ARCHIVE
-- =====================================================
CREATE TABLE inventory_archive (
  id TEXT PRIMARY KEY,
  original_movement_id TEXT NOT NULL UNIQUE,
  movement_date DATE NOT NULL,
  movement_type TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category_id TEXT,
  category_name TEXT,
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT NOT NULL,
  batch_id TEXT,
  batch_number TEXT,
  expiration_date DATE,
  quantity REAL NOT NULL,
  uom TEXT NOT NULL,
  previous_qty REAL NOT NULL,
  new_qty REAL NOT NULL,
  unit_cost REAL,
  total_cost REAL,
  reference_type TEXT,
  reference_id TEXT,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  created_by TEXT,
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_archive_date ON inventory_archive(movement_date);
CREATE INDEX idx_inventory_archive_product ON inventory_archive(product_id);
CREATE INDEX idx_inventory_archive_warehouse ON inventory_archive(warehouse_id);
CREATE INDEX idx_inventory_archive_type ON inventory_archive(movement_type);
CREATE INDEX idx_inventory_archive_fiscal ON inventory_archive(fiscal_year, fiscal_month);

-- =====================================================
-- SALES ARCHIVE
-- =====================================================
CREATE TABLE sales_archive (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_type TEXT,
  channel TEXT NOT NULL,
  store_id TEXT,
  store_name TEXT,
  product_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_category_id TEXT,
  product_category_name TEXT,
  quantity REAL NOT NULL,
  uom TEXT NOT NULL,
  unit_price REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL,
  unit_cost REAL,
  line_cost REAL,
  payment_method TEXT NOT NULL,
  payment_provider TEXT,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  hour_of_day INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id, product_id)
);

CREATE INDEX idx_sales_archive_date ON sales_archive(order_date);
CREATE INDEX idx_sales_archive_channel ON sales_archive(channel);
CREATE INDEX idx_sales_archive_customer ON sales_archive(customer_id);
CREATE INDEX idx_sales_archive_product ON sales_archive(product_id);
CREATE INDEX idx_sales_archive_fiscal ON sales_archive(fiscal_year, fiscal_month);

-- =====================================================
-- PAYMENT ARCHIVE
-- =====================================================
CREATE TABLE payment_archive (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE,
  payment_number TEXT NOT NULL,
  payment_date DATE NOT NULL,
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_channel TEXT NOT NULL,
  provider TEXT,
  amount REAL NOT NULL,
  fee_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL,
  settlement_status TEXT NOT NULL,
  settlement_date DATE,
  settlement_reference TEXT,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_archive_date ON payment_archive(payment_date);
CREATE INDEX idx_payment_archive_method ON payment_archive(payment_method);
CREATE INDEX idx_payment_archive_status ON payment_archive(settlement_status);
CREATE INDEX idx_payment_archive_fiscal ON payment_archive(fiscal_year, fiscal_month);
```

**File**: `services/reporting-service/migrations/0002_create_aggregate_tables.sql`

```sql
-- =====================================================
-- DAILY FINANCIAL AGGREGATE
-- =====================================================
CREATE TABLE daily_financial_aggregate (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_revenue REAL NOT NULL DEFAULT 0,
  sales_revenue REAL NOT NULL DEFAULT 0,
  other_revenue REAL NOT NULL DEFAULT 0,
  total_cogs REAL NOT NULL DEFAULT 0,
  total_expenses REAL NOT NULL DEFAULT 0,
  operating_expenses REAL NOT NULL DEFAULT 0,
  depreciation_expense REAL NOT NULL DEFAULT 0,
  other_expenses REAL NOT NULL DEFAULT 0,
  gross_profit REAL NOT NULL DEFAULT 0,
  operating_income REAL NOT NULL DEFAULT 0,
  net_income REAL NOT NULL DEFAULT 0,
  journal_entry_count INTEGER NOT NULL DEFAULT 0,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  aggregated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_daily_financial_fiscal ON daily_financial_aggregate(fiscal_year, fiscal_month);

-- =====================================================
-- DAILY SALES AGGREGATE
-- =====================================================
CREATE TABLE daily_sales_aggregate (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  channel TEXT NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  gross_sales REAL NOT NULL DEFAULT 0,
  discount_total REAL NOT NULL DEFAULT 0,
  tax_total REAL NOT NULL DEFAULT 0,
  net_sales REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  gross_margin REAL NOT NULL DEFAULT 0,
  margin_percentage REAL NOT NULL DEFAULT 0,
  average_order_value REAL NOT NULL DEFAULT 0,
  average_items_per_order REAL NOT NULL DEFAULT 0,
  unique_customers INTEGER NOT NULL DEFAULT 0,
  new_customers INTEGER NOT NULL DEFAULT 0,
  repeat_customers INTEGER NOT NULL DEFAULT 0,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  aggregated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, channel)
);

CREATE INDEX idx_daily_sales_fiscal ON daily_sales_aggregate(fiscal_year, fiscal_month);
CREATE INDEX idx_daily_sales_channel ON daily_sales_aggregate(channel);

-- =====================================================
-- MONTHLY ASSET AGGREGATE
-- =====================================================
CREATE TABLE monthly_asset_aggregate (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  total_assets INTEGER NOT NULL DEFAULT 0,
  active_assets INTEGER NOT NULL DEFAULT 0,
  fully_depreciated_assets INTEGER NOT NULL DEFAULT 0,
  disposed_assets INTEGER NOT NULL DEFAULT 0,
  total_acquisition_cost REAL NOT NULL DEFAULT 0,
  total_accumulated_depreciation REAL NOT NULL DEFAULT 0,
  total_book_value REAL NOT NULL DEFAULT 0,
  period_depreciation REAL NOT NULL DEFAULT 0,
  disposal_count INTEGER NOT NULL DEFAULT 0,
  disposal_proceeds REAL NOT NULL DEFAULT 0,
  disposal_gain_loss REAL NOT NULL DEFAULT 0,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  aggregated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(period, category_id)
);

CREATE INDEX idx_monthly_asset_period ON monthly_asset_aggregate(period);
CREATE INDEX idx_monthly_asset_category ON monthly_asset_aggregate(category_id);

-- =====================================================
-- DAILY INVENTORY SNAPSHOT
-- =====================================================
CREATE TABLE daily_inventory_snapshot (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  warehouse_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity_available REAL NOT NULL DEFAULT 0,
  quantity_reserved REAL NOT NULL DEFAULT 0,
  quantity_in_transit REAL NOT NULL DEFAULT 0,
  total_quantity REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  total_value REAL NOT NULL DEFAULT 0,
  quantity_in REAL NOT NULL DEFAULT 0,
  quantity_out REAL NOT NULL DEFAULT 0,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  snapshot_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, warehouse_id, product_id)
);

CREATE INDEX idx_inventory_snapshot_date ON daily_inventory_snapshot(date);
CREATE INDEX idx_inventory_snapshot_warehouse ON daily_inventory_snapshot(warehouse_id);
CREATE INDEX idx_inventory_snapshot_product ON daily_inventory_snapshot(product_id);
```

**File**: `services/reporting-service/migrations/0003_create_report_tables.sql`

```sql
-- =====================================================
-- REPORT DEFINITIONS
-- =====================================================
CREATE TABLE report_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  data_source TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  measures TEXT NOT NULL,
  default_filters TEXT,
  available_filters TEXT,
  output_formats TEXT NOT NULL,
  default_format TEXT NOT NULL,
  required_permissions TEXT NOT NULL,
  can_schedule INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- REPORT INSTANCES
-- =====================================================
CREATE TABLE report_instances (
  id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL REFERENCES report_definitions(id),
  parameters TEXT NOT NULL,
  filters TEXT,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  format TEXT NOT NULL,
  output_url TEXT,
  file_size INTEGER,
  execution_time_ms INTEGER,
  row_count INTEGER,
  error_message TEXT,
  generated_by TEXT NOT NULL,
  generated_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_instances_status ON report_instances(status);
CREATE INDEX idx_report_instances_definition ON report_instances(definition_id);
CREATE INDEX idx_report_instances_expires ON report_instances(expires_at);

-- =====================================================
-- SCHEDULED REPORTS
-- =====================================================
CREATE TABLE scheduled_reports (
  id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL REFERENCES report_definitions(id),
  name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  parameters TEXT NOT NULL,
  date_range_type TEXT NOT NULL,
  format TEXT NOT NULL,
  delivery_method TEXT NOT NULL,
  recipients TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  last_run_status TEXT,
  next_run_at TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at);

-- =====================================================
-- YEAR-END SUMMARIES (For purged data reference)
-- =====================================================
CREATE TABLE year_end_summaries (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL UNIQUE,
  total_revenue REAL NOT NULL,
  total_cogs REAL NOT NULL,
  total_expenses REAL NOT NULL,
  net_income REAL NOT NULL,
  total_assets_cost REAL NOT NULL,
  total_depreciation REAL NOT NULL,
  total_asset_book_value REAL NOT NULL,
  inventory_closing_value REAL NOT NULL,
  total_sales_count INTEGER NOT NULL,
  total_sales_amount REAL NOT NULL,
  summary_data TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PURGE AUDIT LOG
-- =====================================================
CREATE TABLE purge_audit_log (
  id TEXT PRIMARY KEY,
  purge_date TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  records_deleted INTEGER NOT NULL,
  initiated_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  year_end_summary_id TEXT REFERENCES year_end_summaries(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purge_audit_year ON purge_audit_log(fiscal_year);

-- =====================================================
-- DATABASE SIZE LOG
-- =====================================================
CREATE TABLE database_size_log (
  id TEXT PRIMARY KEY,
  log_date DATE NOT NULL,
  size_bytes INTEGER NOT NULL,
  size_gb REAL NOT NULL,
  percent_used REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_database_size_date ON database_size_log(log_date);
```

**File**: `services/reporting-service/migrations/0004_seed_report_definitions.sql`

```sql
-- Seed default report definitions

-- Financial Reports
INSERT INTO report_definitions (id, code, name, description, category, data_source, dimensions, measures, output_formats, default_format, required_permissions) VALUES
('rpt-fin-001', 'RPT-FIN-001', 'Income Statement', 'Profit and Loss Statement', 'FINANCIAL', 'JOURNAL_ARCHIVE', '["fiscal_year", "fiscal_month", "account_type"]', '["revenue", "expenses", "net_income"]', '["PDF", "EXCEL", "CSV"]', 'PDF', '["report:financial:read"]'),
('rpt-fin-002', 'RPT-FIN-002', 'Balance Sheet', 'Statement of Financial Position', 'FINANCIAL', 'JOURNAL_ARCHIVE', '["fiscal_year", "fiscal_month", "account_type"]', '["assets", "liabilities", "equity"]', '["PDF", "EXCEL", "CSV"]', 'PDF', '["report:financial:read"]'),
('rpt-fin-003', 'RPT-FIN-003', 'Trial Balance', 'Account Balances Summary', 'FINANCIAL', 'JOURNAL_ARCHIVE', '["account_code", "account_name"]', '["debit", "credit", "balance"]', '["PDF", "EXCEL", "CSV"]', 'EXCEL', '["report:financial:read"]'),
('rpt-fin-004', 'RPT-FIN-004', 'General Ledger', 'Transaction Detail by Account', 'FINANCIAL', 'JOURNAL_ARCHIVE', '["entry_date", "entry_number", "description"]', '["debit", "credit", "running_balance"]', '["PDF", "EXCEL", "CSV"]', 'EXCEL', '["report:financial:read"]');

-- Asset Reports
INSERT INTO report_definitions (id, code, name, description, category, data_source, dimensions, measures, output_formats, default_format, required_permissions) VALUES
('rpt-ast-001', 'RPT-AST-001', 'Asset Register', 'Complete Fixed Asset Listing', 'ASSET', 'ASSET_ARCHIVE', '["category", "status", "location"]', '["acquisition_cost", "accumulated_depreciation", "book_value"]', '["PDF", "EXCEL", "CSV"]', 'EXCEL', '["report:asset:read"]'),
('rpt-ast-002', 'RPT-AST-002', 'Depreciation Report', 'Monthly Depreciation Summary', 'ASSET', 'ASSET_ARCHIVE', '["period", "category"]', '["period_depreciation", "accumulated_depreciation", "book_value"]', '["PDF", "EXCEL", "CSV"]', 'PDF', '["report:asset:read"]'),
('rpt-ast-003', 'RPT-AST-003', 'Asset Disposal Report', 'Disposed Assets with Gain/Loss', 'ASSET', 'ASSET_ARCHIVE', '["disposal_date", "category"]', '["book_value", "disposal_proceeds", "gain_loss"]', '["PDF", "EXCEL", "CSV"]', 'PDF', '["report:asset:read"]');

-- Inventory Reports
INSERT INTO report_definitions (id, code, name, description, category, data_source, dimensions, measures, output_formats, default_format, required_permissions) VALUES
('rpt-inv-001', 'RPT-INV-001', 'Stock Valuation', 'Inventory Value by Warehouse', 'INVENTORY', 'AGGREGATE_DAILY', '["warehouse", "product_category"]', '["quantity", "unit_cost", "total_value"]', '["PDF", "EXCEL", "CSV"]', 'EXCEL', '["report:inventory:read"]'),
('rpt-inv-002', 'RPT-INV-002', 'Stock Movement', 'Inventory Transaction History', 'INVENTORY', 'INVENTORY_ARCHIVE', '["movement_date", "movement_type", "warehouse"]', '["quantity_in", "quantity_out", "balance"]', '["PDF", "EXCEL", "CSV"]', 'EXCEL', '["report:inventory:read"]'),
('rpt-inv-003', 'RPT-INV-003', 'Expiring Stock', 'Items Nearing Expiration', 'INVENTORY', 'INVENTORY_ARCHIVE', '["expiration_date", "warehouse", "product"]', '["quantity", "days_to_expiry"]', '["PDF", "EXCEL", "CSV"]', 'PDF', '["report:inventory:read"]');

-- Sales Reports
INSERT INTO report_definitions (id, code, name, description, category, data_source, dimensions, measures, output_formats, default_format, required_permissions) VALUES
('rpt-sal-001', 'RPT-SAL-001', 'Sales Summary', 'Revenue by Channel/Period', 'SALES', 'AGGREGATE_DAILY', '["date", "channel"]', '["order_count", "gross_sales", "net_sales", "margin"]', '["PDF", "EXCEL", "CSV"]', 'PDF', '["report:sales:read"]'),
('rpt-sal-002', 'RPT-SAL-002', 'Product Performance', 'Sales by Product/Category', 'SALES', 'SALES_ARCHIVE', '["product", "category"]', '["quantity_sold", "revenue", "margin"]', '["PDF", "EXCEL", "CSV"]', 'EXCEL', '["report:sales:read"]'),
('rpt-sal-003', 'RPT-SAL-003', 'Customer Analysis', 'Sales by Customer Segment', 'SALES', 'SALES_ARCHIVE', '["customer_type", "customer"]', '["order_count", "total_spent", "average_order"]', '["PDF", "EXCEL", "CSV"]', 'EXCEL', '["report:sales:read"]');
```

#### 1.3 Domain Model

**File**: `services/reporting-service/src/domain/value-objects/fiscal-period.vo.ts`

```typescript
export class FiscalPeriod {
  constructor(
    public readonly year: number,
    public readonly month: number
  ) {
    if (month < 1 || month > 12) {
      throw new Error('Invalid fiscal month');
    }
  }

  get quarter(): number {
    return Math.ceil(this.month / 3);
  }

  get dayOfWeek(): number {
    return new Date(this.year, this.month - 1, 1).getDay();
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  static fromString(value: string): FiscalPeriod {
    const [year, month] = value.split('-').map(Number);
    return new FiscalPeriod(year, month);
  }

  static fromDate(date: Date): FiscalPeriod {
    return new FiscalPeriod(date.getFullYear(), date.getMonth() + 1);
  }

  previous(): FiscalPeriod {
    if (this.month === 1) {
      return new FiscalPeriod(this.year - 1, 12);
    }
    return new FiscalPeriod(this.year, this.month - 1);
  }

  next(): FiscalPeriod {
    if (this.month === 12) {
      return new FiscalPeriod(this.year + 1, 1);
    }
    return new FiscalPeriod(this.year, this.month + 1);
  }

  startDate(): Date {
    return new Date(this.year, this.month - 1, 1);
  }

  endDate(): Date {
    return new Date(this.year, this.month, 0);
  }

  equals(other: FiscalPeriod): boolean {
    return this.year === other.year && this.month === other.month;
  }
}
```

### Acceptance Criteria
- [ ] Cloudflare Workers project initialized
- [ ] D1 database created and configured
- [ ] R2 bucket created for report storage
- [ ] KV namespace created for caching
- [ ] All migration scripts executed successfully
- [ ] Report definitions seeded
- [ ] Basic health check endpoint working

---

## Phase 2: Event Consumption Infrastructure

### Objective
Set up Cloudflare Queue consumers to receive domain events from upstream services.

### Deliverables

#### 2.1 Queue Consumer Setup

**File**: `services/reporting-service/src/infrastructure/events/queue-consumer.ts`

```typescript
import { ReportingEventHandler } from './handlers';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  REPORTS_BUCKET: R2Bucket;
}

export default {
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    const handler = new ReportingEventHandler(env);

    for (const message of batch.messages) {
      try {
        await handler.handle(message.body);
        message.ack();
      } catch (error) {
        console.error('Failed to process event:', error);
        message.retry();
      }
    }
  },
};
```

#### 2.2 Event Handler Router

**File**: `services/reporting-service/src/infrastructure/events/handlers/index.ts`

```typescript
import { Env } from '../queue-consumer';
import { JournalEntryPostedHandler } from './journal-entry-posted.handler';
import { DepreciationPostedHandler } from './depreciation-posted.handler';
import { StockMovementCreatedHandler } from './stock-movement-created.handler';
import { OrderCompletedHandler } from './order-completed.handler';
import { PaymentReceivedHandler } from './payment-received.handler';

export class ReportingEventHandler {
  private handlers: Map<string, (event: any) => Promise<void>>;

  constructor(private env: Env) {
    this.handlers = new Map([
      ['JournalEntryPosted', (e) => new JournalEntryPostedHandler(env).handle(e)],
      ['DepreciationPosted', (e) => new DepreciationPostedHandler(env).handle(e)],
      ['AssetDisposed', (e) => new DepreciationPostedHandler(env).handleDisposal(e)],
      ['StockMovementCreated', (e) => new StockMovementCreatedHandler(env).handle(e)],
      ['OrderCompleted', (e) => new OrderCompletedHandler(env).handle(e)],
      ['PaymentReceived', (e) => new PaymentReceivedHandler(env).handle(e)],
    ]);
  }

  async handle(event: { type: string; data: any }): Promise<void> {
    const handler = this.handlers.get(event.type);
    if (!handler) {
      console.warn(`Unknown event type: ${event.type}`);
      return;
    }
    await handler(event);
  }
}
```

### Acceptance Criteria
- [ ] Queue consumer successfully receives events
- [ ] Event routing works for all event types
- [ ] Failed events are retried
- [ ] Dead letter queue receives permanently failed events
- [ ] Event processing is idempotent

---

## Phase 3: Data Archival Handlers

### Objective
Implement handlers that archive incoming events to the reporting database.

### Deliverables

#### 3.1 Journal Entry Archival

**File**: `services/reporting-service/src/infrastructure/events/handlers/journal-entry-posted.handler.ts`

```typescript
import { Env } from '../queue-consumer';
import { FiscalPeriod } from '../../../domain/value-objects/fiscal-period.vo';

interface JournalEntryPostedEvent {
  type: 'JournalEntryPosted';
  timestamp: string;
  data: {
    entryId: string;
    entryNumber: string;
    entryDate: string;
    description: string;
    entryType: string;
    reference?: string;
    lines: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: string;
      direction: 'Debit' | 'Credit';
      amount: number;
    }>;
    postedBy: string;
    postedAt: string;
  };
}

export class JournalEntryPostedHandler {
  constructor(private env: Env) {}

  async handle(event: JournalEntryPostedEvent): Promise<void> {
    const { data } = event;
    const entryDate = new Date(data.entryDate);
    const fiscal = FiscalPeriod.fromDate(entryDate);

    // Archive each line as a separate record (denormalized)
    for (const line of data.lines) {
      const id = `${data.entryId}-${line.accountId}`;

      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO journal_archive (
          id, original_entry_id, entry_number, entry_date, description,
          reference, entry_type, account_id, account_code, account_name,
          account_type, direction, amount, fiscal_year, fiscal_month,
          fiscal_quarter, posted_by, posted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        data.entryId,
        data.entryNumber,
        data.entryDate,
        data.description,
        data.reference || null,
        data.entryType,
        line.accountId,
        line.accountCode,
        line.accountName,
        line.accountType,
        line.direction,
        line.amount,
        fiscal.year,
        fiscal.month,
        fiscal.quarter,
        data.postedBy,
        data.postedAt
      ).run();
    }

    // Invalidate related cache
    await this.env.CACHE.delete(`agg:financial:daily:${data.entryDate}`);
  }
}
```

### Acceptance Criteria
- [ ] Journal entries archived with all lines
- [ ] Asset depreciation records archived
- [ ] Inventory movements archived
- [ ] Sales transactions archived
- [ ] Payment records archived
- [ ] Duplicate events handled idempotently
- [ ] Related cache invalidated on archive

---

## Phase 4: Aggregation Engine

### Objective
Implement scheduled aggregation jobs that compute daily and monthly summaries.

### Deliverables

#### 4.1 Daily Aggregation Cron

**File**: `services/reporting-service/src/infrastructure/scheduled/daily-aggregation.cron.ts`

```typescript
import { Env } from '../events/queue-consumer';

export async function runDailyAggregation(env: Env): Promise<void> {
  // Calculate for yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  // Aggregate financial data
  await aggregateDailyFinancial(env, dateStr);

  // Aggregate sales data
  await aggregateDailySales(env, dateStr);

  // Snapshot inventory
  await snapshotDailyInventory(env, dateStr);

  console.log(`Daily aggregation completed for ${dateStr}`);
}

async function aggregateDailyFinancial(env: Env, date: string): Promise<void> {
  const result = await env.DB.prepare(`
    SELECT
      SUM(CASE WHEN account_type = 'Revenue' AND direction = 'Credit' THEN amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN account_type = 'COGS' AND direction = 'Debit' THEN amount ELSE 0 END) as total_cogs,
      SUM(CASE WHEN account_type = 'Expense' AND direction = 'Debit' THEN amount ELSE 0 END) as total_expenses,
      COUNT(DISTINCT original_entry_id) as entry_count
    FROM journal_archive
    WHERE entry_date = ?
  `).bind(date).first();

  if (result) {
    const revenue = (result.total_revenue as number) || 0;
    const cogs = (result.total_cogs as number) || 0;
    const expenses = (result.total_expenses as number) || 0;
    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - expenses;

    const dateObj = new Date(date);
    const fiscal = {
      year: dateObj.getFullYear(),
      month: dateObj.getMonth() + 1,
      quarter: Math.ceil((dateObj.getMonth() + 1) / 3),
      dayOfWeek: dateObj.getDay()
    };

    await env.DB.prepare(`
      INSERT OR REPLACE INTO daily_financial_aggregate (
        id, date, total_revenue, total_cogs, total_expenses,
        gross_profit, net_income, journal_entry_count,
        fiscal_year, fiscal_month, fiscal_quarter, day_of_week
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `fin-${date}`,
      date,
      revenue,
      cogs,
      expenses,
      grossProfit,
      netIncome,
      result.entry_count || 0,
      fiscal.year,
      fiscal.month,
      fiscal.quarter,
      fiscal.dayOfWeek
    ).run();
  }
}
```

### Acceptance Criteria
- [ ] Daily financial aggregates computed correctly
- [ ] Daily sales aggregates computed by channel
- [ ] Daily inventory snapshots created
- [ ] Monthly asset aggregates computed
- [ ] Aggregates versioned for recalculation tracking
- [ ] Cache warmed after aggregation

---

## Phase 5: Financial Reports

### Objective
Implement financial report generation (Income Statement, Balance Sheet, Trial Balance).

### Deliverables

#### 5.1 Income Statement Query

**File**: `services/reporting-service/src/application/queries/financial/get-income-statement.query.ts`

```typescript
import { Env } from '../../../infrastructure/events/queue-consumer';
import { FiscalPeriod } from '../../../domain/value-objects/fiscal-period.vo';

export interface IncomeStatementRequest {
  fiscalYear: number;
  fiscalMonth: number;
  compareWithPrevious?: boolean;
}

export interface IncomeStatementLine {
  accountCode: string;
  accountName: string;
  currentPeriod: number;
  previousPeriod?: number;
  variance?: number;
  variancePercentage?: number;
}

export interface IncomeStatement {
  period: string;
  revenue: IncomeStatementLine[];
  totalRevenue: number;
  cogs: IncomeStatementLine[];
  totalCogs: number;
  grossProfit: number;
  expenses: IncomeStatementLine[];
  totalExpenses: number;
  netIncome: number;
}

export class GetIncomeStatementQuery {
  constructor(private env: Env) {}

  async execute(request: IncomeStatementRequest): Promise<IncomeStatement> {
    const fiscal = new FiscalPeriod(request.fiscalYear, request.fiscalMonth);

    // Get current period data
    const currentData = await this.getPeriodData(fiscal);

    // Get previous period data if comparison requested
    let previousData;
    if (request.compareWithPrevious) {
      previousData = await this.getPeriodData(fiscal.previous());
    }

    return this.buildIncomeStatement(fiscal, currentData, previousData);
  }

  private async getPeriodData(fiscal: FiscalPeriod) {
    return await this.env.DB.prepare(`
      SELECT
        account_code,
        account_name,
        account_type,
        SUM(CASE WHEN direction = 'Credit' THEN amount ELSE -amount END) as net_amount
      FROM journal_archive
      WHERE fiscal_year = ? AND fiscal_month = ?
        AND account_type IN ('Revenue', 'COGS', 'Expense')
      GROUP BY account_code, account_name, account_type
      ORDER BY account_code
    `).bind(fiscal.year, fiscal.month).all();
  }

  private buildIncomeStatement(
    fiscal: FiscalPeriod,
    currentData: any,
    previousData?: any
  ): IncomeStatement {
    // Implementation details...
    // Group by account type, calculate totals, variances
  }
}
```

### Acceptance Criteria
- [ ] Income Statement generates correctly
- [ ] Balance Sheet generates correctly
- [ ] Trial Balance generates correctly
- [ ] General Ledger detail report works
- [ ] Comparative reporting works
- [ ] Double-entry verification passes

---

## Phase 6-8: Asset, Inventory, Sales Reports

Similar implementation pattern as Phase 5 for:
- Asset Register, Depreciation Report, Disposal Report
- Stock Valuation, Movement History, Expiring Stock
- Sales Summary, Product Performance, Customer Analysis

---

## Phase 9: Dashboard API

### Objective
Implement real-time dashboard endpoints with caching.

### Deliverables

#### 9.1 Executive Dashboard Query

**File**: `services/reporting-service/src/application/queries/dashboard/get-executive-dashboard.query.ts`

```typescript
export interface ExecutiveDashboard {
  today: {
    revenue: number;
    orderCount: number;
    averageOrderValue: number;
  };
  monthToDate: {
    revenue: number;
    previousMonthRevenue: number;
    growthPercentage: number;
  };
  yearToDate: {
    revenue: number;
    netIncome: number;
  };
  alerts: Array<{
    type: string;
    count: number;
  }>;
}

export class GetExecutiveDashboardQuery {
  constructor(private env: Env) {}

  async execute(date: string): Promise<ExecutiveDashboard> {
    // Check cache first
    const cacheKey = `dashboard:executive:${date}`;
    const cached = await this.env.CACHE.get(cacheKey, 'json');
    if (cached) {
      return cached as ExecutiveDashboard;
    }

    // Build dashboard from aggregates
    const dashboard = await this.buildDashboard(date);

    // Cache for 5 minutes
    await this.env.CACHE.put(cacheKey, JSON.stringify(dashboard), {
      expirationTtl: 300
    });

    return dashboard;
  }
}
```

### Acceptance Criteria
- [ ] Executive dashboard loads in < 500ms
- [ ] Dashboard data cached with 5-minute TTL
- [ ] Drill-down links work correctly
- [ ] Alerts show low stock and expiring items

---

## Phase 10: Report Generation & Export

### Objective
Implement asynchronous report generation and export to PDF/Excel/CSV.

### Deliverables
- Report queue for async generation
- PDF exporter using @react-pdf/renderer
- Excel exporter using xlsx library
- CSV exporter
- R2 storage for generated files

### Acceptance Criteria
- [ ] Reports generate asynchronously
- [ ] PDF exports formatted correctly
- [ ] Excel exports with proper formatting
- [ ] Files stored in R2 with expiration
- [ ] Download links work correctly

---

## Phase 11: Report Scheduling

### Objective
Implement scheduled report generation and delivery.

### Deliverables
- Schedule management CRUD
- Cron-based scheduler
- Email/webhook delivery
- Failure handling and notifications

### Acceptance Criteria
- [ ] Schedules can be created/updated/deleted
- [ ] Reports run on schedule
- [ ] Delivery methods work (email, webhook)
- [ ] Failed schedules deactivated after 3 failures

---

## Phase 12: Data Purging & Monitoring

### Objective
Implement database size monitoring and 7-year data purging.

### Deliverables

#### 12.1 Database Size Monitor

**File**: `services/reporting-service/src/infrastructure/scheduled/database-monitor.cron.ts`

```typescript
export async function monitorDatabaseSize(env: Env): Promise<void> {
  // Get database size (D1 specific method)
  const sizeResult = await env.DB.prepare(`
    SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()
  `).first();

  const sizeBytes = (sizeResult?.size as number) || 0;
  const sizeGB = sizeBytes / (1024 * 1024 * 1024);
  const percentUsed = (sizeGB / 10) * 100;

  // Log size
  const today = new Date().toISOString().split('T')[0];
  await env.DB.prepare(`
    INSERT INTO database_size_log (id, log_date, size_bytes, size_gb, percent_used)
    VALUES (?, ?, ?, ?, ?)
  `).bind(`size-${today}`, today, sizeBytes, sizeGB, percentUsed).run();

  // Check thresholds and alert/purge
  if (percentUsed >= 90) {
    await sendUrgentAlert(env, sizeGB, percentUsed);
    await triggerAutoPurge(env);
  } else if (percentUsed >= 80) {
    await sendWarningAlert(env, sizeGB, percentUsed);
  } else if (percentUsed >= 70) {
    await sendInfoAlert(env, sizeGB, percentUsed);
  }
}

async function triggerAutoPurge(env: Env): Promise<void> {
  const currentYear = new Date().getFullYear();
  const purgeYear = currentYear - 8; // Data older than 7 years

  // Generate year-end summary before purging
  await generateYearEndSummary(env, purgeYear);

  // Purge in priority order
  const tables = [
    'daily_financial_aggregate',
    'daily_sales_aggregate',
    'daily_inventory_snapshot',
    'inventory_archive',
    'sales_archive',
    'payment_archive',
    'journal_archive',
    'asset_archive'
  ];

  for (const table of tables) {
    const result = await env.DB.prepare(`
      DELETE FROM ${table} WHERE fiscal_year <= ?
    `).bind(purgeYear).run();

    await env.DB.prepare(`
      INSERT INTO purge_audit_log (id, purge_date, fiscal_year, table_name, records_deleted, initiated_by, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      new Date().toISOString(),
      purgeYear,
      table,
      result.meta.changes,
      'SYSTEM',
      'THRESHOLD_90'
    ).run();
  }
}
```

### Acceptance Criteria
- [ ] Database size logged daily
- [ ] Alerts sent at 70%, 80%, 90% thresholds
- [ ] Year-end summaries generated before purge
- [ ] Purge only deletes data > 7 years old
- [ ] Purge audit trail maintained
- [ ] Manual purge requires OWNER + confirmation

---

## Testing Strategy

### Unit Tests
- Value objects (FiscalPeriod, DateRange)
- Report calculation logic
- Aggregation formulas

### Integration Tests
- Event handlers archive correctly
- Aggregation produces correct results
- Reports generate accurately

### E2E Tests
- Full flow: Event → Archive → Aggregate → Report
- Dashboard performance under load
- Purge process correctness

---

## Deployment Checklist

1. [ ] Create D1 database in Cloudflare
2. [ ] Create R2 bucket for reports
3. [ ] Create KV namespace for cache
4. [ ] Set up Cloudflare Queue
5. [ ] Run all migrations
6. [ ] Seed report definitions
7. [ ] Configure upstream services to publish events
8. [ ] Deploy Reporting Service
9. [ ] Verify event consumption
10. [ ] Test report generation
11. [ ] Enable scheduled tasks

---

**Version**: 1.0
**Last Updated**: 2025-01-16
**Author**: Claude AI Assistant

For related documentation, see:
- [Reporting Service Architecture](./REPORTING_SERVICE_ARCHITECTURE.md)
- [Reporting Service Business Rules](./BUSINESS_RULES.md)
