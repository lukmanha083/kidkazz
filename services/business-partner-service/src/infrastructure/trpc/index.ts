import { router } from '@kidkazz/trpc';
import { customerRouter } from './customerRouter';
import { employeeRouter } from './employeeRouter';
import { supplierRouter } from './supplierRouter';

/**
 * Main tRPC App Router for Business Partner Service
 * Combines all feature routers for service-to-service communication
 */
export const appRouter = router({
  customer: customerRouter,
  supplier: supplierRouter,
  employee: employeeRouter,
});

export type AppRouter = typeof appRouter;
