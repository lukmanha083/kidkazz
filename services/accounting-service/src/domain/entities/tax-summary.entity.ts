/**
 * Indonesian tax types
 */
export type TaxType = 'PPN' | 'PPH21' | 'PPH23' | 'PPH4_2';

/**
 * Tax type descriptions
 */
export const TAX_TYPE_DESCRIPTIONS: Record<TaxType, string> = {
  PPN: 'Pajak Pertambahan Nilai (VAT) - 11%',
  PPH21: 'Pajak Penghasilan Pasal 21 (Employee Income Tax)',
  PPH23: 'Pajak Penghasilan Pasal 23 (Service Withholding Tax) - 2%',
  PPH4_2: 'Pajak Penghasilan Pasal 4(2) (Final Tax - Rent, etc.)',
};

/**
 * Standard Indonesian tax rates
 */
export const TAX_RATES: Record<TaxType, number> = {
  PPN: 0.11, // 11% VAT
  PPH21: 0, // Variable rate based on income brackets
  PPH23: 0.02, // 2% for services
  PPH4_2: 0.1, // 10% for rent (varies by type)
};

/**
 * Props for creating a new TaxSummary
 */
export interface TaxSummaryProps {
  fiscalYear: number;
  fiscalMonth: number;
  taxType: TaxType;
  grossAmount: number;
  taxAmount: number;
  transactionCount: number;
}

/**
 * Props for persistence/reconstruction
 */
export interface TaxSummaryPersistenceProps {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  taxType: TaxType;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  transactionCount: number;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TaxSummary entity
 * Represents a period tax summary for Indonesian tax compliance
 */
export class TaxSummary {
  private constructor(
    public readonly id: string,
    public readonly fiscalYear: number,
    public readonly fiscalMonth: number,
    public readonly taxType: TaxType,
    private _grossAmount: number,
    private _taxAmount: number,
    private _netAmount: number,
    private _transactionCount: number,
    private _calculatedAt: Date,
    public readonly createdAt: Date,
    private _updatedAt: Date
  ) {}

  /**
   * Create a new tax summary
   */
  static create(props: TaxSummaryProps): TaxSummary {
    const now = new Date();
    const netAmount = props.grossAmount - props.taxAmount;

    return new TaxSummary(
      crypto.randomUUID(),
      props.fiscalYear,
      props.fiscalMonth,
      props.taxType,
      props.grossAmount,
      props.taxAmount,
      netAmount,
      props.transactionCount,
      now,
      now,
      now
    );
  }

  /**
   * Reconstruct from persistence
   */
  static fromPersistence(props: TaxSummaryPersistenceProps): TaxSummary {
    return new TaxSummary(
      props.id,
      props.fiscalYear,
      props.fiscalMonth,
      props.taxType,
      props.grossAmount,
      props.taxAmount,
      props.netAmount,
      props.transactionCount,
      props.calculatedAt,
      props.createdAt,
      props.updatedAt
    );
  }

  // Getters
  get grossAmount(): number {
    return this._grossAmount;
  }

  get taxAmount(): number {
    return this._taxAmount;
  }

  get netAmount(): number {
    return this._netAmount;
  }

  get transactionCount(): number {
    return this._transactionCount;
  }

  get calculatedAt(): Date {
    return this._calculatedAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Get tax type description
   */
  get taxTypeDescription(): string {
    return TAX_TYPE_DESCRIPTIONS[this.taxType];
  }

  /**
   * Get standard tax rate for this type
   */
  get standardRate(): number {
    return TAX_RATES[this.taxType];
  }

  /**
   * Get the effective tax rate based on calculated amounts
   */
  get effectiveRate(): number {
    if (this._grossAmount === 0) return 0;
    return this._taxAmount / this._grossAmount;
  }

  /**
   * Get period string (YYYY-MM)
   */
  get periodString(): string {
    return `${this.fiscalYear}-${String(this.fiscalMonth).padStart(2, '0')}`;
  }

  /**
   * Update the summary with recalculated values
   */
  recalculate(grossAmount: number, taxAmount: number, transactionCount: number): void {
    this._grossAmount = grossAmount;
    this._taxAmount = taxAmount;
    this._netAmount = grossAmount - taxAmount;
    this._transactionCount = transactionCount;
    this._calculatedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Add transaction amounts to the summary
   */
  addTransaction(grossAmount: number, taxAmount: number): void {
    this._grossAmount += grossAmount;
    this._taxAmount += taxAmount;
    this._netAmount = this._grossAmount - this._taxAmount;
    this._transactionCount += 1;
    this._calculatedAt = new Date();
    this._updatedAt = new Date();
  }
}
