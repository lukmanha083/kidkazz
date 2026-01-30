/**
 * E2E Test Scenario 02: Inventory Purchases
 *
 * Tests recording inventory purchases on credit using real D1 database:
 * 1. Purchase inventory from Supplier A - Rp 150,000,000
 *    - DR: Inventory (1210) Rp 150,000,000
 *    - CR: Accounts Payable (2010) Rp 150,000,000
 * 2. Purchase inventory from Supplier B - Rp 200,000,000
 *    - DR: Inventory (1210) Rp 200,000,000
 *    - CR: Accounts Payable (2010) Rp 200,000,000
 * 3. Verify AP balance and inventory increase
 *
 * Run with: pnpm test:e2e
 * Requires: Local dev server with --remote D1 or deployed worker
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';
import {
  fetchAccountMap,
  getAccountByCode,
  type AccountInfo,
} from '../fixtures/chart-of-accounts';

describe('E2E Scenario 02: Inventory Purchases', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  // Test constants
  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1;
  const PURCHASE_A_AMOUNT = 150_000_000; // Supplier A
  const PURCHASE_B_AMOUNT = 200_000_000; // Supplier B

  // Track created resources
  let purchaseAEntryId: string;
  let purchaseBEntryId: string;

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    // Verify service is running
    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(
        `Accounting service not reachable. Start with: pnpm dev --remote\nError: ${health.error}`
      );
    }

    // Get account map (assumes COA already seeded from scenario 01)
    accountMap = await fetchAccountMap(apiClient);
  });

  describe('Purchase from Supplier A', () => {
    it('should record inventory purchase on credit - Rp 150,000,000', async () => {
      const inventoryAccount = getAccountByCode(accountMap, '1210');
      const apAccount = getAccountByCode(accountMap, '2010');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-05',
        description: 'Pembelian barang dagang dari Supplier A secara kredit',
        reference: `E2E-PO-A-${Date.now()}`,
        notes: 'Invoice: INV-A-001, Due: 2026-02-05',
        entryType: 'Manual',
        lines: [
          {
            accountId: inventoryAccount.id,
            direction: 'Debit',
            amount: PURCHASE_A_AMOUNT,
            memo: 'Pembelian Persediaan - Supplier A',
          },
          {
            accountId: apAccount.id,
            direction: 'Credit',
            amount: PURCHASE_A_AMOUNT,
            memo: 'Hutang Dagang - Supplier A',
          },
        ],
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('id');
      purchaseAEntryId = response.data!.id;
    });

    it('should have balanced entry', async () => {
      const response = await apiClient.getJournalEntry(purchaseAEntryId);
      const entry = response.data as {
        lines: Array<{ direction: 'Debit' | 'Credit'; amount: number }>;
      };

      const totalDebits = entry.lines
        .filter((l) => l.direction === 'Debit')
        .reduce((sum, l) => sum + l.amount, 0);
      const totalCredits = entry.lines
        .filter((l) => l.direction === 'Credit')
        .reduce((sum, l) => sum + l.amount, 0);

      expect(totalDebits).toBe(PURCHASE_A_AMOUNT);
      expect(totalCredits).toBe(PURCHASE_A_AMOUNT);
    });

    it('should post the purchase entry', async () => {
      const postResponse = await apiClient.postJournalEntry(purchaseAEntryId);
      expect(postResponse.ok).toBe(true);

      const getResponse = await apiClient.getJournalEntry(purchaseAEntryId);
      const entry = getResponse.data as { status: string };
      expect(entry.status).toBe('Posted');
    });
  });

  describe('Purchase from Supplier B', () => {
    it('should record second inventory purchase on credit - Rp 200,000,000', async () => {
      const inventoryAccount = getAccountByCode(accountMap, '1210');
      const apAccount = getAccountByCode(accountMap, '2010');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-10',
        description: 'Pembelian barang dagang dari Supplier B secara kredit',
        reference: `E2E-PO-B-${Date.now()}`,
        notes: 'Invoice: INV-B-001, Due: 2026-02-10',
        entryType: 'Manual',
        lines: [
          {
            accountId: inventoryAccount.id,
            direction: 'Debit',
            amount: PURCHASE_B_AMOUNT,
            memo: 'Pembelian Persediaan - Supplier B',
          },
          {
            accountId: apAccount.id,
            direction: 'Credit',
            amount: PURCHASE_B_AMOUNT,
            memo: 'Hutang Dagang - Supplier B',
          },
        ],
      });

      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('id');
      purchaseBEntryId = response.data!.id;
    });

    it('should post the second purchase entry', async () => {
      const postResponse = await apiClient.postJournalEntry(purchaseBEntryId);
      expect(postResponse.ok).toBe(true);

      const getResponse = await apiClient.getJournalEntry(purchaseBEntryId);
      const entry = getResponse.data as { status: string };
      expect(entry.status).toBe('Posted');
    });
  });

  describe('Verify Balances After Purchases', () => {
    it('should calculate updated balances', async () => {
      const response = await apiClient.calculatePeriodBalances(FISCAL_YEAR, FISCAL_MONTH);
      expect(response.ok).toBe(true);
    });

    it('should have increased AP balance', async () => {
      const apAccount = getAccountByCode(accountMap, '2010');
      const response = await apiClient.getAccountBalance(
        apAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { creditTotal: number; closingBalance: number };

      // AP should have at least the sum of our purchases
      const expectedMinAP = PURCHASE_A_AMOUNT + PURCHASE_B_AMOUNT;
      expect(balance.creditTotal).toBeGreaterThanOrEqual(expectedMinAP);
    });

    it('should have balanced trial balance', async () => {
      const response = await apiClient.getTrialBalance(FISCAL_YEAR, FISCAL_MONTH);

      expect(response.ok).toBe(true);
      const trialBalance = response.data as {
        totalDebits: number;
        totalCredits: number;
      };

      // Trial balance must always be balanced
      expect(trialBalance.totalDebits).toBe(trialBalance.totalCredits);
    });

    it('should output purchase summary', async () => {
      const inventoryAccount = getAccountByCode(accountMap, '1210');
      const apAccount = getAccountByCode(accountMap, '2010');

      const inventoryBalance = await apiClient.getAccountBalance(
        inventoryAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );
      const apBalance = await apiClient.getAccountBalance(
        apAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      const invBal = inventoryBalance.data as { closingBalance: number };
      const apBal = apBalance.data as { closingBalance: number };

      console.log('\n=== Balances After Inventory Purchases ===');
      console.log(`Inventory (1210): Rp ${invBal.closingBalance.toLocaleString('id-ID')}`);
      console.log(`Accounts Payable (2010): Rp ${apBal.closingBalance.toLocaleString('id-ID')}`);
      console.log(`Purchases this scenario: Rp ${(PURCHASE_A_AMOUNT + PURCHASE_B_AMOUNT).toLocaleString('id-ID')}`);
      console.log('==========================================\n');

      expect(invBal.closingBalance).toBeGreaterThan(0);
      expect(apBal.closingBalance).toBeGreaterThan(0);
    });
  });
});
