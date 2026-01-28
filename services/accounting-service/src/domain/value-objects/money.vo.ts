/**
 * Money Value Object
 * Represents a monetary amount with currency
 * Immutable - all operations return new instances
 */
export class Money {
  readonly amount: number;
  readonly currency: string;

  constructor(amount: number, currency = 'IDR') {
    if (!Number.isFinite(amount)) {
      throw new Error('Amount must be a finite number');
    }
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    this.amount = amount;
    this.currency = currency;
  }

  /**
   * Add two money values (must be same currency)
   */
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  /**
   * Subtract money value (must be same currency, result must be non-negative)
   */
  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    if (this.amount < other.amount) {
      throw new Error('Subtraction would result in negative amount');
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  /**
   * Multiply by a factor (must be non-negative)
   * Result is rounded to 2 decimal places for currency precision
   */
  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Factor cannot be negative');
    }
    // Round to 2 decimal places to avoid floating point precision issues
    const result = Math.round(this.amount * factor * 100) / 100;
    return new Money(result, this.currency);
  }

  /**
   * Check equality with another Money instance
   */
  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  /**
   * Check if amount is zero
   */
  isZero(): boolean {
    return this.amount === 0;
  }

  /**
   * Format money for display
   */
  format(): string {
    if (this.currency === 'IDR') {
      return `Rp ${this.amount.toLocaleString('id-ID')}`;
    }
    if (this.currency === 'USD') {
      return `$${this.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${this.currency} ${this.amount.toLocaleString()}`;
  }

  /**
   * Create Money from raw value (useful for database hydration)
   */
  static fromRaw(amount: number, currency = 'IDR'): Money {
    return new Money(amount, currency);
  }

  /**
   * Create zero money
   */
  static zero(currency = 'IDR'): Money {
    return new Money(0, currency);
  }
}
