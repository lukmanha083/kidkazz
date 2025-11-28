import { ValueObject } from '@kidkazz/ddd-core';

/**
 * Money Value Object
 * Encapsulates monetary amount with validation
 */
export class Money extends ValueObject<number> {
  constructor(amount: number, private readonly currency: string = 'IDR') {
    super(amount);
  }

  protected validate(amount: number): void {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Money amount must be a finite number');
    }
  }

  public getCurrency(): string {
    return this.currency;
  }

  /**
   * Get the monetary amount
   * Alias for getValue() to match common usage patterns
   */
  get amount(): number {
    return this._value;
  }

  public add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this._value + other._value, this.currency);
  }

  public subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract different currencies');
    }
    const result = this._value - other._value;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return new Money(result, this.currency);
  }

  public multiply(factor: number): Money {
    return new Money(this._value * factor, this.currency);
  }

  public applyDiscount(percentage: number): Money {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
    const discountAmount = this._value * (percentage / 100);
    return new Money(this._value - discountAmount, this.currency);
  }

  public isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare different currencies');
    }
    return this._value > other._value;
  }

  public static create(amount: number, currency: string = 'IDR'): Money {
    return new Money(amount, currency);
  }
}
