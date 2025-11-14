import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

type Bindings = {
  DB: D1Database;
  ORDER_EVENTS_QUEUE: Queue;
  CREATE_ORDER_SAGA: Workflow;
  PRODUCT_SERVICE: Fetcher;
  PAYMENT_SERVICE: Fetcher;
  INVENTORY_SERVICE: Fetcher;
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
    service: 'order-service',
    timestamp: new Date().toISOString(),
  });
});

// Placeholder routes - will be implemented later
app.post('/api/orders', (c) => {
  return c.json({ message: 'Create order - coming soon' }, 501);
});

app.get('/api/orders/:id', (c) => {
  return c.json({ message: 'Get order - coming soon' }, 501);
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
  console.error('Order Service Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

export default app;
