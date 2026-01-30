import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['test/e2e/scenarios/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds for API calls
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
