# Comprehensive Testing Plan

## Overview

This document outlines the testing strategy for all microservices in the Kidkazz platform.

---

## Testing Stack

- **Test Runner:** [Vitest](https://vitest.dev/) - Fast, Vite-native unit test framework
- **Mocking:** Vitest's built-in mocking + [MSW](https://mswjs.io/) for HTTP mocking
- **Assertions:** Vitest + expect API
- **Coverage:** Vitest coverage (c8)
- **E2E (Future):** Playwright

---

## Test Structure

```
services/product-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Product.ts
│   │   │   └── Product.test.ts ✅
│   │   └── value-objects/
│   │       ├── Money.ts
│   │       └── Money.test.ts ✅
│   ├── application/
│   │   └── use-cases/
│   │       ├── CreateProduct.ts
│   │       └── CreateProduct.test.ts ✅
│   └── infrastructure/
│       └── http/
│           └── routes/
│               ├── products.ts
│               └── products.test.ts ✅
└── tests/
    ├── integration/
    │   └── product-api.test.ts ✅
    └── e2e/
        └── product-flow.test.ts ✅
```

---

## Phase 1: Unit Tests for Domain Layer

**Priority:** HIGH
**Timeline:** Week 1

### Product Service Tests

#### 1.1 Domain Entities
- [ ] `Product.test.ts` - Product entity business rules
  - Product creation validation
  - Price updates
  - Stock adjustments
  - Status changes (active/inactive/discontinued)

#### 1.2 Value Objects
- [ ] `Money.test.ts` - Money value object
  - Currency validation
  - Amount precision
  - Comparison operations
  - Arithmetic operations

- [ ] `SKU.test.ts` - SKU value object
  - SKU format validation
  - Uniqueness constraints
  - Generation logic

- [ ] `PhysicalAttributes.test.ts` - Product dimensions
  - Weight validation
  - Dimension validation (L×W×H)
  - Volume calculation

#### 1.3 Domain Events
- [ ] `ProductCreated.test.ts`
- [ ] `PriceChanged.test.ts`
- [ ] `StockAdjusted.test.ts`

---

### Inventory Service Tests

#### 2.1 Domain Entities
- [ ] `Warehouse.test.ts` - Warehouse entity
  - Warehouse creation
  - Status changes
  - Address validation

- [ ] `Inventory.test.ts` - Inventory entity
  - Stock level tracking
  - Movement recording
  - Reorder point logic

#### 2.2 Value Objects
- [ ] `Quantity.test.ts` - Quantity value object
  - Non-negative validation
  - UOM conversion
  - Arithmetic operations

- [ ] `Location.test.ts` - Warehouse location
  - Address validation
  - Coordinate parsing

---

### Accounting Service Tests

#### 3.1 Domain Entities
- [ ] `JournalEntry.test.ts` - Journal entry
  - Double-entry bookkeeping (debits = credits)
  - Entry validation
  - Balance checking

- [ ] `Account.test.ts` - Chart of Accounts
  - Account creation
  - Parent-child hierarchy
  - Account type validation

#### 3.2 Business Rules
- [ ] `BalanceCalculation.test.ts`
  - Debit/Credit balance calculation
  - Account type normal balance
  - Trial balance validation

---

## Phase 2: Unit Tests for Application Layer

**Priority:** HIGH
**Timeline:** Week 2

### Product Service Use Cases

- [ ] `CreateProduct.test.ts`
  - Valid product creation
  - Invalid input rejection
  - Duplicate SKU handling
  - Event publishing

- [ ] `UpdateStock.test.ts`
  - Stock increase
  - Stock decrease
  - Negative stock prevention
  - Concurrent update handling

- [ ] `ChangePrice.test.ts`
  - Price update validation
  - Price history tracking
  - Negative price prevention

### Inventory Service Use Cases

- [ ] `CreateWarehouse.test.ts`
- [ ] `AdjustInventory.test.ts`
- [ ] `TransferStock.test.ts`
- [ ] `RecordMovement.test.ts`

### Accounting Service Use Cases

- [ ] `CreateJournalEntry.test.ts`
  - Balanced entry creation
  - Unbalanced entry rejection
  - GL segment validation

- [ ] `PostJournalEntry.test.ts`
- [ ] `GenerateFinancialReport.test.ts`

---

## Phase 3: Integration Tests

**Priority:** MEDIUM
**Timeline:** Week 3

### Product Service Integration Tests

- [ ] `product-repository.test.ts`
  - D1 database CRUD operations
  - Transaction handling
  - Query performance

- [ ] `product-api.test.ts`
  - POST /api/products
  - GET /api/products
  - PUT /api/products/:id
  - DELETE /api/products/:id
  - Error handling (400, 404, 500)

### Inventory Service Integration Tests

- [ ] `warehouse-repository.test.ts`
- [ ] `inventory-api.test.ts`
  - GET /api/warehouses
  - POST /api/warehouses
  - GET /api/inventory
  - POST /api/inventory/adjust

### Accounting Service Integration Tests

- [ ] `accounting-repository.test.ts`
- [ ] `accounting-api.test.ts`
  - GET /api/reports/sales-by-warehouse
  - GET /api/reports/sales-by-person
  - POST /api/journal-entries

---

## Phase 4: End-to-End Tests

**Priority:** MEDIUM
**Timeline:** Week 4

### E2E Test Scenarios

- [ ] **Product Creation Flow**
  1. Create product via API
  2. Verify product in database
  3. Verify event published to queue
  4. Verify product appears in inventory service

- [ ] **Sales Transaction Flow**
  1. Create product
  2. Add stock to warehouse
  3. Create sale order
  4. Reduce stock
  5. Create accounting journal entry
  6. Verify GL balances updated

- [ ] **Wholesale Order Flow**
  1. Create wholesale product
  2. Apply tiered pricing
  3. Create wholesale order
  4. Generate invoice
  5. Record payment (Cash or A/R)

---

## Testing Best Practices

### 1. Test Naming Convention
```typescript
describe('ProductEntity', () => {
  describe('create', () => {
    it('should create product with valid data', () => {});
    it('should reject product with negative price', () => {});
    it('should reject product with empty name', () => {});
  });
});
```

### 2. AAA Pattern (Arrange, Act, Assert)
```typescript
it('should update product price', () => {
  // Arrange
  const product = new Product({...});
  const newPrice = Money.from(150000, 'IDR');

  // Act
  product.changePrice(newPrice);

  // Assert
  expect(product.price.amount).toBe(150000);
  expect(product.updatedAt).toBeInstanceOf(Date);
});
```

### 3. Test Isolation
- Each test should be independent
- Use `beforeEach` to set up fresh state
- Clean up database after each test

### 4. Mock External Dependencies
```typescript
import { vi } from 'vitest';

const mockProductRepository = {
  save: vi.fn(),
  findById: vi.fn(),
};
```

---

## Test Coverage Goals

| Service | Target Coverage | Current Coverage |
|---------|----------------|------------------|
| Product Service | 80% | 0% ❌ |
| Inventory Service | 80% | 0% ❌ |
| Accounting Service | 80% | 0% ❌ |

**Critical Paths:** Must have 100% coverage
- Payment processing
- Stock adjustments
- Journal entry creation (double-entry validation)

---

## Running Tests

### Run All Tests
```bash
# From root
pnpm test

# Or per service
cd services/product-service && pnpm test
cd services/inventory-service && pnpm test
cd services/accounting-service && pnpm test
```

### Run with Coverage
```bash
pnpm test:coverage
```

### Watch Mode (Development)
```bash
pnpm test:watch
```

### Run Specific Test File
```bash
pnpm test Product.test.ts
```

---

## Test Data Setup

### Factories (Test Helpers)
```typescript
// tests/factories/product.factory.ts
export const createTestProduct = (overrides?: Partial<ProductProps>) => {
  return {
    id: '1',
    name: 'Test Product',
    sku: 'TEST-001',
    price: 50000,
    stock: 100,
    ...overrides,
  };
};
```

### Database Seeding
```typescript
// tests/setup/seed.ts
export const seedDatabase = async (db: D1Database) => {
  await db.prepare('INSERT INTO products ...').run();
  await db.prepare('INSERT INTO warehouses ...').run();
};
```

---

## Next Steps

1. ✅ Install Vitest in all services
2. ✅ Create test setup files
3. ✅ Write first test for Product entity
4. ✅ Set up CI/CD to run tests on push
5. ✅ Add test coverage reporting
6. ✅ Write integration tests for API endpoints
7. ✅ Write E2E tests for critical flows

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Test Metrics Dashboard

Track test health:
- Total tests: `pnpm test --reporter=json | jq '.numTotalTests'`
- Pass rate: `(passed / total) * 100`
- Flaky tests: Tests that fail intermittently
- Test execution time: Should be < 30s for unit tests

---

**Status:** 🚧 In Progress
**Next Action:** Install Vitest and create first unit test for Product entity
