# Procurement Service - Business Rules

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Pending Implementation

---

## Overview

This document defines the business rules for the Procurement & Market Intelligence Service. These rules govern purchase order management, goods receipt, demand forecasting, seasonal analytics, and market intelligence operations.

---

## Table of Contents

1. [Purchase Order Rules](#purchase-order-rules)
2. [Goods Receipt Rules](#goods-receipt-rules)
3. [Supplier Integration Rules](#supplier-integration-rules)
4. [Demand Forecasting Rules](#demand-forecasting-rules)
5. [Seasonal Analytics Rules](#seasonal-analytics-rules)
6. [Market Intelligence Rules](#market-intelligence-rules)
7. [Pricing Intelligence Rules](#pricing-intelligence-rules)
8. [Alert & Notification Rules](#alert--notification-rules)

---

## Purchase Order Rules

### Rule 1: Purchase Order Number Uniqueness
**Statement**: Every Purchase Order MUST have a unique PO number within the system.

**Format**: `PO-{YYYYMMDD}-{SEQUENCE}`

**Example**: `PO-20250716-0001`

**Enforcement**: Database unique constraint + application validation

---

### Rule 2: Purchase Order Status Transitions
**Statement**: Purchase Orders MUST follow valid state transitions.

**Valid Transitions**:
```
DRAFT → PENDING_APPROVAL → APPROVED → SENT_TO_SUPPLIER → PARTIALLY_RECEIVED → RECEIVED → CLOSED
                        ↘ REJECTED
DRAFT → CANCELLED (only from DRAFT)
PENDING_APPROVAL → CANCELLED
APPROVED → CANCELLED (before sent to supplier)
```

**Invalid Transitions**:
- ❌ SENT_TO_SUPPLIER → DRAFT
- ❌ RECEIVED → APPROVED
- ❌ CLOSED → Any other status
- ❌ CANCELLED → Any other status

---

### Rule 3: Purchase Order Approval Thresholds
**Statement**: Purchase Orders above certain values require approval based on amount.

**Thresholds**:
| Amount (IDR) | Required Approval |
|--------------|-------------------|
| ≤ 5,000,000 | Procurement Staff |
| 5,000,001 - 25,000,000 | Procurement Manager |
| 25,000,001 - 100,000,000 | Finance Manager |
| > 100,000,000 | Director/Owner |

**Enforcement**: Application-level workflow with RBAC integration

---

### Rule 4: Purchase Order Line Item Validation
**Statement**: Each PO line item MUST have valid product, quantity, and pricing.

**Constraints**:
- Product MUST exist in Product Service catalog
- Quantity MUST be positive integer
- Unit price MUST be positive number
- Total = Quantity × Unit Price (auto-calculated)
- UOM MUST match supplier's agreed UOM or be convertible

---

### Rule 5: Minimum Order Quantity (MOQ)
**Statement**: Order quantity MUST meet or exceed supplier's MOQ per product.

**Validation**:
```typescript
if (orderQuantity < supplier.minimumOrderQuantity) {
  throw new ValidationError(`Quantity must be at least ${supplier.minimumOrderQuantity}`);
}
```

**Exception**: MOQ can be waived with Manager approval (documented reason required)

---

### Rule 6: Purchase Order Cannot Be Modified After Sent
**Statement**: Once a PO is SENT_TO_SUPPLIER, core details cannot be modified.

**Immutable Fields After Sent**:
- Supplier
- Product items
- Quantities
- Unit prices
- Payment terms

**Mutable Fields**:
- Internal notes
- Expected delivery date (with supplier confirmation)
- Shipping address (with supplier confirmation)

**Amendment Process**: Create PO Amendment document for changes

---

### Rule 7: Purchase Order Expiry
**Statement**: Purchase Orders in DRAFT status expire after 30 days of inactivity.

**Auto-Actions**:
- Day 25: Send reminder notification
- Day 30: Auto-cancel with reason "Expired - No Activity"

---

## Goods Receipt Rules

### Rule 8: Goods Receipt Note (GRN) Mandatory
**Statement**: Every goods receipt MUST have a corresponding GRN document.

**GRN Number Format**: `GRN-{YYYYMMDD}-{SEQUENCE}`

**Required Information**:
- Related PO number
- Actual received quantities
- Receipt date and time
- Receiving staff ID
- Warehouse location
- Batch/lot numbers (if applicable)
- Expiration dates (if applicable)

---

### Rule 9: Receipt Quantity Validation
**Statement**: Received quantity validation depends on business configuration.

**Modes**:
1. **Strict Mode**: Received quantity MUST equal ordered quantity
2. **Tolerance Mode**: Received quantity within ±X% tolerance
3. **Flexible Mode**: Any quantity accepted (over/under shipment)

**Default**: Tolerance Mode with ±5% tolerance

**Over-Receipt Handling**:
- Within tolerance: Auto-accept
- Over tolerance: Require Manager approval
- Record variance for supplier performance

---

### Rule 10: Partial Receipt Handling
**Statement**: Partial receipts are allowed and tracked against PO.

**Rules**:
- PO status changes to PARTIALLY_RECEIVED
- Each receipt creates new GRN
- Track remaining quantity per line item
- Auto-close PO when all items received OR manually closed

**Backorder**: Remaining quantity can be converted to new PO or marked as cancelled

---

### Rule 11: Quality Inspection Integration
**Statement**: Certain product categories require quality inspection before inventory acceptance.

**Inspection Required Categories**:
- Food & Beverages (expiration check)
- Electronics (functionality test)
- Clothing (size/color verification)
- Fragile items (damage check)

**Inspection Outcomes**:
- PASSED: Accept to inventory
- FAILED: Create return request to supplier
- CONDITIONAL: Accept with discount negotiation

---

### Rule 12: Batch Tracking at Receipt
**Statement**: Products with batch tracking enabled MUST have batch information at receipt.

**Required Batch Data**:
- Batch/lot number (from supplier or generated)
- Production date (if available)
- Expiration date (mandatory for perishables)
- Supplier's certificate of analysis (COA) if applicable

**Integration**: Push batch data to Inventory Service via domain event

---

## Supplier Integration Rules

### Rule 13: Supplier Performance Scoring
**Statement**: Each supplier has a performance score calculated from historical data.

**Score Components**:
| Factor | Weight | Measurement |
|--------|--------|-------------|
| On-Time Delivery | 30% | % deliveries within agreed date |
| Quality | 25% | % items passing inspection |
| Price Competitiveness | 20% | vs. market average |
| Order Accuracy | 15% | % orders without discrepancy |
| Responsiveness | 10% | Average response time |

**Score Ranges**:
- 90-100: Excellent (Preferred Supplier)
- 70-89: Good (Standard Supplier)
- 50-69: Fair (Monitoring Required)
- <50: Poor (Review Contract)

---

### Rule 14: Preferred Supplier Selection
**Statement**: Forecasting system SHOULD recommend preferred suppliers first.

**Selection Priority**:
1. Performance score ≥ 90
2. Best price within quality threshold
3. Lead time compatibility
4. Credit terms availability

---

### Rule 15: Supplier Payment Terms Adherence
**Statement**: PO payment terms MUST match or improve upon supplier's agreed terms.

**Validation**:
- Cannot extend payment days beyond supplier's maximum
- Early payment discount must be captured if available
- Payment method must be supplier-supported

---

## Demand Forecasting Rules

### Rule 16: Forecast Horizon
**Statement**: System generates forecasts for defined time horizons.

**Horizons**:
- Short-term: 1-4 weeks (operational planning)
- Medium-term: 1-3 months (procurement planning)
- Long-term: 3-12 months (strategic planning)

**Granularity**:
- Short-term: Daily
- Medium-term: Weekly
- Long-term: Monthly

---

### Rule 17: Forecast Algorithm Selection
**Statement**: System MUST select appropriate algorithm based on data characteristics.

**Algorithm Selection Matrix**:
| Data Pattern | Recommended Algorithm |
|--------------|----------------------|
| Stable demand | Simple Moving Average |
| Trending | Linear Regression |
| Seasonal | Seasonal Decomposition |
| Intermittent | Croston's Method |
| New product | Analogous Forecasting |
| Complex patterns | ARIMA / Prophet |

**Minimum Data Points**: 12 data points (weeks/months) required for statistical forecasting

---

### Rule 18: Forecast Safety Stock Calculation
**Statement**: Safety stock MUST be calculated based on forecast accuracy and lead time.

**Formula**:
```
Safety Stock = Z × σ × √(L + R)

Where:
Z = Service level factor (1.65 for 95%, 2.33 for 99%)
σ = Standard deviation of demand
L = Lead time (days)
R = Review period (days)
```

**Minimum Safety Stock**: 7 days of average demand or MOQ, whichever is higher

---

### Rule 19: Forecast vs Actual Tracking
**Statement**: System MUST track forecast accuracy for continuous improvement.

**Metrics**:
- MAPE (Mean Absolute Percentage Error): Target < 20%
- Bias: Target ±5% (detect over/under forecasting)
- Tracking Signal: Alert if > ±4

**Auto-Adjustment**: If MAPE > 30% for 4 consecutive periods, trigger algorithm review

---

### Rule 20: Reorder Point Calculation
**Statement**: Reorder point triggers purchase recommendation.

**Formula**:
```
Reorder Point = (Average Daily Demand × Lead Time) + Safety Stock
```

**Alert**: Generate purchase recommendation when stock ≤ reorder point

---

## Seasonal Analytics Rules

### Rule 21: Indonesian Seasonal Calendar
**Statement**: System MUST recognize and apply Indonesian seasonal patterns.

**Recognized Seasons**:

| Season | Period | Affected Categories | Demand Multiplier |
|--------|--------|---------------------|-------------------|
| Back to School | Jun 15 - Aug 15 | School uniforms, bags, stationery, shoes | 2.5x |
| Ramadan | Variable (Islamic calendar) | Modest wear, religious items, groceries | 2.0x |
| Eid al-Fitr (Lebaran) | Variable (1 week post-Ramadan) | New clothes, gifts, home decor | 3.0x |
| Year-End Shopping | Nov 25 - Dec 31 | All categories, gifts | 1.8x |
| Chinese New Year | Variable (Jan-Feb) | Red/gold items, gifts, snacks | 1.5x |
| Valentine's Day | Feb 1-14 | Gifts, flowers, chocolates | 1.5x |
| 11.11 (Singles Day) | Nov 1-11 | Electronics, fashion | 2.0x |
| 12.12 (Double Day) | Dec 1-12 | All categories | 1.8x |
| Rainy Season | Oct - Mar | Rain gear, indoor items | 1.3x |
| Dry Season | Apr - Sep | Outdoor items, summer wear | 1.2x |

---

### Rule 22: Seasonal Preparation Window
**Statement**: Seasonal forecast adjustments MUST be applied with preparation lead time.

**Preparation Windows**:
- Back to School: 6 weeks before (stock by end of May)
- Ramadan/Lebaran: 8 weeks before (stock 2 months ahead)
- Year-End: 6 weeks before (stock by mid-October)
- Other seasons: 4 weeks before

**Auto-Alert**: Generate procurement recommendation at preparation start

---

### Rule 23: Seasonal Multiplier Application
**Statement**: Seasonal multipliers adjust base forecast during seasonal periods.

**Formula**:
```
Seasonal Forecast = Base Forecast × Seasonal Multiplier × Trend Adjustment

Where:
- Base Forecast = Historical average or statistical forecast
- Seasonal Multiplier = From seasonal calendar (Rule 21)
- Trend Adjustment = Year-over-year growth factor
```

**Constraints**:
- Multiplier cannot exceed 5.0x (extreme events require manual review)
- Multiplier floor is 0.5x (off-season suppression)

---

### Rule 24: Category-Season Mapping
**Statement**: Seasonal multipliers apply only to mapped product categories.

**Mapping Examples**:
```typescript
const BACK_TO_SCHOOL_CATEGORIES = [
  'school_uniforms',
  'school_bags',
  'stationery',
  'school_shoes',
  'lunch_boxes',
  'water_bottles',
  'sports_wear'
];

const RAMADAN_CATEGORIES = [
  'muslim_wear',
  'hijab',
  'koko',
  'sarung',
  'prayer_items',
  'dates',
  'gift_packages'
];
```

**Unmapped Categories**: Use base forecast without seasonal adjustment

---

### Rule 25: Year-Over-Year Seasonal Comparison
**Statement**: System MUST compare current season performance with previous years.

**Metrics**:
- Sales vs. Last Year Same Season
- Sell-through rate comparison
- Stock-out incidents
- Margin analysis

**Learning**: Use comparison to refine next year's seasonal multipliers

---

## Market Intelligence Rules

### Rule 26: Data Source Priority
**Statement**: Market data sources have defined priority and trustworthiness.

**Priority Order**:
1. Official API data (highest trust)
2. Web scraping with validation
3. Third-party data providers
4. Manual market surveys

**Data Freshness**:
- Price data: Maximum 24 hours old
- Product catalog: Maximum 7 days old
- Trend data: Real-time to 4 hours

---

### Rule 27: Marketplace Data Collection Compliance
**Statement**: Data collection MUST comply with platform terms of service and Indonesian regulations.

**Requirements**:
- Respect robots.txt directives
- Implement rate limiting (max 1 request/second per domain)
- No login credential abuse
- No personal data collection
- Store only publicly available information

**Banned Actions**:
- Automated purchasing
- Review manipulation
- Price manipulation
- Seller impersonation

---

### Rule 28: Product Matching Algorithm
**Statement**: External products MUST be matched to internal catalog with confidence score.

**Matching Criteria**:
| Factor | Weight | Threshold |
|--------|--------|-----------|
| SKU/Barcode exact match | 100% | Exact |
| Product name similarity | 40% | ≥ 80% |
| Category match | 20% | Exact |
| Brand match | 20% | Exact |
| Attributes match | 20% | ≥ 70% |

**Confidence Levels**:
- ≥ 90%: Auto-match (high confidence)
- 70-89%: Suggest match (manual review)
- < 70%: No match (new product or manual mapping)

---

### Rule 29: Trend Detection Threshold
**Statement**: Trend alerts trigger when metrics exceed defined thresholds.

**Thresholds**:
- Demand spike: > 50% increase vs. 30-day average
- Price drop: > 15% decrease in 7 days
- New competitor: New seller with > 100 sales in first week
- Stock-out signal: Top 3 competitors out of stock

**Alert Priority**:
- Critical: Multiple thresholds triggered simultaneously
- High: Demand spike OR competitor stock-out
- Medium: Price changes
- Low: New competitor entry

---

### Rule 30: Social Media Trend Integration
**Statement**: TikTok trends MUST be validated before influencing forecasts.

**Validation Criteria**:
- Minimum 100K views in Indonesia
- Engagement rate > 5%
- Product relevance confirmed by AI classification
- Not flagged as fake/manipulated engagement

**Trend Lifecycle**:
- Emerging: < 7 days, rapid growth
- Peak: 7-21 days, stable high engagement
- Declining: > 21 days, decreasing engagement
- Expired: > 60 days or engagement < 1%

---

## Pricing Intelligence Rules

### Rule 31: Competitive Price Monitoring
**Statement**: System MUST track competitor pricing for matched products.

**Monitoring Frequency**:
- High-velocity items: Every 4 hours
- Medium-velocity items: Daily
- Low-velocity items: Weekly

**Tracked Metrics**:
- Selling price
- Original price (if discounted)
- Discount percentage
- Shipping cost
- Promotion/voucher availability

---

### Rule 32: Price Positioning Strategy
**Statement**: Pricing recommendations based on competitive position.

**Strategies**:
1. **Price Leader**: Match lowest competitor - X%
2. **Market Average**: Within ±5% of market average
3. **Premium**: Above market average with value justification
4. **Penetration**: Temporarily below market for market share

**Auto-Recommendation**: Based on product category and business strategy

---

### Rule 33: Price Alert Thresholds
**Statement**: System alerts when competitor prices cross defined thresholds.

**Alerts**:
- Competitor undercuts by > 10%: High priority alert
- Our price > market average by > 20%: Medium priority alert
- Supplier price increase > 5%: Margin impact alert
- New lowest price in market: Price leader alert

---

## Alert & Notification Rules

### Rule 34: Alert Priority Classification
**Statement**: All alerts classified by priority for proper routing.

**Priority Levels**:
| Priority | Response Time | Notification Channel | Escalation |
|----------|---------------|---------------------|------------|
| Critical | < 1 hour | SMS + Push + Email | Auto to Manager |
| High | < 4 hours | Push + Email | Manual escalation |
| Medium | < 24 hours | Email + Dashboard | None |
| Low | < 72 hours | Dashboard only | None |

---

### Rule 35: Alert Deduplication
**Statement**: Duplicate alerts within time window MUST be consolidated.

**Deduplication Rules**:
- Same product + same alert type: 4-hour window
- Same supplier + same issue: 24-hour window
- Same category trend: 12-hour window

**Consolidation**: Show count of occurrences, latest timestamp

---

### Rule 36: Forecast Alert Conditions
**Statement**: Forecast-related alerts triggered under specific conditions.

**Conditions**:
- Stock projected to reach zero before next delivery
- Reorder point reached
- Seasonal preparation window started
- Forecast accuracy dropped below threshold
- Unusual demand pattern detected

---

### Rule 37: Action Required Tracking
**Statement**: Alerts requiring action MUST be tracked to completion.

**Lifecycle**:
```
NEW → ACKNOWLEDGED → IN_PROGRESS → RESOLVED / DISMISSED
```

**SLA Tracking**: Measure time from NEW to RESOLVED vs. target response time

---

## Integration Rules

### Rule 38: Event-Driven Communication
**Statement**: Procurement Service communicates via domain events.

**Published Events**:
- `PurchaseOrderCreated`
- `PurchaseOrderApproved`
- `PurchaseOrderSentToSupplier`
- `GoodsReceived`
- `ForecastGenerated`
- `ReorderPointReached`
- `PriceAlertTriggered`
- `TrendDetected`

**Subscribed Events**:
- `ProductCreated` (from Product Service)
- `StockLevelChanged` (from Inventory Service)
- `SupplierUpdated` (from Business Partner Service)
- `SalesCompleted` (from Order Service)

---

### Rule 39: Inventory Service Integration
**Statement**: Goods receipt MUST update Inventory Service.

**Flow**:
1. GRN created and approved
2. Publish `GoodsReceived` event
3. Inventory Service creates stock entry
4. Inventory Service confirms receipt
5. Procurement updates GRN status

**Saga Pattern**: Use compensating transaction if inventory update fails

---

### Rule 40: Accounting Service Integration
**Statement**: Purchase orders and receipts MUST create accounting entries.

**Journal Entries**:
1. **On Receipt (before payment)**:
   - Debit: Inventory Asset
   - Credit: Accounts Payable

2. **On Payment**:
   - Debit: Accounts Payable
   - Credit: Cash/Bank

3. **On Return**:
   - Debit: Accounts Payable
   - Credit: Inventory Asset

---

## Data Retention Rules

### Rule 41: Historical Data Retention
**Statement**: Data retained based on type and regulatory requirements.

**Retention Periods**:
| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Purchase Orders | 10 years | Tax/audit compliance |
| GRN Documents | 10 years | Tax/audit compliance |
| Price History | 3 years | Trend analysis |
| Forecast Data | 2 years | Model improvement |
| Market Intelligence | 1 year | Analysis only |
| Scraped Raw Data | 30 days | Processing only |

---

### Rule 42: Data Archival
**Statement**: Data beyond active period MUST be archived.

**Active Period**:
- Transactional data: Current fiscal year + 1 year
- Analytics data: 2 years rolling
- Operational data: 90 days

**Archive Format**: Compressed, read-only, searchable

---

## Summary

This document contains 42 business rules organized across:
- Purchase Order Management (Rules 1-7)
- Goods Receipt Management (Rules 8-12)
- Supplier Integration (Rules 13-15)
- Demand Forecasting (Rules 16-20)
- Seasonal Analytics (Rules 21-25)
- Market Intelligence (Rules 26-30)
- Pricing Intelligence (Rules 31-33)
- Alerts & Notifications (Rules 34-37)
- Integration (Rules 38-40)
- Data Retention (Rules 41-42)

**Document Status**: Pending Implementation
**Review Required**: Business stakeholders, Finance, Operations

---

## Related Documents

- [Procurement Service Architecture](./PROCUREMENT_SERVICE_ARCHITECTURE.md)
- [Procurement Implementation Plan](./PROCUREMENT_IMPLEMENTATION_PLAN.md) (pending)
- [Business Partner Service](../business-partner/BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
- [Inventory Service](../inventory/INVENTORY_SERVICE_ARCHITECTURE.md)
- [Main Business Rules](../../ddd/BUSINESS_RULES.md)
