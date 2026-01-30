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
}

// Singleton instance for convenience
export const apiClient = new AccountingApiClient();
