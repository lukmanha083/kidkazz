# Payment Service Business Rules

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase

---

## Overview

This document defines the business rules for the Payment Service in the Kidkazz omnichannel ERP system. These rules govern payment processing, validation, refunds, settlements, and security compliance.

---

## Table of Contents

1. [Payment Creation Rules](#payment-creation-rules)
2. [Payment Method Rules](#payment-method-rules)
3. [Payment Channel Rules](#payment-channel-rules)
4. [Provider-Specific Rules](#provider-specific-rules)
5. [Refund Rules](#refund-rules)
6. [Settlement & Reconciliation Rules](#settlement--reconciliation-rules)
7. [Fee Calculation Rules](#fee-calculation-rules)
8. [Security & Compliance Rules](#security--compliance-rules)
9. [Paperless Receipt Rules](#paperless-receipt-rules)
10. [Integration Rules](#integration-rules)

---

## Payment Creation Rules

### Rule 1: Payment-Order Association

**Statement**: Every payment MUST be associated with exactly one order.

**Rationale**: Payments cannot exist independently; they are always tied to a sales order for traceability and accounting purposes.

```typescript
interface PaymentCreationRule {
  validate(payment: Payment): boolean {
    if (!payment.orderId || payment.orderId.trim() === '') {
      throw new BusinessRuleError('PAYMENT_001', 'Payment must have an associated order');
    }
    return true;
  }
}
```

**Exception**: None.

---

### Rule 2: Payment Amount Validation

**Statement**: Payment amount MUST be greater than zero and MUST NOT exceed the order total amount minus any previous payments.

**Rationale**: Prevents invalid payments and overpayments.

```typescript
interface PaymentAmountValidation {
  validate(payment: Payment, order: Order, existingPayments: Payment[]): boolean {
    // Must be positive
    if (payment.amount <= 0) {
      throw new BusinessRuleError('PAYMENT_002', 'Payment amount must be greater than zero');
    }

    // Calculate remaining balance
    const totalPaid = existingPayments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.amount, 0);

    const remainingBalance = order.totalAmount - totalPaid;

    if (payment.amount > remainingBalance) {
      throw new BusinessRuleError('PAYMENT_003', 'Payment amount exceeds remaining balance');
    }

    return true;
  }
}
```

**Exception**: Split payments where total may temporarily exceed during processing.

---

### Rule 3: Single Pending Payment Per Order

**Statement**: An order can have only ONE pending payment at a time.

**Rationale**: Prevents duplicate payment attempts and confusion.

```typescript
interface SinglePendingPaymentRule {
  validate(orderId: string, existingPayments: Payment[]): boolean {
    const pendingPayments = existingPayments.filter(
      p => p.orderId === orderId && p.status === PaymentStatus.PENDING
    );

    if (pendingPayments.length > 0) {
      throw new BusinessRuleError(
        'PAYMENT_004',
        'Order already has a pending payment. Cancel it before creating new one.'
      );
    }

    return true;
  }
}
```

**Exception**: POS quick sales where payment is immediately processed.

---

### Rule 4: Payment Number Format

**Statement**: Payment numbers MUST follow format: `PAY-{YYYYMMDD}-{SEQUENCE}`.

**Rationale**: Standardized numbering for tracking and reconciliation.

```typescript
function generatePaymentNumber(date: Date): string {
  const dateStr = formatDate(date, 'YYYYMMDD');
  const sequence = await getNextSequence('payment', dateStr);
  return `PAY-${dateStr}-${sequence.toString().padStart(6, '0')}`;
}

// Example: PAY-20250116-000001
```

---

### Rule 5: Payment Currency

**Statement**: All payments MUST be processed in Indonesian Rupiah (IDR).

**Rationale**: Single currency simplifies accounting and prevents exchange rate issues.

```typescript
const SUPPORTED_CURRENCIES = ['IDR'] as const;

interface CurrencyRule {
  validate(currency: string): boolean {
    if (!SUPPORTED_CURRENCIES.includes(currency as any)) {
      throw new BusinessRuleError('PAYMENT_005', 'Only IDR currency is supported');
    }
    return true;
  }
}
```

**Exception**: Future support for USD/SGD for international wholesale may be added.

---

## Payment Method Rules

### Rule 6: Payment Method Availability by Channel

**Statement**: Available payment methods MUST be restricted based on sales channel.

**Matrix**:

| Method | ERP Dashboard | POS | Web Retail | Web Wholesale | Mobile Retail | Live Stream |
|--------|---------------|-----|------------|---------------|---------------|-------------|
| Cash | Yes | Yes | No | No | No | No |
| QRIS (Offline) | No | Yes | No | No | No | No |
| QRIS (Online) | No | No | Yes | No | Yes | Yes |
| EDC Debit | No | Yes | No | No | No | No |
| EDC Credit | No | Yes | No | No | No | No |
| Bank Transfer | Yes | No | Yes | Yes | Yes | Yes |
| GoPay | No | No | Yes | No | Yes | Yes |
| ShopeePay | No | No | Yes | No | Yes | Yes |
| OVO | No | No | Yes | No | Yes | Yes |
| DANA | No | No | Yes | No | Yes | Yes |
| Credit Card | Yes | No | Yes | No | Yes | Yes |
| Credit Terms | No | No | No | Yes | No | No |

```typescript
function getAvailablePaymentMethods(channel: SalesChannel): PaymentMethod[] {
  const methodMap: Record<SalesChannel, PaymentMethod[]> = {
    [SalesChannel.ERP_DASHBOARD]: [
      PaymentMethod.CASH,
      PaymentMethod.BANK_TRANSFER_BCA,
      PaymentMethod.BANK_TRANSFER_BNI,
      PaymentMethod.BANK_TRANSFER_BRI,
      PaymentMethod.CREDIT_CARD
    ],
    [SalesChannel.POS]: [
      PaymentMethod.CASH,
      PaymentMethod.QRIS,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.CREDIT_CARD
    ],
    [SalesChannel.WEB_RETAIL]: [
      PaymentMethod.QRIS,
      PaymentMethod.BANK_TRANSFER_BCA,
      PaymentMethod.BANK_TRANSFER_BNI,
      PaymentMethod.BANK_TRANSFER_BRI,
      PaymentMethod.BANK_TRANSFER_MANDIRI,
      PaymentMethod.GOPAY,
      PaymentMethod.SHOPEEPAY,
      PaymentMethod.OVO,
      PaymentMethod.DANA,
      PaymentMethod.CREDIT_CARD_VISA,
      PaymentMethod.CREDIT_CARD_MASTERCARD
    ],
    [SalesChannel.WEB_WHOLESALE]: [
      PaymentMethod.BANK_TRANSFER_BCA,
      PaymentMethod.BANK_TRANSFER_BNI,
      PaymentMethod.BANK_TRANSFER_BRI,
      PaymentMethod.CREDIT_TERMS
    ],
    // ... mobile retail, live stream similar to web retail
  };

  return methodMap[channel] || [];
}
```

---

### Rule 7: Cash Payment Change Calculation

**Statement**: For cash payments, change amount MUST be calculated as (Amount Tendered - Order Total) and MUST be non-negative.

**Rationale**: Ensures correct change is given to customer.

```typescript
interface CashPaymentRule {
  validate(amountTendered: number, orderTotal: number): CashValidationResult {
    if (amountTendered < orderTotal) {
      throw new BusinessRuleError(
        'PAYMENT_006',
        `Insufficient amount. Need ${orderTotal}, received ${amountTendered}`
      );
    }

    return {
      isValid: true,
      changeAmount: amountTendered - orderTotal
    };
  }
}
```

---

### Rule 8: Split Payment Support

**Statement**: An order MAY be paid using multiple payment methods (split payment).

**Constraints**:
- Total of all payments MUST equal order total
- Each partial payment MUST follow its method's validation rules
- Only supported for POS channel

```typescript
interface SplitPaymentRule {
  validate(order: Order, payments: Payment[]): boolean {
    const totalPaid = payments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid !== order.totalAmount) {
      throw new BusinessRuleError(
        'PAYMENT_007',
        `Split payment total ${totalPaid} does not match order total ${order.totalAmount}`
      );
    }

    return true;
  }
}
```

---

### Rule 9: Credit Terms for Wholesale Only

**Statement**: Credit terms (delayed payment) MUST only be available for wholesale customers with approved credit limits.

**Rationale**: Credit risk management for B2B transactions.

```typescript
interface CreditTermsRule {
  async validate(customerId: string, amount: number): Promise<boolean> {
    const customer = await getBusinessPartner(customerId);

    // Must be wholesale customer
    if (customer.type !== BusinessPartnerType.WHOLESALE) {
      throw new BusinessRuleError('PAYMENT_008', 'Credit terms only for wholesale customers');
    }

    // Must have approved credit
    if (!customer.creditApproved) {
      throw new BusinessRuleError('PAYMENT_009', 'Customer not approved for credit');
    }

    // Check credit limit
    const currentOutstanding = await getOutstandingReceivables(customerId);
    const availableCredit = customer.creditLimit - currentOutstanding;

    if (amount > availableCredit) {
      throw new BusinessRuleError(
        'PAYMENT_010',
        `Amount ${amount} exceeds available credit ${availableCredit}`
      );
    }

    return true;
  }
}
```

---

## Payment Channel Rules

### Rule 10: Online vs Offline Channel Classification

**Statement**: Payments MUST be classified as ONLINE or OFFLINE based on sales channel.

| Sales Channel | Payment Channel |
|---------------|-----------------|
| ERP Dashboard | OFFLINE |
| POS | OFFLINE |
| Web Retail | ONLINE |
| Web Wholesale | ONLINE |
| Mobile Retail | ONLINE |
| Live Streaming | ONLINE |

```typescript
function determinePaymentChannel(salesChannel: SalesChannel): PaymentChannel {
  const offlineChannels = [SalesChannel.ERP_DASHBOARD, SalesChannel.POS];
  return offlineChannels.includes(salesChannel)
    ? PaymentChannel.OFFLINE
    : PaymentChannel.ONLINE;
}
```

---

### Rule 11: Online Payment Expiry

**Statement**: Online payments MUST expire after a defined period if not completed.

**Expiry Times**:
- Bank Transfer (Virtual Account): 24 hours
- E-Wallet (GoPay, etc.): 15 minutes
- QRIS Online: 15 minutes
- Credit Card: 30 minutes

```typescript
const PAYMENT_EXPIRY_MINUTES: Record<PaymentMethod, number> = {
  [PaymentMethod.BANK_TRANSFER_BCA]: 1440,     // 24 hours
  [PaymentMethod.BANK_TRANSFER_BNI]: 1440,
  [PaymentMethod.BANK_TRANSFER_BRI]: 1440,
  [PaymentMethod.BANK_TRANSFER_MANDIRI]: 1440,
  [PaymentMethod.GOPAY]: 15,
  [PaymentMethod.SHOPEEPAY]: 15,
  [PaymentMethod.OVO]: 15,
  [PaymentMethod.DANA]: 15,
  [PaymentMethod.QRIS]: 15,
  [PaymentMethod.CREDIT_CARD]: 30
};

function calculateExpiryTime(method: PaymentMethod): Date {
  const minutes = PAYMENT_EXPIRY_MINUTES[method] || 60;
  return new Date(Date.now() + minutes * 60 * 1000);
}
```

---

### Rule 12: Offline Payment Immediate Completion

**Statement**: Offline payments (Cash, EDC, QRIS POS) MUST be marked as PAID immediately upon successful processing.

**Rationale**: POS transactions require immediate confirmation for customer service.

```typescript
interface OfflinePaymentRule {
  process(payment: Payment): Payment {
    if (payment.channel === PaymentChannel.OFFLINE) {
      // No pending state for offline - either PAID or FAILED
      payment.status = PaymentStatus.PAID;
      payment.paidAt = new Date();
    }
    return payment;
  }
}
```

---

## Provider-Specific Rules

### Rule 13: Midtrans Webhook Validation

**Statement**: All Midtrans webhooks MUST have valid signatures before processing.

**Rationale**: Prevents fraudulent webhook calls.

```typescript
interface MidtransWebhookRule {
  validate(notification: MidtransNotification, serverKey: string): boolean {
    const expectedSignature = sha512(
      notification.order_id +
      notification.status_code +
      notification.gross_amount +
      serverKey
    );

    if (notification.signature_key !== expectedSignature) {
      throw new SecurityError('PAYMENT_011', 'Invalid Midtrans signature');
    }

    return true;
  }
}
```

---

### Rule 14: QRIS QR Code Generation

**Statement**: Dynamic QRIS codes MUST include order ID and expiry time in payload.

**Standard**: EMVCo QRIS specification with BI-SNAP compliance.

```typescript
interface QRISGenerationRule {
  generate(order: Order): QRISPayload {
    return {
      payloadFormatIndicator: '01',
      pointOfInitiation: '12',  // Dynamic QR
      merchantAccountInfo: {
        tag: '26',
        globalIdentifier: 'ID.CO.QRIS.WWW',
        merchantId: config.nmid,
        merchantName: config.merchantName.substring(0, 25)
      },
      transactionAmount: order.totalAmount,
      countryCode: 'ID',
      currency: '360',  // IDR
      additionalData: {
        referenceLabel: order.orderNumber,
        terminalLabel: order.terminalId
      },
      expiryMinutes: 15
    };
  }
}
```

---

### Rule 15: EDC Response Code Handling

**Statement**: EDC terminal response codes MUST be mapped to appropriate payment statuses.

```typescript
const EDC_RESPONSE_CODES: Record<string, { status: PaymentStatus; message: string }> = {
  '00': { status: PaymentStatus.PAID, message: 'Approved' },
  '01': { status: PaymentStatus.FAILED, message: 'Refer to card issuer' },
  '03': { status: PaymentStatus.FAILED, message: 'Invalid merchant' },
  '05': { status: PaymentStatus.FAILED, message: 'Do not honor' },
  '12': { status: PaymentStatus.FAILED, message: 'Invalid transaction' },
  '13': { status: PaymentStatus.FAILED, message: 'Invalid amount' },
  '14': { status: PaymentStatus.FAILED, message: 'Invalid card number' },
  '51': { status: PaymentStatus.FAILED, message: 'Insufficient funds' },
  '54': { status: PaymentStatus.FAILED, message: 'Expired card' },
  '55': { status: PaymentStatus.FAILED, message: 'Incorrect PIN' },
  '61': { status: PaymentStatus.FAILED, message: 'Exceeds withdrawal limit' },
  '91': { status: PaymentStatus.FAILED, message: 'Issuer unavailable' },
  '96': { status: PaymentStatus.FAILED, message: 'System malfunction' }
};

function mapEDCResponse(responseCode: string): PaymentResult {
  const mapping = EDC_RESPONSE_CODES[responseCode];
  if (!mapping) {
    return { status: PaymentStatus.FAILED, message: 'Unknown error' };
  }
  return mapping;
}
```

---

### Rule 16: EDC Signature Requirement

**Statement**: EDC transactions above threshold amount MUST require customer signature.

**Threshold**: Rp 1,000,000 for debit cards, Rp 500,000 for credit cards.

```typescript
const SIGNATURE_THRESHOLD = {
  DEBIT_CARD: 1000000,
  CREDIT_CARD: 500000
};

function isSignatureRequired(amount: number, cardType: 'DEBIT' | 'CREDIT'): boolean {
  const threshold = cardType === 'DEBIT'
    ? SIGNATURE_THRESHOLD.DEBIT_CARD
    : SIGNATURE_THRESHOLD.CREDIT_CARD;

  return amount >= threshold;
}
```

---

## Refund Rules

### Rule 17: Refund Time Limit

**Statement**: Refunds MUST be requested within specific time limits based on payment method.

| Payment Method | Refund Time Limit |
|----------------|-------------------|
| Cash | Same day (within POS session) |
| QRIS | 7 days |
| EDC Debit | Same day (void only) |
| EDC Credit | 30 days |
| Bank Transfer | 30 days |
| E-Wallet | 7 days |
| Credit Card | 30 days |

```typescript
const REFUND_TIME_LIMITS_DAYS: Record<PaymentMethod, number> = {
  [PaymentMethod.CASH]: 0,  // Same day only
  [PaymentMethod.QRIS]: 7,
  [PaymentMethod.DEBIT_CARD]: 0,  // Void only
  [PaymentMethod.CREDIT_CARD]: 30,
  [PaymentMethod.GOPAY]: 7,
  [PaymentMethod.SHOPEEPAY]: 7,
  [PaymentMethod.BANK_TRANSFER_BCA]: 30,
  // ... other methods
};

function validateRefundTimeLimit(payment: Payment): boolean {
  const limitDays = REFUND_TIME_LIMITS_DAYS[payment.method] || 0;
  const maxRefundDate = addDays(payment.paidAt, limitDays);

  if (new Date() > maxRefundDate) {
    throw new BusinessRuleError(
      'PAYMENT_012',
      `Refund time limit exceeded. Max refund date was ${maxRefundDate}`
    );
  }

  return true;
}
```

---

### Rule 18: Refund Amount Validation

**Statement**: Refund amount MUST NOT exceed original payment amount minus any previous refunds.

```typescript
interface RefundAmountRule {
  validate(payment: Payment, refundAmount: number, existingRefunds: Refund[]): boolean {
    const totalRefunded = existingRefunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + r.amount, 0);

    const maxRefundable = payment.amount - totalRefunded;

    if (refundAmount > maxRefundable) {
      throw new BusinessRuleError(
        'PAYMENT_013',
        `Refund amount ${refundAmount} exceeds refundable amount ${maxRefundable}`
      );
    }

    return true;
  }
}
```

---

### Rule 19: Refund Approval Workflow

**Statement**: Refunds above threshold amount MUST require manager approval.

**Thresholds**:
- Automatic: < Rp 500,000
- Manager Approval: >= Rp 500,000

```typescript
const REFUND_APPROVAL_THRESHOLD = 500000;

interface RefundApprovalRule {
  determineWorkflow(refundAmount: number): RefundWorkflow {
    if (refundAmount >= REFUND_APPROVAL_THRESHOLD) {
      return RefundWorkflow.REQUIRES_APPROVAL;
    }
    return RefundWorkflow.AUTO_APPROVE;
  }

  async requestApproval(refund: Refund, requestedBy: string): Promise<void> {
    // Create approval request for manager
    await createApprovalRequest({
      type: 'REFUND',
      referenceId: refund.id,
      amount: refund.amount,
      requestedBy,
      requiredRole: 'MANAGER'
    });
  }
}
```

---

### Rule 20: Cash Refund Restriction

**Statement**: Cash refunds MUST only be processed during active POS session and within same business day.

**Rationale**: Cash drawer reconciliation must match at end of day.

```typescript
interface CashRefundRule {
  async validate(payment: Payment, session: POSSession): Promise<boolean> {
    // Must be same day
    if (!isSameDay(payment.paidAt, new Date())) {
      throw new BusinessRuleError(
        'PAYMENT_014',
        'Cash refunds only allowed on same day as purchase'
      );
    }

    // Session must be active
    if (session.status !== POSSessionStatus.ACTIVE) {
      throw new BusinessRuleError(
        'PAYMENT_015',
        'Cash refunds require active POS session'
      );
    }

    // Must have sufficient cash in drawer
    if (session.cashTotal < payment.amount) {
      throw new BusinessRuleError(
        'PAYMENT_016',
        'Insufficient cash in drawer for refund'
      );
    }

    return true;
  }
}
```

---

### Rule 21: EDC Void vs Refund

**Statement**: For EDC payments, same-day reversals MUST use VOID; after settlement MUST use REFUND.

```typescript
interface EDCReversalRule {
  determineReversalType(payment: Payment): 'VOID' | 'REFUND' {
    // Check if batch is settled
    const isSettled = payment.settledAt !== null;
    const isSameDay = isSameBusinessDay(payment.paidAt, new Date());

    if (!isSettled && isSameDay) {
      return 'VOID';  // Can void before settlement
    }

    if (payment.method === PaymentMethod.DEBIT_CARD && isSettled) {
      throw new BusinessRuleError(
        'PAYMENT_017',
        'Debit card refunds not supported after settlement'
      );
    }

    return 'REFUND';
  }
}
```

---

## Settlement & Reconciliation Rules

### Rule 22: EDC Daily Settlement

**Statement**: EDC terminals MUST be settled daily at end of business.

**Rationale**: Bank requires daily batch closing for fund transfer.

```typescript
interface EDCSettlementRule {
  async validateEndOfDay(terminalId: string): Promise<void> {
    const terminal = await getEDCTerminal(terminalId);
    const unsettledCount = await getUnsettledTransactionCount(terminalId);

    if (unsettledCount > 0) {
      // Auto-settle at 11 PM
      const currentHour = new Date().getHours();
      if (currentHour >= 23) {
        await performSettlement(terminalId);
      } else {
        // Warning alert
        await sendAlert({
          type: 'SETTLEMENT_PENDING',
          message: `Terminal ${terminalId} has ${unsettledCount} unsettled transactions`
        });
      }
    }
  }
}
```

---

### Rule 23: Reconciliation Discrepancy Threshold

**Statement**: Reconciliation discrepancies above threshold MUST trigger alerts.

**Thresholds**:
- Warning: > Rp 10,000
- Critical: > Rp 100,000

```typescript
const DISCREPANCY_THRESHOLDS = {
  WARNING: 10000,
  CRITICAL: 100000
};

interface ReconciliationRule {
  evaluate(systemAmount: number, providerAmount: number): ReconciliationResult {
    const discrepancy = Math.abs(systemAmount - providerAmount);

    if (discrepancy > DISCREPANCY_THRESHOLDS.CRITICAL) {
      return {
        status: 'CRITICAL',
        requiresInvestigation: true,
        discrepancyAmount: discrepancy
      };
    }

    if (discrepancy > DISCREPANCY_THRESHOLDS.WARNING) {
      return {
        status: 'WARNING',
        requiresInvestigation: false,
        discrepancyAmount: discrepancy
      };
    }

    return {
      status: 'OK',
      requiresInvestigation: false,
      discrepancyAmount: discrepancy
    };
  }
}
```

---

### Rule 24: POS Session Cash Reconciliation

**Statement**: POS session cash total MUST be reconciled before session close.

```typescript
interface POSCashReconciliationRule {
  validate(session: POSSession, physicalCount: number): CashReconciliationResult {
    const expectedCash = session.openingCash + session.cashIn - session.cashOut;
    const variance = physicalCount - expectedCash;

    if (Math.abs(variance) > 0) {
      // Log variance for investigation
      return {
        expected: expectedCash,
        actual: physicalCount,
        variance,
        requiresApproval: Math.abs(variance) > 50000,
        status: variance === 0 ? 'BALANCED' : variance > 0 ? 'OVERAGE' : 'SHORTAGE'
      };
    }

    return {
      expected: expectedCash,
      actual: physicalCount,
      variance: 0,
      requiresApproval: false,
      status: 'BALANCED'
    };
  }
}
```

---

## Fee Calculation Rules

### Rule 25: MDR Fee Application

**Statement**: Merchant Discount Rate (MDR) fees MUST be calculated based on payment method and provider.

**Fee Structure**:

| Provider | Method | MDR | Min Fee | Max Fee |
|----------|--------|-----|---------|---------|
| Midtrans | Credit Card | 2.9% | Rp 2,000 | - |
| Midtrans | GoPay | 2.0% | Rp 1,000 | - |
| Midtrans | ShopeePay | 1.5% | Rp 1,000 | - |
| Midtrans | Bank Transfer | - | Rp 4,000 | Rp 4,000 |
| Midtrans | QRIS | 0.7% | - | - |
| QRIS Direct | QRIS | 0.7% | - | - |
| EDC | Debit | 0.5% | - | Rp 50,000 |
| EDC | Credit | 2.0% | - | - |
| Cash | - | 0% | - | - |

```typescript
interface MDRFeeRule {
  calculate(amount: number, method: PaymentMethod, provider: PaymentProvider): PaymentFees {
    const feeConfig = FEE_CONFIGURATIONS[provider][method];

    let providerFee = 0;

    // Calculate percentage fee
    if (feeConfig.percentageFee) {
      providerFee = amount * (feeConfig.percentageFee / 100);
    }

    // Apply flat fee for bank transfers
    if (feeConfig.flatFee) {
      providerFee = feeConfig.flatFee;
    }

    // Apply minimum fee
    if (feeConfig.minFee && providerFee < feeConfig.minFee) {
      providerFee = feeConfig.minFee;
    }

    // Apply maximum fee cap
    if (feeConfig.maxFee && providerFee > feeConfig.maxFee) {
      providerFee = feeConfig.maxFee;
    }

    return {
      providerFee: Math.round(providerFee),  // Round to nearest rupiah
      platformFee: 0,
      netAmount: amount - Math.round(providerFee)
    };
  }
}
```

---

### Rule 26: Fee Absorption Policy

**Statement**: MDR fees MUST be absorbed by merchant (Kidkazz), NOT passed to customer.

**Rationale**: Better customer experience; fees are operational cost.

```typescript
interface FeeAbsorptionRule {
  applyFees(order: Order, payment: Payment, fees: PaymentFees): void {
    // Customer pays order total
    payment.amount = order.totalAmount;

    // Merchant absorbs fees
    payment.providerFee = fees.providerFee;
    payment.netAmount = order.totalAmount - fees.providerFee;

    // Net amount is what Kidkazz receives
  }
}
```

**Exception**: Large wholesale orders may negotiate fee sharing.

---

## Security & Compliance Rules

### Rule 27: PCI DSS Card Data Handling

**Statement**: Full card numbers, CVV, and PIN MUST NEVER be stored in system.

**Allowed Storage**:
- Masked PAN (first 6, last 4 digits)
- Card brand
- Expiry month/year (no day)
- Cardholder name

```typescript
interface PCIComplianceRule {
  validateStorage(cardData: any): void {
    const prohibitedFields = ['fullPan', 'cvv', 'pin', 'track1', 'track2'];

    for (const field of prohibitedFields) {
      if (cardData[field]) {
        throw new SecurityError('PAYMENT_018', `Cannot store ${field} - PCI violation`);
      }
    }
  }

  maskPAN(pan: string): string {
    if (pan.length < 13) throw new Error('Invalid PAN length');
    return pan.slice(0, 6) + '*'.repeat(pan.length - 10) + pan.slice(-4);
  }
}
```

---

### Rule 28: Fraud Detection Velocity Checks

**Statement**: Payment attempts MUST be rate-limited to prevent fraud.

**Limits**:
- Max 5 failed attempts per card per hour
- Max 10 transactions per customer per hour
- Max Rp 50,000,000 per customer per day

```typescript
interface FraudVelocityRule {
  async validate(payment: Payment): Promise<FraudCheckResult> {
    const risks: string[] = [];

    // Check failed card attempts
    if (payment.cardInfo) {
      const failedAttempts = await getFailedCardAttempts(
        payment.cardInfo.maskedCardNumber,
        60  // last 60 minutes
      );
      if (failedAttempts >= 5) {
        risks.push('CARD_VELOCITY_EXCEEDED');
      }
    }

    // Check customer transaction count
    const hourlyCount = await getCustomerTransactionCount(
      payment.customerId,
      60
    );
    if (hourlyCount >= 10) {
      risks.push('CUSTOMER_VELOCITY_EXCEEDED');
    }

    // Check daily amount
    const dailyAmount = await getCustomerDailyAmount(payment.customerId);
    if (dailyAmount + payment.amount > 50000000) {
      risks.push('DAILY_LIMIT_EXCEEDED');
    }

    return {
      approved: risks.length === 0,
      risks,
      requiresReview: risks.length > 0
    };
  }
}
```

---

### Rule 29: 3D Secure Requirement

**Statement**: All online credit card transactions MUST use 3D Secure (3DS) authentication.

**Rationale**: Liability shift and fraud protection.

```typescript
interface ThreeDSecureRule {
  validate(payment: Payment): boolean {
    if (
      payment.channel === PaymentChannel.ONLINE &&
      payment.method.startsWith('CREDIT_CARD')
    ) {
      if (!payment.providerResponse?.threeDSecure?.authenticated) {
        throw new SecurityError(
          'PAYMENT_019',
          '3D Secure authentication required for online credit card payments'
        );
      }
    }
    return true;
  }
}
```

---

### Rule 30: Webhook Idempotency

**Statement**: Webhook handlers MUST be idempotent - duplicate notifications MUST NOT cause duplicate processing.

```typescript
interface WebhookIdempotencyRule {
  async processWebhook(notification: PaymentNotification): Promise<void> {
    const idempotencyKey = `${notification.provider}-${notification.transactionId}`;

    // Check if already processed
    const existing = await getWebhookByKey(idempotencyKey);
    if (existing && existing.processed) {
      // Already processed, return success without processing again
      return;
    }

    // Process the webhook
    await processPaymentUpdate(notification);

    // Mark as processed
    await markWebhookProcessed(idempotencyKey);
  }
}
```

---

## Paperless Receipt Rules

### Rule 31: Digital Receipt Default

**Statement**: Digital receipts via sent.dm MUST be the default option; physical receipts are optional.

**Rationale**: Paperless approach for environmental and cost reasons.

```typescript
interface PaperlessReceiptRule {
  determineReceiptMethod(customer: Customer, preferences?: ReceiptPreferences): ReceiptMethod {
    // Default to digital if phone available
    if (customer.phoneNumber) {
      return ReceiptMethod.DIGITAL;
    }

    // Fallback to email if available
    if (customer.email) {
      return ReceiptMethod.EMAIL;
    }

    // Only print if no digital option
    return ReceiptMethod.PRINT;
  }
}
```

---

### Rule 32: sent.dm Channel Priority

**Statement**: sent.dm MUST auto-detect and use best available messaging channel.

**Priority Order**: WhatsApp > Telegram > iMessage > SMS > Email

```typescript
interface ChannelPriorityRule {
  async selectChannel(phoneNumber: string): Promise<MessageChannel> {
    const channelPriority: MessageChannel[] = [
      'whatsapp',
      'telegram',
      'imessage',
      'sms'
    ];

    const availableChannels = await sentdm.detectAvailableChannels(phoneNumber);

    for (const channel of channelPriority) {
      if (availableChannels.includes(channel)) {
        return channel;
      }
    }

    // Fallback to SMS (always available)
    return 'sms';
  }
}
```

---

### Rule 33: Receipt Content Requirements

**Statement**: Digital receipts MUST contain all legally required information.

**Required Fields**:
- Merchant name and address
- Tax registration number (NPWP)
- Date and time
- Invoice/receipt number
- Item details (name, quantity, price)
- Total amount
- Payment method
- Transaction reference

```typescript
interface ReceiptContentRule {
  validate(receipt: DigitalReceipt): boolean {
    const requiredFields = [
      'merchantName',
      'merchantAddress',
      'taxId',
      'dateTime',
      'receiptNumber',
      'items',
      'totalAmount',
      'paymentMethod',
      'transactionReference'
    ];

    for (const field of requiredFields) {
      if (!receipt[field]) {
        throw new BusinessRuleError(
          'PAYMENT_020',
          `Receipt missing required field: ${field}`
        );
      }
    }

    return true;
  }
}
```

---

### Rule 34: OTP Delivery via sent.dm

**Statement**: Payment verification OTPs MUST be delivered through sent.dm with appropriate security measures.

**Constraints**:
- OTP valid for 5 minutes
- Max 3 OTP requests per 15 minutes
- OTP masked in system logs

```typescript
interface OTPDeliveryRule {
  async sendOTP(request: OTPRequest): Promise<OTPResult> {
    // Rate limiting
    const recentOTPs = await getRecentOTPRequests(
      request.phoneNumber,
      15  // last 15 minutes
    );
    if (recentOTPs >= 3) {
      throw new SecurityError('PAYMENT_021', 'OTP rate limit exceeded');
    }

    // Generate OTP
    const otp = generateSecureOTP(6);

    // Store hashed OTP
    await storeOTP({
      phoneNumber: request.phoneNumber,
      otpHash: hashOTP(otp),
      purpose: request.purpose,
      expiresAt: addMinutes(new Date(), 5)
    });

    // Send via sent.dm
    await sentdm.sendOTP({
      to: request.phoneNumber,
      otp,
      expiryMinutes: 5,
      purpose: request.purpose
    });

    return {
      sent: true,
      expiresAt: addMinutes(new Date(), 5)
    };
  }
}
```

---

## Integration Rules

### Rule 35: Saga Pattern Payment Step

**Statement**: Payment processing in Saga MUST have compensating action for rollback.

**Compensation**: If payment succeeds but later step fails, payment MUST be refunded.

```typescript
interface PaymentSagaRule {
  // Forward action
  async processPayment(orderId: string, amount: number): Promise<PaymentResult> {
    const payment = await paymentService.process({
      orderId,
      amount,
      // ...
    });

    return {
      paymentId: payment.id,
      status: payment.status
    };
  }

  // Compensating action
  async compensatePayment(paymentId: string, reason: string): Promise<void> {
    const payment = await paymentService.get(paymentId);

    if (payment.status === PaymentStatus.PAID) {
      // Auto-refund
      await paymentService.refund({
        paymentId,
        amount: payment.amount,
        reason: `SAGA_COMPENSATION: ${reason}`
      });
    } else if (payment.status === PaymentStatus.PENDING) {
      // Cancel pending payment
      await paymentService.cancel(paymentId);
    }
  }
}
```

---

### Rule 36: Accounting Integration

**Statement**: All completed payments MUST trigger journal entry creation.

**Journal Entry Mapping**:
- Cash: DR Cash, CR Sales Revenue
- Bank Transfer: DR Bank (specific), CR Sales Revenue
- E-Wallet: DR E-Wallet Receivable, CR Sales Revenue
- Credit Card: DR CC Receivable, CR Sales Revenue, CR MDR Expense

```typescript
interface AccountingIntegrationRule {
  async createJournalEntry(payment: Payment): Promise<void> {
    if (payment.status !== PaymentStatus.PAID) return;

    const journalEntries = this.buildJournalEntries(payment);

    await accountingService.createJournalEntry({
      date: payment.paidAt,
      reference: payment.paymentNumber,
      description: `Payment for Order ${payment.orderNumber}`,
      entries: journalEntries
    });
  }

  private buildJournalEntries(payment: Payment): JournalEntry[] {
    const entries: JournalEntry[] = [];

    // Debit asset account (varies by method)
    const debitAccount = this.getDebitAccount(payment.method);
    entries.push({
      accountCode: debitAccount,
      debit: payment.netAmount,
      credit: 0
    });

    // Debit fee expense if applicable
    if (payment.providerFee > 0) {
      entries.push({
        accountCode: 'EXPENSE.MDR_FEE',
        debit: payment.providerFee,
        credit: 0
      });
    }

    // Credit revenue
    entries.push({
      accountCode: 'REVENUE.SALES',
      debit: 0,
      credit: payment.amount
    });

    return entries;
  }
}
```

---

### Rule 37: Inventory Release on Payment Expiry

**Statement**: When payment expires, reserved inventory MUST be automatically released.

```typescript
interface PaymentExpiryRule {
  async handleExpiry(payment: Payment): Promise<void> {
    // Update payment status
    payment.status = PaymentStatus.EXPIRED;
    payment.expiredAt = new Date();
    await savePayment(payment);

    // Release inventory reservation
    await inventoryService.releaseReservation({
      orderId: payment.orderId,
      reason: 'PAYMENT_EXPIRED'
    });

    // Notify customer
    await notificationService.send({
      type: NotificationType.PAYMENT_EXPIRED,
      customerId: payment.customerId,
      data: {
        orderNumber: payment.orderNumber,
        amount: payment.amount
      }
    });

    // Publish event
    await publishEvent(new PaymentExpired({
      paymentId: payment.id,
      orderId: payment.orderId,
      expiredAt: payment.expiredAt
    }));
  }
}
```

---

### Rule 38: Event Publishing

**Statement**: All payment state changes MUST publish domain events.

**Events**:
- `PaymentCreated` - When payment is initiated
- `PaymentProcessing` - When payment is being processed
- `PaymentCompleted` - When payment is confirmed
- `PaymentFailed` - When payment fails
- `PaymentExpired` - When payment times out
- `PaymentCancelled` - When payment is cancelled
- `RefundInitiated` - When refund is requested
- `RefundCompleted` - When refund is processed

```typescript
interface PaymentEventRule {
  async publishStateChange(payment: Payment, previousStatus: PaymentStatus): Promise<void> {
    const eventMap: Record<PaymentStatus, () => DomainEvent> = {
      [PaymentStatus.PENDING]: () => new PaymentCreated(payment),
      [PaymentStatus.PROCESSING]: () => new PaymentProcessing(payment),
      [PaymentStatus.PAID]: () => new PaymentCompleted(payment),
      [PaymentStatus.FAILED]: () => new PaymentFailed(payment),
      [PaymentStatus.EXPIRED]: () => new PaymentExpired(payment),
      [PaymentStatus.CANCELLED]: () => new PaymentCancelled(payment),
      [PaymentStatus.REFUNDED]: () => new RefundCompleted(payment)
    };

    const eventFactory = eventMap[payment.status];
    if (eventFactory) {
      await eventBus.publish(eventFactory());
    }
  }
}
```

---

## Summary

| Category | Rules | Key Points |
|----------|-------|------------|
| Creation | 1-5 | Order association, amount validation, single pending, numbering |
| Methods | 6-9 | Channel restrictions, cash change, split payments, credit terms |
| Channels | 10-12 | Online vs offline, expiry times, immediate completion |
| Providers | 13-16 | Webhook validation, QRIS generation, EDC handling |
| Refunds | 17-21 | Time limits, amounts, approval, cash restrictions, void vs refund |
| Settlement | 22-24 | Daily EDC settlement, discrepancy alerts, cash reconciliation |
| Fees | 25-26 | MDR calculation, fee absorption policy |
| Security | 27-30 | PCI compliance, fraud detection, 3DS, idempotency |
| Paperless | 31-34 | Digital default, channel priority, content requirements, OTP |
| Integration | 35-38 | Saga pattern, accounting, inventory release, events |

---

## Related Documents

- [Payment Service Architecture](./PAYMENT_SERVICE_ARCHITECTURE.md)
- [Payment Service Implementation Plan](./PAYMENT_IMPLEMENTATION_PLAN.md)
- [Notification Service Architecture](../notification/NOTIFICATION_SERVICE_ARCHITECTURE.md)
- [Sales Business Rules](../sales/BUSINESS_RULES.md)
- [Accounting Business Rules](../accounting/BUSINESS_RULES.md)
- [Main Business Rules](../../ddd/BUSINESS_RULES.md)
