// API base URL - update this based on your environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ============================================
// WAREHOUSE API
// ============================================

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  manager: string;
  rack?: string;
  bin?: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

export const warehouseApi = {
  // Get all warehouses
  getAll: async (): Promise<{ warehouses: Warehouse[] }> => {
    return apiRequest('/api/warehouses');
  },

  // Get only active warehouses
  getActive: async (): Promise<{ warehouses: Warehouse[] }> => {
    return apiRequest('/api/warehouses/active');
  },

  // Get warehouse by ID
  getById: async (id: string): Promise<{ warehouse: Warehouse }> => {
    return apiRequest(`/api/warehouses/${id}`);
  },

  // Create new warehouse
  create: async (data: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ warehouse: Warehouse }> => {
    return apiRequest('/api/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update warehouse
  update: async (id: string, data: Partial<Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ warehouse: Warehouse }> => {
    return apiRequest(`/api/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete warehouse
  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/warehouses/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// PRODUCTS API (MVP - Simplified)
// ============================================

export interface Product {
  productId: string;
  name: string;
  sku: string;
  retailPrice: number | null;
  wholesalePrice: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  minimumOrderQuantity: number;
  status: string; // 'active' | 'inactive' | 'discontinued'
}

export interface CreateProductInput {
  name: string;
  sku: string;
  description: string;
  retailPrice: number | null;
  wholesalePrice: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  minimumOrderQuantity?: number;
}

export interface UpdateProductPriceInput {
  priceType: 'retail' | 'wholesale';
  newPrice: number;
}

export const productApi = {
  // Get all products
  getAll: async (): Promise<{ products: Product[]; total: number }> => {
    return apiRequest('/api/products');
  },

  // Get product by ID
  getById: async (id: string): Promise<Product> => {
    return apiRequest(`/api/products/${id}`);
  },

  // Create new product
  create: async (data: CreateProductInput): Promise<Product> => {
    return apiRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update product price
  updatePrice: async (id: string, data: UpdateProductPriceInput): Promise<{ message: string }> => {
    return apiRequest(`/api/products/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete product
  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// ACCOUNTING API
// ============================================

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'COGS' | 'Expense';
  accountSubType?: string;
  parentAccountId?: string;
  description?: string;
  taxType?: string;
  isSystemAccount: boolean;
  isDetailAccount: boolean;
  status: 'Active' | 'Inactive' | 'Archived';
  currency: string;
  normalBalance: 'Debit' | 'Credit';
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalLine {
  id?: string;
  lineNumber?: number;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  description?: string;
  taxAmount?: number;
  taxCode?: string;
  dimension1?: string;
  dimension2?: string;
  dimension3?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  reference?: string;
  entryType: 'Manual' | 'System' | 'Recurring' | 'Adjusting' | 'Closing';
  status: 'Draft' | 'Posted' | 'Voided';
  sourceModule?: string;
  sourceId?: string;
  fiscalYear: number;
  fiscalPeriod: number;
  createdBy: string;
  postedBy?: string;
  postedAt?: Date;
  voidedBy?: string;
  voidedAt?: Date;
  voidReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerTransaction {
  date: Date;
  entryNumber: string;
  description?: string;
  reference?: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  balance: number;
  journalEntryId: string;
}

export interface IncomeStatement {
  period: { from: string; to: string };
  revenue: { accounts: any[]; total: number };
  cogs: { accounts: any[]; total: number };
  grossProfit: number;
  expenses: { accounts: any[]; total: number };
  netIncome: number;
}

export interface BalanceSheet {
  asOf: string;
  assets: { accounts: any[]; total: number };
  liabilities: { accounts: any[]; total: number };
  equity: { accounts: any[]; total: number };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export const accountingApi = {
  // Chart of Accounts
  accounts: {
    getAll: async (params?: { type?: string; status?: string }): Promise<{ accounts: ChartOfAccount[] }> => {
      const queryParams = new URLSearchParams(params as any).toString();
      return apiRequest(`/api/accounting/accounts${queryParams ? `?${queryParams}` : ''}`);
    },

    getActive: async (): Promise<{ accounts: ChartOfAccount[] }> => {
      return apiRequest('/api/accounting/accounts/active');
    },

    getById: async (id: string): Promise<{ account: ChartOfAccount }> => {
      return apiRequest(`/api/accounting/accounts/${id}`);
    },

    create: async (data: Partial<ChartOfAccount>): Promise<{ account: ChartOfAccount }> => {
      return apiRequest('/api/accounting/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: string, data: Partial<ChartOfAccount>): Promise<{ account: ChartOfAccount }> => {
      return apiRequest(`/api/accounting/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return apiRequest(`/api/accounting/accounts/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Journal Entries
  journalEntries: {
    getAll: async (params?: {
      status?: string;
      from?: string;
      to?: string;
      limit?: number;
    }): Promise<{ journalEntries: JournalEntry[] }> => {
      const queryParams = new URLSearchParams(params as any).toString();
      return apiRequest(`/api/accounting/journal-entries${queryParams ? `?${queryParams}` : ''}`);
    },

    getById: async (id: string): Promise<{ journalEntry: JournalEntry; lines: JournalLine[] }> => {
      return apiRequest(`/api/accounting/journal-entries/${id}`);
    },

    create: async (data: {
      entryDate: string;
      description: string;
      reference?: string;
      entryType?: string;
      status?: string;
      lines: JournalLine[];
      notes?: string;
      createdBy: string;
    }): Promise<{ journalEntry: JournalEntry; lines: JournalLine[] }> => {
      return apiRequest('/api/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    post: async (id: string, postedBy: string): Promise<{ message: string }> => {
      return apiRequest(`/api/accounting/journal-entries/${id}/post`, {
        method: 'POST',
        body: JSON.stringify({ postedBy }),
      });
    },

    void: async (id: string, voidedBy: string, reason: string): Promise<{ message: string }> => {
      return apiRequest(`/api/accounting/journal-entries/${id}/void`, {
        method: 'POST',
        body: JSON.stringify({ voidedBy, reason }),
      });
    },
  },

  // Ledger
  getLedger: async (accountId: string, params?: { from?: string; to?: string }): Promise<{
    account: ChartOfAccount;
    transactions: LedgerTransaction[];
    closingBalance: number;
  }> => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/accounting/ledger/${accountId}${queryParams ? `?${queryParams}` : ''}`);
  },

  // Reports
  reports: {
    incomeStatement: async (from: string, to: string): Promise<IncomeStatement> => {
      return apiRequest(`/api/accounting/reports/income-statement?from=${from}&to=${to}`);
    },

    balanceSheet: async (asOf: string): Promise<BalanceSheet> => {
      return apiRequest(`/api/accounting/reports/balance-sheet?asOf=${asOf}`);
    },
  },
};

export default {
  warehouse: warehouseApi,
  product: productApi,
  accounting: accountingApi,
};
