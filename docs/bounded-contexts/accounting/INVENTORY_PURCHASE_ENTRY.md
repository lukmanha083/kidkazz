# Inventory Purchase Entry

## Overview

This document describes the **Inventory Purchase Journal Entry** - the ACCOUNTING side of inventory purchases. This works in conjunction with the **Good Receipt** workflow in Inventory Service.

### Relationship with Inventory Service

```
┌─────────────────────────────────────────────────────────────────────┐
│                 INVENTORY SERVICE vs ACCOUNTING SERVICE             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  INVENTORY SERVICE (Good Receipt)     ACCOUNTING SERVICE (This Doc)│
│  ─────────────────────────────────    ─────────────────────────────│
│  • Physical stock quantities          • Financial journal entries   │
│  • Batch/lot tracking                 • Debit: Inventory Asset      │
│  • Expiration dates (FEFO)            • Credit: Cash/Bank or A/P    │
│  • Warehouse locations                • PPn Masukan tracking        │
│  • Inventory movements                • Supplier A/P ledger         │
│  • Stock valuation (qty × cost)       • Financial statements        │
│                                                                     │
│  SINGLE SOURCE OF TRUTH:              SINGLE SOURCE OF TRUTH:       │
│  Stock Quantities                     Financial Records             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Workflow

**Option A: Good Receipt Triggers Journal Entry (Recommended)**
```
1. Procurement creates Purchase Order
2. Goods arrive → Inventory Service records Good Receipt
3. Good Receipt event → Accounting Service auto-creates journal entry
```

**Option B: Manual Journal Entry (For Adjustments)**
```
1. User manually creates inventory purchase journal entry
2. Journal entry event → Inventory Service updates stock quantities
```

### Key Difference from Expenses

- **Inventory Purchase** → Asset account (Persediaan) → becomes COGS when sold
- **Expense Entry** → Expense account → immediately affects profit/loss

**Journal Entry Format:**
```
DEBIT:  Persediaan Barang Dagang (Inventory - Asset)
CREDIT: Cash/Bank OR Hutang Usaha (if on credit)
```

**Perpetual Inventory System:**
Kidkazz uses the perpetual inventory system where:
1. Purchases increase inventory asset immediately
2. Sales decrease inventory and record COGS immediately
3. Real-time inventory tracking via Inventory Service

---

## 1. User Interface Design

### Inventory Purchase Form

```
┌──────────────────────────────────────────────────────────────────┐
│  📦 Pembelian Persediaan (Inventory Purchase)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Supplier *                                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search supplier...                                 ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ☐ Import Supplier (enables import duties)                       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  Purchase Items                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Product          │ Qty  │ Unit  │ Unit Price  │ Subtotal    ││
│  ├──────────────────┼──────┼───────┼─────────────┼─────────────┤│
│  │ Mie Goreng Indomi│ 100  │ Karton│ Rp 85,000   │ Rp 8,500,000││
│  │ Minyak Goreng 2L │ 50   │ Karton│ Rp 180,000  │ Rp 9,000,000││
│  │ Gula Pasir 1kg   │ 200  │ Pack  │ Rp 14,000   │ Rp 2,800,000││
│  │ [+ Add Item]                                                 ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Subtotal (Barang):                          Rp 20,300,000       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  Additional Costs (Added to Inventory Cost)                      │
│                                                                  │
│  ☑️ Ongkos Kirim (Freight-In)                                    │
│     ┌──────────────────────────────────────────────────────────┐ │
│     │ Rp                                         500,000       │ │
│     └──────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ☐ Bea Masuk & Cukai (Import Duties)                             │
│     ┌──────────────────────────────────────────────────────────┐ │
│     │ Rp                                               0       │ │
│     └──────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ☐ Biaya Lainnya (Other Costs)                                   │
│     ┌──────────────────────────────────────────────────────────┐ │
│     │ Rp                                               0       │ │
│     └──────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  PPn (VAT) - Optional for PKP                                    │
│  ☐ Include PPn Masukan (11%)                                     │
│     PPn Amount:                                  Rp 2,288,000    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  GRAND TOTAL:                                   Rp 23,088,000    │
│  (Subtotal + Freight + PPn)                                      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  Payment Method *                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │   💵 Cash       │ │   🏦 Bank       │ │   📋 Hutang     │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                  │
│  [If Hutang selected]                                            │
│  Payment Terms                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Net 30 Days                                           ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Due Date: 2025-02-16                                            │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  Warehouse Destination *                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Gudang Utama (WH-JKT-01)                              ▼   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Date                          Reference (PO/Invoice #)          │
│  ┌────────────────────────┐    ┌────────────────────────────┐   │
│  │ 2025-01-17         📅 │    │ PO-2025-001                │   │
│  └────────────────────────┘    └────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Preview Journal Entry                                        ││
│  │ ┌──────────────────┬──────┬─────────────┬─────────────────┐ ││
│  │ │ Account          │ Code │ Debit       │ Credit          │ ││
│  │ ├──────────────────┼──────┼─────────────┼─────────────────┤ ││
│  │ │ Persediaan       │ 1210 │ 20,800,000  │                 │ ││
│  │ │ PPn Masukan      │ 2120 │  2,288,000  │                 │ ││
│  │ │ Hutang Dagang    │ 2010 │             │ 23,088,000      │ ││
│  │ └──────────────────┴──────┴─────────────┴─────────────────┘ ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft          │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│                              ┌────────────────────────────────┐ │
│                              │     ✅ Purchase & Post         │ │
│                              └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Relevant Accounts

### Asset Accounts - Inventory (1200-1299)

| Code | Indonesian Name | English Name | Use Case |
|------|-----------------|--------------|----------|
| **1210** | Persediaan Barang Dagang | Merchandise Inventory | General inventory |
| **1211** | Persediaan - Gudang Utama | Inventory - Main Warehouse | Main warehouse stock |
| **1212** | Persediaan - Gudang Cabang | Inventory - Branch Warehouse | Branch warehouse stock |
| **1213** | Persediaan - Toko | Inventory - Store | Store stock |
| **1220** | Persediaan Dalam Perjalanan | Inventory in Transit | Goods not yet received |
| **1250** | Persediaan Bahan Baku | Raw Materials Inventory | Manufacturing materials |
| **1260** | Persediaan Kemasan | Packaging Inventory | Packaging materials |

### COGS Accounts - Purchases (5000-5199)

| Code | Indonesian Name | English Name | Use Case |
|------|-----------------|--------------|----------|
| **5010** | Pembelian Barang Dagang | Merchandise Purchases | Alternative to direct inventory |
| **5020** | Ongkos Kirim Pembelian | Freight-In | Shipping cost on purchases |
| **5030** | Bea Masuk & Cukai | Import Duties & Customs | Import taxes |
| **5110** | Diskon Pembelian | Purchase Discounts | Discount received |
| **5120** | Retur Pembelian | Purchase Returns | Returned goods |

### Liability Accounts - Payables (2000-2099)

| Code | Indonesian Name | English Name | Use Case |
|------|-----------------|--------------|----------|
| **2010** | Hutang Dagang | Accounts Payable - Trade | General supplier payables |
| **2011** | Hutang Dagang - Supplier Lokal | A/P - Local Suppliers | Domestic suppliers |
| **2012** | Hutang Dagang - Supplier Impor | A/P - Import Suppliers | Foreign suppliers |

### Tax Accounts (2100-2199)

| Code | Indonesian Name | English Name | Use Case |
|------|-----------------|--------------|----------|
| **2120** | PPn Masukan | VAT Input (Purchase VAT) | VAT on purchases (asset-like) |

### Payment Accounts (1000-1039)

| Code | Indonesian Name | English Name |
|------|-----------------|--------------|
| **1010** | Kas Kecil - Kantor Pusat | Petty Cash - Head Office |
| **1020** | Bank BCA - Operasional | BCA Bank - Operating |
| **1022** | Bank BRI - Tabungan | BRI Bank - Savings |
| **1024** | Bank Mandiri - Operasional | Mandiri Bank - Operating |

---

## 3. Purchase Scenarios and Journal Entries

### Scenario 1: Cash Purchase (Simple)

**Context:** Purchase inventory and pay immediately with cash

**User Input:**
- Supplier: `PT Distributor Jaya`
- Items: Various products totaling `Rp 5,000,000`
- Payment: `Cash`
- Warehouse: `Gudang Utama`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0060",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian barang dagang dari PT Distributor Jaya",
  reference: "PO-2025-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 5000000,
      warehouseId: "WH-JKT-01",
      memo: "Inventory Purchase - PT Distributor Jaya"
    },
    {
      accountId: "acc-1010",
      accountCode: "1010",
      accountName: "Kas Kecil - Kantor Pusat",
      direction: "Credit",
      amount: 5000000,
      memo: "Cash payment for inventory"
    }
  ]
}
```

---

### Scenario 2: Credit Purchase (A/P)

**Context:** Purchase inventory on credit terms (Net 30)

**User Input:**
- Supplier: `PT Supplier ABC`
- Items: Various products totaling `Rp 20,000,000`
- Payment: `Credit (Hutang)` - Net 30 Days
- Warehouse: `Gudang Utama`
- Due Date: `2025-02-16`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0061",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian barang dagang dari PT Supplier ABC - Net 30",
  reference: "PO-2025-002",
  notes: "Payment Terms: Net 30 | Due: 2025-02-16",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 20000000,
      warehouseId: "WH-JKT-01",
      memo: "Inventory Purchase - PT Supplier ABC"
    },
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Credit",
      amount: 20000000,
      vendorId: "vendor-abc",
      memo: "A/P - PT Supplier ABC (Due: 2025-02-16)"
    }
  ]
}
```

---

### Scenario 3: Purchase with Freight-In (Ongkos Kirim)

**Context:** Purchase includes shipping cost paid to supplier or shipping company

**User Input:**
- Supplier: `PT Grosir Nasional`
- Items: Products totaling `Rp 15,000,000`
- Freight-In: `Rp 500,000`
- Total: `Rp 15,500,000`
- Payment: `Bank Transfer`

**Option A: Freight Added to Inventory Cost (Recommended)**

```typescript
{
  entryNumber: "JE-2025-0062",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian barang + ongkir dari PT Grosir Nasional",
  reference: "PO-2025-003",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 15500000,  // Includes freight
      warehouseId: "WH-JKT-01",
      memo: "Inventory + Freight - PT Grosir Nasional"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 15500000,
      memo: "Payment for inventory + freight"
    }
  ]
}
```

**Option B: Freight Recorded Separately (For Tracking)**

```typescript
{
  entryNumber: "JE-2025-0062",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian barang + ongkir dari PT Grosir Nasional",
  reference: "PO-2025-003",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 15000000,
      warehouseId: "WH-JKT-01",
      memo: "Inventory Purchase - PT Grosir Nasional"
    },
    {
      accountId: "acc-5020",
      accountCode: "5020",
      accountName: "Ongkos Kirim Pembelian",
      direction: "Debit",
      amount: 500000,
      memo: "Freight-In - PT Grosir Nasional"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 15500000,
      memo: "Payment for inventory + freight"
    }
  ]
}
```

---

### Scenario 4: Import Purchase with Duties

**Context:** Purchase from foreign supplier with import duties and customs

**User Input:**
- Supplier: `ABC Trading (China)` - Import
- Items: Products totaling `Rp 50,000,000` (converted from USD)
- Bea Masuk (Import Duty): `Rp 5,000,000` (10%)
- Freight (Shipping): `Rp 3,000,000`
- Total: `Rp 58,000,000`
- Payment: `Credit (A/P Import)`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0063",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Import pembelian dari ABC Trading (China)",
  reference: "PO-IMP-2025-001",
  notes: "Import: Products $3,125 + Duty 10% + Freight",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 50000000,
      warehouseId: "WH-JKT-01",
      memo: "Import Inventory - ABC Trading"
    },
    {
      accountId: "acc-5030",
      accountCode: "5030",
      accountName: "Bea Masuk & Cukai",
      direction: "Debit",
      amount: 5000000,
      memo: "Import Duty - 10%"
    },
    {
      accountId: "acc-5020",
      accountCode: "5020",
      accountName: "Ongkos Kirim Pembelian",
      direction: "Debit",
      amount: 3000000,
      memo: "International Freight"
    },
    {
      accountId: "acc-2012",
      accountCode: "2012",
      accountName: "Hutang Dagang - Supplier Impor",
      direction: "Credit",
      amount: 58000000,
      vendorId: "vendor-abc-china",
      memo: "A/P Import - ABC Trading (China)"
    }
  ]
}
```

---

### Scenario 5: Purchase with PPn (VAT) - PKP Business

**Context:** Purchase from PKP supplier with 11% PPn

**User Input:**
- Supplier: `PT Distributor PKP` (Faktur Pajak available)
- Items: Products totaling `Rp 20,000,000` (DPP - taxable base)
- PPn Masukan (11%): `Rp 2,200,000`
- Total: `Rp 22,200,000`
- Payment: `Credit (A/P)`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0064",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian dengan PPn dari PT Distributor PKP",
  reference: "PO-2025-004",
  notes: "Faktur Pajak: 010.000-25.00000001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 20000000,   // DPP only (without PPn)
      warehouseId: "WH-JKT-01",
      memo: "Inventory Purchase - PT Distributor PKP"
    },
    {
      accountId: "acc-2120",
      accountCode: "2120",
      accountName: "PPn Masukan",
      direction: "Debit",
      amount: 2200000,    // VAT Input (claimable)
      memo: "PPn Masukan 11% - FP: 010.000-25.00000001"
    },
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Credit",
      amount: 22200000,   // Total including PPn
      vendorId: "vendor-pkp",
      memo: "A/P - PT Distributor PKP (incl PPn)"
    }
  ]
}
```

**Note:** PPn Masukan (2120) is debited because it's a claimable tax asset that will be offset against PPn Keluaran when filing SPT PPN.

---

### Scenario 6: Purchase with Early Payment Discount

**Context:** Pay early and receive 2% discount

**User Input:**
- Supplier: `PT Supplier DEF`
- Original Amount: `Rp 10,000,000`
- Payment Terms: `2/10 Net 30`
- Early Payment Discount: `Rp 200,000` (2%)
- Amount Paid: `Rp 9,800,000`
- Payment: `Bank Transfer`

**Option A: Net Method (Record at Net)**

```typescript
{
  entryNumber: "JE-2025-0065",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian dengan diskon 2% dari PT Supplier DEF",
  reference: "PO-2025-005",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 9800000,    // Net amount (after discount)
      warehouseId: "WH-JKT-01",
      memo: "Inventory Purchase (Net of 2% discount)"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 9800000,
      memo: "Payment with 2% early discount"
    }
  ]
}
```

**Option B: Gross Method (Record Discount Separately)**

```typescript
{
  entryNumber: "JE-2025-0065",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian dengan diskon 2% dari PT Supplier DEF",
  reference: "PO-2025-005",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 10000000,   // Gross amount
      warehouseId: "WH-JKT-01",
      memo: "Inventory Purchase - PT Supplier DEF"
    },
    {
      accountId: "acc-5110",
      accountCode: "5110",
      accountName: "Diskon Pembelian",
      direction: "Credit",
      amount: 200000,     // Discount received
      memo: "Purchase Discount - 2%"
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 9800000,    // Actual payment
      memo: "Payment for inventory"
    }
  ]
}
```

---

### Scenario 7: Purchase Return (Retur Pembelian)

**Context:** Return defective goods to supplier

**User Input:**
- Supplier: `PT Supplier GHI`
- Original Purchase: `PO-2025-006` (Rp 5,000,000)
- Return Amount: `Rp 500,000` (defective items)
- Credit Memo: Reduce A/P balance

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0066",
  entryDate: "2025-01-20",
  entryType: "Manual",
  status: "Posted",
  description: "Retur pembelian ke PT Supplier GHI",
  reference: "RET-PO-2025-006",
  notes: "Reason: Defective goods",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Debit",
      amount: 500000,     // Reduce A/P
      vendorId: "vendor-ghi",
      memo: "A/P Reduction - Purchase Return"
    },
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Credit",
      amount: 500000,     // Reduce Inventory
      warehouseId: "WH-JKT-01",
      memo: "Inventory Return - Defective goods"
    }
  ]
}
```

**Alternative: Using Retur Pembelian Account**

```typescript
{
  lines: [
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Debit",
      amount: 500000
    },
    {
      accountId: "acc-5120",
      accountCode: "5120",
      accountName: "Retur Pembelian",
      direction: "Credit",
      amount: 500000,
      memo: "Purchase Return - Defective goods"
    }
  ]
}
```

---

### Scenario 8: Goods in Transit (Belum Diterima)

**Context:** Goods ordered but not yet received - record as Inventory in Transit

**User Input:**
- Supplier: `PT Supplier JKL`
- Items: Products totaling `Rp 30,000,000`
- Status: Goods shipped, not yet arrived
- Payment: `Credit (A/P)`

**Journal Entry 1: When PO is Confirmed/Shipped**

```typescript
{
  entryNumber: "JE-2025-0067",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian dalam perjalanan - PT Supplier JKL",
  reference: "PO-2025-007",
  notes: "Status: In Transit | ETA: 2025-01-25",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1220",
      accountCode: "1220",
      accountName: "Persediaan Dalam Perjalanan",
      direction: "Debit",
      amount: 30000000,
      memo: "Inventory in Transit - PT Supplier JKL"
    },
    {
      accountId: "acc-2010",
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Credit",
      amount: 30000000,
      vendorId: "vendor-jkl",
      memo: "A/P - PT Supplier JKL"
    }
  ]
}
```

**Journal Entry 2: When Goods Received**

```typescript
{
  entryNumber: "JE-2025-0075",
  entryDate: "2025-01-25",
  entryType: "Manual",
  status: "Posted",
  description: "Penerimaan barang dari PT Supplier JKL",
  reference: "GRN-2025-007",
  notes: "Original PO: PO-2025-007",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-1210",
      accountCode: "1210",
      accountName: "Persediaan Barang Dagang",
      direction: "Debit",
      amount: 30000000,
      warehouseId: "WH-JKT-01",
      memo: "Goods Received - PT Supplier JKL"
    },
    {
      accountId: "acc-1220",
      accountCode: "1220",
      accountName: "Persediaan Dalam Perjalanan",
      direction: "Credit",
      amount: 30000000,
      memo: "Transfer from In Transit"
    }
  ]
}
```

---

## 4. API Design

### Create Inventory Purchase Endpoint

```
POST /api/accounting/inventory-purchases
```

### Request Schema

```typescript
interface CreateInventoryPurchaseRequest {
  // Required fields
  supplierId: string;                  // Supplier/Vendor ID
  warehouseId: string;                 // Destination warehouse
  paymentMethod: PaymentMethod;

  // Purchase items
  items: PurchaseItem[];

  // Additional costs (added to inventory cost)
  freightIn?: number;                  // Shipping/freight cost
  importDuties?: number;               // Bea Masuk & Cukai
  otherCosts?: number;                 // Other capitalized costs

  // PPn (for PKP businesses)
  includePPn?: boolean;                // Whether to include PPn
  ppnAmount?: number;                  // PPn amount (auto-calculated if not provided)
  fakturPajakNumber?: string;          // Tax invoice number

  // Credit terms (if payment method is A/P)
  paymentTermDays?: number;            // 0, 7, 15, 30, 60, 90
  dueDate?: string;                    // Calculated or manual

  // Discount
  purchaseDiscount?: number;           // Early payment discount received
  discountMethod?: 'NET' | 'GROSS';    // How to record discount

  // Goods in transit
  isInTransit?: boolean;               // If true, use 1220 instead of 1210
  expectedArrivalDate?: string;

  // Optional fields
  entryDate?: string;                  // ISO date, defaults to today
  description?: string;
  reference?: string;                  // PO number, invoice number
  notes?: string;

  saveAsDraft?: boolean;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  subtotal: number;                    // quantity * unitPrice
}

type PaymentMethod =
  | 'CASH'
  | 'BANK_BCA_OPERASIONAL'
  | 'BANK_BRI_TABUNGAN'
  | 'BANK_MANDIRI'
  | 'ACCOUNTS_PAYABLE'                 // Credit purchase
  | 'ACCOUNTS_PAYABLE_IMPORT';         // Credit purchase (import)
```

### Response Schema

```typescript
interface CreateInventoryPurchaseResponse {
  success: boolean;
  data: {
    journalEntryId: string;
    entryNumber: string;
    status: 'Draft' | 'Posted';
    supplier: {
      id: string;
      name: string;
    };
    warehouse: {
      id: string;
      name: string;
    };
    purchase: {
      itemsSubtotal: number;
      freightIn: number;
      importDuties: number;
      otherCosts: number;
      ppnAmount: number;
      discount: number;
      grandTotal: number;
    };
    payment: {
      method: string;
      accountCode: string;
      dueDate?: string;
    };
    inventoryAccount: {
      code: string;
      name: string;
    };
    lines: JournalLineDTO[];
  };
}
```

### Example API Call - Simple Cash Purchase

```bash
curl -X POST /api/accounting/inventory-purchases \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "supplierId": "vendor-dist-jaya",
    "warehouseId": "WH-JKT-01",
    "paymentMethod": "CASH",
    "items": [
      {
        "productId": "prod-001",
        "productName": "Mie Goreng Indomie",
        "quantity": 100,
        "unitOfMeasure": "Karton",
        "unitPrice": 85000,
        "subtotal": 8500000
      }
    ],
    "description": "Pembelian barang dagang",
    "reference": "PO-2025-001"
  }'
```

### Example API Call - Credit Purchase with PPn

```bash
curl -X POST /api/accounting/inventory-purchases \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "supplierId": "vendor-pkp",
    "warehouseId": "WH-JKT-01",
    "paymentMethod": "ACCOUNTS_PAYABLE",
    "items": [
      {
        "productId": "prod-001",
        "productName": "Mie Goreng Indomie",
        "quantity": 200,
        "unitOfMeasure": "Karton",
        "unitPrice": 85000,
        "subtotal": 17000000
      },
      {
        "productId": "prod-002",
        "productName": "Minyak Goreng 2L",
        "quantity": 50,
        "unitOfMeasure": "Karton",
        "unitPrice": 180000,
        "subtotal": 9000000
      }
    ],
    "freightIn": 500000,
    "includePPn": true,
    "fakturPajakNumber": "010.000-25.00000001",
    "paymentTermDays": 30,
    "description": "Pembelian dengan PPn",
    "reference": "PO-2025-002"
  }'
```

---

## 5. Validation Rules

### Business Rules

1. **Supplier Validation**
   - Supplier must exist in the system
   - Supplier status must be active

2. **Warehouse Validation**
   - Warehouse must exist
   - Warehouse must be active and accepting inventory

3. **Items Validation**
   - At least one item required
   - Product must exist
   - Quantity must be > 0
   - Unit price must be >= 0
   - Subtotal must equal quantity × unit price

4. **Amount Validation**
   - Total must be > 0
   - PPn calculation: 11% of (items subtotal + freight + other costs)
   - Grand total = subtotal + freight + import duties + other costs + PPn - discount

5. **PPn Validation (for PKP)**
   - Faktur Pajak number required if includePPn is true
   - PPn rate is 11%

6. **Payment Terms Validation**
   - If payment method is A/P, payment term days should be specified
   - Due date calculated from entry date + payment term days

7. **Inventory Account Validation**
   - Inventory account must be asset type (1200-1299)
   - Use 1220 (In Transit) if isInTransit is true

### Error Responses

```typescript
// No items
{
  "success": false,
  "error": {
    "code": "NO_ITEMS",
    "message": "At least one purchase item is required."
  }
}

// Invalid quantity
{
  "success": false,
  "error": {
    "code": "INVALID_QUANTITY",
    "message": "Quantity must be greater than 0 for item: Mie Goreng Indomie."
  }
}

// Missing Faktur Pajak
{
  "success": false,
  "error": {
    "code": "FAKTUR_PAJAK_REQUIRED",
    "message": "Faktur Pajak number is required when including PPn."
  }
}

// Subtotal mismatch
{
  "success": false,
  "error": {
    "code": "SUBTOTAL_MISMATCH",
    "message": "Subtotal (Rp 8,000,000) does not match quantity (100) × unit price (Rp 85,000) for Mie Goreng Indomie."
  }
}
```

---

## 6. Integration with Inventory Service

### Automatic Inventory Update

When an inventory purchase is posted, the system should:

1. **Create Journal Entry** (Accounting Service)
2. **Update Inventory Quantities** (Inventory Service)

```typescript
// Event published after journal entry posted
interface InventoryPurchasePosted {
  eventType: 'INVENTORY_PURCHASE_POSTED';
  journalEntryId: string;
  warehouseId: string;
  items: {
    productId: string;
    quantity: number;
    unitOfMeasure: string;
    unitCost: number;      // For weighted average cost calculation
  }[];
  supplierId: string;
  reference: string;
  timestamp: Date;
}
```

### Inventory Service Handling

```typescript
// Inventory Service listens for purchase events
async function handleInventoryPurchase(event: InventoryPurchasePosted) {
  for (const item of event.items) {
    await inventoryRepository.adjustStock({
      productId: item.productId,
      warehouseId: event.warehouseId,
      adjustmentType: 'PURCHASE',
      quantity: item.quantity,
      unitCost: item.unitCost,
      reference: event.reference,
      sourceService: 'accounting-service',
      sourceReferenceId: event.journalEntryId
    });
  }
}
```

---

## 7. Summary

### Journal Entry Patterns

| Scenario | DEBIT | CREDIT |
|----------|-------|--------|
| **Cash Purchase** | Persediaan (1210) | Cash/Bank |
| **Credit Purchase** | Persediaan (1210) | Hutang Dagang (2010) |
| **With Freight** | Persediaan + Ongkir (5020) | Cash/Bank/A/P |
| **Import with Duties** | Persediaan + Bea Masuk (5030) | Hutang Impor (2012) |
| **With PPn (PKP)** | Persediaan + PPn Masukan (2120) | A/P (total incl PPn) |
| **With Discount (Gross)** | Persediaan (gross) | Cash/Bank + Diskon (5110) |
| **Purchase Return** | Hutang Dagang | Persediaan OR Retur (5120) |
| **Goods in Transit** | Persediaan Transit (1220) | A/P |

### Key Accounts

| Code | Account | Direction | Purpose |
|------|---------|-----------|---------|
| 1210 | Persediaan Barang Dagang | Debit | Inventory asset |
| 1220 | Persediaan Dalam Perjalanan | Debit | Goods in transit |
| 2010-2012 | Hutang Dagang | Credit | A/P for credit purchases |
| 2120 | PPn Masukan | Debit | VAT input (claimable) |
| 5020 | Ongkos Kirim Pembelian | Debit | Freight-in |
| 5030 | Bea Masuk & Cukai | Debit | Import duties |
| 5110 | Diskon Pembelian | Credit | Purchase discount |
| 5120 | Retur Pembelian | Credit | Purchase returns |

### API Endpoint

```
POST /api/accounting/inventory-purchases
```

---

## 8. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Accounts Payable Payment Entry](./ACCOUNTS_PAYABLE_PAYMENT_ENTRY.md) - Paying for purchases
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - For operating expenses (not inventory)
- [Fund Transfer Between Accounts](./FUND_TRANSFER_BETWEEN_ACCOUNTS.md) - Internal transfers
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md) - Service design
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
