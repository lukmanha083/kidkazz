import { zValidator } from '@hono/zod-validator';
import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { JETClient } from './infrastructure/integrations/JETClient';

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
  SHIPPING_EVENTS_QUEUE: Queue;
  JET_API_KEY: string;
  JET_API_BASE_URL: string;
  JET_MODE: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('/*', logger());
app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use('/*', ipWhitelist()); // TEMPORARY - Remove when auth is implemented

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'shipping-service',
    jet_mode: c.env.JET_MODE || 'sandbox',
    timestamp: new Date().toISOString(),
  });
});

// Validation schemas
const getRatesSchema = z.object({
  origin_city_id: z.string(),
  destination_city_id: z.string(),
  weight: z.number().positive(),
  courier_codes: z.array(z.string()).optional(),
});

const createShipmentSchema = z.object({
  order_id: z.string(),
  courier_code: z.string(),
  service_code: z.string(),
  origin: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city_id: z.string(),
    postal_code: z.string(),
  }),
  destination: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city_id: z.string(),
    postal_code: z.string(),
  }),
  package: z.object({
    weight: z.number().positive(),
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    item_description: z.string(),
    item_value: z.number().positive(),
  }),
  cod_amount: z.number().optional(),
  insurance_amount: z.number().optional(),
});

/**
 * Get shipping rates
 * POST /api/shipping/rates
 */
app.post('/api/shipping/rates', zValidator('json', getRatesSchema), async (c) => {
  try {
    const input = c.req.valid('json');

    const jetClient = new JETClient({
      baseURL: c.env.JET_API_BASE_URL || 'https://sandbox-api.jet.co.id/v1',
      apiKey: c.env.JET_API_KEY || 'PLACEHOLDER_KEY',
      mode: c.env.JET_MODE === 'production' ? 'production' : 'sandbox',
    });

    const rates = await jetClient.getRates({
      origin_city_id: input.origin_city_id,
      destination_city_id: input.destination_city_id,
      weight: input.weight,
      courier_codes: input.courier_codes,
    });

    return c.json({
      success: true,
      data: rates,
      mode: c.env.JET_MODE || 'sandbox',
      note: 'Using placeholder data - waiting for JET sandbox credentials',
    });
  } catch (error) {
    console.error('Error getting shipping rates:', error);
    return c.json(
      {
        error: 'Failed to get shipping rates',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Create shipment
 * POST /api/shipping/shipments
 */
app.post('/api/shipping/shipments', zValidator('json', createShipmentSchema), async (c) => {
  try {
    const input = c.req.valid('json');

    const jetClient = new JETClient({
      baseURL: c.env.JET_API_BASE_URL || 'https://sandbox-api.jet.co.id/v1',
      apiKey: c.env.JET_API_KEY || 'PLACEHOLDER_KEY',
      mode: c.env.JET_MODE === 'production' ? 'production' : 'sandbox',
    });

    const order = await jetClient.createOrder({
      origin: {
        name: input.origin.name,
        phone: input.origin.phone,
        address: input.origin.address,
        city_id: input.origin.city_id,
        postal_code: input.origin.postal_code,
        province: '', // TODO: Add province mapping
      },
      destination: {
        name: input.destination.name,
        phone: input.destination.phone,
        address: input.destination.address,
        city_id: input.destination.city_id,
        postal_code: input.destination.postal_code,
        province: '', // TODO: Add province mapping
      },
      package: {
        weight: input.package.weight,
        length: input.package.length,
        width: input.package.width,
        height: input.package.height,
        item_description: input.package.item_description,
        item_value: input.package.item_value,
      },
      courier_code: input.courier_code,
      service_code: input.service_code,
      cod_amount: input.cod_amount,
      insurance_amount: input.insurance_amount,
    });

    // TODO: Save shipment to database

    return c.json(
      {
        success: true,
        data: order,
        mode: c.env.JET_MODE || 'sandbox',
        note: 'Using placeholder data - waiting for JET sandbox credentials',
      },
      201
    );
  } catch (error) {
    console.error('Error creating shipment:', error);
    return c.json(
      {
        error: 'Failed to create shipment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Get shipment tracking
 * GET /api/shipping/shipments/:id/tracking
 */
app.get('/api/shipping/shipments/:id/tracking', async (c) => {
  try {
    const shipmentId = c.req.param('id');

    const jetClient = new JETClient({
      baseURL: c.env.JET_API_BASE_URL || 'https://sandbox-api.jet.co.id/v1',
      apiKey: c.env.JET_API_KEY || 'PLACEHOLDER_KEY',
      mode: c.env.JET_MODE === 'production' ? 'production' : 'sandbox',
    });

    const tracking = await jetClient.getTracking(shipmentId);

    return c.json({
      success: true,
      data: tracking,
      mode: c.env.JET_MODE || 'sandbox',
      note: 'Using placeholder data - waiting for JET sandbox credentials',
    });
  } catch (error) {
    console.error('Error getting tracking:', error);
    return c.json(
      {
        error: 'Failed to get tracking information',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Cancel shipment
 * POST /api/shipping/shipments/:id/cancel
 */
app.post('/api/shipping/shipments/:id/cancel', async (c) => {
  try {
    const shipmentId = c.req.param('id');

    const jetClient = new JETClient({
      baseURL: c.env.JET_API_BASE_URL || 'https://sandbox-api.jet.co.id/v1',
      apiKey: c.env.JET_API_KEY || 'PLACEHOLDER_KEY',
      mode: c.env.JET_MODE === 'production' ? 'production' : 'sandbox',
    });

    await jetClient.cancelOrder(shipmentId);

    // TODO: Update shipment status in database

    return c.json({
      success: true,
      message: 'Shipment cancelled successfully',
      mode: c.env.JET_MODE || 'sandbox',
      note: 'Using placeholder data - waiting for JET sandbox credentials',
    });
  } catch (error) {
    console.error('Error cancelling shipment:', error);
    return c.json(
      {
        error: 'Failed to cancel shipment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
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
  console.error('Shipping Service Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;
