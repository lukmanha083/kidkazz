# Saga Pattern & Distributed Transactions on Cloudflare Workers

**Status**: 📚 Technical Implementation Guide
**Date**: 2025-11-13
**Purpose**: Solve distributed transactions and eventual consistency with Saga pattern

---

## 🎯 Your Question: How to Handle Rollbacks?

**Scenario**: Creating an order requires:
1. ✅ Reserve inventory (might fail - out of stock)
2. ✅ Process payment (might fail - insufficient funds)
3. ✅ Create order record (might fail - database error)

**Problem**: If step 2 or 3 fails, we need to **rollback step 1** (release inventory reservation).

**Solution**: **Saga Pattern** with **Compensating Transactions**

---

## 🏗️ Saga Pattern: Two Approaches

### 1️⃣ **Orchestration-Based Saga** (Recommended)
- Central coordinator manages the workflow
- Easier to understand and debug
- Better for complex workflows
- **Implementation**: Cloudflare Workflows + Durable Objects

### 2️⃣ **Choreography-Based Saga**
- Services communicate via events
- No central coordinator
- More decoupled
- **Implementation**: Cloudflare Queues + Event Bus

---

## 🎭 Approach 1: Orchestration-Based Saga (Cloudflare Workflows)

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│          Order Saga Orchestrator (Workflow)              │
│                                                           │
│  Step 1: Reserve Inventory ────────► Inventory Service   │
│     Success? YES ✓                                       │
│                                                           │
│  Step 2: Process Payment ──────────► Payment Service     │
│     Success? NO ✗ (insufficient funds)                   │
│                                                           │
│  Compensation:                                            │
│  Step 2-rollback: Release Inventory ──► Inventory Service│
│                                                           │
│  Result: Order Failed, Inventory Released ✓              │
└──────────────────────────────────────────────────────────┘
```

### Implementation with Cloudflare Workflows

**Cloudflare Workflows** (GA since Nov 2024) provides:
- ✅ Durable execution (survives failures)
- ✅ Automatic retries
- ✅ State persistence
- ✅ Compensation logic support
- ✅ Can run for minutes, hours, or days

**1. Define Workflow (Order Saga):**

```typescript
// apps/services/order-service/src/workflows/OrderSaga.ts
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type OrderSagaParams = {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; warehouseId: string }>;
  paymentAmount: number;
};

type SagaState = {
  reservationIds: string[];
  paymentId: string | null;
  status: 'pending' | 'completed' | 'failed' | 'compensating';
};

export class OrderSaga extends WorkflowEntrypoint<Env, OrderSagaParams> {
  async run(event: WorkflowEvent<OrderSagaParams>, step: WorkflowStep) {
    const { orderId, userId, items, paymentAmount } = event.payload;

    // State to track what needs compensation
    const sagaState: SagaState = {
      reservationIds: [],
      paymentId: null,
      status: 'pending'
    };

    try {
      // ==========================================
      // STEP 1: Reserve Inventory (Multi-Warehouse)
      // ==========================================
      const reservations = await step.do('reserve-inventory', async () => {
        const reservationPromises = items.map(item =>
          this.env.INVENTORY_SERVICE.fetch('http://internal/reservations', {
            method: 'POST',
            body: JSON.stringify({
              productId: item.productId,
              quantity: item.quantity,
              warehouseId: item.warehouseId,
              orderId: orderId,
              expiresIn: 600 // 10 minutes
            })
          }).then(r => r.json())
        );

        const results = await Promise.all(reservationPromises);

        // Check if all reservations succeeded
        const allSuccess = results.every(r => r.success);
        if (!allSuccess) {
          const failedItems = results
            .filter(r => !r.success)
            .map(r => r.productId);
          throw new Error(`Inventory reservation failed for: ${failedItems.join(', ')}`);
        }

        return results.map(r => r.reservationId);
      });

      // Save reservation IDs for potential compensation
      sagaState.reservationIds = reservations;

      // ==========================================
      // STEP 2: Process Payment
      // ==========================================
      const payment = await step.do('process-payment', async () => {
        const response = await this.env.PAYMENT_SERVICE.fetch('http://internal/payments', {
          method: 'POST',
          body: JSON.stringify({
            orderId: orderId,
            userId: userId,
            amount: paymentAmount,
            idempotencyKey: `order-${orderId}` // Prevent double charging
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Payment failed: ${error.message}`);
        }

        return await response.json();
      });

      sagaState.paymentId = payment.paymentId;

      // ==========================================
      // STEP 3: Confirm Inventory (Convert Reservation to Allocation)
      // ==========================================
      await step.do('confirm-inventory', async () => {
        await Promise.all(
          sagaState.reservationIds.map(reservationId =>
            this.env.INVENTORY_SERVICE.fetch(`http://internal/reservations/${reservationId}/confirm`, {
              method: 'POST'
            })
          )
        );
      });

      // ==========================================
      // STEP 4: Create Order Record
      // ==========================================
      await step.do('create-order', async () => {
        await this.env.ORDER_SERVICE.fetch('http://internal/orders', {
          method: 'POST',
          body: JSON.stringify({
            orderId: orderId,
            userId: userId,
            items: items,
            paymentId: sagaState.paymentId,
            status: 'confirmed'
          })
        });
      });

      // ==========================================
      // STEP 5: Publish Success Event
      // ==========================================
      await step.do('publish-success-event', async () => {
        await this.env.ORDER_EVENTS_QUEUE.send({
          type: 'OrderCreated',
          orderId: orderId,
          userId: userId,
          timestamp: new Date().toISOString()
        });
      });

      sagaState.status = 'completed';
      return { success: true, orderId: orderId };

    } catch (error) {
      // ==========================================
      // COMPENSATION: Rollback All Steps
      // ==========================================
      sagaState.status = 'compensating';

      // Rollback Payment (if it was processed)
      if (sagaState.paymentId) {
        await step.do('compensate-payment', async () => {
          await this.env.PAYMENT_SERVICE.fetch(
            `http://internal/payments/${sagaState.paymentId}/refund`,
            { method: 'POST' }
          );
        });
      }

      // Release Inventory Reservations
      if (sagaState.reservationIds.length > 0) {
        await step.do('compensate-inventory', async () => {
          await Promise.all(
            sagaState.reservationIds.map(reservationId =>
              this.env.INVENTORY_SERVICE.fetch(
                `http://internal/reservations/${reservationId}/release`,
                { method: 'POST' }
              )
            )
          );
        });
      }

      // Publish Failure Event
      await step.do('publish-failure-event', async () => {
        await this.env.ORDER_EVENTS_QUEUE.send({
          type: 'OrderFailed',
          orderId: orderId,
          userId: userId,
          reason: error.message,
          timestamp: new Date().toISOString()
        });
      });

      sagaState.status = 'failed';
      return { success: false, error: error.message };
    }
  }
}
```

**2. Trigger Workflow from Order Service:**

```typescript
// apps/services/order-service/src/application/use-cases/CreateOrder.ts
export class CreateOrder {
  async execute(dto: CreateOrderDTO, env: Env): Promise<Result<OrderDTO>> {
    const orderId = generateId();

    // Start Saga Workflow
    const instance = await env.ORDER_SAGA.create({
      params: {
        orderId: orderId,
        userId: dto.userId,
        items: dto.items,
        paymentAmount: dto.totalAmount
      }
    });

    // Wait for workflow to complete (or return immediately for async)
    const result = await instance.wait();

    if (result.success) {
      return Result.ok(OrderDTO.fromId(orderId));
    } else {
      return Result.fail(new OrderCreationError(result.error));
    }
  }
}
```

**3. Configure Workflow in wrangler.toml:**

```toml
# apps/services/order-service/wrangler.toml
[[workflows]]
binding = "ORDER_SAGA"
class_name = "OrderSaga"
```

### Benefits of Workflow-Based Saga

✅ **Automatic Retries**: Each step retries on transient failures
✅ **State Persistence**: Survives Worker restarts
✅ **Visual Debugging**: See workflow state in dashboard
✅ **Idempotency**: Steps won't execute twice
✅ **Long-Running**: Can run for hours/days
✅ **Compensation Logic**: Explicit rollback steps

---

## 🎭 Approach 2: Orchestration with Durable Objects

### When to Use Durable Objects Instead of Workflows

Use Durable Objects for saga orchestration when you need:
- ✅ More complex state management (not just linear steps)
- ✅ Real-time updates (WebSocket support)
- ✅ Custom retry logic
- ✅ More control over execution

### Implementation

**1. Saga Orchestrator as Durable Object:**

```typescript
// apps/services/order-service/src/durable-objects/OrderSagaOrchestrator.ts
export class OrderSagaOrchestrator implements DurableObject {
  state: DurableObjectState;
  sql: SqlStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sql = state.storage.sql;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/start-saga') {
      return await this.startSaga(await request.json());
    }

    if (url.pathname === '/status') {
      return await this.getStatus();
    }
  }

  async startSaga(params: OrderSagaParams): Promise<Response> {
    const sagaId = params.orderId;

    // Initialize saga state
    await this.sql.exec(
      `INSERT INTO saga_state (saga_id, status, step, created_at)
       VALUES (?, 'pending', 'init', ?);`,
      sagaId,
      Date.now()
    );

    try {
      // Execute saga steps
      await this.executeStep1_ReserveInventory(params);
      await this.executeStep2_ProcessPayment(params);
      await this.executeStep3_ConfirmInventory(params);
      await this.executeStep4_CreateOrder(params);

      await this.updateStatus(sagaId, 'completed');
      return Response.json({ success: true, sagaId });

    } catch (error) {
      // Compensate (rollback)
      await this.compensate(sagaId, error.message);
      return Response.json({ success: false, error: error.message }, 400);
    }
  }

  async executeStep1_ReserveInventory(params: OrderSagaParams): Promise<void> {
    await this.updateStep(params.orderId, 'reserve-inventory');

    // Make request to Inventory Service
    const response = await fetch('http://inventory-service/reservations', {
      method: 'POST',
      body: JSON.stringify(params.items)
    });

    if (!response.ok) {
      throw new SagaStepError('Inventory reservation failed', 'reserve-inventory');
    }

    const reservations = await response.json();

    // Store for compensation
    await this.sql.exec(
      `INSERT INTO saga_data (saga_id, step, data_key, data_value)
       VALUES (?, 'reserve-inventory', 'reservationIds', ?);`,
      params.orderId,
      JSON.stringify(reservations.map(r => r.id))
    );
  }

  async executeStep2_ProcessPayment(params: OrderSagaParams): Promise<void> {
    await this.updateStep(params.orderId, 'process-payment');

    const response = await fetch('http://payment-service/payments', {
      method: 'POST',
      body: JSON.stringify({
        orderId: params.orderId,
        amount: params.paymentAmount
      })
    });

    if (!response.ok) {
      throw new SagaStepError('Payment processing failed', 'process-payment');
    }

    const payment = await response.json();

    await this.sql.exec(
      `INSERT INTO saga_data (saga_id, step, data_key, data_value)
       VALUES (?, 'process-payment', 'paymentId', ?);`,
      params.orderId,
      payment.paymentId
    );
  }

  async compensate(sagaId: string, errorMessage: string): Promise<void> {
    await this.updateStatus(sagaId, 'compensating');

    // Get all saga data for compensation
    const steps = await this.sql.exec(
      `SELECT step, data_key, data_value FROM saga_data
       WHERE saga_id = ? ORDER BY rowid DESC;`,
      sagaId
    ).toArray();

    // Execute compensation in reverse order
    for (const stepData of steps) {
      await this.executeCompensation(stepData);
    }

    await this.updateStatus(sagaId, 'failed');
    await this.sql.exec(
      `UPDATE saga_state SET error_message = ? WHERE saga_id = ?;`,
      errorMessage,
      sagaId
    );
  }

  async executeCompensation(stepData: any): Promise<void> {
    const { step, data_key, data_value } = stepData;

    if (step === 'process-payment' && data_key === 'paymentId') {
      // Refund payment
      await fetch(`http://payment-service/payments/${data_value}/refund`, {
        method: 'POST'
      });
    }

    if (step === 'reserve-inventory' && data_key === 'reservationIds') {
      // Release inventory
      const reservationIds = JSON.parse(data_value);
      await Promise.all(
        reservationIds.map(id =>
          fetch(`http://inventory-service/reservations/${id}/release`, {
            method: 'POST'
          })
        )
      );
    }
  }

  async updateStep(sagaId: string, step: string): Promise<void> {
    await this.sql.exec(
      `UPDATE saga_state SET step = ?, updated_at = ? WHERE saga_id = ?;`,
      step,
      Date.now(),
      sagaId
    );
  }

  async updateStatus(sagaId: string, status: string): Promise<void> {
    await this.sql.exec(
      `UPDATE saga_state SET status = ?, updated_at = ? WHERE saga_id = ?;`,
      status,
      Date.now(),
      sagaId
    );
  }
}

class SagaStepError extends Error {
  constructor(message: string, public step: string) {
    super(message);
    this.name = 'SagaStepError';
  }
}
```

**2. SQLite Schema for Saga State:**

```typescript
// Initialize tables in Durable Object constructor
await this.sql.exec(`
  CREATE TABLE IF NOT EXISTS saga_state (
    saga_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    step TEXT NOT NULL,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS saga_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saga_id TEXT NOT NULL,
    step TEXT NOT NULL,
    data_key TEXT NOT NULL,
    data_value TEXT NOT NULL,
    FOREIGN KEY (saga_id) REFERENCES saga_state(saga_id)
  );

  CREATE INDEX IF NOT EXISTS idx_saga_data_saga_id ON saga_data(saga_id);
`);
```

---

## 🎭 Approach 3: Choreography-Based Saga (Event-Driven)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Event-Driven Saga                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Order Service                                               │
│    │                                                         │
│    ├─ Publish: InventoryReservationRequested ─────────┐     │
│    │                                                   │     │
│    │                                             ┌─────▼────┐│
│    │                                             │Inventory ││
│    │                                             │Service   ││
│    │                                             └─────┬────┘│
│    │                                                   │     │
│    │◄─ Consume: InventoryReserved ────────────────────┘     │
│    │                                                         │
│    ├─ Publish: PaymentRequested ────────────────────┐       │
│    │                                                 │       │
│    │                                            ┌────▼─────┐ │
│    │                                            │Payment   │ │
│    │                                            │Service   │ │
│    │                                            └────┬─────┘ │
│    │                                                 │       │
│    │◄─ Consume: PaymentFailed ──────────────────────┘       │
│    │                                                         │
│    ├─ Publish: InventoryReleaseRequested ───────────┐       │
│    │                                                 │       │
│    │                                            ┌────▼─────┐ │
│    │                                            │Inventory │ │
│    │                                            │Service   │ │
│    │                                            └──────────┘ │
│    │                                                         │
│    └─ Update: Order Status = Failed                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation with Cloudflare Queues

**1. Order Service (Saga Initiator):**

```typescript
// apps/services/order-service/src/application/use-cases/CreateOrder.ts
export class CreateOrder {
  async execute(dto: CreateOrderDTO, env: Env): Promise<Result<OrderDTO>> {
    const orderId = generateId();

    // Create pending order
    await this.orderRepository.save(Order.createPending(orderId, dto));

    // Publish event to start saga
    await env.ORDER_EVENTS_QUEUE.send({
      type: 'InventoryReservationRequested',
      orderId: orderId,
      items: dto.items,
      correlationId: orderId // Track saga
    });

    return Result.ok(OrderDTO.fromId(orderId));
  }
}

// Consume events from other services
export default {
  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      const event = message.body;

      if (event.type === 'InventoryReserved') {
        // Next step: Request payment
        await env.ORDER_EVENTS_QUEUE.send({
          type: 'PaymentRequested',
          orderId: event.orderId,
          amount: event.totalAmount,
          correlationId: event.correlationId
        });
        message.ack();
      }

      if (event.type === 'PaymentCompleted') {
        // Confirm order
        await updateOrderStatus(event.orderId, 'confirmed', env);
        message.ack();
      }

      if (event.type === 'PaymentFailed') {
        // Compensate: Release inventory
        await env.ORDER_EVENTS_QUEUE.send({
          type: 'InventoryReleaseRequested',
          orderId: event.orderId,
          correlationId: event.correlationId
        });
        await updateOrderStatus(event.orderId, 'failed', env);
        message.ack();
      }

      if (event.type === 'InventoryReservationFailed') {
        // Order fails immediately
        await updateOrderStatus(event.orderId, 'failed', env);
        message.ack();
      }
    }
  }
};
```

**2. Inventory Service (Saga Participant):**

```typescript
// apps/services/inventory-service/src/index.ts
export default {
  async queue(batch: MessageBatch<InventoryEvent>, env: Env) {
    for (const message of batch.messages) {
      const event = message.body;

      if (event.type === 'InventoryReservationRequested') {
        try {
          // Reserve inventory
          const reservations = await reserveInventory(event.items, env);

          // Publish success
          await env.INVENTORY_EVENTS_QUEUE.send({
            type: 'InventoryReserved',
            orderId: event.orderId,
            reservations: reservations,
            correlationId: event.correlationId
          });
        } catch (error) {
          // Publish failure
          await env.INVENTORY_EVENTS_QUEUE.send({
            type: 'InventoryReservationFailed',
            orderId: event.orderId,
            reason: error.message,
            correlationId: event.correlationId
          });
        }
        message.ack();
      }

      if (event.type === 'InventoryReleaseRequested') {
        // Compensating transaction: Release reservation
        await releaseInventory(event.orderId, env);

        await env.INVENTORY_EVENTS_QUEUE.send({
          type: 'InventoryReleased',
          orderId: event.orderId,
          correlationId: event.correlationId
        });
        message.ack();
      }
    }
  }
};
```

**3. Payment Service (Saga Participant):**

```typescript
// apps/services/payment-service/src/index.ts
export default {
  async queue(batch: MessageBatch<PaymentEvent>, env: Env) {
    for (const message of batch.messages) {
      const event = message.body;

      if (event.type === 'PaymentRequested') {
        try {
          // Process payment via Xendit
          const payment = await processPayment(event.orderId, event.amount, env);

          // Publish success
          await env.PAYMENT_EVENTS_QUEUE.send({
            type: 'PaymentCompleted',
            orderId: event.orderId,
            paymentId: payment.id,
            correlationId: event.correlationId
          });
        } catch (error) {
          // Publish failure
          await env.PAYMENT_EVENTS_QUEUE.send({
            type: 'PaymentFailed',
            orderId: event.orderId,
            reason: error.message,
            correlationId: event.correlationId
          });
        }
        message.ack();
      }
    }
  }
};
```

### Choreography Benefits & Drawbacks

**Benefits:**
✅ Highly decoupled services
✅ No single point of failure
✅ Easy to add new services
✅ Natural event sourcing

**Drawbacks:**
❌ Harder to debug (no central view)
❌ Complex to track saga state
❌ Eventual consistency (longer to complete)
❌ Need correlation IDs to track sagas

---

## 🏭 Inventory Service with Multi-Warehouse Support

### Bounded Context: Inventory

```typescript
// apps/services/inventory-service/src/domain/entities/Inventory.ts
export class WarehouseInventory {
  private constructor(
    private readonly warehouseId: WarehouseId,
    private readonly productId: ProductId,
    private availableQuantity: number,
    private reservedQuantity: number,
    private allocatedQuantity: number
  ) {}

  reserve(quantity: number, orderId: string): Result<Reservation> {
    // Business rule: Can't reserve more than available
    if (this.availableQuantity < quantity) {
      return Result.fail(new InsufficientInventoryError(
        `Only ${this.availableQuantity} available in warehouse ${this.warehouseId}`
      ));
    }

    // Create reservation
    const reservation = Reservation.create(
      this.warehouseId,
      this.productId,
      quantity,
      orderId,
      600 // expires in 10 minutes
    );

    // Update quantities
    this.availableQuantity -= quantity;
    this.reservedQuantity += quantity;

    return Result.ok(reservation);
  }

  releaseReservation(quantity: number): Result<void> {
    this.availableQuantity += quantity;
    this.reservedQuantity -= quantity;
    return Result.ok();
  }

  confirmReservation(quantity: number): Result<void> {
    // Convert reservation to allocation
    this.reservedQuantity -= quantity;
    this.allocatedQuantity += quantity;
    return Result.ok();
  }

  getAvailableQuantity(): number {
    return this.availableQuantity;
  }
}
```

### Multi-Warehouse Allocation Strategy

```typescript
// apps/services/inventory-service/src/domain/services/WarehouseAllocationService.ts
export class WarehouseAllocationService {
  /**
   * Allocates inventory across multiple warehouses
   * Priority: 1) Nearest warehouse 2) Minimize shipments 3) Load balancing
   */
  async allocate(
    productId: ProductId,
    quantity: number,
    userLocation: Location
  ): Promise<Result<WarehouseAllocation[]>> {

    // Get all warehouses with this product
    const warehouses = await this.warehouseRepository.findByProduct(productId);

    // Sort by distance to user
    const sortedWarehouses = warehouses.sort((a, b) =>
      a.distanceTo(userLocation) - b.distanceTo(userLocation)
    );

    const allocations: WarehouseAllocation[] = [];
    let remainingQuantity = quantity;

    // Allocate from nearest warehouses first
    for (const warehouse of sortedWarehouses) {
      if (remainingQuantity === 0) break;

      const availableQty = warehouse.getAvailableQuantity(productId);
      const allocateQty = Math.min(remainingQuantity, availableQty);

      if (allocateQty > 0) {
        allocations.push({
          warehouseId: warehouse.id,
          quantity: allocateQty
        });
        remainingQuantity -= allocateQty;
      }
    }

    // Check if we could fulfill the entire order
    if (remainingQuantity > 0) {
      return Result.fail(new InsufficientInventoryError(
        `Could not allocate ${remainingQuantity} units across all warehouses`
      ));
    }

    return Result.ok(allocations);
  }
}
```

### Inventory API Endpoints

```typescript
// apps/services/inventory-service/src/infrastructure/http/InventoryController.ts
export class InventoryController {

  // Create reservation (Step 1 of Saga)
  async createReservation(c: Context): Promise<Response> {
    const dto = await c.req.json();

    // Use allocation service to determine warehouses
    const allocation = await this.allocationService.allocate(
      ProductId.create(dto.productId),
      dto.quantity,
      dto.userLocation
    );

    if (allocation.isFailure) {
      return c.json({ error: allocation.error.message }, 400);
    }

    // Create reservations across multiple warehouses
    const reservations = await Promise.all(
      allocation.value.map(async (alloc) => {
        const warehouse = await this.warehouseRepository.findById(alloc.warehouseId);
        const inventory = await warehouse.getInventory(dto.productId);

        const reservation = inventory.reserve(alloc.quantity, dto.orderId);

        if (reservation.isSuccess) {
          await this.reservationRepository.save(reservation.value);
          return reservation.value;
        }

        throw new Error(`Reservation failed for warehouse ${alloc.warehouseId}`);
      })
    );

    return c.json({
      success: true,
      reservations: reservations.map(r => ({
        reservationId: r.id,
        warehouseId: r.warehouseId,
        quantity: r.quantity,
        expiresAt: r.expiresAt
      }))
    }, 201);
  }

  // Release reservation (Compensation)
  async releaseReservation(c: Context): Promise<Response> {
    const reservationId = c.req.param('id');

    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      return c.json({ error: 'Reservation not found' }, 404);
    }

    // Release inventory back to available
    const warehouse = await this.warehouseRepository.findById(reservation.warehouseId);
    const inventory = await warehouse.getInventory(reservation.productId);

    inventory.releaseReservation(reservation.quantity);
    await this.warehouseRepository.save(warehouse);

    // Delete reservation
    await this.reservationRepository.delete(reservationId);

    return c.json({ success: true });
  }

  // Confirm reservation (Convert to allocation)
  async confirmReservation(c: Context): Promise<Response> {
    const reservationId = c.req.param('id');

    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      return c.json({ error: 'Reservation not found' }, 404);
    }

    // Convert reservation to allocation
    const warehouse = await this.warehouseRepository.findById(reservation.warehouseId);
    const inventory = await warehouse.getInventory(reservation.productId);

    inventory.confirmReservation(reservation.quantity);
    await this.warehouseRepository.save(warehouse);

    // Update reservation status
    reservation.confirm();
    await this.reservationRepository.save(reservation);

    return c.json({ success: true });
  }
}
```

---

## 📊 Comparison: Which Saga Approach?

| Aspect | Workflows | Durable Objects | Choreography |
|--------|-----------|-----------------|--------------|
| **Complexity** | Low | Medium | High |
| **Debugging** | Easy (visual) | Medium | Hard |
| **Decoupling** | Medium | Medium | High |
| **Performance** | Good | Best | Good |
| **State Management** | Automatic | Manual | Distributed |
| **Long-Running** | ✅ Excellent | ✅ Good | ❌ Complex |
| **Compensation** | ✅ Explicit | ✅ Custom | ❌ Event-based |
| **Use Case** | **Most sagas** | Complex state | High decoupling |

---

## 🎯 Recommendation for Your E-Commerce

### Start with Cloudflare Workflows (Orchestration)

**Why?**
1. ✅ **Easiest to implement** - Linear workflow with clear steps
2. ✅ **Built-in compensation** - Explicit rollback steps
3. ✅ **Production-ready** - GA since November 2024
4. ✅ **Visual debugging** - See workflow state in dashboard
5. ✅ **Best for order flows** - Perfect for reserve→pay→confirm

**When to use each:**

```
Order Creation Saga → Cloudflare Workflows ✅
  - Reserve inventory (multiple warehouses)
  - Process payment
  - Confirm inventory
  - Create order
  - Handle rollbacks

Complex State Machines → Durable Objects
  - RFQ (Request for Quote) with negotiation
  - Multi-step approval workflows
  - Real-time collaboration

Event Notifications → Choreography (Queues)
  - Send emails
  - Update analytics
  - Trigger webhooks
  - Non-critical paths
```

---

## 💰 Pricing for Saga Patterns

### Cloudflare Workflows
- **Free Tier**: 10,000 step executions/month
- **Paid**: $0.30 per million step executions
- **Example**: 100K orders/month, 5 steps each = 500K steps = $0.15/month

### Durable Objects
- **Requests**: $0.15 per million requests
- **Duration**: $12.50 per million GB-seconds
- **Example**: 100K sagas = 500K requests = $0.075/month

### Cloudflare Queues
- **Free Tier**: 1 million operations/month
- **Paid**: $0.40 per million operations
- **Example**: 100K orders, 10 events each = 1M ops = FREE

**Total Cost for 100K Orders/Month**: ~$1-2/month 🎉

---

## 🚀 Implementation Roadmap

### Phase 1: Start with Workflows (Week 1-2)
- [ ] Set up Cloudflare Workflows
- [ ] Implement Order Creation Saga
- [ ] Add compensation logic
- [ ] Test happy path and failure scenarios

### Phase 2: Build Inventory Service (Week 3-4)
- [ ] Create Inventory bounded context
- [ ] Implement multi-warehouse support
- [ ] Add reservation/release/confirm endpoints
- [ ] Integrate with Order Saga

### Phase 3: Add Payment Integration (Week 5)
- [ ] Integrate Xendit in Payment Service
- [ ] Add refund endpoint (compensation)
- [ ] Handle payment failures gracefully

### Phase 4: Monitoring & Observability (Week 6)
- [ ] Add Workflow execution logging
- [ ] Monitor compensation rates
- [ ] Alert on high saga failure rates
- [ ] Dashboard for saga analytics

---

## ❓ FAQ

### Q: What if a compensation step fails?
**A:** Implement **retry logic** with exponential backoff. Use Workflows' automatic retries or implement manual retry in Durable Objects.

### Q: How to handle timeout scenarios?
**A:** Set timeouts on reservations (e.g., 10 minutes). Use Durable Objects Alarms to auto-release expired reservations.

### Q: What about exactly-once processing?
**A:** Use **idempotency keys** in your API calls. Workflows and Durable Objects provide idempotency by default for steps.

### Q: Can I mix approaches?
**A:** **Yes!** Use Workflows for critical paths (order creation) and Choreography for non-critical (emails, analytics).

### Q: How to test sagas?
**A:** Test each service independently with mocks, then integration test the full saga with test fixtures.

---

## 🎓 Summary

### Problem Solved ✅
- ✅ Distributed transactions across services
- ✅ Automatic rollback on failures
- ✅ Multi-warehouse inventory coordination
- ✅ Payment and inventory consistency
- ✅ Eventual consistency handled gracefully

### Recommended Architecture

```
Order Service
     │
     ├─ Triggers: Cloudflare Workflow (Saga Orchestrator)
     │
     ├─ Step 1: Reserve Inventory (multi-warehouse)
     │   └─ Compensation: Release reservations
     │
     ├─ Step 2: Process Payment (Xendit)
     │   └─ Compensation: Refund payment
     │
     ├─ Step 3: Confirm Inventory
     │   └─ Compensation: N/A (already released in Step 1)
     │
     └─ Step 4: Create Order Record
         └─ Compensation: Mark order as failed
```

### Next Steps

1. Review the Workflows approach (recommended)
2. Decide which services need saga coordination
3. Implement inventory service with multi-warehouse
4. Start with one saga (Order Creation)
5. Expand to other workflows as needed

**Questions?** Let me know which approach you prefer and I can create more detailed implementation code!

---

**Status**: ✅ Complete Technical Guide
**Recommended**: Start with Cloudflare Workflows for order sagas
**Cost**: ~$1-2/month for 100K orders
