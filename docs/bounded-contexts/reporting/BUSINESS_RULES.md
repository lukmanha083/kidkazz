# Reporting Service Business Rules

## Overview

This document defines the business rules governing the Reporting Service, which handles data archival, aggregation, and report generation for the Kidkazz ERP system. The service implements the Query side of CQRS pattern and serves as the analytical (OLAP) complement to the transactional (OLTP) services.

---

## Table of Contents

1. [Data Archival Rules](#data-archival-rules)
2. [Data Retention Rules](#data-retention-rules)
3. [Data Purging Rules](#data-purging-rules)
4. [Aggregation Rules](#aggregation-rules)
4. [Report Generation Rules](#report-generation-rules)
5. [Report Scheduling Rules](#report-scheduling-rules)
6. [Financial Report Rules](#financial-report-rules)
7. [Asset Report Rules](#asset-report-rules)
8. [Inventory Report Rules](#inventory-report-rules)
9. [Sales Report Rules](#sales-report-rules)
10. [Dashboard Rules](#dashboard-rules)
11. [Export Rules](#export-rules)
12. [Caching Rules](#caching-rules)
13. [Access Control Rules](#access-control-rules)
14. [Audit & Compliance Rules](#audit--compliance-rules)

---

## Data Archival Rules

### Rule 1: Event-Driven Archival
**Description**: All data archival MUST be triggered by domain events from upstream services.

**Rationale**: Ensures eventual consistency and decouples reporting from transactional systems.

**Implementation**:
```typescript
// Correct - Event-driven archival
async handleJournalEntryPosted(event: JournalEntryPostedEvent): Promise<void> {
  await this.journalArchiveRepository.archive(event.data);
}

// Wrong - Direct database sync
async syncFromAccounting(): Promise<void> {
  // ❌ Never directly query transactional databases
}
```

---

### Rule 2: Idempotent Archival
**Description**: Archival operations MUST be idempotent - processing the same event twice MUST NOT create duplicate records.

**Rationale**: Events may be delivered multiple times due to retries.

**Implementation**:
```sql
-- Use UNIQUE constraint on original ID
UNIQUE(original_entry_id, account_id)

-- Upsert pattern
INSERT OR REPLACE INTO journal_archive (...)
```

---

### Rule 3: Denormalization on Archive
**Description**: Archive records MUST include denormalized reference data (names, codes) at the time of archival.

**Rationale**: Prevents dependency on other services for historical reports; captures point-in-time state.

**Implementation**:
```typescript
interface JournalArchive {
  // Include resolved names, not just IDs
  account_id: string;
  account_code: string;     // ✅ Denormalized
  account_name: string;     // ✅ Denormalized
  account_type: string;     // ✅ Denormalized
}
```

---

### Rule 4: Time Dimension Enrichment
**Description**: All archive records MUST include computed time dimensions (fiscal_year, fiscal_month, fiscal_quarter, day_of_week).

**Rationale**: Enables efficient time-based aggregation and filtering.

**Implementation**:
```typescript
function enrichTimeDimensions(date: Date): TimeDimensions {
  return {
    fiscal_year: date.getFullYear(),
    fiscal_month: date.getMonth() + 1,
    fiscal_quarter: Math.ceil((date.getMonth() + 1) / 3),
    day_of_week: date.getDay(),
    hour_of_day: date.getHours()
  };
}
```

---

### Rule 5: Archive Timestamp
**Description**: Every archive record MUST include an `archived_at` timestamp indicating when it was archived.

**Rationale**: Enables audit trail and troubleshooting of archival delays.

---

## Data Retention Rules

### Rule 6: Transactional Service Retention
**Description**: Transactional services (Accounting, Inventory, Sales) SHOULD retain data for current fiscal year plus one previous year (maximum 2 years).

**Rationale**: Keeps transactional databases within D1's 10GB limit while ensuring recent data is available.

**Policy**:
| Data Type | Transactional Service | Reporting Service |
|-----------|----------------------|-------------------|
| Journal Entries | Current + 1 year | Unlimited |
| Asset Records | All active + 1 year disposed | Unlimited |
| Inventory Movements | Current + 1 year | Unlimited |
| Sales Transactions | Current + 1 year | Unlimited |

---

### Rule 7: Reporting Service Retention
**Description**: Reporting Service MUST retain historical data for **minimum 7 years** to comply with Indonesian tax law (UU KUP Article 28).

**Rationale**: Indonesian tax regulations require 7-year record retention for financial documents.

**Retention Policy**:
| Data Type | Minimum Retention | Can Purge After |
|-----------|-------------------|-----------------|
| Journal Archive | 7 years | Yes, after 7 years |
| Asset Archive | 7 years | Yes, after 7 years |
| Inventory Archive | 7 years | Yes, after 7 years |
| Sales Archive | 7 years | Yes, after 7 years |
| Payment Archive | 7 years | Yes, after 7 years |
| Daily Aggregates | 7 years | Yes, after 7 years |
| Monthly Aggregates | 10 years | Optional (small size) |

---

### Rule 8: Generated Report Retention
**Description**: Generated report files (PDF, Excel) MUST be retained for 7 days, then auto-deleted.

**Rationale**: Balances storage costs with user convenience for re-downloading reports.

**Implementation**:
```typescript
const reportInstance = {
  expiresAt: addDays(new Date(), 7),
  // R2 lifecycle rule handles cleanup
};
```

---

## Data Purging Rules

### Rule 9: 7-Year Purge Policy
**Description**: Data older than 7 years MAY be permanently deleted to manage D1's 10GB storage limit.

**Rationale**: Indonesian tax law (UU KUP Article 28, PMK 96/PMK.03/2009) requires 7-year retention. After this period, data can be legally purged.

**Purge Eligibility**:
```typescript
function isPurgeEligible(record: ArchiveRecord): boolean {
  const currentYear = new Date().getFullYear();
  const recordYear = record.fiscal_year;
  const yearsOld = currentYear - recordYear;

  // Can only purge if > 7 years old
  return yearsOld > 7;
}
```

---

### Rule 10: Purge Trigger Threshold
**Description**: Automatic purge process SHOULD be triggered when database reaches **80% capacity (8GB)**.

**Rationale**: Proactive purging prevents database from reaching hard limit.

**Thresholds**:
| Level | Capacity | Action |
|-------|----------|--------|
| Normal | < 70% (7GB) | No action |
| Warning | 70-80% (7-8GB) | Alert admin, prepare purge |
| Critical | 80-90% (8-9GB) | Auto-trigger purge of oldest eligible data |
| Emergency | > 90% (9GB) | Aggressive purge, pause non-critical archival |

**Implementation**:
```typescript
async checkStorageAndPurge(): Promise<void> {
  const usage = await this.getDatabaseSize();
  const capacityPercent = (usage / (10 * 1024 * 1024 * 1024)) * 100;

  if (capacityPercent >= 80) {
    await this.purgeOldestEligibleData();
  }
}
```

---

### Rule 11: Purge Priority Order
**Description**: When purging, data MUST be deleted in this priority order (oldest first within each category):

1. **Daily aggregates** older than 7 years (can be recalculated from monthly if needed)
2. **Inventory archive** older than 7 years
3. **Sales archive** older than 7 years
4. **Payment archive** older than 7 years
5. **Journal archive** older than 7 years (last priority - most critical for audit)
6. **Asset archive** older than 7 years

**Rationale**: Prioritizes keeping financial audit trail as long as possible.

---

### Rule 12: Pre-Purge Summary Generation
**Description**: Before purging any fiscal year data, system MUST generate and store a **Year-End Summary Report** that includes:
- Total revenue, expenses, net income
- Asset values and depreciation totals
- Inventory valuation summary
- Key metrics and KPIs

**Rationale**: Preserves essential historical summaries even after detail data is purged.

**Implementation**:
```typescript
async purgeYear(fiscalYear: number): Promise<void> {
  // Step 1: Check eligibility
  if (!this.isPurgeEligible(fiscalYear)) {
    throw new Error(`Year ${fiscalYear} is not eligible for purge (< 7 years)`);
  }

  // Step 2: Generate and store year-end summary
  const summary = await this.generateYearEndSummary(fiscalYear);
  await this.storeYearEndSummary(fiscalYear, summary);

  // Step 3: Purge detail data
  await this.purgeYearData(fiscalYear);

  // Step 4: Log purge action
  await this.logPurgeAction(fiscalYear);
}
```

---

### Rule 13: Purge Audit Trail
**Description**: All purge operations MUST be logged with:
- Purge date and time
- Fiscal year(s) purged
- Record counts deleted by table
- User/system that initiated purge
- Reason (automatic threshold or manual request)

**Rationale**: Maintains audit trail of data deletion for compliance.

**Implementation**:
```sql
CREATE TABLE purge_audit_log (
  id TEXT PRIMARY KEY,
  purge_date TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  records_deleted INTEGER NOT NULL,
  initiated_by TEXT NOT NULL,       -- 'SYSTEM' or user_id
  reason TEXT NOT NULL,             -- 'THRESHOLD_80', 'MANUAL', etc.
  year_end_summary_id TEXT,         -- Reference to preserved summary
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### Rule 14: Manual Purge Authorization
**Description**: Manual purge requests MUST be authorized by OWNER role and require confirmation.

**Rationale**: Prevents accidental data loss.

**Implementation**:
```typescript
async requestManualPurge(
  fiscalYear: number,
  userId: string,
  confirmationCode: string
): Promise<void> {
  // Verify OWNER role
  const user = await this.userService.getUser(userId);
  if (user.role !== 'OWNER') {
    throw new UnauthorizedError('Only OWNER can initiate manual purge');
  }

  // Verify confirmation code (sent via email/SMS)
  if (!this.verifyConfirmationCode(confirmationCode)) {
    throw new InvalidConfirmationError();
  }

  await this.purgeYear(fiscalYear);
}
```

---

### Rule 15: Purge Exclusions
**Description**: The following data MUST NOT be purged regardless of age:
- Year-end summary reports (permanent)
- Purge audit logs (permanent)
- Monthly aggregates (optional, kept for 10 years - small footprint)
- Active/disposed assets still on books (until 7 years after disposal)

**Rationale**: Preserves essential historical reference and audit trail.

---

### Rule 16: Database Size Monitoring
**Description**: Database size MUST be monitored daily and alerts sent when:
- 70% capacity: Email notification to admin
- 80% capacity: Email + in-app notification
- 90% capacity: Urgent alert + auto-purge triggered

**Implementation**:
```typescript
// Cron job at 3 AM daily
async monitorDatabaseSize(): Promise<void> {
  const sizeBytes = await this.getDatabaseSize();
  const sizeGB = sizeBytes / (1024 * 1024 * 1024);
  const percentUsed = (sizeGB / 10) * 100;

  if (percentUsed >= 90) {
    await this.sendUrgentAlert(sizeGB, percentUsed);
    await this.triggerAutoPurge();
  } else if (percentUsed >= 80) {
    await this.sendWarningAlert(sizeGB, percentUsed);
  } else if (percentUsed >= 70) {
    await this.sendInfoAlert(sizeGB, percentUsed);
  }

  // Log daily size for trend analysis
  await this.logDatabaseSize(sizeGB, percentUsed);
}
```

---

## Aggregation Rules

### Rule 17: Daily Aggregation Schedule
**Description**: Daily aggregates MUST be computed at 2:00 AM Jakarta time (UTC+7) for the previous day.

**Rationale**: Ensures all transactions from the previous day are captured; runs during low-traffic hours.

**Implementation**:
```toml
# wrangler.toml
[triggers]
crons = ["0 2 * * *"]  # 2 AM daily (server time, adjust for Jakarta)
```

---

### Rule 18: Monthly Aggregation Schedule
**Description**: Monthly aggregates MUST be computed on the 1st of each month at 3:00 AM Jakarta time for the previous month.

**Rationale**: Allows all end-of-month transactions to be processed.

---

### Rule 19: Aggregate Versioning
**Description**: Daily aggregates MUST include a version number, incremented on re-computation.

**Rationale**: Enables tracking of aggregate corrections and audit trail.

**Implementation**:
```sql
ALTER TABLE daily_financial_aggregate
ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- On re-computation
UPDATE daily_financial_aggregate
SET version = version + 1, aggregated_at = CURRENT_TIMESTAMP
WHERE date = ?;
```

---

### Rule 20: Aggregate Recalculation
**Description**: Aggregates MUST be recalculated when late-arriving events are processed or corrections are made.

**Rationale**: Ensures aggregate accuracy even when source data is corrected.

**Trigger Conditions**:
- Journal entry voided/corrected affecting past periods
- Late payment settlement
- Inventory adjustment backdated

---

### Rule 21: Aggregate Consistency Check
**Description**: Monthly close process MUST verify that daily aggregates sum correctly to monthly totals.

**Rationale**: Detects aggregation errors before financial close.

---

## Report Generation Rules

### Rule 22: Asynchronous Generation
**Description**: Reports with more than 1,000 expected rows MUST be generated asynchronously (queued).

**Rationale**: Prevents request timeouts; provides better UX with progress tracking.

**Implementation**:
```typescript
async generateReport(request: ReportRequest): Promise<ReportInstance> {
  const estimatedRows = await this.estimateRowCount(request);

  if (estimatedRows > 1000) {
    return this.queueReportGeneration(request);  // Async
  } else {
    return this.generateImmediate(request);       // Sync
  }
}
```

---

### Rule 23: Report Instance Lifecycle
**Description**: Report instances MUST follow the lifecycle: QUEUED → PROCESSING → COMPLETED/FAILED → EXPIRED.

**State Transitions**:
```
┌────────┐     ┌────────────┐     ┌───────────┐
│ QUEUED │────►│ PROCESSING │────►│ COMPLETED │────► EXPIRED (after 7 days)
└────────┘     └────────────┘     └───────────┘
                     │
                     │ (on error)
                     ▼
               ┌────────┐
               │ FAILED │
               └────────┘
```

---

### Rule 24: Report Generation Timeout
**Description**: Report generation MUST timeout after 5 minutes and be marked as FAILED.

**Rationale**: Prevents resource exhaustion from runaway queries.

---

### Rule 25: Row Count Limit
**Description**: Individual report instances MUST NOT exceed 100,000 rows.

**Rationale**: Prevents memory issues; encourages users to narrow date ranges.

**Implementation**:
```typescript
if (rowCount > 100000) {
  throw new ReportTooLargeError(
    'Report exceeds 100,000 rows. Please narrow the date range or add filters.'
  );
}
```

---

### Rule 26: Prefer Aggregates Over Raw Data
**Description**: Report queries MUST use pre-aggregated data when available instead of raw archive tables.

**Rationale**: Dramatically improves query performance.

**Decision Matrix**:
| Report Type | Data Source |
|-------------|-------------|
| Daily summary | daily_*_aggregate |
| Monthly summary | monthly_*_aggregate or sum(daily_*_aggregate) |
| Detail drill-down | *_archive |
| Trend analysis | daily_*_aggregate |

---

## Report Scheduling Rules

### Rule 27: Schedule Validation
**Description**: Scheduled report cron expressions MUST be validated for:
- Minimum interval of 1 hour between runs
- Maximum of 10 scheduled reports per user
- Valid cron syntax

**Rationale**: Prevents resource abuse and ensures system stability.

---

### Rule 28: Relative Date Ranges
**Description**: Scheduled reports MUST use relative date ranges (PREVIOUS_MONTH, YEAR_TO_DATE), not fixed dates.

**Rationale**: Ensures scheduled reports remain relevant over time.

**Valid Date Range Types**:
```typescript
type DateRangeType =
  | 'PREVIOUS_DAY'
  | 'PREVIOUS_WEEK'
  | 'PREVIOUS_MONTH'
  | 'PREVIOUS_QUARTER'
  | 'PREVIOUS_YEAR'
  | 'MONTH_TO_DATE'
  | 'QUARTER_TO_DATE'
  | 'YEAR_TO_DATE';
```

---

### Rule 29: Schedule Failure Handling
**Description**: If a scheduled report fails 3 consecutive times, it MUST be automatically deactivated and owner notified.

**Rationale**: Prevents repeated failures from consuming resources.

---

### Rule 30: Delivery Confirmation
**Description**: Scheduled report delivery MUST be confirmed; failed deliveries MUST be retried up to 3 times.

**Rationale**: Ensures reports reach recipients.

---

## Financial Report Rules

### Rule 31: Double-Entry Verification
**Description**: Income Statement and Balance Sheet reports MUST verify that total debits equal total credits for the reporting period.

**Rationale**: Fundamental accounting principle; detects data integrity issues.

**Implementation**:
```typescript
async generateIncomeStatement(period: FiscalPeriod): Promise<IncomeStatement> {
  const totals = await this.verifyDoubleEntry(period);
  if (Math.abs(totals.debit - totals.credit) > 0.01) {
    throw new AccountingImbalanceError(
      `Imbalance detected: Debit ${totals.debit}, Credit ${totals.credit}`
    );
  }
  // Continue with report generation
}
```

---

### Rule 32: Account Type Classification
**Description**: Financial reports MUST classify accounts by type:
- **Balance Sheet**: Asset, Liability, Equity
- **Income Statement**: Revenue, COGS, Expense

**Account Type Hierarchy**:
```
Balance Sheet                    Income Statement
├── Assets                       ├── Revenue
│   ├── Current Assets           │   ├── Sales Revenue
│   └── Fixed Assets             │   └── Other Revenue
├── Liabilities                  ├── Cost of Goods Sold
│   ├── Current Liabilities      └── Expenses
│   └── Long-term Liabilities        ├── Operating Expenses
└── Equity                           └── Other Expenses
```

---

### Rule 33: Comparative Reporting
**Description**: Financial reports MUST support comparison with previous period (month, quarter, year).

**Rationale**: Enables trend analysis and variance reporting.

**Output Format**:
```typescript
interface IncomeStatementLine {
  accountCode: string;
  accountName: string;
  currentPeriod: number;
  previousPeriod: number;
  variance: number;
  variancePercentage: number;
}
```

---

### Rule 34: Currency Consistency
**Description**: All financial reports MUST use Indonesian Rupiah (IDR) as the base currency.

**Rationale**: Kidkazz operates in Indonesia; all transactions are in IDR.

---

## Asset Report Rules

### Rule 35: Asset Register Completeness
**Description**: Asset Register report MUST include ALL assets (active, fully depreciated, disposed) with status filter.

**Rationale**: Provides complete asset history for audit.

---

### Rule 36: Depreciation Report Accuracy
**Description**: Depreciation reports MUST reconcile with:
- Monthly depreciation journal entries
- Asset book values
- Accumulated depreciation totals

**Verification**:
```typescript
const journalDepreciation = await this.getJournalDepreciationTotal(period);
const assetDepreciation = await this.getAssetDepreciationTotal(period);

if (Math.abs(journalDepreciation - assetDepreciation) > 0.01) {
  this.logReconciliationWarning(period, journalDepreciation, assetDepreciation);
}
```

---

### Rule 37: Tax Depreciation Reporting
**Description**: Asset reports MUST support Indonesian tax depreciation (PMK 96/PMK.03/2009) calculations separately from book depreciation.

**Tax Asset Groups**:
| Group | Assets | Tax Useful Life |
|-------|--------|-----------------|
| 1 | Office equipment, computers | 4 years |
| 2 | Vehicles, machinery | 8 years |
| 3 | Heavy equipment | 16 years |
| 4 | Buildings (permanent) | 20 years |

---

### Rule 38: Disposal Gain/Loss Calculation
**Description**: Asset Disposal report MUST calculate and report gain/loss correctly:
- **Gain** = Disposal Proceeds - Book Value (if positive)
- **Loss** = Book Value - Disposal Proceeds (if negative)

---

## Inventory Report Rules

### Rule 39: Valuation Method Consistency
**Description**: Inventory Valuation reports MUST use consistent costing method (FIFO, Weighted Average) as configured.

**Rationale**: Ensures comparable valuations across periods.

---

### Rule 40: Stock Snapshot Point-in-Time
**Description**: Stock Valuation report MUST reflect inventory levels as of the specified date, not current levels.

**Implementation**:
```sql
-- Get inventory as of specific date from daily snapshots
SELECT * FROM daily_inventory_snapshot
WHERE date = ? AND warehouse_id = ?;
```

---

### Rule 41: Negative Stock Highlighting
**Description**: Inventory reports MUST highlight any negative stock quantities in red/warning.

**Rationale**: Negative stock indicates data issues that need investigation.

---

### Rule 42: Expiry Warning Thresholds
**Description**: Expiring Stock report MUST use configurable warning thresholds:
- **Critical**: Expiring within 7 days (red)
- **Warning**: Expiring within 30 days (yellow)
- **Notice**: Expiring within 90 days (blue)

---

### Rule 43: Inventory Movement Reconciliation
**Description**: Stock Movement reports MUST reconcile:
- Opening Balance + Movements = Closing Balance

**Implementation**:
```typescript
const opening = await this.getOpeningBalance(productId, warehouseId, startDate);
const movements = await this.getMovements(productId, warehouseId, dateRange);
const calculated = opening + movements.totalIn - movements.totalOut;
const actual = await this.getClosingBalance(productId, warehouseId, endDate);

if (Math.abs(calculated - actual) > 0.001) {
  this.logReconciliationError(productId, warehouseId, calculated, actual);
}
```

---

## Sales Report Rules

### Rule 44: Channel Segregation
**Description**: Sales reports MUST support filtering and grouping by sales channel (POS, ECOMMERCE, WHOLESALE, MOBILE).

**Rationale**: Enables channel-specific performance analysis.

---

### Rule 45: Margin Calculation
**Description**: Sales Margin reports MUST calculate:
- **Gross Margin** = Revenue - COGS
- **Gross Margin %** = (Gross Margin / Revenue) × 100

**Implementation**:
```typescript
interface MarginReport {
  revenue: number;
  cogs: number;
  grossMargin: number;
  grossMarginPercentage: number;
}

function calculateMargin(revenue: number, cogs: number): MarginReport {
  const grossMargin = revenue - cogs;
  const percentage = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
  return { revenue, cogs, grossMargin, grossMarginPercentage: percentage };
}
```

---

### Rule 46: Customer Segmentation
**Description**: Customer Analysis reports MUST segment by:
- Customer type (RETAIL, WHOLESALE)
- Purchase frequency (New, Occasional, Regular, VIP)
- Purchase value tier

**Frequency Classification**:
| Segment | Criteria |
|---------|----------|
| New | First purchase in period |
| Occasional | 1-2 purchases in 90 days |
| Regular | 3-5 purchases in 90 days |
| VIP | 6+ purchases in 90 days OR total > Rp 10,000,000 |

---

### Rule 47: Sales Tax Reporting
**Description**: Sales reports MUST track and report VAT (PPN) collected.

**Rationale**: Required for Indonesian tax compliance.

---

## Dashboard Rules

### Rule 48: Real-Time vs Cached Data
**Description**: Dashboard data MUST indicate data freshness:
- Real-time data: < 5 minutes old
- Cached data: Display last updated timestamp

**Implementation**:
```typescript
interface DashboardResponse {
  data: DashboardData;
  lastUpdated: Date;
  isRealTime: boolean;  // true if < 5 minutes old
}
```

---

### Rule 49: Executive Dashboard KPIs
**Description**: Executive Dashboard MUST include these KPIs:
- Today's revenue and order count
- Month-to-date revenue vs previous month
- Year-to-date revenue and net income
- Top 5 products by revenue
- Low stock and expiring inventory alerts

---

### Rule 50: Dashboard Drill-Down
**Description**: Dashboard cards MUST support drill-down to detailed reports.

**Implementation**:
```typescript
interface DashboardCard {
  title: string;
  value: number;
  trend: 'up' | 'down' | 'flat';
  drillDownReportCode: string;  // e.g., "RPT-SALES-001"
  drillDownParams: ReportParameters;
}
```

---

## Export Rules

### Rule 51: Export Format Support
**Description**: All reports MUST support export to:
- PDF (for printing/sharing)
- Excel (for analysis)
- CSV (for data integration)

---

### Rule 52: Excel Export Formatting
**Description**: Excel exports MUST include:
- Formatted headers (bold, background color)
- Number formatting (currency, percentages)
- Column auto-width
- Filter-enabled headers
- Report title and generation date

---

### Rule 53: PDF Export Formatting
**Description**: PDF exports MUST include:
- Company header with logo
- Report title and date range
- Page numbers
- Generation timestamp
- Totals/subtotals formatting

---

### Rule 54: Large Export Handling
**Description**: Exports exceeding 10,000 rows MUST be:
- Generated asynchronously
- Compressed (ZIP) for download
- Notification sent when ready

---

## Caching Rules

### Rule 55: Cache TTL by Data Type
**Description**: Cache TTL MUST be configured by data type:

| Data Type | Cache TTL | Rationale |
|-----------|-----------|-----------|
| Dashboard data | 5 minutes | Balance freshness vs performance |
| Daily aggregates | 15 minutes | Updated once daily |
| Monthly aggregates | 1 hour | Updated once monthly |
| Report definitions | 1 hour | Rarely changes |
| Historical reports | 24 hours | Data doesn't change |

---

### Rule 56: Cache Invalidation
**Description**: Cache MUST be invalidated when:
- Aggregates are recalculated
- Report definitions are updated
- Manual refresh is requested

---

### Rule 57: Cache Warming
**Description**: Common dashboard data MUST be pre-cached at 2:30 AM after daily aggregation completes.

**Rationale**: Ensures fast dashboard loading when users arrive in the morning.

---

## Access Control Rules

### Rule 58: Role-Based Report Access
**Description**: Report access MUST be controlled by user role:

| Role | Accessible Reports |
|------|-------------------|
| OWNER | All reports |
| FINANCE_MANAGER | Financial, Asset, Dashboard |
| WAREHOUSE_MANAGER | Inventory, Dashboard |
| SALES_MANAGER | Sales, Dashboard |
| ACCOUNTANT | Financial (read-only), Asset (read-only) |
| STAFF | Dashboard only |

---

### Rule 59: Data Scope Restriction
**Description**: Users MUST only see data within their authorized scope:
- Warehouse managers see only their warehouse data
- Store managers see only their store data
- Regional managers see regional data

**Implementation**:
```typescript
async generateReport(request: ReportRequest, user: User): Promise<ReportInstance> {
  const scopedRequest = this.applyScopeRestrictions(request, user);
  return this.generateReportInternal(scopedRequest);
}
```

---

### Rule 60: Export Audit Trail
**Description**: All report exports MUST be logged with:
- User ID
- Report type
- Parameters
- Export format
- Timestamp

**Rationale**: Enables audit of sensitive data access.

---

## Audit & Compliance Rules

### Rule 61: Financial Report Audit Trail
**Description**: Financial reports (P&L, Balance Sheet) MUST maintain generation audit trail for 7 years.

**Rationale**: Indonesian tax law requires 7-year record retention.

---

### Rule 62: Report Parameter Immutability
**Description**: Once a report instance is COMPLETED, its parameters and output MUST NOT be modified.

**Rationale**: Ensures report integrity for audit purposes.

---

### Rule 63: Data Integrity Verification
**Description**: Monthly close process MUST run data integrity checks:
- Journal debit/credit balance
- Asset depreciation reconciliation
- Inventory movement reconciliation
- Sales/payment reconciliation

---

### Rule 64: Anomaly Detection
**Description**: Reports MUST flag anomalies:
- Unusual transaction volumes (>3 standard deviations)
- Large value transactions (>Rp 100,000,000)
- Negative balances where unexpected
- Missing expected data

---

## Summary Table

| # | Rule | Category | Severity |
|---|------|----------|----------|
| 1 | Event-Driven Archival | Data Archival | Critical |
| 2 | Idempotent Archival | Data Archival | Critical |
| 3 | Denormalization on Archive | Data Archival | Required |
| 4 | Time Dimension Enrichment | Data Archival | Required |
| 5 | Archive Timestamp | Data Archival | Required |
| 6 | Transactional Service Retention | Data Retention | Required |
| 7 | Reporting Service Retention (7 Years) | Data Retention | Required |
| 8 | Generated Report Retention | Data Retention | Standard |
| 9 | 7-Year Purge Policy | Data Purging | Critical |
| 10 | Purge Trigger Threshold (80%) | Data Purging | Required |
| 11 | Purge Priority Order | Data Purging | Required |
| 12 | Pre-Purge Summary Generation | Data Purging | Critical |
| 13 | Purge Audit Trail | Data Purging | Required |
| 14 | Manual Purge Authorization | Data Purging | Critical |
| 15 | Purge Exclusions | Data Purging | Required |
| 16 | Database Size Monitoring | Data Purging | Required |
| 17 | Daily Aggregation Schedule | Aggregation | Required |
| 18 | Monthly Aggregation Schedule | Aggregation | Required |
| 19 | Aggregate Versioning | Aggregation | Standard |
| 20 | Aggregate Recalculation | Aggregation | Required |
| 21 | Aggregate Consistency Check | Aggregation | Required |
| 22 | Asynchronous Generation | Report Generation | Required |
| 23 | Report Instance Lifecycle | Report Generation | Required |
| 24 | Report Generation Timeout | Report Generation | Required |
| 25 | Row Count Limit | Report Generation | Required |
| 26 | Prefer Aggregates Over Raw Data | Report Generation | Required |
| 27 | Schedule Validation | Report Scheduling | Required |
| 28 | Relative Date Ranges | Report Scheduling | Required |
| 29 | Schedule Failure Handling | Report Scheduling | Standard |
| 30 | Delivery Confirmation | Report Scheduling | Standard |
| 31 | Double-Entry Verification | Financial Report | Critical |
| 32 | Account Type Classification | Financial Report | Required |
| 33 | Comparative Reporting | Financial Report | Required |
| 34 | Currency Consistency | Financial Report | Required |
| 35 | Asset Register Completeness | Asset Report | Required |
| 36 | Depreciation Report Accuracy | Asset Report | Critical |
| 37 | Tax Depreciation Reporting | Asset Report | Required |
| 38 | Disposal Gain/Loss Calculation | Asset Report | Required |
| 39 | Valuation Method Consistency | Inventory Report | Required |
| 40 | Stock Snapshot Point-in-Time | Inventory Report | Required |
| 41 | Negative Stock Highlighting | Inventory Report | Standard |
| 42 | Expiry Warning Thresholds | Inventory Report | Standard |
| 43 | Inventory Movement Reconciliation | Inventory Report | Required |
| 44 | Channel Segregation | Sales Report | Required |
| 45 | Margin Calculation | Sales Report | Required |
| 46 | Customer Segmentation | Sales Report | Standard |
| 47 | Sales Tax Reporting | Sales Report | Required |
| 48 | Real-Time vs Cached Data | Dashboard | Required |
| 49 | Executive Dashboard KPIs | Dashboard | Required |
| 50 | Dashboard Drill-Down | Dashboard | Standard |
| 51 | Export Format Support | Export | Required |
| 52 | Excel Export Formatting | Export | Standard |
| 53 | PDF Export Formatting | Export | Standard |
| 54 | Large Export Handling | Export | Required |
| 55 | Cache TTL by Data Type | Caching | Required |
| 56 | Cache Invalidation | Caching | Required |
| 57 | Cache Warming | Caching | Standard |
| 58 | Role-Based Report Access | Access Control | Critical |
| 59 | Data Scope Restriction | Access Control | Critical |
| 60 | Export Audit Trail | Access Control | Required |
| 61 | Financial Report Audit Trail | Audit | Required |
| 62 | Report Parameter Immutability | Audit | Required |
| 63 | Data Integrity Verification | Audit | Required |
| 64 | Anomaly Detection | Audit | Standard |

---

**Version**: 1.0
**Last Updated**: 2025-01-16
**Total Rules**: 64

For implementation details, see:
- [Reporting Service Architecture](./REPORTING_SERVICE_ARCHITECTURE.md)
- [Reporting Service Implementation Plan](./REPORTING_IMPLEMENTATION_PLAN.md)
