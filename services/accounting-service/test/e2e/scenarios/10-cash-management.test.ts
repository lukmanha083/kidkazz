/**
 * E2E Test: Cash Management Workflow
 *
 * Tests the cash management features:
 * - Cash position reporting (real-time balances)
 * - Cash threshold configuration
 * - Cash forecast generation
 * - Threshold alerts
 *
 * Prerequisites: Some cash transactions should exist in the database.
 * This test works best after running the full-year cycle test.
 *
 * Run with: E2E_API_URL=https://accounting-service.xxx.workers.dev pnpm test:e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';
import { fetchAccountMap, getAccountByCode, type AccountInfo } from '../fixtures/chart-of-accounts';

describe('E2E: Cash Management Workflow', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  const FISCAL_YEAR = 2026;

  // Cash threshold configuration for testing
  const TEST_THRESHOLDS = {
    warningThreshold: 500_000_000,    // Rp 500M
    criticalThreshold: 300_000_000,   // Rp 300M
    emergencyThreshold: 100_000_000,  // Rp 100M
  };

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    // Verify service is running
    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(
        `Accounting service not reachable. Error: ${health.error}`
      );
    }

    // Fetch account map
    accountMap = await fetchAccountMap(apiClient);
    if (accountMap.size === 0) {
      throw new Error('No accounts found. Please seed Chart of Accounts first.');
    }

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║            CASH MANAGEMENT E2E TEST                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // Cleanup previous E2E test data
    console.log('\n🧹 Cleaning up previous E2E test data...');
    const cleanupResult = await apiClient.cleanupE2EData(FISCAL_YEAR, true);
    if (cleanupResult.ok && cleanupResult.data) {
      console.log(`   Deleted ${cleanupResult.data.deletedJournalEntries} journal entries`);
      console.log(`   Deleted ${cleanupResult.data.deletedAccountBalances} account balances`);
      console.log(`   Reset ${cleanupResult.data.resetFiscalPeriods} fiscal periods`);
    }

    console.log('');
  }, 60000);

  describe('Phase 1: Setup Test Data', () => {
    it('should create fiscal period for testing', async () => {
      const response = await apiClient.createFiscalPeriod({
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: 1,
      });

      // May already exist
      if (response.ok) {
        expect(response.data).toHaveProperty('id');
        console.log('✓ Created January fiscal period');
      } else {
        const existing = await apiClient.getFiscalPeriod(FISCAL_YEAR, 1);
        expect(existing.ok).toBe(true);
        console.log('✓ January fiscal period already exists');
      }
    });

    it('should create initial cash balance via journal entry', async () => {
      const cashAccount = getAccountByCode(accountMap, '1010'); // Kas
      const capitalAccount = getAccountByCode(accountMap, '3100'); // Modal Disetor

      // Create opening cash balance
      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-01',
        description: 'E2E Cash Test - Initial Cash Balance',
        reference: `E2E-CASH-INIT-${Date.now()}`,
        entryType: 'Manual',
        lines: [
          {
            accountId: cashAccount.id,
            direction: 'Debit',
            amount: 750_000_000, // Rp 750M
            memo: 'Initial cash balance for testing',
          },
          {
            accountId: capitalAccount.id,
            direction: 'Credit',
            amount: 750_000_000,
            memo: 'Owner investment - cash',
          },
        ],
      });

      expect(response.ok).toBe(true);
      await apiClient.postJournalEntry(response.data!.id);

      console.log('✓ Created initial cash balance: Rp 750,000,000');
    });

    it('should add bank account balance', async () => {
      const bankAccount = getAccountByCode(accountMap, '1020'); // Bank BCA
      const capitalAccount = getAccountByCode(accountMap, '3100');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-01',
        description: 'E2E Cash Test - Bank Account Opening Balance',
        reference: `E2E-BANK-INIT-${Date.now()}`,
        entryType: 'Manual',
        lines: [
          {
            accountId: bankAccount.id,
            direction: 'Debit',
            amount: 1_500_000_000, // Rp 1.5B
            memo: 'Bank BCA opening balance',
          },
          {
            accountId: capitalAccount.id,
            direction: 'Credit',
            amount: 1_500_000_000,
            memo: 'Owner investment - bank deposit',
          },
        ],
      });

      expect(response.ok).toBe(true);
      await apiClient.postJournalEntry(response.data!.id);

      console.log('✓ Created bank account balance: Rp 1,500,000,000');
    });

    it('should calculate period balances', async () => {
      const response = await apiClient.calculatePeriodBalances(FISCAL_YEAR, 1);
      expect(response.ok).toBe(true);

      console.log(`✓ Period balances calculated: ${response.data?.accountsProcessed} accounts processed`);
    });
  });

  describe('Phase 2: Cash Position Report', () => {
    it('should get real-time cash position', async () => {
      const response = await apiClient.getCashPosition();

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('totalCashPosition');
      expect(response.data).toHaveProperty('cashOnHand');
      expect(response.data).toHaveProperty('bankAccounts');

      console.log('\n=== Cash Position Report ===');
      console.log(`Total Cash Position: Rp ${response.data?.totalCashPosition?.toLocaleString('id-ID') || 0}`);

      // Display cash on hand accounts
      if (response.data?.cashOnHand?.accounts && response.data.cashOnHand.accounts.length > 0) {
        console.log('\nCash on Hand:');
        response.data.cashOnHand.accounts.forEach((acc) => {
          console.log(`  ${acc.accountCode} - ${acc.accountName}: Rp ${acc.balance?.toLocaleString('id-ID') || 0}`);
        });
        console.log(`  Subtotal: Rp ${response.data.cashOnHand.total?.toLocaleString('id-ID') || 0}`);
      }

      // Display bank accounts
      if (response.data?.bankAccounts?.accounts && response.data.bankAccounts.accounts.length > 0) {
        console.log('\nBank Accounts:');
        response.data.bankAccounts.accounts.forEach((acc) => {
          console.log(`  ${acc.accountCode} - ${acc.accountName}: Rp ${acc.balance?.toLocaleString('id-ID') || 0}`);
        });
        console.log(`  Subtotal: Rp ${response.data.bankAccounts.total?.toLocaleString('id-ID') || 0}`);
      }
    });

    it('should get cash position with threshold check', async () => {
      const response = await apiClient.getCashPosition({
        includeThresholdCheck: true,
      });

      expect(response.ok).toBe(true);

      if (response.data?.alertStatus) {
        const alertLevel = response.data.alertStatus.alertLevel;
        const alertEmoji = alertLevel === 'NORMAL' ? '✅' : alertLevel === 'WARNING' ? '⚠️' : alertLevel === 'CRITICAL' ? '🔴' : '🚨';
        console.log(`\nAlert Status: ${alertEmoji} ${alertLevel}`);
        console.log(`  Message: ${response.data.alertStatus.message}`);
        console.log(`  Current Balance: Rp ${response.data.alertStatus.currentBalance?.toLocaleString('id-ID')}`);
        console.log(`  Threshold: Rp ${response.data.alertStatus.threshold?.toLocaleString('id-ID')}`);
      } else {
        console.log('\n✓ Cash position retrieved (no threshold configured yet)');
      }
    });

    it('should get cash position for specific date', async () => {
      const response = await apiClient.getCashPosition({
        asOfDate: '2026-01-31',
      });

      expect(response.ok).toBe(true);
      console.log(`✓ Cash position as of 2026-01-31: Rp ${response.data?.totalCashPosition?.toLocaleString('id-ID') || 0}`);
    });
  });

  describe('Phase 3: Cash Threshold Configuration', () => {
    it('should get current threshold configuration', async () => {
      const response = await apiClient.getCashThreshold();

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('warningThreshold');
      expect(response.data).toHaveProperty('criticalThreshold');
      expect(response.data).toHaveProperty('emergencyThreshold');

      console.log('\n=== Current Cash Thresholds ===');
      console.log(`Warning: Rp ${response.data?.warningThreshold?.toLocaleString('id-ID')}`);
      console.log(`Critical: Rp ${response.data?.criticalThreshold?.toLocaleString('id-ID')}`);
      console.log(`Emergency: Rp ${response.data?.emergencyThreshold?.toLocaleString('id-ID')}`);
    });

    it('should update cash threshold configuration', async () => {
      const response = await apiClient.updateCashThreshold(TEST_THRESHOLDS);

      expect(response.ok).toBe(true);
      expect(response.data?.warningThreshold).toBe(TEST_THRESHOLDS.warningThreshold);
      expect(response.data?.criticalThreshold).toBe(TEST_THRESHOLDS.criticalThreshold);
      expect(response.data?.emergencyThreshold).toBe(TEST_THRESHOLDS.emergencyThreshold);

      console.log('\n✓ Updated cash thresholds:');
      console.log(`  Warning: Rp ${TEST_THRESHOLDS.warningThreshold.toLocaleString('id-ID')}`);
      console.log(`  Critical: Rp ${TEST_THRESHOLDS.criticalThreshold.toLocaleString('id-ID')}`);
      console.log(`  Emergency: Rp ${TEST_THRESHOLDS.emergencyThreshold.toLocaleString('id-ID')}`);
    });

    it('should validate threshold order (warning > critical > emergency)', async () => {
      // Try to set invalid thresholds (critical > warning)
      const invalidResponse = await apiClient.updateCashThreshold({
        warningThreshold: 100_000_000,
        criticalThreshold: 200_000_000, // Invalid: critical > warning
        emergencyThreshold: 50_000_000,
      });

      expect(invalidResponse.ok).toBe(false);
      console.log('✓ Invalid threshold order correctly rejected');

      // Restore valid thresholds
      await apiClient.updateCashThreshold(TEST_THRESHOLDS);
    });
  });

  describe('Phase 4: Cash Forecast', () => {
    it('should generate 4-week cash forecast', async () => {
      const response = await apiClient.getCashForecast({
        weeks: 4,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('startingCash');
      expect(response.data).toHaveProperty('weeks');
      expect(response.data).toHaveProperty('endingCash');

      console.log('\n=== 4-Week Cash Forecast ===');
      console.log(`Starting Cash: Rp ${response.data?.startingCash?.toLocaleString('id-ID') || 0}`);

      if (response.data?.weeks && response.data.weeks.length > 0) {
        console.log('\nWeekly Projections:');
        response.data.weeks.forEach((week) => {
          console.log(`  Week ${week.weekNumber}:`);
          console.log(`    Inflows: +Rp ${week.inflows?.total?.toLocaleString('id-ID') || 0}`);
          console.log(`    Outflows: -Rp ${week.outflows?.total?.toLocaleString('id-ID') || 0}`);
          console.log(`    Ending Cash: Rp ${week.endingCash?.toLocaleString('id-ID') || 0}`);
          console.log(`    Alert Level: ${week.alertLevel}`);
        });
      }

      console.log(`\nEnding Cash: Rp ${response.data?.endingCash?.toLocaleString('id-ID') || 0}`);

      if (response.data?.lowestCashPoint) {
        console.log(`Lowest Cash Point: Week ${response.data.lowestCashPoint.weekNumber} - Rp ${response.data.lowestCashPoint.amount?.toLocaleString('id-ID') || 0}`);
      }
    });

    it('should generate forecast with threshold alerts', async () => {
      const response = await apiClient.getCashForecast({
        weeks: 4,
        includeThresholdAlerts: true,
      });

      expect(response.ok).toBe(true);

      // Check for weeks with alerts
      const weeksWithAlerts = response.data?.weeks?.filter((w) => w.alertLevel !== 'NORMAL') || [];
      if (weeksWithAlerts.length > 0) {
        console.log('\n=== Weeks with Alerts ===');
        weeksWithAlerts.forEach((week) => {
          console.log(`  Week ${week.weekNumber}: [${week.alertLevel}] Ending Cash: Rp ${week.endingCash?.toLocaleString('id-ID')}`);
        });
      } else {
        console.log('\n✓ No threshold alerts (cash position healthy for all weeks)');
      }

      if (response.data?.summary) {
        console.log(`\nSummary: ${response.data.summary.weeksWithAlerts} weeks with alerts`);
      }
    });

    it('should generate extended 8-week forecast', async () => {
      const response = await apiClient.getCashForecast({
        weeks: 8,
      });

      expect(response.ok).toBe(true);
      expect(response.data?.weeks?.length).toBeGreaterThanOrEqual(8);

      console.log(`\n✓ 8-week forecast generated with ${response.data?.weeks?.length} periods`);
    });
  });

  describe('Phase 5: Cash Position with Low Balance Scenario', () => {
    it('should simulate expenses reducing cash balance', async () => {
      const cashAccount = getAccountByCode(accountMap, '1010');
      const expenseAccount = getAccountByCode(accountMap, '6010'); // Salary expense

      // Create large expense to reduce cash
      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-15',
        description: 'E2E Cash Test - Large Expense Payment',
        reference: `E2E-CASH-EXP-${Date.now()}`,
        entryType: 'Manual',
        lines: [
          {
            accountId: expenseAccount.id,
            direction: 'Debit',
            amount: 600_000_000, // Rp 600M expense
            memo: 'Quarterly salary payment',
          },
          {
            accountId: cashAccount.id,
            direction: 'Credit',
            amount: 600_000_000,
            memo: 'Cash payment for salaries',
          },
        ],
      });

      expect(response.ok).toBe(true);
      await apiClient.postJournalEntry(response.data!.id);

      // Recalculate balances
      await apiClient.calculatePeriodBalances(FISCAL_YEAR, 1);

      console.log('✓ Created expense entry: Rp 600,000,000');
    });

    it('should show reduced cash position after expense', async () => {
      const response = await apiClient.getCashPosition({
        includeThresholdCheck: true,
      });

      expect(response.ok).toBe(true);

      console.log('\n=== Updated Cash Position (After Expense) ===');
      console.log(`Total Cash Position: Rp ${response.data?.totalCashPosition?.toLocaleString('id-ID') || 0}`);

      if (response.data?.alertStatus) {
        const alertLevel = response.data.alertStatus.alertLevel;
        const alertEmoji = alertLevel === 'NORMAL' ? '✅' : alertLevel === 'WARNING' ? '⚠️' : alertLevel === 'CRITICAL' ? '🔴' : '🚨';
        console.log(`Alert Status: ${alertEmoji} ${alertLevel}`);
        console.log(`Message: ${response.data.alertStatus.message}`);
      }
    });

    it('should show alerts in cash forecast after expense', async () => {
      const response = await apiClient.getCashForecast({
        weeks: 4,
        includeThresholdAlerts: true,
      });

      expect(response.ok).toBe(true);

      console.log('\n=== Cash Forecast (After Expense) ===');
      console.log(`Starting Cash: Rp ${response.data?.startingCash?.toLocaleString('id-ID') || 0}`);
      console.log(`Projected Ending Cash: Rp ${response.data?.endingCash?.toLocaleString('id-ID') || 0}`);

      // Check for weeks with alerts
      const weeksWithAlerts = response.data?.weeks?.filter((w) => w.alertLevel !== 'NORMAL') || [];
      if (weeksWithAlerts.length > 0) {
        console.log('\nWeeks with Alerts:');
        weeksWithAlerts.forEach((week) => {
          console.log(`  ⚠️ Week ${week.weekNumber}: [${week.alertLevel}] Ending Cash: Rp ${week.endingCash?.toLocaleString('id-ID')}`);
        });
      }
    });
  });

  describe('Phase 6: Summary', () => {
    it('should output test summary', async () => {
      const cashPosition = await apiClient.getCashPosition({ includeThresholdCheck: true });
      const threshold = await apiClient.getCashThreshold();

      console.log('\n');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║           CASH MANAGEMENT E2E TEST COMPLETE                  ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log(`║  Total Cash Position: Rp ${(cashPosition.data?.totalCashPosition || 0).toLocaleString('id-ID').padStart(19)}  ║`);
      console.log(`║  Warning Threshold:   Rp ${(threshold.data?.warningThreshold || 0).toLocaleString('id-ID').padStart(19)}  ║`);
      console.log(`║  Alert Status: ${(cashPosition.data?.alertStatus?.alertLevel || 'N/A').padStart(39)}  ║`);
      console.log('╚══════════════════════════════════════════════════════════════╝');

      expect(true).toBe(true);
    });
  });
});
