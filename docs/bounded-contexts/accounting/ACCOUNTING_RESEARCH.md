# Accounting System Research & Design

## Research Summary

Based on analysis of Xero, QuickBooks, and modern ERP systems, here are the key principles for building a robust accounting system:

## 1. Chart of Accounts (COA) Best Practices

### Account Structure
- **5 Main Types**: Assets, Liabilities, Equity, Revenue, Expenses
- **4-Digit Codes**: Flexible numbering system (e.g., 1000-1999 for Assets)
- **Hierarchical**: Support parent-child relationships for sub-accounts
- **Descriptive Names**: Clear, business-friendly naming

### Account Code Ranges (Xero Standard)
```
1000-1999: Assets
  1000-1099: Current Assets (Cash, Bank, Inventory)
  1100-1199: Fixed Assets (Equipment, Property)
  1200-1299: Non-current Assets

2000-2999: Liabilities
  2000-2099: Current Liabilities (Accounts Payable, Short-term Debt)
  2100-2199: Long-term Liabilities (Loans, Mortgages)

3000-3999: Equity
  3000-3099: Owner's Equity
  3100-3199: Retained Earnings

4000-4999: Revenue
  4000-4099: Sales Revenue
  4100-4199: Other Income

5000-5999: Cost of Goods Sold (COGS)

6000-7999: Expenses
  6000-6999: Operating Expenses
  7000-7999: Other Expenses
```

## 2. Double-Entry Bookkeeping

### Core Principles
1. **Every transaction affects at least 2 accounts**
2. **Debits must equal credits** (balanced equation)
3. **Immutable journal entries** (append-only, never edit)
4. **Accounting Equation**: Assets = Liabilities + Equity

### Normal Balances
- **Debit (+)**: Assets, Expenses
- **Credit (+)**: Liabilities, Equity, Revenue

### Database Design

**Core Tables:**
```
1. chart_of_accounts
   - Account definition and structure
   - Account type, code, name, parent

2. journal_entries
   - Transaction header
   - Date, description, reference number

3. journal_lines (postings)
   - Individual debits/credits
   - Links to account and journal entry
   - Amount and direction (debit/credit)

4. ledger (materialized view)
   - Running balances per account
   - Derived from journal entries
```

## 3. Journal Entry Design

### Two-Table Approach (Recommended)

**journal_entries** (header):
- id, date, description, reference, created_by, status

**journal_lines** (lines/postings):
- id, journal_entry_id, account_id, amount, direction (debit/credit)

**Benefits:**
- Supports multiple debits/credits per transaction
- Flexible for complex transactions
- Easy validation (sum of debits = sum of credits)

### Direction Field
```typescript
direction: 'debit' | 'credit'
// OR
direction: 1 (debit) | -1 (credit)
```

## 4. Ledger System

### General Ledger
- **Purpose**: Shows all transactions for each account
- **Components**: Opening balance + transactions + closing balance
- **Query**: Aggregate journal_lines by account_id

### Sub-Ledgers
- **Accounts Receivable**: Customer transactions
- **Accounts Payable**: Vendor transactions
- **Inventory**: Product movements

## 5. Financial Statements

### Income Statement (P&L)
```
Revenue (4000-4999)
- COGS (5000-5999)
= Gross Profit

- Operating Expenses (6000-7999)
= Net Income
```

**Query Logic:**
```sql
SELECT
  account_type,
  SUM(CASE WHEN direction = 'credit' THEN amount
           ELSE -amount END) as balance
FROM journal_lines
JOIN chart_of_accounts ON account_id = id
WHERE date BETWEEN start_date AND end_date
  AND account_type IN ('Revenue', 'COGS', 'Expense')
GROUP BY account_type
```

### Balance Sheet
```
Assets (1000-1999)
= Liabilities (2000-2999) + Equity (3000-3999)
```

**Query Logic:**
```sql
SELECT
  account_type,
  SUM(CASE WHEN direction = 'debit' THEN amount
           ELSE -amount END) as balance
FROM journal_lines
JOIN chart_of_accounts ON account_id = id
WHERE date <= as_of_date
  AND account_type IN ('Asset', 'Liability', 'Equity')
GROUP BY account_type
```

### Cash Flow Statement
- Operating Activities
- Investing Activities
- Financing Activities

## 6. Key Features to Implement

### Phase 1: Foundation
- [x] Chart of Accounts CRUD
- [x] Journal Entry creation
- [x] Basic validation (debits = credits)
- [x] General Ledger view

### Phase 2: Reports
- [x] Income Statement
- [x] Balance Sheet
- [x] Trial Balance
- [x] Cash Flow Statement (Indirect Method)

### Phase 3: Advanced
- [ ] Multi-currency support
- [x] Fiscal year/period management
- [x] Account reconciliation (Bank, AR, AP, Inventory)
- [ ] Budget vs Actual
- [ ] Inter-company transactions

## 7. Data Integrity Rules

### Validation Rules
1. **Balanced Entries**: Sum(debits) = Sum(credits)
2. **No Negative Amounts**: All amounts must be positive
3. **Valid Account**: Account must exist and be active
4. **Date Range**: Transaction date within valid fiscal period
5. **Immutability**: Posted entries cannot be deleted (only reversed)

### Account Rules
1. **Detail vs Header**: Only detail accounts can have transactions
2. **Active Status**: Inactive accounts cannot receive new transactions
3. **System Accounts**: Certain accounts (Retained Earnings) are system-managed

## 8. Implementation Checklist

### Backend
- [ ] Database schema with proper indexes
- [ ] API endpoints for CRUD operations
- [ ] Transaction validation logic
- [ ] Report generation queries
- [ ] Audit trail logging

### Frontend
- [ ] Chart of Accounts management
- [ ] Journal Entry form (with auto-balancing)
- [ ] Ledger viewer with filters
- [ ] Financial statement dashboards
- [ ] Export to CSV/PDF

## 9. References

- [Xero Chart of Accounts](https://www.xero.com/us/guides/how-to-do-bookkeeping/chart-of-accounts/)
- [Double-Entry Bookkeeping for Engineers](https://www.balanced.software/double-entry-bookkeeping-for-programmers/)
- [Square's Books Service](https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service/)
- [Database Schema Design](https://blog.journalize.io/posts/an-elegant-db-schema-for-double-entry-accounting/)

---

**Next Steps**: Implement the schema and API based on this research
