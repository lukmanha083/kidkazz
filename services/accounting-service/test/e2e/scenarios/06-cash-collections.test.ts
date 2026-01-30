/**
 * E2E Test Scenario 06: Cash Collections & Payments
 *
 * Tests collecting receivables and paying payables:
 * 1. Collect partial AR from Customer A - Rp 60,000,000
 *    - DR: Bank (1020) Rp 60,000,000
 *    - CR: Accounts Receivable (1110) Rp 60,000,000
 * 2. Pay Supplier A invoice - Rp 150,000,000
 *    - DR: Accounts Payable (2010) Rp 150,000,000
 *    - CR: Bank (1020) Rp 150,000,000
 * 3. Deposit POS cash to bank - Rp 100,000,000
 *    - DR: Bank (1020) Rp 100,000,000
 *    - CR: POS Cash (1012) Rp 100,000,000
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

describe('E2E Scenario 06: Cash Collections & Payments', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  // Test constants
  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1;

  const AR_COLLECTION_AMOUNT = 60_000_000;
  const AP_PAYMENT_AMOUNT = 150_000_000;
  const CASH_DEPOSIT_AMOUNT = 100_000_000;

  // Track created resources
  let arCollectionEntryId: string;
  let apPaymentEntryId: string;
  let cashDepositEntryId: string;

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

  describe('Collect AR from Customer A', () => {
    it('should record AR collection - Rp 60,000,000', async () => {
      const bankAccount = getAccountByCode(accountMap, '1020');
      const arAccount = getAccountByCode(accountMap, '1110');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-28',
        description: 'Penerimaan pembayaran dari PT Maju Jaya (partial)',
        reference: `E2E-RCV-A-${Date.now()}`,
        notes: 'Partial payment for INV-2026-001, Receipt: RCV-2026-001',
        entryType: 'Manual',
        lines: [
          {
            accountId: bankAccount.id,
            direction: 'Debit',
            amount: AR_COLLECTION_AMOUNT,
            memo: 'Terima transfer dari PT Maju Jaya',
          },
          {
            accountId: arAccount.id,
            direction: 'Credit',
            amount: AR_COLLECTION_AMOUNT,
            memo: 'Pelunasan sebagian piutang',
          },
        ],
      });

      expect(response.ok).toBe(true);
      arCollectionEntryId = response.data!.id;
    });

    it('should post AR collection entry', async () => {
      const response = await apiClient.postJournalEntry(arCollectionEntryId);
      expect(response.ok).toBe(true);
    });
  });

  describe('Pay Supplier A Invoice', () => {
    it('should record AP payment - Rp 150,000,000', async () => {
      const apAccount = getAccountByCode(accountMap, '2010');
      const bankAccount = getAccountByCode(accountMap, '1020');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-30',
        description: 'Pembayaran hutang ke Supplier A',
        reference: `E2E-PAY-A-${Date.now()}`,
        notes: 'Full payment for INV-A-001, Payment: PAY-2026-001',
        entryType: 'Manual',
        lines: [
          {
            accountId: apAccount.id,
            direction: 'Debit',
            amount: AP_PAYMENT_AMOUNT,
            memo: 'Pelunasan hutang Supplier A',
          },
          {
            accountId: bankAccount.id,
            direction: 'Credit',
            amount: AP_PAYMENT_AMOUNT,
            memo: 'Transfer ke Supplier A',
          },
        ],
      });

      expect(response.ok).toBe(true);
      apPaymentEntryId = response.data!.id;
    });

    it('should post AP payment entry', async () => {
      const response = await apiClient.postJournalEntry(apPaymentEntryId);
      expect(response.ok).toBe(true);
    });
  });

  describe('Deposit POS Cash to Bank', () => {
    it('should record cash deposit - Rp 100,000,000', async () => {
      const bankAccount = getAccountByCode(accountMap, '1020');
      const posCashAccount = getAccountByCode(accountMap, '1012');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-29',
        description: 'Setoran kas dari laci POS ke bank',
        reference: `E2E-DEP-${Date.now()}`,
        notes: 'Weekly cash deposit to BCA',
        entryType: 'Manual',
        lines: [
          {
            accountId: bankAccount.id,
            direction: 'Debit',
            amount: CASH_DEPOSIT_AMOUNT,
            memo: 'Setoran tunai ke BCA',
          },
          {
            accountId: posCashAccount.id,
            direction: 'Credit',
            amount: CASH_DEPOSIT_AMOUNT,
            memo: 'Pengambilan kas dari laci POS',
          },
        ],
      });

      expect(response.ok).toBe(true);
      cashDepositEntryId = response.data!.id;
    });

    it('should post cash deposit entry', async () => {
      const response = await apiClient.postJournalEntry(cashDepositEntryId);
      expect(response.ok).toBe(true);
    });
  });

  describe('Verify Cash Flow Balances', () => {
    it('should calculate updated balances', async () => {
      const response = await apiClient.calculatePeriodBalances(FISCAL_YEAR, FISCAL_MONTH);
      expect(response.ok).toBe(true);
    });

    it('should have reduced AR balance after collection', async () => {
      const arAccount = getAccountByCode(accountMap, '1110');
      const response = await apiClient.getAccountBalance(
        arAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { creditTotal: number };

      // Should have at least our collection amount as credits
      expect(balance.creditTotal).toBeGreaterThanOrEqual(AR_COLLECTION_AMOUNT);
    });

    it('should have reduced AP balance after payment', async () => {
      const apAccount = getAccountByCode(accountMap, '2010');
      const response = await apiClient.getAccountBalance(
        apAccount.id,
        FISCAL_YEAR,
        FISCAL_MONTH
      );

      expect(response.ok).toBe(true);
      const balance = response.data as { debitTotal: number };

      // Should have at least our payment amount as debits
      expect(balance.debitTotal).toBeGreaterThanOrEqual(AP_PAYMENT_AMOUNT);
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

    it('should output cash flow summary', async () => {
      const bankBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '1020').id, FISCAL_YEAR, FISCAL_MONTH
      );
      const posCashBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '1012').id, FISCAL_YEAR, FISCAL_MONTH
      );
      const arBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '1110').id, FISCAL_YEAR, FISCAL_MONTH
      );
      const apBalance = await apiClient.getAccountBalance(
        getAccountByCode(accountMap, '2010').id, FISCAL_YEAR, FISCAL_MONTH
      );

      const bank = (bankBalance.data as { closingBalance: number }).closingBalance;
      const posCash = (posCashBalance.data as { closingBalance: number }).closingBalance;
      const ar = (arBalance.data as { closingBalance: number }).closingBalance;
      const ap = (apBalance.data as { closingBalance: number }).closingBalance;

      console.log('\n=== Cash Collections & Payments Summary ===');
      console.log(`Bank BCA (1020): Rp ${bank.toLocaleString('id-ID')}`);
      console.log(`POS Cash (1012): Rp ${posCash.toLocaleString('id-ID')}`);
      console.log(`Accounts Receivable (1110): Rp ${ar.toLocaleString('id-ID')}`);
      console.log(`Accounts Payable (2010): Rp ${ap.toLocaleString('id-ID')}`);
      console.log(`---`);
      console.log(`This scenario - AR Collected: Rp ${AR_COLLECTION_AMOUNT.toLocaleString('id-ID')}`);
      console.log(`This scenario - AP Paid: Rp ${AP_PAYMENT_AMOUNT.toLocaleString('id-ID')}`);
      console.log(`This scenario - Cash Deposited: Rp ${CASH_DEPOSIT_AMOUNT.toLocaleString('id-ID')}`);
      console.log('============================================\n');

      expect(bank).toBeDefined();
      expect(ar).toBeGreaterThanOrEqual(0);
    });
  });
});
