import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// TEMPORARY Country-based IP Filter - Remove when auth is implemented
// See: docs/bounded-contexts/business-partner/TEMPORARY_IP_WHITELIST.md
// Uses Cloudflare's cf-ipcountry header to allow only Indonesian IPs
const ALLOWED_COUNTRIES = ['ID']; // Indonesia
const ipWhitelist = () => async (c: Context, next: Next) => {
  const path = new URL(c.req.url).pathname;
  if (['/health', '/health/all', '/'].includes(path)) return next();
  const cfIP = c.req.header('cf-connecting-ip');
  if (!cfIP) return next(); // Allow internal service-to-service calls
  const country = c.req.header('cf-ipcountry');
  if (country && ALLOWED_COUNTRIES.includes(country)) return next();
  console.warn(`[BLOCKED] IP: ${cfIP}, Country: ${country || 'unknown'}`);
  return c.json({ error: 'Forbidden', country: country || 'unknown' }, 403);
};

// Type definition for Service Bindings
type Bindings = {
  PRODUCT_SERVICE: Fetcher;
  ORDER_SERVICE: Fetcher;
  PAYMENT_SERVICE: Fetcher;
  BUSINESS_PARTNER_SERVICE: Fetcher;
  INVENTORY_SERVICE: Fetcher;
  SHIPPING_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('/*', logger());
app.use(
  '/*',
  cors({
    origin: '*', // Configure this properly in production
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use('/*', ipWhitelist()); // TEMPORARY - Remove when auth is implemented

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Health check for all services
app.get('/health/all', async (c) => {
  const services = [
    { name: 'API Gateway', key: null },
    { name: 'Product Service', key: 'PRODUCT_SERVICE' },
    { name: 'Order Service', key: 'ORDER_SERVICE' },
    { name: 'Payment Service', key: 'PAYMENT_SERVICE' },
    { name: 'Business Partner Service', key: 'BUSINESS_PARTNER_SERVICE' },
    { name: 'Inventory Service', key: 'INVENTORY_SERVICE' },
    { name: 'Shipping Service', key: 'SHIPPING_SERVICE' },
  ];

  const healthChecks = await Promise.all(
    services.map(async (service) => {
      try {
        if (service.key === null) {
          // API Gateway itself
          return {
            name: service.name,
            status: 'online',
            timestamp: new Date().toISOString(),
          };
        }

        // Check other services via service bindings
        const serviceBinding = c.env[service.key as keyof Bindings] as Fetcher;
        const response = await serviceBinding.fetch(
          new Request('http://internal/health', { method: 'GET' })
        );

        if (response.ok) {
          const data = (await response.json()) as { status: string };
          return {
            name: service.name,
            status: data.status === 'healthy' ? 'online' : 'degraded',
            timestamp: new Date().toISOString(),
          };
        }
        return {
          name: service.name,
          status: 'offline',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          name: service.name,
          status: 'offline',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    })
  );

  const allOnline = healthChecks.every((hc) => hc.status === 'online');
  const anyOffline = healthChecks.some((hc) => hc.status === 'offline');

  return c.json({
    overall: allOnline ? 'operational' : anyOffline ? 'offline' : 'degraded',
    services: healthChecks,
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// PRODUCT SERVICE ROUTES
// ========================================
// Route all /api/products/* requests to Product Service (FREE via Service Bindings!)
app.all('/api/products/*', async (c) => {
  return c.env.PRODUCT_SERVICE.fetch(c.req.raw);
});

// ========================================
// ORDER SERVICE ROUTES
// ========================================
// Route all /api/orders/* requests to Order Service
app.all('/api/orders/*', async (c) => {
  return c.env.ORDER_SERVICE.fetch(c.req.raw);
});

// ========================================
// PAYMENT SERVICE ROUTES
// ========================================
// Route all /api/payments/* requests to Payment Service
app.all('/api/payments/*', async (c) => {
  return c.env.PAYMENT_SERVICE.fetch(c.req.raw);
});

// Webhooks for Xendit
app.all('/api/webhooks/*', async (c) => {
  return c.env.PAYMENT_SERVICE.fetch(c.req.raw);
});

// ========================================
// BUSINESS PARTNER SERVICE ROUTES
// ========================================
// Route all /api/customers/* requests to Business Partner Service
app.all('/api/customers/*', async (c) => {
  return c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw);
});

// Route all /api/suppliers/* requests to Business Partner Service
app.all('/api/suppliers/*', async (c) => {
  return c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw);
});

// Route all /api/employees/* requests to Business Partner Service
app.all('/api/employees/*', async (c) => {
  return c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw);
});

// Route all /api/addresses/* requests to Business Partner Service
app.all('/api/addresses/*', async (c) => {
  return c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw);
});

// Route all /api/geo/* requests to Business Partner Service (geospatial endpoints)
app.all('/api/geo/*', async (c) => {
  return c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw);
});

// ========================================
// INVENTORY SERVICE ROUTES
// ========================================
// Route all /api/inventory/* requests to Inventory Service
app.all('/api/inventory/*', async (c) => {
  return c.env.INVENTORY_SERVICE.fetch(c.req.raw);
});

// ========================================
// SHIPPING SERVICE ROUTES
// ========================================
// Route all /api/shipping/* requests to Shipping Service
app.all('/api/shipping/*', async (c) => {
  return c.env.SHIPPING_SERVICE.fetch(c.req.raw);
});

// ========================================
// RETAIL & WHOLESALE ROUTES
// ========================================
// These could go to different services or be routed based on user role
app.all('/api/retail/*', async (c) => {
  // Retail routes can go to Product Service (for browsing) or Order Service
  // For now, route product browsing to Product Service
  const path = new URL(c.req.url).pathname;
  if (path.includes('/products')) {
    return c.env.PRODUCT_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/orders')) {
    return c.env.ORDER_SERVICE.fetch(c.req.raw);
  }
  return c.json({ error: 'Not found' }, 404);
});

app.all('/api/wholesale/*', async (c) => {
  // Wholesale routes - handled by dedicated wholesale frontend with special rules
  const path = new URL(c.req.url).pathname;
  if (path.includes('/products')) {
    return c.env.PRODUCT_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/orders')) {
    return c.env.ORDER_SERVICE.fetch(c.req.raw);
  }
  return c.json({ error: 'Not found' }, 404);
});

// ========================================
// ADMIN ROUTES
// ========================================
app.all('/api/admin/*', async (c) => {
  // Admin routes can access all services
  const path = new URL(c.req.url).pathname;

  if (path.includes('/products')) {
    return c.env.PRODUCT_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/orders')) {
    return c.env.ORDER_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/customers')) {
    return c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/suppliers')) {
    return c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/employees')) {
    return c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/inventory')) {
    return c.env.INVENTORY_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/payments')) {
    return c.env.PAYMENT_SERVICE.fetch(c.req.raw);
  }
  if (path.includes('/shipping')) {
    return c.env.SHIPPING_SERVICE.fetch(c.req.raw);
  }

  return c.json({ error: 'Not found' }, 404);
});

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
  console.error('API Gateway Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;
