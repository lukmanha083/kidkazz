import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { databaseMiddleware, errorMiddleware } from '@/infrastructure/http/middleware';
import {
  accountRoutes,
  journalEntryRoutes,
  assetCategoryRoutes,
  assetRoutes,
} from '@/infrastructure/http/routes';

type Bindings = {
  DB: D1Database;
  ACCOUNTING_EVENTS_QUEUE: Queue;
  ENVIRONMENT: string;
};

type Variables = {
  db: unknown;
  userId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Global middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', errorMiddleware);
app.use('*', databaseMiddleware);

// Set default userId (in production, this would come from auth middleware)
app.use('*', async (c, next) => {
  c.set('userId', c.req.header('X-User-Id') || 'anonymous');
  await next();
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'accounting-service',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/api/v1/accounts', accountRoutes);
app.route('/api/v1/journal-entries', journalEntryRoutes);
app.route('/api/v1/asset-categories', assetCategoryRoutes);
app.route('/api/v1/assets', assetRoutes);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Accounting Service',
    version: '1.0.0',
    description: 'Core accounting service for KidKazz ERP',
    endpoints: {
      health: '/health',
      accounts: '/api/v1/accounts',
      journalEntries: '/api/v1/journal-entries',
      assetCategories: '/api/v1/asset-categories',
      assets: '/api/v1/assets',
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not found',
    },
    404
  );
});

export default app;
