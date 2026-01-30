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
      let data: T | undefined;

      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        // Response is not JSON
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: (data as { message?: string })?.message || text || `HTTP ${response.status}`,
        };
      }

      return {
        ok: true,
        status: response.status,
        data,
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
    year: number;
    month: number;
    name: string;
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('POST', '/api/v1/fiscal-periods', data);
  }

  async getFiscalPeriod(year: number, month: number): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/fiscal-periods/${year}/${month}`);
  }

  async closeFiscalPeriod(year: number, month: number): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/v1/fiscal-periods/${year}/${month}/close`);
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
    entryDate: string;
    description: string;
    reference?: string;
    notes?: string;
    entryType?: string;
    lines: Array<{
      accountId: string;
      description?: string;
      debitAmount: number;
      creditAmount: number;
    }>;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('POST', '/api/v1/journal-entries', data);
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

  async postJournalEntry(id: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/v1/journal-entries/${id}/post`);
  }

  async voidJournalEntry(id: string, reason: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/v1/journal-entries/${id}/void`, { reason });
  }

  // ============ Account Balances ============
  async getAccountBalance(
    accountId: string,
    year: number,
    month: number
  ): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/account-balances/${accountId}/${year}/${month}`);
  }

  async calculatePeriodBalances(year: number, month: number): Promise<ApiResponse<void>> {
    return this.request('POST', `/api/v1/account-balances/calculate`, { year, month });
  }

  // ============ Reports ============
  async getTrialBalance(year: number, month: number): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/reports/trial-balance?year=${year}&month=${month}`);
  }

  async getIncomeStatement(
    year: number,
    month: number,
    comparative?: boolean
  ): Promise<ApiResponse<unknown>> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (comparative) params.set('comparative', 'true');
    return this.request('GET', `/api/v1/reports/income-statement?${params}`);
  }

  async getBalanceSheet(year: number, month: number): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/reports/balance-sheet?year=${year}&month=${month}`);
  }

  async getCashFlowStatement(year: number, month: number): Promise<ApiResponse<unknown>> {
    return this.request('GET', `/api/v1/reports/cash-flow?year=${year}&month=${month}`);
  }
}

// Singleton instance for convenience
export const apiClient = new AccountingApiClient();
