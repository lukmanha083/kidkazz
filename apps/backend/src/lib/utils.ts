import { customAlphabet } from 'nanoid';

// Generate short IDs
export const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);

// Generate order numbers
export const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)();
  return `WH-${timestamp}-${random}`;
};

// Generate quote numbers
export const generateQuoteNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)();
  return `QT-${timestamp}-${random}`;
};

// Format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Calculate pricing based on tiers
export interface PriceTier {
  minQuantity: number;
  maxQuantity: number | null;
  pricePerUnit: number;
  discountPercent: number;
}

export function calculatePrice(quantity: number, basePrice: number, tiers: PriceTier[] = []): {
  unitPrice: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
} {
  // Find applicable tier
  const tier = tiers.find(t => {
    const meetsMin = quantity >= t.minQuantity;
    const meetsMax = t.maxQuantity === null || quantity <= t.maxQuantity;
    return meetsMin && meetsMax;
  });

  const unitPrice = tier?.pricePerUnit ?? basePrice;
  const discountPercent = tier?.discountPercent ?? 0;
  const subtotal = quantity * unitPrice;
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;

  return {
    unitPrice,
    subtotal,
    discountPercent,
    discountAmount,
    total,
  };
}

// Validate MOQ
export function validateMinimumOrder(quantity: number, moq: number): boolean {
  return quantity >= moq;
}

// Parse JSON safely
export function parseJSON<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
