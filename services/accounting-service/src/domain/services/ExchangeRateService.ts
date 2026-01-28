import { ExchangeRate } from '../entities/exchange-rate.entity';
import type { IExchangeRateRepository, ICurrencyRepository } from '../repositories/currency.repository';

/**
 * Currency conversion result (USD to IDR or IDR to USD)
 */
export interface ConversionResult {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
}

/**
 * Exchange Rate Service (USD/IDR only)
 * Handles currency conversion between USD and IDR
 */
export class ExchangeRateService {
  constructor(
    private readonly exchangeRateRepository: IExchangeRateRepository,
    private readonly currencyRepository: ICurrencyRepository
  ) {}

  /**
   * Get the USD/IDR exchange rate for a specific date
   * Falls back to the most recent rate if no rate exists for the exact date
   */
  async getRate(date: Date): Promise<ExchangeRate | null> {
    // Try to find exact date rate
    let rate = await this.exchangeRateRepository.findByDate(date);

    // If not found, fall back to latest rate
    if (!rate) {
      rate = await this.exchangeRateRepository.findLatest();
    }

    return rate;
  }

  /**
   * Convert USD to IDR
   */
  async convertUsdToIdr(amount: number, date: Date): Promise<ConversionResult> {
    const rate = await this.getRate(date);

    if (!rate) {
      throw new Error('No USD/IDR exchange rate found');
    }

    return {
      fromAmount: amount,
      fromCurrency: 'USD',
      toAmount: amount * rate.rate,
      toCurrency: 'IDR',
      rate: rate.rate,
      effectiveDate: rate.effectiveDate,
    };
  }

  /**
   * Convert IDR to USD
   */
  async convertIdrToUsd(amount: number, date: Date): Promise<ConversionResult> {
    const rate = await this.getRate(date);

    if (!rate) {
      throw new Error('No USD/IDR exchange rate found');
    }

    return {
      fromAmount: amount,
      fromCurrency: 'IDR',
      toAmount: amount / rate.rate,
      toCurrency: 'USD',
      rate: 1 / rate.rate,
      effectiveDate: rate.effectiveDate,
    };
  }

  /**
   * Convert between currencies (auto-detects direction)
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<ConversionResult> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // Same currency
    if (from === to) {
      return {
        fromAmount: amount,
        fromCurrency: from,
        toAmount: amount,
        toCurrency: to,
        rate: 1,
        effectiveDate: date,
      };
    }

    if (from === 'USD' && to === 'IDR') {
      return this.convertUsdToIdr(amount, date);
    }

    if (from === 'IDR' && to === 'USD') {
      return this.convertIdrToUsd(amount, date);
    }

    throw new Error(`Unsupported currency conversion: ${from} to ${to}. Only USD/IDR supported.`);
  }

  /**
   * Set USD/IDR exchange rate
   */
  async setRate(
    rate: number,
    effectiveDate: Date,
    source: 'manual' | 'api' | 'bank' = 'manual',
    createdBy?: string
  ): Promise<ExchangeRate> {
    if (rate <= 0) {
      throw new Error('Exchange rate must be greater than zero');
    }

    const exchangeRate = ExchangeRate.create({
      fromCurrency: 'USD',
      toCurrency: 'IDR',
      rate,
      effectiveDate,
      source,
      createdBy,
    });

    await this.exchangeRateRepository.save(exchangeRate);

    return exchangeRate;
  }

  /**
   * Get exchange rate history
   */
  async getHistory(limit: number = 30): Promise<ExchangeRate[]> {
    return this.exchangeRateRepository.findHistory(limit);
  }

  /**
   * Get latest exchange rate
   */
  async getLatestRate(): Promise<ExchangeRate | null> {
    return this.exchangeRateRepository.findLatest();
  }
}
