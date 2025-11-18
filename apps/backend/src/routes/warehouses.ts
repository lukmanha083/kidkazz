import { Hono } from 'hono';
import { createDb } from '../lib/db';
import { warehouses } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../index';

const warehousesRoutes = new Hono<{ Bindings: Env }>();

// GET /api/warehouses - List all warehouses
warehousesRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB);

  const allWarehouses = await db
    .select()
    .from(warehouses)
    .orderBy(desc(warehouses.createdAt));

  return c.json({ warehouses: allWarehouses });
});

// GET /api/warehouses/active - List only active warehouses
warehousesRoutes.get('/active', async (c) => {
  const db = createDb(c.env.DB);

  const activeWarehouses = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.status, 'Active'))
    .orderBy(desc(warehouses.createdAt));

  return c.json({ warehouses: activeWarehouses });
});

// GET /api/warehouses/:id - Get warehouse details
warehousesRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .limit(1);

  if (!warehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json({ warehouse });
});

// POST /api/warehouses - Create new warehouse
warehousesRoutes.post('/', async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  const newWarehouse = {
    id: `WH-${Date.now()}`,
    code: body.code,
    name: body.name,
    location: body.location || body.city,
    address: body.address,
    city: body.city,
    postalCode: body.postalCode,
    phone: body.phone,
    manager: body.manager,
    rack: body.rack,
    bin: body.bin,
    status: body.status || 'Active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(warehouses).values(newWarehouse);

  return c.json({ warehouse: newWarehouse }, 201);
});

// PUT /api/warehouses/:id - Update warehouse
warehousesRoutes.put('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const [existingWarehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .limit(1);

  if (!existingWarehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  const updatedWarehouse = {
    code: body.code,
    name: body.name,
    location: body.location || body.city,
    address: body.address,
    city: body.city,
    postalCode: body.postalCode,
    phone: body.phone,
    manager: body.manager,
    rack: body.rack,
    bin: body.bin,
    status: body.status,
    updatedAt: new Date(),
  };

  await db
    .update(warehouses)
    .set(updatedWarehouse)
    .where(eq(warehouses.id, id));

  return c.json({ warehouse: { ...existingWarehouse, ...updatedWarehouse } });
});

// DELETE /api/warehouses/:id - Delete warehouse
warehousesRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [existingWarehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .limit(1);

  if (!existingWarehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  await db.delete(warehouses).where(eq(warehouses.id, id));

  return c.json({ message: 'Warehouse deleted successfully' });
});

export { warehousesRoutes };
