import { z } from 'zod';
import { router, publicProcedure } from '@kidkazz/trpc';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { EventPublisher } from '../events/EventPublisher';
import { AdjustInventory } from '../../application/use-cases/AdjustInventory';
import { GetInventory } from '../../application/queries/GetInventory';

/**
 * Inventory tRPC Router
 */
export const inventoryRouter = router({
  // Query: Get inventory for product
  getByProduct: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const repository = new InventoryRepository(ctx.db);
      const query = new GetInventory(repository);
      return await query.execute(input.productId);
    }),

  // Query: Get specific product-warehouse inventory
  getByProductAndWarehouse: publicProcedure
    .input(z.object({
      productId: z.string(),
      warehouseId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const repository = new InventoryRepository(ctx.db);
      const inventory = await repository.findByProductAndWarehouse(
        input.productId,
        input.warehouseId
      );
      if (!inventory) {
        throw new Error('Inventory record not found');
      }
      return inventory.toData();
    }),

  // Query: List all inventory
  list: publicProcedure
    .input(z.object({
      productId: z.string().optional(),
      warehouseId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const repository = new InventoryRepository(ctx.db);
      const inventories = await repository.findAll(input);
      return {
        inventory: inventories.map(inv => inv.toData()),
        total: inventories.length,
      };
    }),

  // Mutation: Adjust inventory
  adjust: publicProcedure
    .input(z.object({
      productId: z.string(),
      warehouseId: z.string(),
      quantity: z.number(),
      movementType: z.enum(['in', 'out', 'adjustment']),
      source: z.enum(['warehouse', 'pos']).optional(), // NEW: Operation source
      reason: z.string().optional(),
      performedBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new InventoryRepository(ctx.db);
      const eventPublisher = new EventPublisher(ctx.eventQueue);
      const useCase = new AdjustInventory(repository, eventPublisher);
      return await useCase.execute(input);
    }),

  // Mutation: Set minimum stock
  setMinimumStock: publicProcedure
    .input(z.object({
      inventoryId: z.string(),
      minimumStock: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new InventoryRepository(ctx.db);
      const inventory = await repository.findById(input.inventoryId);
      if (!inventory) {
        throw new Error('Inventory record not found');
      }
      inventory.setMinimumStock(input.minimumStock);
      await repository.save(inventory);
      return { message: 'Minimum stock updated successfully' };
    }),
});
