import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

type Bindings = {
  DB: D1Database;
  INVENTORY_EVENTS_QUEUE: Queue;
  PRODUCT_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('/*', logger());
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'inventory-service',
    timestamp: new Date().toISOString(),
  });
});

// Placeholder routes - will be implemented later
app.post('/api/inventory/reserve', (c) => {
  return c.json({ message: 'Reserve inventory - coming soon' }, 501);
});

app.post('/api/inventory/confirm', (c) => {
  return c.json({ message: 'Confirm inventory - coming soon' }, 501);
});

app.post('/api/inventory/release', (c) => {
  return c.json({ message: 'Release inventory - coming soon' }, 501);
});

app.get('/api/inventory/:productId', (c) => {
  return c.json({ message: 'Get inventory - coming soon' }, 501);
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
