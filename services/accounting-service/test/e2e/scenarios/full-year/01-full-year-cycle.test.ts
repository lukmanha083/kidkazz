/**
 * E2E Test: Full 12-Month Accounting Cycle
 *
 * Tests a complete fiscal year (2026) with synthetic transaction data:
 * - Creates and processes 12 fiscal periods
 * - Records opening balance in January
 * - Monthly transactions: purchases, cash sales, credit sales, expenses
 * - Monthly cash collections and AP payments
 * - Closes each month sequentially
 * - Generates year-end financial reports
 *
 * Run with: E2E_API_URL=https://accounting-service.xxx.workers.dev pnpm test:e2e -- full-year
 *
 * IMPORTANT: This test creates substantial data. Run on a test environment.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../../helpers/api-client';
import {
  fetchAccountMap,
  getAccountByCode,
  type AccountInfo,
} from '../../fixtures/chart-of-accounts';
import {
  generateFullYearData,
  generateAnnualSummary,
  type MonthlyTransactionData,
} from '../../fixtures/synthetic-data';

describe('E2E: Full 12-Month Accounting Cycle', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;
  let yearData: MonthlyTransactionData[];

  const FISCAL_YEAR = 2026;
  const OWNER_INVESTMENT_AMOUNT = 1_200_000_000; // Rp 1.2 billion opening inventory

  // Track all created entry IDs for verification
  const createdEntries: Map<string, string[]> = new Map();

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    // Verify service is running
    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(
        `Accounting service not reachable at ${process.env.E2E_API_URL || 'http://localhost:8794'}\nError: ${health.error}`
      );
    }

    // Fetch existing accounts
    accountMap = await fetchAccountMap(apiClient);
    if (accountMap.size === 0) {
      throw new Error('No accounts found. Please seed the Chart of Accounts first.');
    }

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     FULL YEAR E2E TEST - 12 MONTH ACCOUNTING CYCLE           ║');
    console.log('║                    Fiscal Year 2026                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // Cleanup previous E2E test data before starting fresh
    console.log('\n🧹 Cleaning up previous E2E test data...');
    const cleanupResult = await apiClient.cleanupE2EData(FISCAL_YEAR, true);
    if (cleanupResult.ok && cleanupResult.data) {
      console.log(`   Deleted ${cleanupResult.data.deletedJournalEntries} journal entries`);
      console.log(`   Deleted ${cleanupResult.data.deletedJournalLines} journal lines`);
      console.log(`   Deleted ${cleanupResult.data.deletedAccountBalances} account balances`);
      console.log(`   Reset ${cleanupResult.data.resetFiscalPeriods} fiscal periods to Open`);
    } else {
      console.log('   No previous data to clean up or cleanup not available');
    }

    // Generate synthetic data for all 12 months
    yearData = generateFullYearData(FISCAL_YEAR, 42); // Seed 42 for reproducibility

    console.log('\n📊 Synthetic data generated for 12 months');
    console.log('');
  }, 60000);

  describe('Phase 1: Setup All Fiscal Periods', () => {
    it('should create fiscal periods for all 12 months', async () => {
      for (let month = 1; month <= 12; month++) {
        const response = await apiClient.createFiscalPeriod({
          fiscalYear: FISCAL_YEAR,
          fiscalMonth: month,
        });

        // May already exist from previous runs
        if (response.ok) {
          expect(response.data).toHaveProperty('id');
        } else {
          const existing = await apiClient.getFiscalPeriod(FISCAL_YEAR, month);
          expect(existing.ok).toBe(true);
        }
      }

      console.log('✓ All 12 fiscal periods created/verified');
    }, 60000);
  });

  describe('Phase 2: January - Opening Balance', () => {
    it('should record owner investment as opening balance', async () => {
      const inventoryAccount = getAccountByCode(accountMap, '1210');
      const capitalAccount = getAccountByCode(accountMap, '3100');

      const response = await apiClient.createJournalEntry({
        entryDate: '2026-01-01',
        description: 'Saldo Awal - Setoran modal berupa persediaan barang dagang',
        reference: `E2E-FULL-YEAR-OB-${Date.now()}`,
        notes: 'Opening balance: Owner invested inventory valued at Rp 1,200,000,000',
        entryType: 'Manual',
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

      // Post the entry
      const postResponse = await apiClient.postJournalEntry(response.data!.id);
      expect(postResponse.ok).toBe(true);

      console.log(`✓ Opening balance recorded: Rp ${OWNER_INVESTMENT_AMOUNT.toLocaleString('id-ID')}`);
    });
  });

  // Generate test suites for each month
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const month = monthIndex + 1;
    const monthName = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ][monthIndex];

    describe(`Phase 3.${month}: ${monthName} ${FISCAL_YEAR} - Monthly Transactions`, () => {
      let monthData: MonthlyTransactionData;

      beforeAll(() => {
        monthData = yearData[monthIndex];
        createdEntries.set(`month-${month}`, []);
      });

      it(`should record inventory purchases for ${monthName}`, async () => {
        const inventoryAccount = getAccountByCode(accountMap, '1210');
        const apAccount = getAccountByCode(accountMap, '2010');

        for (const purchase of monthData.purchases) {
          const response = await apiClient.createJournalEntry({
            entryDate: purchase.date,
            description: purchase.description,
            reference: `E2E-${purchase.invoiceRef}`,
            entryType: 'Manual',
            lines: [
              {
                accountId: inventoryAccount.id,
                direction: 'Debit',
                amount: purchase.amount,
                memo: `Pembelian dari ${purchase.supplier}`,
              },
              {
                accountId: apAccount.id,
                direction: 'Credit',
                amount: purchase.amount,
                memo: `Hutang ke ${purchase.supplier}`,
              },
            ],
          });

          expect(response.ok).toBe(true);
          await apiClient.postJournalEntry(response.data!.id);
          createdEntries.get(`month-${month}`)!.push(response.data!.id);
        }

        console.log(`  ✓ ${monthName}: ${monthData.purchases.length} purchases = Rp ${monthData.totals.totalPurchases.toLocaleString('id-ID')}`);
      }, 120000);

      it(`should record cash sales for ${monthName}`, async () => {
        const cashAccount = getAccountByCode(accountMap, '1012');
        const salesAccount = getAccountByCode(accountMap, '4010');
        const cogsAccount = getAccountByCode(accountMap, '5310');
        const inventoryAccount = getAccountByCode(accountMap, '1210');

        for (const sale of monthData.cashSales) {
          // Revenue entry
          const revenueResponse = await apiClient.createJournalEntry({
            entryDate: sale.date,
            description: sale.description,
            reference: `E2E-${sale.reference}`,
            entryType: 'Manual',
            lines: [
              {
                accountId: cashAccount.id,
                direction: 'Debit',
                amount: sale.revenue,
                memo: 'Kas dari penjualan tunai',
              },
              {
                accountId: salesAccount.id,
                direction: 'Credit',
                amount: sale.revenue,
                memo: 'Pendapatan penjualan POS',
              },
            ],
          });

          expect(revenueResponse.ok).toBe(true);
          await apiClient.postJournalEntry(revenueResponse.data!.id);

          // COGS entry
          const cogsResponse = await apiClient.createJournalEntry({
            entryDate: sale.date,
            description: `HPP ${sale.description}`,
            reference: `E2E-COGS-${sale.reference}`,
            entryType: 'Manual',
            lines: [
              {
                accountId: cogsAccount.id,
                direction: 'Debit',
                amount: sale.cogs,
                memo: 'Harga Pokok Penjualan',
              },
              {
                accountId: inventoryAccount.id,
                direction: 'Credit',
                amount: sale.cogs,
                memo: 'Pengurangan persediaan',
              },
            ],
          });

          expect(cogsResponse.ok).toBe(true);
          await apiClient.postJournalEntry(cogsResponse.data!.id);
        }

        console.log(`  ✓ ${monthName}: ${monthData.cashSales.length} cash sales = Rp ${monthData.totals.totalCashSales.toLocaleString('id-ID')}`);
      }, 180000);

      it(`should record credit sales for ${monthName}`, async () => {
        const arAccount = getAccountByCode(accountMap, '1110'); // Piutang Usaha
        const salesAccount = getAccountByCode(accountMap, '4030'); // Wholesale Sales
        const cogsAccount = getAccountByCode(accountMap, '5310');
        const inventoryAccount = getAccountByCode(accountMap, '1210');

        for (const sale of monthData.creditSales) {
          // Revenue entry
          const revenueResponse = await apiClient.createJournalEntry({
            entryDate: sale.date,
            description: sale.description,
            reference: `E2E-${sale.invoiceRef}`,
            notes: `Due: ${sale.dueDate}`,
            entryType: 'Manual',
            lines: [
              {
                accountId: arAccount.id,
                direction: 'Debit',
                amount: sale.revenue,
                memo: `Piutang dari ${sale.customer}`,
              },
              {
                accountId: salesAccount.id,
                direction: 'Credit',
                amount: sale.revenue,
                memo: 'Pendapatan penjualan kredit',
              },
            ],
          });

          expect(revenueResponse.ok).toBe(true);
          await apiClient.postJournalEntry(revenueResponse.data!.id);

          // COGS entry
          const cogsResponse = await apiClient.createJournalEntry({
            entryDate: sale.date,
            description: `HPP ${sale.description}`,
            reference: `E2E-COGS-${sale.invoiceRef}`,
            entryType: 'Manual',
            lines: [
              {
                accountId: cogsAccount.id,
                direction: 'Debit',
                amount: sale.cogs,
                memo: 'Harga Pokok Penjualan',
              },
              {
                accountId: inventoryAccount.id,
                direction: 'Credit',
                amount: sale.cogs,
                memo: 'Pengurangan persediaan',
              },
            ],
          });

          expect(cogsResponse.ok).toBe(true);
          await apiClient.postJournalEntry(cogsResponse.data!.id);
        }

        console.log(`  ✓ ${monthName}: ${monthData.creditSales.length} credit sales = Rp ${monthData.totals.totalCreditSales.toLocaleString('id-ID')}`);
      }, 180000);

      it(`should record operating expenses for ${monthName}`, async () => {
        const bankAccount = getAccountByCode(accountMap, '1020'); // Bank BCA for expenses

        for (const expense of monthData.expenses) {
          const expenseAccount = getAccountByCode(accountMap, expense.accountCode);

          const response = await apiClient.createJournalEntry({
            entryDate: expense.date,
            description: expense.description,
            reference: `E2E-${expense.reference}`,
            entryType: 'Manual',
            lines: [
              {
                accountId: expenseAccount.id,
                direction: 'Debit',
                amount: expense.amount,
                memo: expense.category,
              },
              {
                accountId: bankAccount.id,
                direction: 'Credit',
                amount: expense.amount,
                memo: `Pembayaran ${expense.category}`,
              },
            ],
          });

          expect(response.ok).toBe(true);
          await apiClient.postJournalEntry(response.data!.id);
        }

        console.log(`  ✓ ${monthName}: ${monthData.expenses.length} expense types = Rp ${monthData.totals.totalExpenses.toLocaleString('id-ID')}`);
      }, 120000);

      it(`should record AR collections for ${monthName}`, async () => {
        if (monthData.collections.length === 0) {
          console.log(`  ○ ${monthName}: No collections (first month)`);
          return;
        }

        const bankAccount = getAccountByCode(accountMap, '1020'); // Bank BCA
        const arAccount = getAccountByCode(accountMap, '1110'); // Piutang Usaha

        for (const collection of monthData.collections) {
          const response = await apiClient.createJournalEntry({
            entryDate: collection.date,
            description: collection.description,
            reference: `E2E-COLL-${collection.invoiceRef}`,
            entryType: 'Manual',
            lines: [
              {
                accountId: bankAccount.id,
                direction: 'Debit',
                amount: collection.amount,
                memo: `Penerimaan dari ${collection.customer}`,
              },
              {
                accountId: arAccount.id,
                direction: 'Credit',
                amount: collection.amount,
                memo: `Pelunasan ${collection.invoiceRef}`,
              },
            ],
          });

          expect(response.ok).toBe(true);
          await apiClient.postJournalEntry(response.data!.id);
        }

        console.log(`  ✓ ${monthName}: ${monthData.collections.length} collections = Rp ${monthData.totals.totalCollections.toLocaleString('id-ID')}`);
      }, 120000);

      it(`should record AP payments for ${monthName}`, async () => {
        if (monthData.apPayments.length === 0) {
          console.log(`  ○ ${monthName}: No AP payments (first month)`);
          return;
        }

        const bankAccount = getAccountByCode(accountMap, '1020'); // Bank BCA
        const apAccount = getAccountByCode(accountMap, '2010');

        for (const payment of monthData.apPayments) {
          const response = await apiClient.createJournalEntry({
            entryDate: payment.date,
            description: payment.description,
            reference: `E2E-PAY-${payment.invoiceRef}`,
            entryType: 'Manual',
            lines: [
              {
                accountId: apAccount.id,
                direction: 'Debit',
                amount: payment.amount,
                memo: `Pelunasan ke ${payment.supplier}`,
              },
              {
                accountId: bankAccount.id,
                direction: 'Credit',
                amount: payment.amount,
                memo: `Pembayaran ${payment.invoiceRef}`,
              },
            ],
          });

          expect(response.ok).toBe(true);
          await apiClient.postJournalEntry(response.data!.id);
        }

        console.log(`  ✓ ${monthName}: ${monthData.apPayments.length} AP payments = Rp ${monthData.totals.totalAPPayments.toLocaleString('id-ID')}`);
      }, 120000);

      it(`should have balanced trial balance for ${monthName}`, async () => {
        await apiClient.calculatePeriodBalances(FISCAL_YEAR, month);

        const response = await apiClient.getTrialBalance(FISCAL_YEAR, month);
        expect(response.ok).toBe(true);

        const tb = response.data as { totalDebits: number; totalCredits: number; isBalanced?: boolean };

        // Check if trial balance is balanced (debits = credits)
        // Allow small rounding tolerance (1 Rupiah)
        const difference = Math.abs(tb.totalDebits - tb.totalCredits);
        const isBalanced = difference <= 1 || tb.isBalanced === true;

        if (!isBalanced) {
          console.log(`  ✗ ${monthName}: UNBALANCED - Debits: Rp ${tb.totalDebits.toLocaleString('id-ID')}, Credits: Rp ${tb.totalCredits.toLocaleString('id-ID')}, Diff: Rp ${difference.toLocaleString('id-ID')}`);
        } else {
          console.log(`  ✓ ${monthName}: Trial balance = Rp ${tb.totalDebits.toLocaleString('id-ID')} (balanced)`);
        }

        expect(isBalanced).toBe(true);
      }, 30000);
    });
  }

  describe('Phase 4: Monthly Period Closures', () => {
    for (let month = 1; month <= 12; month++) {
      const monthName = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ][month - 1];

      it(`should close ${monthName} ${FISCAL_YEAR}`, async () => {
        // Calculate final balances before close
        await apiClient.calculatePeriodBalances(FISCAL_YEAR, month);

        // Close the period
        const closeResponse = await apiClient.closeFiscalPeriod(FISCAL_YEAR, month, 'e2e-test');

        // Period may already be closed from previous run
        if (closeResponse.ok) {
          console.log(`  ✓ ${monthName} closed successfully`);
        } else {
          // Verify it's closed
          const period = await apiClient.getFiscalPeriod(FISCAL_YEAR, month);
          const periodData = period.data as { status: string };
          expect(['Closed', 'Locked']).toContain(periodData.status);
          console.log(`  ○ ${monthName} already closed`);
        }
      }, 30000);
    }
  });

  describe('Phase 5: Year-End Financial Reports', () => {
    it('should generate December trial balance', async () => {
      const response = await apiClient.getTrialBalance(FISCAL_YEAR, 12);
      expect(response.ok).toBe(true);

      const tb = response.data as { totalDebits: number; totalCredits: number; isBalanced?: boolean };

      // Check if trial balance is balanced (allow 1 Rupiah tolerance for rounding)
      const difference = Math.abs(tb.totalDebits - tb.totalCredits);
      const isBalanced = difference <= 1 || tb.isBalanced === true;

      console.log('\n=== Year-End Trial Balance ===');
      console.log(`Total Debits:  Rp ${tb.totalDebits.toLocaleString('id-ID')}`);
      console.log(`Total Credits: Rp ${tb.totalCredits.toLocaleString('id-ID')}`);
      console.log(`Difference:    Rp ${difference.toLocaleString('id-ID')}`);
      console.log(`Status: ${isBalanced ? 'BALANCED ✓' : 'UNBALANCED ✗'}`);

      expect(isBalanced).toBe(true);
    });

    it('should generate annual income statement', async () => {
      const response = await apiClient.getIncomeStatement(FISCAL_YEAR, 12);
      expect(response.ok).toBe(true);

      const is = response.data as {
        revenue?: { total?: number };
        cogs?: { total?: number };
        grossProfit?: number;
        operatingExpenses?: { total?: number };
        netIncome?: number;
      };

      const revenue = is.revenue?.total ?? 0;
      const cogs = is.cogs?.total ?? 0;
      const expenses = is.operatingExpenses?.total ?? 0;
      const grossProfit = is.grossProfit ?? (revenue - cogs);
      const netIncome = is.netIncome ?? (grossProfit - expenses);

      console.log('\n=== Annual Income Statement 2026 ===');
      console.log(`Revenue:        Rp ${revenue.toLocaleString('id-ID')}`);
      console.log(`COGS:           Rp (${cogs.toLocaleString('id-ID')})`);
      console.log(`                ─────────────────────`);
      console.log(`Gross Profit:   Rp ${grossProfit.toLocaleString('id-ID')}`);
      console.log(`Op. Expenses:   Rp (${expenses.toLocaleString('id-ID')})`);
      console.log(`                ─────────────────────`);
      console.log(`Net Income:     Rp ${netIncome.toLocaleString('id-ID')}`);
      if (revenue > 0) {
        console.log(`Net Margin:     ${((netIncome / revenue) * 100).toFixed(1)}%`);
      }
    });

    it('should generate year-end balance sheet', async () => {
      const response = await apiClient.getBalanceSheet(FISCAL_YEAR, 12);
      expect(response.ok).toBe(true);

      const bs = response.data as {
        assets?: { totalAssets?: number };
        liabilities?: { totalLiabilities?: number };
        equity?: { totalEquity?: number };
      };

      const totalAssets = bs.assets?.totalAssets ?? 0;
      const totalLiabilities = bs.liabilities?.totalLiabilities ?? 0;
      const totalEquity = bs.equity?.totalEquity ?? 0;

      console.log('\n=== Year-End Balance Sheet - December 31, 2026 ===');
      console.log(`ASSETS`);
      console.log(`  Total Assets:      Rp ${totalAssets.toLocaleString('id-ID')}`);
      console.log(``);
      console.log(`LIABILITIES & EQUITY`);
      console.log(`  Total Liabilities: Rp ${totalLiabilities.toLocaleString('id-ID')}`);
      console.log(`  Total Equity:      Rp ${totalEquity.toLocaleString('id-ID')}`);
      console.log(`  L + E Total:       Rp ${(totalLiabilities + totalEquity).toLocaleString('id-ID')}`);
      console.log(``);

      const difference = Math.abs(totalAssets - (totalLiabilities + totalEquity));
      const balanced = difference < totalAssets * 0.01;
      console.log(`Balanced: ${balanced ? 'YES ✓' : 'NO ✗'} (diff: Rp ${difference.toLocaleString('id-ID')})`);

      expect(totalAssets).toBeGreaterThan(0);
    });

    it('should output full year summary', async () => {
      const summary = generateAnnualSummary(yearData);

      console.log('\n');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║           FULL YEAR E2E TEST COMPLETE - 2026                 ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log(`║  Synthetic Data Generated:                                   ║`);
      console.log(`║    Total Revenue:     Rp ${summary.totalRevenue.toLocaleString('id-ID').padStart(20)}     ║`);
      console.log(`║    Total COGS:        Rp ${summary.totalCOGS.toLocaleString('id-ID').padStart(20)}     ║`);
      console.log(`║    Gross Profit:      Rp ${summary.grossProfit.toLocaleString('id-ID').padStart(20)}     ║`);
      console.log(`║    Gross Margin:      ${summary.grossMargin.toFixed(1).padStart(23)}%    ║`);
      console.log(`║    Total Expenses:    Rp ${summary.totalExpenses.toLocaleString('id-ID').padStart(20)}     ║`);
      console.log(`║    Net Income:        Rp ${summary.netIncome.toLocaleString('id-ID').padStart(20)}     ║`);
      console.log(`║    Net Margin:        ${summary.netMargin.toFixed(1).padStart(23)}%    ║`);
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log(`║  Periods Processed:   12 months                              ║`);
      console.log(`║  Status:              ALL PERIODS CLOSED                     ║`);
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('\n');

      expect(summary.netIncome).toBeGreaterThan(0);
    });
  });
}, 600000); // 10 minute timeout for full suite
