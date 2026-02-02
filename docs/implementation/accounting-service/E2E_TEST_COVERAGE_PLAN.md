# E2E Test Coverage Plan - Accounting Service

**Last Updated:** 2026-02-02
**Current Coverage:** 100% (112/112 APIs tested)

---

## Current Test Status

### ✅ Fully Tested Domains (100% Coverage)

| Domain | Tests | Test File |
|--------|-------|-----------|
| Chart of Accounts | 5 APIs | `01-period-setup.test.ts` |
| Journal Entries | 8 APIs | `01-06` tests |
| Account Balances | 3 APIs | `01-08` tests |
| Financial Reports | 5 APIs | `08-financial-reports.test.ts` |
| Budget Management | 9 APIs | `09-budget-management.test.ts` |
| Cash Management | 4 APIs | `10-cash-management.test.ts` |
| Bank Accounts | 7 APIs | `11-bank-reconciliation.test.ts` |
| Bank Reconciliation | 12 APIs | `11-bank-reconciliation.test.ts` |
| Fiscal Periods | 4/5 APIs (80%) | `01`, `07` tests |
| Fixed Assets | 9 APIs | `12-fixed-assets.test.ts` |
| Depreciation | 7 APIs | `13-depreciation.test.ts` |
| Multi-Currency | 7 APIs | `14-multi-currency.test.ts` |
| Audit & Compliance | 7 APIs | `15-audit-compliance.test.ts` |
| Asset Maintenance | 10 APIs | `16-asset-maintenance.test.ts` |

---

## 🔴 UNTESTED APIs - Requiring Coverage

### Phase 1: Fixed Assets & Depreciation (HIGH PRIORITY) - ✅ IMPLEMENTED

**Status:** Tests created in `12-fixed-assets.test.ts` and `13-depreciation.test.ts`

**Business Impact:** Core month-end accounting process. Depreciation entries affect financial statements.

#### 1.1 Fixed Assets Management (9 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| POST | `/api/v1/assets` | Create fixed asset | HIGH |
| GET | `/api/v1/assets` | List fixed assets | HIGH |
| GET | `/api/v1/assets/:id` | Get fixed asset by ID | HIGH |
| GET | `/api/v1/assets/barcode/:barcode` | Get asset by barcode | MEDIUM |
| GET | `/api/v1/assets/depreciable` | List assets needing depreciation | HIGH |
| PUT | `/api/v1/assets/:id` | Update fixed asset | HIGH |
| POST | `/api/v1/assets/:id/activate` | Activate asset | HIGH |
| POST | `/api/v1/assets/:id/transfer` | Transfer asset location/dept | MEDIUM |
| POST | `/api/v1/assets/:id/dispose` | Dispose asset (creates JE) | HIGH |

**Test File:** `12-fixed-assets.test.ts`

**Test Scenarios:**
1. Create asset with acquisition details (date, cost, useful life)
2. Activate asset and verify status change
3. Transfer asset between departments
4. Dispose asset and verify gain/loss journal entry
5. Query assets by various filters

#### 1.2 Asset Categories (5 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| POST | `/api/v1/asset-categories` | Create category | HIGH |
| GET | `/api/v1/asset-categories` | List categories | HIGH |
| GET | `/api/v1/asset-categories/:id` | Get category | HIGH |
| PUT | `/api/v1/asset-categories/:id` | Update category | MEDIUM |
| DELETE | `/api/v1/asset-categories/:id` | Delete category | MEDIUM |

**Test Scenarios:**
1. Create category with depreciation method (Straight-line, Declining Balance)
2. Update category depreciation settings
3. Prevent deletion of category with linked assets

#### 1.3 Depreciation Management (7 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| GET | `/api/v1/depreciation/preview` | Preview depreciation before posting | HIGH |
| GET | `/api/v1/depreciation/runs` | List depreciation runs | HIGH |
| GET | `/api/v1/depreciation/runs/:runId` | Get run details | MEDIUM |
| POST | `/api/v1/depreciation/calculate` | Calculate monthly depreciation | HIGH |
| POST | `/api/v1/depreciation/post` | Post depreciation to GL | HIGH |
| POST | `/api/v1/depreciation/reverse` | Reverse depreciation run | MEDIUM |
| GET | `/api/v1/depreciation/assets/:id/schedule` | Get asset depreciation schedule | HIGH |

**Test File:** `13-depreciation.test.ts`

**Test Scenarios:**
1. Preview depreciation for fiscal period
2. Calculate depreciation for all depreciable assets
3. Post depreciation entries (Dr: Depreciation Expense, Cr: Accum. Depreciation)
4. Verify asset book value updated
5. Reverse depreciation run and verify JE reversal
6. View depreciation schedule for specific asset

---

### Phase 2: Multi-Currency Support (HIGH PRIORITY) - ✅ IMPLEMENTED

**Status:** Tests created in `14-multi-currency.test.ts`

**Business Impact:** Required for USD transactions, foreign supplier payments, export revenue.

#### 2.1 Currency & Exchange Rates (7 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| GET | `/api/v1/currencies` | List supported currencies | HIGH |
| GET | `/api/v1/currencies/:code` | Get currency details | MEDIUM |
| GET | `/api/v1/currencies/exchange-rates` | Get rate history | HIGH |
| GET | `/api/v1/currencies/exchange-rates/latest` | Get current rate | HIGH |
| POST | `/api/v1/currencies/exchange-rates` | Set rate manually | HIGH |
| POST | `/api/v1/currencies/exchange-rates/fetch` | Fetch from JISDOR/API | MEDIUM |
| POST | `/api/v1/currencies/exchange-rates/convert` | Convert amount | HIGH |

**Test File:** `14-multi-currency.test.ts`

**Test Scenarios:**
1. Set USD/IDR exchange rate manually
2. Fetch latest rate from external source
3. Convert currency amounts
4. Create journal entry with foreign currency
5. Calculate and post exchange gain/loss at period end

---

### Phase 3: Audit & Compliance (HIGH PRIORITY) - ✅ IMPLEMENTED

**Status:** Tests created in `15-audit-compliance.test.ts`

**Business Impact:** Required for audit trail, tax compliance, and regulatory requirements.

#### 3.1 Audit Logs (3 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| GET | `/api/v1/audit-logs` | Query audit logs | HIGH |
| GET | `/api/v1/audit-logs/entity/:type/:id` | Get entity change history | HIGH |
| GET | `/api/v1/audit-logs/recent` | Get recent activity | MEDIUM |

#### 3.2 Tax Summary (2 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| POST | `/api/v1/tax-summary/calculate` | Calculate period tax | HIGH |
| GET | `/api/v1/tax-summary` | Get tax report | HIGH |

#### 3.3 Data Archival (2 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| GET | `/api/v1/archive/status` | Get archive eligibility | MEDIUM |
| POST | `/api/v1/archive/execute` | Execute archival | MEDIUM |

**Test File:** `15-audit-compliance.test.ts`

**Test Scenarios:**
1. Create journal entry and verify audit log created
2. Query audit logs by entity type
3. View change history for specific entity
4. Calculate tax summary for fiscal period
5. Generate tax report by type (PPh 21, PPh 23, PPN)

---

### Phase 4: Asset Maintenance (MEDIUM PRIORITY) - ✅ IMPLEMENTED

**Status:** Tests created in `16-asset-maintenance.test.ts`

**Business Impact:** Preventive maintenance tracking for fixed assets.

#### 4.1 Maintenance Records (10 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| GET | `/api/v1/maintenance/scheduled` | List scheduled maintenance | MEDIUM |
| GET | `/api/v1/maintenance/overdue` | List overdue maintenance | MEDIUM |
| GET | `/api/v1/maintenance/asset/:id` | Get asset maintenance history | MEDIUM |
| GET | `/api/v1/maintenance/:id` | Get maintenance record | MEDIUM |
| POST | `/api/v1/maintenance` | Create maintenance | MEDIUM |
| PUT | `/api/v1/maintenance/:id` | Update maintenance | LOW |
| POST | `/api/v1/maintenance/:id/start` | Start maintenance | MEDIUM |
| POST | `/api/v1/maintenance/:id/complete` | Complete maintenance | MEDIUM |
| POST | `/api/v1/maintenance/:id/cancel` | Cancel maintenance | LOW |
| DELETE | `/api/v1/maintenance/:id` | Delete maintenance | LOW |

**Test File:** `16-asset-maintenance.test.ts`

---

### Phase 5: Asset Movements & Events (MEDIUM PRIORITY)

#### 5.1 Asset Movements (3 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| GET | `/api/v1/movements` | List all movements | MEDIUM |
| GET | `/api/v1/movements/asset/:id` | Get asset movement history | MEDIUM |
| GET | `/api/v1/movements/:id` | Get movement details | LOW |

#### 5.2 Domain Events (6 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| GET | `/api/v1/events` | List domain events | LOW |
| GET | `/api/v1/events/:id` | Get event details | LOW |
| GET | `/api/v1/events/aggregate/:type/:id` | Get aggregate events | LOW |
| GET | `/api/v1/events/processed` | List processed events | LOW |
| GET | `/api/v1/events/processed/:eventId` | Check processing status | LOW |
| POST | `/api/v1/events/publish` | Publish pending events | LOW |

#### 5.3 Advanced Fiscal Period (2 APIs)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| POST | `/api/v1/fiscal-periods/:id/reopen` | Reopen closed period | MEDIUM |
| POST | `/api/v1/fiscal-periods/:id/lock` | Lock period permanently | MEDIUM |

**Test File:** `17-advanced-operations.test.ts`

---

## Implementation Plan

### Sprint 1: Fixed Assets & Depreciation
- Create `12-fixed-assets.test.ts` (9 tests)
- Create `13-depreciation.test.ts` (7 tests)
- Add API client methods for assets/depreciation
- **Estimated Tests:** 16

### Sprint 2: Multi-Currency
- Create `14-multi-currency.test.ts` (7 tests)
- Add API client methods for currencies
- **Estimated Tests:** 7

### Sprint 3: Audit & Compliance
- Create `15-audit-compliance.test.ts` (7 tests)
- Add API client methods for audit/tax
- **Estimated Tests:** 7

### Sprint 4: Maintenance & Advanced Ops
- Create `16-asset-maintenance.test.ts` (10 tests)
- Create `17-advanced-operations.test.ts` (8 tests)
- **Estimated Tests:** 18

---

## Summary

| Phase | Domain | APIs | Priority | Est. Tests |
|-------|--------|------|----------|------------|
| 1 | Fixed Assets & Depreciation | 21 | HIGH | 16 |
| 2 | Multi-Currency | 7 | HIGH | 7 |
| 3 | Audit & Compliance | 7 | HIGH | 7 |
| 4 | Asset Maintenance | 10 | MEDIUM | 10 |
| 5 | Advanced Operations | 11 | MEDIUM | 8 |
| **Total** | | **56** | | **48** |

**After Implementation:**
- Current: 82 tested APIs (73%)
- Target: 112 tested APIs (100%)
- New E2E Tests: ~48 additional tests
