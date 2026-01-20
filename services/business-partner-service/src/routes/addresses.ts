import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { Address } from '../domain/value-objects/Address';
import { addresses } from '../infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createAddressSchema = z.object({
  ownerType: z.enum(['customer', 'supplier', 'employee']),
  ownerId: z.string().min(1),
  addressType: z.enum(['billing', 'shipping', 'home', 'office']),
  isPrimary: z.boolean().optional(),
  label: z.string().optional(),
  recipientName: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  subdistrict: z.string().optional(),
  district: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
});

const updateAddressSchema = createAddressSchema.partial().omit({ ownerType: true, ownerId: true });

// GET /api/addresses - List addresses by owner
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const ownerType = c.req.query('ownerType');
  const ownerId = c.req.query('ownerId');

  if (!ownerType || !ownerId) {
    return c.json({ error: 'ownerType and ownerId are required' }, 400);
  }

  const ownerAddresses = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.ownerType, ownerType), eq(addresses.ownerId, ownerId)))
    .all();

  return c.json({
    addresses: ownerAddresses,
    total: ownerAddresses.length,
  });
});

// GET /api/addresses/:id - Get address by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const address = await db.select().from(addresses).where(eq(addresses.id, id)).get();

  if (!address) {
    return c.json({ error: 'Address not found' }, 404);
  }

  return c.json(address);
});

// POST /api/addresses - Create new address
app.post('/', zValidator('json', createAddressSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Use domain value object to create address
  const address = Address.create({
    ownerType: data.ownerType,
    ownerId: data.ownerId,
    addressType: data.addressType,
    isPrimary: data.isPrimary,
    label: data.label,
    recipientName: data.recipientName,
    phone: data.phone,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2,
    subdistrict: data.subdistrict,
    district: data.district,
    city: data.city,
    province: data.province,
    postalCode: data.postalCode,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
    notes: data.notes,
  });

  const addressData = address.toData();

  // Use batch to ensure atomicity: unset existing primary + insert new address
  const statements: Parameters<typeof c.env.DB.batch>[0] = [];

  // If this is marked as primary, unset other primary addresses for this owner
  if (data.isPrimary) {
    statements.push(
      db
        .update(addresses)
        .set({ isPrimary: 0, updatedAt: Date.now() })
        .where(and(eq(addresses.ownerType, data.ownerType), eq(addresses.ownerId, data.ownerId)))
    );
  }

  statements.push(
    db.insert(addresses).values({
      id: addressData.id,
      ownerType: addressData.ownerType,
      ownerId: addressData.ownerId,
      addressType: addressData.addressType,
      isPrimary: addressData.isPrimary ? 1 : 0,
      label: addressData.label,
      recipientName: addressData.recipientName,
      phone: addressData.phone,
      addressLine1: addressData.addressLine1,
      addressLine2: addressData.addressLine2,
      subdistrict: addressData.subdistrict,
      district: addressData.district,
      city: addressData.city,
      province: addressData.province,
      postalCode: addressData.postalCode,
      country: addressData.country,
      latitude: addressData.latitude,
      longitude: addressData.longitude,
      notes: addressData.notes,
      createdAt: addressData.createdAt.getTime(),
      updatedAt: addressData.updatedAt.getTime(),
    })
  );

  await c.env.DB.batch(statements as Parameters<typeof c.env.DB.batch>[0]);

  return c.json(addressData, 201);
});

// PUT /api/addresses/:id - Update address
app.put('/:id', zValidator('json', updateAddressSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(addresses).where(eq(addresses.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Address not found' }, 404);
  }

  const updateData: Record<string, unknown> = { updatedAt: Date.now() };
  if (data.addressType !== undefined) updateData.addressType = data.addressType;
  if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary ? 1 : 0;
  if (data.label !== undefined) updateData.label = data.label;
  if (data.recipientName !== undefined) updateData.recipientName = data.recipientName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1;
  if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2;
  if (data.subdistrict !== undefined) updateData.subdistrict = data.subdistrict;
  if (data.district !== undefined) updateData.district = data.district;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.province !== undefined) updateData.province = data.province;
  if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.notes !== undefined) updateData.notes = data.notes;

  // Use batch to ensure atomicity when setting primary
  const statements: Parameters<typeof c.env.DB.batch>[0] = [];

  // If this is marked as primary, unset other primary addresses for this owner
  if (data.isPrimary) {
    statements.push(
      db
        .update(addresses)
        .set({ isPrimary: 0, updatedAt: Date.now() })
        .where(
          and(eq(addresses.ownerType, existing.ownerType), eq(addresses.ownerId, existing.ownerId))
        )
    );
  }

  statements.push(db.update(addresses).set(updateData).where(eq(addresses.id, id)));

  await c.env.DB.batch(statements as Parameters<typeof c.env.DB.batch>[0]);

  const updated = await db.select().from(addresses).where(eq(addresses.id, id)).get();

  return c.json(updated);
});

// DELETE /api/addresses/:id - Delete address
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(addresses).where(eq(addresses.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Address not found' }, 404);
  }

  await db.delete(addresses).where(eq(addresses.id, id)).run();

  return c.json({ message: 'Address deleted successfully' });
});

// POST /api/addresses/:id/set-primary - Set address as primary
app.post('/:id/set-primary', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(addresses).where(eq(addresses.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Address not found' }, 404);
  }

  // Use batch for atomicity: unset other primary addresses + set this one as primary
  await c.env.DB.batch([
    db
      .update(addresses)
      .set({ isPrimary: 0, updatedAt: Date.now() })
      .where(
        and(eq(addresses.ownerType, existing.ownerType), eq(addresses.ownerId, existing.ownerId))
      ),
    db.update(addresses).set({ isPrimary: 1, updatedAt: Date.now() }).where(eq(addresses.id, id)),
  ]);

  const updated = await db.select().from(addresses).where(eq(addresses.id, id)).get();

  return c.json(updated);
});

export default app;
