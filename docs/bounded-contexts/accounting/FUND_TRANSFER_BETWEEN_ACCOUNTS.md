# Fund Transfer Between Accounts

## Overview

This document describes the **Fund Transfer** feature for moving money between cash and bank accounts. This is an internal transfer that does NOT affect income or expenses - it simply moves funds from one account to another.

**Common Use Cases:**
- Transfer between bank accounts (BCA to Mandiri)
- Bank deposit (Cash to Bank)
- Cash withdrawal (Bank to Cash)
- Petty cash replenishment (Bank to Petty Cash)
- POS cash drawer deposit (POS Cash to Bank)
- Foreign currency exchange (IDR Bank to USD Bank)

**Journal Entry Format:**
```
DEBIT:  Destination Account (money goes TO here)
CREDIT: Source Account (money comes FROM here)
```

---

## 1. User Interface Design

### Fund Transfer Form

```
┌──────────────────────────────────────────────────────────────────┐
│  🔄 Transfer Dana                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Transfer From (Source) *                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Bank BCA - Operasional (1020)                         ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Balance: Rp 125,500,000                                         │
│                                                                  │
│                         ⬇️                                        │
│                                                                  │
│  Transfer To (Destination) *                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Bank Mandiri - Operasional (1024)                     ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Balance: Rp 45,200,000                                          │
│                                                                  │
│  Amount (IDR) *                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Rp                                       50,000,000        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Date                          Reference                         │
│  ┌────────────────────────┐    ┌────────────────────────────┐   │
│  │ 2025-01-17         📅 │    │ TRF-BCA-MANDIRI-001        │   │
│  └────────────────────────┘    └────────────────────────────┘   │
│                                                                  │
│  Description                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Transfer dana operasional ke rekening Mandiri              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Preview Journal Entry                                        ││
│  │ ┌──────────────┬──────────┬──────────────┬─────────────────┐││
│  │ │ Account      │ Code     │ Debit        │ Credit          │││
│  │ ├──────────────┼──────────┼──────────────┼─────────────────┤││
│  │ │ Bank Mandiri │ 1024     │ 50,000,000   │                 │││
│  │ │ Bank BCA     │ 1020     │              │ 50,000,000      │││
│  │ └──────────────┴──────────┴──────────────┴─────────────────┘││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft          │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│                              ┌────────────────────────────────┐ │
│                              │     ✅ Transfer & Post         │ │
│                              └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Available Transfer Accounts

### Cash & Bank Accounts (1000-1039)

| Code | Indonesian Name | English Name | Type |
|------|-----------------|--------------|------|
| **1010** | Kas Kecil - Kantor Pusat | Petty Cash - Head Office | Cash |
| **1011** | Kas Kecil - Gudang | Petty Cash - Warehouse | Cash |
| **1012** | Kas Laci POS - Toko 1 | POS Cash Drawer - Store 1 | POS Cash |
| **1013** | Kas Laci POS - Toko 2 | POS Cash Drawer - Store 2 | POS Cash |
| **1014** | Kas Laci POS - Toko 3 | POS Cash Drawer - Store 3 | POS Cash |
| **1020** | Bank BCA - Operasional | BCA Bank - Operating | Bank |
| **1021** | Bank BCA - Gaji | BCA Bank - Payroll | Bank |
| **1022** | Bank BRI - Tabungan | BRI Bank - Savings | Bank |
| **1023** | Bank CIMB Niaga - USD | CIMB Niaga Bank - USD | Bank (Foreign) |
| **1024** | Bank Mandiri - Operasional | Mandiri Bank - Operating | Bank |
| **1030** | Deposito Berjangka < 3 Bulan | Time Deposit < 3 Months | Investment |
| **1031** | Reksa Dana Pasar Uang | Money Market Fund | Investment |

### Account Type Mapping

```typescript
type TransferAccountType = 'CASH' | 'POS_CASH' | 'BANK' | 'BANK_FOREIGN' | 'INVESTMENT';

interface TransferAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: TransferAccountType;
  currency: 'IDR' | 'USD';
}

const TRANSFER_ACCOUNTS: TransferAccount[] = [
  // Cash accounts
  { accountId: 'acc-1010', accountCode: '1010', accountName: 'Kas Kecil - Kantor Pusat', accountType: 'CASH', currency: 'IDR' },
  { accountId: 'acc-1011', accountCode: '1011', accountName: 'Kas Kecil - Gudang', accountType: 'CASH', currency: 'IDR' },

  // POS Cash accounts
  { accountId: 'acc-1012', accountCode: '1012', accountName: 'Kas Laci POS - Toko 1', accountType: 'POS_CASH', currency: 'IDR' },
  { accountId: 'acc-1013', accountCode: '1013', accountName: 'Kas Laci POS - Toko 2', accountType: 'POS_CASH', currency: 'IDR' },
  { accountId: 'acc-1014', accountCode: '1014', accountName: 'Kas Laci POS - Toko 3', accountType: 'POS_CASH', currency: 'IDR' },

  // Bank accounts (IDR)
  { accountId: 'acc-1020', accountCode: '1020', accountName: 'Bank BCA - Operasional', accountType: 'BANK', currency: 'IDR' },
  { accountId: 'acc-1021', accountCode: '1021', accountName: 'Bank BCA - Gaji', accountType: 'BANK', currency: 'IDR' },
  { accountId: 'acc-1022', accountCode: '1022', accountName: 'Bank BRI - Tabungan', accountType: 'BANK', currency: 'IDR' },
  { accountId: 'acc-1024', accountCode: '1024', accountName: 'Bank Mandiri - Operasional', accountType: 'BANK', currency: 'IDR' },

  // Bank accounts (Foreign Currency)
  { accountId: 'acc-1023', accountCode: '1023', accountName: 'Bank CIMB Niaga - USD', accountType: 'BANK_FOREIGN', currency: 'USD' },

  // Investment accounts
  { accountId: 'acc-1030', accountCode: '1030', accountName: 'Deposito Berjangka < 3 Bulan', accountType: 'INVESTMENT', currency: 'IDR' },
  { accountId: 'acc-1031', accountCode: '1031', accountName: 'Reksa Dana Pasar Uang', accountType: 'INVESTMENT', currency: 'IDR' },
];
```

---

## 3. Transfer Scenarios and Journal Entries

### Scenario 1: Bank to Bank Transfer

**Use Case:** Transfer operating funds from BCA to Mandiri

**User Input:**
- From: `1020 - Bank BCA - Operasional`
- To: `1024 - Bank Mandiri - Operasional`
- Amount: `Rp 50,000,000`
- Description: `Transfer dana operasional ke rekening Mandiri`
- Reference: `TRF-BCA-MANDIRI-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0030",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Transfer dana operasional ke rekening Mandiri",
  reference: "TRF-BCA-MANDIRI-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1024",
      accountCode: "1024",
      accountName: "Bank Mandiri - Operasional",
      direction: "Debit",
      amount: 50000000,
      memo: "Transfer IN from Bank BCA - Operasional"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 50000000,
      memo: "Transfer OUT to Bank Mandiri - Operasional"
    }
  ]
}
```

---

### Scenario 2: Bank Deposit (Cash to Bank)

**Use Case:** Deposit daily cash sales to bank

**User Input:**
- From: `1010 - Kas Kecil - Kantor Pusat`
- To: `1020 - Bank BCA - Operasional`
- Amount: `Rp 15,000,000`
- Description: `Setoran kas harian ke BCA`
- Reference: `SETOR-BCA-20250117`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0031",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Setoran kas harian ke BCA",
  reference: "SETOR-BCA-20250117",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 15000000,
      memo: "Cash Deposit from Kas Kecil - Kantor Pusat"
    },
    {
      accountId: "acc-1010",
      accountCode: "1010",
      accountName: "Kas Kecil - Kantor Pusat",
      direction: "Credit",
      amount: 15000000,
      memo: "Cash Deposit to Bank BCA - Operasional"
    }
  ]
}
```

---

### Scenario 3: Cash Withdrawal (Bank to Cash)

**Use Case:** Withdraw cash for operational needs

**User Input:**
- From: `1020 - Bank BCA - Operasional`
- To: `1010 - Kas Kecil - Kantor Pusat`
- Amount: `Rp 5,000,000`
- Description: `Tarik tunai untuk kas operasional`
- Reference: `TARIK-BCA-20250117`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0032",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Tarik tunai untuk kas operasional",
  reference: "TARIK-BCA-20250117",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1010",
      accountCode: "1010",
      accountName: "Kas Kecil - Kantor Pusat",
      direction: "Debit",
      amount: 5000000,
      memo: "Cash Withdrawal from Bank BCA - Operasional"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 5000000,
      memo: "Cash Withdrawal to Kas Kecil - Kantor Pusat"
    }
  ]
}
```

---

### Scenario 4: Petty Cash Replenishment

**Use Case:** Replenish petty cash from bank

**User Input:**
- From: `1020 - Bank BCA - Operasional`
- To: `1011 - Kas Kecil - Gudang`
- Amount: `Rp 2,000,000`
- Description: `Pengisian kas kecil gudang`
- Reference: `PETTY-GUDANG-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0033",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pengisian kas kecil gudang",
  reference: "PETTY-GUDANG-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1011",
      accountCode: "1011",
      accountName: "Kas Kecil - Gudang",
      direction: "Debit",
      amount: 2000000,
      memo: "Petty Cash Replenishment"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 2000000,
      memo: "Petty Cash Replenishment to Gudang"
    }
  ]
}
```

---

### Scenario 5: POS Cash Drawer Deposit

**Use Case:** Deposit POS cash drawer to bank at end of day

**User Input:**
- From: `1012 - Kas Laci POS - Toko 1`
- To: `1020 - Bank BCA - Operasional`
- Amount: `Rp 8,500,000`
- Description: `Setoran kas POS Toko 1 - 17 Jan 2025`
- Reference: `SETOR-POS1-20250117`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0034",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Setoran kas POS Toko 1 - 17 Jan 2025",
  reference: "SETOR-POS1-20250117",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 8500000,
      memo: "POS Cash Deposit from Toko 1"
    },
    {
      accountId: "acc-1012",
      accountCode: "1012",
      accountName: "Kas Laci POS - Toko 1",
      direction: "Credit",
      amount: 8500000,
      memo: "POS Cash Deposit to Bank BCA"
    }
  ]
}
```

---

### Scenario 6: Transfer to Time Deposit

**Use Case:** Place excess funds in time deposit

**User Input:**
- From: `1020 - Bank BCA - Operasional`
- To: `1030 - Deposito Berjangka < 3 Bulan`
- Amount: `Rp 100,000,000`
- Description: `Penempatan deposito 3 bulan - BCA`
- Reference: `DEP-BCA-20250117`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0035",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Penempatan deposito 3 bulan - BCA",
  reference: "DEP-BCA-20250117",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1030",
      accountCode: "1030",
      accountName: "Deposito Berjangka < 3 Bulan",
      direction: "Debit",
      amount: 100000000,
      memo: "Time Deposit Placement"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 100000000,
      memo: "Transfer to Time Deposit"
    }
  ]
}
```

---

### Scenario 7: Transfer to Payroll Account

**Use Case:** Transfer funds to payroll account before salary disbursement

**User Input:**
- From: `1020 - Bank BCA - Operasional`
- To: `1021 - Bank BCA - Gaji`
- Amount: `Rp 75,000,000`
- Description: `Transfer dana gaji Januari 2025`
- Reference: `GAJI-JAN-2025`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0036",
  entryDate: "2025-01-25",
  entryType: "Manual",
  status: "Posted",
  description: "Transfer dana gaji Januari 2025",
  reference: "GAJI-JAN-2025",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1021",
      accountCode: "1021",
      accountName: "Bank BCA - Gaji",
      direction: "Debit",
      amount: 75000000,
      memo: "Payroll Fund Transfer - January 2025"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 75000000,
      memo: "Transfer to Payroll Account"
    }
  ]
}
```

---

### Scenario 8: Foreign Currency Transfer (with Exchange Rate)

**Use Case:** Buy USD from IDR funds

**User Input:**
- From: `1020 - Bank BCA - Operasional` (IDR)
- To: `1023 - Bank CIMB Niaga - USD` (USD)
- Amount (Source): `Rp 160,000,000` (IDR)
- Amount (Destination): `$10,000` (USD)
- Exchange Rate: `Rp 16,000 / USD`
- Description: `Pembelian USD untuk pembayaran supplier impor`
- Reference: `FOREX-20250117`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0037",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian USD untuk pembayaran supplier impor",
  reference: "FOREX-20250117",
  sourceService: "manual",
  notes: "Exchange Rate: Rp 16,000 / USD",
  lines: [
    {
      accountId: "acc-1023",
      accountCode: "1023",
      accountName: "Bank CIMB Niaga - USD",
      direction: "Debit",
      amount: 160000000, // Stored in IDR equivalent
      memo: "USD $10,000 @ Rp 16,000"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 160000000,
      memo: "Foreign Currency Purchase - USD"
    }
  ]
}
```

> **Note:** For foreign currency accounts, the amount is stored in IDR equivalent at the transaction exchange rate. Currency tracking and forex gain/loss calculation may be handled separately.

---

## 4. Transfer with Bank Charges

When a bank transfer incurs fees, record it as two entries or combined entry:

### Option A: Combined Entry (Recommended)

**User Input:**
- From: `1020 - Bank BCA - Operasional`
- To: `1024 - Bank Mandiri - Operasional`
- Transfer Amount: `Rp 50,000,000`
- Bank Charge: `Rp 6,500` (auto-detected or manual)
- Description: `Transfer ke Mandiri dengan biaya admin`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0038",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Transfer ke Mandiri dengan biaya admin",
  reference: "TRF-BCA-MANDIRI-002",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1024",
      accountCode: "1024",
      accountName: "Bank Mandiri - Operasional",
      direction: "Debit",
      amount: 50000000,
      memo: "Transfer IN from Bank BCA"
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
      amount: 50006500,
      memo: "Transfer OUT + Bank Fee"
    }
  ]
}
```

### UI for Transfer with Bank Charges

```
┌──────────────────────────────────────────────────────────────────┐
│  🔄 Transfer Dana                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Transfer Amount (IDR) *                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Rp                                       50,000,000        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ☑️ Include Bank Charges                                         │
│                                                                  │
│  Bank Charge Amount                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Rp                                            6,500        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Total Deducted from Source: Rp 50,006,500                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. API Design

### Create Fund Transfer Endpoint

```
POST /api/accounting/transfers
```

### Request Schema

```typescript
interface CreateFundTransferRequest {
  // Required fields
  fromAccountId: string;      // Source account ID (e.g., "acc-1020")
  toAccountId: string;        // Destination account ID (e.g., "acc-1024")
  amount: number;             // Transfer amount in IDR

  // Optional fields
  entryDate?: string;         // ISO date, defaults to today
  description?: string;       // Transfer description
  reference?: string;         // External reference (bank reference #)

  // Bank charges (optional)
  bankCharge?: number;        // Bank transfer fee
  bankChargeAccountId?: string; // Default: acc-6950 (Beban Bank)

  // Foreign currency (optional)
  exchangeRate?: number;      // Exchange rate if different currencies
  foreignAmount?: number;     // Amount in foreign currency
  foreignCurrency?: string;   // Foreign currency code (e.g., 'USD')

  saveAsDraft?: boolean;      // If true, save as Draft; otherwise Post immediately
}
```

### Response Schema

```typescript
interface CreateFundTransferResponse {
  success: boolean;
  data: {
    journalEntryId: string;
    entryNumber: string;
    status: 'Draft' | 'Posted';
    fromAccount: {
      code: string;
      name: string;
      amount: number;
    };
    toAccount: {
      code: string;
      name: string;
      amount: number;
    };
    bankCharge?: {
      code: string;
      name: string;
      amount: number;
    };
    lines: {
      accountCode: string;
      accountName: string;
      direction: 'Debit' | 'Credit';
      amount: number;
    }[];
  };
}
```

### Example API Call - Simple Transfer

```bash
curl -X POST /api/accounting/transfers \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "fromAccountId": "acc-1020",
    "toAccountId": "acc-1024",
    "amount": 50000000,
    "description": "Transfer dana operasional ke rekening Mandiri",
    "reference": "TRF-BCA-MANDIRI-001",
    "saveAsDraft": false
  }'
```

### Example API Call - Transfer with Bank Charge

```bash
curl -X POST /api/accounting/transfers \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "fromAccountId": "acc-1020",
    "toAccountId": "acc-1024",
    "amount": 50000000,
    "bankCharge": 6500,
    "description": "Transfer ke Mandiri dengan biaya admin",
    "reference": "TRF-BCA-MANDIRI-002",
    "saveAsDraft": false
  }'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "journalEntryId": "je-2025-0038",
    "entryNumber": "JE-2025-0038",
    "status": "Posted",
    "fromAccount": {
      "code": "1020",
      "name": "Bank BCA - Operasional",
      "amount": 50006500
    },
    "toAccount": {
      "code": "1024",
      "name": "Bank Mandiri - Operasional",
      "amount": 50000000
    },
    "bankCharge": {
      "code": "6950",
      "name": "Beban Bank",
      "amount": 6500
    },
    "lines": [
      {
        "accountCode": "1024",
        "accountName": "Bank Mandiri - Operasional",
        "direction": "Debit",
        "amount": 50000000
      },
      {
        "accountCode": "6950",
        "accountName": "Beban Bank",
        "direction": "Debit",
        "amount": 6500
      },
      {
        "accountCode": "1020",
        "accountName": "Bank BCA - Operasional",
        "direction": "Credit",
        "amount": 50006500
      }
    ]
  }
}
```

---

## 6. Validation Rules

### Business Rules

1. **Account Validation**
   - Both source and destination accounts must exist
   - Both accounts must be Cash/Bank accounts (code 1000-1039)
   - Both accounts must be active (`status = 'Active'`)
   - Source and destination must be different accounts

2. **Amount Validation**
   - Amount must be greater than 0
   - Bank charge (if provided) must be >= 0
   - Total deduction (amount + bank charge) should not exceed source balance (warning only, not blocking)

3. **Currency Validation**
   - If accounts have different currencies, exchange rate must be provided
   - Foreign amount must match: `amount = foreignAmount * exchangeRate`

4. **Date Validation**
   - Entry date cannot be in the future
   - Entry date cannot be in a closed fiscal period

### Error Responses

```typescript
// Same account
{
  "success": false,
  "error": {
    "code": "SAME_ACCOUNT",
    "message": "Source and destination accounts cannot be the same."
  }
}

// Invalid account type
{
  "success": false,
  "error": {
    "code": "INVALID_ACCOUNT_TYPE",
    "message": "Account 4010 (Penjualan - POS Retail) is not a cash or bank account. Only accounts in the 1000-1039 range can be used for transfers."
  }
}

// Missing exchange rate
{
  "success": false,
  "error": {
    "code": "EXCHANGE_RATE_REQUIRED",
    "message": "Exchange rate is required when transferring between accounts with different currencies (IDR to USD)."
  }
}

// Insufficient balance warning
{
  "success": true,
  "warnings": [
    {
      "code": "INSUFFICIENT_BALANCE",
      "message": "Source account balance (Rp 45,000,000) is less than transfer amount (Rp 50,000,000). Proceed with caution."
    }
  ],
  "data": { ... }
}
```

---

## 7. Use Case Implementation

### CreateFundTransfer Use Case

```typescript
interface CreateFundTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  entryDate?: Date;
  description?: string;
  reference?: string;
  bankCharge?: number;
  bankChargeAccountId?: string;
  exchangeRate?: number;
  foreignAmount?: number;
  foreignCurrency?: string;
  saveAsDraft?: boolean;
  createdBy: string;
}

interface CreateFundTransferOutput {
  journalEntryId: string;
  entryNumber: string;
  status: 'Draft' | 'Posted';
  fromAccount: AccountSummary;
  toAccount: AccountSummary;
  bankCharge?: AccountSummary;
  lines: JournalLineDTO[];
  warnings?: string[];
}

class CreateFundTransfer {
  private readonly VALID_ACCOUNT_CODE_RANGE = { min: 1000, max: 1039 };
  private readonly DEFAULT_BANK_CHARGE_ACCOUNT = 'acc-6950'; // Beban Bank

  constructor(
    private accountRepository: IAccountRepository,
    private journalEntryRepository: IJournalEntryRepository,
    private entryNumberGenerator: IEntryNumberGenerator,
    private accountBalanceService: IAccountBalanceService
  ) {}

  async execute(input: CreateFundTransferInput): Promise<CreateFundTransferOutput> {
    const warnings: string[] = [];

    // 1. Validate source account
    const fromAccount = await this.accountRepository.findById(input.fromAccountId);
    if (!fromAccount) {
      throw new Error('Source account not found');
    }
    this.validateTransferAccount(fromAccount, 'Source');

    // 2. Validate destination account
    const toAccount = await this.accountRepository.findById(input.toAccountId);
    if (!toAccount) {
      throw new Error('Destination account not found');
    }
    this.validateTransferAccount(toAccount, 'Destination');

    // 3. Validate not same account
    if (input.fromAccountId === input.toAccountId) {
      throw new Error('Source and destination accounts cannot be the same');
    }

    // 4. Validate amount
    if (input.amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    // 5. Check currency compatibility
    if (fromAccount.currency !== toAccount.currency && !input.exchangeRate) {
      throw new Error(`Exchange rate is required when transferring between ${fromAccount.currency} and ${toAccount.currency}`);
    }

    // 6. Check source balance (warning only)
    const sourceBalance = await this.accountBalanceService.getCurrentBalance(input.fromAccountId);
    const totalDeduction = input.amount + (input.bankCharge || 0);
    if (sourceBalance < totalDeduction) {
      warnings.push(`Source account balance (${this.formatCurrency(sourceBalance)}) is less than transfer amount (${this.formatCurrency(totalDeduction)}). Proceed with caution.`);
    }

    // 7. Generate entry number
    const entryNumber = await this.entryNumberGenerator.generate();

    // 8. Build journal lines
    const lines: JournalLineInput[] = [
      // Debit: Destination account
      {
        accountId: input.toAccountId,
        direction: 'Debit',
        amount: input.amount,
        memo: `Transfer IN from ${fromAccount.name}`
      },
      // Credit: Source account (amount + bank charge if any)
      {
        accountId: input.fromAccountId,
        direction: 'Credit',
        amount: totalDeduction,
        memo: input.bankCharge
          ? `Transfer OUT + Bank Fee to ${toAccount.name}`
          : `Transfer OUT to ${toAccount.name}`
      }
    ];

    // Add bank charge line if applicable
    if (input.bankCharge && input.bankCharge > 0) {
      const bankChargeAccountId = input.bankChargeAccountId || this.DEFAULT_BANK_CHARGE_ACCOUNT;
      lines.splice(1, 0, {
        accountId: bankChargeAccountId,
        direction: 'Debit',
        amount: input.bankCharge,
        memo: 'Bank Transfer Fee'
      });
    }

    // 9. Create journal entry
    const journalEntry = JournalEntry.create({
      entryNumber,
      entryDate: input.entryDate || new Date(),
      description: input.description || `Fund Transfer: ${fromAccount.name} → ${toAccount.name}`,
      reference: input.reference,
      entryType: 'Manual',
      status: input.saveAsDraft ? 'Draft' : 'Posted',
      sourceService: 'manual',
      createdBy: input.createdBy,
      lines
    });

    // 10. Save journal entry
    await this.journalEntryRepository.save(journalEntry);

    // 11. Return result
    return {
      journalEntryId: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      status: journalEntry.status,
      fromAccount: {
        code: fromAccount.code,
        name: fromAccount.name,
        amount: totalDeduction
      },
      toAccount: {
        code: toAccount.code,
        name: toAccount.name,
        amount: input.amount
      },
      bankCharge: input.bankCharge ? {
        code: '6950',
        name: 'Beban Bank',
        amount: input.bankCharge
      } : undefined,
      lines: journalEntry.lines.map(line => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        direction: line.direction,
        amount: line.amount
      })),
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private validateTransferAccount(account: Account, label: string): void {
    const code = parseInt(account.code);
    if (code < this.VALID_ACCOUNT_CODE_RANGE.min || code > this.VALID_ACCOUNT_CODE_RANGE.max) {
      throw new Error(`${label} account ${account.code} (${account.name}) is not a cash or bank account. Only accounts in the 1000-1039 range can be used for transfers.`);
    }
    if (account.status !== 'Active') {
      throw new Error(`${label} account is not active`);
    }
  }

  private formatCurrency(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
}
```

---

## 8. Quick Transfer Templates

### Pre-configured Transfer Types

For common transfers, provide quick templates:

```typescript
const QUICK_TRANSFER_TEMPLATES = [
  {
    id: 'pos-deposit-store1',
    name: 'Setoran POS Toko 1',
    fromAccountId: 'acc-1012', // Kas Laci POS - Toko 1
    toAccountId: 'acc-1020',   // Bank BCA - Operasional
    defaultDescription: 'Setoran kas POS Toko 1'
  },
  {
    id: 'pos-deposit-store2',
    name: 'Setoran POS Toko 2',
    fromAccountId: 'acc-1013', // Kas Laci POS - Toko 2
    toAccountId: 'acc-1020',   // Bank BCA - Operasional
    defaultDescription: 'Setoran kas POS Toko 2'
  },
  {
    id: 'pos-deposit-store3',
    name: 'Setoran POS Toko 3',
    fromAccountId: 'acc-1014', // Kas Laci POS - Toko 3
    toAccountId: 'acc-1020',   // Bank BCA - Operasional
    defaultDescription: 'Setoran kas POS Toko 3'
  },
  {
    id: 'petty-cash-office',
    name: 'Isi Kas Kecil Kantor',
    fromAccountId: 'acc-1020', // Bank BCA - Operasional
    toAccountId: 'acc-1010',   // Kas Kecil - Kantor Pusat
    defaultDescription: 'Pengisian kas kecil kantor'
  },
  {
    id: 'petty-cash-warehouse',
    name: 'Isi Kas Kecil Gudang',
    fromAccountId: 'acc-1020', // Bank BCA - Operasional
    toAccountId: 'acc-1011',   // Kas Kecil - Gudang
    defaultDescription: 'Pengisian kas kecil gudang'
  },
  {
    id: 'payroll-funding',
    name: 'Dana Gaji',
    fromAccountId: 'acc-1020', // Bank BCA - Operasional
    toAccountId: 'acc-1021',   // Bank BCA - Gaji
    defaultDescription: 'Transfer dana gaji'
  }
];
```

### Quick Transfer UI

```
┌──────────────────────────────────────────────────────────────────┐
│  🔄 Transfer Dana                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Quick Transfer:                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │ Setoran POS 1   │ │ Setoran POS 2   │ │ Setoran POS 3   │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │ Kas Kecil Kntr  │ │ Kas Kecil Gdng  │ │ Dana Gaji       │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                  │
│  ─────────────────── or ───────────────────                      │
│                                                                  │
│  [Custom Transfer - Select accounts manually]                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Summary

### Key Points

1. **Simple Journal Entry**
   - DEBIT: Destination account (money IN)
   - CREDIT: Source account (money OUT)
   - No income or expense accounts (except for bank charges)

2. **Supported Accounts**
   - Cash accounts (1010-1014)
   - Bank accounts (1020-1024)
   - Investment accounts (1030-1031)

3. **Common Use Cases**
   - Bank to Bank transfers
   - Cash deposits to bank
   - Cash withdrawals from bank
   - Petty cash replenishment
   - POS cash drawer deposits
   - Payroll funding
   - Time deposit placement

4. **Bank Charges**
   - Optional bank fee recording
   - Automatically debits expense account (6950 - Beban Bank)

5. **Quick Templates**
   - Pre-configured common transfers
   - One-click setup for POS deposits, petty cash, payroll

6. **Validation**
   - Only cash/bank accounts (1000-1039)
   - Source ≠ Destination
   - Balance check (warning only)
   - Exchange rate required for different currencies

---

## 10. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - Expense entry
- [Automatic Income Receipt Entry](./AUTOMATIC_INCOME_RECEIPT_ENTRY.md) - Income receipt entry
- [Payment Method and Journal Entry Logic](./PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md) - Sales journal entries
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md) - Service design
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
