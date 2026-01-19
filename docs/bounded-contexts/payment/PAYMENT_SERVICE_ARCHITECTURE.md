# Payment Service Architecture

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase

---

## Executive Summary

The Payment Service handles all payment processing for the Kidkazz omnichannel ERP system. It integrates with multiple payment providers and methods to support both online and offline sales channels.

### Payment Providers

| Provider | Channel | Payment Methods |
|----------|---------|-----------------|
| **Midtrans** | Online Sales | Credit Card, Bank Transfer, E-Wallet, QRIS |
| **QRIS** | Offline Sales (POS) | QR Code Payment (all banks/e-wallets) |
| **EDC Terminal** | Offline Sales (POS) | Debit Card, Credit Card |
| **Cash** | Offline Sales (POS) | Physical Cash |

### Key Objectives

1. **Unified Payment Gateway** - Single interface for all payment methods
2. **Multi-Provider Support** - Midtrans for online, QRIS/EDC for offline
3. **Real-Time Processing** - Instant payment confirmation
4. **Reconciliation** - Automated settlement and reconciliation
5. **Security** - PCI DSS compliance, tokenization, fraud detection

---

## Table of Contents

1. [Payment Channels Overview](#payment-channels-overview)
2. [Domain Model](#domain-model)
3. [Provider Integrations](#provider-integrations)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Payment Flows](#payment-flows)
7. [Reconciliation & Settlement](#reconciliation--settlement)
8. [Security & Compliance](#security--compliance)

---

## Payment Channels Overview

### Channel-Payment Matrix

| Sales Channel | Cash | QRIS | EDC (Card) | Bank Transfer | E-Wallet | Credit Card |
|---------------|------|------|------------|---------------|----------|-------------|
| ERP Dashboard | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| POS | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Web Retail | ❌ | ✅* | ❌ | ✅ | ✅ | ✅ |
| Web Wholesale | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Mobile Retail | ❌ | ✅* | ❌ | ✅ | ✅ | ✅ |
| Live Streaming | ❌ | ✅* | ❌ | ✅ | ✅ | ✅ |

*QRIS for online = Midtrans QRIS (customer scans from screen)

### Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT SERVICE                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐│
│  │                        PAYMENT GATEWAY ABSTRACTION                          ││
│  │                                                                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       ││
│  │  │   Midtrans  │  │    QRIS     │  │     EDC     │  │    Cash     │       ││
│  │  │   Adapter   │  │   Adapter   │  │   Adapter   │  │   Adapter   │       ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       ││
│  │         │                │                │                │               ││
│  └─────────┼────────────────┼────────────────┼────────────────┼───────────────┘│
│            │                │                │                │                │
│            ▼                ▼                ▼                ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Midtrans   │  │  QRIS API   │  │  EDC/Bank   │  │  Cash       │          │
│  │  API        │  │  (BI-SNAP)  │  │  Terminal   │  │  Register   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  Sales Service  │
                              │  (Saga Pattern) │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
           │ Create Payment│  │ Process Refund│  │ Verify Status │
           └───────────────┘  └───────────────┘  └───────────────┘
```

---

## Domain Model

### Core Entities

#### 1. Payment (Aggregate Root)

```typescript
interface Payment {
  // Identity
  id: string;
  paymentNumber: string;          // Format: PAY-{YYYYMMDD}-{SEQ}

  // Reference
  orderId: string;
  orderNumber: string;
  customerId?: string;

  // Payment Details
  method: PaymentMethod;
  provider: PaymentProvider;
  channel: PaymentChannel;        // ONLINE, OFFLINE

  // Amount
  amount: number;
  currency: Currency;
  exchangeRate: number;           // For foreign currency

  // Fees
  providerFee: number;            // MDR (Merchant Discount Rate)
  platformFee: number;
  netAmount: number;              // amount - fees

  // Status
  status: PaymentStatus;

  // Provider Data
  providerTransactionId?: string;
  providerReferenceNumber?: string;
  providerResponse?: Record<string, any>;

  // For specific methods
  cardInfo?: CardInfo;            // EDC/Credit Card
  qrisInfo?: QRISInfo;            // QRIS
  bankTransferInfo?: BankTransferInfo;
  eWalletInfo?: EWalletInfo;
  cashInfo?: CashInfo;

  // Timestamps
  initiatedAt: Date;
  paidAt?: Date;
  expiredAt?: Date;
  settledAt?: Date;
  refundedAt?: Date;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
```

#### 2. PaymentMethod Value Objects

```typescript
enum PaymentMethod {
  // Cash
  CASH = 'CASH',

  // QRIS
  QRIS = 'QRIS',

  // EDC/Cards
  DEBIT_CARD = 'DEBIT_CARD',
  CREDIT_CARD = 'CREDIT_CARD',

  // Bank Transfer (Midtrans VA)
  BANK_TRANSFER_BCA = 'BANK_TRANSFER_BCA',
  BANK_TRANSFER_BNI = 'BANK_TRANSFER_BNI',
  BANK_TRANSFER_BRI = 'BANK_TRANSFER_BRI',
  BANK_TRANSFER_MANDIRI = 'BANK_TRANSFER_MANDIRI',
  BANK_TRANSFER_PERMATA = 'BANK_TRANSFER_PERMATA',
  BANK_TRANSFER_CIMB = 'BANK_TRANSFER_CIMB',

  // E-Wallet (Midtrans)
  GOPAY = 'GOPAY',
  SHOPEEPAY = 'SHOPEEPAY',
  OVO = 'OVO',
  DANA = 'DANA',
  LINKAJA = 'LINKAJA',

  // Credit Card (Midtrans)
  CREDIT_CARD_VISA = 'CREDIT_CARD_VISA',
  CREDIT_CARD_MASTERCARD = 'CREDIT_CARD_MASTERCARD',
  CREDIT_CARD_JCB = 'CREDIT_CARD_JCB',
  CREDIT_CARD_AMEX = 'CREDIT_CARD_AMEX',

  // Installment
  INSTALLMENT = 'INSTALLMENT',

  // Credit Terms (B2B)
  CREDIT_TERMS = 'CREDIT_TERMS'
}

enum PaymentProvider {
  INTERNAL = 'INTERNAL',          // Cash
  MIDTRANS = 'MIDTRANS',          // Online payments
  QRIS_NATIONAL = 'QRIS_NATIONAL', // QRIS via BI
  EDC_BCA = 'EDC_BCA',            // BCA EDC Terminal
  EDC_BRI = 'EDC_BRI',            // BRI EDC Terminal
  EDC_MANDIRI = 'EDC_MANDIRI',    // Mandiri EDC Terminal
  EDC_BNI = 'EDC_BNI'             // BNI EDC Terminal
}

enum PaymentChannel {
  ONLINE = 'ONLINE',              // Web, Mobile, Live Streaming
  OFFLINE = 'OFFLINE'             // POS, ERP Manual
}

enum PaymentStatus {
  PENDING = 'PENDING',            // Awaiting payment
  PROCESSING = 'PROCESSING',      // Being processed
  PAID = 'PAID',                  // Payment confirmed
  FAILED = 'FAILED',              // Payment failed
  EXPIRED = 'EXPIRED',            // Payment timeout
  CANCELLED = 'CANCELLED',        // Cancelled by user/system
  REFUNDED = 'REFUNDED',          // Fully refunded
  PARTIAL_REFUND = 'PARTIAL_REFUND' // Partially refunded
}
```

#### 3. Method-Specific Info Objects

```typescript
// Cash Payment Info
interface CashInfo {
  amountTendered: number;
  changeAmount: number;
  denominationBreakdown?: Record<number, number>; // {100000: 2, 50000: 1}
}

// QRIS Payment Info
interface QRISInfo {
  qrString: string;               // QR code data
  qrImageUrl?: string;            // QR image URL
  nmid: string;                   // National Merchant ID
  terminalId: string;
  rrn: string;                    // Retrieval Reference Number
  approvalCode: string;
  issuerBank?: string;            // Bank/e-wallet that paid
  customerPan?: string;           // Masked PAN
}

// EDC/Card Payment Info
interface CardInfo {
  cardType: 'DEBIT' | 'CREDIT';
  cardBrand: 'VISA' | 'MASTERCARD' | 'JCB' | 'AMEX' | 'GPN';
  maskedCardNumber: string;       // 4111********1111
  cardHolderName?: string;
  approvalCode: string;
  rrn: string;
  terminalId: string;
  merchantId: string;
  batchNumber: string;
  traceNumber: string;
  isSignatureRequired: boolean;
  isPinVerified: boolean;
}

// Bank Transfer Info (Virtual Account)
interface BankTransferInfo {
  bank: string;
  vaNumber: string;               // Virtual Account Number
  accountName: string;            // Kidkazz account name
  expiresAt: Date;
  payerBankCode?: string;
  payerAccountNumber?: string;    // Masked
}

// E-Wallet Info
interface EWalletInfo {
  walletType: string;             // GOPAY, SHOPEEPAY, etc.
  deepLinkUrl?: string;           // App redirect URL
  qrCodeUrl?: string;             // For scan to pay
  accountId?: string;             // Masked wallet ID
  transactionTime: Date;
}
```

#### 4. Refund Entity

```typescript
interface Refund {
  id: string;
  refundNumber: string;           // REF-{YYYYMMDD}-{SEQ}

  // Reference
  paymentId: string;
  orderId: string;

  // Amount
  amount: number;
  reason: RefundReason;
  notes?: string;

  // Status
  status: RefundStatus;

  // Provider
  providerRefundId?: string;
  providerResponse?: Record<string, any>;

  // Timestamps
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;

  // Audit
  requestedBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

enum RefundReason {
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ITEM_RETURNED = 'ITEM_RETURNED',
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  FRAUD = 'FRAUD',
  OTHER = 'OTHER'
}

enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED'
}
```

### Domain Events

```typescript
// Payment Events
interface PaymentCreated {
  type: 'PaymentCreated';
  payload: {
    paymentId: string;
    orderId: string;
    amount: number;
    method: PaymentMethod;
    provider: PaymentProvider;
  };
}

interface PaymentProcessing {
  type: 'PaymentProcessing';
  payload: {
    paymentId: string;
    providerTransactionId: string;
  };
}

interface PaymentCompleted {
  type: 'PaymentCompleted';
  payload: {
    paymentId: string;
    orderId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
    providerTransactionId: string;
  };
}

interface PaymentFailed {
  type: 'PaymentFailed';
  payload: {
    paymentId: string;
    orderId: string;
    reason: string;
    providerErrorCode?: string;
  };
}

interface PaymentExpired {
  type: 'PaymentExpired';
  payload: {
    paymentId: string;
    orderId: string;
    expiredAt: Date;
  };
}

interface RefundCompleted {
  type: 'RefundCompleted';
  payload: {
    refundId: string;
    paymentId: string;
    orderId: string;
    amount: number;
  };
}
```

---

## Provider Integrations

### 1. Midtrans Integration (Online Sales)

**Supported Payment Methods**:
- Credit Card (Visa, Mastercard, JCB, Amex)
- Bank Transfer / Virtual Account (BCA, BNI, BRI, Mandiri, Permata, CIMB)
- E-Wallet (GoPay, ShopeePay, OVO, DANA, LinkAja)
- QRIS (for online customers)
- Convenience Store (Alfamart, Indomaret)

**Integration Type**: Server-to-Server API + Snap (Frontend SDK)

```typescript
// Midtrans Configuration
interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  merchantId: string;
  isProduction: boolean;
  notificationUrl: string;       // Webhook URL
}

// Midtrans Adapter
class MidtransAdapter implements PaymentGatewayAdapter {
  constructor(private config: MidtransConfig) {}

  // Create transaction (get Snap token)
  async createTransaction(request: CreatePaymentRequest): Promise<MidtransTransaction> {
    const payload = {
      transaction_details: {
        order_id: request.orderId,
        gross_amount: request.amount
      },
      customer_details: {
        first_name: request.customerName,
        email: request.customerEmail,
        phone: request.customerPhone
      },
      item_details: request.items.map(item => ({
        id: item.productId,
        name: item.productName,
        price: item.unitPrice,
        quantity: item.quantity
      })),
      enabled_payments: this.mapPaymentMethods(request.allowedMethods),
      callbacks: {
        finish: request.redirectUrl
      },
      expiry: {
        unit: 'hours',
        duration: 24
      }
    };

    const response = await this.client.createSnapTransaction(payload);

    return {
      snapToken: response.token,
      redirectUrl: response.redirect_url,
      orderId: request.orderId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }

  // Handle webhook notification
  async handleNotification(notification: MidtransNotification): Promise<PaymentUpdate> {
    // Verify signature
    const isValid = this.verifySignature(notification);
    if (!isValid) throw new Error('Invalid signature');

    const status = this.mapStatus(notification.transaction_status, notification.fraud_status);

    return {
      orderId: notification.order_id,
      transactionId: notification.transaction_id,
      status,
      method: this.mapPaymentMethod(notification.payment_type),
      amount: parseFloat(notification.gross_amount),
      paidAt: notification.transaction_time ? new Date(notification.transaction_time) : undefined,
      providerResponse: notification
    };
  }

  // Process refund
  async refund(transactionId: string, amount: number, reason: string): Promise<RefundResult> {
    const response = await this.client.refundTransaction(transactionId, {
      amount,
      reason
    });

    return {
      refundId: response.refund_id,
      status: response.status,
      amount: response.refund_amount
    };
  }
}
```

**Midtrans Webhook Flow**:
```
Customer Pays → Midtrans → Webhook POST → Payment Service → Update Payment → Notify Sales Service
```

**Webhook URL**: `https://api.kidkazz.com/api/payments/webhooks/midtrans`

---

### 2. QRIS Integration (Offline POS)

**Standard**: BI-SNAP (Bank Indonesia Standard National Open API Payment)

**QRIS Types**:
- **Static QRIS**: Fixed QR code per terminal/merchant
- **Dynamic QRIS**: Generated per transaction with amount

```typescript
// QRIS Configuration
interface QRISConfig {
  nmid: string;                   // National Merchant ID
  merchantName: string;
  merchantCity: string;
  terminalIds: string[];          // List of POS terminal IDs
  acquirerBank: string;           // Partner bank (BCA, BRI, etc.)
  apiKey: string;
  secretKey: string;
}

// QRIS Adapter
class QRISAdapter implements PaymentGatewayAdapter {
  constructor(private config: QRISConfig) {}

  // Generate Dynamic QRIS
  async generateQRIS(request: QRISRequest): Promise<QRISResponse> {
    const qrPayload = this.buildQRPayload({
      nmid: this.config.nmid,
      merchantName: this.config.merchantName,
      merchantCity: this.config.merchantCity,
      terminalId: request.terminalId,
      amount: request.amount,
      orderId: request.orderId,
      expiryMinutes: 15
    });

    // Generate QR code
    const qrString = this.encodeQRString(qrPayload);
    const qrImageUrl = await this.generateQRImage(qrString);

    return {
      qrString,
      qrImageUrl,
      orderId: request.orderId,
      amount: request.amount,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      terminalId: request.terminalId
    };
  }

  // Check payment status (polling)
  async checkStatus(orderId: string): Promise<QRISStatus> {
    const response = await this.client.inquiryPayment(orderId);

    return {
      orderId,
      status: this.mapStatus(response.status),
      rrn: response.rrn,
      approvalCode: response.approval_code,
      issuerBank: response.issuer_bank,
      paidAt: response.paid_at ? new Date(response.paid_at) : undefined
    };
  }

  // Build QR payload according to EMVCo standard
  private buildQRPayload(data: QRData): QRPayload {
    return {
      // Payload Format Indicator
      '00': '01',
      // Point of Initiation (12 = Dynamic)
      '01': '12',
      // Merchant Account Information
      '26': {
        '00': 'ID.CO.QRIS.WWW',
        '01': data.nmid,
        '02': data.merchantName.substring(0, 25),
        '03': data.merchantCity
      },
      // Merchant Category Code
      '52': '5411',  // Grocery stores
      // Transaction Currency (IDR = 360)
      '53': '360',
      // Transaction Amount
      '54': data.amount.toString(),
      // Country Code
      '58': 'ID',
      // Merchant Name
      '59': data.merchantName.substring(0, 25),
      // Merchant City
      '60': data.merchantCity,
      // Additional Data
      '62': {
        '05': data.orderId  // Reference Label
      }
    };
  }
}
```

**QRIS Payment Flow (POS)**:
```
1. Cashier creates order in POS
2. POS requests QRIS from Payment Service
3. Payment Service generates Dynamic QRIS
4. POS displays QR code on screen
5. Customer scans with any bank/e-wallet app
6. Customer confirms payment in their app
7. Payment Service receives notification (or polls)
8. POS receives confirmation
9. Transaction complete
```

---

### 3. EDC Terminal Integration (Offline POS)

**EDC Providers**:
- BCA EDC
- BRI EDC
- Mandiri EDC
- BNI EDC

**Integration Type**: Serial/USB connection to terminal + Host API

```typescript
// EDC Configuration
interface EDCConfig {
  bank: 'BCA' | 'BRI' | 'MANDIRI' | 'BNI';
  merchantId: string;
  terminalId: string;
  connectionType: 'SERIAL' | 'USB' | 'ETHERNET';
  port?: string;                  // COM port for serial
  ipAddress?: string;             // For ethernet connection
  hostUrl: string;                // Bank host API
  apiKey: string;
}

// EDC Adapter
class EDCAdapter implements PaymentGatewayAdapter {
  private terminal: EDCTerminal;

  constructor(private config: EDCConfig) {
    this.terminal = this.initializeTerminal();
  }

  // Process card payment
  async processPayment(request: EDCPaymentRequest): Promise<EDCResponse> {
    // Send sale command to terminal
    const command = this.buildSaleCommand({
      amount: request.amount,
      orderId: request.orderId,
      terminalId: this.config.terminalId
    });

    // Wait for card swipe/tap/insert
    const terminalResponse = await this.terminal.sendCommand(command);

    if (terminalResponse.responseCode !== '00') {
      throw new PaymentError(
        this.mapErrorCode(terminalResponse.responseCode),
        terminalResponse.responseMessage
      );
    }

    return {
      approvalCode: terminalResponse.approvalCode,
      rrn: terminalResponse.rrn,
      cardType: terminalResponse.cardType,
      cardBrand: this.detectCardBrand(terminalResponse.pan),
      maskedCardNumber: this.maskPan(terminalResponse.pan),
      cardHolderName: terminalResponse.cardHolderName,
      terminalId: this.config.terminalId,
      merchantId: this.config.merchantId,
      batchNumber: terminalResponse.batchNumber,
      traceNumber: terminalResponse.traceNumber,
      isPinVerified: terminalResponse.pinVerified,
      isSignatureRequired: terminalResponse.signatureRequired
    };
  }

  // Void transaction
  async voidTransaction(rrn: string, approvalCode: string): Promise<VoidResponse> {
    const command = this.buildVoidCommand({
      rrn,
      approvalCode,
      terminalId: this.config.terminalId
    });

    const response = await this.terminal.sendCommand(command);

    return {
      success: response.responseCode === '00',
      voidApprovalCode: response.approvalCode
    };
  }

  // Settlement (end of day)
  async settlement(): Promise<SettlementResponse> {
    const command = this.buildSettlementCommand({
      terminalId: this.config.terminalId,
      batchNumber: await this.getCurrentBatchNumber()
    });

    const response = await this.terminal.sendCommand(command);

    return {
      batchNumber: response.batchNumber,
      totalTransactions: response.totalCount,
      totalAmount: response.totalAmount,
      settledAt: new Date()
    };
  }

  // Build ISO 8583 message for sale
  private buildSaleCommand(data: SaleData): ISO8583Message {
    return {
      mti: '0200',                // Financial transaction request
      processingCode: '000000',   // Purchase
      amount: data.amount,
      stan: this.generateSTAN(),
      localTime: new Date(),
      merchantType: '5411',
      posEntryMode: '051',        // Chip read
      posConditionCode: '00',
      track2Data: '',             // Will be filled by terminal
      terminalId: data.terminalId,
      merchantId: this.config.merchantId,
      currency: '360'             // IDR
    };
  }
}
```

**EDC Integration Options**:

1. **Direct Terminal Integration** (Recommended for POS):
   ```
   POS App → Serial/USB → EDC Terminal → Bank Host
   ```

2. **Cloud POS Integration**:
   ```
   POS App → Payment Service API → Bank API → EDC Terminal
   ```

**EDC Payment Flow**:
```
1. Cashier selects Card payment in POS
2. POS sends payment request to EDC terminal
3. EDC terminal displays "Insert/Tap/Swipe Card"
4. Customer presents card
5. Terminal reads card data
6. Terminal sends to bank host for authorization
7. Bank host returns approval/decline
8. Terminal prints receipt (merchant copy)
9. Terminal returns result to POS
10. POS completes transaction
```

---

### 4. Cash Payment Handler (Offline POS)

```typescript
// Cash Payment Handler
class CashPaymentHandler implements PaymentHandler {
  async processPayment(request: CashPaymentRequest): Promise<CashPaymentResult> {
    const { orderId, amount, amountTendered, cashierId, sessionId } = request;

    // Validate tendered amount
    if (amountTendered < amount) {
      throw new PaymentError('INSUFFICIENT_AMOUNT', 'Amount tendered is less than total');
    }

    const changeAmount = amountTendered - amount;

    // Record payment
    const payment = await this.createPayment({
      orderId,
      amount,
      method: PaymentMethod.CASH,
      provider: PaymentProvider.INTERNAL,
      channel: PaymentChannel.OFFLINE,
      status: PaymentStatus.PAID,
      cashInfo: {
        amountTendered,
        changeAmount
      },
      paidAt: new Date(),
      createdBy: cashierId
    });

    // Update POS session cash total
    await this.updateSessionCash(sessionId, amount);

    // Trigger cash drawer open
    await this.openCashDrawer(request.terminalId);

    return {
      paymentId: payment.id,
      orderId,
      amount,
      amountTendered,
      changeAmount,
      paidAt: payment.paidAt
    };
  }

  // Cash drawer integration
  private async openCashDrawer(terminalId: string): Promise<void> {
    // ESC/POS command to open cash drawer
    const drawerCommand = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    await this.sendToPrinter(terminalId, drawerCommand);
  }
}
```

---

## Database Schema

```sql
-- Payments
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,

  -- Reference
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_id TEXT,

  -- Payment Details
  method TEXT NOT NULL,
  provider TEXT NOT NULL,
  channel TEXT NOT NULL,

  -- Amount
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate REAL DEFAULT 1.0,
  provider_fee REAL DEFAULT 0,
  platform_fee REAL DEFAULT 0,
  net_amount REAL NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING',

  -- Provider Data
  provider_transaction_id TEXT,
  provider_reference_number TEXT,
  provider_response TEXT,         -- JSON

  -- Method-Specific Data
  card_info TEXT,                 -- JSON (CardInfo)
  qris_info TEXT,                 -- JSON (QRISInfo)
  bank_transfer_info TEXT,        -- JSON (BankTransferInfo)
  ewallet_info TEXT,              -- JSON (EWalletInfo)
  cash_info TEXT,                 -- JSON (CashInfo)

  -- Timestamps
  initiated_at TEXT NOT NULL,
  paid_at TEXT,
  expired_at TEXT,
  settled_at TEXT,
  refunded_at TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1
);

-- Refunds
CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  refund_number TEXT NOT NULL UNIQUE,

  -- Reference
  payment_id TEXT NOT NULL REFERENCES payments(id),
  order_id TEXT NOT NULL,

  -- Amount & Reason
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING',

  -- Provider
  provider_refund_id TEXT,
  provider_response TEXT,         -- JSON

  -- Timestamps
  requested_at TEXT NOT NULL,
  processed_at TEXT,
  completed_at TEXT,

  -- Audit
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment Webhooks (for debugging/audit)
CREATE TABLE payment_webhooks (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,          -- JSON
  signature TEXT,
  is_valid INTEGER DEFAULT 1,
  processed INTEGER DEFAULT 0,
  processed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- EDC Terminals
CREATE TABLE edc_terminals (
  id TEXT PRIMARY KEY,
  terminal_id TEXT NOT NULL UNIQUE,
  bank TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  pos_terminal_id TEXT,           -- Link to POS terminal
  connection_type TEXT NOT NULL,
  connection_config TEXT,         -- JSON
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_settlement_at TEXT,
  last_batch_number TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settlement Records
CREATE TABLE settlements (
  id TEXT PRIMARY KEY,
  settlement_date TEXT NOT NULL,
  provider TEXT NOT NULL,
  terminal_id TEXT,
  batch_number TEXT,

  -- Totals
  total_transactions INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  total_fees REAL NOT NULL,
  net_amount REAL NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING',
  settled_at TEXT,

  -- Bank Reference
  bank_reference TEXT,
  bank_settlement_date TEXT,

  -- Audit
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_date ON payments(paid_at);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_webhooks_provider ON payment_webhooks(provider, created_at);
CREATE INDEX idx_settlements_date ON settlements(settlement_date);
```

---

## API Architecture

### RESTful Endpoints

```typescript
// Payment Creation & Management
POST   /api/payments                       // Create payment request
GET    /api/payments                       // List payments
GET    /api/payments/:id                   // Get payment details
GET    /api/payments/order/:orderId        // Get payments for order
POST   /api/payments/:id/cancel            // Cancel pending payment

// Payment Processing (by method)
POST   /api/payments/process/cash          // Process cash payment (POS)
POST   /api/payments/process/qris          // Generate QRIS
POST   /api/payments/process/edc           // Process EDC payment
POST   /api/payments/process/midtrans      // Create Midtrans transaction

// Status & Verification
GET    /api/payments/:id/status            // Check payment status
POST   /api/payments/:id/verify            // Manual verification

// Refunds
POST   /api/payments/:id/refund            // Request refund
GET    /api/refunds                        // List refunds
GET    /api/refunds/:id                    // Get refund details
POST   /api/refunds/:id/approve            // Approve refund
POST   /api/refunds/:id/process            // Process approved refund

// Webhooks
POST   /api/payments/webhooks/midtrans     // Midtrans webhook
POST   /api/payments/webhooks/qris         // QRIS callback

// Settlement
POST   /api/payments/settlement/edc/:terminalId  // EDC settlement
GET    /api/payments/settlement            // List settlements
GET    /api/payments/settlement/:id        // Settlement details

// Configuration
GET    /api/payments/methods               // Available payment methods
GET    /api/payments/methods/:channel      // Methods for channel
```

### Webhook Handlers

```typescript
// Midtrans Webhook Handler
app.post('/api/payments/webhooks/midtrans', async (c) => {
  const notification = await c.req.json();

  // Log webhook
  await saveWebhook({
    provider: 'MIDTRANS',
    eventType: notification.transaction_status,
    payload: notification
  });

  // Process notification
  const result = await midtransAdapter.handleNotification(notification);

  // Update payment status
  await updatePaymentStatus(result.orderId, result);

  // Publish domain event
  if (result.status === PaymentStatus.PAID) {
    await publishEvent(new PaymentCompleted({
      paymentId: result.paymentId,
      orderId: result.orderId,
      amount: result.amount,
      method: result.method,
      paidAt: result.paidAt
    }));
  }

  return c.json({ status: 'ok' });
});
```

---

## Payment Flows

### 1. Online Payment Flow (Midtrans)

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Customer│     │ Sales/Web   │     │  Payment    │     │  Midtrans   │
│         │     │ Service     │     │  Service    │     │             │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
     │                 │                   │                   │
     │ Place Order     │                   │                   │
     │────────────────▶│                   │                   │
     │                 │                   │                   │
     │                 │ Create Payment    │                   │
     │                 │──────────────────▶│                   │
     │                 │                   │                   │
     │                 │                   │ Create Transaction│
     │                 │                   │──────────────────▶│
     │                 │                   │                   │
     │                 │                   │   Snap Token      │
     │                 │                   │◀──────────────────│
     │                 │                   │                   │
     │                 │   Snap Token      │                   │
     │                 │◀──────────────────│                   │
     │                 │                   │                   │
     │  Snap Popup     │                   │                   │
     │◀────────────────│                   │                   │
     │                 │                   │                   │
     │ Pay via Bank/   │                   │                   │
     │ E-Wallet/Card   │                   │                   │
     │────────────────────────────────────────────────────────▶│
     │                 │                   │                   │
     │                 │                   │     Webhook       │
     │                 │                   │◀──────────────────│
     │                 │                   │                   │
     │                 │  Payment Complete │                   │
     │                 │◀──────────────────│                   │
     │                 │                   │                   │
     │ Order Confirmed │                   │                   │
     │◀────────────────│                   │                   │
     │                 │                   │                   │
```

### 2. POS Cash Payment Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ Cashier │     │    POS      │     │  Payment    │
│         │     │   App       │     │  Service    │
└────┬────┘     └──────┬──────┘     └──────┬──────┘
     │                 │                   │
     │ Create Sale     │                   │
     │────────────────▶│                   │
     │                 │                   │
     │ Select Cash     │                   │
     │────────────────▶│                   │
     │                 │                   │
     │ Enter Tendered  │                   │
     │────────────────▶│                   │
     │                 │                   │
     │                 │ Process Cash      │
     │                 │──────────────────▶│
     │                 │                   │
     │                 │   Payment OK      │
     │                 │   + Change Amount │
     │                 │◀──────────────────│
     │                 │                   │
     │ Cash Drawer     │                   │
     │ Opens           │                   │
     │◀────────────────│                   │
     │                 │                   │
     │ Print Receipt   │                   │
     │◀────────────────│                   │
     │                 │                   │
     │ Give Change     │                   │
     │────────────────▶│                   │
     │                 │                   │
```

### 3. POS QRIS Payment Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Cashier │     │    POS      │     │  Payment    │     │ Customer    │
│         │     │   App       │     │  Service    │     │ (Phone)     │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
     │                 │                   │                   │
     │ Select QRIS     │                   │                   │
     │────────────────▶│                   │                   │
     │                 │                   │                   │
     │                 │ Generate QRIS     │                   │
     │                 │──────────────────▶│                   │
     │                 │                   │                   │
     │                 │   QR Code         │                   │
     │                 │◀──────────────────│                   │
     │                 │                   │                   │
     │ Display QR      │                   │                   │
     │◀────────────────│                   │                   │
     │                 │                   │                   │
     │                 │                   │     Scan QR       │
     │                 │                   │◀──────────────────│
     │                 │                   │                   │
     │                 │                   │     Confirm Pay   │
     │                 │                   │◀──────────────────│
     │                 │                   │                   │
     │                 │   Poll Status     │                   │
     │                 │──────────────────▶│                   │
     │                 │                   │                   │
     │                 │   PAID            │                   │
     │                 │◀──────────────────│                   │
     │                 │                   │                   │
     │ Payment OK      │                   │                   │
     │◀────────────────│                   │                   │
     │                 │                   │                   │
     │ Print Receipt   │                   │                   │
     │◀────────────────│                   │                   │
```

### 4. POS EDC Payment Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Cashier │     │    POS      │     │    EDC      │     │  Bank Host  │
│         │     │   App       │     │  Terminal   │     │             │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
     │                 │                   │                   │
     │ Select Card     │                   │                   │
     │────────────────▶│                   │                   │
     │                 │                   │                   │
     │                 │ Sale Request      │                   │
     │                 │──────────────────▶│                   │
     │                 │                   │                   │
     │                 │                   │ Display Amount    │
     │◀────────────────────────────────────│                   │
     │                 │                   │                   │
     │ Customer Taps/  │                   │                   │
     │ Inserts Card    │                   │                   │
     │─────────────────────────────────────│                   │
     │                 │                   │                   │
     │                 │                   │ Authorization     │
     │                 │                   │──────────────────▶│
     │                 │                   │                   │
     │                 │                   │   Approved        │
     │                 │                   │◀──────────────────│
     │                 │                   │                   │
     │                 │   Response        │                   │
     │                 │◀──────────────────│                   │
     │                 │                   │                   │
     │ Payment OK      │                   │                   │
     │◀────────────────│                   │                   │
     │                 │                   │                   │
     │ Print Receipts  │                   │                   │
     │◀────────────────│                   │                   │
```

---

## Reconciliation & Settlement

### Daily Reconciliation Process

```typescript
// Reconciliation Job (runs daily at 00:30)
async function dailyReconciliation(date: Date): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    date,
    providers: []
  };

  // 1. Midtrans Reconciliation
  const midtransReport = await reconcileMidtrans(date);
  report.providers.push(midtransReport);

  // 2. QRIS Reconciliation
  const qrisReport = await reconcileQRIS(date);
  report.providers.push(qrisReport);

  // 3. EDC Reconciliation (per terminal)
  for (const terminal of edcTerminals) {
    const edcReport = await reconcileEDC(terminal, date);
    report.providers.push(edcReport);
  }

  // 4. Cash Reconciliation (from POS sessions)
  const cashReport = await reconcileCash(date);
  report.providers.push(cashReport);

  // 5. Identify discrepancies
  const discrepancies = identifyDiscrepancies(report);

  // 6. Generate alerts for discrepancies
  if (discrepancies.length > 0) {
    await sendDiscrepancyAlerts(discrepancies);
  }

  // 7. Store report
  await saveReconciliationReport(report);

  return report;
}

interface ReconciliationReport {
  date: Date;
  providers: ProviderReconciliation[];
}

interface ProviderReconciliation {
  provider: string;
  terminalId?: string;
  systemTransactions: number;
  systemAmount: number;
  providerTransactions: number;
  providerAmount: number;
  matched: number;
  unmatched: number;
  discrepancyAmount: number;
  discrepancies: Discrepancy[];
}
```

### EDC Settlement Process

```typescript
// EDC Settlement (end of day per terminal)
async function edcSettlement(terminalId: string): Promise<SettlementResult> {
  // 1. Get terminal
  const terminal = await getEDCTerminal(terminalId);

  // 2. Get unsettled transactions from system
  const systemTransactions = await getUnsettledEDCTransactions(terminalId);

  // 3. Send settlement command to terminal
  const edcAdapter = new EDCAdapter(terminal.config);
  const settlementResponse = await edcAdapter.settlement();

  // 4. Compare system vs terminal totals
  const systemTotal = systemTransactions.reduce((sum, t) => sum + t.amount, 0);

  if (settlementResponse.totalAmount !== systemTotal) {
    // Discrepancy found
    await createDiscrepancyAlert({
      type: 'SETTLEMENT_MISMATCH',
      terminalId,
      systemAmount: systemTotal,
      terminalAmount: settlementResponse.totalAmount,
      difference: systemTotal - settlementResponse.totalAmount
    });
  }

  // 5. Mark transactions as settled
  await markTransactionsSettled(systemTransactions, settlementResponse.batchNumber);

  // 6. Create settlement record
  const settlement = await createSettlement({
    provider: terminal.bank,
    terminalId,
    batchNumber: settlementResponse.batchNumber,
    totalTransactions: settlementResponse.totalTransactions,
    totalAmount: settlementResponse.totalAmount,
    status: 'COMPLETED',
    settledAt: new Date()
  });

  return settlement;
}
```

---

## Security & Compliance

### PCI DSS Compliance

```typescript
// Card data handling rules
const PCICompliance = {
  // NEVER store full card number
  // NEVER store CVV
  // NEVER store PIN

  // Allowed to store (masked)
  maskedPAN: (pan: string) => {
    // Show first 6, last 4
    return pan.slice(0, 6) + '******' + pan.slice(-4);
  },

  // Tokenization for recurring
  useTokenization: true,

  // TLS 1.2+ required
  minTLSVersion: '1.2',

  // Encryption at rest
  encryptSensitiveData: true
};
```

### Webhook Signature Verification

```typescript
// Midtrans signature verification
function verifyMidtransSignature(notification: MidtransNotification): boolean {
  const { order_id, status_code, gross_amount, signature_key } = notification;

  const expectedSignature = sha512(
    order_id + status_code + gross_amount + serverKey
  );

  return signature_key === expectedSignature;
}

// QRIS signature verification
function verifyQRISSignature(notification: QRISNotification, signature: string): boolean {
  const payload = JSON.stringify(notification);
  const expectedSignature = hmacSHA256(payload, secretKey);
  return signature === expectedSignature;
}
```

### Fraud Detection

```typescript
// Basic fraud detection rules
const fraudRules = {
  // Velocity checks
  maxTransactionsPerHour: 10,
  maxAmountPerDay: 50000000,  // 50 juta

  // Card rules
  blockCountries: ['XX', 'YY'],
  require3DS: true,
  requireCVV: true,

  // Suspicious patterns
  flagMultipleFailedAttempts: 3,
  flagAmountAbove: 10000000,
  flagNewCustomerHighAmount: 5000000
};

async function checkFraud(payment: Payment): Promise<FraudCheckResult> {
  const risks: string[] = [];

  // Check velocity
  const hourlyCount = await getHourlyTransactionCount(payment.customerId);
  if (hourlyCount > fraudRules.maxTransactionsPerHour) {
    risks.push('VELOCITY_EXCEEDED');
  }

  // Check daily amount
  const dailyAmount = await getDailyTransactionAmount(payment.customerId);
  if (dailyAmount + payment.amount > fraudRules.maxAmountPerDay) {
    risks.push('DAILY_LIMIT_EXCEEDED');
  }

  // Check failed attempts
  const failedAttempts = await getRecentFailedAttempts(payment.customerId);
  if (failedAttempts >= fraudRules.flagMultipleFailedAttempts) {
    risks.push('MULTIPLE_FAILED_ATTEMPTS');
  }

  return {
    approved: risks.length === 0,
    risks,
    requiresReview: risks.length > 0 && risks.length < 3
  };
}
```

---

## Merchant Discount Rate (MDR)

### Fee Structure

| Provider | Method | MDR | Min Fee | Max Fee |
|----------|--------|-----|---------|---------|
| Midtrans | Credit Card | 2.9% | Rp 2,000 | - |
| Midtrans | GoPay | 2.0% | Rp 1,000 | - |
| Midtrans | ShopeePay | 1.5% | Rp 1,000 | - |
| Midtrans | Bank Transfer | Rp 4,000 | - | - |
| Midtrans | QRIS | 0.7% | - | - |
| QRIS Direct | QRIS | 0.7% | - | - |
| EDC BCA | Debit | 0.5% | - | Rp 50,000 |
| EDC BCA | Credit | 2.0% | - | - |
| Cash | - | 0% | - | - |

### Fee Calculation

```typescript
function calculateFees(amount: number, method: PaymentMethod, provider: PaymentProvider): PaymentFees {
  const feeConfig = getFeeConfig(method, provider);

  let providerFee = 0;

  if (feeConfig.percentageFee) {
    providerFee = amount * (feeConfig.percentageFee / 100);
  }

  if (feeConfig.flatFee) {
    providerFee = Math.max(providerFee, feeConfig.flatFee);
  }

  if (feeConfig.minFee) {
    providerFee = Math.max(providerFee, feeConfig.minFee);
  }

  if (feeConfig.maxFee) {
    providerFee = Math.min(providerFee, feeConfig.maxFee);
  }

  return {
    providerFee,
    platformFee: 0,  // Kidkazz platform fee (if any)
    netAmount: amount - providerFee
  };
}
```

---

## Paperless Invoice & Receipt Delivery (sent.dm)

### Overview

Kidkazz uses a **paperless approach** for invoices and receipts. Instead of printing physical receipts, we deliver digital documents through the customer's preferred messaging channel using **sent.dm** service.

**Supported Channels**:
- WhatsApp
- Telegram
- iMessage (Apple)
- SMS (fallback)
- Email (fallback)

### sent.dm Integration

```typescript
// sent.dm Configuration
interface SentDMConfig {
  apiKey: string;
  apiSecret: string;
  senderId: string;
  webhookUrl: string;
  defaultChannel: 'whatsapp' | 'telegram' | 'imessage' | 'sms' | 'email';
}

// sent.dm Adapter
class SentDMAdapter implements NotificationAdapter {
  constructor(private config: SentDMConfig) {}

  // Auto-detect best channel based on phone number
  async detectChannel(phoneNumber: string): Promise<MessageChannel> {
    const response = await this.client.detectChannel({
      phoneNumber,
      preferredOrder: ['whatsapp', 'telegram', 'imessage', 'sms']
    });

    return response.availableChannel;
  }

  // Send invoice/receipt
  async sendInvoice(request: SendInvoiceRequest): Promise<SendResult> {
    const channel = await this.detectChannel(request.phoneNumber);

    const message = this.buildInvoiceMessage(request.invoice, channel);

    return await this.client.send({
      to: request.phoneNumber,
      channel,
      template: 'invoice',
      templateData: {
        customerName: request.customerName,
        orderNumber: request.orderNumber,
        items: request.items,
        totalAmount: this.formatCurrency(request.totalAmount),
        paymentMethod: request.paymentMethod,
        paidAt: this.formatDateTime(request.paidAt),
        invoiceUrl: request.invoiceUrl  // Link to digital invoice
      },
      attachments: request.includePDF ? [{
        type: 'document',
        url: request.invoicePdfUrl,
        filename: `Invoice-${request.orderNumber}.pdf`
      }] : []
    });
  }

  // Send payment confirmation
  async sendPaymentConfirmation(request: PaymentConfirmationRequest): Promise<SendResult> {
    const channel = await this.detectChannel(request.phoneNumber);

    return await this.client.send({
      to: request.phoneNumber,
      channel,
      template: 'payment_confirmation',
      templateData: {
        customerName: request.customerName,
        orderNumber: request.orderNumber,
        amount: this.formatCurrency(request.amount),
        paymentMethod: request.paymentMethod,
        transactionId: request.transactionId,
        receiptUrl: request.receiptUrl
      }
    });
  }

  // Send OTP for verification
  async sendOTP(request: OTPRequest): Promise<SendResult> {
    const channel = await this.detectChannel(request.phoneNumber);

    return await this.client.send({
      to: request.phoneNumber,
      channel,
      template: 'otp',
      templateData: {
        otp: request.otp,
        expiryMinutes: request.expiryMinutes,
        purpose: request.purpose  // 'login', 'payment', 'registration'
      }
    });
  }
}
```

### Message Templates

```typescript
// Invoice Template (WhatsApp)
const INVOICE_TEMPLATE_WHATSAPP = `
🧾 *Invoice from Kidkazz*

Order: #{{orderNumber}}
Date: {{paidAt}}

{{#items}}
• {{name}} x{{quantity}} - {{price}}
{{/items}}

─────────────────
*Total: {{totalAmount}}*
Payment: {{paymentMethod}}

📄 View invoice: {{invoiceUrl}}

Thank you for shopping with Kidkazz! 🙏
`;

// Payment Confirmation Template
const PAYMENT_CONFIRMATION_TEMPLATE = `
✅ *Payment Received*

Hi {{customerName}},

We've received your payment of *{{amount}}* for order #{{orderNumber}}.

Transaction ID: {{transactionId}}
Method: {{paymentMethod}}

📄 Receipt: {{receiptUrl}}

Your order is being processed!
`;

// OTP Template
const OTP_TEMPLATE = `
🔐 *Kidkazz Verification*

Your OTP code is: *{{otp}}*

Valid for {{expiryMinutes}} minutes.

Do not share this code with anyone.
`;
```

### Paperless Receipt Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PAPERLESS RECEIPT FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐│
│  │   Payment    │────▶│   Payment    │────▶│  Notification │────▶│  sent.dm   ││
│  │   Completed  │     │   Service    │     │   Service     │     │            ││
│  └──────────────┘     └──────────────┘     └──────────────┘     └─────┬──────┘│
│                                                                        │        │
│                       ┌────────────────────────────────────────────────┘        │
│                       │                                                          │
│                       ▼                                                          │
│         ┌─────────────────────────────────────────────────────────┐            │
│         │                  CHANNEL DETECTION                       │            │
│         │                                                          │            │
│         │    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐ │            │
│         │    │ WhatsApp │  │ Telegram │  │ iMessage │  │  SMS  │ │            │
│         │    │    ✓     │  │    ✓     │  │    ✓     │  │   ✓   │ │            │
│         │    └──────────┘  └──────────┘  └──────────┘  └───────┘ │            │
│         │                                                          │            │
│         │    Priority: WhatsApp > Telegram > iMessage > SMS       │            │
│         └─────────────────────────────────────────────────────────┘            │
│                                                                                  │
│                       │                                                          │
│                       ▼                                                          │
│              ┌──────────────┐                                                   │
│              │   Customer   │                                                   │
│              │   Receives   │                                                   │
│              │   Receipt    │                                                   │
│              └──────────────┘                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### POS Paperless Option

```typescript
// POS Receipt Options
interface POSReceiptOptions {
  printReceipt: boolean;          // Physical receipt (optional)
  sendDigital: boolean;           // Digital receipt via sent.dm
  customerPhone?: string;         // For digital receipt
  customerEmail?: string;         // Fallback for digital
}

// POS can offer both options
async function completeTransaction(order: Order, options: POSReceiptOptions) {
  // Always send digital if customer phone provided
  if (options.sendDigital && options.customerPhone) {
    await notificationService.sendReceipt({
      phoneNumber: options.customerPhone,
      orderNumber: order.orderNumber,
      items: order.items,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod
    });
  }

  // Print physical only if explicitly requested
  if (options.printReceipt) {
    await printReceipt(order);
  }
}
```

---

## Related Documents

- [Payment Service Business Rules](./BUSINESS_RULES.md)
- [Payment Service Implementation Plan](./PAYMENT_IMPLEMENTATION_PLAN.md)
- [Notification Service Architecture](../notification/NOTIFICATION_SERVICE_ARCHITECTURE.md)
- [Sales Service Integration](../sales/SALES_SERVICE_ARCHITECTURE.md)
- [Accounting Service Integration](../accounting/ACCOUNTING_SERVICE_ARCHITECTURE.md)
- [Saga Pattern Documentation](../../architecture/SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md)
