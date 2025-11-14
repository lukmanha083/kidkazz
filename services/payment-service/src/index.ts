import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

type Bindings = {
  DB: D1Database;
  PAYMENT_EVENTS_QUEUE: Queue;
  XENDIT_API_KEY: string;
  XENDIT_WEBHOOK_TOKEN: string;
  XENDIT_MODE: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('/*', logger());
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Callback-Token'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
  });
});

// Placeholder routes - will be implemented later
app.post('/api/payments', (c) => {
  return c.json({ message: 'Create payment - coming soon' }, 501);
});

app.get('/api/payments/:id', (c) => {
  return c.json({ message: 'Get payment - coming soon' }, 501);
});

// Xendit webhook endpoint
app.post('/webhooks/xendit', (c) => {
  return c.json({ message: 'Xendit webhook - coming soon' }, 501);
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
  console.error('Payment Service Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

export default app;
