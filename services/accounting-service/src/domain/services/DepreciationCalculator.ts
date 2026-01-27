import { DepreciationMethod } from '@/domain/value-objects';

/**
 * Input parameters for depreciation calculation
 */
export interface DepreciationInput {
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  bookValue: number;
  accumulatedDepreciation: number;
  periodMonths?: number; // Default: 1 month
}

/**
 * Depreciation Calculator Interface (Strategy Pattern)
 */
export interface DepreciationCalculator {
  calculate(input: DepreciationInput): number;
}

/**
 * Straight-Line Depreciation
 * Equal depreciation amount each period
 * Formula: (Cost - Salvage) / Useful Life
 */
export class StraightLineDepreciation implements DepreciationCalculator {
  calculate(input: DepreciationInput): number {
    this.validate(input);

    const {
      acquisitionCost,
      salvageValue,
      usefulLifeMonths,
      bookValue,
      periodMonths = 1,
    } = input;

    // Calculate monthly depreciation
    const depreciableAmount = acquisitionCost - salvageValue;
    const monthlyDepreciation = depreciableAmount / usefulLifeMonths;
    const periodDepreciation = monthlyDepreciation * periodMonths;

    // Don't depreciate below salvage value
    const remainingDepreciable = bookValue - salvageValue;
    return Math.min(periodDepreciation, Math.max(0, remainingDepreciable));
  }

  private validate(input: DepreciationInput): void {
    if (input.salvageValue > input.acquisitionCost) {
      throw new Error('Salvage value cannot exceed acquisition cost');
    }
    if (input.usefulLifeMonths <= 0) {
      throw new Error('Useful life must be positive');
    }
  }
}

/**
 * Declining Balance Depreciation
 * Applies a fixed rate to the declining book value
 * Formula: Book Value × (Factor × Straight-Line Rate)
 */
export class DecliningBalanceDepreciation implements DepreciationCalculator {
  constructor(private readonly factor: number = 2) {
    // factor = 2 for double declining, 1.5 for 150% declining
  }

  calculate(input: DepreciationInput): number {
    this.validate(input);

    const {
      usefulLifeMonths,
      salvageValue,
      bookValue,
      periodMonths = 1,
    } = input;

    // Calculate annual straight-line rate (as decimal)
    const annualStraightLineRate = 12 / usefulLifeMonths;

    // Apply factor (e.g., 2x for double declining)
    const decliningRate = annualStraightLineRate * this.factor;

    // Calculate annual depreciation on current book value
    const annualDepreciation = bookValue * decliningRate;

    // Calculate monthly depreciation
    const monthlyDepreciation = annualDepreciation / 12;
    const periodDepreciation = monthlyDepreciation * periodMonths;

    // Don't depreciate below salvage value
    const maxDepreciation = bookValue - salvageValue;
    return Math.min(periodDepreciation, Math.max(0, maxDepreciation));
  }

  private validate(input: DepreciationInput): void {
    if (input.salvageValue > input.acquisitionCost) {
      throw new Error('Salvage value cannot exceed acquisition cost');
    }
    if (input.usefulLifeMonths <= 0) {
      throw new Error('Useful life must be positive');
    }
  }
}

/**
 * Sum-of-Years-Digits Depreciation
 * Accelerated method using fraction of remaining years
 * Formula: (Cost - Salvage) × (Remaining Years / Sum of Years)
 */
export class SumOfYearsDigitsDepreciation implements DepreciationCalculator {
  calculate(input: DepreciationInput): number {
    this.validate(input);

    const {
      acquisitionCost,
      salvageValue,
      usefulLifeMonths,
      bookValue,
      accumulatedDepreciation,
      periodMonths = 1,
    } = input;

    const usefulLifeYears = usefulLifeMonths / 12;
    const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
    const depreciableAmount = acquisitionCost - salvageValue;

    // Calculate elapsed years from accumulated depreciation
    const monthlyAvg = depreciableAmount / usefulLifeMonths;
    const elapsedMonths = accumulatedDepreciation / monthlyAvg || 0;
    const currentYear = Math.floor(elapsedMonths / 12) + 1;
    const remainingYears = usefulLifeYears - currentYear + 1;

    if (remainingYears <= 0) {
      return 0;
    }

    // Current year's depreciation fraction
    const yearFraction = remainingYears / sumOfYears;
    const yearlyDepreciation = depreciableAmount * yearFraction;
    const monthlyDepreciation = yearlyDepreciation / 12;
    const periodDepreciation = monthlyDepreciation * periodMonths;

    // Don't depreciate below salvage value
    const maxDepreciation = bookValue - salvageValue;
    return Math.min(periodDepreciation, Math.max(0, maxDepreciation));
  }

  private validate(input: DepreciationInput): void {
    if (input.salvageValue > input.acquisitionCost) {
      throw new Error('Salvage value cannot exceed acquisition cost');
    }
    if (input.usefulLifeMonths <= 0) {
      throw new Error('Useful life must be positive');
    }
  }
}

/**
 * Factory for creating depreciation calculators
 */
export class DepreciationCalculatorFactory {
  private static calculators = new Map<DepreciationMethod, DepreciationCalculator>();

  private static initialized = false;

  private static initialize(): void {
    if (this.initialized) return;
    this.calculators.set(DepreciationMethod.STRAIGHT_LINE, new StraightLineDepreciation());
    this.calculators.set(DepreciationMethod.DECLINING_BALANCE, new DecliningBalanceDepreciation(2));
    this.calculators.set(DepreciationMethod.SUM_OF_YEARS_DIGITS, new SumOfYearsDigitsDepreciation());
    // UNITS_OF_PRODUCTION requires usage data, not implemented yet
    this.initialized = true;
  }

  static getCalculator(method: DepreciationMethod): DepreciationCalculator {
    this.initialize();
    const calculator = this.calculators.get(method);
    if (!calculator) {
      throw new Error(`Unsupported depreciation method: ${method}`);
    }
    return calculator;
  }
}
