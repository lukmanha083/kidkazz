import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/query-client';
import './index.css';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

/**
 * Router Context Type
 * Provides type-safe access to shared dependencies in route loaders
 */
export interface RouterContext {
  queryClient: QueryClient;
}

// Create a new router instance with context
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  // Default preload behavior - preload on intent (hover/focus)
  defaultPreload: 'intent',
  // Preload delay in ms
  defaultPreloadDelay: 100,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a <div id="root"></div> in your HTML.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
