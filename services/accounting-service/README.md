# Accounting Service

A microservice for managing financial accounting operations following double-entry bookkeeping principles.

## Architecture

This service implements:
- **Hexagonal Architecture** (Ports and Adapters)
- **Domain-Driven Design** (DDD)
- **CQRS** (Command Query Responsibility Segregation)
- **Event-Driven** Communication

## Bounded Context

The Accounting Service manages:
- Chart of Accounts (hierarchical account structure)
- Journal Entries (double-entry transactions)
- General Ledger (transaction history)
- Financial Reports (Income Statement, Balance Sheet)

## Folder Structure

```
src/
├── domain/              # Core business logic (pure, no dependencies)
│   ├── entities/        # Domain entities (Account, JournalEntry)
│   ├── value-objects/   # Value objects (Money, AccountCode)
│   ├── repositories/    # Repository interfaces (ports)
│   └── services/        # Domain services
├── application/         # Use cases and orchestration
│   ├── commands/        # Write operations (CreateAccount, PostEntry)
│   ├── queries/         # Read operations (GetLedger, GenerateReport)
│   └── dtos/            # Data transfer objects
└── infrastructure/      # External concerns (adapters)
    ├── database/        # D1 repository implementations
    ├── http/            # HTTP API controllers
    └── events/          # Event publishing

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Generate database migrations
pnpm db:generate

# Apply migrations (local)
pnpm db:migrate

# Apply migrations (production)
pnpm db:migrate:prod

# Type check
pnpm type-check

# Deploy
pnpm deploy
```

## API Endpoints

### Accounts
- `GET /api/accounting/accounts` - List all accounts
- `GET /api/accounting/accounts/active` - List active accounts
- `POST /api/accounting/accounts` - Create account
- `PUT /api/accounting/accounts/:id` - Update account
- `DELETE /api/accounting/accounts/:id` - Delete account

### Journal Entries
- `GET /api/accounting/journal-entries` - List entries
- `GET /api/accounting/journal-entries/:id` - Get entry
- `POST /api/accounting/journal-entries` - Create entry (draft)
- `POST /api/accounting/journal-entries/:id/post` - Post entry
- `POST /api/accounting/journal-entries/:id/void` - Void entry

### Reports
- `GET /api/accounting/ledger/:accountId` - Get account ledger
- `GET /api/accounting/reports/income-statement` - Generate P&L
- `GET /api/accounting/reports/balance-sheet` - Generate balance sheet

## Events Published

- `AccountCreated` - When a new account is created
- `JournalEntryPosted` - When an entry is posted
- `JournalEntryVoided` - When an entry is voided

## Events Consumed

- `OrderCompleted` - Create accounting entry for completed orders (future)

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## Documentation

See `/docs` for detailed architecture documentation:
- `ACCOUNTING_SERVICE_ARCHITECTURE.md` - Detailed design
- `MICROSERVICES_INTEGRATION_ROADMAP.md` - Integration guide
