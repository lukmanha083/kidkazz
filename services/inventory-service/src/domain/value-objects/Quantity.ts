import { ValueObject } from '@kidkazz/ddd-core';

/**
 * Quantity Value Object
 * Represents inventory quantities
 * Can be negative for POS scenarios (business rule)
 */
export class Quantity extends ValueObject<number> {
  protected validate(value: number): void {
    if (!Number.isInteger(value)) {
      throw new Error('Quantity must be an integer');
    }
    // Allow negative quantities (business rule for POS)
  }

  public increase(amount: number): Quantity {
    if (amount <= 0) {
      throw new Error('Increase amount must be positive');
    }
    return new Quantity(this._value + amount);
  }

  public decrease(amount: number): Quantity {
    if (amount <= 0) {
      throw new Error('Decrease amount must be positive');
    }
    // Allow negative result (business rule)
    return new Quantity(this._value - amount);
  }

  public set(amount: number): Quantity {
    return new Quantity(amount);
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

  public static create(value: number): Quantity {
    return new Quantity(value);
  }

  public static zero(): Quantity {
    return new Quantity(0);
  }
}
