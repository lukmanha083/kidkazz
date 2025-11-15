// ========================================
// COMMON TYPE ALIASES
// ========================================

export type UserId = string;
export type ProductId = string;
export type OrderId = string;
export type PaymentId = string;
export type WarehouseId = string;
export type ReservationId = string;

export type UserRole = 'admin' | 'supplier' | 'retail_buyer' | 'wholesale_buyer';
export type OrderType = 'retail' | 'wholesale';
export type PaymentMethod = 'qris' | 'virtual_account' | 'credit_card';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type UserStatus = 'active' | 'inactive' | 'suspended';

// ========================================
// RESULT TYPE (for domain operations)
// ========================================

export interface Result<T, E = DomainError> {
  isSuccess: boolean;
  value?: T;
  error?: E;
}

export class ResultFactory {
  static ok<T>(value: T): Result<T, never> {
    return {
      isSuccess: true,
      value,
    };
  }

  static fail<E = DomainError>(error: E): Result<never, E> {
    return {
      isSuccess: false,
      error,
    };
  }
}

// ========================================
// DOMAIN ERRORS
// ========================================

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidPriceError extends DomainError {
  constructor(message: string = 'Invalid price value') {
    super(message);
    this.name = 'InvalidPriceError';
  }
}

export class InvalidSKUError extends DomainError {
  constructor(message: string = 'Invalid SKU format') {
    super(message);
    this.name = 'InvalidSKUError';
  }
}

export class InsufficientInventoryError extends DomainError {
  constructor(message: string = 'Insufficient inventory') {
    super(message);
    this.name = 'InsufficientInventoryError';
  }
}

export class InvalidOperationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOperationError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ========================================
// VALUE OBJECTS
// ========================================

/**
 * Price Value Object
 * Ensures prices are always valid (non-negative)
 */
export class Price {
  private constructor(private readonly value: number) {}

  static create(value: number): Price {
    if (value < 0) {
      throw new InvalidPriceError('Price cannot be negative');
    }
    if (!Number.isFinite(value)) {
      throw new InvalidPriceError('Price must be a finite number');
    }
    return new Price(value);
  }

  getValue(): number {
    return this.value;
  }

  add(other: Price): Price {
    return Price.create(this.value + other.value);
  }

  multiply(factor: number): Price {
    return Price.create(this.value * factor);
  }

  applyDiscount(percentage: number): Price {
    if (percentage < 0 || percentage > 100) {
      throw new InvalidPriceError('Discount percentage must be between 0 and 100');
    }
    const discountAmount = this.value * (percentage / 100);
    return Price.create(this.value - discountAmount);
  }

  equals(other: Price): boolean {
    return this.value === other.value;
  }

  isGreaterThan(other: Price): boolean {
    return this.value > other.value;
  }

  toString(): string {
    return this.value.toFixed(2);
  }
}

/**
 * SKU Value Object
 * Ensures SKUs follow correct format (uppercase alphanumeric with hyphens)
 */
export class SKU {
  private constructor(private readonly value: string) {}

  static create(value: string): SKU {
    const cleaned = value.trim().toUpperCase();

    if (!cleaned) {
      throw new InvalidSKUError('SKU cannot be empty');
    }

    if (!/^[A-Z0-9-]+$/.test(cleaned)) {
      throw new InvalidSKUError('SKU must contain only uppercase letters, numbers, and hyphens');
    }

    if (cleaned.length < 3 || cleaned.length > 50) {
      throw new InvalidSKUError('SKU must be between 3 and 50 characters');
    }

    return new SKU(cleaned);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SKU): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Email Value Object
 * Ensures emails are valid
 */
export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    const cleaned = value.trim().toLowerCase();

    if (!cleaned) {
      throw new DomainError('Email cannot be empty');
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleaned)) {
      throw new DomainError('Invalid email format');
    }

    return new Email(cleaned);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Quantity Value Object
 * Ensures quantities are valid positive integers
 */
export class Quantity {
  private constructor(private readonly value: number) {}

  static create(value: number): Quantity {
    if (!Number.isInteger(value)) {
      throw new DomainError('Quantity must be an integer');
    }
    if (value <= 0) {
      throw new DomainError('Quantity must be positive');
    }
    return new Quantity(value);
  }

  getValue(): number {
    return this.value;
  }

  add(other: Quantity): Quantity {
    return Quantity.create(this.value + other.value);
  }

  subtract(other: Quantity): Quantity {
    return Quantity.create(this.value - other.value);
  }

  multiply(factor: number): Quantity {
    return Quantity.create(Math.floor(this.value * factor));
  }

  isGreaterThanOrEqual(other: Quantity): boolean {
    return this.value >= other.value;
  }

  equals(other: Quantity): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value.toString();
  }
}

// ========================================
// COMMON INTERFACES
// ========================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: UserId;
  updatedBy?: UserId;
}
