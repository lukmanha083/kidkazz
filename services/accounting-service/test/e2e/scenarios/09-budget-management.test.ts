/**
 * E2E Test: Budget Management Workflow
 *
 * Tests the complete budget lifecycle:
 * - Create budget for a fiscal year
 * - Add budget lines for expense accounts
 * - Update budget amounts
 * - Approve budget
 * - Generate Budget vs Actual report
 * - Test AR/AP Aging reports
 *
 * Run with: E2E_API_URL=https://accounting-service.xxx.workers.dev pnpm test:e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';
import { fetchAccountMap, getAccountByCode, type AccountInfo } from '../fixtures/chart-of-accounts';

describe('E2E: Budget Management Workflow', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;
  let createdBudgetId: string;

  const FISCAL_YEAR = 2026;
  const BUDGET_NAME = `E2E-Operating-Budget-${Date.now()}`;

  // Expense accounts for budget
  const EXPENSE_ACCOUNTS = [
    { code: '6010', name: 'Gaji Pokok', monthlyBudget: 50_000_000 },
    { code: '6111', name: 'Sewa Toko', monthlyBudget: 15_000_000 },
    { code: '6120', name: 'Listrik', monthlyBudget: 5_000_000 },
    { code: '6130', name: 'Air', monthlyBudget: 1_500_000 },
    { code: '6140', name: 'Telepon', monthlyBudget: 2_000_000 },
    { code: '6150', name: 'Internet', monthlyBudget: 2_500_000 },
  ];

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
    console.log('║            BUDGET MANAGEMENT E2E TEST                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // Cleanup previous E2E test data
    console.log('\n🧹 Cleaning up previous E2E test data...');
    const cleanupResult = await apiClient.cleanupE2EData(FISCAL_YEAR, true);
    if (cleanupResult.ok && cleanupResult.data) {
      console.log(`   Deleted ${cleanupResult.data.deletedJournalEntries} journal entries`);
      console.log(`   Reset ${cleanupResult.data.resetFiscalPeriods} fiscal periods`);
    }

    // Cleanup any existing E2E budgets by listing and deleting drafts
    const existingBudgets = await apiClient.listBudgets({ fiscalYear: FISCAL_YEAR });
    if (existingBudgets.ok && existingBudgets.data) {
      for (const budget of existingBudgets.data) {
        if (budget.name.startsWith('E2E-') && budget.status === 'draft') {
          await apiClient.deleteBudget(budget.id);
        }
      }
      const e2eBudgets = existingBudgets.data.filter(b => b.name.startsWith('E2E-'));
      if (e2eBudgets.length > 0) {
        console.log(`   Found ${e2eBudgets.length} E2E budgets (drafts deleted)`);
      }
    }

    console.log('');
  }, 60000);

  describe('Phase 1: Create Budget', () => {
    it('should create a new budget for the fiscal year', async () => {
      const response = await apiClient.createBudget({
        name: BUDGET_NAME,
        fiscalYear: FISCAL_YEAR,
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('id');
      createdBudgetId = response.data!.id;

      console.log(`✓ Created budget: ${BUDGET_NAME}`);
      console.log(`  Budget ID: ${createdBudgetId}`);
    });

    it('should retrieve the created budget', async () => {
      const response = await apiClient.getBudget(createdBudgetId);

      expect(response.ok).toBe(true);
      expect(response.data?.name).toBe(BUDGET_NAME);
      expect(response.data?.fiscalYear).toBe(FISCAL_YEAR);
      expect(response.data?.status).toBe('draft');
      expect(response.data?.lines).toHaveLength(0);

      console.log(`✓ Budget retrieved - Status: ${response.data?.status}`);
    });

    it('should list budgets with filters', async () => {
      const response = await apiClient.listBudgets({
        fiscalYear: FISCAL_YEAR,
        status: 'draft',
      });

      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);

      const ourBudget = response.data?.find((b) => b.id === createdBudgetId);
      expect(ourBudget).toBeDefined();

      console.log(`✓ Budget list contains ${response.data?.length} draft budgets for ${FISCAL_YEAR}`);
    });
  });

  describe('Phase 2: Add Budget Lines', () => {
    it('should add monthly budget lines for expense accounts', async () => {
      const budgetLines: Array<{
        accountId: string;
        fiscalMonth: number;
        amount: number;
        notes?: string;
      }> = [];

      // Create budget lines for each expense account for all 12 months
      for (const expense of EXPENSE_ACCOUNTS) {
        const account = getAccountByCode(accountMap, expense.code);

        for (let month = 1; month <= 12; month++) {
          // Add some variance: Q4 gets 10% increase for year-end activities
          const multiplier = month >= 10 ? 1.1 : 1.0;
          budgetLines.push({
            accountId: account.id,
            fiscalMonth: month,
            amount: Math.round(expense.monthlyBudget * multiplier),
            notes: `${expense.name} - Month ${month}`,
          });
        }
      }

      const response = await apiClient.updateBudgetLines(createdBudgetId, budgetLines);
      expect(response.ok).toBe(true);

      console.log(`✓ Added ${budgetLines.length} budget lines (${EXPENSE_ACCOUNTS.length} accounts × 12 months)`);
    });

    it('should verify budget lines were saved correctly', async () => {
      const response = await apiClient.getBudget(createdBudgetId);

      expect(response.ok).toBe(true);
      expect(response.data?.lines.length).toBe(EXPENSE_ACCOUNTS.length * 12);

      // Calculate expected annual total
      const expectedAnnual = EXPENSE_ACCOUNTS.reduce((sum, e) => {
        // 9 months at base rate + 3 months at 110%
        return sum + (e.monthlyBudget * 9) + (e.monthlyBudget * 1.1 * 3);
      }, 0);

      expect(response.data?.totalBudget).toBeGreaterThan(0);

      console.log(`✓ Budget total: Rp ${response.data?.totalBudget.toLocaleString('id-ID')}`);
      console.log(`  Expected ~Rp ${Math.round(expectedAnnual).toLocaleString('id-ID')}`);
    });
  });

  describe('Phase 3: Update Budget Lines', () => {
    it('should update specific budget lines with revised amounts', async () => {
      // Get current budget to find a line to update
      const currentBudget = await apiClient.getBudget(createdBudgetId);
      expect(currentBudget.ok).toBe(true);

      // Find the first account's lines and increase January by 20%
      const gajiAccount = getAccountByCode(accountMap, '6010');
      const januaryLine = currentBudget.data?.lines.find(
        (l) => l.accountId === gajiAccount.id && l.fiscalMonth === 1
      );

      expect(januaryLine).toBeDefined();

      // Update with increased amount
      const newAmount = Math.round(januaryLine!.amount * 1.2);
      const response = await apiClient.updateBudgetLines(createdBudgetId, [
        {
          accountId: gajiAccount.id,
          fiscalMonth: 1,
          amount: newAmount,
          notes: 'Revised - New year bonus allocation',
        },
      ]);

      expect(response.ok).toBe(true);
      console.log(`✓ Updated January salary budget: Rp ${januaryLine!.amount.toLocaleString('id-ID')} → Rp ${newAmount.toLocaleString('id-ID')}`);
    });
  });

  describe('Phase 4: Approve Budget', () => {
    it('should approve the budget', async () => {
      const response = await apiClient.approveBudget(createdBudgetId);
      expect(response.ok).toBe(true);

      // Verify status changed
      const budget = await apiClient.getBudget(createdBudgetId);
      expect(budget.data?.status).toBe('approved');
      expect(budget.data?.approvedBy).toBeTruthy();
      expect(budget.data?.approvedAt).toBeTruthy();

      console.log(`✓ Budget approved by: ${budget.data?.approvedBy}`);
      console.log(`  Approved at: ${budget.data?.approvedAt}`);
    });

    it('should not allow deleting an approved budget', async () => {
      const response = await apiClient.deleteBudget(createdBudgetId);
      expect(response.ok).toBe(false);

      console.log('✓ Approved budget cannot be deleted (expected behavior)');
    });
  });

  describe('Phase 5: Budget vs Actual Report', () => {
    it('should generate budget vs actual comparison', async () => {
      const response = await apiClient.getBudgetVsActual(createdBudgetId);

      // The report should work even if there's no actual spending yet
      expect(response.ok).toBe(true);
      expect(response.data?.budgetId).toBe(createdBudgetId);
      expect(response.data?.fiscalYear).toBe(FISCAL_YEAR);

      console.log('\n=== Budget vs Actual Report ===');
      console.log(`Budget: ${response.data?.budgetName}`);
      console.log(`Total Budget: Rp ${response.data?.totalBudget?.toLocaleString('id-ID') || 0}`);
      console.log(`Total Actual: Rp ${response.data?.totalActual?.toLocaleString('id-ID') || 0}`);
      console.log(`Variance: Rp ${response.data?.totalVariance?.toLocaleString('id-ID') || 0}`);

      if (response.data?.sections && response.data.sections.length > 0) {
        console.log('\nTop variances:');
        response.data.sections.slice(0, 3).forEach((s) => {
          const status = s.isFavorable ? '✓' : '✗';
          console.log(`  ${status} ${s.accountCode}: Budget Rp ${s.budgetAmount.toLocaleString('id-ID')}, Actual Rp ${s.actualAmount.toLocaleString('id-ID')}`);
        });
      }
    });

    it('should generate budget vs actual for specific month', async () => {
      const response = await apiClient.getBudgetVsActual(createdBudgetId, 1);

      expect(response.ok).toBe(true);
      expect(response.data?.fiscalMonth).toBe(1);

      console.log(`\n✓ January Budget vs Actual generated`);
    });
  });

  describe('Phase 6: AR/AP Aging Reports', () => {
    it('should generate AR aging report', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.getARAgingReport(today);

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('summary');

      console.log('\n=== AR Aging Report ===');
      console.log(`As of: ${response.data?.asOfDate}`);
      console.log(`Current (0-30): Rp ${response.data?.summary?.current?.toLocaleString('id-ID') || 0}`);
      console.log(`31-60 days: Rp ${response.data?.summary?.days31_60?.toLocaleString('id-ID') || 0}`);
      console.log(`61-90 days: Rp ${response.data?.summary?.days61_90?.toLocaleString('id-ID') || 0}`);
      console.log(`Over 90 days: Rp ${response.data?.summary?.over90?.toLocaleString('id-ID') || 0}`);
      console.log(`Total AR: Rp ${response.data?.summary?.total?.toLocaleString('id-ID') || 0}`);
    });

    it('should generate AP aging report', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.getAPAgingReport(today);

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('summary');

      console.log('\n=== AP Aging Report ===');
      console.log(`As of: ${response.data?.asOfDate}`);
      console.log(`Current (0-30): Rp ${response.data?.summary?.current?.toLocaleString('id-ID') || 0}`);
      console.log(`31-60 days: Rp ${response.data?.summary?.days31_60?.toLocaleString('id-ID') || 0}`);
      console.log(`61-90 days: Rp ${response.data?.summary?.days61_90?.toLocaleString('id-ID') || 0}`);
      console.log(`Over 90 days: Rp ${response.data?.summary?.over90?.toLocaleString('id-ID') || 0}`);
      console.log(`Total AP: Rp ${response.data?.summary?.total?.toLocaleString('id-ID') || 0}`);
    });
  });

  describe('Phase 7: Cleanup', () => {
    it('should create a draft budget for cleanup test', async () => {
      // Create a new draft budget to test deletion
      const response = await apiClient.createBudget({
        name: `E2E-Temp-Budget-${Date.now()}`,
        fiscalYear: FISCAL_YEAR,
      });

      expect(response.ok).toBe(true);
      const tempBudgetId = response.data!.id;

      // Delete the draft budget
      const deleteResponse = await apiClient.deleteBudget(tempBudgetId);
      expect(deleteResponse.ok).toBe(true);

      // Verify it's deleted
      const getResponse = await apiClient.getBudget(tempBudgetId);
      expect(getResponse.ok).toBe(false);

      console.log('✓ Draft budget creation and deletion verified');
    });
  });
});
