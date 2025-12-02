import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createTRPCHandler, createContextFactory } from '@kidkazz/trpc';
import { appRouter } from './infrastructure/trpc';
import warehousesRoutes from './routes/warehouses';
import inventoryRoutes from './routes/inventory';
import inventoryBatchesRoutes from './routes/inventory-batches';

// Export Durable Objects
export { InventoryUpdatesBroadcaster } from './durable-objects/InventoryUpdatesBroadcaster';
export { WarehouseUpdatesBroadcaster } from './durable-objects/WarehouseUpdatesBroadcaster';

type Bindings = {
  DB: D1Database;
  INVENTORY_EVENTS_QUEUE: Queue;
  PRODUCT_SERVICE: Fetcher;
  INVENTORY_UPDATES: DurableObjectNamespace;
  WAREHOUSE_UPDATES: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('/*', logger());
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'inventory-service',
    timestamp: new Date().toISOString(),
  });
});

// tRPC endpoint (for service-to-service communication)
app.all('/trpc/*', async (c) => {
  const createContext = createContextFactory<Bindings>();
  const handler = createTRPCHandler(appRouter, (req, env) =>
    createContext({ req } as any, { ...env, eventQueue: env.INVENTORY_EVENTS_QUEUE })
  );
  return handler(c);
});

// REST API routes (for backward compatibility with frontend)
app.route('/api/warehouses', warehousesRoutes);
app.route('/api/inventory', inventoryRoutes);
app.route('/api/batches', inventoryBatchesRoutes); // Phase 3: Batch tracking

// WebSocket endpoints for real-time updates
app.get('/ws/inventory', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket upgrade', 426);
  }

  // Get Durable Object instance (use a single instance for all connections)
  const id = c.env.INVENTORY_UPDATES.idFromName('global');
  const stub = c.env.INVENTORY_UPDATES.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(c.req.raw);
});

app.get('/ws/warehouses', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket upgrade', 426);
  }

  // Get Durable Object instance (use a single instance for all connections)
  const id = c.env.WAREHOUSE_UPDATES.idFromName('global');
  const stub = c.env.WAREHOUSE_UPDATES.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(c.req.raw);
});

// Internal endpoint to trigger broadcasts (called after inventory changes)
app.post('/internal/broadcast/inventory', async (c) => {
  try {
    const update = await c.req.json();

    // Get Durable Object instance
    const id = c.env.INVENTORY_UPDATES.idFromName('global');
    const stub = c.env.INVENTORY_UPDATES.get(id) as any;

    // Trigger broadcast
    await stub.broadcastUpdate(update);

    return c.json({ success: true, message: 'Broadcast sent' });
  } catch (error) {
    console.error('Broadcast error:', error);
    return c.json({ error: 'Failed to broadcast update' }, 500);
  }
});

app.post('/internal/broadcast/warehouse', async (c) => {
  try {
    const update = await c.req.json();

    // Get Durable Object instance
    const id = c.env.WAREHOUSE_UPDATES.idFromName('global');
    const stub = c.env.WAREHOUSE_UPDATES.get(id) as any;

    // Trigger broadcast
    await stub.broadcastUpdate(update);

    return c.json({ success: true, message: 'Broadcast sent' });
  } catch (error) {
    console.error('Broadcast error:', error);
    return c.json({ error: 'Failed to broadcast update' }, 500);
  }
});

// Get WebSocket connection stats (for monitoring)
app.get('/internal/stats/inventory', async (c) => {
  const id = c.env.INVENTORY_UPDATES.idFromName('global');
  const stub = c.env.INVENTORY_UPDATES.get(id) as any;
  const stats = await stub.getStats();
  return c.json(stats);
});

app.get('/internal/stats/warehouses', async (c) => {
  const id = c.env.WAREHOUSE_UPDATES.idFromName('global');
  const stub = c.env.WAREHOUSE_UPDATES.get(id) as any;
  const stats = await stub.getStats();
  return c.json(stats);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: c.req.url,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Inventory Service Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

export default app;
