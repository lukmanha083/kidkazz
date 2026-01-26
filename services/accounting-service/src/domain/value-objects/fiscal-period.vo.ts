/**
 * Fiscal Period Status
 */
export enum FiscalPeriodStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
  LOCKED = 'Locked',
}

/**
 * Month names for display
 */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Fiscal Period Value Object
 * Represents a month-year accounting period
 * Immutable - navigation methods return new instances
 */
export class FiscalPeriod {
  readonly year: number;
  readonly month: number;

  constructor(year: number, month: number) {
    if (year < 1900) {
      throw new Error('Year must be 1900 or later');
    }
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }
    this.year = year;
    this.month = month;
  }

  /**
   * Factory method to create a fiscal period
   */
  static create(year: number, month: number): FiscalPeriod {
    return new FiscalPeriod(year, month);
  }

  /**
   * Create fiscal period from a Date object
   */
  static fromDate(date: Date): FiscalPeriod {
    return new FiscalPeriod(date.getFullYear(), date.getMonth() + 1);
  }

  /**
   * Get current fiscal period
   */
  static current(): FiscalPeriod {
    return FiscalPeriod.fromDate(new Date());
  }

  /**
   * Get next fiscal period
   */
  next(): FiscalPeriod {
    if (this.month === 12) {
      return new FiscalPeriod(this.year + 1, 1);
    }
    return new FiscalPeriod(this.year, this.month + 1);
  }

  /**
   * Get previous fiscal period
   */
  previous(): FiscalPeriod {
    if (this.month === 1) {
      return new FiscalPeriod(this.year - 1, 12);
    }
    return new FiscalPeriod(this.year, this.month - 1);
  }

  /**
   * Format as YYYY-MM
   */
  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  /**
   * Format for display (e.g., "January 2025")
   */
  toDisplayString(): string {
    return `${MONTH_NAMES[this.month - 1]} ${this.year}`;
  }

  /**
   * Check equality with another FiscalPeriod
   */
  equals(other: FiscalPeriod): boolean {
    return this.year === other.year && this.month === other.month;
  }

  /**
   * Check if this period is before another
   */
  isBefore(other: FiscalPeriod): boolean {
    if (this.year < other.year) return true;
    if (this.year > other.year) return false;
    return this.month < other.month;
  }

  /**
   * Check if this period is after another
   */
  isAfter(other: FiscalPeriod): boolean {
    if (this.year > other.year) return true;
    if (this.year < other.year) return false;
    return this.month > other.month;
  }

  /**
   * Get start date of the period (first day of month)
   */
  getStartDate(): Date {
    return new Date(this.year, this.month - 1, 1);
  }

  /**
   * Get end date of the period (last day of month)
   */
  getEndDate(): Date {
    // Create date for first day of next month, then subtract one day
    return new Date(this.year, this.month, 0);
  }

  /**
   * Check if a date falls within this period
   */
  containsDate(date: Date): boolean {
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth() + 1;
    return dateYear === this.year && dateMonth === this.month;
  }

  /**
   * Get number of days in this period
   */
  getDaysInPeriod(): number {
    return this.getEndDate().getDate();
  }

  /**
   * Create FiscalPeriod from string (YYYY-MM format)
   */
  static fromString(str: string): FiscalPeriod {
    const [yearStr, monthStr] = str.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    return new FiscalPeriod(year, month);
  }
}
