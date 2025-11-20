import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { warehouses } from '../infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper to generate ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Validation schemas
const createWarehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default('Indonesia'),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateWarehouseSchema = createWarehouseSchema.partial();

// GET /api/warehouses - List all warehouses
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const status = c.req.query('status');

  let query = db.select().from(warehouses);

  const allWarehouses = status
    ? await query.where(eq(warehouses.status, status)).all()
    : await query.all();

  return c.json({
    warehouses: allWarehouses,
    total: allWarehouses.length,
  });
});

// GET /api/warehouses/active - List active warehouses
app.get('/active', async (c) => {
  const db = drizzle(c.env.DB);

  const activeWarehouses = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.status, 'active'))
    .all();

  return c.json({
    warehouses: activeWarehouses,
    total: activeWarehouses.length,
  });
});

// GET /api/warehouses/:id - Get warehouse by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const warehouse = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .get();

  if (!warehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json(warehouse);
});

// POST /api/warehouses - Create new warehouse
app.post('/', zValidator('json', createWarehouseSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const now = new Date();
  const newWarehouse = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(warehouses).values(newWarehouse).run();

  return c.json(newWarehouse, 201);
});

// PUT /api/warehouses/:id - Update warehouse
app.put('/:id', zValidator('json', updateWarehouseSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  await db
    .update(warehouses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(warehouses.id, id))
    .run();

  const updated = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .get();

  return c.json(updated);
});

// DELETE /api/warehouses/:id - Delete warehouse
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(warehouses).where(eq(warehouses.id, id)).run();

  return c.json({ message: 'Warehouse deleted successfully' });
});

export default app;
