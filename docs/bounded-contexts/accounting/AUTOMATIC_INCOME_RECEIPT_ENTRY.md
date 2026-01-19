# Automatic Income Receipt Journal Entry

## Overview

This document describes the **Automatic Income Receipt Journal Entry** feature for recording non-sales income. This is for income that is NOT from product sales (which is handled by the Order Service). Examples include:

- Interest income from bank/deposits
- Rental income
- Commission income
- Insurance claim income
- Gain from asset sale
- Other miscellaneous income

**User Flow:**
1. Select an **income account** (e.g., Bank Interest, Rental Income)
2. Enter the **receipt amount**
3. Select the **receipt method** (Cash, Bank account where money was received)
4. **Select the cost center/location** (if applicable)
5. Optionally add description and reference

**System Creates:**
- **DEBIT**: Cash/Bank account (where money was received)
- **CREDIT**: Income account (selected by user)

**Key Feature**: All income receipts support **warehouse/store tracking** via GL segmentation for multi-location income analysis.

---

## 1. Warehouse/Store Tracking (GL Segmentation)

### Why Track Income by Location?

For multi-location businesses, tracking income by warehouse/store enables:

| Use Case | Benefit |
|----------|---------|
| **Revenue by Location** | Which location generates the most income? |
| **P&L by Location** | Full profitability per store/warehouse |
| **Rental Income Tracking** | Which property generates rental income? |
| **Interest Allocation** | Allocate interest income to locations |

### Location Types

```typescript
type LocationType =
  | 'WAREHOUSE'      // Gudang
  | 'STORE'          // Toko Retail
  | 'HEAD_OFFICE'    // Kantor Pusat
  | 'BRANCH_OFFICE'  // Kantor Cabang
  | 'RESTAURANT';    // Outlet Restoran
```

### Journal Line with Location Segment

```typescript
interface JournalLine {
  accountId: string;
  accountCode: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  memo?: string;

  // GL Segmentation for Multi-Dimensional Analysis
  warehouseId?: string;       // Location/Cost Center
  departmentId?: string;      // Department (optional)
  projectId?: string;         // Project (optional)
}
```

---

## 2. User Interface Design

### Income Receipt Form

```
┌──────────────────────────────────────────────────────────────────┐
│  💰 Record Income Receipt (Catat Penerimaan Pendapatan)          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Income Type *                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search or select income account...               ▼     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Categories: Operating Income (42xx) | Other Income (70xx)       │
│                                                                  │
│  Amount Received (IDR) *                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Rp                                            0            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 📍 COST CENTER / LOCATION (Optional)                       │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  Location/Warehouse                                        │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ 🔍 Select location (optional)...                 ▼  │  │  │
│  │  │ ○ Kantor Pusat (HQ)                                  │  │  │
│  │  │ ○ Gudang Utama - Cakung                              │  │  │
│  │  │ ○ Toko 1 - Kelapa Gading                             │  │  │
│  │  │ ○ Toko 2 - PIK                                       │  │  │
│  │  │ ○ Restoran - Grand Indonesia                         │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Received Via *                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │   💵 Cash       │ │   🏦 Bank       │ │   💰 Petty Cash │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  ┌─────────────────┐                                             │
│  │   📋 Piutang    │ (Will be received later - A/R)             │
│  └─────────────────┘                                             │
│                                                                  │
│  [If Bank selected]                                              │
│  Bank Account                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ BCA - Operasional (1020)                              ▼    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Date                          Reference                         │
│  ┌────────────────────────┐    ┌────────────────────────────┐   │
│  │ 2025-01-17         📅 │    │ BUNGA-JAN-2025             │   │
│  └────────────────────────┘    └────────────────────────────┘   │
│                                                                  │
│  Description                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Bunga deposito bulan Januari 2025                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft          │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│                              ┌────────────────────────────────┐ │
│                              │     ✅ Save & Post             │ │
│                              └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Receipt Method Mapping

### Debit Account Mapping Table

| Receipt Method | Debit Account Code | Debit Account Name (ID) | Debit Account Name (EN) |
|----------------|-------------------|-------------------------|-------------------------|
| Cash | 1010 | Kas Kecil - Kantor Pusat | Petty Cash - Head Office |
| Petty Cash - Warehouse | 1011 | Kas Kecil - Gudang | Petty Cash - Warehouse |
| POS Cash Drawer - Store 1 | 1012 | Kas Laci POS - Toko 1 | POS Cash Drawer - Store 1 |
| POS Cash Drawer - Store 2 | 1013 | Kas Laci POS - Toko 2 | POS Cash Drawer - Store 2 |
| POS Cash Drawer - Store 3 | 1014 | Kas Laci POS - Toko 3 | POS Cash Drawer - Store 3 |
| Bank BCA - Operasional | 1020 | Bank BCA - Operasional | BCA Bank - Operating |
| Bank BCA - Gaji | 1021 | Bank BCA - Gaji | BCA Bank - Payroll |
| Bank BRI - Tabungan | 1022 | Bank BRI - Tabungan | BRI Bank - Savings |
| Bank CIMB Niaga - USD | 1023 | Bank CIMB Niaga - USD | CIMB Niaga Bank - USD |
| Bank Mandiri - Operasional | 1024 | Bank Mandiri - Operasional | Mandiri Bank - Operating |
| Accounts Receivable | 1110 | Piutang Usaha | Accounts Receivable - Trade |

### Receipt Method Selection Logic

```typescript
type ReceiptMethod =
  | 'CASH'                  // Kas Kecil - Kantor Pusat (1010)
  | 'CASH_WAREHOUSE'        // Kas Kecil - Gudang (1011)
  | 'POS_STORE_1'           // Kas Laci POS - Toko 1 (1012)
  | 'POS_STORE_2'           // Kas Laci POS - Toko 2 (1013)
  | 'POS_STORE_3'           // Kas Laci POS - Toko 3 (1014)
  | 'BANK_BCA_OPERASIONAL'  // Bank BCA - Operasional (1020)
  | 'BANK_BCA_GAJI'         // Bank BCA - Gaji (1021)
  | 'BANK_BRI_TABUNGAN'     // Bank BRI - Tabungan (1022)
  | 'BANK_CIMB_USD'         // Bank CIMB Niaga - USD (1023)
  | 'BANK_MANDIRI'          // Bank Mandiri - Operasional (1024)
  | 'ACCOUNTS_RECEIVABLE';  // Piutang Usaha (1110) - To be received later

/**
 * Get debit account for income receipt
 */
function getDebitAccountForReceipt(receiptMethod: ReceiptMethod): {
  accountId: string;
  accountCode: string;
  accountName: string;
} {
  const accountMap: Record<ReceiptMethod, { accountId: string; accountCode: string; accountName: string }> = {
    'CASH': {
      accountId: 'acc-1010',
      accountCode: '1010',
      accountName: 'Kas Kecil - Kantor Pusat'
    },
    'CASH_WAREHOUSE': {
      accountId: 'acc-1011',
      accountCode: '1011',
      accountName: 'Kas Kecil - Gudang'
    },
    'POS_STORE_1': {
      accountId: 'acc-1012',
      accountCode: '1012',
      accountName: 'Kas Laci POS - Toko 1'
    },
    'POS_STORE_2': {
      accountId: 'acc-1013',
      accountCode: '1013',
      accountName: 'Kas Laci POS - Toko 2'
    },
    'POS_STORE_3': {
      accountId: 'acc-1014',
      accountCode: '1014',
      accountName: 'Kas Laci POS - Toko 3'
    },
    'BANK_BCA_OPERASIONAL': {
      accountId: 'acc-1020',
      accountCode: '1020',
      accountName: 'Bank BCA - Operasional'
    },
    'BANK_BCA_GAJI': {
      accountId: 'acc-1021',
      accountCode: '1021',
      accountName: 'Bank BCA - Gaji'
    },
    'BANK_BRI_TABUNGAN': {
      accountId: 'acc-1022',
      accountCode: '1022',
      accountName: 'Bank BRI - Tabungan'
    },
    'BANK_CIMB_USD': {
      accountId: 'acc-1023',
      accountCode: '1023',
      accountName: 'Bank CIMB Niaga - USD'
    },
    'BANK_MANDIRI': {
      accountId: 'acc-1024',
      accountCode: '1024',
      accountName: 'Bank Mandiri - Operasional'
    },
    'ACCOUNTS_RECEIVABLE': {
      accountId: 'acc-1110',
      accountCode: '1110',
      accountName: 'Piutang Usaha'
    }
  };

  return accountMap[receiptMethod];
}
```

---

## 3. Income Account Categories

### Available Income Accounts (from Indonesian Trading COA)

Users can select from these income categories:

#### 4200-4299: Pendapatan Operasional Lain (Other Operating Revenue)

| Code | Account Name (ID) | Account Name (EN) | Use Case |
|------|-------------------|-------------------|----------|
| 4210 | Pendapatan Jasa Pengiriman | Delivery Service Income | Charge customers for delivery |
| 4220 | Pendapatan Sewa | Rental Income | Rent out space/equipment |
| 4230 | Pendapatan Komisi | Commission Income | Receive commission from partners |
| 4240 | Pendapatan Membership | Membership Fee Income | Customer membership fees |

#### 7000-7099: Pendapatan Lain-lain (Other Income - Non-Operating)

| Code | Account Name (ID) | Account Name (EN) | Use Case |
|------|-------------------|-------------------|----------|
| 7010 | Pendapatan Bunga Bank | Bank Interest Income | Interest from bank savings |
| 7020 | Pendapatan Bunga Deposito | Deposit Interest Income | Interest from time deposits |
| 7030 | Pendapatan Selisih Kurs | Foreign Exchange Gain | Profit from currency exchange |
| 7040 | Pendapatan Penjualan Aset Tetap | Gain on Fixed Asset Sale | Profit from selling assets |
| 7050 | Pendapatan Klaim Asuransi | Insurance Claim Income | Insurance claim payments |
| 7060 | Pendapatan Lain-lain | Other Miscellaneous Income | Other income sources |

---

## 4. Journal Entry Generation

### Example 1: Bank Interest Income (Direct to Bank)

**User Input:**
- Income Account: `7010 - Pendapatan Bunga Bank`
- Amount: `Rp 150,000`
- Receipt Method: `BANK_BCA_OPERASIONAL`
- Description: `Bunga tabungan BCA bulan Januari 2025`
- Reference: `BUNGA-BCA-JAN-2025`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0015",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Bunga tabungan BCA bulan Januari 2025",
  reference: "BUNGA-BCA-JAN-2025",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 150000,
      memo: "Bank Interest Receipt - BCA"
    },
    {
      accountId: "acc-7010",
      accountCode: "7010",
      accountName: "Pendapatan Bunga Bank",
      direction: "Credit",
      amount: 150000,
      memo: "Bank Interest Income - Bunga tabungan BCA bulan Januari 2025"
    }
  ]
}
```

### Example 2: Deposit Interest Income

**User Input:**
- Income Account: `7020 - Pendapatan Bunga Deposito`
- Amount: `Rp 2,500,000`
- Receipt Method: `BANK_MANDIRI`
- Description: `Bunga deposito 3 bulan - jatuh tempo Jan 2025`
- Reference: `DEP-MANDIRI-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0016",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Bunga deposito 3 bulan - jatuh tempo Jan 2025",
  reference: "DEP-MANDIRI-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1024",
      accountCode: "1024",
      accountName: "Bank Mandiri - Operasional",
      direction: "Debit",
      amount: 2500000,
      memo: "Deposit Interest Receipt - Mandiri"
    },
    {
      accountId: "acc-7020",
      accountCode: "7020",
      accountName: "Pendapatan Bunga Deposito",
      direction: "Credit",
      amount: 2500000,
      memo: "Deposit Interest Income - Bunga deposito 3 bulan"
    }
  ]
}
```

### Example 3: Rental Income (Cash Receipt) - With Location

**User Input:**
- Income Account: `4220 - Pendapatan Sewa`
- Amount: `Rp 5,000,000`
- **Location: `Toko 1 - Kelapa Gading`** (property being rented out)
- Receipt Method: `CASH`
- Description: `Sewa ruangan lantai 2 bulan Januari 2025`
- Reference: `SEWA-001-JAN-2025`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0017",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Sewa ruangan lantai 2 bulan Januari 2025 - Toko 1 Kelapa Gading",
  reference: "SEWA-001-JAN-2025",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1010",
      accountCode: "1010",
      accountName: "Kas Kecil - Kantor Pusat",
      direction: "Debit",
      amount: 5000000,
      memo: "Cash Receipt - Rental Income"
    },
    {
      accountId: "acc-4220",
      accountCode: "4220",
      accountName: "Pendapatan Sewa",
      direction: "Credit",
      amount: 5000000,
      memo: "Rental Income - Sewa ruangan lantai 2 bulan Januari 2025",
      warehouseId: "store-kg-001"  // 👈 Location tracking
    }
  ]
}
```

### Example 4: Commission Income (To Be Received - A/R)

**User Input:**
- Income Account: `4230 - Pendapatan Komisi`
- Amount: `Rp 1,500,000`
- Receipt Method: `ACCOUNTS_RECEIVABLE`
- Description: `Komisi referral dari Partner ABC - Q4 2024`
- Reference: `KOMISI-ABC-Q4-2024`
- CustomerId: `partner-abc`

**Generated Journal Entry (At Time of Recognition):**

```typescript
{
  entryNumber: "JE-2025-0018",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Komisi referral dari Partner ABC - Q4 2024",
  reference: "KOMISI-ABC-Q4-2024",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Piutang Usaha",
      direction: "Debit",
      amount: 1500000,
      memo: "Commission Receivable - Partner ABC",
      customerId: "partner-abc" // Track for A/R aging
    },
    {
      accountId: "acc-4230",
      accountCode: "4230",
      accountName: "Pendapatan Komisi",
      direction: "Credit",
      amount: 1500000,
      memo: "Commission Income - Komisi referral dari Partner ABC - Q4 2024"
    }
  ]
}
```

**When Payment is Received (Separate Entry):**

```typescript
{
  entryNumber: "JE-2025-0025",
  entryDate: "2025-02-15", // Receipt date
  entryType: "Manual",
  status: "Posted",
  description: "Penerimaan komisi dari Partner ABC",
  reference: "BAYAR-KOMISI-ABC-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 1500000,
      memo: "Commission Payment Received - Partner ABC"
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Piutang Usaha",
      direction: "Credit",
      amount: 1500000,
      memo: "A/R Collection - Partner ABC",
      customerId: "partner-abc"
    }
  ]
}
```

### Example 5: Insurance Claim Income

**User Input:**
- Income Account: `7050 - Pendapatan Klaim Asuransi`
- Amount: `Rp 15,000,000`
- Receipt Method: `BANK_BCA_OPERASIONAL`
- Description: `Klaim asuransi kebakaran gudang`
- Reference: `KLAIM-ASR-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0019",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Klaim asuransi kebakaran gudang",
  reference: "KLAIM-ASR-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 15000000,
      memo: "Insurance Claim Receipt"
    },
    {
      accountId: "acc-7050",
      accountCode: "7050",
      accountName: "Pendapatan Klaim Asuransi",
      direction: "Credit",
      amount: 15000000,
      memo: "Insurance Claim Income - Klaim asuransi kebakaran gudang"
    }
  ]
}
```

---

## 5. API Design

### Create Income Receipt Entry Endpoint

```
POST /api/accounting/income-receipts
```

### Request Schema

```typescript
interface CreateIncomeReceiptRequest {
  // Required fields
  incomeAccountId: string;    // Account ID from COA (e.g., "acc-7010")
  amount: number;             // Positive number in IDR
  receiptMethod: ReceiptMethod;

  // Location / Cost Center (Optional for income)
  warehouseId?: string;       // Location this income belongs to

  // Optional fields
  entryDate?: string;         // ISO date, defaults to today
  description?: string;       // Income description
  reference?: string;         // External reference (receipt #, claim #)
  customerId?: string;        // For A/R tracking (if receipt method is A/R)
  saveAsDraft?: boolean;      // If true, save as Draft; otherwise Post immediately
}

type ReceiptMethod =
  | 'CASH'
  | 'CASH_WAREHOUSE'
  | 'POS_STORE_1'
  | 'POS_STORE_2'
  | 'POS_STORE_3'
  | 'BANK_BCA_OPERASIONAL'
  | 'BANK_BCA_GAJI'
  | 'BANK_BRI_TABUNGAN'
  | 'BANK_CIMB_USD'
  | 'BANK_MANDIRI'
  | 'ACCOUNTS_RECEIVABLE';
```

### Response Schema

```typescript
interface CreateIncomeReceiptResponse {
  success: boolean;
  data: {
    journalEntryId: string;
    entryNumber: string;
    status: 'Draft' | 'Posted';
    lines: {
      accountCode: string;
      accountName: string;
      direction: 'Debit' | 'Credit';
      amount: number;
    }[];
  };
}
```

### Example API Call

```bash
curl -X POST /api/accounting/income-receipts \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "incomeAccountId": "acc-7010",
    "amount": 150000,
    "receiptMethod": "BANK_BCA_OPERASIONAL",
    "description": "Bunga tabungan BCA bulan Januari 2025",
    "reference": "BUNGA-BCA-JAN-2025",
    "saveAsDraft": false
  }'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "journalEntryId": "je-2025-0015",
    "entryNumber": "JE-2025-0015",
    "status": "Posted",
    "lines": [
      {
        "accountCode": "1020",
        "accountName": "Bank BCA - Operasional",
        "direction": "Debit",
        "amount": 150000
      },
      {
        "accountCode": "7010",
        "accountName": "Pendapatan Bunga Bank",
        "direction": "Credit",
        "amount": 150000
      }
    ]
  }
}
```

---

## 6. Validation Rules

### Business Rules

1. **Income Account Validation**
   - Account must exist in Chart of Accounts
   - Account type must be `Revenue` (codes 4200-4299 or 7000-7099)
   - Account must be active (`status = 'Active'`)
   - Account must be a detail account (`isDetailAccount = true`)
   - Account must NOT be sales revenue (4000-4199) - those are handled by Order Service

2. **Amount Validation**
   - Amount must be greater than 0
   - Amount cannot exceed configured maximum (optional: Rp 10,000,000,000)

3. **Receipt Method Validation**
   - Receipt method must be valid enum value
   - Debit account for receipt method must exist and be active

4. **Date Validation**
   - Entry date cannot be in the future
   - Entry date cannot be in a closed fiscal period

5. **A/R Tracking**
   - If receipt method is `ACCOUNTS_RECEIVABLE`, customerId should be provided

### Excluded Income Accounts

The following accounts should **NOT** be selectable for manual income receipt as they are handled by other services:

| Code Range | Description | Handled By |
|------------|-------------|------------|
| 4000-4099 | Sales Revenue (POS, Online, Wholesale, B2B) | Order Service |
| 4100-4199 | Sales Deductions (Discounts, Returns) | Order Service |

### Error Responses

```typescript
// Invalid income account
{
  "success": false,
  "error": {
    "code": "INVALID_INCOME_ACCOUNT",
    "message": "Account acc-6120 is not an income account. Please select an account from income categories (4200-4299 or 7000-7099)."
  }
}

// Sales account selected (not allowed)
{
  "success": false,
  "error": {
    "code": "SALES_ACCOUNT_NOT_ALLOWED",
    "message": "Account 4010 (Penjualan - POS Retail) cannot be used for manual income receipt. Sales revenue is recorded automatically by the Order Service."
  }
}

// Amount validation
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount must be greater than 0."
  }
}

// Closed period
{
  "success": false,
  "error": {
    "code": "PERIOD_CLOSED",
    "message": "Cannot create entries in closed fiscal period December 2024."
  }
}
```

---

## 7. Use Case Implementation

### CreateIncomeReceiptEntry Use Case

```typescript
interface CreateIncomeReceiptInput {
  incomeAccountId: string;
  amount: number;
  receiptMethod: ReceiptMethod;
  entryDate?: Date;
  description?: string;
  reference?: string;
  customerId?: string;
  saveAsDraft?: boolean;
  createdBy: string;
}

interface CreateIncomeReceiptOutput {
  journalEntryId: string;
  entryNumber: string;
  status: 'Draft' | 'Posted';
  lines: JournalLineDTO[];
}

class CreateIncomeReceiptEntry {
  constructor(
    private accountRepository: IAccountRepository,
    private journalEntryRepository: IJournalEntryRepository,
    private entryNumberGenerator: IEntryNumberGenerator
  ) {}

  async execute(input: CreateIncomeReceiptInput): Promise<CreateIncomeReceiptOutput> {
    // 1. Validate income account
    const incomeAccount = await this.accountRepository.findById(input.incomeAccountId);
    if (!incomeAccount) {
      throw new Error('Income account not found');
    }
    if (incomeAccount.accountType !== 'Revenue') {
      throw new Error('Selected account is not an income account');
    }
    if (incomeAccount.status !== 'Active') {
      throw new Error('Income account is not active');
    }
    if (!incomeAccount.isDetailAccount) {
      throw new Error('Cannot post to summary account');
    }

    // 2. Validate not a sales account (4000-4199)
    const code = parseInt(incomeAccount.code);
    if (code >= 4000 && code < 4200) {
      throw new Error('Sales revenue accounts cannot be used for manual income receipt. Use Order Service instead.');
    }

    // 3. Get debit account based on receipt method
    const debitAccount = this.getDebitAccountForReceiptMethod(input.receiptMethod);
    const debitAccountEntity = await this.accountRepository.findByCode(debitAccount.accountCode);
    if (!debitAccountEntity || debitAccountEntity.status !== 'Active') {
      throw new Error('Receipt account is not available');
    }

    // 4. Validate amount
    if (input.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // 5. Generate entry number
    const entryNumber = await this.entryNumberGenerator.generate();

    // 6. Create journal entry
    const journalEntry = JournalEntry.create({
      entryNumber,
      entryDate: input.entryDate || new Date(),
      description: input.description || `Income Receipt - ${incomeAccount.name}`,
      reference: input.reference,
      entryType: 'Manual',
      status: input.saveAsDraft ? 'Draft' : 'Posted',
      sourceService: 'manual',
      createdBy: input.createdBy,
      lines: [
        // Debit: Cash/Bank/A/R account
        {
          accountId: debitAccountEntity.id,
          direction: 'Debit',
          amount: input.amount,
          memo: `${debitAccount.accountName} - Receipt`,
          customerId: input.receiptMethod === 'ACCOUNTS_RECEIVABLE' ? input.customerId : undefined
        },
        // Credit: Income account
        {
          accountId: input.incomeAccountId,
          direction: 'Credit',
          amount: input.amount,
          memo: `${incomeAccount.name} - ${input.description || ''}`
        }
      ]
    });

    // 7. Save journal entry
    await this.journalEntryRepository.save(journalEntry);

    // 8. Return result
    return {
      journalEntryId: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      status: journalEntry.status,
      lines: journalEntry.lines.map(line => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        direction: line.direction,
        amount: line.amount
      }))
    };
  }

  private getDebitAccountForReceiptMethod(receiptMethod: ReceiptMethod) {
    const accountMap = {
      'CASH': { accountCode: '1010', accountName: 'Kas Kecil - Kantor Pusat' },
      'CASH_WAREHOUSE': { accountCode: '1011', accountName: 'Kas Kecil - Gudang' },
      'POS_STORE_1': { accountCode: '1012', accountName: 'Kas Laci POS - Toko 1' },
      'POS_STORE_2': { accountCode: '1013', accountName: 'Kas Laci POS - Toko 2' },
      'POS_STORE_3': { accountCode: '1014', accountName: 'Kas Laci POS - Toko 3' },
      'BANK_BCA_OPERASIONAL': { accountCode: '1020', accountName: 'Bank BCA - Operasional' },
      'BANK_BCA_GAJI': { accountCode: '1021', accountName: 'Bank BCA - Gaji' },
      'BANK_BRI_TABUNGAN': { accountCode: '1022', accountName: 'Bank BRI - Tabungan' },
      'BANK_CIMB_USD': { accountCode: '1023', accountName: 'Bank CIMB Niaga - USD' },
      'BANK_MANDIRI': { accountCode: '1024', accountName: 'Bank Mandiri - Operasional' },
      'ACCOUNTS_RECEIVABLE': { accountCode: '1110', accountName: 'Piutang Usaha' }
    };
    return accountMap[receiptMethod];
  }
}
```

---

## 8. Comparison: Income Receipt vs Expense Entry

| Aspect | Income Receipt | Expense Entry |
|--------|----------------|---------------|
| **Purpose** | Record non-sales income | Record business expenses |
| **Account Selection** | Income accounts (42xx, 70xx) | Expense accounts (60xx-89xx) |
| **DEBIT** | Cash/Bank (money received) | Expense account |
| **CREDIT** | Income account | Cash/Bank/A/P (money paid) |
| **Deferred Option** | Accounts Receivable (A/R) | Accounts Payable (A/P) |
| **API Endpoint** | `POST /api/accounting/income-receipts` | `POST /api/accounting/expenses` |

### Journal Entry Structure Comparison

**Income Receipt:**
```
DEBIT:  Cash/Bank/A/R  (Asset increases)
CREDIT: Income Account (Revenue increases)
```

**Expense Entry:**
```
DEBIT:  Expense Account (Expense increases)
CREDIT: Cash/Bank/A/P  (Asset decreases or Liability increases)
```

---

## 9. Additional Features

### A. Recurring Income

For regular monthly income (rental income, membership fees):

```typescript
interface RecurringIncomeConfig {
  incomeAccountId: string;
  amount: number;
  receiptMethod: ReceiptMethod;
  description: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  startDate: Date;
  endDate?: Date;
  dayOfMonth?: number; // For monthly (1-28)
  customerId?: string; // For tracking
}
```

### B. Income with Tax Withholding (PPh 23)

For income subject to PPh 23 withholding (e.g., commission income, service fees):

```typescript
// Example: Rp 1,500,000 commission, PPh 23 2% withheld
{
  entryDate: "2025-01-17",
  description: "Komisi dari Partner ABC - dipotong PPh 23",
  lines: [
    {
      accountCode: "1020", // Bank BCA
      direction: "Debit",
      amount: 1470000,     // Net received (after PPh 23)
      memo: "Net commission received"
    },
    {
      accountCode: "1342", // PPh 23 Dibayar Dimuka (Prepaid Tax)
      direction: "Debit",
      amount: 30000,       // PPh 23 withheld (2% of 1,500,000)
      memo: "PPh 23 withheld by Partner ABC"
    },
    {
      accountCode: "4230", // Pendapatan Komisi
      direction: "Credit",
      amount: 1500000,     // Gross commission
      memo: "Commission Income - Gross"
    }
  ]
}
```

### C. Income Attachments

Allow users to attach supporting documents:

```typescript
interface IncomeAttachment {
  id: string;
  journalEntryId: string;
  fileName: string;
  fileType: 'image/jpeg' | 'image/png' | 'application/pdf';
  fileUrl: string; // R2 storage URL
  uploadedAt: Date;
  uploadedBy: string;
}
```

---

## 10. Summary

### Key Points

1. **Simplified User Experience**
   - User only selects income account, enters amount, and chooses receipt method
   - System automatically creates balanced double-entry journal

2. **Location Tracking (GL Segmentation)**
   - Optional location tracking for income by warehouse/store
   - Enables P&L by location and revenue analysis per location
   - Useful for rental income, commission income allocated to specific locations

3. **Receipt Method Options**
   - Cash accounts (1010-1014)
   - Bank accounts (1020-1024)
   - Accounts Receivable (1110) - for income to be received later

4. **Income Account Categories**
   - Operating Income (4200-4299): Service fees, rental, commission, membership
   - Other Income (7000-7099): Interest, forex gain, asset sale gain, insurance claim

5. **Excluded Accounts**
   - Sales Revenue (4000-4199) - handled by Order Service

6. **Validation**
   - Income account must be valid and active
   - Amount must be positive
   - Date cannot be in closed period

7. **Audit Trail**
   - All entries tracked with createdBy, createdAt
   - Reference field for external document linking
   - CustomerId for A/R tracking
   - warehouseId for location tracking

---

## 11. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - Expense entry documentation
- [Payment Method and Journal Entry Logic](./PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md) - Sales journal entries
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md) - Service design
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
