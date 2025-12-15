import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Toaster } from '@/components/ui/sonner';
import type { RouterContext } from '../main';

/**
 * Root Route
 *
 * Uses createRootRouteWithContext for type-safe access to router context
 * (queryClient, etc.) in loaders throughout the route tree.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster position="top-right" />
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </>
  );
}
