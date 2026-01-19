# Owner Equity Transaction - Automatic Journal Entry

## Overview

This document defines the automatic journal entry logic for owner equity transactions in Kidkazz ERP. These transactions include:

1. **Capital Investment (Setoran Modal)** - Owner puts money into the business
2. **Owner's Drawings/Withdrawal (Prive)** - Owner takes money out of the business

---

## Related Accounts

### Equity Accounts (3000-3999)

| Code | Indonesian Name | English Name | Normal Balance | Usage |
|------|-----------------|--------------|----------------|-------|
| 3100 | Modal Disetor | Paid-in Capital | Credit | Owner's capital investment |
| 3110 | Modal Saham | Share Capital | Credit | For PT (corporate) share capital |
| 3120 | Agio Saham | Additional Paid-in Capital | Credit | Premium above par value |
| 3500 | Prive/Penarikan Pemilik | Owner's Drawings | **Debit** | Owner's withdrawals (contra equity) |

### Cash & Bank Accounts (1000-1099)

| Code | Indonesian Name | English Name | Usage |
|------|-----------------|--------------|-------|
| 1010 | Kas Kecil - Kantor Pusat | Petty Cash - Head Office | Cash withdrawal |
| 1020 | Bank BCA - Operasional | BCA Bank - Operating | Bank transfer |
| 1021 | Bank BCA - Gaji | BCA Bank - Payroll | Bank transfer |
| 1022 | Bank BRI - Tabungan | BRI Bank - Savings | Bank transfer |
| 1024 | Bank Mandiri - Operasional | Mandiri Bank - Operating | Bank transfer |

---

## Transaction Types

### 1. Capital Investment (Setoran Modal)

When owner invests money into the business.

#### 1.1 Cash Investment

**Scenario**: Owner invests Rp 50,000,000 cash into the business.

```
┌─────────────────────────────────────────────────────────────┐
│  SETORAN MODAL - TUNAI                                      │
├─────────────────────────────────────────────────────────────┤
│  Debit:  1010 Kas Kecil              Rp 50,000,000         │
│  Credit: 3100 Modal Disetor          Rp 50,000,000         │
└─────────────────────────────────────────────────────────────┘
```

#### 1.2 Bank Transfer Investment

**Scenario**: Owner transfers Rp 100,000,000 from personal account to business bank account.

```
┌─────────────────────────────────────────────────────────────┐
│  SETORAN MODAL - TRANSFER BANK                              │
├─────────────────────────────────────────────────────────────┤
│  Debit:  1020 Bank BCA - Operasional Rp 100,000,000        │
│  Credit: 3100 Modal Disetor          Rp 100,000,000        │
└─────────────────────────────────────────────────────────────┘
```

#### 1.3 Asset Investment (Non-Cash)

**Scenario**: Owner contributes a vehicle worth Rp 150,000,000 as capital.

```
┌─────────────────────────────────────────────────────────────┐
│  SETORAN MODAL - ASET NON-TUNAI                             │
├─────────────────────────────────────────────────────────────┤
│  Debit:  1430 Kendaraan              Rp 150,000,000        │
│  Credit: 3100 Modal Disetor          Rp 150,000,000        │
└─────────────────────────────────────────────────────────────┘
```

#### 1.4 Inventory Investment

**Scenario**: Owner contributes inventory worth Rp 25,000,000 as capital.

```
┌─────────────────────────────────────────────────────────────┐
│  SETORAN MODAL - PERSEDIAAN                                 │
├─────────────────────────────────────────────────────────────┤
│  Debit:  1210 Persediaan Barang Dagang  Rp 25,000,000      │
│  Credit: 3100 Modal Disetor             Rp 25,000,000      │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Owner's Drawings / Withdrawal (Prive)

When owner withdraws money from the business for personal use.

> **Note**: Prive (3500) has a **Debit** normal balance. It's a contra-equity account that reduces total equity.

#### 2.1 Cash Withdrawal

**Scenario**: Owner withdraws Rp 10,000,000 cash for personal use.

```
┌─────────────────────────────────────────────────────────────┐
│  PRIVE - PENARIKAN TUNAI                                    │
├─────────────────────────────────────────────────────────────┤
│  Debit:  3500 Prive/Penarikan Pemilik   Rp 10,000,000      │
│  Credit: 1010 Kas Kecil                  Rp 10,000,000      │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 Bank Transfer Withdrawal

**Scenario**: Owner transfers Rp 20,000,000 from business account to personal account.

```
┌─────────────────────────────────────────────────────────────┐
│  PRIVE - TRANSFER KE REKENING PRIBADI                       │
├─────────────────────────────────────────────────────────────┤
│  Debit:  3500 Prive/Penarikan Pemilik   Rp 20,000,000      │
│  Credit: 1020 Bank BCA - Operasional    Rp 20,000,000      │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3 Asset Withdrawal

**Scenario**: Owner takes company laptop (book value Rp 8,000,000) for personal use.

```
┌─────────────────────────────────────────────────────────────┐
│  PRIVE - PENGAMBILAN ASET                                   │
├─────────────────────────────────────────────────────────────┤
│  Debit:  3500 Prive/Penarikan Pemilik       Rp 8,000,000   │
│  Debit:  1471 Akum. Penyusutan Komputer     Rp 2,000,000   │
│  Credit: 1470 Peralatan Komputer & IT       Rp 10,000,000  │
│                                                             │
│  (Original cost Rp 10,000,000 - Accum Depr Rp 2,000,000)   │
└─────────────────────────────────────────────────────────────┘
```

#### 2.4 Inventory Withdrawal

**Scenario**: Owner takes merchandise worth Rp 500,000 for personal use.

```
┌─────────────────────────────────────────────────────────────┐
│  PRIVE - PENGAMBILAN BARANG DAGANGAN                        │
├─────────────────────────────────────────────────────────────┤
│  Debit:  3500 Prive/Penarikan Pemilik   Rp 500,000         │
│  Credit: 1210 Persediaan Barang Dagang  Rp 500,000         │
└─────────────────────────────────────────────────────────────┘
```

---

## Year-End Closing Entry

At year-end, the Prive account is closed to Retained Earnings (Laba Ditahan).

**Scenario**: Total Prive for the year is Rp 60,000,000.

```
┌─────────────────────────────────────────────────────────────┐
│  JURNAL PENUTUP - PRIVE                                     │
├─────────────────────────────────────────────────────────────┤
│  Debit:  3200 Laba Ditahan              Rp 60,000,000      │
│  Credit: 3500 Prive/Penarikan Pemilik   Rp 60,000,000      │
│                                                             │
│  (Reduces retained earnings, resets Prive to zero)         │
└─────────────────────────────────────────────────────────────┘
```

---

## API Design

### Endpoint: Create Owner Equity Transaction

```
POST /api/accounting/owner-equity-transactions
```

**Request Body:**

```json
{
  "transactionDate": "2025-01-15",
  "transactionType": "INVESTMENT",
  "description": "Setoran modal awal usaha",
  "ownerId": "owner_001",
  "ownerName": "Budi Santoso",

  "investmentType": "CASH",
  "amount": 100000000,

  "paymentMethod": "BANK_TRANSFER",
  "bankAccountId": "1020",

  "notes": "Modal awal untuk pembukaan toko cabang baru",
  "attachments": ["bukti_transfer.pdf"]
}
```

**Transaction Types:**

| Type | Description |
|------|-------------|
| `INVESTMENT` | Owner invests money/assets into business |
| `WITHDRAWAL` | Owner withdraws money/assets from business (Prive) |

**Investment Types (for INVESTMENT):**

| Type | Description | Debit Account |
|------|-------------|---------------|
| `CASH` | Cash investment | 1010 Kas |
| `BANK_TRANSFER` | Bank transfer | 1020-1024 Bank |
| `FIXED_ASSET` | Vehicle, equipment, etc. | 1400-1499 Aset Tetap |
| `INVENTORY` | Merchandise contribution | 1210 Persediaan |

**Withdrawal Types (for WITHDRAWAL):**

| Type | Description | Credit Account |
|------|-------------|----------------|
| `CASH` | Cash withdrawal | 1010 Kas |
| `BANK_TRANSFER` | Transfer to personal account | 1020-1024 Bank |
| `FIXED_ASSET` | Take company asset | 1400-1499 Aset Tetap |
| `INVENTORY` | Take merchandise | 1210 Persediaan |

### Response

```json
{
  "success": true,
  "data": {
    "transactionId": "OET-2025-0001",
    "journalEntryId": "JE-2025-0042",
    "transactionDate": "2025-01-15",
    "transactionType": "INVESTMENT",
    "amount": 100000000,
    "status": "POSTED",
    "journalEntry": {
      "id": "JE-2025-0042",
      "entryNumber": "JE-2025-0042",
      "description": "Setoran modal awal usaha - Budi Santoso",
      "lines": [
        {
          "accountId": "1020",
          "accountName": "Bank BCA - Operasional",
          "direction": "Debit",
          "amount": 100000000
        },
        {
          "accountId": "3100",
          "accountName": "Modal Disetor",
          "direction": "Credit",
          "amount": 100000000
        }
      ]
    }
  }
}
```

---

## UI Form Design

### Owner Equity Transaction Form

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRANSAKSI MODAL PEMILIK                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Jenis Transaksi:  ○ Setoran Modal (Investment)                     │
│                    ○ Prive/Penarikan (Withdrawal)                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Tanggal Transaksi:  [ 15/01/2025      ] 📅                         │
│                                                                      │
│  Nama Pemilik:       [ Budi Santoso    ] ▼                          │
│                                                                      │
│  Jenis Setoran/Penarikan:                                           │
│    ○ Tunai (Cash)                                                   │
│    ○ Transfer Bank                                                  │
│    ○ Aset Tetap (Kendaraan, Peralatan)                             │
│    ○ Barang Dagangan (Inventory)                                    │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  [If Tunai/Transfer Bank]                                           │
│                                                                      │
│  Jumlah (Rp):        [ 100,000,000     ]                           │
│                                                                      │
│  Rekening:           [ 1020 - Bank BCA Operasional ] ▼              │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  [If Aset Tetap]                                                    │
│                                                                      │
│  Jenis Aset:         [ Kendaraan       ] ▼                          │
│  Nama Aset:          [ Toyota Avanza 2024            ]              │
│  Nilai Aset (Rp):    [ 150,000,000     ]                           │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  [If Barang Dagangan]                                               │
│                                                                      │
│  Daftar Barang:                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Produk              │ Qty  │ Harga Satuan │ Total            │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ Indomie Goreng      │ 100  │ 3,500        │ 350,000          │  │
│  │ Minyak Goreng 1L    │ 50   │ 18,000       │ 900,000          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  Total Nilai Barang: Rp 1,250,000                                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Keterangan:         [ Modal awal untuk pembukaan toko cabang    ]  │
│                      [                                            ]  │
│                                                                      │
│  Lampiran:           [ 📎 bukti_transfer.pdf ] [+ Tambah File]      │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  PREVIEW JURNAL:                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Akun                        │ Debit         │ Credit         │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 1020 Bank BCA - Operasional │ 100,000,000   │                │  │
│  │ 3100 Modal Disetor          │               │ 100,000,000    │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ TOTAL                       │ 100,000,000   │ 100,000,000    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│                           [ Batal ]  [ 💾 Simpan & Posting ]        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

### Investment Validation

| Rule | Description |
|------|-------------|
| Amount > 0 | Investment amount must be positive |
| Valid Bank Account | Bank account must exist and be active |
| Owner Required | Owner must be selected |
| Date Required | Transaction date required, cannot be future |

### Withdrawal (Prive) Validation

| Rule | Description |
|------|-------------|
| Amount > 0 | Withdrawal amount must be positive |
| Sufficient Balance | Cash/Bank must have sufficient balance |
| Owner Required | Owner must be selected |
| Asset Exists | For asset withdrawal, asset must exist |
| Inventory Available | For inventory withdrawal, stock must be available |

### Business Rules

| Rule ID | Description |
|---------|-------------|
| OET-001 | Prive account (3500) is reset to zero at year-end closing |
| OET-002 | All equity transactions require owner identification |
| OET-003 | Asset withdrawals must use book value (cost - accumulated depreciation) |
| OET-004 | Inventory withdrawals must update inventory stock |
| OET-005 | Large withdrawals (> Rp 50 juta) require additional approval |

---

## Integration with Other Services

### Inventory Service Integration

#### Opening Balance Inventory (Good Receipt)

When inputting opening balance inventory via Good Receipt, the system **automatically** creates a capital contribution journal entry:

```
┌─────────────────────────────────────────────────────────────────────┐
│  GOOD RECEIPT - OPENING BALANCE (Automatic Journal)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Action:                                                        │
│  1. Create Good Receipt with type = "OPENING_BALANCE"               │
│  2. Add inventory items with quantities and costs                    │
│  3. Confirm receipt                                                  │
│                                                                      │
│  System Auto-Creates Journal:                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  SETORAN MODAL - PERSEDIAAN AWAL                              │   │
│  │                                                                │   │
│  │  Debit:  1210 Persediaan Barang Dagang    Rp 50,000,000      │   │
│  │  Credit: 3100 Modal Disetor               Rp 50,000,000      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Reference: GRN-2025-00001                                          │
│  Description: "Setoran Modal - Persediaan Awal - GRN-2025-00001"   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Event Flow:**
```
Inventory Service                      Accounting Service
      │                                       │
      │  GoodReceiptPostedEvent               │
      │  (receiptType: OPENING_BALANCE)       │
      │ ─────────────────────────────────────▶│
      │                                       │
      │                                       │  Create Journal Entry:
      │                                       │  DR: 1210 Persediaan
      │                                       │  CR: 3100 Modal Disetor
      │                                       │
```

> **Important**: Opening balance inventory is treated as owner's capital contribution (setoran barang dagangan), not as a purchase. This correctly reflects that the owner is investing assets into the business.

See: [Good Receipt & Good Issue Workflow](../inventory/GOOD_RECEIPT_ISSUE_WORKFLOW.md)

---

#### Owner Withdraws Inventory

When owner withdraws inventory:

```
┌─────────────────────────────────────────────────────────────────────┐
│  OWNER WITHDRAWS INVENTORY                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Accounting Service creates journal entry                        │
│     Debit:  3500 Prive                                              │
│     Credit: 1210 Persediaan                                         │
│                                                                      │
│  2. Publish event: OwnerInventoryWithdrawn                          │
│     {                                                                │
│       "ownerId": "owner_001",                                       │
│       "items": [{ "productId": "prod_001", "quantity": 10 }],       │
│       "reason": "OWNER_WITHDRAWAL"                                  │
│     }                                                                │
│                                                                      │
│  3. Inventory Service reduces stock                                 │
│     POST /api/inventory/adjust                                      │
│     { "type": "DECREASE", "reason": "OWNER_WITHDRAWAL" }            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Fixed Asset Service Integration

When owner withdraws fixed asset:

```
┌─────────────────────────────────────────────────────────────────────┐
│  OWNER WITHDRAWS FIXED ASSET                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Get asset book value from Asset Register                        │
│     Book Value = Acquisition Cost - Accumulated Depreciation        │
│                                                                      │
│  2. Accounting Service creates journal entry                        │
│     Debit:  3500 Prive (book value)                                 │
│     Debit:  14X1 Accumulated Depreciation                           │
│     Credit: 14X0 Fixed Asset (original cost)                        │
│                                                                      │
│  3. Update Asset Register status to DISPOSED                        │
│     disposal_reason: "OWNER_WITHDRAWAL"                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Reporting

### Owner Equity Statement

Shows all equity transactions for a period:

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAPORAN MUTASI MODAL PEMILIK                                       │
│  Periode: 01 Januari 2025 - 31 Desember 2025                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Modal Awal (1 Jan 2025)                         Rp   500,000,000   │
│                                                                      │
│  Setoran Modal:                                                      │
│    15 Jan - Transfer Bank                        Rp   100,000,000   │
│    20 Mar - Setoran Kendaraan                    Rp   150,000,000   │
│    10 Jul - Transfer Bank                        Rp    50,000,000   │
│  ─────────────────────────────────────────────────────────────────  │
│  Total Setoran Modal                             Rp   300,000,000   │
│                                                                      │
│  Prive/Penarikan:                                                    │
│    05 Feb - Tunai                               (Rp    10,000,000)  │
│    15 Apr - Transfer ke Rek. Pribadi            (Rp    20,000,000)  │
│    25 Aug - Ambil Barang Dagangan               (Rp     1,500,000)  │
│    10 Nov - Tunai                               (Rp    15,000,000)  │
│  ─────────────────────────────────────────────────────────────────  │
│  Total Prive                                    (Rp    46,500,000)  │
│                                                                      │
│  Laba Bersih Tahun Berjalan                      Rp   120,000,000   │
│                                                                      │
│  ═════════════════════════════════════════════════════════════════  │
│  Modal Akhir (31 Des 2025)                       Rp   873,500,000   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Owner Equity Transactions Table

```sql
CREATE TABLE owner_equity_transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT UNIQUE NOT NULL,  -- OET-2025-0001

  -- Transaction Details
  transaction_date INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('INVESTMENT', 'WITHDRAWAL')),
  investment_type TEXT NOT NULL CHECK(investment_type IN ('CASH', 'BANK_TRANSFER', 'FIXED_ASSET', 'INVENTORY')),

  -- Owner
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,

  -- Amount
  amount REAL NOT NULL,

  -- For Cash/Bank
  payment_method TEXT,
  bank_account_id TEXT,

  -- For Fixed Asset
  asset_id TEXT,
  asset_description TEXT,

  -- For Inventory (JSON array of items)
  inventory_items TEXT,  -- JSON: [{"productId": "...", "quantity": 10, "unitCost": 5000}]

  -- Description
  description TEXT,
  notes TEXT,

  -- Journal Entry Reference
  journal_entry_id TEXT REFERENCES journal_entries(id),

  -- Status
  status TEXT DEFAULT 'POSTED' CHECK(status IN ('DRAFT', 'POSTED', 'VOIDED')),

  -- Audit
  created_at INTEGER NOT NULL,
  created_by TEXT,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (bank_account_id) REFERENCES chart_of_accounts(id)
);
```

---

## References

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Chart of Accounts reference
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md) - Service design
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules

---

**Document Version**: 1.0
**Created**: January 2025
**Last Updated**: January 2025
**Maintained By**: Development Team
