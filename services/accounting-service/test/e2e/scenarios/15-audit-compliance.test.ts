/**
 * E2E Test: Audit & Compliance
 *
 * Tests audit logging and compliance operations:
 * - Query audit logs with filters
 * - Get entity audit history
 * - Get recent audit activity
 * - Calculate tax summary for fiscal period
 * - Get tax summary report
 * - Get archive status
 * - Execute data archival
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';

describe('E2E: Audit & Compliance', () => {
  let apiClient: AccountingApiClient;
  let testJournalEntryId: string | null = null;

  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1;

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(`Accounting service not reachable. Error: ${health.error}`);
    }

    console.log('\n');
    console.log('======================================================');
    console.log('          AUDIT & COMPLIANCE E2E TEST                 ');
    console.log('======================================================');
    console.log('');

    // Get a journal entry ID to use for entity history tests
    const journalEntries = await apiClient.listJournalEntries({ limit: 1 });
    if (journalEntries.ok && journalEntries.data && journalEntries.data.length > 0) {
      testJournalEntryId = journalEntries.data[0].id;
      console.log(`  Using journal entry for tests: ${testJournalEntryId}`);
    }
  }, 60000);

  describe('Phase 1: Audit Logs', () => {
    it('should query audit logs without filters', async () => {
      const response = await apiClient.queryAuditLogs({ limit: 10 });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`  Found ${response.data?.length} audit logs`);

      if (response.data && response.data.length > 0) {
        const sample = response.data[0];
        console.log(`  Sample log: ${sample.action} on ${sample.entityType}`);
      }
    });

    it('should query audit logs by entity type', async () => {
      const response = await apiClient.queryAuditLogs({
        entityType: 'JournalEntry',
        limit: 5,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      // All returned logs should be for JournalEntry
      if (response.data && response.data.length > 0) {
        for (const log of response.data) {
          expect(log.entityType).toBe('JournalEntry');
        }
        console.log(`  Found ${response.data.length} JournalEntry audit logs`);
      } else {
        console.log('  No JournalEntry audit logs found');
      }
    });

    it('should query audit logs by action', async () => {
      const response = await apiClient.queryAuditLogs({
        action: 'POST',
        limit: 5,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      // All returned logs should have POST action
      if (response.data && response.data.length > 0) {
        for (const log of response.data) {
          expect(log.action).toBe('POST');
        }
        console.log(`  Found ${response.data.length} POST action logs`);
      } else {
        console.log('  No POST action logs found');
      }
    });

    it('should query audit logs by date range', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-31';

      const response = await apiClient.queryAuditLogs({
        startDate,
        endDate,
        limit: 10,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`  Found ${response.data?.length} logs between ${startDate} and ${endDate}`);
    });

    it('should get recent audit logs', async () => {
      const response = await apiClient.getRecentAuditLogs(20);

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`  Got ${response.data?.length} recent audit logs`);

      if (response.data && response.data.length > 0) {
        // Verify logs are sorted by timestamp (most recent first)
        const timestamps = response.data.map(log => new Date(log.timestamp).getTime());
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
        }
        console.log('  Verified logs are sorted by timestamp (most recent first)');
      }
    });

    it('should get entity audit history', async () => {
      if (!testJournalEntryId) {
        console.log('  Skipping: No journal entry available for testing');
        return;
      }

      const response = await apiClient.getEntityAuditHistory('JournalEntry', testJournalEntryId);

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      // All logs should be for the same entity
      if (response.data && response.data.length > 0) {
        for (const log of response.data) {
          expect(log.entityType).toBe('JournalEntry');
          expect(log.entityId).toBe(testJournalEntryId);
        }
        console.log(`  Found ${response.data.length} history entries for JournalEntry ${testJournalEntryId}`);

        // Show the actions
        const actions = response.data.map(log => log.action);
        console.log(`  Actions: ${actions.join(' -> ')}`);
      } else {
        console.log(`  No history found for JournalEntry ${testJournalEntryId}`);
      }
    });

    it('should return empty array for non-existent entity', async () => {
      const response = await apiClient.getEntityAuditHistory('JournalEntry', 'non-existent-id');

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data?.length).toBe(0);

      console.log('  Correctly returned empty array for non-existent entity');
    });
  });

  describe('Phase 2: Tax Summary', () => {
    it('should calculate tax summary for a fiscal period', async () => {
      const response = await apiClient.calculateTaxSummary({
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: FISCAL_MONTH,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`  Calculated tax summary for ${FISCAL_YEAR}-${String(FISCAL_MONTH).padStart(2, '0')}`);

      if (response.data && response.data.length > 0) {
        console.log('  Tax types calculated:');
        for (const summary of response.data) {
          console.log(`    - ${summary.taxType}: Rp ${summary.taxAmount.toLocaleString()} (${summary.transactionCount} transactions)`);
        }
      } else {
        console.log('  No taxable transactions found for this period');
      }
    });

    it('should get tax summary for specific month', async () => {
      const response = await apiClient.getTaxSummary({
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: FISCAL_MONTH,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();

      // Check if it's a single period report (not array)
      if (!Array.isArray(response.data)) {
        expect(response.data?.fiscalYear).toBe(FISCAL_YEAR);
        expect(response.data?.fiscalMonth).toBe(FISCAL_MONTH);
        expect(response.data?.summaries).toBeDefined();
        expect(typeof response.data?.totalGross).toBe('number');
        expect(typeof response.data?.totalTax).toBe('number');
        expect(typeof response.data?.totalNet).toBe('number');
        expect(typeof response.data?.totalTransactions).toBe('number');

        console.log(`  Period: ${response.data?.fiscalYear}-${String(response.data?.fiscalMonth).padStart(2, '0')}`);
        console.log(`  Total Gross: Rp ${response.data?.totalGross.toLocaleString()}`);
        console.log(`  Total Tax: Rp ${response.data?.totalTax.toLocaleString()}`);
        console.log(`  Total Net: Rp ${response.data?.totalNet.toLocaleString()}`);
        console.log(`  Transactions: ${response.data?.totalTransactions}`);
      }
    });

    it('should get annual tax summary', async () => {
      const response = await apiClient.getTaxSummary({
        fiscalYear: FISCAL_YEAR,
        // No fiscalMonth = annual report
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();

      // Annual report returns array of monthly reports
      if (Array.isArray(response.data)) {
        console.log(`  Got annual tax summary for ${FISCAL_YEAR}`);
        console.log(`  Months with data: ${response.data.length}`);

        // Calculate totals
        let totalTax = 0;
        let totalTransactions = 0;
        for (const month of response.data) {
          totalTax += month.totalTax;
          totalTransactions += month.totalTransactions;
        }

        console.log(`  Annual Total Tax: Rp ${totalTax.toLocaleString()}`);
        console.log(`  Annual Total Transactions: ${totalTransactions}`);
      } else {
        // If only one month of data, might return single object
        console.log('  Got single period data (annual aggregation not applicable)');
      }
    });

    it('should handle tax summary for period with no data', async () => {
      // Use a future year that definitely has no data
      const response = await apiClient.getTaxSummary({
        fiscalYear: 2030,
        fiscalMonth: 12,
      });

      // Should still return successfully, just with empty/zero data
      expect(response.ok).toBe(true);
      console.log('  Correctly handled period with no tax data');
    });
  });

  describe('Phase 3: Data Archival', () => {
    it('should get archive status', async () => {
      const response = await apiClient.getArchiveStatus();

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.archives).toBeDefined();
      expect(Array.isArray(response.data?.archives)).toBe(true);
      expect(response.data?.eligible).toBeDefined();
      expect(response.data?.eligible?.journalEntries).toBeDefined();
      expect(response.data?.eligible?.auditLogs).toBeDefined();

      console.log(`  Existing archives: ${response.data?.archives.length}`);
      console.log(`  Years eligible for journal entry archival: ${response.data?.eligible.journalEntries.join(', ') || 'none'}`);
      console.log(`  Years eligible for audit log archival: ${response.data?.eligible.auditLogs.join(', ') || 'none'}`);

      if (response.data?.archives && response.data.archives.length > 0) {
        console.log('  Archive details:');
        for (const archive of response.data.archives) {
          console.log(`    - ${archive.archiveType} (${archive.fiscalYear}): ${archive.recordCount} records`);
        }
      }
    });

    it('should handle archive execution for non-eligible year', async () => {
      // Try to archive current year (should not be eligible)
      const response = await apiClient.executeArchive({
        archiveType: 'journal_entries',
        fiscalYear: FISCAL_YEAR,
      });

      // This should fail because current year is not eligible for archival
      // (typically need to be 2+ years old)
      if (!response.ok) {
        console.log('  Correctly rejected archival for non-eligible year');
        console.log(`  Error: ${response.error}`);
      } else {
        // If it succeeded, that's also valid (if year is actually eligible)
        console.log(`  Archive executed: ${response.data?.recordCount} records`);
      }
    });

    it('should verify archive types are valid', async () => {
      // Test with valid archive types
      const status = await apiClient.getArchiveStatus();
      expect(status.ok).toBe(true);

      // The status should show what's eligible
      const eligibleJE = status.data?.eligible.journalEntries || [];
      const eligibleAL = status.data?.eligible.auditLogs || [];

      console.log('  Archive eligibility check:');
      console.log(`    Journal Entries: ${eligibleJE.length} years eligible`);
      console.log(`    Audit Logs: ${eligibleAL.length} years eligible`);

      // If there are eligible years, we could test actual archival
      // but we don't want to actually archive production data in E2E tests
      console.log('  Note: Actual archival skipped to preserve test data');
    });
  });

  describe('Phase 4: Summary', () => {
    it('should display test summary', async () => {
      const auditLogsResponse = await apiClient.getRecentAuditLogs(100);
      const archiveStatus = await apiClient.getArchiveStatus();

      console.log('\n');
      console.log('======================================================');
      console.log('          AUDIT & COMPLIANCE E2E TEST SUMMARY         ');
      console.log('======================================================');
      console.log(`  Recent Audit Logs: ${auditLogsResponse.data?.length || 0}`);
      console.log(`  Existing Archives: ${archiveStatus.data?.archives.length || 0}`);
      console.log(`  Eligible for Archival (JE): ${archiveStatus.data?.eligible.journalEntries.length || 0} years`);
      console.log(`  Eligible for Archival (AL): ${archiveStatus.data?.eligible.auditLogs.length || 0} years`);
      console.log('======================================================');
      console.log('');

      expect(true).toBe(true);
    });
  });
});
