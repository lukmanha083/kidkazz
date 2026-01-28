import { nanoid } from 'nanoid';

/**
 * Exchange rate source
 * - manual: Manually entered by user
 * - api: Fetched from external API (ExchangeRate-API, GitHub Exchange API)
 * - bank: Central bank source (Frankfurter/ECB)
 */
export type ExchangeRateSource = 'manual' | 'api' | 'bank';

/**
 * Exchange rate creation properties
 */
export interface ExchangeRateProps {
  id?: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  source?: ExchangeRateSource;
  createdBy?: string;
}

/**
 * Exchange rate persistence properties
 */
export interface ExchangeRatePersistenceProps extends ExchangeRateProps {
  id: string;
  createdAt: Date;
}

/**
 * Exchange Rate Entity
 * Represents an exchange rate between two currencies at a specific date
 */
export class ExchangeRate {
  private _id: string;
  private _fromCurrency: string;
  private _toCurrency: string;
  private _rate: number;
  private _effectiveDate: Date;
  private _source: ExchangeRateSource;
  private _createdBy: string | null;
  private _createdAt: Date;

  private constructor(props: ExchangeRatePersistenceProps) {
    this._id = props.id;
    this._fromCurrency = props.fromCurrency.toUpperCase();
    this._toCurrency = props.toCurrency.toUpperCase();
    this._rate = props.rate;
    this._effectiveDate = props.effectiveDate;
    this._source = props.source ?? 'manual';
    this._createdBy = props.createdBy ?? null;
    this._createdAt = props.createdAt;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get fromCurrency(): string {
    return this._fromCurrency;
  }

  get toCurrency(): string {
    return this._toCurrency;
  }

  get rate(): number {
    return this._rate;
  }

  get effectiveDate(): Date {
    return this._effectiveDate;
  }

  get source(): ExchangeRateSource {
    return this._source;
  }

  get createdBy(): string | null {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Create a new exchange rate
   */
  static create(props: ExchangeRateProps): ExchangeRate {
    // Validate currencies
    if (!/^[A-Z]{3}$/.test(props.fromCurrency.toUpperCase())) {
      throw new Error('From currency must be a valid 3-letter ISO 4217 code');
    }

    if (!/^[A-Z]{3}$/.test(props.toCurrency.toUpperCase())) {
      throw new Error('To currency must be a valid 3-letter ISO 4217 code');
    }

    if (props.fromCurrency.toUpperCase() === props.toCurrency.toUpperCase()) {
      throw new Error('From and To currencies must be different');
    }

    // Validate rate
    if (props.rate <= 0) {
      throw new Error('Exchange rate must be greater than zero');
    }

    const now = new Date();
    return new ExchangeRate({
      id: props.id || `er-${nanoid(12)}`,
      fromCurrency: props.fromCurrency,
      toCurrency: props.toCurrency,
      rate: props.rate,
      effectiveDate: props.effectiveDate,
      source: props.source ?? 'manual',
      createdBy: props.createdBy,
      createdAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: ExchangeRatePersistenceProps): ExchangeRate {
    return new ExchangeRate(props);
  }

  /**
   * Convert an amount from the source currency to the target currency
   */
  convert(amount: number): number {
    return amount * this._rate;
  }

  /**
   * Get the inverse rate (for reverse conversion)
   */
  getInverseRate(): number {
    return 1 / this._rate;
  }

  /**
   * Convert an amount in the reverse direction (target to source)
   */
  reverseConvert(amount: number): number {
    return amount / this._rate;
  }

  /**
   * Check if this rate applies to a specific date
   */
  isEffectiveOn(date: Date): boolean {
    const effectiveDateStr = this._effectiveDate.toISOString().split('T')[0];
    const dateStr = date.toISOString().split('T')[0];
    return effectiveDateStr === dateStr;
  }

  /**
   * Check if this rate is for the same currency pair
   */
  isSamePair(fromCurrency: string, toCurrency: string): boolean {
    return (
      this._fromCurrency === fromCurrency.toUpperCase() &&
      this._toCurrency === toCurrency.toUpperCase()
    );
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      fromCurrency: this._fromCurrency,
      toCurrency: this._toCurrency,
      rate: this._rate,
      effectiveDate: this._effectiveDate.toISOString().split('T')[0],
      source: this._source,
      createdBy: this._createdBy,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
