/**
 * DDD Migration Runner
 *
 * This script runs the Phase 2 data migration from Product Service to Inventory Service.
 *
 * Usage:
 *   1. Deploy as a Cloudflare Worker with access to both databases
 *   2. Call the /migrate endpoint to run migration
 *   3. Call the /validate endpoint to verify results
 *
 * Example with wrangler:
 *   wrangler dev scripts/run-ddd-migration.ts --local
 *   curl http://localhost:8787/migrate?dryRun=true
 */

import {
  runFullMigration,
  validateMigration,
  MigrationResult,
} from './migrate-to-inventory-service';

interface Env {
  PRODUCT_DB: D1Database;
  INVENTORY_DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        endpoints: {
          '/migrate': 'Run full migration (use ?dryRun=true for dry run)',
          '/validate': 'Validate migration results',
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Run migration
    if (url.pathname === '/migrate') {
      const dryRun = url.searchParams.get('dryRun') === 'true';
      const verbose = url.searchParams.get('verbose') === 'true';

      console.log(`Starting migration (dryRun: ${dryRun}, verbose: ${verbose})`);

      try {
        const result = await runFullMigration(
          env.PRODUCT_DB,
          env.INVENTORY_DB,
          { dryRun, verbose }
        );

        return new Response(JSON.stringify({
          success: true,
          dryRun,
          result,
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate migration
    if (url.pathname === '/validate') {
      try {
        const result = await validateMigration(
          env.PRODUCT_DB,
          env.INVENTORY_DB
        );

        return new Response(JSON.stringify({
          success: true,
          validation: result,
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
