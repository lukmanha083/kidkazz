import { Hono } from 'hono';
import { createDb } from '../lib/db';
import { XenditClient } from '../lib/xendit';
import { orders } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Env } from '../index';
import type { XenditQRISWebhook, XenditVAWebhook } from '../lib/xendit';

const webhooksRoutes = new Hono<{ Bindings: Env }>();

// ============================================
// QRIS WEBHOOK
// ============================================

webhooksRoutes.post('/xendit/qris', async (c) => {
  // Verify webhook token
  const callbackToken = c.req.header('x-callback-token');
  const expectedToken = c.env.XENDIT_WEBHOOK_TOKEN;

  if (!XenditClient.verifyWebhook(callbackToken || '', expectedToken || '')) {
    console.error('Invalid webhook token');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload: XenditQRISWebhook = await c.req.json();
  const db = createDb(c.env.DB);

  console.log('QRIS Webhook received:', payload);

  // Only process COMPLETED payments
  if (payload.status !== 'COMPLETED') {
    return c.json({ success: true, message: 'Not a completed payment' });
  }

  try {
    // Find order by orderNumber (external_id)
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, payload.external_id))
      .limit(1);

    if (!order) {
      console.error('Order not found:', payload.external_id);
      return c.json({ error: 'Order not found' }, 404);
    }

    // Check if already paid
    if (order.paymentStatus === 'paid') {
      return c.json({ success: true, message: 'Order already paid' });
    }

    // Update order status
    await db.update(orders)
      .set({
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date(payload.updated),
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    console.log('Order payment confirmed:', order.orderNumber);

    // TODO: Send confirmation email/notification
    // TODO: Trigger order fulfillment process

    return c.json({ success: true });
  } catch (error: any) {
    console.error('QRIS webhook processing error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// VIRTUAL ACCOUNT WEBHOOK
// ============================================

webhooksRoutes.post('/xendit/va', async (c) => {
  // Verify webhook token
  const callbackToken = c.req.header('x-callback-token');
  const expectedToken = c.env.XENDIT_WEBHOOK_TOKEN;

  if (!XenditClient.verifyWebhook(callbackToken || '', expectedToken || '')) {
    console.error('Invalid webhook token');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload: XenditVAWebhook = await c.req.json();
  const db = createDb(c.env.DB);

  console.log('Virtual Account Webhook received:', payload);

  try {
    // Find order by orderNumber (external_id)
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, payload.external_id))
      .limit(1);

    if (!order) {
      console.error('Order not found:', payload.external_id);
      return c.json({ error: 'Order not found' }, 404);
    }

    // Check if already paid
    if (order.paymentStatus === 'paid') {
      return c.json({ success: true, message: 'Order already paid' });
    }

    // Verify amount matches (optional but recommended)
    const expectedAmount = order.totalAmount;
    const receivedAmount = payload.amount;

    // Convert to same currency if needed
    // For now, we'll just log a warning if amounts don't match
    if (receivedAmount < expectedAmount) {
      console.warn('Payment amount mismatch:', {
        expected: expectedAmount,
        received: receivedAmount,
        order: order.orderNumber,
      });
    }

    // Update order status
    await db.update(orders)
      .set({
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date(payload.transaction_timestamp),
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    console.log('Order payment confirmed via VA:', order.orderNumber);

    // TODO: Send confirmation email/notification
    // TODO: Trigger order fulfillment process

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Virtual Account webhook processing error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// WEBHOOK TEST ENDPOINT (Development only)
// ============================================

webhooksRoutes.get('/xendit/test', async (c) => {
  if (c.env.ENVIRONMENT === 'production') {
    return c.json({ error: 'Not available in production' }, 403);
  }

  return c.json({
    message: 'Xendit webhooks are configured',
    endpoints: {
      qris: `${c.env.API_BASE_URL}/api/webhooks/xendit/qris`,
      va: `${c.env.API_BASE_URL}/api/webhooks/xendit/va`,
    },
    webhookToken: c.env.XENDIT_WEBHOOK_TOKEN ? 'Configured' : 'Not configured',
  });
});

export { webhooksRoutes };
