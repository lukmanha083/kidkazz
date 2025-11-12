import { Hono } from 'hono';
import { createDb } from '../lib/db';
import { quotes, quoteItems } from '../db/schema';
import { eq, or, desc } from 'drizzle-orm';
import type { Env } from '../index';

const quotesRoutes = new Hono<{ Bindings: Env }>();

// GET /api/quotes - List user's quotes
quotesRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB);

  // TODO: Get userId from authenticated user
  const userId = c.req.query('userId');

  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const userQuotes = await db
    .select()
    .from(quotes)
    .where(or(
      eq(quotes.buyerId, userId),
      eq(quotes.supplierId, userId)
    ))
    .orderBy(desc(quotes.createdAt));

  return c.json({ quotes: userQuotes });
});

// GET /api/quotes/:id - Get quote details with items
quotesRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);

  if (!quote) {
    return c.json({ error: 'Quote not found' }, 404);
  }

  // Get quote items
  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id));

  return c.json({
    quote,
    items,
  });
});

export { quotesRoutes };
