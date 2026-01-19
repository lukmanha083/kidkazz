# Payment Service Implementation Plan

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase

---

## Executive Summary

This document outlines the implementation plan for the Payment Service in the Kidkazz omnichannel ERP system. The implementation is divided into 10 phases covering core infrastructure, provider integrations, refund handling, settlement, and Saga pattern coordination.

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

### Example TDD for Payment Service

```typescript
// Step 1: Write test FIRST (Red)
// test/unit/domain/payment.test.ts
describe('Payment', () => {
  describe('calculateFee', () => {
    it('should calculate Midtrans fee correctly for QRIS', () => {
      const payment = new Payment({
        amount: 100000,
        method: PaymentMethod.QRIS,
        provider: PaymentProvider.MIDTRANS
      });
      expect(payment.calculateFee()).toBe(700); // 0.7%
    });

    it('should calculate EDC fee correctly', () => {
      const payment = new Payment({
        amount: 100000,
        method: PaymentMethod.EDC,
        provider: PaymentProvider.BCA
      });
      expect(payment.calculateFee()).toBe(2000); // 2%
    });
  });

  describe('canRefund', () => {
    it('should allow refund for settled payment', () => {
      const payment = new Payment({
        status: PaymentStatus.SETTLED
      });
      expect(payment.canRefund()).toBe(true);
    });

    it('should not allow refund for pending payment', () => {
      const payment = new Payment({
        status: PaymentStatus.PENDING
      });
      expect(payment.canRefund()).toBe(false);
    });
  });
});

// Step 2: Run test - FAILS (class doesn't exist)
// Step 3: Implement Payment class
// Step 4: Run test - PASSES
// Step 5: Repeat for next test case
```

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
3. [Phase 2: Cash Payment (POS)](#phase-2-cash-payment-pos)
4. [Phase 3: Midtrans Integration](#phase-3-midtrans-integration)
5. [Phase 4: QRIS Integration](#phase-4-qris-integration)
6. [Phase 5: EDC Terminal Integration](#phase-5-edc-terminal-integration)
7. [Phase 6: Refund Processing](#phase-6-refund-processing)
8. [Phase 7: Settlement & Reconciliation](#phase-7-settlement--reconciliation)
9. [Phase 8: Paperless Receipt (sent.dm)](#phase-8-paperless-receipt-sentdm)
10. [Phase 9: Saga Pattern Integration](#phase-9-saga-pattern-integration)
11. [Phase 10: Monitoring & Alerting](#phase-10-monitoring--alerting)

---

## Implementation Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PAYMENT SERVICE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                          APPLICATION LAYER                                 │ │
│  │                                                                            │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │ │
│  │  │ ProcessPay   │ │ RefundUse    │ │ Settlement   │ │ Reconciliation   │ │ │
│  │  │ UseCase      │ │ Case         │ │ UseCase      │ │ UseCase          │ │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                            DOMAIN LAYER                                    │ │
│  │                                                                            │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │ │
│  │  │ Payment      │ │ Refund       │ │ Settlement   │ │ PaymentMethod    │ │ │
│  │  │ Aggregate    │ │ Entity       │ │ Entity       │ │ Value Objects    │ │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘ │ │
│  │                                                                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                     DOMAIN SERVICES                                  │ │ │
│  │  │  FeeCalculator | FraudDetector | PaymentValidator | ReceiptGenerator│ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                         INFRASTRUCTURE LAYER                               │ │
│  │                                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │ │
│  │  │  Midtrans   │  │    QRIS     │  │     EDC     │  │     Cash        │  │ │
│  │  │  Adapter    │  │   Adapter   │  │   Adapter   │  │    Handler      │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │ │
│  │                                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │ │
│  │  │  Payment    │  │   Event     │  │  sent.dm    │  │    Webhook      │  │ │
│  │  │  Repository │  │  Publisher  │  │  Adapter    │  │    Handler      │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Dependencies

| Service | Dependency Type | Purpose |
|---------|-----------------|---------|
| Sales Service | Inbound | Receives payment requests |
| Inventory Service | Outbound | Release reservations on expiry |
| Accounting Service | Outbound | Journal entry creation |
| Notification Service | Outbound | Receipt delivery |
| User Service | Inbound | Authentication, authorization |

### Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: D1 (SQLite)
- **Queue**: Cloudflare Queues
- **Scheduled Jobs**: Cloudflare Cron Triggers
- **External APIs**: Midtrans, sent.dm, Bank APIs

---

## Phase 1: Core Infrastructure

### Objective
Set up the foundational infrastructure for Payment Service including database schema, domain model, and basic API structure.

### Steps

#### Step 1.1: Project Setup

```bash
# Create payment service
pnpm create cloudflare@latest services/payment-service --type=worker-hono

# Install dependencies
cd services/payment-service
pnpm add hono zod drizzle-orm
pnpm add -D vitest @cloudflare/vitest-pool-workers
```

**Directory Structure**:
```
services/payment-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Payment.ts
│   │   │   ├── Refund.ts
│   │   │   └── Settlement.ts
│   │   ├── value-objects/
│   │   │   ├── PaymentMethod.ts
│   │   │   ├── PaymentStatus.ts
│   │   │   ├── Money.ts
│   │   │   └── CardInfo.ts
│   │   ├── events/
│   │   │   ├── PaymentCreated.ts
│   │   │   ├── PaymentCompleted.ts
│   │   │   └── RefundCompleted.ts
│   │   └── services/
│   │       ├── FeeCalculator.ts
│   │       ├── FraudDetector.ts
│   │       └── PaymentValidator.ts
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── ProcessPaymentUseCase.ts
│   │   │   ├── CreateRefundUseCase.ts
│   │   │   └── SettlementUseCase.ts
│   │   └── ports/
│   │       ├── PaymentGatewayPort.ts
│   │       ├── PaymentRepositoryPort.ts
│   │       └── NotificationPort.ts
│   ├── infrastructure/
│   │   ├── adapters/
│   │   │   ├── MidtransAdapter.ts
│   │   │   ├── QRISAdapter.ts
│   │   │   ├── EDCAdapter.ts
│   │   │   ├── CashHandler.ts
│   │   │   └── SentDMAdapter.ts
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   └── repository.ts
│   │   ├── http/
│   │   │   └── routes.ts
│   │   └── webhooks/
│   │       ├── MidtransWebhook.ts
│   │       └── QRISWebhook.ts
│   └── index.ts
├── migrations/
│   └── 0001_initial.sql
├── test/
│   ├── unit/
│   └── integration/
├── wrangler.toml
└── package.json
```

---

#### Step 1.2: Database Migration

**File**: `migrations/0001_initial.sql`

```sql
-- Payments table
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,

  -- Reference
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_id TEXT,

  -- Payment Details
  method TEXT NOT NULL,
  provider TEXT NOT NULL,
  channel TEXT NOT NULL,

  -- Amount
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate REAL DEFAULT 1.0,
  provider_fee REAL DEFAULT 0,
  platform_fee REAL DEFAULT 0,
  net_amount REAL NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING',

  -- Provider Data
  provider_transaction_id TEXT,
  provider_reference_number TEXT,
  provider_response TEXT,

  -- Method-Specific Data
  card_info TEXT,
  qris_info TEXT,
  bank_transfer_info TEXT,
  ewallet_info TEXT,
  cash_info TEXT,

  -- Timestamps
  initiated_at TEXT NOT NULL,
  paid_at TEXT,
  expired_at TEXT,
  settled_at TEXT,
  refunded_at TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1
);

-- Refunds table
CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  refund_number TEXT NOT NULL UNIQUE,

  payment_id TEXT NOT NULL REFERENCES payments(id),
  order_id TEXT NOT NULL,

  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,

  status TEXT NOT NULL DEFAULT 'PENDING',

  provider_refund_id TEXT,
  provider_response TEXT,

  requested_at TEXT NOT NULL,
  processed_at TEXT,
  completed_at TEXT,

  requested_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment webhooks
CREATE TABLE payment_webhooks (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT,
  is_valid INTEGER DEFAULT 1,
  processed INTEGER DEFAULT 0,
  processed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- EDC terminals
CREATE TABLE edc_terminals (
  id TEXT PRIMARY KEY,
  terminal_id TEXT NOT NULL UNIQUE,
  bank TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  pos_terminal_id TEXT,
  connection_type TEXT NOT NULL,
  connection_config TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_settlement_at TEXT,
  last_batch_number TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settlements
CREATE TABLE settlements (
  id TEXT PRIMARY KEY,
  settlement_date TEXT NOT NULL,
  provider TEXT NOT NULL,
  terminal_id TEXT,
  batch_number TEXT,

  total_transactions INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  total_fees REAL NOT NULL,
  net_amount REAL NOT NULL,

  status TEXT NOT NULL DEFAULT 'PENDING',
  settled_at TEXT,

  bank_reference TEXT,
  bank_settlement_date TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_date ON payments(paid_at);
CREATE INDEX idx_payments_number ON payments(payment_number);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_webhooks_provider ON payment_webhooks(provider, created_at);
CREATE INDEX idx_settlements_date ON settlements(settlement_date);
```

---

#### Step 1.3: Domain Model Implementation

**File**: `src/domain/entities/Payment.ts`

```typescript
import { PaymentMethod, PaymentProvider, PaymentChannel, PaymentStatus } from '../value-objects';
import { Money } from '../value-objects/Money';
import { DomainEvent } from '../events/DomainEvent';

export class Payment {
  private _id: string;
  private _paymentNumber: string;
  private _orderId: string;
  private _orderNumber: string;
  private _customerId?: string;
  private _method: PaymentMethod;
  private _provider: PaymentProvider;
  private _channel: PaymentChannel;
  private _amount: Money;
  private _providerFee: Money;
  private _platformFee: Money;
  private _netAmount: Money;
  private _status: PaymentStatus;
  private _initiatedAt: Date;
  private _paidAt?: Date;
  private _expiredAt?: Date;
  private _version: number;

  private _domainEvents: DomainEvent[] = [];

  constructor(props: PaymentProps) {
    this.validateCreate(props);

    this._id = props.id || generateId();
    this._paymentNumber = props.paymentNumber;
    this._orderId = props.orderId;
    this._orderNumber = props.orderNumber;
    this._customerId = props.customerId;
    this._method = props.method;
    this._provider = props.provider;
    this._channel = props.channel;
    this._amount = new Money(props.amount, 'IDR');
    this._providerFee = new Money(0, 'IDR');
    this._platformFee = new Money(0, 'IDR');
    this._netAmount = new Money(props.amount, 'IDR');
    this._status = PaymentStatus.PENDING;
    this._initiatedAt = new Date();
    this._version = 1;

    this.addDomainEvent(new PaymentCreated(this));
  }

  private validateCreate(props: PaymentProps): void {
    if (!props.orderId) {
      throw new DomainError('Payment must have an order');
    }
    if (props.amount <= 0) {
      throw new DomainError('Payment amount must be positive');
    }
  }

  markAsPaid(providerTransactionId: string): void {
    if (this._status !== PaymentStatus.PENDING) {
      throw new DomainError('Can only mark pending payment as paid');
    }

    this._status = PaymentStatus.PAID;
    this._paidAt = new Date();
    this._version++;

    this.addDomainEvent(new PaymentCompleted(this));
  }

  markAsFailed(reason: string): void {
    if (this._status !== PaymentStatus.PENDING) {
      throw new DomainError('Can only mark pending payment as failed');
    }

    this._status = PaymentStatus.FAILED;
    this._version++;

    this.addDomainEvent(new PaymentFailed(this, reason));
  }

  markAsExpired(): void {
    if (this._status !== PaymentStatus.PENDING) {
      throw new DomainError('Can only expire pending payment');
    }

    this._status = PaymentStatus.EXPIRED;
    this._expiredAt = new Date();
    this._version++;

    this.addDomainEvent(new PaymentExpired(this));
  }

  applyFees(providerFee: number, platformFee: number = 0): void {
    this._providerFee = new Money(providerFee, 'IDR');
    this._platformFee = new Money(platformFee, 'IDR');
    this._netAmount = this._amount.subtract(this._providerFee).subtract(this._platformFee);
  }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  // Getters
  get id(): string { return this._id; }
  get paymentNumber(): string { return this._paymentNumber; }
  get orderId(): string { return this._orderId; }
  get status(): PaymentStatus { return this._status; }
  get amount(): Money { return this._amount; }
  get netAmount(): Money { return this._netAmount; }
  get version(): number { return this._version; }
}
```

---

#### Step 1.4: Basic API Routes

**File**: `src/infrastructure/http/routes.ts`

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env }>();

// Create payment request
const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  customerId: z.string().optional(),
  amount: z.number().positive(),
  method: z.enum([
    'CASH', 'QRIS', 'DEBIT_CARD', 'CREDIT_CARD',
    'BANK_TRANSFER_BCA', 'BANK_TRANSFER_BNI', 'BANK_TRANSFER_BRI',
    'GOPAY', 'SHOPEEPAY', 'OVO', 'DANA'
  ]),
  channel: z.enum(['ONLINE', 'OFFLINE']),
  createdBy: z.string().min(1)
});

app.post('/api/payments', zValidator('json', createPaymentSchema), async (c) => {
  const body = c.req.valid('json');
  const useCase = new ProcessPaymentUseCase(c.env);
  const result = await useCase.execute(body);
  return c.json(result, 201);
});

// Get payment by ID
app.get('/api/payments/:id', async (c) => {
  const id = c.req.param('id');
  const repository = new PaymentRepository(c.env.DB);
  const payment = await repository.findById(id);

  if (!payment) {
    return c.json({ error: 'Payment not found' }, 404);
  }

  return c.json(payment);
});

// Get payments by order
app.get('/api/payments/order/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  const repository = new PaymentRepository(c.env.DB);
  const payments = await repository.findByOrderId(orderId);
  return c.json(payments);
});

// List payments with filters
app.get('/api/payments', async (c) => {
  const query = c.req.query();
  const repository = new PaymentRepository(c.env.DB);
  const payments = await repository.findAll({
    status: query.status,
    method: query.method,
    fromDate: query.fromDate,
    toDate: query.toDate,
    page: parseInt(query.page || '1'),
    limit: parseInt(query.limit || '20')
  });
  return c.json(payments);
});

// Get available payment methods
app.get('/api/payments/methods/:channel', async (c) => {
  const channel = c.req.param('channel');
  const methods = getAvailablePaymentMethods(channel);
  return c.json(methods);
});

export { app as paymentRoutes };
```

---

#### Step 1.5: Fee Calculator Service

**File**: `src/domain/services/FeeCalculator.ts`

```typescript
import { PaymentMethod, PaymentProvider } from '../value-objects';

interface FeeConfig {
  percentageFee?: number;
  flatFee?: number;
  minFee?: number;
  maxFee?: number;
}

const FEE_CONFIGURATIONS: Record<string, Record<string, FeeConfig>> = {
  MIDTRANS: {
    CREDIT_CARD: { percentageFee: 2.9, minFee: 2000 },
    CREDIT_CARD_VISA: { percentageFee: 2.9, minFee: 2000 },
    CREDIT_CARD_MASTERCARD: { percentageFee: 2.9, minFee: 2000 },
    GOPAY: { percentageFee: 2.0, minFee: 1000 },
    SHOPEEPAY: { percentageFee: 1.5, minFee: 1000 },
    OVO: { percentageFee: 1.8, minFee: 1000 },
    DANA: { percentageFee: 1.5, minFee: 1000 },
    QRIS: { percentageFee: 0.7 },
    BANK_TRANSFER_BCA: { flatFee: 4000 },
    BANK_TRANSFER_BNI: { flatFee: 4000 },
    BANK_TRANSFER_BRI: { flatFee: 4000 },
    BANK_TRANSFER_MANDIRI: { flatFee: 4000 }
  },
  QRIS_NATIONAL: {
    QRIS: { percentageFee: 0.7 }
  },
  EDC_BCA: {
    DEBIT_CARD: { percentageFee: 0.5, maxFee: 50000 },
    CREDIT_CARD: { percentageFee: 2.0 }
  },
  EDC_BRI: {
    DEBIT_CARD: { percentageFee: 0.5, maxFee: 50000 },
    CREDIT_CARD: { percentageFee: 2.0 }
  },
  INTERNAL: {
    CASH: { percentageFee: 0 }
  }
};

export class FeeCalculator {
  calculate(
    amount: number,
    method: PaymentMethod,
    provider: PaymentProvider
  ): PaymentFees {
    const providerConfig = FEE_CONFIGURATIONS[provider];
    if (!providerConfig) {
      return { providerFee: 0, platformFee: 0, netAmount: amount };
    }

    const feeConfig = providerConfig[method];
    if (!feeConfig) {
      return { providerFee: 0, platformFee: 0, netAmount: amount };
    }

    let providerFee = 0;

    // Calculate percentage fee
    if (feeConfig.percentageFee) {
      providerFee = amount * (feeConfig.percentageFee / 100);
    }

    // Apply flat fee (overrides percentage for bank transfers)
    if (feeConfig.flatFee) {
      providerFee = feeConfig.flatFee;
    }

    // Apply minimum fee
    if (feeConfig.minFee && providerFee < feeConfig.minFee) {
      providerFee = feeConfig.minFee;
    }

    // Apply maximum fee cap
    if (feeConfig.maxFee && providerFee > feeConfig.maxFee) {
      providerFee = feeConfig.maxFee;
    }

    // Round to nearest rupiah
    providerFee = Math.round(providerFee);

    return {
      providerFee,
      platformFee: 0,
      netAmount: amount - providerFee
    };
  }
}

export interface PaymentFees {
  providerFee: number;
  platformFee: number;
  netAmount: number;
}
```

---

### Deliverables Phase 1

- [ ] Project scaffolding complete
- [ ] Database migration created and tested
- [ ] Domain entities implemented (Payment, Refund, Settlement)
- [ ] Value objects implemented (PaymentMethod, PaymentStatus, Money)
- [ ] Domain events defined
- [ ] Fee calculator service
- [ ] Basic CRUD API routes
- [ ] Unit tests for domain logic

---

## Phase 2: Cash Payment (POS)

### Objective
Implement cash payment handling for POS terminals including change calculation and cash drawer integration.

### Steps

#### Step 2.1: Cash Payment Handler

**File**: `src/infrastructure/adapters/CashHandler.ts`

```typescript
export class CashHandler implements PaymentHandler {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async processPayment(request: CashPaymentRequest): Promise<CashPaymentResult> {
    const { orderId, orderNumber, amount, amountTendered, cashierId, terminalId, sessionId } = request;

    // Validate tendered amount
    if (amountTendered < amount) {
      throw new PaymentError(
        'INSUFFICIENT_AMOUNT',
        `Need ${amount}, received ${amountTendered}`
      );
    }

    const changeAmount = amountTendered - amount;

    // Generate payment number
    const paymentNumber = await generatePaymentNumber(new Date());

    // Create payment entity
    const payment = new Payment({
      paymentNumber,
      orderId,
      orderNumber,
      method: PaymentMethod.CASH,
      provider: PaymentProvider.INTERNAL,
      channel: PaymentChannel.OFFLINE,
      amount,
      createdBy: cashierId
    });

    // Mark as paid immediately (offline payment)
    payment.markAsPaid('CASH');
    payment.setCashInfo({
      amountTendered,
      changeAmount
    });

    // Save payment
    await this.repository.save(payment);

    // Publish events
    const events = payment.pullDomainEvents();
    for (const event of events) {
      await this.eventPublisher.publish(event);
    }

    // Trigger cash drawer if terminal supports it
    if (terminalId) {
      await this.openCashDrawer(terminalId);
    }

    return {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      orderId,
      amount,
      amountTendered,
      changeAmount,
      paidAt: payment.paidAt!,
      status: PaymentStatus.PAID
    };
  }

  private async openCashDrawer(terminalId: string): Promise<void> {
    // ESC/POS command to open cash drawer
    // This will be sent to the POS terminal's connected printer/drawer
    const drawerCommand = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);

    // Send via WebSocket to terminal
    await this.sendToTerminal(terminalId, {
      type: 'OPEN_DRAWER',
      command: Array.from(drawerCommand)
    });
  }

  private async sendToTerminal(terminalId: string, message: any): Promise<void> {
    // Implementation depends on POS terminal WebSocket connection
    // This is handled by the POS service
  }
}
```

---

#### Step 2.2: Cash Payment API Route

**File**: `src/infrastructure/http/routes/cash.ts`

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const cashRoutes = new Hono<{ Bindings: Env }>();

const processCashSchema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  amount: z.number().positive(),
  amountTendered: z.number().positive(),
  cashierId: z.string().min(1),
  terminalId: z.string().optional(),
  sessionId: z.string().optional()
});

cashRoutes.post('/api/payments/process/cash', zValidator('json', processCashSchema), async (c) => {
  const body = c.req.valid('json');

  const cashHandler = new CashHandler(
    new PaymentRepository(c.env.DB),
    new EventPublisher(c.env)
  );

  try {
    const result = await cashHandler.processPayment(body);
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof PaymentError) {
      return c.json({ error: error.code, message: error.message }, 400);
    }
    throw error;
  }
});

// Calculate change endpoint (for POS UI)
cashRoutes.post('/api/payments/cash/calculate-change', async (c) => {
  const { amount, tendered } = await c.req.json();

  if (tendered < amount) {
    return c.json({
      sufficient: false,
      shortage: amount - tendered
    });
  }

  return c.json({
    sufficient: true,
    change: tendered - amount
  });
});

export { cashRoutes };
```

---

### Deliverables Phase 2

- [ ] Cash payment handler
- [ ] Change calculation logic
- [ ] Cash drawer integration (ESC/POS commands)
- [ ] Cash payment API routes
- [ ] POS session cash tracking
- [ ] Unit tests

---

## Phase 3: Midtrans Integration

### Objective
Integrate Midtrans payment gateway for online payments including credit cards, bank transfers, and e-wallets.

### Steps

#### Step 3.1: Midtrans Adapter

**File**: `src/infrastructure/adapters/MidtransAdapter.ts`

```typescript
import { createHmac, createHash } from 'crypto';

interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  merchantId: string;
  isProduction: boolean;
}

export class MidtransAdapter implements PaymentGatewayAdapter {
  private readonly baseUrl: string;

  constructor(private readonly config: MidtransConfig) {
    this.baseUrl = config.isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
  }

  async createTransaction(request: CreatePaymentRequest): Promise<MidtransTransaction> {
    const payload = {
      transaction_details: {
        order_id: request.orderId,
        gross_amount: request.amount
      },
      customer_details: {
        first_name: request.customerName,
        email: request.customerEmail,
        phone: request.customerPhone
      },
      item_details: request.items?.map(item => ({
        id: item.productId,
        name: item.productName.substring(0, 50),
        price: item.unitPrice,
        quantity: item.quantity
      })),
      enabled_payments: this.mapPaymentMethods(request.allowedMethods),
      callbacks: {
        finish: request.redirectUrl
      },
      expiry: {
        unit: 'minutes',
        duration: this.getExpiryDuration(request.method)
      }
    };

    const response = await this.request('/v2/snap/transactions', 'POST', payload);

    return {
      snapToken: response.token,
      redirectUrl: response.redirect_url,
      orderId: request.orderId,
      expiresAt: new Date(Date.now() + this.getExpiryDuration(request.method) * 60 * 1000)
    };
  }

  async getTransactionStatus(orderId: string): Promise<MidtransStatus> {
    const response = await this.request(`/v2/${orderId}/status`, 'GET');

    return {
      orderId: response.order_id,
      transactionId: response.transaction_id,
      status: this.mapStatus(response.transaction_status, response.fraud_status),
      paymentType: response.payment_type,
      amount: parseFloat(response.gross_amount),
      paidAt: response.transaction_time ? new Date(response.transaction_time) : undefined
    };
  }

  async refund(transactionId: string, amount: number, reason: string): Promise<RefundResult> {
    const response = await this.request(`/v2/${transactionId}/refund`, 'POST', {
      amount,
      reason
    });

    return {
      refundId: response.refund_key,
      status: response.status_code === '200' ? 'SUCCESS' : 'FAILED',
      amount: parseFloat(response.refund_amount || amount.toString())
    };
  }

  verifySignature(notification: MidtransNotification): boolean {
    const { order_id, status_code, gross_amount, signature_key } = notification;

    const expectedSignature = createHash('sha512')
      .update(order_id + status_code + gross_amount + this.config.serverKey)
      .digest('hex');

    return signature_key === expectedSignature;
  }

  handleNotification(notification: MidtransNotification): PaymentUpdate {
    if (!this.verifySignature(notification)) {
      throw new SecurityError('INVALID_SIGNATURE', 'Midtrans signature verification failed');
    }

    const status = this.mapStatus(notification.transaction_status, notification.fraud_status);

    return {
      orderId: notification.order_id,
      transactionId: notification.transaction_id,
      status,
      method: this.mapPaymentType(notification.payment_type),
      amount: parseFloat(notification.gross_amount),
      paidAt: notification.transaction_time ? new Date(notification.transaction_time) : undefined,
      providerResponse: notification
    };
  }

  private mapStatus(transactionStatus: string, fraudStatus?: string): PaymentStatus {
    if (fraudStatus === 'deny') return PaymentStatus.FAILED;

    const statusMap: Record<string, PaymentStatus> = {
      'capture': PaymentStatus.PAID,
      'settlement': PaymentStatus.PAID,
      'pending': PaymentStatus.PENDING,
      'deny': PaymentStatus.FAILED,
      'cancel': PaymentStatus.CANCELLED,
      'expire': PaymentStatus.EXPIRED,
      'failure': PaymentStatus.FAILED,
      'refund': PaymentStatus.REFUNDED,
      'partial_refund': PaymentStatus.PARTIAL_REFUND
    };

    return statusMap[transactionStatus] || PaymentStatus.PENDING;
  }

  private mapPaymentMethods(methods?: PaymentMethod[]): string[] {
    if (!methods) return [];

    const methodMap: Record<string, string> = {
      CREDIT_CARD: 'credit_card',
      CREDIT_CARD_VISA: 'credit_card',
      CREDIT_CARD_MASTERCARD: 'credit_card',
      BANK_TRANSFER_BCA: 'bca_va',
      BANK_TRANSFER_BNI: 'bni_va',
      BANK_TRANSFER_BRI: 'bri_va',
      BANK_TRANSFER_MANDIRI: 'echannel',
      GOPAY: 'gopay',
      SHOPEEPAY: 'shopeepay',
      OVO: 'ovo',
      DANA: 'dana',
      QRIS: 'qris'
    };

    return methods.map(m => methodMap[m]).filter(Boolean);
  }

  private getExpiryDuration(method?: PaymentMethod): number {
    const expiryMap: Record<string, number> = {
      BANK_TRANSFER_BCA: 1440,
      BANK_TRANSFER_BNI: 1440,
      BANK_TRANSFER_BRI: 1440,
      GOPAY: 15,
      SHOPEEPAY: 15,
      OVO: 15,
      DANA: 15,
      QRIS: 15,
      CREDIT_CARD: 30
    };

    return expiryMap[method || ''] || 60;
  }

  private async request(path: string, method: string, body?: any): Promise<any> {
    const auth = Buffer.from(this.config.serverKey + ':').toString('base64');

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json();
      throw new PaymentError('MIDTRANS_ERROR', error.status_message || 'Midtrans request failed');
    }

    return response.json();
  }
}
```

---

#### Step 3.2: Midtrans Webhook Handler

**File**: `src/infrastructure/webhooks/MidtransWebhook.ts`

```typescript
import { Hono } from 'hono';

const midtransWebhook = new Hono<{ Bindings: Env }>();

midtransWebhook.post('/api/payments/webhooks/midtrans', async (c) => {
  const notification = await c.req.json();

  // Log webhook for debugging
  const webhookLog = {
    id: generateId(),
    provider: 'MIDTRANS',
    eventType: notification.transaction_status,
    payload: JSON.stringify(notification),
    signature: notification.signature_key,
    createdAt: new Date().toISOString()
  };

  await c.env.DB.prepare(
    `INSERT INTO payment_webhooks (id, provider, event_type, payload, signature, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    webhookLog.id,
    webhookLog.provider,
    webhookLog.eventType,
    webhookLog.payload,
    webhookLog.signature,
    webhookLog.createdAt
  ).run();

  try {
    // Process notification
    const midtrans = new MidtransAdapter({
      serverKey: c.env.MIDTRANS_SERVER_KEY,
      clientKey: c.env.MIDTRANS_CLIENT_KEY,
      merchantId: c.env.MIDTRANS_MERCHANT_ID,
      isProduction: c.env.ENVIRONMENT === 'production'
    });

    const update = midtrans.handleNotification(notification);

    // Update payment
    const repository = new PaymentRepository(c.env.DB);
    const payment = await repository.findByOrderId(update.orderId);

    if (!payment) {
      // Payment not found - could be duplicate notification
      await updateWebhookLog(c.env.DB, webhookLog.id, true, null, 'Payment not found');
      return c.json({ status: 'ok' });
    }

    // Update payment status based on notification
    if (update.status === PaymentStatus.PAID) {
      payment.markAsPaid(update.transactionId);
      payment.setProviderData(update.transactionId, notification);
    } else if (update.status === PaymentStatus.FAILED) {
      payment.markAsFailed(notification.status_message || 'Payment failed');
    } else if (update.status === PaymentStatus.EXPIRED) {
      payment.markAsExpired();
    }

    await repository.save(payment);

    // Publish domain events
    const eventPublisher = new EventPublisher(c.env);
    for (const event of payment.pullDomainEvents()) {
      await eventPublisher.publish(event);
    }

    // Mark webhook as processed
    await updateWebhookLog(c.env.DB, webhookLog.id, true, new Date().toISOString());

    return c.json({ status: 'ok' });

  } catch (error) {
    // Log error but return 200 to prevent retries for invalid data
    await updateWebhookLog(c.env.DB, webhookLog.id, false, null, error.message);

    if (error instanceof SecurityError) {
      return c.json({ status: 'ok' }); // Don't retry invalid signatures
    }

    throw error;
  }
});

async function updateWebhookLog(
  db: D1Database,
  id: string,
  processed: boolean,
  processedAt: string | null,
  errorMessage?: string
): Promise<void> {
  await db.prepare(
    `UPDATE payment_webhooks
     SET processed = ?, processed_at = ?, error_message = ?
     WHERE id = ?`
  ).bind(processed ? 1 : 0, processedAt, errorMessage || null, id).run();
}

export { midtransWebhook };
```

---

### Deliverables Phase 3

- [ ] Midtrans adapter with all payment methods
- [ ] Snap token generation
- [ ] Transaction status checking
- [ ] Webhook handler with signature verification
- [ ] Refund support
- [ ] API routes for Midtrans payments
- [ ] Integration tests with Midtrans sandbox

---

## Phase 4: QRIS Integration

### Objective
Implement QRIS payment support for both POS (dynamic QR) and online (Midtrans QRIS).

### Steps

#### Step 4.1: QRIS Adapter (POS)

**File**: `src/infrastructure/adapters/QRISAdapter.ts`

```typescript
export class QRISAdapter implements PaymentGatewayAdapter {
  constructor(private readonly config: QRISConfig) {}

  async generateQRIS(request: QRISRequest): Promise<QRISResponse> {
    // Build QR payload according to EMVCo specification
    const qrPayload = this.buildQRPayload({
      nmid: this.config.nmid,
      merchantName: this.config.merchantName,
      merchantCity: this.config.merchantCity,
      terminalId: request.terminalId,
      amount: request.amount,
      orderId: request.orderId,
      expiryMinutes: 15
    });

    // Encode QR string
    const qrString = this.encodeQRPayload(qrPayload);

    // Generate QR image (using QR code library)
    const qrImageBase64 = await this.generateQRImage(qrString);

    return {
      qrString,
      qrImageBase64,
      orderId: request.orderId,
      amount: request.amount,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      terminalId: request.terminalId
    };
  }

  async checkStatus(orderId: string): Promise<QRISStatus> {
    // Poll acquirer bank API for payment status
    const response = await this.inquiryPayment(orderId);

    return {
      orderId,
      status: this.mapStatus(response.status),
      rrn: response.rrn,
      approvalCode: response.approval_code,
      issuerBank: response.issuer_bank,
      paidAt: response.paid_at ? new Date(response.paid_at) : undefined
    };
  }

  private buildQRPayload(data: QRData): QRPayload {
    const payload: Record<string, string | Record<string, string>> = {
      // Payload Format Indicator (ID 00)
      '00': '01',
      // Point of Initiation Method (ID 01) - 12 for Dynamic
      '01': '12',
      // Merchant Account Information (ID 26)
      '26': {
        '00': 'ID.CO.QRIS.WWW',
        '01': data.nmid,
        '02': data.merchantName.substring(0, 25),
        '03': data.merchantCity
      },
      // Merchant Category Code (ID 52)
      '52': '5411',
      // Transaction Currency (ID 53) - 360 for IDR
      '53': '360',
      // Transaction Amount (ID 54)
      '54': data.amount.toString(),
      // Country Code (ID 58)
      '58': 'ID',
      // Merchant Name (ID 59)
      '59': data.merchantName.substring(0, 25),
      // Merchant City (ID 60)
      '60': data.merchantCity,
      // Additional Data (ID 62)
      '62': {
        '05': data.orderId  // Reference Label
      }
    };

    return payload;
  }

  private encodeQRPayload(payload: QRPayload): string {
    let qrString = '';

    for (const [id, value] of Object.entries(payload)) {
      if (typeof value === 'object') {
        // Nested data (like merchant account info)
        let nestedString = '';
        for (const [subId, subValue] of Object.entries(value)) {
          nestedString += subId + this.formatLength(subValue.length) + subValue;
        }
        qrString += id + this.formatLength(nestedString.length) + nestedString;
      } else {
        qrString += id + this.formatLength(value.length) + value;
      }
    }

    // Add CRC (ID 63)
    qrString += '6304';
    const crc = this.calculateCRC(qrString);
    qrString += crc;

    return qrString;
  }

  private formatLength(length: number): string {
    return length.toString().padStart(2, '0');
  }

  private calculateCRC(data: string): string {
    // CRC-16/CCITT-FALSE algorithm
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
      }
    }
    crc &= 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  private async generateQRImage(qrString: string): Promise<string> {
    // Using QR code generation library
    // Returns base64 encoded PNG
    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2
    });
  }
}
```

---

### Deliverables Phase 4

- [ ] QRIS adapter for POS (dynamic QR generation)
- [ ] EMVCo-compliant QR payload building
- [ ] QR code image generation
- [ ] Status polling mechanism
- [ ] QRIS payment API routes
- [ ] Integration with Midtrans QRIS for online

---

## Phase 5: EDC Terminal Integration

### Objective
Integrate EDC terminals (BCA, BRI, Mandiri, BNI) for debit and credit card payments at POS.

### Steps

#### Step 5.1: EDC Adapter

**File**: `src/infrastructure/adapters/EDCAdapter.ts`

```typescript
export class EDCAdapter implements PaymentGatewayAdapter {
  constructor(private readonly config: EDCConfig) {}

  async processPayment(request: EDCPaymentRequest): Promise<EDCResponse> {
    // Build ISO 8583 message
    const message = this.buildSaleMessage({
      amount: request.amount,
      orderId: request.orderId,
      terminalId: this.config.terminalId
    });

    // Send to bank host via terminal
    const response = await this.sendToTerminal(message);

    if (response.responseCode !== '00') {
      throw new PaymentError(
        `EDC_${response.responseCode}`,
        this.mapResponseCode(response.responseCode)
      );
    }

    return {
      approvalCode: response.approvalCode,
      rrn: response.rrn,
      cardType: response.cardType,
      cardBrand: this.detectCardBrand(response.pan),
      maskedCardNumber: this.maskPAN(response.pan),
      cardHolderName: response.cardHolderName,
      terminalId: this.config.terminalId,
      merchantId: this.config.merchantId,
      batchNumber: response.batchNumber,
      traceNumber: response.traceNumber,
      isPinVerified: response.pinVerified,
      isSignatureRequired: this.isSignatureRequired(request.amount, response.cardType)
    };
  }

  async voidTransaction(rrn: string, approvalCode: string): Promise<VoidResponse> {
    const message = this.buildVoidMessage({
      rrn,
      approvalCode,
      terminalId: this.config.terminalId
    });

    const response = await this.sendToTerminal(message);

    return {
      success: response.responseCode === '00',
      voidApprovalCode: response.approvalCode
    };
  }

  async settlement(): Promise<SettlementResponse> {
    const message = this.buildSettlementMessage({
      terminalId: this.config.terminalId
    });

    const response = await this.sendToTerminal(message);

    return {
      batchNumber: response.batchNumber,
      totalTransactions: response.totalCount,
      totalAmount: response.totalAmount,
      settledAt: new Date()
    };
  }

  private buildSaleMessage(data: SaleData): ISO8583Message {
    return {
      mti: '0200',
      processingCode: '000000',
      amount: data.amount,
      stan: this.generateSTAN(),
      localTime: new Date(),
      merchantType: '5411',
      posEntryMode: '051',
      posConditionCode: '00',
      terminalId: data.terminalId,
      merchantId: this.config.merchantId,
      currency: '360'
    };
  }

  private mapResponseCode(code: string): string {
    const codes: Record<string, string> = {
      '00': 'Approved',
      '01': 'Refer to card issuer',
      '03': 'Invalid merchant',
      '05': 'Do not honor',
      '12': 'Invalid transaction',
      '13': 'Invalid amount',
      '14': 'Invalid card number',
      '51': 'Insufficient funds',
      '54': 'Expired card',
      '55': 'Incorrect PIN',
      '61': 'Exceeds withdrawal limit',
      '91': 'Issuer unavailable',
      '96': 'System malfunction'
    };
    return codes[code] || 'Unknown error';
  }

  private isSignatureRequired(amount: number, cardType: string): boolean {
    const threshold = cardType === 'DEBIT' ? 1000000 : 500000;
    return amount >= threshold;
  }

  private maskPAN(pan: string): string {
    return pan.slice(0, 6) + '*'.repeat(pan.length - 10) + pan.slice(-4);
  }

  private detectCardBrand(pan: string): string {
    const firstDigit = pan[0];
    const firstTwo = pan.substring(0, 2);
    const firstFour = pan.substring(0, 4);

    if (firstDigit === '4') return 'VISA';
    if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'MASTERCARD';
    if (firstTwo === '35') return 'JCB';
    if (['34', '37'].includes(firstTwo)) return 'AMEX';
    if (firstFour === '1946') return 'GPN';
    return 'UNKNOWN';
  }
}
```

---

### Deliverables Phase 5

- [ ] EDC adapter with ISO 8583 message building
- [ ] Support for BCA, BRI, Mandiri, BNI terminals
- [ ] Card brand detection
- [ ] PAN masking for PCI compliance
- [ ] Signature requirement logic
- [ ] Void transaction support
- [ ] Settlement command

---

## Phase 6: Refund Processing

### Objective
Implement refund handling for all payment methods with approval workflow.

### Steps

#### Step 6.1: Refund Use Case

**File**: `src/application/use-cases/CreateRefundUseCase.ts`

```typescript
export class CreateRefundUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly refundRepository: RefundRepository,
    private readonly midtrans: MidtransAdapter,
    private readonly eventPublisher: EventPublisher
  ) {}

  async execute(request: CreateRefundRequest): Promise<RefundResult> {
    // Get original payment
    const payment = await this.paymentRepository.findById(request.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Validate refund time limit
    this.validateTimelimit(payment);

    // Validate refund amount
    const existingRefunds = await this.refundRepository.findByPaymentId(payment.id);
    this.validateAmount(payment, request.amount, existingRefunds);

    // Determine workflow
    const workflow = this.determineWorkflow(request.amount);

    // Create refund entity
    const refund = new Refund({
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: request.amount,
      reason: request.reason,
      notes: request.notes,
      requestedBy: request.requestedBy,
      status: workflow === 'AUTO_APPROVE' ? RefundStatus.APPROVED : RefundStatus.PENDING
    });

    await this.refundRepository.save(refund);

    // If auto-approved, process immediately
    if (refund.status === RefundStatus.APPROVED) {
      await this.processRefund(refund, payment);
    }

    return {
      refundId: refund.id,
      refundNumber: refund.refundNumber,
      status: refund.status,
      requiresApproval: workflow === 'REQUIRES_APPROVAL'
    };
  }

  private validateTimelimit(payment: Payment): void {
    const limitDays = REFUND_TIME_LIMITS[payment.method] || 0;
    const maxRefundDate = addDays(payment.paidAt!, limitDays);

    if (new Date() > maxRefundDate) {
      throw new BusinessRuleError(
        'REFUND_TIME_EXCEEDED',
        `Refund time limit exceeded. Max refund date was ${maxRefundDate}`
      );
    }
  }

  private validateAmount(payment: Payment, amount: number, existingRefunds: Refund[]): void {
    const totalRefunded = existingRefunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + r.amount, 0);

    const maxRefundable = payment.amount.value - totalRefunded;

    if (amount > maxRefundable) {
      throw new BusinessRuleError(
        'REFUND_AMOUNT_EXCEEDED',
        `Amount ${amount} exceeds refundable amount ${maxRefundable}`
      );
    }
  }

  private determineWorkflow(amount: number): 'AUTO_APPROVE' | 'REQUIRES_APPROVAL' {
    return amount >= 500000 ? 'REQUIRES_APPROVAL' : 'AUTO_APPROVE';
  }

  private async processRefund(refund: Refund, payment: Payment): Promise<void> {
    refund.markAsProcessing();

    try {
      // Process based on provider
      if (payment.provider === PaymentProvider.MIDTRANS) {
        const result = await this.midtrans.refund(
          payment.providerTransactionId!,
          refund.amount,
          refund.reason
        );
        refund.setProviderRefundId(result.refundId);
      } else if (payment.provider === PaymentProvider.INTERNAL) {
        // Cash refund - handled via POS session
        // No external API call needed
      }

      refund.markAsCompleted();
      payment.applyRefund(refund.amount);

      await this.refundRepository.save(refund);
      await this.paymentRepository.save(payment);

      // Publish events
      await this.eventPublisher.publish(new RefundCompleted(refund));

    } catch (error) {
      refund.markAsFailed(error.message);
      await this.refundRepository.save(refund);
      throw error;
    }
  }
}
```

---

### Deliverables Phase 6

- [ ] Refund entity and repository
- [ ] Refund creation use case
- [ ] Time limit validation per payment method
- [ ] Amount validation
- [ ] Approval workflow for large refunds
- [ ] Midtrans refund integration
- [ ] Cash refund handling
- [ ] EDC void support
- [ ] Refund API routes

---

## Phase 7: Settlement & Reconciliation

### Objective
Implement daily settlement for EDC terminals and reconciliation across all providers.

### Steps

#### Step 7.1: Settlement Use Case

**File**: `src/application/use-cases/SettlementUseCase.ts`

```typescript
export class SettlementUseCase {
  constructor(
    private readonly edcAdapter: EDCAdapter,
    private readonly paymentRepository: PaymentRepository,
    private readonly settlementRepository: SettlementRepository
  ) {}

  async executeEDCSettlement(terminalId: string): Promise<SettlementResult> {
    // Get terminal
    const terminal = await this.getEDCTerminal(terminalId);

    // Get unsettled transactions
    const unsettledPayments = await this.paymentRepository.findUnsettledByTerminal(terminalId);

    // Calculate system totals
    const systemTotal = unsettledPayments.reduce((sum, p) => sum + p.amount.value, 0);

    // Send settlement to terminal
    const edcResult = await this.edcAdapter.settlement();

    // Compare totals
    const discrepancy = Math.abs(systemTotal - edcResult.totalAmount);

    if (discrepancy > 100) {  // > Rp 100 variance
      await this.createDiscrepancyAlert({
        type: 'SETTLEMENT_MISMATCH',
        terminalId,
        systemAmount: systemTotal,
        terminalAmount: edcResult.totalAmount,
        difference: discrepancy
      });
    }

    // Mark payments as settled
    for (const payment of unsettledPayments) {
      payment.markAsSettled(edcResult.batchNumber);
      await this.paymentRepository.save(payment);
    }

    // Create settlement record
    const settlement = new Settlement({
      provider: terminal.bank,
      terminalId,
      batchNumber: edcResult.batchNumber,
      totalTransactions: edcResult.totalTransactions,
      totalAmount: edcResult.totalAmount,
      totalFees: this.calculateTotalFees(unsettledPayments),
      netAmount: edcResult.totalAmount - this.calculateTotalFees(unsettledPayments),
      status: 'COMPLETED',
      settledAt: new Date()
    });

    await this.settlementRepository.save(settlement);

    return {
      settlementId: settlement.id,
      batchNumber: settlement.batchNumber,
      totalTransactions: settlement.totalTransactions,
      totalAmount: settlement.totalAmount,
      netAmount: settlement.netAmount,
      discrepancy,
      hasDiscrepancy: discrepancy > 0
    };
  }
}
```

---

#### Step 7.2: Reconciliation Job

**File**: `src/infrastructure/jobs/ReconciliationJob.ts`

```typescript
export class ReconciliationJob {
  async run(date: Date): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      date,
      providers: []
    };

    // Midtrans reconciliation
    const midtransReport = await this.reconcileMidtrans(date);
    report.providers.push(midtransReport);

    // QRIS reconciliation
    const qrisReport = await this.reconcileQRIS(date);
    report.providers.push(qrisReport);

    // EDC reconciliation per terminal
    const edcTerminals = await this.getActiveEDCTerminals();
    for (const terminal of edcTerminals) {
      const edcReport = await this.reconcileEDC(terminal, date);
      report.providers.push(edcReport);
    }

    // Cash reconciliation
    const cashReport = await this.reconcileCash(date);
    report.providers.push(cashReport);

    // Identify and alert discrepancies
    const discrepancies = this.identifyDiscrepancies(report);
    if (discrepancies.length > 0) {
      await this.sendDiscrepancyAlerts(discrepancies);
    }

    // Store report
    await this.saveReconciliationReport(report);

    return report;
  }

  private async reconcileMidtrans(date: Date): Promise<ProviderReconciliation> {
    // Get system transactions
    const systemTx = await this.paymentRepository.findByProviderAndDate('MIDTRANS', date);

    // Get Midtrans settlement report (via API)
    const midtransTx = await this.midtransAdapter.getSettlementReport(date);

    // Match transactions
    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const tx of systemTx) {
      const found = midtransTx.find(m => m.order_id === tx.orderId);
      if (found) {
        matched.push(tx.orderId);
      } else {
        unmatched.push(tx.orderId);
      }
    }

    return {
      provider: 'MIDTRANS',
      systemTransactions: systemTx.length,
      systemAmount: systemTx.reduce((sum, t) => sum + t.amount.value, 0),
      providerTransactions: midtransTx.length,
      providerAmount: midtransTx.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0),
      matched: matched.length,
      unmatched: unmatched.length,
      discrepancyAmount: 0,
      discrepancies: []
    };
  }
}
```

---

### Deliverables Phase 7

- [ ] Settlement entity and repository
- [ ] EDC settlement use case
- [ ] Reconciliation job (scheduled)
- [ ] Midtrans settlement report integration
- [ ] Discrepancy detection and alerting
- [ ] Settlement API routes
- [ ] Cron trigger setup

---

## Phase 8: Paperless Receipt (sent.dm)

### Objective
Integrate sent.dm for paperless invoice and receipt delivery.

### Steps

#### Step 8.1: sent.dm Adapter

**File**: `src/infrastructure/adapters/SentDMAdapter.ts`

```typescript
export class SentDMAdapter implements NotificationAdapter {
  private readonly baseUrl = 'https://api.sent.dm/v1';

  constructor(private readonly config: SentDMConfig) {}

  async detectChannel(phoneNumber: string): Promise<MessageChannel> {
    const response = await this.request('/channels/detect', 'POST', {
      phone_number: phoneNumber,
      preferred_order: ['whatsapp', 'telegram', 'imessage', 'sms']
    });

    return response.available_channel;
  }

  async sendInvoice(request: SendInvoiceRequest): Promise<SendResult> {
    const channel = await this.detectChannel(request.phoneNumber);
    const template = this.getInvoiceTemplate(channel, request.language);

    return await this.request('/messages/send', 'POST', {
      to: request.phoneNumber,
      channel,
      template: 'invoice',
      template_data: {
        customer_name: request.customerName,
        order_number: request.orderNumber,
        items: request.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: this.formatCurrency(item.price)
        })),
        total_amount: this.formatCurrency(request.totalAmount),
        payment_method: request.paymentMethod,
        paid_at: this.formatDateTime(request.paidAt),
        invoice_url: request.invoiceUrl
      },
      attachments: request.includePDF ? [{
        type: 'document',
        url: request.invoicePdfUrl,
        filename: `Invoice-${request.orderNumber}.pdf`
      }] : []
    });
  }

  async sendPaymentConfirmation(request: PaymentConfirmationRequest): Promise<SendResult> {
    const channel = await this.detectChannel(request.phoneNumber);

    return await this.request('/messages/send', 'POST', {
      to: request.phoneNumber,
      channel,
      template: 'payment_confirmation',
      template_data: {
        customer_name: request.customerName,
        order_number: request.orderNumber,
        amount: this.formatCurrency(request.amount),
        payment_method: request.paymentMethod,
        transaction_id: request.transactionId,
        receipt_url: request.receiptUrl
      }
    });
  }

  async sendOTP(request: OTPRequest): Promise<SendResult> {
    const channel = await this.detectChannel(request.phoneNumber);

    return await this.request('/messages/send', 'POST', {
      to: request.phoneNumber,
      channel,
      template: 'otp',
      template_data: {
        otp: request.otp,
        expiry_minutes: request.expiryMinutes,
        purpose: request.purpose
      }
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(date);
  }

  private async request(path: string, method: string, body?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json();
      throw new NotificationError('SENTDM_ERROR', error.message);
    }

    return response.json();
  }
}
```

---

### Deliverables Phase 8

- [ ] sent.dm adapter
- [ ] Channel auto-detection
- [ ] Invoice template (Indonesian/English)
- [ ] Payment confirmation template
- [ ] OTP delivery
- [ ] Integration with Payment Service events
- [ ] Fallback to email/SMS

---

## Phase 9: Saga Pattern Integration

### Objective
Integrate Payment Service with Sales Order Saga pattern.

### Steps

#### Step 9.1: Payment Saga Step

**File**: `src/application/saga/PaymentSagaStep.ts`

```typescript
export class PaymentSagaStep implements SagaStep {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService
  ) {}

  // Forward action
  async execute(context: SagaContext): Promise<SagaStepResult> {
    const { orderId, orderNumber, amount, paymentMethod, customerId } = context;

    try {
      const payment = await this.paymentService.createPayment({
        orderId,
        orderNumber,
        amount,
        method: paymentMethod,
        customerId,
        createdBy: context.userId
      });

      // For offline payments, they're immediately completed
      if (payment.status === PaymentStatus.PAID) {
        return {
          success: true,
          data: {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            status: payment.status
          }
        };
      }

      // For online payments, wait for webhook
      const result = await this.waitForPayment(payment.id, context.timeout);

      return {
        success: result.status === PaymentStatus.PAID,
        data: {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          status: result.status
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Compensation action
  async compensate(context: SagaContext): Promise<void> {
    const { paymentId } = context.stepResults.payment || {};

    if (!paymentId) return;

    const payment = await this.paymentService.getPayment(paymentId);

    if (payment.status === PaymentStatus.PAID) {
      // Create automatic refund
      await this.refundService.createRefund({
        paymentId,
        amount: payment.amount.value,
        reason: RefundReason.ORDER_CANCELLED,
        notes: `Saga compensation: ${context.compensationReason}`,
        requestedBy: 'SYSTEM'
      });
    } else if (payment.status === PaymentStatus.PENDING) {
      // Cancel pending payment
      await this.paymentService.cancelPayment(paymentId);
    }
  }

  private async waitForPayment(paymentId: string, timeout: number): Promise<Payment> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const payment = await this.paymentService.getPayment(paymentId);

      if (payment.status !== PaymentStatus.PENDING) {
        return payment;
      }

      await sleep(1000);  // Poll every second
    }

    // Timeout - mark as expired
    await this.paymentService.expirePayment(paymentId);
    return await this.paymentService.getPayment(paymentId);
  }
}
```

---

### Deliverables Phase 9

- [ ] Payment Saga step implementation
- [ ] Compensation action (auto-refund)
- [ ] Payment timeout handling
- [ ] Integration with Sales Service Saga
- [ ] Event-driven compensation triggers

---

## Phase 10: Monitoring & Alerting

### Objective
Implement monitoring, alerting, and observability for Payment Service.

### Steps

#### Step 10.1: Metrics Collection

```typescript
// Payment metrics
const paymentMetrics = {
  // Counters
  paymentsCreated: new Counter('payments_created_total'),
  paymentsCompleted: new Counter('payments_completed_total'),
  paymentsFailed: new Counter('payments_failed_total'),
  refundsCreated: new Counter('refunds_created_total'),

  // Gauges
  pendingPayments: new Gauge('pending_payments_count'),

  // Histograms
  paymentProcessingTime: new Histogram('payment_processing_seconds'),
  webhookProcessingTime: new Histogram('webhook_processing_seconds')
};
```

---

#### Step 10.2: Alert Rules

```yaml
# Payment Service Alerts
alerts:
  - name: high_payment_failure_rate
    condition: payments_failed_total / payments_created_total > 0.1
    duration: 5m
    severity: critical
    message: "Payment failure rate above 10%"

  - name: webhook_processing_delay
    condition: webhook_processing_seconds_p95 > 5
    duration: 10m
    severity: warning
    message: "Webhook processing taking > 5s at p95"

  - name: settlement_discrepancy
    condition: settlement_discrepancy_amount > 100000
    severity: critical
    message: "Settlement discrepancy > Rp 100,000"

  - name: pending_payments_backlog
    condition: pending_payments_count > 100
    duration: 30m
    severity: warning
    message: "Over 100 pending payments for 30+ minutes"
```

---

### Deliverables Phase 10

- [ ] Metrics collection setup
- [ ] Alert rules configuration
- [ ] Dashboard creation
- [ ] Error tracking integration
- [ ] Audit logging
- [ ] Health check endpoints

---

## Implementation Timeline

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Core Infrastructure | None |
| 2 | Cash Payment | Phase 1 |
| 3 | Midtrans Integration | Phase 1 |
| 4 | QRIS Integration | Phase 1, 3 |
| 5 | EDC Integration | Phase 1 |
| 6 | Refund Processing | Phase 2-5 |
| 7 | Settlement & Reconciliation | Phase 5, 6 |
| 8 | Paperless Receipt | Phase 1 |
| 9 | Saga Integration | Phase 2-5 |
| 10 | Monitoring | All phases |

---

## Testing Strategy

### Unit Tests
- Domain entities (Payment, Refund, Settlement)
- Fee calculation logic
- QR code generation
- Response code mapping

### Integration Tests
- Midtrans API integration (sandbox)
- Database operations
- Webhook processing

### E2E Tests
- Complete payment flows per method
- Refund workflows
- Settlement process
- Saga compensation scenarios

---

## Related Documents

- [Payment Service Architecture](./PAYMENT_SERVICE_ARCHITECTURE.md)
- [Payment Service Business Rules](./BUSINESS_RULES.md)
- [Notification Service Architecture](../notification/NOTIFICATION_SERVICE_ARCHITECTURE.md)
- [Sales Service Architecture](../sales/SALES_SERVICE_ARCHITECTURE.md)
- [Saga Pattern Documentation](../../architecture/SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md)
- [DDD Refactoring Roadmap](../../ddd/DDD_REFACTORING_ROADMAP.md)
