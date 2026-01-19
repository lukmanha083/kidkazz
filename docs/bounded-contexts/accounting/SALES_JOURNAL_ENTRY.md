# Sales Journal Entry

## Overview

This document describes the automatic journal entry generation for sales transactions. When a sale is completed (order status = `DELIVERED` or `COMPLETED`), the system automatically creates balanced journal entries for revenue recognition, COGS (Cost of Goods Sold), and tax obligations.

## Business Context

### Sales Flow Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SALES TRANSACTION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SALES SERVICE                    INVENTORY SERVICE                          │
│  ─────────────────               ─────────────────                           │
│                                                                              │
│  1. Order Created ────────────→ 2. Reserve Stock                             │
│     Status: PENDING               (quantityReserved++)                       │
│                                                                              │
│  3. Payment Received                                                         │
│     Status: PAID                                                             │
│                                                                              │
│  4. Order Processing ─────────→ 5. Good Issue (GI)                           │
│     Status: PROCESSING            - Deduct quantityAvailable                 │
│                                   - Create COGS movement                     │
│                                                                              │
│  6. Order Shipped                                                            │
│     Status: SHIPPED                                                          │
│                                                                              │
│  7. Order Delivered ──────────→ 8. ACCOUNTING SERVICE                        │
│     Status: DELIVERED             - Create Sales Journal Entry               │
│                                   - Record Revenue                           │
│                                   - Record COGS                              │
│                                   - Record PPn Keluaran (Output VAT)         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When Journal Entry is Created

| Trigger Event | Journal Entry Type | Description |
|--------------|-------------------|-------------|
| Order `DELIVERED` | Sales Revenue | Full revenue recognition |
| Order `COMPLETED` | Sales Revenue | For instant/POS sales |
| Good Issue | COGS | Cost of goods sold |
| Payment Received | A/R Collection | If credit sale, record when paid |

## Sales Types

### 1. Cash Sales (Retail POS)

Customer pays immediately at point of sale.

**Characteristics:**
- Payment received at transaction time
- No accounts receivable
- Immediate revenue recognition
- May include multiple payment methods (split payment)

### 2. Credit Sales (Wholesale B2B)

Customer receives invoice with payment terms.

**Characteristics:**
- Creates Accounts Receivable
- Payment terms (Net 7, Net 14, Net 30, etc.)
- Revenue recognized at delivery
- Payment collected later

### 3. Online Sales (E-Commerce)

Customer pays via payment gateway.

**Characteristics:**
- Payment via Midtrans, QRIS, VA (Virtual Account)
- May have settlement delays (T+1 for QRIS)
- Platform fees deducted from settlement

### 4. Food Delivery Sales (GoFood, GrabFood)

Sales through food delivery platforms.

**Characteristics:**
- Platform commission deducted (20-25%)
- Settlement weekly
- Reconciliation required

### 5. Mobile App Sales (Retail Android/iOS App)

Customer purchases through company's own mobile app.

**Characteristics:**
- Customer uses Kidkazz mobile app to browse and purchase
- Payment via Midtrans (QRIS, VA, Credit Card)
- Fulfilled from warehouse (same as online website)
- No platform commission (own app)
- Settlement T+1 via payment gateway

---

## Chart of Accounts Reference

### Revenue Accounts (4xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **4010** | Penjualan Barang Dagang | Sales of Merchandise |
| **4020** | Penjualan Jasa | Sales of Services |
| **4110** | Diskon Penjualan | Sales Discounts Given |
| **4120** | Retur Penjualan | Sales Returns |
| **4130** | Potongan Penjualan | Sales Allowances |

### Cost of Sales Accounts (5xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **5010** | Harga Pokok Penjualan (HPP) | Cost of Goods Sold |
| **5110** | Diskon Pembelian | Purchase Discounts Received |
| **5120** | Retur Pembelian | Purchase Returns |

### Asset Accounts (1xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **1010** | Kas | Cash on Hand |
| **1011** | Kas Kecil | Petty Cash |
| **1020** | Bank BCA | Bank BCA Account |
| **1021** | Bank Mandiri | Bank Mandiri Account |
| **1022** | Bank BRI | Bank BRI Account |
| **1030** | Kas QRIS | QRIS Settlement Pending |
| **1031** | Kas EDC | EDC Settlement Pending |
| **1110** | Piutang Usaha | Accounts Receivable |
| **1111** | Piutang GoFood | GoFood Receivable |
| **1112** | Piutang GrabFood | GrabFood Receivable |
| **1210** | Persediaan Barang Dagang | Merchandise Inventory |

### Liability Accounts (2xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **2121** | PPn Keluaran | Output VAT (Sales Tax Payable) |

### Expense Accounts (6xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **6361** | Biaya Komisi GoFood | GoFood Commission Expense |
| **6362** | Biaya Komisi GrabFood | GrabFood Commission Expense |
| **6370** | Biaya Payment Gateway | Payment Gateway Fees |
| **6371** | Biaya Midtrans | Midtrans Fee |
| **6372** | Biaya QRIS | QRIS Fee |
| **6373** | Biaya EDC | EDC/Card Fee |

---

## Warehouse/Store Tracking (GL Segmentation)

All sales transactions are tracked by warehouse/store location via the `warehouseId` field in journal lines. This enables:

| Report | Description |
|--------|-------------|
| **Sales by Location** | Revenue breakdown per store/warehouse |
| **P&L by Location** | Profit/Loss per location |
| **COGS by Location** | Cost of goods sold per location |
| **Gross Margin by Location** | Profitability analysis per location |

```typescript
interface SalesJournalLine {
  accountCode: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  warehouseId?: string;      // 👈 Location tracking
  salesChannel?: string;     // 'POS' | 'ONLINE' | 'B2B' | 'MARKETPLACE'
  salesPersonId?: string;    // For commission tracking
}
```

---

## Journal Entry Patterns

### 1. Cash Sale (POS - No Tax)

**Scenario:** Customer buys Rp 500,000 worth of goods at **Toko 1 - Kelapa Gading**, pays cash. COGS is Rp 350,000.

**Revenue Entry:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-15 | 1012 - Kas Laci POS Toko 1 | Rp 500,000 | | store-kg-001 |
| 2025-01-15 | 4010 - Penjualan Barang Dagang | | Rp 500,000 | store-kg-001 |

**COGS Entry:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-15 | 5010 - HPP | Rp 350,000 | | store-kg-001 |
| 2025-01-15 | 1210 - Persediaan | | Rp 350,000 | store-kg-001 |

---

### 2. Cash Sale with PPn (Tax Invoice)

**Scenario:** Customer buys Rp 1,000,000 worth of goods + 11% PPn at **Toko 2 - PIK**. Total Rp 1,110,000.

**Revenue Entry:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-15 | 1013 - Kas Laci POS Toko 2 | Rp 1,110,000 | | store-pik-001 |
| 2025-01-15 | 4010 - Penjualan | | Rp 1,000,000 | store-pik-001 |
| 2025-01-15 | 2121 - PPn Keluaran | | Rp 110,000 | store-pik-001 |

**COGS Entry:** (same pattern as above, with location)

---

### 3. Credit Sale (Wholesale B2B)

**Scenario:** Wholesale customer orders Rp 5,000,000 + 11% PPn from **Gudang Utama - Cakung**, payment terms Net 30.

**At Delivery (Revenue Recognition):**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-15 | 1110 - Piutang Usaha | Rp 5,550,000 | | wh-cakung-001 |
| 2025-01-15 | 4010 - Penjualan | | Rp 5,000,000 | wh-cakung-001 |
| 2025-01-15 | 2121 - PPn Keluaran | | Rp 550,000 | wh-cakung-001 |

**COGS Entry:** (recorded at Good Issue, with location)

**At Payment (A/R Collection):**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-02-14 | 1020 - Bank BCA | Rp 5,550,000 | | wh-cakung-001 |
| 2025-02-14 | 1110 - Piutang Usaha | | Rp 5,550,000 | wh-cakung-001 |

---

### 4. Credit Sale with Discount Given

**Scenario:** Customer from **Gudang Utama** pays early and gets 2% discount. Original invoice Rp 5,550,000.

| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-25 | 1020 - Bank BCA | Rp 5,439,000 | | wh-cakung-001 |
| 2025-01-25 | 4130 - Potongan Penjualan | Rp 111,000 | | wh-cakung-001 |
| 2025-01-25 | 1110 - Piutang Usaha | | Rp 5,550,000 | wh-cakung-001 |

---

### 5. QRIS Payment (POS)

**Scenario:** Customer pays Rp 200,000 via QRIS at **Toko 1 - Kelapa Gading**. QRIS fee 0.7%.

**At Sale:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-15 | 1030 - Kas QRIS | Rp 200,000 | | store-kg-001 |
| 2025-01-15 | 4010 - Penjualan | | Rp 200,000 | store-kg-001 |

**At Settlement (T+1):**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-16 | 1020 - Bank BCA | Rp 198,600 | | store-kg-001 |
| 2025-01-16 | 6372 - Biaya QRIS | Rp 1,400 | | store-kg-001 |
| 2025-01-16 | 1030 - Kas QRIS | | Rp 200,000 | store-kg-001 |

---

### 6. EDC/Card Payment (POS)

**Scenario:** Customer pays Rp 500,000 via Debit Card at **Toko 3 - Pondok Indah**. EDC fee 1.5%.

**At Sale:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-15 | 1031 - Kas EDC | Rp 500,000 | | store-pi-001 |
| 2025-01-15 | 4010 - Penjualan | | Rp 500,000 | store-pi-001 |

**At Settlement (T+2):**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-17 | 1020 - Bank BCA | Rp 492,500 | | store-pi-001 |
| 2025-01-17 | 6373 - Biaya EDC | Rp 7,500 | | store-pi-001 |
| 2025-01-17 | 1031 - Kas EDC | | Rp 500,000 | store-pi-001 |

---

### 7. Split Payment (Cash + QRIS)

**Scenario:** Customer pays Rp 300,000 total at **Toko 2 - PIK**: Rp 100,000 cash + Rp 200,000 QRIS.

**At Sale:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-15 | 1013 - Kas Laci POS Toko 2 | Rp 100,000 | | store-pik-001 |
| 2025-01-15 | 1030 - Kas QRIS | Rp 200,000 | | store-pik-001 |
| 2025-01-15 | 4010 - Penjualan | | Rp 300,000 | store-pik-001 |

---

### 8. GoFood Sale (Marketplace)

**Scenario:** GoFood order Rp 150,000 from **Restoran - Grand Indonesia**. GoFood commission 20%.

**At Sale (Order Delivered):**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-15 | 1111 - Piutang GoFood | Rp 150,000 | | resto-gi-001 | GOFOOD |
| 2025-01-15 | 4010 - Penjualan | | Rp 150,000 | resto-gi-001 | GOFOOD |

**At Settlement (Weekly):**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-22 | 1020 - Bank BCA | Rp 120,000 | | resto-gi-001 | GOFOOD |
| 2025-01-22 | 6361 - Biaya Komisi GoFood | Rp 30,000 | | resto-gi-001 | GOFOOD |
| 2025-01-22 | 1111 - Piutang GoFood | | Rp 150,000 | resto-gi-001 | GOFOOD |

---

### 9. GrabFood Sale (Marketplace)

**Scenario:** GrabFood order Rp 180,000 from **Restoran - Grand Indonesia**. GrabFood commission 25%.

**At Sale (Order Delivered):**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-15 | 1112 - Piutang GrabFood | Rp 180,000 | | resto-gi-001 | GRABFOOD |
| 2025-01-15 | 4010 - Penjualan | | Rp 180,000 | resto-gi-001 | GRABFOOD |

**At Settlement (Weekly):**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-22 | 1020 - Bank BCA | Rp 135,000 | | resto-gi-001 | GRABFOOD |
| 2025-01-22 | 6362 - Biaya Komisi GrabFood | Rp 45,000 | | resto-gi-001 | GRABFOOD |
| 2025-01-22 | 1112 - Piutang GrabFood | | Rp 180,000 | resto-gi-001 | GRABFOOD |

---

### 10. Online Website Sale (E-Commerce Direct)

**Scenario:** Direct website order Rp 200,000 from **Gudang Utama - Cakung**, paid via Midtrans. Midtrans fee 2.9%.

**At Sale (Order Paid):**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-15 | 1032 - Kas Midtrans | Rp 200,000 | | wh-cakung-001 | WEBSITE |
| 2025-01-15 | 4010 - Penjualan | | Rp 200,000 | wh-cakung-001 | WEBSITE |

**At Settlement (T+1):**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-16 | 1020 - Bank BCA | Rp 194,200 | | wh-cakung-001 | WEBSITE |
| 2025-01-16 | 6371 - Biaya Midtrans | Rp 5,800 | | wh-cakung-001 | WEBSITE |
| 2025-01-16 | 1032 - Kas Midtrans | | Rp 200,000 | wh-cakung-001 | WEBSITE |

---

### 11. Mobile App Sale (Retail Android/iOS)

**Scenario:** Customer orders via Kidkazz mobile app Rp 350,000 fulfilled from **Gudang Cabang - Bandung**, paid via QRIS. Midtrans fee 0.7%.

**At Sale (Order Paid):**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-15 | 1032 - Kas Midtrans | Rp 350,000 | | wh-bandung-001 | MOBILE_APP |
| 2025-01-15 | 4010 - Penjualan | | Rp 350,000 | wh-bandung-001 | MOBILE_APP |

**COGS Entry:**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-15 | 5010 - HPP | Rp 245,000 | | wh-bandung-001 | MOBILE_APP |
| 2025-01-15 | 1210 - Persediaan | | Rp 245,000 | wh-bandung-001 | MOBILE_APP |

**At Settlement (T+1):**
| Date | Account | Debit | Credit | Location | Channel |
|------|---------|-------|--------|----------|---------|
| 2025-01-16 | 1020 - Bank BCA | Rp 347,550 | | wh-bandung-001 | MOBILE_APP |
| 2025-01-16 | 6372 - Biaya QRIS | Rp 2,450 | | wh-bandung-001 | MOBILE_APP |
| 2025-01-16 | 1032 - Kas Midtrans | | Rp 350,000 | wh-bandung-001 | MOBILE_APP |

---

### 12. Sales Return

**Scenario:** Customer returns goods worth Rp 100,000 to **Toko 1 - Kelapa Gading**. COGS was Rp 70,000.

**If Cash Refund:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-20 | 4120 - Retur Penjualan | Rp 100,000 | | store-kg-001 |
| 2025-01-20 | 1012 - Kas Laci POS Toko 1 | | Rp 100,000 | store-kg-001 |

**Inventory Return:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-20 | 1210 - Persediaan | Rp 70,000 | | store-kg-001 |
| 2025-01-20 | 5010 - HPP | | Rp 70,000 | store-kg-001 |

**If Credit Note (Reduce A/R) - B2B:**
| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-20 | 4120 - Retur Penjualan | Rp 100,000 | | wh-cakung-001 |
| 2025-01-20 | 1110 - Piutang Usaha | | Rp 100,000 | wh-cakung-001 |

---

### 13. Sales Return with PPn

**Scenario:** B2B Customer returns goods worth Rp 500,000 + PPn 11% to **Gudang Utama**.

| Date | Account | Debit | Credit | Location |
|------|---------|-------|--------|----------|
| 2025-01-20 | 4120 - Retur Penjualan | Rp 500,000 | | wh-cakung-001 |
| 2025-01-20 | 2121 - PPn Keluaran | Rp 55,000 | | wh-cakung-001 |
| 2025-01-20 | 1110 - Piutang Usaha | | Rp 555,000 | wh-cakung-001 |

---

## API Design

### 1. Create Sales Journal Entry

```
POST /api/accounting/sales-entries
```

**Request Body:**
```json
{
  "orderId": "ORD-2025-001234",
  "orderNumber": "INV-2025-001234",
  "transactionDate": "2025-01-15",
  "customerId": "cust_123",
  "customerName": "Toko Makmur",
  "saleType": "credit",
  "paymentMethod": "credit_terms",
  "paymentTerms": "net_30",
  "warehouseId": "wh_001",
  "items": [
    {
      "productId": "prod_001",
      "productName": "Indomie Goreng",
      "quantity": 100,
      "unitPrice": 3500,
      "discount": 0,
      "subtotal": 350000,
      "costPerUnit": 2800,
      "totalCost": 280000
    },
    {
      "productId": "prod_002",
      "productName": "Teh Botol Sosro",
      "quantity": 50,
      "unitPrice": 5000,
      "discount": 5000,
      "subtotal": 245000,
      "costPerUnit": 3500,
      "totalCost": 175000
    }
  ],
  "subtotal": 595000,
  "discountTotal": 5000,
  "taxRate": 11,
  "taxAmount": 65450,
  "grandTotal": 660450,
  "notes": "Wholesale order - Net 30"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "salesEntryId": "se_abc123",
    "journalEntries": [
      {
        "journalId": "je_001",
        "type": "SALES_REVENUE",
        "entries": [
          { "accountCode": "1110", "debit": 660450, "credit": 0, "warehouseId": "wh_001" },
          { "accountCode": "4010", "debit": 0, "credit": 595000, "warehouseId": "wh_001" },
          { "accountCode": "2121", "debit": 0, "credit": 65450, "warehouseId": "wh_001" }
        ]
      },
      {
        "journalId": "je_002",
        "type": "COGS",
        "entries": [
          { "accountCode": "5010", "debit": 455000, "credit": 0, "warehouseId": "wh_001" },
          { "accountCode": "1210", "debit": 0, "credit": 455000, "warehouseId": "wh_001" }
        ]
      }
    ],
    "totalDebit": 1115450,
    "totalCredit": 1115450,
    "balanced": true
  }
}
```

---

### 2. Record POS Sale (Cash)

```
POST /api/accounting/pos-sales
```

**Request Body:**
```json
{
  "transactionId": "TXN-2025-001234",
  "transactionDate": "2025-01-15",
  "warehouseId": "wh_001",
  "cashierId": "user_001",
  "payments": [
    {
      "method": "cash",
      "amount": 100000
    },
    {
      "method": "qris",
      "amount": 200000,
      "reference": "QRIS-123456"
    }
  ],
  "items": [
    {
      "productId": "prod_001",
      "quantity": 5,
      "unitPrice": 30000,
      "subtotal": 150000,
      "costPerUnit": 22000,
      "totalCost": 110000
    },
    {
      "productId": "prod_002",
      "quantity": 10,
      "unitPrice": 15000,
      "subtotal": 150000,
      "costPerUnit": 10000,
      "totalCost": 100000
    }
  ],
  "subtotal": 300000,
  "discount": 0,
  "grandTotal": 300000,
  "includeTax": false
}
```

---

### 3. Record Sales Return

```
POST /api/accounting/sales-returns
```

**Request Body:**
```json
{
  "originalOrderId": "ORD-2025-001234",
  "returnDate": "2025-01-20",
  "returnType": "refund",
  "refundMethod": "cash",
  "reason": "defective_product",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 2,
      "unitPrice": 30000,
      "subtotal": 60000,
      "costPerUnit": 22000,
      "totalCost": 44000,
      "returnToInventory": true
    }
  ],
  "subtotal": 60000,
  "taxAmount": 6600,
  "grandTotal": 66600,
  "notes": "Customer found defect on 2 items"
}
```

---

### 4. Record Marketplace Settlement

```
POST /api/accounting/marketplace-settlements
```

**Request Body:**
```json
{
  "platform": "gofood",
  "settlementDate": "2025-01-22",
  "periodStart": "2025-01-15",
  "periodEnd": "2025-01-21",
  "bankAccountId": "1020",
  "orders": [
    { "orderId": "GF-001", "grossAmount": 150000 },
    { "orderId": "GF-002", "grossAmount": 120000 },
    { "orderId": "GF-003", "grossAmount": 180000 }
  ],
  "grossTotal": 450000,
  "commissionRate": 20,
  "commissionAmount": 90000,
  "otherDeductions": 0,
  "netSettlement": 360000
}
```

---

## Event-Driven Integration

### Events Consumed (from Sales Service)

| Event | Action |
|-------|--------|
| `order.delivered` | Create sales revenue journal entry |
| `order.completed` | Create sales revenue journal entry (POS) |
| `payment.received` | Create A/R collection entry (if credit sale) |
| `order.returned` | Create sales return journal entry |
| `good.issued` | Create COGS journal entry |

### Events Published

| Event | Trigger |
|-------|---------|
| `journal.created` | After any journal entry is created |
| `revenue.recognized` | After sales revenue is recorded |
| `cogs.recorded` | After COGS is recorded |

### Event Payload Example

```json
{
  "eventType": "order.delivered",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "orderId": "ORD-2025-001234",
    "orderNumber": "INV-2025-001234",
    "customerId": "cust_123",
    "totalAmount": 660450,
    "taxAmount": 65450,
    "paymentMethod": "credit_terms",
    "items": [
      {
        "productId": "prod_001",
        "quantity": 100,
        "unitPrice": 3500,
        "cost": 2800
      }
    ]
  }
}
```

---

## Validation Rules

### 1. Order Validation
- Order must exist and be in valid status (`DELIVERED` or `COMPLETED`)
- Order must not already have journal entry created (prevent duplicates)
- Total amounts must match (subtotal + tax = grand total)

### 2. COGS Validation
- Product cost must be available (from Inventory Service)
- COGS cannot be negative
- COGS should not exceed selling price (warning, not error)

### 3. Tax Validation
- PPn rate must be valid (currently 11% in Indonesia)
- Tax amount must be calculated correctly
- Tax invoice required for B2B sales

### 4. Payment Method Validation
- Valid payment methods: `cash`, `bank_transfer`, `qris`, `edc`, `credit_terms`, `gofood`, `grabfood`, `midtrans`
- Credit terms require customer with credit limit
- Platform sales must have platform receivable account

### 5. Return Validation
- Original order must exist
- Return quantity cannot exceed original quantity
- Return date must be after original sale date
- Must specify if inventory is returned

---

## COGS Calculation Methods

### 1. Perpetual Inventory (Used by Kidkazz)

COGS recorded at each sale based on actual cost from inventory batches.

**Formula (FIFO/FEFO):**
```
COGS = Sum of (Batch Cost × Quantity Issued)
```

**Example:**
- Batch A: 50 units @ Rp 2,800
- Batch B: 30 units @ Rp 2,900
- Sold: 60 units

COGS = (50 × 2,800) + (10 × 2,900) = 140,000 + 29,000 = Rp 169,000

### 2. Weighted Average (Alternative)

```
Weighted Avg Cost = Total Inventory Value / Total Quantity
COGS = Weighted Avg Cost × Quantity Sold
```

---

## Database Schema

### SalesJournalEntry Table

```sql
CREATE TABLE sales_journal_entries (
  id TEXT PRIMARY KEY,

  -- Reference
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  transaction_date TEXT NOT NULL,

  -- Customer
  customer_id TEXT,
  customer_name TEXT,

  -- Type
  sale_type TEXT NOT NULL, -- 'cash' | 'credit' | 'marketplace'
  payment_method TEXT NOT NULL,
  platform TEXT, -- 'gofood' | 'grabfood' | 'shopee' | 'tokopedia' | null

  -- Amounts
  subtotal INTEGER NOT NULL,
  discount_total INTEGER DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  grand_total INTEGER NOT NULL,

  -- COGS
  total_cogs INTEGER NOT NULL,

  -- Journal references
  revenue_journal_id TEXT NOT NULL,
  cogs_journal_id TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'posted', -- 'draft' | 'posted' | 'void'

  -- Audit
  created_at INTEGER NOT NULL,
  created_by TEXT,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_sje_order ON sales_journal_entries(order_id);
CREATE INDEX idx_sje_date ON sales_journal_entries(transaction_date);
CREATE INDEX idx_sje_customer ON sales_journal_entries(customer_id);
```

---

## UI Mockup

### Sales Journal Entry Form (Manual Entry)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  💰 Sales Journal Entry                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Transaction Date *         Customer                                         │
│  ┌────────────────────┐     ┌─────────────────────────────────────────────┐ │
│  │ 📅 15/01/2025      │     │ 🔍 Search customer...                       │ │
│  └────────────────────┘     └─────────────────────────────────────────────┘ │
│                                                                              │
│  Sale Type *                Payment Method *                                 │
│  ┌────────────────────┐     ┌─────────────────────────────────────────────┐ │
│  │ ▼ Credit Sale      │     │ ▼ Credit Terms (Net 30)                     │ │
│  └────────────────────┘     └─────────────────────────────────────────────┘ │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│  Line Items                                                        [+ Add]   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Product         │  Qty  │ Unit Price │ Discount │ Subtotal  │ COGS    │ │
│  ├─────────────────┼───────┼────────────┼──────────┼───────────┼─────────┤ │
│  │ Indomie Goreng  │  100  │    3,500   │     0    │  350,000  │ 280,000 │ │
│  │ Teh Botol       │   50  │    5,000   │  5,000   │  245,000  │ 175,000 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│                                          Subtotal:        Rp    595,000     │
│                                          Discount:        Rp     (5,000)    │
│                                          DPP:             Rp    590,000     │
│                                          PPn (11%):       Rp     64,900     │
│                                          ────────────────────────────────   │
│                                          Grand Total:     Rp    654,900     │
│                                                                              │
│                                          Total COGS:      Rp    455,000     │
│                                          Gross Profit:    Rp    135,000     │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│  Preview Journal Entry                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Revenue Entry:                                                         │ │
│  │   DR 1110 Piutang Usaha              Rp    654,900                    │ │
│  │   CR 4010 Penjualan                              Rp    590,000        │ │
│  │   CR 2121 PPn Keluaran                           Rp     64,900        │ │
│  │                                                                        │ │
│  │ COGS Entry:                                                            │ │
│  │   DR 5010 HPP                        Rp    455,000                    │ │
│  │   CR 1210 Persediaan                             Rp    455,000        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Notes                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Wholesale order for Toko Makmur - Net 30 payment terms                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [Cancel]                                              [Save as Draft] [Post]│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Integration

### Automatic Journal Entry from Order Service

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ORDER-TO-JOURNAL AUTOMATION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ORDER SERVICE                                                               │
│       │                                                                      │
│       ├── 1. Order Created (PENDING)                                         │
│       │       └── No journal entry yet                                       │
│       │                                                                      │
│       ├── 2. Payment Received (PAID)                                         │
│       │       └── If prepaid: Record cash/bank receipt                       │
│       │                                                                      │
│       ├── 3. Good Issue (PROCESSING)                                         │
│       │       └── INVENTORY SERVICE creates COGS entry                       │
│       │                                                                      │
│       ├── 4. Order Shipped (SHIPPED)                                         │
│       │       └── No journal entry                                           │
│       │                                                                      │
│       └── 5. Order Delivered (DELIVERED)                                     │
│               │                                                              │
│               ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ACCOUNTING SERVICE                                                  │    │
│  │                                                                      │    │
│  │  Event: order.delivered                                              │    │
│  │       │                                                              │    │
│  │       └── Create Sales Revenue Journal Entry                         │    │
│  │           - DR Kas/Piutang (1xxx)                                    │    │
│  │           - CR Penjualan (4010)                                      │    │
│  │           - CR PPn Keluaran (2121) if applicable                     │    │
│  │                                                                      │    │
│  │  Note: COGS already recorded at Good Issue step                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Accounts Receivable Collection Entry](./ACCOUNTS_RECEIVABLE_COLLECTION_ENTRY.md) - Collecting customer payments
- [Good Receipt/Issue Workflow](../inventory/GOOD_RECEIPT_ISSUE_WORKFLOW.md) - Inventory movements that trigger COGS
- [Payment Method and Journal Entry Logic](./PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md) - Payment processing
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules

---

## Summary

| Sale Type | When Journal Created | DR Account | CR Account | Location | Channel |
|-----------|---------------------|------------|------------|----------|---------|
| Cash Sale (POS) | Immediately | Kas Laci POS (1012-1014) | Penjualan (4010) | Store | POS |
| QRIS Sale (POS) | At sale | Kas QRIS (1030) | Penjualan (4010) | Store | POS |
| EDC Sale (POS) | At sale | Kas EDC (1031) | Penjualan (4010) | Store | POS |
| Credit Sale (B2B) | At delivery | Piutang (1110) | Penjualan (4010) | Warehouse | B2B |
| GoFood Sale | At delivery | Piutang GoFood (1111) | Penjualan (4010) | Restaurant | GOFOOD |
| GrabFood Sale | At delivery | Piutang GrabFood (1112) | Penjualan (4010) | Restaurant | GRABFOOD |
| Website Sale | At payment | Kas Midtrans (1032) | Penjualan (4010) | Warehouse | WEBSITE |
| Mobile App Sale | At payment | Kas Midtrans (1032) | Penjualan (4010) | Warehouse | MOBILE_APP |
| Sales Return | At return | Retur Penjualan (4120) | Kas/Piutang | Original Location | - |

**COGS Recording:**
- Triggered by Good Issue event from Inventory Service
- Uses actual batch cost (FEFO method)
- DR HPP (5010), CR Persediaan (1210)

**Tax Handling:**
- PPn Keluaran (2121) - Output VAT liability
- Recorded when invoice issued to customer
- Rate: 11% (Indonesia)

**Location Tracking:**
- All journal lines include `warehouseId` for location-based reporting
- Enables P&L by Location, Sales by Location, Gross Margin by Location reports

---

## Sales Reports by Location

### Sales by Location Report Example

```
                    SALES BY LOCATION REPORT
                    Period: January 2025
────────────────────────────────────────────────────────────────────────
Location                    │ Gross Sales   │ Discounts   │ Net Sales
────────────────────────────┼───────────────┼─────────────┼────────────
Toko 1 - Kelapa Gading      │ Rp 150,000,000│ Rp 5,000,000│ Rp 145,000,000
Toko 2 - PIK                │ Rp 120,000,000│ Rp 3,500,000│ Rp 116,500,000
Toko 3 - Pondok Indah       │ Rp  80,000,000│ Rp 2,000,000│ Rp  78,000,000
Gudang Utama (B2B)          │ Rp 200,000,000│ Rp10,000,000│ Rp 190,000,000
Gudang Utama (Website)      │ Rp  50,000,000│ Rp 1,500,000│ Rp  48,500,000
Gudang Cabang Bandung (App) │ Rp  45,000,000│ Rp 1,000,000│ Rp  44,000,000
Restoran - Grand Indonesia  │ Rp  75,000,000│ Rp        0 │ Rp  75,000,000
────────────────────────────┼───────────────┼─────────────┼────────────
TOTAL                       │ Rp 720,000,000│ Rp23,000,000│ Rp 697,000,000
```

### Gross Margin by Location Report Example

```
                    GROSS MARGIN BY LOCATION
                    Period: January 2025
────────────────────────────────────────────────────────────────────────
Location                    │ Net Sales     │ COGS        │ Gross Margin │ %
────────────────────────────┼───────────────┼─────────────┼──────────────┼────
Toko 1 - Kelapa Gading      │ Rp 145,000,000│ Rp 98,000,000│ Rp 47,000,000│ 32.4%
Toko 2 - PIK                │ Rp 116,500,000│ Rp 78,500,000│ Rp 38,000,000│ 32.6%
Toko 3 - Pondok Indah       │ Rp  78,000,000│ Rp 54,000,000│ Rp 24,000,000│ 30.8%
Gudang Utama (B2B)          │ Rp 190,000,000│ Rp140,000,000│ Rp 50,000,000│ 26.3%
Gudang Utama (Website)      │ Rp  48,500,000│ Rp 32,000,000│ Rp 16,500,000│ 34.0%
Gudang Cabang Bandung (App) │ Rp  44,000,000│ Rp 29,000,000│ Rp 15,000,000│ 34.1%
Restoran - Grand Indonesia  │ Rp  75,000,000│ Rp 30,000,000│ Rp 45,000,000│ 60.0%
────────────────────────────┼───────────────┼─────────────┼──────────────┼────
TOTAL                       │ Rp 697,000,000│ Rp461,500,000│ Rp235,500,000│ 33.8%
```

### API Endpoints for Location Reports

```
# Sales summary by location
GET /api/accounting/reports/sales/by-location
    ?from=2025-01-01&to=2025-01-31

# Sales detail for specific location
GET /api/accounting/reports/sales/location/:warehouseId
    ?from=2025-01-01&to=2025-01-31

# Gross margin by location
GET /api/accounting/reports/gross-margin/by-location
    ?from=2025-01-01&to=2025-01-31

# P&L by location (includes expenses)
GET /api/accounting/reports/income-statement/by-location
    ?from=2025-01-01&to=2025-01-31
```
