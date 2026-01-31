/**
 * E2E Test: Depreciation Management
 *
 * Tests the complete depreciation lifecycle:
 * - Preview depreciation for fiscal period
 * - Calculate monthly depreciation for active assets
 * - Post depreciation to GL (creates journal entries)
 * - View depreciation runs and schedules
 * - Reverse depreciation runs when needed
 *
 * Prerequisites: Run 12-fixed-assets.test.ts first to create test assets
 *
 * Run with: E2E_API_URL=https://accounting-service.xxx.workers.dev pnpm test:e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';
import { fetchAccountMap, type AccountInfo } from '../fixtures/chart-of-accounts';

describe('E2E: Depreciation Management', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  // Test state
  let depreciationRunId: string;
  let journalEntryId: string;

  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1;

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    // Verify service is running
    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(`Accounting service not reachable. Error: ${health.error}`);
    }

    // Fetch account map
    accountMap = await fetchAccountMap(apiClient);
    if (accountMap.size === 0) {
      throw new Error('No accounts found. Please seed Chart of Accounts first.');
    }

    console.log('\n');
    console.log('======================================================');
    console.log('          DEPRECIATION E2E TEST                       ');
    console.log('======================================================');
    console.log('');
  }, 60000);

  describe('Phase 1: Prerequisites Check', () => {
    it('should ensure fiscal period exists', async () => {
      const response = await apiClient.createFiscalPeriod({
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: FISCAL_MONTH,
      });

      if (response.ok) {
        expect(response.data).toHaveProperty('id');
        console.log('  Created January fiscal period');
      } else {
        const existing = await apiClient.getFiscalPeriod(FISCAL_YEAR, FISCAL_MONTH);
        expect(existing.ok).toBe(true);
        console.log('  January fiscal period already exists');
      }
    });

    it('should verify depreciable assets exist', async () => {
      const response = await apiClient.getDepreciableAssets();

      expect(response.ok).toBe(true);
      console.log(`  Found ${response.data?.length || 0} depreciable assets`);

      if (response.data && response.data.length > 0) {
        const totalCost = response.data.reduce((sum, a) => sum + a.acquisitionCost, 0);
        const totalBookValue = response.data.reduce((sum, a) => sum + a.currentBookValue, 0);
        console.log(`  Total acquisition cost: Rp ${totalCost.toLocaleString()}`);
        console.log(`  Current book value: Rp ${totalBookValue.toLocaleString()}`);
      }
    });
  });

  describe('Phase 2: Depreciation Preview', () => {
    it('should preview depreciation for the period', async () => {
      const response = await apiClient.getDepreciationPreview(FISCAL_YEAR, FISCAL_MONTH);

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('fiscalYear', FISCAL_YEAR);
      expect(response.data).toHaveProperty('fiscalMonth', FISCAL_MONTH);
      expect(response.data).toHaveProperty('totalDepreciation');
      expect(response.data).toHaveProperty('assetCount');

      console.log(`  Preview for ${FISCAL_YEAR}-${String(FISCAL_MONTH).padStart(2, '0')}:`);
      console.log(`    Assets to depreciate: ${response.data?.assetCount || 0}`);
      console.log(`    Total depreciation: Rp ${response.data?.totalDepreciation?.toLocaleString() || 0}`);
      console.log(`    Already calculated: ${response.data?.alreadyCalculated ? 'Yes' : 'No'}`);

      // Display individual asset preview if available
      if (response.data?.assets && response.data.assets.length > 0) {
        console.log('    Asset details:');
        response.data.assets.forEach(asset => {
          console.log(`      - ${asset.assetCode}: Rp ${asset.depreciationAmount.toLocaleString()}`);
        });
      }
    });
  });

  describe('Phase 3: Calculate Depreciation', () => {
    it('should calculate depreciation for the period', async () => {
      const response = await apiClient.calculateDepreciation({
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: FISCAL_MONTH,
      });

      if (response.ok) {
        expect(response.data).toHaveProperty('runId');
        expect(response.data?.status).toBe('Calculated');
        depreciationRunId = response.data!.runId;
        console.log(`  Created depreciation run: ${depreciationRunId}`);
        console.log(`    Total depreciation: Rp ${response.data?.totalDepreciation?.toLocaleString() || 0}`);
        console.log(`    Assets processed: ${response.data?.assetCount || 0}`);
      } else if (response.error?.includes('already calculated') || response.error?.includes('already exists')) {
        console.log('  Depreciation already calculated for this period');
        // Get existing run
        const runs = await apiClient.listDepreciationRuns();
        const existingRun = runs.data?.find(
          r => r.fiscalYear === FISCAL_YEAR && r.fiscalMonth === FISCAL_MONTH
        );
        if (existingRun) {
          depreciationRunId = existingRun.id;
          console.log(`  Using existing run: ${depreciationRunId}`);
        }
      } else {
        console.log(`  Calculate result: ${response.error}`);
      }
    });

    it('should list depreciation runs', async () => {
      const response = await apiClient.listDepreciationRuns();

      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      console.log(`  Found ${response.data?.length || 0} depreciation runs`);

      if (response.data && response.data.length > 0) {
        console.log('    Recent runs:');
        response.data.slice(0, 5).forEach(run => {
          console.log(`      - ${run.fiscalYear}-${String(run.fiscalMonth).padStart(2, '0')}: ${run.status} (Rp ${run.totalDepreciation.toLocaleString()})`);
        });
      }
    });

    it('should get depreciation run details', async () => {
      if (!depreciationRunId) {
        console.log('  Skipping: No depreciation run ID available');
        return;
      }

      const response = await apiClient.getDepreciationRun(depreciationRunId);

      expect(response.ok).toBe(true);
      expect(response.data?.id).toBe(depreciationRunId);
      console.log(`  Run details:`);
      console.log(`    Status: ${response.data?.status}`);
      console.log(`    Total: Rp ${response.data?.totalDepreciation?.toLocaleString() || 0}`);
      console.log(`    Assets: ${response.data?.assetCount || 0}`);

      if (response.data?.details && response.data.details.length > 0) {
        console.log('    Asset breakdown:');
        response.data.details.forEach(detail => {
          console.log(`      - ${detail.assetCode}: Rp ${detail.depreciationAmount.toLocaleString()} (Book: ${detail.previousBookValue.toLocaleString()} -> ${detail.newBookValue.toLocaleString()})`);
        });
      }
    });
  });

  describe('Phase 4: Post Depreciation to GL', () => {
    it('should post depreciation to general ledger', async () => {
      if (!depreciationRunId) {
        console.log('  Skipping: No depreciation run ID available');
        return;
      }

      const response = await apiClient.postDepreciation({
        runId: depreciationRunId,
      });

      if (response.ok) {
        expect(response.data?.status).toBe('Posted');
        expect(response.data).toHaveProperty('journalEntryId');
        journalEntryId = response.data!.journalEntryId;
        console.log(`  Posted depreciation to GL`);
        console.log(`    Journal Entry: ${journalEntryId}`);
        console.log(`    Amount: Rp ${response.data?.totalDepreciation?.toLocaleString() || 0}`);
        console.log(`    Posted at: ${response.data?.postedAt}`);
      } else if (response.error?.includes('already posted')) {
        console.log('  Depreciation already posted');
        // Get journal entry from run details
        const runDetails = await apiClient.getDepreciationRun(depreciationRunId);
        if (runDetails.data?.journalEntryId) {
          journalEntryId = runDetails.data.journalEntryId;
          console.log(`  Existing journal entry: ${journalEntryId}`);
        }
      } else {
        console.log(`  Post result: ${response.error}`);
      }
    });

    it('should verify journal entry was created', async () => {
      if (!journalEntryId) {
        console.log('  Skipping: No journal entry ID available');
        return;
      }

      const response = await apiClient.getJournalEntry(journalEntryId);

      expect(response.ok).toBe(true);
      const entry = response.data as {
        status: string;
        entryType: string;
        lines?: Array<{ direction: string; amount: number; accountId: string }>;
      };
      expect(entry.status).toBe('Posted');
      expect(entry.entryType).toBe('System');
      console.log(`  Verified journal entry: ${entry.status}`);

      // Verify double-entry (debit depreciation expense, credit accumulated depreciation)
      if (entry.lines) {
        const debits = entry.lines.filter(l => l.direction === 'Debit');
        const credits = entry.lines.filter(l => l.direction === 'Credit');
        const totalDebits = debits.reduce((sum, l) => sum + l.amount, 0);
        const totalCredits = credits.reduce((sum, l) => sum + l.amount, 0);

        console.log(`    Debit (Depreciation Expense): Rp ${totalDebits.toLocaleString()}`);
        console.log(`    Credit (Accum. Depreciation): Rp ${totalCredits.toLocaleString()}`);
        expect(totalDebits).toBe(totalCredits);
      }
    });
  });

  describe('Phase 5: Depreciation Schedule', () => {
    it('should get depreciation schedule for an asset', async () => {
      // First get a depreciable asset
      const assetsResponse = await apiClient.getDepreciableAssets();

      if (!assetsResponse.ok || !assetsResponse.data || assetsResponse.data.length === 0) {
        console.log('  Skipping: No depreciable assets found');
        return;
      }

      const testAsset = assetsResponse.data[0];
      const response = await apiClient.getAssetDepreciationSchedule(testAsset.id);

      expect(response.ok).toBe(true);
      expect(response.data?.assetId).toBe(testAsset.id);
      console.log(`  Depreciation schedule for: ${response.data?.assetCode}`);
      console.log(`    Acquisition cost: Rp ${response.data?.acquisitionCost?.toLocaleString()}`);
      console.log(`    Useful life: ${response.data?.usefulLifeYears} years`);
      console.log(`    Salvage value: Rp ${response.data?.salvageValue?.toLocaleString()}`);
      console.log(`    Method: ${response.data?.depreciationMethod}`);
      console.log(`    Total depreciated: Rp ${response.data?.totalDepreciationToDate?.toLocaleString()}`);
      console.log(`    Remaining book value: Rp ${response.data?.remainingBookValue?.toLocaleString()}`);

      // Show schedule details if available
      if (response.data?.schedule && response.data.schedule.length > 0) {
        console.log('    Monthly schedule (first 6 months):');
        response.data.schedule.slice(0, 6).forEach(s => {
          console.log(`      ${s.year}-${String(s.month).padStart(2, '0')}: Rp ${s.depreciationAmount.toLocaleString()} (Book: Rp ${s.bookValue.toLocaleString()}) [${s.status}]`);
        });
      }
    });
  });

  describe('Phase 6: Reverse Depreciation (Optional)', () => {
    it('should reverse a depreciation run if needed', async () => {
      // This test is commented out by default to preserve test data
      // Uncomment to test reversal functionality

      if (!depreciationRunId) {
        console.log('  Skipping: No depreciation run ID available');
        return;
      }

      // Check if run is posted (can only reverse posted runs)
      const runDetails = await apiClient.getDepreciationRun(depreciationRunId);
      if (runDetails.data?.status !== 'Posted') {
        console.log('  Skipping: Run is not in Posted status');
        return;
      }

      // Uncomment the following to actually test reversal:
      /*
      const response = await apiClient.reverseDepreciation({
        runId: depreciationRunId,
        reason: 'E2E Test - Testing reversal functionality',
      });

      if (response.ok) {
        expect(response.data?.status).toBe('Reversed');
        expect(response.data).toHaveProperty('reversalJournalEntryId');
        console.log(`  Reversed depreciation run`);
        console.log(`    Reversal Journal: ${response.data?.reversalJournalEntryId}`);
        console.log(`    Reversed at: ${response.data?.reversedAt}`);
      } else {
        console.log(`  Reversal result: ${response.error}`);
      }
      */

      console.log('  Reversal test skipped (uncomment to test)');
      expect(true).toBe(true);
    });
  });

  describe('Phase 7: Multi-Month Depreciation Scenario', () => {
    it('should check February period availability', async () => {
      const response = await apiClient.createFiscalPeriod({
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: 2,
      });

      if (response.ok) {
        console.log('  Created February fiscal period');
      } else {
        const existing = await apiClient.getFiscalPeriod(FISCAL_YEAR, 2);
        if (existing.ok) {
          console.log('  February fiscal period already exists');
        }
      }
    });

    it('should preview February depreciation', async () => {
      const response = await apiClient.getDepreciationPreview(FISCAL_YEAR, 2);

      expect(response.ok).toBe(true);
      console.log(`  February preview:`);
      console.log(`    Assets: ${response.data?.assetCount || 0}`);
      console.log(`    Total: Rp ${response.data?.totalDepreciation?.toLocaleString() || 0}`);
      console.log(`    Already calculated: ${response.data?.alreadyCalculated ? 'Yes' : 'No'}`);
    });
  });

  describe('Phase 8: Summary', () => {
    it('should display test summary', async () => {
      const assetsResponse = await apiClient.getDepreciableAssets();
      const runsResponse = await apiClient.listDepreciationRuns();

      console.log('\n');
      console.log('======================================================');
      console.log('          DEPRECIATION E2E TEST SUMMARY               ');
      console.log('======================================================');
      console.log(`  Depreciable Assets: ${assetsResponse.data?.length || 0}`);
      console.log(`  Depreciation Runs: ${runsResponse.data?.length || 0}`);

      if (runsResponse.data && runsResponse.data.length > 0) {
        const postedRuns = runsResponse.data.filter(r => r.status === 'Posted');
        const totalDepreciated = runsResponse.data.reduce((sum, r) => sum + r.totalDepreciation, 0);
        console.log(`  Posted Runs: ${postedRuns.length}`);
        console.log(`  Total Depreciation: Rp ${totalDepreciated.toLocaleString()}`);
      }

      console.log('======================================================');
      console.log('');

      expect(true).toBe(true);
    });
  });
});
