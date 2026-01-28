import { ExchangeRate } from '../entities/exchange-rate.entity';
import type {
  ICurrencyRepository,
  IExchangeRateRepository,
} from '../repositories/currency.repository';

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
 * External exchange rate fetch result
 */
export interface ExternalRateResult {
  rate: number;
  source: string;
  effectiveDate: Date;
}

/**
 * Exchange rate provider interface
 */
export interface IExchangeRateProvider {
  fetchRate(): Promise<ExternalRateResult>;
  getName(): string;
}

/**
 * Exchange Rate API provider (free, no API key required)
 * Reference: https://www.exchangerate-api.com/docs/free
 * Updates: Daily
 */
export class ExchangeRateApiProvider implements IExchangeRateProvider {
  private readonly baseUrl = 'https://open.er-api.com/v6/latest/USD';

  getName(): string {
    return 'exchangerate-api';
  }

  async fetchRate(): Promise<ExternalRateResult> {
    const response = await fetch(this.baseUrl);

    if (!response.ok) {
      throw new Error(`Exchange Rate API request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      result: string;
      time_last_update_utc: string;
      rates: Record<string, number>;
    };

    if (data.result !== 'success') {
      throw new Error('Exchange Rate API returned error');
    }

    const rate = data.rates.IDR;
    if (!rate) {
      throw new Error('IDR rate not found in response');
    }

    return {
      rate,
      source: 'api', // Maps to ExchangeRateSource
      effectiveDate: new Date(data.time_last_update_utc),
    };
  }
}

/**
 * Frankfurter API provider (free, no API key, no rate limits)
 * Uses ECB (European Central Bank) rates
 * Reference: https://frankfurter.dev/
 * Updates: Daily around 16:00 CET
 */
export class FrankfurterRateProvider implements IExchangeRateProvider {
  private readonly baseUrl = 'https://api.frankfurter.dev/v1/latest';

  getName(): string {
    return 'frankfurter';
  }

  async fetchRate(): Promise<ExternalRateResult> {
    const response = await fetch(`${this.baseUrl}?base=USD&symbols=IDR`);

    if (!response.ok) {
      throw new Error(`Frankfurter API request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      date: string;
      base: string;
      rates: Record<string, number>;
    };

    const rate = data.rates.IDR;
    if (!rate) {
      throw new Error('IDR rate not found in Frankfurter response');
    }

    return {
      rate,
      source: 'bank', // ECB is a central bank source
      effectiveDate: new Date(data.date),
    };
  }
}

/**
 * GitHub Exchange API provider (free, no rate limits, 200+ currencies)
 * Reference: https://github.com/fawazahmed0/exchange-api
 * Updates: Daily
 */
export class GithubExchangeApiProvider implements IExchangeRateProvider {
  private readonly baseUrl =
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

  getName(): string {
    return 'github-exchange';
  }

  async fetchRate(): Promise<ExternalRateResult> {
    const response = await fetch(this.baseUrl);

    if (!response.ok) {
      throw new Error(`GitHub Exchange API request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      date: string;
      usd: Record<string, number>;
    };

    const rate = data.usd.idr;
    if (!rate) {
      throw new Error('IDR rate not found in GitHub Exchange response');
    }

    return {
      rate,
      source: 'api',
      effectiveDate: new Date(data.date),
    };
  }
}

/**
 * Exchange Rate Service (USD/IDR)
 * Handles currency conversion between USD and IDR
 * Supports automatic rate fetching from multiple free APIs
 */
export class ExchangeRateService {
  private providers: IExchangeRateProvider[] = [];

  constructor(
    private readonly exchangeRateRepository: IExchangeRateRepository,
    private readonly currencyRepository: ICurrencyRepository
  ) {
    // Default providers with fallback chain
    // 1. ExchangeRate-API (primary - most reliable for IDR)
    // 2. GitHub Exchange API (backup - no rate limits)
    // 3. Frankfurter (fallback - ECB rates)
    this.providers = [
      new ExchangeRateApiProvider(),
      new GithubExchangeApiProvider(),
      new FrankfurterRateProvider(),
    ];
  }

  /**
   * Set custom rate providers (for testing or different sources)
   */
  setProviders(providers: IExchangeRateProvider[]): void {
    this.providers = providers;
  }

  /**
   * Fetch latest rate from external providers and save to database
   * Tries providers in order, falls back on failure
   */
  async fetchAndSaveLatestRate(createdBy = 'system'): Promise<ExchangeRate> {
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const result = await provider.fetchRate();

        // Save to database
        const exchangeRate = ExchangeRate.create({
          fromCurrency: 'USD',
          toCurrency: 'IDR',
          rate: result.rate,
          effectiveDate: result.effectiveDate,
          source: result.source as 'manual' | 'api' | 'bank',
          createdBy,
        });

        await this.exchangeRateRepository.save(exchangeRate);

        return exchangeRate;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        // Continue to next provider
      }
    }

    throw new Error(`All exchange rate providers failed. Last error: ${lastError?.message}`);
  }

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
   * Get rate with auto-fetch if stale (older than maxAgeHours)
   * Useful for ensuring fresh rates in production
   */
  async getRateWithAutoFetch(date: Date, maxAgeHours = 24): Promise<ExchangeRate> {
    const rate = await this.getRate(date);

    if (rate) {
      const ageMs = Date.now() - rate.effectiveDate.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      if (ageHours < maxAgeHours) {
        return rate;
      }
    }

    // Rate is stale or doesn't exist, fetch new one
    return this.fetchAndSaveLatestRate();
  }

  /**
   * Convert USD to IDR
   */
  async convertUsdToIdr(amount: number, date: Date): Promise<ConversionResult> {
    const rate = await this.getRate(date);

    if (!rate) {
      throw new Error('No USD/IDR exchange rate found. Please fetch rates first.');
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
      throw new Error('No USD/IDR exchange rate found. Please fetch rates first.');
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
   * Manually set USD/IDR exchange rate
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
  async getHistory(limit = 30): Promise<ExchangeRate[]> {
    return this.exchangeRateRepository.findHistory(limit);
  }

  /**
   * Get latest exchange rate
   */
  async getLatestRate(): Promise<ExchangeRate | null> {
    return this.exchangeRateRepository.findLatest();
  }
}
