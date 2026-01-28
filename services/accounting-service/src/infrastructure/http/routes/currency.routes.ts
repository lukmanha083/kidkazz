import {
  convertCurrencySchema,
  exchangeRateHistoryQuerySchema,
  setExchangeRateSchema,
  toCurrencyResponse,
  toExchangeRateResponse,
} from '@/application/dtos/currency.dto';
import { ExchangeRateService } from '@/domain/services/ExchangeRateService';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import type * as schema from '../../db/schema';
import {
  DrizzleCurrencyRepository,
  DrizzleExchangeRateRepository,
} from '../../repositories/currency.repository';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const currencyRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /currencies/exchange-rates - Get exchange rate history
 * NOTE: Must be defined before /:code to avoid route matching conflict
 */
currencyRoutes.get(
  '/exchange-rates',
  zValidator('query', exchangeRateHistoryQuerySchema),
  async (c) => {
    const db = c.get('db');
    const query = c.req.valid('query');

    const currencyRepository = new DrizzleCurrencyRepository(db);
    const exchangeRateRepository = new DrizzleExchangeRateRepository(db);
    const service = new ExchangeRateService(exchangeRateRepository, currencyRepository);

    const rates = await service.getHistory(query.limit || 30);

    return c.json({
      success: true,
      data: rates.map(toExchangeRateResponse),
    });
  }
);

/**
 * GET /currencies/exchange-rates/latest - Get latest exchange rate
 * NOTE: Must be defined before /:code to avoid route matching conflict
 */
currencyRoutes.get('/exchange-rates/latest', async (c) => {
  const db = c.get('db');

  const currencyRepository = new DrizzleCurrencyRepository(db);
  const exchangeRateRepository = new DrizzleExchangeRateRepository(db);
  const service = new ExchangeRateService(exchangeRateRepository, currencyRepository);

  const rate = await service.getLatestRate();

  if (!rate) {
    return c.json({ success: false, error: 'No exchange rate found' }, 404);
  }

  return c.json({
    success: true,
    data: toExchangeRateResponse(rate),
  });
});

/**
 * POST /currencies/exchange-rates/fetch - Fetch latest rate from JISDOR/external API
 * NOTE: Must be defined before /:code to avoid route matching conflict
 */
currencyRoutes.post('/exchange-rates/fetch', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');

  const currencyRepository = new DrizzleCurrencyRepository(db);
  const exchangeRateRepository = new DrizzleExchangeRateRepository(db);
  const service = new ExchangeRateService(exchangeRateRepository, currencyRepository);

  try {
    const rate = await service.fetchAndSaveLatestRate(userId);

    return c.json(
      {
        success: true,
        data: toExchangeRateResponse(rate),
        message: `Exchange rate fetched from ${rate.source}`,
      },
      201
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rate',
      },
      500
    );
  }
});

/**
 * POST /currencies/exchange-rates - Set exchange rate manually
 * NOTE: Must be defined before /:code to avoid route matching conflict
 */
currencyRoutes.post('/exchange-rates', zValidator('json', setExchangeRateSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const currencyRepository = new DrizzleCurrencyRepository(db);
  const exchangeRateRepository = new DrizzleExchangeRateRepository(db);
  const service = new ExchangeRateService(exchangeRateRepository, currencyRepository);

  const rate = await service.setRate(body.rate, new Date(body.effectiveDate), body.source, userId);

  return c.json(
    {
      success: true,
      data: toExchangeRateResponse(rate),
    },
    201
  );
});

/**
 * POST /currencies/exchange-rates/convert - Convert currency
 * NOTE: Must be defined before /:code to avoid route matching conflict
 */
currencyRoutes.post(
  '/exchange-rates/convert',
  zValidator('json', convertCurrencySchema),
  async (c) => {
    const db = c.get('db');
    const body = c.req.valid('json');

    const currencyRepository = new DrizzleCurrencyRepository(db);
    const exchangeRateRepository = new DrizzleExchangeRateRepository(db);
    const service = new ExchangeRateService(exchangeRateRepository, currencyRepository);

    const date = body.date ? new Date(body.date) : new Date();
    const result = await service.convert(body.amount, body.fromCurrency, body.toCurrency, date);

    return c.json({
      success: true,
      data: {
        fromAmount: result.fromAmount,
        fromCurrency: result.fromCurrency,
        toAmount: result.toAmount,
        toCurrency: result.toCurrency,
        rate: result.rate,
        effectiveDate: result.effectiveDate.toISOString().split('T')[0],
      },
    });
  }
);

/**
 * GET /currencies - List all currencies (USD and IDR)
 */
currencyRoutes.get('/', async (c) => {
  const db = c.get('db');
  const repository = new DrizzleCurrencyRepository(db);
  const currencies = await repository.findAll();

  return c.json({
    success: true,
    data: currencies.map(toCurrencyResponse),
  });
});

/**
 * GET /currencies/:code - Get a specific currency
 */
currencyRoutes.get('/:code', async (c) => {
  const db = c.get('db');
  const code = c.req.param('code');
  const repository = new DrizzleCurrencyRepository(db);
  const currency = await repository.findByCode(code);

  if (!currency) {
    return c.json({ success: false, error: 'Currency not found' }, 404);
  }

  return c.json({
    success: true,
    data: toCurrencyResponse(currency),
  });
});

export { currencyRoutes };
