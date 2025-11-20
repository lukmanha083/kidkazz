import { router } from '@kidkazz/trpc';
import { warehouseRouter } from './warehouseRouter';
import { inventoryRouter } from './inventoryRouter';

/**
 * Main tRPC App Router
 * Combines all feature routers
 */
export const appRouter = router({
  warehouse: warehouseRouter,
  inventory: inventoryRouter,
});

export type AppRouter = typeof appRouter;
