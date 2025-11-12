import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../lib/db';
import { createXenditClient, convertUSDtoIDR } from '../lib/xendit';
import { orders } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '../lib/utils';
import type { Env } from '../index';

const paymentsRoutes = new Hono<{ Bindings: Env }>();

// ============================================
// CREATE QRIS PAYMENT
// ============================================

const createQRISSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(), // in USD
  currency: z.enum(['USD', 'IDR']).default('USD'),
});

paymentsRoutes.post('/qris/create', zValidator('json', createQRISSchema), async (c) => {
  const { orderId, amount, currency } = c.req.valid('json');
  const db = createDb(c.env.DB);

  // Get order
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  if (order.paymentStatus === 'paid') {
    return c.json({ error: 'Order already paid' }, 400);
  }

  try {
    const xendit = createXenditClient(c.env);

    // Convert to IDR if needed
    const amountIDR = currency === 'USD' ? convertUSDtoIDR(amount) : amount;

    // Create QRIS payment
    const qrisPayment = await xendit.createQRIS({
      external_id: order.orderNumber,
      type: 'DYNAMIC',
      callback_url: `${c.env.API_BASE_URL}/api/webhooks/xendit/qris`,
      amount: amountIDR,
    });

    // Update order with payment details
    await db.update(orders)
      .set({
        paymentMethod: 'qris',
        paymentProvider: 'xendit',
        paymentProviderId: qrisPayment.id,
        paymentDetails: JSON.stringify({
          qr_string: qrisPayment.qr_string,
          amount: qrisPayment.amount,
          created: qrisPayment.created,
        }),
        paymentExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return c.json({
      success: true,
      payment: {
        id: qrisPayment.id,
        qr_string: qrisPayment.qr_string,
        amount: qrisPayment.amount,
        status: qrisPayment.status,
      },
    });
  } catch (error: any) {
    console.error('QRIS payment creation error:', error);
    return c.json({ error: error.message || 'Failed to create QRIS payment' }, 500);
  }
});

// ============================================
// CREATE VIRTUAL ACCOUNT PAYMENT
// ============================================

const createVASchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'IDR']).default('USD'),
  bankCode: z.enum(['BCA', 'MANDIRI', 'BNI', 'BRI', 'PERMATA', 'CIMB']),
  customerName: z.string().min(1).max(255),
});

paymentsRoutes.post('/virtual-account/create', zValidator('json', createVASchema), async (c) => {
  const { orderId, amount, currency, bankCode, customerName } = c.req.valid('json');
  const db = createDb(c.env.DB);

  // Get order
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  if (order.paymentStatus === 'paid') {
    return c.json({ error: 'Order already paid' }, 400);
  }

  try {
    const xendit = createXenditClient(c.env);

    // Convert to IDR if needed
    const amountIDR = currency === 'USD' ? convertUSDtoIDR(amount) : amount;

    // Set expiration (24 hours from now)
    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create Virtual Account
    const vaPayment = await xendit.createVirtualAccount({
      external_id: order.orderNumber,
      bank_code: bankCode,
      name: customerName,
      is_closed: true, // Closed VA (specific amount)
      expected_amount: amountIDR,
      expiration_date: expirationDate.toISOString(),
      is_single_use: true,
      callback_url: `${c.env.API_BASE_URL}/api/webhooks/xendit/va`,
    });

    // Update order with payment details
    await db.update(orders)
      .set({
        paymentMethod: 'virtual_account',
        paymentProvider: 'xendit',
        paymentProviderId: vaPayment.id,
        paymentDetails: JSON.stringify({
          bank_code: vaPayment.bank_code,
          account_number: vaPayment.account_number,
          merchant_code: vaPayment.merchant_code,
          name: vaPayment.name,
          expected_amount: vaPayment.expected_amount,
          expiration_date: vaPayment.expiration_date,
        }),
        paymentExpiresAt: expirationDate,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return c.json({
      success: true,
      payment: {
        id: vaPayment.id,
        bank_code: vaPayment.bank_code,
        account_number: vaPayment.account_number,
        name: vaPayment.name,
        amount: vaPayment.expected_amount,
        expiration_date: vaPayment.expiration_date,
        status: vaPayment.status,
      },
    });
  } catch (error: any) {
    console.error('Virtual Account creation error:', error);
    return c.json({ error: error.message || 'Failed to create Virtual Account' }, 500);
  }
});

// ============================================
// GET PAYMENT STATUS
// ============================================

paymentsRoutes.get('/status/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  const db = createDb(c.env.DB);

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  const paymentDetails = order.paymentDetails ? JSON.parse(order.paymentDetails) : null;

  return c.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentProvider: order.paymentProvider,
    paymentProviderId: order.paymentProviderId,
    paymentDetails,
    paymentExpiresAt: order.paymentExpiresAt,
    paidAt: order.paidAt,
  });
});

// ============================================
// SUPPORTED BANKS
// ============================================

paymentsRoutes.get('/banks', async (c) => {
  return c.json({
    banks: [
      { code: 'BCA', name: 'Bank Central Asia', popular: true },
      { code: 'MANDIRI', name: 'Bank Mandiri', popular: true },
      { code: 'BNI', name: 'Bank Negara Indonesia', popular: true },
      { code: 'BRI', name: 'Bank Rakyat Indonesia', popular: true },
      { code: 'PERMATA', name: 'Bank Permata', popular: false },
      { code: 'CIMB', name: 'CIMB Niaga', popular: false },
    ],
  });
});

export { paymentsRoutes };
