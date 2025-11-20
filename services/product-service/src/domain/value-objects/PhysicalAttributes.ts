import { ValueObject } from '@kidkazz/ddd-core';

interface PhysicalAttributesProps {
  weight: number;      // in kg
  length: number;      // in cm (panjang)
  width: number;       // in cm (lebar)
  height: number;      // in cm (tinggi)
}

/**
 * PhysicalAttributes Value Object
 * Represents physical dimensions and weight of a product
 *
 * Used for:
 * - Shipping cost calculation
 * - Warehouse storage planning
 * - Product specifications display
 * - Logistics optimization
 */
export class PhysicalAttributes extends ValueObject<PhysicalAttributesProps> {
  protected validate(props: PhysicalAttributesProps): void {
    // Validate weight
    if (props.weight < 0) {
      throw new Error('Weight cannot be negative');
    }
    if (!Number.isFinite(props.weight)) {
      throw new Error('Weight must be a finite number');
    }

    // Validate dimensions
    if (props.length <= 0 || props.width <= 0 || props.height <= 0) {
      throw new Error('Dimensions must be positive numbers');
    }

    if (!Number.isFinite(props.length) || !Number.isFinite(props.width) || !Number.isFinite(props.height)) {
      throw new Error('Dimensions must be finite numbers');
    }

    // Business rule: Maximum dimension limits for standard shipping
    const MAX_DIMENSION_CM = 200; // 2 meters max per side
    const MAX_WEIGHT_KG = 100;    // 100kg max weight

    if (props.length > MAX_DIMENSION_CM || props.width > MAX_DIMENSION_CM || props.height > MAX_DIMENSION_CM) {
      throw new Error(`Dimensions cannot exceed ${MAX_DIMENSION_CM}cm per side`);
    }

    if (props.weight > MAX_WEIGHT_KG) {
      throw new Error(`Weight cannot exceed ${MAX_WEIGHT_KG}kg`);
    }
  }

  /**
   * Get actual weight in kg
   */
  public getWeight(): number {
    return this._value.weight;
  }

  /**
   * Get dimensions
   */
  public getDimensions(): { length: number; width: number; height: number } {
    return {
      length: this._value.length,
      width: this._value.width,
      height: this._value.height,
    };
  }

  /**
   * Calculate volume weight (dimensional weight)
   * Standard formula: (L × W × H) / 5000 for cm to kg conversion
   * Used by shipping carriers to determine chargeable weight
   */
  public getVolumeWeight(): number {
    return (this._value.length * this._value.width * this._value.height) / 5000;
  }

  /**
   * Calculate volume in cubic cm
   */
  public getVolume(): number {
    return this._value.length * this._value.width * this._value.height;
  }

  /**
   * Calculate chargeable weight
   * Carriers charge based on whichever is higher: actual weight or volume weight
   */
  public getChargeableWeight(): number {
    return Math.max(this._value.weight, this.getVolumeWeight());
  }

  /**
   * Check if product is oversized (for shipping purposes)
   */
  public isOversized(): boolean {
    const OVERSIZED_THRESHOLD_CM = 150;
    return this._value.length > OVERSIZED_THRESHOLD_CM ||
           this._value.width > OVERSIZED_THRESHOLD_CM ||
           this._value.height > OVERSIZED_THRESHOLD_CM;
  }

  /**
   * Check if product is heavy (for handling purposes)
   */
  public isHeavy(): boolean {
    const HEAVY_THRESHOLD_KG = 30;
    return this._value.weight > HEAVY_THRESHOLD_KG;
  }

  /**
   * Convert to data for persistence
   */
  public toData() {
    return {
      weight: this._value.weight,
      length: this._value.length,
      width: this._value.width,
      height: this._value.height,
    };
  }

  /**
   * Factory method to create from data
   */
  public static create(props: PhysicalAttributesProps): PhysicalAttributes {
    return new PhysicalAttributes(props);
  }

  /**
   * Factory method for lightweight products (default small package)
   */
  public static createDefault(): PhysicalAttributes {
    return new PhysicalAttributes({
      weight: 0.5,    // 500g
      length: 20,     // 20cm
      width: 15,      // 15cm
      height: 10,     // 10cm
    });
  }
}
