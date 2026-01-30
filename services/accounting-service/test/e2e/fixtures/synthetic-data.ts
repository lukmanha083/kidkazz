/**
 * Synthetic Data Generator for 12-Month E2E Tests
 *
 * Generates realistic Indonesian retail business transaction data with:
 * - Seasonal patterns (Ramadan/Lebaran boost, year-end boost)
 * - Monthly growth trends
 * - Randomized but reproducible amounts
 * - Proper Indonesian business context
 */

export interface MonthlyTransactionData {
  fiscalYear: number;
  fiscalMonth: number;
  monthName: string;

  // Inventory Purchases (credit from suppliers)
  purchases: PurchaseTransaction[];

  // Cash Sales (POS retail)
  cashSales: SaleTransaction[];

  // Credit Sales (wholesale/B2B)
  creditSales: CreditSaleTransaction[];

  // Operating Expenses
  expenses: ExpenseTransaction[];

  // Cash Collections (AR payments from previous credit sales)
  collections: CollectionTransaction[];

  // AP Payments (pay suppliers from previous purchases)
  apPayments: APPaymentTransaction[];

  // Monthly totals for verification
  totals: MonthlyTotals;
}

export interface PurchaseTransaction {
  supplier: string;
  invoiceRef: string;
  amount: number;
  date: string;
  description: string;
}

export interface SaleTransaction {
  reference: string;
  revenue: number;
  cogs: number;
  date: string;
  description: string;
}

export interface CreditSaleTransaction {
  customer: string;
  invoiceRef: string;
  revenue: number;
  cogs: number;
  date: string;
  description: string;
  dueDate: string;
}

export interface ExpenseTransaction {
  category: string;
  accountCode: string;
  amount: number;
  date: string;
  description: string;
  reference: string;
}

export interface CollectionTransaction {
  customer: string;
  invoiceRef: string;
  amount: number;
  date: string;
  description: string;
}

export interface APPaymentTransaction {
  supplier: string;
  invoiceRef: string;
  amount: number;
  date: string;
  description: string;
}

export interface MonthlyTotals {
  totalPurchases: number;
  totalCashSales: number;
  totalCreditSales: number;
  totalCOGS: number;
  totalExpenses: number;
  totalCollections: number;
  totalAPPayments: number;
  grossProfit: number;
  netIncome: number;
}

// Indonesian month names
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Supplier names
const SUPPLIERS = [
  'PT Maju Bersama',
  'CV Sentosa Jaya',
  'PT Berkah Mandiri',
  'UD Sejahtera',
  'PT Global Trading'
];

// Customer names for credit sales
const CUSTOMERS = [
  'Toko Makmur',
  'CV Abadi Jaya',
  'PT Sinar Terang',
  'UD Prima',
  'Toko Bintang'
];

// Expense categories with account codes (matching actual COA)
const EXPENSE_CATEGORIES = [
  { category: 'Gaji Pokok', code: '6010', baseAmount: 45_000_000 },
  { category: 'Sewa Toko', code: '6111', baseAmount: 15_000_000 },
  { category: 'Listrik', code: '6120', baseAmount: 5_000_000 },
  { category: 'Air', code: '6130', baseAmount: 1_500_000 },
  { category: 'Telepon', code: '6140', baseAmount: 1_500_000 },
  { category: 'Internet', code: '6150', baseAmount: 2_000_000 },
  { category: 'ATK', code: '6510', baseAmount: 2_500_000 },
  { category: 'Bensin/BBM', code: '6420', baseAmount: 5_000_000 },
];

/**
 * Seasonal multipliers for Indonesian retail business
 * Based on typical patterns:
 * - Ramadan/Lebaran (typically March-April 2026): Major boost
 * - School season (July): Moderate boost
 * - Year-end (November-December): Holiday boost
 */
const SEASONAL_MULTIPLIERS: Record<number, number> = {
  1: 0.85,   // January - post holiday slowdown
  2: 0.90,   // February - picking up
  3: 1.30,   // March - Ramadan starts (2026)
  4: 1.50,   // April - Lebaran peak
  5: 0.95,   // May - post Lebaran
  6: 0.90,   // June - normal
  7: 1.15,   // July - back to school
  8: 0.95,   // August - Independence Day
  9: 0.90,   // September - normal
  10: 1.00,  // October - normal
  11: 1.20,  // November - pre year-end
  12: 1.35,  // December - Christmas/New Year
};

// Base monthly values (will be multiplied by seasonal factor)
const BASE_VALUES = {
  purchasesPerMonth: 350_000_000,      // Rp 350M base purchases
  cashSalesPerMonth: 400_000_000,      // Rp 400M base cash sales
  creditSalesPerMonth: 250_000_000,    // Rp 250M base credit sales
  cogsMargin: 0.70,                    // 70% COGS = 30% gross margin
  monthlyGrowth: 1.008,                // 0.8% monthly growth (~10% annual)
};

/**
 * Seeded random number generator for reproducible test data
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Generate variation factor (±15%)
 */
function withVariation(baseAmount: number, random: () => number): number {
  const variation = 0.85 + (random() * 0.30); // 0.85 to 1.15
  return Math.round(baseAmount * variation);
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Get number of days in a month
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generate purchases for a month
 */
function generatePurchases(
  year: number,
  month: number,
  baseAmount: number,
  random: () => number
): PurchaseTransaction[] {
  const purchases: PurchaseTransaction[] = [];
  const numPurchases = 3 + Math.floor(random() * 3); // 3-5 purchases per month
  const amountPerPurchase = baseAmount / numPurchases;
  const days = daysInMonth(year, month);

  for (let i = 0; i < numPurchases; i++) {
    const supplier = SUPPLIERS[Math.floor(random() * SUPPLIERS.length)];
    const day = 1 + Math.floor(random() * Math.min(25, days)); // First 25 days
    const amount = withVariation(amountPerPurchase, random);

    purchases.push({
      supplier,
      invoiceRef: `INV-${supplier.substring(0, 3).toUpperCase()}-${year}${String(month).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`,
      amount,
      date: formatDate(year, month, day),
      description: `Pembelian barang dagang dari ${supplier}`,
    });
  }

  return purchases.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate cash sales for a month
 */
function generateCashSales(
  year: number,
  month: number,
  baseRevenue: number,
  cogsMargin: number,
  random: () => number
): SaleTransaction[] {
  const sales: SaleTransaction[] = [];
  const numSales = 4 + Math.floor(random() * 4); // 4-7 sales batches per month
  const revenuePerSale = baseRevenue / numSales;
  const days = daysInMonth(year, month);

  for (let i = 0; i < numSales; i++) {
    const day = 1 + Math.floor((days / numSales) * i) + Math.floor(random() * 5);
    const actualDay = Math.min(day, days);
    const revenue = withVariation(revenuePerSale, random);
    const cogs = Math.round(revenue * cogsMargin);

    sales.push({
      reference: `POS-${year}${String(month).padStart(2, '0')}${String(actualDay).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
      revenue,
      cogs,
      date: formatDate(year, month, actualDay),
      description: `Penjualan tunai POS - Batch ${i + 1}`,
    });
  }

  return sales.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate credit sales for a month
 */
function generateCreditSales(
  year: number,
  month: number,
  baseRevenue: number,
  cogsMargin: number,
  random: () => number
): CreditSaleTransaction[] {
  const sales: CreditSaleTransaction[] = [];
  const numSales = 2 + Math.floor(random() * 3); // 2-4 credit sales per month
  const revenuePerSale = baseRevenue / numSales;
  const days = daysInMonth(year, month);

  for (let i = 0; i < numSales; i++) {
    const customer = CUSTOMERS[Math.floor(random() * CUSTOMERS.length)];
    const day = 5 + Math.floor(random() * 20); // Days 5-25
    const actualDay = Math.min(day, days);
    const revenue = withVariation(revenuePerSale, random);
    const cogs = Math.round(revenue * cogsMargin);

    // Due date is 30 days from invoice date
    const dueDate = new Date(year, month - 1, actualDay + 30);

    sales.push({
      customer,
      invoiceRef: `INV-${year}${String(month).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      revenue,
      cogs,
      date: formatDate(year, month, actualDay),
      description: `Penjualan kredit ke ${customer}`,
      dueDate: formatDate(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate()),
    });
  }

  return sales.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate operating expenses for a month
 */
function generateExpenses(
  year: number,
  month: number,
  seasonalMultiplier: number,
  random: () => number
): ExpenseTransaction[] {
  const expenses: ExpenseTransaction[] = [];
  const days = daysInMonth(year, month);

  for (const expenseType of EXPENSE_CATEGORIES) {
    // Some expenses are fixed, some vary with season
    const isVariable = ['Listrik', 'Air', 'Bensin/BBM', 'ATK'].includes(expenseType.category);
    const multiplier = isVariable ? seasonalMultiplier : 1.0;
    const amount = withVariation(expenseType.baseAmount * multiplier, random);

    // Different expenses paid on different days
    let day: number;
    if (expenseType.category === 'Gaji Pokok') {
      day = 25; // Payroll on 25th
    } else if (expenseType.category === 'Sewa Toko') {
      day = 1; // Rent on 1st
    } else {
      day = 10 + Math.floor(random() * 15); // Others mid-month
    }
    day = Math.min(day, days);

    expenses.push({
      category: expenseType.category,
      accountCode: expenseType.code,
      amount,
      date: formatDate(year, month, day),
      description: `Pembayaran ${expenseType.category} - ${MONTH_NAMES[month - 1]} ${year}`,
      reference: `EXP-${expenseType.code}-${year}${String(month).padStart(2, '0')}`,
    });
  }

  return expenses.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate collections from previous month's credit sales
 */
function generateCollections(
  year: number,
  month: number,
  previousCreditSales: CreditSaleTransaction[],
  random: () => number
): CollectionTransaction[] {
  if (previousCreditSales.length === 0) return [];

  const collections: CollectionTransaction[] = [];
  const days = daysInMonth(year, month);

  // Collect 70-90% of previous month's credit sales
  const collectionRate = 0.70 + (random() * 0.20);
  const salesToCollect = previousCreditSales.slice(
    0,
    Math.ceil(previousCreditSales.length * collectionRate)
  );

  for (const sale of salesToCollect) {
    const day = 5 + Math.floor(random() * 20);
    const actualDay = Math.min(day, days);

    collections.push({
      customer: sale.customer,
      invoiceRef: sale.invoiceRef,
      amount: sale.revenue,
      date: formatDate(year, month, actualDay),
      description: `Pelunasan piutang dari ${sale.customer} (${sale.invoiceRef})`,
    });
  }

  return collections.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate AP payments for previous month's purchases
 */
function generateAPPayments(
  year: number,
  month: number,
  previousPurchases: PurchaseTransaction[],
  random: () => number
): APPaymentTransaction[] {
  if (previousPurchases.length === 0) return [];

  const payments: APPaymentTransaction[] = [];
  const days = daysInMonth(year, month);

  // Pay 60-80% of previous month's purchases
  const paymentRate = 0.60 + (random() * 0.20);
  const purchasesToPay = previousPurchases.slice(
    0,
    Math.ceil(previousPurchases.length * paymentRate)
  );

  for (const purchase of purchasesToPay) {
    const day = 1 + Math.floor(random() * 25);
    const actualDay = Math.min(day, days);

    payments.push({
      supplier: purchase.supplier,
      invoiceRef: purchase.invoiceRef,
      amount: purchase.amount,
      date: formatDate(year, month, actualDay),
      description: `Pembayaran hutang ke ${purchase.supplier} (${purchase.invoiceRef})`,
    });
  }

  return payments.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate monthly totals
 */
function calculateTotals(data: Omit<MonthlyTransactionData, 'totals'>): MonthlyTotals {
  const totalPurchases = data.purchases.reduce((sum, p) => sum + p.amount, 0);
  const totalCashSales = data.cashSales.reduce((sum, s) => sum + s.revenue, 0);
  const totalCreditSales = data.creditSales.reduce((sum, s) => sum + s.revenue, 0);
  const totalCashCOGS = data.cashSales.reduce((sum, s) => sum + s.cogs, 0);
  const totalCreditCOGS = data.creditSales.reduce((sum, s) => sum + s.cogs, 0);
  const totalCOGS = totalCashCOGS + totalCreditCOGS;
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCollections = data.collections.reduce((sum, c) => sum + c.amount, 0);
  const totalAPPayments = data.apPayments.reduce((sum, p) => sum + p.amount, 0);

  const totalRevenue = totalCashSales + totalCreditSales;
  const grossProfit = totalRevenue - totalCOGS;
  const netIncome = grossProfit - totalExpenses;

  return {
    totalPurchases,
    totalCashSales,
    totalCreditSales,
    totalCOGS,
    totalExpenses,
    totalCollections,
    totalAPPayments,
    grossProfit,
    netIncome,
  };
}

/**
 * Generate full year of synthetic transaction data
 */
export function generateFullYearData(fiscalYear: number, seed: number = 42): MonthlyTransactionData[] {
  const random = seededRandom(seed);
  const yearData: MonthlyTransactionData[] = [];

  let previousCreditSales: CreditSaleTransaction[] = [];
  let previousPurchases: PurchaseTransaction[] = [];

  for (let month = 1; month <= 12; month++) {
    const seasonalMultiplier = SEASONAL_MULTIPLIERS[month];
    const growthFactor = Math.pow(BASE_VALUES.monthlyGrowth, month - 1);
    const combinedMultiplier = seasonalMultiplier * growthFactor;

    const purchases = generatePurchases(
      fiscalYear,
      month,
      BASE_VALUES.purchasesPerMonth * combinedMultiplier,
      random
    );

    const cashSales = generateCashSales(
      fiscalYear,
      month,
      BASE_VALUES.cashSalesPerMonth * combinedMultiplier,
      BASE_VALUES.cogsMargin,
      random
    );

    const creditSales = generateCreditSales(
      fiscalYear,
      month,
      BASE_VALUES.creditSalesPerMonth * combinedMultiplier,
      BASE_VALUES.cogsMargin,
      random
    );

    const expenses = generateExpenses(fiscalYear, month, seasonalMultiplier, random);

    const collections = generateCollections(fiscalYear, month, previousCreditSales, random);

    const apPayments = generateAPPayments(fiscalYear, month, previousPurchases, random);

    const monthData: Omit<MonthlyTransactionData, 'totals'> = {
      fiscalYear,
      fiscalMonth: month,
      monthName: MONTH_NAMES[month - 1],
      purchases,
      cashSales,
      creditSales,
      expenses,
      collections,
      apPayments,
    };

    yearData.push({
      ...monthData,
      totals: calculateTotals(monthData),
    });

    // Store for next month's collections/payments
    previousCreditSales = creditSales;
    previousPurchases = purchases;
  }

  return yearData;
}

/**
 * Generate annual summary
 */
export function generateAnnualSummary(yearData: MonthlyTransactionData[]): {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  totalExpenses: number;
  netIncome: number;
  netMargin: number;
  totalPurchases: number;
  totalCollections: number;
  totalAPPayments: number;
} {
  const totals = yearData.reduce(
    (acc, month) => ({
      totalRevenue: acc.totalRevenue + month.totals.totalCashSales + month.totals.totalCreditSales,
      totalCOGS: acc.totalCOGS + month.totals.totalCOGS,
      totalExpenses: acc.totalExpenses + month.totals.totalExpenses,
      totalPurchases: acc.totalPurchases + month.totals.totalPurchases,
      totalCollections: acc.totalCollections + month.totals.totalCollections,
      totalAPPayments: acc.totalAPPayments + month.totals.totalAPPayments,
    }),
    {
      totalRevenue: 0,
      totalCOGS: 0,
      totalExpenses: 0,
      totalPurchases: 0,
      totalCollections: 0,
      totalAPPayments: 0,
    }
  );

  const grossProfit = totals.totalRevenue - totals.totalCOGS;
  const netIncome = grossProfit - totals.totalExpenses;

  return {
    ...totals,
    grossProfit,
    grossMargin: (grossProfit / totals.totalRevenue) * 100,
    netIncome,
    netMargin: (netIncome / totals.totalRevenue) * 100,
  };
}

/**
 * Print monthly summary for debugging
 */
export function printMonthlySummary(month: MonthlyTransactionData): void {
  console.log(`\n=== ${month.monthName} ${month.fiscalYear} ===`);
  console.log(`Purchases:     Rp ${month.totals.totalPurchases.toLocaleString('id-ID').padStart(15)}`);
  console.log(`Cash Sales:    Rp ${month.totals.totalCashSales.toLocaleString('id-ID').padStart(15)}`);
  console.log(`Credit Sales:  Rp ${month.totals.totalCreditSales.toLocaleString('id-ID').padStart(15)}`);
  console.log(`COGS:          Rp ${month.totals.totalCOGS.toLocaleString('id-ID').padStart(15)}`);
  console.log(`Expenses:      Rp ${month.totals.totalExpenses.toLocaleString('id-ID').padStart(15)}`);
  console.log(`Gross Profit:  Rp ${month.totals.grossProfit.toLocaleString('id-ID').padStart(15)}`);
  console.log(`Net Income:    Rp ${month.totals.netIncome.toLocaleString('id-ID').padStart(15)}`);
}
