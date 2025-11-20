import { z } from 'zod';
import { router, publicProcedure } from '@kidkazz/trpc';
import { ProductRepository } from '../repositories/ProductRepository';
import { EventPublisher } from '../events/EventPublisher';
import { CreateProduct } from '../../application/use-cases/CreateProduct';
import { UpdateStock } from '../../application/use-cases/UpdateStock';
import { ChangePrice } from '../../application/use-cases/ChangePrice';
import { GetProduct } from '../../application/queries/GetProduct';
import { ListProducts } from '../../application/queries/ListProducts';

/**
 * Product tRPC Router
 * Exposes product operations via type-safe RPC
 */
export const productRouter = router({
  // Query: Get product by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const repository = new ProductRepository(ctx.db);
      const query = new GetProduct(repository);
      return await query.execute(input.id);
    }),

  // Query: Get product by SKU
  getBySKU: publicProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ ctx, input }) => {
      const repository = new ProductRepository(ctx.db);
      const product = await repository.findBySKU(input.sku);
      if (!product) {
        throw new Error(`Product with SKU ${input.sku} not found`);
      }
      return product.toData();
    }),

  // Query: List all products
  list: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      category: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const repository = new ProductRepository(ctx.db);
      const query = new ListProducts(repository);
      return await query.execute(input);
    }),

  // Mutation: Create product
  create: publicProcedure
    .input(z.object({
      barcode: z.string(),
      name: z.string(),
      sku: z.string(),
      description: z.string().optional(),
      image: z.string().optional(),
      categoryId: z.string().optional(),
      price: z.number(),
      retailPrice: z.number().optional(),
      wholesalePrice: z.number().optional(),
      baseUnit: z.string(),
      wholesaleThreshold: z.number().optional(),
      minimumOrderQuantity: z.number().optional(),
      availableForRetail: z.boolean().optional(),
      availableForWholesale: z.boolean().optional(),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new ProductRepository(ctx.db);
      const eventPublisher = new EventPublisher(ctx.eventQueue);
      const useCase = new CreateProduct(repository, eventPublisher);
      return await useCase.execute(input);
    }),

  // Mutation: Update stock
  updateStock: publicProcedure
    .input(z.object({
      productId: z.string(),
      adjustment: z.number(),
      reason: z.string(),
      performedBy: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new ProductRepository(ctx.db);
      const eventPublisher = new EventPublisher(ctx.eventQueue);
      const useCase = new UpdateStock(repository, eventPublisher);
      return await useCase.execute(input);
    }),

  // Mutation: Change price
  changePrice: publicProcedure
    .input(z.object({
      productId: z.string(),
      priceType: z.enum(['retail', 'wholesale', 'base']),
      newPrice: z.number(),
      performedBy: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new ProductRepository(ctx.db);
      const eventPublisher = new EventPublisher(ctx.eventQueue);
      const useCase = new ChangePrice(repository, eventPublisher);
      return await useCase.execute(input);
    }),

  // Mutation: Delete product
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const repository = new ProductRepository(ctx.db);
      await repository.delete(input.id);
      return { message: 'Product deleted successfully' };
    }),
});
