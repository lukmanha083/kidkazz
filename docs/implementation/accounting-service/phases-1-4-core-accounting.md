# Accounting Service - Core Accounting Implementation (Phases 1-4)

## Overview

This document describes the implementation of the core accounting domain for the KidKazz ERP accounting service. The implementation follows Domain-Driven Design (DDD), Hexagonal Architecture, and CQRS patterns.

**Branch**: `feature/core-accounting-phases-1-4`
**PR**: #211
**Tests**: 234 passing

---

## Phase 1: Core Accounting Domain Model

### Directory Structure

```
src/domain/
├── entities/
│   ├── account.entity.ts      # Account aggregate
│   ├── journal-entry.entity.ts # JournalEntry aggregate
│   └── index.ts
├── value-objects/
│   ├── account-code.vo.ts     # Account code with validation
│   ├── fiscal-period.vo.ts    # Year/month period
│   ├── money.vo.ts            # Currency-safe money handling
│   └── index.ts
└── repositories/
    ├── account.repository.ts       # IAccountRepository interface
    ├── journal-entry.repository.ts # IJournalEntryRepository interface
    └── index.ts
```

### Entities

#### Account Entity
- Indonesian PSAK-compliant Chart of Accounts structure
- Hierarchical support (parent/child relationships)
- Account types: Asset, Liability, Equity, Revenue, COGS, Expense
- Account categories for detailed classification
- Status management: Active, Inactive, Archived

```typescript
Account.create({
  code: '1010',
  name: 'Kas Kecil',
  nameEn: 'Petty Cash',
  accountType: AccountType.ASSET,
  accountCategory: AccountCategory.CURRENT_ASSET,
  normalBalance: 'Debit',
  isDetailAccount: true,
  isSystemAccount: false,
});
```

#### JournalEntry Entity
- Balanced debit/credit validation (must equal)
- Status workflow: Draft → Posted → Voided
- Entry types: Manual, System, Recurring, Adjusting, Closing
- GL segmentation for analytics (salesperson, warehouse, channel, etc.)
- Auto-generated entry numbers per fiscal period

```typescript
JournalEntry.create({
  entryDate: new Date('2025-01-15'),
  description: 'Cash sale',
  lines: [
    { accountId: 'cash-id', direction: 'Debit', amount: 100000 },
    { accountId: 'revenue-id', direction: 'Credit', amount: 100000 },
  ],
  createdBy: 'user-001',
});
```

### Value Objects

| Value Object | Purpose |
|--------------|---------|
| `AccountCode` | Validates account codes (1-20 chars), derives account type from first digit |
| `FiscalPeriod` | Immutable year/month, navigation methods (next/previous) |
| `Money` | Currency-safe arithmetic with 4 decimal precision |

### Tests
- 143 unit tests for domain layer
- Location: `test/unit/domain/`

---

## Phase 2: Repository Adapters

### Directory Structure

```
src/infrastructure/
├── db/
│   └── schema.ts              # Drizzle ORM schema
└── repositories/
    ├── account.repository.ts       # DrizzleAccountRepository
    ├── journal-entry.repository.ts # DrizzleJournalEntryRepository
    └── index.ts
```

### Database Schema

Tables implemented:
- `chart_of_accounts` - Account master data
- `journal_entries` - Journal entry headers
- `journal_lines` - Journal entry line items
- `account_balances` - Pre-calculated balances (materialized view)
- `fiscal_periods` - Fiscal period status tracking

### Repository Implementations

#### DrizzleAccountRepository
- `findById(id)` - Get account by ID
- `findByCode(code)` - Get account by code
- `findAll(filter?)` - List with optional filters
- `findByParentId(parentId)` - Get child accounts
- `getAccountTree()` - Get hierarchical tree
- `save(account)` - Create or update
- `delete(id)` - Delete account
- `codeExists(code, excludeId?)` - Check uniqueness
- `hasTransactions(accountId)` - Check if account has journal lines

#### DrizzleJournalEntryRepository
- `findById(id)` - Get entry with lines
- `findByEntryNumber(entryNumber)` - Get by entry number
- `findAll(filter?, pagination?)` - Paginated list with filters
- `findByAccountId(accountId, filter?)` - Get entries for account
- `findBySourceReference(service, refId)` - Get by source reference
- `findByFiscalPeriod(period, status?)` - Get by fiscal period
- `save(entry)` - Create or update with lines
- `delete(id)` - Delete entry and lines
- `generateEntryNumber(fiscalPeriod)` - Auto-generate entry number

### Tests
- 39 integration tests using in-memory SQLite
- Location: `test/integration/repositories/`

---

## Phase 3: Commands and Queries (CQRS)

### Directory Structure

```
src/application/
├── commands/
│   ├── account.commands.ts         # Account write operations
│   ├── journal-entry.commands.ts   # JournalEntry write operations
│   └── index.ts
├── queries/
│   ├── account.queries.ts          # Account read operations
│   ├── journal-entry.queries.ts    # JournalEntry read operations
│   └── index.ts
└── index.ts
```

### Account Commands

| Command | Description |
|---------|-------------|
| `CreateAccountCommand` | Create new account with validation |
| `UpdateAccountCommand` | Update account (name, description, code) |
| `DeleteAccountCommand` | Delete account (with safety checks) |

### Journal Entry Commands

| Command | Description |
|---------|-------------|
| `CreateJournalEntryCommand` | Create draft entry with lines |
| `UpdateJournalEntryCommand` | Update draft entry |
| `DeleteJournalEntryCommand` | Delete draft entry |
| `PostJournalEntryCommand` | Post draft to make permanent |
| `VoidJournalEntryCommand` | Void posted entry with reason |

### Account Queries

| Query | Description |
|-------|-------------|
| `GetAccountByIdQuery` | Get single account |
| `GetAccountByCodeQuery` | Get account by code |
| `ListAccountsQuery` | List with filters |
| `GetAccountTreeQuery` | Get hierarchical tree |

### Journal Entry Queries

| Query | Description |
|-------|-------------|
| `GetJournalEntryByIdQuery` | Get single entry with lines |
| `ListJournalEntriesQuery` | Paginated list with filters |
| `GetJournalEntriesByAccountQuery` | Entries for specific account |
| `GetJournalEntriesByFiscalPeriodQuery` | Entries for fiscal period |

### Tests
- 52 unit tests with mocked repositories
- Location: `test/unit/application/`

---

## Phase 4: API Routes

### Directory Structure

```
src/
├── index.ts                           # Main Hono app entry point
└── infrastructure/http/
    ├── middleware/
    │   ├── database.middleware.ts     # Drizzle D1 injection
    │   ├── error.middleware.ts        # Global error handling
    │   └── index.ts
    └── routes/
        ├── account.routes.ts          # Account REST endpoints
        ├── journal-entry.routes.ts    # JournalEntry REST endpoints
        └── index.ts

src/application/dtos/
├── account.dto.ts                     # Account request/response DTOs
├── journal-entry.dto.ts               # JournalEntry request/response DTOs
└── index.ts
```

### API Endpoints

#### Account Endpoints (`/api/v1/accounts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List accounts with filters |
| GET | `/tree` | Get hierarchical account tree |
| GET | `/:id` | Get account by ID |
| GET | `/code/:code` | Get account by code |
| POST | `/` | Create new account |
| PUT | `/:id` | Update account |
| DELETE | `/:id` | Delete account |

#### Journal Entry Endpoints (`/api/v1/journal-entries`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List entries (paginated) |
| GET | `/:id` | Get entry by ID |
| GET | `/by-account/:accountId` | Get entries for account |
| POST | `/` | Create new entry |
| PUT | `/:id` | Update draft entry |
| DELETE | `/:id` | Delete draft entry |
| POST | `/:id/post` | Post entry |
| POST | `/:id/void` | Void entry |

#### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |

### Request Validation (Zod)

All requests are validated using Zod schemas:

```typescript
// Example: Create Account
const createAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  accountType: z.nativeEnum(AccountType),
  normalBalance: z.enum(['Debit', 'Credit']),
  isDetailAccount: z.boolean(),
  // ...
});
```

### Response Format

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Paginated
{
  success: true,
  data: [...],
  total: 100,
  page: 1,
  limit: 20,
  totalPages: 5
}

// Error
{
  success: false,
  error: "Error message"
}
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
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `wrangler.toml` | Cloudflare Workers config |
| `drizzle.config.ts` | Drizzle ORM config |
| `tsconfig.json` | TypeScript config |
| `vitest.config.ts` | Vitest test config |

---

## Next Phases

| Phase | Branch | Description |
|-------|--------|-------------|
| 5-9 | `feature/asset-accounting-phases-5-9` | Asset Accounting |
| 10-12 | `feature/integration-phases-10-12` | Accounting Cycle & Integration |

### Phase 5-9 (Asset Accounting)
- Asset categories and master data
- Depreciation engine (straight-line, declining balance)
- Asset disposal and maintenance tracking
- Asset transfers between locations

### Phase 10-12 (Integration)
- Accounting cycle management
- Cash flow tracking
- Event publishing (Cloudflare Queue)
- Report generation
- Data archival
