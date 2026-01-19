# Reporting Service Architecture

## Overview

The Reporting Service is a dedicated **OLAP (Online Analytical Processing)** microservice designed to handle analytical workloads, historical data archival, and report generation. It is strategically separated from the transactional services to optimize database performance and work within Cloudflare D1's 10GB limit per database.

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Bounded Context](#bounded-context)
3. [Domain Model](#domain-model)
4. [Architecture Layers](#architecture-layers)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Database Schema](#database-schema)
7. [Report Types](#report-types)
8. [API Endpoints](#api-endpoints)
9. [Event Consumption](#event-consumption)
10. [Caching Strategy](#caching-strategy)
11. [Folder Structure](#folder-structure)

---

## Design Philosophy

### CQRS Pattern Implementation

The Reporting Service implements the **Query** side of CQRS (Command Query Responsibility Segregation):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KIDKAZZ ERP SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────┐   ┌─────────────────────────────┐ │
│  │     TRANSACTIONAL SERVICES          │   │    REPORTING SERVICE        │ │
│  │     (OLTP - Write Optimized)        │   │    (OLAP - Read Optimized)  │ │
│  ├─────────────────────────────────────┤   ├─────────────────────────────┤ │
│  │                                     │   │                             │ │
│  │  ┌─────────────┐ ┌─────────────┐   │   │  ┌───────────────────────┐  │ │
│  │  │ Accounting  │ │  Inventory  │   │   │  │   Historical Data     │  │ │
│  │  │   Service   │ │   Service   │   │   │  │                       │  │ │
│  │  └──────┬──────┘ └──────┬──────┘   │   │  │  • Journal entries    │  │ │
│  │         │               │          │   │  │  • Stock movements    │  │ │
│  │  ┌──────┴───────────────┴──────┐   │   │  │  • Sales transactions │  │ │
│  │  │         Events              │   │   │  │  • Asset depreciation │  │ │
│  │  └─────────────┬───────────────┘   │   │  │  • Payment records    │  │ │
│  │                │                   │   │  └───────────────────────┘  │ │
│  │  ┌─────────────┐ ┌─────────────┐   │   │                             │ │
│  │  │   Sales     │ │  Payment    │───┼───┼──►  ┌───────────────────┐   │ │
│  │  │   Service   │ │   Service   │   │   │     │   Pre-Aggregated  │   │ │
│  │  └─────────────┘ └─────────────┘   │   │     │      Reports      │   │ │
│  │                                     │   │     └───────────────────┘   │ │
│  │  Data Retention: Current + 1 Year   │   │  Data Retention: Unlimited  │ │
│  │  Purpose: Fast transactions         │   │  Purpose: Analytics/Reports │ │
│  └─────────────────────────────────────┘   └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Separate Reporting Service?

| Concern | Transactional Services | Reporting Service |
|---------|------------------------|-------------------|
| **Workload** | OLTP (many small writes) | OLAP (complex reads) |
| **Optimization** | Write performance | Read/aggregation performance |
| **Schema** | Normalized (3NF) | Denormalized (star/snowflake) |
| **Data Retention** | Current + 1 year | Unlimited historical |
| **Query Pattern** | Point queries | Analytical queries |
| **Indexes** | Transaction-optimized | Report-optimized |
| **D1 Database** | Separate per service | Dedicated reporting DB |

### Database Size Management

```
┌────────────────────────────────────────────────────────────────────┐
│                    D1 DATABASE ALLOCATION                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Accounting DB (10GB limit)     Reporting DB (10GB limit)          │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐   │
│  │ Active journal entries  │    │ ALL historical journals     │   │
│  │ Current fiscal year     │    │ Multi-year financial data   │   │
│  │ Active assets           │    │ Complete asset history      │   │
│  │ Recent depreciation     │    │ Full depreciation records   │   │
│  │                         │    │ Pre-aggregated summaries    │   │
│  │ ~2-3 GB estimated       │    │ ~5-8 GB estimated           │   │
│  └─────────────────────────┘    └─────────────────────────────┘   │
│                                                                    │
│  Inventory DB (10GB limit)      Sales DB (10GB limit)              │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐   │
│  │ Current stock levels    │    │ Active orders               │   │
│  │ Active batches          │    │ Recent transactions         │   │
│  │ Recent movements        │    │                             │   │
│  │                         │    │ ~2-3 GB estimated           │   │
│  │ ~3-4 GB estimated       │    └─────────────────────────────┘   │
│  └─────────────────────────┘                                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Bounded Context

### Ubiquitous Language

| Term | Definition |
|------|------------|
| **Report** | A structured presentation of data for analysis |
| **Report Definition** | Template defining report structure, filters, and data sources |
| **Report Instance** | Generated report with specific parameters and data |
| **Data Snapshot** | Point-in-time capture of transactional data |
| **Aggregate** | Pre-computed summary data for fast retrieval |
| **Time Series** | Data organized by time periods for trend analysis |
| **Dimension** | Attribute for filtering/grouping (time, product, location) |
| **Measure** | Numeric value being aggregated (revenue, quantity, cost) |
| **Archive** | Historical data moved from transactional services |
| **Retention Policy** | Rules governing data archival and purging |

### Context Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BOUNDED CONTEXT MAP                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                           ┌─────────────────┐          │
│  │   Accounting    │──── JournalEntryPosted ──►│                 │          │
│  │    Context      │──── DepreciationPosted ──►│                 │          │
│  │                 │──── AssetDisposed ───────►│                 │          │
│  └─────────────────┘                           │                 │          │
│                                                │                 │          │
│  ┌─────────────────┐                           │   Reporting     │          │
│  │   Inventory     │──── StockMovementCreated─►│    Context      │          │
│  │    Context      │──── BatchExpired ────────►│                 │          │
│  │                 │──── TransferCompleted ───►│  (Downstream    │          │
│  └─────────────────┘                           │   Consumer)     │          │
│                                                │                 │          │
│  ┌─────────────────┐                           │                 │          │
│  │     Sales       │──── OrderCompleted ──────►│                 │          │
│  │    Context      │──── RefundProcessed ─────►│                 │          │
│  │                 │──── SaleRecorded ────────►│                 │          │
│  └─────────────────┘                           │                 │          │
│                                                │                 │          │
│  ┌─────────────────┐                           │                 │          │
│  │    Payment      │──── PaymentReceived ─────►│                 │          │
│  │    Context      │──── SettlementCompleted ─►│                 │          │
│  └─────────────────┘                           └─────────────────┘          │
│                                                                             │
│  Integration Pattern: Eventual Consistency via Domain Events                │
│  Data Flow: One-way (Upstream → Reporting Service)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Domain Model

### Aggregates

#### 1. Report Definition Aggregate

```typescript
interface ReportDefinition {
  id: string;
  code: string;                    // Unique identifier: "RPT-FIN-001"
  name: string;
  description: string;
  category: ReportCategory;

  // Data configuration
  dataSource: DataSource;          // Which archived data to query
  dimensions: Dimension[];         // Grouping/filtering attributes
  measures: Measure[];             // Values to aggregate

  // Filter configuration
  defaultFilters: FilterConfig[];
  availableFilters: FilterDefinition[];

  // Output configuration
  outputFormats: OutputFormat[];   // PDF, EXCEL, CSV, JSON
  defaultFormat: OutputFormat;

  // Access control
  requiredPermissions: string[];

  // Scheduling
  canSchedule: boolean;

  // Metadata
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type ReportCategory =
  | 'FINANCIAL'           // P&L, Balance Sheet, Cash Flow
  | 'ASSET'               // Depreciation, Asset Register
  | 'INVENTORY'           // Stock Movement, Aging, Valuation
  | 'SALES'               // Revenue, Channel Performance
  | 'OPERATIONAL'         // KPIs, Metrics
  | 'TAX'                 // Tax reports, compliance
  | 'CUSTOM';             // User-defined reports

type DataSource =
  | 'JOURNAL_ARCHIVE'
  | 'ASSET_ARCHIVE'
  | 'INVENTORY_ARCHIVE'
  | 'SALES_ARCHIVE'
  | 'PAYMENT_ARCHIVE'
  | 'AGGREGATE_DAILY'
  | 'AGGREGATE_MONTHLY'
  | 'AGGREGATE_YEARLY';

interface Dimension {
  name: string;
  field: string;
  type: 'DATE' | 'STRING' | 'NUMBER' | 'HIERARCHY';
  hierarchy?: string[];           // For drill-down: ['year', 'quarter', 'month', 'day']
}

interface Measure {
  name: string;
  field: string;
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  format: 'CURRENCY' | 'NUMBER' | 'PERCENTAGE';
}
```

#### 2. Report Instance Aggregate

```typescript
interface ReportInstance {
  id: string;
  definitionId: string;

  // Generation parameters
  parameters: ReportParameters;
  filters: AppliedFilter[];
  dateRange: DateRange;

  // Status
  status: ReportStatus;

  // Output
  format: OutputFormat;
  outputUrl?: string;             // Stored in R2 bucket
  fileSize?: number;

  // Metadata
  generatedBy: string;
  generatedAt?: Date;
  expiresAt?: Date;               // Auto-cleanup

  // Performance
  executionTimeMs?: number;
  rowCount?: number;

  // Error handling
  errorMessage?: string;

  createdAt: Date;
  updatedAt: Date;
}

type ReportStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

interface ReportParameters {
  fiscalYear?: number;
  fiscalPeriod?: string;          // "2025-01" to "2025-12"
  warehouseId?: string;
  productCategoryId?: string;
  assetCategoryId?: string;
  customerId?: string;
  channelId?: string;
  [key: string]: any;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  granularity: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
}
```

#### 3. Scheduled Report Aggregate

```typescript
interface ScheduledReport {
  id: string;
  definitionId: string;
  name: string;

  // Schedule configuration
  schedule: CronSchedule;
  timezone: string;               // "Asia/Jakarta"

  // Parameters
  parameters: ReportParameters;
  dateRangeType: DateRangeType;   // Relative date calculation
  format: OutputFormat;

  // Delivery
  deliveryMethod: DeliveryMethod;
  recipients: Recipient[];

  // Status
  isActive: boolean;
  lastRunAt?: Date;
  lastRunStatus?: ReportStatus;
  nextRunAt?: Date;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CronSchedule {
  expression: string;             // "0 8 1 * *" = 8 AM on 1st of month
  description: string;            // Human-readable
}

type DateRangeType =
  | 'PREVIOUS_DAY'
  | 'PREVIOUS_WEEK'
  | 'PREVIOUS_MONTH'
  | 'PREVIOUS_QUARTER'
  | 'PREVIOUS_YEAR'
  | 'MONTH_TO_DATE'
  | 'QUARTER_TO_DATE'
  | 'YEAR_TO_DATE';

type DeliveryMethod =
  | 'EMAIL'
  | 'WEBHOOK'
  | 'STORAGE';                    // Save to R2, notify via sent.dm

interface Recipient {
  type: 'EMAIL' | 'WEBHOOK';
  address: string;
}
```

### Value Objects

```typescript
class FiscalPeriod {
  constructor(
    public year: number,
    public month: number
  ) {
    if (month < 1 || month > 12) {
      throw new Error('Invalid fiscal month');
    }
  }

  get quarter(): number {
    return Math.ceil(this.month / 3);
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  static fromString(value: string): FiscalPeriod {
    const [year, month] = value.split('-').map(Number);
    return new FiscalPeriod(year, month);
  }

  previous(): FiscalPeriod;
  next(): FiscalPeriod;
  startDate(): Date;
  endDate(): Date;
}

class Money {
  constructor(
    public amount: number,
    public currency: string = 'IDR'
  ) {}

  format(): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: this.currency
    }).format(this.amount);
  }
}

class DateRange {
  constructor(
    public startDate: Date,
    public endDate: Date
  ) {
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }
  }

  contains(date: Date): boolean;
  overlaps(other: DateRange): boolean;
  dayCount(): number;
}
```

### Domain Services

```typescript
interface ReportGeneratorService {
  generate(
    definition: ReportDefinition,
    parameters: ReportParameters,
    dateRange: DateRange
  ): Promise<ReportData>;
}

interface ReportExporterService {
  export(
    data: ReportData,
    format: OutputFormat
  ): Promise<ExportResult>;
}

interface DataArchivalService {
  archiveJournalEntries(entries: JournalEntryArchive[]): Promise<void>;
  archiveAssetRecords(records: AssetArchive[]): Promise<void>;
  archiveInventoryMovements(movements: InventoryArchive[]): Promise<void>;
  archiveSalesTransactions(transactions: SalesArchive[]): Promise<void>;
}

interface AggregationService {
  aggregateDaily(date: Date): Promise<void>;
  aggregateMonthly(period: FiscalPeriod): Promise<void>;
  aggregateYearly(year: number): Promise<void>;
  refreshMaterializedView(viewName: string): Promise<void>;
}
```

---

## Architecture Layers

### 1. Domain Layer (Core)

```
src/domain/
├── aggregates/
│   ├── report-definition.aggregate.ts
│   ├── report-instance.aggregate.ts
│   └── scheduled-report.aggregate.ts
├── entities/
│   ├── journal-archive.entity.ts
│   ├── asset-archive.entity.ts
│   ├── inventory-archive.entity.ts
│   ├── sales-archive.entity.ts
│   └── daily-aggregate.entity.ts
├── value-objects/
│   ├── fiscal-period.vo.ts
│   ├── date-range.vo.ts
│   ├── money.vo.ts
│   └── report-parameters.vo.ts
├── repositories/
│   ├── report-definition.repository.ts
│   ├── report-instance.repository.ts
│   ├── journal-archive.repository.ts
│   ├── asset-archive.repository.ts
│   └── aggregate.repository.ts
└── services/
    ├── report-generator.service.ts
    ├── report-exporter.service.ts
    ├── data-archival.service.ts
    └── aggregation.service.ts
```

### 2. Application Layer

```
src/application/
├── commands/
│   ├── generate-report.command.ts
│   ├── schedule-report.command.ts
│   ├── cancel-scheduled-report.command.ts
│   └── archive-data.command.ts
├── queries/
│   ├── get-report-definitions.query.ts
│   ├── get-report-instance.query.ts
│   ├── get-income-statement.query.ts
│   ├── get-balance-sheet.query.ts
│   ├── get-asset-register.query.ts
│   ├── get-depreciation-report.query.ts
│   ├── get-sales-summary.query.ts
│   └── get-inventory-valuation.query.ts
├── event-handlers/
│   ├── journal-entry-posted.handler.ts
│   ├── depreciation-posted.handler.ts
│   ├── asset-disposed.handler.ts
│   ├── stock-movement-created.handler.ts
│   ├── order-completed.handler.ts
│   └── payment-received.handler.ts
└── dtos/
    ├── report-request.dto.ts
    ├── report-response.dto.ts
    └── archive-event.dto.ts
```

### 3. Infrastructure Layer

```
src/infrastructure/
├── database/
│   ├── schema.ts
│   ├── repositories/
│   │   ├── report-definition.repository.impl.ts
│   │   ├── journal-archive.repository.impl.ts
│   │   └── aggregate.repository.impl.ts
│   └── migrations/
│       ├── 0001_create_report_definitions.sql
│       ├── 0002_create_journal_archive.sql
│       ├── 0003_create_asset_archive.sql
│       ├── 0004_create_inventory_archive.sql
│       ├── 0005_create_sales_archive.sql
│       ├── 0006_create_daily_aggregates.sql
│       ├── 0007_create_monthly_aggregates.sql
│       └── 0008_create_report_instances.sql
├── http/
│   ├── routes/
│   │   ├── reports.routes.ts
│   │   ├── financial.routes.ts
│   │   ├── asset.routes.ts
│   │   ├── inventory.routes.ts
│   │   └── sales.routes.ts
│   └── controllers/
│       ├── report.controller.ts
│       ├── financial-report.controller.ts
│       ├── asset-report.controller.ts
│       └── sales-report.controller.ts
├── events/
│   ├── queue-consumer.ts
│   └── handlers/
│       ├── accounting-events.handler.ts
│       ├── inventory-events.handler.ts
│       └── sales-events.handler.ts
├── storage/
│   └── r2-storage.adapter.ts
├── export/
│   ├── pdf-exporter.ts
│   ├── excel-exporter.ts
│   └── csv-exporter.ts
└── scheduled/
    ├── daily-aggregation.cron.ts
    ├── monthly-aggregation.cron.ts
    └── report-scheduler.cron.ts
```

---

## Data Flow Architecture

### Event-Driven Data Ingestion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EVENT-DRIVEN DATA INGESTION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Accounting Service                                                         │
│  ┌─────────────────────────────────────────┐                               │
│  │  JournalEntryPosted Event               │                               │
│  │  {                                      │                               │
│  │    entryId: "je-123",                   │                               │
│  │    entryNumber: "JE-2025-0001",         │                               │
│  │    entryDate: "2025-01-15",             │                               │
│  │    lines: [                             │                               │
│  │      { accountId, direction, amount }   │                               │
│  │    ],                                   │                               │
│  │    postedBy: "user-456"                 │       Cloudflare Queue        │
│  │  }                                      │──────────────────────────────►│
│  └─────────────────────────────────────────┘                               │
│                                                                             │
│  ┌─────────────────────────────────────────┐       ┌───────────────────┐   │
│  │  DepreciationPosted Event               │──────►│                   │   │
│  │  {                                      │       │  Reporting        │   │
│  │    assetId, period, amount,             │       │  Service          │   │
│  │    accumulatedDepreciation,             │       │                   │   │
│  │    bookValue                            │       │  Queue Consumer   │   │
│  │  }                                      │       │  ┌─────────────┐  │   │
│  └─────────────────────────────────────────┘       │  │ Event       │  │   │
│                                                     │  │ Handler     │  │   │
│  Inventory Service                                  │  └──────┬──────┘  │   │
│  ┌─────────────────────────────────────────┐       │         │         │   │
│  │  StockMovementCreated Event             │──────►│         ▼         │   │
│  │  {                                      │       │  ┌─────────────┐  │   │
│  │    productId, warehouseId, quantity,    │       │  │ Archive     │  │   │
│  │    movementType, batchId,               │       │  │ Repository  │  │   │
│  │    previousQty, newQty                  │       │  └──────┬──────┘  │   │
│  │  }                                      │       │         │         │   │
│  └─────────────────────────────────────────┘       │         ▼         │   │
│                                                     │  ┌─────────────┐  │   │
│  Sales Service                                      │  │ D1 Database │  │   │
│  ┌─────────────────────────────────────────┐       │  │ (Reporting) │  │   │
│  │  OrderCompleted Event                   │──────►│  └─────────────┘  │   │
│  │  {                                      │       │                   │   │
│  │    orderId, customerId, channel,        │       └───────────────────┘   │
│  │    items, totalAmount, paymentMethod    │                               │
│  │  }                                      │                               │
│  └─────────────────────────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Aggregation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AGGREGATION PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Raw Archive Data                 Daily Aggregates           Reports        │
│  ─────────────────                ────────────────           ───────        │
│                                                                             │
│  ┌─────────────────┐              ┌─────────────────┐                      │
│  │ journal_archive │              │ daily_financial │                      │
│  │ (millions rows) │──Cron Job──►│  _aggregate     │                      │
│  │                 │  (2 AM)      │                 │                      │
│  │ • entry_date    │              │ • date          │    ┌──────────────┐  │
│  │ • account_id    │              │ • total_debit   │    │ Income       │  │
│  │ • amount        │              │ • total_credit  │───►│ Statement    │  │
│  │ • direction     │              │ • revenue       │    │ Report       │  │
│  └─────────────────┘              │ • expenses      │    └──────────────┘  │
│                                   │ • net_income    │                      │
│  ┌─────────────────┐              └─────────────────┘                      │
│  │ asset_archive   │                                                       │
│  │                 │              ┌─────────────────┐    ┌──────────────┐  │
│  │ • asset_id      │──Cron Job──►│ monthly_asset   │───►│ Depreciation │  │
│  │ • depreciation  │  (1st/mo)   │  _aggregate     │    │ Report       │  │
│  │ • book_value    │              │                 │    └──────────────┘  │
│  └─────────────────┘              │ • total_depr    │                      │
│                                   │ • total_book    │                      │
│  ┌─────────────────┐              │ • by_category   │                      │
│  │ sales_archive   │              └─────────────────┘                      │
│  │                 │                                                       │
│  │ • order_id      │              ┌─────────────────┐    ┌──────────────┐  │
│  │ • channel       │──Cron Job──►│ daily_sales     │───►│ Sales        │  │
│  │ • total_amount  │  (2 AM)     │  _aggregate     │    │ Dashboard    │  │
│  │ • items         │              │                 │    └──────────────┘  │
│  └─────────────────┘              │ • revenue       │                      │
│                                   │ • order_count   │                      │
│  ┌─────────────────┐              │ • avg_order     │                      │
│  │ inventory       │              │ • by_channel    │                      │
│  │  _archive       │              └─────────────────┘                      │
│  │                 │                                                       │
│  │ • product_id    │              ┌─────────────────┐    ┌──────────────┐  │
│  │ • warehouse_id  │──Cron Job──►│ daily_inventory │───►│ Stock        │  │
│  │ • quantity      │  (2 AM)     │  _snapshot      │    │ Valuation    │  │
│  │ • movement_type │              │                 │    │ Report       │  │
│  └─────────────────┘              └─────────────────┘    └──────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Archive Tables

```sql
-- =====================================================
-- JOURNAL ENTRY ARCHIVE
-- =====================================================
CREATE TABLE journal_archive (
  id TEXT PRIMARY KEY,

  -- Original entry data
  original_entry_id TEXT NOT NULL,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  entry_type TEXT NOT NULL,

  -- Line details (denormalized for query performance)
  account_id TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,           -- Asset, Liability, Revenue, etc.
  direction TEXT NOT NULL,              -- Debit, Credit
  amount REAL NOT NULL,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,

  -- Audit
  posted_by TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
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

  -- Asset identification
  asset_id TEXT NOT NULL,
  asset_number TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,

  -- Financial data
  acquisition_cost REAL NOT NULL,
  salvage_value REAL NOT NULL,
  useful_life_months INTEGER NOT NULL,
  depreciation_method TEXT NOT NULL,

  -- Period snapshot
  period TEXT NOT NULL,                 -- "2025-01"
  period_depreciation REAL NOT NULL,
  accumulated_depreciation REAL NOT NULL,
  book_value REAL NOT NULL,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Status at time of snapshot
  asset_status TEXT NOT NULL,

  -- Audit
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

  -- Movement identification
  original_movement_id TEXT NOT NULL,
  movement_date DATE NOT NULL,
  movement_type TEXT NOT NULL,          -- PURCHASE, SALE, ADJUSTMENT, TRANSFER

  -- Product details (denormalized)
  product_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category_id TEXT,
  category_name TEXT,

  -- Location
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT NOT NULL,

  -- Batch details
  batch_id TEXT,
  batch_number TEXT,
  expiration_date DATE,

  -- Quantities
  quantity REAL NOT NULL,
  uom TEXT NOT NULL,
  previous_qty REAL NOT NULL,
  new_qty REAL NOT NULL,

  -- Cost (for valuation)
  unit_cost REAL,
  total_cost REAL,

  -- Reference
  reference_type TEXT,                  -- ORDER, TRANSFER, ADJUSTMENT
  reference_id TEXT,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Audit
  created_by TEXT,
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(original_movement_id)
);

CREATE INDEX idx_inventory_archive_date ON inventory_archive(movement_date);
CREATE INDEX idx_inventory_archive_product ON inventory_archive(product_id);
CREATE INDEX idx_inventory_archive_warehouse ON inventory_archive(warehouse_id);
CREATE INDEX idx_inventory_archive_type ON inventory_archive(movement_type);

-- =====================================================
-- SALES ARCHIVE
-- =====================================================
CREATE TABLE sales_archive (
  id TEXT PRIMARY KEY,

  -- Order identification
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL,

  -- Customer (denormalized)
  customer_id TEXT,
  customer_name TEXT,
  customer_type TEXT,                   -- RETAIL, WHOLESALE

  -- Channel
  channel TEXT NOT NULL,                -- POS, ECOMMERCE, WHOLESALE, MOBILE
  store_id TEXT,
  store_name TEXT,

  -- Line item details
  product_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_category_id TEXT,
  product_category_name TEXT,

  -- Quantities and amounts
  quantity REAL NOT NULL,
  uom TEXT NOT NULL,
  unit_price REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL,

  -- Cost (for margin calculation)
  unit_cost REAL,
  line_cost REAL,

  -- Payment
  payment_method TEXT NOT NULL,
  payment_provider TEXT,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  hour_of_day INTEGER NOT NULL,

  -- Audit
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

  -- Payment identification
  payment_id TEXT NOT NULL UNIQUE,
  payment_number TEXT NOT NULL,
  payment_date DATE NOT NULL,

  -- Order reference
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,

  -- Payment details
  payment_method TEXT NOT NULL,         -- CASH, QRIS, EDC, BANK_TRANSFER, VIRTUAL_ACCOUNT
  payment_channel TEXT NOT NULL,        -- POS, MIDTRANS, MANUAL
  provider TEXT,                        -- BCA, BRI, CIMB, GOPAY, OVO

  -- Amounts
  amount REAL NOT NULL,
  fee_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL,

  -- Settlement
  settlement_status TEXT NOT NULL,      -- PENDING, SETTLED, FAILED
  settlement_date DATE,
  settlement_reference TEXT,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Audit
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_archive_date ON payment_archive(payment_date);
CREATE INDEX idx_payment_archive_method ON payment_archive(payment_method);
CREATE INDEX idx_payment_archive_status ON payment_archive(settlement_status);
```

### Aggregate Tables

```sql
-- =====================================================
-- DAILY FINANCIAL AGGREGATE
-- =====================================================
CREATE TABLE daily_financial_aggregate (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,

  -- Revenue (Credit balances from Revenue accounts)
  total_revenue REAL NOT NULL DEFAULT 0,
  sales_revenue REAL NOT NULL DEFAULT 0,
  other_revenue REAL NOT NULL DEFAULT 0,

  -- Cost of Goods Sold
  total_cogs REAL NOT NULL DEFAULT 0,

  -- Expenses (Debit balances from Expense accounts)
  total_expenses REAL NOT NULL DEFAULT 0,
  operating_expenses REAL NOT NULL DEFAULT 0,
  depreciation_expense REAL NOT NULL DEFAULT 0,
  other_expenses REAL NOT NULL DEFAULT 0,

  -- Calculated
  gross_profit REAL NOT NULL DEFAULT 0,     -- revenue - cogs
  operating_income REAL NOT NULL DEFAULT 0,  -- gross_profit - operating_expenses
  net_income REAL NOT NULL DEFAULT 0,        -- revenue - cogs - all_expenses

  -- Transaction counts
  journal_entry_count INTEGER NOT NULL DEFAULT 0,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,

  -- Audit
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
  channel TEXT NOT NULL,                -- POS, ECOMMERCE, WHOLESALE, MOBILE

  -- Sales metrics
  order_count INTEGER NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  gross_sales REAL NOT NULL DEFAULT 0,
  discount_total REAL NOT NULL DEFAULT 0,
  tax_total REAL NOT NULL DEFAULT 0,
  net_sales REAL NOT NULL DEFAULT 0,

  -- Cost and margin
  total_cost REAL NOT NULL DEFAULT 0,
  gross_margin REAL NOT NULL DEFAULT 0,
  margin_percentage REAL NOT NULL DEFAULT 0,

  -- Averages
  average_order_value REAL NOT NULL DEFAULT 0,
  average_items_per_order REAL NOT NULL DEFAULT 0,

  -- Customer metrics
  unique_customers INTEGER NOT NULL DEFAULT 0,
  new_customers INTEGER NOT NULL DEFAULT 0,
  repeat_customers INTEGER NOT NULL DEFAULT 0,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  fiscal_quarter INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,

  -- Audit
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
  period TEXT NOT NULL,                 -- "2025-01"
  category_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,

  -- Asset counts
  total_assets INTEGER NOT NULL DEFAULT 0,
  active_assets INTEGER NOT NULL DEFAULT 0,
  fully_depreciated_assets INTEGER NOT NULL DEFAULT 0,
  disposed_assets INTEGER NOT NULL DEFAULT 0,

  -- Values
  total_acquisition_cost REAL NOT NULL DEFAULT 0,
  total_accumulated_depreciation REAL NOT NULL DEFAULT 0,
  total_book_value REAL NOT NULL DEFAULT 0,
  period_depreciation REAL NOT NULL DEFAULT 0,

  -- Disposals in period
  disposal_count INTEGER NOT NULL DEFAULT 0,
  disposal_proceeds REAL NOT NULL DEFAULT 0,
  disposal_gain_loss REAL NOT NULL DEFAULT 0,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Audit
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

  -- Quantities
  quantity_available REAL NOT NULL DEFAULT 0,
  quantity_reserved REAL NOT NULL DEFAULT 0,
  quantity_in_transit REAL NOT NULL DEFAULT 0,
  total_quantity REAL NOT NULL DEFAULT 0,

  -- Valuation
  unit_cost REAL NOT NULL DEFAULT 0,
  total_value REAL NOT NULL DEFAULT 0,

  -- Movement summary for the day
  quantity_in REAL NOT NULL DEFAULT 0,
  quantity_out REAL NOT NULL DEFAULT 0,

  -- Time dimensions
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Audit
  snapshot_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(date, warehouse_id, product_id)
);

CREATE INDEX idx_inventory_snapshot_date ON daily_inventory_snapshot(date);
CREATE INDEX idx_inventory_snapshot_warehouse ON daily_inventory_snapshot(warehouse_id);
CREATE INDEX idx_inventory_snapshot_product ON daily_inventory_snapshot(product_id);

-- =====================================================
-- REPORT DEFINITIONS
-- =====================================================
CREATE TABLE report_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,

  -- Configuration (JSON)
  data_source TEXT NOT NULL,
  dimensions TEXT NOT NULL,             -- JSON array
  measures TEXT NOT NULL,               -- JSON array
  default_filters TEXT,                 -- JSON array
  available_filters TEXT,               -- JSON array

  -- Output
  output_formats TEXT NOT NULL,         -- JSON array
  default_format TEXT NOT NULL,

  -- Access
  required_permissions TEXT NOT NULL,   -- JSON array

  -- Scheduling
  can_schedule INTEGER NOT NULL DEFAULT 1,

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- REPORT INSTANCES
-- =====================================================
CREATE TABLE report_instances (
  id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL REFERENCES report_definitions(id),

  -- Parameters (JSON)
  parameters TEXT NOT NULL,
  filters TEXT,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'QUEUED',

  -- Output
  format TEXT NOT NULL,
  output_url TEXT,
  file_size INTEGER,

  -- Performance
  execution_time_ms INTEGER,
  row_count INTEGER,

  -- Error handling
  error_message TEXT,

  -- Audit
  generated_by TEXT NOT NULL,
  generated_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_instances_status ON report_instances(status);
CREATE INDEX idx_report_instances_definition ON report_instances(definition_id);

-- =====================================================
-- SCHEDULED REPORTS
-- =====================================================
CREATE TABLE scheduled_reports (
  id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL REFERENCES report_definitions(id),
  name TEXT NOT NULL,

  -- Schedule
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',

  -- Parameters (JSON)
  parameters TEXT NOT NULL,
  date_range_type TEXT NOT NULL,
  format TEXT NOT NULL,

  -- Delivery (JSON)
  delivery_method TEXT NOT NULL,
  recipients TEXT NOT NULL,             -- JSON array

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  last_run_status TEXT,
  next_run_at TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at);
```

---

## Report Types

### Financial Reports

| Report | Description | Data Source | Frequency |
|--------|-------------|-------------|-----------|
| **Income Statement (P&L)** | Revenue, expenses, net income | journal_archive + daily_financial_aggregate | Monthly/Quarterly/Annual |
| **Balance Sheet** | Assets, liabilities, equity | journal_archive (account balances) | Monthly/Quarterly |
| **Cash Flow Statement** | Operating, investing, financing | journal_archive | Monthly/Quarterly |
| **Trial Balance** | All account balances | journal_archive | On-demand |
| **General Ledger** | Transaction detail by account | journal_archive | On-demand |

### Asset Reports

| Report | Description | Data Source | Frequency |
|--------|-------------|-------------|-----------|
| **Asset Register** | Complete asset listing | asset_archive | On-demand |
| **Depreciation Schedule** | Future depreciation projection | asset_archive + calculations | On-demand |
| **Depreciation Summary** | Period depreciation by category | monthly_asset_aggregate | Monthly |
| **Asset Disposal Report** | Disposed assets with gain/loss | asset_archive | Monthly/Annual |
| **Asset Valuation** | Book value summary | monthly_asset_aggregate | Monthly |

### Inventory Reports

| Report | Description | Data Source | Frequency |
|--------|-------------|-------------|-----------|
| **Stock Valuation** | Inventory value by warehouse | daily_inventory_snapshot | Daily |
| **Stock Movement** | Transaction history | inventory_archive | On-demand |
| **Inventory Aging** | Age analysis by batch | inventory_archive + batch data | Weekly |
| **Expiring Stock** | Items nearing expiration | inventory_archive | Daily |
| **Stock Turnover** | Turnover ratio analysis | inventory_archive + sales_archive | Monthly |

### Sales Reports

| Report | Description | Data Source | Frequency |
|--------|-------------|-------------|-----------|
| **Sales Summary** | Revenue by channel/period | daily_sales_aggregate | Daily/Weekly/Monthly |
| **Product Performance** | Sales by product/category | sales_archive | Monthly |
| **Channel Analysis** | Performance by sales channel | daily_sales_aggregate | Monthly |
| **Customer Analysis** | Sales by customer segment | sales_archive | Monthly |
| **Margin Report** | Gross margin analysis | sales_archive | Monthly |

### Tax & Compliance Reports

| Report | Description | Data Source | Frequency |
|--------|-------------|-------------|-----------|
| **VAT Report** | Input/Output VAT | journal_archive | Monthly |
| **Tax Depreciation** | Fiscal depreciation (PMK 96) | asset_archive | Annual |
| **Withholding Tax** | PPh 21/23/4(2) summary | journal_archive | Monthly |

---

## API Endpoints

### Report Management

```
# Report Definitions
GET    /api/reporting/definitions                    # List available reports
GET    /api/reporting/definitions/:code              # Get report definition
POST   /api/reporting/definitions                    # Create custom report (admin)
PUT    /api/reporting/definitions/:id                # Update report definition

# Report Generation
POST   /api/reporting/reports/generate               # Generate report (async)
GET    /api/reporting/reports/:id                    # Get report instance
GET    /api/reporting/reports/:id/download           # Download report file
GET    /api/reporting/reports/history                # List generated reports

# Scheduled Reports
GET    /api/reporting/schedules                      # List scheduled reports
POST   /api/reporting/schedules                      # Create schedule
PUT    /api/reporting/schedules/:id                  # Update schedule
DELETE /api/reporting/schedules/:id                  # Delete schedule
POST   /api/reporting/schedules/:id/run              # Run immediately
```

### Financial Reports

```
# Income Statement
GET    /api/reporting/financial/income-statement
  ?fiscalYear=2025
  &fiscalMonth=1
  &compareWithPrevious=true

# Balance Sheet
GET    /api/reporting/financial/balance-sheet
  ?asOfDate=2025-01-31

# Cash Flow
GET    /api/reporting/financial/cash-flow
  ?startDate=2025-01-01
  &endDate=2025-01-31

# Trial Balance
GET    /api/reporting/financial/trial-balance
  ?asOfDate=2025-01-31

# General Ledger
GET    /api/reporting/financial/general-ledger
  ?accountId=acc-123
  &startDate=2025-01-01
  &endDate=2025-01-31
```

### Asset Reports

```
# Asset Register
GET    /api/reporting/assets/register
  ?asOfDate=2025-01-31
  &categoryId=cat-123
  &status=ACTIVE

# Depreciation Report
GET    /api/reporting/assets/depreciation
  ?fiscalYear=2025
  &fiscalMonth=1
  &categoryId=cat-123

# Asset Disposal Report
GET    /api/reporting/assets/disposals
  ?startDate=2025-01-01
  &endDate=2025-12-31

# Asset Valuation Summary
GET    /api/reporting/assets/valuation
  ?asOfDate=2025-01-31
```

### Inventory Reports

```
# Stock Valuation
GET    /api/reporting/inventory/valuation
  ?asOfDate=2025-01-31
  &warehouseId=wh-123

# Stock Movement
GET    /api/reporting/inventory/movements
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &productId=prod-123
  &movementType=SALE

# Inventory Aging
GET    /api/reporting/inventory/aging
  ?asOfDate=2025-01-31
  &warehouseId=wh-123

# Expiring Stock
GET    /api/reporting/inventory/expiring
  ?daysAhead=30
  &warehouseId=wh-123

# Stock Turnover
GET    /api/reporting/inventory/turnover
  ?fiscalYear=2025
  &fiscalMonth=1
```

### Sales Reports

```
# Sales Summary
GET    /api/reporting/sales/summary
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &channel=POS
  &granularity=DAY

# Product Performance
GET    /api/reporting/sales/products
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &categoryId=cat-123
  &limit=20

# Channel Analysis
GET    /api/reporting/sales/channels
  ?fiscalYear=2025
  &fiscalMonth=1

# Customer Analysis
GET    /api/reporting/sales/customers
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &customerType=RETAIL
  &limit=20

# Margin Report
GET    /api/reporting/sales/margin
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &groupBy=product
```

### Dashboard API

```
# Executive Dashboard
GET    /api/reporting/dashboard/executive
  ?date=2025-01-31

# Response structure:
{
  "today": {
    "revenue": 15000000,
    "orderCount": 45,
    "averageOrderValue": 333333,
    "topProducts": [...]
  },
  "monthToDate": {
    "revenue": 450000000,
    "previousMonthRevenue": 420000000,
    "growthPercentage": 7.14,
    "orderCount": 1250,
    "newCustomers": 85
  },
  "yearToDate": {
    "revenue": 5200000000,
    "netIncome": 780000000,
    "grossMargin": 32.5
  },
  "alerts": [
    { "type": "LOW_STOCK", "count": 12 },
    { "type": "EXPIRING_SOON", "count": 5 }
  ]
}
```

---

## Event Consumption

### Queue Consumer Configuration

```typescript
// wrangler.toml
[[queues.consumers]]
queue = "reporting-events"
max_batch_size = 100
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "reporting-events-dlq"
```

### Event Handler Implementation

```typescript
interface ReportingEventHandler {
  handleJournalEntryPosted(event: JournalEntryPostedEvent): Promise<void>;
  handleDepreciationPosted(event: DepreciationPostedEvent): Promise<void>;
  handleAssetDisposed(event: AssetDisposedEvent): Promise<void>;
  handleStockMovementCreated(event: StockMovementCreatedEvent): Promise<void>;
  handleOrderCompleted(event: OrderCompletedEvent): Promise<void>;
  handlePaymentReceived(event: PaymentReceivedEvent): Promise<void>;
}

// Event types consumed
interface JournalEntryPostedEvent {
  type: 'JournalEntryPosted';
  timestamp: string;
  data: {
    entryId: string;
    entryNumber: string;
    entryDate: string;
    description: string;
    entryType: string;
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

interface DepreciationPostedEvent {
  type: 'DepreciationPosted';
  timestamp: string;
  data: {
    assetId: string;
    assetNumber: string;
    assetName: string;
    categoryId: string;
    categoryCode: string;
    period: string;
    depreciationAmount: number;
    accumulatedDepreciation: number;
    bookValue: number;
    assetStatus: string;
  };
}

interface OrderCompletedEvent {
  type: 'OrderCompleted';
  timestamp: string;
  data: {
    orderId: string;
    orderNumber: string;
    orderDate: string;
    customerId?: string;
    customerName?: string;
    customerType?: string;
    channel: string;
    storeId?: string;
    items: Array<{
      productId: string;
      productSku: string;
      productName: string;
      categoryId?: string;
      quantity: number;
      uom: string;
      unitPrice: number;
      discountAmount: number;
      taxAmount: number;
      lineTotal: number;
      unitCost?: number;
    }>;
    totalAmount: number;
    paymentMethod: string;
    paymentProvider?: string;
    completedAt: string;
  };
}
```

---

## Caching Strategy

### Cache Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CACHING STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: KV Cache (Cloudflare Workers KV)                                  │
│  ─────────────────────────────────────────                                  │
│  • Dashboard data (TTL: 5 minutes)                                          │
│  • Aggregate summaries (TTL: 15 minutes)                                    │
│  • Report definitions (TTL: 1 hour)                                         │
│                                                                             │
│  Layer 2: Pre-Computed Aggregates (D1 Tables)                              │
│  ─────────────────────────────────────────────                              │
│  • Daily aggregates (computed at 2 AM)                                      │
│  • Monthly aggregates (computed on 1st of month)                            │
│  • Yearly summaries (computed on Jan 1st)                                   │
│                                                                             │
│  Layer 3: Generated Report Storage (R2 Bucket)                             │
│  ─────────────────────────────────────────────                              │
│  • PDF reports (TTL: 7 days)                                                │
│  • Excel exports (TTL: 7 days)                                              │
│  • Large datasets (TTL: 24 hours)                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cache Keys

```typescript
const CacheKeys = {
  // Dashboard
  executiveDashboard: (date: string) => `dashboard:executive:${date}`,
  salesSummary: (date: string, channel: string) => `dashboard:sales:${date}:${channel}`,

  // Aggregates
  dailyFinancial: (date: string) => `agg:financial:daily:${date}`,
  monthlySales: (year: number, month: number) => `agg:sales:monthly:${year}-${month}`,
  monthlyAsset: (period: string) => `agg:asset:monthly:${period}`,

  // Reports
  reportDefinition: (code: string) => `report:def:${code}`,
  reportInstance: (id: string) => `report:instance:${id}`,
};
```

---

## Folder Structure

```
services/reporting-service/
├── src/
│   ├── domain/
│   │   ├── aggregates/
│   │   │   ├── report-definition.aggregate.ts
│   │   │   ├── report-instance.aggregate.ts
│   │   │   └── scheduled-report.aggregate.ts
│   │   ├── entities/
│   │   │   ├── journal-archive.entity.ts
│   │   │   ├── asset-archive.entity.ts
│   │   │   ├── inventory-archive.entity.ts
│   │   │   ├── sales-archive.entity.ts
│   │   │   ├── payment-archive.entity.ts
│   │   │   ├── daily-financial-aggregate.entity.ts
│   │   │   ├── daily-sales-aggregate.entity.ts
│   │   │   ├── monthly-asset-aggregate.entity.ts
│   │   │   └── daily-inventory-snapshot.entity.ts
│   │   ├── value-objects/
│   │   │   ├── fiscal-period.vo.ts
│   │   │   ├── date-range.vo.ts
│   │   │   ├── money.vo.ts
│   │   │   └── report-parameters.vo.ts
│   │   ├── repositories/
│   │   │   ├── report-definition.repository.ts
│   │   │   ├── report-instance.repository.ts
│   │   │   ├── journal-archive.repository.ts
│   │   │   ├── asset-archive.repository.ts
│   │   │   ├── inventory-archive.repository.ts
│   │   │   ├── sales-archive.repository.ts
│   │   │   ├── payment-archive.repository.ts
│   │   │   └── aggregate.repository.ts
│   │   └── services/
│   │       ├── report-generator.service.ts
│   │       ├── report-exporter.service.ts
│   │       ├── data-archival.service.ts
│   │       └── aggregation.service.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── generate-report.command.ts
│   │   │   ├── schedule-report.command.ts
│   │   │   ├── cancel-scheduled-report.command.ts
│   │   │   ├── archive-journal-entries.command.ts
│   │   │   ├── archive-asset-records.command.ts
│   │   │   ├── run-daily-aggregation.command.ts
│   │   │   └── run-monthly-aggregation.command.ts
│   │   ├── queries/
│   │   │   ├── financial/
│   │   │   │   ├── get-income-statement.query.ts
│   │   │   │   ├── get-balance-sheet.query.ts
│   │   │   │   ├── get-cash-flow.query.ts
│   │   │   │   ├── get-trial-balance.query.ts
│   │   │   │   └── get-general-ledger.query.ts
│   │   │   ├── asset/
│   │   │   │   ├── get-asset-register.query.ts
│   │   │   │   ├── get-depreciation-report.query.ts
│   │   │   │   ├── get-asset-disposal.query.ts
│   │   │   │   └── get-asset-valuation.query.ts
│   │   │   ├── inventory/
│   │   │   │   ├── get-stock-valuation.query.ts
│   │   │   │   ├── get-stock-movement.query.ts
│   │   │   │   ├── get-inventory-aging.query.ts
│   │   │   │   └── get-stock-turnover.query.ts
│   │   │   ├── sales/
│   │   │   │   ├── get-sales-summary.query.ts
│   │   │   │   ├── get-product-performance.query.ts
│   │   │   │   ├── get-channel-analysis.query.ts
│   │   │   │   └── get-margin-report.query.ts
│   │   │   └── dashboard/
│   │   │       ├── get-executive-dashboard.query.ts
│   │   │       └── get-sales-dashboard.query.ts
│   │   ├── event-handlers/
│   │   │   ├── journal-entry-posted.handler.ts
│   │   │   ├── depreciation-posted.handler.ts
│   │   │   ├── asset-disposed.handler.ts
│   │   │   ├── stock-movement-created.handler.ts
│   │   │   ├── order-completed.handler.ts
│   │   │   └── payment-received.handler.ts
│   │   └── dtos/
│   │       ├── report-request.dto.ts
│   │       ├── report-response.dto.ts
│   │       ├── income-statement.dto.ts
│   │       ├── balance-sheet.dto.ts
│   │       └── dashboard.dto.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── schema.ts
│   │   │   └── repositories/
│   │   │       ├── report-definition.repository.impl.ts
│   │   │       ├── journal-archive.repository.impl.ts
│   │   │       ├── asset-archive.repository.impl.ts
│   │   │       ├── sales-archive.repository.impl.ts
│   │   │       └── aggregate.repository.impl.ts
│   │   ├── http/
│   │   │   ├── routes/
│   │   │   │   ├── reports.routes.ts
│   │   │   │   ├── financial.routes.ts
│   │   │   │   ├── asset.routes.ts
│   │   │   │   ├── inventory.routes.ts
│   │   │   │   ├── sales.routes.ts
│   │   │   │   └── dashboard.routes.ts
│   │   │   └── controllers/
│   │   │       ├── report.controller.ts
│   │   │       ├── financial-report.controller.ts
│   │   │       ├── asset-report.controller.ts
│   │   │       ├── inventory-report.controller.ts
│   │   │       ├── sales-report.controller.ts
│   │   │       └── dashboard.controller.ts
│   │   ├── events/
│   │   │   ├── queue-consumer.ts
│   │   │   └── handlers/
│   │   │       ├── accounting-events.handler.ts
│   │   │       ├── inventory-events.handler.ts
│   │   │       ├── sales-events.handler.ts
│   │   │       └── payment-events.handler.ts
│   │   ├── storage/
│   │   │   └── r2-storage.adapter.ts
│   │   ├── cache/
│   │   │   └── kv-cache.adapter.ts
│   │   ├── export/
│   │   │   ├── pdf-exporter.ts
│   │   │   ├── excel-exporter.ts
│   │   │   └── csv-exporter.ts
│   │   └── scheduled/
│   │       ├── daily-aggregation.cron.ts
│   │       ├── monthly-aggregation.cron.ts
│   │       ├── report-scheduler.cron.ts
│   │       └── cache-warmup.cron.ts
│   └── index.ts
├── migrations/
│   ├── 0001_create_report_definitions.sql
│   ├── 0002_create_journal_archive.sql
│   ├── 0003_create_asset_archive.sql
│   ├── 0004_create_inventory_archive.sql
│   ├── 0005_create_sales_archive.sql
│   ├── 0006_create_payment_archive.sql
│   ├── 0007_create_daily_aggregates.sql
│   ├── 0008_create_monthly_aggregates.sql
│   ├── 0009_create_report_instances.sql
│   ├── 0010_create_scheduled_reports.sql
│   └── seed_report_definitions.sql
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   └── application/
│   └── integration/
│       ├── event-handlers/
│       └── reports/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

---

## Integration with Other Services

### Cloudflare Workers Configuration

```toml
# wrangler.toml
name = "reporting-service"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "kidkazz-reporting-db"
database_id = "reporting-db-id"

[[r2_buckets]]
binding = "REPORTS_BUCKET"
bucket_name = "kidkazz-reports"

[[kv_namespaces]]
binding = "CACHE"
id = "reporting-cache-id"

[[queues.consumers]]
queue = "reporting-events"
max_batch_size = 100
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "reporting-events-dlq"

[triggers]
crons = [
  "0 2 * * *",    # Daily aggregation at 2 AM
  "0 3 1 * *",    # Monthly aggregation on 1st at 3 AM
  "*/5 * * * *"   # Report scheduler check every 5 minutes
]
```

### Service Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SERVICE DEPENDENCIES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Reporting Service                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Consumes Events From:                                              │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ Accounting  │ │  Inventory  │ │    Sales    │ │   Payment   │   │   │
│  │  │   Service   │ │   Service   │ │   Service   │ │   Service   │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  │                                                                     │   │
│  │  Uses Infrastructure:                                               │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │     D1      │ │     R2      │ │     KV      │ │   Queues    │   │   │
│  │  │  (Storage)  │ │  (Reports)  │ │   (Cache)   │ │  (Events)   │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  │                                                                     │   │
│  │  Integrates With:                                                   │   │
│  │  ┌─────────────┐ ┌─────────────┐                                   │   │
│  │  │ Notification│ │    User     │                                   │   │
│  │  │   Service   │ │   Service   │                                   │   │
│  │  │(Delivery)   │ │ (Auth/RBAC) │                                   │   │
│  │  └─────────────┘ └─────────────┘                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### Query Optimization

1. **Use Pre-Aggregated Data**: Query daily/monthly aggregates instead of raw archives for dashboard and summary reports
2. **Partition by Time**: Archive tables indexed by fiscal_year, fiscal_month for efficient date range queries
3. **Denormalized Schema**: Product names, category names stored with transactions for faster queries
4. **Limit Result Sets**: Always paginate large result sets, default limit = 100

### Aggregation Strategy

1. **Daily Aggregation** (2 AM daily):
   - Sum daily financial transactions
   - Calculate daily sales metrics
   - Snapshot inventory levels

2. **Monthly Aggregation** (1st of month at 3 AM):
   - Sum monthly depreciation
   - Calculate monthly asset values
   - Aggregate monthly sales

3. **On-Demand Aggregation**:
   - Year-to-date calculations
   - Custom date range reports

### Storage Management

1. **Archive Data**: Keep raw data for audit, use aggregates for reporting
2. **Report Cleanup**: Auto-delete generated reports after 7 days
3. **Batch Archival**: Process events in batches of 100 for efficiency

---

## Security & Access Control

### RBAC Integration

```typescript
const ReportPermissions = {
  // Financial reports
  'report:financial:read': 'View financial reports',
  'report:financial:export': 'Export financial reports',

  // Asset reports
  'report:asset:read': 'View asset reports',
  'report:asset:export': 'Export asset reports',

  // Inventory reports
  'report:inventory:read': 'View inventory reports',
  'report:inventory:export': 'Export inventory reports',

  // Sales reports
  'report:sales:read': 'View sales reports',
  'report:sales:export': 'Export sales reports',

  // Dashboard
  'report:dashboard:read': 'View dashboards',

  // Administration
  'report:definition:manage': 'Manage report definitions',
  'report:schedule:manage': 'Manage scheduled reports',
};

// Role mappings
const RolePermissions = {
  'OWNER': ['report:*'],
  'FINANCE_MANAGER': ['report:financial:*', 'report:asset:*', 'report:dashboard:read'],
  'WAREHOUSE_MANAGER': ['report:inventory:*', 'report:dashboard:read'],
  'SALES_MANAGER': ['report:sales:*', 'report:dashboard:read'],
  'ACCOUNTANT': ['report:financial:read', 'report:asset:read'],
  'STAFF': ['report:dashboard:read'],
};
```

---

**Version**: 1.0
**Last Updated**: 2025-01-16
**Author**: Claude AI Assistant

For related documentation, see:
- [Accounting Service Architecture](../accounting/ACCOUNTING_SERVICE_ARCHITECTURE.md)
- [Asset Accounting Architecture](../accounting/ASSET_ACCOUNTING_ARCHITECTURE.md)
- [Inventory Service Architecture](../inventory/INVENTORY_SERVICE_ARCHITECTURE.md)
- [Sales Service Architecture](../sales/SALES_SERVICE_ARCHITECTURE.md)
