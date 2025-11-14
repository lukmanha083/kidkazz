// Base domain event interface
export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  timestamp: string;
  version: number;
}

// ========================================
// PRODUCT EVENTS
// ========================================

export interface ProductCreated extends DomainEvent {
  eventType: 'ProductCreated';
  productId: string;
  name: string;
  sku: string;
  retailPrice: number | null;
  wholesalePrice: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
}

export interface ProductPriceUpdated extends DomainEvent {
  eventType: 'ProductPriceUpdated';
  productId: string;
  newPrice: number;
  priceType: 'retail' | 'wholesale';
}

export interface ProductAvailabilityChanged extends DomainEvent {
  eventType: 'ProductAvailabilityChanged';
  productId: string;
  availableForRetail: boolean;
  availableForWholesale: boolean;
}

// ========================================
// ORDER EVENTS
// ========================================

export interface OrderCreated extends DomainEvent {
  eventType: 'OrderCreated';
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;
  orderType: 'retail' | 'wholesale';
}

export interface OrderConfirmed extends DomainEvent {
  eventType: 'OrderConfirmed';
  orderId: string;
}

export interface OrderCancelled extends DomainEvent {
  eventType: 'OrderCancelled';
  orderId: string;
  reason: string;
}

export interface OrderStatusUpdated extends DomainEvent {
  eventType: 'OrderStatusUpdated';
  orderId: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

// ========================================
// PAYMENT EVENTS
// ========================================

export interface PaymentInitiated extends DomainEvent {
  eventType: 'PaymentInitiated';
  paymentId: string;
  orderId: string;
  amount: number;
  method: 'qris' | 'virtual_account' | 'credit_card';
}

export interface PaymentProcessed extends DomainEvent {
  eventType: 'PaymentProcessed';
  paymentId: string;
  orderId: string;
  amount: number;
  status: 'succeeded' | 'failed';
}

export interface PaymentRefunded extends DomainEvent {
  eventType: 'PaymentRefunded';
  paymentId: string;
  orderId: string;
  amount: number;
  reason: string;
}

// ========================================
// INVENTORY EVENTS
// ========================================

export interface InventoryReserved extends DomainEvent {
  eventType: 'InventoryReserved';
  reservationId: string;
  productId: string;
  quantity: number;
  warehouseId: string;
  expiresAt: string;
}

export interface InventoryReleased extends DomainEvent {
  eventType: 'InventoryReleased';
  reservationId: string;
  productId: string;
  quantity: number;
  warehouseId: string;
}

export interface InventoryConfirmed extends DomainEvent {
  eventType: 'InventoryConfirmed';
  reservationId: string;
  productId: string;
  quantity: number;
  warehouseId: string;
}

export interface InventoryAdjusted extends DomainEvent {
  eventType: 'InventoryAdjusted';
  productId: string;
  warehouseId: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
}

// ========================================
// USER EVENTS
// ========================================

export interface UserRegistered extends DomainEvent {
  eventType: 'UserRegistered';
  userId: string;
  email: string;
  role: 'admin' | 'supplier' | 'retail_buyer' | 'wholesale_buyer';
}

export interface UserStatusChanged extends DomainEvent {
  eventType: 'UserStatusChanged';
  userId: string;
  status: 'active' | 'inactive' | 'suspended';
}

// ========================================
// QUOTE EVENTS
// ========================================

export interface QuoteRequested extends DomainEvent {
  eventType: 'QuoteRequested';
  quoteId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface QuoteProvided extends DomainEvent {
  eventType: 'QuoteProvided';
  quoteId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
  validUntil: string;
}

export interface QuoteAccepted extends DomainEvent {
  eventType: 'QuoteAccepted';
  quoteId: string;
  orderId: string;
}

export interface QuoteRejected extends DomainEvent {
  eventType: 'QuoteRejected';
  quoteId: string;
  reason: string;
}

// ========================================
// HELPER TYPES
// ========================================

export type AllDomainEvents =
  | ProductCreated
  | ProductPriceUpdated
  | ProductAvailabilityChanged
  | OrderCreated
  | OrderConfirmed
  | OrderCancelled
  | OrderStatusUpdated
  | PaymentInitiated
  | PaymentProcessed
  | PaymentRefunded
  | InventoryReserved
  | InventoryReleased
  | InventoryConfirmed
  | InventoryAdjusted
  | UserRegistered
  | UserStatusChanged
  | QuoteRequested
  | QuoteProvided
  | QuoteAccepted
  | QuoteRejected;
