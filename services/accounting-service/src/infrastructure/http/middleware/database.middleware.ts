import * as schema from '@/infrastructure/db/schema';
import { drizzle } from 'drizzle-orm/d1';
import type { Context, Next } from 'hono';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  userId: string;
};

/**
 * Middleware to inject Drizzle database instance
 */
export async function databaseMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const db = drizzle(c.env.DB, { schema });
  c.set('db', db);
  await next();
}
