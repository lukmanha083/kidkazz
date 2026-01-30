/**
 * E2E Test Scenario 04: Operating Expenses
 *
 * Tests recording various operating expenses:
 * 1. Salary payment - Rp 25,000,000
 *    - DR: Salary Expense (6010) Rp 25,000,000
 *    - CR: Bank (1020) Rp 25,000,000
 * 2. Office rent - Rp 15,000,000
 *    - DR: Rent Expense (6110) Rp 15,000,000
 *    - CR: Bank (1020) Rp 15,000,000
 * 3. Electricity - Rp 3,500,000
 *    - DR: Electricity Expense (6120) Rp 3,500,000
 *    - CR: Bank (1020) Rp 3,500,000
 * 4. Bank charges - Rp 150,000
 *    - DR: Bank Charges (6950) Rp 150,000
 *    - CR: Bank (1020) Rp 150,000
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

describe('E2E Scenario 04: Operating Expenses', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  // Test constants
  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1;

  const SALARY_AMOUNT = 25_000_000;
  const RENT_AMOUNT = 15_000_000;
  const ELECTRICITY_AMOUNT = 3_500_000;
  const BANK_CHARGES_AMOUNT = 150_000;

  // Track created resources
  let salaryEntryId: string;
  let rentEntryId: string;
  let electricityEntryId: string;
  let bankChargesEntryId: string;

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

  describe('Salary Payment', () => {
    it('should record salary expense - Rp 25,000,000', async () => {
      const salaryAccount = getAccountByCode(accountMap, '6010');
      const bankAccount = getAccountByCode(accountMap, '1020');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-25',
        description: 'Pembayaran gaji karyawan bulan Januari 2026',
        reference: `E2E-SAL-${Date.now()}`,
        notes: 'Monthly payroll January 2026',
        entryType: 'Standard',
        lines: [
          {
            accountId: salaryAccount.id,
            description: 'Beban Gaji Pokok - Januari',
            debitAmount: SALARY_AMOUNT,
            creditAmount: 0,
          },
          {
            accountId: bankAccount.id,
            description: 'Transfer gaji via BCA',
            debitAmount: 0,
            creditAmount: SALARY_AMOUNT,
          },
        ],
      });

      expect(response.ok).toBe(true);
      salaryEntryId = response.data!.id;
    });

    it('should post salary entry', async () => {
      const response = await apiClient.postJournalEntry(salaryEntryId);
      expect(response.ok).toBe(true);
    });
  });

  describe('Office Rent', () => {
    it('should record rent expense - Rp 15,000,000', async () => {
      const rentAccount = getAccountByCode(accountMap, '6110');
      const bankAccount = getAccountByCode(accountMap, '1020');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-05',
        description: 'Pembayaran sewa kantor bulan Januari 2026',
        reference: `E2E-RENT-${Date.now()}`,
        notes: 'Monthly office rent January 2026',
        entryType: 'Standard',
        lines: [
          {
            accountId: rentAccount.id,
            description: 'Beban Sewa Kantor - Januari',
            debitAmount: RENT_AMOUNT,
            creditAmount: 0,
          },
          {
            accountId: bankAccount.id,
            description: 'Transfer sewa via BCA',
            debitAmount: 0,
            creditAmount: RENT_AMOUNT,
          },
        ],
      });

      expect(response.ok).toBe(true);
      rentEntryId = response.data!.id;
    });

    it('should post rent entry', async () => {
      const response = await apiClient.postJournalEntry(rentEntryId);
      expect(response.ok).toBe(true);
    });
  });

  describe('Electricity', () => {
    it('should record electricity expense - Rp 3,500,000', async () => {
      const electricityAccount = getAccountByCode(accountMap, '6120');
      const bankAccount = getAccountByCode(accountMap, '1020');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-20',
        description: 'Pembayaran tagihan listrik Januari 2026',
        reference: `E2E-ELEC-${Date.now()}`,
        notes: 'PLN electricity bill January 2026',
        entryType: 'Standard',
        lines: [
          {
            accountId: electricityAccount.id,
            description: 'Beban Listrik - Januari',
            debitAmount: ELECTRICITY_AMOUNT,
            creditAmount: 0,
          },
          {
            accountId: bankAccount.id,
            description: 'Pembayaran listrik via BCA',
            debitAmount: 0,
            creditAmount: ELECTRICITY_AMOUNT,
          },
        ],
      });

      expect(response.ok).toBe(true);
      electricityEntryId = response.data!.id;
    });

    it('should post electricity entry', async () => {
      const response = await apiClient.postJournalEntry(electricityEntryId);
      expect(response.ok).toBe(true);
    });
  });

  describe('Bank Charges', () => {
    it('should record bank charges - Rp 150,000', async () => {
      const bankChargesAccount = getAccountByCode(accountMap, '6950');
      const bankAccount = getAccountByCode(accountMap, '1020');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-31',
        description: 'Biaya administrasi bank Januari 2026',
        reference: `E2E-BANK-${Date.now()}`,
        notes: 'Monthly bank administration fee',
        entryType: 'Standard',
        lines: [
          {
            accountId: bankChargesAccount.id,
            description: 'Beban Bank - Januari',
            debitAmount: BANK_CHARGES_AMOUNT,
            creditAmount: 0,
          },
          {
            accountId: bankAccount.id,
            description: 'Potongan biaya admin BCA',
            debitAmount: 0,
            creditAmount: BANK_CHARGES_AMOUNT,
          },
        ],
      });

      expect(response.ok).toBe(true);
      bankChargesEntryId = response.data!.id;
    });

    it('should post bank charges entry', async () => {
      const response = await apiClient.postJournalEntry(bankChargesEntryId);
      expect(response.ok).toBe(true);
    });
  });

  describe('Verify Expense Balances', () => {
    it('should calculate updated balances', async () => {
      const response = await apiClient.calculatePeriodBalances(FISCAL_YEAR, FISCAL_MONTH);
      expect(response.ok).toBe(true);
    });

    it('should have salary expense recorded', async () => {
      const salaryAccount = getAccountByCode(accountMap, '6010');
      const response = await apiClient.getAccountBalance(
        salaryAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { debitTotal: number };
      expect(balance.debitTotal).toBeGreaterThanOrEqual(SALARY_AMOUNT);
    });

    it('should have rent expense recorded', async () => {
      const rentAccount = getAccountByCode(accountMap, '6110');
      const response = await apiClient.getAccountBalance(
        rentAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { debitTotal: number };
      expect(balance.debitTotal).toBeGreaterThanOrEqual(RENT_AMOUNT);
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

    it('should output expense summary', async () => {
      const salaryBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '6010').id, FISCAL_YEAR, FISCAL_MONTH
      );
      const rentBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '6110').id, FISCAL_YEAR, FISCAL_MONTH
      );
      const electricityBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '6120').id, FISCAL_YEAR, FISCAL_MONTH
      );
      const bankChargesBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '6950').id, FISCAL_YEAR, FISCAL_MONTH
      );

      const salary = (salaryBalance.data as { closingBalance: number }).closingBalance;
      const rent = (rentBalance.data as { closingBalance: number }).closingBalance;
      const electricity = (electricityBalance.data as { closingBalance: number }).closingBalance;
      const bankCharges = (bankChargesBalance.data as { closingBalance: number }).closingBalance;

      const totalExpenses = SALARY_AMOUNT + RENT_AMOUNT + ELECTRICITY_AMOUNT + BANK_CHARGES_AMOUNT;

      console.log('\n=== Operating Expenses Summary ===');
      console.log(`Salary Expense (6010): Rp ${salary.toLocaleString('id-ID')}`);
      console.log(`Rent Expense (6110): Rp ${rent.toLocaleString('id-ID')}`);
      console.log(`Electricity Expense (6120): Rp ${electricity.toLocaleString('id-ID')}`);
      console.log(`Bank Charges (6950): Rp ${bankCharges.toLocaleString('id-ID')}`);
      console.log(`---`);
      console.log(`This scenario - Total Expenses: Rp ${totalExpenses.toLocaleString('id-ID')}`);
      console.log('==================================\n');

      expect(salary).toBeGreaterThan(0);
      expect(rent).toBeGreaterThan(0);
    });
  });
});
