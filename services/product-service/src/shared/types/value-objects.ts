/**
 * Value Objects for Product Domain
 * Immutable objects that represent domain concepts
 */

/**
 * ProductId Value Object
 */
export type ProductId = string;

/**
 * Price Value Object
 * Represents a monetary amount
 */
export class Price {
  private constructor(private readonly value: number) {
    if (value < 0) {
      throw new Error('Price cannot be negative');
    }
  }

  static create(value: number): Price {
    return new Price(value);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: Price): boolean {
    return this.value === other.value;
  }

  add(other: Price): Price {
    return new Price(this.value + other.value);
  }

  multiply(factor: number): Price {
    return new Price(this.value * factor);
  }

  toString(): string {
    return `$${this.value.toFixed(2)}`;
  }
}

/**
 * SKU Value Object
 * Stock Keeping Unit identifier
 */
export class SKU {
  private constructor(private readonly value: string) {
    if (!value || value.length < 3) {
      throw new Error('SKU must be at least 3 characters');
    }
    if (value.length > 50) {
      throw new Error('SKU must be less than 50 characters');
    }
  }

  static create(value: string): SKU {
    return new SKU(value.toUpperCase().trim());
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
