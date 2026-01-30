/**
 * E2E Test Database Helper
 *
 * Uses wrangler D1 commands with --remote flag to interact with
 * the real Cloudflare D1 database for E2E testing.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const SERVICE_DIR = join(import.meta.dirname, '../../..');
const DATABASE_NAME = 'accounting-db';

export interface D1Result {
  success: boolean;
  results?: Record<string, unknown>[];
  error?: string;
}

/**
 * Execute SQL command on remote D1 database
 * Uses a temp file to avoid shell escaping issues (security best practice)
 */
export function executeD1(sql: string): D1Result {
  // Write SQL to a temp file to avoid shell injection vulnerabilities
  const tempFile = join(tmpdir(), `d1-query-${randomBytes(8).toString('hex')}.sql`);

  try {
    writeFileSync(tempFile, sql, 'utf-8');

    const result = execSync(
      `npx wrangler d1 execute ${DATABASE_NAME} --remote --file="${tempFile}"`,
      {
        cwd: SERVICE_DIR,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    // Parse JSON output if present
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return {
        success: true,
        results: JSON.parse(jsonMatch[0]),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Execute SQL file on remote D1 database
 */
export function executeD1File(filePath: string): D1Result {
  try {
    execSync(`npx wrangler d1 execute ${DATABASE_NAME} --remote --file="${filePath}"`, {
      cwd: SERVICE_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clear test data from the database
 * Uses a test prefix to identify and clean up test data only
 */
export function clearTestData(testPrefix: string): void {
  const tables = [
    'journal_lines',
    'journal_entries',
    'account_balances',
    'fiscal_periods',
  ];

  for (const table of tables) {
    try {
      // Delete entries with test prefix in reference or notes
      if (table === 'journal_entries') {
        executeD1(`DELETE FROM ${table} WHERE reference LIKE '${testPrefix}%'`);
      } else if (table === 'journal_lines') {
        executeD1(`DELETE FROM ${table} WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference LIKE '${testPrefix}%')`);
      } else if (table === 'fiscal_periods') {
        // Only delete test fiscal periods (use a test year like 9999)
        executeD1(`DELETE FROM ${table} WHERE year = 9999`);
      } else if (table === 'account_balances') {
        executeD1(`DELETE FROM ${table} WHERE fiscal_year = 9999`);
      }
    } catch {
      // Table might not exist or constraint issues, continue
    }
  }
}

/**
 * Generate unique test reference with timestamp
 */
export function generateTestRef(prefix: string): string {
  const timestamp = Date.now();
  return `E2E-${prefix}-${timestamp}`;
}
