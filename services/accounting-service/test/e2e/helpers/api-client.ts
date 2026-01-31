/**
 * E2E Test API Client
 *
 * HTTP client for calling the accounting service API endpoints.
 * Can target local dev server or deployed Cloudflare Worker.
 */

export interface ApiClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

// API response wrapper from the service
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: unknown;
}

// Default to local dev server with remote D1
const DEFAULT_BASE_URL = process.env.E2E_API_URL || 'http://localhost:8794';

export class AccountingApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config?: Partial<ApiClientConfig>) {
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
    this.headers = {
      'Content-Type': 'application/json',
      ...config?.headers,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      let parsed: ServiceResponse<T> | undefined;

      try {
        parsed = text ? JSON.parse(text) : undefined;
      } catch {
        // Response is not JSON
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: JSON.stringify(parsed?.error) || text || `HTTP ${response.status}`,
        };
      }

      // Unwrap the { success, data } wrapper
      if (parsed && 'success' in parsed) {
        if (parsed.success) {
          return {
            ok: true,
            status: response.status,
            data: parsed.data,
          };
        } else {
          return {
            ok: false,
            status: response.status,
            error: JSON.stringify(parsed.error),
          };
        }
      }

      // For endpoints that don't use the wrapper (like /health)
      return {
        ok: true,
        status: response.status,
        data: parsed as T,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============ Health Check ============
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request('GET', '/health');
  }

  // ============ Fiscal Periods ============
  async createFiscalPeriod(data: {
    fiscalYear: number;
    fiscalMonth: number;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('POST', '/api/v1/fiscal-periods', data);
  }

  async getFiscalPeriod(year: number, month: number): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/fiscal-periods/period/${year}/${month}`);
  }

  async listFiscalPeriods(): Promise<ApiResponse<unknown[]>> {
    return this.request('GET', '/api/v1/fiscal-periods');
  }

  async closeFiscalPeriod(year: number, month: number, closedBy: string): Promise<ApiResponse<void>> {
    // First get the period ID by year/month
    const periodResponse = await this.getFiscalPeriod(year, month);
    if (!periodResponse.ok || !periodResponse.data) {
      return {
        ok: false,
        status: 404,
        error: `Fiscal period ${year}-${month} not found`,
      };
    }
    const periodId = (periodResponse.data as { id: string }).id;
    return this.request('POST', `/api/v1/fiscal-periods/${periodId}/close`);
  }

  // ============ Accounts ============
  async createAccount(data: {
    code: string;
    name: string;
    accountType: string;
    normalBalance: string;
    parentId?: string;
    description?: string;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('POST', '/api/v1/accounts', data);
  }

  async getAccount(id: string): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/accounts/${id}`);
  }

  async getAccountByCode(code: string): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/accounts/code/${code}`);
  }

  async listAccounts(params?: { type?: string; active?: boolean }): Promise<ApiResponse<unknown[]>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.active !== undefined) searchParams.set('active', String(params.active));
    const query = searchParams.toString();
    return this.request('GET', `/api/v1/accounts${query ? `?${query}` : ''}`);
  }

  // ============ Journal Entries ============
  async createJournalEntry(data: {
    entryDate: string; // Will be converted to ISO datetime
    description: string;
    reference?: string;
    notes?: string;
    entryType?: 'Manual' | 'System' | 'Recurring' | 'Adjusting' | 'Closing';
    lines: Array<{
      accountId: string;
      direction: 'Debit' | 'Credit';
      amount: number;
      memo?: string;
    }>;
  }): Promise<ApiResponse<{ id: string }>> {
    // Convert date to ISO datetime if it's just a date
    let entryDateISO = data.entryDate;
    if (!data.entryDate.includes('T')) {
      entryDateISO = `${data.entryDate}T00:00:00.000Z`;
    }

    return this.request('POST', '/api/v1/journal-entries', {
      ...data,
      entryDate: entryDateISO,
      entryType: data.entryType || 'Manual',
    });
  }

  async getJournalEntry(id: string): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/journal-entries/${id}`);
  }

  async listJournalEntries(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    entryType?: string;
  }): Promise<ApiResponse<unknown[]>> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.entryType) searchParams.set('entryType', params.entryType);
    const query = searchParams.toString();
    return this.request('GET', `/api/v1/journal-entries${query ? `?${query}` : ''}`);
  }

  async postJournalEntry(id: string, postedBy?: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/v1/journal-entries/${id}/post`, {
      postedBy: postedBy || 'e2e-test',
    });
  }

  async voidJournalEntry(id: string, reason: string, voidedBy?: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/v1/journal-entries/${id}/void`, {
      reason,
      voidedBy: voidedBy || 'e2e-test',
    });
  }

  // ============ Account Balances ============
  async getAccountBalance(
    accountId: string,
    year: number,
    month: number
  ): Promise<ApiResponse<{ debitTotal: number; creditTotal: number; closingBalance: number; openingBalance: number }>> {
    return this.request(
      'GET',
      `/api/v1/account-balances/${accountId}?fiscalYear=${year}&fiscalMonth=${month}`
    );
  }

  async calculatePeriodBalances(year: number, month: number): Promise<ApiResponse<{
    fiscalYear: number;
    fiscalMonth: number;
    accountsProcessed: number;
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  }>> {
    return this.request('POST', `/api/v1/account-balances/calculate`, {
      fiscalYear: year,
      fiscalMonth: month,
      recalculate: true,
    });
  }

  async getPeriodBalances(year: number, month: number): Promise<ApiResponse<{
    fiscalYear: number;
    fiscalMonth: number;
    balances: Array<{
      accountId: string;
      openingBalance: number;
      debitTotal: number;
      creditTotal: number;
      closingBalance: number;
    }>;
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  }>> {
    return this.request('GET', `/api/v1/account-balances?fiscalYear=${year}&fiscalMonth=${month}`);
  }

  // ============ Reports ============
  async getTrialBalance(year: number, month: number): Promise<ApiResponse<unknown>> {
    return this.request(
      'GET',
      `/api/v1/reports/trial-balance?fiscalYear=${year}&fiscalMonth=${month}`
    );
  }

  async getIncomeStatement(
    year: number,
    month: number,
    comparative?: boolean
  ): Promise<ApiResponse<unknown>> {
    const params = new URLSearchParams({
      fiscalYear: String(year),
      fiscalMonth: String(month),
    });
    if (comparative) params.set('comparative', 'true');
    return this.request('GET', `/api/v1/reports/income-statement?${params}`);
  }

  async getBalanceSheet(year: number, month: number): Promise<ApiResponse<unknown>> {
    // Balance sheet API requires asOfDate in YYYY-MM-DD format
    // Use the last day of the month
    const lastDay = new Date(year, month, 0).getDate(); // Day 0 of next month = last day of this month
    const asOfDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return this.request('GET', `/api/v1/reports/balance-sheet?asOfDate=${asOfDate}`);
  }

  async getCashFlowStatement(year: number, month: number): Promise<ApiResponse<unknown>> {
    return this.request(
      'GET',
      `/api/v1/reports/cash-flow?fiscalYear=${year}&fiscalMonth=${month}`
    );
  }

  // ============ Test Utilities ============

  /**
   * Cleanup E2E test data for a fiscal year.
   * Deletes journal entries with E2E- prefix and resets fiscal periods.
   */
  async cleanupE2EData(
    fiscalYear: number,
    resetPeriods: boolean = true
  ): Promise<ApiResponse<{
    fiscalYear: number;
    deletedJournalLines: number;
    deletedJournalEntries: number;
    deletedAccountBalances: number;
    resetFiscalPeriods: number;
  }>> {
    return this.request(
      'DELETE',
      `/api/v1/test-utilities/cleanup-e2e?fiscalYear=${fiscalYear}&resetPeriods=${resetPeriods}`
    );
  }

  /**
   * Get E2E test data statistics for a fiscal year.
   */
  async getE2EStats(fiscalYear: number): Promise<ApiResponse<{
    fiscalYear: number;
    e2eJournalEntryCount: number;
    fiscalPeriods: Array<{ fiscalMonth: number; status: string }>;
  }>> {
    return this.request('GET', `/api/v1/test-utilities/e2e-stats?fiscalYear=${fiscalYear}`);
  }

  // ============ Budget Management ============

  /**
   * Create a new budget
   */
  async createBudget(data: {
    name: string;
    fiscalYear: number;
    lines?: Array<{
      accountId: string;
      fiscalMonth: number;
      amount: number;
      notes?: string;
    }>;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('POST', '/api/v1/budgets', data);
  }

  /**
   * Get budget by ID
   */
  async getBudget(id: string): Promise<ApiResponse<{
    id: string;
    name: string;
    fiscalYear: number;
    status: string;
    approvedBy: string | null;
    approvedAt: string | null;
    lines: Array<{
      id: string;
      accountId: string;
      fiscalMonth: number;
      amount: number;
      notes: string | null;
    }>;
    totalBudget: number;
  }>> {
    return this.request('GET', `/api/v1/budgets/${id}`);
  }

  /**
   * List budgets with optional filters
   */
  async listBudgets(params?: {
    fiscalYear?: number;
    status?: 'draft' | 'approved' | 'locked';
  }): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    fiscalYear: number;
    status: string;
    totalBudget: number;
  }>>> {
    const searchParams = new URLSearchParams();
    if (params?.fiscalYear) searchParams.set('fiscalYear', String(params.fiscalYear));
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return this.request('GET', `/api/v1/budgets${query ? `?${query}` : ''}`);
  }

  /**
   * Update budget lines
   */
  async updateBudgetLines(
    budgetId: string,
    lines: Array<{
      accountId: string;
      fiscalMonth: number;
      amount: number;
      notes?: string;
    }>
  ): Promise<ApiResponse<void>> {
    return this.request('PUT', `/api/v1/budgets/${budgetId}/lines`, { lines });
  }

  /**
   * Approve a budget
   */
  async approveBudget(budgetId: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/v1/budgets/${budgetId}/approve`);
  }

  /**
   * Delete a draft budget
   */
  async deleteBudget(budgetId: string): Promise<ApiResponse<void>> {
    return this.request('DELETE', `/api/v1/budgets/${budgetId}`);
  }

  /**
   * Get Budget vs Actual report
   */
  async getBudgetVsActual(
    budgetId: string,
    fiscalMonth?: number
  ): Promise<ApiResponse<{
    budgetId: string;
    budgetName: string;
    fiscalYear: number;
    fiscalMonth: number | null;
    sections: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      budgetAmount: number;
      actualAmount: number;
      variance: number;
      variancePercent: number;
      isFavorable: boolean;
    }>;
    totalBudget: number;
    totalActual: number;
    totalVariance: number;
    totalVariancePercent: number;
  }>> {
    const params = new URLSearchParams({ budgetId });
    if (fiscalMonth) params.set('fiscalMonth', String(fiscalMonth));
    return this.request('GET', `/api/v1/budgets/reports/budget-vs-actual?${params}`);
  }

  /**
   * Get AR Aging report
   */
  async getARAgingReport(asOfDate?: string): Promise<ApiResponse<{
    asOfDate: string;
    summary: {
      current: number;
      days31_60: number;
      days61_90: number;
      over90: number;
      total: number;
    };
    accounts: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      balance: number;
      agingBucket: string;
    }>;
  }>> {
    const params = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return this.request('GET', `/api/v1/budgets/reports/ar-aging${params}`);
  }

  /**
   * Get AP Aging report
   */
  async getAPAgingReport(asOfDate?: string): Promise<ApiResponse<{
    asOfDate: string;
    summary: {
      current: number;
      days31_60: number;
      days61_90: number;
      over90: number;
      total: number;
    };
    accounts: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      balance: number;
      agingBucket: string;
    }>;
  }>> {
    const params = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return this.request('GET', `/api/v1/budgets/reports/ap-aging${params}`);
  }

  // ============ Cash Management ============

  /**
   * Get real-time cash position
   */
  async getCashPosition(params?: {
    asOfDate?: string;
    includeThresholdCheck?: boolean;
  }): Promise<ApiResponse<{
    asOfDate: string;
    asOfDateStr: string;
    totalCashPosition: number;
    cashOnHand: {
      accounts: Array<{
        accountCode: string;
        accountName: string;
        balance: number;
        lastReconciledDate?: string;
        bankAccountId?: string;
      }>;
      total: number;
    };
    bankAccounts: {
      accounts: Array<{
        accountCode: string;
        accountName: string;
        balance: number;
        lastReconciledDate?: string;
        bankAccountId?: string;
      }>;
      total: number;
    };
    cashEquivalents: {
      accounts: Array<{
        accountCode: string;
        accountName: string;
        balance: number;
        lastReconciledDate?: string;
        bankAccountId?: string;
      }>;
      total: number;
    };
    alertStatus?: {
      alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
      isAlert: boolean;
      message: string;
      currentBalance: number;
      threshold: number;
    };
    unreconciledAccounts: Array<{
      accountCode: string;
      accountName: string;
      balance: number;
      lastReconciledDate?: string;
      bankAccountId?: string;
    }>;
  }>> {
    const searchParams = new URLSearchParams();
    if (params?.asOfDate) searchParams.set('asOfDate', params.asOfDate);
    if (params?.includeThresholdCheck) searchParams.set('includeThresholdCheck', 'true');
    const query = searchParams.toString();
    return this.request('GET', `/api/v1/reports/cash-position${query ? `?${query}` : ''}`);
  }

  /**
   * Get cash forecast (30-day by default)
   */
  async getCashForecast(params?: {
    weeks?: number;
    includeThresholdAlerts?: boolean;
  }): Promise<ApiResponse<{
    forecastDate: string;
    generatedAt: string;
    forecastPeriodDays: number;
    startingCash: number;
    endingCash: number;
    weeks: Array<{
      weekNumber: number;
      weekStartDate: string;
      weekEndDate: string;
      startingCash: number;
      inflows: {
        arCollections: number;
        sales: number;
        other: number;
        total: number;
      };
      outflows: {
        apPayments: number;
        payroll: number;
        rent: number;
        utilities: number;
        other: number;
        total: number;
      };
      netCashFlow: number;
      endingCash: number;
      alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    }>;
    lowestCashPoint: {
      weekNumber: number;
      amount: number;
      date: string;
    };
    summary: {
      totalInflows: number;
      totalOutflows: number;
      netChange: number;
      averageWeeklyBalance: number;
      weeksWithAlerts: number;
    };
  }>> {
    const searchParams = new URLSearchParams();
    if (params?.weeks) searchParams.set('weeks', String(params.weeks));
    if (params?.includeThresholdAlerts) searchParams.set('includeThresholdAlerts', 'true');
    const query = searchParams.toString();
    return this.request('GET', `/api/v1/reports/cash-forecast${query ? `?${query}` : ''}`);
  }

  /**
   * Get cash threshold configuration
   */
  async getCashThreshold(): Promise<ApiResponse<{
    warningThreshold: number;
    criticalThreshold: number;
    emergencyThreshold: number;
    updatedAt: string;
    updatedBy: string;
  }>> {
    return this.request('GET', '/api/v1/reports/cash-threshold');
  }

  /**
   * Update cash threshold configuration
   */
  async updateCashThreshold(data: {
    warningThreshold: number;
    criticalThreshold: number;
    emergencyThreshold: number;
  }): Promise<ApiResponse<{
    warningThreshold: number;
    criticalThreshold: number;
    emergencyThreshold: number;
    updatedAt: string;
    updatedBy: string;
  }>> {
    return this.request('PUT', '/api/v1/reports/cash-threshold', data);
  }

  // ============ Bank Account Management ============

  /**
   * Create a new bank account
   */
  async createBankAccount(data: {
    accountId: string;
    bankName: string;
    accountNumber: string;
    accountType: 'OPERATING' | 'PAYROLL' | 'SAVINGS' | 'FOREIGN_CURRENCY';
    currency?: string;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('POST', '/api/v1/bank-accounts', data);
  }

  /**
   * Get bank account by ID
   */
  async getBankAccount(id: string): Promise<ApiResponse<{
    id: string;
    accountId: string;
    bankName: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    status: string;
    lastReconciledDate?: string;
    lastReconciledBalance?: number;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.request('GET', `/api/v1/bank-accounts/${id}`);
  }

  /**
   * List all bank accounts
   */
  async listBankAccounts(params?: {
    status?: 'Active' | 'Inactive' | 'Closed';
    accountType?: string;
  }): Promise<ApiResponse<Array<{
    id: string;
    accountId: string;
    bankName: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    status: string;
    lastReconciledDate?: string;
    lastReconciledBalance?: number;
  }>>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.accountType) searchParams.set('accountType', params.accountType);
    const query = searchParams.toString();
    return this.request('GET', `/api/v1/bank-accounts${query ? `?${query}` : ''}`);
  }

  /**
   * Update bank account
   */
  async updateBankAccount(
    id: string,
    data: {
      bankName?: string;
      accountNumber?: string;
    }
  ): Promise<ApiResponse<unknown>> {
    return this.request('PUT', `/api/v1/bank-accounts/${id}`, data);
  }

  /**
   * Deactivate bank account
   */
  async deactivateBankAccount(id: string): Promise<ApiResponse<{ id: string; status: string }>> {
    return this.request('POST', `/api/v1/bank-accounts/${id}/deactivate`);
  }

  /**
   * Reactivate bank account
   */
  async reactivateBankAccount(id: string): Promise<ApiResponse<{ id: string; status: string }>> {
    return this.request('POST', `/api/v1/bank-accounts/${id}/reactivate`);
  }

  /**
   * Close bank account
   */
  async closeBankAccount(id: string): Promise<ApiResponse<{ id: string; status: string }>> {
    return this.request('POST', `/api/v1/bank-accounts/${id}/close`);
  }

  // ============ Bank Reconciliation ============

  /**
   * Create a new reconciliation
   */
  async createReconciliation(data: {
    bankAccountId: string;
    fiscalYear: number;
    fiscalMonth: number;
    statementEndingBalance: number;
    bookEndingBalance: number;
    notes?: string;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('POST', '/api/v1/reconciliations', data);
  }

  /**
   * Get reconciliation by ID
   */
  async getReconciliation(id: string): Promise<ApiResponse<{
    id: string;
    bankAccountId: string;
    fiscalYear: number;
    fiscalMonth: number;
    statementEndingBalance: number;
    bookEndingBalance: number;
    adjustedBankBalance?: number;
    adjustedBookBalance?: number;
    totalTransactions: number;
    matchedTransactions: number;
    unmatchedTransactions: number;
    status: string;
    reconcilingItems: Array<{
      id: string;
      itemType: string;
      description: string;
      amount: number;
      transactionDate: string;
    }>;
    completedAt?: string;
    completedBy?: string;
    approvedAt?: string;
    approvedBy?: string;
  }>> {
    return this.request('GET', `/api/v1/reconciliations/${id}`);
  }

  /**
   * List all reconciliations
   */
  async listReconciliations(): Promise<ApiResponse<Array<{
    id: string;
    bankAccountId: string;
    fiscalYear: number;
    fiscalMonth: number;
    status: string;
    completedAt?: string;
    approvedAt?: string;
  }>>> {
    return this.request('GET', '/api/v1/reconciliations');
  }

  /**
   * Start reconciliation process
   */
  async startReconciliation(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('POST', `/api/v1/reconciliations/${id}/start`);
  }

  /**
   * Import bank statement with transactions
   */
  async importBankStatement(
    reconciliationId: string,
    data: {
      bankAccountId: string;
      statementDate: string;
      periodStart: string;
      periodEnd: string;
      openingBalance: number;
      closingBalance: number;
      transactions: Array<{
        transactionDate: string;
        description: string;
        amount: number;
        reference?: string;
        checkNumber?: string;
        valueDate?: string;
      }>;
    }
  ): Promise<ApiResponse<{
    statementId: string;
    transactionCount: number;
    duplicatesSkipped: number;
  }>> {
    return this.request('POST', `/api/v1/reconciliations/${reconciliationId}/import-statement`, data);
  }

  /**
   * Get unmatched transactions for reconciliation
   */
  async getUnmatchedTransactions(reconciliationId: string): Promise<ApiResponse<Array<{
    id: string;
    transactionDate: string;
    description: string;
    reference?: string;
    amount: number;
    transactionType: string;
    matchStatus: string;
  }>>> {
    return this.request('GET', `/api/v1/reconciliations/${reconciliationId}/unmatched`);
  }

  /**
   * Match a single transaction to journal line
   */
  async matchTransaction(
    reconciliationId: string,
    data: {
      bankTransactionId: string;
      journalLineId: string;
    }
  ): Promise<ApiResponse<{
    bankTransactionId: string;
    journalLineId: string;
    matchStatus: string;
  }>> {
    return this.request('POST', `/api/v1/reconciliations/${reconciliationId}/match`, data);
  }

  /**
   * Auto-match transactions with journal lines
   */
  async autoMatchTransactions(
    reconciliationId: string,
    data: {
      journalLines: Array<{
        id: string;
        amount: number;
        date: string;
        direction: 'Debit' | 'Credit';
      }>;
      dateTolerance?: number;
    }
  ): Promise<ApiResponse<{
    matchedCount: number;
    unmatchedCount: number;
    matches: Array<{
      bankTransactionId: string;
      journalLineId: string;
    }>;
  }>> {
    return this.request('POST', `/api/v1/reconciliations/${reconciliationId}/auto-match`, data);
  }

  /**
   * Add reconciling item (outstanding check, deposit in transit, etc.)
   */
  async addReconcilingItem(
    reconciliationId: string,
    data: {
      itemType: 'OUTSTANDING_CHECK' | 'DEPOSIT_IN_TRANSIT' | 'BANK_FEE' | 'BANK_INTEREST' | 'NSF_CHECK' | 'ADJUSTMENT';
      description: string;
      amount: number;
      transactionDate: string;
      reference?: string;
      requiresJournalEntry?: boolean;
    }
  ): Promise<ApiResponse<{ itemId: string; reconciliationId: string; itemType: string }>> {
    return this.request('POST', `/api/v1/reconciliations/${reconciliationId}/items`, data);
  }

  /**
   * Calculate adjusted balances
   */
  async calculateAdjustedBalances(reconciliationId: string): Promise<ApiResponse<{
    adjustedBankBalance: number;
    adjustedBookBalance: number;
    difference: number;
    isReconciled: boolean;
  }>> {
    return this.request('POST', `/api/v1/reconciliations/${reconciliationId}/calculate`);
  }

  /**
   * Complete reconciliation
   */
  async completeReconciliation(reconciliationId: string): Promise<ApiResponse<{
    id: string;
    status: string;
    completedAt: string;
  }>> {
    return this.request('POST', `/api/v1/reconciliations/${reconciliationId}/complete`);
  }

  /**
   * Approve reconciliation
   */
  async approveReconciliation(reconciliationId: string): Promise<ApiResponse<{
    id: string;
    status: string;
    approvedAt: string;
  }>> {
    return this.request('POST', `/api/v1/reconciliations/${reconciliationId}/approve`);
  }
}

// Singleton instance for convenience
export const apiClient = new AccountingApiClient();
