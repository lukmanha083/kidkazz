/**
 * Currency creation properties
 */
export interface CurrencyProps {
  code: string; // ISO 4217 code (e.g., USD, IDR, SGD)
  name: string;
  symbol: string;
  decimalPlaces?: number;
  isActive?: boolean;
  isBaseCurrency?: boolean;
}

/**
 * Currency persistence properties
 */
export interface CurrencyPersistenceProps extends CurrencyProps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Currency Entity
 * Represents a supported currency in the accounting system
 */
export class Currency {
  private _code: string;
  private _name: string;
  private _symbol: string;
  private _decimalPlaces: number;
  private _isActive: boolean;
  private _isBaseCurrency: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: CurrencyPersistenceProps) {
    this._code = props.code.toUpperCase();
    this._name = props.name;
    this._symbol = props.symbol;
    this._decimalPlaces = props.decimalPlaces ?? 2;
    this._isActive = props.isActive ?? true;
    this._isBaseCurrency = props.isBaseCurrency ?? false;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  get code(): string {
    return this._code;
  }

  get name(): string {
    return this._name;
  }

  get symbol(): string {
    return this._symbol;
  }

  get decimalPlaces(): number {
    return this._decimalPlaces;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isBaseCurrency(): boolean {
    return this._isBaseCurrency;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Create a new currency
   */
  static create(props: CurrencyProps): Currency {
    // Validate ISO 4217 code (3 uppercase letters)
    if (!/^[A-Z]{3}$/.test(props.code.toUpperCase())) {
      throw new Error('Currency code must be a 3-letter ISO 4217 code');
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Currency name is required');
    }

    if (!props.symbol || props.symbol.trim().length === 0) {
      throw new Error('Currency symbol is required');
    }

    const decimalPlaces = props.decimalPlaces ?? 2;
    if (decimalPlaces < 0 || decimalPlaces > 4) {
      throw new Error('Decimal places must be between 0 and 4');
    }

    const now = new Date();
    return new Currency({
      ...props,
      decimalPlaces,
      isActive: props.isActive ?? true,
      isBaseCurrency: props.isBaseCurrency ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: CurrencyPersistenceProps): Currency {
    return new Currency(props);
  }

  /**
   * Update currency details
   */
  update(props: { name?: string; symbol?: string; decimalPlaces?: number }): void {
    if (props.name !== undefined) {
      if (props.name.trim().length === 0) {
        throw new Error('Currency name cannot be empty');
      }
      this._name = props.name;
    }

    if (props.symbol !== undefined) {
      if (props.symbol.trim().length === 0) {
        throw new Error('Currency symbol cannot be empty');
      }
      this._symbol = props.symbol;
    }

    if (props.decimalPlaces !== undefined) {
      if (props.decimalPlaces < 0 || props.decimalPlaces > 4) {
        throw new Error('Decimal places must be between 0 and 4');
      }
      this._decimalPlaces = props.decimalPlaces;
    }

    this._updatedAt = new Date();
  }

  /**
   * Activate the currency
   */
  activate(): void {
    if (this._isActive) {
      throw new Error('Currency is already active');
    }
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /**
   * Deactivate the currency
   */
  deactivate(): void {
    if (!this._isActive) {
      throw new Error('Currency is already inactive');
    }
    if (this._isBaseCurrency) {
      throw new Error('Cannot deactivate base currency');
    }
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /**
   * Set as base currency
   */
  setAsBaseCurrency(): void {
    if (this._isBaseCurrency) {
      throw new Error('Currency is already the base currency');
    }
    this._isBaseCurrency = true;
    this._updatedAt = new Date();
  }

  /**
   * Remove base currency status
   */
  unsetAsBaseCurrency(): void {
    if (!this._isBaseCurrency) {
      throw new Error('Currency is not the base currency');
    }
    this._isBaseCurrency = false;
    this._updatedAt = new Date();
  }

  /**
   * Format an amount in this currency
   */
  format(amount: number): string {
    const formatted = amount.toFixed(this._decimalPlaces);
    return `${this._symbol}${formatted}`;
  }

  /**
   * Round an amount to the currency's decimal places
   */
  round(amount: number): number {
    const multiplier = Math.pow(10, this._decimalPlaces);
    return Math.round(amount * multiplier) / multiplier;
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this._code,
      name: this._name,
      symbol: this._symbol,
      decimalPlaces: this._decimalPlaces,
      isActive: this._isActive,
      isBaseCurrency: this._isBaseCurrency,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
