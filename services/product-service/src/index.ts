import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createTRPCHandler, createContextFactory } from '@kidkazz/trpc';
import { appRouter } from './infrastructure/trpc';
import routes from './infrastructure/http/routes';
import imageRoutes from './routes/images';
import videoRoutes from './routes/videos';

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
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));

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
  const handler = createTRPCHandler(appRouter, (req, env) =>
    createContext({ req } as any, env)
  );
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
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: c.req.url,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Product Service Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

export default app;
