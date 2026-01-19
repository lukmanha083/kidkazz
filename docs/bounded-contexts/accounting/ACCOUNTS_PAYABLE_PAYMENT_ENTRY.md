# Accounts Payable Payment Entry

## Overview

This document describes the **Accounts Payable (A/P) Payment Entry** feature for paying off existing vendor/supplier liabilities. This is used when:

1. An expense was previously recorded with "Pay Later" (Accounts Payable)
2. A purchase was made on credit terms
3. Supplier invoices need to be paid

**Flow:**
```
Step 1: Record expense with A/P     →    Step 2: Pay the A/P
─────────────────────────────────        ────────────────────────
DR: Expense Account                      DR: Hutang Usaha (A/P)
CR: Hutang Usaha (A/P)                   CR: Cash/Bank
```

**Journal Entry Format:**
```
DEBIT:  Hutang Usaha / Accounts Payable (liability decreases)
CREDIT: Cash/Bank (asset decreases - money paid out)
```

---

## 1. User Interface Design

### A/P Payment Form

```
┌──────────────────────────────────────────────────────────────────┐
│  💳 Pembayaran Hutang (A/P Payment)                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vendor/Supplier *                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search vendor...                                   ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Outstanding Invoices for: PT Supplier ABC                    ││
│  │ Total Outstanding: Rp 15,500,000                             ││
│  │ ┌────────────────────────────────────────────────────────┐   ││
│  │ │ ☑️ INV-SUP-001  │ 2025-01-05 │ Rp 5,000,000  │ Due: Jan 20││
│  │ │ ☑️ INV-SUP-002  │ 2025-01-10 │ Rp 3,500,000  │ Due: Jan 25││
│  │ │ ☐ INV-SUP-003  │ 2025-01-15 │ Rp 7,000,000  │ Due: Feb 01││
│  │ └────────────────────────────────────────────────────────┘   ││
│  │ Selected: 2 invoices | Total: Rp 8,500,000                   ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Payment Amount *                                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Rp                                        8,500,000        │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ⚠️ Amount matches selected invoices                             │
│                                                                  │
│  Payment Method *                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │   💵 Cash       │ │   🏦 Bank       │ │   💳 Giro/Cek   │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                  │
│  [If Bank selected]                                              │
│  Bank Account                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Bank BCA - Operasional (1020)                         ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ☐ Apply Early Payment Discount                                  │
│  [If checked]                                                    │
│  Discount Amount: Rp ____________  (2% = Rp 170,000)             │
│                                                                  │
│  Date                          Reference                         │
│  ┌────────────────────────┐    ┌────────────────────────────┐   │
│  │ 2025-01-17         📅 │    │ PAY-SUP-ABC-001            │   │
│  └────────────────────────┘    └────────────────────────────┘   │
│                                                                  │
│  Description                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Pembayaran hutang ke PT Supplier ABC                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Preview Journal Entry                                        ││
│  │ ┌──────────────────┬──────┬─────────────┬─────────────────┐ ││
│  │ │ Account          │ Code │ Debit       │ Credit          │ ││
│  │ ├──────────────────┼──────┼─────────────┼─────────────────┤ ││
│  │ │ Hutang Usaha     │ 2010 │ 8,500,000   │                 │ ││
│  │ │ Bank BCA         │ 1020 │             │ 8,500,000       │ ││
│  │ └──────────────────┴──────┴─────────────┴─────────────────┘ ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft          │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│                              ┌────────────────────────────────┐ │
│                              │     ✅ Pay & Post              │ │
│                              └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Accounts Payable Account Types

### Liability Accounts (2000-2099)

| Code | Indonesian Name | English Name | Use Case |
|------|-----------------|--------------|----------|
| **2010** | Hutang Dagang | Accounts Payable - Trade | General supplier payables |
| **2011** | Hutang Dagang - Supplier Lokal | A/P - Local Suppliers | Domestic suppliers |
| **2012** | Hutang Dagang - Supplier Impor | A/P - Import Suppliers | Foreign suppliers |
| **2020** | Hutang Lain-lain | Other Payables | Non-trade payables |

### Payment Accounts (Cash & Bank)

| Code | Indonesian Name | English Name |
|------|-----------------|--------------|
| **1010** | Kas Kecil - Kantor Pusat | Petty Cash - Head Office |
| **1011** | Kas Kecil - Gudang | Petty Cash - Warehouse |
| **1020** | Bank BCA - Operasional | BCA Bank - Operating |
| **1021** | Bank BCA - Gaji | BCA Bank - Payroll |
| **1022** | Bank BRI - Tabungan | BRI Bank - Savings |
| **1023** | Bank CIMB Niaga - USD | CIMB Niaga Bank - USD |
| **1024** | Bank Mandiri - Operasional | Mandiri Bank - Operating |

### Discount Account

| Code | Indonesian Name | English Name |
|------|-----------------|--------------|
| **5130** | Potongan Tunai Pembelian | Cash Discounts Received (Purchase) |

---

## 3. Payment Scenarios and Journal Entries

### Scenario 1: Full Payment - Single Invoice

**Context:** Pay supplier invoice in full

**User Input:**
- Vendor: `PT Supplier ABC`
- Invoice: `INV-SUP-001` (Rp 5,000,000)
- Payment Amount: `Rp 5,000,000`
- Payment Method: `Bank BCA - Operasional`
- Description: `Pembayaran INV-SUP-001 ke PT Supplier ABC`
- Reference: `PAY-SUP-ABC-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0040",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran INV-SUP-001 ke PT Supplier ABC",
  reference: "PAY-SUP-ABC-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Debit",
      amount: 5000000,
      vendorId: "vendor-abc",
      memo: "A/P Payment - INV-SUP-001"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 5000000,
      memo: "Payment to PT Supplier ABC"
    }
  ]
}
```

---

### Scenario 2: Full Payment - Multiple Invoices

**Context:** Pay multiple invoices to same vendor at once

**User Input:**
- Vendor: `PT Supplier ABC`
- Invoices:
  - `INV-SUP-001` (Rp 5,000,000)
  - `INV-SUP-002` (Rp 3,500,000)
- Total Payment: `Rp 8,500,000`
- Payment Method: `Bank BCA - Operasional`
- Description: `Pembayaran hutang ke PT Supplier ABC`
- Reference: `PAY-SUP-ABC-002`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0041",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran hutang ke PT Supplier ABC",
  reference: "PAY-SUP-ABC-002",
  notes: "Invoices: INV-SUP-001, INV-SUP-002",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Debit",
      amount: 8500000,
      vendorId: "vendor-abc",
      memo: "A/P Payment - INV-SUP-001, INV-SUP-002"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 8500000,
      memo: "Payment to PT Supplier ABC"
    }
  ]
}
```

---

### Scenario 3: Partial Payment

**Context:** Pay part of an invoice now, rest later

**User Input:**
- Vendor: `PT Supplier XYZ`
- Invoice: `INV-SUP-010` (Rp 10,000,000)
- Payment Amount: `Rp 4,000,000` (partial)
- Payment Method: `Cash`
- Description: `Pembayaran sebagian INV-SUP-010`
- Reference: `PAY-SUP-XYZ-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0042",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran sebagian INV-SUP-010",
  reference: "PAY-SUP-XYZ-001",
  notes: "Partial payment: Rp 4,000,000 of Rp 10,000,000 (Remaining: Rp 6,000,000)",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Debit",
      amount: 4000000,
      vendorId: "vendor-xyz",
      memo: "Partial A/P Payment - INV-SUP-010 (4M of 10M)"
    },
    {
      accountId: "acc-1010",
      accountCode: "1010",
      accountName: "Kas Kecil - Kantor Pusat",
      direction: "Credit",
      amount: 4000000,
      memo: "Partial Payment to PT Supplier XYZ"
    }
  ]
}
```

**Invoice Status After Payment:**
```
INV-SUP-010
- Original Amount: Rp 10,000,000
- Paid: Rp 4,000,000
- Remaining: Rp 6,000,000
- Status: PARTIALLY_PAID
```

---

### Scenario 4: Payment with Early Payment Discount

**Context:** Supplier offers 2% discount for early payment

**User Input:**
- Vendor: `PT Supplier DEF`
- Invoice: `INV-SUP-020` (Rp 10,000,000)
- Payment Terms: `2/10 Net 30` (2% discount if paid within 10 days)
- Early Payment Discount: `Rp 200,000` (2%)
- Actual Payment: `Rp 9,800,000`
- Payment Method: `Bank BCA - Operasional`
- Description: `Pembayaran INV-SUP-020 dengan diskon 2%`
- Reference: `PAY-SUP-DEF-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0043",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran INV-SUP-020 dengan diskon 2%",
  reference: "PAY-SUP-DEF-001",
  notes: "Early payment discount: 2% (Rp 200,000)",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Debit",
      amount: 10000000,  // Full invoice amount
      vendorId: "vendor-def",
      memo: "A/P Payment - INV-SUP-020 (Full invoice cleared)"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 9800000,   // Actual amount paid
      memo: "Payment to PT Supplier DEF (after 2% discount)"
    },
    {
      accountId: "acc-5130",
      accountCode: "5130",
      accountName: "Potongan Tunai Pembelian",
      direction: "Credit",
      amount: 200000,    // Discount received
      memo: "Early Payment Discount - 2%"
    }
  ]
}
```

**Note:** The discount (5130 - Potongan Tunai Pembelian) is a contra-COGS account that reduces the cost of goods sold.

---

### Scenario 5: Payment with Bank Transfer Fee

**Context:** Bank charges transfer fee for payment

**User Input:**
- Vendor: `PT Supplier GHI`
- Invoice: `INV-SUP-030` (Rp 25,000,000)
- Payment Amount: `Rp 25,000,000`
- Bank Transfer Fee: `Rp 6,500`
- Payment Method: `Bank BCA - Operasional`
- Description: `Pembayaran INV-SUP-030 + biaya transfer`
- Reference: `PAY-SUP-GHI-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0044",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran INV-SUP-030 + biaya transfer",
  reference: "PAY-SUP-GHI-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Debit",
      amount: 25000000,
      vendorId: "vendor-ghi",
      memo: "A/P Payment - INV-SUP-030"
    },
    {
      accountId: "acc-6950",
      accountCode: "6950",
      accountName: "Beban Bank",
      direction: "Debit",
      amount: 6500,
      memo: "Bank Transfer Fee"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 25006500,  // Invoice + bank fee
      memo: "Payment to PT Supplier GHI + Bank Fee"
    }
  ]
}
```

---

### Scenario 6: Payment to Import Supplier (Foreign Currency)

**Context:** Pay import supplier in USD

**User Input:**
- Vendor: `ABC Import Co. (USA)`
- Invoice: `INV-IMP-001` ($5,000 USD)
- Exchange Rate: `Rp 16,000 / USD`
- Payment Amount (IDR): `Rp 80,000,000`
- Payment Method: `Bank CIMB Niaga - USD`
- Description: `Pembayaran invoice impor ABC Import Co.`
- Reference: `PAY-IMP-ABC-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0045",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran invoice impor ABC Import Co.",
  reference: "PAY-IMP-ABC-001",
  notes: "USD $5,000 @ Rp 16,000",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2012",
      accountCode: "2012",
      accountName: "Hutang Dagang - Supplier Impor",
      direction: "Debit",
      amount: 80000000,
      vendorId: "vendor-abc-import",
      memo: "A/P Payment - INV-IMP-001 (USD $5,000)"
    },
    {
      accountId: "acc-1023",
      accountCode: "1023",
      accountName: "Bank CIMB Niaga - USD",
      direction: "Credit",
      amount: 80000000,
      memo: "USD Payment to ABC Import Co."
    }
  ]
}
```

---

### Scenario 7: Payment with Forex Gain/Loss

**Context:** Exchange rate changed since invoice was recorded

**User Input:**
- Vendor: `XYZ Trading (Singapore)`
- Invoice: `INV-IMP-002` ($3,000 USD)
- Rate at Invoice: `Rp 15,800 / USD` (Recorded A/P: Rp 47,400,000)
- Rate at Payment: `Rp 16,000 / USD` (Actual Payment: Rp 48,000,000)
- Forex Loss: `Rp 600,000`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0046",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran invoice impor XYZ Trading + selisih kurs",
  reference: "PAY-IMP-XYZ-001",
  notes: "Forex Loss: Rp 600,000 (Rate: 15,800 → 16,000)",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2012",
      accountCode: "2012",
      accountName: "Hutang Dagang - Supplier Impor",
      direction: "Debit",
      amount: 47400000,  // Original A/P amount
      vendorId: "vendor-xyz-trading",
      memo: "A/P Payment - INV-IMP-002 (Original)"
    },
    {
      accountId: "acc-7130",
      accountCode: "7130",
      accountName: "Beban Selisih Kurs",
      direction: "Debit",
      amount: 600000,    // Forex loss
      memo: "Forex Loss - Rate change 15,800 → 16,000"
    },
    {
      accountId: "acc-1023",
      accountCode: "1023",
      accountName: "Bank CIMB Niaga - USD",
      direction: "Credit",
      amount: 48000000,  // Actual payment at current rate
      memo: "USD Payment to XYZ Trading (USD $3,000 @ Rp 16,000)"
    }
  ]
}
```

**If Forex Gain (rate went down):**
```typescript
// Rate at Invoice: Rp 16,200 / USD (Recorded A/P: Rp 48,600,000)
// Rate at Payment: Rp 16,000 / USD (Actual Payment: Rp 48,000,000)
// Forex Gain: Rp 600,000

lines: [
  {
    accountCode: "2012",
    direction: "Debit",
    amount: 48600000,  // Original A/P amount
    memo: "A/P Payment - Original"
  },
  {
    accountCode: "1023",
    direction: "Credit",
    amount: 48000000,  // Actual payment
    memo: "USD Payment"
  },
  {
    accountCode: "7030",           // Pendapatan Selisih Kurs
    accountName: "Pendapatan Selisih Kurs",
    direction: "Credit",
    amount: 600000,    // Forex gain
    memo: "Forex Gain - Rate change 16,200 → 16,000"
  }
]
```

---

## 4. API Design

### Create A/P Payment Endpoint

```
POST /api/accounting/ap-payments
```

### Request Schema

```typescript
interface CreateAPPaymentRequest {
  // Required fields
  vendorId: string;              // Vendor/Supplier ID
  paymentAmount: number;         // Total payment amount
  paymentMethod: PaymentMethod;

  // Invoice selection (at least one required)
  invoices?: InvoicePayment[];   // Specific invoices to pay
  apAccountId?: string;          // Or pay against A/P account directly

  // Optional fields
  entryDate?: string;            // ISO date, defaults to today
  description?: string;          // Payment description
  reference?: string;            // Payment reference

  // Discount (optional)
  earlyPaymentDiscount?: number; // Discount amount

  // Bank charges (optional)
  bankCharge?: number;           // Bank transfer fee

  // Foreign currency (optional)
  exchangeRate?: number;         // Current exchange rate
  foreignAmount?: number;        // Amount in foreign currency
  foreignCurrency?: string;      // Currency code (e.g., 'USD')
  originalExchangeRate?: number; // Rate when invoice was recorded (for forex gain/loss)

  saveAsDraft?: boolean;
}

interface InvoicePayment {
  invoiceId: string;             // Invoice ID
  invoiceNumber: string;         // Invoice number (for reference)
  originalAmount: number;        // Original invoice amount
  paymentAmount: number;         // Amount being paid for this invoice
}

type PaymentMethod =
  | 'CASH'
  | 'CASH_WAREHOUSE'
  | 'BANK_BCA_OPERASIONAL'
  | 'BANK_BCA_GAJI'
  | 'BANK_BRI_TABUNGAN'
  | 'BANK_CIMB_USD'
  | 'BANK_MANDIRI'
  | 'CHEQUE';                    // Giro/Cek
```

### Response Schema

```typescript
interface CreateAPPaymentResponse {
  success: boolean;
  data: {
    journalEntryId: string;
    entryNumber: string;
    status: 'Draft' | 'Posted';
    vendor: {
      id: string;
      name: string;
    };
    payment: {
      amount: number;
      method: string;
      accountCode: string;
    };
    invoicesPaid: {
      invoiceNumber: string;
      amountPaid: number;
      remainingBalance: number;
      status: 'PAID' | 'PARTIALLY_PAID';
    }[];
    discount?: {
      amount: number;
      accountCode: string;
    };
    bankCharge?: {
      amount: number;
      accountCode: string;
    };
    forexGainLoss?: {
      type: 'GAIN' | 'LOSS';
      amount: number;
      accountCode: string;
    };
    lines: JournalLineDTO[];
  };
}
```

### Example API Call - Simple Payment

```bash
curl -X POST /api/accounting/ap-payments \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "vendorId": "vendor-abc",
    "paymentAmount": 5000000,
    "paymentMethod": "BANK_BCA_OPERASIONAL",
    "invoices": [
      {
        "invoiceId": "inv-001",
        "invoiceNumber": "INV-SUP-001",
        "originalAmount": 5000000,
        "paymentAmount": 5000000
      }
    ],
    "description": "Pembayaran INV-SUP-001",
    "reference": "PAY-SUP-ABC-001"
  }'
```

### Example API Call - Payment with Discount

```bash
curl -X POST /api/accounting/ap-payments \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "vendorId": "vendor-def",
    "paymentAmount": 9800000,
    "paymentMethod": "BANK_BCA_OPERASIONAL",
    "invoices": [
      {
        "invoiceId": "inv-020",
        "invoiceNumber": "INV-SUP-020",
        "originalAmount": 10000000,
        "paymentAmount": 10000000
      }
    ],
    "earlyPaymentDiscount": 200000,
    "description": "Pembayaran INV-SUP-020 dengan diskon 2%",
    "reference": "PAY-SUP-DEF-001"
  }'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "journalEntryId": "je-2025-0043",
    "entryNumber": "JE-2025-0043",
    "status": "Posted",
    "vendor": {
      "id": "vendor-def",
      "name": "PT Supplier DEF"
    },
    "payment": {
      "amount": 9800000,
      "method": "BANK_BCA_OPERASIONAL",
      "accountCode": "1020"
    },
    "invoicesPaid": [
      {
        "invoiceNumber": "INV-SUP-020",
        "amountPaid": 10000000,
        "remainingBalance": 0,
        "status": "PAID"
      }
    ],
    "discount": {
      "amount": 200000,
      "accountCode": "5130"
    },
    "lines": [
      {
        "accountCode": "2010",
        "accountName": "Hutang Dagang",
        "direction": "Debit",
        "amount": 10000000
      },
      {
        "accountCode": "1020",
        "accountName": "Bank BCA - Operasional",
        "direction": "Credit",
        "amount": 9800000
      },
      {
        "accountCode": "5130",
        "accountName": "Potongan Tunai Pembelian",
        "direction": "Credit",
        "amount": 200000
      }
    ]
  }
}
```

---

## 5. Validation Rules

### Business Rules

1. **Vendor Validation**
   - Vendor must exist in the system
   - Vendor must have outstanding A/P balance

2. **Invoice Validation**
   - Invoice must belong to the selected vendor
   - Invoice must have outstanding balance
   - Payment amount cannot exceed invoice balance

3. **Amount Validation**
   - Payment amount must be greater than 0
   - Total payment + discount must equal sum of invoice payments
   - Bank charge must be >= 0

4. **A/P Account Validation**
   - A/P account must be liability type (2000-2099)
   - A/P account must be active

5. **Payment Account Validation**
   - Payment account must be cash/bank type (1000-1039)
   - Payment account must be active
   - Sufficient balance warning (not blocking)

6. **Date Validation**
   - Entry date cannot be in the future
   - Entry date cannot be in closed fiscal period

7. **Forex Validation**
   - If foreign currency, exchange rate is required
   - Forex gain/loss must be calculated if rate changed

### Error Responses

```typescript
// No outstanding balance
{
  "success": false,
  "error": {
    "code": "NO_OUTSTANDING_BALANCE",
    "message": "Vendor PT Supplier ABC has no outstanding A/P balance."
  }
}

// Payment exceeds balance
{
  "success": false,
  "error": {
    "code": "PAYMENT_EXCEEDS_BALANCE",
    "message": "Payment amount (Rp 15,000,000) exceeds invoice balance (Rp 10,000,000) for INV-SUP-001."
  }
}

// Invoice not found
{
  "success": false,
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "Invoice INV-SUP-999 not found for vendor PT Supplier ABC."
  }
}

// Invalid discount
{
  "success": false,
  "error": {
    "code": "INVALID_DISCOUNT",
    "message": "Discount amount (Rp 500,000) plus payment (Rp 9,000,000) does not equal invoice total (Rp 10,000,000)."
  }
}
```

---

## 6. Use Case Implementation

### CreateAPPayment Use Case

```typescript
interface CreateAPPaymentInput {
  vendorId: string;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  invoices?: InvoicePayment[];
  apAccountId?: string;
  entryDate?: Date;
  description?: string;
  reference?: string;
  earlyPaymentDiscount?: number;
  bankCharge?: number;
  exchangeRate?: number;
  foreignAmount?: number;
  foreignCurrency?: string;
  originalExchangeRate?: number;
  saveAsDraft?: boolean;
  createdBy: string;
}

class CreateAPPayment {
  constructor(
    private vendorRepository: IVendorRepository,
    private invoiceRepository: IInvoiceRepository,
    private accountRepository: IAccountRepository,
    private journalEntryRepository: IJournalEntryRepository,
    private entryNumberGenerator: IEntryNumberGenerator
  ) {}

  async execute(input: CreateAPPaymentInput): Promise<CreateAPPaymentOutput> {
    // 1. Validate vendor
    const vendor = await this.vendorRepository.findById(input.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // 2. Validate and get invoices
    let totalInvoiceAmount = 0;
    const invoiceDetails: InvoiceDetail[] = [];

    if (input.invoices && input.invoices.length > 0) {
      for (const inv of input.invoices) {
        const invoice = await this.invoiceRepository.findById(inv.invoiceId);
        if (!invoice) {
          throw new Error(`Invoice ${inv.invoiceNumber} not found`);
        }
        if (invoice.vendorId !== input.vendorId) {
          throw new Error(`Invoice ${inv.invoiceNumber} does not belong to this vendor`);
        }
        if (inv.paymentAmount > invoice.remainingBalance) {
          throw new Error(`Payment exceeds balance for ${inv.invoiceNumber}`);
        }
        totalInvoiceAmount += inv.paymentAmount;
        invoiceDetails.push({ invoice, paymentAmount: inv.paymentAmount });
      }
    }

    // 3. Validate amounts
    const expectedTotal = input.paymentAmount + (input.earlyPaymentDiscount || 0);
    if (totalInvoiceAmount !== expectedTotal) {
      throw new Error('Payment amount + discount must equal sum of invoice payments');
    }

    // 4. Get payment account
    const paymentAccount = this.getPaymentAccount(input.paymentMethod);
    const paymentAccountEntity = await this.accountRepository.findByCode(paymentAccount.code);

    // 5. Get A/P account
    const apAccountId = input.apAccountId || 'acc-2010'; // Default: Hutang Dagang
    const apAccount = await this.accountRepository.findById(apAccountId);

    // 6. Calculate forex gain/loss if applicable
    let forexGainLoss: { type: 'GAIN' | 'LOSS'; amount: number } | undefined;
    if (input.exchangeRate && input.originalExchangeRate) {
      const originalAmount = input.foreignAmount! * input.originalExchangeRate;
      const currentAmount = input.foreignAmount! * input.exchangeRate;
      const difference = currentAmount - originalAmount;
      if (difference !== 0) {
        forexGainLoss = {
          type: difference > 0 ? 'LOSS' : 'GAIN',
          amount: Math.abs(difference)
        };
      }
    }

    // 7. Generate entry number
    const entryNumber = await this.entryNumberGenerator.generate();

    // 8. Build journal lines
    const lines: JournalLineInput[] = [];

    // Debit: A/P account (clears liability)
    const apDebitAmount = totalInvoiceAmount + (forexGainLoss?.type === 'GAIN' ? 0 : (forexGainLoss?.amount || 0));
    lines.push({
      accountId: apAccountId,
      direction: 'Debit',
      amount: forexGainLoss?.type === 'LOSS'
        ? totalInvoiceAmount - (forexGainLoss?.amount || 0)
        : totalInvoiceAmount,
      vendorId: input.vendorId,
      memo: `A/P Payment - ${invoiceDetails.map(i => i.invoice.number).join(', ')}`
    });

    // Debit: Forex Loss (if applicable)
    if (forexGainLoss?.type === 'LOSS') {
      lines.push({
        accountId: 'acc-7130', // Beban Selisih Kurs
        direction: 'Debit',
        amount: forexGainLoss.amount,
        memo: `Forex Loss - Rate change`
      });
    }

    // Debit: Bank Charge (if applicable)
    if (input.bankCharge && input.bankCharge > 0) {
      lines.push({
        accountId: 'acc-6950', // Beban Bank
        direction: 'Debit',
        amount: input.bankCharge,
        memo: 'Bank Transfer Fee'
      });
    }

    // Credit: Payment account (cash/bank)
    const totalCashOut = input.paymentAmount + (input.bankCharge || 0);
    lines.push({
      accountId: paymentAccountEntity.id,
      direction: 'Credit',
      amount: totalCashOut,
      memo: `Payment to ${vendor.name}`
    });

    // Credit: Early Payment Discount (if applicable)
    if (input.earlyPaymentDiscount && input.earlyPaymentDiscount > 0) {
      lines.push({
        accountId: 'acc-5130', // Potongan Tunai Pembelian
        direction: 'Credit',
        amount: input.earlyPaymentDiscount,
        memo: 'Early Payment Discount'
      });
    }

    // Credit: Forex Gain (if applicable)
    if (forexGainLoss?.type === 'GAIN') {
      lines.push({
        accountId: 'acc-7030', // Pendapatan Selisih Kurs
        direction: 'Credit',
        amount: forexGainLoss.amount,
        memo: `Forex Gain - Rate change`
      });
    }

    // 9. Create journal entry
    const journalEntry = JournalEntry.create({
      entryNumber,
      entryDate: input.entryDate || new Date(),
      description: input.description || `A/P Payment to ${vendor.name}`,
      reference: input.reference,
      entryType: 'Manual',
      status: input.saveAsDraft ? 'Draft' : 'Posted',
      sourceService: 'manual',
      createdBy: input.createdBy,
      lines
    });

    // 10. Save journal entry
    await this.journalEntryRepository.save(journalEntry);

    // 11. Update invoice statuses
    for (const detail of invoiceDetails) {
      await this.invoiceRepository.applyPayment(
        detail.invoice.id,
        detail.paymentAmount,
        journalEntry.id
      );
    }

    // 12. Return result
    return {
      journalEntryId: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      status: journalEntry.status,
      vendor: { id: vendor.id, name: vendor.name },
      payment: {
        amount: input.paymentAmount,
        method: input.paymentMethod,
        accountCode: paymentAccount.code
      },
      invoicesPaid: invoiceDetails.map(d => ({
        invoiceNumber: d.invoice.number,
        amountPaid: d.paymentAmount,
        remainingBalance: d.invoice.remainingBalance - d.paymentAmount,
        status: (d.invoice.remainingBalance - d.paymentAmount) === 0 ? 'PAID' : 'PARTIALLY_PAID'
      })),
      discount: input.earlyPaymentDiscount ? {
        amount: input.earlyPaymentDiscount,
        accountCode: '5130'
      } : undefined,
      bankCharge: input.bankCharge ? {
        amount: input.bankCharge,
        accountCode: '6950'
      } : undefined,
      forexGainLoss: forexGainLoss ? {
        type: forexGainLoss.type,
        amount: forexGainLoss.amount,
        accountCode: forexGainLoss.type === 'LOSS' ? '7130' : '7030'
      } : undefined,
      lines: journalEntry.lines.map(line => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        direction: line.direction,
        amount: line.amount
      }))
    };
  }

  private getPaymentAccount(method: PaymentMethod) {
    const accounts: Record<PaymentMethod, { code: string; name: string }> = {
      'CASH': { code: '1010', name: 'Kas Kecil - Kantor Pusat' },
      'CASH_WAREHOUSE': { code: '1011', name: 'Kas Kecil - Gudang' },
      'BANK_BCA_OPERASIONAL': { code: '1020', name: 'Bank BCA - Operasional' },
      'BANK_BCA_GAJI': { code: '1021', name: 'Bank BCA - Gaji' },
      'BANK_BRI_TABUNGAN': { code: '1022', name: 'Bank BRI - Tabungan' },
      'BANK_CIMB_USD': { code: '1023', name: 'Bank CIMB Niaga - USD' },
      'BANK_MANDIRI': { code: '1024', name: 'Bank Mandiri - Operasional' },
      'CHEQUE': { code: '1020', name: 'Bank BCA - Operasional' } // Cheques clear through bank
    };
    return accounts[method];
  }
}
```

---

## 7. A/P Aging Report Integration

### Outstanding A/P by Vendor

```typescript
interface APAgingReport {
  vendor: {
    id: string;
    name: string;
  };
  totalOutstanding: number;
  aging: {
    current: number;      // 0-30 days
    days31to60: number;   // 31-60 days
    days61to90: number;   // 61-90 days
    over90days: number;   // > 90 days
  };
  invoices: {
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    originalAmount: number;
    paidAmount: number;
    remainingBalance: number;
    daysOutstanding: number;
  }[];
}
```

### A/P Payment Screen Integration

When selecting a vendor, show:
1. Total outstanding balance
2. Aging breakdown
3. List of unpaid/partially paid invoices
4. Suggested payment priority (oldest first)

---

## 8. Summary

### Journal Entry Patterns

| Scenario | DEBIT | CREDIT |
|----------|-------|--------|
| **Simple Payment** | Hutang Usaha (A/P) | Cash/Bank |
| **With Discount** | Hutang Usaha (full) | Cash/Bank (net) + Potongan Pembelian |
| **With Bank Fee** | Hutang Usaha + Beban Bank | Cash/Bank (total) |
| **With Forex Loss** | Hutang Usaha + Beban Selisih Kurs | Cash/Bank |
| **With Forex Gain** | Hutang Usaha | Cash/Bank + Pendapatan Selisih Kurs |

### Key Accounts

| Code | Account | Direction | Purpose |
|------|---------|-----------|---------|
| 2010-2012 | Hutang Dagang | Debit | Clear A/P liability |
| 1010-1024 | Cash/Bank | Credit | Money paid out |
| 5130 | Potongan Tunai Pembelian | Credit | Early payment discount |
| 6950 | Beban Bank | Debit | Bank transfer fees |
| 7030 | Pendapatan Selisih Kurs | Credit | Forex gain |
| 7130 | Beban Selisih Kurs | Debit | Forex loss |

### API Endpoint

```
POST /api/accounting/ap-payments
```

---

## 9. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - Recording expenses with A/P
- [Fund Transfer Between Accounts](./FUND_TRANSFER_BETWEEN_ACCOUNTS.md) - Internal transfers
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md) - Service design
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
