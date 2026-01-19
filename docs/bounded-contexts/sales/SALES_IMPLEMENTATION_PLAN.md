# Sales Service - Implementation Plan

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase
**Refactored From**: Order Service
**Estimated Phases**: 14 Phases

---

## Overview

This document outlines the implementation plan for refactoring the Order Service into a comprehensive Sales Service that supports multiple sales channels: ERP Dashboard, POS, Retail/Wholesale Websites, Mobile Apps, and Live Streaming.

---

## ⚠️ TDD Approach (MANDATORY)

**This project uses Test-Driven Development (TDD).** All implementation MUST follow the Red-Green-Refactor cycle:

### TDD Workflow for Each Phase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TDD IMPLEMENTATION ORDER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Write Unit Tests (test/unit/)           ← Write FIRST, should FAIL    │
│      ↓                                                                      │
│   2. Implement Domain/Application Code       ← Minimal code to pass tests  │
│      ↓                                                                      │
│   3. Write Integration Tests (test/integration/)                            │
│      ↓                                                                      │
│   4. Implement Infrastructure Code           ← Repositories, handlers      │
│      ↓                                                                      │
│   5. Write E2E Tests (test/e2e/)                                           │
│      ↓                                                                      │
│   6. Implement Routes/Controllers            ← Wire everything together    │
│      ↓                                                                      │
│   7. Refactor (keep all tests green)                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Coverage Requirements

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Domain (entities, value objects, services) | >90% | Required |
| Application (commands, queries, handlers) | >80% | Required |
| Infrastructure (repositories, controllers) | >70% | Required |

---

## Prerequisites

Before starting implementation:

1. **Product Service** - Product catalog, pricing, UOM available
2. **Inventory Service** - Stock management, reservation API ready
3. **Business Partner Service** - Customer, Employee, Auth/RBAC available
4. **Payment Service** - Payment gateway integrations ready
5. **Shipping Service** - Carrier integrations ready

---

## Implementation Phases

### Phase 1: Foundation & Core Schema
**Dependencies**: None

#### Step 1.1: Create Service Scaffold
**Deliverable**: Basic Cloudflare Worker service structure

```
services/sales-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── SalesOrder.ts
│   │   │   ├── SalesOrderItem.ts
│   │   │   ├── SalesPayment.ts
│   │   │   └── SalesShipment.ts
│   │   ├── value-objects/
│   │   │   ├── OrderNumber.ts
│   │   │   ├── OrderStatus.ts
│   │   │   ├── SalesChannel.ts
│   │   │   └── Money.ts
│   │   ├── aggregates/
│   │   │   └── SalesOrderAggregate.ts
│   │   ├── events/
│   │   │   └── SalesEvents.ts
│   │   └── repositories/
│   │       └── ISalesOrderRepository.ts
│   ├── application/
│   │   ├── use-cases/
│   │   ├── services/
│   │   └── dto/
│   ├── infrastructure/
│   │   ├── db/
│   │   │   └── schema.ts
│   │   ├── repositories/
│   │   └── http/
│   └── routes/
│       ├── orders.ts
│       ├── pos.ts
│       ├── checkout.ts
│       └── streams.ts
├── migrations/
├── test/
├── wrangler.toml
└── package.json
```

**Tasks**:
- [ ] Initialize Cloudflare Worker project
- [ ] Configure wrangler.toml with D1 bindings
- [ ] Setup TypeScript configuration
- [ ] Install dependencies (Hono, Drizzle, Zod)
- [ ] Create base route structure
- [ ] Setup Durable Objects for real-time features

---

#### Step 1.2: Database Schema - Core Tables
**Deliverable**: Migration file `0001_sales_initial.sql`

**Tasks**:
- [ ] Create `sales_orders` table
- [ ] Create `sales_order_items` table
- [ ] Create `sales_payments` table
- [ ] Create `sales_shipments` table
- [ ] Create indexes for common queries
- [ ] Define Drizzle schema
- [ ] Test migration locally

---

#### Step 1.3: Domain Layer - Core Entities
**Deliverable**: Domain entities and value objects

**Entities**:
- `SalesOrder` (Aggregate Root)
- `SalesOrderItem` (Entity)
- `SalesPayment` (Entity)
- `SalesShipment` (Entity)

**Value Objects**:
- `OrderNumber` (format validation per channel)
- `OrderStatus` (state machine)
- `SalesChannel` (enum)
- `ChannelCategory` (OFFLINE, ONLINE, OMNICHANNEL)
- `CustomerType` (RETAIL, WHOLESALE, WALK_IN)
- `Money` (amount + currency)

**Tasks**:
- [ ] Create entity classes with validation
- [ ] Create value objects
- [ ] Implement aggregate methods
- [ ] Add domain events
- [ ] Write unit tests

---

### Phase 2: Order Management Core
**Dependencies**: Phase 1

#### Step 2.1: Sales Order CRUD
**Deliverable**: Complete order management API

**Endpoints**:
```typescript
POST   /api/sales/orders                  // Create order
GET    /api/sales/orders                  // List orders
GET    /api/sales/orders/:id              // Get order
PUT    /api/sales/orders/:id              // Update order
DELETE /api/sales/orders/:id              // Delete/cancel order
```

**Use Cases**:
- `CreateSalesOrderUseCase`
- `UpdateSalesOrderUseCase`
- `GetSalesOrderUseCase`
- `ListSalesOrdersUseCase`
- `CancelSalesOrderUseCase`

**Tasks**:
- [ ] Implement repository interface
- [ ] Implement D1 repository
- [ ] Create use cases
- [ ] Create route handlers
- [ ] Add Zod validation schemas
- [ ] Write unit tests
- [ ] Write integration tests

---

#### Step 2.2: Order Items Management
**Deliverable**: Order line item operations

**Endpoints**:
```typescript
POST   /api/sales/orders/:id/items        // Add item
PUT    /api/sales/orders/:id/items/:itemId // Update item
DELETE /api/sales/orders/:id/items/:itemId // Remove item
```

**Tasks**:
- [ ] Implement item CRUD operations
- [ ] Add price calculation logic
- [ ] Add discount application logic
- [ ] Validate product availability
- [ ] Write tests

---

#### Step 2.3: Order Status Workflow
**Deliverable**: Status transition management

**State Machine**:
```typescript
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['PENDING', 'CANCELLED'],
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_PICKUP', 'SHIPPED', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: []
};
```

**Endpoints**:
```typescript
POST /api/sales/orders/:id/confirm
POST /api/sales/orders/:id/process
POST /api/sales/orders/:id/ship
POST /api/sales/orders/:id/deliver
POST /api/sales/orders/:id/complete
POST /api/sales/orders/:id/cancel
POST /api/sales/orders/:id/refund
```

**Tasks**:
- [ ] Implement state machine
- [ ] Add transition validation
- [ ] Create workflow use cases
- [ ] Add domain events for each transition
- [ ] Write workflow tests

---

### Phase 3: Saga Pattern Implementation
**Dependencies**: Phase 2

#### Step 3.1: Saga Infrastructure Setup
**Deliverable**: Cloudflare Workflows configuration for saga orchestration

**Saga Types**:
- `SalesOrderSaga` - Order creation workflow
- `POSQuickSaleSaga` - Optimized POS workflow
- `OrderFulfillmentSaga` - Shipping workflow
- `OrderCancellationSaga` - Cancellation with compensation
- `LiveStreamOrderSaga` - Live streaming order workflow

**Schema** (Migration `0002_saga_state.sql`):
```sql
-- Saga execution tracking
CREATE TABLE saga_executions (
  id TEXT PRIMARY KEY,
  saga_type TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  current_step TEXT,
  completed_steps TEXT,           -- JSON array
  failed_step TEXT,
  error_message TEXT,
  compensation_status TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saga_order ON saga_executions(order_id);
CREATE INDEX idx_saga_status ON saga_executions(status);
CREATE INDEX idx_saga_type ON saga_executions(saga_type);
```

**Tasks**:
- [ ] Configure Cloudflare Workflows in wrangler.toml
- [ ] Create saga execution tracking table
- [ ] Implement base saga class with common logic
- [ ] Add idempotency key handling
- [ ] Create saga monitoring/observability
- [ ] Write infrastructure tests

---

#### Step 3.2: Order Creation Saga
**Deliverable**: Complete order creation workflow with compensations

**Saga Flow**:
```
1. Validate Customer (Business Partner Service)
   ↓ Fail → Mark order invalid
2. Reserve Stock (Inventory Service)
   ↓ Fail → Cancel order
3. Calculate Pricing (Product Service)
   ↓ Fail → Release reservation
4. Process Payment (Payment Service)
   ↓ Fail → Release reservation
5. Deduct Stock (Inventory Service)
   ↓ Fail → Refund payment, release reservation
6. Deduct Loyalty Points (Business Partner Service)
   ↓ Fail → Restore stock, refund payment
7. Create Journal Entry (Accounting Service)
   ↓ Fail → Restore points, stock, refund
8. Award Loyalty Points (Business Partner Service)
   → Success
```

**Implementation**:
```typescript
export class SalesOrderSaga extends WorkflowEntrypoint<Env, SalesOrderSagaParams> {
  async run(event: WorkflowEvent<SalesOrderSagaParams>, step: WorkflowStep) {
    // ... saga steps with compensating transactions
  }
}
```

**Tasks**:
- [ ] Implement SalesOrderSaga workflow
- [ ] Add each step with error handling
- [ ] Implement compensating transactions
- [ ] Add timeout handling (24h for reservation)
- [ ] Write saga tests
- [ ] Test failure scenarios and rollback

---

#### Step 3.3: POS Quick Sale Saga
**Deliverable**: Optimized POS workflow (< 500ms target)

**Saga Flow** (Optimized):
```
1. Create Order + Deduct Stock (parallel, allows negative)
2. Record Payment
3. Create Journal Entry (async, non-blocking)
4. Update Session Totals
   → Success (return receipt)
```

**Characteristics**:
- No reservation step (immediate deduction)
- Allows negative stock
- Minimal compensating actions
- Async accounting entry

**Tasks**:
- [ ] Implement POSQuickSaleSaga workflow
- [ ] Optimize for < 500ms response
- [ ] Add parallel step execution
- [ ] Implement async journal entry
- [ ] Write performance tests

---

#### Step 3.4: Order Fulfillment Saga
**Deliverable**: Shipping workflow orchestration

**Saga Flow**:
```
1. Validate Order Status
2. Pick Items (FEFO strategy)
   ↓ Fail → Cancel fulfillment
3. Create Shipment (Shipping Service)
   ↓ Fail → Unpick items
4. Update Order Status (SHIPPED)
5. Notify Customer
   → Success
```

**Tasks**:
- [ ] Implement OrderFulfillmentSaga workflow
- [ ] Add FEFO picking integration
- [ ] Implement shipment creation
- [ ] Add notification step
- [ ] Write tests

---

#### Step 3.5: Order Cancellation Saga
**Deliverable**: Cancellation with full compensation

**Saga Flow**:
```
1. Validate Cancellation Allowed
2. Release Inventory Reservation (if exists)
3. Restore Stock (if deducted)
4. Process Refund (if paid)
5. Restore Loyalty Points (if used)
6. Revoke Awarded Points (if any)
7. Create Reversal Journal Entry
8. Update Order Status (CANCELLED)
9. Notify Customer
   → Success
```

**Tasks**:
- [ ] Implement OrderCancellationSaga workflow
- [ ] Add conditional compensation steps
- [ ] Implement refund processing
- [ ] Add accounting reversal
- [ ] Write tests

---

#### Step 3.6: Live Stream Order Saga
**Deliverable**: Real-time flash sale workflow

**Saga Flow**:
```
1. Validate Stream & Product
2. Claim Flash Sale Stock (with lock, 10s timeout)
   ↓ Fail → Return SOLD_OUT
3. Create Order with Stream Price
4. Process Payment (15 min timeout)
   ↓ Fail/Timeout → Release stock, cancel order
5. Confirm Stock Deduction
6. Update Stream Stats
7. Broadcast Order Notification (WebSocket)
   → Success
```

**Tasks**:
- [ ] Implement LiveStreamOrderSaga workflow
- [ ] Add stock claiming with distributed lock
- [ ] Implement 15-minute payment timeout
- [ ] Add WebSocket broadcast integration
- [ ] Write tests

---

#### Step 3.7: Saga Monitoring & Alerting
**Deliverable**: Observability for saga executions

**Monitoring**:
```typescript
interface SagaMetrics {
  sagaType: string;
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  failuresByStep: Record<string, number>;
  compensationRate: number;
}
```

**Alerts**:
- Saga failure rate > 5%
- Average duration > threshold
- Stuck sagas (running > 1 hour)
- Compensation failures

**Tasks**:
- [ ] Implement saga event logging
- [ ] Create monitoring dashboard data
- [ ] Setup alerting rules
- [ ] Add saga retry mechanism for stuck sagas
- [ ] Write monitoring tests

---

### Phase 4: Inventory Integration
**Dependencies**: Phase 3, Inventory Service

#### Step 4.1: Stock Reservation
**Deliverable**: Reserve stock on order creation

**Flow**:
```
Order Created → Call Inventory.Reserve → Update Order with Reservation ID
```

**Integration**:
```typescript
interface ReserveStockRequest {
  orderId: string;
  items: Array<{
    productId: string;
    warehouseId: string;
    quantity: number;
    uomId: string;
  }>;
  expiresAt: Date;  // Reservation timeout
}

interface ReserveStockResponse {
  reservationId: string;
  items: Array<{
    productId: string;
    reservedQuantity: number;
    batchId?: string;  // FEFO allocation
  }>;
}
```

**Tasks**:
- [ ] Create Inventory Service client
- [ ] Implement reservation on order create
- [ ] Handle reservation failures (rollback order)
- [ ] Implement reservation release on cancel
- [ ] Write integration tests

---

#### Step 3.2: Stock Deduction
**Deliverable**: Deduct stock on fulfillment

**Flow**:
```
Order Fulfilled → Call Inventory.Deduct → Release Reservation
```

**Tasks**:
- [ ] Implement deduction on fulfillment
- [ ] Handle partial fulfillment
- [ ] Implement FEFO batch selection
- [ ] Create movement records
- [ ] Write tests

---

#### Step 3.3: POS Negative Stock Handling
**Deliverable**: Allow negative stock for POS

**Special Logic**:
```typescript
if (channel === SalesChannel.POS) {
  // Allow deduction even if stock goes negative
  await inventory.posSale(items);
} else {
  // Standard validation
  await inventory.warehouseDeduct(items);
}
```

**Tasks**:
- [ ] Implement POS-specific deduction
- [ ] Create negative stock alerts
- [ ] Write tests for negative scenarios

---

### Phase 4: Payment Integration
**Dependencies**: Phase 2, Payment Service

#### Step 4.1: Payment Recording
**Deliverable**: Record payments for orders

**Endpoints**:
```typescript
POST   /api/sales/orders/:id/payments     // Add payment
GET    /api/sales/orders/:id/payments     // List payments
PUT    /api/sales/orders/:id/payments/:pid // Update payment
POST   /api/sales/orders/:id/payments/:pid/verify // Verify payment
```

**Tasks**:
- [ ] Create payment entity and repository
- [ ] Implement payment recording
- [ ] Add payment status tracking
- [ ] Handle split payments
- [ ] Write tests

---

#### Step 4.2: Payment Gateway Integration
**Deliverable**: Connect to payment providers

**Providers**:
- Midtrans (Credit Card, E-Wallet)
- BCA Direct
- BRI Direct
- CIMB Niaga Direct

**Tasks**:
- [ ] Implement Midtrans client
- [ ] Implement bank API clients
- [ ] Create webhook handlers
- [ ] Handle payment callbacks
- [ ] Write integration tests

---

#### Step 4.3: Refund Processing
**Deliverable**: Handle order refunds

**Refund Flow**:
```
Refund Request → Validate Order → Process Refund → Update Payment Status → Return Stock
```

**Tasks**:
- [ ] Implement refund use case
- [ ] Handle partial refunds
- [ ] Integrate with payment providers
- [ ] Create refund records
- [ ] Write tests

---

### Phase 5: Shipping Integration
**Dependencies**: Phase 2, Shipping Service

#### Step 5.1: Shipment Management
**Deliverable**: Manage order shipments

**Endpoints**:
```typescript
POST   /api/sales/orders/:id/shipments    // Create shipment
GET    /api/sales/orders/:id/shipments    // List shipments
PUT    /api/sales/orders/:id/shipments/:sid // Update shipment
GET    /api/sales/orders/:id/track        // Track shipment
```

**Tasks**:
- [ ] Create shipment entity and repository
- [ ] Implement shipment CRUD
- [ ] Add address validation
- [ ] Write tests

---

#### Step 5.2: Carrier Integration
**Deliverable**: Connect to shipping carriers

**Carriers**:
- Lalamove (same-day)
- J&T Express
- JNE
- SiCepat

**Tasks**:
- [ ] Implement carrier API clients
- [ ] Create shipping rate calculator
- [ ] Implement tracking integration
- [ ] Handle shipping webhooks
- [ ] Write integration tests

---

### Phase 6: ERP Dashboard Sales Order
**Dependencies**: Phase 2, 3, 4, 5

#### Step 6.1: Sales Order API (ERP)
**Deliverable**: Complete ERP sales order functionality

**Features**:
- Manual order creation
- Customer selection (registered or walk-in)
- Custom discounts (with approval)
- Payment terms (credit)
- Salesperson assignment
- Bulk import

**Endpoints**:
```typescript
POST /api/sales/erp/orders                // Create from ERP
GET  /api/sales/erp/orders                // List with filters
POST /api/sales/erp/orders/import         // Bulk import
POST /api/sales/erp/orders/:id/assign     // Assign salesperson
```

**Tasks**:
- [ ] Implement ERP-specific order creation
- [ ] Add custom discount workflow
- [ ] Implement credit terms handling
- [ ] Create salesperson assignment
- [ ] Add bulk import functionality
- [ ] Write tests

---

#### Step 6.2: Frontend Components (ERP Dashboard)
**Deliverable**: TanStack + ShadCN components

**Components**:
- Sales Order List (with filters)
- Sales Order Form
- Customer Selector
- Product Selector with pricing
- Payment Recording
- Order Status Timeline

**Tasks**:
- [ ] Create order list component
- [ ] Create order form component
- [ ] Add customer search/select
- [ ] Add product search with UOM selection
- [ ] Create payment recording UI
- [ ] Add order status tracking
- [ ] Write component tests

---

### Phase 7: POS System
**Dependencies**: Phase 2, 3, 4

#### Step 7.1: POS Schema Extension
**Deliverable**: Migration `0002_pos_schema.sql`

**Tables**:
```sql
-- POS Terminals
CREATE TABLE pos_terminals (
  id TEXT PRIMARY KEY,
  terminal_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  ...
);

-- POS Sessions
CREATE TABLE pos_sessions (
  id TEXT PRIMARY KEY,
  terminal_id TEXT NOT NULL,
  cashier_id TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  opening_cash REAL NOT NULL,
  closing_cash REAL,
  ...
);
```

**Tasks**:
- [ ] Create migration file
- [ ] Update Drizzle schema
- [ ] Create entities
- [ ] Write tests

---

#### Step 7.2: POS API
**Deliverable**: Optimized POS endpoints

**Endpoints**:
```typescript
// Terminal management
POST /api/sales/pos/terminals
GET  /api/sales/pos/terminals/:id

// Session management
POST /api/sales/pos/sessions/open
POST /api/sales/pos/sessions/close
GET  /api/sales/pos/sessions/current

// Quick sale (optimized)
POST /api/sales/pos/quick-sale
POST /api/sales/pos/scan
POST /api/sales/pos/void/:id
```

**Quick Sale Optimization**:
```typescript
// Single API call for complete sale
POST /api/sales/pos/quick-sale
{
  "terminalId": "T01",
  "items": [{ "barcode": "123", "quantity": 2 }],
  "payment": { "method": "CASH", "amount": 50000, "tendered": 100000 }
}
// Returns: order, receipt data, change amount
// Target: < 500ms response
```

**Tasks**:
- [ ] Implement terminal management
- [ ] Implement session management
- [ ] Create optimized quick sale endpoint
- [ ] Add barcode scanning API
- [ ] Implement void functionality
- [ ] Write performance tests

---

#### Step 7.3: POS Frontend Application
**Deliverable**: Touch-optimized POS web app

**Features**:
- Large touch buttons
- Barcode scanner integration
- Quick product search
- Split payment UI
- Receipt preview
- Cash drawer trigger
- Offline mode

**Technology**:
- TanStack + ShadCN
- PWA for offline capability
- IndexedDB for local storage

**Tasks**:
- [ ] Create POS layout
- [ ] Implement product grid/search
- [ ] Add cart management
- [ ] Create payment UI
- [ ] Implement receipt printing
- [ ] Add offline sync
- [ ] Write E2E tests

---

#### Step 7.4: POS Offline Sync
**Deliverable**: Offline-first architecture

**Offline Strategy**:
```typescript
// Service Worker for offline capability
// IndexedDB for transaction queue
interface OfflineTransaction {
  id: string;
  data: SalesOrder;
  createdAt: Date;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
}

// Background sync when online
async function syncOfflineTransactions() {
  const pending = await db.getAll('offline_transactions');
  for (const tx of pending) {
    await syncTransaction(tx);
  }
}
```

**Tasks**:
- [ ] Implement Service Worker
- [ ] Create IndexedDB storage
- [ ] Add transaction queue
- [ ] Implement background sync
- [ ] Handle sync conflicts
- [ ] Write offline tests

---

### Phase 8: Retail Website
**Dependencies**: Phase 2, 3, 4, 5

#### Step 8.1: Website API (Retail)
**Deliverable**: E-commerce API endpoints

**Endpoints**:
```typescript
// Cart
GET    /api/sales/cart
POST   /api/sales/cart/items
PUT    /api/sales/cart/items/:id
DELETE /api/sales/cart/items/:id
DELETE /api/sales/cart

// Checkout
POST /api/sales/checkout/validate
POST /api/sales/checkout/shipping
POST /api/sales/checkout/promo
POST /api/sales/checkout/place-order
GET  /api/sales/checkout/payment-methods

// Guest
POST /api/sales/guest/checkout
```

**Tasks**:
- [ ] Implement cart management
- [ ] Create checkout flow
- [ ] Add promo code validation
- [ ] Implement shipping calculation
- [ ] Add guest checkout
- [ ] Write tests

---

#### Step 8.2: Internationalization Setup
**Deliverable**: i18n infrastructure

**Implementation**:
```typescript
// Middleware for locale detection
export async function detectLocale(request: Request): Promise<Locale> {
  const userPref = getCookie(request, 'locale');
  if (userPref) return userPref as Locale;

  const country = request.headers.get('CF-IPCountry');
  return country === 'ID' ? 'id-ID' : 'en-US';
}

// Translation files
locales/
├── id-ID/
│   ├── common.json
│   ├── product.json
│   ├── checkout.json
│   └── order.json
└── en-US/
    ├── common.json
    ├── product.json
    ├── checkout.json
    └── order.json
```

**Tasks**:
- [ ] Create locale detection middleware
- [ ] Setup translation files
- [ ] Implement currency formatting
- [ ] Add language switcher
- [ ] Write i18n tests

---

#### Step 8.3: Retail Website Frontend
**Deliverable**: Next.js / TanStack retail website

**Pages**:
- Home page
- Product catalog
- Product detail
- Shopping cart
- Checkout
- Order tracking
- Account pages

**Tasks**:
- [ ] Setup Next.js project
- [ ] Create product catalog pages
- [ ] Implement shopping cart
- [ ] Create checkout flow
- [ ] Add order tracking
- [ ] Implement i18n
- [ ] Write E2E tests

---

### Phase 9: Wholesale Website
**Dependencies**: Phase 8

#### Step 9.1: Wholesale API Extensions
**Deliverable**: B2B-specific endpoints

**Endpoints**:
```typescript
// Verification
POST /api/sales/wholesale/register
POST /api/sales/wholesale/verify
GET  /api/sales/wholesale/status

// Wholesale features
GET  /api/sales/wholesale/pricing/:productId  // Tiered pricing
GET  /api/sales/wholesale/credit-limit
POST /api/sales/wholesale/orders              // With credit terms
```

**Tasks**:
- [ ] Implement company registration
- [ ] Create verification workflow
- [ ] Add tiered pricing API
- [ ] Implement credit limit checking
- [ ] Add MOQ validation
- [ ] Write tests

---

#### Step 9.2: Wholesale Website Frontend
**Deliverable**: B2B e-commerce website

**Features**:
- Company registration
- Document upload
- Bulk ordering
- Tiered pricing display
- Credit limit display
- Order history
- Invoice download

**Tasks**:
- [ ] Create registration flow
- [ ] Implement document upload
- [ ] Create bulk order UI
- [ ] Add pricing tiers display
- [ ] Implement invoice generation
- [ ] Write E2E tests

---

### Phase 10: Mobile Retail App (Expo)
**Dependencies**: Phase 8

#### Step 10.1: Expo Project Setup
**Deliverable**: React Native app scaffold

**Configuration**:
```json
{
  "expo": {
    "name": "Kidkazz",
    "slug": "kidkazz-retail",
    "platforms": ["android", "ios"],
    "android": {
      "package": "com.kidkazz.retail",
      "permissions": ["CAMERA", "ACCESS_FINE_LOCATION"]
    },
    "ios": {
      "bundleIdentifier": "com.kidkazz.retail",
      "infoPlist": {
        "NSCameraUsageDescription": "Scan product barcodes"
      }
    }
  }
}
```

**Tasks**:
- [ ] Initialize Expo project
- [ ] Configure EAS Build
- [ ] Setup navigation
- [ ] Add authentication
- [ ] Configure push notifications
- [ ] Setup analytics

---

#### Step 10.2: Mobile Retail Features
**Deliverable**: Core shopping features

**Features**:
- Product browsing
- Barcode scanner
- Shopping cart
- Checkout (Indonesian language)
- Order tracking
- Push notifications
- Wishlist
- Saved addresses

**Tasks**:
- [ ] Create product screens
- [ ] Implement barcode scanning
- [ ] Create cart and checkout
- [ ] Add order tracking
- [ ] Implement push notifications
- [ ] Add biometric auth
- [ ] Write tests

---

### Phase 11: Mobile Admin App (Expo)
**Dependencies**: Phase 10

#### Step 11.1: Admin App Scaffold
**Deliverable**: Staff mobile app

**Configuration**:
```json
{
  "expo": {
    "name": "Kidkazz Admin",
    "slug": "kidkazz-admin",
    "platforms": ["android"],
    "android": {
      "package": "com.kidkazz.admin",
      "permissions": [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "RECORD_AUDIO"
      ]
    }
  }
}
```

**Tasks**:
- [ ] Initialize Expo project
- [ ] Configure for Android only
- [ ] Setup staff authentication
- [ ] Add role-based navigation
- [ ] Setup offline capabilities

---

#### Step 11.2: Attendance Module
**Deliverable**: Clock in/out with verification

**Features**:
- GPS location verification
- Geofencing
- Selfie capture
- Clock in/out
- Leave requests
- Attendance history

**Implementation**:
```typescript
interface ClockInRequest {
  employeeId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  selfiePhoto: string;  // Base64
  deviceId: string;
}
```

**Tasks**:
- [ ] Create attendance screens
- [ ] Implement GPS capture
- [ ] Add geofence validation
- [ ] Implement selfie capture
- [ ] Create attendance API
- [ ] Add leave request feature
- [ ] Write tests

---

#### Step 11.3: Stock Opname Module
**Deliverable**: Inventory counting feature

**Features**:
- Barcode scanning
- Count entry
- Batch counting
- Photo evidence
- Variance calculation
- Approval workflow

**Tasks**:
- [ ] Create stock opname screens
- [ ] Implement barcode scanning
- [ ] Add count entry form
- [ ] Create batch counting
- [ ] Implement photo capture
- [ ] Add approval workflow
- [ ] Write tests

---

#### Step 11.4: Product Media Module
**Deliverable**: Photo/video upload

**Features**:
- Camera capture
- Gallery selection
- Image compression
- Video recording (max 60s)
- Background upload
- Upload queue management

**Tasks**:
- [ ] Create media capture screens
- [ ] Implement camera integration
- [ ] Add image compression
- [ ] Create video recording
- [ ] Implement background upload
- [ ] Add upload queue
- [ ] Write tests

---

### Phase 12: Live Streaming
**Dependencies**: Phase 10, 11

#### Step 12.1: Live Streaming Schema
**Deliverable**: Migration `0003_live_streaming.sql`

**Tables**:
```sql
CREATE TABLE live_streams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  host_id TEXT NOT NULL,
  stream_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  ...
);

CREATE TABLE live_stream_products (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  stream_price REAL,
  max_quantity INTEGER,
  ...
);
```

**Tasks**:
- [ ] Create migration
- [ ] Update Drizzle schema
- [ ] Create entities
- [ ] Write tests

---

#### Step 12.2: Live Streaming API
**Deliverable**: Stream management endpoints

**Endpoints**:
```typescript
// Stream management
POST   /api/sales/streams
GET    /api/sales/streams
GET    /api/sales/streams/:id
PUT    /api/sales/streams/:id
POST   /api/sales/streams/:id/start
POST   /api/sales/streams/:id/end

// Products
POST   /api/sales/streams/:id/products
PUT    /api/sales/streams/:id/products/:pid
POST   /api/sales/streams/:id/highlight/:pid

// Orders
POST   /api/sales/streams/:id/orders
GET    /api/sales/streams/:id/orders
```

**Tasks**:
- [ ] Implement stream CRUD
- [ ] Add product management
- [ ] Create flash sale logic
- [ ] Implement order placement
- [ ] Write tests

---

#### Step 12.3: Cloudflare Stream Integration
**Deliverable**: Video streaming infrastructure

**Integration**:
```typescript
// Cloudflare Stream for live video
const stream = await cf.stream.create({
  mode: 'live',
  meta: { streamId: streamId }
});

// Get RTMP credentials for broadcasting
const rtmpUrl = stream.rtmps.url;
const streamKey = stream.rtmps.streamKey;

// Get HLS URL for playback
const hlsUrl = stream.playback.hls;
```

**Tasks**:
- [ ] Configure Cloudflare Stream
- [ ] Implement stream creation
- [ ] Add RTMP ingest handling
- [ ] Create HLS playback
- [ ] Handle stream lifecycle
- [ ] Write tests

---

#### Step 12.4: Real-Time Features (WebSocket)
**Deliverable**: Live interactions

**WebSocket Events**:
```typescript
// Durable Object for stream room
export class StreamRoom implements DurableObject {
  // Viewer management
  onViewerJoin(viewerId: string)
  onViewerLeave(viewerId: string)

  // Comments
  onComment(userId: string, message: string)

  // Product events
  onProductHighlight(productId: string)
  onFlashSale(productId: string, discount: number)

  // Orders
  onOrderPlaced(order: StreamOrder)
}
```

**Tasks**:
- [ ] Create Durable Object for stream room
- [ ] Implement viewer tracking
- [ ] Add comment system
- [ ] Create product highlighting
- [ ] Implement flash sale countdown
- [ ] Add order notifications
- [ ] Write tests

---

#### Step 12.5: Live Streaming Admin UI
**Deliverable**: Admin app streaming features

**Features**:
- Stream setup
- Camera/microphone access
- RTMP broadcasting
- Product management
- Comment moderation
- Viewer stats
- Flash sale controls

**Tasks**:
- [ ] Create stream setup screen
- [ ] Implement camera preview
- [ ] Add RTMP broadcasting
- [ ] Create product highlight UI
- [ ] Add moderation tools
- [ ] Implement stats display
- [ ] Write tests

---

#### Step 12.6: Live Streaming Viewer UI
**Deliverable**: Mobile/web viewer experience

**Features**:
- HLS video player
- Real-time comments
- Product cards
- Quick purchase
- Flash sale countdown
- Share functionality

**Tasks**:
- [ ] Create video player component
- [ ] Implement comments UI
- [ ] Add product overlay
- [ ] Create quick purchase flow
- [ ] Add flash sale UI
- [ ] Implement sharing
- [ ] Write tests

---

### Phase 13: Accounting Integration
**Dependencies**: Phase 2, Accounting Service

#### Step 13.1: Journal Entry Generation
**Deliverable**: Automatic accounting entries

**Journal Entries**:
```typescript
// Sale Completed
{
  entries: [
    { account: 'Cash/Bank/AR', debit: totalAmount },
    { account: 'Sales Revenue', credit: subtotal },
    { account: 'Tax Payable', credit: taxAmount }
  ]
}

// Refund Processed
{
  entries: [
    { account: 'Sales Returns', debit: refundAmount },
    { account: 'Cash/Bank/AR', credit: refundAmount }
  ]
}
```

**Tasks**:
- [ ] Create journal entry generator
- [ ] Subscribe to order events
- [ ] Implement refund entries
- [ ] Handle partial refunds
- [ ] Write tests

---

### Phase 14: Testing & Documentation
**Dependencies**: All phases

#### Step 14.1: Comprehensive Testing
**Deliverable**: Full test coverage

**Test Types**:
- Unit tests (>80% coverage)
- Integration tests
- E2E tests (critical paths)
- Performance tests (POS < 500ms)
- Offline sync tests
- i18n tests

**Critical Test Scenarios**:
1. POS quick sale flow
2. Web checkout flow
3. Wholesale credit order
4. Live streaming purchase
5. Offline POS sync
6. Multi-language checkout

**Tasks**:
- [ ] Write remaining unit tests
- [ ] Create integration test suite
- [ ] Build E2E test scenarios
- [ ] Run performance benchmarks
- [ ] Test offline scenarios
- [ ] Fix identified issues

---

#### Step 14.2: API Documentation
**Deliverable**: OpenAPI specification

**Tasks**:
- [ ] Generate OpenAPI spec
- [ ] Add request/response examples
- [ ] Document error codes
- [ ] Create Postman collection
- [ ] Write API usage guide

---

#### Step 14.3: Deployment Documentation
**Deliverable**: Operations guides

**Documents**:
- Deployment guide
- POS setup guide
- Mobile app publishing
- Live streaming setup
- Troubleshooting guide

**Tasks**:
- [ ] Write deployment guide
- [ ] Create POS terminal setup
- [ ] Document app store submission
- [ ] Write live streaming guide
- [ ] Create troubleshooting docs

---

## Implementation Checklist Summary

### Foundation (Phase 1-2)
- [ ] Service scaffold created
- [ ] Database schema deployed
- [ ] Domain entities implemented
- [ ] Core order CRUD working

### Integrations (Phase 3-5)
- [ ] Inventory integration complete
- [ ] Payment integration complete
- [ ] Shipping integration complete

### Sales Channels (Phase 6-12)
- [ ] ERP Dashboard sales order working
- [ ] POS system functional
- [ ] POS offline mode working
- [ ] Retail website launched
- [ ] Wholesale website launched
- [ ] Mobile retail app published
- [ ] Mobile admin app published
- [ ] Live streaming functional

### Accounting (Phase 13)
- [ ] Journal entries automated
- [ ] Refunds creating reversals

### Quality (Phase 14)
- [ ] Tests passing (>80% coverage)
- [ ] Documentation complete
- [ ] Performance targets met

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| POS offline sync conflicts | High | Conflict resolution strategy, server wins for stock |
| Live streaming latency | Medium | Cloudflare Stream edge caching |
| Payment gateway failures | High | Retry logic, fallback providers |
| App store rejection | Medium | Follow guidelines, beta testing |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| User adoption of new POS | High | Training, parallel running |
| Live streaming engagement | Medium | Marketing, influencer partnerships |
| International shipping complexity | Medium | Start with limited countries |

---

## Success Metrics

### Technical Metrics
| Metric | Target |
|--------|--------|
| POS transaction time | < 500ms |
| Website page load | < 2s |
| Mobile app startup | < 3s |
| Live stream latency | < 5s |
| API uptime | 99.9% |

### Business Metrics
| Metric | Target |
|--------|--------|
| POS adoption | 100% terminals |
| Online sales increase | +30% in 6 months |
| Live streaming orders | 100+ per stream |
| Mobile app installs | 10,000 in 3 months |

---

## Related Documents

- [Sales Service Architecture](./SALES_SERVICE_ARCHITECTURE.md)
- [Sales Service Business Rules](./BUSINESS_RULES.md)
- [Inventory Service Integration](../inventory/INVENTORY_SERVICE_ARCHITECTURE.md)
- [Business Partner Service](../business-partner/BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
- [Payment Service Integration](../payment/PAYMENT_SERVICE_ARCHITECTURE.md)
- [Accounting Service](../accounting/ACCOUNTING_SERVICE_ARCHITECTURE.md)
