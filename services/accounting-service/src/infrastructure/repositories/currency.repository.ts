import { Currency } from '@/domain/entities/currency.entity';
import { ExchangeRate, type ExchangeRateSource } from '@/domain/entities/exchange-rate.entity';
import type {
  ICurrencyRepository,
  IExchangeRateRepository,
} from '@/domain/repositories/currency.repository';
import { and, desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '../db/schema';
import { currencies, exchangeRates } from '../db/schema';

type DrizzleDB = DrizzleD1Database<typeof schema>;

/**
 * Drizzle implementation of ICurrencyRepository
 */
export class DrizzleCurrencyRepository implements ICurrencyRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByCode(code: string): Promise<Currency | null> {
    const results = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.code, code.toUpperCase()))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findAll(): Promise<Currency[]> {
    const results = await this.db.select().from(currencies);
    return results.map(this.toDomain);
  }

  async findBaseCurrency(): Promise<Currency | null> {
    const results = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.isBaseCurrency, true))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async save(currency: Currency): Promise<void> {
    const data = {
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
      isActive: currency.isActive,
      isBaseCurrency: currency.isBaseCurrency,
      createdAt: currency.createdAt.toISOString(),
      updatedAt: currency.updatedAt.toISOString(),
    };

    await this.db
      .insert(currencies)
      .values(data)
      .onConflictDoUpdate({
        target: currencies.code,
        set: {
          name: data.name,
          symbol: data.symbol,
          decimalPlaces: data.decimalPlaces,
          isActive: data.isActive,
          isBaseCurrency: data.isBaseCurrency,
          updatedAt: data.updatedAt,
        },
      });
  }

  private toDomain(record: schema.CurrencyRecord): Currency {
    return Currency.fromPersistence({
      code: record.code,
      name: record.name,
      symbol: record.symbol,
      decimalPlaces: record.decimalPlaces,
      isActive: record.isActive,
      isBaseCurrency: record.isBaseCurrency,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }
}

/**
 * Drizzle implementation of IExchangeRateRepository (USD/IDR only)
 */
export class DrizzleExchangeRateRepository implements IExchangeRateRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<ExchangeRate | null> {
    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.id, id))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findByDate(
    fromCurrency: string,
    toCurrency: string,
    effectiveDate: Date
  ): Promise<ExchangeRate | null> {
    const dateStr = effectiveDate.toISOString().split('T')[0];
    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency.toUpperCase()),
          eq(exchangeRates.toCurrency, toCurrency.toUpperCase()),
          eq(exchangeRates.effectiveDate, dateStr)
        )
      )
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findLatest(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency.toUpperCase()),
          eq(exchangeRates.toCurrency, toCurrency.toUpperCase())
        )
      )
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findHistory(fromCurrency: string, toCurrency: string, limit = 30): Promise<ExchangeRate[]> {
    const results = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency.toUpperCase()),
          eq(exchangeRates.toCurrency, toCurrency.toUpperCase())
        )
      )
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(limit);

    return results.map(this.toDomain);
  }

  async save(rate: ExchangeRate): Promise<void> {
    const data = {
      id: rate.id,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: rate.rate,
      effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
      source: rate.source,
      createdBy: rate.createdBy,
      createdAt: rate.createdAt.toISOString(),
    };

    await this.db
      .insert(exchangeRates)
      .values(data)
      .onConflictDoUpdate({
        target: [exchangeRates.fromCurrency, exchangeRates.toCurrency, exchangeRates.effectiveDate],
        set: {
          rate: data.rate,
          source: data.source,
          createdBy: data.createdBy,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(exchangeRates).where(eq(exchangeRates.id, id));
  }

  async rateExistsForDate(
    fromCurrency: string,
    toCurrency: string,
    effectiveDate: Date
  ): Promise<boolean> {
    const dateStr = effectiveDate.toISOString().split('T')[0];
    const results = await this.db
      .select({ id: exchangeRates.id })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency.toUpperCase()),
          eq(exchangeRates.toCurrency, toCurrency.toUpperCase()),
          eq(exchangeRates.effectiveDate, dateStr)
        )
      )
      .limit(1);

    return results.length > 0;
  }

  private toDomain(record: schema.ExchangeRateRecord): ExchangeRate {
    return ExchangeRate.fromPersistence({
      id: record.id,
      fromCurrency: record.fromCurrency,
      toCurrency: record.toCurrency,
      rate: record.rate,
      effectiveDate: new Date(record.effectiveDate),
      source: record.source as ExchangeRateSource | undefined,
      createdBy: record.createdBy || undefined,
      createdAt: new Date(record.createdAt),
    });
  }
}
