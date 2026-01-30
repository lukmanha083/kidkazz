/**
 * Chart of Accounts Fixtures for E2E Testing
 *
 * Based on Indonesian Trading COA standard (PSAK compliant)
 * Reference: docs/bounded-contexts/accounting/INDONESIAN_TRADING_COA.md
 */

import { AccountingApiClient } from '../helpers/api-client';

export interface AccountDefinition {
  code: string;
  name: string;
  nameEn: string;
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'COGS' | 'Expense';
  accountCategory: string;
  normalBalance: 'Debit' | 'Credit';
  financialStatementType: 'BalanceSheet' | 'IncomeStatement';
  isDetailAccount: boolean;
  parentCode?: string;
}

export interface AccountInfo {
  id: string;
  code: string;
  name: string;
  accountType: string;
  normalBalance: string;
}

/**
 * Essential accounts for E2E testing
 * Includes all accounts needed for a full monthly accounting cycle
 */
export const ESSENTIAL_ACCOUNTS: AccountDefinition[] = [
  // === ASSETS (1000-1999) ===
  // Cash & Bank (1000-1099)
  {
    code: '1000',
    name: 'Kas & Bank',
    nameEn: 'Cash & Bank',
    accountType: 'Asset',
    accountCategory: 'CurrentAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: false,
  },
  {
    code: '1010',
    name: 'Kas Kecil - Kantor Pusat',
    nameEn: 'Petty Cash - Head Office',
    accountType: 'Asset',
    accountCategory: 'CurrentAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '1000',
  },
  {
    code: '1012',
    name: 'Kas Laci POS - Toko 1',
    nameEn: 'POS Cash Drawer - Store 1',
    accountType: 'Asset',
    accountCategory: 'CurrentAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '1000',
  },
  {
    code: '1020',
    name: 'Bank BCA - Operasional',
    nameEn: 'BCA Bank - Operating',
    accountType: 'Asset',
    accountCategory: 'CurrentAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '1000',
  },

  // Receivables (1100-1199)
  {
    code: '1100',
    name: 'Piutang',
    nameEn: 'Receivables',
    accountType: 'Asset',
    accountCategory: 'CurrentAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: false,
  },
  {
    code: '1110',
    name: 'Piutang Usaha',
    nameEn: 'Accounts Receivable - Trade',
    accountType: 'Asset',
    accountCategory: 'CurrentAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '1100',
  },

  // Inventory (1200-1299)
  {
    code: '1200',
    name: 'Persediaan',
    nameEn: 'Inventory',
    accountType: 'Asset',
    accountCategory: 'CurrentAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: false,
  },
  {
    code: '1210',
    name: 'Persediaan Barang Dagang',
    nameEn: 'Merchandise Inventory',
    accountType: 'Asset',
    accountCategory: 'CurrentAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '1200',
  },

  // Fixed Assets (1400-1499)
  {
    code: '1400',
    name: 'Aset Tetap',
    nameEn: 'Fixed Assets',
    accountType: 'Asset',
    accountCategory: 'FixedAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: false,
  },
  {
    code: '1440',
    name: 'Peralatan Kantor',
    nameEn: 'Office Equipment',
    accountType: 'Asset',
    accountCategory: 'FixedAsset',
    normalBalance: 'Debit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '1400',
  },
  {
    code: '1441',
    name: 'Akumulasi Penyusutan Peralatan Kantor',
    nameEn: 'Accumulated Depreciation - Office Equipment',
    accountType: 'Asset',
    accountCategory: 'FixedAsset',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '1400',
  },

  // === LIABILITIES (2000-2999) ===
  // Accounts Payable - use 2101 to match existing routes
  {
    code: '2000',
    name: 'Hutang Usaha',
    nameEn: 'Trade Payables',
    accountType: 'Liability',
    accountCategory: 'CurrentLiability',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: false,
  },
  {
    code: '2101',
    name: 'Hutang Dagang',
    nameEn: 'Accounts Payable - Trade',
    accountType: 'Liability',
    accountCategory: 'CurrentLiability',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '2000',
  },

  // Tax Payables (2100-2199)
  {
    code: '2100',
    name: 'Hutang Pajak',
    nameEn: 'Tax Payables',
    accountType: 'Liability',
    accountCategory: 'CurrentLiability',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: false,
  },
  {
    code: '2110',
    name: 'PPn Keluaran',
    nameEn: 'VAT Output (Sales VAT)',
    accountType: 'Liability',
    accountCategory: 'CurrentLiability',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '2100',
  },

  // Accrued Expenses (2200-2299)
  {
    code: '2200',
    name: 'Hutang Gaji & Beban Akrual',
    nameEn: 'Accrued Expenses',
    accountType: 'Liability',
    accountCategory: 'CurrentLiability',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: false,
  },
  {
    code: '2210',
    name: 'Hutang Gaji',
    nameEn: 'Salaries Payable',
    accountType: 'Liability',
    accountCategory: 'CurrentLiability',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '2200',
  },

  // === EQUITY (3000-3999) ===
  {
    code: '3000',
    name: 'Ekuitas',
    nameEn: 'Equity',
    accountType: 'Equity',
    accountCategory: 'Equity',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: false,
  },
  {
    code: '3100',
    name: 'Modal Disetor',
    nameEn: 'Paid-in Capital',
    accountType: 'Equity',
    accountCategory: 'Equity',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '3000',
  },
  {
    code: '3200',
    name: 'Laba Ditahan',
    nameEn: 'Retained Earnings',
    accountType: 'Equity',
    accountCategory: 'Equity',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '3000',
  },
  {
    code: '3220',
    name: 'Laba Tahun Berjalan',
    nameEn: 'Current Year Earnings',
    accountType: 'Equity',
    accountCategory: 'Equity',
    normalBalance: 'Credit',
    financialStatementType: 'BalanceSheet',
    isDetailAccount: true,
    parentCode: '3000',
  },

  // === REVENUE (4000-4999) ===
  {
    code: '4000',
    name: 'Pendapatan Penjualan',
    nameEn: 'Sales Revenue',
    accountType: 'Revenue',
    accountCategory: 'Revenue',
    normalBalance: 'Credit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: false,
  },
  {
    code: '4010',
    name: 'Penjualan - POS Retail',
    nameEn: 'Sales - POS Retail',
    accountType: 'Revenue',
    accountCategory: 'Revenue',
    normalBalance: 'Credit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '4000',
  },
  {
    code: '4020',
    name: 'Penjualan - Wholesale',
    nameEn: 'Sales - Wholesale',
    accountType: 'Revenue',
    accountCategory: 'Revenue',
    normalBalance: 'Credit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '4000',
  },
  {
    code: '4100',
    name: 'Potongan & Retur Penjualan',
    nameEn: 'Sales Deductions',
    accountType: 'Revenue',
    accountCategory: 'Revenue',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: false,
  },
  {
    code: '4110',
    name: 'Diskon Penjualan',
    nameEn: 'Sales Discounts',
    accountType: 'Revenue',
    accountCategory: 'Revenue',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '4100',
  },

  // === COGS (5000-5999) ===
  {
    code: '5000',
    name: 'Harga Pokok Penjualan',
    nameEn: 'Cost of Goods Sold',
    accountType: 'COGS',
    accountCategory: 'COGS',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: false,
  },
  {
    code: '5010',
    name: 'Pembelian Barang Dagang',
    nameEn: 'Merchandise Purchases',
    accountType: 'COGS',
    accountCategory: 'COGS',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '5000',
  },
  {
    code: '5310',
    name: 'HPP - POS Retail',
    nameEn: 'COGS - POS Retail',
    accountType: 'COGS',
    accountCategory: 'COGS',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '5000',
  },

  // === OPERATING EXPENSES (6000-6999) ===
  // Payroll
  {
    code: '6000',
    name: 'Beban Gaji & Karyawan',
    nameEn: 'Payroll & Employee Expenses',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: false,
  },
  {
    code: '6010',
    name: 'Beban Gaji Pokok',
    nameEn: 'Basic Salary Expense',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '6000',
  },

  // Rent & Utilities
  {
    code: '6100',
    name: 'Beban Sewa & Utilitas',
    nameEn: 'Rent & Utilities',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: false,
  },
  {
    code: '6110',
    name: 'Beban Sewa Kantor',
    nameEn: 'Office Rent Expense',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '6100',
  },
  {
    code: '6120',
    name: 'Beban Listrik',
    nameEn: 'Electricity Expense',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '6100',
  },

  // Depreciation
  {
    code: '6200',
    name: 'Beban Penyusutan & Amortisasi',
    nameEn: 'Depreciation & Amortization',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: false,
  },
  {
    code: '6230',
    name: 'Beban Penyusutan Peralatan Kantor',
    nameEn: 'Depreciation Expense - Office Equipment',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '6200',
  },

  // Bank Charges
  {
    code: '6900',
    name: 'Beban Operasional Lain',
    nameEn: 'Other Operating Expenses',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: false,
  },
  {
    code: '6950',
    name: 'Beban Bank',
    nameEn: 'Bank Charges',
    accountType: 'Expense',
    accountCategory: 'OperatingExpense',
    normalBalance: 'Debit',
    financialStatementType: 'IncomeStatement',
    isDetailAccount: true,
    parentCode: '6900',
  },
];

/**
 * Seed chart of accounts via API
 * Returns a map of account code -> account info
 */
export async function seedChartOfAccounts(
  apiClient: AccountingApiClient
): Promise<Map<string, AccountInfo>> {
  const accountMap = new Map<string, AccountInfo>();
  const codeToId = new Map<string, string>();

  // First pass: create all accounts without parent references
  for (const def of ESSENTIAL_ACCOUNTS) {
    const response = await apiClient.createAccount({
      code: def.code,
      name: def.name,
      accountType: def.accountType,
      normalBalance: def.normalBalance,
      description: def.nameEn,
    });

    if (response.ok && response.data) {
      const accountInfo: AccountInfo = {
        id: response.data.id,
        code: def.code,
        name: def.name,
        accountType: def.accountType,
        normalBalance: def.normalBalance,
      };
      accountMap.set(def.code, accountInfo);
      codeToId.set(def.code, response.data.id);
    } else {
      // Account might already exist, try to fetch it
      const existingResponse = await apiClient.getAccountByCode(def.code);
      if (existingResponse.ok && existingResponse.data) {
        const existing = existingResponse.data as { id: string };
        const accountInfo: AccountInfo = {
          id: existing.id,
          code: def.code,
          name: def.name,
          accountType: def.accountType,
          normalBalance: def.normalBalance,
        };
        accountMap.set(def.code, accountInfo);
        codeToId.set(def.code, existing.id);
      }
    }
  }

  return accountMap;
}

/**
 * Get account by code from map
 */
export function getAccountByCode(
  accountMap: Map<string, AccountInfo>,
  code: string
): AccountInfo {
  const account = accountMap.get(code);
  if (!account) {
    throw new Error(`Account with code ${code} not found`);
  }
  return account;
}

/**
 * Fetch account info by code via API
 */
export async function fetchAccountByCode(
  apiClient: AccountingApiClient,
  code: string
): Promise<AccountInfo | null> {
  const response = await apiClient.getAccountByCode(code);
  if (response.ok && response.data) {
    const data = response.data as {
      id: string;
      code: string;
      name: string;
      accountType: string;
      normalBalance: string;
    };
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      accountType: data.accountType,
      normalBalance: data.normalBalance,
    };
  }
  return null;
}
