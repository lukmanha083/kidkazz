# Asset Accounting Module Architecture

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase
**Parent Service**: Accounting Service

---

## Executive Summary

The Asset Accounting Module is an extension of the Accounting Service that manages fixed assets, depreciation calculation, and asset lifecycle tracking. It integrates tightly with the core accounting functionality to automatically generate depreciation journal entries and maintain accurate financial statements.

### Key Objectives

1. **Fixed Asset Register** - Track all company assets with details
2. **Automated Depreciation** - Calculate and post monthly depreciation
3. **Asset Lifecycle** - Manage acquisition, transfer, and disposal
4. **Financial Integration** - Impact Balance Sheet and Income Statement correctly
5. **Tax Compliance** - Support Indonesian tax depreciation rules (PSAK 16)

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Domain Model](#domain-model)
3. [Depreciation Methods](#depreciation-methods)
4. [Asset Categories](#asset-categories)
5. [Database Schema](#database-schema)
6. [API Architecture](#api-architecture)
7. [Asset Lifecycle Workflows](#asset-lifecycle-workflows)
8. [Accounting Integration](#accounting-integration)
9. [Reporting Service Integration](#reporting-service-integration)

---

## Module Overview

### Architecture Position

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ACCOUNTING SERVICE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                         APPLICATION LAYER                                    ││
│  │                                                                              ││
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐││
│  │  │ Core Accounting   │ │ Asset Accounting │ │ Financial Reporting          │││
│  │  │ Use Cases         │ │ Use Cases        │ │ Use Cases                    │││
│  │  │                   │ │                  │ │                              │││
│  │  │ - CreateJournal   │ │ - AcquireAsset   │ │ - GenerateBalanceSheet      │││
│  │  │ - PostJournal     │ │ - DisposeAsset   │ │ - GenerateIncomeStatement   │││
│  │  │ - VoidJournal     │ │ - TransferAsset  │ │ - GenerateTrialBalance      │││
│  │  │                   │ │ - RunDepreciation│ │ - GenerateAssetReport       │││
│  │  └──────────────────┘ └──────────────────┘ └──────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                           DOMAIN LAYER                                       ││
│  │                                                                              ││
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐││
│  │  │ Core Entities     │ │ Asset Entities   │ │ Domain Services              │││
│  │  │                   │ │                  │ │                              │││
│  │  │ - Account         │ │ - FixedAsset     │ │ - DepreciationCalculator    │││
│  │  │ - JournalEntry    │ │ - AssetCategory  │ │ - AssetValuationService     │││
│  │  │ - JournalLine     │ │ - Depreciation   │ │ - AssetDisposalService      │││
│  │  │ - FiscalPeriod    │ │ - AssetMovement  │ │ - JournalEntryService       │││
│  │  │                   │ │ - Maintenance    │ │                              │││
│  │  └──────────────────┘ └──────────────────┘ └──────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                        INFRASTRUCTURE LAYER                                  ││
│  │                                                                              ││
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐││
│  │  │ Repositories      │ │ Event Publisher  │ │ Scheduled Jobs               │││
│  │  │                   │ │                  │ │                              │││
│  │  │ - AccountRepo     │ │ - AssetAcquired  │ │ - MonthlyDepreciationJob    │││
│  │  │ - JournalRepo     │ │ - AssetDisposed  │ │ - AssetArchivalJob          │││
│  │  │ - AssetRepo       │ │ - DepreciationRan│ │ - MaintenanceReminderJob    │││
│  │  │ - CategoryRepo    │ │ - AssetTransferred│ │                             │││
│  │  └──────────────────┘ └──────────────────┘ └──────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Module Boundaries

| Responsibility | Asset Module | Core Accounting | Reporting Service |
|----------------|--------------|-----------------|-------------------|
| Asset Register | ✅ Owns | - | Reads for reports |
| Depreciation Calculation | ✅ Owns | - | Historical data |
| Journal Entry Creation | Triggers | ✅ Owns | Archives |
| Balance Sheet Assets | - | ✅ Owns | Generates report |
| Asset Reports | - | - | ✅ Owns |
| Historical Data | Current only | Current + 1 year | Full history |

---

## Domain Model

### Core Entities

#### 1. FixedAsset (Aggregate Root)

```typescript
interface FixedAsset {
  // Identity
  id: string;
  assetNumber: string;              // Format: FA-{CATEGORY}-{YYYYMM}-{SEQ}

  // Basic Information
  name: string;
  description?: string;
  categoryId: string;

  // Physical Identification
  serialNumber?: string;
  barcode?: string;
  manufacturer?: string;
  model?: string;

  // Location & Assignment
  locationId?: string;              // Warehouse/Store ID
  departmentId?: string;
  assignedToUserId?: string;

  // Acquisition Details
  acquisitionDate: Date;
  acquisitionMethod: AcquisitionMethod;
  acquisitionCost: number;          // Original purchase price
  purchaseOrderId?: string;
  supplierId?: string;
  invoiceNumber?: string;

  // Depreciation Settings
  usefulLifeMonths: number;         // Total useful life in months
  salvageValue: number;             // Residual value at end of life
  depreciationMethod: DepreciationMethod;
  depreciationStartDate: Date;

  // Current Values
  accumulatedDepreciation: number;  // Total depreciation to date
  bookValue: number;                // acquisitionCost - accumulatedDepreciation
  lastDepreciationDate?: Date;

  // Status
  status: AssetStatus;

  // Disposal Information (if disposed)
  disposalDate?: Date;
  disposalMethod?: DisposalMethod;
  disposalValue?: number;           // Sale price or scrap value
  disposalReason?: string;
  gainLossOnDisposal?: number;

  // Insurance & Warranty
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  warrantyExpiryDate?: Date;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

enum AcquisitionMethod {
  PURCHASE = 'PURCHASE',
  LEASE_TO_OWN = 'LEASE_TO_OWN',
  DONATION = 'DONATION',
  TRANSFER_IN = 'TRANSFER_IN',
  SELF_CONSTRUCTED = 'SELF_CONSTRUCTED'
}

enum AssetStatus {
  DRAFT = 'DRAFT',                  // Being entered, not yet active
  ACTIVE = 'ACTIVE',                // In use, depreciating
  FULLY_DEPRECIATED = 'FULLY_DEPRECIATED',  // Still in use, no more depreciation
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  DISPOSED = 'DISPOSED',
  WRITTEN_OFF = 'WRITTEN_OFF'
}

enum DisposalMethod {
  SALE = 'SALE',
  SCRAP = 'SCRAP',
  DONATION = 'DONATION',
  THEFT = 'THEFT',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRADE_IN = 'TRADE_IN'
}
```

#### 2. AssetCategory

```typescript
interface AssetCategory {
  id: string;
  code: string;                     // e.g., 'POS', 'VEH', 'IT', 'FUR'
  name: string;
  description?: string;

  // Default Depreciation Settings
  defaultUsefulLifeMonths: number;
  defaultDepreciationMethod: DepreciationMethod;
  defaultSalvageValuePercent: number;  // % of acquisition cost

  // Accounting Accounts
  assetAccountId: string;           // e.g., 1150 - Office Equipment
  accumulatedDepreciationAccountId: string;  // e.g., 1151 - Accum. Depr. Office Equip.
  depreciationExpenseAccountId: string;      // e.g., 6500 - Depreciation Expense
  gainLossOnDisposalAccountId: string;       // e.g., 7100 - Gain/Loss on Asset Disposal

  // Tax Settings (Indonesian PSAK 16)
  taxUsefulLifeMonths?: number;     // May differ from book useful life
  taxDepreciationMethod?: DepreciationMethod;

  // Status
  isActive: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. DepreciationSchedule

```typescript
interface DepreciationSchedule {
  id: string;
  assetId: string;

  // Period
  fiscalYear: number;
  fiscalMonth: number;

  // Amounts
  openingBookValue: number;
  depreciationAmount: number;
  closingBookValue: number;
  accumulatedDepreciation: number;

  // Status
  status: DepreciationStatus;

  // Journal Reference
  journalEntryId?: string;

  // Timestamps
  calculatedAt: Date;
  postedAt?: Date;
}

enum DepreciationStatus {
  SCHEDULED = 'SCHEDULED',          // Future depreciation
  CALCULATED = 'CALCULATED',        // Calculated, not yet posted
  POSTED = 'POSTED',                // Journal entry created
  SKIPPED = 'SKIPPED'               // Asset was disposed/inactive
}
```

#### 4. AssetMovement

```typescript
interface AssetMovement {
  id: string;
  assetId: string;

  // Movement Type
  movementType: MovementType;

  // Location Change
  fromLocationId?: string;
  toLocationId?: string;

  // Department Change
  fromDepartmentId?: string;
  toDepartmentId?: string;

  // Assignment Change
  fromUserId?: string;
  toUserId?: string;

  // Details
  movementDate: Date;
  reason?: string;
  notes?: string;

  // Audit
  performedBy: string;
  createdAt: Date;
}

enum MovementType {
  ACQUISITION = 'ACQUISITION',
  TRANSFER = 'TRANSFER',
  REASSIGNMENT = 'REASSIGNMENT',
  DISPOSAL = 'DISPOSAL',
  MAINTENANCE_IN = 'MAINTENANCE_IN',
  MAINTENANCE_OUT = 'MAINTENANCE_OUT'
}
```

#### 5. AssetMaintenance

```typescript
interface AssetMaintenance {
  id: string;
  assetId: string;

  // Maintenance Details
  maintenanceType: MaintenanceType;
  description: string;

  // Schedule
  scheduledDate?: Date;
  performedDate?: Date;
  nextScheduledDate?: Date;

  // Cost
  cost: number;
  isCapitalized: boolean;           // If true, adds to asset cost

  // Vendor
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;

  // Status
  status: MaintenanceStatus;

  // Notes
  notes?: string;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  INSPECTION = 'INSPECTION',
  UPGRADE = 'UPGRADE',
  REPAIR = 'REPAIR'
}

enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
```

### Domain Events

```typescript
// Asset Lifecycle Events
interface AssetAcquired {
  type: 'AssetAcquired';
  payload: {
    assetId: string;
    assetNumber: string;
    categoryId: string;
    acquisitionCost: number;
    acquisitionDate: Date;
  };
}

interface AssetActivated {
  type: 'AssetActivated';
  payload: {
    assetId: string;
    depreciationStartDate: Date;
  };
}

interface AssetTransferred {
  type: 'AssetTransferred';
  payload: {
    assetId: string;
    fromLocationId: string;
    toLocationId: string;
    transferDate: Date;
  };
}

interface AssetDisposed {
  type: 'AssetDisposed';
  payload: {
    assetId: string;
    disposalMethod: DisposalMethod;
    disposalValue: number;
    gainLoss: number;
    disposalDate: Date;
  };
}

// Depreciation Events
interface DepreciationCalculated {
  type: 'DepreciationCalculated';
  payload: {
    fiscalYear: number;
    fiscalMonth: number;
    totalAssets: number;
    totalDepreciation: number;
  };
}

interface DepreciationPosted {
  type: 'DepreciationPosted';
  payload: {
    fiscalYear: number;
    fiscalMonth: number;
    journalEntryId: string;
    totalDepreciation: number;
  };
}
```

---

## Depreciation Methods

### Supported Methods

#### 1. Straight-Line Method (Garis Lurus)

Most common method. Equal depreciation each period.

```typescript
class StraightLineDepreciation implements DepreciationCalculator {
  calculate(asset: FixedAsset, periodMonths: number = 1): number {
    const depreciableAmount = asset.acquisitionCost - asset.salvageValue;
    const monthlyDepreciation = depreciableAmount / asset.usefulLifeMonths;

    // Don't exceed remaining book value
    const remainingDepreciable = asset.bookValue - asset.salvageValue;
    return Math.min(monthlyDepreciation * periodMonths, remainingDepreciable);
  }
}

// Example:
// Acquisition Cost: Rp 12,000,000
// Salvage Value: Rp 2,000,000
// Useful Life: 60 months (5 years)
// Monthly Depreciation: (12,000,000 - 2,000,000) / 60 = Rp 166,667/month
```

#### 2. Declining Balance Method (Saldo Menurun)

Higher depreciation in early years, decreasing over time.

```typescript
class DecliningBalanceDepreciation implements DepreciationCalculator {
  private readonly accelerationFactor: number = 2; // Double declining

  calculate(asset: FixedAsset, periodMonths: number = 1): number {
    const straightLineRate = 1 / asset.usefulLifeMonths;
    const decliningRate = straightLineRate * this.accelerationFactor;

    // Apply to book value (not original cost)
    const annualDepreciation = asset.bookValue * decliningRate * 12;
    const monthlyDepreciation = annualDepreciation / 12;

    // Don't go below salvage value
    const maxDepreciation = asset.bookValue - asset.salvageValue;
    return Math.min(monthlyDepreciation * periodMonths, maxDepreciation);
  }
}

// Example:
// Acquisition Cost: Rp 12,000,000
// Salvage Value: Rp 2,000,000
// Useful Life: 60 months (5 years)
// Year 1 Rate: (1/5) * 2 = 40%
// Year 1 Depreciation: 12,000,000 * 40% = Rp 4,800,000
// Year 2 Depreciation: (12,000,000 - 4,800,000) * 40% = Rp 2,880,000
```

#### 3. Sum-of-Years-Digits Method (Jumlah Angka Tahun)

Accelerated depreciation based on remaining life.

```typescript
class SumOfYearsDigitsDepreciation implements DepreciationCalculator {
  calculate(asset: FixedAsset, periodMonths: number = 1): number {
    const usefulLifeYears = Math.ceil(asset.usefulLifeMonths / 12);
    const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;

    // Calculate remaining years
    const monthsUsed = this.getMonthsDepreciated(asset);
    const yearsUsed = Math.floor(monthsUsed / 12);
    const remainingYears = usefulLifeYears - yearsUsed;

    const depreciableAmount = asset.acquisitionCost - asset.salvageValue;
    const yearFraction = remainingYears / sumOfYears;
    const annualDepreciation = depreciableAmount * yearFraction;
    const monthlyDepreciation = annualDepreciation / 12;

    const maxDepreciation = asset.bookValue - asset.salvageValue;
    return Math.min(monthlyDepreciation * periodMonths, maxDepreciation);
  }
}

// Example:
// Useful Life: 5 years
// Sum of Years: 1+2+3+4+5 = 15
// Year 1: 5/15 = 33.33%
// Year 2: 4/15 = 26.67%
// Year 3: 3/15 = 20.00%
// Year 4: 2/15 = 13.33%
// Year 5: 1/15 = 6.67%
```

#### 4. Units of Production Method (Unit Produksi)

Based on actual usage (e.g., kilometers for vehicles).

```typescript
class UnitsOfProductionDepreciation implements DepreciationCalculator {
  calculate(asset: FixedAsset, unitsProduced: number): number {
    const depreciableAmount = asset.acquisitionCost - asset.salvageValue;
    const totalExpectedUnits = asset.estimatedTotalUnits;

    const depreciationPerUnit = depreciableAmount / totalExpectedUnits;
    const periodDepreciation = depreciationPerUnit * unitsProduced;

    const maxDepreciation = asset.bookValue - asset.salvageValue;
    return Math.min(periodDepreciation, maxDepreciation);
  }
}

// Example (Delivery Truck):
// Acquisition Cost: Rp 300,000,000
// Salvage Value: Rp 50,000,000
// Estimated Total KM: 500,000 km
// Depreciation per KM: (300,000,000 - 50,000,000) / 500,000 = Rp 500/km
// Month Usage: 5,000 km
// Monthly Depreciation: 5,000 * 500 = Rp 2,500,000
```

### Depreciation Calculator Service

```typescript
class DepreciationCalculatorService {
  private calculators: Map<DepreciationMethod, DepreciationCalculator> = new Map([
    [DepreciationMethod.STRAIGHT_LINE, new StraightLineDepreciation()],
    [DepreciationMethod.DECLINING_BALANCE, new DecliningBalanceDepreciation()],
    [DepreciationMethod.SUM_OF_YEARS_DIGITS, new SumOfYearsDigitsDepreciation()],
    [DepreciationMethod.UNITS_OF_PRODUCTION, new UnitsOfProductionDepreciation()]
  ]);

  calculateMonthlyDepreciation(asset: FixedAsset): number {
    // Skip if not depreciable
    if (!this.isDepreciable(asset)) {
      return 0;
    }

    const calculator = this.calculators.get(asset.depreciationMethod);
    if (!calculator) {
      throw new Error(`Unknown depreciation method: ${asset.depreciationMethod}`);
    }

    return calculator.calculate(asset, 1);
  }

  private isDepreciable(asset: FixedAsset): boolean {
    return (
      asset.status === AssetStatus.ACTIVE &&
      asset.bookValue > asset.salvageValue &&
      asset.depreciationStartDate <= new Date()
    );
  }

  generateSchedule(asset: FixedAsset): DepreciationSchedule[] {
    const schedules: DepreciationSchedule[] = [];
    let currentBookValue = asset.acquisitionCost;
    let accumulatedDepreciation = 0;

    const startDate = new Date(asset.depreciationStartDate);
    let currentMonth = startDate.getMonth();
    let currentYear = startDate.getFullYear();

    while (currentBookValue > asset.salvageValue) {
      const tempAsset = { ...asset, bookValue: currentBookValue };
      const depreciation = this.calculateMonthlyDepreciation(tempAsset);

      if (depreciation === 0) break;

      accumulatedDepreciation += depreciation;
      const closingBookValue = asset.acquisitionCost - accumulatedDepreciation;

      schedules.push({
        id: generateId(),
        assetId: asset.id,
        fiscalYear: currentYear,
        fiscalMonth: currentMonth + 1,
        openingBookValue: currentBookValue,
        depreciationAmount: depreciation,
        closingBookValue,
        accumulatedDepreciation,
        status: DepreciationStatus.SCHEDULED,
        calculatedAt: new Date()
      });

      currentBookValue = closingBookValue;
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    return schedules;
  }
}
```

---

## Asset Categories

### Default Categories for Kidkazz

```typescript
const DEFAULT_ASSET_CATEGORIES: AssetCategory[] = [
  {
    code: 'POS',
    name: 'POS Equipment',
    description: 'Point of Sale terminals, barcode scanners, receipt printers',
    defaultUsefulLifeMonths: 60,  // 5 years
    defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    defaultSalvageValuePercent: 10,
    assetAccountId: '1150',       // Office Equipment
    accumulatedDepreciationAccountId: '1155',
    depreciationExpenseAccountId: '6500',
    gainLossOnDisposalAccountId: '7100'
  },
  {
    code: 'WHS',
    name: 'Warehouse Equipment',
    description: 'Forklifts, pallet jacks, racking systems, conveyors',
    defaultUsefulLifeMonths: 120, // 10 years
    defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    defaultSalvageValuePercent: 5,
    assetAccountId: '1160',       // Warehouse Equipment
    accumulatedDepreciationAccountId: '1165',
    depreciationExpenseAccountId: '6500',
    gainLossOnDisposalAccountId: '7100'
  },
  {
    code: 'VEH',
    name: 'Vehicles',
    description: 'Delivery trucks, vans, motorcycles',
    defaultUsefulLifeMonths: 96,  // 8 years
    defaultDepreciationMethod: DepreciationMethod.DECLINING_BALANCE,
    defaultSalvageValuePercent: 15,
    assetAccountId: '1170',       // Vehicles
    accumulatedDepreciationAccountId: '1175',
    depreciationExpenseAccountId: '6510',
    gainLossOnDisposalAccountId: '7100'
  },
  {
    code: 'IT',
    name: 'IT Infrastructure',
    description: 'Servers, computers, networking equipment',
    defaultUsefulLifeMonths: 48,  // 4 years
    defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    defaultSalvageValuePercent: 5,
    assetAccountId: '1140',       // Computer Equipment
    accumulatedDepreciationAccountId: '1145',
    depreciationExpenseAccountId: '6500',
    gainLossOnDisposalAccountId: '7100'
  },
  {
    code: 'FIX',
    name: 'Store Fixtures',
    description: 'Shelving, display cases, signage',
    defaultUsefulLifeMonths: 120, // 10 years
    defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    defaultSalvageValuePercent: 0,
    assetAccountId: '1180',       // Fixtures & Fittings
    accumulatedDepreciationAccountId: '1185',
    depreciationExpenseAccountId: '6500',
    gainLossOnDisposalAccountId: '7100'
  },
  {
    code: 'FUR',
    name: 'Office Furniture',
    description: 'Desks, chairs, cabinets, AC units',
    defaultUsefulLifeMonths: 96,  // 8 years
    defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    defaultSalvageValuePercent: 5,
    assetAccountId: '1190',       // Furniture & Fixtures
    accumulatedDepreciationAccountId: '1195',
    depreciationExpenseAccountId: '6500',
    gainLossOnDisposalAccountId: '7100'
  },
  {
    code: 'BLD',
    name: 'Building Improvements',
    description: 'Leasehold improvements, renovations',
    defaultUsefulLifeMonths: 120, // 10 years or lease term
    defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    defaultSalvageValuePercent: 0,
    assetAccountId: '1200',       // Leasehold Improvements
    accumulatedDepreciationAccountId: '1205',
    depreciationExpenseAccountId: '6520',
    gainLossOnDisposalAccountId: '7100'
  }
];
```

### Chart of Accounts for Fixed Assets

```
1100-1199: Fixed Assets
├── 1140 Computer Equipment
├── 1145 Accumulated Depreciation - Computer Equipment
├── 1150 Office Equipment
├── 1155 Accumulated Depreciation - Office Equipment
├── 1160 Warehouse Equipment
├── 1165 Accumulated Depreciation - Warehouse Equipment
├── 1170 Vehicles
├── 1175 Accumulated Depreciation - Vehicles
├── 1180 Fixtures & Fittings
├── 1185 Accumulated Depreciation - Fixtures & Fittings
├── 1190 Furniture & Fixtures
├── 1195 Accumulated Depreciation - Furniture & Fixtures
├── 1200 Leasehold Improvements
└── 1205 Accumulated Depreciation - Leasehold Improvements

6500-6599: Depreciation Expenses
├── 6500 Depreciation Expense - General
├── 6510 Depreciation Expense - Vehicles
└── 6520 Depreciation Expense - Leasehold Improvements

7100-7199: Other Income/Expense
└── 7100 Gain/Loss on Asset Disposal
```

---

## Database Schema

```sql
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

  -- Accounting Accounts
  asset_account_id TEXT NOT NULL,
  accumulated_depreciation_account_id TEXT NOT NULL,
  depreciation_expense_account_id TEXT NOT NULL,
  gain_loss_on_disposal_account_id TEXT NOT NULL,

  -- Tax Settings
  tax_useful_life_months INTEGER,
  tax_depreciation_method TEXT,

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

  -- Current Values
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

-- Indexes
CREATE INDEX idx_fixed_assets_category ON fixed_assets(category_id);
CREATE INDEX idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX idx_fixed_assets_location ON fixed_assets(location_id);
CREATE INDEX idx_fixed_assets_barcode ON fixed_assets(barcode);
CREATE INDEX idx_depreciation_asset ON depreciation_schedules(asset_id);
CREATE INDEX idx_depreciation_period ON depreciation_schedules(fiscal_year, fiscal_month);
CREATE INDEX idx_depreciation_status ON depreciation_schedules(status);
CREATE INDEX idx_movements_asset ON asset_movements(asset_id);
CREATE INDEX idx_movements_date ON asset_movements(movement_date);
CREATE INDEX idx_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX idx_maintenance_status ON asset_maintenance(status);
```

---

## API Architecture

### RESTful Endpoints

```typescript
// Asset Categories
GET    /api/accounting/asset-categories              // List categories
GET    /api/accounting/asset-categories/:id          // Get category
POST   /api/accounting/asset-categories              // Create category
PUT    /api/accounting/asset-categories/:id          // Update category
DELETE /api/accounting/asset-categories/:id          // Deactivate category

// Fixed Assets
GET    /api/accounting/assets                        // List assets (with filters)
GET    /api/accounting/assets/:id                    // Get asset details
POST   /api/accounting/assets                        // Create asset (draft)
PUT    /api/accounting/assets/:id                    // Update asset
POST   /api/accounting/assets/:id/activate           // Activate asset (start depreciation)
POST   /api/accounting/assets/:id/dispose            // Dispose asset
POST   /api/accounting/assets/:id/transfer           // Transfer location/department
POST   /api/accounting/assets/:id/write-off          // Write off asset

// Depreciation
GET    /api/accounting/assets/:id/depreciation-schedule  // Get asset depreciation schedule
POST   /api/accounting/depreciation/calculate        // Calculate monthly depreciation (preview)
POST   /api/accounting/depreciation/post             // Post depreciation journal entries
GET    /api/accounting/depreciation/history          // Get depreciation history

// Asset Movements
GET    /api/accounting/assets/:id/movements          // Get asset movement history
POST   /api/accounting/assets/:id/movements          // Record movement

// Maintenance
GET    /api/accounting/assets/:id/maintenance        // Get maintenance history
POST   /api/accounting/assets/:id/maintenance        // Schedule/record maintenance
PUT    /api/accounting/maintenance/:id               // Update maintenance record

// Reports (via Reporting Service)
GET    /api/reports/assets/register                  // Asset register report
GET    /api/reports/assets/depreciation-schedule     // Depreciation schedule report
GET    /api/reports/assets/book-value                // Asset book value report
GET    /api/reports/assets/by-category               // Assets by category
GET    /api/reports/assets/by-location               // Assets by location
```

### Request/Response Examples

#### Create Asset

```typescript
// POST /api/accounting/assets
// Request
{
  "name": "POS Terminal - Store Jakarta",
  "categoryId": "cat-pos",
  "serialNumber": "SN-POS-2025-001",
  "barcode": "FA-POS-202501-001",
  "manufacturer": "Sunmi",
  "model": "T2 Mini",
  "locationId": "wh-jakarta",
  "departmentId": "dept-retail",
  "acquisitionDate": "2025-01-15",
  "acquisitionMethod": "PURCHASE",
  "acquisitionCost": 5500000,
  "supplierId": "sup-tech-001",
  "invoiceNumber": "INV-2025-001",
  "usefulLifeMonths": 60,
  "salvageValue": 550000,
  "depreciationMethod": "STRAIGHT_LINE",
  "depreciationStartDate": "2025-02-01",
  "warrantyExpiryDate": "2026-01-15",
  "createdBy": "user-001"
}

// Response
{
  "id": "fa-001",
  "assetNumber": "FA-POS-202501-0001",
  "name": "POS Terminal - Store Jakarta",
  "status": "DRAFT",
  "acquisitionCost": 5500000,
  "bookValue": 5500000,
  "monthlyDepreciation": 82500,
  "createdAt": "2025-01-16T10:00:00Z"
}
```

#### Calculate Depreciation (Preview)

```typescript
// POST /api/accounting/depreciation/calculate
// Request
{
  "fiscalYear": 2025,
  "fiscalMonth": 2
}

// Response
{
  "period": "2025-02",
  "summary": {
    "totalAssets": 45,
    "assetsDepreciated": 42,
    "assetsSkipped": 3,
    "totalDepreciation": 4850000
  },
  "byCategory": [
    {
      "categoryCode": "POS",
      "categoryName": "POS Equipment",
      "assetCount": 12,
      "totalDepreciation": 990000
    },
    {
      "categoryCode": "VEH",
      "categoryName": "Vehicles",
      "assetCount": 5,
      "totalDepreciation": 2500000
    }
  ],
  "details": [
    {
      "assetId": "fa-001",
      "assetNumber": "FA-POS-202501-0001",
      "assetName": "POS Terminal - Store Jakarta",
      "openingBookValue": 5500000,
      "depreciationAmount": 82500,
      "closingBookValue": 5417500
    }
  ],
  "journalEntryPreview": {
    "description": "Monthly Depreciation - February 2025",
    "lines": [
      { "accountCode": "6500", "accountName": "Depreciation Expense", "debit": 4850000, "credit": 0 },
      { "accountCode": "1145", "accountName": "Accum. Depr. - Computer Equip.", "debit": 0, "credit": 150000 },
      { "accountCode": "1155", "accountName": "Accum. Depr. - Office Equip.", "debit": 0, "credit": 990000 },
      { "accountCode": "1175", "accountName": "Accum. Depr. - Vehicles", "debit": 0, "credit": 2500000 }
    ]
  }
}
```

#### Dispose Asset

```typescript
// POST /api/accounting/assets/:id/dispose
// Request
{
  "disposalDate": "2025-01-16",
  "disposalMethod": "SALE",
  "disposalValue": 3000000,
  "disposalReason": "Upgrading to newer model",
  "performedBy": "user-001"
}

// Response
{
  "assetId": "fa-001",
  "assetNumber": "FA-POS-202501-0001",
  "disposalDate": "2025-01-16",
  "disposalMethod": "SALE",
  "bookValueAtDisposal": 4500000,
  "disposalValue": 3000000,
  "gainLoss": -1500000,
  "journalEntry": {
    "id": "je-2025-0150",
    "description": "Asset Disposal - FA-POS-202501-0001",
    "lines": [
      { "accountCode": "1010", "debit": 3000000, "credit": 0, "memo": "Cash from sale" },
      { "accountCode": "1155", "debit": 1000000, "credit": 0, "memo": "Accumulated depreciation" },
      { "accountCode": "7100", "debit": 1500000, "credit": 0, "memo": "Loss on disposal" },
      { "accountCode": "1150", "debit": 0, "credit": 5500000, "memo": "Original cost" }
    ]
  }
}
```

---

## Asset Lifecycle Workflows

### 1. Asset Acquisition Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ASSET ACQUISITION WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐│
│  │   Create     │────▶│   Review     │────▶│   Activate   │────▶│  Active    ││
│  │   Draft      │     │   & Approve  │     │   Asset      │     │  Asset     ││
│  └──────────────┘     └──────────────┘     └──────────────┘     └────────────┘│
│         │                    │                    │                    │        │
│         ▼                    ▼                    ▼                    ▼        │
│  • Enter details      • Verify info       • Set start date     • Depreciation  │
│  • Attach docs        • Check accounts    • Create journal     • Maintenance   │
│  • Set category       • Approval flow     • Record movement    • Tracking      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

Journal Entry on Activation:
  Debit:  Fixed Asset (1150)      Rp 5,500,000
  Credit: Cash/Bank (1010)        Rp 5,500,000
          OR
  Credit: Accounts Payable (2100) Rp 5,500,000
```

### 2. Monthly Depreciation Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      MONTHLY DEPRECIATION WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐│
│  │   Trigger    │────▶│  Calculate   │────▶│   Review     │────▶│   Post     ││
│  │   (Cron)     │     │  All Assets  │     │   Summary    │     │  Journal   ││
│  └──────────────┘     └──────────────┘     └──────────────┘     └────────────┘│
│                              │                    │                    │        │
│                              ▼                    ▼                    ▼        │
│                       • Skip disposed     • Show totals        • Create JE     │
│                       • Skip inactive     • By category        • Update assets │
│                       • Apply method      • Preview entry      • Publish event │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

Monthly Depreciation Journal Entry:
  Debit:  Depreciation Expense (6500)           Rp 4,850,000
  Credit: Accum. Depr. - Various accounts       Rp 4,850,000
```

### 3. Asset Disposal Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ASSET DISPOSAL WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐│
│  │   Initiate   │────▶│  Calculate   │────▶│   Approve    │────▶│  Complete  ││
│  │   Disposal   │     │  Gain/Loss   │     │   Disposal   │     │  Disposal  ││
│  └──────────────┘     └──────────────┘     └──────────────┘     └────────────┘│
│         │                    │                    │                    │        │
│         ▼                    ▼                    ▼                    ▼        │
│  • Select method      • Run final depr   • Review amounts     • Create JE     │
│  • Enter proceeds     • Book value       • Approval flow      • Update status │
│  • Enter reason       • Gain/Loss calc   • Documentation      • Archive data  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

Disposal Journal Entry (SALE with loss):
  Debit:  Cash/Bank (1010)                      Rp 3,000,000
  Debit:  Accum. Depreciation (1155)            Rp 1,000,000
  Debit:  Loss on Disposal (7100)               Rp 1,500,000
  Credit: Fixed Asset (1150)                    Rp 5,500,000

Disposal Journal Entry (SALE with gain):
  Debit:  Cash/Bank (1010)                      Rp 5,000,000
  Debit:  Accum. Depreciation (1155)            Rp 1,000,000
  Credit: Fixed Asset (1150)                    Rp 5,500,000
  Credit: Gain on Disposal (7100)               Rp   500,000
```

---

## Accounting Integration

### Impact on Financial Statements

#### Balance Sheet

```
ASSETS
├── Current Assets
│   └── ...
│
└── Fixed Assets (Non-Current)
    ├── Computer Equipment (1140)          Rp  50,000,000
    │   Less: Accumulated Depreciation     (Rp 15,000,000)
    │   Net Book Value                     Rp  35,000,000
    │
    ├── Office Equipment (1150)            Rp  75,000,000
    │   Less: Accumulated Depreciation     (Rp 25,000,000)
    │   Net Book Value                     Rp  50,000,000
    │
    ├── Vehicles (1170)                    Rp 300,000,000
    │   Less: Accumulated Depreciation     (Rp 80,000,000)
    │   Net Book Value                     Rp 220,000,000
    │
    └── Total Fixed Assets (Net)           Rp 305,000,000
```

#### Income Statement

```
OPERATING EXPENSES
├── ...
├── Depreciation Expense - General (6500)   Rp 4,500,000
├── Depreciation Expense - Vehicles (6510)  Rp 2,500,000
└── ...

OTHER INCOME/EXPENSE
├── Gain on Asset Disposal (7100)           Rp   500,000
└── Loss on Asset Disposal (7100)          (Rp 1,500,000)
```

### Journal Entry Templates

```typescript
const JOURNAL_ENTRY_TEMPLATES = {
  // Asset Acquisition (Purchase)
  ACQUISITION_PURCHASE: {
    description: 'Asset Acquisition - {assetNumber}',
    lines: [
      { accountType: 'ASSET', direction: 'Debit', amount: 'acquisitionCost' },
      { accountType: 'CASH', direction: 'Credit', amount: 'acquisitionCost' }
    ]
  },

  // Asset Acquisition (On Credit)
  ACQUISITION_CREDIT: {
    description: 'Asset Acquisition - {assetNumber}',
    lines: [
      { accountType: 'ASSET', direction: 'Debit', amount: 'acquisitionCost' },
      { accountType: 'ACCOUNTS_PAYABLE', direction: 'Credit', amount: 'acquisitionCost' }
    ]
  },

  // Monthly Depreciation
  DEPRECIATION: {
    description: 'Monthly Depreciation - {period}',
    lines: [
      { accountType: 'DEPRECIATION_EXPENSE', direction: 'Debit', amount: 'depreciationAmount' },
      { accountType: 'ACCUMULATED_DEPRECIATION', direction: 'Credit', amount: 'depreciationAmount' }
    ]
  },

  // Asset Disposal (with gain)
  DISPOSAL_GAIN: {
    description: 'Asset Disposal - {assetNumber}',
    lines: [
      { accountType: 'CASH', direction: 'Debit', amount: 'disposalValue' },
      { accountType: 'ACCUMULATED_DEPRECIATION', direction: 'Debit', amount: 'accumulatedDepreciation' },
      { accountType: 'ASSET', direction: 'Credit', amount: 'acquisitionCost' },
      { accountType: 'GAIN_ON_DISPOSAL', direction: 'Credit', amount: 'gain' }
    ]
  },

  // Asset Disposal (with loss)
  DISPOSAL_LOSS: {
    description: 'Asset Disposal - {assetNumber}',
    lines: [
      { accountType: 'CASH', direction: 'Debit', amount: 'disposalValue' },
      { accountType: 'ACCUMULATED_DEPRECIATION', direction: 'Debit', amount: 'accumulatedDepreciation' },
      { accountType: 'LOSS_ON_DISPOSAL', direction: 'Debit', amount: 'loss' },
      { accountType: 'ASSET', direction: 'Credit', amount: 'acquisitionCost' }
    ]
  },

  // Asset Write-Off
  WRITE_OFF: {
    description: 'Asset Write-Off - {assetNumber}',
    lines: [
      { accountType: 'ACCUMULATED_DEPRECIATION', direction: 'Debit', amount: 'accumulatedDepreciation' },
      { accountType: 'LOSS_ON_DISPOSAL', direction: 'Debit', amount: 'bookValue' },
      { accountType: 'ASSET', direction: 'Credit', amount: 'acquisitionCost' }
    ]
  },

  // Capitalized Maintenance
  MAINTENANCE_CAPITALIZED: {
    description: 'Capitalized Maintenance - {assetNumber}',
    lines: [
      { accountType: 'ASSET', direction: 'Debit', amount: 'maintenanceCost' },
      { accountType: 'CASH', direction: 'Credit', amount: 'maintenanceCost' }
    ]
  }
};
```

---

## Reporting Service Integration

### Events Published to Reporting Service

```typescript
// All asset-related events are published to Reporting Service for historical tracking

// Asset Events
AssetAcquired       → Store in asset_audit_trail
AssetActivated      → Store in asset_audit_trail
AssetTransferred    → Store in asset_audit_trail, asset_movement_history
AssetDisposed       → Store in asset_audit_trail, disposed_assets_archive

// Depreciation Events
DepreciationPosted  → Store in depreciation_history, monthly_summaries

// Maintenance Events
MaintenanceCompleted → Store in maintenance_history
```

### Data Archival Strategy

| Data Type | Accounting Service | Reporting Service |
|-----------|-------------------|-------------------|
| Active Assets | Full details | Summary only |
| Disposed Assets | Last 12 months | Full history |
| Depreciation Schedules | Current year | All history |
| Asset Movements | Last 12 months | All history |
| Maintenance Records | Last 12 months | All history |
| Journal Entries | Current + 1 year | All history |

### Archive Job (Monthly)

```typescript
class AssetArchivalJob {
  async run(): Promise<void> {
    const cutoffDate = subMonths(new Date(), 12);

    // Archive disposed assets older than 12 months
    const disposedAssets = await this.assetRepo.findDisposedBefore(cutoffDate);
    for (const asset of disposedAssets) {
      await this.reportingService.archiveAsset(asset);
      await this.assetRepo.delete(asset.id);
    }

    // Archive old depreciation schedules
    const oldSchedules = await this.depreciationRepo.findPostedBefore(cutoffDate);
    await this.reportingService.archiveDepreciationSchedules(oldSchedules);
    await this.depreciationRepo.deleteMany(oldSchedules.map(s => s.id));

    // Archive old movements
    const oldMovements = await this.movementRepo.findBefore(cutoffDate);
    await this.reportingService.archiveMovements(oldMovements);
    await this.movementRepo.deleteMany(oldMovements.map(m => m.id));
  }
}
```

---

## Related Documents

- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md)
- [Accounting Business Rules](./BUSINESS_RULES.md)
- [Asset Accounting Business Rules](./ASSET_ACCOUNTING_BUSINESS_RULES.md)
- [Asset Accounting Implementation Plan](./ASSET_ACCOUNTING_IMPLEMENTATION_PLAN.md)
- [Reporting Service Architecture](./REPORTING_SERVICE_ARCHITECTURE.md) (future)
