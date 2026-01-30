import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'e2e-full-year',
    include: ['test/e2e/scenarios/full-year/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    environment: 'node',
    testTimeout: 180000, // 3 minutes for each test (many journal entries)
    hookTimeout: 60000, // 60 seconds for setup/teardown
    sequence: {
      shuffle: false,
    },
    fileParallelism: false,
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
