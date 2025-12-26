import { Hono } from 'hono';
import categoriesRoutes from './routes/categories';
import productsRoutes from './routes/products';
import variantsRoutes from './routes/variants';
import bundlesRoutes from './routes/bundles';
import uomsRoutes from './routes/uoms';
import productLocationsRoutes from './routes/product-locations';
import variantLocationsRoutes from './routes/variant-locations';
import productUOMLocationsRoutes from './routes/product-uom-locations';
import cleanupRoutes from './routes/cleanup';
import validationRoutes from './routes/validation';

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
app.route('/bundles', bundlesRoutes);
app.route('/uoms', uomsRoutes);
app.route('/product-locations', productLocationsRoutes);
app.route('/variant-locations', variantLocationsRoutes);
app.route('/product-uom-locations', productUOMLocationsRoutes);
app.route('/cleanup', cleanupRoutes);
app.route('/validation', validationRoutes);

export default app;
