# Accounting Service Architecture Design

## Overview

The Accounting Service is a microservice responsible for managing financial accounting operations following double-entry bookkeeping principles. It is designed using **Hexagonal Architecture** (Ports and Adapters) and **Domain-Driven Design** (DDD) patterns.

## Table of Contents

1. [Bounded Context](#bounded-context)
2. [Domain Model](#domain-model)
3. [Architecture Layers](#architecture-layers)
4. [Folder Structure](#folder-structure)
5. [Entity Relationships](#entity-relationships)
6. [Use Cases](#use-cases)
7. [API Endpoints](#api-endpoints)
8. [Event Publishing](#event-publishing)

---

## Bounded Context

The Accounting Service manages the **Accounting Bounded Context**:

**Ubiquitous Language:**
- **Account**: A financial account in the chart of accounts
- **Journal Entry**: A transaction with balanced debits and credits
- **Journal Line**: Individual debit or credit posting within an entry
- **Ledger**: Historical record of all transactions for an account
- **Fiscal Period**: Accounting period (month/year)
- **Trial Balance**: Summary of all account balances
- **Financial Statement**: Income statement or balance sheet

**Business Rules:**
1. Debits must always equal credits in a journal entry
2. Posted entries cannot be edited, only voided
3. Detail accounts can have transactions, header accounts cannot
4. System accounts cannot be deleted
5. Fiscal periods must be closed in sequence

---

## Domain Model

### Aggregates

#### 1. **Account Aggregate**

```typescript
class Account {
  // Identity
  id: string
  code: string  // Unique 4-digit code (e.g., "1100")

  // Properties
  name: string
  description?: string
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'COGS' | 'Expense'
  normalBalance: 'Debit' | 'Credit'
  currency: string

  // Hierarchy
  parentAccountId: string | null
  level: number  // 0 = top level, 1 = sub-account, etc.
  isDetailAccount: boolean  // Can post transactions?
  isSystemAccount: boolean  // Protected from deletion

  // Status
  status: 'Active' | 'Inactive' | 'Archived'

  // Metadata
  createdAt: Date
  updatedAt: Date

  // Domain methods
  activate(): void
  deactivate(): void
  canDelete(): boolean
  canPost(): boolean
  addSubAccount(child: Account): void
}
```

#### 2. **JournalEntry Aggregate (Root)**

```typescript
class JournalEntry {
  // Identity
  id: string
  entryNumber: string  // Auto-generated: "JE-2025-0001"

  // Properties
  entryDate: Date
  description: string
  reference?: string  // Invoice #, PO #, etc.
  notes?: string

  // Type and status
  entryType: 'Manual' | 'System' | 'Recurring' | 'Adjusting' | 'Closing'
  status: 'Draft' | 'Posted' | 'Voided'

  // Aggregate members
  lines: JournalLine[]  // Minimum 2 lines

  // Metadata
  createdBy: string
  createdAt: Date
  postedBy?: string
  postedAt?: Date
  voidedBy?: string
  voidedAt?: Date
  voidReason?: string
  updatedAt: Date

  // Domain methods
  validate(): void  // Check debits = credits
  post(userId: string): void
  void(userId: string, reason: string): void
  canEdit(): boolean
  canPost(): boolean
  canVoid(): boolean
}

class JournalLine {
  accountId: string
  direction: 'Debit' | 'Credit'
  amount: number
  memo?: string

  // Validation
  validate(): void
}
```

### Value Objects

```typescript
class Money {
  constructor(
    public amount: number,
    public currency: string = 'USD'
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  add(other: Money): Money
  subtract(other: Money): Money
  equals(other: Money): boolean
}

class AccountCode {
  constructor(public value: string) {
    if (!/^\d{4}$/.test(value)) {
      throw new Error('Account code must be 4 digits');
    }
  }
}

class FiscalPeriod {
  constructor(
    public year: number,
    public month: number
  ) {
    if (month < 1 || month > 12) {
      throw new Error('Invalid month');
    }
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  next(): FiscalPeriod
  previous(): FiscalPeriod
}
```

### Domain Services

```typescript
class JournalEntryService {
  constructor(
    private accountRepo: IAccountRepository,
    private entryRepo: IJournalEntryRepository
  ) {}

  async createEntry(
    date: Date,
    description: string,
    lines: Array<{ accountId: string; direction: string; amount: number }>
  ): Promise<JournalEntry> {
    // Validate accounts exist and are detail accounts
    // Create entry with auto-generated number
    // Validate debits = credits
    // Return draft entry
  }

  async postEntry(entryId: string, userId: string): Promise<void> {
    // Load entry
    // Validate entry can be posted
    // Update account balances (materialized view)
    // Publish JournalEntryPosted event
  }
}

class FinancialReportService {
  async generateIncomeStatement(from: Date, to: Date): Promise<IncomeStatement>
  async generateBalanceSheet(asOf: Date): Promise<BalanceSheet>
  async generateTrialBalance(asOf: Date): Promise<TrialBalance>
}
```

---

## Architecture Layers

### 1. Domain Layer (Core)

**Pure business logic, no external dependencies**

```
src/domain/
├── entities/
│   ├── account.entity.ts
│   ├── journal-entry.entity.ts
│   └── journal-line.entity.ts
├── value-objects/
│   ├── money.vo.ts
│   ├── account-code.vo.ts
│   └── fiscal-period.vo.ts
├── repositories/  (Interfaces only - PORTS)
│   ├── account.repository.ts
│   ├── journal-entry.repository.ts
│   └── ledger.repository.ts
└── services/
    ├── journal-entry.service.ts
    └── financial-report.service.ts
```

### 2. Application Layer

**Use cases and orchestration**

```
src/application/
├── commands/  (Write operations - CQRS)
│   ├── create-account.command.ts
│   ├── update-account.command.ts
│   ├── create-journal-entry.command.ts
│   ├── post-journal-entry.command.ts
│   └── void-journal-entry.command.ts
├── queries/  (Read operations - CQRS)
│   ├── get-account.query.ts
│   ├── list-accounts.query.ts
│   ├── get-ledger.query.ts
│   ├── generate-income-statement.query.ts
│   └── generate-balance-sheet.query.ts
├── events/  (Event handlers)
│   └── order-completed.handler.ts  (Future: create accounting entries from orders)
└── dtos/
    ├── create-account.dto.ts
    └── create-journal-entry.dto.ts
```

### 3. Infrastructure Layer (Adapters)

**External concerns and implementations**

```
src/infrastructure/
├── database/  (OUTPUT ADAPTER - implements repository interfaces)
│   ├── schema.ts  (Drizzle schema)
│   ├── account.repository.impl.ts
│   ├── journal-entry.repository.impl.ts
│   └── ledger.repository.impl.ts
├── http/  (INPUT ADAPTER - HTTP API)
│   ├── routes.ts
│   ├── controllers/
│   │   ├── account.controller.ts
│   │   ├── journal-entry.controller.ts
│   │   └── report.controller.ts
│   └── middleware/
│       └── error-handler.ts
└── events/  (OUTPUT ADAPTER - event publishing)
    ├── event-publisher.ts
    └── events/
        ├── journal-entry-posted.event.ts
        └── account-created.event.ts
```

---

## Folder Structure

Complete service structure:

```
services/accounting-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── account.entity.ts
│   │   │   ├── journal-entry.entity.ts
│   │   │   ├── journal-line.entity.ts
│   │   │   ├── account-balance.entity.ts
│   │   │   └── fiscal-period.entity.ts
│   │   ├── value-objects/
│   │   │   ├── money.vo.ts
│   │   │   ├── account-code.vo.ts
│   │   │   └── fiscal-period.vo.ts
│   │   ├── repositories/
│   │   │   ├── account.repository.ts
│   │   │   ├── journal-entry.repository.ts
│   │   │   ├── ledger.repository.ts
│   │   │   └── report.repository.ts
│   │   └── services/
│   │       ├── journal-entry.service.ts
│   │       └── financial-report.service.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── create-account.command.ts
│   │   │   ├── update-account.command.ts
│   │   │   ├── delete-account.command.ts
│   │   │   ├── create-journal-entry.command.ts
│   │   │   ├── post-journal-entry.command.ts
│   │   │   └── void-journal-entry.command.ts
│   │   ├── queries/
│   │   │   ├── get-account.query.ts
│   │   │   ├── list-accounts.query.ts
│   │   │   ├── get-journal-entry.query.ts
│   │   │   ├── list-journal-entries.query.ts
│   │   │   ├── get-ledger.query.ts
│   │   │   ├── generate-income-statement.query.ts
│   │   │   ├── generate-balance-sheet.query.ts
│   │   │   └── generate-trial-balance.query.ts
│   │   └── dtos/
│   │       ├── account.dto.ts
│   │       └── journal-entry.dto.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── schema.ts
│   │   │   ├── account.repository.impl.ts
│   │   │   ├── journal-entry.repository.impl.ts
│   │   │   ├── ledger.repository.impl.ts
│   │   │   └── report.repository.impl.ts
│   │   ├── http/
│   │   │   ├── routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── account.controller.ts
│   │   │   │   ├── journal-entry.controller.ts
│   │   │   │   └── report.controller.ts
│   │   │   └── middleware/
│   │   │       └── error-handler.ts
│   │   └── events/
│   │       ├── event-publisher.ts
│   │       └── events/
│   │           ├── journal-entry-posted.event.ts
│   │           ├── journal-entry-voided.event.ts
│   │           └── account-created.event.ts
│   └── index.ts  (Entry point - wires everything together)
├── migrations/
│   ├── 0001_create_chart_of_accounts.sql
│   ├── 0002_create_journal_entries.sql
│   ├── 0003_create_journal_lines.sql
│   ├── 0004_create_account_balances.sql
│   └── seed_default_accounts.sql
├── tests/
│   ├── domain/
│   ├── application/
│   └── infrastructure/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

---

## Entity Relationships

```
┌─────────────────┐
│ Chart of        │
│ Accounts        │◄──────┐
│                 │       │ parent_account_id
│ - id            │       │ (hierarchy)
│ - code          │       │
│ - name          │       │
│ - accountType   │       │
│ - parentId  ────┼───────┘
└────────┬────────┘
         │ 1
         │
         │ *
         │
┌────────▼────────┐        ┌─────────────────┐
│ Account         │        │ Journal         │
│ Balances        │        │ Entries         │
│                 │        │                 │
│ - accountId ────┼───┐    │ - id            │
│ - fiscalPeriod  │   │    │ - entryNumber   │
│ - debitTotal    │   │    │ - entryDate     │
│ - creditTotal   │   │    │ - description   │
│ - balance       │   │    │ - status        │
└─────────────────┘   │    └────────┬────────┘
                      │             │ 1
                      │             │
                      │             │ *
                      │             │
                      │    ┌────────▼────────┐
                      │    │ Journal         │
                      │    │ Lines           │
                      │    │                 │
                      └────┤ - accountId     │
                           │ - direction     │
                           │ - amount        │
                           │ - memo          │
                           └─────────────────┘
```

---

## Use Cases

### Command Use Cases (Write)

1. **Create Account**
   - Input: Code, Name, Type, ParentId (optional)
   - Validation: Code unique, Parent exists, Type valid
   - Output: Account entity
   - Events: `AccountCreated`

2. **Post Journal Entry**
   - Input: Entry ID, User ID
   - Validation: Entry exists, Is draft, Debits = Credits
   - Side effects: Update account balances
   - Output: Posted entry
   - Events: `JournalEntryPosted`

3. **Void Journal Entry**
   - Input: Entry ID, User ID, Reason
   - Validation: Entry posted, Not already voided
   - Side effects: Reverse account balances
   - Output: Voided entry
   - Events: `JournalEntryVoided`

### Query Use Cases (Read)

1. **Get Ledger**
   - Input: Account ID, Date range
   - Output: List of transactions with running balance

2. **Generate Income Statement**
   - Input: From date, To date
   - Output: Revenue, COGS, Expenses, Net Income

3. **Generate Balance Sheet**
   - Input: As-of date
   - Output: Assets, Liabilities, Equity

---

## API Endpoints

### Accounts
```
GET    /api/accounting/accounts                    # List all accounts
GET    /api/accounting/accounts/active             # List active accounts
GET    /api/accounting/accounts/:id                # Get account by ID
POST   /api/accounting/accounts                    # Create account
PUT    /api/accounting/accounts/:id                # Update account
DELETE /api/accounting/accounts/:id                # Delete account
GET    /api/accounting/accounts/:id/balance        # Get account balance
GET    /api/accounting/accounts/tree               # Get hierarchical tree
```

### Journal Entries
```
GET    /api/accounting/journal-entries             # List entries
GET    /api/accounting/journal-entries/:id         # Get entry by ID
POST   /api/accounting/journal-entries             # Create entry (draft)
PUT    /api/accounting/journal-entries/:id         # Update entry (draft only)
POST   /api/accounting/journal-entries/:id/post    # Post entry
POST   /api/accounting/journal-entries/:id/void    # Void entry
```

### Ledger & Reports
```
GET    /api/accounting/ledger/:accountId           # Get account ledger
GET    /api/accounting/reports/income-statement    # Generate P&L
GET    /api/accounting/reports/balance-sheet       # Generate balance sheet
GET    /api/accounting/reports/trial-balance       # Generate trial balance
```

---

## Event Publishing

### Events Published

#### 1. **AccountCreated**
```json
{
  "type": "AccountCreated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "accountId": "acc-123",
    "code": "1100",
    "name": "Cash",
    "accountType": "Asset"
  }
}
```

#### 2. **JournalEntryPosted**
```json
{
  "type": "JournalEntryPosted",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "entryId": "je-456",
    "entryNumber": "JE-2025-0001",
    "entryDate": "2025-01-15",
    "lines": [
      { "accountId": "acc-123", "direction": "Debit", "amount": 1000 },
      { "accountId": "acc-456", "direction": "Credit", "amount": 1000 }
    ],
    "postedBy": "user-789"
  }
}
```

### Events Consumed

#### 1. **OrderCompleted** (from Order Service)
```json
{
  "type": "OrderCompleted",
  "data": {
    "orderId": "order-123",
    "customerId": "cust-456",
    "totalAmount": 1500.00,
    "items": [...]
  }
}
```

**Action:** Create accounting journal entry automatically:
- Debit: Accounts Receivable
- Credit: Revenue

---

## Dependency Injection Container

**File:** `src/index.ts`

```typescript
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import routes from './infrastructure/http/routes';

// Repository implementations
import { AccountRepositoryImpl } from './infrastructure/database/account.repository.impl';
import { JournalEntryRepositoryImpl } from './infrastructure/database/journal-entry.repository.impl';

// Domain services
import { JournalEntryService } from './domain/services/journal-entry.service';

// Commands
import { CreateAccountCommand } from './application/commands/create-account.command';
import { PostJournalEntryCommand } from './application/commands/post-journal-entry.command';

type Bindings = {
  DB: D1Database;
  ACCOUNTING_EVENTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

// Dependency injection
app.use('*', async (c, next) => {
  const db = drizzle(c.env.DB);

  // Create repositories
  const accountRepo = new AccountRepositoryImpl(db);
  const entryRepo = new JournalEntryRepositoryImpl(db);

  // Create domain services
  const entryService = new JournalEntryService(accountRepo, entryRepo);

  // Create commands
  const createAccountCmd = new CreateAccountCommand(accountRepo);
  const postEntryCmd = new PostJournalEntryCommand(entryRepo);

  // Attach to context
  c.set('accountRepo', accountRepo);
  c.set('entryRepo', entryRepo);
  c.set('entryService', entryService);
  c.set('createAccountCmd', createAccountCmd);
  c.set('postEntryCmd', postEntryCmd);

  await next();
});

// Mount routes
app.route('/', routes);

export default app;
```

---

## Testing Strategy

### 1. Domain Layer Tests (Pure Unit Tests)
```typescript
describe('JournalEntry', () => {
  it('should not allow posting with unbalanced lines', () => {
    const entry = new JournalEntry(/*...*/);
    entry.lines = [
      { accountId: '1', direction: 'Debit', amount: 100 },
      { accountId: '2', direction: 'Credit', amount: 50 }
    ];

    expect(() => entry.validate()).toThrow('Debits must equal credits');
  });
});
```

### 2. Application Layer Tests (Use Case Tests)
```typescript
describe('PostJournalEntryCommand', () => {
  it('should update account balances when posting', async () => {
    const mockRepo = createMockRepository();
    const command = new PostJournalEntryCommand(mockRepo);

    await command.execute('entry-123', 'user-456');

    expect(mockRepo.update).toHaveBeenCalled();
  });
});
```

### 3. Infrastructure Layer Tests (Integration Tests)
```typescript
describe('AccountRepositoryImpl', () => {
  it('should persist and retrieve account', async () => {
    const db = await createTestDatabase();
    const repo = new AccountRepositoryImpl(db);

    const account = new Account(/*...*/);
    await repo.save(account);

    const retrieved = await repo.findById(account.id);
    expect(retrieved).toEqual(account);
  });
});
```

---

## Migration Path from Monolithic Backend

1. ✅ Create service structure
2. ✅ Copy database schema to migrations
3. ✅ Implement domain entities
4. ✅ Implement repositories
5. ✅ Implement commands and queries
6. ✅ Create HTTP routes
7. ✅ Configure wrangler.toml
8. ✅ Update API gateway
9. ✅ Test integration
10. ✅ Migrate data (if needed)
11. ✅ Update frontend
12. ✅ Delete old backend code

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Testable domain logic
- ✅ Flexibility to change infrastructure
- ✅ Scalability via microservices
- ✅ Event-driven communication
- ✅ DDD best practices
