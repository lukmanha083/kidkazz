import { Hono } from 'hono';
import { createDb } from '../lib/db';
import { orders, orderItems } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../index';

const ordersRoutes = new Hono<{ Bindings: Env }>();

// GET /api/orders - List user's orders
ordersRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB);

  // TODO: Get buyerId from authenticated user
  const buyerId = c.req.query('buyerId');

  if (!buyerId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.buyerId, buyerId))
    .orderBy(desc(orders.createdAt));

  return c.json({ orders: userOrders });
});

// GET /api/orders/:id - Get order details with items
ordersRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  // Get order items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  return c.json({
    order,
    items,
  });
});

export { ordersRoutes };
