# Accounting Service - Asset Accounting Implementation (Phases 5-9)

## Overview

This document describes the implementation of the Asset Accounting module for the KidKazz ERP accounting service. The module provides comprehensive fixed asset management including depreciation, disposal, and maintenance tracking.

**Branch**: `feature/asset-accounting-phases-5-9`
**Tests**: 276 passing
**Database**: Cloudflare D1 (Remote)

---

## Phase 5: Database Schema and Migration

### Database Tables

```sql
-- Asset Categories
CREATE TABLE asset_categories (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  default_useful_life_months INTEGER NOT NULL,
  default_depreciation_method TEXT NOT NULL,
  default_salvage_value_percent REAL NOT NULL DEFAULT 0,
  asset_account_id TEXT NOT NULL,
  accumulated_depreciation_account_id TEXT NOT NULL,
  depreciation_expense_account_id TEXT NOT NULL,
  gain_loss_on_disposal_account_id TEXT NOT NULL,
  tax_useful_life_months INTEGER,
  tax_depreciation_method TEXT,
  tax_asset_group TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Fixed Assets
CREATE TABLE fixed_assets (
  id TEXT PRIMARY KEY,
  asset_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL REFERENCES asset_categories(id),
  serial_number TEXT,
  barcode TEXT UNIQUE,
  manufacturer TEXT,
  model TEXT,
  location_id TEXT,
  department_id TEXT,
  assigned_to_user_id TEXT,
  acquisition_date TEXT NOT NULL,
  acquisition_method TEXT NOT NULL,
  acquisition_cost REAL NOT NULL,
  purchase_order_id TEXT,
  supplier_id TEXT,
  invoice_number TEXT,
  useful_life_months INTEGER NOT NULL,
  salvage_value REAL NOT NULL DEFAULT 0,
  depreciation_method TEXT NOT NULL,
  depreciation_start_date TEXT NOT NULL,
  accumulated_depreciation REAL NOT NULL DEFAULT 0,
  book_value REAL NOT NULL,
  last_depreciation_date TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  disposal_date TEXT,
  disposal_method TEXT,
  disposal_value REAL,
  disposal_reason TEXT,
  gain_loss_on_disposal REAL,
  insurance_policy_number TEXT,
  insurance_expiry_date TEXT,
  warranty_expiry_date TEXT,
  last_verified_at TEXT,
  last_verified_by TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Depreciation Schedules
CREATE TABLE depreciation_schedules (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  opening_book_value REAL NOT NULL,
  depreciation_amount REAL NOT NULL,
  closing_book_value REAL NOT NULL,
  accumulated_depreciation REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  journal_entry_id TEXT,
  calculated_at TEXT NOT NULL,
  posted_at TEXT,
  UNIQUE(asset_id, fiscal_year, fiscal_month)
);

-- Asset Movements
CREATE TABLE asset_movements (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),
  movement_type TEXT NOT NULL,
  from_location_id TEXT,
  to_location_id TEXT,
  from_department_id TEXT,
  to_department_id TEXT,
  from_user_id TEXT,
  to_user_id TEXT,
  movement_date TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  performed_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Asset Maintenance
CREATE TABLE asset_maintenance (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),
  maintenance_type TEXT NOT NULL,
  description TEXT NOT NULL,
  scheduled_date TEXT,
  performed_date TEXT,
  next_scheduled_date TEXT,
  cost REAL NOT NULL DEFAULT 0,
  is_capitalized INTEGER NOT NULL DEFAULT 0,
  extends_useful_life_months INTEGER DEFAULT 0,
  vendor_id TEXT,
  vendor_name TEXT,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Depreciation Runs
CREATE TABLE depreciation_runs (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  total_assets INTEGER NOT NULL,
  assets_depreciated INTEGER NOT NULL,
  assets_skipped INTEGER NOT NULL,
  total_depreciation REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'CALCULATED',
  journal_entry_id TEXT,
  calculated_at TEXT NOT NULL,
  posted_at TEXT,
  posted_by TEXT,
  UNIQUE(fiscal_year, fiscal_month)
);
```

### Migration File

Location: `services/accounting-service/migrations/0001_asset_accounting.sql`

---

## Phase 6: Domain Model Implementation

### Directory Structure

```
src/domain/
├── entities/
│   ├── asset-category.entity.ts
│   ├── fixed-asset.entity.ts
│   └── index.ts
├── value-objects/
│   └── asset-enums.ts
├── services/
│   └── depreciation-calculator.ts
└── repositories/
    └── asset.repositories.ts
```

### Value Objects (Enums)

```typescript
// Asset Status - Lifecycle states
enum AssetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  FULLY_DEPRECIATED = 'FULLY_DEPRECIATED',
  DISPOSED = 'DISPOSED',
  WRITTEN_OFF = 'WRITTEN_OFF',
  SUSPENDED = 'SUSPENDED',
}

// Depreciation Methods
enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
  SUM_OF_YEARS_DIGITS = 'SUM_OF_YEARS_DIGITS',
  UNITS_OF_PRODUCTION = 'UNITS_OF_PRODUCTION',
}

// Acquisition Methods
enum AcquisitionMethod {
  PURCHASE = 'PURCHASE',
  LEASE = 'LEASE',
  DONATION = 'DONATION',
  TRANSFER = 'TRANSFER',
  CONSTRUCTION = 'CONSTRUCTION',
}

// Disposal Methods
enum DisposalMethod {
  SALE = 'SALE',
  SCRAP = 'SCRAP',
  DONATION = 'DONATION',
  TRADE_IN = 'TRADE_IN',
  THEFT = 'THEFT',
  DESTRUCTION = 'DESTRUCTION',
}

// Movement Types
enum MovementType {
  TRANSFER = 'TRANSFER',
  ASSIGNMENT = 'ASSIGNMENT',
  DISPOSAL = 'DISPOSAL',
  REVALUATION = 'REVALUATION',
  IMPAIRMENT = 'IMPAIRMENT',
}

// Maintenance Types
enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  INSPECTION = 'INSPECTION',
  UPGRADE = 'UPGRADE',
  OVERHAUL = 'OVERHAUL',
}

// Maintenance Status
enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Tax Asset Groups (Indonesian PSAK 16)
enum TaxAssetGroup {
  GROUP_1 = 'GROUP_1',   // 4 years
  GROUP_2 = 'GROUP_2',   // 8 years
  GROUP_3 = 'GROUP_3',   // 16 years
  GROUP_4 = 'GROUP_4',   // 20 years
  NON_PERMANENT = 'NON_PERMANENT',
  PERMANENT = 'PERMANENT',
}
```

### Domain Services

#### Depreciation Calculator

```typescript
// Straight Line: (Cost - Salvage) / Useful Life
// Declining Balance: Book Value × (2 / Useful Life)
// Sum of Years Digits: (Cost - Salvage) × (Remaining Years / Sum of Years)

interface DepreciationInput {
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  bookValue: number;
  accumulatedDepreciation: number;
  periodMonths: number;
}

class DepreciationCalculatorFactory {
  static getCalculator(method: DepreciationMethod): IDepreciationCalculator;
}
```

### Entities

#### AssetCategory Entity

```typescript
AssetCategory.create({
  code: 'IT',
  name: 'IT Equipment',
  defaultUsefulLifeMonths: 48,
  defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
  defaultSalvageValuePercent: 5,
  assetAccountId: 'acc-1150',
  accumulatedDepreciationAccountId: 'acc-1145',
  depreciationExpenseAccountId: 'acc-6500',
  gainLossOnDisposalAccountId: 'acc-7100',
});
```

#### FixedAsset Entity

```typescript
// Create new asset
const asset = FixedAsset.create({
  assetNumber: 'AST-IT-2025-0001',
  name: 'Dell Laptop',
  categoryId: 'cat-it',
  acquisitionDate: new Date('2025-01-15'),
  acquisitionMethod: AcquisitionMethod.PURCHASE,
  acquisitionCost: 15000000,
  usefulLifeMonths: 48,
  salvageValue: 750000,
  depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
  depreciationStartDate: new Date('2025-02-01'),
  createdBy: 'user-001',
});

// Lifecycle methods
asset.activate();                    // DRAFT → ACTIVE
asset.applyDepreciation(amount, period);
asset.transfer({ locationId, departmentId, assignedToUserId });
asset.dispose({ method, value, reason, disposedBy });
asset.verify(verifiedBy);

// Queries
asset.isDepreciable();
asset.calculateMonthlyDepreciation();
```

---

## Phase 7: Category and Asset Management

### Repository Implementations

```
src/infrastructure/repositories/
├── asset-category.repository.ts
├── fixed-asset.repository.ts
└── index.ts
```

#### IAssetCategoryRepository

| Method | Description |
|--------|-------------|
| `findById(id)` | Get category by ID |
| `findByCode(code)` | Get category by code |
| `findAll(includeInactive?)` | List all categories |
| `save(category)` | Create or update |
| `delete(id)` | Delete category |

#### IFixedAssetRepository

| Method | Description |
|--------|-------------|
| `findById(id)` | Get asset by ID |
| `findByAssetNumber(number)` | Get by asset number |
| `findByBarcode(barcode)` | Get by barcode |
| `findAll(filter?, pagination?)` | Paginated list |
| `findByStatus(status)` | Filter by status |
| `findDepreciable()` | Get depreciable assets |
| `findByCategory(categoryId)` | Filter by category |
| `findByLocation(locationId)` | Filter by location |
| `save(asset)` | Create or update |
| `delete(id)` | Delete asset |
| `generateAssetNumber(categoryCode, date)` | Auto-generate number |

### Commands

| Command | Description |
|---------|-------------|
| `CreateAssetCategoryCommand` | Create new category |
| `UpdateAssetCategoryCommand` | Update category |
| `DeleteAssetCategoryCommand` | Delete category |
| `CreateAssetCommand` | Create new asset |
| `ActivateAssetCommand` | Activate draft asset |
| `UpdateAssetCommand` | Update asset details |
| `TransferAssetCommand` | Transfer location/assignment |
| `DisposeAssetCommand` | Dispose asset |

### API Endpoints

#### Asset Categories (`/api/v1/asset-categories`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all categories |
| GET | `/:id` | Get category by ID |
| POST | `/` | Create category |
| PUT | `/:id` | Update category |
| DELETE | `/:id` | Delete category |

#### Fixed Assets (`/api/v1/assets`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List assets (paginated) |
| GET | `/depreciable` | Get depreciable assets |
| GET | `/barcode/:barcode` | Get by barcode |
| GET | `/:id` | Get asset by ID |
| POST | `/` | Create asset |
| PUT | `/:id` | Update asset |
| POST | `/:id/activate` | Activate asset |
| POST | `/:id/transfer` | Transfer asset |
| POST | `/:id/dispose` | Dispose asset |

---

## Phase 8: Depreciation Engine

### Repository Implementations

```
src/infrastructure/repositories/
├── depreciation-schedule.repository.ts
├── depreciation-run.repository.ts
└── index.ts
```

### Depreciation Calculation Methods

#### Straight Line
```
Monthly = (Acquisition Cost - Salvage Value) / Useful Life Months
```

#### Declining Balance (Double)
```
Annual Rate = (12 / Useful Life Months) × 2
Annual Depreciation = Book Value × Annual Rate
Monthly = Annual Depreciation / 12
```
Simplified: `Monthly = Book Value × (2 / Useful Life Months)`

#### Sum of Years Digits
```
Sum = n(n+1)/2 where n = useful life years
Annual = (Cost - Salvage) × (Remaining Years / Sum)
Monthly = Annual / 12
```

#### Units of Production
> **Note**: Not yet implemented. Requires tracking of units produced per period.
```
Depreciation per Unit = (Cost - Salvage) / Total Expected Units
Period Depreciation = Depreciation per Unit × Units Produced
```

### Commands

| Command | Description |
|---------|-------------|
| `CalculateDepreciationCommand` | Calculate for period |
| `PostDepreciationCommand` | Post to GL with journal entry |
| `ReverseDepreciationCommand` | Reverse posted depreciation |

### Queries

| Query | Description |
|-------|-------------|
| `GetDepreciationPreviewQuery` | Preview before posting |
| `GetAssetDepreciationScheduleQuery` | Asset's schedule history |
| `GetDepreciationRunQuery` | Get run by ID |
| `ListDepreciationRunsQuery` | List all runs |
| `GetDepreciationRunByPeriodQuery` | Get run by period |

### API Endpoints (`/api/v1/depreciation`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/preview` | Preview depreciation calculation |
| POST | `/calculate` | Calculate depreciation for period |
| POST | `/post` | Post depreciation to GL |
| POST | `/reverse` | Reverse posted depreciation |
| GET | `/runs` | List depreciation runs |
| GET | `/runs/:id` | Get run by ID |
| GET | `/asset/:assetId/schedule` | Get asset schedule |

### Journal Entry Structure (Depreciation)

```
Debit:  Depreciation Expense (6500)     xxx
Credit: Accumulated Depreciation (1145)     xxx
```

---

## Phase 9: Disposal and Maintenance

### Repository Implementations

```
src/infrastructure/repositories/
├── asset-movement.repository.ts
├── asset-maintenance.repository.ts
└── index.ts
```

### Asset Disposal with Journal Entry

When disposing an asset, the system creates a journal entry:

```
// Standard disposal entry structure:
Debit:  Accumulated Depreciation (total accumulated)    xxx
Debit:  Gain/Loss Account (disposal proceeds)           xxx
Credit: Fixed Asset (acquisition cost)                      xxx
Debit/Credit: Gain/Loss (difference)                    xxx
```

**Example - Sale at Loss** (Book Value 5M, Sold for 3.5M):
```
Debit:  Accumulated Depreciation         0  (if no depreciation yet)
Credit: Fixed Asset                          5,000,000
Debit:  Gain/Loss Account (proceeds)     3,500,000
Debit:  Loss on Disposal                 1,500,000
```

**Example - Sale at Gain** (Book Value 2M, Sold for 3M):
```
Debit:  Accumulated Depreciation         3,000,000
Credit: Fixed Asset                          5,000,000
Debit:  Gain/Loss Account (proceeds)     3,000,000
Credit: Gain on Disposal                     1,000,000
```

> **Note**: Current implementation routes disposal proceeds through the Gain/Loss account for simplicity. In a full implementation, you may want to use a separate Cash/Receivable account.

### Disposal Commands

| Command | Description |
|---------|-------------|
| `DisposeAssetWithJournalCommand` | Dispose with GL entries |
| `WriteOffAssetCommand` | Write off at zero value |

### Maintenance Commands

| Command | Description |
|---------|-------------|
| `CreateMaintenanceCommand` | Schedule maintenance |
| `UpdateMaintenanceCommand` | Update details |
| `StartMaintenanceCommand` | Start work |
| `CompleteMaintenanceCommand` | Complete with actual cost |
| `CancelMaintenanceCommand` | Cancel with reason |
| `DeleteMaintenanceCommand` | Delete record |

### Maintenance Queries

| Query | Description |
|-------|-------------|
| `GetMaintenanceQuery` | Get by ID |
| `ListAssetMaintenanceQuery` | Asset's maintenance history |
| `ListScheduledMaintenanceQuery` | Scheduled/in-progress |
| `ListOverdueMaintenanceQuery` | Overdue maintenance |

### Movement Queries

| Query | Description |
|-------|-------------|
| `GetMovementQuery` | Get by ID |
| `ListAssetMovementsQuery` | Asset's movement history |
| `ListMovementsByDateRangeQuery` | Movements in date range |

### API Endpoints

#### Maintenance (`/api/v1/maintenance`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scheduled` | List scheduled maintenance |
| GET | `/overdue` | List overdue maintenance |
| GET | `/asset/:assetId` | Asset's maintenance history |
| GET | `/:id` | Get maintenance by ID |
| POST | `/` | Create maintenance |
| PUT | `/:id` | Update maintenance |
| POST | `/:id/start` | Start maintenance |
| POST | `/:id/complete` | Complete maintenance |
| POST | `/:id/cancel` | Cancel maintenance |
| DELETE | `/:id` | Delete maintenance |

#### Movements (`/api/v1/movements`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List by date range |
| GET | `/asset/:assetId` | Asset's movement history |
| GET | `/:id` | Get movement by ID |

---

## Complete API Reference

### Service Info
```
GET /                    Service information
GET /health              Health check
```

### Core Accounting
```
/api/v1/accounts         Chart of Accounts
/api/v1/journal-entries  Journal Entries
```

### Asset Accounting
```
/api/v1/asset-categories Asset Categories
/api/v1/assets           Fixed Assets
/api/v1/depreciation     Depreciation Engine
/api/v1/maintenance      Maintenance Management
/api/v1/movements        Movement Tracking
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers |
| Framework | Hono |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Validation | Zod |
| Testing | Vitest |
| Language | TypeScript |

---

## Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm run test:unit

# Integration tests only
pnpm run test:integration

# Watch mode
pnpm run test:watch

# Type check
pnpm type-check
```

---

## Deployment

```bash
# Deploy to production
pnpm run deploy

# Production URL
https://accounting-service.tesla-hakim.workers.dev
```

---

## File Structure Summary

```
services/accounting-service/src/
├── domain/
│   ├── entities/
│   │   ├── account.entity.ts
│   │   ├── journal-entry.entity.ts
│   │   ├── asset-category.entity.ts
│   │   ├── fixed-asset.entity.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── account-code.vo.ts
│   │   ├── fiscal-period.vo.ts
│   │   ├── money.vo.ts
│   │   ├── asset-enums.ts
│   │   └── index.ts
│   ├── services/
│   │   └── depreciation-calculator.ts
│   └── repositories/
│       ├── account.repository.ts
│       ├── journal-entry.repository.ts
│       ├── asset.repositories.ts
│       └── index.ts
├── application/
│   ├── commands/
│   │   ├── account.commands.ts
│   │   ├── journal-entry.commands.ts
│   │   ├── asset.commands.ts
│   │   ├── depreciation.commands.ts
│   │   ├── maintenance.commands.ts
│   │   ├── disposal.commands.ts
│   │   └── index.ts
│   ├── queries/
│   │   ├── account.queries.ts
│   │   ├── journal-entry.queries.ts
│   │   ├── asset.queries.ts
│   │   ├── depreciation.queries.ts
│   │   ├── maintenance.queries.ts
│   │   ├── movement.queries.ts
│   │   └── index.ts
│   └── dtos/
│       ├── account.dto.ts
│       ├── journal-entry.dto.ts
│       ├── asset.dto.ts
│       ├── depreciation.dto.ts
│       ├── maintenance.dto.ts
│       └── index.ts
├── infrastructure/
│   ├── db/
│   │   └── schema.ts
│   ├── repositories/
│   │   ├── account.repository.ts
│   │   ├── journal-entry.repository.ts
│   │   ├── asset-category.repository.ts
│   │   ├── fixed-asset.repository.ts
│   │   ├── depreciation-schedule.repository.ts
│   │   ├── depreciation-run.repository.ts
│   │   ├── asset-movement.repository.ts
│   │   ├── asset-maintenance.repository.ts
│   │   └── index.ts
│   └── http/
│       ├── middleware/
│       │   ├── database.middleware.ts
│       │   ├── error.middleware.ts
│       │   └── index.ts
│       └── routes/
│           ├── account.routes.ts
│           ├── journal-entry.routes.ts
│           ├── asset-category.routes.ts
│           ├── asset.routes.ts
│           ├── depreciation.routes.ts
│           ├── maintenance.routes.ts
│           ├── movement.routes.ts
│           └── index.ts
└── index.ts
```

---

## Next Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 10 | Accounting Cycle and Cash Flow Management | Pending |
| 11 | Event Publishing and Integration | Pending |
| 12 | Asset Reports and Data Archival | Pending |

---

**Last Updated**: 2026-01-27
