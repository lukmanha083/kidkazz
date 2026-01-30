import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'e2e',
    // Run all E2E scenario tests (1-month cycle)
    include: ['test/e2e/scenarios/*.test.ts'],
    exclude: ['node_modules', 'dist', 'test/e2e/scenarios/full-year/**'],
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60 seconds for API calls (balance calculations can take longer)
    hookTimeout: 60000, // 60 seconds for setup/teardown
    sequence: {
      // Run tests in order (scenarios depend on each other)
      shuffle: false,
    },
    // Run files sequentially to maintain state between scenarios
    fileParallelism: false,
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
