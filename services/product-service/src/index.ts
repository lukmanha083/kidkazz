import { createContextFactory, createTRPCHandler } from '@kidkazz/trpc';
import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import routes from './infrastructure/http/routes';
import { appRouter } from './infrastructure/trpc';
import imageRoutes from './routes/images';
import videoRoutes from './routes/videos';

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
  PRODUCT_EVENTS_QUEUE: Queue;
  PRODUCT_IMAGES: R2Bucket;
  IMAGE_CACHE: KVNamespace;
  PRODUCT_VIDEOS: R2Bucket;
  VIDEO_CACHE: KVNamespace;
  CLOUDFLARE_STREAM_API_TOKEN?: string;
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
    service: 'product-service',
    timestamp: new Date().toISOString(),
  });
});

// tRPC endpoint (for service-to-service communication)
app.all('/trpc/*', async (c) => {
  const createContext = createContextFactory<Bindings>();
  const handler = createTRPCHandler(appRouter, (req, env) => createContext({ req } as any, env));
  return handler(c);
});

// REST API routes (for backward compatibility with frontend)
app.route('/api', routes);

// Image routes (R2 + KV cache)
app.route('/api/images', imageRoutes);

// Video routes (R2 + Cloudflare Stream)
app.route('/api/videos', videoRoutes);

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
  console.error('Product Service Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;
