import { publicProcedure, router } from '@kidkazz/trpc';
import { and, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import { Customer } from '../../domain/entities/Customer';
import { customers } from '../db/schema';

/**
 * Customer tRPC Router
 * For service-to-service communication
 */
export const customerRouter = router({
  // Query: Get customer by ID
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);
    const customer = await db.select().from(customers).where(eq(customers.id, input.id)).get();

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }),

  // Query: Get customer by code
  getByCode: publicProcedure.input(z.object({ code: z.string() })).query(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);
    const customer = await db.select().from(customers).where(eq(customers.code, input.code)).get();

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }),

  // Query: List customers with optional filters
  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          customerType: z.enum(['retail', 'wholesale']).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);
      let query = db.select().from(customers).$dynamic();

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(customers.status, input.status));
      }
      if (input?.customerType) {
        conditions.push(eq(customers.customerType, input.customerType));
      }
      if (input?.search) {
        conditions.push(
          or(like(customers.name, `%${input.search}%`), like(customers.code, `%${input.search}%`))
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const allCustomers = await query.all();

      return {
        customers: allCustomers,
        total: allCustomers.length,
      };
    }),

  // Mutation: Create customer
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        customerType: z.enum(['retail', 'wholesale']),
        entityType: z.enum(['person', 'company']).default('person'),
        birthDate: z.string().optional(), // ISO date string for person entities
        companyName: z.string().optional(),
        npwp: z.string().optional(),
        creditLimit: z.number().min(0).optional(),
        paymentTermDays: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const customer = Customer.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        customerType: input.customerType,
        companyName: input.companyName,
        npwp: input.npwp,
        creditLimit: input.creditLimit,
        paymentTermDays: input.paymentTermDays,
      });

      const customerData = customer.toData();

      // Parse birthDate if provided (for person entities)
      const dateOfBirth = input.birthDate ? new Date(input.birthDate).getTime() : null;

      await db
        .insert(customers)
        .values({
          id: customerData.id,
          code: customerData.code,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          customerType: customerData.customerType,
          entityType: input.entityType,
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
          dateOfBirth,
          status: customerData.status,
          notes: customerData.notes,
          createdAt: customerData.createdAt.getTime(),
          updatedAt: customerData.updatedAt.getTime(),
          createdBy: customerData.createdBy,
          updatedBy: customerData.updatedBy,
        })
        .run();

      return customerData;
    }),

  // Mutation: Update customer
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          entityType: z.enum(['person', 'company']).optional(),
          birthDate: z.string().optional(), // ISO date string for person entities
          companyName: z.string().optional(),
          npwp: z.string().optional(),
          creditLimit: z.number().min(0).optional(),
          paymentTermDays: z.number().min(0).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      if (!existing) {
        throw new Error('Customer not found');
      }

      // Extract birthDate and convert to timestamp if provided
      const { birthDate, ...restData } = input.data;
      const updateData: Record<string, unknown> = { ...restData, updatedAt: Date.now() };
      if (birthDate !== undefined) {
        updateData.dateOfBirth = birthDate ? new Date(birthDate).getTime() : null;
      }

      await db.update(customers).set(updateData).where(eq(customers.id, input.id)).run();

      const updated = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      return updated;
    }),

  // Mutation: Block customer
  block: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);

    const existing = await db.select().from(customers).where(eq(customers.id, input.id)).get();

    if (!existing) {
      throw new Error('Customer not found');
    }

    await db
      .update(customers)
      .set({ status: 'blocked', updatedAt: Date.now() })
      .where(eq(customers.id, input.id))
      .run();

    const updated = await db.select().from(customers).where(eq(customers.id, input.id)).get();

    return updated;
  }),

  // Mutation: Activate customer
  activate: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);

    const existing = await db.select().from(customers).where(eq(customers.id, input.id)).get();

    if (!existing) {
      throw new Error('Customer not found');
    }

    await db
      .update(customers)
      .set({ status: 'active', updatedAt: Date.now() })
      .where(eq(customers.id, input.id))
      .run();

    const updated = await db.select().from(customers).where(eq(customers.id, input.id)).get();

    return updated;
  }),

  // Mutation: Add loyalty points (for service-to-service - e.g., order service)
  addLoyaltyPoints: publicProcedure
    .input(
      z.object({
        id: z.string(),
        points: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      if (!existing) {
        throw new Error('Customer not found');
      }

      if (existing.customerType !== 'retail') {
        throw new Error('Loyalty points only apply to retail customers');
      }

      // Reconstitute domain entity to use business logic
      const customer = Customer.reconstitute({
        ...existing,
        customerType: existing.customerType as 'retail' | 'wholesale',
        status: existing.status as 'active' | 'inactive' | 'blocked',
        membershipTier: existing.membershipTier as 'bronze' | 'silver' | 'gold' | null,
        creditLimit: existing.creditLimit ?? 0,
        creditUsed: existing.creditUsed ?? 0,
        paymentTermDays: existing.paymentTermDays ?? 0,
        loyaltyPoints: existing.loyaltyPoints ?? 0,
        totalOrders: existing.totalOrders ?? 0,
        totalSpent: existing.totalSpent ?? 0,
        lastOrderDate: existing.lastOrderDate ? new Date(existing.lastOrderDate) : null,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(existing.updatedAt),
      });

      customer.addLoyaltyPoints(input.points);
      const customerData = customer.toData();

      await db
        .update(customers)
        .set({
          loyaltyPoints: customerData.loyaltyPoints,
          membershipTier: customerData.membershipTier,
          updatedAt: Date.now(),
        })
        .where(eq(customers.id, input.id))
        .run();

      const updated = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      return updated;
    }),

  // Mutation: Record order (for service-to-service - e.g., order service)
  recordOrder: publicProcedure
    .input(
      z.object({
        id: z.string(),
        orderAmount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      if (!existing) {
        throw new Error('Customer not found');
      }

      // Reconstitute domain entity to use business logic
      const customer = Customer.reconstitute({
        ...existing,
        customerType: existing.customerType as 'retail' | 'wholesale',
        status: existing.status as 'active' | 'inactive' | 'blocked',
        membershipTier: existing.membershipTier as 'bronze' | 'silver' | 'gold' | null,
        creditLimit: existing.creditLimit ?? 0,
        creditUsed: existing.creditUsed ?? 0,
        paymentTermDays: existing.paymentTermDays ?? 0,
        loyaltyPoints: existing.loyaltyPoints ?? 0,
        totalOrders: existing.totalOrders ?? 0,
        totalSpent: existing.totalSpent ?? 0,
        lastOrderDate: existing.lastOrderDate ? new Date(existing.lastOrderDate) : null,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(existing.updatedAt),
      });

      customer.recordOrder(input.orderAmount);
      const customerData = customer.toData();

      await db
        .update(customers)
        .set({
          totalOrders: customerData.totalOrders,
          totalSpent: customerData.totalSpent,
          lastOrderDate: customerData.lastOrderDate?.getTime() || null,
          updatedAt: Date.now(),
        })
        .where(eq(customers.id, input.id))
        .run();

      const updated = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      return updated;
    }),

  // Query: Check credit availability (for order service)
  checkCredit: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      if (!existing) {
        throw new Error('Customer not found');
      }

      // Reconstitute domain entity to use business logic
      const customer = Customer.reconstitute({
        ...existing,
        customerType: existing.customerType as 'retail' | 'wholesale',
        status: existing.status as 'active' | 'inactive' | 'blocked',
        membershipTier: existing.membershipTier as 'bronze' | 'silver' | 'gold' | null,
        creditLimit: existing.creditLimit ?? 0,
        creditUsed: existing.creditUsed ?? 0,
        paymentTermDays: existing.paymentTermDays ?? 0,
        loyaltyPoints: existing.loyaltyPoints ?? 0,
        totalOrders: existing.totalOrders ?? 0,
        totalSpent: existing.totalSpent ?? 0,
        lastOrderDate: existing.lastOrderDate ? new Date(existing.lastOrderDate) : null,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(existing.updatedAt),
      });

      return {
        hasCredit: customer.hasAvailableCredit(input.amount),
        availableCredit: customer.getAvailableCredit(),
        requestedAmount: input.amount,
      };
    }),

  // Mutation: Use credit (for order service)
  useCredit: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      if (!existing) {
        throw new Error('Customer not found');
      }

      // Reconstitute domain entity to use business logic
      const customer = Customer.reconstitute({
        ...existing,
        customerType: existing.customerType as 'retail' | 'wholesale',
        status: existing.status as 'active' | 'inactive' | 'blocked',
        membershipTier: existing.membershipTier as 'bronze' | 'silver' | 'gold' | null,
        creditLimit: existing.creditLimit ?? 0,
        creditUsed: existing.creditUsed ?? 0,
        paymentTermDays: existing.paymentTermDays ?? 0,
        loyaltyPoints: existing.loyaltyPoints ?? 0,
        totalOrders: existing.totalOrders ?? 0,
        totalSpent: existing.totalSpent ?? 0,
        lastOrderDate: existing.lastOrderDate ? new Date(existing.lastOrderDate) : null,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(existing.updatedAt),
      });

      customer.useCreditAmount(input.amount);
      const customerData = customer.toData();

      await db
        .update(customers)
        .set({
          creditUsed: customerData.creditUsed,
          updatedAt: Date.now(),
        })
        .where(eq(customers.id, input.id))
        .run();

      const updated = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      return updated;
    }),

  // Mutation: Release credit (for order cancellation)
  releaseCredit: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      if (!existing) {
        throw new Error('Customer not found');
      }

      // Reconstitute domain entity to use business logic
      const customer = Customer.reconstitute({
        ...existing,
        customerType: existing.customerType as 'retail' | 'wholesale',
        status: existing.status as 'active' | 'inactive' | 'blocked',
        membershipTier: existing.membershipTier as 'bronze' | 'silver' | 'gold' | null,
        creditLimit: existing.creditLimit ?? 0,
        creditUsed: existing.creditUsed ?? 0,
        paymentTermDays: existing.paymentTermDays ?? 0,
        loyaltyPoints: existing.loyaltyPoints ?? 0,
        totalOrders: existing.totalOrders ?? 0,
        totalSpent: existing.totalSpent ?? 0,
        lastOrderDate: existing.lastOrderDate ? new Date(existing.lastOrderDate) : null,
        createdAt: new Date(existing.createdAt),
        updatedAt: new Date(existing.updatedAt),
      });

      customer.releaseCreditAmount(input.amount);
      const customerData = customer.toData();

      await db
        .update(customers)
        .set({
          creditUsed: customerData.creditUsed,
          updatedAt: Date.now(),
        })
        .where(eq(customers.id, input.id))
        .run();

      const updated = await db.select().from(customers).where(eq(customers.id, input.id)).get();

      return updated;
    }),
});
