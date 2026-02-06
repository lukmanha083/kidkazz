import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import routes from './infrastructure/http/routes';

// TEMPORARY Country-based IP Filter - Remove when auth is implemented
// See: docs/bounded-contexts/business-partner/TEMPORARY_IP_WHITELIST.md
// Uses Cloudflare's cf-ipcountry header to allow only Indonesian IPs
const ALLOWED_COUNTRIES = ['ID']; // Indonesia
const ipWhitelist = () => async (c: Context, next: Next) => {
  const path = new URL(c.req.url).pathname;
  if (['/health', '/'].includes(path)) return next();
  const cfIP = c.req.header('cf-connecting-ip');
  if (!cfIP) return next(); // Allow internal service-to-service calls
  const country = c.req.header('cf-ipcountry');
  if (country && ALLOWED_COUNTRIES.includes(country)) return next();
  console.warn(`[BLOCKED] IP: ${cfIP}, Country: ${country || 'unknown'}`);
  return c.json({ error: 'Forbidden', country: country || 'unknown' }, 403);
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
