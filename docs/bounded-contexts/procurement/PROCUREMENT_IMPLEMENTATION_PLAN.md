# Procurement & Market Intelligence Service - Implementation Plan

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Pending Implementation
**Estimated Phases**: 12 Phases

---

## Overview

This document outlines the implementation plan for the Procurement & Market Intelligence Service. The implementation is divided into phases, each building upon the previous, ensuring stable deliverables at each milestone.

---

## ⚠️ TDD Approach (MANDATORY)

**This project uses Test-Driven Development (TDD).** All implementation MUST follow the Red-Green-Refactor cycle:

### TDD Workflow for Each Phase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TDD IMPLEMENTATION ORDER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Write Unit Tests (test/unit/)           ← Write FIRST, should FAIL    │
│      ↓                                                                      │
│   2. Implement Domain/Application Code       ← Minimal code to pass tests  │
│      ↓                                                                      │
│   3. Write Integration Tests (test/integration/)                            │
│      ↓                                                                      │
│   4. Implement Infrastructure Code           ← Repositories, handlers      │
│      ↓                                                                      │
│   5. Write E2E Tests (test/e2e/)                                           │
│      ↓                                                                      │
│   6. Implement Routes/Controllers            ← Wire everything together    │
│      ↓                                                                      │
│   7. Refactor (keep all tests green)                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Coverage Requirements

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Domain (entities, value objects, services) | >90% | Required |
| Application (commands, queries, handlers) | >80% | Required |
| Infrastructure (repositories, controllers) | >70% | Required |

---

## Prerequisites

Before starting implementation:

1. **Business Partner Service** - Should be implemented or in progress (suppliers data)
2. **Inventory Service** - Phases 1-6 complete (stock data integration)
3. **Product Service** - Product catalog available
4. **Order Service** - Sales data available for forecasting

---

## Implementation Phases

### Phase 1: Foundation & Schema Setup
**Duration Estimate**: Foundation phase
**Dependencies**: None

#### Step 1.1: Create Service Scaffold
**Deliverable**: Basic Cloudflare Worker service structure

```
services/procurement-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── aggregates/
│   │   ├── events/
│   │   └── repositories/
│   ├── application/
│   │   ├── use-cases/
│   │   ├── services/
│   │   └── dto/
│   ├── infrastructure/
│   │   ├── db/
│   │   ├── repositories/
│   │   ├── http/
│   │   └── scrapers/
│   └── routes/
├── migrations/
├── test/
├── wrangler.toml
└── package.json
```

**Tasks**:
- [ ] Initialize Cloudflare Worker project
- [ ] Configure wrangler.toml with D1 bindings
- [ ] Setup TypeScript configuration
- [ ] Install dependencies (Hono, Drizzle, Zod)
- [ ] Create base route structure

---

#### Step 1.2: Database Schema - Core Tables
**Deliverable**: Migration file `0001_initial_schema.sql`

**Tables**:
```sql
-- Purchase Orders
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  order_date TEXT NOT NULL,
  expected_delivery_date TEXT,
  actual_delivery_date TEXT,
  warehouse_id TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  payment_terms TEXT,
  payment_due_date TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Line Items
CREATE TABLE purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  tax_percent REAL DEFAULT 0,
  total_price REAL NOT NULL,
  uom_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Goods Receipt Notes
CREATE TABLE goods_receipt_notes (
  id TEXT PRIMARY KEY,
  grn_number TEXT NOT NULL UNIQUE,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  supplier_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  receipt_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  total_items INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  received_by TEXT NOT NULL,
  verified_by TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- GRN Line Items
CREATE TABLE grn_items (
  id TEXT PRIMARY KEY,
  grn_id TEXT NOT NULL REFERENCES goods_receipt_notes(id),
  po_item_id TEXT NOT NULL REFERENCES purchase_order_items(id),
  product_id TEXT NOT NULL,
  ordered_quantity INTEGER NOT NULL,
  received_quantity INTEGER NOT NULL,
  accepted_quantity INTEGER NOT NULL,
  rejected_quantity INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  batch_number TEXT,
  expiration_date TEXT,
  inspection_status TEXT DEFAULT 'PENDING',
  storage_location TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_date ON purchase_orders(order_date);
CREATE INDEX idx_grn_po ON goods_receipt_notes(purchase_order_id);
CREATE INDEX idx_grn_date ON goods_receipt_notes(receipt_date);
```

**Tasks**:
- [ ] Create migration file
- [ ] Define Drizzle schema
- [ ] Test migration locally
- [ ] Create seed data script

---

#### Step 1.3: Domain Layer - Core Entities
**Deliverable**: Domain entities and value objects

**Entities**:
- `PurchaseOrder` (Aggregate Root)
- `PurchaseOrderItem` (Entity)
- `GoodsReceiptNote` (Aggregate Root)
- `GRNItem` (Entity)

**Value Objects**:
- `PONumber` (format validation)
- `GRNNumber` (format validation)
- `Money` (amount with currency)
- `Quantity` (positive integer)
- `POStatus` (enum)
- `GRNStatus` (enum)

**Tasks**:
- [ ] Create entity classes
- [ ] Create value objects with validation
- [ ] Implement aggregate methods
- [ ] Add domain events

---

### Phase 2: Purchase Order Management
**Duration Estimate**: Core functionality phase
**Dependencies**: Phase 1

#### Step 2.1: Purchase Order CRUD Operations
**Deliverable**: Complete PO management API

**Endpoints**:
```typescript
// Purchase Orders
POST   /api/procurement/purchase-orders           // Create draft PO
GET    /api/procurement/purchase-orders           // List POs with filters
GET    /api/procurement/purchase-orders/:id       // Get PO details
PUT    /api/procurement/purchase-orders/:id       // Update draft PO
DELETE /api/procurement/purchase-orders/:id       // Delete draft PO

// PO Items
POST   /api/procurement/purchase-orders/:id/items // Add item
PUT    /api/procurement/purchase-orders/:id/items/:itemId // Update item
DELETE /api/procurement/purchase-orders/:id/items/:itemId // Remove item
```

**Use Cases**:
- `CreatePurchaseOrderUseCase`
- `UpdatePurchaseOrderUseCase`
- `DeletePurchaseOrderUseCase`
- `GetPurchaseOrderUseCase`
- `ListPurchaseOrdersUseCase`
- `AddPurchaseOrderItemUseCase`

**Tasks**:
- [ ] Implement repository interface
- [ ] Implement D1 repository
- [ ] Create use cases
- [ ] Create route handlers
- [ ] Add Zod validation schemas
- [ ] Write unit tests
- [ ] Write integration tests

---

#### Step 2.2: Purchase Order Workflow
**Deliverable**: Status transition management

**State Machine**:
```typescript
const PO_TRANSITIONS: Record<POStatus, POStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['SENT_TO_SUPPLIER', 'CANCELLED'],
  REJECTED: ['DRAFT'], // Can revise and resubmit
  SENT_TO_SUPPLIER: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CLOSED'],
  RECEIVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: []
};
```

**Endpoints**:
```typescript
POST /api/procurement/purchase-orders/:id/submit      // DRAFT → PENDING
POST /api/procurement/purchase-orders/:id/approve     // PENDING → APPROVED
POST /api/procurement/purchase-orders/:id/reject      // PENDING → REJECTED
POST /api/procurement/purchase-orders/:id/send        // APPROVED → SENT
POST /api/procurement/purchase-orders/:id/close       // Any valid → CLOSED
POST /api/procurement/purchase-orders/:id/cancel      // Valid states → CANCELLED
```

**Tasks**:
- [ ] Implement state machine
- [ ] Add transition validation
- [ ] Implement approval workflow with thresholds
- [ ] Add audit trail logging
- [ ] Create domain events for transitions
- [ ] Write workflow tests

---

#### Step 2.3: Approval Threshold Integration
**Deliverable**: RBAC-based approval system

**Integration**:
```typescript
interface ApprovalThreshold {
  minAmount: number;
  maxAmount: number;
  requiredRole: string;
  requiredPermission: string;
}

const APPROVAL_THRESHOLDS: ApprovalThreshold[] = [
  { minAmount: 0, maxAmount: 5000000, requiredRole: 'PROCUREMENT_STAFF', requiredPermission: 'po:approve:low' },
  { minAmount: 5000001, maxAmount: 25000000, requiredRole: 'PROCUREMENT_MANAGER', requiredPermission: 'po:approve:medium' },
  { minAmount: 25000001, maxAmount: 100000000, requiredRole: 'FINANCE_MANAGER', requiredPermission: 'po:approve:high' },
  { minAmount: 100000001, maxAmount: Infinity, requiredRole: 'DIRECTOR', requiredPermission: 'po:approve:executive' }
];
```

**Tasks**:
- [ ] Create approval threshold configuration
- [ ] Integrate with Business Partner Service for RBAC
- [ ] Implement multi-level approval if required
- [ ] Add approval delegation support
- [ ] Write approval tests

---

### Phase 3: Goods Receipt Management
**Duration Estimate**: Core functionality phase
**Dependencies**: Phase 2

#### Step 3.1: GRN CRUD Operations
**Deliverable**: Complete GRN management API

**Endpoints**:
```typescript
// Goods Receipt Notes
POST   /api/procurement/grn                    // Create GRN from PO
GET    /api/procurement/grn                    // List GRNs
GET    /api/procurement/grn/:id                // Get GRN details
PUT    /api/procurement/grn/:id                // Update GRN
POST   /api/procurement/grn/:id/verify         // Verify and accept

// GRN Items
PUT    /api/procurement/grn/:id/items/:itemId  // Update received qty
POST   /api/procurement/grn/:id/items/:itemId/inspect // Record inspection
```

**Use Cases**:
- `CreateGRNFromPOUseCase`
- `UpdateGRNUseCase`
- `VerifyGRNUseCase`
- `RecordInspectionUseCase`

**Tasks**:
- [ ] Implement GRN repository
- [ ] Create use cases
- [ ] Add batch/expiration capture
- [ ] Implement partial receipt handling
- [ ] Write tests

---

#### Step 3.2: Inventory Service Integration
**Deliverable**: Stock update on goods receipt

**Event Flow**:
```
GRN Verified → Publish GoodsReceived Event → Inventory Service Creates Stock
```

**Event Payload**:
```typescript
interface GoodsReceivedEvent {
  type: 'GoodsReceived';
  payload: {
    grnId: string;
    grnNumber: string;
    warehouseId: string;
    items: Array<{
      productId: string;
      quantity: number;
      batchNumber?: string;
      expirationDate?: string;
      locationId?: string;
    }>;
    receivedAt: string;
    receivedBy: string;
  };
}
```

**Tasks**:
- [ ] Define event schema
- [ ] Implement event publisher
- [ ] Create Inventory Service event handler
- [ ] Implement saga for rollback on failure
- [ ] Write integration tests

---

#### Step 3.3: Quality Inspection Module
**Deliverable**: Inspection workflow for receipts

**Inspection States**:
```
PENDING → IN_PROGRESS → PASSED / FAILED / CONDITIONAL
```

**Integration**:
- Failed items → Create supplier return request
- Conditional → Trigger discount negotiation workflow

**Tasks**:
- [ ] Create inspection entity
- [ ] Implement inspection workflow
- [ ] Add inspection checklist per category
- [ ] Create return request generation
- [ ] Write tests

---

### Phase 4: Demand Forecasting Engine
**Duration Estimate**: Advanced analytics phase
**Dependencies**: Phase 3, Order Service (sales data)

#### Step 4.1: Historical Data Collection
**Deliverable**: Sales data aggregation for forecasting

**Schema Addition** (migration `0002_forecasting.sql`):
```sql
-- Sales History Aggregation
CREATE TABLE sales_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  period_type TEXT NOT NULL, -- DAILY, WEEKLY, MONTHLY
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  quantity_sold INTEGER NOT NULL,
  revenue REAL NOT NULL,
  orders_count INTEGER NOT NULL,
  average_price REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Forecast Results
CREATE TABLE demand_forecasts (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  forecast_date TEXT NOT NULL,
  period_type TEXT NOT NULL,
  base_forecast REAL NOT NULL,
  seasonal_multiplier REAL DEFAULT 1.0,
  trend_adjustment REAL DEFAULT 1.0,
  final_forecast REAL NOT NULL,
  confidence_lower REAL,
  confidence_upper REAL,
  algorithm_used TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_product ON sales_history(product_id, period_start);
CREATE INDEX idx_forecast_product ON demand_forecasts(product_id, forecast_date);
```

**Tasks**:
- [ ] Create sales history aggregator
- [ ] Subscribe to SalesCompleted events
- [ ] Build daily/weekly/monthly rollups
- [ ] Create data quality checks
- [ ] Write tests

---

#### Step 4.2: Forecasting Algorithms
**Deliverable**: Multiple forecasting algorithm implementations

**Algorithms**:
```typescript
interface ForecastAlgorithm {
  name: string;
  minDataPoints: number;
  calculate(history: SalesHistory[]): ForecastResult;
}

// Implementations
class MovingAverageForecaster implements ForecastAlgorithm { }
class ExponentialSmoothingForecaster implements ForecastAlgorithm { }
class LinearRegressionForecaster implements ForecastAlgorithm { }
class SeasonalDecompositionForecaster implements ForecastAlgorithm { }
class CrostonsMethodForecaster implements ForecastAlgorithm { } // For intermittent demand
```

**Algorithm Selection Logic**:
```typescript
function selectAlgorithm(history: SalesHistory[]): ForecastAlgorithm {
  if (history.length < 12) return new MovingAverageForecaster();
  if (hasSeasonality(history)) return new SeasonalDecompositionForecaster();
  if (hasTrend(history)) return new LinearRegressionForecaster();
  if (isIntermittent(history)) return new CrostonsMethodForecaster();
  return new ExponentialSmoothingForecaster();
}
```

**Tasks**:
- [ ] Implement Moving Average
- [ ] Implement Exponential Smoothing
- [ ] Implement Linear Regression
- [ ] Implement Seasonal Decomposition
- [ ] Implement Croston's Method
- [ ] Create algorithm selector
- [ ] Write accuracy tests

---

#### Step 4.3: Forecast Generation Service
**Deliverable**: Scheduled forecast generation

**Endpoints**:
```typescript
POST /api/procurement/forecasts/generate         // Trigger forecast generation
GET  /api/procurement/forecasts/product/:id      // Get product forecast
GET  /api/procurement/forecasts/category/:id     // Get category forecast
GET  /api/procurement/forecasts/accuracy         // Get forecast accuracy metrics
```

**Scheduled Jobs**:
- Daily forecast refresh at 02:00 WIB
- Weekly forecast summary at Sunday 06:00 WIB
- Monthly accuracy review at 1st of month

**Tasks**:
- [ ] Create forecast generation service
- [ ] Implement Cloudflare Cron trigger
- [ ] Build forecast API endpoints
- [ ] Add forecast accuracy tracking
- [ ] Write tests

---

### Phase 5: Seasonal Analytics
**Duration Estimate**: Advanced analytics phase
**Dependencies**: Phase 4

#### Step 5.1: Seasonal Calendar Setup
**Deliverable**: Indonesian seasonal pattern configuration

**Schema Addition** (migration `0003_seasonal.sql`):
```sql
-- Seasonal Patterns
CREATE TABLE seasonal_patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_month INTEGER NOT NULL,
  start_day INTEGER NOT NULL,
  end_month INTEGER NOT NULL,
  end_day INTEGER NOT NULL,
  is_islamic_calendar INTEGER DEFAULT 0,
  demand_multiplier REAL NOT NULL DEFAULT 1.0,
  preparation_weeks INTEGER NOT NULL DEFAULT 4,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Season-Category Mapping
CREATE TABLE seasonal_category_mapping (
  id TEXT PRIMARY KEY,
  seasonal_pattern_id TEXT NOT NULL REFERENCES seasonal_patterns(id),
  category_id TEXT NOT NULL,
  custom_multiplier REAL, -- Override pattern multiplier
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seasonal Forecast Adjustments
CREATE TABLE seasonal_adjustments (
  id TEXT PRIMARY KEY,
  forecast_id TEXT NOT NULL REFERENCES demand_forecasts(id),
  seasonal_pattern_id TEXT NOT NULL REFERENCES seasonal_patterns(id),
  original_forecast REAL NOT NULL,
  multiplier_applied REAL NOT NULL,
  adjusted_forecast REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Seed Data**:
```typescript
const INDONESIAN_SEASONS = [
  { name: 'Back to School', startMonth: 6, startDay: 15, endMonth: 8, endDay: 15, multiplier: 2.5 },
  { name: 'Ramadan', isIslamicCalendar: true, multiplier: 2.0 },
  { name: 'Eid al-Fitr', isIslamicCalendar: true, multiplier: 3.0 },
  // ... more patterns
];
```

**Tasks**:
- [ ] Create seasonal pattern entity
- [ ] Implement Islamic calendar conversion
- [ ] Build season detection logic
- [ ] Create category mapping management
- [ ] Seed Indonesian seasonal patterns
- [ ] Write tests

---

#### Step 5.2: Seasonal Forecast Adjustment
**Deliverable**: Automatic seasonal multiplier application

**Logic**:
```typescript
function applySeasonalAdjustment(
  baseForecast: number,
  productCategoryId: string,
  forecastDate: Date
): AdjustedForecast {
  const activeSeasons = getActiveSeasons(forecastDate);
  const categoryMultipliers = getCategoryMultipliers(productCategoryId, activeSeasons);

  // Apply highest multiplier if multiple seasons overlap
  const multiplier = Math.max(...categoryMultipliers, 1.0);

  return {
    baseForecast,
    seasonalMultiplier: multiplier,
    adjustedForecast: baseForecast * multiplier,
    appliedSeasons: activeSeasons
  };
}
```

**Tasks**:
- [ ] Create seasonal adjustment service
- [ ] Integrate with forecast generation
- [ ] Handle overlapping seasons
- [ ] Add manual override capability
- [ ] Write tests

---

#### Step 5.3: Seasonal Preparation Alerts
**Deliverable**: Proactive procurement recommendations

**Alert Types**:
- "Back to School season starts in 6 weeks - Review school uniform inventory"
- "Ramadan approaching - Prepare muslim wear stock"
- "Year-end shopping season - Increase gift category inventory"

**Endpoints**:
```typescript
GET /api/procurement/seasonal/upcoming          // Get upcoming seasons
GET /api/procurement/seasonal/recommendations   // Get procurement recommendations
GET /api/procurement/seasonal/calendar          // Get full seasonal calendar
```

**Tasks**:
- [ ] Create preparation alert service
- [ ] Implement recommendation engine
- [ ] Build notification integration
- [ ] Add dashboard widgets
- [ ] Write tests

---

### Phase 6: Market Intelligence - Scraping Infrastructure
**Duration Estimate**: Infrastructure phase
**Dependencies**: Phase 1

#### Step 6.1: Scraper Framework
**Deliverable**: Reusable web scraping infrastructure

**Architecture**:
```typescript
interface MarketplaceScraper {
  marketplace: string;
  scrapeProduct(url: string): Promise<ScrapedProduct>;
  scrapeCategory(categoryId: string): Promise<ScrapedProduct[]>;
  scrapeTrending(): Promise<TrendingItem[]>;
  searchProducts(query: string): Promise<ScrapedProduct[]>;
}

// Base implementation with rate limiting, retry, caching
abstract class BaseMarketplaceScraper implements MarketplaceScraper {
  protected rateLimiter: RateLimiter;
  protected cache: KVCache;

  protected async fetchWithRateLimit(url: string): Promise<Response> {
    await this.rateLimiter.acquire();
    // ... fetch with retry logic
  }
}
```

**Tasks**:
- [ ] Create base scraper class
- [ ] Implement rate limiter (1 req/sec per domain)
- [ ] Add retry with exponential backoff
- [ ] Create response caching (KV)
- [ ] Implement proxy rotation (if needed)
- [ ] Write tests

---

#### Step 6.2: Shopee Scraper
**Deliverable**: Shopee Indonesia marketplace scraper

**Data Points**:
- Product name, price, discount
- Seller info, rating
- Sales count, stock status
- Category, attributes

**Implementation Notes**:
- Use Shopee's public API endpoints
- Respect rate limits
- Handle anti-bot measures

**Tasks**:
- [ ] Analyze Shopee API structure
- [ ] Implement product scraper
- [ ] Implement category scraper
- [ ] Implement search scraper
- [ ] Add data transformation
- [ ] Write tests

---

#### Step 6.3: Tokopedia Scraper
**Deliverable**: Tokopedia marketplace scraper

**Similar structure to Shopee**

**Tasks**:
- [ ] Analyze Tokopedia API structure
- [ ] Implement scrapers
- [ ] Handle GraphQL if needed
- [ ] Write tests

---

#### Step 6.4: TikTok Shop Scraper
**Deliverable**: TikTok Shop marketplace scraper

**Tasks**:
- [ ] Analyze TikTok Shop structure
- [ ] Implement scrapers
- [ ] Handle authentication if needed
- [ ] Write tests

---

### Phase 7: Market Intelligence - Trend Analysis
**Duration Estimate**: Analytics phase
**Dependencies**: Phase 6

#### Step 7.1: Product Matching Engine
**Deliverable**: Match external products to internal catalog

**Schema Addition** (migration `0004_market_intelligence.sql`):
```sql
-- External Product Mappings
CREATE TABLE product_mappings (
  id TEXT PRIMARY KEY,
  internal_product_id TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  external_product_id TEXT NOT NULL,
  external_url TEXT,
  match_confidence REAL NOT NULL,
  match_method TEXT NOT NULL, -- EXACT_SKU, NAME_SIMILARITY, MANUAL
  is_verified INTEGER DEFAULT 0,
  verified_by TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(marketplace, external_product_id)
);

-- Price History
CREATE TABLE competitor_prices (
  id TEXT PRIMARY KEY,
  product_mapping_id TEXT NOT NULL REFERENCES product_mappings(id),
  price REAL NOT NULL,
  original_price REAL,
  discount_percent REAL,
  shipping_cost REAL,
  seller_name TEXT,
  seller_rating REAL,
  stock_status TEXT,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trend Data
CREATE TABLE market_trends (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL, -- SHOPEE, TOKOPEDIA, TIKTOK_SHOP, TIKTOK_SOCIAL
  trend_type TEXT NOT NULL, -- SEARCH, SALES, VIRAL
  keyword TEXT NOT NULL,
  category TEXT,
  trend_score REAL NOT NULL,
  volume INTEGER,
  growth_rate REAL,
  related_products TEXT, -- JSON array
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mapping_product ON product_mappings(internal_product_id);
CREATE INDEX idx_prices_mapping ON competitor_prices(product_mapping_id, captured_at);
CREATE INDEX idx_trends_source ON market_trends(source, captured_at);
```

**Matching Algorithm**:
```typescript
function matchProduct(external: ScrapedProduct, catalog: Product[]): MatchResult {
  // 1. Try exact SKU/barcode match
  const exactMatch = catalog.find(p => p.sku === external.sku || p.barcode === external.barcode);
  if (exactMatch) return { product: exactMatch, confidence: 1.0, method: 'EXACT_SKU' };

  // 2. Try name similarity
  const nameMatches = catalog
    .map(p => ({ product: p, similarity: calculateSimilarity(p.name, external.name) }))
    .filter(m => m.similarity >= 0.8)
    .sort((a, b) => b.similarity - a.similarity);

  if (nameMatches.length > 0) {
    return { product: nameMatches[0].product, confidence: nameMatches[0].similarity, method: 'NAME_SIMILARITY' };
  }

  return { product: null, confidence: 0, method: 'NO_MATCH' };
}
```

**Tasks**:
- [ ] Implement matching algorithms
- [ ] Create manual mapping UI support
- [ ] Build verification workflow
- [ ] Add bulk matching jobs
- [ ] Write tests

---

#### Step 7.2: Price Monitoring Service
**Deliverable**: Scheduled price tracking

**Jobs**:
- High-velocity products: Every 4 hours
- Medium-velocity: Daily
- Low-velocity: Weekly

**Alerts**:
- Competitor undercut alert
- Price spike detection
- Out-of-stock competitor alert

**Tasks**:
- [ ] Create price monitoring scheduler
- [ ] Implement price change detection
- [ ] Build alert generation
- [ ] Create price history API
- [ ] Write tests

---

#### Step 7.3: TikTok Social Trend Scraper
**Deliverable**: Viral trend detection from TikTok

**Data Points**:
- Trending hashtags
- Viral product mentions
- Influencer promotions
- Engagement metrics

**Validation**:
- Minimum views threshold
- Engagement rate check
- Indonesia geo-filter
- Bot/fake engagement detection

**Tasks**:
- [ ] Implement TikTok trend scraper
- [ ] Build trend validation logic
- [ ] Create product mention extraction
- [ ] Map trends to product categories
- [ ] Write tests

---

### Phase 8: Reorder & Procurement Recommendations
**Duration Estimate**: Intelligence phase
**Dependencies**: Phase 4, 5, 7

#### Step 8.1: Reorder Point Calculation
**Deliverable**: Automatic reorder point management

**Logic**:
```typescript
function calculateReorderPoint(product: Product): ReorderPoint {
  const avgDailyDemand = getAverageDailyDemand(product.id);
  const leadTime = getSupplierLeadTime(product.preferredSupplierId);
  const safetyStock = calculateSafetyStock(product.id);

  return {
    reorderPoint: (avgDailyDemand * leadTime) + safetyStock,
    safetyStock,
    leadTime,
    lastCalculated: new Date()
  };
}
```

**Tasks**:
- [ ] Implement reorder point calculator
- [ ] Create scheduled recalculation job
- [ ] Build reorder alert system
- [ ] Add manual override capability
- [ ] Write tests

---

#### Step 8.2: Purchase Recommendation Engine
**Deliverable**: AI-driven purchase suggestions

**Recommendations**:
- "Order 500 units of School Uniform - Back to School season approaching"
- "Consider stocking Product X - trending on TikTok with 2M views"
- "Reorder Product Y - Stock will reach zero in 5 days"

**Factors**:
- Current stock level
- Forecast demand
- Seasonal adjustments
- Market trends
- Supplier lead time
- Price optimization

**Tasks**:
- [ ] Create recommendation engine
- [ ] Build recommendation scoring
- [ ] Implement recommendation API
- [ ] Add feedback loop for learning
- [ ] Write tests

---

#### Step 8.3: Auto-PO Generation
**Deliverable**: Automatic purchase order creation

**Flow**:
```
Recommendation Approved → Generate Draft PO → Route for Approval → Send to Supplier
```

**Configuration**:
- Enable/disable auto-PO per category
- Set approval thresholds
- Define preferred suppliers

**Tasks**:
- [ ] Implement auto-PO generator
- [ ] Create configuration management
- [ ] Build approval routing
- [ ] Add audit trail
- [ ] Write tests

---

### Phase 9: Reporting & Analytics Dashboard
**Duration Estimate**: Visualization phase
**Dependencies**: Phase 3, 4, 5, 7

#### Step 9.1: Procurement Reports
**Deliverable**: Standard procurement reports

**Reports**:
- Purchase Order Summary
- Supplier Performance Report
- Goods Receipt Report
- Pending Deliveries Report
- Cost Analysis Report

**Tasks**:
- [ ] Create report generator service
- [ ] Build export (PDF, Excel)
- [ ] Add scheduled report delivery
- [ ] Write tests

---

#### Step 9.2: Forecasting Dashboard Data
**Deliverable**: Dashboard API for forecasting visualization

**Endpoints**:
```typescript
GET /api/procurement/dashboard/forecast-summary
GET /api/procurement/dashboard/seasonal-calendar
GET /api/procurement/dashboard/accuracy-metrics
GET /api/procurement/dashboard/recommendations
```

**Tasks**:
- [ ] Create dashboard data aggregator
- [ ] Build chart-ready data formats
- [ ] Add real-time updates (WebSocket)
- [ ] Write tests

---

#### Step 9.3: Market Intelligence Dashboard
**Deliverable**: Competitive intelligence visualization

**Widgets**:
- Price comparison chart
- Trend heatmap
- Competitor activity timeline
- Alert feed

**Tasks**:
- [ ] Create market intelligence aggregator
- [ ] Build visualization data API
- [ ] Add filtering and drill-down
- [ ] Write tests

---

### Phase 10: Accounting Integration
**Duration Estimate**: Integration phase
**Dependencies**: Phase 3, Accounting Service

#### Step 10.1: Purchase Journal Entries
**Deliverable**: Automatic accounting entries from procurement

**Events → Journal Entries**:
1. **Goods Received**:
   - Debit: Inventory Asset (based on product category account)
   - Credit: Accounts Payable - Supplier

2. **Purchase Return**:
   - Debit: Accounts Payable - Supplier
   - Credit: Inventory Asset

**Tasks**:
- [ ] Create journal entry generator
- [ ] Map product categories to accounts
- [ ] Subscribe to GoodsReceived event
- [ ] Implement return handling
- [ ] Write tests

---

#### Step 10.2: Supplier Payment Integration
**Deliverable**: Payment tracking and reconciliation

**Flow**:
```
Invoice Received → Matched to GRN → Payment Scheduled → Payment Made → Reconciled
```

**Tasks**:
- [ ] Create invoice matching
- [ ] Build payment scheduling
- [ ] Implement payment recording
- [ ] Add reconciliation reports
- [ ] Write tests

---

### Phase 11: Notifications & Alerts
**Duration Estimate**: Polish phase
**Dependencies**: All previous phases

#### Step 11.1: Alert Management System
**Deliverable**: Centralized alert handling

**Alert Types**:
- Reorder alerts
- Price alerts
- Trend alerts
- Delivery alerts
- Approval requests

**Channels**:
- In-app notifications
- Email
- Push notifications
- SMS (critical only)

**Tasks**:
- [ ] Create alert entity and repository
- [ ] Build notification dispatcher
- [ ] Implement channel preferences
- [ ] Add alert deduplication
- [ ] Write tests

---

#### Step 11.2: Webhook Integration
**Deliverable**: External system notifications

**Webhooks**:
- PO status changes
- GRN completion
- Alert triggers

**Tasks**:
- [ ] Create webhook registration
- [ ] Implement delivery with retry
- [ ] Add webhook logs
- [ ] Write tests

---

### Phase 12: Testing & Documentation
**Duration Estimate**: Quality phase
**Dependencies**: All phases

#### Step 12.1: Comprehensive Testing
**Deliverable**: Full test coverage

**Test Types**:
- Unit tests (>80% coverage)
- Integration tests
- E2E tests
- Performance tests

**Critical Paths**:
- PO creation → approval → sending → receipt
- Forecast generation → seasonal adjustment → recommendation
- Price monitoring → alert → recommendation

**Tasks**:
- [ ] Write remaining unit tests
- [ ] Create integration test suite
- [ ] Build E2E test scenarios
- [ ] Run performance benchmarks
- [ ] Fix identified issues

---

#### Step 12.2: API Documentation
**Deliverable**: OpenAPI specification

**Tasks**:
- [ ] Generate OpenAPI spec
- [ ] Add request/response examples
- [ ] Document error codes
- [ ] Create Postman collection

---

#### Step 12.3: Operations Documentation
**Deliverable**: Runbooks and guides

**Documents**:
- Deployment guide
- Monitoring setup
- Troubleshooting guide
- Scraper maintenance guide

**Tasks**:
- [ ] Write deployment guide
- [ ] Create monitoring alerts
- [ ] Document common issues
- [ ] Create scraper maintenance procedures

---

## Implementation Checklist Summary

### Foundation (Phase 1)
- [ ] Service scaffold created
- [ ] Database schema deployed
- [ ] Domain entities implemented

### Core Procurement (Phase 2-3)
- [ ] Purchase Order CRUD complete
- [ ] PO workflow implemented
- [ ] GRN management complete
- [ ] Inventory integration working

### Forecasting (Phase 4-5)
- [ ] Sales data aggregation running
- [ ] Forecasting algorithms implemented
- [ ] Seasonal patterns configured
- [ ] Seasonal adjustments working

### Market Intelligence (Phase 6-7)
- [ ] Scraper framework ready
- [ ] Shopee scraper working
- [ ] Tokopedia scraper working
- [ ] TikTok scrapers working
- [ ] Product matching functional
- [ ] Price monitoring active

### Intelligence (Phase 8)
- [ ] Reorder points calculated
- [ ] Recommendations generated
- [ ] Auto-PO working (optional)

### Reporting (Phase 9)
- [ ] Reports generating
- [ ] Dashboard data API ready

### Integration (Phase 10)
- [ ] Accounting entries created
- [ ] Payment tracking working

### Polish (Phase 11-12)
- [ ] Alerts functional
- [ ] Tests passing
- [ ] Documentation complete

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Scraper blocked by marketplace | High | Implement proxy rotation, respect rate limits |
| Forecast accuracy low | Medium | Use multiple algorithms, continuous learning |
| Integration failures | High | Saga pattern with compensating transactions |
| Performance issues | Medium | Caching, pagination, async processing |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Seasonal pattern changes | Medium | Configurable patterns, YoY comparison |
| Supplier data quality | Medium | Validation rules, manual review workflow |
| Market data staleness | Low | Freshness indicators, auto-refresh |

---

## Success Metrics

### Operational Metrics
- PO processing time: < 24 hours from request to approval
- GRN processing time: < 2 hours from receipt to inventory update
- Forecast accuracy (MAPE): < 20%

### Business Metrics
- Stock-out reduction: > 30%
- Inventory turnover improvement: > 15%
- Procurement cost savings: > 10%

---

## Related Documents

- [Procurement Service Architecture](./PROCUREMENT_SERVICE_ARCHITECTURE.md)
- [Procurement Business Rules](./BUSINESS_RULES.md)
- [Inventory Service Integration](../inventory/INVENTORY_SERVICE_ARCHITECTURE.md)
- [Business Partner Service](../business-partner/BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
- [Accounting Service](../accounting/ACCOUNTING_SERVICE_ARCHITECTURE.md)
