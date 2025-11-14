import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../lib/db';
import { users, products, orders, categories, activityLogs, settings } from '../db/schema';
import { eq, desc, count, sql, and, or, like } from 'drizzle-orm';
import { generateId } from '../lib/utils';
import type { Env } from '../index';

const adminRoutes = new Hono<{ Bindings: Env }>();

// TODO: Add authentication middleware to protect all admin routes
// adminRoutes.use('*', authMiddleware({ role: 'admin' }));

// ============================================
// DASHBOARD STATS
// ============================================

adminRoutes.get('/dashboard/stats', async (c) => {
  const db = createDb(c.env.DB);

  // Get counts
  const [userCount] = await db.select({ count: count() }).from(users);
  const [productCount] = await db.select({ count: count() }).from(products);
  const [orderCount] = await db.select({ count: count() }).from(orders);

  // Get revenue (sum of total_amount from orders with status not cancelled/refunded)
  const [revenueData] = await db
    .select({ total: sql<number>`sum(${orders.totalAmount})` })
    .from(orders)
    .where(and(
      eq(orders.paymentStatus, 'paid'),
      or(
        eq(orders.status, 'confirmed'),
        eq(orders.status, 'processing'),
        eq(orders.status, 'shipped'),
        eq(orders.status, 'delivered')
      )
    ));

  // Recent orders
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  // Low stock products
  const lowStockProducts = await db
    .select()
    .from(products)
    .where(sql`${products.stockQuantity} <= ${products.lowStockThreshold}`)
    .limit(10);

  return c.json({
    stats: {
      totalUsers: userCount.count,
      totalProducts: productCount.count,
      totalOrders: orderCount.count,
      totalRevenue: revenueData?.total || 0,
    },
    recentOrders,
    lowStockProducts,
  });
});

// ============================================
// USER MANAGEMENT
// ============================================

adminRoutes.get('/users', async (c) => {
  const db = createDb(c.env.DB);
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;
  const role = c.req.query('role');
  const status = c.req.query('status');
  const search = c.req.query('search');

  const offset = (page - 1) * limit;

  let query = db.select().from(users);
  const conditions = [];

  if (role) conditions.push(eq(users.role, role as any));
  if (status) conditions.push(eq(users.status, status as any));
  if (search) {
    conditions.push(or(
      like(users.email, `%${search}%`),
      like(users.firstName, `%${search}%`),
      like(users.lastName, `%${search}%`)
    )!);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allUsers = await query
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalCount] = await db.select({ count: count() }).from(users);

  return c.json({
    users: allUsers,
    pagination: {
      page,
      limit,
      total: totalCount.count,
      totalPages: Math.ceil(totalCount.count / limit),
    },
  });
});

adminRoutes.get('/users/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

const updateUserSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  role: z.enum(['admin', 'supplier', 'retail_buyer', 'wholesale_buyer']).optional(),
});

adminRoutes.patch('/users/:id', zValidator('json', updateUserSchema), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  await db.update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id));

  return c.json({ message: 'User updated successfully' });
});

// ============================================
// PRODUCT MANAGEMENT
// ============================================

adminRoutes.get('/products', async (c) => {
  const db = createDb(c.env.DB);
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;
  const status = c.req.query('status');
  const categoryId = c.req.query('categoryId');
  const search = c.req.query('search');

  const offset = (page - 1) * limit;

  let query = db.select().from(products);
  const conditions = [];

  if (status) conditions.push(eq(products.status, status as any));
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (search) {
    conditions.push(or(
      like(products.name, `%${search}%`),
      like(products.sku, `%${search}%`)
    )!);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allProducts = await query
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalCount] = await db.select({ count: count() }).from(products);

  return c.json({
    products: allProducts,
    pagination: {
      page,
      limit,
      total: totalCount.count,
      totalPages: Math.ceil(totalCount.count / limit),
    },
  });
});

const createProductSchema = z.object({
  categoryId: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  stockQuantity: z.number().int().nonnegative(),
  minimumOrderQuantity: z.number().int().positive().default(1),
  status: z.enum(['draft', 'active', 'inactive', 'discontinued']).default('draft'),
});

adminRoutes.post('/products', zValidator('json', createProductSchema), async (c) => {
  const db = createDb(c.env.DB);
  const data = c.req.valid('json');

  // TODO: Get supplierId from authenticated user
  const supplierId = 'temp-supplier-id';

  const productId = generateId();

  await db.insert(products).values({
    id: productId,
    supplierId,
    ...data,
  });

  return c.json({ message: 'Product created', productId }, 201);
});

adminRoutes.patch('/products/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const data = await c.req.json();

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  await db.update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id));

  return c.json({ message: 'Product updated successfully' });
});

adminRoutes.delete('/products/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  await db.delete(products).where(eq(products.id, id));

  return c.json({ message: 'Product deleted successfully' });
});

// ============================================
// CATEGORY MANAGEMENT
// ============================================

adminRoutes.get('/categories', async (c) => {
  const db = createDb(c.env.DB);

  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(categories.displayOrder, desc(categories.createdAt));

  return c.json({ categories: allCategories });
});

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

adminRoutes.post('/categories', zValidator('json', createCategorySchema), async (c) => {
  const db = createDb(c.env.DB);
  const data = c.req.valid('json');

  const categoryId = generateId();

  await db.insert(categories).values({
    id: categoryId,
    ...data,
  });

  return c.json({ message: 'Category created', categoryId }, 201);
});

// ============================================
// ORDER MANAGEMENT
// ============================================

adminRoutes.get('/orders', async (c) => {
  const db = createDb(c.env.DB);
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;
  const status = c.req.query('status');
  const paymentStatus = c.req.query('paymentStatus');

  const offset = (page - 1) * limit;

  let query = db.select().from(orders);
  const conditions = [];

  if (status) conditions.push(eq(orders.status, status as any));
  if (paymentStatus) conditions.push(eq(orders.paymentStatus, paymentStatus as any));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allOrders = await query
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalCount] = await db.select({ count: count() }).from(orders);

  return c.json({
    orders: allOrders,
    pagination: {
      page,
      limit,
      total: totalCount.count,
      totalPages: Math.ceil(totalCount.count / limit),
    },
  });
});

adminRoutes.get('/orders/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  return c.json({ order });
});

const updateOrderSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded', 'partial']).optional(),
  trackingNumber: z.string().optional(),
});

adminRoutes.patch('/orders/:id', zValidator('json', updateOrderSchema), async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  const updateData: any = { ...data, updatedAt: new Date() };

  // Set timestamps based on status changes
  if (data.status === 'confirmed' && !order.confirmedAt) {
    updateData.confirmedAt = new Date();
  } else if (data.status === 'shipped' && !order.shippedAt) {
    updateData.shippedAt = new Date();
  } else if (data.status === 'delivered' && !order.deliveredAt) {
    updateData.deliveredAt = new Date();
  }

  await db.update(orders)
    .set(updateData)
    .where(eq(orders.id, id));

  return c.json({ message: 'Order updated successfully' });
});

// ============================================
// SETTINGS
// ============================================

adminRoutes.get('/settings', async (c) => {
  const db = createDb(c.env.DB);

  const allSettings = await db.select().from(settings);

  return c.json({ settings: allSettings });
});

adminRoutes.put('/settings/:key', async (c) => {
  const db = createDb(c.env.DB);
  const key = c.req.param('key');
  const { value, description } = await c.req.json();

  // Upsert setting
  await db.insert(settings)
    .values({ key, value, description, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, description, updatedAt: new Date() },
    });

  return c.json({ message: 'Setting updated' });
});

export { adminRoutes };
