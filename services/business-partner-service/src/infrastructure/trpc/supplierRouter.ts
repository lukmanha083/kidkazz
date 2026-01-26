import { publicProcedure, router } from '@kidkazz/trpc';
import { and, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import { Supplier } from '../../domain/entities/Supplier';
import { supplierContacts, suppliers } from '../db/schema';

/**
 * Supplier tRPC Router
 * For service-to-service communication
 */
export const supplierRouter = router({
  // Query: Get supplier by ID
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);
    const supplier = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplier;
  }),

  // Query: Get supplier by code
  getByCode: publicProcedure.input(z.object({ code: z.string() })).query(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);
    const supplier = await db.select().from(suppliers).where(eq(suppliers.code, input.code)).get();

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplier;
  }),

  // Query: List suppliers with optional filters
  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);
      let query = db.select().from(suppliers).$dynamic();

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(suppliers.status, input.status));
      }
      if (input?.search) {
        conditions.push(
          or(like(suppliers.name, `%${input.search}%`), like(suppliers.code, `%${input.search}%`))
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const allSuppliers = await query.all();

      return {
        suppliers: allSuppliers,
        total: allSuppliers.length,
      };
    }),

  // Query: Get active suppliers (for procurement service)
  getActive: publicProcedure.query(async ({ ctx }) => {
    const db = drizzle(ctx.db);
    const activeSuppliers = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.status, 'active'))
      .all();

    return {
      suppliers: activeSuppliers,
      total: activeSuppliers.length,
    };
  }),

  // Mutation: Create supplier
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        entityType: z.enum(['person', 'company']).default('person'),
        companyName: z.string().optional(),
        npwp: z.string().optional(),
        paymentTermDays: z.number().min(0).optional(),
        leadTimeDays: z.number().min(0).optional(),
        minimumOrderAmount: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const supplier = Supplier.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        companyName: input.companyName,
        npwp: input.npwp,
        paymentTermDays: input.paymentTermDays,
        leadTimeDays: input.leadTimeDays,
        minimumOrderAmount: input.minimumOrderAmount,
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
          entityType: input.entityType,
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

      return supplierData;
    }),

  // Mutation: Update supplier
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          entityType: z.enum(['person', 'company']).optional(),
          companyName: z.string().optional(),
          npwp: z.string().optional(),
          paymentTermDays: z.number().min(0).optional(),
          leadTimeDays: z.number().min(0).optional(),
          minimumOrderAmount: z.number().min(0).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      if (!existing) {
        throw new Error('Supplier not found');
      }

      await db
        .update(suppliers)
        .set({ ...input.data, updatedAt: Date.now() })
        .where(eq(suppliers.id, input.id))
        .run();

      const updated = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      return updated;
    }),

  // Mutation: Update bank info
  updateBankInfo: publicProcedure
    .input(
      z.object({
        id: z.string(),
        bankName: z.string().min(1),
        bankAccountNumber: z.string().min(10),
        bankAccountName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      if (!existing) {
        throw new Error('Supplier not found');
      }

      await db
        .update(suppliers)
        .set({
          bankName: input.bankName,
          bankAccountNumber: input.bankAccountNumber,
          bankAccountName: input.bankAccountName,
          updatedAt: Date.now(),
        })
        .where(eq(suppliers.id, input.id))
        .run();

      const updated = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      return updated;
    }),

  // Mutation: Block supplier
  block: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);

    const existing = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

    if (!existing) {
      throw new Error('Supplier not found');
    }

    await db
      .update(suppliers)
      .set({ status: 'blocked', updatedAt: Date.now() })
      .where(eq(suppliers.id, input.id))
      .run();

    const updated = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

    return updated;
  }),

  // Mutation: Activate supplier
  activate: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);

    const existing = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

    if (!existing) {
      throw new Error('Supplier not found');
    }

    await db
      .update(suppliers)
      .set({ status: 'active', updatedAt: Date.now() })
      .where(eq(suppliers.id, input.id))
      .run();

    const updated = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

    return updated;
  }),

  // Mutation: Record purchase order (for procurement service)
  recordOrder: publicProcedure
    .input(
      z.object({
        id: z.string(),
        orderAmount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      if (!existing) {
        throw new Error('Supplier not found');
      }

      // Reconstitute domain entity to use business logic
      const supplier = Supplier.reconstitute({
        ...existing,
        status: existing.status as 'active' | 'inactive' | 'blocked',
        paymentTermDays: existing.paymentTermDays ?? 30,
        leadTimeDays: existing.leadTimeDays ?? 7,
        minimumOrderAmount: existing.minimumOrderAmount ?? 0,
        totalOrders: existing.totalOrders ?? 0,
        totalPurchased: existing.totalPurchased ?? 0,
        bestSellerProductCount: existing.bestSellerProductCount ?? 0,
        lastOrderDate: existing.lastOrderDate ? new Date(existing.lastOrderDate) : null,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(existing.updatedAt),
      });

      supplier.recordPurchaseOrder(input.orderAmount);
      const supplierData = supplier.toData();

      await db
        .update(suppliers)
        .set({
          totalOrders: supplierData.totalOrders,
          totalPurchased: supplierData.totalPurchased,
          lastOrderDate: supplierData.lastOrderDate?.getTime() || null,
          updatedAt: Date.now(),
        })
        .where(eq(suppliers.id, input.id))
        .run();

      const updated = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      return updated;
    }),

  // Mutation: Update rating (for procurement service)
  updateRating: publicProcedure
    .input(
      z.object({
        id: z.string(),
        rating: z.number().min(0).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      if (!existing) {
        throw new Error('Supplier not found');
      }

      // Reconstitute domain entity to use business logic
      const supplier = Supplier.reconstitute({
        ...existing,
        status: existing.status as 'active' | 'inactive' | 'blocked',
        paymentTermDays: existing.paymentTermDays ?? 30,
        leadTimeDays: existing.leadTimeDays ?? 7,
        minimumOrderAmount: existing.minimumOrderAmount ?? 0,
        totalOrders: existing.totalOrders ?? 0,
        totalPurchased: existing.totalPurchased ?? 0,
        bestSellerProductCount: existing.bestSellerProductCount ?? 0,
        lastOrderDate: existing.lastOrderDate ? new Date(existing.lastOrderDate) : null,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(existing.updatedAt),
      });

      supplier.updateRating(input.rating);
      const supplierData = supplier.toData();

      await db
        .update(suppliers)
        .set({
          rating: supplierData.rating,
          updatedAt: Date.now(),
        })
        .where(eq(suppliers.id, input.id))
        .run();

      const updated = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      return updated;
    }),

  // Mutation: Update best seller product count (for product service)
  updateBestSellerProductCount: publicProcedure
    .input(
      z.object({
        id: z.string(),
        count: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      if (!existing) {
        throw new Error('Supplier not found');
      }

      // Reconstitute domain entity to use business logic
      const supplier = Supplier.reconstitute({
        ...existing,
        status: existing.status as 'active' | 'inactive' | 'blocked',
        paymentTermDays: existing.paymentTermDays ?? 30,
        leadTimeDays: existing.leadTimeDays ?? 7,
        minimumOrderAmount: existing.minimumOrderAmount ?? 0,
        totalOrders: existing.totalOrders ?? 0,
        totalPurchased: existing.totalPurchased ?? 0,
        bestSellerProductCount: existing.bestSellerProductCount ?? 0,
        lastOrderDate: existing.lastOrderDate ? new Date(existing.lastOrderDate) : null,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(existing.updatedAt),
      });

      supplier.updateBestSellerProductCount(input.count);
      const supplierData = supplier.toData();

      await db
        .update(suppliers)
        .set({
          bestSellerProductCount: supplierData.bestSellerProductCount,
          updatedAt: Date.now(),
        })
        .where(eq(suppliers.id, input.id))
        .run();

      const updated = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

      return updated;
    }),

  // Query: Get bank info (for payment service)
  getBankInfo: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);
    const supplier = await db.select().from(suppliers).where(eq(suppliers.id, input.id)).get();

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return {
      id: supplier.id,
      name: supplier.name,
      bankName: supplier.bankName,
      bankAccountNumber: supplier.bankAccountNumber,
      bankAccountName: supplier.bankAccountName,
    };
  }),

  // ============================================================================
  // SUPPLIER CONTACTS (Sales Persons)
  // ============================================================================

  // Query: Get contacts by supplier ID
  getContacts: publicProcedure
    .input(z.object({ supplierId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);
      const contacts = await db
        .select()
        .from(supplierContacts)
        .where(eq(supplierContacts.supplierId, input.supplierId))
        .all();

      return { contacts };
    }),

  // Mutation: Add contact
  addContact: publicProcedure
    .input(
      z.object({
        supplierId: z.string(),
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      // Verify supplier exists
      const supplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId))
        .get();

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const id = crypto.randomUUID();
      const now = Date.now();

      // If this is primary, unset other primary contacts
      if (input.isPrimary) {
        await db
          .update(supplierContacts)
          .set({ isPrimary: 0, updatedAt: now })
          .where(eq(supplierContacts.supplierId, input.supplierId))
          .run();
      }

      await db
        .insert(supplierContacts)
        .values({
          id,
          supplierId: input.supplierId,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          position: input.position || null,
          isPrimary: input.isPrimary ? 1 : 0,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const contact = await db
        .select()
        .from(supplierContacts)
        .where(eq(supplierContacts.id, id))
        .get();

      return contact;
    }),

  // Mutation: Update contact
  updateContact: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          position: z.string().optional(),
          isPrimary: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db
        .select()
        .from(supplierContacts)
        .where(eq(supplierContacts.id, input.id))
        .get();

      if (!existing) {
        throw new Error('Contact not found');
      }

      const now = Date.now();

      // If setting as primary, unset other primary contacts
      if (input.data.isPrimary) {
        await db
          .update(supplierContacts)
          .set({ isPrimary: 0, updatedAt: now })
          .where(eq(supplierContacts.supplierId, existing.supplierId))
          .run();
      }

      const updateData: Record<string, unknown> = { updatedAt: now };
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.email !== undefined) updateData.email = input.data.email || null;
      if (input.data.phone !== undefined) updateData.phone = input.data.phone || null;
      if (input.data.position !== undefined) updateData.position = input.data.position || null;
      if (input.data.isPrimary !== undefined) updateData.isPrimary = input.data.isPrimary ? 1 : 0;

      await db
        .update(supplierContacts)
        .set(updateData)
        .where(eq(supplierContacts.id, input.id))
        .run();

      const updated = await db
        .select()
        .from(supplierContacts)
        .where(eq(supplierContacts.id, input.id))
        .get();

      return updated;
    }),

  // Mutation: Delete contact
  deleteContact: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db
        .select()
        .from(supplierContacts)
        .where(eq(supplierContacts.id, input.id))
        .get();

      if (!existing) {
        throw new Error('Contact not found');
      }

      await db.delete(supplierContacts).where(eq(supplierContacts.id, input.id)).run();

      return { message: 'Contact deleted successfully' };
    }),
});
