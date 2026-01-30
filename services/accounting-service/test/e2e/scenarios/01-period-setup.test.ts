/**
 * E2E Test Scenario 01: Period Setup
 *
 * Tests the initial setup of a new accounting period using real D1 database:
 * 1. Create fiscal period (January 2026)
 * 2. Setup Chart of Accounts via API
 * 3. Record opening balance - Owner's equity investment in inventory
 *    - DR: Inventory (1210) Rp 1,200,000,000
 *    - CR: Owner's Capital (3100) Rp 1,200,000,000
 * 4. Verify initial balances
 *
 * Run with: pnpm test:e2e
 * Requires: Local dev server with --remote D1 or deployed worker
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';
import {
  seedChartOfAccounts,
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
  let fiscalPeriodCreated = false;

  beforeAll(async () => {
    // Initialize API client - uses E2E_API_URL env var or defaults to localhost:8794
    apiClient = new AccountingApiClient();

    // Verify service is running
    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(
        `Accounting service not reachable. Start with: pnpm dev --remote\nError: ${health.error}`
      );
    }

    // Seed chart of accounts (idempotent - will fetch existing if already created)
    accountMap = await seedChartOfAccounts(apiClient);
  });

  describe('Step 1: Create Fiscal Period', () => {
    it('should create fiscal period January 2026', async () => {
      const response = await apiClient.createFiscalPeriod({
        year: FISCAL_YEAR,
        month: FISCAL_MONTH,
        name: 'January 2026',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      // May already exist from previous test run
      if (response.ok) {
        fiscalPeriodCreated = true;
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
      expect(response.data).toMatchObject({
        year: FISCAL_YEAR,
        month: FISCAL_MONTH,
      });
    });
  });

  describe('Step 2: Verify Chart of Accounts', () => {
    it('should have all essential accounts created', async () => {
      // Verify key accounts exist
      const inventoryResponse = await apiClient.getAccountByCode('1210');
      expect(inventoryResponse.ok).toBe(true);
      const inventory = inventoryResponse.data as { name: string };
      expect(inventory.name).toBe('Persediaan Barang Dagang');

      const capitalResponse = await apiClient.getAccountByCode('3100');
      expect(capitalResponse.ok).toBe(true);
      const capital = capitalResponse.data as { name: string };
      expect(capital.name).toBe('Modal Disetor');

      const cashResponse = await apiClient.getAccountByCode('1020');
      expect(cashResponse.ok).toBe(true);
      const cash = cashResponse.data as { name: string };
      expect(cash.name).toBe('Bank BCA - Operasional');

      const salesResponse = await apiClient.getAccountByCode('4010');
      expect(salesResponse.ok).toBe(true);
      const sales = salesResponse.data as { name: string };
      expect(sales.name).toBe('Penjualan - POS Retail');
    });

    it('should have correct account types and normal balances', async () => {
      const inventoryResponse = await apiClient.getAccountByCode('1210');
      const inventory = inventoryResponse.data as {
        accountType: string;
        normalBalance: string;
      };
      expect(inventory.accountType).toBe('Asset');
      expect(inventory.normalBalance).toBe('Debit');

      const capitalResponse = await apiClient.getAccountByCode('3100');
      const capital = capitalResponse.data as {
        accountType: string;
        normalBalance: string;
      };
      expect(capital.accountType).toBe('Equity');
      expect(capital.normalBalance).toBe('Credit');
    });
  });

  describe('Step 3: Record Opening Balance - Owner Investment', () => {
    it('should create opening balance journal entry for owner inventory investment', async () => {
      const inventoryAccount = getAccountByCode(accountMap, '1210');
      const capitalAccount = getAccountByCode(accountMap, '3100');

      // Create opening balance journal entry
      // DR: Inventory (1210) Rp 1,200,000,000
      // CR: Owner's Capital (3100) Rp 1,200,000,000
      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-01',
        description:
          'Opening Balance - Pemilik menyetorkan persediaan barang dagang senilai Rp 1.200.000.000',
        reference: `E2E-OB-${Date.now()}`, // Unique reference for cleanup
        notes: 'Owner invested inventory valued at Rp 1,200,000,000 as initial capital',
        entryType: 'Opening',
        lines: [
          {
            accountId: inventoryAccount.id,
            description: 'Persediaan Barang Dagang - Modal Pemilik',
            debitAmount: OWNER_INVESTMENT_AMOUNT,
            creditAmount: 0,
          },
          {
            accountId: capitalAccount.id,
            description: 'Modal Disetor - Setoran Persediaan',
            debitAmount: 0,
            creditAmount: OWNER_INVESTMENT_AMOUNT,
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
        lines: Array<{ debitAmount: number; creditAmount: number }>;
      };

      const totalDebits = entry.lines.reduce((sum, l) => sum + l.debitAmount, 0);
      const totalCredits = entry.lines.reduce((sum, l) => sum + l.creditAmount, 0);

      expect(totalDebits).toBe(OWNER_INVESTMENT_AMOUNT);
      expect(totalCredits).toBe(OWNER_INVESTMENT_AMOUNT);
      expect(totalDebits).toBe(totalCredits); // Double-entry integrity
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
      expect(response.ok).toBe(true);
    });

    it('should have correct inventory balance', async () => {
      const inventoryAccount = getAccountByCode(accountMap, '1210');
      const response = await apiClient.getAccountBalance(
        inventoryAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as {
        debitTotal: number;
        creditTotal: number;
        closingBalance: number;
      };
      expect(balance.debitTotal).toBe(OWNER_INVESTMENT_AMOUNT);
      expect(balance.creditTotal).toBe(0);
      expect(balance.closingBalance).toBe(OWNER_INVESTMENT_AMOUNT);
    });

    it('should have correct capital balance', async () => {
      const capitalAccount = getAccountByCode(accountMap, '3100');
      const response = await apiClient.getAccountBalance(
        capitalAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as {
        debitTotal: number;
        creditTotal: number;
        closingBalance: number;
      };
      expect(balance.debitTotal).toBe(0);
      expect(balance.creditTotal).toBe(OWNER_INVESTMENT_AMOUNT);
      expect(balance.closingBalance).toBe(OWNER_INVESTMENT_AMOUNT);
    });

    it('should have balanced trial balance', async () => {
      const response = await apiClient.getTrialBalance(FISCAL_YEAR, FISCAL_MONTH);

      expect(response.ok).toBe(true);
      const trialBalance = response.data as {
        totalDebits: number;
        totalCredits: number;
      };

      // Trial balance should be balanced
      expect(trialBalance.totalDebits).toBe(trialBalance.totalCredits);
    });
  });

  describe('Step 5: Summary Output', () => {
    it('should output opening balances summary', async () => {
      const inventoryAccount = getAccountByCode(accountMap, '1210');
      const capitalAccount = getAccountByCode(accountMap, '3100');

      const inventoryBalance = await apiClient.getAccountBalance(
        inventoryAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );
      const capitalBalance = await apiClient.getAccountBalance(
        capitalAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      const invBal = inventoryBalance.data as { closingBalance: number };
      const capBal = capitalBalance.data as { closingBalance: number };

      console.log('\n=== Opening Balances for E2E Test Suite ===');
      console.log(`Inventory (1210): Rp ${invBal.closingBalance.toLocaleString('id-ID')}`);
      console.log(`Owner's Capital (3100): Rp ${capBal.closingBalance.toLocaleString('id-ID')}`);
      console.log('==========================================\n');

      expect(invBal.closingBalance).toBe(OWNER_INVESTMENT_AMOUNT);
      expect(capBal.closingBalance).toBe(OWNER_INVESTMENT_AMOUNT);
    });
  });
});
