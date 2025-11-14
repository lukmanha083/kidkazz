import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CreateProductUseCase } from '../../application/use-cases/CreateProduct';
import { GetProductUseCase } from '../../application/use-cases/GetProduct';
import { ListProductsUseCase } from '../../application/use-cases/ListProducts';
import { UpdateProductPriceUseCase } from '../../application/use-cases/UpdateProductPrice';
import { DrizzleProductRepository } from '../repositories/DrizzleProductRepository';

/**
 * Product Service HTTP Routes
 * Infrastructure layer - HTTP adapter
 */

type Bindings = {
  DB: D1Database;
  PRODUCT_EVENTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(3).max(50),
  description: z.string(),
  retailPrice: z.number().nullable(),
  wholesalePrice: z.number().positive(),
  availableForRetail: z.boolean(),
  availableForWholesale: z.boolean(),
  minimumOrderQuantity: z.number().int().positive().optional().default(1),
});

const updatePriceSchema = z.object({
  priceType: z.enum(['retail', 'wholesale']),
  newPrice: z.number().positive(),
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'product-service',
    timestamp: new Date().toISOString(),
  });
});

// Create product
app.post('/api/products', zValidator('json', createProductSchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const db = c.env.DB;

    // Initialize dependencies
    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleProductRepository(drizzleDb);
    const useCase = new CreateProductUseCase(repository);

    // Execute use case
    const result = await useCase.execute(input);

    if (!result.isSuccess) {
      return c.json(
        {
          error: result.error!.name,
          message: result.error!.message,
        },
        400
      );
    }

    return c.json(result.value, 201);
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
});

// Get product by ID
app.get('/api/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const db = c.env.DB;

    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleProductRepository(drizzleDb);
    const useCase = new GetProductUseCase(repository);

    const result = await useCase.execute(productId);

    if (!result.isSuccess) {
      return c.json(
        {
          error: result.error!.name,
          message: result.error!.message,
        },
        404
      );
    }

    return c.json(result.value);
  } catch (error) {
    console.error('Error getting product:', error);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
});

// List products
app.get('/api/products', async (c) => {
  try {
    const db = c.env.DB;

    // Parse query parameters
    const availableForRetail = c.req.query('availableForRetail');
    const availableForWholesale = c.req.query('availableForWholesale');
    const status = c.req.query('status') as 'active' | 'inactive' | 'discontinued' | undefined;

    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleProductRepository(drizzleDb);
    const useCase = new ListProductsUseCase(repository);

    const result = await useCase.execute({
      availableForRetail: availableForRetail === 'true' ? true : availableForRetail === 'false' ? false : undefined,
      availableForWholesale: availableForWholesale === 'true' ? true : availableForWholesale === 'false' ? false : undefined,
      status,
    });

    if (!result.isSuccess) {
      return c.json(
        {
          error: result.error!.name,
          message: result.error!.message,
        },
        400
      );
    }

    return c.json(result.value);
  } catch (error) {
    console.error('Error listing products:', error);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
});

// Update product price
app.patch('/api/products/:id/price', zValidator('json', updatePriceSchema), async (c) => {
  try {
    const productId = c.req.param('id');
    const input = c.req.valid('json');
    const db = c.env.DB;

    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleProductRepository(drizzleDb);
    const useCase = new UpdateProductPriceUseCase(repository);

    const result = await useCase.execute({
      productId,
      priceType: input.priceType,
      newPrice: input.newPrice,
    });

    if (!result.isSuccess) {
      return c.json(
        {
          error: result.error!.name,
          message: result.error!.message,
        },
        400
      );
    }

    return c.json({ message: 'Price updated successfully' });
  } catch (error) {
    console.error('Error updating product price:', error);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
});

export default app;
