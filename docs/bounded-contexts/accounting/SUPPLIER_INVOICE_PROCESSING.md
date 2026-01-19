# Supplier Invoice Processing with AI Extraction

## Overview

This document describes the automated workflow for processing supplier invoices (Faktur Pembelian) using Reducto.ai for PDF extraction and intelligent matching with Good Receipts (GR) and Purchase Orders (PO).

## Procurement Scenarios

Not all procurement follows the same workflow. Our system supports multiple scenarios:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROCUREMENT WORKFLOW SCENARIOS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO A: Full PO Workflow (3-Way Matching)                               │
│  ════════════════════════════════════════════════                            │
│  PO Created → Goods Received (GR) → Invoice Received → Match All Three       │
│  Example: Large suppliers, formal procurement                                │
│                                                                              │
│  SCENARIO B: No PO Workflow (2-Way Matching)                                 │
│  ════════════════════════════════════════════════                            │
│  Goods Received (GR) → Invoice Received → Match GR with Invoice              │
│  Example: Small suppliers, urgent purchases, suppliers who don't accept PO   │
│                                                                              │
│  SCENARIO C: Direct Expense (Services/Non-Inventory)                         │
│  ════════════════════════════════════════════════                            │
│  Invoice Received → Direct Expense Entry (NO GR - not physical goods)        │
│  Example: Services, subscriptions, utilities, professional fees              │
│                                                                              │
│  SCENARIO D: Invoice with Extra Items                                        │
│  ════════════════════════════════════════════════                            │
│  Invoice has items NOT in original PO                                        │
│  Example: Supplier added bonus items, substitutions, or corrections          │
│                                                                              │
│  SCENARIO E: Invoice with New Products                                       │
│  ════════════════════════════════════════════════                            │
│  Invoice has items NOT in Product Catalog                                    │
│  Example: First-time purchase of new product line                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Good Receipt (GR) Process

**IMPORTANT**: Good Receipt is created by warehouse/store employee during physical inbound process, NOT from invoice.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOOD RECEIPT WORKFLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SUPPLIER                           WAREHOUSE/STORE                          │
│  ════════                           ═══════════════                          │
│                                                                              │
│  ┌─────────────────┐               ┌─────────────────────────────────────┐  │
│  │ Delivery Note   │               │ INBOUND PROCESS                      │  │
│  │ (Surat Jalan)   │    ────►      │                                      │  │
│  │                 │               │ 1. Receive goods from supplier       │  │
│  │ SJ-2026-0125    │               │ 2. Check items against Surat Jalan   │  │
│  │ 100 pcs Widget  │               │ 3. Verify quantity & quality         │  │
│  │ 50 pcs Gadget   │               │ 4. Create Good Receipt (GR)          │  │
│  └─────────────────┘               │    as CONTRA to Surat Jalan          │  │
│                                    │ 5. Put items to storage location     │  │
│                                    │ 6. Update inventory stock            │  │
│                                    └─────────────────────────────────────┘  │
│                                                     │                        │
│                                                     ▼                        │
│                                    ┌─────────────────────────────────────┐  │
│                                    │ GOOD RECEIPT                         │  │
│                                    │ GR-2026-0125                         │  │
│                                    │                                      │  │
│                                    │ Ref: SJ-2026-0125                    │  │
│                                    │ Received: 100 pcs Widget ✓           │  │
│                                    │ Received: 48 pcs Gadget              │  │
│                                    │ (2 pcs damaged - noted)              │  │
│                                    │                                      │  │
│                                    │ Received by: [Employee Name]         │  │
│                                    │ Date: 2026-01-15                     │  │
│                                    └─────────────────────────────────────┘  │
│                                                     │                        │
│                                                     ▼                        │
│                                    ┌─────────────────────────────────────┐  │
│                                    │ LATER: Invoice arrives               │  │
│                                    │ Match Invoice ←→ GR ←→ PO (if any)   │  │
│                                    └─────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### GR vs Invoice Timing

```
Timeline:
═════════════════════════════════════════════════════════════════════════════

Day 1: PO Created (optional)
       ↓
Day 5: Goods shipped by supplier with Surat Jalan
       ↓
Day 7: Goods arrive → Warehouse creates GR (contra Surat Jalan)
       ↓ (GR status: PENDING_INVOICE - goods checked but NOT in inventory yet)
       ↓
Day 14: Invoice arrives from supplier
        ↓
        Match: Invoice ←→ GR ←→ PO
        ↓
        Reconcile & Confirm
        ↓
        ════════════════════════════════════════════════════════════════════
        NOW: Inventory Updated + AP Entry Created (with confirmed cost)
        ════════════════════════════════════════════════════════════════════
```

### Why Inventory Updates AFTER Invoice Reconciliation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INVENTORY UPDATE TIMING                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ❌ WRONG: Update inventory when GR created                                  │
│  ─────────────────────────────────────────────                               │
│  Problem: We don't know the ACTUAL COST yet!                                 │
│  - PO price might differ from invoice price                                  │
│  - Supplier might apply discounts                                            │
│  - Additional charges (shipping, handling) on invoice                        │
│  - Price changes between PO and delivery                                     │
│                                                                              │
│  ✅ CORRECT: Update inventory when Invoice reconciled with GR                │
│  ─────────────────────────────────────────────────────────                   │
│  Benefits:                                                                   │
│  - Inventory recorded with CONFIRMED cost from invoice                       │
│  - Proper cost basis for COGS calculation                                    │
│  - Accurate inventory valuation                                              │
│  - Clean audit trail (GR + Invoice = Inventory entry)                        │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  GR Status Flow:                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ PENDING      │ →  │ PENDING      │ →  │ COMPLETED    │                   │
│  │ INVOICE      │    │ RECONCILIATION    │ (Inventory   │                   │
│  │              │    │              │    │  Updated)    │                   │
│  │ Goods in     │    │ Invoice      │    │              │                   │
│  │ warehouse    │    │ received,    │    │ Cost         │                   │
│  │ (physical)   │    │ matching     │    │ confirmed    │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- GR is created when **goods physically arrive** - records WHAT was received
- GR is the **contra document** to supplier's Delivery Note (Surat Jalan)
- **Inventory is NOT updated** when GR created (cost not yet confirmed)
- **Inventory IS updated** only after invoice is reconciled with GR
- This ensures inventory has **accurate cost** from actual invoice
- Services/utilities have **NO GR** - they go directly to expense accounts

---

## PDF Invoice Extraction with Reducto.ai

### Extraction Process

```typescript
interface SupplierInvoiceExtraction {
  // Invoice Header
  invoiceNumber: string;
  invoiceDate: string;          // YYYY-MM-DD
  dueDate?: string;
  supplierName: string;
  supplierNPWP?: string;        // Tax ID
  supplierAddress?: string;

  // Reference Numbers
  poNumber?: string;            // May be empty if no PO workflow
  deliveryNoteNumber?: string;  // Surat Jalan
  fakturPajakNumber?: string;   // Tax Invoice Number

  // Line Items
  items: InvoiceLineItem[];

  // Totals
  subtotal: number;
  discountAmount?: number;
  ppnAmount?: number;           // VAT 11%
  pphAmount?: number;           // Withholding tax if any
  grandTotal: number;

  // Payment Info
  bankAccount?: string;
  paymentTerms?: string;

  // Extraction Metadata
  confidence: number;           // 0-100
  extractedFields: string[];
  uncertainFields: string[];
}

interface InvoiceLineItem {
  lineNumber: number;
  description: string;
  sku?: string;                 // May be supplier's SKU
  barcode?: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discount?: number;
  lineTotal: number;

  // Extraction confidence
  confidence: number;
  matchStatus?: 'matched' | 'partial' | 'unknown';
}
```

### Reducto.ai Integration

```typescript
async function extractSupplierInvoice(
  file: File
): Promise<SupplierInvoiceExtraction> {

  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', 'invoice');
  formData.append('locale', 'id-ID');  // Indonesian locale

  // Custom extraction schema for Indonesian invoices
  formData.append('schema', JSON.stringify({
    fields: [
      { name: 'invoice_number', aliases: ['No. Faktur', 'Invoice No', 'Nomor Invoice'] },
      { name: 'invoice_date', aliases: ['Tanggal', 'Date', 'Tgl Faktur'] },
      { name: 'supplier_name', aliases: ['Dari', 'From', 'Supplier', 'Penjual'] },
      { name: 'supplier_npwp', aliases: ['NPWP', 'Tax ID'] },
      { name: 'po_number', aliases: ['No. PO', 'PO Number', 'Ref PO'] },
      { name: 'delivery_note', aliases: ['No. SJ', 'Surat Jalan', 'DO Number'] },
      { name: 'faktur_pajak', aliases: ['No. Faktur Pajak', 'Tax Invoice'] },
      { name: 'subtotal', aliases: ['Subtotal', 'DPP', 'Dasar Pengenaan Pajak'] },
      { name: 'ppn', aliases: ['PPN', 'VAT', 'Pajak 11%'] },
      { name: 'grand_total', aliases: ['Total', 'Grand Total', 'Jumlah'] }
    ],
    line_items: {
      columns: ['description', 'qty', 'uom', 'unit_price', 'total'],
      aliases: {
        description: ['Nama Barang', 'Deskripsi', 'Item', 'Uraian'],
        qty: ['Qty', 'Jumlah', 'Kuantitas'],
        uom: ['Satuan', 'Unit', 'UOM'],
        unit_price: ['Harga', 'Harga Satuan', 'Unit Price', '@'],
        total: ['Total', 'Jumlah', 'Amount']
      }
    }
  }));

  const response = await fetch('https://api.reducto.ai/v1/extract', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDUCTO_API_KEY}`
    },
    body: formData
  });

  const result = await response.json();
  return mapToInvoiceExtraction(result);
}
```

---

## Matching Algorithm

### Step 1: Supplier Identification

```typescript
async function identifySupplier(
  extraction: SupplierInvoiceExtraction
): Promise<SupplierMatch> {

  // Try multiple matching strategies
  const strategies = [
    // 1. NPWP exact match (most reliable)
    () => findSupplierByNPWP(extraction.supplierNPWP),

    // 2. Name fuzzy match
    () => findSupplierByName(extraction.supplierName),

    // 3. Bank account match (if we have payment history)
    () => findSupplierByBankAccount(extraction.bankAccount),

    // 4. Previous invoice pattern
    () => findSupplierByInvoicePattern(extraction.invoiceNumber)
  ];

  for (const strategy of strategies) {
    const result = await strategy();
    if (result && result.confidence > 0.8) {
      return result;
    }
  }

  // No confident match - return as new/unknown supplier
  return {
    supplierId: null,
    supplierName: extraction.supplierName,
    confidence: 0,
    isNew: true,
    suggestedMatches: await getSuggestedSuppliers(extraction)
  };
}
```

### Step 2: Document Matching

```typescript
interface MatchingResult {
  scenario: 'WITH_PO' | 'WITHOUT_PO' | 'DIRECT_INVOICE';

  // Matched documents
  purchaseOrder?: PurchaseOrder;
  goodsReceipts: GoodsReceipt[];

  // Line item matching
  lineMatches: LineMatchResult[];

  // Variances
  variances: Variance[];

  // Items requiring attention
  unmatchedInvoiceItems: InvoiceLineItem[];
  unmatchedGRItems: GoodsReceiptLine[];
  newProducts: NewProductItem[];
}

async function matchInvoiceWithDocuments(
  extraction: SupplierInvoiceExtraction,
  supplierId: string
): Promise<MatchingResult> {

  const result: MatchingResult = {
    scenario: 'DIRECT_INVOICE',
    goodsReceipts: [],
    lineMatches: [],
    variances: [],
    unmatchedInvoiceItems: [],
    unmatchedGRItems: [],
    newProducts: []
  };

  // SCENARIO A: Has PO Reference
  if (extraction.poNumber) {
    const po = await findPurchaseOrder(extraction.poNumber, supplierId);
    if (po) {
      result.scenario = 'WITH_PO';
      result.purchaseOrder = po;

      // Find all GRs linked to this PO
      result.goodsReceipts = await findGoodsReceiptsByPO(po.id);
    }
  }

  // SCENARIO B: No PO, try to find GR by delivery note or date range
  if (!result.purchaseOrder) {
    const grs = await findGoodsReceipts({
      supplierId,
      deliveryNoteNumber: extraction.deliveryNoteNumber,
      dateRange: {
        from: subDays(parseDate(extraction.invoiceDate), 30),
        to: parseDate(extraction.invoiceDate)
      },
      status: 'PENDING_INVOICE'  // GRs waiting for invoice
    });

    if (grs.length > 0) {
      result.scenario = 'WITHOUT_PO';
      result.goodsReceipts = grs;
    }
  }

  // Match line items
  result.lineMatches = await matchLineItems(
    extraction.items,
    result.purchaseOrder,
    result.goodsReceipts
  );

  // Identify variances and unmatched items
  categorizeMatchResults(result);

  return result;
}
```

### Step 3: Line Item Matching

```typescript
interface LineMatchResult {
  invoiceLine: InvoiceLineItem;

  // Matched references
  poLine?: PurchaseOrderLine;
  grLines: GoodsReceiptLine[];
  catalogProduct?: Product;

  // Match quality
  matchType: 'EXACT' | 'PARTIAL' | 'NEW_ITEM' | 'NEW_PRODUCT';
  confidence: number;

  // Variances (if any)
  quantityVariance?: number;
  priceVariance?: number;
}

async function matchLineItems(
  invoiceLines: InvoiceLineItem[],
  po: PurchaseOrder | undefined,
  grs: GoodsReceipt[]
): Promise<LineMatchResult[]> {

  const results: LineMatchResult[] = [];

  for (const invLine of invoiceLines) {
    const match: LineMatchResult = {
      invoiceLine: invLine,
      grLines: [],
      matchType: 'NEW_PRODUCT',
      confidence: 0
    };

    // Step 3a: Try to match with Product Catalog
    const catalogMatch = await findProductInCatalog(invLine);
    if (catalogMatch) {
      match.catalogProduct = catalogMatch.product;
      match.confidence = catalogMatch.confidence;
    }

    // Step 3b: Try to match with PO lines (if PO exists)
    if (po) {
      const poLineMatch = findMatchingPOLine(invLine, po.lines, match.catalogProduct);
      if (poLineMatch) {
        match.poLine = poLineMatch.line;
        match.matchType = poLineMatch.exact ? 'EXACT' : 'PARTIAL';
        match.confidence = Math.max(match.confidence, poLineMatch.confidence);

        // Calculate variances
        match.priceVariance = invLine.unitPrice - poLineMatch.line.unitPrice;
      }
    }

    // Step 3c: Match with GR lines
    for (const gr of grs) {
      const grLineMatches = findMatchingGRLines(invLine, gr.lines, match.catalogProduct);
      match.grLines.push(...grLineMatches);
    }

    // Calculate quantity variance
    if (match.grLines.length > 0) {
      const totalReceived = match.grLines.reduce((sum, l) => sum + l.quantity, 0);
      match.quantityVariance = invLine.quantity - totalReceived;
    }

    // Determine final match type
    if (!match.catalogProduct) {
      match.matchType = 'NEW_PRODUCT';
    } else if (!match.poLine && match.grLines.length === 0) {
      match.matchType = 'NEW_ITEM';  // In catalog but not in PO/GR
    }

    results.push(match);
  }

  return results;
}
```

### Product Catalog Matching

```typescript
interface ProductCatalogMatch {
  product: Product;
  confidence: number;
  matchedBy: 'SKU' | 'BARCODE' | 'NAME' | 'SUPPLIER_SKU';
}

async function findProductInCatalog(
  invLine: InvoiceLineItem
): Promise<ProductCatalogMatch | null> {

  // Priority 1: Barcode (most reliable)
  if (invLine.barcode) {
    const product = await findProductByBarcode(invLine.barcode);
    if (product) {
      return { product, confidence: 1.0, matchedBy: 'BARCODE' };
    }
  }

  // Priority 2: Supplier SKU mapping
  if (invLine.sku) {
    const mapping = await findSupplierSKUMapping(invLine.sku);
    if (mapping) {
      return { product: mapping.product, confidence: 0.95, matchedBy: 'SUPPLIER_SKU' };
    }
  }

  // Priority 3: Our SKU (if supplier uses our SKU)
  if (invLine.sku) {
    const product = await findProductBySKU(invLine.sku);
    if (product) {
      return { product, confidence: 0.9, matchedBy: 'SKU' };
    }
  }

  // Priority 4: Fuzzy name matching
  const nameMatches = await fuzzyMatchProductName(invLine.description);
  if (nameMatches.length > 0 && nameMatches[0].score > 0.85) {
    return {
      product: nameMatches[0].product,
      confidence: nameMatches[0].score,
      matchedBy: 'NAME'
    };
  }

  // No match found
  return null;
}
```

---

## Handling Unknown Items

### Scenario D: Invoice Items Not in PO

When invoice contains items that weren't in the original Purchase Order:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTRA ITEMS HANDLING WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CASE 1: Bonus/Free Items (Quantity > 0, Price = 0)                          │
│  ──────────────────────────────────────────────────                          │
│  → Auto-accept as bonus                                                      │
│  → Create GR for the bonus items                                             │
│  → No AP entry for these items                                               │
│                                                                              │
│  CASE 2: Substitution (Original item out of stock)                           │
│  ──────────────────────────────────────────────────                          │
│  → Prompt user to confirm substitution                                       │
│  → Link to original PO line                                                  │
│  → Handle price difference                                                   │
│                                                                              │
│  CASE 3: Additional Order (Supplier added items)                             │
│  ──────────────────────────────────────────────────                          │
│  → Requires approval if above threshold                                      │
│  → Can reject items                                                          │
│  → Partial invoice acceptance                                                │
│                                                                              │
│  CASE 4: Correction/Adjustment                                               │
│  ──────────────────────────────────────────────────                          │
│  → Price adjustments                                                         │
│  → Quantity corrections                                                      │
│  → Link to original transaction                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
interface ExtraItemDecision {
  invoiceLine: InvoiceLineItem;
  decision: 'ACCEPT' | 'REJECT' | 'PENDING_APPROVAL';
  reason: string;

  // For substitutions
  substituteFor?: {
    poLineId: string;
    originalProduct: string;
  };

  // Approval workflow
  requiresApproval: boolean;
  approvalThreshold?: number;
  approver?: string;
}

async function handleExtraItems(
  extraItems: InvoiceLineItem[],
  context: { supplierId: string; poId?: string; userId: string }
): Promise<ExtraItemDecision[]> {

  const decisions: ExtraItemDecision[] = [];

  for (const item of extraItems) {
    const decision: ExtraItemDecision = {
      invoiceLine: item,
      decision: 'PENDING_APPROVAL',
      reason: '',
      requiresApproval: true
    };

    // Case 1: Bonus items (price = 0)
    if (item.unitPrice === 0 || item.lineTotal === 0) {
      decision.decision = 'ACCEPT';
      decision.reason = 'Bonus/free item from supplier';
      decision.requiresApproval = false;
    }
    // Case 2: Below auto-approval threshold
    else if (item.lineTotal <= AUTO_APPROVAL_THRESHOLD) {
      decision.decision = 'ACCEPT';
      decision.reason = `Below auto-approval threshold (${formatCurrency(AUTO_APPROVAL_THRESHOLD)})`;
      decision.requiresApproval = false;
    }
    // Case 3: Requires approval
    else {
      decision.decision = 'PENDING_APPROVAL';
      decision.reason = 'Additional item requires approval';
      decision.requiresApproval = true;
      decision.approvalThreshold = item.lineTotal;
      decision.approver = await getApproverForAmount(item.lineTotal);
    }

    decisions.push(decision);
  }

  return decisions;
}
```

### Scenario E: New Products Not in Catalog

When invoice contains products that don't exist in the Product Service catalog:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEW PRODUCT WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                         │
│  │ Invoice Item    │                                                         │
│  │ "Widget XYZ"    │                                                         │
│  │ SKU: SUP-12345  │                                                         │
│  │ Qty: 100        │                                                         │
│  │ @50,000         │                                                         │
│  └────────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     PRODUCT NOT FOUND IN CATALOG                         ││
│  │                                                                          ││
│  │  Options:                                                                ││
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         ││
│  │  │ 1. CREATE NEW    │ │ 2. MAP TO        │ │ 3. PROCESS AS    │         ││
│  │  │    PRODUCT       │ │    EXISTING      │ │    ONE-TIME      │         ││
│  │  │                  │ │                  │ │                  │         ││
│  │  │ Create new       │ │ This is actually │ │ Don't add to     │         ││
│  │  │ product in       │ │ product "ABC"    │ │ catalog, process │         ││
│  │  │ catalog first    │ │ with different   │ │ as expense       │         ││
│  │  │                  │ │ supplier SKU     │ │                  │         ││
│  │  └──────────────────┘ └──────────────────┘ └──────────────────┘         ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
interface NewProductDecision {
  invoiceLine: InvoiceLineItem;
  action: 'CREATE_PRODUCT' | 'MAP_TO_EXISTING' | 'PROCESS_AS_EXPENSE' | 'HOLD';

  // For CREATE_PRODUCT
  productDraft?: {
    name: string;
    sku: string;
    suggestedCategory?: string;
    suggestedUOM?: string;
    supplierSKU: string;
    initialCost: number;
  };

  // For MAP_TO_EXISTING
  mappedProduct?: {
    productId: string;
    productName: string;
    createSupplierSKUMapping: boolean;
  };

  // For PROCESS_AS_EXPENSE
  expenseAccount?: string;
}

interface NewProductUI {
  // UI State for handling new products
  invoiceLine: InvoiceLineItem;
  suggestedProducts: ProductSuggestion[];  // Fuzzy matches

  // Form for creating new product
  newProductForm?: {
    name: string;
    sku: string;
    barcode?: string;
    category: string;
    uom: string;
    basePrice: number;
    supplierSKU: string;
  };
}
```

### UI for New Product Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REVIEW: UNKNOWN PRODUCTS                                  │
│                                                                              │
│  Invoice: INV-2026-0125 from PT ABC Supplier                                 │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ⚠️  3 items could not be matched to product catalog                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Item 1: "Widget Model XYZ-500"                                          ││
│  │ Supplier SKU: SUP-12345  |  Qty: 100 PCS  |  @Rp 50,000  |  Rp 5,000,000││
│  │                                                                          ││
│  │ Similar products found:                                                  ││
│  │ ○ Widget Model XYZ-400 (SKU: WDG-400) - 92% match                       ││
│  │ ○ Widget Model XYZ-300 (SKU: WDG-300) - 85% match                       ││
│  │                                                                          ││
│  │ Action: ○ Map to existing product  ────────────────────────────────────▼││
│  │         ● Create new product                                            ││
│  │         ○ Process as one-time expense                                   ││
│  │                                                                          ││
│  │ ┌─────────────────────────────────────────────────────────────────────┐ ││
│  │ │ NEW PRODUCT DETAILS                                                  │ ││
│  │ │                                                                      │ ││
│  │ │ Name:     [Widget Model XYZ-500                    ]                │ ││
│  │ │ SKU:      [WDG-500           ] (auto-generated)                     │ ││
│  │ │ Category: [Electronics       ▼]                                     │ ││
│  │ │ UOM:      [PCS              ▼]                                      │ ││
│  │ │ Barcode:  [                   ] (optional)                          │ ││
│  │ │                                                                      │ ││
│  │ │ ☑ Create supplier SKU mapping (SUP-12345 → WDG-500)                 │ ││
│  │ │ ☑ Set initial cost from this invoice (Rp 50,000)                    │ ││
│  │ └─────────────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Item 2: "Jasa Pengiriman Express"                                       ││
│  │ Qty: 1 LS  |  @Rp 150,000  |  Rp 150,000                                ││
│  │                                                                          ││
│  │ Action: ○ Map to existing product                                       ││
│  │         ○ Create new product                                            ││
│  │         ● Process as one-time expense                                   ││
│  │                                                                          ││
│  │ Expense Account: [6120 - Biaya Pengiriman         ▼]                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Item 3: "Packaging Material Custom"                                     ││
│  │ Supplier SKU: PKG-CUSTOM  |  Qty: 500 PCS  |  @Rp 2,500  |  Rp 1,250,000││
│  │                                                                          ││
│  │ Action: ● Map to existing product                                       ││
│  │         ○ Create new product                                            ││
│  │         ○ Process as one-time expense                                   ││
│  │                                                                          ││
│  │ Map to: [Packaging Material Standard (PKG-001)   ▼]                     ││
│  │ ☑ Create supplier SKU mapping (PKG-CUSTOM → PKG-001)                    ││
│  │ ⚠️  Price differs: Catalog Rp 2,000 vs Invoice Rp 2,500                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│                                        [Cancel]  [Save & Continue Processing]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Supplier SKU Mapping

For items where supplier uses different SKU than our catalog:

```typescript
// Store mapping between supplier SKU and our product
interface SupplierProductMapping {
  id: string;
  supplierId: string;
  supplierSKU: string;           // Supplier's SKU
  supplierProductName: string;   // Supplier's product name
  productId: string;             // Our product ID
  productSKU: string;            // Our SKU
  productName: string;           // Our product name

  // Conversion if UOM differs
  uomConversion?: {
    supplierUOM: string;
    ourUOM: string;
    conversionFactor: number;    // supplier qty * factor = our qty
  };

  // Price tracking
  lastPurchasePrice: number;
  priceHistory: PriceHistoryEntry[];

  // Metadata
  createdAt: Date;
  createdBy: string;
  usageCount: number;            // How many times used
}

// Schema
CREATE TABLE supplier_product_mappings (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  supplier_sku TEXT NOT NULL,
  supplier_product_name TEXT,
  product_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,

  -- UOM conversion
  supplier_uom TEXT,
  our_uom TEXT,
  conversion_factor REAL DEFAULT 1.0,

  -- Pricing
  last_purchase_price INTEGER,

  -- Audit
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,

  UNIQUE(supplier_id, supplier_sku)
);

CREATE INDEX idx_spm_supplier ON supplier_product_mappings(supplier_id);
CREATE INDEX idx_spm_product ON supplier_product_mappings(product_id);
```

---

## GR vs Invoice Variance Handling

When reconciling Good Receipt with Invoice, discrepancies may occur. Here's how to handle each scenario:

### Types of Variances

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GR vs INVOICE VARIANCE TYPES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. QUANTITY VARIANCE                                                        │
│  ════════════════════                                                        │
│  GR: Received 100 pcs    vs    Invoice: Billed 98 pcs                        │
│  Variance: +2 pcs (received more than billed)                                │
│                                                                              │
│  2. PRICE VARIANCE                                                           │
│  ═════════════════                                                           │
│  Expected (from PO): @Rp 50,000    vs    Invoice: @Rp 52,000                 │
│  Variance: +Rp 2,000 per unit (higher than expected)                         │
│                                                                              │
│  3. ITEM VARIANCE                                                            │
│  ═══════════════                                                             │
│  GR has items not in Invoice (received but not billed)                       │
│  Invoice has items not in GR (billed but not received)                       │
│                                                                              │
│  4. MISSING GR                                                               │
│  ═══════════════                                                             │
│  Invoice received but no matching GR exists                                  │
│  (goods not yet received or GR not created)                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Variance Resolution Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VARIANCE RESOLUTION WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Invoice Matched with GR                                                     │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                         │
│  │ Check Variances │                                                         │
│  └────────┬────────┘                                                         │
│           │                                                                  │
│     ┌─────┴─────┐                                                            │
│     │           │                                                            │
│     ▼           ▼                                                            │
│  No Variance   Has Variance                                                  │
│     │           │                                                            │
│     │     ┌─────┴─────────────────────────────────────┐                      │
│     │     │                                           │                      │
│     │     ▼                                           ▼                      │
│     │  Within Tolerance?                         Outside Tolerance           │
│     │  (auto-accept)                             (requires action)           │
│     │     │                                           │                      │
│     │     │                           ┌───────────────┼───────────────┐      │
│     │     │                           │               │               │      │
│     │     │                           ▼               ▼               ▼      │
│     │     │                     Accept with    Request        Reject         │
│     │     │                     Note           Correction     Invoice        │
│     │     │                           │               │               │      │
│     └─────┴───────────────────────────┴───────────────┘               │      │
│                         │                                             │      │
│                         ▼                                             │      │
│               Process Invoice                              Return to         │
│               Update Inventory                             Supplier          │
│               Create AP Entry                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Variance Handling by Type

#### 1. Quantity Variance

```typescript
interface QuantityVariance {
  productId: string;
  productName: string;
  grQuantity: number;        // What we received (physical)
  invoiceQuantity: number;   // What supplier billed
  variance: number;          // grQuantity - invoiceQuantity
  varianceType: 'OVER_RECEIVED' | 'UNDER_RECEIVED';
}

// Resolution options
type QuantityVarianceResolution =
  | 'ACCEPT_INVOICE_QTY'      // Use invoice qty, adjust GR
  | 'ACCEPT_GR_QTY'           // Use GR qty, request invoice correction
  | 'ACCEPT_WITH_NOTE'        // Accept difference, document reason
  | 'RETURN_EXCESS'           // Return extra goods to supplier
  | 'REQUEST_CREDIT_NOTE';    // Request credit for missing items
```

**Scenario A: Received MORE than Invoiced (Over-Receipt)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OVER-RECEIPT: GR = 100 pcs, Invoice = 98 pcs                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Options:                                                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ○ Accept invoice quantity (98 pcs)                                      ││
│  │   - Record 98 pcs in inventory at invoice cost                          ││
│  │   - Return 2 pcs to supplier OR                                         ││
│  │   - Keep as free goods (update GR note)                                 ││
│  │                                                                          ││
│  │ ● Accept GR quantity (100 pcs) - request invoice correction             ││
│  │   - Request revised invoice for 100 pcs                                 ││
│  │   - Hold processing until correction received                           ││
│  │                                                                          ││
│  │ ○ Accept with variance note                                             ││
│  │   - Record 98 pcs at invoice cost                                       ││
│  │   - Record 2 pcs as bonus/free goods (zero cost)                        ││
│  │   - Add note: "2 pcs bonus dari supplier"                               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Variance Note: [Supplier memberikan bonus 2 pcs untuk order ini    ]       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Scenario B: Received LESS than Invoiced (Under-Receipt)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UNDER-RECEIPT: GR = 98 pcs, Invoice = 100 pcs                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ⚠️  WARNING: Supplier billed more than we received!                         │
│                                                                              │
│  Options:                                                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ● Accept GR quantity only (98 pcs)                                      ││
│  │   - Record 98 pcs in inventory                                          ││
│  │   - Request credit note for 2 pcs                                       ││
│  │   - Or request replacement delivery                                     ││
│  │                                                                          ││
│  │ ○ Reject invoice                                                        ││
│  │   - Return invoice to supplier                                          ││
│  │   - Request corrected invoice for 98 pcs                                ││
│  │                                                                          ││
│  │ ○ Accept with short delivery note                                       ││
│  │   - Record 98 pcs at invoice unit price                                 ││
│  │   - Create debit note for 2 pcs                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Action Required:  ☑ Create debit note   ☐ Request replacement              │
│  Variance Note: [Kekurangan 2 pcs - debit note akan dikirim ke supplier]    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2. Price Variance

```typescript
interface PriceVariance {
  productId: string;
  productName: string;
  expectedPrice: number;     // From PO or last purchase
  invoicePrice: number;      // Actual invoice price
  variance: number;          // invoicePrice - expectedPrice
  variancePercent: number;   // (variance / expectedPrice) * 100
  varianceType: 'HIGHER' | 'LOWER';
  totalImpact: number;       // variance * quantity
}

// Auto-accept thresholds
const PRICE_VARIANCE_CONFIG = {
  autoAcceptPercent: 2,      // Auto-accept if within ±2%
  warningPercent: 5,         // Warning if 2-5%
  approvalRequiredPercent: 10, // Needs approval if 5-10%
  rejectPercent: 15          // Auto-reject if >15%
};
```

**Price Variance UI:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRICE VARIANCE DETECTED                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Item: Widget ABC (SKU: WDG-001)                                             │
│  Quantity: 100 pcs                                                           │
│                                                                              │
│  ┌──────────────────┬──────────────────┬──────────────────┐                 │
│  │ Expected (PO)    │ Invoice          │ Variance         │                 │
│  ├──────────────────┼──────────────────┼──────────────────┤                 │
│  │ Rp 50,000/pcs    │ Rp 52,000/pcs    │ +Rp 2,000 (+4%)  │                 │
│  │                  │                  │                  │                 │
│  │ Total: Rp 5,000K │ Total: Rp 5,200K │ Impact: +Rp 200K │                 │
│  └──────────────────┴──────────────────┴──────────────────┘                 │
│                                                                              │
│  ⚠️  Price 4% higher than PO - requires approval                             │
│                                                                              │
│  Options:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ○ Accept invoice price (Rp 52,000)                                      ││
│  │   Reason: [Price increase dari supplier per Jan 2026      ]             ││
│  │                                                                          ││
│  │ ○ Negotiate with supplier                                               ││
│  │   - Hold invoice, contact supplier for price adjustment                 ││
│  │                                                                          ││
│  │ ● Request credit note for difference                                    ││
│  │   - Accept at PO price (Rp 50,000)                                      ││
│  │   - Request credit note Rp 200,000                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Approver: [Purchasing Manager       ▼]                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3. Item Variance (Items in GR but not in Invoice, or vice versa)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ITEM VARIANCE DETECTED                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GR: GR-2026-0125          Invoice: INV-SUP-2026-0125                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ MATCHED ITEMS (3 items)                                      ✓ OK       ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ Widget ABC       100 pcs   @50,000   Rp 5,000,000           ✓          ││
│  │ Gadget XYZ        50 pcs   @30,000   Rp 1,500,000           ✓          ││
│  │ Cable USB        200 pcs    @5,000   Rp 1,000,000           ✓          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ⚠️  IN GR BUT NOT IN INVOICE (received but not billed)                   ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ Battery AAA       20 pcs   (no price)                                   ││
│  │                                                                          ││
│  │ Action: ○ Treat as bonus (free goods)                                   ││
│  │         ○ Request invoice for these items                               ││
│  │         ● Return to supplier (not ordered)                              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ⚠️  IN INVOICE BUT NOT IN GR (billed but not received)                   ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ Adapter HDMI      10 pcs   @25,000   Rp 250,000                         ││
│  │                                                                          ││
│  │ Action: ● Reject this item (not received)                               ││
│  │         ○ Create pending GR (will receive later)                        ││
│  │         ○ Accept (goods received but GR not updated)                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4. Missing GR (Invoice without Good Receipt)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  NO MATCHING GOOD RECEIPT FOUND                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Invoice: INV-SUP-2026-0125 from PT ABC Supplier                             │
│  Date: 2026-01-20                                                            │
│  Total: Rp 7,500,000                                                         │
│                                                                              │
│  Status: No Good Receipt found for this invoice                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Possible Reasons:                                                        ││
│  │                                                                          ││
│  │ 1. Goods not yet received                                               ││
│  │    → Hold invoice until goods arrive and GR is created                  ││
│  │                                                                          ││
│  │ 2. GR not yet created by warehouse                                      ││
│  │    → Contact warehouse to create GR                                     ││
│  │                                                                          ││
│  │ 3. Service/non-inventory purchase                                       ││
│  │    → Process as direct expense (no GR needed)                           ││
│  │                                                                          ││
│  │ 4. Wrong supplier or invoice number                                     ││
│  │    → Verify invoice details with supplier                               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Action:                                                                     │
│  ○ Hold invoice (wait for GR)                                               │
│  ○ Contact warehouse to verify receipt                                      │
│  ○ Process as direct expense (service/non-inventory)                        │
│  ○ Return invoice to supplier (incorrect)                                   │
│                                                                              │
│  Note: [                                                                  ]  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Variance Data Model

```typescript
interface GRInvoiceReconciliation {
  id: string;
  goodsReceiptId: string;
  invoiceId: string;
  reconciliationDate: Date;
  reconciledBy: string;

  // Overall status
  status: 'MATCHED' | 'VARIANCE_ACCEPTED' | 'VARIANCE_PENDING' | 'REJECTED';

  // Line-level reconciliation
  lineReconciliations: LineReconciliation[];

  // Variances
  variances: Variance[];
  varianceNotes: string;

  // Resolution
  resolutionType?: 'ACCEPTED' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RETURN' | 'CORRECTED_INVOICE';
  resolutionDocument?: string;  // Credit note number, etc.
  resolutionDate?: Date;
  resolvedBy?: string;
}

interface LineReconciliation {
  grLineId: string;
  invoiceLineId: string;
  productId: string;

  // Quantities
  grQuantity: number;
  invoiceQuantity: number;
  acceptedQuantity: number;

  // Prices
  grExpectedPrice: number;     // From PO or estimate
  invoicePrice: number;
  acceptedPrice: number;

  // Variance flags
  hasQuantityVariance: boolean;
  hasPriceVariance: boolean;

  // Notes
  varianceNote?: string;
}

interface Variance {
  type: 'QUANTITY' | 'PRICE' | 'ITEM_MISSING_IN_INVOICE' | 'ITEM_MISSING_IN_GR';
  productId?: string;
  productName?: string;

  // For quantity/price variance
  expected: number;
  actual: number;
  difference: number;
  differencePercent?: number;

  // Resolution
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CORRECTED';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
}
```

### Database Schema for Variance Tracking

```sql
-- Reconciliation header
CREATE TABLE gr_invoice_reconciliations (
  id TEXT PRIMARY KEY,
  goods_receipt_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  reconciliation_date INTEGER NOT NULL,
  reconciled_by TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'PENDING',
  -- 'MATCHED' | 'VARIANCE_ACCEPTED' | 'VARIANCE_PENDING' | 'REJECTED'

  total_gr_amount INTEGER NOT NULL,
  total_invoice_amount INTEGER NOT NULL,
  variance_amount INTEGER NOT NULL,

  variance_notes TEXT,

  -- Resolution
  resolution_type TEXT,
  resolution_document TEXT,
  resolution_date INTEGER,
  resolved_by TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Line-level reconciliation
CREATE TABLE gr_invoice_reconciliation_lines (
  id TEXT PRIMARY KEY,
  reconciliation_id TEXT NOT NULL,
  gr_line_id TEXT,
  invoice_line_id TEXT,
  product_id TEXT NOT NULL,

  gr_quantity INTEGER,
  invoice_quantity INTEGER,
  accepted_quantity INTEGER NOT NULL,

  gr_expected_price INTEGER,
  invoice_price INTEGER,
  accepted_price INTEGER NOT NULL,

  has_quantity_variance INTEGER DEFAULT 0,
  has_price_variance INTEGER DEFAULT 0,
  variance_note TEXT,

  FOREIGN KEY (reconciliation_id) REFERENCES gr_invoice_reconciliations(id)
);

-- Variance log
CREATE TABLE reconciliation_variances (
  id TEXT PRIMARY KEY,
  reconciliation_id TEXT NOT NULL,
  variance_type TEXT NOT NULL,
  -- 'QUANTITY' | 'PRICE' | 'ITEM_MISSING_IN_INVOICE' | 'ITEM_MISSING_IN_GR'

  product_id TEXT,
  product_name TEXT,

  expected_value INTEGER,
  actual_value INTEGER,
  difference INTEGER NOT NULL,
  difference_percent REAL,

  status TEXT NOT NULL DEFAULT 'PENDING',
  resolution TEXT,
  resolved_by TEXT,
  resolved_at INTEGER,

  created_at INTEGER NOT NULL,

  FOREIGN KEY (reconciliation_id) REFERENCES gr_invoice_reconciliations(id)
);

CREATE INDEX idx_grir_gr ON gr_invoice_reconciliations(goods_receipt_id);
CREATE INDEX idx_grir_invoice ON gr_invoice_reconciliations(invoice_id);
CREATE INDEX idx_grir_status ON gr_invoice_reconciliations(status);
```

### Variance Tolerance Configuration

```typescript
// Configurable tolerance settings per company/supplier
interface VarianceToleranceConfig {
  // Quantity tolerance
  quantityTolerance: {
    absoluteUnits: number;     // e.g., 2 units
    percentOfOrder: number;    // e.g., 2%
    useWhichever: 'HIGHER' | 'LOWER' | 'ABSOLUTE_ONLY' | 'PERCENT_ONLY';
  };

  // Price tolerance
  priceTolerance: {
    absoluteAmount: number;    // e.g., Rp 1,000
    percentOfPrice: number;    // e.g., 2%
    useWhichever: 'HIGHER' | 'LOWER' | 'ABSOLUTE_ONLY' | 'PERCENT_ONLY';
  };

  // Auto-accept rules
  autoAccept: {
    withinTolerance: boolean;              // Auto-accept if within tolerance
    lowerPriceAlways: boolean;             // Auto-accept if invoice price is lower
    overReceiptAsBonus: boolean;           // Auto-accept over-receipt as bonus
    maxAutoAcceptAmount: number;           // Max variance amount for auto-accept
  };

  // Approval rules
  approval: {
    requireApprovalAbovePercent: number;   // e.g., 5%
    requireApprovalAboveAmount: number;    // e.g., Rp 500,000
    approverRole: string;                  // e.g., 'PURCHASING_MANAGER'
  };
}

// Default configuration
const DEFAULT_VARIANCE_CONFIG: VarianceToleranceConfig = {
  quantityTolerance: {
    absoluteUnits: 2,
    percentOfOrder: 2,
    useWhichever: 'HIGHER'
  },
  priceTolerance: {
    absoluteAmount: 1000,      // Rp 1,000
    percentOfPrice: 2,
    useWhichever: 'HIGHER'
  },
  autoAccept: {
    withinTolerance: true,
    lowerPriceAlways: true,
    overReceiptAsBonus: false,  // Require confirmation for bonus
    maxAutoAcceptAmount: 100000 // Rp 100,000
  },
  approval: {
    requireApprovalAbovePercent: 5,
    requireApprovalAboveAmount: 500000,
    approverRole: 'PURCHASING_MANAGER'
  }
};
```

---

## Complete Processing Workflow

### Main Processing Flow

```typescript
interface InvoiceProcessingResult {
  invoiceId: string;
  status: 'COMPLETED' | 'PENDING_REVIEW' | 'PENDING_APPROVAL' | 'REJECTED';

  // Matched documents
  matchedPO?: string;
  matchedGRs: string[];

  // Created records
  createdAPEntry?: string;
  createdJournalEntry?: string;
  createdGRs?: string[];          // If goods not yet received
  createdProducts?: string[];     // If new products created

  // Pending actions
  pendingReview?: {
    unmatchedItems: InvoiceLineItem[];
    newProducts: NewProductItem[];
    variances: Variance[];
  };

  pendingApproval?: {
    extraItems: ExtraItemDecision[];
    priceVariances: PriceVariance[];
  };
}

async function processSupplierInvoice(
  file: File,
  options: ProcessingOptions
): Promise<InvoiceProcessingResult> {

  // Step 1: Extract invoice data
  const extraction = await extractSupplierInvoice(file);

  // Step 2: Identify supplier
  const supplierMatch = await identifySupplier(extraction);
  if (!supplierMatch.supplierId && !options.allowNewSupplier) {
    return {
      status: 'PENDING_REVIEW',
      pendingReview: { reason: 'Unknown supplier' }
    };
  }

  // Step 3: Match with PO/GR
  const matchResult = await matchInvoiceWithDocuments(
    extraction,
    supplierMatch.supplierId
  );

  // Step 4: Handle new products
  const newProductDecisions = await handleNewProducts(
    matchResult.newProducts,
    options
  );

  // Step 5: Handle extra items (not in PO)
  const extraItemDecisions = await handleExtraItems(
    matchResult.unmatchedInvoiceItems,
    { supplierId: supplierMatch.supplierId, poId: matchResult.purchaseOrder?.id }
  );

  // Step 6: Check if manual review needed
  if (needsManualReview(matchResult, newProductDecisions, extraItemDecisions)) {
    return {
      status: 'PENDING_REVIEW',
      pendingReview: {
        unmatchedItems: matchResult.unmatchedInvoiceItems,
        newProducts: matchResult.newProducts,
        variances: matchResult.variances
      }
    };
  }

  // Step 7: Check if approval needed
  if (needsApproval(extraItemDecisions, matchResult.variances)) {
    return {
      status: 'PENDING_APPROVAL',
      pendingApproval: {
        extraItems: extraItemDecisions.filter(d => d.requiresApproval),
        priceVariances: matchResult.variances.filter(v => v.type === 'PRICE')
      }
    };
  }

  // Step 8: Create AP entry and journal
  const apEntry = await createAPEntry(extraction, matchResult);
  const journalEntry = await createAPJournalEntry(apEntry, extraction);

  // Step 9: Update PO and GR status
  if (matchResult.purchaseOrder) {
    await updatePOStatus(matchResult.purchaseOrder.id, 'INVOICED');
  }
  for (const gr of matchResult.goodsReceipts) {
    await updateGRStatus(gr.id, 'INVOICED');
  }

  return {
    status: 'COMPLETED',
    invoiceId: apEntry.id,
    matchedPO: matchResult.purchaseOrder?.id,
    matchedGRs: matchResult.goodsReceipts.map(gr => gr.id),
    createdAPEntry: apEntry.id,
    createdJournalEntry: journalEntry.id
  };
}
```

---

## Payment Method Selection

When processing a supplier invoice, user must select the payment method which determines the journal entry:

### Payment Method Options

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT METHOD SELECTION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Invoice: INV-SUP-2026-0125                                                  │
│  Total: Rp 5,550,000 (including PPN)                                         │
│                                                                              │
│  Payment Method *                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ○ Cash / Bank Transfer (Tunai)                                          ││
│  │   └─ Pay immediately, no AP created                                     ││
│  │                                                                          ││
│  │ ● Credit / Hutang Dagang (Kredit)                                       ││
│  │   └─ Create AP with due date                                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [If Credit selected]                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  Payment Terms *              Due Date (Jatuh Tempo) *                   ││
│  │  ┌──────────────────────┐    ┌──────────────────────────────┐           ││
│  │  │ Net 30           ▼  │    │ 2026-02-14              📅  │           ││
│  │  └──────────────────────┘    └──────────────────────────────┘           ││
│  │                               (auto-calculated from terms)               ││
│  │  Payment Terms Options:                                                  ││
│  │  • COD (Cash on Delivery)                                               ││
│  │  • Net 7 (7 days)                                                       ││
│  │  • Net 14 (14 days)                                                     ││
│  │  • Net 30 (30 days)                                                     ││
│  │  • Net 45 (45 days)                                                     ││
│  │  • Net 60 (60 days)                                                     ││
│  │  • Custom (enter due date manually)                                     ││
│  │                                                                          ││
│  │  Notes for Payment:                                                      ││
│  │  ┌────────────────────────────────────────────────────────────────────┐ ││
│  │  │ Transfer ke BCA 1234567890 a.n. PT ABC Supplier                    │ ││
│  │  └────────────────────────────────────────────────────────────────────┘ ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [If Cash/Bank Transfer selected]                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  Payment From *                                                          ││
│  │  ┌────────────────────────────────────────────────────────────────────┐ ││
│  │  │ 1111 - Kas Besar                                               ▼  │ ││
│  │  │ 1112 - Kas Kecil (Petty Cash)                                     │ ││
│  │  │ 1121 - Bank BCA 1234567890                                        │ ││
│  │  │ 1122 - Bank Mandiri 0987654321                                    │ ││
│  │  └────────────────────────────────────────────────────────────────────┘ ││
│  │                                                                          ││
│  │  Payment Date *              Reference Number                            ││
│  │  ┌──────────────────────┐    ┌──────────────────────────────┐           ││
│  │  │ 2026-01-15       📅 │    │ TRF-20260115-001             │           ││
│  │  └──────────────────────┘    └──────────────────────────────┘           ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Journal Entry by Payment Method

| Payment Method | Journal Entry |
|----------------|---------------|
| **Cash/Bank Transfer** | DR: Persediaan + PPN Masukan, CR: Kas/Bank |
| **Credit (Hutang Dagang)** | DR: Persediaan + PPN Masukan, CR: Hutang Dagang |

### Data Model for AP with Due Date

```typescript
interface AccountsPayable {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;

  // Amounts
  subtotal: number;
  ppnAmount: number;
  pphAmount?: number;           // Withholding tax if any
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  // Payment Terms
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
  paymentTerms?: 'COD' | 'NET_7' | 'NET_14' | 'NET_30' | 'NET_45' | 'NET_60' | 'CUSTOM';

  // Due Date (Jatuh Tempo) - CRITICAL for credit payments
  invoiceDate: Date;
  dueDate: Date;                // Jatuh Tempo
  daysUntilDue: number;         // Calculated field

  // Payment tracking
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  lastPaymentDate?: Date;
  paymentHistory: PaymentRecord[];

  // Bank info for payment
  supplierBankAccount?: string;
  supplierBankName?: string;
  paymentNotes?: string;

  // Audit
  createdAt: Date;
  createdBy: string;
}

interface PaymentRecord {
  id: string;
  apId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'GIRO';
  bankAccountId?: string;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}
```

### Database Schema for AP

```sql
CREATE TABLE accounts_payable (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,

  -- Amounts (in smallest currency unit)
  subtotal INTEGER NOT NULL,
  ppn_amount INTEGER DEFAULT 0,
  pph_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER DEFAULT 0,
  remaining_amount INTEGER NOT NULL,

  -- Payment Terms
  payment_method TEXT NOT NULL,  -- 'CASH' | 'BANK_TRANSFER' | 'CREDIT'
  payment_terms TEXT,            -- 'COD' | 'NET_7' | 'NET_30' etc.

  -- Due Date
  invoice_date INTEGER NOT NULL,
  due_date INTEGER NOT NULL,     -- Jatuh Tempo

  -- Status
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  -- 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'

  -- Supplier bank info
  supplier_bank_account TEXT,
  supplier_bank_name TEXT,
  payment_notes TEXT,

  -- Audit
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Index for due date queries (AP aging report)
CREATE INDEX idx_ap_due_date ON accounts_payable(due_date);
CREATE INDEX idx_ap_status ON accounts_payable(payment_status);
CREATE INDEX idx_ap_supplier ON accounts_payable(supplier_id);

-- Payment history
CREATE TABLE ap_payments (
  id TEXT PRIMARY KEY,
  ap_id TEXT NOT NULL,
  payment_date INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  bank_account_id TEXT,
  reference_number TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,

  FOREIGN KEY (ap_id) REFERENCES accounts_payable(id)
);
```

### AP Aging Report Integration

Due date tracking enables AP Aging Report:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AP AGING REPORT - Per 31 Januari 2026                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Supplier         │ Current │ 1-30 Days│ 31-60 Days│ 61-90 Days│ >90 Days││
│  ├──────────────────┼─────────┼──────────┼───────────┼───────────┼─────────┤│
│  │ PT ABC Supplier  │ 5,550K  │    -     │     -     │     -     │    -    ││
│  │ PT XYZ Trading   │    -    │ 3,200K   │     -     │     -     │    -    ││
│  │ CV Maju Jaya     │    -    │    -     │  2,100K   │     -     │    -    ││
│  │ PT Delta Express │    -    │    -     │     -     │  1,500K   │    -    ││
│  ├──────────────────┼─────────┼──────────┼───────────┼───────────┼─────────┤│
│  │ TOTAL            │ 5,550K  │ 3,200K   │  2,100K   │  1,500K   │    -    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Total Hutang Dagang: Rp 12,350,000                                          │
│  ⚠️  Overdue (>30 days): Rp 3,600,000                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Journal Entry Creation

### Standard Purchase Invoice - CREDIT Payment (Hutang Dagang)

When paying by credit (Hutang Dagang), AP is created with **due date (jatuh tempo)**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JOURNAL ENTRY: PURCHASE INVOICE (CREDIT)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Invoice: INV-SUP-2026-0125                                                  │
│  Supplier: PT ABC Supplier                                                   │
│  Date: 2026-01-15                                                            │
│  Payment: CREDIT (Net 30)                                                    │
│  Due Date (Jatuh Tempo): 2026-02-14                                          │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  DEBIT:                                                                      │
│  ├── 1310 - Persediaan Barang Dagangan     Rp  5,000,000                    │
│  │   (100 pcs Widget XYZ @50,000)                                            │
│  ├── 1141 - PPN Masukan                    Rp    550,000                    │
│  │   (VAT Input 11%)                                                         │
│  │                                                                           │
│  CREDIT:                                                                     │
│  └── 2110 - Hutang Dagang                  Rp  5,550,000                    │
│      (AP to PT ABC Supplier - Due: 2026-02-14)                               │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  Total Debit:  Rp 5,550,000    Total Credit: Rp 5,550,000    ✓ BALANCED     │
│                                                                              │
│  📋 AP Record Created:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Invoice      : INV-SUP-2026-0125                                        ││
│  │ Supplier     : PT ABC Supplier                                          ││
│  │ Amount       : Rp 5,550,000                                             ││
│  │ Due Date     : 2026-02-14 (Jatuh Tempo)                                 ││
│  │ Payment Terms: Net 30                                                   ││
│  │ Status       : UNPAID                                                   ││
│  │ Bank Info    : BCA 1234567890 a.n. PT ABC Supplier                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Standard Purchase Invoice - CASH/BANK Payment (Tunai)

When paying immediately by cash or bank transfer, **no AP is created**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JOURNAL ENTRY: PURCHASE INVOICE (CASH/BANK)               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Invoice: INV-SUP-2026-0126                                                  │
│  Supplier: PT XYZ Trading                                                    │
│  Date: 2026-01-16                                                            │
│  Payment: BANK TRANSFER (paid immediately)                                   │
│  Paid From: Bank BCA 1234567890                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  DEBIT:                                                                      │
│  ├── 1310 - Persediaan Barang Dagangan     Rp  3,000,000                    │
│  │   (50 pcs Gadget ABC @60,000)                                             │
│  ├── 1141 - PPN Masukan                    Rp    330,000                    │
│  │   (VAT Input 11%)                                                         │
│  │                                                                           │
│  CREDIT:                                                                     │
│  └── 1121 - Bank BCA                       Rp  3,330,000                    │
│      (Direct payment from bank account)                                      │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  Total Debit:  Rp 3,330,000    Total Credit: Rp 3,330,000    ✓ BALANCED     │
│                                                                              │
│  ✓ Paid immediately - NO AP record created                                   │
│  ✓ Cash/Bank balance reduced directly                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bank Reconciliation Integration (Bank Transfer Only)

When payment is made via **bank transfer** (either direct payment or AP payment), the system records the expected transaction for later bank reconciliation.

**Note**: Cash payments do NOT need bank reconciliation - they are settled immediately with physical cash.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              BANK TRANSFER → BANK RECONCILIATION PATTERN                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Payment Method        │ Bank Reconciliation  │ Reason                       │
│  ──────────────────────┼──────────────────────┼───────────────────────────── │
│  Cash (Tunai)          │ ❌ NOT needed        │ Physical cash, no bank stmt  │
│  Bank Transfer         │ ✅ Pattern recorded  │ Will appear in bank stmt     │
│  Giro/Cheque           │ ✅ Pattern recorded  │ Will appear in bank stmt     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  SCENARIO A: Direct Bank Transfer Payment                                    │
│  ─────────────────────────────────────────                                   │
│                                                                              │
│  Invoice → Pay via Bank Transfer → Expected Transaction Recorded             │
│                                           ↓                                  │
│                              Later: Bank Statement Imported                  │
│                                           ↓                                  │
│                              Auto-match with expected transaction            │
│                                                                              │
│  SCENARIO B: Credit (Hutang Dagang) → Paid Later via Bank                    │
│  ────────────────────────────────────────────────────────                    │
│                                                                              │
│  Invoice → AP Created (UNPAID) → ... → Pay AP via Bank → Pattern Recorded    │
│                                                                 ↓            │
│                                                     Bank Reconciliation      │
│                                                                              │
│  ⚠️ Pattern recorded ONLY when actual bank transfer happens                  │
│     (not when AP is created)                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Expected Bank Transaction Data Model

```typescript
interface ExpectedBankTransaction {
  id: string;
  bankAccountId: string;

  // Transaction details
  transactionDate: Date;
  amount: number;                    // Negative for outgoing payment
  transactionType: 'OUTGOING';

  // Reference for matching
  referenceNumber: string;
  description: string;               // Supplier name + invoice

  // Source document
  sourceType: 'INVOICE_PAYMENT' | 'AP_PAYMENT';
  sourceDocumentId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;

  // Reconciliation status
  status: 'PENDING' | 'MATCHED' | 'MANUAL';
  matchedBankStatementLineId?: string;

  // Matching hints
  matchingKeywords: string[];        // e.g., ['PT ABC', 'INV-2026-0125']

  createdAt: Date;
}

// Record expected transaction when bank transfer payment is made
async function recordExpectedBankTransaction(payment: BankPayment) {
  // Only for bank transfer, NOT for cash
  if (payment.paymentMethod !== 'BANK_TRANSFER') return;

  await db.insert(expectedBankTransactions).values({
    bankAccountId: payment.bankAccountId,
    transactionDate: payment.paymentDate,
    amount: -payment.amount,
    referenceNumber: payment.referenceNumber,
    description: `${payment.supplierName} - ${payment.invoiceNumber}`,
    sourceType: payment.isAPPayment ? 'AP_PAYMENT' : 'INVOICE_PAYMENT',
    sourceDocumentId: payment.documentId,
    supplierId: payment.supplierId,
    supplierName: payment.supplierName,
    invoiceNumber: payment.invoiceNumber,
    status: 'PENDING',
    matchingKeywords: [
      payment.supplierName.toUpperCase(),
      payment.invoiceNumber,
      'TRSF', 'TRANSFER'
    ]
  });
}
```

> **Reference**: See [Bank Reconciliation Journal Entry](./BANK_RECONCILIATION_JOURNAL_ENTRY.md) for the complete reconciliation workflow.

---

### Purchase Invoice with PPh 23 Withholding

For services subject to withholding tax:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JOURNAL ENTRY: SERVICE INVOICE WITH PPH 23                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Invoice: INV-SVC-2026-0125                                                  │
│  Supplier: PT Jasa Konsultan                                                 │
│  Service: Konsultasi IT                                                      │
│  Date: 2026-01-15                                                            │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Base Amount:     Rp 10,000,000                                              │
│  PPN (11%):       Rp  1,100,000                                              │
│  PPh 23 (2%):     Rp    200,000  (withheld by us)                            │
│  Amount to Pay:   Rp 10,900,000                                              │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  DEBIT:                                                                      │
│  ├── 6200 - Biaya Jasa Profesional         Rp 10,000,000                    │
│  ├── 1141 - PPN Masukan                    Rp  1,100,000                    │
│  │                                                                           │
│  CREDIT:                                                                     │
│  ├── 2110 - Hutang Dagang                  Rp 10,900,000                    │
│  │   (Net payable after PPh 23)                                              │
│  └── 2136 - Hutang PPh 23                  Rp    200,000                    │
│      (To be remitted to tax office)                                          │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  Total Debit:  Rp 11,100,000   Total Credit: Rp 11,100,000   ✓ BALANCED     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mixed Invoice (Inventory + Expense + New Product)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JOURNAL ENTRY: MIXED INVOICE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Invoice: INV-MIX-2026-0125                                                  │
│  Supplier: PT Supplier Mix                                                   │
│  Date: 2026-01-15                                                            │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Line Items:                                                                 │
│  1. Widget ABC (existing product)     100 pcs  @50,000 = Rp  5,000,000      │
│  2. New Product XYZ (created now)      50 pcs  @30,000 = Rp  1,500,000      │
│  3. Jasa Pengiriman (expense)           1 ls  @200,000 = Rp    200,000      │
│  4. Bonus Item (free)                  10 pcs       @0 = Rp          0      │
│                                                                              │
│  Subtotal (DPP):                                         Rp  6,700,000      │
│  PPN 11%:                                                Rp    737,000      │
│  Grand Total:                                            Rp  7,437,000      │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  DEBIT:                                                                      │
│  ├── 1310 - Persediaan (Widget ABC)        Rp  5,000,000                    │
│  ├── 1310 - Persediaan (New Product XYZ)   Rp  1,500,000                    │
│  ├── 6120 - Biaya Pengiriman               Rp    200,000                    │
│  ├── 1141 - PPN Masukan                    Rp    737,000                    │
│  │                                                                           │
│  CREDIT:                                                                     │
│  └── 2110 - Hutang Dagang                  Rp  7,437,000                    │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  Total Debit:  Rp 7,437,000    Total Credit: Rp 7,437,000    ✓ BALANCED     │
│                                                                              │
│  Note: Bonus items (10 pcs) recorded in inventory at zero cost               │
│        GR created for bonus items with note "Bonus dari supplier"            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Journal Entry Generation Code

```typescript
interface APJournalEntryConfig {
  invoice: SupplierInvoiceExtraction;
  lineMatches: LineMatchResult[];
  apAccountId: string;          // Usually 2110
  ppnInputAccountId: string;    // Usually 1141
  inventoryAccountId: string;   // Usually 1310
}

async function createAPJournalEntry(
  config: APJournalEntryConfig
): Promise<JournalEntry> {

  const lines: JournalLine[] = [];

  // Group by account
  const inventoryItems: LineMatchResult[] = [];
  const expenseItems: LineMatchResult[] = [];

  for (const match of config.lineMatches) {
    if (match.matchType === 'NEW_PRODUCT' && match.processAsExpense) {
      expenseItems.push(match);
    } else {
      inventoryItems.push(match);
    }
  }

  // DEBIT: Inventory account(s)
  if (inventoryItems.length > 0) {
    const inventoryTotal = inventoryItems.reduce(
      (sum, item) => sum + item.invoiceLine.lineTotal, 0
    );
    lines.push({
      accountId: config.inventoryAccountId,
      debit: inventoryTotal,
      credit: 0,
      description: `Pembelian ${inventoryItems.length} item dari ${config.invoice.supplierName}`
    });
  }

  // DEBIT: Expense account(s)
  for (const expense of expenseItems) {
    lines.push({
      accountId: expense.expenseAccountId!,
      debit: expense.invoiceLine.lineTotal,
      credit: 0,
      description: expense.invoiceLine.description
    });
  }

  // DEBIT: PPN Masukan (VAT Input)
  if (config.invoice.ppnAmount && config.invoice.ppnAmount > 0) {
    lines.push({
      accountId: config.ppnInputAccountId,
      debit: config.invoice.ppnAmount,
      credit: 0,
      description: 'PPN Masukan'
    });
  }

  // CREDIT: Hutang Dagang (AP)
  lines.push({
    accountId: config.apAccountId,
    debit: 0,
    credit: config.invoice.grandTotal,
    description: `Hutang ke ${config.invoice.supplierName} - ${config.invoice.invoiceNumber}`
  });

  // Create journal entry
  return await createJournalEntry({
    date: config.invoice.invoiceDate,
    reference: config.invoice.invoiceNumber,
    description: `Pembelian dari ${config.invoice.supplierName}`,
    lines,
    sourceModule: 'supplier-invoice',
    sourceDocumentId: config.invoice.invoiceNumber
  });
}
```

---

## Accounts Used

| Code | Account Name | Type | Usage |
|------|--------------|------|-------|
| **1141** | PPN Masukan | Asset | VAT Input (claimable) |
| **1310** | Persediaan Barang Dagangan | Asset | Inventory for resale |
| **1320** | Persediaan Bahan Baku | Asset | Raw material inventory |
| **1330** | Persediaan Barang Dalam Proses | Asset | WIP inventory |
| **2110** | Hutang Dagang | Liability | Accounts Payable |
| **2136** | Hutang PPh 23 | Liability | Withholding tax payable |
| **2137** | Hutang PPh 4(2) | Liability | Final tax payable |
| **5100** | Harga Pokok Penjualan | Expense | COGS (for direct expenses) |
| **6120** | Biaya Pengiriman | Expense | Shipping/delivery expense |
| **6200** | Biaya Jasa Profesional | Expense | Professional service expense |
| **6300** | Biaya Perlengkapan | Expense | Supplies expense |

---

## Edge Cases and Business Rules

### Rule 1: Duplicate Invoice Detection

```typescript
async function checkDuplicateInvoice(
  extraction: SupplierInvoiceExtraction,
  supplierId: string
): Promise<DuplicateCheckResult> {

  // Check by invoice number
  const existing = await findInvoice({
    supplierId,
    invoiceNumber: extraction.invoiceNumber
  });

  if (existing) {
    return {
      isDuplicate: true,
      existingInvoice: existing,
      matchType: 'EXACT_NUMBER'
    };
  }

  // Check by amount + date (fuzzy duplicate)
  const similar = await findSimilarInvoices({
    supplierId,
    amount: extraction.grandTotal,
    date: extraction.invoiceDate,
    tolerance: { amount: 0, days: 3 }
  });

  if (similar.length > 0) {
    return {
      isDuplicate: false,
      possibleDuplicates: similar,
      matchType: 'FUZZY'
    };
  }

  return { isDuplicate: false };
}
```

### Rule 2: Price Variance Handling

```typescript
const PRICE_VARIANCE_RULES = {
  // Auto-accept if within tolerance
  autoAcceptThreshold: 0.02,  // 2%

  // Require approval if above threshold
  approvalThreshold: 0.05,    // 5%

  // Reject if above rejection threshold
  rejectThreshold: 0.15       // 15%
};

function evaluatePriceVariance(
  invoicePrice: number,
  expectedPrice: number  // From PO or last purchase
): PriceVarianceDecision {

  const variance = (invoicePrice - expectedPrice) / expectedPrice;

  if (Math.abs(variance) <= PRICE_VARIANCE_RULES.autoAcceptThreshold) {
    return { action: 'ACCEPT', variance, reason: 'Within tolerance' };
  }

  if (Math.abs(variance) <= PRICE_VARIANCE_RULES.approvalThreshold) {
    return { action: 'APPROVE', variance, reason: 'Requires approval' };
  }

  if (Math.abs(variance) <= PRICE_VARIANCE_RULES.rejectThreshold) {
    return { action: 'APPROVE', variance, reason: 'High variance - manager approval' };
  }

  return { action: 'REJECT', variance, reason: 'Variance exceeds acceptable limit' };
}
```

### Rule 3: Partial Invoice Processing

When only accepting some items from an invoice:

```typescript
interface PartialInvoiceResult {
  acceptedItems: InvoiceLineItem[];
  rejectedItems: InvoiceLineItem[];

  // Create AP only for accepted amount
  acceptedTotal: number;
  rejectedTotal: number;

  // Communication
  supplierNotification: {
    template: 'PARTIAL_ACCEPTANCE';
    rejectedItems: string[];
    reason: string;
  };
}
```

### Rule 4: Credit Note Handling

When supplier issues credit note:

```typescript
// Credit note reverses the original journal entry
async function processCreditNote(
  creditNote: SupplierInvoiceExtraction,
  originalInvoice: APInvoice
): Promise<JournalEntry> {

  // Reverse the amounts
  return await createJournalEntry({
    date: creditNote.invoiceDate,
    reference: creditNote.invoiceNumber,
    description: `Credit Note dari ${creditNote.supplierName}`,
    lines: [
      // DEBIT: AP (reduce payable)
      {
        accountId: '2110',
        debit: creditNote.grandTotal,
        credit: 0
      },
      // CREDIT: Inventory or Expense (reduce cost)
      {
        accountId: originalInvoice.mainAccountId,
        debit: 0,
        credit: creditNote.subtotal
      },
      // CREDIT: PPN Masukan (reduce VAT input)
      {
        accountId: '1141',
        debit: 0,
        credit: creditNote.ppnAmount
      }
    ],
    sourceModule: 'credit-note',
    linkedDocumentId: originalInvoice.id
  });
}
```

---

## Integration Points

### 1. Product Service Integration

```typescript
// When creating new product from invoice
async function createProductFromInvoice(
  item: NewProductItem,
  supplierId: string
): Promise<Product> {

  // Create product in Product Service
  const product = await productService.createProduct({
    name: item.productDraft.name,
    sku: item.productDraft.sku,
    category: item.productDraft.suggestedCategory,
    uom: item.productDraft.suggestedUOM,
    costPrice: item.productDraft.initialCost,
    status: 'ACTIVE'
  });

  // Create supplier SKU mapping
  await createSupplierProductMapping({
    supplierId,
    supplierSKU: item.invoiceLine.sku,
    supplierProductName: item.invoiceLine.description,
    productId: product.id,
    productSKU: product.sku,
    lastPurchasePrice: item.invoiceLine.unitPrice
  });

  return product;
}
```

### 2. Inventory Service Integration

```typescript
// Update inventory AFTER invoice is reconciled with GR
async function updateInventoryAfterReconciliation(
  grId: string,
  invoice: SupplierInvoiceExtraction,
  reconciledItems: ReconciledLineItem[]
): Promise<InventoryUpdateResult> {

  // Only update inventory with CONFIRMED cost from invoice
  return await inventoryService.confirmGoodsReceipt({
    goodsReceiptId: grId,
    confirmedCost: reconciledItems.map(item => ({
      productId: item.productId,
      quantity: item.confirmedQuantity,  // May differ from GR if variance
      unitCost: item.invoiceUnitPrice,   // Actual cost from invoice
      totalCost: item.invoiceLineTotal
    })),
    invoiceReference: invoice.invoiceNumber,
    reconciliationNotes: reconciledItems
      .filter(i => i.hasVariance)
      .map(i => i.varianceNote)
  });
}
```

### 3. Procurement Service Integration

```typescript
// Update PO status after invoice matched
async function updatePOFromInvoice(
  poId: string,
  invoiceMatchResult: MatchingResult
): Promise<void> {

  // Calculate fulfillment
  const fulfillment = calculatePOFulfillment(
    invoiceMatchResult.purchaseOrder!,
    invoiceMatchResult.lineMatches
  );

  await procurementService.updatePurchaseOrder(poId, {
    invoicedAmount: fulfillment.invoicedAmount,
    invoicedQuantity: fulfillment.invoicedQuantity,
    status: fulfillment.isFullyInvoiced ? 'INVOICED' : 'PARTIALLY_INVOICED',
    linkedInvoices: [...existing.linkedInvoices, invoice.id]
  });
}
```

---

## Summary

This workflow handles all procurement scenarios:

| Scenario | PO Required | GR Required | Product in Catalog | Action |
|----------|-------------|-------------|-------------------|--------|
| Standard purchase | Yes | Yes | Yes | 3-way match (PO + GR + Invoice) |
| No-PO supplier | No | Yes | Yes | 2-way match (GR + Invoice) |
| Service/expense | No | **No** | No | Direct expense (no inventory) |
| New product | Optional | Yes | **No** | Create product, then process |
| Extra items (not in PO) | Yes | Yes | Yes | Approval workflow |
| Bonus items | Optional | Yes | Yes | Accept at zero cost in GR |
| GR-Invoice variance | - | Yes | Yes | Resolve variance first |

### Key Process Rules

1. **Good Receipt (GR)** is created by warehouse when goods physically arrive (contra to Surat Jalan)
2. **Inventory is NOT updated** when GR is created
3. **Inventory IS updated** only after Invoice is reconciled with GR (confirmed cost)
4. **Services/utilities** go directly to expense accounts - no GR needed
5. **Variances** must be resolved before inventory update (quantity, price, item differences)

**Key Benefits:**
1. **Reducto.ai extraction** - No manual data entry from PDF invoices
2. **Intelligent matching** - Auto-match with PO/GR using multiple strategies
3. **Flexible workflows** - Support suppliers with/without PO
4. **New product handling** - Create products on-the-fly from invoice
5. **Supplier SKU mapping** - Learn supplier's product codes for future matching
6. **Variance handling** - Comprehensive workflow for quantity/price discrepancies
7. **Accurate costing** - Inventory recorded with confirmed invoice cost
8. **Automatic journal entries** - Correct double-entry bookkeeping
