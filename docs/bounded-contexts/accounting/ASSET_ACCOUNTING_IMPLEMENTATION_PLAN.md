# Asset Accounting Implementation Plan

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase
**Parent Service**: Accounting Service

---

## Executive Summary

This document outlines the implementation plan for the Asset Accounting Module within the Accounting Service. The implementation is divided into 8 phases covering database setup, domain model, API endpoints, depreciation engine, disposal workflows, maintenance tracking, reporting integration, and monitoring.

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

### Example TDD for Asset Accounting

```typescript
// Step 1: Write test FIRST (Red)
// test/unit/domain/depreciation-calculator.test.ts
describe('DepreciationCalculator', () => {
  describe('straightLine', () => {
    it('should calculate monthly depreciation correctly', () => {
      const result = DepreciationCalculator.straightLine({
        acquisitionCost: 12000000,
        salvageValue: 2000000,
        usefulLifeMonths: 60
      });
      expect(result).toBeCloseTo(166666.67, 2);
    });

    it('should throw error when salvage exceeds cost', () => {
      expect(() => DepreciationCalculator.straightLine({
        acquisitionCost: 1000000,
        salvageValue: 2000000,
        usefulLifeMonths: 60
      })).toThrow('Salvage value cannot exceed acquisition cost');
    });
  });

  describe('decliningBalance', () => {
    it('should calculate first month depreciation correctly', () => {
      const result = DepreciationCalculator.decliningBalance({
        acquisitionCost: 12000000,
        salvageValue: 2000000,
        usefulLifeMonths: 60,
        currentMonth: 1,
        accumulatedDepreciation: 0
      });
      expect(result).toBeGreaterThan(166666.67); // Should be higher than straight-line
    });
  });
});

// Step 2: Run test - FAILS (class doesn't exist)
// Step 3: Implement DepreciationCalculator class
// Step 4: Run test - PASSES
// Step 5: Repeat for next test case
```

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Database & Schema](#phase-1-database--schema)
3. [Phase 2: Domain Model](#phase-2-domain-model)
4. [Phase 3: Asset Category Management](#phase-3-asset-category-management)
5. [Phase 4: Asset Registration & Lifecycle](#phase-4-asset-registration--lifecycle)
6. [Phase 5: Depreciation Engine](#phase-5-depreciation-engine)
7. [Phase 6: Asset Disposal](#phase-6-asset-disposal)
8. [Phase 7: Maintenance Tracking](#phase-7-maintenance-tracking)
9. [Phase 8: Reporting Integration & Archival](#phase-8-reporting-integration--archival)

---

## Implementation Overview

### Architecture Context

The Asset Accounting Module is integrated into the existing Accounting Service, extending it with fixed asset management capabilities.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ACCOUNTING SERVICE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │     EXISTING MODULES        │  │     NEW ASSET MODULE                     │  │
│  │                             │  │                                          │  │
│  │  • Chart of Accounts        │  │  • Asset Categories                      │  │
│  │  • Journal Entries          │◄─┤  • Fixed Assets                          │  │
│  │  • Ledger                   │  │  • Depreciation Engine                   │  │
│  │  • Fiscal Periods           │  │  • Asset Movements                       │  │
│  │  • Financial Reports        │  │  • Maintenance Records                   │  │
│  │                             │  │                                          │  │
│  └─────────────────────────────┘  └─────────────────────────────────────────┘  │
│                                                                                  │
│  Database: accounting-db (D1)                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Events
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          REPORTING SERVICE (Future)                              │
│                                                                                  │
│  • Historical depreciation data                                                 │
│  • Asset audit trails                                                           │
│  • Financial snapshots                                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| Accounting Service (existing) | Internal | Journal entries, accounts |
| Inventory Service | External | Warehouse/location data |
| Business Partner Service | External | Supplier data |
| User Service | External | Employee/department data |
| Reporting Service | External | Historical data archival |

### Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (existing)
- **Database**: D1 (existing accounting-db)
- **Queue**: Cloudflare Queues (for async depreciation)
- **Scheduled Jobs**: Cloudflare Cron Triggers

---

## Phase 1: Database & Schema

### Objective
Create the database schema for fixed asset management within the existing accounting database.

### Steps

#### Step 1.1: Create Migration File

**File**: `services/accounting-service/migrations/0010_asset_accounting.sql`

```sql
-- =====================================================
-- Asset Accounting Module Schema
-- Version: 1.0
-- Date: 2025-01-16
-- =====================================================

-- Asset Categories
CREATE TABLE asset_categories (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Default Depreciation Settings
  default_useful_life_months INTEGER NOT NULL,
  default_depreciation_method TEXT NOT NULL,
  default_salvage_value_percent REAL NOT NULL DEFAULT 0,

  -- Accounting Accounts (references chart_of_accounts)
  asset_account_id TEXT NOT NULL,
  accumulated_depreciation_account_id TEXT NOT NULL,
  depreciation_expense_account_id TEXT NOT NULL,
  gain_loss_on_disposal_account_id TEXT NOT NULL,

  -- Tax Settings (Indonesian PSAK 16)
  tax_useful_life_months INTEGER,
  tax_depreciation_method TEXT,
  tax_asset_group TEXT,

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fixed Assets
CREATE TABLE fixed_assets (
  id TEXT PRIMARY KEY,
  asset_number TEXT NOT NULL UNIQUE,

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL REFERENCES asset_categories(id),

  -- Physical Identification
  serial_number TEXT,
  barcode TEXT UNIQUE,
  manufacturer TEXT,
  model TEXT,

  -- Location & Assignment
  location_id TEXT,
  department_id TEXT,
  assigned_to_user_id TEXT,

  -- Acquisition Details
  acquisition_date TEXT NOT NULL,
  acquisition_method TEXT NOT NULL,
  acquisition_cost REAL NOT NULL,
  purchase_order_id TEXT,
  supplier_id TEXT,
  invoice_number TEXT,

  -- Depreciation Settings
  useful_life_months INTEGER NOT NULL,
  salvage_value REAL NOT NULL DEFAULT 0,
  depreciation_method TEXT NOT NULL,
  depreciation_start_date TEXT NOT NULL,

  -- Current Values (denormalized for performance)
  accumulated_depreciation REAL NOT NULL DEFAULT 0,
  book_value REAL NOT NULL,
  last_depreciation_date TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'DRAFT',

  -- Disposal Information
  disposal_date TEXT,
  disposal_method TEXT,
  disposal_value REAL,
  disposal_reason TEXT,
  gain_loss_on_disposal REAL,

  -- Insurance & Warranty
  insurance_policy_number TEXT,
  insurance_expiry_date TEXT,
  warranty_expiry_date TEXT,

  -- Physical Verification
  last_verified_at TEXT,
  last_verified_by TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1
);

-- Depreciation Schedules
CREATE TABLE depreciation_schedules (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),

  -- Period
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Amounts
  opening_book_value REAL NOT NULL,
  depreciation_amount REAL NOT NULL,
  closing_book_value REAL NOT NULL,
  accumulated_depreciation REAL NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'SCHEDULED',

  -- Journal Reference
  journal_entry_id TEXT,

  -- Timestamps
  calculated_at TEXT NOT NULL,
  posted_at TEXT,

  UNIQUE(asset_id, fiscal_year, fiscal_month)
);

-- Asset Movements
CREATE TABLE asset_movements (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),

  -- Movement Type
  movement_type TEXT NOT NULL,

  -- Location Change
  from_location_id TEXT,
  to_location_id TEXT,

  -- Department Change
  from_department_id TEXT,
  to_department_id TEXT,

  -- Assignment Change
  from_user_id TEXT,
  to_user_id TEXT,

  -- Details
  movement_date TEXT NOT NULL,
  reason TEXT,
  notes TEXT,

  -- Audit
  performed_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Asset Maintenance
CREATE TABLE asset_maintenance (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES fixed_assets(id),

  -- Maintenance Details
  maintenance_type TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Schedule
  scheduled_date TEXT,
  performed_date TEXT,
  next_scheduled_date TEXT,

  -- Cost
  cost REAL NOT NULL DEFAULT 0,
  is_capitalized INTEGER NOT NULL DEFAULT 0,

  -- If capitalized, extends useful life
  extends_useful_life_months INTEGER DEFAULT 0,

  -- Vendor
  vendor_id TEXT,
  vendor_name TEXT,
  invoice_number TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'SCHEDULED',

  -- Notes
  notes TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Depreciation Batch Runs (for tracking monthly runs)
CREATE TABLE depreciation_runs (
  id TEXT PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,

  -- Summary
  total_assets INTEGER NOT NULL,
  assets_depreciated INTEGER NOT NULL,
  assets_skipped INTEGER NOT NULL,
  total_depreciation REAL NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'CALCULATED',

  -- Journal Reference (consolidated entry)
  journal_entry_id TEXT,

  -- Timestamps
  calculated_at TEXT NOT NULL,
  posted_at TEXT,
  posted_by TEXT,

  UNIQUE(fiscal_year, fiscal_month)
);

-- Indexes for Performance
CREATE INDEX idx_fixed_assets_category ON fixed_assets(category_id);
CREATE INDEX idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX idx_fixed_assets_location ON fixed_assets(location_id);
CREATE INDEX idx_fixed_assets_barcode ON fixed_assets(barcode);
CREATE INDEX idx_fixed_assets_number ON fixed_assets(asset_number);

CREATE INDEX idx_depreciation_asset ON depreciation_schedules(asset_id);
CREATE INDEX idx_depreciation_period ON depreciation_schedules(fiscal_year, fiscal_month);
CREATE INDEX idx_depreciation_status ON depreciation_schedules(status);

CREATE INDEX idx_movements_asset ON asset_movements(asset_id);
CREATE INDEX idx_movements_date ON asset_movements(movement_date);

CREATE INDEX idx_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX idx_maintenance_status ON asset_maintenance(status);
CREATE INDEX idx_maintenance_scheduled ON asset_maintenance(scheduled_date);
```

---

#### Step 1.2: Seed Default Asset Categories

**File**: `services/accounting-service/migrations/0011_seed_asset_categories.sql`

```sql
-- Seed Default Asset Categories
INSERT INTO asset_categories (
  id, code, name, description,
  default_useful_life_months, default_depreciation_method, default_salvage_value_percent,
  asset_account_id, accumulated_depreciation_account_id,
  depreciation_expense_account_id, gain_loss_on_disposal_account_id,
  tax_useful_life_months, tax_depreciation_method, tax_asset_group,
  is_active, created_at, updated_at
) VALUES
-- POS Equipment
(
  'cat-pos', 'POS', 'POS Equipment',
  'Point of Sale terminals, barcode scanners, receipt printers',
  60, 'STRAIGHT_LINE', 10,
  '1150', '1155', '6500', '7100',
  48, 'STRAIGHT_LINE', 'GROUP_1',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- Warehouse Equipment
(
  'cat-whs', 'WHS', 'Warehouse Equipment',
  'Forklifts, pallet jacks, racking systems, conveyors',
  120, 'STRAIGHT_LINE', 5,
  '1160', '1165', '6500', '7100',
  96, 'STRAIGHT_LINE', 'GROUP_2',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- Vehicles
(
  'cat-veh', 'VEH', 'Vehicles',
  'Delivery trucks, vans, motorcycles',
  96, 'DECLINING_BALANCE', 15,
  '1170', '1175', '6510', '7100',
  96, 'DECLINING_BALANCE', 'GROUP_2',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- IT Infrastructure
(
  'cat-it', 'IT', 'IT Infrastructure',
  'Servers, computers, networking equipment',
  48, 'STRAIGHT_LINE', 5,
  '1140', '1145', '6500', '7100',
  48, 'STRAIGHT_LINE', 'GROUP_1',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- Store Fixtures
(
  'cat-fix', 'FIX', 'Store Fixtures',
  'Shelving, display cases, signage',
  120, 'STRAIGHT_LINE', 0,
  '1180', '1185', '6500', '7100',
  96, 'STRAIGHT_LINE', 'GROUP_2',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- Office Furniture
(
  'cat-fur', 'FUR', 'Office Furniture',
  'Desks, chairs, cabinets, AC units',
  96, 'STRAIGHT_LINE', 5,
  '1190', '1195', '6500', '7100',
  96, 'STRAIGHT_LINE', 'GROUP_2',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- Leasehold Improvements
(
  'cat-bld', 'BLD', 'Building Improvements',
  'Leasehold improvements, renovations',
  120, 'STRAIGHT_LINE', 0,
  '1200', '1205', '6520', '7100',
  120, 'STRAIGHT_LINE', 'NON_PERMANENT',
  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
```

---

#### Step 1.3: Create Fixed Asset Accounts (Chart of Accounts)

**File**: `services/accounting-service/migrations/0012_asset_chart_of_accounts.sql`

```sql
-- Add Fixed Asset accounts to Chart of Accounts
INSERT INTO chart_of_accounts (
  id, code, name, account_type, normal_balance,
  parent_account_id, level, is_detail_account, is_system_account,
  status, created_at, updated_at
) VALUES
-- Fixed Assets Header
('acc-1100', '1100', 'Fixed Assets', 'Asset', 'Debit', NULL, 0, 0, 1, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Computer Equipment
('acc-1140', '1140', 'Computer Equipment', 'Asset', 'Debit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1145', '1145', 'Accumulated Depreciation - Computer Equipment', 'Asset', 'Credit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Office Equipment
('acc-1150', '1150', 'Office Equipment', 'Asset', 'Debit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1155', '1155', 'Accumulated Depreciation - Office Equipment', 'Asset', 'Credit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Warehouse Equipment
('acc-1160', '1160', 'Warehouse Equipment', 'Asset', 'Debit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1165', '1165', 'Accumulated Depreciation - Warehouse Equipment', 'Asset', 'Credit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Vehicles
('acc-1170', '1170', 'Vehicles', 'Asset', 'Debit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1175', '1175', 'Accumulated Depreciation - Vehicles', 'Asset', 'Credit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Fixtures & Fittings
('acc-1180', '1180', 'Fixtures & Fittings', 'Asset', 'Debit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1185', '1185', 'Accumulated Depreciation - Fixtures & Fittings', 'Asset', 'Credit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Furniture
('acc-1190', '1190', 'Furniture & Fixtures', 'Asset', 'Debit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1195', '1195', 'Accumulated Depreciation - Furniture', 'Asset', 'Credit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Leasehold Improvements
('acc-1200', '1200', 'Leasehold Improvements', 'Asset', 'Debit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-1205', '1205', 'Accumulated Depreciation - Leasehold Improvements', 'Asset', 'Credit', 'acc-1100', 1, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Depreciation Expense
('acc-6500', '6500', 'Depreciation Expense - General', 'Expense', 'Debit', NULL, 0, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-6510', '6510', 'Depreciation Expense - Vehicles', 'Expense', 'Debit', NULL, 0, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('acc-6520', '6520', 'Depreciation Expense - Leasehold', 'Expense', 'Debit', NULL, 0, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Gain/Loss on Disposal
('acc-7100', '7100', 'Gain/Loss on Asset Disposal', 'Expense', 'Debit', NULL, 0, 1, 0, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

---

### Deliverables Phase 1

- [ ] Migration file for asset tables created
- [ ] Seed data for default categories
- [ ] Chart of accounts extended with fixed asset accounts
- [ ] Migrations tested locally
- [ ] Indexes verified for performance

---

## Phase 2: Domain Model

### Objective
Implement the domain entities, value objects, and domain services for asset accounting.

### Steps

#### Step 2.1: Domain Entities

**File**: `services/accounting-service/src/domain/entities/FixedAsset.ts`

```typescript
import { DomainEvent } from '../events/DomainEvent';
import { AssetStatus, DepreciationMethod, AcquisitionMethod, DisposalMethod } from '../value-objects';

export class FixedAsset {
  private _id: string;
  private _assetNumber: string;
  private _name: string;
  private _categoryId: string;
  private _acquisitionCost: number;
  private _acquisitionDate: Date;
  private _usefulLifeMonths: number;
  private _salvageValue: number;
  private _depreciationMethod: DepreciationMethod;
  private _depreciationStartDate: Date;
  private _accumulatedDepreciation: number;
  private _bookValue: number;
  private _status: AssetStatus;
  private _version: number;

  private _domainEvents: DomainEvent[] = [];

  constructor(props: FixedAssetProps) {
    this.validateCreate(props);

    this._id = props.id || generateId();
    this._assetNumber = props.assetNumber;
    this._name = props.name;
    this._categoryId = props.categoryId;
    this._acquisitionCost = props.acquisitionCost;
    this._acquisitionDate = new Date(props.acquisitionDate);
    this._usefulLifeMonths = props.usefulLifeMonths;
    this._salvageValue = props.salvageValue;
    this._depreciationMethod = props.depreciationMethod;
    this._depreciationStartDate = new Date(props.depreciationStartDate);
    this._accumulatedDepreciation = props.accumulatedDepreciation || 0;
    this._bookValue = props.acquisitionCost - (props.accumulatedDepreciation || 0);
    this._status = props.status || AssetStatus.DRAFT;
    this._version = props.version || 1;
  }

  // Business Methods

  activate(): void {
    if (this._status !== AssetStatus.DRAFT) {
      throw new DomainError('Can only activate draft assets');
    }

    this._status = AssetStatus.ACTIVE;
    this.addDomainEvent(new AssetActivated(this));
  }

  applyDepreciation(amount: number, period: { year: number; month: number }): void {
    if (!this.isDepreciable()) {
      throw new DomainError('Asset is not depreciable');
    }

    const maxDepreciation = this._bookValue - this._salvageValue;
    const actualDepreciation = Math.min(amount, maxDepreciation);

    this._accumulatedDepreciation += actualDepreciation;
    this._bookValue = this._acquisitionCost - this._accumulatedDepreciation;
    this._version++;

    // Check if fully depreciated
    if (this._bookValue <= this._salvageValue) {
      this._status = AssetStatus.FULLY_DEPRECIATED;
      this.addDomainEvent(new AssetFullyDepreciated(this));
    }
  }

  dispose(method: DisposalMethod, value: number, reason: string): DisposalResult {
    if (this._status === AssetStatus.DISPOSED || this._status === AssetStatus.WRITTEN_OFF) {
      throw new DomainError('Asset is already disposed');
    }

    const gainLoss = value - this._bookValue;

    this._status = AssetStatus.DISPOSED;
    this._version++;

    this.addDomainEvent(new AssetDisposed({
      assetId: this._id,
      disposalMethod: method,
      disposalValue: value,
      bookValueAtDisposal: this._bookValue,
      gainLoss
    }));

    return {
      bookValueAtDisposal: this._bookValue,
      disposalValue: value,
      gainLoss,
      isGain: gainLoss > 0
    };
  }

  isDepreciable(): boolean {
    return (
      this._status === AssetStatus.ACTIVE &&
      this._bookValue > this._salvageValue &&
      this._depreciationStartDate <= new Date()
    );
  }

  // Getters
  get id(): string { return this._id; }
  get assetNumber(): string { return this._assetNumber; }
  get name(): string { return this._name; }
  get categoryId(): string { return this._categoryId; }
  get acquisitionCost(): number { return this._acquisitionCost; }
  get bookValue(): number { return this._bookValue; }
  get accumulatedDepreciation(): number { return this._accumulatedDepreciation; }
  get salvageValue(): number { return this._salvageValue; }
  get usefulLifeMonths(): number { return this._usefulLifeMonths; }
  get depreciationMethod(): DepreciationMethod { return this._depreciationMethod; }
  get status(): AssetStatus { return this._status; }
  get version(): number { return this._version; }

  // Domain Events
  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
```

---

#### Step 2.2: Depreciation Calculators

**File**: `services/accounting-service/src/domain/services/DepreciationCalculator.ts`

```typescript
export interface DepreciationCalculator {
  calculate(asset: FixedAsset, periodMonths: number): number;
}

export class StraightLineDepreciation implements DepreciationCalculator {
  calculate(asset: FixedAsset, periodMonths: number = 1): number {
    const depreciableAmount = asset.acquisitionCost - asset.salvageValue;
    const monthlyDepreciation = depreciableAmount / asset.usefulLifeMonths;

    const remainingDepreciable = asset.bookValue - asset.salvageValue;
    return Math.min(monthlyDepreciation * periodMonths, Math.max(0, remainingDepreciable));
  }
}

export class DecliningBalanceDepreciation implements DepreciationCalculator {
  private readonly factor: number;

  constructor(factor: number = 2) {
    this.factor = factor;  // 2 for double declining
  }

  calculate(asset: FixedAsset, periodMonths: number = 1): number {
    const straightLineRate = 12 / asset.usefulLifeMonths;  // Annual rate
    const decliningRate = straightLineRate * this.factor;

    const annualDepreciation = asset.bookValue * decliningRate;
    const monthlyDepreciation = annualDepreciation / 12;

    const maxDepreciation = asset.bookValue - asset.salvageValue;
    return Math.min(monthlyDepreciation * periodMonths, Math.max(0, maxDepreciation));
  }
}

export class DepreciationCalculatorFactory {
  private static calculators: Map<DepreciationMethod, DepreciationCalculator> = new Map([
    [DepreciationMethod.STRAIGHT_LINE, new StraightLineDepreciation()],
    [DepreciationMethod.DECLINING_BALANCE, new DecliningBalanceDepreciation(2)],
    [DepreciationMethod.SUM_OF_YEARS_DIGITS, new SumOfYearsDigitsDepreciation()],
    [DepreciationMethod.UNITS_OF_PRODUCTION, new UnitsOfProductionDepreciation()]
  ]);

  static getCalculator(method: DepreciationMethod): DepreciationCalculator {
    const calculator = this.calculators.get(method);
    if (!calculator) {
      throw new Error(`Unknown depreciation method: ${method}`);
    }
    return calculator;
  }
}
```

---

### Deliverables Phase 2

- [ ] FixedAsset entity with business methods
- [ ] AssetCategory entity
- [ ] DepreciationSchedule entity
- [ ] AssetMovement entity
- [ ] AssetMaintenance entity
- [ ] Value objects (AssetStatus, DepreciationMethod, etc.)
- [ ] Depreciation calculator implementations
- [ ] Domain events defined
- [ ] Unit tests for domain logic

---

## Phase 3: Asset Category Management

### Objective
Implement CRUD operations for asset categories.

### Steps

#### Step 3.1: Category Repository

```typescript
export interface IAssetCategoryRepository {
  findById(id: string): Promise<AssetCategory | null>;
  findByCode(code: string): Promise<AssetCategory | null>;
  findAll(includeInactive?: boolean): Promise<AssetCategory[]>;
  save(category: AssetCategory): Promise<void>;
  delete(id: string): Promise<void>;
}
```

#### Step 3.2: Category API Routes

```typescript
// GET /api/accounting/asset-categories
// GET /api/accounting/asset-categories/:id
// POST /api/accounting/asset-categories
// PUT /api/accounting/asset-categories/:id
// DELETE /api/accounting/asset-categories/:id
```

### Deliverables Phase 3

- [ ] AssetCategoryRepository implementation
- [ ] Category CRUD API routes
- [ ] Category validation (accounts exist, code format)
- [ ] Integration tests

---

## Phase 4: Asset Registration & Lifecycle

### Objective
Implement asset registration, activation, and status management.

### Steps

#### Step 4.1: Asset Repository

```typescript
export interface IFixedAssetRepository {
  findById(id: string): Promise<FixedAsset | null>;
  findByAssetNumber(assetNumber: string): Promise<FixedAsset | null>;
  findByBarcode(barcode: string): Promise<FixedAsset | null>;
  findByStatus(status: AssetStatus): Promise<FixedAsset[]>;
  findDepreciable(): Promise<FixedAsset[]>;
  findByCategory(categoryId: string): Promise<FixedAsset[]>;
  findByLocation(locationId: string): Promise<FixedAsset[]>;
  save(asset: FixedAsset): Promise<void>;
  generateAssetNumber(categoryCode: string, date: Date): Promise<string>;
}
```

#### Step 4.2: Asset Use Cases

```typescript
// CreateAssetUseCase - Create draft asset
// ActivateAssetUseCase - Activate and start depreciation
// UpdateAssetUseCase - Update editable fields
// TransferAssetUseCase - Change location/department
```

#### Step 4.3: Asset API Routes

```typescript
// POST /api/accounting/assets - Create draft asset
// GET /api/accounting/assets - List with filters
// GET /api/accounting/assets/:id - Get details
// PUT /api/accounting/assets/:id - Update
// POST /api/accounting/assets/:id/activate - Activate
// POST /api/accounting/assets/:id/transfer - Transfer location
```

#### Step 4.4: Acquisition Journal Entry

```typescript
async function createAcquisitionJournalEntry(
  asset: FixedAsset,
  category: AssetCategory,
  paymentMethod: 'CASH' | 'CREDIT'
): Promise<JournalEntry> {
  const lines: JournalLine[] = [
    // Debit: Fixed Asset
    {
      accountId: category.assetAccountId,
      direction: 'Debit',
      amount: asset.acquisitionCost,
      memo: `Asset acquisition - ${asset.assetNumber}`
    }
  ];

  if (paymentMethod === 'CASH') {
    // Credit: Cash/Bank
    lines.push({
      accountId: '1010',  // Cash
      direction: 'Credit',
      amount: asset.acquisitionCost,
      memo: 'Cash payment for asset'
    });
  } else {
    // Credit: Accounts Payable
    lines.push({
      accountId: '2100',  // Accounts Payable
      direction: 'Credit',
      amount: asset.acquisitionCost,
      memo: 'Asset acquired on credit'
    });
  }

  return journalEntryService.create({
    entryDate: asset.acquisitionDate,
    description: `Asset Acquisition - ${asset.assetNumber} - ${asset.name}`,
    reference: asset.invoiceNumber,
    entryType: 'System',
    lines
  });
}
```

### Deliverables Phase 4

- [ ] FixedAssetRepository implementation
- [ ] Asset number generation service
- [ ] CreateAssetUseCase
- [ ] ActivateAssetUseCase
- [ ] TransferAssetUseCase
- [ ] Acquisition journal entry creation
- [ ] Asset movement recording
- [ ] API routes with validation
- [ ] Integration tests

---

## Phase 5: Depreciation Engine

### Objective
Implement automated monthly depreciation calculation and posting.

### Steps

#### Step 5.1: Monthly Depreciation Use Case

```typescript
export class RunMonthlyDepreciationUseCase {
  async execute(request: { year: number; month: number }): Promise<DepreciationRunResult> {
    const { year, month } = request;

    // Check if already run
    const existing = await this.runRepo.findByPeriod(year, month);
    if (existing && existing.status === 'POSTED') {
      throw new Error(`Depreciation already posted for ${year}-${month}`);
    }

    // Get all depreciable assets
    const assets = await this.assetRepo.findDepreciable();

    const schedules: DepreciationSchedule[] = [];
    let totalDepreciation = 0;

    for (const asset of assets) {
      const calculator = DepreciationCalculatorFactory.getCalculator(asset.depreciationMethod);
      const amount = calculator.calculate(asset, 1);

      if (amount > 0) {
        const schedule = new DepreciationSchedule({
          assetId: asset.id,
          fiscalYear: year,
          fiscalMonth: month,
          openingBookValue: asset.bookValue,
          depreciationAmount: amount,
          closingBookValue: asset.bookValue - amount,
          accumulatedDepreciation: asset.accumulatedDepreciation + amount,
          status: DepreciationStatus.CALCULATED
        });

        schedules.push(schedule);
        totalDepreciation += amount;
      }
    }

    // Save depreciation run
    const run = new DepreciationRun({
      fiscalYear: year,
      fiscalMonth: month,
      totalAssets: assets.length,
      assetsDepreciated: schedules.length,
      assetsSkipped: assets.length - schedules.length,
      totalDepreciation,
      status: 'CALCULATED'
    });

    await this.runRepo.save(run);
    await this.scheduleRepo.saveMany(schedules);

    return {
      runId: run.id,
      period: `${year}-${month}`,
      summary: {
        totalAssets: run.totalAssets,
        assetsDepreciated: run.assetsDepreciated,
        totalDepreciation: run.totalDepreciation
      },
      schedules: schedules.map(s => s.toDTO())
    };
  }
}
```

#### Step 5.2: Post Depreciation Use Case

```typescript
export class PostDepreciationUseCase {
  async execute(request: { runId: string; userId: string }): Promise<JournalEntry> {
    const run = await this.runRepo.findById(request.runId);

    if (!run) {
      throw new Error('Depreciation run not found');
    }

    if (run.status === 'POSTED') {
      throw new Error('Depreciation already posted');
    }

    const schedules = await this.scheduleRepo.findByRun(run.id);

    // Group by depreciation expense account
    const byExpenseAccount = this.groupByExpenseAccount(schedules);
    const byAccumAccount = this.groupByAccumulatedAccount(schedules);

    // Build journal entry lines
    const lines: JournalLine[] = [];

    // Debit: Depreciation Expense accounts
    for (const [accountId, amount] of byExpenseAccount) {
      lines.push({
        accountId,
        direction: 'Debit',
        amount,
        memo: `Depreciation expense - ${run.fiscalYear}/${run.fiscalMonth}`
      });
    }

    // Credit: Accumulated Depreciation accounts
    for (const [accountId, amount] of byAccumAccount) {
      lines.push({
        accountId,
        direction: 'Credit',
        amount,
        memo: `Accumulated depreciation - ${run.fiscalYear}/${run.fiscalMonth}`
      });
    }

    // Create and post journal entry
    const journalEntry = await this.journalService.create({
      entryDate: new Date(run.fiscalYear, run.fiscalMonth - 1, 28),  // Last day of month
      description: `Monthly Depreciation - ${run.fiscalYear}/${String(run.fiscalMonth).padStart(2, '0')}`,
      entryType: 'System',
      lines
    });

    await this.journalService.post(journalEntry.id, request.userId);

    // Update assets and schedules
    for (const schedule of schedules) {
      const asset = await this.assetRepo.findById(schedule.assetId);
      asset.applyDepreciation(schedule.depreciationAmount, {
        year: run.fiscalYear,
        month: run.fiscalMonth
      });
      await this.assetRepo.save(asset);

      schedule.markAsPosted(journalEntry.id);
      await this.scheduleRepo.save(schedule);
    }

    // Update run status
    run.markAsPosted(journalEntry.id, request.userId);
    await this.runRepo.save(run);

    return journalEntry;
  }
}
```

#### Step 5.3: Scheduled Job (Cron)

```typescript
// wrangler.toml
// [triggers]
// crons = ["0 1 1 * *"]  # Run at 1 AM on 1st of every month

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Calculate depreciation for previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const useCase = new RunMonthlyDepreciationUseCase(/* deps */);

    await useCase.execute({
      year: prevMonth.getFullYear(),
      month: prevMonth.getMonth() + 1
    });

    // Note: Posting requires manual approval
  }
};
```

### Deliverables Phase 5

- [ ] RunMonthlyDepreciationUseCase
- [ ] PostDepreciationUseCase
- [ ] DepreciationScheduleRepository
- [ ] DepreciationRunRepository
- [ ] Scheduled job for auto-calculation
- [ ] API routes for depreciation management
- [ ] Preview endpoint (calculate without posting)
- [ ] Integration tests

---

## Phase 6: Asset Disposal

### Objective
Implement asset disposal workflow with gain/loss calculation.

### Steps

#### Step 6.1: Disposal Use Case

```typescript
export class DisposeAssetUseCase {
  async execute(request: DisposeAssetRequest): Promise<DisposalResult> {
    const asset = await this.assetRepo.findById(request.assetId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Run final depreciation up to disposal date
    await this.runFinalDepreciation(asset, request.disposalDate);

    // Calculate gain/loss
    const result = asset.dispose(
      request.method,
      request.disposalValue,
      request.reason
    );

    // Create disposal journal entry
    const journalEntry = await this.createDisposalJournalEntry(
      asset,
      request,
      result
    );

    // Save asset
    await this.assetRepo.save(asset);

    // Record movement
    await this.movementRepo.save(new AssetMovement({
      assetId: asset.id,
      movementType: MovementType.DISPOSAL,
      fromLocationId: asset.locationId,
      movementDate: request.disposalDate,
      reason: request.reason,
      performedBy: request.performedBy
    }));

    // Publish events
    for (const event of asset.pullDomainEvents()) {
      await this.eventPublisher.publish(event);
    }

    return {
      ...result,
      journalEntryId: journalEntry.id
    };
  }
}
```

### Deliverables Phase 6

- [ ] DisposeAssetUseCase
- [ ] Final depreciation calculation
- [ ] Gain/loss calculation
- [ ] Disposal journal entry creation
- [ ] Disposal API route
- [ ] Approval workflow (optional)
- [ ] Integration tests

---

## Phase 7: Maintenance Tracking

### Objective
Implement maintenance scheduling and tracking with capitalization support.

### Steps

#### Step 7.1: Maintenance Use Cases

```typescript
// ScheduleMaintenanceUseCase
// RecordMaintenanceUseCase
// CapitalizeMaintenanceUseCase
```

#### Step 7.2: Maintenance API Routes

```typescript
// GET /api/accounting/assets/:id/maintenance
// POST /api/accounting/assets/:id/maintenance
// PUT /api/accounting/maintenance/:id
// POST /api/accounting/maintenance/:id/complete
// POST /api/accounting/maintenance/:id/capitalize
```

### Deliverables Phase 7

- [ ] MaintenanceRepository
- [ ] ScheduleMaintenanceUseCase
- [ ] RecordMaintenanceUseCase
- [ ] CapitalizeMaintenanceUseCase (extends useful life)
- [ ] Maintenance API routes
- [ ] Reminder job for scheduled maintenance
- [ ] Integration tests

---

## Phase 8: Reporting Integration & Archival

### Objective
Integrate with Reporting Service and implement data archival.

### Steps

#### Step 8.1: Event Publishing to Reporting Service

```typescript
const ASSET_EVENTS_TO_PUBLISH = [
  'AssetAcquired',
  'AssetActivated',
  'AssetTransferred',
  'AssetDisposed',
  'AssetFullyDepreciated',
  'DepreciationPosted',
  'MaintenanceCompleted'
];

// Publish to Cloudflare Queue for Reporting Service consumption
```

#### Step 8.2: Archival Job

```typescript
export class AssetArchivalJob {
  async run(): Promise<void> {
    const cutoffDate = subMonths(new Date(), 12);

    // Archive disposed assets
    const disposed = await this.assetRepo.findDisposedBefore(cutoffDate);
    await this.reportingService.archiveAssets(disposed);
    await this.assetRepo.deleteMany(disposed.map(a => a.id));

    // Archive old depreciation schedules
    const oldSchedules = await this.scheduleRepo.findPostedBefore(cutoffDate);
    await this.reportingService.archiveDepreciation(oldSchedules);
    await this.scheduleRepo.deleteMany(oldSchedules.map(s => s.id));
  }
}
```

### Deliverables Phase 8

- [ ] Event publishing to Reporting Service queue
- [ ] Archival job for old data
- [ ] Asset register report endpoint
- [ ] Depreciation schedule report endpoint
- [ ] Integration tests

---

## Testing Strategy

### Unit Tests
- Depreciation calculations (all methods)
- Asset status transitions
- Gain/loss calculations
- Business rule validations

### Integration Tests
- Asset CRUD operations
- Depreciation run workflow
- Disposal workflow
- Journal entry creation

### E2E Tests
- Complete asset lifecycle
- Monthly depreciation cycle
- Disposal with gain/loss

---

## Summary

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Database & Schema | None |
| 2 | Domain Model | Phase 1 |
| 3 | Category Management | Phase 2 |
| 4 | Asset Registration & Lifecycle | Phase 2, 3 |
| 5 | Depreciation Engine | Phase 4 |
| 6 | Asset Disposal | Phase 5 |
| 7 | Maintenance Tracking | Phase 4 |
| 8 | Reporting & Archival | Phase 5, 6, 7 |

---

## Related Documents

- [Asset Accounting Architecture](./ASSET_ACCOUNTING_ARCHITECTURE.md)
- [Asset Accounting Business Rules](./ASSET_ACCOUNTING_BUSINESS_RULES.md)
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md)
- [Accounting Business Rules](./BUSINESS_RULES.md)
