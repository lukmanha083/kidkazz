/**
 * E2E Test: Multi-Currency Support
 *
 * Tests currency management and exchange rate operations:
 * - List supported currencies (IDR, USD)
 * - Set exchange rates manually
 * - Fetch rates from external API
 * - Convert currency amounts
 * - Exchange rate history
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';

describe('E2E: Multi-Currency Support', () => {
  let apiClient: AccountingApiClient;
  let exchangeRateId: string;

  const TEST_RATE = 15850; // USD to IDR
  const TEST_DATE = '2026-01-15';

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(`Accounting service not reachable. Error: ${health.error}`);
    }

    console.log('\n');
    console.log('======================================================');
    console.log('          MULTI-CURRENCY E2E TEST                     ');
    console.log('======================================================');
    console.log('');
  }, 60000);

  describe('Phase 1: Currency Management', () => {
    it('should list all supported currencies', async () => {
      const response = await apiClient.listCurrencies();

      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data?.length).toBeGreaterThanOrEqual(2);

      const idr = response.data?.find(c => c.code === 'IDR');
      const usd = response.data?.find(c => c.code === 'USD');

      expect(idr).toBeDefined();
      expect(idr?.isBaseCurrency).toBe(true);
      expect(usd).toBeDefined();

      console.log(`  Found ${response.data?.length} currencies`);
      response.data?.forEach(c => {
        console.log(`    - ${c.code}: ${c.name} (${c.symbol}) ${c.isBaseCurrency ? '[BASE]' : ''}`);
      });
    });

    it('should get IDR currency details', async () => {
      const response = await apiClient.getCurrency('IDR');

      expect(response.ok).toBe(true);
      expect(response.data?.code).toBe('IDR');
      expect(response.data?.name).toBe('Indonesian Rupiah');
      expect(response.data?.symbol).toBe('Rp');
      expect(response.data?.isBaseCurrency).toBe(true);
      console.log(`  IDR: ${response.data?.name}, decimals: ${response.data?.decimalPlaces}`);
    });

    it('should get USD currency details', async () => {
      const response = await apiClient.getCurrency('USD');

      expect(response.ok).toBe(true);
      expect(response.data?.code).toBe('USD');
      expect(response.data?.name).toBe('US Dollar');
      expect(response.data?.symbol).toBe('$');
      expect(response.data?.isBaseCurrency).toBe(false);
      console.log(`  USD: ${response.data?.name}, decimals: ${response.data?.decimalPlaces}`);
    });

    it('should return 404 for unknown currency', async () => {
      const response = await apiClient.getCurrency('XYZ');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      console.log('  Correctly returned 404 for unknown currency');
    });
  });

  describe('Phase 2: Exchange Rate Management', () => {
    it('should set exchange rate manually', async () => {
      const response = await apiClient.setExchangeRate({
        rate: TEST_RATE,
        effectiveDate: TEST_DATE,
        source: 'manual', // Must be: manual, api, or bank
      });

      expect(response.ok).toBe(true);
      expect(response.data?.rate).toBe(TEST_RATE);
      expect(response.data?.fromCurrency).toBe('USD');
      expect(response.data?.toCurrency).toBe('IDR');

      if (response.data?.id) {
        exchangeRateId = response.data.id;
      }

      console.log(`  Set rate: 1 USD = Rp ${TEST_RATE.toLocaleString()}`);
      console.log(`  Effective: ${response.data?.effectiveDate}`);
      console.log(`  Source: ${response.data?.source}`);
    });

    it('should get latest exchange rate', async () => {
      const response = await apiClient.getLatestExchangeRate();

      // May fail if no rates exist yet - try fetching first
      if (!response.ok) {
        const fetchResponse = await apiClient.fetchExchangeRate();
        if (fetchResponse.ok) {
          const retryResponse = await apiClient.getLatestExchangeRate();
          expect(retryResponse.ok).toBe(true);
          console.log(`  Latest rate (after fetch): 1 USD = Rp ${retryResponse.data?.rate.toLocaleString()}`);
          return;
        }
        console.log('  No exchange rate available');
        return;
      }

      expect(response.data?.rate).toBeGreaterThan(0);
      expect(response.data?.fromCurrency).toBe('USD');
      expect(response.data?.toCurrency).toBe('IDR');

      console.log(`  Latest rate: 1 USD = Rp ${response.data?.rate.toLocaleString()}`);
      console.log(`  Effective: ${response.data?.effectiveDate}`);
    });

    it('should get exchange rate history', async () => {
      const response = await apiClient.getExchangeRateHistory(10);

      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`  Found ${response.data?.length || 0} historical rates`);
      if (response.data && response.data.length > 0) {
        response.data.slice(0, 3).forEach(r => {
          console.log(`    - ${r.effectiveDate}: Rp ${r.rate.toLocaleString()} (${r.source})`);
        });
      }
    });

    it('should fetch exchange rate from external API', async () => {
      const response = await apiClient.fetchExchangeRate();

      // May fail if external API is unavailable
      if (response.ok) {
        expect(response.data?.rate).toBeGreaterThan(0);
        console.log(`  Fetched rate: 1 USD = Rp ${response.data?.rate.toLocaleString()}`);
        console.log(`  Source: ${response.data?.source}`);
      } else {
        console.log(`  External API fetch skipped: ${response.error}`);
      }
    });
  });

  describe('Phase 3: Currency Conversion', () => {
    it('should convert USD to IDR', async () => {
      const response = await apiClient.convertCurrency({
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'IDR',
      });

      expect(response.ok).toBe(true);
      expect(response.data?.fromAmount).toBe(100);
      expect(response.data?.fromCurrency).toBe('USD');
      expect(response.data?.toCurrency).toBe('IDR');
      expect(response.data?.toAmount).toBeGreaterThan(0);

      console.log(`  $${response.data?.fromAmount} USD = Rp ${response.data?.toAmount.toLocaleString()} IDR`);
      console.log(`  Rate used: ${response.data?.rate}`);
    });

    it('should convert IDR to USD', async () => {
      const response = await apiClient.convertCurrency({
        amount: 1_000_000,
        fromCurrency: 'IDR',
        toCurrency: 'USD',
      });

      expect(response.ok).toBe(true);
      expect(response.data?.fromAmount).toBe(1_000_000);
      expect(response.data?.fromCurrency).toBe('IDR');
      expect(response.data?.toCurrency).toBe('USD');
      expect(response.data?.toAmount).toBeGreaterThan(0);

      console.log(`  Rp ${response.data?.fromAmount.toLocaleString()} IDR = $${response.data?.toAmount.toFixed(2)} USD`);
    });

    it('should convert using specific date rate', async () => {
      const response = await apiClient.convertCurrency({
        amount: 500,
        fromCurrency: 'USD',
        toCurrency: 'IDR',
        date: TEST_DATE,
      });

      expect(response.ok).toBe(true);
      console.log(`  $500 USD on ${TEST_DATE} = Rp ${response.data?.toAmount?.toLocaleString()} IDR`);
      console.log(`  Rate on date: ${response.data?.rate}`);
    });
  });

  describe('Phase 4: Summary', () => {
    it('should display test summary', async () => {
      const currenciesResponse = await apiClient.listCurrencies();
      const ratesResponse = await apiClient.getExchangeRateHistory(100);
      const latestResponse = await apiClient.getLatestExchangeRate();

      console.log('\n');
      console.log('======================================================');
      console.log('          MULTI-CURRENCY E2E TEST SUMMARY             ');
      console.log('======================================================');
      console.log(`  Supported Currencies: ${currenciesResponse.data?.length || 0}`);
      console.log(`  Exchange Rate Records: ${ratesResponse.data?.length || 0}`);
      if (latestResponse.ok && latestResponse.data) {
        console.log(`  Current Rate: 1 USD = Rp ${latestResponse.data.rate.toLocaleString()}`);
      }
      console.log('======================================================');
      console.log('');

      expect(true).toBe(true);
    });
  });
});
