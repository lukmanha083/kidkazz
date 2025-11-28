import { ValueObject } from '@kidkazz/ddd-core';

/**
 * Stock Value Object
 * Represents inventory quantity
 * Note: Can be negative for POS scenarios (business rule)
 */
export class Stock extends ValueObject<number> {
  protected validate(value: number): void {
    if (!Number.isInteger(value)) {
      throw new Error('Stock must be an integer');
    }
    // Allow negative stock (business rule for POS)
  }

  public increase(amount: number): Stock {
    if (amount <= 0) {
      throw new Error('Increase amount must be positive');
    }
    return new Stock(this._value + amount);
  }

  public decrease(amount: number): Stock {
    if (amount <= 0) {
      throw new Error('Decrease amount must be positive');
    }
    // Allow negative result
    return new Stock(this._value - amount);
  }

  public set(amount: number): Stock {
    return new Stock(amount);
  }

  public isNegative(): boolean {
    return this._value < 0;
  }

  public isZero(): boolean {
    return this._value === 0;
  }

  public isBelowMinimum(minimum: number): boolean {
    return this._value < minimum;
  }

  /**
   * Get the stock quantity
   * Alias for getValue() to match common usage patterns
   */
  get quantity(): number {
    return this._value;
  }

  public static create(value: number): Stock {
    return new Stock(value);
  }

  public static zero(): Stock {
    return new Stock(0);
  }
}
