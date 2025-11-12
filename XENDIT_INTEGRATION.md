# Xendit Payment Integration Guide

## Overview

Xendit is Indonesia's leading payment gateway, supporting local payment methods including QRIS, Virtual Accounts, E-Wallets, and more. This guide covers integration for wholesale e-commerce platform.

---

## Why Xendit for Indonesia?

✅ **Local Payment Methods**: QRIS, Virtual Accounts (BCA, Mandiri, BNI, BRI, Permata)
✅ **Low Transaction Fees**: QRIS only 0.63% (government-regulated)
✅ **Wide Adoption**: 24+ million merchants using QRIS
✅ **Popular E-Wallets**: OVO, GoPay, DANA, LinkAja, ShopeePay
✅ **No Setup Fees**: Free integration, only pay per transaction
✅ **Cloudflare Compatible**: RESTful API works on Workers

---

## Pricing (2025)

| Payment Method | Transaction Fee | Notes |
|----------------|-----------------|-------|
| **QRIS** | 0.63% | Inclusive of VAT, government-regulated |
| **Virtual Account** | Varies by bank | Direct agreement with banks |
| **E-Wallets** | ~2-3% | Depends on provider |
| **Cards** | ~2.9% + Rp 2,000 | Standard card processing |

**Key Benefits:**
- No monthly fees
- No setup fees
- Only charged on successful transactions
- Volume discounts available (contact Xendit)

---

## Payment Methods

### 1. QRIS (Quick Response Code Indonesian Standard)

QRIS is the unified QR code payment standard in Indonesia, allowing customers to pay using any supported e-wallet or mobile banking app.

**Supported Apps:**
- E-Wallets: OVO, GoPay, DANA, LinkAja, ShopeePay
- Mobile Banking: BCA Mobile, CIMB Clicks, and more
- 20+ payment apps in total

**Payment Flow:**
1. Customer proceeds to checkout
2. Backend creates QRIS payment via Xendit API
3. Display QR code to customer
4. Customer scans with their payment app
5. Xendit sends webhook on payment success
6. Backend updates order status

### 2. Virtual Accounts (VA)

Virtual Accounts are unique bank account numbers generated for each transaction. Customers can pay via:
- ATM
- Mobile banking
- Internet banking

**Supported Banks:**
- BCA (Bank Central Asia)
- Mandiri
- BNI (Bank Negara Indonesia)
- BRI (Bank Rakyat Indonesia)
- Permata
- CIMB Niaga
- Sahabat Sampoerna

**Payment Flow:**
1. Customer selects bank at checkout
2. Backend creates Virtual Account via Xendit API
3. Display VA number and bank details
4. Customer transfers to VA number
5. Xendit sends webhook on payment received
6. Backend updates order status

---

## API Integration

### Base URL

```
Production: https://api.xendit.co
Test: https://api.xendit.co (use test API key)
```

### Authentication

Xendit uses HTTP Basic Auth with your API key:

```typescript
const headers = {
  'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
  'Content-Type': 'application/json',
};
```

### API Keys

- **Test Key**: For development (starts with `xnd_development_`)
- **Live Key**: For production (starts with `xnd_production_`)

Store in Cloudflare Workers secrets/environment variables.

---

## QRIS Integration

### 1. Create QRIS Payment

**Endpoint:** `POST /qr_codes`

**Request:**
```typescript
{
  "external_id": "order-123456",        // Your order ID
  "type": "DYNAMIC",                    // DYNAMIC or STATIC
  "callback_url": "https://your-api.com/webhooks/xendit/qris",
  "amount": 150000                      // Amount in IDR (150,000 = Rp 150,000)
}
```

**Response:**
```typescript
{
  "id": "qr_123abc456def",
  "external_id": "order-123456",
  "amount": 150000,
  "qr_string": "00020101021126660014ID...",  // QR code data
  "callback_url": "https://your-api.com/webhooks/xendit/qris",
  "type": "DYNAMIC",
  "status": "ACTIVE",
  "created": "2025-01-12T10:00:00.000Z",
  "updated": "2025-01-12T10:00:00.000Z"
}
```

**QR Code Display:**
- Use `qr_string` to generate QR code image
- Libraries: `qrcode` (Node.js), display in admin/customer UI
- QR code valid until payment received or expires

### 2. QRIS Webhook

Xendit sends webhook when payment is received:

**POST to your `callback_url`:**
```typescript
{
  "id": "qr_123abc456def",
  "external_id": "order-123456",
  "amount": 150000,
  "qr_string": "00020101021126660014ID...",
  "status": "COMPLETED",
  "created": "2025-01-12T10:00:00.000Z",
  "updated": "2025-01-12T10:05:30.000Z"
}
```

**Webhook Verification:**
```typescript
// Verify webhook signature
const xenditSignature = request.headers.get('x-callback-token');
if (xenditSignature !== XENDIT_WEBHOOK_TOKEN) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## Virtual Account Integration

### 1. Create Fixed Virtual Account

**Endpoint:** `POST /callback_virtual_accounts`

**Request:**
```typescript
{
  "external_id": "order-123456",
  "bank_code": "BCA",                    // BCA, MANDIRI, BNI, BRI, PERMATA
  "name": "Toko Grosir ABC",             // Customer/merchant name
  "is_closed": true,                     // Closed VA (one-time use)
  "expected_amount": 150000,             // Amount in IDR
  "expiration_date": "2025-01-15T23:59:59.000Z",
  "is_single_use": true,
  "callback_url": "https://your-api.com/webhooks/xendit/va"
}
```

**Response:**
```typescript
{
  "id": "va_123abc456def",
  "external_id": "order-123456",
  "bank_code": "BCA",
  "merchant_code": "88888",
  "name": "Toko Grosir ABC",
  "account_number": "888881234567890",    // Virtual Account Number
  "is_closed": true,
  "expected_amount": 150000,
  "expiration_date": "2025-01-15T23:59:59.000Z",
  "is_single_use": true,
  "status": "PENDING",
  "created": "2025-01-12T10:00:00.000Z"
}
```

**Display to Customer:**
```
Bank: BCA
Virtual Account Number: 888881234567890
Amount: Rp 150,000
Expiry: 15 Jan 2025, 23:59
```

### 2. Virtual Account Webhook

**POST to your `callback_url`:**
```typescript
{
  "id": "va_123abc456def",
  "external_id": "order-123456",
  "bank_code": "BCA",
  "account_number": "888881234567890",
  "amount": 150000,
  "transaction_timestamp": "2025-01-12T10:15:30.000Z",
  "payment_id": "payment_123",
  "callback_virtual_account_id": "va_123abc456def"
}
```

---

## Supported Banks & Codes

| Bank Name | Bank Code | Notes |
|-----------|-----------|-------|
| BCA | `BCA` | Most popular |
| Mandiri | `MANDIRI` | Wide coverage |
| BNI | `BNI` | Government bank |
| BRI | `BRI` | Largest branch network |
| Permata | `PERMATA` | Fast processing |
| CIMB Niaga | `CIMB` | Available |

---

## Implementation Checklist

### Backend (Cloudflare Workers)

- [ ] Add Xendit API key to `.dev.vars` and Workers secrets
- [ ] Create `/api/payments/qris` endpoint to generate QRIS
- [ ] Create `/api/payments/virtual-account` endpoint to create VA
- [ ] Create `/api/webhooks/xendit/qris` webhook handler
- [ ] Create `/api/webhooks/xendit/va` webhook handler
- [ ] Update order status on payment success
- [ ] Send email/notification on payment received
- [ ] Handle payment expiry
- [ ] Add Xendit webhook token verification

### Frontend (Admin Dashboard)

- [ ] Add "Payment Method" selection (QRIS, Virtual Account, Manual)
- [ ] Display QR code for QRIS payments
- [ ] Display VA details for Virtual Account payments
- [ ] Show payment instructions
- [ ] Add payment status indicator
- [ ] Auto-refresh order status (polling or websocket)

### Database

- [ ] Add `payment_method` column to `orders` table
- [ ] Add `payment_provider_id` column (stores Xendit ID)
- [ ] Add `payment_details` column (JSON: QR string, VA number, etc.)
- [ ] Add `payment_expires_at` column

---

## Testing

### Test Mode

Xendit provides test API keys for development:

1. Sign up at https://dashboard.xendit.co
2. Get test API key from Dashboard → Settings → Developers
3. Use test API key in `.dev.vars`

### Test QRIS Payment

```bash
# Xendit provides test QR codes that auto-complete
# Use amount: 10000 for instant success
# Use amount: 10001 for instant failure
```

### Test Virtual Account Payment

```bash
# Simulate payment via Xendit Dashboard
# Dashboard → Transactions → Virtual Accounts → Simulate Payment
```

### Test Webhooks Locally

Use ngrok or Cloudflare Tunnel:

```bash
# With ngrok
ngrok http 8787

# Update webhook URL to ngrok URL
# Test webhook delivery from Xendit Dashboard
```

---

## Security Best Practices

1. **Verify Webhooks**: Always verify `x-callback-token` header
2. **Use HTTPS**: Webhooks must be HTTPS endpoints
3. **Idempotency**: Handle duplicate webhooks (check by `external_id`)
4. **Secrets Management**: Store API keys in Cloudflare Workers secrets
5. **Rate Limiting**: Implement rate limiting on payment endpoints
6. **Amount Validation**: Verify amounts match before confirming orders

---

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `API_VALIDATION_ERROR` | Invalid parameters | Check request format |
| `DUPLICATE_EXTERNAL_ID_ERROR` | external_id already used | Use unique order IDs |
| `MAXIMUM_AMOUNT_ERROR` | Amount exceeds limit | Check amount limits |
| `BANK_CODE_NOT_SUPPORTED` | Invalid bank_code | Use supported banks |

### Example Error Response

```typescript
{
  "error_code": "API_VALIDATION_ERROR",
  "message": "External ID is required"
}
```

---

## Code Examples

### Create QRIS Payment (TypeScript)

```typescript
async function createQRISPayment(orderId: string, amount: number) {
  const apiKey = env.XENDIT_SECRET_KEY;

  const response = await fetch('https://api.xendit.co/qr_codes', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(apiKey + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_id: orderId,
      type: 'DYNAMIC',
      amount: amount,
      callback_url: 'https://your-api.com/webhooks/xendit/qris',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create QRIS payment');
  }

  return await response.json();
}
```

### Create Virtual Account (TypeScript)

```typescript
async function createVirtualAccount(
  orderId: string,
  amount: number,
  bankCode: string,
  customerName: string
) {
  const apiKey = env.XENDIT_SECRET_KEY;

  const response = await fetch('https://api.xendit.co/callback_virtual_accounts', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(apiKey + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_id: orderId,
      bank_code: bankCode,
      name: customerName,
      is_closed: true,
      expected_amount: amount,
      expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      is_single_use: true,
      callback_url: 'https://your-api.com/webhooks/xendit/va',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create virtual account');
  }

  return await response.json();
}
```

### Webhook Handler (Hono)

```typescript
app.post('/webhooks/xendit/qris', async (c) => {
  // Verify webhook token
  const webhookToken = c.req.header('x-callback-token');
  if (webhookToken !== c.env.XENDIT_WEBHOOK_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload = await c.req.json();

  // Update order status
  if (payload.status === 'COMPLETED') {
    const db = createDb(c.env.DB);
    await db.update(orders)
      .set({
        paymentStatus: 'paid',
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(orders.orderNumber, payload.external_id));

    // Send confirmation email, etc.
  }

  return c.json({ success: true });
});
```

---

## Resources

- **Official Documentation**: https://docs.xendit.co
- **Dashboard**: https://dashboard.xendit.co
- **API Reference**: https://developers.xendit.co/api-reference
- **Pricing**: https://www.xendit.co/en-id/pricing/
- **Support**: support@xendit.co
- **Community**: https://community.xendit.co

---

## Next Steps

1. **Sign up** for Xendit account at https://dashboard.xendit.co
2. **Get API keys** from Dashboard → Settings → Developers
3. **Implement** QRIS and Virtual Account endpoints
4. **Test** with test API key
5. **Deploy** to production with live API key
6. **Monitor** transactions in Xendit Dashboard

---

**Last Updated:** January 2025
**Integration Version:** v1.0
**Status:** Ready for Implementation
