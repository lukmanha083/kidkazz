# Microservices Integration Roadmap

This document outlines the step-by-step process for integrating the frontend with three core microservices: **Product Service**, **Inventory Service**, and **Accounting Service** using Cloudflare Workers, Service Bindings, and event-driven architecture.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Design Patterns](#design-patterns)
3. [Module 1: Accounting Service](#module-1-accounting-service)
4. [Module 2: Product Service](#module-2-product-service)
5. [Module 3: Inventory Service](#module-3-inventory-service)
6. [Inter-Service Communication](#inter-service-communication)
7. [Frontend Integration](#frontend-integration)
8. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Microservices Architecture

```
┌─────────────────────┐
│  Admin Dashboard    │
│    (Frontend)       │
└──────────┬──────────┘
           │ HTTP
           ▼
┌─────────────────────┐
│    API Gateway      │◄────────┐
│  (Service Router)   │         │
└──────────┬──────────┘         │
           │                    │
  ┌────────┼────────┬──────────┐│
  │        │        │          ││
  ▼        ▼        ▼          ▼│
┌────┐  ┌────┐  ┌────┐    ┌────┐
│Prod│  │Inv │  │Acct│    │User│
│Svc │  │Svc │  │Svc │    │Svc │
└─┬──┘  └─┬──┘  └─┬──┘    └────┘
  │       │       │
  ▼       ▼       ▼
┌────┐  ┌────┐  ┌────┐
│ D1 │  │ D1 │  │ D1 │
└────┘  └────┘  └────┘
  │       │       │
  └───────┴───────┴────► Event Queue (Future)
```

### Service Boundaries (Bounded Contexts)

| Service | Responsibility | Database | Events Published |
|---------|---------------|----------|------------------|
| **Product Service** | Product catalog, SKUs, pricing, categories | product-db | ProductCreated, ProductUpdated, PriceChanged |
| **Inventory Service** | Stock levels, warehouses, transfers, reservations | inventory-db | StockReserved, StockConfirmed, StockTransferred |
| **Accounting Service** | Chart of accounts, journal entries, financial reports | accounting-db | JournalEntryPosted, AccountCreated |
| **API Gateway** | Route requests, service discovery, aggregation | - | - |

### Technology Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono.js
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle ORM
- **Communication:** Service Bindings (synchronous), Queues (asynchronous events)
- **Architecture Patterns:** Hexagonal, DDD, Event-Driven

---

## Design Patterns

### 1. Hexagonal Architecture (Ports & Adapters)

Each service follows the hexagonal architecture:

```
┌─────────────────────────────────────────┐
│           Application Layer              │
│  ┌─────────────────────────────────┐   │
│  │      Domain Layer (Core)        │   │
│  │  - Entities                     │   │
│  │  - Value Objects                │   │
│  │  - Domain Services              │   │
│  │  - Business Rules               │   │
│  └─────────────────────────────────┘   │
│              ▲         │                │
│    ┌─────────┴─┐     ┌─┴────────┐     │
│    │  Input    │     │  Output  │     │
│    │   Ports   │     │   Ports  │     │
│    └─────┬─────┘     └─────┬────┘     │
└──────────┼─────────────────┼───────────┘
           │                 │
    ┌──────┴────────┐   ┌────┴──────┐
    │   Adapters    │   │  Adapters │
    │  - HTTP API   │   │  - D1 DB  │
    │  - Events In  │   │  - Events │
    └───────────────┘   └───────────┘
```

**Folder Structure:**
```
services/[service-name]/
├── src/
│   ├── domain/              # Core business logic
│   │   ├── entities/        # Domain entities
│   │   ├── value-objects/   # Value objects
│   │   ├── repositories/    # Repository interfaces (ports)
│   │   └── services/        # Domain services
│   ├── application/         # Use cases / application services
│   │   ├── commands/        # Command handlers (write)
│   │   ├── queries/         # Query handlers (read)
│   │   └── events/          # Event handlers
│   ├── infrastructure/      # Adapters (external concerns)
│   │   ├── database/        # D1 repository implementations
│   │   ├── http/            # HTTP routes & controllers
│   │   └── events/          # Event publishers/subscribers
│   └── index.ts             # Application entry point
├── migrations/              # Database migrations
└── wrangler.toml            # Cloudflare Workers config
```

### 2. Domain-Driven Design (DDD)

**Ubiquitous Language:** Each bounded context uses domain-specific terminology
- Accounting: Account, JournalEntry, Ledger, FiscalPeriod
- Inventory: Warehouse, Stock, Reservation, Transfer
- Product: SKU, Variant, Catalog, Price

**Aggregates:** Consistency boundaries
- Accounting: `JournalEntry` aggregate (with lines)
- Inventory: `StockReservation` aggregate
- Product: `Product` aggregate (with variants)

### 3. Event-Driven Communication

**Synchronous:** Service Bindings (for immediate consistency)
```typescript
// Example: Order Service calls Inventory Service
const response = await c.env.INVENTORY_SERVICE.fetch(
  new Request('http://internal/api/inventory/reserve', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity })
  })
);
```

**Asynchronous:** Cloudflare Queues (for eventual consistency)
```typescript
// Example: Product Service publishes event
await c.env.PRODUCT_EVENTS_QUEUE.send({
  type: 'ProductCreated',
  data: { productId, sku, name }
});
```

---

## Module 1: Accounting Service

### Phase 1: Service Scaffolding (Steps 1-3)

#### Step 1: Create Service Structure

```bash
mkdir -p services/accounting-service/src/{domain,application,infrastructure}
mkdir -p services/accounting-service/src/domain/{entities,value-objects,repositories,services}
mkdir -p services/accounting-service/src/application/{commands,queries,events}
mkdir -p services/accounting-service/src/infrastructure/{database,http,events}
mkdir -p services/accounting-service/migrations
```

#### Step 2: Define Domain Entities

**File:** `services/accounting-service/src/domain/entities/account.entity.ts`

```typescript
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'COGS' | 'Expense';
export type NormalBalance = 'Debit' | 'Credit';
export type AccountStatus = 'Active' | 'Inactive' | 'Archived';

export class Account {
  constructor(
    public readonly id: string,
    public code: string,
    public name: string,
    public accountType: AccountType,
    public normalBalance: NormalBalance,
    public parentAccountId: string | null,
    public isDetailAccount: boolean,
    public status: AccountStatus,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  // Domain methods
  activate(): void {
    this.status = 'Active';
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (!this.isDetailAccount) {
      throw new Error('Cannot deactivate header accounts with children');
    }
    this.status = 'Inactive';
    this.updatedAt = new Date();
  }

  addSubAccount(childAccountId: string): void {
    if (this.isDetailAccount) {
      throw new Error('Detail accounts cannot have sub-accounts');
    }
  }
}
```

**File:** `services/accounting-service/src/domain/entities/journal-entry.entity.ts`

```typescript
import { JournalLine } from './journal-line.entity';

export type EntryStatus = 'Draft' | 'Posted' | 'Voided';
export type EntryType = 'Manual' | 'System' | 'Recurring' | 'Adjusting' | 'Closing';

export class JournalEntry {
  constructor(
    public readonly id: string,
    public readonly entryNumber: string,
    public entryDate: Date,
    public description: string,
    public lines: JournalLine[],
    public status: EntryStatus,
    public entryType: EntryType,
    public readonly createdBy: string,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  // Domain invariants
  validate(): void {
    if (this.lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines');
    }

    const totalDebits = this.lines
      .filter(l => l.direction === 'Debit')
      .reduce((sum, l) => sum + l.amount, 0);

    const totalCredits = this.lines
      .filter(l => l.direction === 'Credit')
      .reduce((sum, l) => sum + l.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Debits must equal credits');
    }
  }

  post(postedBy: string): void {
    if (this.status !== 'Draft') {
      throw new Error('Only draft entries can be posted');
    }
    this.validate();
    this.status = 'Posted';
    this.updatedAt = new Date();
  }

  void(voidedBy: string, reason: string): void {
    if (this.status !== 'Posted') {
      throw new Error('Only posted entries can be voided');
    }
    this.status = 'Voided';
    this.updatedAt = new Date();
  }
}
```

#### Step 3: Define Repository Interfaces (Ports)

**File:** `services/accounting-service/src/domain/repositories/account.repository.ts`

```typescript
import { Account } from '../entities/account.entity';

export interface IAccountRepository {
  // Queries
  findAll(): Promise<Account[]>;
  findById(id: string): Promise<Account | null>;
  findByCode(code: string): Promise<Account | null>;
  findByType(accountType: string): Promise<Account[]>;
  findByParentId(parentId: string): Promise<Account[]>;
  findActive(): Promise<Account[]>;

  // Commands
  save(account: Account): Promise<Account>;
  update(account: Account): Promise<Account>;
  delete(id: string): Promise<void>;

  // Domain queries
  hasChildren(id: string): Promise<boolean>;
  hasTransactions(id: string): Promise<boolean>;
}
```

**File:** `services/accounting-service/src/domain/repositories/journal-entry.repository.ts`

```typescript
import { JournalEntry } from '../entities/journal-entry.entity';

export interface IJournalEntryRepository {
  findAll(limit?: number, offset?: number): Promise<JournalEntry[]>;
  findById(id: string): Promise<JournalEntry | null>;
  findByNumber(entryNumber: string): Promise<JournalEntry | null>;
  findByDateRange(from: Date, to: Date): Promise<JournalEntry[]>;
  findByStatus(status: string): Promise<JournalEntry[]>;

  save(entry: JournalEntry): Promise<JournalEntry>;
  update(entry: JournalEntry): Promise<JournalEntry>;

  generateEntryNumber(): Promise<string>;
}
```

### Phase 2: Application Layer (Steps 4-6)

#### Step 4: Implement Commands (Write Operations)

**File:** `services/accounting-service/src/application/commands/create-account.command.ts`

```typescript
import { Account } from '../../domain/entities/account.entity';
import { IAccountRepository } from '../../domain/repositories/account.repository';
import { nanoid } from 'nanoid';

export interface CreateAccountDTO {
  code: string;
  name: string;
  accountType: string;
  normalBalance: string;
  parentAccountId?: string;
  isDetailAccount: boolean;
  description?: string;
}

export class CreateAccountCommand {
  constructor(private accountRepo: IAccountRepository) {}

  async execute(dto: CreateAccountDTO): Promise<Account> {
    // Validation
    const existing = await this.accountRepo.findByCode(dto.code);
    if (existing) {
      throw new Error(`Account with code ${dto.code} already exists`);
    }

    if (dto.parentAccountId) {
      const parent = await this.accountRepo.findById(dto.parentAccountId);
      if (!parent) {
        throw new Error('Parent account not found');
      }
      if (parent.isDetailAccount) {
        throw new Error('Cannot add sub-account to detail account');
      }
    }

    // Create entity
    const account = new Account(
      nanoid(),
      dto.code,
      dto.name,
      dto.accountType as any,
      dto.normalBalance as any,
      dto.parentAccountId || null,
      dto.isDetailAccount,
      'Active',
      new Date(),
      new Date()
    );

    // Persist
    return await this.accountRepo.save(account);
  }
}
```

**File:** `services/accounting-service/src/application/commands/post-journal-entry.command.ts`

```typescript
import { IJournalEntryRepository } from '../../domain/repositories/journal-entry.repository';

export class PostJournalEntryCommand {
  constructor(private entryRepo: IJournalEntryRepository) {}

  async execute(entryId: string, postedBy: string): Promise<void> {
    const entry = await this.entryRepo.findById(entryId);
    if (!entry) {
      throw new Error('Journal entry not found');
    }

    // Domain logic handles validation
    entry.post(postedBy);

    // Persist
    await this.entryRepo.update(entry);

    // Publish event (future)
    // await this.eventBus.publish(new JournalEntryPostedEvent(entry));
  }
}
```

#### Step 5: Implement Queries (Read Operations)

**File:** `services/accounting-service/src/application/queries/get-ledger.query.ts`

```typescript
import { IAccountRepository } from '../../domain/repositories/account.repository';
import { IJournalEntryRepository } from '../../domain/repositories/journal-entry.repository';

export interface LedgerTransaction {
  date: Date;
  entryNumber: string;
  description: string;
  reference?: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  balance: number;
}

export class GetLedgerQuery {
  constructor(
    private accountRepo: IAccountRepository,
    private entryRepo: IJournalEntryRepository
  ) {}

  async execute(
    accountId: string,
    from?: Date,
    to?: Date
  ): Promise<{ account: any; transactions: LedgerTransaction[]; closingBalance: number }> {
    const account = await this.accountRepo.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Fetch journal entries with lines for this account
    // Calculate running balances
    // Return structured data

    return {
      account,
      transactions: [],
      closingBalance: 0,
    };
  }
}
```

#### Step 6: Implement Infrastructure Adapters

**File:** `services/accounting-service/src/infrastructure/database/account.repository.impl.ts`

```typescript
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { IAccountRepository } from '../../domain/repositories/account.repository';
import { Account } from '../../domain/entities/account.entity';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

export class AccountRepositoryImpl implements IAccountRepository {
  constructor(private db: DrizzleD1Database) {}

  async findAll(): Promise<Account[]> {
    const rows = await this.db.select().from(schema.chartOfAccounts).all();
    return rows.map(this.toDomain);
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.db
      .select()
      .from(schema.chartOfAccounts)
      .where(eq(schema.chartOfAccounts.id, id))
      .get();

    return row ? this.toDomain(row) : null;
  }

  async save(account: Account): Promise<Account> {
    await this.db.insert(schema.chartOfAccounts).values(this.toDatabase(account));
    return account;
  }

  // Mapping methods
  private toDomain(row: any): Account {
    return new Account(
      row.id,
      row.code,
      row.name,
      row.accountType,
      row.normalBalance,
      row.parentAccountId,
      row.isDetailAccount === 1,
      row.status,
      new Date(row.createdAt),
      new Date(row.updatedAt)
    );
  }

  private toDatabase(account: Account): any {
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      normalBalance: account.normalBalance,
      parentAccountId: account.parentAccountId,
      isDetailAccount: account.isDetailAccount ? 1 : 0,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  // ... implement other methods
}
```

### Phase 3: HTTP API & Integration (Steps 7-9)

#### Step 7: Create HTTP Routes

**File:** `services/accounting-service/src/infrastructure/http/routes.ts`

```typescript
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { AccountRepositoryImpl } from '../database/account.repository.impl';
import { CreateAccountCommand } from '../../application/commands/create-account.command';

type Bindings = {
  DB: D1Database;
  ACCOUNTING_EVENTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'accounting-service' });
});

// Accounts routes
app.get('/api/accounting/accounts', async (c) => {
  const db = drizzle(c.env.DB);
  const repo = new AccountRepositoryImpl(db);
  const accounts = await repo.findAll();
  return c.json({ accounts });
});

app.post('/api/accounting/accounts', async (c) => {
  const db = drizzle(c.env.DB);
  const repo = new AccountRepositoryImpl(db);
  const command = new CreateAccountCommand(repo);

  const body = await c.req.json();
  const account = await command.execute(body);

  return c.json({ account }, 201);
});

// ... more routes

export default app;
```

#### Step 8: Configure Service

**File:** `services/accounting-service/wrangler.toml`

```toml
name = "accounting-service"
main = "src/index.ts"
compatibility_date = "2024-11-19"

[[d1_databases]]
binding = "DB"
database_name = "accounting-db"
database_id = "your-database-id"

[[queues.producers]]
binding = "ACCOUNTING_EVENTS_QUEUE"
queue = "accounting-events"

# Service bindings (if accounting needs to call other services)
# [[services]]
# binding = "PRODUCT_SERVICE"
# service = "product-service"
```

#### Step 9: Update API Gateway

**File:** `services/api-gateway/src/index.ts`

```typescript
// Add to service bindings
type Bindings = {
  ACCOUNTING_SERVICE: Fetcher;
  PRODUCT_SERVICE: Fetcher;
  INVENTORY_SERVICE: Fetcher;
  // ... other services
};

// Add routing
app.all('/api/accounting/*', async (c) => {
  return c.env.ACCOUNTING_SERVICE.fetch(c.req.raw);
});
```

**File:** `services/api-gateway/wrangler.toml`

```toml
[[services]]
binding = "ACCOUNTING_SERVICE"
service = "accounting-service"
environment = "production"
```

---

## Module 2: Product Service

### Overview
Product Service manages the product catalog, SKUs, variants, pricing, and categories.

### Steps Summary
1. Review existing product-service implementation
2. Refactor to hexagonal architecture if needed
3. Define product domain entities (Product, Variant, Category)
4. Implement product repository
5. Create product commands (CreateProduct, UpdatePrice)
6. Create product queries (SearchProducts, GetProductBySKU)
7. Add HTTP routes
8. Configure service bindings
9. Test integration

### Event Publishing
- `ProductCreated` → Notify inventory to create stock records
- `ProductPriceChanged` → Notify order service of price changes
- `ProductDeleted` → Clean up related records

---

## Module 3: Inventory Service

### Overview
Inventory Service manages warehouses, stock levels, reservations, and transfers.

### Steps Summary
1. Create domain entities (Warehouse, Stock, Reservation, Transfer)
2. Implement repository interfaces
3. Create commands (ReserveStock, TransferStock, AdjustStock)
4. Create queries (GetStockLevel, GetWarehouseStock)
5. Add HTTP routes
6. Configure service bindings with product-service
7. Test integration

### Service Dependencies
- Inventory Service calls Product Service to validate SKUs
- Order Service calls Inventory Service to reserve stock

---

## Inter-Service Communication

### Synchronous Calls (Service Bindings)

**Example: Order Service reserves inventory**

```typescript
// In order-service
const reservationResponse = await c.env.INVENTORY_SERVICE.fetch(
  new Request('http://internal/api/inventory/reserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'prod-123',
      quantity: 10,
      orderId: 'order-456'
    })
  })
);

if (!reservationResponse.ok) {
  throw new Error('Failed to reserve inventory');
}
```

### Asynchronous Events (Cloudflare Queues)

**Publishing Events:**

```typescript
// In product-service
await c.env.PRODUCT_EVENTS_QUEUE.send({
  type: 'ProductCreated',
  timestamp: new Date().toISOString(),
  data: {
    productId: product.id,
    sku: product.sku,
    name: product.name
  }
});
```

**Consuming Events:**

```typescript
// In inventory-service (queue consumer)
export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const event = message.body;

      if (event.type === 'ProductCreated') {
        // Create initial stock records for all warehouses
        await createInitialStock(event.data.productId);
      }

      message.ack();
    }
  }
};
```

---

## Frontend Integration

### Update API Client

**File:** `apps/admin-dashboard/src/lib/api.ts`

```typescript
// Base URL points to API Gateway
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// All requests go through gateway, which routes to services
export const accountingApi = {
  accounts: {
    getAll: () => apiRequest('/api/accounting/accounts'),
    create: (data: any) => apiRequest('/api/accounting/accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
};

export const productApi = {
  getAll: () => apiRequest('/api/products'),
  create: (data: any) => apiRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

export const inventoryApi = {
  getStock: (productId: string) => apiRequest(`/api/inventory/${productId}`),
  reserve: (data: any) => apiRequest('/api/inventory/reserve', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
```

### Environment Configuration

**File:** `apps/admin-dashboard/.env`

```env
# Points to API Gateway (single entry point)
VITE_API_BASE_URL=http://localhost:8787
```

---

## Testing Strategy

### 1. Unit Tests (Domain Layer)
```typescript
describe('JournalEntry', () => {
  it('should validate debits equal credits', () => {
    const entry = new JournalEntry(/* ... */);
    expect(() => entry.validate()).not.toThrow();
  });
});
```

### 2. Integration Tests (Service Layer)
```bash
# Test each service independently
cd services/accounting-service
wrangler dev --local

curl http://localhost:8787/api/accounting/accounts
```

### 3. End-to-End Tests
```bash
# Start all services
cd services/api-gateway && wrangler dev --port 8787
cd services/accounting-service && wrangler dev --port 8788
cd services/product-service && wrangler dev --port 8789

# Test through gateway
curl http://localhost:8787/api/accounting/accounts
```

---

## Deployment Checklist

- [ ] All services have wrangler.toml configured
- [ ] Database migrations applied for each service
- [ ] Service bindings configured in API gateway
- [ ] Environment variables set
- [ ] Queue consumers deployed
- [ ] Frontend points to API gateway URL
- [ ] Health checks passing for all services

---

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Service Bindings Guide](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
