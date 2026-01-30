/**
 * Test Utilities Routes
 *
 * Endpoints for E2E test data management.
 * WARNING: These endpoints delete data - use only in test environments!
 */

import {
  journalEntries,
  journalLines,
  accountBalances,
  fiscalPeriods,
} from '@/infrastructure/db/schema';
import type * as schema from '@/infrastructure/db/schema';
import { like, inArray, and, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const testUtilitiesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * DELETE /test-utilities/cleanup-e2e
 *
 * Deletes all E2E test data (journal entries with 'E2E-' prefix).
 * Also resets fiscal periods to Open status for re-testing.
 *
 * Query params:
 * - fiscalYear: Cleanup data for specific fiscal year (required)
 * - resetPeriods: If true, resets fiscal periods to Open status (default: true)
 */
testUtilitiesRoutes.delete('/cleanup-e2e', async (c) => {
  const db = c.get('db');
  const fiscalYear = Number(c.req.query('fiscalYear'));
  const resetPeriods = c.req.query('resetPeriods') !== 'false';

  if (!fiscalYear || isNaN(fiscalYear)) {
    return c.json(
      { success: false, error: 'fiscalYear query parameter is required' },
      400
    );
  }

  try {
    // Step 1: Find all E2E journal entries for the fiscal year
    const e2eEntries = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          like(journalEntries.reference, 'E2E-%'),
          eq(journalEntries.fiscalYear, fiscalYear)
        )
      );

    const entryIds = e2eEntries.map((e) => e.id);
    let deletedLines = 0;
    let deletedEntries = 0;

    if (entryIds.length > 0) {
      // Step 2: Delete journal lines for E2E entries (in batches to avoid query limits)
      const batchSize = 100;
      for (let i = 0; i < entryIds.length; i += batchSize) {
        const batch = entryIds.slice(i, i + batchSize);
        const deleteResult = await db
          .delete(journalLines)
          .where(inArray(journalLines.journalEntryId, batch));
        deletedLines += (deleteResult as { rowsAffected?: number }).rowsAffected ?? batch.length;
      }

      // Step 3: Delete E2E journal entries (in batches)
      for (let i = 0; i < entryIds.length; i += batchSize) {
        const batch = entryIds.slice(i, i + batchSize);
        const deleteResult = await db
          .delete(journalEntries)
          .where(inArray(journalEntries.id, batch));
        deletedEntries += (deleteResult as { rowsAffected?: number }).rowsAffected ?? batch.length;
      }
    }

    // Step 4: Delete account balances for the fiscal year
    const balanceDeleteResult = await db
      .delete(accountBalances)
      .where(eq(accountBalances.fiscalYear, fiscalYear));
    const deletedBalances = (balanceDeleteResult as { rowsAffected?: number }).rowsAffected ?? 0;

    // Step 5: Reset fiscal periods to Open status if requested
    let resetPeriodsCount = 0;
    if (resetPeriods) {
      const updateResult = await db
        .update(fiscalPeriods)
        .set({
          status: 'Open',
          closedAt: null,
          closedBy: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(fiscalPeriods.fiscalYear, fiscalYear));
      resetPeriodsCount = (updateResult as { rowsAffected?: number }).rowsAffected ?? 0;
    }

    return c.json({
      success: true,
      data: {
        fiscalYear,
        deletedJournalLines: deletedLines,
        deletedJournalEntries: deletedEntries,
        deletedAccountBalances: deletedBalances,
        resetFiscalPeriods: resetPeriodsCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cleanup failed';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /test-utilities/e2e-stats
 *
 * Returns statistics about E2E test data in the database.
 */
testUtilitiesRoutes.get('/e2e-stats', async (c) => {
  const db = c.get('db');
  const fiscalYear = Number(c.req.query('fiscalYear')) || new Date().getFullYear();

  try {
    // Count E2E journal entries
    const e2eEntries = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          like(journalEntries.reference, 'E2E-%'),
          eq(journalEntries.fiscalYear, fiscalYear)
        )
      );

    // Get fiscal period statuses
    const periods = await db
      .select({
        fiscalMonth: fiscalPeriods.fiscalMonth,
        status: fiscalPeriods.status,
      })
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.fiscalYear, fiscalYear))
      .orderBy(fiscalPeriods.fiscalMonth);

    return c.json({
      success: true,
      data: {
        fiscalYear,
        e2eJournalEntryCount: e2eEntries.length,
        fiscalPeriods: periods,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    return c.json({ success: false, error: message }, 500);
  }
});

export { testUtilitiesRoutes };
