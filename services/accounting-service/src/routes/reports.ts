import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { journalLines, chartOfAccounts } from '../infrastructure/db/schema';
import { sql } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/reports/sales-by-warehouse
 * Track sales performance by warehouse location
 */
app.get('/sales-by-warehouse', async (c) => {
  const db = drizzle(c.env.DB);
  const { startDate, endDate } = c.req.query();

  try {
    let query = `
      SELECT
        warehouse_id,
        SUM(amount) as total_sales,
        COUNT(DISTINCT journal_entry_id) as transaction_count,
        AVG(amount) as avg_transaction_value
      FROM journal_lines
      WHERE account_id IN ('acc-4010', 'acc-4020', 'acc-4030')
        AND direction = 'Credit'
        AND warehouse_id IS NOT NULL
    `;

    const params: any[] = [];

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(new Date(startDate).getTime() / 1000);
    }

    if (endDate) {
      query += ` AND created_at < ?`;
      params.push(new Date(endDate).getTime() / 1000);
    }

    query += ` GROUP BY warehouse_id ORDER BY total_sales DESC`;

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      data: result.results || [],
      summary: {
        totalWarehouses: result.results?.length || 0,
        totalSales: result.results?.reduce((sum: number, row: any) => sum + (row.total_sales || 0), 0) || 0,
        totalTransactions: result.results?.reduce((sum: number, row: any) => sum + (row.transaction_count || 0), 0) || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales by warehouse:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/reports/sales-by-person
 * Commission report showing sales by sales person
 */
app.get('/sales-by-person', async (c) => {
  const db = drizzle(c.env.DB);
  const { startDate, endDate } = c.req.query();

  try {
    let query = `
      SELECT
        sales_person_id,
        sales_channel,
        SUM(amount) as total_sales,
        COUNT(DISTINCT journal_entry_id) as transaction_count,
        AVG(amount) as avg_transaction_value
      FROM journal_lines
      WHERE account_id IN ('acc-4010', 'acc-4020', 'acc-4030')
        AND direction = 'Credit'
        AND sales_person_id IS NOT NULL
    `;

    const params: any[] = [];

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(new Date(startDate).getTime() / 1000);
    }

    if (endDate) {
      query += ` AND created_at < ?`;
      params.push(new Date(endDate).getTime() / 1000);
    }

    query += ` GROUP BY sales_person_id, sales_channel ORDER BY total_sales DESC`;

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      data: result.results || [],
      summary: {
        totalSalesPeople: new Set(result.results?.map((r: any) => r.sales_person_id)).size || 0,
        totalSales: result.results?.reduce((sum: number, row: any) => sum + (row.total_sales || 0), 0) || 0,
        totalTransactions: result.results?.reduce((sum: number, row: any) => sum + (row.transaction_count || 0), 0) || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales by person:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/reports/sales-by-channel
 * Track sales by channel (POS, Wholesale, Online, etc.)
 */
app.get('/sales-by-channel', async (c) => {
  const db = drizzle(c.env.DB);
  const { startDate, endDate } = c.req.query();

  try {
    let query = `
      SELECT
        sales_channel,
        SUM(amount) as total_sales,
        COUNT(DISTINCT journal_entry_id) as transaction_count,
        AVG(amount) as avg_transaction_value
      FROM journal_lines
      WHERE account_id IN ('acc-4010', 'acc-4020', 'acc-4030')
        AND direction = 'Credit'
        AND sales_channel IS NOT NULL
    `;

    const params: any[] = [];

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(new Date(startDate).getTime() / 1000);
    }

    if (endDate) {
      query += ` AND created_at < ?`;
      params.push(new Date(endDate).getTime() / 1000);
    }

    query += ` GROUP BY sales_channel ORDER BY total_sales DESC`;

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      data: result.results || [],
      summary: {
        totalChannels: result.results?.length || 0,
        totalSales: result.results?.reduce((sum: number, row: any) => sum + (row.total_sales || 0), 0) || 0,
        totalTransactions: result.results?.reduce((sum: number, row: any) => sum + (row.transaction_count || 0), 0) || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales by channel:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/reports/sales-multi-dimensional
 * Multi-dimensional analysis: Warehouse × Channel × Sales Person
 */
app.get('/sales-multi-dimensional', async (c) => {
  const db = drizzle(c.env.DB);
  const { startDate, endDate, warehouseId, salesPersonId, salesChannel } = c.req.query();

  try {
    let query = `
      SELECT
        warehouse_id,
        sales_channel,
        sales_person_id,
        SUM(amount) as total_sales,
        COUNT(DISTINCT journal_entry_id) as transaction_count,
        AVG(amount) as avg_transaction_value
      FROM journal_lines
      WHERE account_id IN ('acc-4010', 'acc-4020', 'acc-4030')
        AND direction = 'Credit'
    `;

    const params: any[] = [];

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(new Date(startDate).getTime() / 1000);
    }

    if (endDate) {
      query += ` AND created_at < ?`;
      params.push(new Date(endDate).getTime() / 1000);
    }

    if (warehouseId) {
      query += ` AND warehouse_id = ?`;
      params.push(warehouseId);
    }

    if (salesPersonId) {
      query += ` AND sales_person_id = ?`;
      params.push(salesPersonId);
    }

    if (salesChannel) {
      query += ` AND sales_channel = ?`;
      params.push(salesChannel);
    }

    query += ` GROUP BY warehouse_id, sales_channel, sales_person_id ORDER BY total_sales DESC`;

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      data: result.results || [],
      summary: {
        totalRows: result.results?.length || 0,
        totalSales: result.results?.reduce((sum: number, row: any) => sum + (row.total_sales || 0), 0) || 0,
        totalTransactions: result.results?.reduce((sum: number, row: any) => sum + (row.transaction_count || 0), 0) || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching multi-dimensional sales:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
