import { Hono } from 'hono';
import categoriesRoutes from './routes/categories';
import productsRoutes from './routes/products';
import variantsRoutes from './routes/variants';
import uomsRoutes from './routes/uoms';

type Bindings = {
  DB: D1Database;
  PRODUCT_EVENTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'product-service',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route('/categories', categoriesRoutes);
app.route('/products', productsRoutes);
app.route('/variants', variantsRoutes);
app.route('/uoms', uomsRoutes);

export default app;
