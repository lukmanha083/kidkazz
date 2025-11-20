import { ValueObject } from '@kidkazz/ddd-core';

/**
 * SKU (Stock Keeping Unit) Value Object
 * Unique identifier for products
 */
export class SKU extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('SKU cannot be empty');
    }
    if (value.length > 50) {
      throw new Error('SKU cannot exceed 50 characters');
    }
    // SKU format validation (alphanumeric, hyphens, underscores)
    const skuPattern = /^[A-Z0-9\-_]+$/;
    if (!skuPattern.test(value)) {
      throw new Error('SKU must contain only uppercase letters, numbers, hyphens, and underscores');
    }
  }

  public static create(value: string): SKU {
    return new SKU(value.toUpperCase().trim());
  }
}
