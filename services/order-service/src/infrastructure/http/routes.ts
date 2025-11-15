import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CreateOrderUseCase } from '../../application/use-cases/CreateOrder';
import { GetOrderUseCase } from '../../application/use-cases/GetOrder';
import { ListOrdersUseCase } from '../../application/use-cases/ListOrders';
import { DrizzleOrderRepository } from '../repositories/DrizzleOrderRepository';

type Bindings = {
  DB: D1Database;
  ORDER_EVENTS_QUEUE: Queue;
  PRODUCT_SERVICE: Fetcher;
  PAYMENT_SERVICE: Fetcher;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createOrderSchema = z.object({
  userId: z.string(),
  customerType: z.enum(['retail', 'wholesale']),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      sku: z.string(),
      unitPrice: z.number().positive(),
      quantity: z.number().int().positive(),
      discount: z.number().optional(),
    })
  ),
  shippingAddress: z.object({
    recipientName: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    postalCode: z.string(),
  }),
  shippingCost: z.number().optional(),
});

/**
 * Create order
 * POST /api/orders
 */
app.post('/api/orders', zValidator('json', createOrderSchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const db = c.env.DB;

    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleOrderRepository(drizzleDb);
    const useCase = new CreateOrderUseCase(repository);

    const result = await useCase.execute(input);

    if (!result.isSuccess) {
      const error = result.error || new Error('Unknown error');
      return c.json(
        {
          error: error.name,
          message: error.message,
        },
        400
      );
    }

    return c.json(result.value, 201);
  } catch (error) {
    console.error('Error creating order:', error);
    return c.json({ error: 'InternalServerError', message: 'An unexpected error occurred' }, 500);
  }
});

/**
 * Get order by ID
 * GET /api/orders/:id
 */
app.get('/api/orders/:id', async (c) => {
  try {
    const orderId = c.req.param('id');
    const db = c.env.DB;

    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleOrderRepository(drizzleDb);
    const useCase = new GetOrderUseCase(repository);

    const result = await useCase.execute(orderId);

    if (!result.isSuccess) {
      const error = result.error || new Error('Unknown error');
      return c.json({ error: error.name, message: error.message }, 404);
    }

    return c.json(result.value);
  } catch (error) {
    console.error('Error getting order:', error);
    return c.json({ error: 'InternalServerError', message: 'An unexpected error occurred' }, 500);
  }
});

/**
 * List orders
 * GET /api/orders
 */
app.get('/api/orders', async (c) => {
  try {
    const db = c.env.DB;

    const status = c.req.query('status');
    const customerType = c.req.query('customerType') as 'retail' | 'wholesale' | undefined;

    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleOrderRepository(drizzleDb);
    const useCase = new ListOrdersUseCase(repository);

    const result = await useCase.execute({ status, customerType });

    if (!result.isSuccess) {
      const error = result.error || new Error('Unknown error');
      return c.json({ error: error.name, message: error.message }, 400);
    }

    return c.json(result.value);
  } catch (error) {
    console.error('Error listing orders:', error);
    return c.json({ error: 'InternalServerError', message: 'An unexpected error occurred' }, 500);
  }
});

export default app;
