import { createContextFactory, createTRPCHandler } from '@kidkazz/trpc';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { appRouter } from './infrastructure/trpc';
import inventoryRoutes from './routes/inventory';
import inventoryBatchesRoutes from './routes/inventory-batches';
import warehousesRoutes from './routes/warehouses';

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
app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  })
);

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

// REST API routes
app.route('/api/warehouses', warehousesRoutes);
app.route('/api/inventory', inventoryRoutes);
app.route('/api/batches', inventoryBatchesRoutes);

// WebSocket endpoint for real-time inventory updates
app.get('/ws', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const id = c.env.INVENTORY_UPDATES.idFromName('global');
  const stub = c.env.INVENTORY_UPDATES.get(id);
  return stub.fetch(c.req.raw);
});

// WebSocket endpoint for warehouse updates
app.get('/ws/warehouses', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const id = c.env.WAREHOUSE_UPDATES.idFromName('global');
  const stub = c.env.WAREHOUSE_UPDATES.get(id);
  return stub.fetch(c.req.raw);
});

// Internal endpoint to trigger inventory broadcasts
app.post('/internal/broadcast/inventory', async (c) => {
  try {
    const event = await c.req.json();
    const id = c.env.INVENTORY_UPDATES.idFromName('global');
    const stub = c.env.INVENTORY_UPDATES.get(id) as any;
    await stub.broadcast(event);
    return c.json({ success: true });
  } catch (error) {
    console.error('Broadcast error:', error);
    return c.json({ error: 'Failed to broadcast' }, 500);
  }
});

// Internal endpoint to trigger warehouse broadcasts
app.post('/internal/broadcast/warehouse', async (c) => {
  try {
    const update = await c.req.json();
    const id = c.env.WAREHOUSE_UPDATES.idFromName('global');
    const stub = c.env.WAREHOUSE_UPDATES.get(id) as any;
    await stub.broadcastUpdate(update);
    return c.json({ success: true });
  } catch (error) {
    console.error('Broadcast error:', error);
    return c.json({ error: 'Failed to broadcast' }, 500);
  }
});

// WebSocket connection stats (monitoring)
app.get('/internal/stats/inventory', async (c) => {
  const id = c.env.INVENTORY_UPDATES.idFromName('global');
  const stub = c.env.INVENTORY_UPDATES.get(id) as any;
  return c.json(await stub.getStats());
});

app.get('/internal/stats/warehouses', async (c) => {
  const id = c.env.WAREHOUSE_UPDATES.idFromName('global');
  const stub = c.env.WAREHOUSE_UPDATES.get(id) as any;
  return c.json(await stub.getStats());
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      path: c.req.url,
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Inventory Service Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;
