import { Toaster } from '@/components/ui/sonner';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
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
