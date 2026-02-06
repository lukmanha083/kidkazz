import { createContextFactory, createTRPCHandler } from '@kidkazz/trpc';
import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { appRouter } from './infrastructure/trpc';
import addressesRoutes from './routes/addresses';
import customersRoutes from './routes/customers';
import documentsRoutes from './routes/documents';
import employeesRoutes from './routes/employees';
import geospatialRoutes from './routes/geospatial';
import suppliersRoutes from './routes/suppliers';

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
  PARTNER_DOCUMENTS: R2Bucket;
  DOCUMENT_CACHE: KVNamespace;
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
app.use('/*', ipWhitelist()); // TEMPORARY - Remove when auth is implemented

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'business-partner-service',
    timestamp: new Date().toISOString(),
  });
});

// tRPC endpoint (for service-to-service communication)
app.all('/trpc/*', async (c) => {
  const createContext = createContextFactory<Bindings>();
  const handler = createTRPCHandler(appRouter, (req, env) => createContext({ req } as any, env));
  return handler(c);
});

// REST API routes
app.route('/api/customers', customersRoutes);
app.route('/api/suppliers', suppliersRoutes);
app.route('/api/employees', employeesRoutes);
app.route('/api/employees/documents', documentsRoutes); // Document upload/download
app.route('/api/addresses', addressesRoutes);
app.route('/api/geo', geospatialRoutes); // Geospatial & export endpoints

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
  const correlationId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  console.error(`[${correlationId}] Business Partner Service Error:`, err);
  return c.json(
    {
      error: 'Internal Server Error',
      correlationId,
    },
    500
  );
});

export default app;
