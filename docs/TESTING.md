# Testing Documentation

## Overview

This document describes the testing strategy and how to run tests for the KidKazz DDD-compliant microservices architecture.

## Test Structure

```
kidkazz/
├── services/
│   ├── inventory-service/
│   │   └── src/
│   │       ├── tests/
│   │       │   ├── ddd-phases-complete.test.ts  # Complete Phase 1-6 tests
│   │       │   └── phase6-validation.test.ts    # Phase 6 specific tests
│   │       ├── infrastructure/
│   │       │   └── db/
│   │       │       ├── schema.test.ts           # Schema validation tests
│   │       │       └── index.ts                 # Test database setup
│   │       └── application/
│   │           └── use-cases/
│   │               └── DeleteWarehouse.test.ts  # Use case tests
│   └── product-service/
│       └── src/
│           ├── domain/entities/
│           │   └── Product.test.ts              # Entity tests
│           ├── application/use-cases/
│           │   └── DeleteProduct.test.ts        # Use case tests
│           └── infrastructure/http/routes/
│               └── uoms.test.ts                 # Route tests
├── scripts/
│   ├── phase6-validation.ts                     # CLI validation tool
│   └── migrate-to-inventory-service.test.ts     # Migration tests
└── docs/
    ├── DDD_REFACTORING_ROADMAP.md              # Phase documentation
    └── TESTING.md                              # This file
```

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
pnpm install
```

2. The tests use `better-sqlite3` for in-memory database testing.

### Run All Tests

```bash
# Run all tests across the monorepo
pnpm test

# Run tests with coverage
pnpm test:coverage
```

### Run Service-Specific Tests

#### Inventory Service
```bash
cd services/inventory-service

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/tests/ddd-phases-complete.test.ts
```

#### Product Service
```bash
cd services/product-service

# Run all tests
pnpm test

# Run specific test file
pnpm test src/domain/entities/Product.test.ts
```

### Run CLI Validation

The CLI validation tool tests against running services:

```bash
# Start services first
cd services/inventory-service && pnpm dev &
cd services/product-service && pnpm dev &

# Run validation
npx tsx scripts/phase6-validation.ts all

# Run specific validations
npx tsx scripts/phase6-validation.ts data      # Data validation only
npx tsx scripts/phase6-validation.ts locking   # Optimistic locking tests
npx tsx scripts/phase6-validation.ts websocket # WebSocket tests
npx tsx scripts/phase6-validation.ts integrity # Data integrity tests
```

## Test Categories

### 1. Unit Tests

Test individual components in isolation:

- **Domain Entities**: `Product.test.ts`
  - Creation validation
  - Business rule enforcement
  - Domain event emission

- **Value Objects**: Money, SKU, Stock, Quantity
  - Validation rules
  - Immutability

- **Schema Tests**: `schema.test.ts`
  - Column definitions
  - Constraints
  - Indexes

### 2. Integration Tests

Test component interactions:

- **Use Case Tests**: `DeleteWarehouse.test.ts`, `DeleteProduct.test.ts`
  - Complete workflows
  - Database interactions
  - Cascade behaviors

- **Route Tests**: `uoms.test.ts`
  - API endpoints
  - Request validation
  - Response formats

### 3. DDD Phase Tests

Comprehensive tests covering all DDD refactoring phases:

#### Phase 1: Schema Enhancement
```typescript
describe('Phase 1: Inventory Service Schema Enhancement', () => {
  // 1.1 Variant Support
  // 1.2 UOM Support
  // 1.3 Physical Location Fields
  // 1.4 Optimistic Locking Fields
});
```

#### Phase 2: Data Migration
```typescript
describe('Phase 2: Data Migration Scenarios', () => {
  // 2.1 Product Locations Migration
  // 2.2 Variant Locations Migration
  // 2.3 UOM Locations Migration
  // 2.4 Expiration Date Migration to Batches
});
```

#### Phase 3: WebSocket & Optimistic Locking
```typescript
describe('Phase 3: WebSocket & Optimistic Locking', () => {
  // 3.1 Optimistic Locking - Successful Updates
  // 3.2 Optimistic Locking - Conflict Detection
  // 3.3 Batch Optimistic Locking
  // 3.4 WebSocket Event Types
  // 3.5 WebSocket Channel Routing
});
```

#### Phase 4: Product Service Schema Cleanup
```typescript
describe('Phase 4: Product Service Schema Cleanup', () => {
  // 4.1 DDD Bounded Context Verification
  // 4.2 Removed Stock Fields from Product Service
});
```

#### Phase 5: API Refactoring
```typescript
describe('Phase 5: API Refactoring', () => {
  // 5.1 Multi-Warehouse Stock Queries
  // 5.2 Low Stock Detection
  // 5.3 Variant Stock Queries
  // 5.4 UOM Stock Queries
});
```

#### Phase 6: Testing & Validation
```typescript
describe('Phase 6: Testing & Validation', () => {
  // 6.1 Data Validation
  // 6.2 Data Integrity
  // 6.3 Stock Consistency
});
```

## Test Database Setup

Tests use an in-memory SQLite database for fast, isolated testing:

```typescript
// services/inventory-service/src/infrastructure/db/index.ts

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database(':memory:');
// Initialize schema...

export const db = drizzle(sqlite, { schema });
export function resetDatabase(): void {
  // Clear all tables between tests
}
```

## Test Patterns

### Creating Test Data

```typescript
beforeEach(async () => {
  resetDatabase();

  // Create test warehouse
  testWarehouseId = generateId();
  await db.insert(warehouses).values({
    id: testWarehouseId,
    code: 'WH-TEST',
    name: 'Test Warehouse',
    // ...
  });
});

afterEach(() => {
  resetDatabase();
});
```

### Testing Optimistic Locking

```typescript
it('should reject update with stale version', async () => {
  // Insert with version 5
  await db.insert(inventory).values({
    id: inventoryId,
    version: 5,
    // ...
  });

  // Attempt update with wrong version
  const result = await db
    .update(inventory)
    .set({ quantityAvailable: 80 })
    .where(and(
      eq(inventory.id, inventoryId),
      eq(inventory.version, 1) // Wrong version
    ))
    .run();

  expect(result.changes).toBe(0); // No rows updated
});
```

### Testing Cascade Delete

```typescript
it('should cascade delete related records', async () => {
  // Create parent and child records
  await db.insert(inventory).values({ id: inventoryId, ... });
  await db.insert(inventoryBatches).values({ inventoryId, ... });

  // Delete parent
  await db.delete(inventory).where(eq(inventory.id, inventoryId)).run();

  // Verify child deleted
  const remaining = await db.select().from(inventoryBatches)...;
  expect(remaining).toBeUndefined();
});
```

### Testing WebSocket Events

```typescript
it('should validate event structure', () => {
  const event = {
    type: 'inventory.updated',
    data: {
      productId: 'product-001',
      quantityAvailable: 90,
      version: 2,
      timestamp: new Date().toISOString(),
    },
  };

  expect(event.type).toBe('inventory.updated');
  expect(event.data.version).toBeDefined();
});
```

## Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Statements | 80% | - |
| Branches | 75% | - |
| Functions | 80% | - |
| Lines | 80% | - |

Generate coverage report:
```bash
cd services/inventory-service
pnpm test:coverage
```

Coverage reports are generated in `coverage/` directory.

## CI/CD Integration

Tests should run on every PR:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
```

## Troubleshooting

### Common Issues

1. **"Cannot find module 'better-sqlite3'"**
   ```bash
   cd services/inventory-service
   pnpm install better-sqlite3 @types/better-sqlite3 --save-dev
   ```

2. **"Database is locked"**
   - Tests are running in parallel and sharing database
   - Use `resetDatabase()` in `beforeEach` to ensure isolation

3. **"Version mismatch"**
   - Ensure version increment is atomic with update
   - Check `WHERE version = :expected` condition

### Debug Mode

Run tests with verbose output:
```bash
pnpm test -- --reporter=verbose
```

Run single test:
```bash
pnpm test -- -t "should create inventory with variantId"
```

## Related Documentation

- [DDD Refactoring Roadmap](./DDD_REFACTORING_ROADMAP.md) - Phase details and deliverables
- [DDD Hexagonal Boundary Review](./DDD_HEXAGONAL_BOUNDARY_REVIEW.md) - Architecture decisions
- [Frontend Refactoring Roadmap](./FRONTEND_REFACTORING_ROADMAP.md) - Frontend integration
