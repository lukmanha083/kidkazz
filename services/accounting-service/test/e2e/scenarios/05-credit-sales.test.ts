/**
 * E2E Test Scenario 05: Credit Sales (Wholesale)
 *
 * Tests recording wholesale credit sales:
 * 1. Credit sale to Customer A - Rp 100,000,000 (COGS: Rp 70,000,000)
 *    - DR: Accounts Receivable (1110) Rp 100,000,000
 *    - CR: Sales Revenue - Wholesale (4020) Rp 100,000,000
 *    - DR: COGS (5310) Rp 70,000,000
 *    - CR: Inventory (1210) Rp 70,000,000
 * 2. Credit sale to Customer B - Rp 80,000,000 (COGS: Rp 56,000,000)
 * 3. Verify AR balance and revenue
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

describe('E2E Scenario 05: Credit Sales (Wholesale)', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  // Test constants
  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1;

  // Customer A: Rp 100M revenue, 30% margin = Rp 70M COGS
  const SALE_A_REVENUE = 100_000_000;
  const SALE_A_COGS = 70_000_000;

  // Customer B: Rp 80M revenue, 30% margin = Rp 56M COGS
  const SALE_B_REVENUE = 80_000_000;
  const SALE_B_COGS = 56_000_000;

  // Track created resources
  let saleARevenueEntryId: string;
  let saleACogsEntryId: string;
  let saleBRevenueEntryId: string;
  let saleBCogsEntryId: string;

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(
        `Accounting service not reachable. Start with: pnpm dev --remote\nError: ${health.error}`
      );
    }

    accountMap = await seedChartOfAccounts(apiClient);
  });

  describe('Credit Sale to Customer A - Rp 100,000,000', () => {
    it('should record credit sale revenue', async () => {
      const arAccount = getAccountByCode(accountMap, '1110');
      const salesAccount = getAccountByCode(accountMap, '4020'); // Wholesale Sales

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-12',
        description: 'Penjualan kredit ke Customer A - PT Maju Jaya',
        reference: `E2E-INV-A-${Date.now()}`,
        notes: 'Invoice: INV-2026-001, Terms: Net 30, Due: 2026-02-11',
        entryType: 'Standard',
        lines: [
          {
            accountId: arAccount.id,
            description: 'Piutang - PT Maju Jaya',
            debitAmount: SALE_A_REVENUE,
            creditAmount: 0,
          },
          {
            accountId: salesAccount.id,
            description: 'Penjualan Wholesale',
            debitAmount: 0,
            creditAmount: SALE_A_REVENUE,
          },
        ],
      });

      expect(response.ok).toBe(true);
      saleARevenueEntryId = response.data!.id;
    });

    it('should record COGS for Customer A sale', async () => {
      const cogsAccount = getAccountByCode(accountMap, '5310');
      const inventoryAccount = getAccountByCode(accountMap, '1210');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-12',
        description: 'HPP Penjualan ke Customer A',
        reference: `E2E-COGS-A-${Date.now()}`,
        notes: 'COGS for INV-2026-001',
        entryType: 'Standard',
        lines: [
          {
            accountId: cogsAccount.id,
            description: 'HPP - Wholesale Customer A',
            debitAmount: SALE_A_COGS,
            creditAmount: 0,
          },
          {
            accountId: inventoryAccount.id,
            description: 'Pengurangan Persediaan',
            debitAmount: 0,
            creditAmount: SALE_A_COGS,
          },
        ],
      });

      expect(response.ok).toBe(true);
      saleACogsEntryId = response.data!.id;
    });

    it('should post both entries for Customer A', async () => {
      const post1 = await apiClient.postJournalEntry(saleARevenueEntryId);
      const post2 = await apiClient.postJournalEntry(saleACogsEntryId);

      expect(post1.ok).toBe(true);
      expect(post2.ok).toBe(true);
    });
  });

  describe('Credit Sale to Customer B - Rp 80,000,000', () => {
    it('should record credit sale revenue', async () => {
      const arAccount = getAccountByCode(accountMap, '1110');
      const salesAccount = getAccountByCode(accountMap, '4020');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-18',
        description: 'Penjualan kredit ke Customer B - CV Sukses Makmur',
        reference: `E2E-INV-B-${Date.now()}`,
        notes: 'Invoice: INV-2026-002, Terms: Net 30, Due: 2026-02-17',
        entryType: 'Standard',
        lines: [
          {
            accountId: arAccount.id,
            description: 'Piutang - CV Sukses Makmur',
            debitAmount: SALE_B_REVENUE,
            creditAmount: 0,
          },
          {
            accountId: salesAccount.id,
            description: 'Penjualan Wholesale',
            debitAmount: 0,
            creditAmount: SALE_B_REVENUE,
          },
        ],
      });

      expect(response.ok).toBe(true);
      saleBRevenueEntryId = response.data!.id;
    });

    it('should record COGS for Customer B sale', async () => {
      const cogsAccount = getAccountByCode(accountMap, '5310');
      const inventoryAccount = getAccountByCode(accountMap, '1210');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-18',
        description: 'HPP Penjualan ke Customer B',
        reference: `E2E-COGS-B-${Date.now()}`,
        notes: 'COGS for INV-2026-002',
        entryType: 'Standard',
        lines: [
          {
            accountId: cogsAccount.id,
            description: 'HPP - Wholesale Customer B',
            debitAmount: SALE_B_COGS,
            creditAmount: 0,
          },
          {
            accountId: inventoryAccount.id,
            description: 'Pengurangan Persediaan',
            debitAmount: 0,
            creditAmount: SALE_B_COGS,
          },
        ],
      });

      expect(response.ok).toBe(true);
      saleBCogsEntryId = response.data!.id;
    });

    it('should post both entries for Customer B', async () => {
      const post1 = await apiClient.postJournalEntry(saleBRevenueEntryId);
      const post2 = await apiClient.postJournalEntry(saleBCogsEntryId);

      expect(post1.ok).toBe(true);
      expect(post2.ok).toBe(true);
    });
  });

  describe('Verify Credit Sales Balances', () => {
    it('should calculate updated balances', async () => {
      const response = await apiClient.calculatePeriodBalances(FISCAL_YEAR, FISCAL_MONTH);
      expect(response.ok).toBe(true);
    });

    it('should have AR balance from credit sales', async () => {
      const arAccount = getAccountByCode(accountMap, '1110');
      const response = await apiClient.getAccountBalance(
        arAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { debitTotal: number; closingBalance: number };

      const expectedAR = SALE_A_REVENUE + SALE_B_REVENUE;
      expect(balance.debitTotal).toBeGreaterThanOrEqual(expectedAR);
    });

    it('should have wholesale sales revenue recorded', async () => {
      const salesAccount = getAccountByCode(accountMap, '4020');
      const response = await apiClient.getAccountBalance(
        salesAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { creditTotal: number };

      const expectedRevenue = SALE_A_REVENUE + SALE_B_REVENUE;
      expect(balance.creditTotal).toBeGreaterThanOrEqual(expectedRevenue);
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

    it('should output credit sales summary', async () => {
      const arBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '1110').id, FISCAL_YEAR, FISCAL_MONTH
      );
      const wholesaleSalesBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '4020').id, FISCAL_YEAR, FISCAL_MONTH
      );

      const ar = (arBalance.data as { closingBalance: number }).closingBalance;
      const wholesaleSales = (wholesaleSalesBalance.data as { closingBalance: number }).closingBalance;

      const totalRevenue = SALE_A_REVENUE + SALE_B_REVENUE;
      const totalCogs = SALE_A_COGS + SALE_B_COGS;
      const grossProfit = totalRevenue - totalCogs;

      console.log('\n=== Credit Sales (Wholesale) Summary ===');
      console.log(`Accounts Receivable (1110): Rp ${ar.toLocaleString('id-ID')}`);
      console.log(`Wholesale Sales (4020): Rp ${wholesaleSales.toLocaleString('id-ID')}`);
      console.log(`---`);
      console.log(`This scenario - Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}`);
      console.log(`This scenario - COGS: Rp ${totalCogs.toLocaleString('id-ID')}`);
      console.log(`This scenario - Gross Profit: Rp ${grossProfit.toLocaleString('id-ID')} (${((grossProfit/totalRevenue)*100).toFixed(1)}%)`);
      console.log('========================================\n');

      expect(ar).toBeGreaterThan(0);
      expect(wholesaleSales).toBeGreaterThan(0);
    });
  });
});
