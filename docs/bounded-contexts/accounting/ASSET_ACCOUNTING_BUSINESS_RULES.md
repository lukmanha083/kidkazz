# Asset Accounting Business Rules

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase

---

## Overview

This document defines the business rules for the Asset Accounting Module within the Accounting Service. These rules govern fixed asset management, depreciation calculation, asset lifecycle, and financial statement impacts.

---

## Table of Contents

1. [Asset Registration Rules](#asset-registration-rules)
2. [Asset Categorization Rules](#asset-categorization-rules)
3. [Depreciation Rules](#depreciation-rules)
4. [Asset Lifecycle Rules](#asset-lifecycle-rules)
5. [Asset Transfer Rules](#asset-transfer-rules)
6. [Asset Disposal Rules](#asset-disposal-rules)
7. [Maintenance Rules](#maintenance-rules)
8. [Financial Statement Rules](#financial-statement-rules)
9. [Tax Compliance Rules](#tax-compliance-rules)
10. [Audit & Control Rules](#audit--control-rules)

---

## Asset Registration Rules

### Rule 1: Asset Number Format

**Statement**: Every fixed asset MUST have a unique asset number following format: `FA-{CATEGORY}-{YYYYMM}-{SEQ}`.

**Rationale**: Standardized numbering enables easy identification, categorization, and tracking.

```typescript
function generateAssetNumber(category: AssetCategory, acquisitionDate: Date): string {
  const categoryCode = category.code;  // e.g., 'POS', 'VEH', 'IT'
  const yearMonth = formatDate(acquisitionDate, 'YYYYMM');
  const sequence = await getNextSequence('asset', `${categoryCode}-${yearMonth}`);

  return `FA-${categoryCode}-${yearMonth}-${sequence.toString().padStart(4, '0')}`;
}

// Examples:
// FA-POS-202501-0001  (POS Terminal acquired Jan 2025)
// FA-VEH-202501-0003  (Vehicle acquired Jan 2025)
// FA-IT-202502-0001   (IT Equipment acquired Feb 2025)
```

---

### Rule 2: Minimum Capitalization Threshold

**Statement**: Only items with acquisition cost >= Rp 2,500,000 (two and half million rupiah) MUST be capitalized as fixed assets. Items below this threshold SHOULD be expensed immediately.

**Rationale**: Materiality principle - tracking low-value items as fixed assets is not cost-effective.

```typescript
const CAPITALIZATION_THRESHOLD = 2500000;  // Rp 2,500,000

interface CapitalizationRule {
  validate(acquisitionCost: number): CapitalizationDecision {
    if (acquisitionCost >= CAPITALIZATION_THRESHOLD) {
      return {
        shouldCapitalize: true,
        reason: 'Above capitalization threshold'
      };
    }

    return {
      shouldCapitalize: false,
      reason: `Below threshold of Rp ${CAPITALIZATION_THRESHOLD.toLocaleString()}. Expense immediately.`,
      suggestedExpenseAccount: '6100'  // Office Supplies Expense
    };
  }
}
```

**Exception**: Items that are part of a larger asset (components) may be capitalized regardless of individual cost.

---

### Rule 3: Required Asset Information

**Statement**: Every fixed asset MUST have the following minimum information at registration:
- Name
- Category
- Acquisition date
- Acquisition cost
- Useful life
- Depreciation method
- Location (warehouse/store)

**Rationale**: Essential information for tracking, depreciation, and reporting.

```typescript
const REQUIRED_ASSET_FIELDS = [
  'name',
  'categoryId',
  'acquisitionDate',
  'acquisitionCost',
  'usefulLifeMonths',
  'depreciationMethod',
  'locationId'
];

interface AssetValidationRule {
  validate(asset: Partial<FixedAsset>): ValidationResult {
    const missingFields = REQUIRED_ASSET_FIELDS.filter(
      field => !asset[field] || asset[field] === ''
    );

    if (missingFields.length > 0) {
      return {
        isValid: false,
        errors: missingFields.map(f => `${f} is required`)
      };
    }

    return { isValid: true };
  }
}
```

---

### Rule 4: Acquisition Cost Components

**Statement**: Acquisition cost MUST include all costs necessary to bring the asset to working condition:
- Purchase price
- Import duties and taxes (non-refundable)
- Transportation and handling costs
- Installation costs
- Professional fees directly attributable

**Rationale**: PSAK 16 (Indonesian GAAP) requires capitalizing all directly attributable costs.

```typescript
interface AcquisitionCostComponents {
  purchasePrice: number;
  importDuties?: number;
  transportationCost?: number;
  installationCost?: number;
  professionalFees?: number;
  otherDirectCosts?: number;
}

function calculateTotalAcquisitionCost(components: AcquisitionCostComponents): number {
  return (
    components.purchasePrice +
    (components.importDuties || 0) +
    (components.transportationCost || 0) +
    (components.installationCost || 0) +
    (components.professionalFees || 0) +
    (components.otherDirectCosts || 0)
  );
}
```

---

### Rule 5: Barcode Uniqueness

**Statement**: If a barcode is assigned to an asset, it MUST be unique across all assets (active and disposed).

**Rationale**: Prevents duplicate scanning and ensures accurate asset identification.

```typescript
interface BarcodeUniqueRule {
  async validate(barcode: string, excludeAssetId?: string): Promise<boolean> {
    if (!barcode) return true;  // Barcode is optional

    const existing = await assetRepo.findByBarcode(barcode);

    if (existing && existing.id !== excludeAssetId) {
      throw new BusinessRuleError(
        'ASSET_001',
        `Barcode ${barcode} is already assigned to asset ${existing.assetNumber}`
      );
    }

    return true;
  }
}
```

---

## Asset Categorization Rules

### Rule 6: Category Assignment

**Statement**: Every asset MUST be assigned to exactly one asset category. Category determines:
- Default depreciation settings
- Accounting accounts for journal entries
- Reporting grouping

```typescript
interface CategoryAssignmentRule {
  async validate(categoryId: string): Promise<AssetCategory> {
    const category = await categoryRepo.findById(categoryId);

    if (!category) {
      throw new BusinessRuleError('ASSET_002', 'Invalid asset category');
    }

    if (!category.isActive) {
      throw new BusinessRuleError('ASSET_003', 'Asset category is inactive');
    }

    return category;
  }
}
```

---

### Rule 7: Category Account Configuration

**Statement**: Every asset category MUST have all four accounting accounts configured:
- Asset account (Balance Sheet - Assets)
- Accumulated depreciation account (Balance Sheet - Contra Asset)
- Depreciation expense account (Income Statement - Expense)
- Gain/Loss on disposal account (Income Statement - Other Income/Expense)

```typescript
interface CategoryAccountsRule {
  validate(category: AssetCategory): boolean {
    const requiredAccounts = [
      'assetAccountId',
      'accumulatedDepreciationAccountId',
      'depreciationExpenseAccountId',
      'gainLossOnDisposalAccountId'
    ];

    for (const account of requiredAccounts) {
      if (!category[account]) {
        throw new BusinessRuleError(
          'ASSET_004',
          `Category ${category.name} missing ${account} configuration`
        );
      }
    }

    return true;
  }
}
```

---

### Rule 8: Category Code Format

**Statement**: Category code MUST be 2-4 uppercase letters only.

```typescript
const CATEGORY_CODE_PATTERN = /^[A-Z]{2,4}$/;

interface CategoryCodeRule {
  validate(code: string): boolean {
    if (!CATEGORY_CODE_PATTERN.test(code)) {
      throw new BusinessRuleError(
        'ASSET_005',
        'Category code must be 2-4 uppercase letters'
      );
    }
    return true;
  }
}
```

---

## Depreciation Rules

### Rule 9: Depreciation Method Selection

**Statement**: Depreciation method MUST be selected based on asset type and usage pattern:

| Asset Type | Recommended Method | Rationale |
|------------|-------------------|-----------|
| Office Equipment | Straight-Line | Consistent usage over time |
| IT Equipment | Straight-Line | Technology obsolescence is predictable |
| Vehicles | Declining Balance | Higher usage/wear in early years |
| Warehouse Equipment | Straight-Line | Long, consistent useful life |
| Leasehold Improvements | Straight-Line | Over lease term or useful life (whichever shorter) |

```typescript
enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
  SUM_OF_YEARS_DIGITS = 'SUM_OF_YEARS_DIGITS',
  UNITS_OF_PRODUCTION = 'UNITS_OF_PRODUCTION'
}

function getRecommendedMethod(categoryCode: string): DepreciationMethod {
  const recommendations: Record<string, DepreciationMethod> = {
    'POS': DepreciationMethod.STRAIGHT_LINE,
    'IT': DepreciationMethod.STRAIGHT_LINE,
    'VEH': DepreciationMethod.DECLINING_BALANCE,
    'WHS': DepreciationMethod.STRAIGHT_LINE,
    'FIX': DepreciationMethod.STRAIGHT_LINE,
    'FUR': DepreciationMethod.STRAIGHT_LINE,
    'BLD': DepreciationMethod.STRAIGHT_LINE
  };

  return recommendations[categoryCode] || DepreciationMethod.STRAIGHT_LINE;
}
```

---

### Rule 10: Useful Life Determination

**Statement**: Useful life MUST be determined based on:
- Expected physical life
- Expected technological obsolescence
- Legal/contractual limits (for leased assets)

**Standard Useful Lives**:

| Category | Min (months) | Max (months) | Default (months) |
|----------|-------------|-------------|-----------------|
| POS Equipment | 36 | 72 | 60 |
| IT Infrastructure | 24 | 60 | 48 |
| Vehicles | 60 | 120 | 96 |
| Warehouse Equipment | 84 | 180 | 120 |
| Store Fixtures | 84 | 180 | 120 |
| Office Furniture | 60 | 120 | 96 |
| Leasehold Improvements | 12 | 180 | Lease term |

```typescript
interface UsefulLifeRule {
  validate(categoryCode: string, usefulLifeMonths: number): boolean {
    const limits = USEFUL_LIFE_LIMITS[categoryCode];

    if (!limits) {
      throw new BusinessRuleError('ASSET_006', `Unknown category: ${categoryCode}`);
    }

    if (usefulLifeMonths < limits.min || usefulLifeMonths > limits.max) {
      throw new BusinessRuleError(
        'ASSET_007',
        `Useful life for ${categoryCode} must be between ${limits.min} and ${limits.max} months`
      );
    }

    return true;
  }
}
```

---

### Rule 11: Salvage Value Constraints

**Statement**: Salvage value (residual value) MUST be:
- Non-negative
- Less than acquisition cost
- Typically 0-20% of acquisition cost based on category

```typescript
interface SalvageValueRule {
  validate(acquisitionCost: number, salvageValue: number, categoryCode: string): boolean {
    // Must be non-negative
    if (salvageValue < 0) {
      throw new BusinessRuleError('ASSET_008', 'Salvage value cannot be negative');
    }

    // Must be less than acquisition cost
    if (salvageValue >= acquisitionCost) {
      throw new BusinessRuleError(
        'ASSET_009',
        'Salvage value must be less than acquisition cost'
      );
    }

    // Check typical range for category
    const maxPercent = SALVAGE_VALUE_MAX_PERCENT[categoryCode] || 20;
    const maxSalvage = acquisitionCost * (maxPercent / 100);

    if (salvageValue > maxSalvage) {
      console.warn(
        `Salvage value ${salvageValue} exceeds typical ${maxPercent}% for ${categoryCode}`
      );
    }

    return true;
  }
}
```

---

### Rule 12: Depreciation Start Date

**Statement**: Depreciation MUST start from the first day of the month following the acquisition date, unless the asset is acquired on the first day of a month.

**Rationale**: Simplifies calculation and aligns with monthly depreciation runs.

```typescript
function determineDepreciationStartDate(acquisitionDate: Date): Date {
  const day = acquisitionDate.getDate();

  if (day === 1) {
    // Acquired on first day - start same month
    return acquisitionDate;
  }

  // Start first day of next month
  return startOfMonth(addMonths(acquisitionDate, 1));
}

// Examples:
// Acquired: 2025-01-15 → Start: 2025-02-01
// Acquired: 2025-01-01 → Start: 2025-01-01
// Acquired: 2025-01-31 → Start: 2025-02-01
```

---

### Rule 13: Monthly Depreciation Calculation

**Statement**: Depreciation MUST be calculated monthly and posted as a single journal entry consolidating all assets.

**Timing**: Run on the last day of each month or first day of following month.

```typescript
interface MonthlyDepreciationRule {
  async calculate(fiscalYear: number, fiscalMonth: number): Promise<DepreciationBatch> {
    // Get all depreciable assets
    const assets = await assetRepo.findDepreciable();

    const schedules: DepreciationSchedule[] = [];
    let totalDepreciation = 0;

    for (const asset of assets) {
      // Check if asset should be depreciated this month
      if (!this.shouldDepreciateThisMonth(asset, fiscalYear, fiscalMonth)) {
        continue;
      }

      // Calculate depreciation
      const calculator = getDepreciationCalculator(asset.depreciationMethod);
      const amount = calculator.calculate(asset, 1);

      if (amount > 0) {
        schedules.push({
          assetId: asset.id,
          fiscalYear,
          fiscalMonth,
          openingBookValue: asset.bookValue,
          depreciationAmount: amount,
          closingBookValue: asset.bookValue - amount,
          accumulatedDepreciation: asset.accumulatedDepreciation + amount,
          status: DepreciationStatus.CALCULATED
        });

        totalDepreciation += amount;
      }
    }

    return {
      fiscalYear,
      fiscalMonth,
      schedules,
      totalDepreciation
    };
  }
}
```

---

### Rule 14: Depreciation Cannot Exceed Book Value

**Statement**: Depreciation in any period MUST NOT cause book value to fall below salvage value.

```typescript
interface DepreciationLimitRule {
  calculate(asset: FixedAsset, calculatedDepreciation: number): number {
    const maxDepreciation = asset.bookValue - asset.salvageValue;

    if (calculatedDepreciation > maxDepreciation) {
      // Limit to remaining depreciable amount
      return Math.max(0, maxDepreciation);
    }

    return calculatedDepreciation;
  }
}
```

---

### Rule 15: Fully Depreciated Asset Handling

**Statement**: When an asset reaches salvage value (fully depreciated):
- Status changes to `FULLY_DEPRECIATED`
- Asset remains on books until disposed
- No further depreciation is calculated
- Asset can still be used, maintained, and transferred

```typescript
interface FullyDepreciatedRule {
  async handle(asset: FixedAsset): Promise<void> {
    if (asset.bookValue <= asset.salvageValue && asset.status === AssetStatus.ACTIVE) {
      asset.status = AssetStatus.FULLY_DEPRECIATED;

      await publishEvent(new AssetFullyDepreciated({
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        finalBookValue: asset.bookValue,
        totalDepreciation: asset.accumulatedDepreciation
      }));
    }
  }
}
```

---

## Asset Lifecycle Rules

### Rule 16: Asset Status Transitions

**Statement**: Asset status transitions MUST follow this state machine:

```
DRAFT ──────────► ACTIVE ──────────► FULLY_DEPRECIATED
                    │                       │
                    │                       │
                    ▼                       ▼
             UNDER_MAINTENANCE ◄────────────┘
                    │
                    ▼
         ┌─────────┴─────────┐
         ▼                   ▼
     DISPOSED           WRITTEN_OFF
```

**Valid Transitions**:

| From | To | Trigger |
|------|-----|---------|
| DRAFT | ACTIVE | Activate (sets depreciation start) |
| ACTIVE | UNDER_MAINTENANCE | Send for repair |
| ACTIVE | DISPOSED | Sale/Scrap/Donation |
| ACTIVE | WRITTEN_OFF | Theft/Loss/Obsolete |
| ACTIVE | FULLY_DEPRECIATED | Book value = Salvage value |
| UNDER_MAINTENANCE | ACTIVE | Return from repair |
| UNDER_MAINTENANCE | DISPOSED | Cannot repair |
| UNDER_MAINTENANCE | WRITTEN_OFF | Cannot repair |
| FULLY_DEPRECIATED | UNDER_MAINTENANCE | Send for repair |
| FULLY_DEPRECIATED | DISPOSED | Sale/Scrap/Donation |
| FULLY_DEPRECIATED | WRITTEN_OFF | Theft/Loss/Obsolete |

```typescript
const VALID_STATUS_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  [AssetStatus.DRAFT]: [AssetStatus.ACTIVE],
  [AssetStatus.ACTIVE]: [
    AssetStatus.UNDER_MAINTENANCE,
    AssetStatus.DISPOSED,
    AssetStatus.WRITTEN_OFF,
    AssetStatus.FULLY_DEPRECIATED
  ],
  [AssetStatus.FULLY_DEPRECIATED]: [
    AssetStatus.UNDER_MAINTENANCE,
    AssetStatus.DISPOSED,
    AssetStatus.WRITTEN_OFF
  ],
  [AssetStatus.UNDER_MAINTENANCE]: [
    AssetStatus.ACTIVE,
    AssetStatus.DISPOSED,
    AssetStatus.WRITTEN_OFF
  ],
  [AssetStatus.DISPOSED]: [],      // Terminal state
  [AssetStatus.WRITTEN_OFF]: []    // Terminal state
};

function validateStatusTransition(from: AssetStatus, to: AssetStatus): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[from];

  if (!validTransitions.includes(to)) {
    throw new BusinessRuleError(
      'ASSET_010',
      `Cannot transition from ${from} to ${to}`
    );
  }

  return true;
}
```

---

### Rule 17: Activation Requirements

**Statement**: An asset can only be activated (DRAFT → ACTIVE) when:
- All required fields are populated
- Category is valid and active
- Depreciation start date is set
- Journal entry for acquisition is created

```typescript
interface ActivationRule {
  async validate(asset: FixedAsset): Promise<boolean> {
    // Check required fields
    const requiredFields = [
      'name', 'categoryId', 'acquisitionCost', 'usefulLifeMonths',
      'depreciationMethod', 'depreciationStartDate', 'locationId'
    ];

    for (const field of requiredFields) {
      if (!asset[field]) {
        throw new BusinessRuleError('ASSET_011', `${field} is required for activation`);
      }
    }

    // Verify category
    const category = await categoryRepo.findById(asset.categoryId);
    if (!category || !category.isActive) {
      throw new BusinessRuleError('ASSET_012', 'Invalid or inactive category');
    }

    // Depreciation start date must be set
    if (!asset.depreciationStartDate) {
      throw new BusinessRuleError('ASSET_013', 'Depreciation start date is required');
    }

    return true;
  }
}
```

---

## Asset Transfer Rules

### Rule 18: Transfer Documentation

**Statement**: Every asset transfer (location or department) MUST be documented with:
- Transfer date
- From/To location or department
- Reason for transfer
- User who performed transfer

```typescript
interface TransferRule {
  async execute(request: TransferRequest): Promise<AssetMovement> {
    // Validate asset exists and is transferable
    const asset = await assetRepo.findById(request.assetId);

    if (!asset) {
      throw new BusinessRuleError('ASSET_014', 'Asset not found');
    }

    const transferableStatuses = [
      AssetStatus.ACTIVE,
      AssetStatus.FULLY_DEPRECIATED
    ];

    if (!transferableStatuses.includes(asset.status)) {
      throw new BusinessRuleError(
        'ASSET_015',
        `Cannot transfer asset in status ${asset.status}`
      );
    }

    // Create movement record
    const movement: AssetMovement = {
      id: generateId(),
      assetId: asset.id,
      movementType: MovementType.TRANSFER,
      fromLocationId: asset.locationId,
      toLocationId: request.toLocationId,
      fromDepartmentId: asset.departmentId,
      toDepartmentId: request.toDepartmentId,
      movementDate: request.transferDate,
      reason: request.reason,
      performedBy: request.performedBy,
      createdAt: new Date()
    };

    // Update asset
    asset.locationId = request.toLocationId || asset.locationId;
    asset.departmentId = request.toDepartmentId || asset.departmentId;

    await movementRepo.save(movement);
    await assetRepo.save(asset);

    await publishEvent(new AssetTransferred({
      assetId: asset.id,
      fromLocationId: movement.fromLocationId,
      toLocationId: movement.toLocationId,
      transferDate: movement.movementDate
    }));

    return movement;
  }
}
```

---

### Rule 19: Inter-Warehouse Transfer

**Statement**: When an asset is transferred between warehouses:
- No accounting entry is required (same legal entity)
- Movement history is recorded
- Asset physical inventory count is updated at both locations

```typescript
// No journal entry needed for inter-location transfer within same company
// Only movement record and inventory update
```

---

## Asset Disposal Rules

### Rule 20: Disposal Method Classification

**Statement**: Every disposal MUST be classified with one of the following methods:

| Method | Description | Typical Proceeds |
|--------|-------------|------------------|
| SALE | Sold to third party | Market value |
| SCRAP | Sold for scrap value | Minimal |
| DONATION | Given to charity/school | Zero |
| THEFT | Stolen (police report required) | Zero |
| TRADE_IN | Exchanged for new asset | Credit applied |
| TRANSFER_OUT | Transferred to related entity | Book value |

```typescript
enum DisposalMethod {
  SALE = 'SALE',
  SCRAP = 'SCRAP',
  DONATION = 'DONATION',
  THEFT = 'THEFT',
  TRADE_IN = 'TRADE_IN',
  TRANSFER_OUT = 'TRANSFER_OUT'
}
```

---

### Rule 21: Final Depreciation Before Disposal

**Statement**: Before disposing an asset, depreciation MUST be calculated up to the disposal date.

**Rationale**: Ensures book value is accurate at time of disposal for gain/loss calculation.

```typescript
interface DisposalDepreciationRule {
  async runFinalDepreciation(asset: FixedAsset, disposalDate: Date): Promise<number> {
    const lastDepreciationDate = asset.lastDepreciationDate || asset.depreciationStartDate;

    // Calculate months between last depreciation and disposal
    const monthsToDepreciate = differenceInMonths(disposalDate, lastDepreciationDate);

    if (monthsToDepreciate <= 0) {
      return 0;  // Already depreciated up to date
    }

    // Run partial month depreciation
    const calculator = getDepreciationCalculator(asset.depreciationMethod);
    const finalDepreciation = calculator.calculate(asset, monthsToDepreciate);

    // Update asset
    asset.accumulatedDepreciation += finalDepreciation;
    asset.bookValue = asset.acquisitionCost - asset.accumulatedDepreciation;
    asset.lastDepreciationDate = disposalDate;

    return finalDepreciation;
  }
}
```

---

### Rule 22: Gain/Loss Calculation

**Statement**: Gain or loss on disposal MUST be calculated as:
- **Gain**: Disposal proceeds > Book value at disposal
- **Loss**: Disposal proceeds < Book value at disposal

```typescript
function calculateGainLoss(
  bookValueAtDisposal: number,
  disposalProceeds: number
): { gainLoss: number; isGain: boolean } {
  const gainLoss = disposalProceeds - bookValueAtDisposal;

  return {
    gainLoss: Math.abs(gainLoss),
    isGain: gainLoss > 0
  };
}

// Examples:
// Book Value: 4,000,000, Sale Price: 5,000,000 → Gain: 1,000,000
// Book Value: 4,000,000, Sale Price: 3,000,000 → Loss: 1,000,000
// Book Value: 4,000,000, Scrap Value: 500,000 → Loss: 3,500,000
```

---

### Rule 23: Disposal Journal Entry

**Statement**: Asset disposal MUST create a journal entry that:
- Removes asset from books (credit asset account)
- Removes accumulated depreciation (debit accum. depr. account)
- Records proceeds (debit cash/receivable if sold)
- Records gain or loss

```typescript
interface DisposalJournalRule {
  createJournalEntry(disposal: AssetDisposal): JournalEntry {
    const lines: JournalLine[] = [];
    const category = disposal.asset.category;

    // Debit: Cash/Bank (if proceeds received)
    if (disposal.disposalValue > 0) {
      lines.push({
        accountId: '1010',  // Cash/Bank
        direction: 'Debit',
        amount: disposal.disposalValue,
        memo: 'Proceeds from asset disposal'
      });
    }

    // Debit: Accumulated Depreciation (remove contra asset)
    lines.push({
      accountId: category.accumulatedDepreciationAccountId,
      direction: 'Debit',
      amount: disposal.asset.accumulatedDepreciation,
      memo: 'Remove accumulated depreciation'
    });

    // Credit: Fixed Asset (remove asset)
    lines.push({
      accountId: category.assetAccountId,
      direction: 'Credit',
      amount: disposal.asset.acquisitionCost,
      memo: 'Remove fixed asset from books'
    });

    // Debit/Credit: Gain or Loss
    if (disposal.gainLoss !== 0) {
      lines.push({
        accountId: category.gainLossOnDisposalAccountId,
        direction: disposal.isGain ? 'Credit' : 'Debit',
        amount: Math.abs(disposal.gainLoss),
        memo: disposal.isGain ? 'Gain on disposal' : 'Loss on disposal'
      });
    }

    return {
      entryDate: disposal.disposalDate,
      description: `Asset Disposal - ${disposal.asset.assetNumber}`,
      reference: disposal.asset.assetNumber,
      entryType: 'System',
      lines
    };
  }
}
```

---

### Rule 24: Disposal Approval

**Statement**: Asset disposal MUST be approved based on book value:

| Book Value | Approval Required |
|------------|-------------------|
| < Rp 5,000,000 | Department Manager |
| Rp 5,000,000 - 50,000,000 | Finance Manager |
| > Rp 50,000,000 | Director/CFO |

```typescript
interface DisposalApprovalRule {
  getRequiredApprover(bookValue: number): ApprovalLevel {
    if (bookValue < 5000000) {
      return ApprovalLevel.DEPARTMENT_MANAGER;
    }

    if (bookValue <= 50000000) {
      return ApprovalLevel.FINANCE_MANAGER;
    }

    return ApprovalLevel.DIRECTOR;
  }
}
```

---

## Maintenance Rules

### Rule 25: Capitalized vs Expensed Maintenance

**Statement**: Maintenance costs MUST be capitalized (added to asset cost) only if they:
- Extend the useful life of the asset, OR
- Increase the capacity/efficiency of the asset, OR
- Improve the quality of output

Otherwise, maintenance costs MUST be expensed immediately.

```typescript
interface MaintenanceCapitalizationRule {
  evaluate(maintenance: AssetMaintenance): CapitalizationDecision {
    // Criteria for capitalization
    const shouldCapitalize = (
      maintenance.extendsUsefulLife ||
      maintenance.increasesCapacity ||
      maintenance.improvesQuality
    );

    if (shouldCapitalize) {
      return {
        capitalize: true,
        reason: 'Maintenance improves asset capability',
        journalEntry: {
          debit: 'AssetAccount',
          credit: 'Cash/Payable'
        }
      };
    }

    return {
      capitalize: false,
      reason: 'Routine maintenance - expense immediately',
      journalEntry: {
        debit: 'RepairExpense (6600)',
        credit: 'Cash/Payable'
      }
    };
  }
}
```

---

### Rule 26: Useful Life Extension

**Statement**: When capitalized maintenance extends useful life:
- Asset's useful life months MUST be updated
- Remaining depreciation schedule MUST be recalculated
- The new monthly depreciation = (New book value - Salvage value) / New remaining life

```typescript
interface UsefulLifeExtensionRule {
  recalculate(asset: FixedAsset, additionalMonths: number, additionalCost: number): void {
    // Add cost to asset
    asset.acquisitionCost += additionalCost;
    asset.bookValue += additionalCost;

    // Extend useful life
    asset.usefulLifeMonths += additionalMonths;

    // Recalculate depreciation
    const remainingMonths = asset.usefulLifeMonths - this.getMonthsDepreciated(asset);
    const newMonthlyDepreciation = (asset.bookValue - asset.salvageValue) / remainingMonths;

    // Log change
    console.log(`Asset ${asset.assetNumber}: Extended by ${additionalMonths} months, new monthly depreciation: ${newMonthlyDepreciation}`);
  }
}
```

---

## Financial Statement Rules

### Rule 27: Balance Sheet Presentation

**Statement**: Fixed assets MUST be presented on the Balance Sheet as:
- Gross asset value (acquisition cost)
- Less: Accumulated depreciation
- Equals: Net book value

**Grouping**: By asset category.

```
Fixed Assets (Non-Current Assets)
├── Computer Equipment                    Rp  50,000,000
│   Less: Accumulated Depreciation       (Rp  15,000,000)
│   Net Book Value                        Rp  35,000,000
├── Office Equipment                      Rp  75,000,000
│   Less: Accumulated Depreciation       (Rp  25,000,000)
│   Net Book Value                        Rp  50,000,000
└── Total Fixed Assets (Net)              Rp  85,000,000
```

---

### Rule 28: Income Statement Impact

**Statement**: Asset-related expenses on Income Statement MUST include:
- Depreciation Expense (monthly depreciation)
- Repair & Maintenance Expense (non-capitalized maintenance)
- Loss on Asset Disposal (if any)

Asset-related income MUST include:
- Gain on Asset Disposal (if any)

---

## Tax Compliance Rules

### Rule 29: Indonesian Tax Depreciation (PSAK 16)

**Statement**: For tax purposes, depreciation methods and useful lives may differ from book values. The system MUST support:
- Separate tax useful life per category
- Separate tax depreciation method
- Deferred tax calculation (future enhancement)

**Indonesian Tax Useful Lives** (PMK 96/PMK.03/2009):

| Asset Group | Useful Life | Straight-Line Rate | Declining Rate |
|-------------|-------------|-------------------|----------------|
| Group 1 (Office equipment, computers) | 4 years | 25% | 50% |
| Group 2 (Vehicles, heavy equipment) | 8 years | 12.5% | 25% |
| Group 3 (Industrial machinery) | 16 years | 6.25% | 12.5% |
| Group 4 (Buildings - permanent) | 20 years | 5% | 10% |
| Non-permanent buildings | 10 years | 10% | - |

---

### Rule 30: Asset Tagging for Tax

**Statement**: Each asset category MUST be mapped to an Indonesian tax asset group for tax reporting.

```typescript
const TAX_GROUP_MAPPING: Record<string, TaxAssetGroup> = {
  'POS': TaxAssetGroup.GROUP_1,     // 4 years
  'IT': TaxAssetGroup.GROUP_1,      // 4 years
  'FUR': TaxAssetGroup.GROUP_2,     // 8 years
  'VEH': TaxAssetGroup.GROUP_2,     // 8 years
  'WHS': TaxAssetGroup.GROUP_2,     // 8 years
  'FIX': TaxAssetGroup.GROUP_2,     // 8 years
  'BLD': TaxAssetGroup.NON_PERMANENT_BUILDING  // 10 years
};
```

---

## Audit & Control Rules

### Rule 31: Asset Edit Restrictions

**Statement**: After an asset is activated:
- Acquisition cost CANNOT be changed (except for capitalized maintenance)
- Acquisition date CANNOT be changed
- Category CANNOT be changed
- Depreciation method can only be changed with approval

```typescript
interface AssetEditRule {
  validateEdit(original: FixedAsset, updated: FixedAsset): boolean {
    if (original.status !== AssetStatus.DRAFT) {
      // Check locked fields
      if (original.acquisitionCost !== updated.acquisitionCost) {
        throw new BusinessRuleError('ASSET_016', 'Cannot change acquisition cost after activation');
      }

      if (original.acquisitionDate !== updated.acquisitionDate) {
        throw new BusinessRuleError('ASSET_017', 'Cannot change acquisition date after activation');
      }

      if (original.categoryId !== updated.categoryId) {
        throw new BusinessRuleError('ASSET_018', 'Cannot change category after activation');
      }
    }

    return true;
  }
}
```

---

### Rule 32: Depreciation Reversal Prohibition

**Statement**: Posted depreciation journal entries CANNOT be reversed or deleted. Corrections MUST be made through adjusting entries.

**Rationale**: Maintains audit trail integrity.

```typescript
interface DepreciationReversalRule {
  validate(action: string, schedule: DepreciationSchedule): boolean {
    if (schedule.status === DepreciationStatus.POSTED && action === 'DELETE') {
      throw new BusinessRuleError(
        'ASSET_019',
        'Cannot delete posted depreciation. Create adjusting entry instead.'
      );
    }

    return true;
  }
}
```

---

### Rule 33: Physical Inventory Verification

**Statement**: All fixed assets MUST be physically verified at least once per year. Verification MUST include:
- Asset existence confirmation
- Condition assessment
- Location verification
- Barcode/serial number check

```typescript
interface PhysicalVerificationRule {
  async checkVerificationStatus(): Promise<VerificationReport> {
    const oneYearAgo = subYears(new Date(), 1);

    const unverifiedAssets = await assetRepo.findUnverifiedSince(oneYearAgo);

    return {
      totalAssets: await assetRepo.countActive(),
      unverifiedCount: unverifiedAssets.length,
      unverifiedAssets: unverifiedAssets.map(a => ({
        assetNumber: a.assetNumber,
        name: a.name,
        location: a.locationId,
        lastVerified: a.lastVerifiedAt
      })),
      requiresAction: unverifiedAssets.length > 0
    };
  }
}
```

---

### Rule 34: Version Control

**Statement**: Every asset modification MUST increment the version number for optimistic locking.

```typescript
interface AssetVersionRule {
  async update(asset: FixedAsset, expectedVersion: number): Promise<void> {
    if (asset.version !== expectedVersion) {
      throw new ConcurrencyError(
        'ASSET_020',
        'Asset has been modified by another user. Please refresh and try again.'
      );
    }

    asset.version++;
    asset.updatedAt = new Date();

    await assetRepo.save(asset);
  }
}
```

---

## Summary

| Category | Rules | Key Points |
|----------|-------|------------|
| Registration | 1-5 | Numbering, capitalization threshold, required fields, cost components |
| Categorization | 6-8 | Category assignment, account configuration |
| Depreciation | 9-15 | Method selection, useful life, salvage value, monthly calculation |
| Lifecycle | 16-17 | Status transitions, activation requirements |
| Transfer | 18-19 | Documentation, inter-warehouse handling |
| Disposal | 20-24 | Classification, final depreciation, gain/loss, journal entries, approval |
| Maintenance | 25-26 | Capitalize vs expense, useful life extension |
| Financial Statements | 27-28 | Balance sheet presentation, income statement impact |
| Tax Compliance | 29-30 | Indonesian PSAK 16, tax grouping |
| Audit & Control | 31-34 | Edit restrictions, reversal prohibition, physical verification, versioning |

---

## Related Documents

- [Asset Accounting Architecture](./ASSET_ACCOUNTING_ARCHITECTURE.md)
- [Asset Accounting Implementation Plan](./ASSET_ACCOUNTING_IMPLEMENTATION_PLAN.md)
- [Accounting Business Rules](./BUSINESS_RULES.md)
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md)
