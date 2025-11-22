# Payment Method and Journal Entry Logic

## Overview

This document explains how to determine the correct journal entry based on:
- **Sales Channel** (POS, Wholesale, Online)
- **Payment Method** (Cash, Credit, Card, Bank Transfer)
- **Payment Status** (Paid, Pending)

---

## 1. Payment Method Configuration

### Order/Sales Schema

```sql
-- Add to orders table (Order Service)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,

  -- Customer and Sales Info
  customer_id TEXT,
  sales_person_id TEXT,
  warehouse_id TEXT NOT NULL,

  -- Sales Channel
  source TEXT NOT NULL CHECK(source IN ('pos', 'wholesale', 'online', 'marketplace')),

  -- Payment Information
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK(payment_method IN ('cash', 'credit', 'card', 'bank_transfer', 'credit_term')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(payment_status IN ('paid', 'pending', 'partial', 'failed', 'refunded')),
  payment_term_days INTEGER DEFAULT 0, -- 0 = immediate, 30 = net 30, etc.

  -- Amounts
  subtotal REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,

  -- Timestamps
  order_date INTEGER NOT NULL,
  payment_date INTEGER, -- When payment was received
  due_date INTEGER, -- For credit terms

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## 2. Journal Entry Logic by Payment Method

### TypeScript Implementation

```typescript
/**
 * Determines the correct debit account based on payment method and status
 */
export function getDebitAccountForSale(
  paymentMethod: 'cash' | 'credit' | 'card' | 'bank_transfer' | 'credit_term',
  paymentStatus: 'paid' | 'pending' | 'partial',
  source: 'pos' | 'wholesale' | 'online'
): { accountId: string; accountCode: string; accountName: string } {

  // If payment is already received (paid status)
  if (paymentStatus === 'paid') {
    switch (paymentMethod) {
      case 'cash':
        return {
          accountId: 'acc-1000',
          accountCode: '1000',
          accountName: 'Cash'
        };

      case 'card':
      case 'bank_transfer':
        return {
          accountId: 'acc-1010',
          accountCode: '1010',
          accountName: 'Bank - Current Account'
        };

      case 'credit':
      case 'credit_term':
        // Even if marked "paid", credit means we received cash/bank payment
        return {
          accountId: 'acc-1000',
          accountCode: '1000',
          accountName: 'Cash'
        };

      default:
        return {
          accountId: 'acc-1000',
          accountCode: '1000',
          accountName: 'Cash'
        };
    }
  }

  // If payment is pending (not yet received)
  if (paymentStatus === 'pending') {
    // Use Accounts Receivable for credit sales
    return {
      accountId: 'acc-1200',
      accountCode: '1200',
      accountName: 'Accounts Receivable'
    };
  }

  // Partial payment
  if (paymentStatus === 'partial') {
    // For partial payments, we typically use A/R for the total
    // Then record separate cash receipt for the partial amount
    return {
      accountId: 'acc-1200',
      accountCode: '1200',
      accountName: 'Accounts Receivable'
    };
  }

  // Default fallback
  return {
    accountId: 'acc-1000',
    accountCode: '1000',
    accountName: 'Cash'
  };
}

/**
 * Determines the revenue account based on source
 */
export function getRevenueAccount(
  source: 'pos' | 'wholesale' | 'online' | 'marketplace'
): { accountId: string; accountCode: string; accountName: string } {
  switch (source) {
    case 'pos':
      return {
        accountId: 'acc-4010',
        accountCode: '4010',
        accountName: 'Product Sales - Retail'
      };

    case 'wholesale':
      return {
        accountId: 'acc-4020',
        accountCode: '4020',
        accountName: 'Product Sales - Wholesale'
      };

    case 'online':
    case 'marketplace':
      return {
        accountId: 'acc-4030',
        accountCode: '4030',
        accountName: 'Product Sales - Online'
      };

    default:
      return {
        accountId: 'acc-4010',
        accountCode: '4010',
        accountName: 'Product Sales - Retail'
      };
  }
}
```

---

## 3. Sales Scenarios and Journal Entries

### Scenario A: POS Sale (Immediate Cash Payment)

**Order Details:**
- Source: `pos`
- Payment Method: `cash`
- Payment Status: `paid`
- Amount: Rp 100,000
- Product Cost: Rp 60,000

**Journal Entry:**
```typescript
{
  entryDate: "2025-11-21",
  description: "POS Sale - Cash",
  reference: "ORDER-001",
  sourceService: "order-service",
  sourceReferenceId: "order-123",
  lines: [
    {
      accountId: "acc-1000",       // Cash ✅
      accountCode: "1000",
      direction: "Debit",
      amount: 100000,
      warehouseId: "WH-JKT-01",
      salesChannel: "POS",
      memo: "Cash sale"
    },
    {
      accountId: "acc-4010",       // Revenue - Retail
      accountCode: "4010",
      direction: "Credit",
      amount: 100000,
      warehouseId: "WH-JKT-01",
      salesChannel: "POS",
      memo: "Product sales"
    },
    {
      accountId: "acc-5010",       // COGS
      accountCode: "5010",
      direction: "Debit",
      amount: 60000,
      warehouseId: "WH-JKT-01",
      salesChannel: "POS",
      productId: "prod-123",
      memo: "Cost of goods sold"
    },
    {
      accountId: "acc-1010",       // Inventory
      accountCode: "1010",
      direction: "Credit",
      amount: 60000,
      warehouseId: "WH-JKT-01",
      productId: "prod-123",
      memo: "Inventory reduction"
    }
  ]
}
```

---

### Scenario B: Wholesale Sale - Cash Payment (Default)

**Order Details:**
- Source: `wholesale`
- Payment Method: `cash` ✅ (default for wholesale)
- Payment Status: `paid`
- Amount: Rp 500,000
- Product Cost: Rp 300,000

**Journal Entry:**
```typescript
{
  entryDate: "2025-11-21",
  description: "Wholesale Sale - Cash",
  reference: "ORDER-002",
  sourceService: "order-service",
  sourceReferenceId: "order-456",
  lines: [
    {
      accountId: "acc-1000",       // Cash ✅ (wholesale cash sale)
      accountCode: "1000",
      direction: "Debit",
      amount: 500000,
      warehouseId: "WH-JKT-01",
      salesChannel: "Wholesale",
      salesPersonId: "SP-001",     // Sales person tracking
      customerId: "CUST-123",
      memo: "Cash wholesale sale"
    },
    {
      accountId: "acc-4020",       // Revenue - Wholesale
      accountCode: "4020",
      direction: "Credit",
      amount: 500000,
      warehouseId: "WH-JKT-01",
      salesChannel: "Wholesale",
      salesPersonId: "SP-001",
      customerId: "CUST-123",
      memo: "Wholesale product sales"
    },
    // COGS entries...
  ]
}
```

---

### Scenario C: Wholesale Sale - Credit Terms (User Selected)

**Order Details:**
- Source: `wholesale`
- Payment Method: `credit_term` (user selected "Net 30")
- Payment Status: `pending` ⚠️
- Payment Term: 30 days
- Amount: Rp 500,000
- Product Cost: Rp 300,000

**Journal Entry 1 (At Sale Date):**
```typescript
{
  entryDate: "2025-11-21",
  description: "Wholesale Sale - Net 30",
  reference: "ORDER-003",
  sourceService: "order-service",
  sourceReferenceId: "order-789",
  lines: [
    {
      accountId: "acc-1200",       // Accounts Receivable ✅ (credit sale)
      accountCode: "1200",
      direction: "Debit",
      amount: 500000,
      warehouseId: "WH-JKT-01",
      salesChannel: "Wholesale",
      salesPersonId: "SP-001",
      customerId: "CUST-123",
      memo: "Wholesale sale - Net 30"
    },
    {
      accountId: "acc-4020",       // Revenue - Wholesale
      accountCode: "4020",
      direction: "Credit",
      amount: 500000,
      warehouseId: "WH-JKT-01",
      salesChannel: "Wholesale",
      salesPersonId: "SP-001",
      customerId: "CUST-123",
      memo: "Wholesale product sales"
    },
    // COGS entries...
  ]
}
```

**Journal Entry 2 (When Payment Received - 30 days later):**
```typescript
{
  entryDate: "2025-12-21",
  description: "Payment Received - ORDER-003",
  reference: "PAYMENT-003",
  sourceService: "payment-service",
  sourceReferenceId: "payment-999",
  lines: [
    {
      accountId: "acc-1000",       // Cash
      accountCode: "1000",
      direction: "Debit",
      amount: 500000,
      customerId: "CUST-123",
      memo: "Payment received from customer"
    },
    {
      accountId: "acc-1200",       // Accounts Receivable
      accountCode: "1200",
      direction: "Credit",
      amount: 500000,
      customerId: "CUST-123",
      memo: "Customer payment applied"
    }
  ]
}
```

---

### Scenario D: Wholesale Sale - Card Payment

**Order Details:**
- Source: `wholesale`
- Payment Method: `card` (user selected)
- Payment Status: `paid`
- Amount: Rp 500,000

**Journal Entry:**
```typescript
{
  entryDate: "2025-11-21",
  description: "Wholesale Sale - Card",
  reference: "ORDER-004",
  lines: [
    {
      accountId: "acc-1010",       // Bank - Current Account ✅
      accountCode: "1010",
      direction: "Debit",
      amount: 500000,
      warehouseId: "WH-JKT-01",
      salesChannel: "Wholesale",
      salesPersonId: "SP-001",
      memo: "Card payment"
    },
    {
      accountId: "acc-4020",       // Revenue - Wholesale
      accountCode: "4020",
      direction: "Credit",
      amount: 500000,
      warehouseId: "WH-JKT-01",
      salesChannel: "Wholesale",
      salesPersonId: "SP-001",
      memo: "Wholesale product sales"
    }
  ]
}
```

---

## 4. Frontend - Payment Method Selector

### Wholesale Order Form

```typescript
// In wholesale order form component
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash'); // Default: cash ✅
const [paymentTermDays, setPaymentTermDays] = useState(0);

<FormField>
  <Label>Payment Method</Label>
  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
    <SelectItem value="cash">Cash (Default)</SelectItem>
    <SelectItem value="card">Debit/Credit Card</SelectItem>
    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
    <SelectItem value="credit_term">Credit Terms (Net 30/60/90)</SelectItem>
  </Select>
</FormField>

{paymentMethod === 'credit_term' && (
  <FormField>
    <Label>Payment Terms</Label>
    <Select value={paymentTermDays.toString()} onValueChange={(v) => setPaymentTermDays(parseInt(v))}>
      <SelectItem value="0">Due on Receipt</SelectItem>
      <SelectItem value="7">Net 7 Days</SelectItem>
      <SelectItem value="15">Net 15 Days</SelectItem>
      <SelectItem value="30">Net 30 Days</SelectItem>
      <SelectItem value="60">Net 60 Days</SelectItem>
      <SelectItem value="90">Net 90 Days</SelectItem>
    </Select>
  </FormField>
)}
```

---

## 5. Summary: Decision Matrix

| Source     | Payment Method | Payment Status | Debit Account          | Revenue Account        |
|------------|----------------|----------------|------------------------|------------------------|
| POS        | cash           | paid           | **Cash (1000)**        | Retail Sales (4010)    |
| POS        | card           | paid           | **Bank (1010)**        | Retail Sales (4010)    |
| Wholesale  | cash (default) | paid           | **Cash (1000)** ✅      | Wholesale Sales (4020) |
| Wholesale  | card           | paid           | **Bank (1010)**        | Wholesale Sales (4020) |
| Wholesale  | credit_term    | pending        | **A/R (1200)** ⚠️      | Wholesale Sales (4020) |
| Online     | card           | paid           | **Bank (1010)**        | Online Sales (4030)    |
| Online     | bank_transfer  | paid           | **Bank (1010)**        | Online Sales (4030)    |

**Key Points:**
- ✅ **Wholesale default = Cash** (immediate payment)
- ⚠️ **User can select credit terms** (payment later → use A/R)
- 💳 **Card payments** → Bank account
- 💵 **Cash payments** → Cash account

---

## 6. GL Segment Usage Examples

### Track Sales by Warehouse
```sql
SELECT
  warehouse_id,
  SUM(amount) as total_sales
FROM journal_lines
WHERE account_id IN ('acc-4010', 'acc-4020', 'acc-4030')
  AND direction = 'Credit'
GROUP BY warehouse_id;
```

### Track Sales by Sales Person (Commission Report)
```sql
SELECT
  sales_person_id,
  sales_channel,
  SUM(amount) as total_sales
FROM journal_lines
WHERE account_id IN ('acc-4010', 'acc-4020', 'acc-4030')
  AND direction = 'Credit'
GROUP BY sales_person_id, sales_channel;
```

### Track Sales by Channel
```sql
SELECT
  sales_channel,
  SUM(amount) as total_sales
FROM journal_lines
WHERE account_id IN ('acc-4010', 'acc-4020', 'acc-4030')
  AND direction = 'Credit'
GROUP BY sales_channel;
```

### Multi-Dimensional: Warehouse + Channel + Sales Person
```sql
SELECT
  warehouse_id,
  sales_channel,
  sales_person_id,
  SUM(amount) as total_sales,
  COUNT(DISTINCT journal_entry_id) as transaction_count
FROM journal_lines
WHERE account_id IN ('acc-4010', 'acc-4020', 'acc-4030')
  AND direction = 'Credit'
  AND created_at >= strftime('%s', '2025-11-01')
  AND created_at < strftime('%s', '2025-12-01')
GROUP BY warehouse_id, sales_channel, sales_person_id
ORDER BY total_sales DESC;
```
