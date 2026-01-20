import { publicProcedure, router } from '@kidkazz/trpc';
import { z } from 'zod';
import { ListWarehouses } from '../../application/queries/ListWarehouses';
import { CreateWarehouse } from '../../application/use-cases/CreateWarehouse';
import { UpdateWarehouse } from '../../application/use-cases/UpdateWarehouse';
import { EventPublisher } from '../events/EventPublisher';
import { WarehouseRepository } from '../repositories/WarehouseRepository';

/**
 * Warehouse tRPC Router
 */
export const warehouseRouter = router({
  // Query: Get warehouse by ID
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const repository = new WarehouseRepository(ctx.db);
    const warehouse = await repository.findById(input.id);
    if (!warehouse) {
      throw new Error(`Warehouse ${input.id} not found`);
    }
    return warehouse.toData();
  }),

  // Query: List all warehouses
  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const repository = new WarehouseRepository(ctx.db);
      const query = new ListWarehouses(repository);
      return await query.execute(input?.status);
    }),

  // Query: List active warehouses
  listActive: publicProcedure.query(async ({ ctx }) => {
    const repository = new WarehouseRepository(ctx.db);
    const warehouses = await repository.findActive();
    return {
      warehouses: warehouses.map((w) => w.toData()),
      total: warehouses.length,
    };
  }),

  // Mutation: Create warehouse
  create: publicProcedure
    .input(
      z.object({
        code: z.string(),
        name: z.string(),
        addressLine1: z.string(),
        addressLine2: z.string().optional(),
        city: z.string(),
        province: z.string(),
        postalCode: z.string(),
        country: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const repository = new WarehouseRepository(ctx.db);
      const eventPublisher = new EventPublisher(ctx.eventQueue);
      const useCase = new CreateWarehouse(repository, eventPublisher);
      return await useCase.execute(input);
    }),

  // Mutation: Update warehouse
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const repository = new WarehouseRepository(ctx.db);
      const eventPublisher = new EventPublisher(ctx.eventQueue);
      const useCase = new UpdateWarehouse(repository, eventPublisher);
      return await useCase.execute(input);
    }),

  // Mutation: Delete warehouse
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const repository = new WarehouseRepository(ctx.db);
    await repository.delete(input.id);
    return { message: 'Warehouse deleted successfully' };
  }),
});
