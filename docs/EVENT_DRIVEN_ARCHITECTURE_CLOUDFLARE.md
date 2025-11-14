# Event-Driven Architecture with Cloudflare Workers

**Status**: 📚 Technical Guide
**Date**: 2025-11-13
**Purpose**: Explain event-driven communication patterns for microservices on Cloudflare Workers

---

## 🎯 Your Questions Answered

### Q1: How to handle event-driven communication between services?
**Answer**: Cloudflare offers **3 communication patterns**:
1. **Service Bindings** (Synchronous RPC) - FREE, zero latency
2. **Cloudflare Queues** (Async messaging like Kafka/RabbitMQ)
3. **Durable Objects** (Stateful coordination + event sourcing)

### Q2: Does Cloudflare have a queue system like Kafka or RabbitMQ?
**Answer**: **YES!** **Cloudflare Queues** - globally distributed message queue with:
- Guaranteed delivery (at-least-once)
- Message batching
- Up to 5,000 messages/second throughput (as of October 2024)
- ~60ms P50 latency (improved from 200ms)
- Pay per message

### Q3: Is API Gateway free?
**Answer**: **Effectively YES** for most use cases:
- **Free Tier**: 100,000 requests/day (3M requests/month)
- **Paid Tier**: $5/month + $0.30/million requests
- **Service Bindings**: 100% FREE (requests between Workers)

---

## 🏗️ Communication Patterns Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Communication Patterns                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1️⃣ Service Bindings (RPC)      2️⃣ Cloudflare Queues          │
│     ┌──────┐  sync  ┌──────┐       ┌──────┐  async  ┌──────┐  │
│     │Worker│───────>│Worker│       │Worker│────────>│Queue │  │
│     │  A   │<───────│  B   │       │  A   │         └──┬───┘  │
│     └──────┘  FREE  └──────┘       └──────┘            │      │
│     Zero latency                                        ▼      │
│     Immediate execution                          ┌──────────┐  │
│                                                  │ Worker B │  │
│  3️⃣ Durable Objects (State)                     └──────────┘  │
│     ┌──────┐         ┌────────────┐                           │
│     │Worker│────────>│  Durable   │                           │
│     │  A   │         │  Object    │                           │
│     └──────┘         │  (State)   │                           │
│                      └────────────┘                            │
│                      Strong consistency                         │
│                      Event sourcing                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Service Bindings (Synchronous RPC)

### What is it?
**Direct, synchronous** communication between Workers. Like calling a function - not HTTP!

### Characteristics
- ✅ **Zero network latency** (library call performance ~microseconds)
- ✅ **Zero cost** (FREE since July 2024)
- ✅ **Type-safe** (TypeScript RPC interfaces)
- ✅ **Immediate response** (synchronous)
- ❌ No message queue (no retry, no buffering)
- ❌ Requires both services to be available

### When to Use
- ✅ Request/response patterns (e.g., get user info, validate payment)
- ✅ Synchronous operations (must complete immediately)
- ✅ Low complexity workflows
- ✅ Direct service-to-service calls

### Example: API Gateway → Product Service

**wrangler.toml (API Gateway):**
```toml
name = "api-gateway"

[[services]]
binding = "PRODUCT_SERVICE"
service = "product-service"

[[services]]
binding = "ORDER_SERVICE"
service = "order-service"
```

**Code (API Gateway):**
```typescript
// apps/api-gateway/src/index.ts
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Synchronous RPC call - zero latency, FREE
    if (url.pathname.startsWith('/api/products')) {
      // This is NOT an HTTP request - it's a direct function call!
      return env.PRODUCT_SERVICE.fetch(request);
    }

    if (url.pathname.startsWith('/api/orders')) {
      return env.ORDER_SERVICE.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

**Code (Product Service):**
```typescript
// apps/services/product-service/src/index.ts
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/products') {
      // Handle request
      const products = await getProducts(env.DB);
      return Response.json(products);
    }

    // Can call other services too!
    if (url.pathname === '/api/products/with-prices') {
      // Call Pricing Service (another Worker)
      const priceResponse = await env.PRICING_SERVICE.fetch(
        new Request('http://internal/prices')
      );
      const prices = await priceResponse.json();

      return Response.json({ products, prices });
    }
  }
};
```

### Pricing
**FREE** ✅ (since July 2024)
- No charge for requests between Workers via Service Bindings
- Only pay for CPU time used in each Worker

---

## 2️⃣ Cloudflare Queues (Asynchronous Messaging)

### What is it?
**Message queue** like Kafka or RabbitMQ - but serverless and global!

### Characteristics
- ✅ **Guaranteed delivery** (at-least-once)
- ✅ **Decouples services** (producer doesn't wait for consumer)
- ✅ **Message batching** (process multiple messages at once)
- ✅ **Retry logic** (automatic retries on failure)
- ✅ **High throughput** (5,000 msgs/sec per Queue)
- ✅ **Low latency** (~60ms P50 as of Oct 2024)
- ❌ Not free (pay per message)
- ❌ At-least-once delivery (not exactly-once)

### When to Use
- ✅ **Event-driven architecture** (publish events, subscribe to events)
- ✅ **Async processing** (send email, generate PDF, etc.)
- ✅ **Load leveling** (buffer requests during traffic spikes)
- ✅ **Background jobs** (cleanup, aggregation, reports)
- ✅ **Decoupling services** (producer doesn't need to know about consumers)
- ✅ **Domain events** (OrderCreated, PaymentCompleted, etc.)

### Example: Order Service → Payment Service

**Scenario**: When an order is created, send a message to process payment asynchronously.

**1. Create Queue:**
```toml
# wrangler.toml (Order Service)
[[queues.producers]]
queue = "order-events"
binding = "ORDER_EVENTS_QUEUE"

# wrangler.toml (Payment Service)
[[queues.consumers]]
queue = "order-events"
max_batch_size = 10        # Process up to 10 messages at once
max_batch_timeout = 5      # Wait max 5 seconds to fill batch
max_retries = 3            # Retry failed messages 3 times
dead_letter_queue = "order-events-dlq"  # Failed messages go here
```

**2. Produce Message (Order Service):**
```typescript
// apps/services/order-service/src/application/use-cases/CreateOrder.ts
export class CreateOrder {
  async execute(dto: CreateOrderDTO): Promise<Result<OrderDTO>> {
    // 1. Create order in database
    const order = await this.orderRepository.save(orderEntity);

    // 2. Publish event to Queue (async)
    await this.env.ORDER_EVENTS_QUEUE.send({
      type: 'OrderCreated',
      orderId: order.id,
      userId: order.userId,
      totalAmount: order.totalAmount,
      timestamp: new Date().toISOString()
    });

    // 3. Return immediately (don't wait for payment processing)
    return Result.ok(OrderDTO.fromDomain(order));
  }
}
```

**3. Consume Message (Payment Service):**
```typescript
// apps/services/payment-service/src/index.ts
export default {
  async queue(batch: MessageBatch<OrderEvent>, env: Env) {
    // Process messages in batch
    for (const message of batch.messages) {
      const event = message.body;

      try {
        if (event.type === 'OrderCreated') {
          // Process payment asynchronously
          await processPayment(event.orderId, event.totalAmount, env);

          // Acknowledge message (remove from queue)
          message.ack();
        }
      } catch (error) {
        console.error('Payment processing failed:', error);
        // Message will be retried (max_retries = 3)
        message.retry();
      }
    }
  }
};
```

### Queue Pricing
- **Free Tier**: 1 million operations/month
- **Paid**: $0.40 per million operations
- **Operation**: Each send, receive, or delete counts as 1 operation
- **Example**: 10M messages/month = $4

**Cost Comparison**:
- AWS SQS: ~$0.40/million requests (similar)
- RabbitMQ on EC2: $50-200/month + maintenance
- Kafka on EC2: $100-500/month + ops team

Cloudflare Queues is **much cheaper** and **zero maintenance**!

---

## 3️⃣ Durable Objects (Stateful Coordination)

### What is it?
**Stateful Workers** with strong consistency guarantees. Like actors in Akka/Orleans.

### Characteristics
- ✅ **Strong consistency** (single instance per ID)
- ✅ **Low-latency storage** (SQLite in same thread)
- ✅ **WebSocket support** (real-time communication)
- ✅ **Global uniqueness** (only one instance with given ID)
- ✅ **Perfect for event sourcing** (store events, replay state)
- ✅ **Transactional storage** (ACID guarantees)
- ❌ Not free (pay per request + storage)
- ❌ More complex than Queues

### When to Use
- ✅ **Event Sourcing** (store all events, rebuild state)
- ✅ **Aggregate Roots** (DDD - Product aggregate, Order aggregate)
- ✅ **Real-time collaboration** (chat, multiplayer games)
- ✅ **Coordination** (distributed locks, leader election)
- ✅ **Stateful workflows** (complex multi-step processes)
- ✅ **Per-entity state** (each user, each order has own Durable Object)

### Example: Event Sourcing for Order Aggregate

**Scenario**: Store all order events (created, paid, shipped) and rebuild order state.

**1. Define Durable Object:**
```typescript
// apps/services/order-service/src/infrastructure/durable-objects/OrderAggregate.ts
export class OrderAggregate implements DurableObject {
  state: DurableObjectState;
  sql: SqlStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sql = state.storage.sql;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/append-event') {
      // Event Sourcing: Append event to event store
      const event = await request.json();

      await this.sql.exec(
        `INSERT INTO events (event_type, payload, timestamp)
         VALUES (?, ?, ?);`,
        event.type,
        JSON.stringify(event.data),
        Date.now()
      );

      return Response.json({ success: true });
    }

    if (url.pathname === '/get-state') {
      // Rebuild state from events
      const events = await this.sql.exec(
        `SELECT * FROM events ORDER BY timestamp ASC;`
      ).toArray();

      const currentState = this.replayEvents(events);
      return Response.json(currentState);
    }
  }

  private replayEvents(events: Event[]): OrderState {
    let state = { status: 'draft', items: [], totalAmount: 0 };

    for (const event of events) {
      switch (event.event_type) {
        case 'OrderCreated':
          state = { ...state, ...event.payload };
          break;
        case 'OrderPaid':
          state.status = 'paid';
          break;
        case 'OrderShipped':
          state.status = 'shipped';
          break;
      }
    }

    return state;
  }
}
```

**2. Use Durable Object from Worker:**
```typescript
// apps/services/order-service/src/index.ts
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === '/orders/123/events') {
      // Get Durable Object instance for this order
      const orderId = env.ORDER_AGGREGATE.idFromName('order-123');
      const orderStub = env.ORDER_AGGREGATE.get(orderId);

      // Append event
      await orderStub.fetch('http://internal/append-event', {
        method: 'POST',
        body: JSON.stringify({
          type: 'OrderPaid',
          data: { paidAt: Date.now() }
        })
      });

      return Response.json({ success: true });
    }
  }
};

export { OrderAggregate };
```

**3. Configure in wrangler.toml:**
```toml
[[durable_objects.bindings]]
name = "ORDER_AGGREGATE"
class_name = "OrderAggregate"
script_name = "order-service"

[[migrations]]
tag = "v1"
new_classes = ["OrderAggregate"]
```

### Durable Objects Pricing
- **Free Tier**: None (always paid)
- **Requests**: $0.15 per million requests
- **Duration**: $12.50 per million GB-seconds
- **Storage**: $0.20 per GB-month
- **Example**: 1M requests + 1GB storage = $0.15 + $0.20 = $0.35/month

**Much cheaper than running your own database!**

---

## 📊 Comparison: When to Use Each

| Pattern | Latency | Cost | Use Case | Complexity |
|---------|---------|------|----------|------------|
| **Service Bindings** | ~microseconds | **FREE** ✅ | Sync request/response | Low |
| **Cloudflare Queues** | ~60ms | $0.40/M ops | Async events, background jobs | Medium |
| **Durable Objects** | <10ms | $0.15/M reqs | Stateful, event sourcing, coordination | High |

### Decision Tree

```
Do you need synchronous response?
├─ YES → Service Bindings (FREE)
└─ NO → Is it event-driven?
    ├─ YES → Need state persistence?
    │   ├─ YES → Durable Objects (event sourcing)
    │   └─ NO → Cloudflare Queues (async messaging)
    └─ NO → Background job?
        └─ YES → Cloudflare Queues
```

---

## 🎯 Recommended Architecture for Your E-Commerce

### Hybrid Approach (Best of All Worlds)

```
┌──────────────────────────────────────────────────────────────────┐
│                        API Gateway Worker                         │
│                   (Service Bindings - FREE RPC)                   │
└────────────────────┬─────────────────────────────────────────────┘
                     │ Service Bindings (sync, FREE)
     ┌───────────────┼──────────────┬────────────────┬─────────────┐
     │               │              │                │             │
┌────▼─────┐   ┌────▼──────┐  ┌───▼──────┐   ┌────▼──────┐  ┌───▼────┐
│ Product  │   │   Order   │  │ Payment  │   │   User    │  │ Quote  │
│ Service  │   │  Service  │  │ Service  │   │  Service  │  │Service │
└────┬─────┘   └────┬──────┘  └───┬──────┘   └───────────┘  └────────┘
     │              │             │
     │  Publish     │  Publish    │  Publish
     │  Events      │  Events     │  Events
     ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Queues                              │
│           (Async Event Distribution - $0.40/M ops)               │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐         │
│  │ order-events│  │product-events│  │ payment-events │         │
│  └─────────────┘  └──────────────┘  └────────────────┘         │
└───────┬───────────────┬────────────────────┬───────────────────┘
        │               │                    │
   ┌────▼────┐     ┌───▼─────┐         ┌────▼─────┐
   │Email    │     │Analytics│         │Inventory │
   │Worker   │     │Worker   │         │Worker    │
   └─────────┘     └─────────┘         └──────────┘

   Optional: Durable Objects for Event Sourcing
   ┌──────────────────────────────────────────┐
   │    Order Aggregate (Durable Object)      │
   │  ┌────────┐  ┌────────┐  ┌────────┐    │
   │  │Order-1 │  │Order-2 │  │Order-3 │    │
   │  │Events  │  │Events  │  │Events  │    │
   │  └────────┘  └────────┘  └────────┘    │
   │      Event Store (SQLite)               │
   └──────────────────────────────────────────┘
```

### Communication Patterns by Use Case

**1. Synchronous Operations (Service Bindings - FREE):**
```typescript
// User makes request → API Gateway → Product Service
// Response needed immediately
GET /api/products/123
├─ API Gateway (Service Binding) → Product Service
└─ Response: Product details
```

**2. Asynchronous Events (Cloudflare Queues - $0.40/M):**
```typescript
// Order created → Publish event → Multiple consumers process it
POST /api/orders
├─ Order Service creates order
├─ Publish OrderCreated to Queue
│   ├─ Payment Service: Process payment
│   ├─ Email Service: Send confirmation email
│   ├─ Inventory Service: Update stock
│   └─ Analytics Service: Track sale
└─ Response: Order created (doesn't wait for consumers)
```

**3. Event Sourcing (Durable Objects - $0.15/M):**
```typescript
// Complex order lifecycle with full audit trail
Order Aggregate Durable Object:
├─ Event 1: OrderCreated
├─ Event 2: ItemAdded
├─ Event 3: ItemRemoved
├─ Event 4: OrderPaid
├─ Event 5: OrderShipped
└─ Replay events → Current state

// Benefits:
// - Full audit trail
// - Time travel (see order at any point)
// - Rebuild state from events
// - Strong consistency per order
```

---

## 💰 API Gateway Pricing (Is it Free?)

### Short Answer: **YES, effectively free for most use cases!**

### Detailed Breakdown:

**Free Tier (Per Day):**
- 100,000 requests/day
- = 3 million requests/month
- = FREE for small to medium apps

**Paid Tier:**
- $5/month base
- + $0.30 per million requests
- 10 million requests included
- Example: 50M requests/month = $5 + (40M × $0.30) = $17/month

**Service Bindings (Worker-to-Worker):**
- **100% FREE** ✅ (since July 2024)
- No limit on requests between Workers
- Only pay for CPU time

### Cost Example for Your E-Commerce:

**Scenario**: 100,000 orders/month

```
External Requests:
- Frontend → API Gateway: 500,000 requests
  - Cost: FREE (within 3M/month limit)

Internal Communication (Service Bindings):
- API Gateway → Product Service: 200,000 requests → FREE
- API Gateway → Order Service: 100,000 requests → FREE
- Order Service → Payment Service: 100,000 requests → FREE
- Total internal: 400,000 requests → FREE

Queue Messages (Async Events):
- Order events: 100,000 messages
- Email events: 100,000 messages
- Total: 200,000 messages → FREE (within 1M/month limit)

Total Cost: $0/month ✅
```

**Even on paid plan**: $5/month gets you 10M requests + unlimited internal communication!

---

## 🚀 Implementation Roadmap

### Phase 1: Service Bindings Only (Simplest)
- ✅ Use Service Bindings for all communication
- ✅ Keep synchronous architecture
- ✅ 100% FREE
- ✅ Easy to implement

**Good for**: MVP, proof of concept, low traffic

### Phase 2: Add Cloudflare Queues (Scalable)
- ✅ Keep Service Bindings for sync operations
- ✅ Add Queues for async events (email, notifications, analytics)
- ✅ Decouple services
- ✅ Better fault tolerance

**Good for**: Production apps with moderate traffic

### Phase 3: Add Durable Objects (Advanced)
- ✅ Service Bindings for sync
- ✅ Queues for async
- ✅ Durable Objects for event sourcing
- ✅ Full audit trail
- ✅ CQRS pattern

**Good for**: Enterprise apps, compliance requirements, complex workflows

---

## 📋 Recommended Implementation for Your Project

### Start with Phase 1: Service Bindings Only

**Why?**
- FREE ✅
- Simple to implement
- Zero latency
- Proves the microservices pattern works

**Implementation:**
```typescript
// API Gateway
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // All FREE, zero-latency RPC calls
    if (url.pathname.startsWith('/api/products')) {
      return env.PRODUCT_SERVICE.fetch(request);
    }
    if (url.pathname.startsWith('/api/orders')) {
      return env.ORDER_SERVICE.fetch(request);
    }
    if (url.pathname.startsWith('/api/payments')) {
      return env.PAYMENT_SERVICE.fetch(request);
    }
  }
};
```

### Move to Phase 2: Add Queues (When Needed)

**Add Queues for:**
1. **Email notifications** (async, don't block response)
2. **Analytics events** (fire-and-forget)
3. **Inventory updates** (eventual consistency)
4. **Background jobs** (reports, cleanup)

**Example:**
```typescript
// Order Service - publish event after order created
await env.ORDER_EVENTS_QUEUE.send({
  type: 'OrderCreated',
  orderId: order.id,
  userId: user.id,
  amount: order.total
});

// Email Service - consume events
export default {
  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      if (message.body.type === 'OrderCreated') {
        await sendEmail(message.body.userId, 'Order Confirmation');
        message.ack();
      }
    }
  }
};
```

### Move to Phase 3: Add Durable Objects (Optional)

**Add Durable Objects for:**
- Event sourcing (full audit trail)
- Complex aggregates (Order, Quote with many state transitions)
- Real-time features (WebSocket chat support)

---

## 🎓 Learning Resources

### Cloudflare Documentation
- [Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)

### Blog Posts
- [Introducing Worker Services (Service Bindings)](https://blog.cloudflare.com/introducing-worker-services/)
- [Cloudflare Queues: globally distributed queues](https://blog.cloudflare.com/introducing-cloudflare-queues/)
- [Durable Objects aren't just durable, they're fast](https://blog.cloudflare.com/how-we-built-cloudflare-queues/)
- [New Workers pricing (July 2024)](https://blog.cloudflare.com/workers-pricing-scale-to-zero/)

### Tutorials
- [Use Queues with Durable Objects](https://developers.cloudflare.com/queues/examples/use-queues-with-durable-objects/)
- [Event-driven apps with Queues and Dapr](https://dev.to/diagrid/create-event-driven-applications-with-cloudflare-queues-and-dapr-3an8)

---

## ❓ FAQ

### Q: Do I need all three patterns?
**A:** No! Start with **Service Bindings only** (Phase 1). Add Queues and Durable Objects only when you need async messaging or event sourcing.

### Q: Can I mix synchronous and asynchronous?
**A:** Yes! That's the recommended approach:
- Use Service Bindings for request/response (get product, create order)
- Use Queues for events (send email, update analytics)
- Use Durable Objects for stateful aggregates (order lifecycle)

### Q: Is this cheaper than AWS Lambda + SQS?
**A:** **YES!** Significantly cheaper:
- Service Bindings: FREE vs. Lambda invocation costs
- Queues: Similar to SQS ($0.40/M vs. $0.40/M)
- No NAT Gateway fees ($45-90/month on AWS)
- No VPC networking complexity

### Q: What about consistency between services?
**A:** Three options:
1. **Saga Pattern** with Queues (eventual consistency)
2. **Durable Objects** for transactional consistency
3. **Keep related data in same service** (Product + Pricing together)

### Q: Can I use this for real-time features?
**A:** **YES!** Durable Objects support WebSockets natively. Perfect for:
- Real-time chat
- Live order tracking
- Collaborative editing
- Multiplayer games

---

## 🎯 Summary

### Communication Patterns:

| Pattern | Latency | Cost | Best For |
|---------|---------|------|----------|
| **Service Bindings** | ~μs | **FREE** | Sync request/response |
| **Cloudflare Queues** | ~60ms | $0.40/M | Async events, jobs |
| **Durable Objects** | <10ms | $0.15/M | Stateful, event sourcing |

### Pricing Summary:

- **API Gateway**: Effectively FREE (3M requests/month free tier)
- **Service Bindings**: 100% FREE ✅
- **Queues**: $0.40 per million operations
- **Durable Objects**: $0.15 per million requests

### Recommended Approach:

1. **Start**: Service Bindings only (FREE, simple)
2. **Add**: Queues for async events (when needed)
3. **Advanced**: Durable Objects for event sourcing (optional)

---

**Status**: ✅ Complete Technical Guide
**Next**: Implement Phase 1 (Service Bindings only) to prove the pattern
**Cost**: $0-5/month for most e-commerce use cases

**Questions?** Review this guide and decide which phase to implement!
