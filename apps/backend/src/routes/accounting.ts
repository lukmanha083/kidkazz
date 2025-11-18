import { Hono } from 'hono';
import { createDb } from '../lib/db';
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  accountBalances,
  fiscalPeriods,
  budgetEntries,
  taxCodes,
} from '../db/schema';
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import type { Env } from '../index';

const accountingRoutes = new Hono<{ Bindings: Env }>();

// ============================================
// CHART OF ACCOUNTS
// ============================================

// GET /api/accounting/accounts - List all accounts
accountingRoutes.get('/accounts', async (c) => {
  const db = createDb(c.env.DB);
  const { type, status } = c.req.query();

  let query = db.select().from(chartOfAccounts);

  if (type) {
    query = query.where(eq(chartOfAccounts.accountType, type as any));
  }
  if (status) {
    query = query.where(eq(chartOfAccounts.status, status as any));
  }

  const accounts = await query.orderBy(chartOfAccounts.code);

  return c.json({ accounts });
});

// GET /api/accounting/accounts/active - List only active detail accounts
accountingRoutes.get('/accounts/active', async (c) => {
  const db = createDb(c.env.DB);

  const accounts = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.status, 'Active'),
        eq(chartOfAccounts.isDetailAccount, true)
      )
    )
    .orderBy(chartOfAccounts.code);

  return c.json({ accounts });
});

// GET /api/accounting/accounts/:id - Get account details
accountingRoutes.get('/accounts/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [account] = await db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.id, id))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }

  return c.json({ account });
});

// POST /api/accounting/accounts - Create new account
accountingRoutes.post('/accounts', async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  // Determine normal balance based on account type
  const normalBalanceMap: Record<string, 'Debit' | 'Credit'> = {
    Asset: 'Debit',
    Expense: 'Debit',
    COGS: 'Debit',
    Liability: 'Credit',
    Equity: 'Credit',
    Revenue: 'Credit',
  };

  const newAccount = {
    id: `ACC-${Date.now()}`,
    code: body.code,
    name: body.name,
    accountType: body.accountType,
    accountSubType: body.accountSubType,
    parentAccountId: body.parentAccountId,
    description: body.description,
    taxType: body.taxType,
    isSystemAccount: body.isSystemAccount || false,
    isDetailAccount: body.isDetailAccount !== undefined ? body.isDetailAccount : true,
    status: body.status || 'Active',
    currency: body.currency || 'IDR',
    normalBalance: normalBalanceMap[body.accountType] || 'Debit',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(chartOfAccounts).values(newAccount);

  return c.json({ account: newAccount }, 201);
});

// PUT /api/accounting/accounts/:id - Update account
accountingRoutes.put('/accounts/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const [existing] = await db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Account not found' }, 404);
  }

  // Prevent editing system accounts
  if (existing.isSystemAccount) {
    return c.json({ error: 'Cannot edit system account' }, 403);
  }

  const updated = {
    name: body.name,
    accountSubType: body.accountSubType,
    description: body.description,
    taxType: body.taxType,
    status: body.status,
    updatedAt: new Date(),
  };

  await db
    .update(chartOfAccounts)
    .set(updated)
    .where(eq(chartOfAccounts.id, id));

  return c.json({ account: { ...existing, ...updated } });
});

// DELETE /api/accounting/accounts/:id - Delete account
accountingRoutes.delete('/accounts/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Account not found' }, 404);
  }

  // Prevent deleting system accounts
  if (existing.isSystemAccount) {
    return c.json({ error: 'Cannot delete system account' }, 403);
  }

  // Check if account has transactions
  const [hasTransactions] = await db
    .select({ count: sql<number>`count(*)` })
    .from(journalLines)
    .where(eq(journalLines.accountId, id));

  if (hasTransactions.count > 0) {
    return c.json({
      error: 'Cannot delete account with transactions. Archive it instead.'
    }, 400);
  }

  await db.delete(chartOfAccounts).where(eq(chartOfAccounts.id, id));

  return c.json({ message: 'Account deleted successfully' });
});

// ============================================
// JOURNAL ENTRIES
// ============================================

// GET /api/accounting/journal-entries - List journal entries
accountingRoutes.get('/journal-entries', async (c) => {
  const db = createDb(c.env.DB);
  const { status, from, to, limit = '50' } = c.req.query();

  let query = db.select().from(journalEntries);

  if (status) {
    query = query.where(eq(journalEntries.status, status as any));
  }
  if (from) {
    query = query.where(gte(journalEntries.entryDate, new Date(from)));
  }
  if (to) {
    query = query.where(lte(journalEntries.entryDate, new Date(to)));
  }

  const entries = await query
    .orderBy(desc(journalEntries.entryDate))
    .limit(parseInt(limit));

  return c.json({ journalEntries: entries });
});

// GET /api/accounting/journal-entries/:id - Get journal entry with lines
accountingRoutes.get('/journal-entries/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1);

  if (!entry) {
    return c.json({ error: 'Journal entry not found' }, 404);
  }

  // Get lines with account information
  const lines = await db
    .select({
      id: journalLines.id,
      lineNumber: journalLines.lineNumber,
      accountId: journalLines.accountId,
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      direction: journalLines.direction,
      amount: journalLines.amount,
      description: journalLines.description,
      taxAmount: journalLines.taxAmount,
      taxCode: journalLines.taxCode,
    })
    .from(journalLines)
    .leftJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
    .where(eq(journalLines.journalEntryId, id))
    .orderBy(journalLines.lineNumber);

  return c.json({ journalEntry: entry, lines });
});

// POST /api/accounting/journal-entries - Create journal entry
accountingRoutes.post('/journal-entries', async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json();

  // Validate that debits equal credits
  const totalDebits = body.lines
    .filter((l: any) => l.direction === 'Debit')
    .reduce((sum: number, l: any) => sum + l.amount, 0);

  const totalCredits = body.lines
    .filter((l: any) => l.direction === 'Credit')
    .reduce((sum: number, l: any) => sum + l.amount, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return c.json({
      error: 'Debits must equal credits',
      totalDebits,
      totalCredits,
    }, 400);
  }

  // Get fiscal year and period from entry date
  const entryDate = new Date(body.entryDate);
  const fiscalYear = entryDate.getFullYear();
  const fiscalPeriod = entryDate.getMonth() + 1;

  // Generate entry number
  const entryNumber = `JE-${fiscalYear}-${String(Date.now()).slice(-6)}`;

  const newEntry = {
    id: `JE-${Date.now()}`,
    entryNumber,
    entryDate: new Date(body.entryDate),
    description: body.description,
    reference: body.reference,
    entryType: body.entryType || 'Manual',
    status: body.status || 'Draft',
    sourceModule: body.sourceModule,
    sourceId: body.sourceId,
    fiscalYear,
    fiscalPeriod,
    createdBy: body.createdBy, // TODO: Get from auth context
    notes: body.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(journalEntries).values(newEntry);

  // Insert lines
  const lines = body.lines.map((line: any, index: number) => ({
    id: `JL-${Date.now()}-${index}`,
    journalEntryId: newEntry.id,
    lineNumber: index + 1,
    accountId: line.accountId,
    direction: line.direction,
    amount: line.amount,
    currency: line.currency || 'IDR',
    exchangeRate: line.exchangeRate || 1.0,
    amountInBaseCurrency: line.amount * (line.exchangeRate || 1.0),
    description: line.description,
    taxAmount: line.taxAmount || 0,
    taxCode: line.taxCode,
    dimension1: line.dimension1,
    dimension2: line.dimension2,
    dimension3: line.dimension3,
    createdAt: new Date(),
  }));

  await db.insert(journalLines).values(lines);

  return c.json({ journalEntry: newEntry, lines }, 201);
});

// POST /api/accounting/journal-entries/:id/post - Post journal entry
accountingRoutes.post('/journal-entries/:id/post', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1);

  if (!entry) {
    return c.json({ error: 'Journal entry not found' }, 404);
  }

  if (entry.status !== 'Draft') {
    return c.json({ error: 'Only draft entries can be posted' }, 400);
  }

  await db
    .update(journalEntries)
    .set({
      status: 'Posted',
      postedBy: body.postedBy, // TODO: Get from auth context
      postedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(journalEntries.id, id));

  return c.json({ message: 'Journal entry posted successfully' });
});

// POST /api/accounting/journal-entries/:id/void - Void journal entry
accountingRoutes.post('/journal-entries/:id/void', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1);

  if (!entry) {
    return c.json({ error: 'Journal entry not found' }, 404);
  }

  if (entry.status !== 'Posted') {
    return c.json({ error: 'Only posted entries can be voided' }, 400);
  }

  await db
    .update(journalEntries)
    .set({
      status: 'Voided',
      voidedBy: body.voidedBy, // TODO: Get from auth context
      voidedAt: new Date(),
      voidReason: body.reason,
      updatedAt: new Date(),
    })
    .where(eq(journalEntries.id, id));

  return c.json({ message: 'Journal entry voided successfully' });
});

// ============================================
// LEDGER & REPORTS
// ============================================

// GET /api/accounting/ledger/:accountId - Get general ledger for account
accountingRoutes.get('/ledger/:accountId', async (c) => {
  const db = createDb(c.env.DB);
  const accountId = c.req.param('accountId');
  const { from, to } = c.req.query();

  // Get account info
  const [account] = await db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.id, accountId))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }

  // Get transactions
  const transactions = await db
    .select({
      date: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      description: journalLines.description,
      reference: journalEntries.reference,
      direction: journalLines.direction,
      amount: journalLines.amount,
      journalEntryId: journalEntries.id,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(journalLines.accountId, accountId),
        eq(journalEntries.status, 'Posted'),
        from ? gte(journalEntries.entryDate, new Date(from)) : undefined,
        to ? lte(journalEntries.entryDate, new Date(to)) : undefined
      )
    )
    .orderBy(journalEntries.entryDate, journalLines.lineNumber);

  // Calculate running balance
  let runningBalance = 0;
  const transactionsWithBalance = transactions.map((t) => {
    const amount = t.direction === account.normalBalance ? t.amount : -t.amount;
    runningBalance += amount;
    return {
      ...t,
      balance: runningBalance,
    };
  });

  return c.json({
    account,
    transactions: transactionsWithBalance,
    closingBalance: runningBalance,
  });
});

// GET /api/accounting/reports/income-statement - Generate income statement
accountingRoutes.get('/reports/income-statement', async (c) => {
  const db = createDb(c.env.DB);
  const { from, to } = c.req.query();

  if (!from || !to) {
    return c.json({ error: 'Date range required (from, to)' }, 400);
  }

  // Get all revenue, COGS, and expense account balances
  const accounts = await db
    .select({
      accountId: chartOfAccounts.id,
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      accountType: chartOfAccounts.accountType,
      normalBalance: chartOfAccounts.normalBalance,
      debitTotal: sql<number>`
        COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Debit' THEN ${journalLines.amount} ELSE 0 END), 0)
      `,
      creditTotal: sql<number>`
        COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Credit' THEN ${journalLines.amount} ELSE 0 END), 0)
      `,
    })
    .from(chartOfAccounts)
    .leftJoin(journalLines, eq(chartOfAccounts.id, journalLines.accountId))
    .leftJoin(journalEntries, and(
      eq(journalLines.journalEntryId, journalEntries.id),
      eq(journalEntries.status, 'Posted'),
      gte(journalEntries.entryDate, new Date(from)),
      lte(journalEntries.entryDate, new Date(to))
    ))
    .where(inArray(chartOfAccounts.accountType, ['Revenue', 'COGS', 'Expense']))
    .groupBy(chartOfAccounts.id);

  // Calculate balances
  const revenue = accounts
    .filter((a) => a.accountType === 'Revenue')
    .map((a) => ({
      ...a,
      balance: a.creditTotal - a.debitTotal,
    }));

  const cogs = accounts
    .filter((a) => a.accountType === 'COGS')
    .map((a) => ({
      ...a,
      balance: a.debitTotal - a.creditTotal,
    }));

  const expenses = accounts
    .filter((a) => a.accountType === 'Expense')
    .map((a) => ({
      ...a,
      balance: a.debitTotal - a.creditTotal,
    }));

  const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
  const totalCOGS = cogs.reduce((sum, a) => sum + a.balance, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
  const netIncome = grossProfit - totalExpenses;

  return c.json({
    period: { from, to },
    revenue: { accounts: revenue, total: totalRevenue },
    cogs: { accounts: cogs, total: totalCOGS },
    grossProfit,
    expenses: { accounts: expenses, total: totalExpenses },
    netIncome,
  });
});

// GET /api/accounting/reports/balance-sheet - Generate balance sheet
accountingRoutes.get('/reports/balance-sheet', async (c) => {
  const db = createDb(c.env.DB);
  const { asOf } = c.req.query();

  if (!asOf) {
    return c.json({ error: 'As-of date required (asOf)' }, 400);
  }

  // Get all asset, liability, and equity account balances
  const accounts = await db
    .select({
      accountId: chartOfAccounts.id,
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      accountType: chartOfAccounts.accountType,
      accountSubType: chartOfAccounts.accountSubType,
      normalBalance: chartOfAccounts.normalBalance,
      debitTotal: sql<number>`
        COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Debit' THEN ${journalLines.amount} ELSE 0 END), 0)
      `,
      creditTotal: sql<number>`
        COALESCE(SUM(CASE WHEN ${journalLines.direction} = 'Credit' THEN ${journalLines.amount} ELSE 0 END), 0)
      `,
    })
    .from(chartOfAccounts)
    .leftJoin(journalLines, eq(chartOfAccounts.id, journalLines.accountId))
    .leftJoin(journalEntries, and(
      eq(journalLines.journalEntryId, journalEntries.id),
      eq(journalEntries.status, 'Posted'),
      lte(journalEntries.entryDate, new Date(asOf))
    ))
    .where(inArray(chartOfAccounts.accountType, ['Asset', 'Liability', 'Equity']))
    .groupBy(chartOfAccounts.id);

  // Calculate balances
  const assets = accounts
    .filter((a) => a.accountType === 'Asset')
    .map((a) => ({
      ...a,
      balance: a.debitTotal - a.creditTotal,
    }));

  const liabilities = accounts
    .filter((a) => a.accountType === 'Liability')
    .map((a) => ({
      ...a,
      balance: a.creditTotal - a.debitTotal,
    }));

  const equity = accounts
    .filter((a) => a.accountType === 'Equity')
    .map((a) => ({
      ...a,
      balance: a.creditTotal - a.debitTotal,
    }));

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

  return c.json({
    asOf,
    assets: { accounts: assets, total: totalAssets },
    liabilities: { accounts: liabilities, total: totalLiabilities },
    equity: { accounts: equity, total: totalEquity },
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  });
});

export { accountingRoutes };
