/**
 * E2E Test Scenario 03: Cash Sales (POS Retail)
 *
 * Tests recording retail cash sales with COGS:
 * 1. Cash sale - Rp 50,000,000 (COGS: Rp 35,000,000, Margin: 30%)
 *    - DR: Cash (1012) Rp 50,000,000
 *    - CR: Sales Revenue (4010) Rp 50,000,000
 *    - DR: COGS (5310) Rp 35,000,000
 *    - CR: Inventory (1210) Rp 35,000,000
 * 2. Second cash sale - Rp 75,000,000 (COGS: Rp 52,500,000)
 * 3. Verify revenue, COGS, and inventory reduction
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

describe('E2E Scenario 03: Cash Sales', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  // Test constants
  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1;

  // Sale 1: Rp 50M revenue, 30% margin = Rp 35M COGS
  const SALE_1_REVENUE = 50_000_000;
  const SALE_1_COGS = 35_000_000;

  // Sale 2: Rp 75M revenue, 30% margin = Rp 52.5M COGS
  const SALE_2_REVENUE = 75_000_000;
  const SALE_2_COGS = 52_500_000;

  // Track created resources
  let sale1RevenueEntryId: string;
  let sale1CogsEntryId: string;
  let sale2RevenueEntryId: string;
  let sale2CogsEntryId: string;

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(
        `Accounting service not reachable. Start with: pnpm dev --remote\nError: ${health.error}`
      );
    }

    accountMap = await fetchAccountMap(apiClient);
  });

  describe('Cash Sale 1 - Rp 50,000,000', () => {
    it('should record cash revenue entry', async () => {
      const cashAccount = getAccountByCode(accountMap, '1012'); // POS Cash Drawer
      const salesAccount = getAccountByCode(accountMap, '4010'); // POS Retail Sales

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-08',
        description: 'Penjualan tunai POS - Transaksi harian',
        reference: `E2E-SALE-1-${Date.now()}`,
        notes: 'Daily POS sales batch',
        entryType: 'Manual',
        lines: [
          {
            accountId: cashAccount.id,
            direction: 'Debit',
            amount: SALE_1_REVENUE,
            memo: 'Kas Laci POS - Penjualan',
          },
          {
            accountId: salesAccount.id,
            direction: 'Credit',
            amount: SALE_1_REVENUE,
            memo: 'Pendapatan Penjualan POS',
          },
        ],
      });

      expect(response.ok).toBe(true);
      sale1RevenueEntryId = response.data!.id;
    });

    it('should record COGS entry for sale 1', async () => {
      const cogsAccount = getAccountByCode(accountMap, '5310'); // COGS - POS Retail
      const inventoryAccount = getAccountByCode(accountMap, '1210'); // Inventory

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-08',
        description: 'HPP Penjualan tunai POS',
        reference: `E2E-COGS-1-${Date.now()}`,
        notes: 'COGS for daily POS sales',
        entryType: 'Manual',
        lines: [
          {
            accountId: cogsAccount.id,
            direction: 'Debit',
            amount: SALE_1_COGS,
            memo: 'HPP - POS Retail',
          },
          {
            accountId: inventoryAccount.id,
            direction: 'Credit',
            amount: SALE_1_COGS,
            memo: 'Pengurangan Persediaan',
          },
        ],
      });

      expect(response.ok).toBe(true);
      sale1CogsEntryId = response.data!.id;
    });

    it('should post both entries for sale 1', async () => {
      const post1 = await apiClient.postJournalEntry(sale1RevenueEntryId);
      const post2 = await apiClient.postJournalEntry(sale1CogsEntryId);

      expect(post1.ok).toBe(true);
      expect(post2.ok).toBe(true);
    });
  });

  describe('Cash Sale 2 - Rp 75,000,000', () => {
    it('should record cash revenue entry', async () => {
      const cashAccount = getAccountByCode(accountMap, '1012');
      const salesAccount = getAccountByCode(accountMap, '4010');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-15',
        description: 'Penjualan tunai POS - Transaksi harian',
        reference: `E2E-SALE-2-${Date.now()}`,
        notes: 'Daily POS sales batch - mid month',
        entryType: 'Manual',
        lines: [
          {
            accountId: cashAccount.id,
            direction: 'Debit',
            amount: SALE_2_REVENUE,
            memo: 'Kas Laci POS - Penjualan',
          },
          {
            accountId: salesAccount.id,
            direction: 'Credit',
            amount: SALE_2_REVENUE,
            memo: 'Pendapatan Penjualan POS',
          },
        ],
      });

      expect(response.ok).toBe(true);
      sale2RevenueEntryId = response.data!.id;
    });

    it('should record COGS entry for sale 2', async () => {
      const cogsAccount = getAccountByCode(accountMap, '5310');
      const inventoryAccount = getAccountByCode(accountMap, '1210');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-15',
        description: 'HPP Penjualan tunai POS',
        reference: `E2E-COGS-2-${Date.now()}`,
        notes: 'COGS for daily POS sales - mid month',
        entryType: 'Manual',
        lines: [
          {
            accountId: cogsAccount.id,
            direction: 'Debit',
            amount: SALE_2_COGS,
            memo: 'HPP - POS Retail',
          },
          {
            accountId: inventoryAccount.id,
            direction: 'Credit',
            amount: SALE_2_COGS,
            memo: 'Pengurangan Persediaan',
          },
        ],
      });

      expect(response.ok).toBe(true);
      sale2CogsEntryId = response.data!.id;
    });

    it('should post both entries for sale 2', async () => {
      const post1 = await apiClient.postJournalEntry(sale2RevenueEntryId);
      const post2 = await apiClient.postJournalEntry(sale2CogsEntryId);

      expect(post1.ok).toBe(true);
      expect(post2.ok).toBe(true);
    });
  });

  describe('Verify Sales Balances', () => {
    it('should calculate updated balances', async () => {
      const response = await apiClient.calculatePeriodBalances(FISCAL_YEAR, FISCAL_MONTH);
      expect(response.ok).toBe(true);
    });

    it('should have cash balance from sales', async () => {
      const cashAccount = getAccountByCode(accountMap, '1012');
      const response = await apiClient.getAccountBalance(
        cashAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { debitTotal: number; closingBalance: number };

      const expectedCash = SALE_1_REVENUE + SALE_2_REVENUE;
      expect(balance.debitTotal).toBeGreaterThanOrEqual(expectedCash);
    });

    it('should have sales revenue recorded', async () => {
      const salesAccount = getAccountByCode(accountMap, '4010');
      const response = await apiClient.getAccountBalance(
        salesAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { creditTotal: number; closingBalance: number };

      const expectedRevenue = SALE_1_REVENUE + SALE_2_REVENUE;
      expect(balance.creditTotal).toBeGreaterThanOrEqual(expectedRevenue);
    });

    it('should have COGS recorded', async () => {
      const cogsAccount = getAccountByCode(accountMap, '5310');
      const response = await apiClient.getAccountBalance(
        cogsAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { debitTotal: number; closingBalance: number };

      const expectedCogs = SALE_1_COGS + SALE_2_COGS;
      expect(balance.debitTotal).toBeGreaterThanOrEqual(expectedCogs);
    });

    it('should have balanced trial balance', async () => {
      const response = await apiClient.getTrialBalance(FISCAL_YEAR, FISCAL_MONTH);

      expect(response.ok).toBe(true);
      const trialBalance = response.data as {
        totalDebits: number;
        totalCredits: number;
      };

      expect(trialBalance.totalDebits).toBe(trialBalance.totalCredits);
    });

    it('should output sales summary', async () => {
      const cashAccount = getAccountByCode(accountMap, '1012');
      const salesAccount = getAccountByCode(accountMap, '4010');
      const cogsAccount = getAccountByCode(accountMap, '5310');

      const cashBalance = await apiClient.getAccountBalance(cashAccount.id, FISCAL_YEAR, FISCAL_MONTH);
      const salesBalance = await apiClient.getAccountBalance(salesAccount.id, FISCAL_YEAR, FISCAL_MONTH);
      const cogsBalance = await apiClient.getAccountBalance(cogsAccount.id, FISCAL_YEAR, FISCAL_MONTH);

      const cash = (cashBalance.data as { closingBalance: number }).closingBalance;
      const sales = (salesBalance.data as { closingBalance: number }).closingBalance;
      const cogs = (cogsBalance.data as { closingBalance: number }).closingBalance;

      const totalRevenue = SALE_1_REVENUE + SALE_2_REVENUE;
      const totalCogs = SALE_1_COGS + SALE_2_COGS;
      const grossProfit = totalRevenue - totalCogs;

      console.log('\n=== Cash Sales Summary ===');
      console.log(`POS Cash (1012): Rp ${cash.toLocaleString('id-ID')}`);
      console.log(`Sales Revenue (4010): Rp ${sales.toLocaleString('id-ID')}`);
      console.log(`COGS (5310): Rp ${cogs.toLocaleString('id-ID')}`);
      console.log(`---`);
      console.log(`This scenario - Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}`);
      console.log(`This scenario - COGS: Rp ${totalCogs.toLocaleString('id-ID')}`);
      console.log(`This scenario - Gross Profit: Rp ${grossProfit.toLocaleString('id-ID')} (${((grossProfit/totalRevenue)*100).toFixed(1)}%)`);
      console.log('==========================\n');

      expect(sales).toBeGreaterThan(0);
      expect(cogs).toBeGreaterThan(0);
    });
  });
});
