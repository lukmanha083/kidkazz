import type { AnyRouter } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { BaseContext } from './context';

/**
 * Create Hono middleware for tRPC
 */
export function createTRPCHandler<TRouter extends AnyRouter>(
  router: TRouter,
  createContext: (req: Request, env: any) => Promise<BaseContext>
) {
  return async (c: any) => {
    return fetchRequestHandler({
      endpoint: '/trpc',
      req: c.req.raw,
      router,
      createContext: () => createContext(c.req.raw, c.env),
      onError({ error, path }) {
        console.error(`❌ tRPC Error on ${path}:`, error);
      },
    });
  };
}
