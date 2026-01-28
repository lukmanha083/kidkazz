import type { Currency } from '../entities/currency.entity';
import type { ExchangeRate } from '../entities/exchange-rate.entity';

/**
 * Currency repository interface (USD/IDR only)
 */
export interface ICurrencyRepository {
  findByCode(code: string): Promise<Currency | null>;
  findAll(): Promise<Currency[]>;
  findBaseCurrency(): Promise<Currency | null>;
  save(currency: Currency): Promise<void>;
}

/**
 * Exchange rate repository interface (USD/IDR)
 */
export interface IExchangeRateRepository {
  findById(id: string): Promise<ExchangeRate | null>;
  findByDate(
    fromCurrency: string,
    toCurrency: string,
    effectiveDate: Date
  ): Promise<ExchangeRate | null>;
  findLatest(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null>;
  findHistory(fromCurrency: string, toCurrency: string, limit?: number): Promise<ExchangeRate[]>;
  save(rate: ExchangeRate): Promise<void>;
  delete(id: string): Promise<void>;
  rateExistsForDate(
    fromCurrency: string,
    toCurrency: string,
    effectiveDate: Date
  ): Promise<boolean>;
}
