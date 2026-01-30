# Accounting Service - AI Assistant Context

**Service**: Accounting Service (General Ledger & Financial Management)
**Stack**: Cloudflare Workers + Hono + D1 + Drizzle ORM
**Architecture**: DDD + Hexagonal + CQRS + Event-Driven

---

## IMPORTANT: Always Read First

Before planning or implementing, **always read `SERVICE_GRAPH.yaml`** at project root:
```bash
cat /home/lukman83/project/kidkazz/SERVICE_GRAPH.yaml
```

This file contains:
- Service relationships and dependencies
- Event flows between services
- API contracts and endpoints
- Domain entity mappings

---

## Quick Commands

```bash
pnpm test              # Run all tests (596 tests)
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm type-check        # TypeScript validation
pnpm lint:fix          # Auto-fix linting issues
pnpm dev               # Local development server
pnpm db:migrate        # Apply migrations locally
```

---

## Directory Structure

```
src/
├── domain/                    # Core business logic (no dependencies)
│   ├── entities/              # Aggregates & entities
│   ├── value-objects/         # Immutable value types
│   ├── repositories/          # Repository interfaces (ports)
│   ├── services/              # Domain services
│   └── events/                # Domain events
├── application/               # Use cases & orchestration
│   ├── commands/              # Write operations (CQRS)
│   ├── queries/               # Read operations (CQRS)
│   ├── event-handlers/        # Cross-service event handlers
│   └── dtos/                  # Data transfer objects + validation
└── infrastructure/            # External concerns
    ├── db/                    # Drizzle schema
    ├── repositories/          # Repository implementations
    ├── http/routes/           # Hono route handlers
    └── messaging/             # Queue publisher/consumer
```

---

## Core Domain Entities

| Entity | Purpose |
|--------|---------|
| `Account` | Chart of accounts (hierarchical) |
| `JournalEntry` | Double-entry transactions with lines |
| `FiscalPeriod` | Monthly periods (Open/Closed/Locked) |
| `AccountBalance` | Period balances per account |
| `Budget` | Annual budgets with monthly lines |
| `FixedAsset` | Asset register with depreciation |
| `BankAccount` | Bank accounts for reconciliation |
| `BankReconciliation` | Statement matching |
| `Currency` / `ExchangeRate` | Multi-currency (USD/IDR) |
| `AuditLog` | Immutable audit trail |

---

## Key Patterns

### Double-Entry Accounting
Every `JournalEntry` must have balanced lines (debits = credits):
```typescript
// Domain validation in JournalEntry.validateLines()
const totalDebits = lines.reduce((sum, l) => sum + l.debitAmount, 0);
const totalCredits = lines.reduce((sum, l) => sum + l.creditAmount, 0);
if (Math.abs(totalDebits - totalCredits) > 0.001) throw new Error('Unbalanced');
```

### Atomic Operations
Use `JournalEntry.createPosted()` for system-generated entries:
```typescript
// Atomic create + post in one operation
const entry = JournalEntry.createPosted(props, 'system');
await journalEntryRepository.save(entry);
```

### Event-Driven Integration (Outbox Pattern)
```typescript
// Domain events stored in outbox table
await domainEventRepository.save(event);
// Published via EventPublisher.publishPendingEvents()
```

### Repository Batch Operations
Always use batch methods to avoid N+1:
```typescript
// Good: Single query
const accounts = await accountRepository.findByIds(accountIds);

// Bad: N+1 queries
for (const id of accountIds) {
  await accountRepository.findById(id);
}
```

---

## Route Ordering (Important!)

In Hono, specific routes must come BEFORE parameterized routes:
```typescript
// Correct order:
budgetRoutes.get('/reports/budget-vs-actual', handler);  // First
budgetRoutes.get('/:id', handler);                       // Last

// Wrong order causes /reports/* to match as id="reports"
```

---

## Account Codes Convention

| Range | Type | Normal Balance |
|-------|------|----------------|
| 1xxx | Asset | Debit |
| 2xxx | Liability | Credit |
| 3xxx | Equity | Credit |
| 4xxx | Revenue | Credit |
| 5xxx | COGS | Debit |
| 6xxx | Expense | Debit |

Common codes: `1101` (Cash), `1201` (AR), `2101` (AP), `4101` (Revenue)

---

## Testing

- **Unit tests**: `test/unit/` - Mock repositories, test domain logic
- **Integration tests**: `test/integration/` - Real D1 database (SQLite)
- Mock pattern:
```typescript
const mockRepo: IAccountRepository = {
  findById: vi.fn(),
  findByIds: vi.fn(),  // Don't forget batch methods!
  // ...
};
```

---

## D1 Database Specifics

- Delete results use `result.meta?.changes` (not `result.changes`)
- Batch operations: `db.batch([...statements])`
- Dates stored as ISO strings, parsed on read

---

## Related Documentation

- `docs/implementation/accounting-service/` - Phase implementation guides
- `docs/bounded-contexts/accounting/` - Domain documentation
- `migrations/` - Database migrations (0001-0008)
