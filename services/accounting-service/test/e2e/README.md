# E2E Tests - Accounting Service

End-to-end tests for the accounting service using real Cloudflare D1 database.

## Prerequisites

1. **Cloudflare Account**: You need access to the Cloudflare account with the D1 database configured
2. **Wrangler Authentication**: Run `wrangler login` if not already authenticated
3. **D1 Database**: The `accounting-db` database must exist with migrations applied

## Running E2E Tests

### Option 1: Local Dev Server with Remote D1

Start the dev server with remote D1 connection:

```bash
# Terminal 1: Start dev server with remote D1
pnpm dev:remote

# Terminal 2: Run E2E tests
pnpm test:e2e
```

### Option 2: Against Deployed Worker

Set the `E2E_API_URL` environment variable to point to your deployed worker:

```bash
E2E_API_URL=https://accounting-service.your-domain.workers.dev pnpm test:e2e
```

## Test Scenarios

The tests simulate a complete 1-month accounting cycle for a trading company:

| Scenario | Description | Key Transactions |
|----------|-------------|------------------|
| **01-period-setup** | Create fiscal period, COA, and opening balance | Owner invests Rp 1.2B inventory |
| **02-inventory-purchases** | Record inventory purchases on credit | Supplier A: Rp 150M, Supplier B: Rp 200M |
| **03-cash-sales** | Record retail POS sales with COGS | Sale 1: Rp 50M, Sale 2: Rp 75M |
| **04-operating-expenses** | Record various operating expenses | Salary, rent, electricity, bank charges |
| **05-credit-sales** | Record wholesale credit sales | Customer A: Rp 100M, Customer B: Rp 80M |
| **06-cash-collections** | Collect AR, pay AP, deposit cash | AR: Rp 60M, AP: Rp 150M |
| **07-month-end-close** | Adjusting entries and period close | Depreciation, accrued salary |
| **08-financial-reports** | Generate and verify all reports | Trial Balance, P&L, Balance Sheet |

## Transaction Summary

### Opening Balance (Scenario 01)
```
DR: Inventory (1210)      Rp 1,200,000,000
CR: Owner's Capital (3100) Rp 1,200,000,000
```

### Revenue & COGS
| Type | Revenue | COGS | Gross Profit |
|------|---------|------|--------------|
| POS Retail | Rp 125,000,000 | Rp 87,500,000 | Rp 37,500,000 |
| Wholesale | Rp 180,000,000 | Rp 126,000,000 | Rp 54,000,000 |
| **Total** | **Rp 305,000,000** | **Rp 213,500,000** | **Rp 91,500,000** |

### Operating Expenses
| Expense | Amount |
|---------|--------|
| Salary | Rp 25,000,000 |
| Rent | Rp 15,000,000 |
| Electricity | Rp 3,500,000 |
| Bank Charges | Rp 150,000 |
| Depreciation | Rp 2,500,000 |
| Accrued Salary | Rp 8,000,000 |
| **Total** | **Rp 54,150,000** |

## Test Data

Tests create data with `E2E-` prefix in references for easy identification:
- `E2E-OB-*`: Opening balance entries
- `E2E-PO-*`: Purchase order entries
- `E2E-SALE-*`: Sales entries
- `E2E-COGS-*`: COGS entries
- `E2E-SAL-*`: Salary entries
- `E2E-RENT-*`: Rent entries
- `E2E-INV-*`: Invoice entries
- `E2E-RCV-*`: Receipt entries
- `E2E-PAY-*`: Payment entries
- `E2E-DEP-*`: Depreciation/deposit entries
- `E2E-ACC-*`: Accrual entries

## Configuration

- **API URL**: Set via `E2E_API_URL` env var (default: `http://localhost:8794`)
- **Timeout**: Tests have 30s timeout for API calls
- **Sequential**: Tests run in order (scenarios depend on each other)

## Cleanup

Test data accumulates in the database. To clean up test data:

```bash
# Via wrangler D1 - delete all E2E journal entries
npx wrangler d1 execute accounting-db --remote --command "DELETE FROM journal_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference LIKE 'E2E-%')"
npx wrangler d1 execute accounting-db --remote --command "DELETE FROM journal_entries WHERE reference LIKE 'E2E-%'"
```

## Expected Results

After running all scenarios, you should see:
- Trial Balance: **BALANCED** (Debits = Credits)
- Gross Profit Margin: ~30%
- All accounts with correct balances
- Accounting equation satisfied (Assets = Liabilities + Equity)
