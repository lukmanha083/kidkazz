import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/database/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
});
