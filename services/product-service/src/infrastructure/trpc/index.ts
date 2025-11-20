import { router } from '@kidkazz/trpc';
import { productRouter } from './productRouter';

/**
 * Main tRPC App Router
 * Combines all feature routers
 */
export const appRouter = router({
  product: productRouter,
});

export type AppRouter = typeof appRouter;
