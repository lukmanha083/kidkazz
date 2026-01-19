# Accounts Receivable Collection Entry

## Overview

This document describes the **Accounts Receivable (A/R) Collection Entry** feature for recording customer payments on credit sales. This is used when:

1. A sale was previously recorded on credit terms (Accounts Receivable)
2. Customer pays their outstanding invoice
3. Partial payments are received
4. Early payment discounts are given

**Flow:**
```
Step 1: Record sale with A/R         →    Step 2: Collect the A/R
─────────────────────────────────         ──────────────────────────
DR: Piutang Usaha (A/R)                   DR: Cash/Bank
CR: Sales Revenue                         CR: Piutang Usaha (A/R)
```

**Journal Entry Format:**
```
DEBIT:  Cash/Bank (asset increases - money received)
CREDIT: Piutang Usaha / Accounts Receivable (asset decreases - receivable collected)
```

---

## 1. User Interface Design

### A/R Collection Form

```
┌──────────────────────────────────────────────────────────────────┐
│  💵 Penerimaan Piutang (A/R Collection)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Customer *                                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search customer...                                 ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Outstanding Invoices for: Toko Maju Jaya                     ││
│  │ Total Outstanding: Rp 25,000,000                             ││
│  │ ┌────────────────────────────────────────────────────────┐   ││
│  │ │ ☑️ INV-2025-001 │ 2025-01-05 │ Rp 10,000,000 │ Due: Jan 20││
│  │ │ ☑️ INV-2025-002 │ 2025-01-10 │ Rp  8,000,000 │ Due: Jan 25││
│  │ │ ☐ INV-2025-003 │ 2025-01-15 │ Rp  7,000,000 │ Due: Feb 01││
│  │ └────────────────────────────────────────────────────────┘   ││
│  │ Selected: 2 invoices | Total: Rp 18,000,000                  ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Amount Received *                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Rp                                       18,000,000        │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ✅ Amount matches selected invoices                             │
│                                                                  │
│  Received Via *                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │   💵 Cash       │ │   🏦 Bank       │ │   💳 Transfer   │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  ┌─────────────────┐ ┌─────────────────┐                        │
│  │   📱 QRIS       │ │   💳 EDC/Card   │                        │
│  └─────────────────┘ └─────────────────┘                        │
│                                                                  │
│  [If Bank selected]                                              │
│  Bank Account                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Bank BCA - Operasional (1020)                         ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ☐ Apply Early Payment Discount                                  │
│  [If checked]                                                    │
│  Discount Given: Rp ____________  (2% = Rp 360,000)              │
│                                                                  │
│  Date                          Reference                         │
│  ┌────────────────────────┐    ┌────────────────────────────┐   │
│  │ 2025-01-17         📅 │    │ RCV-MAJU-001               │   │
│  └────────────────────────┘    └────────────────────────────┘   │
│                                                                  │
│  Description                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Penerimaan pembayaran dari Toko Maju Jaya                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Preview Journal Entry                                        ││
│  │ ┌──────────────────┬──────┬─────────────┬─────────────────┐ ││
│  │ │ Account          │ Code │ Debit       │ Credit          │ ││
│  │ ├──────────────────┼──────┼─────────────┼─────────────────┤ ││
│  │ │ Bank BCA         │ 1020 │ 18,000,000  │                 │ ││
│  │ │ Piutang Usaha    │ 1110 │             │ 18,000,000      │ ││
│  │ └──────────────────┴──────┴─────────────┴─────────────────┘ ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft          │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│                              ┌────────────────────────────────┐ │
│                              │     ✅ Receive & Post          │ │
│                              └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Accounts Receivable Account Types

### Asset Accounts - Receivables (1100-1199)

| Code | Indonesian Name | English Name | Use Case |
|------|-----------------|--------------|----------|
| **1110** | Piutang Usaha | Accounts Receivable - Trade | General customer receivables |
| **1111** | Piutang Usaha - Retail | A/R - Retail Customers | Retail credit sales |
| **1112** | Piutang Usaha - Grosir | A/R - Wholesale Customers | Wholesale credit sales |
| **1113** | Piutang Usaha - B2B | A/R - B2B Customers | B2B credit sales |
| **1114** | Piutang Usaha - GoFood/GrabFood | A/R - Food Delivery Apps | Delivery app receivables |
| **1130** | Piutang Karyawan | Employee Receivables | Employee loans/advances |
| **1140** | Piutang Lain-lain | Other Receivables | Non-trade receivables |

### Receipt Accounts (Cash & Bank)

| Code | Indonesian Name | English Name |
|------|-----------------|--------------|
| **1010** | Kas Kecil - Kantor Pusat | Petty Cash - Head Office |
| **1011** | Kas Kecil - Gudang | Petty Cash - Warehouse |
| **1012** | Kas Laci POS - Toko 1 | POS Cash Drawer - Store 1 |
| **1013** | Kas Laci POS - Toko 2 | POS Cash Drawer - Store 2 |
| **1014** | Kas Laci POS - Toko 3 | POS Cash Drawer - Store 3 |
| **1020** | Bank BCA - Operasional | BCA Bank - Operating |
| **1022** | Bank BRI - Tabungan | BRI Bank - Savings |
| **1024** | Bank Mandiri - Operasional | Mandiri Bank - Operating |

### Discount & Write-off Accounts

| Code | Indonesian Name | English Name |
|------|-----------------|--------------|
| **4110** | Diskon Penjualan | Sales Discounts (Contra-Revenue) |
| **4130** | Potongan Tunai (Cash Discount) | Cash Discounts Given |
| **6810** | Beban Kerugian Piutang | Bad Debt Expense |
| **1120** | Cadangan Kerugian Piutang | Allowance for Doubtful Accounts |

---

## 3. Collection Scenarios and Journal Entries

### Scenario 1: Full Collection - Single Invoice

**Context:** Customer pays invoice in full

**User Input:**
- Customer: `Toko Maju Jaya`
- Invoice: `INV-2025-001` (Rp 10,000,000)
- Amount Received: `Rp 10,000,000`
- Receipt Method: `Bank BCA - Operasional`
- Description: `Penerimaan pembayaran INV-2025-001`
- Reference: `RCV-MAJU-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0050",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Penerimaan pembayaran INV-2025-001 dari Toko Maju Jaya",
  reference: "RCV-MAJU-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 10000000,
      memo: "A/R Collection - INV-2025-001"
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Piutang Usaha",
      direction: "Credit",
      amount: 10000000,
      customerId: "cust-maju-jaya",
      memo: "Payment received from Toko Maju Jaya"
    }
  ]
}
```

---

### Scenario 2: Full Collection - Multiple Invoices

**Context:** Customer pays multiple invoices at once

**User Input:**
- Customer: `Toko Maju Jaya`
- Invoices:
  - `INV-2025-001` (Rp 10,000,000)
  - `INV-2025-002` (Rp 8,000,000)
- Total Received: `Rp 18,000,000`
- Receipt Method: `Bank Transfer`
- Description: `Penerimaan pembayaran dari Toko Maju Jaya`
- Reference: `RCV-MAJU-002`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0051",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Penerimaan pembayaran dari Toko Maju Jaya",
  reference: "RCV-MAJU-002",
  notes: "Invoices: INV-2025-001, INV-2025-002",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 18000000,
      memo: "A/R Collection - INV-2025-001, INV-2025-002"
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Piutang Usaha",
      direction: "Credit",
      amount: 18000000,
      customerId: "cust-maju-jaya",
      memo: "Payment received from Toko Maju Jaya"
    }
  ]
}
```

---

### Scenario 3: Partial Collection

**Context:** Customer pays part of invoice now, rest later

**User Input:**
- Customer: `CV Sukses Selalu`
- Invoice: `INV-2025-010` (Rp 15,000,000)
- Amount Received: `Rp 10,000,000` (partial)
- Receipt Method: `Cash`
- Description: `Pembayaran sebagian INV-2025-010`
- Reference: `RCV-SUKSES-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0052",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran sebagian INV-2025-010 dari CV Sukses Selalu",
  reference: "RCV-SUKSES-001",
  notes: "Partial payment: Rp 10,000,000 of Rp 15,000,000 (Remaining: Rp 5,000,000)",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1010",
      accountCode: "1010",
      accountName: "Kas Kecil - Kantor Pusat",
      direction: "Debit",
      amount: 10000000,
      memo: "Partial A/R Collection - INV-2025-010 (10M of 15M)"
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Piutang Usaha",
      direction: "Credit",
      amount: 10000000,
      customerId: "cust-sukses-selalu",
      memo: "Partial Payment from CV Sukses Selalu"
    }
  ]
}
```

**Invoice Status After Collection:**
```
INV-2025-010
- Original Amount: Rp 15,000,000
- Collected: Rp 10,000,000
- Remaining: Rp 5,000,000
- Status: PARTIALLY_PAID
```

---

### Scenario 4: Collection with Early Payment Discount

**Context:** Customer pays early, receives 2% discount

**User Input:**
- Customer: `PT Pelanggan Prima`
- Invoice: `INV-2025-020` (Rp 20,000,000)
- Payment Terms: `2/10 Net 30` (2% discount if paid within 10 days)
- Early Payment Discount: `Rp 400,000` (2%)
- Amount Received: `Rp 19,600,000`
- Receipt Method: `Bank BCA - Operasional`
- Description: `Pembayaran INV-2025-020 dengan diskon 2%`
- Reference: `RCV-PRIMA-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0053",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran INV-2025-020 dengan diskon 2%",
  reference: "RCV-PRIMA-001",
  notes: "Early payment discount given: 2% (Rp 400,000)",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 19600000,   // Actual amount received
      memo: "A/R Collection - INV-2025-020 (after 2% discount)"
    },
    {
      accountId: "acc-4130",
      accountCode: "4130",
      accountName: "Potongan Tunai (Cash Discount)",
      direction: "Debit",
      amount: 400000,     // Discount given
      memo: "Early Payment Discount Given - 2%"
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Piutang Usaha",
      direction: "Credit",
      amount: 20000000,   // Full invoice amount cleared
      customerId: "cust-prima",
      memo: "Full invoice cleared with 2% discount"
    }
  ]
}
```

**Note:** The discount (4130 - Potongan Tunai) is a contra-revenue account that reduces sales revenue.

---

### Scenario 5: Collection via QRIS/EDC with Processing Fee

**Context:** Customer pays via QRIS, payment gateway charges fee

**User Input:**
- Customer: `Toko Berkah`
- Invoice: `INV-2025-030` (Rp 5,000,000)
- Receipt Method: `QRIS`
- Processing Fee: `Rp 35,000` (0.7% MDR)
- Net Received: `Rp 4,965,000`
- Description: `Pembayaran via QRIS - INV-2025-030`
- Reference: `RCV-BERKAH-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0054",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran via QRIS - INV-2025-030",
  reference: "RCV-BERKAH-001",
  notes: "QRIS MDR: 0.7% (Rp 35,000)",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 4965000,    // Net amount received
      memo: "QRIS Payment - Net after MDR"
    },
    {
      accountId: "acc-6372",
      accountCode: "6372",
      accountName: "Beban QRIS",
      direction: "Debit",
      amount: 35000,      // Processing fee
      memo: "QRIS MDR Fee - 0.7%"
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Piutang Usaha",
      direction: "Credit",
      amount: 5000000,    // Full invoice amount
      customerId: "cust-berkah",
      memo: "Payment via QRIS from Toko Berkah"
    }
  ]
}
```

---

### Scenario 6: Collection from Food Delivery App (GoFood/GrabFood)

**Context:** Receive settlement from GoFood for multiple orders

**User Input:**
- Customer: `GoFood (Gojek)`
- Settlement Period: `1-15 Jan 2025`
- Gross Sales: `Rp 12,000,000`
- Commission (20%): `Rp 2,400,000`
- Net Received: `Rp 9,600,000`
- Receipt Method: `Bank BCA - Operasional`
- Description: `Settlement GoFood periode 1-15 Jan 2025`
- Reference: `GOFOOD-JAN1-2025`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0055",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Settlement GoFood periode 1-15 Jan 2025",
  reference: "GOFOOD-JAN1-2025",
  notes: "Gross: Rp 12,000,000 | Commission 20%: Rp 2,400,000 | Net: Rp 9,600,000",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 9600000,    // Net settlement received
      memo: "GoFood Settlement - Net"
    },
    {
      accountId: "acc-6361",
      accountCode: "6361",
      accountName: "Beban Komisi GoFood",
      direction: "Debit",
      amount: 2400000,    // Commission deducted
      memo: "GoFood Commission - 20%"
    },
    {
      accountId: "acc-1114",
      accountCode: "1114",
      accountName: "Piutang Usaha - GoFood/GrabFood",
      direction: "Credit",
      amount: 12000000,   // Gross sales cleared
      memo: "GoFood Settlement - 1-15 Jan 2025"
    }
  ]
}
```

---

### Scenario 7: Bad Debt Write-Off

**Context:** Customer cannot pay, write off as bad debt

**User Input:**
- Customer: `CV Bangkrut Jaya` (bankrupt)
- Invoice: `INV-2024-100` (Rp 8,000,000)
- Write-off Amount: `Rp 8,000,000`
- Reason: `Customer declared bankruptcy`
- Description: `Penghapusan piutang tak tertagih`
- Reference: `WO-BANGKRUT-001`

**Generated Journal Entry (Direct Write-off Method):**

```typescript
{
  entryNumber: "JE-2025-0056",
  entryDate: "2025-01-17",
  entryType: "Adjusting",
  status: "Posted",
  description: "Penghapusan piutang tak tertagih - CV Bangkrut Jaya",
  reference: "WO-BANGKRUT-001",
  notes: "Reason: Customer declared bankruptcy",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-6810",
      accountCode: "6810",
      accountName: "Beban Kerugian Piutang",
      direction: "Debit",
      amount: 8000000,
      memo: "Bad Debt Write-off - INV-2024-100"
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Piutang Usaha",
      direction: "Credit",
      amount: 8000000,
      customerId: "cust-bangkrut",
      memo: "Write-off - CV Bangkrut Jaya (Bankruptcy)"
    }
  ]
}
```

**Alternative: Allowance Method (if using allowance account):**

```typescript
// When setting up allowance (estimate)
{
  lines: [
    {
      accountCode: "6810",        // Beban Kerugian Piutang
      direction: "Debit",
      amount: 8000000
    },
    {
      accountCode: "1120",        // Cadangan Kerugian Piutang (Contra-Asset)
      direction: "Credit",
      amount: 8000000
    }
  ]
}

// When actually writing off
{
  lines: [
    {
      accountCode: "1120",        // Cadangan Kerugian Piutang
      direction: "Debit",
      amount: 8000000
    },
    {
      accountCode: "1110",        // Piutang Usaha
      direction: "Credit",
      amount: 8000000
    }
  ]
}
```

---

### Scenario 8: Recovery of Previously Written-Off Debt

**Context:** Customer pays debt that was previously written off

**User Input:**
- Customer: `CV Bangkrut Jaya` (recovered)
- Original Invoice: `INV-2024-100` (written off Rp 8,000,000)
- Amount Received: `Rp 5,000,000` (partial recovery)
- Receipt Method: `Bank BCA - Operasional`
- Description: `Penerimaan piutang yang sudah dihapuskan`
- Reference: `RECOVERY-BANGKRUT-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0057",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Penerimaan piutang yang sudah dihapuskan - CV Bangkrut Jaya",
  reference: "RECOVERY-BANGKRUT-001",
  notes: "Recovery of bad debt written off in 2024",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 5000000,
      memo: "Bad Debt Recovery"
    },
    {
      accountId: "acc-7060",
      accountCode: "7060",
      accountName: "Pendapatan Lain-lain",
      direction: "Credit",
      amount: 5000000,
      memo: "Recovery of written-off debt - CV Bangkrut Jaya"
    }
  ]
}
```

---

## 4. API Design

### Create A/R Collection Endpoint

```
POST /api/accounting/ar-collections
```

### Request Schema

```typescript
interface CreateARCollectionRequest {
  // Required fields
  customerId: string;            // Customer ID
  amountReceived: number;        // Total amount received
  receiptMethod: ReceiptMethod;

  // Invoice selection (at least one required)
  invoices?: InvoiceCollection[]; // Specific invoices being collected
  arAccountId?: string;           // Or collect against A/R account directly

  // Optional fields
  entryDate?: string;             // ISO date, defaults to today
  description?: string;           // Collection description
  reference?: string;             // Receipt reference

  // Discount (optional)
  earlyPaymentDiscount?: number;  // Discount given

  // Processing fees (optional)
  processingFee?: number;         // QRIS/EDC MDR fee
  processingFeeAccountId?: string; // Default based on method

  // Platform commission (for GoFood/GrabFood)
  platformCommission?: number;    // Commission deducted
  platformCommissionAccountId?: string;

  saveAsDraft?: boolean;
}

interface InvoiceCollection {
  invoiceId: string;              // Invoice ID
  invoiceNumber: string;          // Invoice number (for reference)
  originalAmount: number;         // Original invoice amount
  collectionAmount: number;       // Amount being collected for this invoice
}

type ReceiptMethod =
  | 'CASH'
  | 'CASH_WAREHOUSE'
  | 'POS_STORE_1'
  | 'POS_STORE_2'
  | 'POS_STORE_3'
  | 'BANK_BCA_OPERASIONAL'
  | 'BANK_BRI_TABUNGAN'
  | 'BANK_MANDIRI'
  | 'QRIS'
  | 'EDC_DEBIT'
  | 'EDC_CREDIT'
  | 'BANK_TRANSFER';
```

### Response Schema

```typescript
interface CreateARCollectionResponse {
  success: boolean;
  data: {
    journalEntryId: string;
    entryNumber: string;
    status: 'Draft' | 'Posted';
    customer: {
      id: string;
      name: string;
    };
    collection: {
      amountReceived: number;
      method: string;
      accountCode: string;
    };
    invoicesCollected: {
      invoiceNumber: string;
      amountCollected: number;
      remainingBalance: number;
      status: 'PAID' | 'PARTIALLY_PAID';
    }[];
    discount?: {
      amount: number;
      accountCode: string;
    };
    processingFee?: {
      amount: number;
      accountCode: string;
    };
    platformCommission?: {
      amount: number;
      accountCode: string;
    };
    lines: JournalLineDTO[];
  };
}
```

### Example API Call - Simple Collection

```bash
curl -X POST /api/accounting/ar-collections \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "customerId": "cust-maju-jaya",
    "amountReceived": 10000000,
    "receiptMethod": "BANK_BCA_OPERASIONAL",
    "invoices": [
      {
        "invoiceId": "inv-001",
        "invoiceNumber": "INV-2025-001",
        "originalAmount": 10000000,
        "collectionAmount": 10000000
      }
    ],
    "description": "Penerimaan pembayaran INV-2025-001",
    "reference": "RCV-MAJU-001"
  }'
```

### Example API Call - Collection with Discount

```bash
curl -X POST /api/accounting/ar-collections \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "customerId": "cust-prima",
    "amountReceived": 19600000,
    "receiptMethod": "BANK_BCA_OPERASIONAL",
    "invoices": [
      {
        "invoiceId": "inv-020",
        "invoiceNumber": "INV-2025-020",
        "originalAmount": 20000000,
        "collectionAmount": 20000000
      }
    ],
    "earlyPaymentDiscount": 400000,
    "description": "Pembayaran dengan diskon 2%",
    "reference": "RCV-PRIMA-001"
  }'
```

### Example API Call - GoFood Settlement

```bash
curl -X POST /api/accounting/ar-collections \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "customerId": "platform-gofood",
    "amountReceived": 9600000,
    "receiptMethod": "BANK_BCA_OPERASIONAL",
    "arAccountId": "acc-1114",
    "platformCommission": 2400000,
    "platformCommissionAccountId": "acc-6361",
    "description": "Settlement GoFood 1-15 Jan 2025",
    "reference": "GOFOOD-JAN1-2025"
  }'
```

---

## 5. Validation Rules

### Business Rules

1. **Customer Validation**
   - Customer must exist in the system
   - Customer must have outstanding A/R balance (except for bad debt recovery)

2. **Invoice Validation**
   - Invoice must belong to the selected customer
   - Invoice must have outstanding balance
   - Collection amount cannot exceed invoice balance

3. **Amount Validation**
   - Amount received must be greater than 0
   - Total collection - discount must equal amount received
   - Processing fees must be >= 0

4. **A/R Account Validation**
   - A/R account must be asset type (1100-1199)
   - A/R account must be active

5. **Receipt Account Validation**
   - Receipt account must be cash/bank type (1000-1039)
   - Receipt account must be active

6. **Date Validation**
   - Entry date cannot be in the future
   - Entry date cannot be in closed fiscal period

### Error Responses

```typescript
// No outstanding balance
{
  "success": false,
  "error": {
    "code": "NO_OUTSTANDING_BALANCE",
    "message": "Customer Toko Maju Jaya has no outstanding A/R balance."
  }
}

// Collection exceeds balance
{
  "success": false,
  "error": {
    "code": "COLLECTION_EXCEEDS_BALANCE",
    "message": "Collection amount (Rp 15,000,000) exceeds invoice balance (Rp 10,000,000) for INV-2025-001."
  }
}

// Invalid discount
{
  "success": false,
  "error": {
    "code": "INVALID_DISCOUNT",
    "message": "Amount received (Rp 19,600,000) plus discount (Rp 500,000) does not equal invoice total (Rp 20,000,000)."
  }
}
```

---

## 6. Use Case Implementation

### CreateARCollection Use Case

```typescript
interface CreateARCollectionInput {
  customerId: string;
  amountReceived: number;
  receiptMethod: ReceiptMethod;
  invoices?: InvoiceCollection[];
  arAccountId?: string;
  entryDate?: Date;
  description?: string;
  reference?: string;
  earlyPaymentDiscount?: number;
  processingFee?: number;
  processingFeeAccountId?: string;
  platformCommission?: number;
  platformCommissionAccountId?: string;
  saveAsDraft?: boolean;
  createdBy: string;
}

class CreateARCollection {
  private readonly DEFAULT_AR_ACCOUNT = 'acc-1110'; // Piutang Usaha

  constructor(
    private customerRepository: ICustomerRepository,
    private invoiceRepository: IInvoiceRepository,
    private accountRepository: IAccountRepository,
    private journalEntryRepository: IJournalEntryRepository,
    private entryNumberGenerator: IEntryNumberGenerator
  ) {}

  async execute(input: CreateARCollectionInput): Promise<CreateARCollectionOutput> {
    // 1. Validate customer
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new Error('Customer not found');
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
        if (invoice.customerId !== input.customerId) {
          throw new Error(`Invoice ${inv.invoiceNumber} does not belong to this customer`);
        }
        if (inv.collectionAmount > invoice.remainingBalance) {
          throw new Error(`Collection exceeds balance for ${inv.invoiceNumber}`);
        }
        totalInvoiceAmount += inv.collectionAmount;
        invoiceDetails.push({ invoice, collectionAmount: inv.collectionAmount });
      }
    }

    // 3. Validate amounts
    const expectedTotal = input.amountReceived +
      (input.earlyPaymentDiscount || 0) +
      (input.processingFee || 0) +
      (input.platformCommission || 0);

    if (Math.abs(totalInvoiceAmount - expectedTotal) > 1) { // Allow Rp 1 rounding
      throw new Error('Collection amounts do not balance');
    }

    // 4. Get receipt account
    const receiptAccount = this.getReceiptAccount(input.receiptMethod);
    const receiptAccountEntity = await this.accountRepository.findByCode(receiptAccount.code);

    // 5. Get A/R account
    const arAccountId = input.arAccountId || this.DEFAULT_AR_ACCOUNT;
    const arAccount = await this.accountRepository.findById(arAccountId);

    // 6. Generate entry number
    const entryNumber = await this.entryNumberGenerator.generate();

    // 7. Build journal lines
    const lines: JournalLineInput[] = [];

    // Debit: Receipt account (cash/bank) - actual amount received
    lines.push({
      accountId: receiptAccountEntity.id,
      direction: 'Debit',
      amount: input.amountReceived,
      memo: `A/R Collection from ${customer.name}`
    });

    // Debit: Early Payment Discount (if given)
    if (input.earlyPaymentDiscount && input.earlyPaymentDiscount > 0) {
      lines.push({
        accountId: 'acc-4130', // Potongan Tunai
        direction: 'Debit',
        amount: input.earlyPaymentDiscount,
        memo: 'Early Payment Discount Given'
      });
    }

    // Debit: Processing Fee (QRIS/EDC)
    if (input.processingFee && input.processingFee > 0) {
      const feeAccountId = input.processingFeeAccountId || this.getProcessingFeeAccount(input.receiptMethod);
      lines.push({
        accountId: feeAccountId,
        direction: 'Debit',
        amount: input.processingFee,
        memo: 'Payment Processing Fee'
      });
    }

    // Debit: Platform Commission (GoFood/GrabFood)
    if (input.platformCommission && input.platformCommission > 0) {
      lines.push({
        accountId: input.platformCommissionAccountId || 'acc-6361',
        direction: 'Debit',
        amount: input.platformCommission,
        memo: 'Platform Commission'
      });
    }

    // Credit: A/R account (clears receivable)
    lines.push({
      accountId: arAccountId,
      direction: 'Credit',
      amount: totalInvoiceAmount,
      customerId: input.customerId,
      memo: `Payment received from ${customer.name}`
    });

    // 8. Create journal entry
    const journalEntry = JournalEntry.create({
      entryNumber,
      entryDate: input.entryDate || new Date(),
      description: input.description || `A/R Collection from ${customer.name}`,
      reference: input.reference,
      entryType: 'Manual',
      status: input.saveAsDraft ? 'Draft' : 'Posted',
      sourceService: 'manual',
      createdBy: input.createdBy,
      lines
    });

    // 9. Save journal entry
    await this.journalEntryRepository.save(journalEntry);

    // 10. Update invoice statuses
    for (const detail of invoiceDetails) {
      await this.invoiceRepository.applyCollection(
        detail.invoice.id,
        detail.collectionAmount,
        journalEntry.id
      );
    }

    // 11. Return result
    return {
      journalEntryId: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      status: journalEntry.status,
      customer: { id: customer.id, name: customer.name },
      collection: {
        amountReceived: input.amountReceived,
        method: input.receiptMethod,
        accountCode: receiptAccount.code
      },
      invoicesCollected: invoiceDetails.map(d => ({
        invoiceNumber: d.invoice.number,
        amountCollected: d.collectionAmount,
        remainingBalance: d.invoice.remainingBalance - d.collectionAmount,
        status: (d.invoice.remainingBalance - d.collectionAmount) === 0 ? 'PAID' : 'PARTIALLY_PAID'
      })),
      discount: input.earlyPaymentDiscount ? {
        amount: input.earlyPaymentDiscount,
        accountCode: '4130'
      } : undefined,
      processingFee: input.processingFee ? {
        amount: input.processingFee,
        accountCode: this.getProcessingFeeAccount(input.receiptMethod)
      } : undefined,
      platformCommission: input.platformCommission ? {
        amount: input.platformCommission,
        accountCode: input.platformCommissionAccountId || '6361'
      } : undefined,
      lines: journalEntry.lines.map(line => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        direction: line.direction,
        amount: line.amount
      }))
    };
  }

  private getReceiptAccount(method: ReceiptMethod) {
    const accounts: Record<ReceiptMethod, { code: string; name: string }> = {
      'CASH': { code: '1010', name: 'Kas Kecil - Kantor Pusat' },
      'CASH_WAREHOUSE': { code: '1011', name: 'Kas Kecil - Gudang' },
      'POS_STORE_1': { code: '1012', name: 'Kas Laci POS - Toko 1' },
      'POS_STORE_2': { code: '1013', name: 'Kas Laci POS - Toko 2' },
      'POS_STORE_3': { code: '1014', name: 'Kas Laci POS - Toko 3' },
      'BANK_BCA_OPERASIONAL': { code: '1020', name: 'Bank BCA - Operasional' },
      'BANK_BRI_TABUNGAN': { code: '1022', name: 'Bank BRI - Tabungan' },
      'BANK_MANDIRI': { code: '1024', name: 'Bank Mandiri - Operasional' },
      'QRIS': { code: '1020', name: 'Bank BCA - Operasional' },
      'EDC_DEBIT': { code: '1020', name: 'Bank BCA - Operasional' },
      'EDC_CREDIT': { code: '1020', name: 'Bank BCA - Operasional' },
      'BANK_TRANSFER': { code: '1020', name: 'Bank BCA - Operasional' }
    };
    return accounts[method];
  }

  private getProcessingFeeAccount(method: ReceiptMethod): string {
    const feeAccounts: Partial<Record<ReceiptMethod, string>> = {
      'QRIS': 'acc-6372',      // Beban QRIS
      'EDC_DEBIT': 'acc-6373', // Beban EDC/Kartu Kredit
      'EDC_CREDIT': 'acc-6373' // Beban EDC/Kartu Kredit
    };
    return feeAccounts[method] || 'acc-6370'; // Beban Payment Gateway
  }
}
```

---

## 7. A/R Aging Report Integration

### Outstanding A/R by Customer

```typescript
interface ARAgingReport {
  customer: {
    id: string;
    name: string;
    creditLimit?: number;
  };
  totalOutstanding: number;
  aging: {
    current: number;      // 0-30 days
    days31to60: number;   // 31-60 days
    days61to90: number;   // 61-90 days
    over90days: number;   // > 90 days (potential bad debt)
  };
  invoices: {
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    originalAmount: number;
    collectedAmount: number;
    remainingBalance: number;
    daysOutstanding: number;
    status: 'CURRENT' | 'OVERDUE' | 'SEVERELY_OVERDUE';
  }[];
}
```

### Collection Priority Indicators

```
🟢 Current (0-30 days) - Normal collection
🟡 Overdue (31-60 days) - Follow up needed
🟠 Severely Overdue (61-90 days) - Escalate
🔴 Critical (>90 days) - Consider bad debt reserve
```

---

## 8. Summary

### Journal Entry Patterns

| Scenario | DEBIT | CREDIT |
|----------|-------|--------|
| **Simple Collection** | Cash/Bank | Piutang Usaha (A/R) |
| **With Discount Given** | Cash/Bank + Potongan Tunai | Piutang Usaha (full) |
| **With QRIS/EDC Fee** | Cash/Bank (net) + Beban QRIS | Piutang Usaha |
| **GoFood/GrabFood** | Cash/Bank (net) + Komisi | Piutang Usaha (gross) |
| **Bad Debt Write-off** | Beban Kerugian Piutang | Piutang Usaha |
| **Bad Debt Recovery** | Cash/Bank | Pendapatan Lain-lain |

### Key Accounts

| Code | Account | Direction | Purpose |
|------|---------|-----------|---------|
| 1010-1024 | Cash/Bank | Debit | Money received |
| 1110-1114 | Piutang Usaha | Credit | Clear A/R receivable |
| 4130 | Potongan Tunai | Debit | Early payment discount given |
| 6370-6373 | Beban Payment Gateway | Debit | QRIS/EDC fees |
| 6361-6362 | Komisi GoFood/GrabFood | Debit | Platform commissions |
| 6810 | Beban Kerugian Piutang | Debit | Bad debt expense |
| 1120 | Cadangan Kerugian Piutang | Credit | Bad debt allowance |
| 7060 | Pendapatan Lain-lain | Credit | Bad debt recovery |

### API Endpoint

```
POST /api/accounting/ar-collections
```

---

## 9. Comparison: A/R Collection vs A/P Payment

| Aspect | A/R Collection | A/P Payment |
|--------|----------------|-------------|
| **Purpose** | Receive customer payment | Pay vendor/supplier |
| **We are** | Receiving money | Paying money |
| **Main Account** | Piutang (A/R) - Asset | Hutang (A/P) - Liability |
| **Direction** | DR: Cash, CR: A/R | DR: A/P, CR: Cash |
| **Discount** | We give discount (reduces revenue) | We receive discount (reduces COGS) |
| **Discount Account** | 4130 Potongan Tunai (DR) | 5130 Potongan Pembelian (CR) |
| **Processing Fee** | Reduces our receipt | Increases our payment |
| **Bad Debt** | Our loss (6810) | N/A |

---

## 10. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Accounts Payable Payment Entry](./ACCOUNTS_PAYABLE_PAYMENT_ENTRY.md) - Paying vendor liabilities
- [Automatic Income Receipt Entry](./AUTOMATIC_INCOME_RECEIPT_ENTRY.md) - Recording income with A/R
- [Payment Method and Journal Entry Logic](./PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md) - Sales journal entries
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md) - Service design
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
