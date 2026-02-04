import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import routes from './infrastructure/http/routes';

// TEMPORARY IP Whitelist - Remove when auth is implemented
// See: docs/bounded-contexts/business-partner/TEMPORARY_IP_WHITELIST.md
const WHITELISTED_IPS = ['180.252.172.69', '127.0.0.1', '::1'];
const ipWhitelist = () => async (c: Context, next: Next) => {
  const path = new URL(c.req.url).pathname;
  if (['/health', '/'].includes(path)) return next();
  const cfIP = c.req.header('cf-connecting-ip');
  if (!cfIP) return next(); // Allow internal service-to-service calls
  if (WHITELISTED_IPS.includes(cfIP)) return next();
  return c.json({ error: 'Forbidden', ip: cfIP }, 403);
};

type Bindings = {
  DB: D1Database;
  ORDER_EVENTS_QUEUE: Queue;
  // Workflow bindings will be added in Phase 2 for saga orchestration
  PRODUCT_SERVICE: Fetcher;
  PAYMENT_SERVICE: Fetcher;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('/*', logger());
app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use('/*', ipWhitelist()); // TEMPORARY - Remove when auth is implemented

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'order-service',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route('/', routes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
      path: c.req.url,
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Order Service Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;
