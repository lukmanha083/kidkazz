import { databaseMiddleware, errorMiddleware, ipWhitelist } from '@/infrastructure/http/middleware';
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
  testUtilitiesRoutes,
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
app.use('*', ipWhitelist()); // TEMPORARY - Remove when auth is implemented
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
app.route('/api/accounts', accountRoutes);
app.route('/api/journal-entries', journalEntryRoutes);
app.route('/api/asset-categories', assetCategoryRoutes);
app.route('/api/assets', assetRoutes);
app.route('/api/depreciation', depreciationRoutes);
app.route('/api/maintenance', maintenanceRoutes);
app.route('/api/movements', movementRoutes);
app.route('/api/fiscal-periods', fiscalPeriodRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/bank-accounts', bankAccountRoutes);
app.route('/api/reconciliations', reconciliationRoutes);
app.route('/api/events', eventRoutes);
app.route('/api/currencies', currencyRoutes);
app.route('/api/budgets', budgetRoutes);
app.route('/api/audit', auditRoutes);
app.route('/api/account-balances', accountBalanceRoutes);
app.route('/api/test-utilities', testUtilitiesRoutes);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Accounting Service',
    version: '1.0.0',
    description: 'Core accounting service for KidKazz ERP',
    endpoints: {
      health: '/health',
      accounts: '/api/accounts',
      journalEntries: '/api/journal-entries',
      assetCategories: '/api/asset-categories',
      assets: '/api/assets',
      depreciation: '/api/depreciation',
      maintenance: '/api/maintenance',
      movements: '/api/movements',
      fiscalPeriods: '/api/fiscal-periods',
      reports: '/api/reports',
      bankAccounts: '/api/bank-accounts',
      reconciliations: '/api/reconciliations',
      events: '/api/events',
      currencies: '/api/currencies',
      budgets: '/api/budgets',
      audit: '/api/audit',
      accountBalances: '/api/account-balances',
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
