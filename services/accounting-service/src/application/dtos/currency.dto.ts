import type { Currency } from '@/domain/entities/currency.entity';
import type { ExchangeRate } from '@/domain/entities/exchange-rate.entity';
import { z } from 'zod';

/**
 * Schema for setting exchange rate
 */
export const setExchangeRateSchema = z.object({
  rate: z.number().positive('Exchange rate must be positive'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  source: z.enum(['manual', 'api', 'bank']).optional().default('manual'),
});

export type SetExchangeRateRequest = z.infer<typeof setExchangeRateSchema>;

/**
 * Schema for currency conversion
 */
export const convertCurrencySchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  fromCurrency: z.enum(['USD', 'IDR']),
  toCurrency: z.enum(['USD', 'IDR']),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
});

export type ConvertCurrencyRequest = z.infer<typeof convertCurrencySchema>;

/**
 * Query schema for exchange rate history
 */
export const exchangeRateHistoryQuerySchema = z.object({
  limit: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().min(1).max(100))
    .optional(),
});

export type ExchangeRateHistoryQuery = z.infer<typeof exchangeRateHistoryQuerySchema>;

/**
 * Currency response DTO
 */
export interface CurrencyResponse {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isBaseCurrency: boolean;
}

/**
 * Exchange rate response DTO
 */
export interface ExchangeRateResponse {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  source: string | null;
  createdAt: string;
}

/**
 * Conversion result response DTO
 */
export interface ConversionResultResponse {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
}

/**
 * Transform Currency to response DTO
 */
export function toCurrencyResponse(currency: Currency): CurrencyResponse {
  return {
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    decimalPlaces: currency.decimalPlaces,
    isActive: currency.isActive,
    isBaseCurrency: currency.isBaseCurrency,
  };
}

/**
 * Transform ExchangeRate to response DTO
 */
export function toExchangeRateResponse(rate: ExchangeRate): ExchangeRateResponse {
  return {
    id: rate.id,
    fromCurrency: rate.fromCurrency,
    toCurrency: rate.toCurrency,
    rate: rate.rate,
    effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
    source: rate.source,
    createdAt: rate.createdAt.toISOString(),
  };
}
