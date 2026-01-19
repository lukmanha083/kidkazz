# Procurement & Market Intelligence Service Architecture

## Overview

The Procurement & Market Intelligence Service manages the complete procurement lifecycle and provides intelligent demand forecasting. This service bridges the gap between sales data, market trends, and purchasing decisions.

### Core Capabilities

1. **Purchase Order Management** - Create, track, and manage POs to suppliers
2. **Goods Receipt** - Receive inventory from suppliers, quality checks
3. **Demand Forecasting** - Predict future demand based on multiple data sources
4. **Seasonal Analytics** - Understand and leverage seasonal buying patterns
5. **Market Intelligence** - Scrape and analyze marketplace data for competitive insights

---

## Why This Service is Needed

### Current Gap in Architecture

```
Current Services:
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Product ──► Inventory ──► Order ──► Accounting                 │
│  Service     Service       Service    Service                    │
│                                                                  │
│  ↑ Products  ↑ Stock       ↑ Sales    ↑ Financial               │
│    defined     tracked       orders     records                  │
│                                                                  │
│  ❌ NO PROCUREMENT CYCLE                                         │
│  ❌ NO DEMAND FORECASTING                                        │
│  ❌ NO MARKET INTELLIGENCE                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

With Procurement Service:
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────────────────────────────────────┐                   │
│  │     PROCUREMENT & MARKET INTELLIGENCE     │                   │
│  │                                           │                   │
│  │  Market ──► Forecast ──► Purchase ──► Receive                │
│  │  Intel       Demand       Order       Goods                   │
│  │                                           │                   │
│  └──────────────────────────────────────────┘                   │
│           │              │              │                        │
│           ▼              ▼              ▼                        │
│  Product ──► Inventory ──► Order ──► Accounting                 │
│  Service     Service       Service    Service                    │
│                                                                  │
│  ✅ COMPLETE SUPPLY CHAIN VISIBILITY                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Business Value

| Capability | Business Impact |
|------------|-----------------|
| Demand Forecasting | Reduce stockouts by 40%, reduce overstock by 30% |
| Seasonal Analytics | Prepare inventory 2-4 weeks before peak seasons |
| Market Intelligence | Identify trending products before competitors |
| PO Automation | Reduce procurement time by 60% |
| Supplier Performance | Improve on-time delivery by tracking metrics |

---

## Domain Model

### Core Entities

#### 1. PurchaseOrder

```typescript
interface PurchaseOrder {
  id: string;
  poNumber: string;                    // PO-2025-00001
  supplierId: string;                  // From Business Partner Service
  warehouseId: string;                 // Destination warehouse

  // Status
  status: POStatus;

  // Dates
  orderDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;

  // Items
  items: PurchaseOrderItem[];

  // Totals
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;                    // IDR

  // Terms
  paymentTerms: string;                // NET30, COD
  shippingTerms?: string;              // FOB, CIF

  // Source
  sourceType: POSourceType;            // 'manual' | 'auto_reorder' | 'forecast'
  forecastId?: string;                 // If generated from forecast

  // Approval
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date;

  // Notes
  notes?: string;
  internalNotes?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type POStatus =
  | 'draft'           // Being created
  | 'pending_approval' // Awaiting approval
  | 'approved'        // Ready to send to supplier
  | 'sent'            // Sent to supplier
  | 'confirmed'       // Supplier confirmed
  | 'partially_received' // Some items received
  | 'received'        // All items received
  | 'cancelled'       // Cancelled
  | 'closed';         // Completed and closed

type POSourceType = 'manual' | 'auto_reorder' | 'forecast' | 'market_intel';
```

#### 2. PurchaseOrderItem

```typescript
interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productSku: string;
  productName: string;

  // Quantity
  orderedQuantity: number;
  receivedQuantity: number;
  uomCode: string;                     // PCS, BOX, CARTON

  // Pricing
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  lineTotal: number;

  // Receiving
  status: POItemStatus;

  // Quality
  qualityNotes?: string;
  rejectedQuantity?: number;
  rejectionReason?: string;
}

type POItemStatus = 'pending' | 'partially_received' | 'received' | 'cancelled';
```

#### 3. GoodsReceipt (GRN - Goods Receipt Note)

```typescript
interface GoodsReceipt {
  id: string;
  grnNumber: string;                   // GRN-2025-00001
  purchaseOrderId: string;
  supplierId: string;
  warehouseId: string;

  // Status
  status: GRNStatus;

  // Dates
  receivedDate: Date;

  // Items
  items: GoodsReceiptItem[];

  // Documents
  deliveryNoteNumber?: string;
  invoiceNumber?: string;

  // Quality
  qualityCheckPassed: boolean;
  qualityCheckNotes?: string;
  qualityCheckedBy?: string;

  // Receiving
  receivedBy: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type GRNStatus = 'draft' | 'pending_quality_check' | 'approved' | 'rejected' | 'completed';
```

#### 4. DemandForecast

```typescript
interface DemandForecast {
  id: string;
  forecastPeriod: ForecastPeriod;      // 'weekly' | 'monthly' | 'quarterly'
  startDate: Date;
  endDate: Date;

  // Scope
  productId?: string;                  // Specific product or null for all
  categoryId?: string;                 // Specific category or null for all
  warehouseId?: string;                // Specific warehouse or null for all

  // Forecast Data
  items: ForecastItem[];

  // Metadata
  generatedAt: Date;
  generatedBy: string;                 // 'system' or employee ID
  algorithm: ForecastAlgorithm;
  confidence: number;                  // 0-100%

  // Data Sources Used
  dataSources: DataSource[];

  // Status
  status: ForecastStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

interface ForecastItem {
  productId: string;
  productSku: string;
  productName: string;
  categoryId: string;

  // Current State
  currentStock: number;
  minimumStock: number;

  // Forecast
  predictedDemand: number;             // Units expected to sell
  confidenceLevel: number;             // 0-100%

  // Recommendation
  suggestedOrderQuantity: number;
  suggestedOrderDate: Date;

  // Factors
  factors: ForecastFactor[];
}

interface ForecastFactor {
  type: FactorType;
  name: string;
  impact: number;                      // -100 to +100 (% impact on demand)
  description: string;
}

type FactorType =
  | 'historical_sales'     // Based on past sales
  | 'seasonal'             // Seasonal pattern
  | 'trend'                // Market trend
  | 'promotion'            // Planned promotions
  | 'market_intel'         // From marketplace scraping
  | 'event';               // Special events (holidays, etc.)

type ForecastAlgorithm =
  | 'moving_average'
  | 'exponential_smoothing'
  | 'seasonal_decomposition'
  | 'ml_ensemble';

type ForecastStatus = 'draft' | 'pending_review' | 'approved' | 'archived';
type ForecastPeriod = 'weekly' | 'monthly' | 'quarterly';
```

#### 5. SeasonalPattern

```typescript
interface SeasonalPattern {
  id: string;
  name: string;                        // "Back to School Season"
  description: string;

  // Timing
  startMonth: number;                  // 1-12
  startDay: number;                    // 1-31
  endMonth: number;
  endDay: number;

  // Recurrence
  recurrenceType: 'annual' | 'lunar' | 'custom';

  // Impact
  demandMultiplier: number;            // e.g., 2.5 = 250% of normal demand

  // Affected Products
  affectedCategories: string[];        // Category IDs
  affectedProducts?: string[];         // Specific product IDs (optional)

  // Preparation
  preparationWeeks: number;            // Weeks before to start stocking

  // Status
  isActive: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

#### 6. MarketIntelligence

```typescript
interface MarketIntelligence {
  id: string;

  // Source
  source: MarketplaceSource;
  sourceUrl?: string;

  // Data Type
  dataType: IntelDataType;

  // Product Matching
  matchedProductId?: string;           // Our product if matched
  externalProductName: string;
  externalProductId?: string;

  // Metrics
  metrics: MarketMetrics;

  // Analysis
  trend: TrendDirection;
  trendStrength: number;               // 0-100

  // Timestamps
  scrapedAt: Date;
  dataDate: Date;                      // Date the data represents

  // Raw Data
  rawData?: Record<string, any>;
}

interface MarketMetrics {
  // Pricing
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;

  // Sales
  soldCount?: number;
  soldCountPeriod?: string;            // "30 days", "7 days"

  // Reviews
  rating?: number;
  reviewCount?: number;

  // Engagement (TikTok)
  viewCount?: number;
  likeCount?: number;
  shareCount?: number;
  commentCount?: number;

  // Ranking
  categoryRank?: number;
  searchRank?: number;
}

type MarketplaceSource =
  | 'shopee'
  | 'tokopedia'
  | 'tiktok_shop'
  | 'tiktok_social'
  | 'lazada'
  | 'blibli';

type IntelDataType =
  | 'product_listing'      // Product details from marketplace
  | 'category_trending'    // Trending in category
  | 'search_trending'      // Trending search terms
  | 'social_trending'      // TikTok viral products
  | 'competitor_pricing'   // Competitor price tracking
  | 'review_sentiment';    // Review analysis

type TrendDirection = 'rising' | 'stable' | 'declining';
```

#### 7. ReorderRule

```typescript
interface ReorderRule {
  id: string;
  name: string;

  // Scope
  productId?: string;                  // Specific product
  categoryId?: string;                 // Or category
  warehouseId?: string;                // Specific warehouse

  // Trigger Conditions
  triggerType: ReorderTriggerType;

  // For stock-based triggers
  reorderPoint?: number;               // When stock falls below this
  safetyStock?: number;                // Minimum buffer stock

  // For time-based triggers
  reorderDayOfWeek?: number;           // 0-6 (Sunday-Saturday)
  reorderDayOfMonth?: number;          // 1-31

  // Order Calculation
  calculationType: OrderCalculationType;
  fixedQuantity?: number;              // Fixed order amount
  daysOfStock?: number;                // Order X days worth
  economicOrderQty?: number;           // EOQ calculated

  // Supplier
  preferredSupplierId?: string;

  // Approval
  requiresApproval: boolean;
  approvalThreshold?: number;          // Auto-approve if under this amount

  // Status
  isActive: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type ReorderTriggerType =
  | 'stock_level'          // When stock <= reorderPoint
  | 'forecast'             // Based on demand forecast
  | 'scheduled'            // Fixed schedule
  | 'manual';              // Manual only

type OrderCalculationType =
  | 'fixed_quantity'       // Always order same amount
  | 'up_to_max'            // Order up to maximum level
  | 'days_of_stock'        // Order X days of forecasted demand
  | 'economic_order_qty';  // EOQ formula
```

---

## Seasonal Analytics Deep Dive

### Indonesian Seasonal Calendar

```typescript
const INDONESIAN_SEASONS: SeasonalPattern[] = [
  {
    name: "Back to School - New Academic Year",
    description: "New school year starts in July. Peak demand for uniforms, bags, stationery, shoes.",
    startMonth: 6,  // June (preparation)
    startDay: 15,
    endMonth: 8,    // August (settling)
    endDay: 15,
    demandMultiplier: 2.5,
    preparationWeeks: 6,
    affectedCategories: [
      'school_uniforms',
      'school_bags',
      'stationery',
      'school_shoes',
      'lunch_boxes',
      'water_bottles'
    ]
  },
  {
    name: "Ramadan Season",
    description: "Islamic fasting month. Peak for religious clothing, food, gifts.",
    recurrenceType: 'lunar',  // Moves ~11 days earlier each year
    demandMultiplier: 3.0,
    preparationWeeks: 8,
    affectedCategories: [
      'muslim_wear',
      'prayer_items',
      'dates_snacks',
      'gift_sets',
      'home_decor'
    ]
  },
  {
    name: "Eid al-Fitr (Lebaran)",
    description: "End of Ramadan celebration. Peak for new clothes, gifts, travel items.",
    recurrenceType: 'lunar',
    demandMultiplier: 4.0,
    preparationWeeks: 4,
    affectedCategories: [
      'new_clothes',
      'children_clothing',
      'gift_hampers',
      'travel_bags',
      'home_textiles'
    ]
  },
  {
    name: "Year-End Holidays",
    description: "Christmas and New Year. Peak for gifts, party supplies, travel.",
    startMonth: 12,
    startDay: 1,
    endMonth: 1,
    endDay: 7,
    demandMultiplier: 2.0,
    preparationWeeks: 6,
    affectedCategories: [
      'toys',
      'gift_items',
      'party_supplies',
      'winter_clothing',
      'travel_accessories'
    ]
  },
  {
    name: "Chinese New Year",
    description: "Imlek celebration. Peak for red/gold items, traditional goods.",
    recurrenceType: 'lunar',
    demandMultiplier: 1.8,
    preparationWeeks: 4,
    affectedCategories: [
      'red_clothing',
      'gold_jewelry',
      'traditional_snacks',
      'decorations',
      'angpao_supplies'
    ]
  },
  {
    name: "Valentine's Day",
    description: "Romance peak. Gifts, chocolates, flowers.",
    startMonth: 2,
    startDay: 1,
    endMonth: 2,
    endDay: 14,
    demandMultiplier: 1.5,
    preparationWeeks: 3,
    affectedCategories: [
      'chocolates',
      'gift_items',
      'jewelry',
      'flowers',
      'greeting_cards'
    ]
  },
  {
    name: "Mother's Day",
    description: "December 22 in Indonesia.",
    startMonth: 12,
    startDay: 15,
    endMonth: 12,
    endDay: 22,
    demandMultiplier: 1.5,
    preparationWeeks: 2,
    affectedCategories: [
      'gift_sets',
      'skincare',
      'jewelry',
      'home_appliances',
      'flowers'
    ]
  },
  {
    name: "11.11 Shopping Festival",
    description: "Singles Day mega sale. All categories.",
    startMonth: 11,
    startDay: 1,
    endMonth: 11,
    endDay: 11,
    demandMultiplier: 3.0,
    preparationWeeks: 4,
    affectedCategories: ['all']
  },
  {
    name: "12.12 Shopping Festival",
    description: "Year-end mega sale. All categories.",
    startMonth: 12,
    startDay: 1,
    endMonth: 12,
    endDay: 12,
    demandMultiplier: 2.5,
    preparationWeeks: 3,
    affectedCategories: ['all']
  },
  {
    name: "Rainy Season",
    description: "October to March. Peak for rain gear, indoor items.",
    startMonth: 10,
    startDay: 1,
    endMonth: 3,
    endDay: 31,
    demandMultiplier: 1.5,
    preparationWeeks: 2,
    affectedCategories: [
      'raincoats',
      'umbrellas',
      'rain_boots',
      'indoor_games',
      'humidity_control'
    ]
  }
];
```

### Seasonal Forecast Algorithm

```typescript
class SeasonalForecastEngine {
  /**
   * Calculate demand forecast with seasonal adjustments
   */
  async calculateForecast(
    productId: string,
    forecastPeriod: Date,
    options: ForecastOptions
  ): Promise<ForecastResult> {
    // 1. Get base demand from historical sales
    const historicalDemand = await this.getHistoricalDemand(productId, 12); // 12 months
    const baseDemand = this.calculateBaseDemand(historicalDemand);

    // 2. Get seasonal multipliers
    const seasonalFactors = await this.getSeasonalFactors(
      productId,
      forecastPeriod
    );

    // 3. Get market intelligence factors
    const marketFactors = await this.getMarketFactors(productId);

    // 4. Get trend factors (YoY growth/decline)
    const trendFactor = this.calculateTrendFactor(historicalDemand);

    // 5. Calculate final forecast
    let forecastedDemand = baseDemand;

    // Apply seasonal multiplier
    for (const season of seasonalFactors) {
      forecastedDemand *= season.multiplier;
    }

    // Apply trend
    forecastedDemand *= trendFactor;

    // Apply market intelligence boost/reduction
    if (marketFactors.trendDirection === 'rising') {
      forecastedDemand *= (1 + marketFactors.trendStrength / 100);
    } else if (marketFactors.trendDirection === 'declining') {
      forecastedDemand *= (1 - marketFactors.trendStrength / 200); // Less aggressive
    }

    // 6. Calculate confidence
    const confidence = this.calculateConfidence(
      historicalDemand.dataPoints,
      seasonalFactors.length,
      marketFactors.dataFreshness
    );

    return {
      productId,
      period: forecastPeriod,
      baseDemand,
      seasonalFactors,
      marketFactors,
      trendFactor,
      forecastedDemand: Math.round(forecastedDemand),
      confidence,
      suggestedOrderQty: this.calculateOrderQuantity(
        forecastedDemand,
        await this.getCurrentStock(productId),
        await this.getLeadTime(productId)
      )
    };
  }

  /**
   * Detect which seasons affect a specific date
   */
  async getSeasonalFactors(
    productId: string,
    targetDate: Date
  ): Promise<SeasonalFactor[]> {
    const product = await this.productService.getProduct(productId);
    const allSeasons = await this.getActiveSeasons();
    const factors: SeasonalFactor[] = [];

    for (const season of allSeasons) {
      // Check if product's category is affected
      if (!this.isCategoryAffected(product.categoryId, season)) {
        continue;
      }

      // Check if date falls within season (including preparation period)
      const seasonStart = this.getSeasonStart(season, targetDate.getFullYear());
      const prepStart = this.subtractWeeks(seasonStart, season.preparationWeeks);
      const seasonEnd = this.getSeasonEnd(season, targetDate.getFullYear());

      if (targetDate >= prepStart && targetDate <= seasonEnd) {
        // Calculate position in season for graduated multiplier
        const multiplier = this.calculateGraduatedMultiplier(
          targetDate,
          prepStart,
          seasonStart,
          seasonEnd,
          season.demandMultiplier
        );

        factors.push({
          seasonId: season.id,
          seasonName: season.name,
          multiplier,
          phase: this.getSeasonPhase(targetDate, prepStart, seasonStart, seasonEnd)
        });
      }
    }

    return factors;
  }

  /**
   * Graduated multiplier - ramps up during preparation, peaks during season
   */
  private calculateGraduatedMultiplier(
    date: Date,
    prepStart: Date,
    seasonStart: Date,
    seasonEnd: Date,
    peakMultiplier: number
  ): number {
    if (date < seasonStart) {
      // Preparation phase - ramp up from 1.0 to 0.7 * peak
      const prepProgress = (date.getTime() - prepStart.getTime()) /
                          (seasonStart.getTime() - prepStart.getTime());
      return 1.0 + (peakMultiplier * 0.7 - 1.0) * prepProgress;
    } else if (date <= seasonEnd) {
      // Peak season
      return peakMultiplier;
    }
    return 1.0;
  }
}
```

### Back to School Example

```typescript
// Example: Forecasting school uniforms for July 2025

const forecast = await forecastEngine.calculateForecast(
  'PROD-UNIFORM-001',
  new Date('2025-07-01'),
  { includeMarketIntel: true }
);

// Result:
{
  productId: 'PROD-UNIFORM-001',
  productName: 'School Uniform Set - Blue',
  period: '2025-07',

  baseDemand: 100,  // Normal monthly sales

  seasonalFactors: [
    {
      seasonName: 'Back to School - New Academic Year',
      multiplier: 2.5,
      phase: 'peak',
      description: 'July is peak month for new academic year'
    }
  ],

  trendFactor: 1.1,  // 10% YoY growth

  marketFactors: {
    source: 'shopee',
    trendDirection: 'rising',
    trendStrength: 15,
    competitorPriceAvg: 150000,
    ourPrice: 145000,
    priceCompetitiveness: 'competitive'
  },

  forecastedDemand: 288,  // 100 * 2.5 * 1.1 * 1.05
  confidence: 85,

  recommendation: {
    suggestedOrderQty: 350,  // Extra for safety stock
    suggestedOrderDate: '2025-05-15',  // 6 weeks before July
    preferredSupplier: 'SUP-TEXTILE-001',
    estimatedLeadTime: 21,  // days
    estimatedCost: 35000000  // IDR
  },

  alerts: [
    {
      type: 'warning',
      message: 'Order soon - supplier lead time is 3 weeks'
    },
    {
      type: 'info',
      message: 'Consider ordering 20% extra - last year had stockout'
    }
  ]
}
```

---

## Market Intelligence - Web Scraping

### Supported Marketplaces

| Platform | Data Available | Update Frequency |
|----------|----------------|------------------|
| **Shopee** | Products, prices, sales count, reviews, ratings | Daily |
| **Tokopedia** | Products, prices, sales count, reviews, ratings | Daily |
| **TikTok Shop** | Products, prices, sales count, reviews | Daily |
| **TikTok Social** | Trending videos, hashtags, engagement | Every 6 hours |
| **Lazada** | Products, prices, sales count, reviews | Daily |
| **Blibli** | Products, prices, sales count, reviews | Daily |

### Scraping Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKET INTELLIGENCE PIPELINE                  │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Scheduler │───►│ Scraper  │───►│ Parser   │───►│ Analyzer │  │
│  │ (Cron)   │    │ Workers  │    │ Workers  │    │ Engine   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │               │         │
│       │               ▼               │               ▼         │
│       │         ┌──────────┐         │         ┌──────────┐    │
│       │         │ Proxy    │         │         │ ML Model │    │
│       │         │ Rotation │         │         │ (Trends) │    │
│       │         └──────────┘         │         └──────────┘    │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    D1 DATABASE                            │  │
│  │  - market_intelligence_raw                                │  │
│  │  - market_intelligence_processed                          │  │
│  │  - product_mappings                                       │  │
│  │  - trending_analysis                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Scraping Implementation

```typescript
// Shopee Scraper Example
class ShopeeScraper implements MarketplaceScraper {
  private readonly baseUrl = 'https://shopee.co.id';

  async scrapeCategory(categoryId: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];

    // Use Shopee's internal API (discovered through network analysis)
    const apiUrl = `${this.baseUrl}/api/v4/search/search_items`;

    const params = {
      by: 'relevancy',
      keyword: '',
      limit: 60,
      newest: 0,
      order: 'desc',
      page_type: 'search',
      scenario: 'PAGE_CATEGORY',
      categoryId: categoryId
    };

    const response = await this.fetchWithProxy(apiUrl, params);

    for (const item of response.items) {
      products.push({
        externalId: item.itemid.toString(),
        externalShopId: item.shopid.toString(),
        name: item.name,
        price: item.price / 100000,  // Shopee stores in smallest unit
        originalPrice: item.price_before_discount / 100000,
        soldCount: item.sold,
        rating: item.item_rating.rating_star,
        reviewCount: item.item_rating.rating_count[0],
        stock: item.stock,
        location: item.shop_location,
        imageUrl: `https://cf.shopee.co.id/file/${item.image}`,
        url: `${this.baseUrl}/product/${item.shopid}/${item.itemid}`,
        scrapedAt: new Date()
      });
    }

    return products;
  }

  async scrapeTrending(): Promise<TrendingData> {
    // Scrape Shopee's trending/flash sale page
    const flashSaleUrl = `${this.baseUrl}/api/v4/flash_sale/get_all_sessions`;
    // ... implementation
  }
}

// TikTok Social Scraper Example
class TikTokSocialScraper implements SocialScraper {
  async scrapeTrendingHashtags(category: string): Promise<TrendingHashtag[]> {
    // Use TikTok's discover API
    const trends: TrendingHashtag[] = [];

    // Keywords relevant to baby/kids products
    const keywords = [
      'perlengkapanbayi',
      'bajuanak',
      'mainananak',
      'perlengkapansekolah',
      'tassekolah'
    ];

    for (const keyword of keywords) {
      const data = await this.fetchHashtagData(keyword);
      trends.push({
        hashtag: keyword,
        viewCount: data.stats.viewCount,
        videoCount: data.stats.videoCount,
        trend: this.calculateTrend(data.history),
        relatedProducts: await this.extractProducts(data.videos)
      });
    }

    return trends;
  }

  async scrapeViralProducts(): Promise<ViralProduct[]> {
    // Find videos with product links that are going viral
    const viralVideos = await this.getViralVideos({
      minViews: 100000,
      maxAge: 7,  // days
      hasProductLink: true
    });

    return viralVideos.map(video => ({
      videoId: video.id,
      viewCount: video.stats.playCount,
      likeCount: video.stats.diggCount,
      shareCount: video.stats.shareCount,
      productInfo: video.productInfo,
      trendScore: this.calculateViralScore(video),
      scrapedAt: new Date()
    }));
  }
}
```

### Product Matching

```typescript
class ProductMatcher {
  /**
   * Match scraped marketplace products to our catalog
   */
  async matchProducts(
    scrapedProducts: ScrapedProduct[]
  ): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    for (const scraped of scrapedProducts) {
      // Try multiple matching strategies
      let match = await this.exactSkuMatch(scraped);

      if (!match) {
        match = await this.barcodeMatch(scraped);
      }

      if (!match) {
        match = await this.fuzzyNameMatch(scraped);
      }

      if (!match) {
        match = await this.mlMatch(scraped);  // ML-based matching
      }

      results.push({
        scrapedProduct: scraped,
        matchedProductId: match?.productId,
        matchConfidence: match?.confidence || 0,
        matchMethod: match?.method || 'none',
        isNewProduct: !match  // Potential new product opportunity
      });
    }

    return results;
  }

  private async fuzzyNameMatch(scraped: ScrapedProduct): Promise<Match | null> {
    // Use fuzzy string matching
    const candidates = await this.productRepo.searchByName(
      scraped.name,
      { limit: 10 }
    );

    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(
        this.normalizeProductName(scraped.name),
        this.normalizeProductName(candidate.name)
      );

      if (similarity > 0.85) {
        return {
          productId: candidate.id,
          confidence: similarity * 100,
          method: 'fuzzy_name'
        };
      }
    }

    return null;
  }
}
```

---

## API Endpoints

### Purchase Orders

```
POST   /api/purchase-orders                    # Create PO
GET    /api/purchase-orders                    # List POs (filtered)
GET    /api/purchase-orders/:id                # Get PO details
PUT    /api/purchase-orders/:id                # Update PO
PATCH  /api/purchase-orders/:id/status         # Update status
DELETE /api/purchase-orders/:id                # Cancel/delete PO

POST   /api/purchase-orders/:id/submit         # Submit for approval
POST   /api/purchase-orders/:id/approve        # Approve PO
POST   /api/purchase-orders/:id/reject         # Reject PO
POST   /api/purchase-orders/:id/send           # Send to supplier

GET    /api/purchase-orders/:id/items          # Get PO items
POST   /api/purchase-orders/:id/items          # Add item to PO
PUT    /api/purchase-orders/:id/items/:itemId  # Update item
DELETE /api/purchase-orders/:id/items/:itemId  # Remove item
```

### Goods Receipt

```
POST   /api/goods-receipts                     # Create GRN
GET    /api/goods-receipts                     # List GRNs
GET    /api/goods-receipts/:id                 # Get GRN details
PUT    /api/goods-receipts/:id                 # Update GRN

POST   /api/goods-receipts/:id/receive         # Mark items received
POST   /api/goods-receipts/:id/quality-check   # Record quality check
POST   /api/goods-receipts/:id/complete        # Complete receipt
```

### Forecasting

```
GET    /api/forecasts                          # List forecasts
GET    /api/forecasts/:id                      # Get forecast details
POST   /api/forecasts/generate                 # Generate new forecast
POST   /api/forecasts/:id/approve              # Approve forecast
POST   /api/forecasts/:id/convert-to-po        # Create POs from forecast

GET    /api/forecasts/product/:productId       # Get product forecast
GET    /api/forecasts/category/:categoryId     # Get category forecast
```

### Seasonal Patterns

```
GET    /api/seasons                            # List seasonal patterns
GET    /api/seasons/:id                        # Get season details
POST   /api/seasons                            # Create season pattern
PUT    /api/seasons/:id                        # Update season
DELETE /api/seasons/:id                        # Delete season

GET    /api/seasons/active                     # Get currently active seasons
GET    /api/seasons/upcoming                   # Get upcoming seasons
```

### Market Intelligence

```
GET    /api/market-intel                       # List intelligence data
GET    /api/market-intel/product/:productId    # Get intel for product
GET    /api/market-intel/trending              # Get trending products
GET    /api/market-intel/competitors           # Get competitor analysis

POST   /api/market-intel/scrape                # Trigger manual scrape
GET    /api/market-intel/scrape/status         # Get scrape job status

GET    /api/market-intel/opportunities         # New product opportunities
```

### Reorder Rules

```
GET    /api/reorder-rules                      # List rules
GET    /api/reorder-rules/:id                  # Get rule details
POST   /api/reorder-rules                      # Create rule
PUT    /api/reorder-rules/:id                  # Update rule
DELETE /api/reorder-rules/:id                  # Delete rule

POST   /api/reorder-rules/:id/execute          # Manually trigger rule
GET    /api/reorder-rules/suggestions          # Get auto-reorder suggestions
```

---

## Service Integration

### With Inventory Service

```typescript
// Listen for low stock events
async handleLowStockAlert(event: LowStockAlert): Promise<void> {
  const rule = await this.getReorderRule(event.productId);

  if (rule && rule.triggerType === 'stock_level') {
    if (event.currentStock <= rule.reorderPoint) {
      await this.createAutoPO(event.productId, rule);
    }
  }
}

// After GRN completion, update inventory
async handleGoodsReceived(grn: GoodsReceipt): Promise<void> {
  for (const item of grn.items) {
    await this.inventoryService.adjustStock({
      productId: item.productId,
      warehouseId: grn.warehouseId,
      quantity: item.receivedQuantity,
      movementType: 'in',
      source: 'purchase',
      reference: grn.grnNumber,
      batchInfo: item.batchInfo  // If batch tracking
    });
  }
}
```

### With Business Partner Service

```typescript
// Get supplier info for PO
const supplier = await this.businessPartnerService.getSupplier(supplierId);

// Use supplier payment terms, lead time, etc.
const po = PurchaseOrder.create({
  supplierId: supplier.id,
  paymentTerms: supplier.paymentTerms,
  expectedDeliveryDate: addDays(new Date(), supplier.leadTimeDays)
});
```

### With Accounting Service

```typescript
// On PO approval - create commitment
async handlePOApproved(po: PurchaseOrder): Promise<void> {
  await this.accountingService.createCommitment({
    type: 'purchase_order',
    reference: po.poNumber,
    amount: po.totalAmount,
    supplierId: po.supplierId
  });
}

// On GRN completion - create AP entry
async handleGoodsReceived(grn: GoodsReceipt): Promise<void> {
  await this.accountingService.createJournalEntry({
    entryDate: grn.receivedDate,
    description: `Goods Receipt - ${grn.grnNumber}`,
    reference: grn.purchaseOrderNumber,
    lines: [
      {
        accountId: ACCOUNTS.INVENTORY,
        direction: 'Debit',
        amount: grn.totalValue
      },
      {
        accountId: ACCOUNTS.ACCOUNTS_PAYABLE,
        direction: 'Credit',
        amount: grn.totalValue
      }
    ]
  });
}
```

### With Order Service

```typescript
// Get sales data for forecasting
async getSalesHistory(
  productId: string,
  months: number
): Promise<SalesData[]> {
  return await this.orderService.getSalesHistory({
    productId,
    startDate: subtractMonths(new Date(), months),
    endDate: new Date(),
    groupBy: 'month'
  });
}
```

---

## Database Schema

```sql
-- ============================================
-- PURCHASE ORDERS
-- ============================================
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft',

  order_date INTEGER NOT NULL,
  expected_delivery_date INTEGER,
  actual_delivery_date INTEGER,

  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  shipping_cost REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',

  payment_terms TEXT,
  shipping_terms TEXT,

  source_type TEXT NOT NULL DEFAULT 'manual',
  forecast_id TEXT,

  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at INTEGER,

  notes TEXT,
  internal_notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_date ON purchase_orders(order_date);

-- ============================================
-- PURCHASE ORDER ITEMS
-- ============================================
CREATE TABLE purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,

  ordered_quantity REAL NOT NULL,
  received_quantity REAL NOT NULL DEFAULT 0,
  uom_code TEXT NOT NULL,

  unit_price REAL NOT NULL,
  discount REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  line_total REAL NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending',

  quality_notes TEXT,
  rejected_quantity REAL DEFAULT 0,
  rejection_reason TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_poi_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_poi_product ON purchase_order_items(product_id);

-- ============================================
-- GOODS RECEIPTS
-- ============================================
CREATE TABLE goods_receipts (
  id TEXT PRIMARY KEY,
  grn_number TEXT NOT NULL UNIQUE,
  purchase_order_id TEXT REFERENCES purchase_orders(id),
  supplier_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft',

  received_date INTEGER NOT NULL,

  delivery_note_number TEXT,
  invoice_number TEXT,

  quality_check_passed INTEGER DEFAULT 1,
  quality_check_notes TEXT,
  quality_checked_by TEXT,

  received_by TEXT NOT NULL,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_grn_po ON goods_receipts(purchase_order_id);
CREATE INDEX idx_grn_date ON goods_receipts(received_date);

-- ============================================
-- GOODS RECEIPT ITEMS
-- ============================================
CREATE TABLE goods_receipt_items (
  id TEXT PRIMARY KEY,
  goods_receipt_id TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id TEXT REFERENCES purchase_order_items(id),
  product_id TEXT NOT NULL,

  received_quantity REAL NOT NULL,
  rejected_quantity REAL DEFAULT 0,
  accepted_quantity REAL NOT NULL,
  uom_code TEXT NOT NULL,

  batch_number TEXT,
  lot_number TEXT,
  expiration_date INTEGER,
  manufacture_date INTEGER,

  unit_cost REAL NOT NULL,
  line_total REAL NOT NULL,

  quality_status TEXT DEFAULT 'pending',
  quality_notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ============================================
-- DEMAND FORECASTS
-- ============================================
CREATE TABLE demand_forecasts (
  id TEXT PRIMARY KEY,
  forecast_period TEXT NOT NULL,
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,

  product_id TEXT,
  category_id TEXT,
  warehouse_id TEXT,

  generated_at INTEGER NOT NULL,
  generated_by TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  confidence REAL NOT NULL,

  data_sources TEXT,  -- JSON array

  status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by TEXT,
  reviewed_at INTEGER,
  review_notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ============================================
-- FORECAST ITEMS
-- ============================================
CREATE TABLE forecast_items (
  id TEXT PRIMARY KEY,
  forecast_id TEXT NOT NULL REFERENCES demand_forecasts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category_id TEXT,

  current_stock REAL NOT NULL,
  minimum_stock REAL NOT NULL,

  predicted_demand REAL NOT NULL,
  confidence_level REAL NOT NULL,

  suggested_order_qty REAL NOT NULL,
  suggested_order_date INTEGER,

  factors TEXT,  -- JSON array of ForecastFactor

  created_at INTEGER NOT NULL
);

CREATE INDEX idx_fi_forecast ON forecast_items(forecast_id);
CREATE INDEX idx_fi_product ON forecast_items(product_id);

-- ============================================
-- SEASONAL PATTERNS
-- ============================================
CREATE TABLE seasonal_patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  start_month INTEGER NOT NULL,
  start_day INTEGER NOT NULL,
  end_month INTEGER NOT NULL,
  end_day INTEGER NOT NULL,

  recurrence_type TEXT NOT NULL DEFAULT 'annual',

  demand_multiplier REAL NOT NULL,

  affected_categories TEXT,  -- JSON array
  affected_products TEXT,    -- JSON array

  preparation_weeks INTEGER NOT NULL DEFAULT 4,

  is_active INTEGER NOT NULL DEFAULT 1,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT
);

-- ============================================
-- MARKET INTELLIGENCE
-- ============================================
CREATE TABLE market_intelligence (
  id TEXT PRIMARY KEY,

  source TEXT NOT NULL,
  source_url TEXT,

  data_type TEXT NOT NULL,

  matched_product_id TEXT,
  external_product_name TEXT NOT NULL,
  external_product_id TEXT,

  metrics TEXT NOT NULL,  -- JSON

  trend TEXT,
  trend_strength REAL,

  scraped_at INTEGER NOT NULL,
  data_date INTEGER NOT NULL,

  raw_data TEXT,  -- JSON

  created_at INTEGER NOT NULL
);

CREATE INDEX idx_mi_product ON market_intelligence(matched_product_id);
CREATE INDEX idx_mi_source ON market_intelligence(source);
CREATE INDEX idx_mi_date ON market_intelligence(scraped_at);

-- ============================================
-- REORDER RULES
-- ============================================
CREATE TABLE reorder_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,

  product_id TEXT,
  category_id TEXT,
  warehouse_id TEXT,

  trigger_type TEXT NOT NULL,

  reorder_point REAL,
  safety_stock REAL,

  reorder_day_of_week INTEGER,
  reorder_day_of_month INTEGER,

  calculation_type TEXT NOT NULL,
  fixed_quantity REAL,
  days_of_stock INTEGER,
  economic_order_qty REAL,

  preferred_supplier_id TEXT,

  requires_approval INTEGER NOT NULL DEFAULT 1,
  approval_threshold REAL,

  is_active INTEGER NOT NULL DEFAULT 1,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Queues**: Cloudflare Queues (for scraping jobs)
- **Scheduled Jobs**: Cloudflare Cron Triggers
- **Proxy Rotation**: External service (BrightData, ScraperAPI)
- **ML**: TensorFlow.js (for trend prediction) or external API

---

## Folder Structure

```
services/procurement-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── PurchaseOrder.ts
│   │   │   ├── PurchaseOrderItem.ts
│   │   │   ├── GoodsReceipt.ts
│   │   │   ├── DemandForecast.ts
│   │   │   ├── SeasonalPattern.ts
│   │   │   ├── MarketIntelligence.ts
│   │   │   └── ReorderRule.ts
│   │   ├── value-objects/
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── ForecastEngine.ts
│   │   │   ├── SeasonalAnalyzer.ts
│   │   │   └── ProductMatcher.ts
│   │   └── events/
│   │
│   ├── application/
│   │   ├── commands/
│   │   ├── queries/
│   │   └── event-handlers/
│   │
│   ├── infrastructure/
│   │   ├── db/
│   │   ├── http/
│   │   │   └── routes/
│   │   ├── scraping/
│   │   │   ├── scrapers/
│   │   │   │   ├── ShopeeScraper.ts
│   │   │   │   ├── TokopediaScraper.ts
│   │   │   │   ├── TikTokShopScraper.ts
│   │   │   │   └── TikTokSocialScraper.ts
│   │   │   ├── ProxyManager.ts
│   │   │   └── ScrapingScheduler.ts
│   │   └── ml/
│   │       └── TrendPredictor.ts
│   │
│   └── index.ts
│
├── migrations/
├── test/
└── wrangler.toml
```

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Status**: Design Phase
