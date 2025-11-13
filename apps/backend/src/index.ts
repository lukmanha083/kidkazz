import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { drizzle } from 'drizzle-orm/d1';

// Routes
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { productsRoutes } from './routes/products';
import { ordersRoutes } from './routes/orders';
import { quotesRoutes } from './routes/quotes';
import { paymentsRoutes } from './routes/payments';
import { webhooksRoutes } from './routes/webhooks';
import { retailRoutes } from './routes/retail';
import { wholesaleRoutes } from './routes/wholesale';

// Types
export type Env = {
  DB: D1Database;
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  ENVIRONMENT: string;
  XENDIT_SECRET_KEY: string;
  XENDIT_WEBHOOK_TOKEN: string;
  API_BASE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'Wholesale E-Commerce API',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/retail', retailRoutes);
app.route('/api/wholesale', wholesaleRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/orders', ordersRoutes);
app.route('/api/quotes', quotesRoutes);
app.route('/api/payments', paymentsRoutes);
app.route('/api/webhooks', webhooksRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`, err);
  return c.json({
    error: err.message,
    ...(c.env.ENVIRONMENT === 'development' && { stack: err.stack }),
  }, 500);
});

export default app;
