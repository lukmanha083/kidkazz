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

The tests simulate a complete 1-month accounting cycle:

| Scenario | Description |
|----------|-------------|
| 01-period-setup | Create fiscal period, COA, and opening balance (Owner invests Rp 1.2B inventory) |
| 02-inventory-purchases | Record inventory purchases on credit |
| 03-cash-sales | Record retail sales and COGS (coming soon) |
| 04-operating-expenses | Record various operating expenses (coming soon) |
| 05-credit-sales | Record wholesale credit sales (coming soon) |
| 06-cash-collections | Collect receivables, pay payables (coming soon) |
| 07-month-end-close | Adjustments, depreciation, accruals (coming soon) |
| 08-financial-reports | Generate and verify all reports (coming soon) |

## Test Data

Tests create data with `E2E-` prefix in references for easy identification:
- `E2E-OB-*`: Opening balance entries
- `E2E-PO-*`: Purchase order entries
- `E2E-SALE-*`: Sales entries
- etc.

## Configuration

- **API URL**: Set via `E2E_API_URL` env var (default: `http://localhost:8794`)
- **Timeout**: Tests have 30s timeout for API calls
- **Sequential**: Tests run in order (scenarios depend on each other)

## Cleanup

Test data accumulates in the database. To clean up test data:

```bash
# Via wrangler D1
npx wrangler d1 execute accounting-db --remote --command "DELETE FROM journal_entries WHERE reference LIKE 'E2E-%'"
```
