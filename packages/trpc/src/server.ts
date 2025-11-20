import { initTRPC } from '@trpc/server';
import type { BaseContext } from './context';

/**
 * Initialize tRPC with base context
 */
const t = initTRPC.context<BaseContext>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * Logging middleware
 */
export const loggerMiddleware = middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  console.log(`[${ctx.requestId}] ${type} ${path} - ${duration}ms`);

  return result;
});
