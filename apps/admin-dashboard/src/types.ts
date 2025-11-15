/**
 * Shared Types for Admin Dashboard
 * Proper type definitions to replace 'any' usage
 */

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Authentication Types
export interface LoginResponse {
  userId: string;
  email: string;
  fullName: string;
  userType: 'retail' | 'wholesale' | 'admin';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  fullName: string;
  userType: string;
  status: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  userType: 'retail' | 'wholesale' | 'admin';
  status: string;
  emailVerified: boolean;
  companyName: string | null;
  businessLicense: string | null;
  taxId: string | null;
}

// Product Types
export interface CreateProductResponse {
  productId: string;
  name: string;
  sku: string;
  retailPrice: number | null;
  wholesalePrice: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  minimumOrderQuantity: number;
  status: string;
}

export interface ProductListResponse {
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    retailPrice: number | null;
    wholesalePrice: number;
    availableForRetail: boolean;
    availableForWholesale: boolean;
    minimumOrderQuantity: number;
    status: string;
  }>;
  total: number;
}

// Order Types
export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
  subtotal: number;
}

export interface OrderListResponse {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    userId: string;
    customerType: 'retail' | 'wholesale';
    status: string;
    paymentStatus: string;
    totalAmount: number;
  }>;
  total: number;
}

// Shipping Types
export interface ShippingService {
  service_code: string;
  service_name: string;
  description: string;
  cost: number;
  etd_min: number;
  etd_max: number;
}

export interface ShippingRateResponse {
  success: boolean;
  data: Array<{
    courier_code: string;
    courier_name: string;
    services: ShippingService[];
  }>;
  mode: string;
  note: string;
}
