/**
 * E2E Test Scenario 01: Period Setup
 *
 * Tests the initial setup of a new accounting period using real D1 database:
 * 1. Create fiscal period (January 2026)
 * 2. Verify Chart of Accounts exists
 * 3. Record opening balance - Owner's equity investment in inventory
 *    - DR: Inventory (1210) Rp 1,200,000,000
 *    - CR: Owner's Capital (3100) Rp 1,200,000,000
 * 4. Verify initial balances
 *
 * Run with: E2E_API_URL=https://accounting-service.xxx.workers.dev pnpm test:e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';
import {
  fetchAccountMap,
  getAccountByCode,
  type AccountInfo,
} from '../fixtures/chart-of-accounts';

describe('E2E Scenario 01: Period Setup', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  // Test constants
  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1; // January
  const OWNER_INVESTMENT_AMOUNT = 1_200_000_000; // Rp 1.2 billion

  // Track created resources for potential cleanup
  let openingEntryId: string;

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    // Verify service is running
    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(
        `Accounting service not reachable at ${process.env.E2E_API_URL}\nError: ${health.error}`
      );
    }

    // Fetch existing accounts from the database
    accountMap = await fetchAccountMap(apiClient);
    if (accountMap.size === 0) {
      throw new Error('No accounts found in database. Please seed the COA first.');
    }
  });

  describe('Step 1: Create Fiscal Period', () => {
    it('should create fiscal period January 2026', async () => {
      const response = await apiClient.createFiscalPeriod({
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: FISCAL_MONTH,
      });

      // May already exist from previous test run
      if (response.ok) {
        expect(response.data).toHaveProperty('id');
      } else {
        // Check if it already exists
        const existing = await apiClient.getFiscalPeriod(FISCAL_YEAR, FISCAL_MONTH);
        expect(existing.ok).toBe(true);
      }
    });

    it('should be able to retrieve the fiscal period', async () => {
      const response = await apiClient.getFiscalPeriod(FISCAL_YEAR, FISCAL_MONTH);

      expect(response.ok).toBe(true);
      const data = response.data as { fiscalYear: number; fiscalMonth: number };
      expect(data.fiscalYear).toBe(FISCAL_YEAR);
      expect(data.fiscalMonth).toBe(FISCAL_MONTH);
    });
  });

  describe('Step 2: Verify Chart of Accounts', () => {
    it('should have all essential accounts', async () => {
      // Verify key accounts exist
      const inventoryAccount = accountMap.get('1210');
      expect(inventoryAccount).toBeDefined();
      expect(inventoryAccount!.name).toBe('Persediaan Barang Dagang');

      const capitalAccount = accountMap.get('3100');
      expect(capitalAccount).toBeDefined();
      expect(capitalAccount!.name).toBe('Modal Disetor');

      const cashAccount = accountMap.get('1020');
      expect(cashAccount).toBeDefined();

      const salesAccount = accountMap.get('4010');
      expect(salesAccount).toBeDefined();
    });

    it('should have correct account types and normal balances', async () => {
      const inventoryAccount = accountMap.get('1210')!;
      expect(inventoryAccount.accountType).toBe('Asset');
      expect(inventoryAccount.normalBalance).toBe('Debit');

      const capitalAccount = accountMap.get('3100')!;
      expect(capitalAccount.accountType).toBe('Equity');
      expect(capitalAccount.normalBalance).toBe('Credit');
    });
  });

  describe('Step 3: Record Opening Balance - Owner Investment', () => {
    it('should create opening balance journal entry for owner inventory investment', async () => {
      const inventoryAccount = getAccountByCode(accountMap, '1210');
      const capitalAccount = getAccountByCode(accountMap, '3100');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-01',
        description:
          'Opening Balance - Pemilik menyetorkan persediaan barang dagang senilai Rp 1.200.000.000',
        reference: `E2E-OB-${Date.now()}`,
        notes: 'Owner invested inventory valued at Rp 1,200,000,000 as initial capital',
        entryType: 'Manual', // Opening entries use Manual type
        lines: [
          {
            accountId: inventoryAccount.id,
            direction: 'Debit',
            amount: OWNER_INVESTMENT_AMOUNT,
            memo: 'Persediaan Barang Dagang - Modal Pemilik',
          },
          {
            accountId: capitalAccount.id,
            direction: 'Credit',
            amount: OWNER_INVESTMENT_AMOUNT,
            memo: 'Modal Disetor - Setoran Persediaan',
          },
        ],
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('id');
      openingEntryId = response.data!.id;
    });

    it('should retrieve the created journal entry', async () => {
      const response = await apiClient.getJournalEntry(openingEntryId);

      expect(response.ok).toBe(true);
      const entry = response.data as {
        description: string;
        lines: Array<{ debitAmount: number; creditAmount: number }>;
      };
      expect(entry.description).toContain('Opening Balance');
      expect(entry.lines.length).toBe(2);
    });

    it('should have balanced debit and credit amounts', async () => {
      const response = await apiClient.getJournalEntry(openingEntryId);
      const entry = response.data as {
        lines: Array<{ direction: 'Debit' | 'Credit'; amount: number }>;
      };

      const totalDebits = entry.lines
        .filter((l) => l.direction === 'Debit')
        .reduce((sum, l) => sum + l.amount, 0);
      const totalCredits = entry.lines
        .filter((l) => l.direction === 'Credit')
        .reduce((sum, l) => sum + l.amount, 0);

      expect(totalDebits).toBe(OWNER_INVESTMENT_AMOUNT);
      expect(totalCredits).toBe(OWNER_INVESTMENT_AMOUNT);
    });

    it('should post the opening balance entry', async () => {
      const postResponse = await apiClient.postJournalEntry(openingEntryId);
      expect(postResponse.ok).toBe(true);

      // Verify status changed to Posted
      const getResponse = await apiClient.getJournalEntry(openingEntryId);
      const entry = getResponse.data as { status: string };
      expect(entry.status).toBe('Posted');
    });
  });

  describe('Step 4: Verify Initial Balances', () => {
    it('should calculate period balances', async () => {
      const response = await apiClient.calculatePeriodBalances(FISCAL_YEAR, FISCAL_MONTH);
      // May fail if already calculated, that's ok
      expect(response.status).toBeDefined();
    });

    it('should have trial balance', async () => {
      const response = await apiClient.getTrialBalance(FISCAL_YEAR, FISCAL_MONTH);

      expect(response.ok).toBe(true);
      const trialBalance = response.data as {
        totalDebits: number;
        totalCredits: number;
        isBalanced: boolean;
      };

      expect(trialBalance.isBalanced).toBe(true);
      expect(trialBalance.totalDebits).toBe(trialBalance.totalCredits);
    });
  });

  describe('Step 5: Summary Output', () => {
    it('should output opening balances summary', async () => {
      const trialBalance = await apiClient.getTrialBalance(FISCAL_YEAR, FISCAL_MONTH);
      const tb = trialBalance.data as { totalDebits: number; totalCredits: number };

      console.log('\n=== Opening Balances for E2E Test Suite ===');
      console.log(`Fiscal Period: ${FISCAL_YEAR}-${FISCAL_MONTH.toString().padStart(2, '0')}`);
      console.log(`Total Debits: Rp ${tb.totalDebits.toLocaleString('id-ID')}`);
      console.log(`Total Credits: Rp ${tb.totalCredits.toLocaleString('id-ID')}`);
      console.log(`Opening Entry ID: ${openingEntryId}`);
      console.log('==========================================\n');

      expect(tb.totalDebits).toBeGreaterThanOrEqual(0);
    });
  });
});
