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
// PRODUCTS API
// ============================================

export interface Product {
  id: string;
  supplierId: string;
  categoryId: string;
  sku: string;
  name: string;
  description?: string;
  shortDescription?: string;
  basePrice: number;
  currency: string;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  retailPrice?: number;
  retailDiscountPercent?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  minimumOrderQuantity: number;
  packagingUnit: string;
  unitsPerPackage: number;
  weight?: number;
  dimensions?: string;
  status: 'draft' | 'active' | 'inactive' | 'discontinued';
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingTier {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
  discountPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt?: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const productApi = {
  // Get all products
  getAll: async (): Promise<{ products: Product[] }> => {
    return apiRequest('/api/products');
  },

  // Get product by ID with details
  getById: async (id: string): Promise<{
    product: Product;
    pricingTiers: PricingTier[];
    images: ProductImage[];
    category: Category;
  }> => {
    return apiRequest(`/api/products/${id}`);
  },
};

export default {
  warehouse: warehouseApi,
  product: productApi,
};
