import { router } from '@kidkazz/trpc';
import { inventoryRouter } from './inventoryRouter';
import { warehouseRouter } from './warehouseRouter';

/**
 * Main tRPC App Router
 * Combines all feature routers
 */
export const appRouter = router({
  warehouse: warehouseRouter,
  inventory: inventoryRouter,
});

export type AppRouter = typeof appRouter;
