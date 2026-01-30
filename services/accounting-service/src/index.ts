import { databaseMiddleware, errorMiddleware } from '@/infrastructure/http/middleware';
import {
  accountBalanceRoutes,
  accountRoutes,
  assetCategoryRoutes,
  assetRoutes,
  auditRoutes,
  bankAccountRoutes,
  budgetRoutes,
  currencyRoutes,
  depreciationRoutes,
  eventRoutes,
  fiscalPeriodRoutes,
  journalEntryRoutes,
  maintenanceRoutes,
  movementRoutes,
  reconciliationRoutes,
  reportsRoutes,
} from '@/infrastructure/http/routes';
import { handleQueue } from '@/infrastructure/messaging';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

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
app.route('/api/v1/depreciation', depreciationRoutes);
app.route('/api/v1/maintenance', maintenanceRoutes);
app.route('/api/v1/movements', movementRoutes);
app.route('/api/v1/fiscal-periods', fiscalPeriodRoutes);
app.route('/api/v1/reports', reportsRoutes);
app.route('/api/v1/bank-accounts', bankAccountRoutes);
app.route('/api/v1/reconciliations', reconciliationRoutes);
app.route('/api/v1/events', eventRoutes);
app.route('/api/v1/currencies', currencyRoutes);
app.route('/api/v1/budgets', budgetRoutes);
app.route('/api/v1/audit', auditRoutes);
app.route('/api/v1/account-balances', accountBalanceRoutes);

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
      depreciation: '/api/v1/depreciation',
      maintenance: '/api/v1/maintenance',
      movements: '/api/v1/movements',
      fiscalPeriods: '/api/v1/fiscal-periods',
      reports: '/api/v1/reports',
      bankAccounts: '/api/v1/bank-accounts',
      reconciliations: '/api/v1/reconciliations',
      events: '/api/v1/events',
      currencies: '/api/v1/currencies',
      budgets: '/api/v1/budgets',
      audit: '/api/v1/audit',
      accountBalances: '/api/v1/account-balances',
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

// Export queue handler for Cloudflare Workers
export { handleQueue };

export default app;
