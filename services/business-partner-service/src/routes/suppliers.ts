import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { Supplier } from '../domain/entities/Supplier';
import { supplierContacts, suppliers } from '../infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createSupplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  entityType: z.enum(['person', 'company']).default('person'),
  companyName: z.string().optional(),
  npwp: z.string().optional(),
  paymentTermDays: z.number().min(0).optional(),
  leadTimeDays: z.number().min(0).optional(),
  minimumOrderAmount: z.number().min(0).optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

const bankInfoSchema = z.object({
  bankName: z.string().min(1),
  bankAccountNumber: z.string().min(10),
  bankAccountName: z.string().min(1),
});

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const updateContactSchema = contactSchema.partial();

// GET /api/suppliers - List all suppliers
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const status = c.req.query('status');
  const search = c.req.query('search');

  let query = db.select().from(suppliers).$dynamic();

  const conditions = [];
  if (status) {
    conditions.push(eq(suppliers.status, status));
  }
  if (search) {
    conditions.push(or(like(suppliers.name, `%${search}%`), like(suppliers.code, `%${search}%`)));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allSuppliers = await query.all();

  return c.json({
    suppliers: allSuppliers,
    total: allSuppliers.length,
  });
});

// GET /api/suppliers/:id - Get supplier by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const supplier = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  if (!supplier) {
    return c.json({ error: 'Supplier not found' }, 404);
  }

  return c.json(supplier);
});

// POST /api/suppliers - Create new supplier
app.post('/', zValidator('json', createSupplierSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Use domain entity to create supplier
  const supplier = Supplier.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    companyName: data.companyName,
    npwp: data.npwp,
    paymentTermDays: data.paymentTermDays,
    leadTimeDays: data.leadTimeDays,
    minimumOrderAmount: data.minimumOrderAmount,
  });

  const supplierData = supplier.toData();

  await db
    .insert(suppliers)
    .values({
      id: supplierData.id,
      code: supplierData.code,
      name: supplierData.name,
      email: supplierData.email,
      phone: supplierData.phone,
      entityType: data.entityType,
      companyName: supplierData.companyName,
      npwp: supplierData.npwp,
      paymentTermDays: supplierData.paymentTermDays,
      leadTimeDays: supplierData.leadTimeDays,
      minimumOrderAmount: supplierData.minimumOrderAmount,
      bankName: supplierData.bankName,
      bankAccountNumber: supplierData.bankAccountNumber,
      bankAccountName: supplierData.bankAccountName,
      rating: supplierData.rating,
      totalOrders: supplierData.totalOrders,
      totalPurchased: supplierData.totalPurchased,
      bestSellerProductCount: supplierData.bestSellerProductCount,
      lastOrderDate: supplierData.lastOrderDate?.getTime() || null,
      status: supplierData.status,
      notes: supplierData.notes,
      createdAt: supplierData.createdAt.getTime(),
      updatedAt: supplierData.updatedAt.getTime(),
      createdBy: supplierData.createdBy,
      updatedBy: supplierData.updatedBy,
    })
    .run();

  return c.json(supplierData, 201);
});

// PUT /api/suppliers/:id - Update supplier
app.put('/:id', zValidator('json', updateSupplierSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Supplier not found' }, 404);
  }

  await db
    .update(suppliers)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(suppliers.id, id))
    .run();

  const updated = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  return c.json(updated);
});

// PUT /api/suppliers/:id/bank-info - Update supplier bank info
app.put('/:id/bank-info', zValidator('json', bankInfoSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Supplier not found' }, 404);
  }

  await db
    .update(suppliers)
    .set({
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankAccountName: data.bankAccountName,
      updatedAt: Date.now(),
    })
    .where(eq(suppliers.id, id))
    .run();

  const updated = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  return c.json(updated);
});

// DELETE /api/suppliers/:id - Delete supplier (soft delete via status)
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Supplier not found' }, 404);
  }

  await db
    .update(suppliers)
    .set({ status: 'inactive', updatedAt: Date.now() })
    .where(eq(suppliers.id, id))
    .run();

  return c.json({ message: 'Supplier deleted successfully' });
});

// POST /api/suppliers/:id/block - Block supplier
app.post('/:id/block', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Supplier not found' }, 404);
  }

  await db
    .update(suppliers)
    .set({ status: 'blocked', updatedAt: Date.now() })
    .where(eq(suppliers.id, id))
    .run();

  const updated = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  return c.json(updated);
});

// POST /api/suppliers/:id/activate - Activate supplier
app.post('/:id/activate', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Supplier not found' }, 404);
  }

  await db
    .update(suppliers)
    .set({ status: 'active', updatedAt: Date.now() })
    .where(eq(suppliers.id, id))
    .run();

  const updated = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  return c.json(updated);
});

// ============================================================================
// SUPPLIER CONTACTS (Sales Persons)
// ============================================================================

// GET /api/suppliers/:id/contacts - List contacts for a supplier (excluding soft-deleted)
app.get('/:id/contacts', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Supplier not found' }, 404);
  }

  const contacts = await db
    .select()
    .from(supplierContacts)
    .where(and(eq(supplierContacts.supplierId, id), isNull(supplierContacts.deletedAt)))
    .all();

  return c.json({ contacts });
});

// POST /api/suppliers/:id/contacts - Add contact to supplier
app.post('/:id/contacts', zValidator('json', contactSchema), async (c) => {
  const supplierId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).get();

  if (!existing) {
    return c.json({ error: 'Supplier not found' }, 404);
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  // If this is primary, unset other primary contacts
  if (data.isPrimary) {
    await db
      .update(supplierContacts)
      .set({ isPrimary: 0, updatedAt: now })
      .where(eq(supplierContacts.supplierId, supplierId))
      .run();
  }

  await db
    .insert(supplierContacts)
    .values({
      id,
      supplierId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      position: data.position || null,
      isPrimary: data.isPrimary ? 1 : 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const contact = await db.select().from(supplierContacts).where(eq(supplierContacts.id, id)).get();

  return c.json(contact, 201);
});

// PUT /api/suppliers/:id/contacts/:contactId - Update contact
app.put('/:id/contacts/:contactId', zValidator('json', updateContactSchema), async (c) => {
  const supplierId = c.req.param('id');
  const contactId = c.req.param('contactId');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingContact = await db
    .select()
    .from(supplierContacts)
    .where(and(eq(supplierContacts.id, contactId), eq(supplierContacts.supplierId, supplierId)))
    .get();

  if (!existingContact) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  const now = Date.now();

  // If setting as primary, unset other primary contacts
  if (data.isPrimary) {
    await db
      .update(supplierContacts)
      .set({ isPrimary: 0, updatedAt: now })
      .where(eq(supplierContacts.supplierId, supplierId))
      .run();
  }

  const updateData: Record<string, unknown> = { updatedAt: now };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.position !== undefined) updateData.position = data.position || null;
  if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary ? 1 : 0;

  await db.update(supplierContacts).set(updateData).where(eq(supplierContacts.id, contactId)).run();

  const updated = await db
    .select()
    .from(supplierContacts)
    .where(eq(supplierContacts.id, contactId))
    .get();

  return c.json(updated);
});

// DELETE /api/suppliers/:id/contacts/:contactId - Soft delete contact
app.delete('/:id/contacts/:contactId', async (c) => {
  const supplierId = c.req.param('id');
  const contactId = c.req.param('contactId');
  const db = drizzle(c.env.DB);

  const existingContact = await db
    .select()
    .from(supplierContacts)
    .where(
      and(
        eq(supplierContacts.id, contactId),
        eq(supplierContacts.supplierId, supplierId),
        isNull(supplierContacts.deletedAt)
      )
    )
    .get();

  if (!existingContact) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  await db
    .update(supplierContacts)
    .set({
      deletedAt: new Date(),
      deletedBy: null, // TODO: Get from auth context when implemented
      status: 'inactive',
      updatedAt: Date.now(),
    })
    .where(eq(supplierContacts.id, contactId))
    .run();

  return c.json({ message: 'Contact deleted successfully' });
});

export default app;
