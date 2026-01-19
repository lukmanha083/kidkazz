# Bank Reconciliation Journal Entry

## Overview

Bank reconciliation is the process of matching the bank statement balance with the company's book balance. This document describes the journal entries that arise from reconciling bank accounts, handling discrepancies, and adjusting for items not yet recorded.

## Business Context

### Bank Statement Data Sources

Kidkazz supports two methods to obtain bank statement data for reconciliation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BANK STATEMENT DATA SOURCES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  METHOD 1: DIRECT BANK API                 METHOD 2: PDF UPLOAD + AI        │
│  (Recommended)                             (Reducto.ai Extraction)          │
│  ──────────────────────────                ─────────────────────────        │
│                                                                              │
│  • Direct REST API connection              • Upload PDF bank statement      │
│  • Real-time transaction fetch             • AI extracts transactions       │
│  • Automatic daily sync                    • Works with any bank format     │
│  • Supported banks:                        • Handles scanned documents      │
│    - BCA (KlikBCA Bisnis API)                                               │
│    - BRI (BRIAPI)                          Process:                         │
│    - CIMB Niaga (API Banking)              1. Upload PDF → Reducto.ai       │
│    - Mandiri (Mandiri API)                 2. AI extracts table data        │
│                                            3. Parse to transactions         │
│  Best for:                                 4. Auto-match with GL            │
│  • High transaction volume                                                  │
│  • Real-time cash visibility               Best for:                        │
│  • Automated reconciliation                • Banks without API access       │
│                                            • Historical statements          │
│                                            • One-time reconciliations       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Bank Reconciliation?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BANK RECONCILIATION PURPOSE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COMPANY BOOKS (GL Balance)          BANK STATEMENT                          │
│  ─────────────────────────          ──────────────                           │
│                                                                              │
│  What we THINK we have              What bank SAYS we have                   │
│  • Our recorded transactions        • Actual bank transactions               │
│  • May have timing differences      • May include fees we didn't know        │
│  • May have errors                  • May include interest earned            │
│                                                                              │
│                         RECONCILIATION                                       │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  GOAL: Make both balances agree after adjustments                   │    │
│  │                                                                      │    │
│  │  Book Balance + Adjustments = Bank Balance + Adjustments            │    │
│  │                                                                      │    │
│  │  • Find errors and discrepancies                                    │    │
│  │  • Record missing transactions (fees, interest)                     │    │
│  │  • Identify outstanding items (uncleared checks, deposits in transit)│    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Reconciliation Timing

| Frequency | Recommended For |
|-----------|----------------|
| Daily | High-volume businesses, multiple bank accounts |
| Weekly | Medium-volume businesses |
| Monthly | Small businesses (minimum recommended) |

---

## Idempotent Processing & Duplicate Detection

### The Problem

Bank reconciliation doesn't always happen at month-end, especially with manual PDF uploads:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OVERLAPPING STATEMENT SCENARIO                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  JANUARY 2026                                                                │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Upload #1 (Jan 10):  Statement Jan 1-10                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Jan 02: TRSF CR TOKO ABC        +5,000,000  → Reconciled ✓            │ │
│  │ Jan 03: BIAYA ADM                  -15,000  → Reconciled ✓            │ │
│  │ Jan 05: TRSF DB PT SUPPLIER    -10,000,000  → Reconciled ✓            │ │
│  │ Jan 08: BUNGA KMK               -3,958,333  → Reconciled ✓            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Upload #2 (Jan 20):  Statement Jan 1-20                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Jan 02: TRSF CR TOKO ABC        +5,000,000  → DUPLICATE (skip)        │ │
│  │ Jan 03: BIAYA ADM                  -15,000  → DUPLICATE (skip)        │ │
│  │ Jan 05: TRSF DB PT SUPPLIER    -10,000,000  → DUPLICATE (skip)        │ │
│  │ Jan 08: BUNGA KMK               -3,958,333  → DUPLICATE (skip)        │ │
│  │ Jan 12: PLN PREPAID             -2,450,000  → NEW ✓                   │ │
│  │ Jan 15: TRSF CR CV BERKAH       +8,000,000  → NEW ✓                   │ │
│  │ Jan 18: BIAYA TRANSFER             -6,500  → NEW ✓                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Upload #3 (Feb 1):  Statement Jan 1-31                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Jan 02-18: (8 transactions)                 → ALL DUPLICATE (skip)    │ │
│  │ Jan 22: GAJI KARYAWAN          -45,000,000  → NEW ✓                   │ │
│  │ Jan 25: TRSF CR TOKO XYZ       +12,000,000  → NEW ✓                   │ │
│  │ Jan 28: ASURANSI KENDARAAN      -1,500,000  → NEW ✓                   │ │
│  │ Jan 31: JASA GIRO                 +125,000  → NEW ✓                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  RESULT: System processes ONLY new transactions, never creates duplicates   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Solution: Transaction Fingerprinting

Each bank transaction gets a unique fingerprint based on:
- Bank account number
- Transaction date
- Amount (exact)
- Reference number (if available)
- Description hash (normalized)

```typescript
interface BankTransactionFingerprint {
  bankAccountId: string;
  transactionDate: string;      // YYYY-MM-DD
  amount: number;               // Exact amount with sign
  reference?: string;           // Bank reference number
  descriptionHash: string;      // Normalized description hash
  fingerprint: string;          // Combined unique identifier
}

/**
 * Generate unique fingerprint for a bank transaction
 */
function generateTransactionFingerprint(
  bankAccountId: string,
  transaction: BankStatementLine
): string {

  // Normalize description (remove variable parts like time, sequence numbers)
  const normalizedDesc = normalizeDescription(transaction.description);
  const descHash = hashString(normalizedDesc);

  // Create fingerprint components
  const components = [
    bankAccountId,
    transaction.date,                    // YYYY-MM-DD
    transaction.amount.toFixed(2),       // Exact amount
    transaction.reference || '',         // Bank reference if available
    descHash.substring(0, 8)             // First 8 chars of desc hash
  ];

  // Generate final fingerprint
  return hashString(components.join('|'));
}

/**
 * Normalize description to handle minor variations
 */
function normalizeDescription(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\d{2}:\d{2}:\d{2}/g, '')  // Remove time stamps
    .replace(/SEQ:\d+/g, '')        // Remove sequence numbers
    .replace(/REF:\d+/g, '')        // Remove reference prefixes
    .trim();
}

// Example fingerprints:
// "acc_1020|2026-01-02|5000000.00|2601020001234|a3f8b2c1"
// "acc_1020|2026-01-03|-15000.00||8d2e4f6a"
```

### Cross-Source Compatibility (Source-Agnostic Algorithm)

The fingerprinting algorithm is **completely source-agnostic** - it works identically regardless of how the bank statement data is imported:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FINGERPRINT GENERATION BY SOURCE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Component         │ PDF (Reducto.ai) │ Bank API      │ CSV Upload         │
│  ──────────────────┼──────────────────┼───────────────┼──────────────────── │
│  bankAccountId     │ User selection   │ API account   │ File header/       │
│                    │                  │ identifier    │ user selection     │
│  transactionDate   │ Extracted text   │ response.date │ Parsed column      │
│  amount            │ Extracted number │ response.amt  │ Parsed column      │
│  reference         │ Extracted ref    │ response.ref  │ Parsed column      │
│  descriptionHash   │ Extracted desc   │ response.desc │ Parsed column      │
│                                                                              │
│  RESULT: Same fingerprint regardless of source!                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why it works across all sources:**

```typescript
// The fingerprint is generated from TRANSACTION ATTRIBUTES only
// NOT from the import method or source

const fingerprint = hash([
  bankAccountId,           // Same account = same ID
  transaction.date,        // Same date = same string
  transaction.amount,      // Same amount = same number
  transaction.reference,   // Same ref = same string (or empty)
  hashDescription(desc)    // Same desc = same hash
].join('|'));

// The import_source field is stored ONLY for audit purposes
// It does NOT affect duplicate detection
```

**Real-World Scenario - Mixed Source Imports:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MIXED SOURCE IMPORT EXAMPLE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Day 1: Import via Bank API (Jan 1-10)                                       │
│  ├── Jan 02: TRSF CR TOKO ABC    +5,000,000  [fingerprint: abc123]          │
│  ├── Jan 05: BUNGA KMK           -3,958,333  [fingerprint: def456]          │
│  └── Stored with import_source = 'API'                                       │
│                                                                              │
│  Day 5: User uploads PDF (Jan 1-15) - overlapping!                           │
│  ├── Jan 02: TRSF CR TOKO ABC    +5,000,000  [fingerprint: abc123] → SKIP!  │
│  ├── Jan 05: BUNGA KMK           -3,958,333  [fingerprint: def456] → SKIP!  │
│  ├── Jan 12: PLN PREPAID         -2,450,000  [fingerprint: ghi789] → NEW    │
│  └── Stored with import_source = 'PDF'                                       │
│                                                                              │
│  Day 10: Import via Bank API (Jan 1-20) - API has pagination overlap         │
│  ├── Jan 02-12: (all transactions)           → ALL DUPLICATE (skip)          │
│  ├── Jan 18: BIAYA ADM              -15,000  [fingerprint: jkl012] → NEW    │
│  └── Stored with import_source = 'API'                                       │
│                                                                              │
│  RESULT: No duplicates created, regardless of source mixing!                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Important Notes for Bank API:**
1. Bank APIs often return overlapping date ranges (pagination edge cases)
2. Some banks include transactions from the previous business day
3. The fingerprint algorithm handles all these scenarios automatically
4. Even if the same transaction is fetched multiple times, it's only processed once

**import_source Field Usage:**

| Value | Purpose | Example |
|-------|---------|---------|
| `'API'` | Direct bank API integration | BCA, BRI, Mandiri API |
| `'PDF'` | PDF upload with Reducto.ai | Manual PDF statement upload |
| `'CSV'` | CSV file upload | Bank export in CSV format |

The `import_source` field is used for:
- **Audit trail**: Know where each transaction came from
- **Debugging**: Identify issues with specific import methods
- **Analytics**: Track which import method is most common
- **NOT for duplicate detection**: Duplicates are detected by fingerprint only

### Database Schema for Duplicate Tracking

```sql
-- Store all processed bank statement lines with their fingerprints
CREATE TABLE bank_statement_lines (
  id TEXT PRIMARY KEY,

  -- Bank account
  bank_account_id TEXT NOT NULL,

  -- Transaction details
  transaction_date TEXT NOT NULL,
  value_date TEXT,
  description TEXT NOT NULL,
  reference TEXT,
  amount INTEGER NOT NULL,  -- In cents/smallest unit
  balance_after INTEGER,

  -- Fingerprint for duplicate detection
  fingerprint TEXT NOT NULL,
  fingerprint_components TEXT,  -- JSON of components used

  -- Import tracking
  import_id TEXT NOT NULL,
  import_source TEXT NOT NULL,  -- 'PDF' | 'API' | 'CSV'
  import_date INTEGER NOT NULL,
  statement_period_start TEXT,
  statement_period_end TEXT,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'matched' | 'categorized' | 'skipped' | 'duplicate'

  -- Matching results
  match_type TEXT,
  match_confidence INTEGER,
  matched_journal_entry_id TEXT,
  matched_module TEXT,

  -- For duplicates
  duplicate_of_id TEXT,  -- Reference to original transaction

  -- Audit
  created_at INTEGER NOT NULL,
  processed_at INTEGER,
  processed_by TEXT
);

-- Index for fast duplicate lookup
CREATE UNIQUE INDEX idx_bsl_fingerprint
  ON bank_statement_lines(bank_account_id, fingerprint);

CREATE INDEX idx_bsl_date
  ON bank_statement_lines(bank_account_id, transaction_date);

CREATE INDEX idx_bsl_status
  ON bank_statement_lines(status);
```

### Import Process with Duplicate Detection

```typescript
interface ImportResult {
  importId: string;
  totalLines: number;
  newTransactions: number;
  duplicateTransactions: number;
  transactions: {
    new: BankStatementLine[];
    duplicates: DuplicateInfo[];
  };
}

interface DuplicateInfo {
  currentLine: BankStatementLine;
  originalLine: {
    id: string;
    importId: string;
    importDate: string;
    status: string;
    journalEntryId?: string;
  };
}

/**
 * Import bank statement with idempotent duplicate handling
 */
async function importBankStatement(
  bankAccountId: string,
  transactions: BankStatementLine[],
  importSource: 'PDF' | 'API' | 'CSV'
): Promise<ImportResult> {

  const importId = generateId();
  const newTransactions: BankStatementLine[] = [];
  const duplicates: DuplicateInfo[] = [];

  for (const txn of transactions) {
    // Generate fingerprint
    const fingerprint = generateTransactionFingerprint(bankAccountId, txn);

    // Check for existing transaction with same fingerprint
    const existing = await db.query.bankStatementLines.findFirst({
      where: and(
        eq(bankStatementLines.bankAccountId, bankAccountId),
        eq(bankStatementLines.fingerprint, fingerprint)
      )
    });

    if (existing) {
      // DUPLICATE - Skip but record for reporting
      duplicates.push({
        currentLine: txn,
        originalLine: {
          id: existing.id,
          importId: existing.importId,
          importDate: new Date(existing.importDate).toISOString(),
          status: existing.status,
          journalEntryId: existing.matchedJournalEntryId
        }
      });

      // Insert with duplicate status (for audit trail)
      await db.insert(bankStatementLines).values({
        id: generateId(),
        bankAccountId,
        transactionDate: txn.date,
        description: txn.description,
        reference: txn.reference,
        amount: txn.amount,
        fingerprint,
        importId,
        importSource,
        importDate: Date.now(),
        status: 'duplicate',
        duplicateOfId: existing.id,
        createdAt: Date.now()
      });

    } else {
      // NEW TRANSACTION - Add for processing
      const lineId = generateId();

      await db.insert(bankStatementLines).values({
        id: lineId,
        bankAccountId,
        transactionDate: txn.date,
        description: txn.description,
        reference: txn.reference,
        amount: txn.amount,
        fingerprint,
        importId,
        importSource,
        importDate: Date.now(),
        status: 'pending',
        createdAt: Date.now()
      });

      newTransactions.push({ ...txn, id: lineId });
    }
  }

  return {
    importId,
    totalLines: transactions.length,
    newTransactions: newTransactions.length,
    duplicateTransactions: duplicates.length,
    transactions: {
      new: newTransactions,
      duplicates
    }
  };
}
```

### Import Result UI

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📄 Import Complete - Bank Statement                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bank Account: BCA - Operasional (1020)                                      │
│  Statement Period: January 1-31, 2026                                        │
│  Import Method: PDF Upload (Reducto.ai)                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ IMPORT SUMMARY                                                           ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Total Transactions in Statement:          45                            ││
│  │                                                                          ││
│  │  ✅ New Transactions:                       12    [Process These →]      ││
│  │     Ready for matching and categorization                                ││
│  │                                                                          ││
│  │  ⏭️ Duplicate Transactions:                 33    [View Details]         ││
│  │     Already imported in previous uploads                                 ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ ✅ NEW TRANSACTIONS (12)                                                 ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Date       │ Description                    │ Amount       │ Status     ││
│  │  ───────────┼────────────────────────────────┼──────────────┼─────────── ││
│  │  22/01/2026 │ GAJI KARYAWAN                  │ -45,000,000  │ 🆕 New     ││
│  │  25/01/2026 │ TRSF CR TOKO XYZ               │ +12,000,000  │ 🆕 New     ││
│  │  28/01/2026 │ ASURANSI KENDARAAN             │  -1,500,000  │ 🆕 New     ││
│  │  31/01/2026 │ JASA GIRO                      │    +125,000  │ 🆕 New     ││
│  │  ...        │ ...                            │ ...          │ ...        ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ ⏭️ DUPLICATE TRANSACTIONS (33) - Skipped                                 ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  These transactions were already imported and processed:                 ││
│  │                                                                          ││
│  │  Date       │ Description           │ Amount      │ Previously Imported  ││
│  │  ───────────┼───────────────────────┼─────────────┼───────────────────── ││
│  │  02/01/2026 │ TRSF CR TOKO ABC      │ +5,000,000  │ Jan 10 (Matched ✓)  ││
│  │  03/01/2026 │ BIAYA ADM             │    -15,000  │ Jan 10 (Matched ✓)  ││
│  │  05/01/2026 │ TRSF DB PT SUPPLIER   │-10,000,000  │ Jan 10 (Matched ✓)  ││
│  │  08/01/2026 │ BUNGA KMK             │ -3,958,333  │ Jan 10 (Matched ✓)  ││
│  │  ...        │ ...                   │ ...         │ ...                  ││
│  │                                                                          ││
│  │  [Expand All]                                                            ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ ℹ️ Why are some transactions skipped?                                    ││
│  │                                                                          ││
│  │ Your statement (Jan 1-31) overlaps with previously imported statements:  ││
│  │ • Jan 10: Imported Jan 1-10 (10 transactions)                            ││
│  │ • Jan 20: Imported Jan 1-20 (23 transactions)                            ││
│  │                                                                          ││
│  │ The system automatically detects duplicates to prevent double entries.   ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [Cancel]                              [Process 12 New Transactions →]       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Handling Edge Cases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EDGE CASES & HANDLING                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SAME AMOUNT, SAME DATE, DIFFERENT TRANSACTIONS                           │
│     ─────────────────────────────────────────────────────────────────────   │
│     Problem: Two genuine transfers of Rp 1,000,000 on same day               │
│     Solution: Include reference number and description in fingerprint        │
│                                                                              │
│     Jan 15: TRSF CR TOKO A REF:001  +1,000,000 → Fingerprint: abc123        │
│     Jan 15: TRSF CR TOKO B REF:002  +1,000,000 → Fingerprint: def456        │
│                                                                              │
│  2. DESCRIPTION VARIATIONS                                                   │
│     ─────────────────────────────────────────────────────────────────────   │
│     Problem: Bank adds timestamps or sequence numbers                        │
│     Solution: Normalize description before hashing                           │
│                                                                              │
│     "BIAYA ADM 10:30:45"     → Normalized: "BIAYA ADM"                       │
│     "BIAYA ADM SEQ:00123"    → Normalized: "BIAYA ADM"                       │
│                                                                              │
│  3. BANK API VS PDF DIFFERENCES                                              │
│     ─────────────────────────────────────────────────────────────────────   │
│     Problem: API and PDF may format same transaction differently             │
│     Solution: Primary match on date + amount + reference                     │
│               Secondary match on normalized description                      │
│                                                                              │
│  4. REVERSED/CORRECTED TRANSACTIONS                                          │
│     ─────────────────────────────────────────────────────────────────────   │
│     Problem: Bank reverses a transaction (different fingerprint)             │
│     Solution: Both original and reversal are valid, process both             │
│                                                                              │
│     Jan 15: TRSF DB ERROR    -5,000,000  → Process ✓                        │
│     Jan 16: REVERSAL TRSF    +5,000,000  → Process ✓ (different txn)        │
│                                                                              │
│  5. MANUAL RE-IMPORT REQUEST                                                 │
│     ─────────────────────────────────────────────────────────────────────   │
│     Problem: User wants to re-process a previously skipped transaction       │
│     Solution: Admin can "unlock" specific transactions for re-processing     │
│                                                                              │
│     [Force Re-process] button available for admin users                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Reconciliation Period Flexibility

Unlike strict month-end reconciliation, the system supports flexible periods:

```typescript
interface ReconciliationPeriod {
  bankAccountId: string;
  periodStart: string;      // Any date
  periodEnd: string;        // Any date
  statementBalance: number; // Balance at periodEnd

  // Track what's been reconciled
  reconciledTransactions: string[];  // Transaction fingerprints

  // Can overlap with other periods
  overlapsWith?: string[];  // Other reconciliation IDs
}

// Example: Multiple partial reconciliations in January
const janReconciliations = [
  {
    id: "recon_jan_1",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-10",
    statementBalance: 105000000,
    reconciledTransactions: ["fp_001", "fp_002", "fp_003", "fp_004"]
  },
  {
    id: "recon_jan_2",
    periodStart: "2026-01-11",
    periodEnd: "2026-01-20",
    statementBalance: 115000000,
    reconciledTransactions: ["fp_005", "fp_006", "fp_007"]
  },
  {
    id: "recon_jan_3",
    periodStart: "2026-01-21",
    periodEnd: "2026-01-31",
    statementBalance: 125750000,
    reconciledTransactions: ["fp_008", "fp_009", "fp_010", "fp_011"]
  }
];

// System can also generate a consolidated month-end view
// by combining all partial reconciliations
```

---

## Types of Reconciling Items

### Items That Require Journal Entries (Book Adjustments)

These are transactions that appear on the bank statement but not in your books:

| Item | Description | Journal Entry Needed |
|------|-------------|---------------------|
| **Bank Service Charges** | Monthly fees, wire fees, check fees | DR Expense, CR Bank |
| **Bank Interest Earned** | Interest on deposit account | DR Bank, CR Interest Income |
| **NSF Checks** | Customer's bounced checks | DR A/R, CR Bank |
| **Direct Debits** | Auto-payments we forgot to record | DR Expense/A/P, CR Bank |
| **Direct Deposits** | Auto-receipts we forgot to record | DR Bank, CR A/R/Income |
| **Bank Errors (in our favor)** | Bank credited us wrongly | DR Bank, CR Suspense |
| **Bank Errors (against us)** | Bank debited us wrongly | DR Suspense, CR Bank |
| **Recording Errors** | We recorded wrong amount | Correcting entry |

### Items That Do NOT Require Journal Entries (Bank Adjustments)

These are timing differences - the bank will catch up:

| Item | Description | Action |
|------|-------------|--------|
| **Outstanding Checks** | Checks we issued but not yet cashed | Note only (will clear later) |
| **Deposits in Transit** | Deposits made but not yet processed | Note only (will clear later) |
| **Bank Errors** | Bank will correct on next statement | Note only (bank will fix) |

---

## Chart of Accounts Reference

### Bank Accounts (1xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **1020** | Bank BCA | BCA Main Account |
| **1021** | Bank Mandiri | Mandiri Account |
| **1022** | Bank BRI | BRI Account |
| **1023** | Bank CIMB Niaga | CIMB Niaga Account |
| **1024** | Bank Permata | Permata Account |
| **1025** | Bank Central Asia (USD) | BCA USD Account |

### Revenue Accounts (4xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **4210** | Pendapatan Bunga Bank | Bank Interest Income |

### Expense Accounts (6xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **6510** | Biaya Administrasi Bank | Bank Service Charges |
| **6511** | Biaya Transfer Bank | Bank Transfer Fees |
| **6512** | Biaya Buku Cek | Checkbook Fees |
| **6513** | Biaya RTGS/SKN | RTGS/SKN Transfer Fees |
| **6514** | Biaya Swift | Swift Transfer Fees |

### Other Accounts

| Code | Account Name | Description |
|------|-------------|-------------|
| **1110** | Piutang Usaha | Accounts Receivable (for NSF checks) |
| **1199** | Suspense Account | Temporary holding for unidentified items |
| **6810** | Beban Piutang Tak Tertagih | Bad Debt Expense |

---

## Journal Entry Patterns

### 1. Bank Service Charges

**Scenario:** Bank charges monthly admin fee Rp 15,000 and transfer fee Rp 6,500.

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 6510 - Biaya Administrasi Bank | Rp 15,000 | |
| 2025-01-31 | 6511 - Biaya Transfer Bank | Rp 6,500 | |
| 2025-01-31 | 1020 - Bank BCA | | Rp 21,500 |

---

### 2. Bank Interest Earned

**Scenario:** Bank pays interest Rp 125,000 on savings account.

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 1020 - Bank BCA | Rp 125,000 | |
| 2025-01-31 | 4210 - Pendapatan Bunga Bank | | Rp 125,000 |

---

### 3. NSF Check (Bounced Check)

**Scenario:** Customer's check for Rp 2,500,000 bounced. Bank also charges NSF fee Rp 50,000.

**Step 1: Reverse the original deposit (reinstate A/R)**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 1110 - Piutang Usaha | Rp 2,500,000 | |
| 2025-01-31 | 1020 - Bank BCA | | Rp 2,500,000 |

**Step 2: Record NSF fee (bill customer or absorb)**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 1110 - Piutang Usaha | Rp 50,000 | |
| 2025-01-31 | 1020 - Bank BCA | | Rp 50,000 |

**Or absorb the fee as expense:**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 6510 - Biaya Administrasi Bank | Rp 50,000 | |
| 2025-01-31 | 1020 - Bank BCA | | Rp 50,000 |

---

### 4. Direct Debit (Auto-Payment Not Recorded)

**Scenario:** Insurance premium Rp 500,000 auto-debited but not recorded in books.

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-15 | 1340 - Asuransi Dibayar di Muka | Rp 500,000 | |
| 2025-01-15 | 1020 - Bank BCA | | Rp 500,000 |

---

### 5. Direct Deposit (Auto-Receipt Not Recorded)

**Scenario:** Customer paid via bank transfer Rp 3,000,000 but we didn't record it.

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-20 | 1020 - Bank BCA | Rp 3,000,000 | |
| 2025-01-20 | 1110 - Piutang Usaha | | Rp 3,000,000 |

---

### 6. Recording Error Correction

**Scenario:** We recorded a check for Rp 1,250,000 but actually wrote it for Rp 1,520,000.

**Correcting Entry (record the difference):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | [Original Expense Account] | Rp 270,000 | |
| 2025-01-31 | 1020 - Bank BCA | | Rp 270,000 |

---

### 7. Unidentified Bank Credit

**Scenario:** Bank shows deposit of Rp 750,000 but we can't identify the source.

**Temporary entry (to suspense):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 1020 - Bank BCA | Rp 750,000 | |
| 2025-01-31 | 1199 - Suspense Account | | Rp 750,000 |

**When identified (e.g., customer payment):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-02-05 | 1199 - Suspense Account | Rp 750,000 | |
| 2025-02-05 | 1110 - Piutang Usaha | | Rp 750,000 |

---

### 8. Unidentified Bank Debit

**Scenario:** Bank shows debit of Rp 100,000 we can't identify.

**Temporary entry (to suspense):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 1199 - Suspense Account | Rp 100,000 | |
| 2025-01-31 | 1020 - Bank BCA | | Rp 100,000 |

**When identified (e.g., bank fee):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-02-05 | 6510 - Biaya Administrasi Bank | Rp 100,000 | |
| 2025-02-05 | 1199 - Suspense Account | | Rp 100,000 |

---

### 9. Foreign Currency Exchange Gain/Loss

**Scenario:** USD bank account - book shows USD 1,000 at Rp 15,500/USD = Rp 15,500,000.
Bank statement shows Rp 15,700,000 due to exchange rate movement.

**Exchange Gain:**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 1025 - Bank BCA (USD) | Rp 200,000 | |
| 2025-01-31 | 7030 - Keuntungan Selisih Kurs | | Rp 200,000 |

**Exchange Loss (opposite scenario):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 7130 - Kerugian Selisih Kurs | Rp 200,000 | |
| 2025-01-31 | 1025 - Bank BCA (USD) | | Rp 200,000 |

---

## Bank Reconciliation Process

### Step-by-Step Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BANK RECONCILIATION WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. GATHER DOCUMENTS                                                         │
│     • Bank statement (PDF or import)                                         │
│     • GL balance for bank account                                            │
│     • Previous reconciliation (outstanding items)                            │
│                                                                              │
│  2. COMPARE DEPOSITS                                                         │
│     • Match bank deposits with GL receipts                                   │
│     • Identify deposits in transit                                           │
│     • Identify unrecorded receipts                                           │
│                                                                              │
│  3. COMPARE WITHDRAWALS                                                      │
│     • Match bank debits with GL payments                                     │
│     • Identify outstanding checks                                            │
│     • Identify unrecorded payments (fees, auto-debits)                       │
│                                                                              │
│  4. IDENTIFY DIFFERENCES                                                     │
│     • Bank charges not in books                                              │
│     • Interest not in books                                                  │
│     • NSF checks                                                             │
│     • Recording errors                                                       │
│     • Unidentified items                                                     │
│                                                                              │
│  5. CREATE JOURNAL ENTRIES                                                   │
│     • Book adjustments for items in bank not in books                        │
│     • Correction entries for errors                                          │
│                                                                              │
│  6. PREPARE RECONCILIATION REPORT                                            │
│     • Starting bank balance                                                  │
│     • Add: Deposits in transit                                               │
│     • Less: Outstanding checks                                               │
│     • = Adjusted bank balance                                                │
│     •                                                                        │
│     • Starting book balance                                                  │
│     • Add: Bank credits not in books                                         │
│     • Less: Bank debits not in books                                         │
│     • = Adjusted book balance                                                │
│     •                                                                        │
│     • MUST MATCH!                                                            │
│                                                                              │
│  7. APPROVE & CLOSE                                                          │
│     • Supervisor review                                                      │
│     • Mark reconciliation complete                                           │
│     • Archive documentation                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### 1. Create Bank Reconciliation

```
POST /api/accounting/bank-reconciliations
```

**Request Body:**
```json
{
  "bankAccountId": "1020",
  "bankAccountName": "Bank BCA",
  "statementDate": "2025-01-31",
  "statementEndingBalance": 125750000,
  "bookEndingBalance": 123500000,
  "outstandingChecks": [
    {
      "checkNumber": "CHK-001234",
      "date": "2025-01-28",
      "payee": "PT Supplier Jaya",
      "amount": 5000000
    },
    {
      "checkNumber": "CHK-001235",
      "date": "2025-01-30",
      "payee": "PT Vendor Makmur",
      "amount": 2500000
    }
  ],
  "depositsInTransit": [
    {
      "date": "2025-01-31",
      "description": "Customer payment - Toko ABC",
      "amount": 3500000
    }
  ],
  "bankAdjustments": [
    {
      "type": "service_charge",
      "date": "2025-01-31",
      "description": "Monthly admin fee",
      "amount": -15000,
      "accountCode": "6510"
    },
    {
      "type": "interest_earned",
      "date": "2025-01-31",
      "description": "Interest income",
      "amount": 125000,
      "accountCode": "4210"
    },
    {
      "type": "nsf_check",
      "date": "2025-01-25",
      "description": "Bounced check - Customer XYZ",
      "amount": -2500000,
      "customerId": "cust_xyz",
      "accountCode": "1110"
    }
  ],
  "notes": "January 2025 reconciliation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reconciliationId": "recon_abc123",
    "status": "balanced",
    "adjustedBankBalance": 121750000,
    "adjustedBookBalance": 121750000,
    "difference": 0,
    "journalEntries": [
      {
        "journalId": "je_001",
        "type": "BANK_SERVICE_CHARGE",
        "entries": [
          { "accountCode": "6510", "debit": 15000, "credit": 0 },
          { "accountCode": "1020", "debit": 0, "credit": 15000 }
        ]
      },
      {
        "journalId": "je_002",
        "type": "BANK_INTEREST",
        "entries": [
          { "accountCode": "1020", "debit": 125000, "credit": 0 },
          { "accountCode": "4210", "debit": 0, "credit": 125000 }
        ]
      },
      {
        "journalId": "je_003",
        "type": "NSF_CHECK",
        "entries": [
          { "accountCode": "1110", "debit": 2500000, "credit": 0 },
          { "accountCode": "1020", "debit": 0, "credit": 2500000 }
        ]
      }
    ],
    "reconciliationSummary": {
      "bankStatementBalance": 125750000,
      "lessOutstandingChecks": -7500000,
      "plusDepositsInTransit": 3500000,
      "adjustedBankBalance": 121750000,
      "bookBalance": 123500000,
      "plusInterest": 125000,
      "lessServiceCharges": -15000,
      "lessNSFChecks": -2500000,
      "otherAdjustments": 640000,
      "adjustedBookBalance": 121750000
    }
  }
}
```

---

### 2. Import Bank Statement (Manual Upload)

```
POST /api/accounting/bank-reconciliations/import-statement
```

**Supported File Formats:**
| Format | Extension | Description |
|--------|-----------|-------------|
| CSV | `.csv` | Comma-separated values (bank-specific format) |
| OFX | `.ofx` | Open Financial Exchange (standard format) |
| QIF | `.qif` | Quicken Interchange Format |
| MT940 | `.sta` | SWIFT MT940 bank statement format |
| PDF | `.pdf` | PDF statement (OCR extraction) |

**Request Body (multipart/form-data):**
```
file: [bank_statement.csv or bank_statement.ofx]
bankAccountId: "1020"
statementMonth: "2025-01"
fileFormat: "csv"
bankTemplate: "bca"  // 'bca' | 'bri' | 'mandiri' | 'cimb' | 'generic'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "importId": "import_abc123",
    "totalTransactions": 156,
    "autoMatched": 142,
    "unmatched": 14,
    "unmatchedItems": [
      {
        "date": "2025-01-15",
        "description": "TRF TO 1234567890",
        "amount": -500000,
        "suggestedMatch": null
      }
    ]
  }
}
```

---

### 2b. Import Bank Statement via PDF (AI Extraction with Reducto.ai)

```
POST /api/accounting/bank-reconciliations/import-pdf
```

**Request Body (multipart/form-data):**
```
file: [bank_statement.pdf]
bankAccountId: "1020"
statementMonth: "2025-01"
```

**Process Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              PDF BANK STATEMENT EXTRACTION WITH REDUCTO.AI                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. UPLOAD PDF                                                               │
│     ┌─────────────────┐                                                      │
│     │ 📄 PDF File     │                                                      │
│     │ (any bank)      │                                                      │
│     └────────┬────────┘                                                      │
│              │                                                               │
│              ▼                                                               │
│  2. SEND TO REDUCTO.AI                                                       │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │  Reducto.ai API                                                     │ │
│     │  POST https://api.reducto.ai/v1/extract                             │ │
│     │                                                                     │ │
│     │  Capabilities:                                                      │ │
│     │  • Table detection & extraction                                     │ │
│     │  • OCR for scanned documents                                        │ │
│     │  • Multi-page processing                                            │ │
│     │  • Indonesian language support                                      │ │
│     │  • Date/amount parsing                                              │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│              │                                                               │
│              ▼                                                               │
│  3. RECEIVE STRUCTURED DATA                                                  │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │  {                                                                  │ │
│     │    "metadata": {                                                    │ │
│     │      "bankName": "BCA",                                             │ │
│     │      "accountNumber": "1234567890",                                 │ │
│     │      "period": "01/01/2025 - 31/01/2025",                           │ │
│     │      "openingBalance": 100000000,                                   │ │
│     │      "closingBalance": 125750000                                    │ │
│     │    },                                                               │ │
│     │    "transactions": [                                                │ │
│     │      { "date": "02/01", "desc": "TRSF CR TOKO ABC", ... },         │ │
│     │      { "date": "03/01", "desc": "BIAYA ADM", ... },                │ │
│     │      { "date": "28/01", "desc": "BUNGA KMK 001234", ... }          │ │
│     │    ]                                                                │ │
│     │  }                                                                  │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│              │                                                               │
│              ▼                                                               │
│  4. PARSE & VALIDATE                                                         │
│     • Normalize date formats                                                 │
│     • Parse Indonesian number format (1.000.000,00)                          │
│     • Validate opening/closing balance match                                 │
│     • Flag low-confidence extractions                                        │
│              │                                                               │
│              ▼                                                               │
│  5. AUTO-MATCH TRANSACTIONS                                                  │
│     (See Intelligent Auto-Matching section below)                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Reducto.ai Integration Code:**

```typescript
interface ReductoExtractionRequest {
  file: File;
  extractionType: 'BANK_STATEMENT';
  options: {
    detectTables: true;
    ocrEnabled: true;
    language: 'id';  // Indonesian
    dateFormat: 'DD/MM/YYYY';
    numberFormat: 'id-ID';  // 1.000.000,00
  };
}

async function extractBankStatementFromPDF(
  file: File,
  bankAccountId: string
): Promise<BankStatementData> {

  // 1. Upload to Reducto.ai
  const formData = new FormData();
  formData.append('file', file);
  formData.append('config', JSON.stringify({
    extraction_type: 'bank_statement',
    options: {
      detect_tables: true,
      ocr_enabled: true,
      language: 'id',
      output_format: 'json'
    }
  }));

  const reductoResponse = await fetch('https://api.reducto.ai/v1/extract', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDUCTO_API_KEY}`,
    },
    body: formData
  });

  const extractedData = await reductoResponse.json();

  // 2. Parse and normalize transactions
  const transactions = extractedData.tables
    .flatMap(table => parseTransactionTable(table))
    .map(txn => normalizeTransaction(txn));

  // 3. Validate extraction
  const validation = validateExtraction(extractedData, transactions);

  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
      requiresManualReview: true
    };
  }

  // 4. Run auto-matching
  const matchedTransactions = await autoMatchTransactions(
    transactions,
    bankAccountId
  );

  return {
    success: true,
    metadata: extractedData.metadata,
    transactions: matchedTransactions,
    confidence: extractedData.confidence
  };
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "importId": "import_pdf_abc123",
    "extractionConfidence": 0.95,
    "metadata": {
      "bankName": "BCA",
      "accountNumber": "1234567890",
      "statementPeriod": {
        "from": "2025-01-01",
        "to": "2025-01-31"
      },
      "openingBalance": 100000000,
      "closingBalance": 125750000
    },
    "totalTransactions": 156,
    "autoMatched": 142,
    "suggestedMatches": 10,
    "unmatched": 4,
    "lowConfidenceItems": [
      {
        "lineNumber": 45,
        "rawText": "TRSF CR 1234...",
        "confidence": 0.72,
        "reason": "Partial text extraction"
      }
    ]
  }
}
```

---

## Intelligent Auto-Matching & Transaction Detection

### Overview

The system automatically identifies and categorizes bank transactions using pattern recognition, reducing manual reconciliation work.

### Transaction Pattern Detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              INTELLIGENT TRANSACTION AUTO-MATCHING                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DETECTION CATEGORIES                                                        │
│  ═══════════════════                                                        │
│                                                                              │
│  1. LOAN INTEREST (Auto-Debit)                                               │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: BUNGA, BUNGA KMK, INTEREST, INT PINJAMAN, BEBAN BUNGA    │ │
│     │ Pattern:  Recurring monthly, similar amount ±5%                     │ │
│     │ Action:   DR 7110 Beban Bunga Pinjaman, CR Bank                     │ │
│     │ Match:    Link to existing loan record for validation               │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  2. LOAN PRINCIPAL (Installment)                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: ANGSURAN, POKOK, PRINCIPAL, CICILAN                       │ │
│     │ Pattern:  Fixed monthly amount                                      │ │
│     │ Action:   DR Loan Liability + DR Interest, CR Bank                  │ │
│     │ Match:    Link to loan amortization schedule                        │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  3. BANK FEES                                                                │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: BIAYA ADM, ADM, FEE, BIAYA TRANSFER, RTGS, SKN           │ │
│     │ Pattern:  Small amounts, recurring                                  │ │
│     │ Action:   DR 6510-6514 Bank Fees, CR Bank                          │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  4. BANK INTEREST INCOME                                                     │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: BUNGA TABUNGAN, BUNGA GIRO, INTEREST CR, JASA GIRO       │ │
│     │ Pattern:  Credit, monthly                                          │ │
│     │ Action:   DR Bank, CR 7010 Pendapatan Bunga Bank                   │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  5. TAX DEDUCTIONS                                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: PPH, PAJAK BUNGA, TAX                                    │ │
│     │ Pattern:  20% of interest income                                   │ │
│     │ Action:   DR 1342 PPh Dibayar Dimuka, CR Bank                      │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  6. INSURANCE PREMIUM                                                        │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: ASURANSI, PREMI, INSURANCE                               │ │
│     │ Pattern:  Recurring monthly/annual                                 │ │
│     │ Action:   DR 1320/6610 Insurance, CR Bank                          │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  7. UTILITY PAYMENTS                                                         │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: PLN, PDAM, TELKOM, LISTRIK, AIR, TELEPON                 │ │
│     │ Pattern:  Recurring monthly, variable amount                       │ │
│     │ Action:   DR 6120-6150 Utilities, CR Bank                          │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  8. CUSTOMER PAYMENTS (A/R)                                                  │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: TRSF CR, TRF MASUK, CR FROM, TRANSFER DARI               │ │
│     │ Pattern:  Credit transactions                                      │ │
│     │ Action:   DR Bank, CR 1110 Piutang Usaha (match to invoice)        │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  9. SUPPLIER PAYMENTS (A/P)                                                  │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Keywords: TRSF DB, TRF KELUAR, DB TO, TRANSFER KE                  │ │
│     │ Pattern:  Debit transactions, match to PO/Invoice                  │ │
│     │ Action:   DR 2010 Hutang Usaha, CR Bank                            │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Matching Algorithm

```typescript
interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  reference?: string;
}

interface MatchResult {
  transactionId: string;
  matchType: TransactionCategory;
  confidence: number;  // 0-100
  suggestedEntry: {
    debitAccount: string;
    creditAccount: string;
    amount: number;
    description: string;
  };
  linkedRecord?: {
    type: 'LOAN' | 'INVOICE' | 'BILL' | 'RECURRING';
    id: string;
    expectedAmount?: number;
    variance?: number;
  };
}

type TransactionCategory =
  | 'LOAN_INTEREST'
  | 'LOAN_PRINCIPAL'
  | 'LOAN_INSTALLMENT'
  | 'BANK_FEE'
  | 'BANK_INTEREST'
  | 'TAX_DEDUCTION'
  | 'INSURANCE'
  | 'UTILITY'
  | 'CUSTOMER_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'UNIDENTIFIED';

// Pattern definitions
const TRANSACTION_PATTERNS: Record<TransactionCategory, PatternConfig> = {
  LOAN_INTEREST: {
    keywords: ['BUNGA', 'BUNGA KMK', 'INTEREST', 'INT PINJAMAN', 'BEBAN BUNGA'],
    direction: 'debit',
    suggestedAccounts: { debit: '7110', credit: 'BANK' },
    linkTo: 'LOAN',
    validation: (txn, loan) => {
      const expectedInterest = loan.balance * loan.rate / 12;
      const variance = Math.abs(txn.amount - expectedInterest) / expectedInterest;
      return variance < 0.05; // Within 5%
    }
  },
  LOAN_PRINCIPAL: {
    keywords: ['ANGSURAN', 'POKOK', 'PRINCIPAL', 'CICILAN'],
    direction: 'debit',
    suggestedAccounts: { debit: 'LOAN_LIABILITY', credit: 'BANK' },
    linkTo: 'LOAN'
  },
  BANK_FEE: {
    keywords: ['BIAYA ADM', 'ADM', 'FEE', 'BIAYA TRANSFER', 'RTGS', 'SKN', 'BIAYA BUKU CEK'],
    direction: 'debit',
    suggestedAccounts: { debit: '6510', credit: 'BANK' },
    maxAmount: 500000  // Typically small amounts
  },
  BANK_INTEREST: {
    keywords: ['BUNGA TABUNGAN', 'BUNGA GIRO', 'INTEREST CR', 'JASA GIRO', 'CR BUNGA'],
    direction: 'credit',
    suggestedAccounts: { debit: 'BANK', credit: '7010' }
  },
  TAX_DEDUCTION: {
    keywords: ['PPH', 'PAJAK BUNGA', 'TAX', 'POTONG PAJAK'],
    direction: 'debit',
    suggestedAccounts: { debit: '1342', credit: 'BANK' }
  },
  UTILITY: {
    keywords: ['PLN', 'PDAM', 'TELKOM', 'LISTRIK', 'AIR', 'TELEPON', 'INTERNET'],
    direction: 'debit',
    accountMapping: {
      'PLN': '6120',
      'LISTRIK': '6120',
      'PDAM': '6130',
      'AIR': '6130',
      'TELKOM': '6140',
      'TELEPON': '6140',
      'INTERNET': '6150'
    }
  }
  // ... more patterns
};

async function autoMatchTransaction(
  txn: BankTransaction,
  context: MatchingContext
): Promise<MatchResult> {

  const descUpper = txn.description.toUpperCase();

  // Try each pattern
  for (const [category, pattern] of Object.entries(TRANSACTION_PATTERNS)) {
    // Check keywords
    const keywordMatch = pattern.keywords.some(k => descUpper.includes(k));
    if (!keywordMatch) continue;

    // Check direction
    if (pattern.direction &&
        ((pattern.direction === 'debit' && txn.amount > 0) ||
         (pattern.direction === 'credit' && txn.amount < 0))) {
      continue;
    }

    // Check amount limits
    if (pattern.maxAmount && Math.abs(txn.amount) > pattern.maxAmount) {
      continue;
    }

    // Try to link to related record
    let linkedRecord = null;
    let confidence = 70; // Base confidence for keyword match

    if (pattern.linkTo === 'LOAN') {
      linkedRecord = await findMatchingLoan(txn, context.activeLoans);
      if (linkedRecord) {
        confidence = 95;
        // Validate against expected amount
        if (pattern.validation && !pattern.validation(txn, linkedRecord)) {
          confidence = 75; // Amount doesn't match expected
        }
      }
    }

    // Build suggested entry
    const suggestedEntry = buildJournalEntry(txn, pattern, linkedRecord);

    return {
      transactionId: txn.id,
      matchType: category as TransactionCategory,
      confidence,
      suggestedEntry,
      linkedRecord
    };
  }

  // No pattern matched
  return {
    transactionId: txn.id,
    matchType: 'UNIDENTIFIED',
    confidence: 0,
    suggestedEntry: {
      debitAccount: '1199', // Suspense
      creditAccount: context.bankAccountCode,
      amount: Math.abs(txn.amount),
      description: txn.description
    }
  };
}
```

### Routing to Automated Journal Entry Modules

**Critical**: Auto-matched transactions do NOT create standalone journal entries. Instead, they are routed to the appropriate **Automated Journal Entry Module** which:
1. Applies module-specific business rules and validation
2. Updates related records (loan balance, A/R, A/P, etc.)
3. Creates proper audit trail with `sourceService` linkage
4. Maintains consistency with manual entries through the same module

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           TRANSACTION ROUTING TO AUTOMATED JOURNAL ENTRY MODULES             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DETECTED TRANSACTION              ROUTED TO MODULE              ACTIONS    │
│  ════════════════════              ════════════════              ═══════    │
│                                                                              │
│  🏦 LOAN_INTEREST          ──────► LOAN_ENTRY_JOURNAL.md                    │
│     "BUNGA KMK 001234"              • Updates loan interest paid             │
│                                     • Links to loan record                   │
│                                     • DR 7110 / CR Bank                     │
│                                                                              │
│  🏦 LOAN_INSTALLMENT       ──────► LOAN_ENTRY_JOURNAL.md                    │
│     "ANGSURAN KMK"                  • Splits principal + interest            │
│                                     • Updates loan balance                   │
│                                     • Updates amortization schedule          │
│                                                                              │
│  💵 BANK_FEE               ──────► AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md       │
│     "BIAYA ADM"                     • Standard expense entry                 │
│                                     • Location allocation (if set)           │
│                                     • DR 6510-6514 / CR Bank                │
│                                                                              │
│  💰 BANK_INTEREST          ──────► AUTOMATIC_INCOME_RECEIPT_ENTRY.md        │
│     "JASA GIRO"                     • Non-sales income entry                 │
│                                     • DR Bank / CR 7010                     │
│                                                                              │
│  ⚡ UTILITY                 ──────► AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md       │
│     "PLN", "PDAM"                   • Expense with category                  │
│                                     • Clears accrual if exists               │
│                                     • DR 6120-6150 / CR Bank                │
│                                                                              │
│  👤 CUSTOMER_PAYMENT       ──────► ACCOUNTS_RECEIVABLE_COLLECTION_ENTRY.md  │
│     "TRSF CR TOKO ABC"              • Matches to open invoice                │
│                                     • Updates A/R aging                      │
│                                     • DR Bank / CR 1110                     │
│                                                                              │
│  🏪 SUPPLIER_PAYMENT       ──────► ACCOUNTS_PAYABLE_PAYMENT_ENTRY.md        │
│     "TRSF DB KE PT XYZ"             • Matches to open bill                   │
│                                     • Updates A/P aging                      │
│                                     • DR 2010 / CR Bank                     │
│                                                                              │
│  🔄 INSURANCE_PREMIUM      ──────► CAPITAL_AND_PREPAID_EXPENSE_ENTRY.md     │
│     "PREMI ASURANSI"                • Prepaid asset or expense               │
│                                     • Handles amortization schedule          │
│                                                                              │
│  🧾 TAX_PAYMENT            ──────► PPH_FINAL_UMKM_ENTRY.md (or relevant)    │
│     "PPH FINAL"                     • Records tax payment                    │
│                                     • Clears tax payable                     │
│                                     • Updates tax tracking                   │
│                                                                              │
│  ❓ UNIDENTIFIED           ──────► MANUAL REVIEW QUEUE                       │
│     Unknown pattern                 • User categorizes manually              │
│                                     • System learns for future               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
interface ModuleRouting {
  category: TransactionCategory;
  module: string;
  endpoint: string;
  requiredData: string[];
  postProcessing: string[];
}

const MODULE_ROUTING: Record<TransactionCategory, ModuleRouting> = {
  LOAN_INTEREST: {
    category: 'LOAN_INTEREST',
    module: 'loan-entry',
    endpoint: '/api/accounting/loans/transaction',
    requiredData: ['loanId', 'amount', 'date'],
    postProcessing: ['updateLoanInterestPaid', 'linkToBankStatement']
  },
  LOAN_INSTALLMENT: {
    category: 'LOAN_INSTALLMENT',
    module: 'loan-entry',
    endpoint: '/api/accounting/loans/transaction',
    requiredData: ['loanId', 'principalAmount', 'interestAmount', 'date'],
    postProcessing: ['updateLoanBalance', 'updateAmortizationSchedule', 'linkToBankStatement']
  },
  BANK_FEE: {
    category: 'BANK_FEE',
    module: 'expense-entry',
    endpoint: '/api/accounting/expenses',
    requiredData: ['expenseAccountId', 'amount', 'date'],
    postProcessing: ['linkToBankStatement']
  },
  BANK_INTEREST: {
    category: 'BANK_INTEREST',
    module: 'income-receipt',
    endpoint: '/api/accounting/income-receipts',
    requiredData: ['incomeAccountId', 'amount', 'date'],
    postProcessing: ['linkToBankStatement']
  },
  UTILITY: {
    category: 'UTILITY',
    module: 'expense-entry',
    endpoint: '/api/accounting/expenses',
    requiredData: ['expenseAccountId', 'amount', 'date', 'warehouseId'],
    postProcessing: ['clearAccrualIfExists', 'linkToBankStatement']
  },
  CUSTOMER_PAYMENT: {
    category: 'CUSTOMER_PAYMENT',
    module: 'ar-collection',
    endpoint: '/api/accounting/ar/collections',
    requiredData: ['customerId', 'invoiceIds', 'amount', 'date'],
    postProcessing: ['updateARBalance', 'updateCustomerAging', 'linkToBankStatement']
  },
  SUPPLIER_PAYMENT: {
    category: 'SUPPLIER_PAYMENT',
    module: 'ap-payment',
    endpoint: '/api/accounting/ap/payments',
    requiredData: ['supplierId', 'billIds', 'amount', 'date'],
    postProcessing: ['updateAPBalance', 'updateSupplierAging', 'linkToBankStatement']
  },
  INSURANCE: {
    category: 'INSURANCE',
    module: 'prepaid-expense',
    endpoint: '/api/accounting/prepaid-expenses',
    requiredData: ['assetAccountId', 'amount', 'date', 'amortizationMonths'],
    postProcessing: ['createAmortizationSchedule', 'linkToBankStatement']
  },
  TAX_DEDUCTION: {
    category: 'TAX_DEDUCTION',
    module: 'tax-entry',
    endpoint: '/api/accounting/tax/payments',
    requiredData: ['taxType', 'amount', 'date', 'period'],
    postProcessing: ['clearTaxPayable', 'updateTaxTracking', 'linkToBankStatement']
  }
};

/**
 * Route matched transaction to appropriate module
 */
async function routeToModule(
  matchResult: MatchResult,
  bankTransaction: BankTransaction,
  context: ReconciliationContext
): Promise<JournalEntryResult> {

  const routing = MODULE_ROUTING[matchResult.matchType];

  if (!routing) {
    // Unidentified - add to manual review queue
    return addToManualReviewQueue(bankTransaction, context);
  }

  // Build request for the target module
  const moduleRequest = buildModuleRequest(matchResult, bankTransaction, routing);

  // Call the module's API endpoint
  const response = await fetch(routing.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Source': 'bank-reconciliation',
      'X-Bank-Statement-Id': bankTransaction.id
    },
    body: JSON.stringify({
      ...moduleRequest,
      sourceService: 'bank-reconciliation',
      bankStatementRef: bankTransaction.id,
      autoMatched: true
    })
  });

  const result = await response.json();

  // Run post-processing
  for (const postProcess of routing.postProcessing) {
    await runPostProcessing(postProcess, result, bankTransaction);
  }

  return {
    success: true,
    journalEntryId: result.data.journalEntryId,
    module: routing.module,
    linkedRecords: result.data.linkedRecords
  };
}

/**
 * Example: Route loan interest to Loan Entry module
 */
async function routeLoanInterest(
  matchResult: MatchResult,
  bankTransaction: BankTransaction
): Promise<JournalEntryResult> {

  // Call Loan Entry module endpoint
  const response = await fetch('/api/accounting/loans/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactionType: 'INTEREST_ONLY',
      loanId: matchResult.linkedRecord.id,
      amount: Math.abs(bankTransaction.amount),
      transactionDate: bankTransaction.date,
      paymentBankAccountId: context.bankAccountId,

      // Bank reconciliation metadata
      sourceService: 'bank-reconciliation',
      bankStatementRef: bankTransaction.id,
      bankStatementDate: bankTransaction.date,
      bankStatementDesc: bankTransaction.description,
      autoMatched: true,
      matchConfidence: matchResult.confidence
    })
  });

  return response.json();
}
```

**Journal Entry with Source Linkage:**

```typescript
// Journal entry created by module includes bank reconciliation reference
{
  entryNumber: "LOAN-2026-01-003",
  entryDate: "2026-01-28",
  entryType: "InterestPayment",
  description: "KMK Interest Payment - January 2026",

  // Source tracking
  sourceService: "bank-reconciliation",  // Created via reconciliation
  sourceModule: "loan-entry",            // Processed by loan module
  bankStatementRef: "STMT-BCA-2026-01-28-0015",
  autoMatched: true,
  matchConfidence: 95,

  lines: [
    {
      accountCode: "7110",
      accountName: "Beban Bunga Pinjaman",
      direction: "Debit",
      amount: 3958333
    },
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 3958333
    }
  ],

  // Linked records for audit trail
  linkedRecords: {
    loanId: "loan-kmk-bca-001",
    bankStatementLineId: "bsl-2026-01-28-0015"
  }
}
```

### Manual Review Queue for Unidentified Transactions

When the system cannot automatically match a transaction, it goes to the **Manual Review Queue** where users can:
1. View transaction details
2. Select the appropriate journal entry module
3. Fill in required fields
4. Create the journal entry
5. Optionally teach the system to recognize similar transactions

#### Manual Review UI

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ❓ Manual Review - Unidentified Transactions                    3 items     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bank Account: BCA - Operasional (1020)     Period: January 2026            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ TRANSACTION #1                                              [Categorize] ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Date:         25/01/2026                                                ││
│  │  Description:  TRF DB 9876543210 PEMBAYARAN                              ││
│  │  Amount:       Rp -15,000,000 (Debit)                                    ││
│  │  Reference:    2601250001234                                             ││
│  │                                                                          ││
│  │  System Analysis:                                                        ││
│  │  • No keyword match found                                                ││
│  │  • Account 9876543210 not in vendor database                             ││
│  │  • Amount doesn't match any open A/P                                     ││
│  │                                                                          ││
│  │  ┌────────────────────────────────────────────────────────────────────┐  ││
│  │  │ What type of transaction is this?                                  │  ││
│  │  │                                                                    │  ││
│  │  │ ○ 💰 Expense Payment        → Automatic Expense Entry              │  ││
│  │  │ ○ 🏪 Supplier Payment       → A/P Payment Entry                    │  ││
│  │  │ ○ 🏦 Loan Payment           → Loan Entry                           │  ││
│  │  │ ○ 💳 Credit Card Payment    → Credit Card Expense                  │  ││
│  │  │ ○ 🔄 Fund Transfer          → Fund Transfer Entry                  │  ││
│  │  │ ○ 👤 Owner Drawing          → Owner Equity Entry                   │  ││
│  │  │ ○ 📦 Inventory Purchase     → Inventory Purchase Entry             │  ││
│  │  │ ○ 🏢 Asset Purchase         → Capital & Prepaid Expense            │  ││
│  │  │ ○ 🧾 Tax Payment            → Tax Entry                            │  ││
│  │  │ ○ ❓ Other / Manual Entry   → General Journal Entry                │  ││
│  │  │                                                                    │  ││
│  │  └────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                          ││
│  │  [Skip for Now]                              [Select & Continue →]       ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### After Selecting Transaction Type (Example: Supplier Payment)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🏪 Categorize as Supplier Payment                              [← Back]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BANK TRANSACTION                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  Date: 25/01/2026 | TRF DB 9876543210 PEMBAYARAN | Rp -15,000,000       ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  LINK TO A/P PAYMENT MODULE                                                  │
│                                                                              │
│  Supplier *                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search supplier by name or account number...                     ▼  │  │
│  │                                                                        │  │
│  │ Suggestions based on bank account 9876543210:                          │  │
│  │ ┌────────────────────────────────────────────────────────────────────┐ │  │
│  │ │ ⭐ PT Supplier Baru - Bank: 9876543210 (BCA)         [Select]     │ │  │
│  │ └────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                        │  │
│  │ Or search all suppliers:                                               │  │
│  │ ○ PT Maju Jaya                                                         │  │
│  │ ○ CV Berkah Abadi                                                      │  │
│  │ ○ UD Sumber Rezeki                                                     │  │
│  │ [+ Add New Supplier]                                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Match to Open Bills                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  □ BILL-2026-0042  Due: 30/01/2026  Rp 15,000,000  ✓ Exact match      │  │
│  │  □ BILL-2026-0038  Due: 25/01/2026  Rp  8,500,000                      │  │
│  │  □ BILL-2026-0035  Due: 20/01/2026  Rp  6,500,000                      │  │
│  │                                                                        │  │
│  │  Selected: Rp 15,000,000 / Payment: Rp 15,000,000  ✓ Balanced          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  JOURNAL ENTRY PREVIEW                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Account                              Debit           Credit            │  │
│  │  ─────────────────────────────────────────────────────────────────────  │  │
│  │  2010 Hutang Dagang                   15,000,000                        │  │
│  │  1020 Bank BCA - Operasional                          15,000,000        │  │
│  │  ─────────────────────────────────────────────────────────────────────  │  │
│  │  TOTAL                                15,000,000      15,000,000        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  🧠 TEACH THE SYSTEM (Optional)                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  [x] Remember this pattern for future transactions                     │  │
│  │                                                                        │  │
│  │  Pattern to learn:                                                     │  │
│  │  • Bank account "9876543210" → PT Supplier Baru                        │  │
│  │  • Description contains "TRF DB 9876543210" → Supplier Payment         │  │
│  │                                                                        │  │
│  │  Next time this pattern appears:                                       │  │
│  │  ○ Auto-match with HIGH confidence (95%)                               │  │
│  │  ● Suggest match, require confirmation (75%)                           │  │
│  │  ○ Just highlight, don't auto-categorize                               │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Cancel]                                    [Create A/P Payment Entry →]    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### After Selecting Transaction Type (Example: Expense Payment)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  💰 Categorize as Expense Payment                               [← Back]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BANK TRANSACTION                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  Date: 22/01/2026 | PEMBAYARAN SEWA RUKO | Rp -25,000,000               ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  LINK TO EXPENSE ENTRY MODULE                                                │
│                                                                              │
│  Expense Account *                                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search expense account...                                        ▼  │  │
│  │                                                                        │  │
│  │ Suggestions based on "SEWA RUKO":                                      │  │
│  │ ┌────────────────────────────────────────────────────────────────────┐ │  │
│  │ │ ⭐ 6111 Beban Sewa Toko (Store Rent)                    [Select]  │ │  │
│  │ │ ⭐ 6110 Beban Sewa Kantor (Office Rent)                 [Select]  │ │  │
│  │ │ ⭐ 6112 Beban Sewa Gudang (Warehouse Rent)              [Select]  │ │  │
│  │ └────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                        │  │
│  │ All expense accounts:                                                  │  │
│  │ ├── 6100 Beban Sewa & Utilitas                                         │  │
│  │ │   ├── 6110 Beban Sewa Kantor                                         │  │
│  │ │   ├── 6111 Beban Sewa Toko                                           │  │
│  │ │   ├── 6112 Beban Sewa Gudang                                         │  │
│  │ │   └── ...                                                            │  │
│  │ ├── 6200 Beban Penyusutan                                              │  │
│  │ └── ...                                                                │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Location / Cost Center *                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Kantor Pusat (HQ)                                                    │  │
│  │ ● Toko 1 - Kelapa Gading       ← Selected                              │  │
│  │ ○ Toko 2 - PIK                                                         │  │
│  │ ○ Gudang Utama - Cakung                                                │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  PREPAID OR DIRECT EXPENSE?                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ● Direct Expense (one-time)                                           │  │
│  │    Record full amount as expense now                                   │  │
│  │                                                                        │  │
│  │  ○ Prepaid Expense (multiple months)                                   │  │
│  │    Asset now, amortize over: [12] months                               │  │
│  │    → Routes to CAPITAL_AND_PREPAID_EXPENSE_ENTRY.md                    │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  JOURNAL ENTRY PREVIEW                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Account                              Debit           Credit            │  │
│  │  ─────────────────────────────────────────────────────────────────────  │  │
│  │  6111 Beban Sewa Toko                 25,000,000                        │  │
│  │       └─ Location: Toko 1 - Kelapa Gading                               │  │
│  │  1020 Bank BCA - Operasional                          25,000,000        │  │
│  │  ─────────────────────────────────────────────────────────────────────  │  │
│  │  TOTAL                                25,000,000      25,000,000        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  🧠 TEACH THE SYSTEM (Optional)                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  [x] Remember this pattern for future transactions                     │  │
│  │                                                                        │  │
│  │  Pattern to learn:                                                     │  │
│  │  • Description contains "SEWA RUKO" → 6111 Beban Sewa Toko             │  │
│  │  • Amount ~25,000,000 monthly → Toko 1 rent payment                    │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Cancel]                                      [Create Expense Entry →]      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Transaction Type Selection - Full Module List

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📋 Select Transaction Type                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DEBIT TRANSACTIONS (Money Out)                                              │
│  ═════════════════════════════                                              │
│                                                                              │
│  💰 EXPENSES                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Operating Expense       → AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md         │  │
│  │   Rent, utilities, supplies, professional fees, etc.                   │  │
│  │                                                                        │  │
│  │ ○ Prepaid Expense         → CAPITAL_AND_PREPAID_EXPENSE_ENTRY.md       │  │
│  │   Insurance, rent paid in advance, subscriptions                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  🏪 PAYABLES                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Supplier Payment        → ACCOUNTS_PAYABLE_PAYMENT_ENTRY.md          │  │
│  │   Payment for goods/services purchased on credit                       │  │
│  │                                                                        │  │
│  │ ○ Credit Card Payment     → CREDIT_CARD_EXPENSE_WORKFLOW.md            │  │
│  │   Payment to credit card company                                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  🏦 LOANS & FINANCING                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Loan Interest Payment   → LOAN_ENTRY_JOURNAL.md                      │  │
│  │   Interest on bank loans, KMK, overdraft                               │  │
│  │                                                                        │  │
│  │ ○ Loan Principal Payment  → LOAN_ENTRY_JOURNAL.md                      │  │
│  │   Principal repayment on loans                                         │  │
│  │                                                                        │  │
│  │ ○ Loan Installment        → LOAN_ENTRY_JOURNAL.md                      │  │
│  │   Combined principal + interest payment                                │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  📦 INVENTORY & ASSETS                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Inventory Purchase      → INVENTORY_PURCHASE_ENTRY.md                │  │
│  │   Purchase of goods for resale                                         │  │
│  │                                                                        │  │
│  │ ○ Fixed Asset Purchase    → CAPITAL_AND_PREPAID_EXPENSE_ENTRY.md       │  │
│  │   Equipment, vehicle, furniture, etc.                                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  🧾 TAX PAYMENTS                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ PPh Final UMKM          → PPH_FINAL_UMKM_ENTRY.md                    │  │
│  │   Monthly 0.5% final tax                                               │  │
│  │                                                                        │  │
│  │ ○ PPh 21/23/25            → TAX_PAYMENT_ENTRY.md                       │  │
│  │   Employee tax, withholding tax, installment tax                       │  │
│  │                                                                        │  │
│  │ ○ VAT Payment (PPn)       → TAX_PAYMENT_ENTRY.md                       │  │
│  │   Monthly VAT payment to tax office                                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  👤 EQUITY & TRANSFERS                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Owner Drawing           → OWNER_EQUITY_TRANSACTION_ENTRY.md          │  │
│  │   Withdrawal by owner                                                  │  │
│  │                                                                        │  │
│  │ ○ Fund Transfer (Internal)→ FUND_TRANSFER_BETWEEN_ACCOUNTS.md          │  │
│  │   Transfer to another company bank account                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  CREDIT TRANSACTIONS (Money In)                                              │
│  ══════════════════════════════                                             │
│                                                                              │
│  👤 RECEIVABLES                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Customer Payment        → ACCOUNTS_RECEIVABLE_COLLECTION_ENTRY.md    │  │
│  │   Payment from customer for sales invoice                              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  💰 INCOME                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Bank Interest Income    → AUTOMATIC_INCOME_RECEIPT_ENTRY.md          │  │
│  │   Interest earned on bank deposits                                     │  │
│  │                                                                        │  │
│  │ ○ Other Income            → AUTOMATIC_INCOME_RECEIPT_ENTRY.md          │  │
│  │   Commission, rental income, miscellaneous                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  🏦 LOANS & CAPITAL                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Loan Drawdown           → LOAN_ENTRY_JOURNAL.md                      │  │
│  │   Receiving loan proceeds from bank                                    │  │
│  │                                                                        │  │
│  │ ○ Capital Injection       → OWNER_EQUITY_TRANSACTION_ENTRY.md          │  │
│  │   Owner adding capital to business                                     │  │
│  │                                                                        │  │
│  │ ○ Fund Transfer (Internal)→ FUND_TRANSFER_BETWEEN_ACCOUNTS.md          │  │
│  │   Transfer from another company bank account                           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ❓ OTHER                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Manual Journal Entry    → General double-entry form                  │  │
│  │   For transactions that don't fit any category above                   │  │
│  │                                                                        │  │
│  │ ○ Skip / Investigate Later                                             │  │
│  │   Keep in queue for later review                                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [Cancel]                                            [Continue →]            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### API Design for Manual Categorization

```typescript
// Get unidentified transactions for manual review
GET /api/accounting/bank-reconciliations/:id/manual-review

Response:
{
  "reconciliationId": "recon_123",
  "unidentifiedCount": 3,
  "transactions": [
    {
      "id": "txn_456",
      "date": "2026-01-25",
      "description": "TRF DB 9876543210 PEMBAYARAN",
      "amount": -15000000,
      "reference": "2601250001234",
      "analysis": {
        "keywords": [],
        "possibleCategories": [],
        "bankAccountMatch": {
          "accountNumber": "9876543210",
          "matchedEntity": null
        },
        "amountPatternMatch": null
      }
    }
  ]
}

// Categorize and create journal entry via module
POST /api/accounting/bank-reconciliations/:id/categorize

Request:
{
  "transactionId": "txn_456",
  "category": "SUPPLIER_PAYMENT",
  "moduleData": {
    // Data specific to the selected module
    "supplierId": "supplier_789",
    "billIds": ["bill_001"],
    "amount": 15000000
  },
  "learning": {
    "enabled": true,
    "confidenceLevel": "SUGGEST",  // AUTO | SUGGEST | HIGHLIGHT
    "patterns": [
      {
        "type": "BANK_ACCOUNT",
        "value": "9876543210",
        "mappedTo": "supplier_789"
      },
      {
        "type": "DESCRIPTION_KEYWORD",
        "value": "TRF DB 9876543210",
        "mappedTo": "SUPPLIER_PAYMENT"
      }
    ]
  }
}

Response:
{
  "success": true,
  "journalEntryId": "je_789",
  "module": "ap-payment",
  "linkedRecords": {
    "supplierId": "supplier_789",
    "billIds": ["bill_001"]
  },
  "patternLearned": true,
  "patternId": "pattern_123"
}
```

### Learning from User Feedback

The system improves over time by learning from user confirmations and corrections:

```typescript
interface LearnedPattern {
  id: string;
  description_pattern: string;  // Regex or keyword pattern
  category: TransactionCategory;
  debit_account: string;
  credit_account: string;
  confirmation_count: number;
  last_confirmed_at: string;
  created_from_transaction_id: string;
}

// When user confirms a match
async function confirmMatch(
  transactionId: string,
  matchResult: MatchResult,
  userModifications?: Partial<MatchResult>
): Promise<void> {

  const finalMatch = { ...matchResult, ...userModifications };

  // Create journal entry
  await createJournalEntry(finalMatch.suggestedEntry);

  // Learn from this confirmation
  await learnFromConfirmation(transactionId, finalMatch);
}

async function learnFromConfirmation(
  transactionId: string,
  match: MatchResult
): Promise<void> {

  const txn = await getBankTransaction(transactionId);

  // Extract pattern from description
  const pattern = extractPattern(txn.description);

  // Check if similar pattern exists
  const existing = await findSimilarPattern(pattern);

  if (existing) {
    // Increment confirmation count
    await db.update(learnedPatterns)
      .set({
        confirmation_count: existing.confirmation_count + 1,
        last_confirmed_at: new Date().toISOString()
      })
      .where(eq(learnedPatterns.id, existing.id));
  } else {
    // Create new learned pattern
    await db.insert(learnedPatterns).values({
      id: generateId(),
      description_pattern: pattern,
      category: match.matchType,
      debit_account: match.suggestedEntry.debitAccount,
      credit_account: match.suggestedEntry.creditAccount,
      confirmation_count: 1,
      last_confirmed_at: new Date().toISOString(),
      created_from_transaction_id: transactionId
    });
  }
}
```

### Auto-Match UI

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🤖 Smart Transaction Matching                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bank Account: BCA - Operasional (1020)     Period: January 2025            │
│  Import Method: PDF Upload (Reducto.ai)     Confidence: 95%                 │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ SUGGESTED MATCHES (Review & Approve)                          14 items  ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  ✅ HIGH CONFIDENCE (10)                                                 ││
│  │  ───────────────────────────────────────────────────────────────────     ││
│  │  □ 28/01 BUNGA KMK 001234              -3,958,333   → 🏦 Loan Interest   ││
│  │          Matched: KMK BCA (Expected: 3,958,333) ✓    95%                 ││
│  │          DR 7110 Beban Bunga | CR 1020 Bank                              ││
│  │                                                                          ││
│  │  □ 31/01 BIAYA ADM                         -15,000   → 🏦 Bank Fee      ││
│  │          Recurring monthly pattern           92%                         ││
│  │          DR 6510 Biaya Admin | CR 1020 Bank                              ││
│  │                                                                          ││
│  │  □ 31/01 JASA GIRO                         125,000   → 💰 Interest Inc  ││
│  │          Bank interest income               90%                          ││
│  │          DR 1020 Bank | CR 7010 Pendapatan Bunga                         ││
│  │                                                                          ││
│  │  □ 15/01 PLN PREPAID 12345678           -2,450,000   → ⚡ Utility       ││
│  │          Electricity payment                88%                          ││
│  │          DR 6120 Beban Listrik | CR 1020 Bank                            ││
│  │                                                                          ││
│  │  ⚠️ MEDIUM CONFIDENCE (3)                                                ││
│  │  ───────────────────────────────────────────────────────────────────     ││
│  │  □ 20/01 TRSF CR TOKO MAKMUR            5,000,000   → 👤 Customer Pmt?  ││
│  │          Possible: INV-2025-0042 (Rp 5,000,000)      72%                 ││
│  │          DR 1020 Bank | CR 1110 Piutang                                  ││
│  │                                                  [Match to Invoice ▼]    ││
│  │                                                                          ││
│  │  ❓ LOW CONFIDENCE (1)                                                   ││
│  │  ───────────────────────────────────────────────────────────────────     ││
│  │  □ 25/01 TRF 9876543210                  -500,000   → ❓ Unknown        ││
│  │          No pattern match                    15%                         ││
│  │                                    [Categorize ▼] [Skip]                 ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [Select All High Confidence]                                               │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────────────────┐                 │
│  │  Skip Unmatched    │  │  ✅ Create Journal Entries (10) │                 │
│  └────────────────────┘  └────────────────────────────────┘                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Bank API Integration

### Supported Banks & APIs

| Bank | API Name | Features | Auth Method |
|------|----------|----------|-------------|
| **BCA** | KlikBCA Bisnis API | Balance, Statement, Transfer | OAuth 2.0 + API Key |
| **BRI** | BRIAPI | Balance, Statement, Transfer, VA | OAuth 2.0 |
| **CIMB Niaga** | CIMB API Banking | Balance, Statement, Transfer | OAuth 2.0 + mTLS |
| **Mandiri** | Mandiri API | Balance, Statement, Transfer | OAuth 2.0 |

### Bank API Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BANK API INTEGRATION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  KIDKAZZ ACCOUNTING SERVICE                                                  │
│       │                                                                      │
│       ├── Bank Integration Module                                            │
│       │       │                                                              │
│       │       ├── BCA Adapter ──────────► KlikBCA Bisnis API                │
│       │       │     • GET /banking/v3/corporates/{CorporateID}/accounts     │
│       │       │     • GET /banking/v3/corporates/{CorporateID}/accounts/    │
│       │       │           {AccountNumber}/statements                        │
│       │       │                                                              │
│       │       ├── BRI Adapter ──────────► BRIAPI                            │
│       │       │     • GET /v1/account/balance                               │
│       │       │     • GET /v1/account/statement                             │
│       │       │                                                              │
│       │       ├── CIMB Adapter ─────────► CIMB API Banking                  │
│       │       │     • GET /accounts/{accountNo}/balance                     │
│       │       │     • GET /accounts/{accountNo}/statements                  │
│       │       │                                                              │
│       │       └── Mandiri Adapter ──────► Mandiri API                       │
│       │             • GET /v1/account/balance                               │
│       │             • GET /v1/account/statement                             │
│       │                                                                      │
│       └── Reconciliation Engine                                              │
│               • Auto-match transactions                                      │
│               • Identify discrepancies                                       │
│               • Generate adjustment entries                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Configure Bank API Connection

```
POST /api/accounting/bank-connections
```

**Request Body:**
```json
{
  "bankCode": "bca",
  "bankAccountId": "1020",
  "accountNumber": "1234567890",
  "corporateId": "KIDKAZZ01",
  "credentials": {
    "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "clientSecret": "encrypted_secret_here",
    "apiKey": "encrypted_api_key_here"
  },
  "settings": {
    "autoSync": true,
    "syncFrequency": "daily",
    "syncTime": "06:00",
    "autoReconcile": false,
    "notifyOnNewTransactions": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connectionId": "conn_abc123",
    "bankCode": "bca",
    "status": "connected",
    "lastSyncAt": null,
    "nextSyncAt": "2025-01-16T06:00:00Z"
  }
}
```

---

### 4. Fetch Bank Statement via API

```
POST /api/accounting/bank-connections/:connectionId/fetch-statement
```

**Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fetchId": "fetch_abc123",
    "connectionId": "conn_abc123",
    "bankCode": "bca",
    "accountNumber": "1234567890",
    "period": {
      "startDate": "2025-01-01",
      "endDate": "2025-01-31"
    },
    "openingBalance": 100000000,
    "closingBalance": 125750000,
    "totalCredits": 85000000,
    "totalDebits": 59250000,
    "transactionCount": 156,
    "transactions": [
      {
        "id": "txn_001",
        "date": "2025-01-02",
        "valueDate": "2025-01-02",
        "description": "TRSF E-BANKING CR 01/02 TOKO MAKMUR",
        "reference": "2501020001234",
        "type": "credit",
        "amount": 5000000,
        "balance": 105000000,
        "matchStatus": "matched",
        "matchedJournalId": "je_123"
      },
      {
        "id": "txn_002",
        "date": "2025-01-03",
        "valueDate": "2025-01-03",
        "description": "BIAYA ADM",
        "reference": "FEE2501030001",
        "type": "debit",
        "amount": 15000,
        "balance": 104985000,
        "matchStatus": "unmatched",
        "suggestedType": "service_charge"
      }
    ],
    "summary": {
      "autoMatched": 142,
      "unmatched": 14,
      "pendingReview": 14
    }
  }
}
```

---

### 5. Auto-Sync Bank Transactions (Scheduled)

```
POST /api/accounting/bank-connections/:connectionId/enable-auto-sync
```

**Request Body:**
```json
{
  "enabled": true,
  "frequency": "daily",
  "syncTime": "06:00",
  "timezone": "Asia/Jakarta",
  "options": {
    "fetchDaysBack": 1,
    "autoCreateAdjustments": false,
    "notifyOnDiscrepancy": true,
    "notifyEmail": "accounting@kidkazz.com"
  }
}
```

**Cron Job Implementation (Cloudflare Workers Cron Trigger):**
```typescript
// wrangler.toml
[triggers]
crons = ["0 6 * * *"]  // Daily at 6 AM

// src/scheduled.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Fetch all active bank connections with auto-sync enabled
    const connections = await getBankConnectionsForSync(env);

    for (const conn of connections) {
      ctx.waitUntil(syncBankAccount(env, conn));
    }
  }
};
```

---

### Bank-Specific API Details

#### BCA (KlikBCA Bisnis API)

**Base URL:** `https://sandbox.bca.co.id` (sandbox) | `https://api.bca.co.id` (production)

**Authentication Flow:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BCA API AUTHENTICATION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Get Access Token                                                         │
│     POST /api/oauth/token                                                    │
│     Headers: Authorization: Basic {base64(client_id:client_secret)}          │
│     Body: grant_type=client_credentials                                      │
│                                                                              │
│  2. Generate Signature                                                       │
│     StringToSign = HTTP_METHOD + ":" + RelativeURL + ":" + AccessToken       │
│                    + ":" + SHA256(RequestBody) + ":" + Timestamp             │
│     Signature = HMAC_SHA256(APISecret, StringToSign)                         │
│                                                                              │
│  3. Call API                                                                 │
│     Headers:                                                                 │
│       Authorization: Bearer {access_token}                                   │
│       X-BCA-Key: {api_key}                                                   │
│       X-BCA-Timestamp: {ISO8601_timestamp}                                   │
│       X-BCA-Signature: {signature}                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Get Account Statement:**
```
GET /banking/v3/corporates/{CorporateID}/accounts/{AccountNumber}/statements
?StartDate=2025-01-01&EndDate=2025-01-31
```

---

#### BRI (BRIAPI)

**Base URL:** `https://sandbox.partner.api.bri.co.id` (sandbox) | `https://partner.api.bri.co.id` (production)

**Authentication:** OAuth 2.0 Client Credentials

**Get Account Statement:**
```
GET /v1/account/statement
?accountNumber=1234567890&startDate=2025-01-01&endDate=2025-01-31
```

---

#### CIMB Niaga (API Banking)

**Base URL:** `https://apigw.cimbniaga.co.id`

**Authentication:** OAuth 2.0 + Mutual TLS (mTLS)

**Get Account Statement:**
```
GET /accounts/{accountNo}/statements
?fromDate=2025-01-01&toDate=2025-01-31
```

---

### 6. Test Bank Connection

```
POST /api/accounting/bank-connections/:connectionId/test
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connectionId": "conn_abc123",
    "status": "connected",
    "bankResponse": {
      "accountNumber": "1234567890",
      "accountName": "PT KIDKAZZ INDONESIA",
      "currency": "IDR",
      "currentBalance": 125750000
    },
    "latency": 245,
    "testedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

### 7. Get Bank Connection Status

```
GET /api/accounting/bank-connections
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "connectionId": "conn_abc123",
        "bankCode": "bca",
        "bankName": "Bank Central Asia",
        "bankAccountId": "1020",
        "accountNumber": "1234567890",
        "status": "connected",
        "autoSync": true,
        "lastSyncAt": "2025-01-15T06:00:00Z",
        "lastSyncStatus": "success",
        "lastSyncTransactions": 12,
        "nextSyncAt": "2025-01-16T06:00:00Z"
      },
      {
        "connectionId": "conn_def456",
        "bankCode": "bri",
        "bankName": "Bank Rakyat Indonesia",
        "bankAccountId": "1022",
        "accountNumber": "0987654321",
        "status": "connected",
        "autoSync": true,
        "lastSyncAt": "2025-01-15T06:00:00Z",
        "lastSyncStatus": "success",
        "lastSyncTransactions": 8,
        "nextSyncAt": "2025-01-16T06:00:00Z"
      }
    ]
  }
}
```

---

### 3. Match Bank Transaction

```
POST /api/accounting/bank-reconciliations/:id/match
```

**Request Body:**
```json
{
  "bankTransactionId": "bt_123",
  "matchType": "journal_entry",
  "matchedJournalId": "je_456",
  "notes": "Matched to supplier payment"
}
```

---

### 4. Create Adjustment Entry

```
POST /api/accounting/bank-reconciliations/:id/adjustments
```

**Request Body:**
```json
{
  "adjustmentType": "unidentified_credit",
  "date": "2025-01-31",
  "amount": 750000,
  "description": "Unidentified deposit - pending investigation",
  "debitAccount": "1020",
  "creditAccount": "1199",
  "notes": "Will identify and reclassify later"
}
```

---

### 5. Get Reconciliation Status

```
GET /api/accounting/bank-reconciliations/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reconciliationId": "recon_abc123",
    "bankAccountId": "1020",
    "bankAccountName": "Bank BCA",
    "statementDate": "2025-01-31",
    "status": "balanced",
    "bankStatementBalance": 125750000,
    "adjustedBankBalance": 121750000,
    "bookBalance": 123500000,
    "adjustedBookBalance": 121750000,
    "difference": 0,
    "outstandingChecks": [...],
    "depositsInTransit": [...],
    "adjustments": [...],
    "createdAt": "2025-02-01T10:00:00Z",
    "completedAt": "2025-02-01T11:30:00Z",
    "completedBy": "user_001"
  }
}
```

---

### 6. List Bank Reconciliations

```
GET /api/accounting/bank-reconciliations?bankAccountId=1020&year=2025
```

---

## Bank Reconciliation Report Format

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      BANK RECONCILIATION STATEMENT                            │
│                                                                               │
│  Company: PT Kidkazz Indonesia                                                │
│  Bank Account: BCA - 1234567890                                               │
│  Statement Date: January 31, 2025                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  BANK STATEMENT BALANCE                              Rp  125,750,000          │
│                                                                               │
│  Add: Deposits in Transit                                                     │
│       01/31 Customer payment - Toko ABC              Rp    3,500,000          │
│                                                      ─────────────────        │
│       Total Deposits in Transit                      Rp    3,500,000          │
│                                                                               │
│  Less: Outstanding Checks                                                     │
│       CHK-001234  01/28  PT Supplier Jaya            Rp   (5,000,000)         │
│       CHK-001235  01/30  PT Vendor Makmur            Rp   (2,500,000)         │
│                                                      ─────────────────        │
│       Total Outstanding Checks                       Rp   (7,500,000)         │
│                                                                               │
│  ADJUSTED BANK BALANCE                               Rp  121,750,000          │
│                                                      ═════════════════        │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  BOOK BALANCE (per General Ledger)                   Rp  123,500,000          │
│                                                                               │
│  Add:                                                                         │
│       Interest earned                                Rp      125,000          │
│       Other credits                                  Rp      640,000          │
│                                                      ─────────────────        │
│       Total Additions                                Rp      765,000          │
│                                                                               │
│  Less:                                                                        │
│       Bank service charges                           Rp      (15,000)         │
│       NSF check - Customer XYZ                       Rp   (2,500,000)         │
│                                                      ─────────────────        │
│       Total Deductions                               Rp   (2,515,000)         │
│                                                                               │
│  ADJUSTED BOOK BALANCE                               Rp  121,750,000          │
│                                                      ═════════════════        │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  DIFFERENCE                                          Rp            0          │
│                                                      ═════════════════        │
│  Status: RECONCILED                                                           │
│                                                                               │
│  Prepared by: Accounting Staff          Date: 02/01/2025                      │
│  Reviewed by: Finance Manager           Date: 02/02/2025                      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### BankReconciliation Table

```sql
CREATE TABLE bank_reconciliations (
  id TEXT PRIMARY KEY,

  -- Bank account
  bank_account_code TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,

  -- Period
  statement_date TEXT NOT NULL,
  statement_month TEXT NOT NULL, -- "2025-01"

  -- Balances
  statement_ending_balance INTEGER NOT NULL,
  book_ending_balance INTEGER NOT NULL,
  adjusted_bank_balance INTEGER NOT NULL,
  adjusted_book_balance INTEGER NOT NULL,
  difference INTEGER NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'in_progress' | 'balanced' | 'unbalanced'

  -- Audit
  created_at INTEGER NOT NULL,
  created_by TEXT,
  completed_at INTEGER,
  completed_by TEXT,
  reviewed_at INTEGER,
  reviewed_by TEXT,
  notes TEXT
);

CREATE INDEX idx_br_account ON bank_reconciliations(bank_account_code);
CREATE INDEX idx_br_month ON bank_reconciliations(statement_month);
CREATE UNIQUE INDEX idx_br_account_month ON bank_reconciliations(bank_account_code, statement_month);
```

### BankReconciliationItems Table

```sql
CREATE TABLE bank_reconciliation_items (
  id TEXT PRIMARY KEY,

  reconciliation_id TEXT NOT NULL REFERENCES bank_reconciliations(id),

  -- Type
  item_type TEXT NOT NULL,
  -- 'outstanding_check' | 'deposit_in_transit' | 'service_charge' | 'interest'
  -- | 'nsf_check' | 'unidentified_credit' | 'unidentified_debit' | 'error_correction'

  -- Details
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference TEXT, -- check number, transaction ID
  amount INTEGER NOT NULL,

  -- For NSF checks
  customer_id TEXT,

  -- Journal entry (if created)
  journal_entry_id TEXT,
  debit_account TEXT,
  credit_account TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending' | 'cleared' | 'void'

  -- Audit
  created_at INTEGER NOT NULL,
  notes TEXT
);

CREATE INDEX idx_bri_reconciliation ON bank_reconciliation_items(reconciliation_id);
CREATE INDEX idx_bri_type ON bank_reconciliation_items(item_type);
```

---

## UI Mockup

### Bank Reconciliation Form

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🏦 Bank Reconciliation                                               [Save] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bank Account *                    Statement Date *                          │
│  ┌─────────────────────────────┐   ┌────────────────────┐                   │
│  │ ▼ 1020 - Bank BCA           │   │ 📅 31/01/2025      │                   │
│  └─────────────────────────────┘   └────────────────────┘                   │
│                                                                              │
│  Bank Statement Balance *          Book Balance (GL)                         │
│  ┌─────────────────────────────┐   ┌────────────────────┐                   │
│  │ Rp 125,750,000              │   │ Rp 123,500,000     │  (auto-filled)    │
│  └─────────────────────────────┘   └────────────────────┘                   │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  📥 DEPOSITS IN TRANSIT                                          [+ Add]    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Date       │ Description                        │ Amount              │ │
│  ├─────────────┼────────────────────────────────────┼─────────────────────┤ │
│  │  31/01/2025 │ Customer payment - Toko ABC        │ Rp 3,500,000    [x] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  Total: Rp 3,500,000                                                         │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  📤 OUTSTANDING CHECKS                                           [+ Add]    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Check #    │ Date       │ Payee                 │ Amount              │ │
│  ├─────────────┼────────────┼───────────────────────┼─────────────────────┤ │
│  │  CHK-001234 │ 28/01/2025 │ PT Supplier Jaya      │ Rp 5,000,000    [x] │ │
│  │  CHK-001235 │ 30/01/2025 │ PT Vendor Makmur      │ Rp 2,500,000    [x] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  Total: Rp 7,500,000                                                         │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  📝 BOOK ADJUSTMENTS (Creates Journal Entries)                   [+ Add]    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Type            │ Date       │ Description        │ Amount    │ Acct  │ │
│  ├──────────────────┼────────────┼────────────────────┼───────────┼───────┤ │
│  │  Service Charge  │ 31/01/2025 │ Monthly admin fee  │ (15,000)  │ 6510  │ │
│  │  Interest Earned │ 31/01/2025 │ Interest income    │ 125,000   │ 4210  │ │
│  │  NSF Check       │ 25/01/2025 │ Bounced - Cust XYZ │(2,500,000)│ 1110  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  RECONCILIATION SUMMARY                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Bank Statement Balance           Rp  125,750,000                      │ │
│  │  + Deposits in Transit            Rp    3,500,000                      │ │
│  │  - Outstanding Checks             Rp   (7,500,000)                     │ │
│  │  ────────────────────────────────────────────────                      │ │
│  │  Adjusted Bank Balance            Rp  121,750,000                      │ │
│  │                                                                        │ │
│  │  Book Balance                     Rp  123,500,000                      │ │
│  │  + Bank Interest                  Rp      125,000                      │ │
│  │  - Service Charges                Rp      (15,000)                     │ │
│  │  - NSF Checks                     Rp   (2,500,000)                     │ │
│  │  + Other Adjustments              Rp      640,000                      │ │
│  │  ────────────────────────────────────────────────                      │ │
│  │  Adjusted Book Balance            Rp  121,750,000                      │ │
│  │                                                                        │ │
│  │  ════════════════════════════════════════════════                      │ │
│  │  DIFFERENCE                       Rp            0   ✅ BALANCED        │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Notes                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ January 2025 reconciliation completed. All items identified.          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [Cancel]                              [Save Draft]  [Complete Reconciliation]│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

1. **One reconciliation per account per month** - Cannot create duplicate reconciliations
2. **Balance must match** - Adjusted bank balance must equal adjusted book balance to mark as complete
3. **All adjustments require accounts** - Book adjustments must specify debit/credit accounts
4. **Statement date validation** - Statement date must be end of month
5. **Previous month must be reconciled** - Cannot skip months
6. **Outstanding items carry forward** - Uncleared items from previous reconciliation appear automatically

---

## Integration with Other Features

| Feature | Integration |
|---------|-------------|
| **A/R Collection** | NSF checks update customer A/R balance |
| **A/P Payment** | Outstanding checks tracked until cleared |
| **Cash Flow Statement** | Reconciled bank balance feeds cash flow report |
| **Financial Reports** | Only reconciled balances used for reporting |

---

## Related Documentation

- [Fund Transfer Between Accounts](./FUND_TRANSFER_BETWEEN_ACCOUNTS.md)
- [Accounts Receivable Collection Entry](./ACCOUNTS_RECEIVABLE_COLLECTION_ENTRY.md)
- [Accounts Payable Payment Entry](./ACCOUNTS_PAYABLE_PAYMENT_ENTRY.md)
- [Business Rules](./BUSINESS_RULES.md) - Reconciliation business rules (Rules 20-22)
