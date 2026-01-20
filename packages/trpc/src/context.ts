import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

/**
 * Base context that all services can extend
 */
export interface BaseContext {
  db: D1Database;
  eventQueue?: Queue;
  userId?: string;
  requestId: string;
}

/**
 * Create context factory for tRPC
 */
export function createContextFactory<TEnv extends Record<string, any>>() {
  return async (opts: FetchCreateContextFnOptions, env: TEnv): Promise<BaseContext> => {
    return {
      db: env.DB,
      eventQueue: env.EVENTS_QUEUE || env.EVENT_QUEUE,
      userId: opts.req.headers.get('x-user-id') || undefined,
      requestId: crypto.randomUUID(),
    };
  };
}
