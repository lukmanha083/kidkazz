// API base URLs for microservices
const PRODUCT_SERVICE_URL = import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';
const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';
const ACCOUNTING_SERVICE_URL = import.meta.env.VITE_ACCOUNTING_SERVICE_URL || 'http://localhost:8794';

// For backward compatibility
const API_BASE_URL = PRODUCT_SERVICE_URL;

// Generic API request function with service selection
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  service: 'product' | 'inventory' | 'accounting' = 'product'
): Promise<T> {
  const baseUrls = {
    product: PRODUCT_SERVICE_URL,
    inventory: INVENTORY_SERVICE_URL,
    accounting: ACCOUNTING_SERVICE_URL,
  };

  const url = `${baseUrls[service]}${endpoint}`;

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
// CATEGORIES API
// ============================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: 'active' | 'inactive';
}

export const categoryApi = {
  getAll: async (): Promise<{ categories: Category[]; total: number }> => {
    return apiRequest('/api/categories');
  },

  getActive: async (): Promise<{ categories: Category[]; total: number }> => {
    return apiRequest('/api/categories/active');
  },

  getById: async (id: string): Promise<Category> => {
    return apiRequest(`/api/categories/${id}`);
  },

  create: async (data: CreateCategoryInput): Promise<Category> => {
    return apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<CreateCategoryInput>): Promise<Category> => {
    return apiRequest(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// WAREHOUSE API
// ============================================

// Updated to match DDD backend schema
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: 'active' | 'inactive';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateWarehouseInput {
  code: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: 'active' | 'inactive';
}

// Updated to use Inventory Service URL
export const warehouseApi = {
  // Get all warehouses
  getAll: async (): Promise<{ warehouses: Warehouse[]; total: number }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/warehouses`;
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch warehouses: ${response.statusText}`);
    }
    return response.json();
  },

  // Get only active warehouses
  getActive: async (): Promise<{ warehouses: Warehouse[]; total: number }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/warehouses/active`;
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch active warehouses: ${response.statusText}`);
    }
    return response.json();
  },

  // Get warehouse by ID
  getById: async (id: string): Promise<Warehouse> => {
    const url = `${INVENTORY_SERVICE_URL}/api/warehouses/${id}`;
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
      throw new Error(`Failed to fetch warehouse: ${response.statusText}`);
    }
    return response.json();
  },

  // Create new warehouse
  create: async (data: CreateWarehouseInput): Promise<{ id: string; code: string; name: string }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/warehouses`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Failed to create warehouse: ${response.statusText}`);
    }
    return response.json();
  },

  // Update warehouse
  update: async (id: string, data: Partial<CreateWarehouseInput>): Promise<Warehouse> => {
    const url = `${INVENTORY_SERVICE_URL}/api/warehouses/${id}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Failed to update warehouse: ${response.statusText}`);
    }
    return response.json();
  },

  // Delete warehouse
  delete: async (id: string): Promise<{ message: string }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/warehouses/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Failed to delete warehouse: ${response.statusText}`);
    }
    return response.json();
  },
};

// ============================================
// PRODUCTS API (Full Features)
// ============================================

export interface ProductVariant {
  id: string;
  productId: string;
  productName: string;
  productSKU: string;
  variantName: string;
  variantSKU: string;
  variantType: 'Color' | 'Size' | 'Material' | 'Style';
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductUOM {
  id: string;
  productId: string;
  uomCode: string;
  uomName: string;
  barcode: string;
  conversionFactor: number;
  stock: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductLocation {
  id: string;
  productId: string;
  warehouseId: string;
  rack?: string | null;
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CreateProductLocationInput {
  productId: string;
  warehouseId: string;
  rack?: string | null;
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
  quantity?: number;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  sku: string;
  description?: string;
  image?: string;
  categoryId?: string;
  price: number;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  stock: number;
  baseUnit: string;
  wholesaleThreshold: number;
  minimumOrderQuantity: number;
  minimumStock?: number | null; // Minimum stock threshold for alert reports
  weight?: number | null; // NEW: in kg
  length?: number | null; // NEW: in cm (panjang)
  width?: number | null; // NEW: in cm (lebar)
  height?: number | null; // NEW: in cm (tinggi)
  expirationDate?: string | null; // Product expiration date (ISO date string)
  alertDate?: string | null; // Alert date for notification before expiration (ISO date string)
  rating: number;
  reviews: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  status: 'active' | 'inactive' | 'discontinued';
  isBundle: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  // Populated when fetching by ID
  variants?: ProductVariant[];
  productUOMs?: ProductUOM[];
  productLocations?: ProductLocation[];
}

export interface CreateProductInput {
  barcode: string;
  name: string;
  sku: string;
  description?: string;
  image?: string;
  categoryId?: string;
  price: number;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  weight?: number; // NEW: in kg
  length?: number; // NEW: in cm
  width?: number; // NEW: in cm
  height?: number; // NEW: in cm
  expirationDate?: string; // Product expiration date (ISO date string)
  alertDate?: string; // Alert date for notification before expiration (ISO date string)
  stock?: number;
  baseUnit?: string;
  wholesaleThreshold?: number;
  minimumOrderQuantity?: number;
  minimumStock?: number; // Minimum stock threshold for alert reports
  rating?: number;
  reviews?: number;
  availableForRetail?: boolean;
  availableForWholesale?: boolean;
  status?: 'active' | 'inactive' | 'discontinued';
  isBundle?: boolean;
}

export const productApi = {
  getAll: async (params?: {
    status?: string;
    category?: string;
    search?: string;
  }): Promise<{ products: Product[]; total: number }> => {
    const queryParams = params ? new URLSearchParams(params as any).toString() : '';
    return apiRequest(`/api/products${queryParams ? `?${queryParams}` : ''}`);
  },

  getById: async (id: string): Promise<Product> => {
    return apiRequest(`/api/products/${id}`);
  },

  getBySKU: async (sku: string): Promise<Product> => {
    return apiRequest(`/api/products/sku/${sku}`);
  },

  create: async (data: CreateProductInput): Promise<Product> => {
    return apiRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<CreateProductInput>): Promise<Product> => {
    return apiRequest(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updatePrice: async (
    id: string,
    data: { priceType: 'retail' | 'wholesale' | 'base'; newPrice: number }
  ): Promise<{ message: string }> => {
    return apiRequest(`/api/products/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateStock: async (id: string, stock: number): Promise<{ message: string }> => {
    return apiRequest(`/api/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// PRODUCT VARIANTS API
// ============================================

export interface CreateVariantInput {
  productId: string;
  productName: string;
  productSKU: string;
  variantName: string;
  variantSKU: string;
  variantType: 'Color' | 'Size' | 'Material' | 'Style';
  price: number;
  stock?: number;
  status?: 'active' | 'inactive';
  image?: string;
}

export const variantApi = {
  getAll: async (productId?: string): Promise<{ variants: ProductVariant[]; total: number }> => {
    const query = productId ? `?productId=${productId}` : '';
    return apiRequest(`/api/variants${query}`);
  },

  getById: async (id: string): Promise<ProductVariant> => {
    return apiRequest(`/api/variants/${id}`);
  },

  create: async (data: CreateVariantInput): Promise<ProductVariant> => {
    return apiRequest('/api/variants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Omit<CreateVariantInput, 'productId'>>): Promise<ProductVariant> => {
    return apiRequest(`/api/variants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateStock: async (id: string, stock: number): Promise<{ message: string }> => {
    return apiRequest(`/api/variants/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/variants/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// PRODUCT BUNDLES API
// ============================================

export interface BundleItem {
  id?: string;
  bundleId?: string;
  productId: string;
  productSKU: string;
  productName: string;
  barcode: string;
  quantity: number;
  price: number;
  stock?: number; // Available stock (only for display, not stored in DB)
  baseUnit?: string; // Base unit of measure (only for display, not stored in DB)
  createdAt?: Date;
}

export interface ProductBundle {
  id: string;
  bundleName: string;
  bundleSKU: string;
  bundleDescription?: string | null;
  bundleImage?: string | null;
  warehouseId?: string | null; // Warehouse where bundle is assembled
  bundlePrice: number;
  discountPercentage: number;
  status: 'active' | 'inactive';
  availableStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBundleInput {
  bundleName: string;
  bundleSKU: string;
  bundleDescription?: string | null;
  bundleImage?: string | null;
  warehouseId?: string | null; // Warehouse where bundle is assembled
  bundlePrice: number;
  discountPercentage: number;
  status?: 'active' | 'inactive';
  availableStock?: number;
  items: BundleItem[];
}

export const bundleApi = {
  getAll: async (): Promise<{ bundles: ProductBundle[]; total: number }> => {
    return apiRequest('/api/bundles');
  },

  getById: async (id: string): Promise<{ bundle: ProductBundle; items: BundleItem[] }> => {
    return apiRequest(`/api/bundles/${id}`);
  },

  create: async (data: CreateBundleInput): Promise<{ bundle: ProductBundle; items: BundleItem[] }> => {
    return apiRequest('/api/bundles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Omit<CreateBundleInput, 'items'>>): Promise<ProductBundle> => {
    return apiRequest(`/api/bundles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateItems: async (id: string, items: BundleItem[]): Promise<{ items: BundleItem[] }> => {
    return apiRequest(`/api/bundles/${id}/items`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },

  updateStock: async (id: string, availableStock: number): Promise<{ message: string }> => {
    return apiRequest(`/api/bundles/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ availableStock }),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/bundles/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// UOMS API
// ============================================

export interface UOM {
  id: string;
  code: string;
  name: string;
  conversionFactor: number;
  isBaseUnit: boolean;
  createdAt: Date;
}

export interface CreateUOMInput {
  code: string;
  name: string;
  conversionFactor: number;
  isBaseUnit?: boolean;
}

export interface CreateProductUOMInput {
  productId: string;
  uomCode: string;
  uomName: string;
  barcode: string;
  conversionFactor: number;
  stock?: number;
  isDefault?: boolean;
}

export const uomApi = {
  // Master UOMs
  getAll: async (): Promise<{ uoms: UOM[]; total: number }> => {
    return apiRequest('/api/uoms');
  },

  getByCode: async (code: string): Promise<UOM> => {
    return apiRequest(`/api/uoms/${code}`);
  },

  create: async (data: CreateUOMInput): Promise<UOM> => {
    return apiRequest('/api/uoms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/uoms/${id}`, {
      method: 'DELETE',
    });
  },

  // Product UOMs
  getProductUOMs: async (productId: string): Promise<{ productUOMs: ProductUOM[]; total: number }> => {
    return apiRequest(`/api/uoms/products/${productId}`);
  },

  addProductUOM: async (data: CreateProductUOMInput): Promise<ProductUOM> => {
    return apiRequest('/api/uoms/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProductUOM: async (id: string, data: Partial<Omit<CreateProductUOMInput, 'productId'>>): Promise<ProductUOM> => {
    return apiRequest(`/api/uoms/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateProductUOMStock: async (id: string, stock: number): Promise<{ message: string }> => {
    return apiRequest(`/api/uoms/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
  },

  deleteProductUOM: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/uoms/products/${id}`, {
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
      return apiRequest(`/api/accounting/accounts${queryParams ? `?${queryParams}` : ''}`, {}, 'accounting');
    },

    getActive: async (): Promise<{ accounts: ChartOfAccount[] }> => {
      return apiRequest('/api/accounting/accounts/active', {}, 'accounting');
    },

    getById: async (id: string): Promise<{ account: ChartOfAccount }> => {
      return apiRequest(`/api/accounting/accounts/${id}`, {}, 'accounting');
    },

    create: async (data: Partial<ChartOfAccount>): Promise<{ account: ChartOfAccount }> => {
      return apiRequest('/api/accounting/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }, 'accounting');
    },

    update: async (id: string, data: Partial<ChartOfAccount>): Promise<{ account: ChartOfAccount }> => {
      return apiRequest(`/api/accounting/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, 'accounting');
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return apiRequest(`/api/accounting/accounts/${id}`, {
        method: 'DELETE',
      }, 'accounting');
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
      return apiRequest(`/api/accounting/journal-entries${queryParams ? `?${queryParams}` : ''}`, {}, 'accounting');
    },

    getById: async (id: string): Promise<{ journalEntry: JournalEntry; lines: JournalLine[] }> => {
      return apiRequest(`/api/accounting/journal-entries/${id}`, {}, 'accounting');
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
      }, 'accounting');
    },

    post: async (id: string, postedBy: string): Promise<{ message: string }> => {
      return apiRequest(`/api/accounting/journal-entries/${id}/post`, {
        method: 'POST',
        body: JSON.stringify({ postedBy }),
      }, 'accounting');
    },

    void: async (id: string, voidedBy: string, reason: string): Promise<{ message: string }> => {
      return apiRequest(`/api/accounting/journal-entries/${id}/void`, {
        method: 'POST',
        body: JSON.stringify({ voidedBy, reason }),
      }, 'accounting');
    },
  },

  // Ledger
  getLedger: async (accountId: string, params?: { from?: string; to?: string }): Promise<{
    account: ChartOfAccount;
    transactions: LedgerTransaction[];
    closingBalance: number;
  }> => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/accounting/ledger/${accountId}${queryParams ? `?${queryParams}` : ''}`, {}, 'accounting');
  },

  // Reports
  reports: {
    incomeStatement: async (from: string, to: string): Promise<IncomeStatement> => {
      return apiRequest(`/api/accounting/reports/income-statement?from=${from}&to=${to}`, {}, 'accounting');
    },

    balanceSheet: async (asOf: string): Promise<BalanceSheet> => {
      return apiRequest(`/api/accounting/reports/balance-sheet?asOf=${asOf}`, {}, 'accounting');
    },
  },
};

// ============================================
// INVENTORY API
// ============================================

export interface Inventory {
  id: string;
  warehouseId: string;
  productId: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityInTransit?: number;
  minimumStock: number;
  lastRestockedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InventoryAdjustmentInput {
  productId: string;
  warehouseId: string;
  quantity: number;
  movementType: 'in' | 'out' | 'adjustment';
  reason?: string;
  performedBy?: string;
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  productId: string;
  warehouseId: string;
  movementType: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
  performedBy?: string;
  createdAt: Date | string;
}

export const inventoryApi = {
  // Get all inventory records
  getAll: async (filters?: { productId?: string; warehouseId?: string }): Promise<{ inventory: Inventory[]; total: number }> => {
    const params = new URLSearchParams(filters as any).toString();
    const url = INVENTORY_SERVICE_URL + '/api/inventory' + (params ? '?' + params : '');
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // Get inventory for a product across all warehouses
  getByProduct: async (productId: string): Promise<{ productId: string; warehouses: Inventory[]; totalAvailable: number; totalReserved: number }> => {
    const url = INVENTORY_SERVICE_URL + '/api/inventory/' + productId;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // Get specific product-warehouse inventory
  getByProductAndWarehouse: async (productId: string, warehouseId: string): Promise<Inventory> => {
    const url = INVENTORY_SERVICE_URL + '/api/inventory/' + productId + '/' + warehouseId;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // Adjust inventory (in/out/adjustment)
  adjust: async (data: InventoryAdjustmentInput): Promise<{ inventoryId: string; productId: string; warehouseId: string; previousQuantity: number; newQuantity: number; message: string }> => {
    const url = INVENTORY_SERVICE_URL + '/api/inventory/adjust';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json());
  },

  // Set minimum stock level
  setMinimumStock: async (inventoryId: string, minimumStock: number): Promise<{ message: string }> => {
    const url = INVENTORY_SERVICE_URL + '/api/inventory/' + inventoryId + '/minimum-stock';
    return fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minimumStock }),
    }).then(r => r.json());
  },

  // Get movement history for a product
  getMovements: async (productId: string, limit?: number): Promise<{ movements: InventoryMovement[]; total: number }> => {
    const params = limit ? '?limit=' + limit : '';
    const url = INVENTORY_SERVICE_URL + '/api/inventory/movements/' + productId + params;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },
};

// ============================================
// PRODUCT LOCATIONS API
// ============================================

export const productLocationApi = {
  getAll: async (filters?: {
    productId?: string;
    warehouseId?: string;
  }): Promise<{ locations: ProductLocation[]; total: number }> => {
    const queryParams = filters ? new URLSearchParams(filters as any).toString() : '';
    return apiRequest(`/api/product-locations${queryParams ? `?${queryParams}` : ''}`);
  },

  getById: async (id: string): Promise<ProductLocation> => {
    return apiRequest(`/api/product-locations/${id}`);
  },

  getByProduct: async (productId: string): Promise<{ locations: ProductLocation[]; total: number }> => {
    return apiRequest(`/api/product-locations/product/${productId}`);
  },

  getByWarehouse: async (warehouseId: string): Promise<{ locations: ProductLocation[]; total: number }> => {
    return apiRequest(`/api/product-locations/warehouse/${warehouseId}`);
  },

  create: async (data: CreateProductLocationInput): Promise<ProductLocation> => {
    return apiRequest('/api/product-locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Omit<CreateProductLocationInput, 'productId'>>): Promise<ProductLocation> => {
    return apiRequest(`/api/product-locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateQuantity: async (id: string, quantity: number): Promise<{ message: string }> => {
    return apiRequest(`/api/product-locations/${id}/quantity`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/product-locations/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// VARIANT LOCATIONS API
// ============================================

export interface VariantLocation {
  id: string;
  variantId: string;
  warehouseId: string;
  rack?: string | null;
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CreateVariantLocationInput {
  variantId: string;
  warehouseId: string;
  rack?: string | null;
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
  quantity: number;
}

export const variantLocationApi = {
  getAll: async (filters?: {
    variantId?: string;
    warehouseId?: string;
  }): Promise<{ variantLocations: VariantLocation[]; total: number }> => {
    const queryParams = filters ? new URLSearchParams(filters as any).toString() : '';
    return apiRequest(`/api/variant-locations${queryParams ? `?${queryParams}` : ''}`);
  },

  getById: async (id: string): Promise<VariantLocation> => {
    return apiRequest(`/api/variant-locations/${id}`);
  },

  getByVariant: async (variantId: string): Promise<{ variantLocations: VariantLocation[]; total: number }> => {
    return apiRequest(`/api/variant-locations/variant/${variantId}`);
  },

  getByWarehouse: async (warehouseId: string): Promise<{ variantLocations: VariantLocation[]; total: number }> => {
    return apiRequest(`/api/variant-locations/warehouse/${warehouseId}`);
  },

  create: async (data: CreateVariantLocationInput): Promise<VariantLocation> => {
    return apiRequest('/api/variant-locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Omit<CreateVariantLocationInput, 'variantId'>>): Promise<VariantLocation> => {
    return apiRequest(`/api/variant-locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateQuantity: async (id: string, quantity: number): Promise<{ message: string }> => {
    return apiRequest(`/api/variant-locations/${id}/quantity`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/api/variant-locations/${id}`, {
      method: 'DELETE',
    });
  },
};

export default {
  category: categoryApi,
  warehouse: warehouseApi,
  product: productApi,
  variant: variantApi,
  bundle: bundleApi,
  uom: uomApi,
  accounting: accountingApi,
  inventory: inventoryApi,
  productLocation: productLocationApi,
  variantLocation: variantLocationApi,
};
