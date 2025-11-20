import { createTRPCClient as createTRPCClientBase, httpBatchLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';

/**
 * Create tRPC client for service-to-service communication
 * Works with Cloudflare Workers service bindings
 */
export function createTRPCClient<TRouter extends AnyRouter>(serviceBinding: Fetcher) {
  return createTRPCClientBase<TRouter>({
    links: [
      (httpBatchLink({
        url: '/trpc',
        fetch: (url: any, options: any) => {
          // Use service binding instead of HTTP
          return serviceBinding.fetch(url, options);
        },
      }) as any),
    ],
  });
}

/**
 * Create tRPC client for HTTP communication (development)
 */
export function createTRPCClientHTTP<TRouter extends AnyRouter>(baseUrl: string) {
  return createTRPCClientBase<TRouter>({
    links: [
      (httpBatchLink({
        url: `${baseUrl}/trpc`,
      }) as any),
    ],
  });
}
