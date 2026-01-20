import { zValidator } from '@hono/zod-validator';
import { and, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { Customer } from '../domain/entities/Customer';
import { customers } from '../infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  customerType: z.enum(['retail', 'wholesale']),
  companyName: z.string().optional(),
  npwp: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTermDays: z.number().min(0).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

// GET /api/customers - List all customers
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const status = c.req.query('status');
  const customerType = c.req.query('type');
  const search = c.req.query('search');

  let query = db.select().from(customers).$dynamic();

  const conditions = [];
  if (status) {
    conditions.push(eq(customers.status, status));
  }
  if (customerType) {
    conditions.push(eq(customers.customerType, customerType));
  }
  if (search) {
    conditions.push(or(like(customers.name, `%${search}%`), like(customers.code, `%${search}%`)));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allCustomers = await query.all();

  return c.json({
    customers: allCustomers,
    total: allCustomers.length,
  });
});

// GET /api/customers/:id - Get customer by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const customer = await db.select().from(customers).where(eq(customers.id, id)).get();

  if (!customer) {
    return c.json({ error: 'Customer not found' }, 404);
  }

  return c.json(customer);
});

// POST /api/customers - Create new customer
app.post('/', zValidator('json', createCustomerSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Use domain entity to create customer
  const customer = Customer.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    customerType: data.customerType,
    companyName: data.companyName,
    npwp: data.npwp,
    creditLimit: data.creditLimit,
    paymentTermDays: data.paymentTermDays,
  });

  const customerData = customer.toData();

  await db
    .insert(customers)
    .values({
      id: customerData.id,
      code: customerData.code,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      customerType: customerData.customerType,
      companyName: customerData.companyName,
      npwp: customerData.npwp,
      creditLimit: customerData.creditLimit,
      creditUsed: customerData.creditUsed,
      paymentTermDays: customerData.paymentTermDays,
      loyaltyPoints: customerData.loyaltyPoints,
      membershipTier: customerData.membershipTier,
      totalOrders: customerData.totalOrders,
      totalSpent: customerData.totalSpent,
      lastOrderDate: customerData.lastOrderDate?.getTime() || null,
      status: customerData.status,
      notes: customerData.notes,
      createdAt: customerData.createdAt.getTime(),
      updatedAt: customerData.updatedAt.getTime(),
      createdBy: customerData.createdBy,
      updatedBy: customerData.updatedBy,
    })
    .run();

  return c.json(customerData, 201);
});

// PUT /api/customers/:id - Update customer
app.put('/:id', zValidator('json', updateCustomerSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(customers).where(eq(customers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Customer not found' }, 404);
  }

  await db
    .update(customers)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(customers.id, id))
    .run();

  const updated = await db.select().from(customers).where(eq(customers.id, id)).get();

  return c.json(updated);
});

// DELETE /api/customers/:id - Delete customer (soft delete via status)
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(customers).where(eq(customers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Customer not found' }, 404);
  }

  await db
    .update(customers)
    .set({ status: 'inactive', updatedAt: Date.now() })
    .where(eq(customers.id, id))
    .run();

  return c.json({ message: 'Customer deleted successfully' });
});

// POST /api/customers/:id/block - Block customer
app.post('/:id/block', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(customers).where(eq(customers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Customer not found' }, 404);
  }

  await db
    .update(customers)
    .set({ status: 'blocked', updatedAt: Date.now() })
    .where(eq(customers.id, id))
    .run();

  const updated = await db.select().from(customers).where(eq(customers.id, id)).get();

  return c.json(updated);
});

// POST /api/customers/:id/activate - Activate customer
app.post('/:id/activate', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(customers).where(eq(customers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Customer not found' }, 404);
  }

  await db
    .update(customers)
    .set({ status: 'active', updatedAt: Date.now() })
    .where(eq(customers.id, id))
    .run();

  const updated = await db.select().from(customers).where(eq(customers.id, id)).get();

  return c.json(updated);
});

export default app;
