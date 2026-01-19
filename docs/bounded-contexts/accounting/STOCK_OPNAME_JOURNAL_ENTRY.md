# Stock Opname (Physical Inventory Count) Journal Entry

## Overview

Stock Opname is the process of physically counting inventory and reconciling it with system records. When discrepancies are found (shortages or overages), the system automatically generates journal entries to adjust inventory values in the accounting books.

## Business Context

### What is Stock Opname?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STOCK OPNAME WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PLANNING                           2. COUNTING                           │
│  ─────────────                         ──────────                            │
│  • Schedule opname date                • Print count sheets                  │
│  • Assign counting teams               • Physical counting                   │
│  • Prepare count sheets                • Record actual quantities            │
│  • Freeze inventory movements          • Double-count high-value items       │
│                                                                              │
│  3. RECONCILIATION                     4. ADJUSTMENT                         │
│  ─────────────────                     ──────────────                        │
│  • Compare system vs actual            • Approve adjustments                 │
│  • Identify discrepancies              • Create journal entries              │
│  • Investigate variances               • Update inventory quantities         │
│  • Document findings                   • Archive opname records              │
│                                                                              │
│                                                                              │
│  SYSTEM STOCK ────► vs ◄──── PHYSICAL COUNT                                 │
│       │                           │                                          │
│       │     ┌─────────────┐       │                                          │
│       └────►│ DISCREPANCY │◄──────┘                                          │
│             └──────┬──────┘                                                  │
│                    │                                                          │
│          ┌────────┴────────┐                                                 │
│          ▼                 ▼                                                 │
│    ┌──────────┐      ┌──────────┐                                           │
│    │ SHORTAGE │      │ OVERAGE  │                                           │
│    │ (Loss)   │      │ (Gain)   │                                           │
│    └────┬─────┘      └────┬─────┘                                           │
│         │                 │                                                  │
│         ▼                 ▼                                                  │
│    ┌─────────────────────────────────────────┐                              │
│    │        AUTOMATIC JOURNAL ENTRY          │                              │
│    │  • Shortage: DR Loss, CR Inventory      │                              │
│    │  • Overage:  DR Inventory, CR Gain      │                              │
│    └─────────────────────────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stock Opname Types

| Type | Frequency | Scope | Description |
|------|-----------|-------|-------------|
| **Full Opname** | Annually | All items | Complete warehouse inventory count |
| **Cycle Count** | Monthly/Weekly | Subset | Rotating count of item categories |
| **Spot Check** | Ad-hoc | Random | Random verification of specific items |
| **ABC Count** | Quarterly | By value | A items monthly, B quarterly, C annually |

### Location Modes

Kidkazz supports two location modes based on warehouse type:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOCATION MODE OPTIONS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MODE 1: DETAILED LOCATION                 MODE 2: SIMPLE WAREHOUSE         │
│  ─────────────────────────                 ────────────────────────          │
│                                                                              │
│  For: Large warehouses, distribution       For: Retail stores, small        │
│        centers, multi-zone facilities           offline shops, kiosks       │
│                                                                              │
│  Location Structure:                       Location Structure:               │
│  ┌─────────────────────────────────┐      ┌─────────────────────────────┐  │
│  │  WAREHOUSE                      │      │  WAREHOUSE (only)           │  │
│  │    └── ZONE                     │      │                             │  │
│  │          └── AISLE              │      │  Example:                   │  │
│  │                └── RACK         │      │  • Toko Cabang Kemang       │  │
│  │                      └── BIN    │      │  • Toko Cabang Senayan      │  │
│  └─────────────────────────────────┘      │  • Kios Mall Kelapa Gading  │  │
│                                            └─────────────────────────────┘  │
│  Example:                                                                    │
│  • Zone: FAST-MOVING                       Benefits:                         │
│  • Aisle: A                                • Simpler counting process        │
│  • Rack: 01                                • No location training needed     │
│  • Bin: A1-05                              • Faster completion               │
│                                            • Mobile-friendly                 │
│  Benefits:                                                                   │
│  • Precise item location                                                     │
│  • Efficient picking                                                         │
│  • Zone-based cycle counting                                                 │
│  • Warehouse optimization                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Mode | Use Case | Location Fields | Sorting |
|------|----------|-----------------|---------|
| **Detailed** | Large warehouse | Zone, Aisle, Rack, Bin | By location path |
| **Simple** | Offline store | Warehouse only | By product name/SKU |

### When to Perform Stock Opname

| Trigger | Reason |
|---------|--------|
| Year-end closing | Financial statement preparation |
| Audit requirement | External/internal audit |
| High discrepancy rate | Suspected theft or errors |
| System migration | Data validation |
| Insurance claim | Damage/loss documentation |
| Warehouse relocation | Before/after move verification |

---

## Chart of Accounts Reference

### Inventory Accounts (1xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **1210** | Persediaan Barang Dagang | Merchandise Inventory |
| **1211** | Persediaan Bahan Baku | Raw Materials Inventory |
| **1212** | Persediaan Barang Dalam Proses | Work in Progress |
| **1213** | Persediaan Barang Jadi | Finished Goods |

### Loss/Gain Accounts (6xxx/4xxx)

| Code | Account Name | Description |
|------|-------------|-------------|
| **6820** | Kerugian Persediaan | Inventory Loss (Shortage) |
| **6821** | Penyusutan Persediaan | Inventory Shrinkage |
| **6822** | Kerugian Barang Rusak | Damaged Goods Loss |
| **6823** | Kerugian Barang Kadaluarsa | Expired Goods Loss |
| **4310** | Pendapatan Lain-Lain | Other Income (Overage) |
| **4311** | Selisih Lebih Persediaan | Inventory Overage Gain |

### Suspense Account

| Code | Account Name | Description |
|------|-------------|-------------|
| **1199** | Selisih Persediaan Sementara | Inventory Variance Suspense |

---

## Journal Entry Patterns

### 1. Inventory Shortage (System > Physical)

**Scenario:** System shows 100 units @ Rp 3,500/unit. Physical count shows 95 units. Shortage: 5 units = Rp 17,500.

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 6820 - Kerugian Persediaan | Rp 17,500 | |
| 2025-01-31 | 1210 - Persediaan | | Rp 17,500 |

**Explanation:**
- Inventory asset decreases (credit)
- Loss expense increases (debit)
- COGS not affected (already sold items)

---

### 2. Inventory Overage (System < Physical)

**Scenario:** System shows 50 units @ Rp 5,000/unit. Physical count shows 55 units. Overage: 5 units = Rp 25,000.

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 1210 - Persediaan | Rp 25,000 | |
| 2025-01-31 | 4311 - Selisih Lebih Persediaan | | Rp 25,000 |

**Explanation:**
- Inventory asset increases (debit)
- Gain income increases (credit)

---

### 3. Damaged Goods Write-Off

**Scenario:** 10 units found damaged during opname @ Rp 8,000/unit = Rp 80,000.

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 6822 - Kerugian Barang Rusak | Rp 80,000 | |
| 2025-01-31 | 1210 - Persediaan | | Rp 80,000 |

---

### 4. Expired Goods Write-Off

**Scenario:** 20 units expired during opname @ Rp 12,000/unit = Rp 240,000.

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 6823 - Kerugian Barang Kadaluarsa | Rp 240,000 | |
| 2025-01-31 | 1210 - Persediaan | | Rp 240,000 |

---

### 5. Large Variance to Suspense (Pending Investigation)

**Scenario:** Large shortage Rp 5,000,000 requires investigation before final write-off.

**Initial Entry (to Suspense):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 1199 - Selisih Persediaan Sementara | Rp 5,000,000 | |
| 2025-01-31 | 1210 - Persediaan | | Rp 5,000,000 |

**After Investigation (confirmed loss):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-02-15 | 6820 - Kerugian Persediaan | Rp 5,000,000 | |
| 2025-02-15 | 1199 - Selisih Persediaan Sementara | | Rp 5,000,000 |

**After Investigation (theft - employee receivable):**
| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-02-15 | 1115 - Piutang Karyawan | Rp 5,000,000 | |
| 2025-02-15 | 1199 - Selisih Persediaan Sementara | | Rp 5,000,000 |

---

### 6. Mixed Adjustments (Multiple Items)

**Scenario:** Opname finds multiple variances:
- Product A: Shortage 10 units @ Rp 5,000 = Rp 50,000
- Product B: Overage 5 units @ Rp 8,000 = Rp 40,000
- Product C: Damaged 3 units @ Rp 15,000 = Rp 45,000

| Date | Account | Debit | Credit |
|------|---------|-------|--------|
| 2025-01-31 | 6820 - Kerugian Persediaan | Rp 50,000 | |
| 2025-01-31 | 6822 - Kerugian Barang Rusak | Rp 45,000 | |
| 2025-01-31 | 1210 - Persediaan | Rp 40,000 | |
| 2025-01-31 | 1210 - Persediaan | | Rp 135,000 |
| 2025-01-31 | 4311 - Selisih Lebih Persediaan | | Rp 40,000 |

**Net Effect:**
- Total Debit: Rp 135,000 (50k + 45k + 40k)
- Total Credit: Rp 135,000 (135k Inventory + 40k Gain - 40k Inventory = 135k)
- Net Inventory Decrease: Rp 55,000 (95k loss - 40k gain)

---

## Stock Opname Process

### Step-by-Step Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STOCK OPNAME WORKFLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: CREATE OPNAME SESSION                                               │
│  ───────────────────────────────                                             │
│  • Select warehouse                                                          │
│  • Set opname date                                                           │
│  • Choose opname type (full/cycle/spot)                                      │
│  • Select product categories (if cycle count)                                │
│  • Freeze inventory movements (optional)                                     │
│                                                                              │
│  STEP 2: GENERATE COUNT SHEETS                                               │
│  ─────────────────────────────                                               │
│  • List all products in scope                                                │
│  • Include current system quantities                                         │
│  • Group by location (rack/bin/zone)                                         │
│  • Print or export to mobile device                                          │
│                                                                              │
│  STEP 3: PHYSICAL COUNTING                                                   │
│  ─────────────────────────                                                   │
│  • Count team performs physical count                                        │
│  • Enter actual quantities                                                   │
│  • Note damaged/expired items                                                │
│  • Barcode scanning supported                                                │
│                                                                              │
│  STEP 4: VARIANCE ANALYSIS                                                   │
│  ─────────────────────────                                                   │
│  • System calculates discrepancies                                           │
│  • Flag items exceeding tolerance                                            │
│  • Re-count flagged items                                                    │
│  • Document variance reasons                                                 │
│                                                                              │
│  STEP 5: APPROVAL                                                            │
│  ────────────────                                                            │
│  • Supervisor reviews variances                                              │
│  • Approve or reject adjustments                                             │
│  • Large variances require manager approval                                  │
│                                                                              │
│  STEP 6: ADJUSTMENT                                                          │
│  ────────────────────                                                        │
│  • Generate automatic journal entries                                        │
│  • Update inventory quantities                                               │
│  • Create inventory movements                                                │
│  • Close opname session                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### 1. Create Stock Opname Session

```
POST /api/accounting/stock-opname
```

**Request Body:**
```json
{
  "warehouseId": "wh_001",
  "opnameDate": "2025-01-31",
  "opnameType": "full",
  "locationMode": "detailed",
  "description": "Year-end inventory count 2025",
  "freezeMovements": true,
  "assignedTeam": ["user_001", "user_002", "user_003"],
  "categories": null,
  "tolerancePercentage": 2.0,
  "requiresApproval": true,
  "approvalThreshold": 1000000
}
```

**Location Mode Options:**
| Value | Description |
|-------|-------------|
| `detailed` | Zone → Aisle → Rack → Bin (for large warehouses) |
| `simple` | Warehouse only (for offline retail stores) |

**Example - Offline Store (Simple Mode):**
```json
{
  "warehouseId": "store_kemang_01",
  "opnameDate": "2025-01-31",
  "opnameType": "full",
  "locationMode": "simple",
  "description": "Monthly stock count - Toko Kemang",
  "freezeMovements": false,
  "assignedTeam": ["cashier_001"],
  "tolerancePercentage": 3.0,
  "requiresApproval": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opnameId": "opn_abc123",
    "opnameNumber": "OPN-2025-0012",
    "status": "draft",
    "warehouseId": "wh_001",
    "warehouseName": "Gudang Pusat",
    "opnameDate": "2025-01-31",
    "opnameType": "full",
    "totalProducts": 1250,
    "totalSystemValue": 850000000,
    "createdAt": "2025-01-30T10:00:00Z"
  }
}
```

---

### 2. Get Count Sheet

```
GET /api/accounting/stock-opname/:id/count-sheet
```

**Query Parameters:**
```
?zone=FAST-MOVING&sortBy=location&format=json
```

**Response (Detailed Location Mode - Large Warehouse):**
```json
{
  "success": true,
  "data": {
    "opnameId": "opn_abc123",
    "opnameNumber": "OPN-2025-0012",
    "locationMode": "detailed",
    "warehouseId": "wh_001",
    "warehouseName": "Gudang Pusat",
    "items": [
      {
        "itemId": "item_001",
        "productId": "prod_001",
        "productName": "Indomie Goreng",
        "sku": "SKU-IG-001",
        "barcode": "8991234567890",
        "location": {
          "zone": "FAST-MOVING",
          "aisle": "A",
          "rack": "01",
          "bin": "A1"
        },
        "systemQuantity": 500,
        "systemValue": 1750000,
        "unitCost": 3500,
        "uom": "pcs",
        "actualQuantity": null,
        "variance": null,
        "status": "pending"
      },
      {
        "itemId": "item_002",
        "productId": "prod_002",
        "productName": "Teh Botol Sosro 450ml",
        "sku": "SKU-TBS-450",
        "barcode": "8992345678901",
        "location": {
          "zone": "BEVERAGES",
          "aisle": "B",
          "rack": "02",
          "bin": "B1"
        },
        "systemQuantity": 200,
        "systemValue": 1000000,
        "unitCost": 5000,
        "uom": "pcs",
        "actualQuantity": null,
        "variance": null,
        "status": "pending"
      }
    ],
    "summary": {
      "totalItems": 1250,
      "countedItems": 0,
      "pendingItems": 1250
    }
  }
}
```

**Response (Simple Location Mode - Offline Store):**
```json
{
  "success": true,
  "data": {
    "opnameId": "opn_def456",
    "opnameNumber": "OPN-2025-0015",
    "locationMode": "simple",
    "warehouseId": "store_kemang_01",
    "warehouseName": "Toko Kemang",
    "items": [
      {
        "itemId": "item_001",
        "productId": "prod_001",
        "productName": "Indomie Goreng",
        "sku": "SKU-IG-001",
        "barcode": "8991234567890",
        "location": null,
        "systemQuantity": 50,
        "systemValue": 175000,
        "unitCost": 3500,
        "uom": "pcs",
        "actualQuantity": null,
        "variance": null,
        "status": "pending"
      },
      {
        "itemId": "item_002",
        "productId": "prod_002",
        "productName": "Teh Botol Sosro 450ml",
        "sku": "SKU-TBS-450",
        "barcode": "8992345678901",
        "location": null,
        "systemQuantity": 24,
        "systemValue": 120000,
        "unitCost": 5000,
        "uom": "pcs",
        "actualQuantity": null,
        "variance": null,
        "status": "pending"
      }
    ],
    "summary": {
      "totalItems": 85,
      "countedItems": 0,
      "pendingItems": 85
    }
  }
}
```

---

### 3. Submit Count Results

```
POST /api/accounting/stock-opname/:id/count
```

**Request Body:**
```json
{
  "counts": [
    {
      "itemId": "item_001",
      "actualQuantity": 495,
      "damaged": 3,
      "expired": 2,
      "notes": "Found 3 damaged packages, 2 expired"
    },
    {
      "itemId": "item_002",
      "actualQuantity": 205,
      "damaged": 0,
      "expired": 0,
      "notes": "5 extra units found"
    }
  ],
  "countedBy": "user_001",
  "countedAt": "2025-01-31T14:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opnameId": "opn_abc123",
    "updatedItems": 2,
    "variances": [
      {
        "itemId": "item_001",
        "productName": "Indomie Goreng",
        "systemQuantity": 500,
        "actualQuantity": 495,
        "damaged": 3,
        "expired": 2,
        "variance": -5,
        "varianceType": "shortage",
        "varianceValue": -17500,
        "damagedValue": -10500,
        "expiredValue": -7000,
        "totalLoss": -35000,
        "withinTolerance": true
      },
      {
        "itemId": "item_002",
        "productName": "Teh Botol Sosro 450ml",
        "systemQuantity": 200,
        "actualQuantity": 205,
        "damaged": 0,
        "expired": 0,
        "variance": 5,
        "varianceType": "overage",
        "varianceValue": 25000,
        "withinTolerance": true
      }
    ]
  }
}
```

---

### 4. Submit via Barcode Scanning

```
POST /api/accounting/stock-opname/:id/scan
```

**Request Body:**
```json
{
  "barcode": "8991234567890",
  "quantity": 50,
  "condition": "good",
  "location": {
    "zone": "FAST-MOVING",
    "rack": "A",
    "bin": "01"
  },
  "scannedBy": "user_001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemId": "item_001",
    "productName": "Indomie Goreng",
    "barcode": "8991234567890",
    "scannedQuantity": 50,
    "cumulativeCount": 450,
    "systemQuantity": 500,
    "remainingToCount": 50,
    "message": "50 more units expected at this location"
  }
}
```

---

### 5. Get Variance Report

```
GET /api/accounting/stock-opname/:id/variances
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opnameId": "opn_abc123",
    "opnameNumber": "OPN-2025-0012",
    "status": "pending_approval",
    "summary": {
      "totalItems": 1250,
      "itemsWithVariance": 45,
      "itemsWithShortage": 30,
      "itemsWithOverage": 10,
      "itemsDamaged": 8,
      "itemsExpired": 5,
      "totalShortageValue": -850000,
      "totalOverageValue": 320000,
      "totalDamagedValue": -450000,
      "totalExpiredValue": -280000,
      "netVarianceValue": -1260000,
      "variancePercentage": -0.15
    },
    "variances": [
      {
        "itemId": "item_001",
        "productId": "prod_001",
        "productName": "Indomie Goreng",
        "sku": "SKU-IG-001",
        "systemQuantity": 500,
        "actualQuantity": 495,
        "variance": -5,
        "varianceType": "shortage",
        "unitCost": 3500,
        "varianceValue": -17500,
        "damaged": 3,
        "damagedValue": -10500,
        "expired": 2,
        "expiredValue": -7000,
        "totalLoss": -35000,
        "withinTolerance": true,
        "reason": "Found 3 damaged packages, 2 expired",
        "requiresApproval": false
      }
    ],
    "itemsRequiringApproval": [
      {
        "itemId": "item_050",
        "productName": "iPhone 15 Pro",
        "variance": -2,
        "varianceValue": -35000000,
        "reason": "High value item, requires manager approval"
      }
    ]
  }
}
```

---

### 6. Approve Stock Opname

```
POST /api/accounting/stock-opname/:id/approve
```

**Request Body:**
```json
{
  "approvedBy": "manager_001",
  "approvalNotes": "Variances verified and approved for adjustment",
  "itemApprovals": [
    {
      "itemId": "item_050",
      "approved": true,
      "adjustmentType": "shortage",
      "notes": "Verified missing, police report filed"
    }
  ]
}
```

---

### 7. Finalize and Generate Journal Entries

```
POST /api/accounting/stock-opname/:id/finalize
```

**Request Body:**
```json
{
  "journalDate": "2025-01-31",
  "description": "Stock opname adjustment - January 2025",
  "createSeparateEntries": false,
  "groupBy": "adjustment_type"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opnameId": "opn_abc123",
    "status": "completed",
    "journalEntries": [
      {
        "journalId": "je_001",
        "type": "INVENTORY_SHORTAGE",
        "description": "Stock opname shortage adjustment",
        "entries": [
          { "accountCode": "6820", "accountName": "Kerugian Persediaan", "debit": 850000, "credit": 0 },
          { "accountCode": "1210", "accountName": "Persediaan", "debit": 0, "credit": 850000 }
        ]
      },
      {
        "journalId": "je_002",
        "type": "INVENTORY_OVERAGE",
        "description": "Stock opname overage adjustment",
        "entries": [
          { "accountCode": "1210", "accountName": "Persediaan", "debit": 320000, "credit": 0 },
          { "accountCode": "4311", "accountName": "Selisih Lebih Persediaan", "debit": 0, "credit": 320000 }
        ]
      },
      {
        "journalId": "je_003",
        "type": "DAMAGED_GOODS",
        "description": "Stock opname damaged goods write-off",
        "entries": [
          { "accountCode": "6822", "accountName": "Kerugian Barang Rusak", "debit": 450000, "credit": 0 },
          { "accountCode": "1210", "accountName": "Persediaan", "debit": 0, "credit": 450000 }
        ]
      },
      {
        "journalId": "je_004",
        "type": "EXPIRED_GOODS",
        "description": "Stock opname expired goods write-off",
        "entries": [
          { "accountCode": "6823", "accountName": "Kerugian Barang Kadaluarsa", "debit": 280000, "credit": 0 },
          { "accountCode": "1210", "accountName": "Persediaan", "debit": 0, "credit": 280000 }
        ]
      }
    ],
    "inventoryMovements": 45,
    "totalJournalEntries": 4,
    "netInventoryAdjustment": -1260000,
    "completedAt": "2025-01-31T18:00:00Z",
    "completedBy": "user_001"
  }
}
```

---

## Integration with Inventory Service

### Event Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STOCK OPNAME EVENT FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ACCOUNTING SERVICE                    INVENTORY SERVICE                     │
│  ────────────────────                 ──────────────────                     │
│                                                                              │
│  1. Create Opname Session ──────────► Freeze movements (optional)            │
│     Event: opname.created              Set warehouse to "counting" mode      │
│                                                                              │
│  2. Finalize Opname ────────────────► Create inventory movements             │
│     Event: opname.finalized            • Type: adjustment_in / adjustment_out│
│                                        • Reason: "Stock opname OPN-2025-0012"│
│                                        Update inventory quantities           │
│                                                                              │
│  3. ◄──────────────────────────────── Inventory updated                      │
│     Event: inventory.adjusted          Return movement IDs                   │
│                                                                              │
│  4. Post Journal Entries                                                     │
│     Create GL entries                                                        │
│     Link to opname record                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Inventory Movement Types

| Movement Type | Direction | Trigger |
|---------------|-----------|---------|
| `adjustment_out` | OUT | Shortage (system > actual) |
| `adjustment_in` | IN | Overage (system < actual) |
| `damaged_out` | OUT | Damaged goods write-off |
| `expired_out` | OUT | Expired goods write-off |

---

## Database Schema

### StockOpname Table

```sql
CREATE TABLE stock_opnames (
  id TEXT PRIMARY KEY,

  -- Identification
  opname_number TEXT UNIQUE NOT NULL,  -- "OPN-2025-0012"
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT NOT NULL,

  -- Dates
  opname_date TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,

  -- Type
  opname_type TEXT NOT NULL,  -- 'full' | 'cycle' | 'spot' | 'abc'
  categories TEXT,  -- JSON array of category IDs (for cycle count)

  -- Settings
  tolerance_percentage REAL DEFAULT 2.0,
  requires_approval INTEGER DEFAULT 1,
  approval_threshold INTEGER DEFAULT 1000000,
  freeze_movements INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'counting' | 'variance_review' | 'pending_approval' | 'approved' | 'completed' | 'cancelled'

  -- Summary
  total_items INTEGER DEFAULT 0,
  counted_items INTEGER DEFAULT 0,
  items_with_variance INTEGER DEFAULT 0,
  total_system_value INTEGER DEFAULT 0,
  total_actual_value INTEGER DEFAULT 0,
  net_variance_value INTEGER DEFAULT 0,

  -- Journal reference
  journal_entry_ids TEXT,  -- JSON array

  -- Team
  assigned_team TEXT,  -- JSON array of user IDs
  created_by TEXT,
  approved_by TEXT,
  approved_at TEXT,
  completed_by TEXT,

  -- Notes
  description TEXT,
  approval_notes TEXT,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_so_warehouse ON stock_opnames(warehouse_id);
CREATE INDEX idx_so_date ON stock_opnames(opname_date);
CREATE INDEX idx_so_status ON stock_opnames(status);
```

### StockOpnameItems Table

```sql
CREATE TABLE stock_opname_items (
  id TEXT PRIMARY KEY,

  opname_id TEXT NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,

  -- Product
  product_id TEXT NOT NULL,
  variant_id TEXT,
  sku TEXT,
  barcode TEXT,
  product_name TEXT NOT NULL,

  -- Location
  zone TEXT,
  aisle TEXT,
  rack TEXT,
  bin TEXT,

  -- System values
  system_quantity INTEGER NOT NULL,
  unit_cost INTEGER NOT NULL,
  system_value INTEGER NOT NULL,
  uom TEXT,

  -- Count values
  actual_quantity INTEGER,
  damaged_quantity INTEGER DEFAULT 0,
  expired_quantity INTEGER DEFAULT 0,

  -- Variance
  variance INTEGER,  -- actual - system (can be negative)
  variance_type TEXT,  -- 'shortage' | 'overage' | 'match'
  variance_value INTEGER,
  damaged_value INTEGER DEFAULT 0,
  expired_value INTEGER DEFAULT 0,
  total_adjustment_value INTEGER,

  -- Tolerance
  within_tolerance INTEGER,

  -- Status
  status TEXT DEFAULT 'pending',  -- 'pending' | 'counted' | 'verified' | 'approved' | 'adjusted'

  -- Notes
  count_notes TEXT,
  variance_reason TEXT,

  -- Count metadata
  counted_by TEXT,
  counted_at TEXT,
  verified_by TEXT,
  verified_at TEXT,

  -- Movement reference
  movement_id TEXT,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_soi_opname ON stock_opname_items(opname_id);
CREATE INDEX idx_soi_product ON stock_opname_items(product_id);
CREATE INDEX idx_soi_status ON stock_opname_items(status);
CREATE INDEX idx_soi_variance_type ON stock_opname_items(variance_type);
```

---

## UI Mockup

### Stock Opname Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📋 Stock Opname                                                    [+ New]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Warehouse: [Gudang Pusat ▼]   Status: [All ▼]   Year: [2025 ▼]             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Opname #      │ Date       │ Type    │ Items  │ Variance    │ Status   │ │
│  ├───────────────┼────────────┼─────────┼────────┼─────────────┼──────────┤ │
│  │ OPN-2025-0012 │ 31 Jan 25  │ Full    │ 1,250  │ (1,260,000) │ ⏳ Count │ │
│  │ OPN-2025-0011 │ 15 Jan 25  │ Cycle   │ 320    │ (85,000)    │ ✅ Done  │ │
│  │ OPN-2025-0010 │ 01 Jan 25  │ Spot    │ 50     │ 12,500      │ ✅ Done  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │  📊 Current Opname Progress │  │  📈 Variance Trend (6 months)       │   │
│  │                             │  │                                     │   │
│  │  Items Counted: 850/1,250   │  │   0% ─┬─────────────────────────   │   │
│  │  [████████████░░░░░░] 68%   │  │  -1% ─┤     ╭─╮                     │   │
│  │                             │  │  -2% ─┤  ╭──╯ ╰──╮    ╭─           │   │
│  │  Shortage: Rp 850,000       │  │  -3% ─┤──╯       ╰────╯            │   │
│  │  Overage:  Rp 320,000       │  │       └─┴──┴──┴──┴──┴──┴──        │   │
│  │  Damaged:  Rp 450,000       │  │        Aug Sep Oct Nov Dec Jan     │   │
│  │  Expired:  Rp 280,000       │  │                                     │   │
│  │  ─────────────────────────  │  └─────────────────────────────────────┘   │
│  │  Net:      Rp (1,260,000)   │                                            │
│  └─────────────────────────────┘                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Counting Interface - Detailed Mode (Large Warehouse)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📱 Stock Opname - OPN-2025-0012                              [Sync] [Done]  │
│  📍 Gudang Pusat                                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  🔍 Scan barcode or search product...                        [📷 Scan] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Location: Zone A > Rack 01 > Bin A1                      [Change Location] │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  📦 Indomie Goreng                                                     │ │
│  │  SKU: SKU-IG-001 | Barcode: 8991234567890                             │ │
│  │                                                                        │ │
│  │  System Qty: 500 pcs                                                   │ │
│  │                                                                        │ │
│  │  Actual Count *                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ [-]                    495                                  [+] │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  Damaged: [  3  ]    Expired: [  2  ]                                 │ │
│  │                                                                        │ │
│  │  Variance: -5 pcs (Rp -17,500)  🔴                                    │ │
│  │                                                                        │ │
│  │  Notes:                                                                │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Found 3 damaged packages, 2 expired                             │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  [Skip]                                              [✅ Save & Next] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Progress: 450/1,250 items                                                   │
│  [██████████████████░░░░░░░░░░░░░░░░░░░░] 36%                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Counting Interface - Simple Mode (Offline Store)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📱 Stock Opname - OPN-2025-0015                              [Sync] [Done]  │
│  🏪 Toko Kemang                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  🔍 Scan barcode or search product...                        [📷 Scan] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│  Products (sorted by name)                                                   │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  📦 Indomie Goreng                                         System: 50  │ │
│  │  ┌────────────────┐                                                    │ │
│  │  │ Actual: [ 48 ] │  Dmg: [ 1 ]  Exp: [ 1 ]   Var: -2  🔴             │ │
│  │  └────────────────┘                                                    │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  📦 Teh Botol Sosro 450ml                                  System: 24  │ │
│  │  ┌────────────────┐                                                    │ │
│  │  │ Actual: [ 24 ] │  Dmg: [ 0 ]  Exp: [ 0 ]   Var:  0  🟢             │ │
│  │  └────────────────┘                                                    │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  📦 Pocari Sweat 500ml                                     System: 12  │ │
│  │  ┌────────────────┐                                                    │ │
│  │  │ Actual: [ 14 ] │  Dmg: [ 0 ]  Exp: [ 0 ]   Var: +2  🔵             │ │
│  │  └────────────────┘                                                    │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  📦 Aqua 600ml                                             System: 36  │ │
│  │  ┌────────────────┐                                                    │ │
│  │  │ Actual: [    ] │  Dmg: [   ]  Exp: [   ]   Var:  -  ⚪             │ │
│  │  └────────────────┘                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Progress: 32/85 items                                                       │
│  [██████████████░░░░░░░░░░░░░░░░░░░░░░░░] 38%                               │
│                                                                              │
│  [Save Progress]                                    [✅ Complete Opname]    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key Differences:**

| Feature | Detailed Mode | Simple Mode |
|---------|---------------|-------------|
| Location Selection | Zone → Rack → Bin | None (warehouse only) |
| Item Display | One item at a time | List view with inline input |
| Navigation | Next/Previous item | Scroll through list |
| Use Case | Large warehouse | Retail store, kiosk |
| Typical Items | 500-5000+ | 50-200 |

---

## Validation Rules

### 1. Session Validation
- Only one active opname per warehouse at a time
- Cannot create opname if previous one not completed
- Opname date cannot be in the future

### 2. Count Validation
- Actual quantity cannot be negative
- Damaged + Expired cannot exceed actual quantity
- Count must be entered before submitting

### 3. Approval Validation
- Items exceeding threshold require manager approval
- Cannot finalize without all approvals

### 4. Journal Entry Validation
- Total debits must equal total credits
- Cannot post to closed period
- Inventory account balance cannot go negative

---

## Business Rules

### Rule 1: Tolerance Threshold
- Default tolerance: 2% of system quantity
- Items within tolerance: Auto-approved
- Items exceeding tolerance: Require review

### Rule 2: Approval Levels
- < Rp 100,000: Auto-approved
- Rp 100,000 - Rp 1,000,000: Supervisor approval
- > Rp 1,000,000: Manager approval
- > Rp 10,000,000: Director approval

### Rule 3: Movement Freeze
- When enabled, no inventory movements during counting
- Exception: Emergency sales (requires override)

### Rule 4: Journal Entry Grouping
- Option 1: Single combined entry
- Option 2: Separate by adjustment type
- Option 3: Separate by product category

---

## Related Documentation

- [Good Receipt/Issue Workflow](../inventory/GOOD_RECEIPT_ISSUE_WORKFLOW.md) - Inventory movements
- [Asset Accounting Business Rules](./ASSET_ACCOUNTING_BUSINESS_RULES.md) - Inventory accounting rules
- [Business Rules](./BUSINESS_RULES.md) - General accounting rules
- [Phase 8: Stock Opname Implementation](../inventory/PHASE_8_STOCK_OPNAME.md) - Inventory Service implementation
