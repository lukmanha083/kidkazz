# E-Commerce Dual-Market Platform Roadmap

## 🎯 Updated Strategy: Retail + Wholesale

**IMPORTANT CHANGE:** The platform now supports **TWO markets**:
1. **Retail (B2C)** - Direct-to-consumer sales with standard pricing
2. **Wholesale (B2B)** - Bulk orders with tiered pricing and MOQ requirements

This dual-market approach allows the platform to:
- ✅ Maximize revenue streams (retail margins + wholesale volume)
- ✅ Serve broader customer base
- ✅ Flexible product availability (retail-only, wholesale-only, or both)
- ✅ Separate user experiences tailored to each market

**See:** `RETAIL_WHOLESALE_ARCHITECTURE.md` for complete dual-market architecture details.

## 🏛️ Architecture Evolution

**NEW**: The platform architecture has evolved to include modern microservices patterns:
- **Hexagonal Architecture (Ports & Adapters)** - Clean separation of concerns
- **Domain-Driven Design (DDD)** - 5 bounded contexts
- **Event-Driven Architecture** - Async communication via Cloudflare Queues
- **Saga Pattern** - Distributed transactions with Cloudflare Workflows

**See:** `ARCHITECTURE.md` for comprehensive architecture guide including:
- Microservices design with 5 bounded contexts
- Communication patterns (Service Bindings, Queues, Workflows)
- Migration strategies and implementation roadmap
- Cost analysis ($5-6/month vs AWS $154/month)

## Executive Summary
This roadmap outlines the development plan for a dual-market E-Commerce platform (Retail + Wholesale) built on Cloudflare's serverless infrastructure, utilizing modern web technologies and microservices architecture for optimal performance, scalability, and maintainability.

---

## Technology Stack

### Frontend (3 Applications)
- **Framework**: TanStack Start (React) - Cloudflare native
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **Applications**:
  1. **Retail Frontend** - For retail customers (B2C)
  2. **Wholesale Frontend** - For wholesale buyers (B2B)
  3. **Admin Dashboard** - For admin/suppliers ✅ (Already built)

### Backend
- **Runtime**: Cloudflare Workers (Edge Computing)
- **Framework**: **Hono** (Recommended)
  - Ultra-fast, lightweight (~12KB)
  - Purpose-built for edge runtimes
  - Excellent TypeScript support
  - Compatible with tRPC via `@hono/trpc-server`
- **API Layer**: tRPC or Hono RPC
  - tRPC: Full type-safety between frontend/backend
  - Hono RPC: Simpler, faster, built-in to Hono
- **Alternative**: Consider oRPC for REST + RPC hybrid

### Database
**Recommended: Cloudflare D1 (SQLite) + Turso for multi-region**

| Database | Pros | Cons | Best For |
|----------|------|------|----------|
| **Cloudflare D1** | - Native Cloudflare integration<br>- Zero latency to Workers<br>- Simple setup<br>- Free tier generous | - Limited to Cloudflare ecosystem<br>- 10GB per database limit<br>- SQLite limitations | Pure Cloudflare stack, getting started quickly |
| **Turso** | - Multi-region by default<br>- Embedded syncs<br>- Access from anywhere<br>- Based on libSQL | - Separate service to manage<br>- Additional cost | Global distribution, flexibility |
| **Neon (PostgreSQL)** | - Full PostgreSQL features<br>- Sub-10ms latency<br>- Familiar SQL | - Single-region read replicas<br>- Not SQLite-compatible | Complex queries, PostgreSQL expertise |

**Recommendation**: Start with **Cloudflare D1** for simplicity, migrate to **Turso** if you need multi-region or access from outside Cloudflare.

**Note**: MySQL is not recommended for Cloudflare Workers. PostgreSQL (via Neon) or SQLite (D1/Turso) are the best options.

### Storage & Communication
- **Images/Assets**: Cloudflare R2 (S3-compatible)
- **Cache**: Cloudflare KV (Key-Value store)
- **Sessions**: Cloudflare Durable Objects or KV
- **Service Bindings**: Zero-cost RPC between Workers (FREE, ~μs latency)
- **Cloudflare Queues**: Asynchronous messaging ($0.40/M operations)
- **Cloudflare Workflows**: Saga orchestration for distributed transactions (GA Nov 2024)
- **Durable Objects**: Stateful coordination ($0.15/M requests)

### Architecture Patterns
- **Hexagonal Architecture**: Clean separation between domain logic and infrastructure
- **Domain-Driven Design (DDD)**: 5 bounded contexts (Product, Order, Payment, User, Inventory)
- **Event-Driven Architecture**: Async communication via Cloudflare Queues
- **Saga Pattern**: Distributed transactions with compensating actions

### Package Manager
- **pnpm** (monorepo-friendly, fast, efficient)
  - Cloudflare Pages Build System v3 supports pnpm
  - Fallback: Use `npx pnpm i --store=node_modules/.pnpm-store && npm run build`

### Development Environment
**FreeBSD Compatibility**: ✅ **YES**
- Node.js runs on FreeBSD (install via ports or pkg)
- pnpm works on FreeBSD
- Development environment is separate from deployment (Cloudflare edge)
- You can develop on FreeBSD and deploy to Cloudflare without issues

---

## Phase 1: Microservices Foundation & Setup (Weeks 1-3)

**Goal**: Set up complete microservices architecture from Day 1 with proper tooling, structure, and development environment.

### 1.1 Development Environment Setup (Day 1-2)

#### System Requirements
- [ ] Install Node.js 20+ on FreeBSD (`pkg install node npm`)
- [ ] Install pnpm globally (`npm install -g pnpm`)
- [ ] Install Wrangler CLI (`pnpm add -g wrangler`)
- [ ] Login to Cloudflare (`wrangler login`)
- [ ] Set up Git repository
- [ ] Configure IDE (VSCode recommended with extensions):
  - ESLint
  - Prettier
  - TypeScript
  - Cloudflare Workers

### 1.2 Monorepo Structure Initialization (Day 3-4)

Create the following structure from scratch:

```bash
mkdir kidkazz && cd kidkazz

# Initialize root package.json
pnpm init

# Create folder structure
mkdir -p services/{product-service,order-service,payment-service,user-service,inventory-service,api-gateway}/src
mkdir -p apps/{admin-dashboard,retail-frontend,wholesale-frontend}
mkdir -p shared/{domain-events,types,utils}
mkdir -p docs
```

#### Root Configuration Files

**`package.json` (root)**:
```json
{
  "name": "kidkazz-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "deploy": "pnpm -r deploy",
    "type-check": "pnpm -r type-check",
    "test": "pnpm -r test",
    "clean": "pnpm -r clean"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^24.10.0",
    "prettier": "^3.0.0",
    "eslint": "^8.50.0"
  }
}
```

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - 'services/*'
  - 'apps/*'
  - 'shared/*'
```

**`tsconfig.json` (root)**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}
```

### 1.3 Shared Libraries Setup (Day 5-6)

#### 1.3.1 Domain Events Library (`shared/domain-events`)

**`shared/domain-events/package.json`**:
```json
{
  "name": "@kidkazz/domain-events",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

**`shared/domain-events/src/index.ts`**:
```typescript
// Base domain event
export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  timestamp: string;
  version: number;
}

// Product events
export interface ProductCreated extends DomainEvent {
  eventType: 'ProductCreated';
  productId: string;
  name: string;
  retailPrice: number | null;
  wholesalePrice: number;
}

export interface ProductPriceUpdated extends DomainEvent {
  eventType: 'ProductPriceUpdated';
  productId: string;
  newPrice: number;
  priceType: 'retail' | 'wholesale';
}

// Order events
export interface OrderCreated extends DomainEvent {
  eventType: 'OrderCreated';
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  totalAmount: number;
}

export interface OrderConfirmed extends DomainEvent {
  eventType: 'OrderConfirmed';
  orderId: string;
}

// Payment events
export interface PaymentProcessed extends DomainEvent {
  eventType: 'PaymentProcessed';
  paymentId: string;
  orderId: string;
  amount: number;
  status: 'succeeded' | 'failed';
}

// Inventory events
export interface InventoryReserved extends DomainEvent {
  eventType: 'InventoryReserved';
  reservationId: string;
  productId: string;
  quantity: number;
  warehouseId: string;
}

export interface InventoryReleased extends DomainEvent {
  eventType: 'InventoryReleased';
  reservationId: string;
}
```

#### 1.3.2 Shared Types Library (`shared/types`)

**`shared/types/package.json`**:
```json
{
  "name": "@kidkazz/types",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

**`shared/types/src/index.ts`**:
```typescript
// Common types
export type UserId = string;
export type ProductId = string;
export type OrderId = string;
export type PaymentId = string;

export type UserRole = 'admin' | 'supplier' | 'retail_buyer' | 'wholesale_buyer';

export interface Result<T, E = Error> {
  isSuccess: boolean;
  value?: T;
  error?: E;
}

// Value Objects
export class Price {
  private constructor(private readonly value: number) {}

  static create(value: number): Price {
    if (value < 0) throw new Error('Price cannot be negative');
    return new Price(value);
  }

  getValue(): number {
    return this.value;
  }
}

export class SKU {
  private constructor(private readonly value: string) {}

  static create(value: string): SKU {
    if (!/^[A-Z0-9-]+$/.test(value)) {
      throw new Error('Invalid SKU format');
    }
    return new SKU(value);
  }

  getValue(): string {
    return this.value;
  }
}
```

### 1.4 API Gateway Setup (Day 7-8)

**`services/api-gateway/package.json`**:
```json
{
  "name": "@kidkazz/api-gateway",
  "version": "1.0.0",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^3.0.0"
  }
}
```

**`services/api-gateway/wrangler.jsonc`**:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "api-gateway",
  "main": "src/index.ts",
  "compatibility_date": "2024-11-14",

  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },

  // Service Bindings to all microservices (FREE - Zero cost!)
  "services": [
    {
      "binding": "PRODUCT_SERVICE",
      "service": "product-service"
    },
    {
      "binding": "ORDER_SERVICE",
      "service": "order-service"
    },
    {
      "binding": "PAYMENT_SERVICE",
      "service": "payment-service"
    },
    {
      "binding": "USER_SERVICE",
      "service": "user-service"
    },
    {
      "binding": "INVENTORY_SERVICE",
      "service": "inventory-service"
    }
  ],

  // Development settings
  "dev": {
    "port": 8787
  }
}
```

**`services/api-gateway/src/index.ts`**:
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  PRODUCT_SERVICE: Fetcher;
  ORDER_SERVICE: Fetcher;
  PAYMENT_SERVICE: Fetcher;
  USER_SERVICE: Fetcher;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'healthy' }));

// Route to Product Service (FREE via Service Bindings!)
app.all('/api/products/*', async (c) => {
  return c.env.PRODUCT_SERVICE.fetch(c.req.raw);
});

// Route to Order Service
app.all('/api/orders/*', async (c) => {
  return c.env.ORDER_SERVICE.fetch(c.req.raw);
});

// Route to Payment Service
app.all('/api/payments/*', async (c) => {
  return c.env.PAYMENT_SERVICE.fetch(c.req.raw);
});

// Route to User Service
app.all('/api/users/*', async (c) => {
  return c.env.USER_SERVICE.fetch(c.req.raw);
});
app.all('/api/auth/*', async (c) => {
  return c.env.USER_SERVICE.fetch(c.req.raw);
});

// Route to Inventory Service
app.all('/api/inventory/*', async (c) => {
  return c.env.INVENTORY_SERVICE.fetch(c.req.raw);
});

export default app;
```

### 1.5 Service Template Setup (Day 9-12)

Create a **Hexagonal Architecture template** that will be copied for each service:

**Template structure** (applies to all 5 services):
```
services/{service-name}/
├── src/
│   ├── domain/              # Business logic (NO dependencies)
│   │   ├── entities/        # Domain entities (Product, Order, etc.)
│   │   ├── value-objects/   # Value objects (Price, SKU, etc.)
│   │   ├── events/          # Domain events
│   │   ├── repositories/    # Repository interfaces (ports)
│   │   └── errors/          # Domain-specific errors
│   ├── application/         # Use cases
│   │   ├── use-cases/       # Application services
│   │   ├── commands/        # Command handlers
│   │   ├── queries/         # Query handlers
│   │   └── ports/           # External service interfaces
│   ├── infrastructure/      # Adapters
│   │   ├── db/              # Database implementation
│   │   ├── repositories/    # Repository implementation
│   │   ├── http/            # HTTP routes (Hono)
│   │   └── external/        # External API clients
│   └── index.ts             # Entry point
├── wrangler.toml
├── package.json
└── tsconfig.json
```

**Example: Product Service** (`services/product-service/src/index.ts`):
```typescript
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  PRODUCT_EVENTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

// Domain layer imports
import { Product } from './domain/entities/Product';
import { ProductRepository } from './domain/repositories/ProductRepository';

// Infrastructure layer
import { D1ProductRepository } from './infrastructure/repositories/D1ProductRepository';

// Application layer
import { CreateProduct } from './application/use-cases/CreateProduct';
import { GetProduct } from './application/use-cases/GetProduct';

app.get('/health', (c) => c.json({ service: 'product-service', status: 'healthy' }));

// Create product endpoint
app.post('/api/products', async (c) => {
  const body = await c.req.json();

  // Hexagonal Architecture in action:
  // 1. Infrastructure creates repository
  const productRepo = new D1ProductRepository(c.env.DB);

  // 2. Application use case
  const createProduct = new CreateProduct(productRepo, c.env.PRODUCT_EVENTS_QUEUE);

  // 3. Execute use case
  const result = await createProduct.execute({
    name: body.name,
    retailPrice: body.retailPrice,
    wholesalePrice: body.wholesalePrice,
    availableForRetail: body.availableForRetail,
    availableForWholesale: body.availableForWholesale
  });

  if (!result.isSuccess) {
    return c.json({ error: result.error?.message }, 400);
  }

  return c.json({ product: result.value }, 201);
});

export default app;
```

### 1.6 Database Setup (Day 13-15)

#### Create D1 Databases (one per service):
```bash
# Product Service database
wrangler d1 create product-db

# Order Service database
wrangler d1 create order-db

# Payment Service database
wrangler d1 create payment-db

# User Service database
wrangler d1 create user-db

# Inventory Service database
wrangler d1 create inventory-db
```

#### Set up Drizzle ORM for each service

**Example: Product Service** (`services/product-service/src/infrastructure/db/schema.ts`):
```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').unique().notNull(),
  description: text('description'),
  retailPrice: real('retail_price'),
  basePrice: real('base_price').notNull(),
  availableForRetail: integer('available_for_retail', { mode: 'boolean' }).default(false),
  availableForWholesale: integer('available_for_wholesale', { mode: 'boolean' }).default(true),
  minimumOrderQuantity: integer('minimum_order_quantity').default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const pricingTiers = sqliteTable('pricing_tiers', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  minQuantity: integer('min_quantity').notNull(),
  discountPercentage: real('discount_percentage').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
```

### 1.7 Cloudflare Queues Setup (Day 16-17)

Set up async communication between services:

```bash
# Create queues for event-driven architecture
wrangler queues create order-events-queue
wrangler queues create payment-events-queue
wrangler queues create inventory-events-queue
```

Update each service's `wrangler.toml` to include queue producers and consumers:

**Example: Order Service** (`services/order-service/wrangler.toml`):
```toml
name = "order-service"
main = "src/index.ts"
compatibility_date = "2024-11-14"

[[d1_databases]]
binding = "DB"
database_name = "order-db"
database_id = "<your-database-id>"

# Producer: Send events to queue
[[queues.producers]]
queue = "order-events-queue"
binding = "ORDER_EVENTS_QUEUE"

# Consumer: Receive events from other services
[[queues.consumers]]
queue = "payment-events-queue"
max_batch_size = 10
max_batch_timeout = 30
```

### 1.8 Cloudflare Workflows Setup (Day 18-19)

Set up Saga Pattern orchestration using Workflows:

**`services/order-service/src/workflows/OrderCreationSaga.ts`**:
```typescript
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

interface OrderSagaParams {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentAmount: number;
}

export class OrderCreationSaga extends WorkflowEntrypoint {
  async run(event: WorkflowEvent<OrderSagaParams>, step: WorkflowStep) {
    const { orderId, userId, items, paymentAmount } = event.payload;

    const sagaState = {
      reservationIds: [] as string[],
      paymentId: null as string | null
    };

    try {
      // Step 1: Reserve inventory
      sagaState.reservationIds = await step.do('reserve-inventory', async () => {
        // Call Inventory Service via Service Binding
        const results = await Promise.all(
          items.map(item =>
            this.env.INVENTORY_SERVICE.fetch(
              new Request('http://inventory/api/inventory/reserve', {
                method: 'POST',
                body: JSON.stringify({
                  productId: item.productId,
                  quantity: item.quantity
                })
              })
            ).then(r => r.json())
          )
        );
        return results.map((r: any) => r.reservationId);
      });

      // Step 2: Process payment
      sagaState.paymentId = await step.do('process-payment', async () => {
        const response = await this.env.PAYMENT_SERVICE.fetch(
          new Request('http://payment/api/payments/process', {
            method: 'POST',
            body: JSON.stringify({ orderId, amount: paymentAmount })
          })
        );
        if (!response.ok) throw new Error('Payment failed');
        const result = await response.json();
        return result.paymentId;
      });

      // Step 3: Confirm inventory
      await step.do('confirm-inventory', async () => {
        await Promise.all(
          sagaState.reservationIds.map(id =>
            this.env.INVENTORY_SERVICE.fetch(
              new Request(`http://inventory/api/inventory/reservations/${id}/confirm`, {
                method: 'POST'
              })
            )
          )
        );
      });

      return { success: true, orderId };

    } catch (error) {
      // COMPENSATION: Rollback
      if (sagaState.paymentId) {
        await step.do('compensate-payment', async () => {
          await this.env.PAYMENT_SERVICE.fetch(
            new Request(`http://payment/api/payments/${sagaState.paymentId}/refund`, {
              method: 'POST'
            })
          );
        });
      }

      if (sagaState.reservationIds.length > 0) {
        await step.do('compensate-inventory', async () => {
          await Promise.all(
            sagaState.reservationIds.map(id =>
              this.env.INVENTORY_SERVICE.fetch(
                new Request(`http://inventory/api/inventory/reservations/${id}/release`, {
                  method: 'POST'
                })
              )
            )
          );
        });
      }

      return { success: false, error: (error as Error).message };
    }
  }
}
```

### 1.9 Development Tooling (Day 20-21)

#### Testing Setup

**Root** (`package.json` - add test script):
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

**Example test** (`services/product-service/src/domain/entities/Product.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import { Product } from './Product';

describe('Product Entity', () => {
  it('should create a valid wholesale product', () => {
    const result = Product.create({
      name: 'Bulk Rice 50kg',
      retailPrice: null,
      wholesalePrice: 250000,
      availability: { retail: false, wholesale: true }
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value?.getName()).toBe('Bulk Rice 50kg');
  });

  it('should fail to create product with invalid wholesale price', () => {
    const result = Product.create({
      name: 'Bulk Rice 50kg',
      retailPrice: null,
      wholesalePrice: -100,
      availability: { retail: false, wholesale: true }
    });

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toContain('price');
  });
});
```

#### Local Development Script

**`scripts/dev-all.sh`**:
```bash
#!/bin/bash

# Start all services in parallel using tmux or parallel terminals

echo "Starting API Gateway..."
cd services/api-gateway && pnpm dev &

echo "Starting Product Service..."
cd services/product-service && pnpm dev &

echo "Starting Order Service..."
cd services/order-service && pnpm dev &

echo "Starting Payment Service..."
cd services/payment-service && pnpm dev &

echo "Starting User Service..."
cd services/user-service && pnpm dev &

echo "Starting Inventory Service..."
cd services/inventory-service && pnpm dev &

echo "All services starting..."
echo "API Gateway: http://localhost:8787"

wait
```

**Make it executable**:
```bash
chmod +x scripts/dev-all.sh
```

**Phase 1 Deliverables**:
- ✅ Complete monorepo structure with pnpm workspaces
- ✅ 5 microservices with Hexagonal Architecture scaffolding
- ✅ API Gateway with Service Bindings configured
- ✅ Shared libraries for types and domain events
- ✅ Database setup (5 D1 databases, one per service)
- ✅ Cloudflare Queues for event-driven communication
- ✅ Cloudflare Workflows for Saga Pattern
- ✅ Development tooling (testing, linting, scripts)
- ✅ All services deployable to Cloudflare Workers

**Time Investment**: 3 weeks (21 days) for complete microservices foundation

**Next Phase**: Phase 2 - Implement core features in each service (Product, User, Inventory)

---

## Phase 2: Core Features (Weeks 3-6)

### 2.1 Product Management
- [ ] Product listing API (Hono endpoints)
  - Bulk quantities
  - Tiered pricing (min order quantities)
  - SKU management
- [ ] Product search & filtering
  - By category, price, MOQ (Minimum Order Quantity)
  - Full-text search (using D1 or external service)
- [ ] Product images (upload to R2)
- [ ] Inventory tracking

### 2.2 User Management
- [ ] Buyer registration & verification
  - Business license verification
  - Tax ID validation
- [ ] Supplier/vendor management
- [ ] User profiles & preferences
- [ ] Company profiles (B2B context)

### 2.3 Shopping Cart & Orders
- [ ] Cart system (KV storage for guest, D1 for authenticated)
- [ ] Bulk order calculations
- [ ] Quantity validation (MOQ enforcement)
- [ ] Order placement workflow
- [ ] Order status tracking
- [ ] Email notifications (Cloudflare Email Workers)

### 2.4 Pricing Engine
- [ ] Tiered pricing logic
  - Volume discounts
  - Custom pricing per buyer
- [ ] Quote system (RFQ - Request for Quote)
- [ ] Tax calculation
- [ ] Shipping cost estimation

---

## 🏛️ ARCHITECTURE DECISION: Option A Chosen ✅

**DECISION MADE**: **Option A - Microservices Architecture from the Start**

This roadmap reflects the decision to implement a **full microservices architecture** with:
- ✅ 5 bounded contexts as separate Workers from Day 1
- ✅ Hexagonal Architecture (domain/application/infrastructure) for each service
- ✅ Service Bindings for zero-cost, zero-latency communication
- ✅ Event-Driven Architecture via Cloudflare Queues
- ✅ Saga Pattern using Cloudflare Workflows

**Benefits of this approach**:
- Clean architecture from the start
- No technical debt accumulation
- Better testability and maintainability
- Easy team scaling (one service per developer)
- Prevents future refactoring pain

**Trade-off accepted**: Adds 2-3 weeks to initial setup (Phase 1 extended to 3 weeks)

**See**: `ARCHITECTURE.md` for complete architecture details.

---

## Phase 3: Payment & Checkout (Weeks 7-8)

### 3.1 Payment Integration
- [ ] Integrate payment gateway (Stripe recommended for Cloudflare)
  - Stripe Checkout
  - Payment intents API
- [ ] Support for:
  - Credit card
  - ACH/Bank transfer
  - Net-30/60 terms (invoice-based)
- [ ] Payment status webhooks
- [ ] Invoice generation (PDF via Workers)

### 3.2 Checkout Flow
- [ ] Multi-step checkout
- [ ] Address validation
- [ ] Shipping options
- [ ] Order summary & confirmation
- [ ] Receipt/invoice email

---

## Phase 4: Advanced Features (Weeks 9-12)

### 4.1 Analytics & Reporting
- [ ] Cloudflare Analytics integration
- [ ] Custom dashboards:
  - Sales reports
  - Inventory levels
  - Top products
  - Customer insights
- [ ] Export to CSV/Excel

### 4.2 Communication
- [ ] In-app messaging (buyer-supplier)
- [ ] Email notifications system
- [ ] SMS notifications (Twilio + Workers)
- [ ] Order updates & tracking

### 4.3 Supplier Portal
- [ ] Inventory management UI
- [ ] Order fulfillment dashboard
- [ ] Bulk product uploads (CSV import)
- [ ] Analytics for suppliers

### 4.4 Buyer Portal
- [ ] Purchase history
- [ ] Reorder functionality
- [ ] Saved lists/favorites
- [ ] Quick reorder from past orders

---

## Phase 5: Retail & Wholesale Frontends (Weeks 13-18)

### 5.1 Retail Frontend Development
- [ ] Initialize TanStack Start app for retail customers
- [ ] Implement product catalog (retail pricing only)
  - Product listing with search & filtering
  - Product detail pages
  - Category navigation
- [ ] Shopping cart & checkout
  - Add to cart functionality
  - Cart management
  - Simple checkout flow
- [ ] User authentication (retail_buyer role)
- [ ] Payment integration (QRIS, Virtual Account, Credit Card)
- [ ] Order tracking & history
- [ ] Customer account management
- [ ] shadcn/ui components integration

### 5.2 Wholesale Frontend Development
- [ ] Initialize TanStack Start app for wholesale buyers
- [ ] Implement wholesale product catalog
  - Tiered pricing display
  - MOQ enforcement
  - Bulk discount calculator
- [ ] Request for Quote (RFQ) system
- [ ] Wholesale shopping cart with MOQ validation
- [ ] Company profile management
- [ ] Wholesale checkout flow
  - Payment terms (Net-30/60)
  - Purchase order upload
- [ ] Invoice management
- [ ] Order history & reordering
- [ ] shadcn/ui components integration

### 5.3 Admin Dashboard Enhancements
- [ ] Dual-pricing management UI
  - Set retail prices
  - Configure wholesale tiered pricing
- [ ] Product availability toggles (retail/wholesale)
- [ ] User role management (retail_buyer vs wholesale_buyer)
- [ ] Separate order views (retail vs wholesale)
- [ ] Analytics dashboard (revenue by market type)

---

## Phase 6: Optimization & Launch (Weeks 19-22)

### 6.1 Performance Optimization
- [ ] Edge caching strategies (Cloudflare Cache API)
- [ ] Image optimization (Cloudflare Images)
- [ ] Code splitting & lazy loading
- [ ] Database query optimization
- [ ] KV caching for frequent reads

### 5.2 SEO & Marketing
- [ ] Meta tags & Open Graph
- [ ] Sitemap generation
- [ ] Schema.org markup (Product, Organization)
- [ ] Blog/content pages (wholesale tips, industry news)

### 5.3 Security
- [ ] Rate limiting (Cloudflare Workers)
- [ ] DDoS protection (included with Cloudflare)
- [ ] Input validation & sanitization
- [ ] CSRF protection
- [ ] SQL injection prevention (use parameterized queries)
- [ ] Secure headers (CSP, HSTS)

### 5.4 Testing
- [ ] Unit tests (Vitest)
- [ ] Integration tests (Cloudflare Workers test environment)
- [ ] E2E tests (Playwright)
- [ ] Load testing

### 5.5 DevOps & Deployment
- [ ] CI/CD pipeline (GitHub Actions)
  - Lint & format checks
  - Type checking
  - Tests
  - Deploy to staging
  - Deploy to production
- [ ] Environment management (dev, staging, prod)
- [ ] Monitoring & logging
  - Cloudflare Workers Analytics
  - Error tracking (Sentry)
  - Uptime monitoring

### 6.6 Launch Preparation
- [ ] Beta testing with select users
- [ ] Documentation (API docs, user guides)
- [ ] Customer support system
- [ ] Terms of service & privacy policy
- [ ] GDPR/CCPA compliance

---

## Phase 7: Mobile Apps (Weeks 23-34) 📱

**Note**: Mobile development is the FINAL phase after web frontends are complete.

### 7.1 Retail Mobile App (Android & iOS)
- [ ] Initialize Expo project for retail customers
- [ ] Set up development environment
  - Install Expo CLI
  - Configure EAS Build
  - Set up app.json configuration
- [ ] Implement core features
  - Product browsing (retail pricing)
  - Shopping cart
  - Checkout flow with payment integration
  - Order tracking
  - Push notifications for order updates
- [ ] Payment integration
  - Xendit QRIS (scan & pay)
  - Virtual Account (generate payment codes)
  - Credit card payments
- [ ] User authentication
  - JWT token storage (expo-secure-store)
  - Biometric authentication
- [ ] Testing & deployment
  - Test on Android devices
  - Test on iOS devices
  - Submit to Google Play Store
  - Submit to Apple App Store

### 7.2 Wholesale Mobile App (Android & iOS)
- [ ] Initialize Expo project for wholesale buyers
- [ ] Implement wholesale-specific features
  - Product catalog with tiered pricing
  - MOQ validation
  - Bulk order calculator
  - RFQ (Request for Quote) system
- [ ] Company account management
  - Company profile
  - Multiple user accounts per company
  - Purchase history
- [ ] Advanced features
  - Barcode scanner for quick ordering
  - Offline mode support
  - Invoice downloads
  - Push notifications for quote approvals
- [ ] Testing & deployment
  - Enterprise distribution (if needed)
  - App store submissions

### 7.3 Mobile Backend Integration
- [ ] Update API for mobile-specific needs
  - Push notification endpoints
  - Mobile-optimized responses
  - Image size optimization for mobile
- [ ] Implement push notifications
  - Expo Push Notification service
  - Order status updates
  - Payment confirmations
  - Quote approvals (wholesale)
- [ ] Analytics integration
  - Track mobile user behavior
  - Monitor app performance
  - Crash reporting

**See**: `MOBILE_APP_EXPO_GUIDE.md` for complete implementation details.

---

## Recommended Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN/Edge                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Retail Web   │  │ Wholesale Web│  │    Admin     │         │
│  │  (TanStack)   │  │  (TanStack)  │  │  Dashboard   │         │
│  │  Pages        │  │  Pages       │  │  (TanStack)  │         │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│          │                 │                  │                  │
│          └─────────────────┴──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │  Hono Backend   │                           │
│                   │  (Workers API)  │                           │
│                   └────────┬────────┘                           │
│                            │                                     │
│            ┌───────────────┼───────────────┐                   │
│            │               │               │                    │
│       ┌────▼───┐    ┌─────▼────┐    ┌────▼────┐              │
│       │   D1   │    │    KV    │    │   R2    │              │
│       │Database│    │  Cache   │    │ Images  │              │
│       └────────┘    └──────────┘    └─────────┘              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
           │                                      │
           │                                      │
    ┌──────▼───────┐                    ┌────────▼────────┐
    │ Mobile Apps  │                    │ External APIs   │
    │ (Expo)       │                    │                 │
    ├──────────────┤                    │ - Xendit        │
    │ - Retail App │                    │ - Email Service │
    │ - Wholesale  │                    │ - Push Notifs   │
    │   App        │                    │ - SMS (Twilio)  │
    └──────────────┘                    └─────────────────┘
```

---

## Key Considerations for Wholesale E-Commerce

### 1. Bulk Pricing Logic
```typescript
// Example tiered pricing structure
interface PriceTier {
  minQuantity: number;
  maxQuantity: number | null;
  pricePerUnit: number;
  discountPercent: number;
}

const productPricing: PriceTier[] = [
  { minQuantity: 1, maxQuantity: 99, pricePerUnit: 10.00, discountPercent: 0 },
  { minQuantity: 100, maxQuantity: 499, pricePerUnit: 8.50, discountPercent: 15 },
  { minQuantity: 500, maxQuantity: null, pricePerUnit: 7.00, discountPercent: 30 }
];
```

### 2. Minimum Order Quantities (MOQ)
- Enforce MOQ at cart level
- Clear messaging about MOQ requirements
- Suggest related products to meet MOQ

### 3. Custom Pricing
- Per-customer pricing contracts
- Volume commitment discounts
- Seasonal pricing

### 4. Quote/RFQ System
- Allow buyers to request custom quotes
- Negotiation workflow
- Quote expiration dates

### 5. Inventory Management
- Real-time inventory tracking
- Low stock alerts
- Backorder management
- Multi-warehouse support (if applicable)

---

## Development Best Practices

### 1. Type Safety
```typescript
// Share types between frontend and backend
// apps/backend/src/types.ts
export type Product = {
  id: string;
  name: string;
  sku: string;
  moq: number;
  pricing: PriceTier[];
};

// Frontend can import these types
import type { Product } from '@/shared/types';
```

### 2. Error Handling
```typescript
// Hono error handling
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: err.message }, 500);
});
```

### 3. Validation
```typescript
// Use Zod for runtime validation
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().regex(/^[A-Z0-9-]+$/),
  moq: z.number().int().positive(),
  price: z.number().positive()
});
```

### 4. Database Migrations
```bash
# Using Drizzle ORM
pnpm drizzle-kit generate:sqlite
pnpm drizzle-kit push:sqlite

# Or use Wrangler for D1
npx wrangler d1 migrations create wholesale-db add_products_table
npx wrangler d1 migrations apply wholesale-db
```

---

## Deployment Strategy

### Development Workflow
1. **Local Development**:
   - Use `wrangler dev` for Workers
   - Use `next dev` for frontend
   - FreeBSD native development

2. **Staging Environment**:
   - Deploy to Cloudflare Pages preview
   - Test with staging D1 database

3. **Production**:
   - Deploy via GitHub Actions
   - Blue-green deployment (Pages supports this)
   - Rollback capability

### Cloudflare Pages Deployment
```bash
# Frontend
pnpm build
npx wrangler pages deploy ./out

# Workers (Backend)
npx wrangler deploy
```

### Environment Variables
```toml
# wrangler.toml
name = "wholesale-backend"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[env.production]
name = "wholesale-backend-prod"

[[d1_databases]]
binding = "DB"
database_name = "wholesale-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "wholesale-images"
```

---

## Cost Estimation (Cloudflare)

### Free Tier Includes:
- **Workers**: 100,000 requests/day
- **Pages**: Unlimited requests
- **D1**: 5GB storage, 5M reads/day, 100K writes/day
- **R2**: 10GB storage, 1M reads/month
- **KV**: 100K reads/day, 1K writes/day

### Paid Plans (approximate):
- **Workers Paid**: $5/month + $0.50/million requests
- **D1**: $5/month for 5GB, then usage-based
- **R2**: $0.015/GB storage, operations-based pricing

---

## Success Metrics

### Technical KPIs
- Page load time < 1 second (edge computing advantage)
- API response time < 100ms (P95)
- Uptime > 99.9%
- Zero cold starts (Workers always warm at edge)

### Business KPIs
- Conversion rate (visitors to orders)
- Average order value (AOV)
- Customer acquisition cost (CAC)
- Customer lifetime value (LTV)
- Repeat purchase rate

---

## Next Steps

1. **Review & approve this roadmap**
2. **Set up FreeBSD development environment**
   ```bash
   # On FreeBSD
   pkg install node npm git
   npm install -g pnpm
   pnpm --version
   ```
3. **Create Cloudflare account & configure CLI**
   ```bash
   pnpm add -g wrangler
   wrangler login
   ```
4. **Initialize first project** (Phase 1.2)
5. **Start with Phase 1: Foundation & Setup**

---

## Resources & Documentation

### Backend & Infrastructure
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [tRPC](https://trpc.io/)

### Frontend (Web)
- [TanStack Start](https://tanstack.com/start/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Router](https://tanstack.com/router/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

### Mobile Development
- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)

### Payments
- [Xendit Documentation](https://developers.xendit.co/)
- [Xendit QRIS](https://developers.xendit.co/api-reference/qr-code/qr-code-object)
- [Xendit Virtual Accounts](https://developers.xendit.co/api-reference/virtual-account/virtual-account-object)

---

**Document Version**: 4.0
**Last Updated**: 2025-11-14
**Status**: Ready for Implementation - Option A Chosen
**Latest Addition**: Complete Phase 1 rewrite for microservices architecture from scratch (3-week foundation setup)
