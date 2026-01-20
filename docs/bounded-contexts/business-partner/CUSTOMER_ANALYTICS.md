# Customer Analytics & Data Mining Guide

> Comprehensive documentation for customer data collection, analysis, and actionable insights.

## Table of Contents

1. [Overview](#overview)
2. [Data Architecture](#data-architecture)
3. [Geospatial Analytics](#geospatial-analytics)
4. [Demographic Analytics](#demographic-analytics)
5. [Behavioral Analytics](#behavioral-analytics)
6. [Engagement Analytics](#engagement-analytics)
7. [Social Network Analytics](#social-network-analytics)
8. [Predictive Analytics](#predictive-analytics)
9. [Face Recognition (AWS Rekognition)](#face-recognition-aws-rekognition)
10. [Data Pipeline & ML Integration](#data-pipeline--ml-integration)
11. [API Endpoints](#api-endpoints)
12. [Apache Sedona Integration](#apache-sedona-integration)
13. [Use Cases & Actions](#use-cases--actions)

---

## Overview

The Business Partner Service collects and analyzes customer data across multiple dimensions to enable:

- **Customer Segmentation**: Group customers by behavior, demographics, location
- **Predictive Analytics**: Churn prediction, CLV forecasting, next purchase prediction
- **Personalization**: Targeted marketing, product recommendations
- **Operational Optimization**: Route planning, delivery zone optimization
- **Social Network Analysis**: Identify influencers, viral marketing opportunities

### Data Sources

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA SOURCES                                   │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│   POS/Orders    │   Mobile App    │ AWS Rekognition │  WhatsApp/CRM    │
│   ───────────   │   ──────────    │ ──────────────  │  ────────────    │
│ • Transactions  │ • GPS Location  │ • Face ID       │ • Contact logs   │
│ • Order value   │ • Check-ins     │ • Age estimate  │ • Response rate  │
│ • Frequency     │ • Visit photos  │ • Gender        │ • Satisfaction   │
│ • Products      │ • Device info   │ • Emotions      │ • Preferences    │
└─────────────────┴─────────────────┴─────────────────┴──────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BUSINESS PARTNER SERVICE                            │
│                         (D1 Database)                                    │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  customers  │  │  addresses  │  │  location_  │  │  analytics  │    │
│  │             │  │             │  │  history    │  │  (computed) │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Export (nightly/hourly)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    APACHE SEDONA / SPARK CLUSTER                         │
│                                                                          │
│  • RFM Calculation          • Churn Prediction (XGBoost)                │
│  • CLV Prediction           • Social Graph Analysis (GraphX)            │
│  • Geospatial Clustering    • Product Recommendations                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Write back scores
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BUSINESS PARTNER SERVICE                            │
│  customers.churn_risk_score = 0.73                                      │
│  customers.clv_score = 15000000                                         │
│  customers.rfm_segment = 'at_risk'                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Architecture

### Customer Table Schema

```sql
-- Core Identity
id                          TEXT PRIMARY KEY
code                        TEXT UNIQUE      -- CUS-0001
name                        TEXT NOT NULL
email                       TEXT
phone                       TEXT

-- Customer Classification
customer_type               TEXT             -- 'retail' | 'wholesale'
company_name                TEXT             -- For B2B
npwp                        TEXT             -- Tax ID

-- Business Terms (Wholesale)
credit_limit                INTEGER
credit_used                 INTEGER
payment_term_days           INTEGER

-- Loyalty (Retail)
loyalty_points              INTEGER
membership_tier             TEXT             -- 'bronze' | 'silver' | 'gold' | 'platinum'

-- Transaction Stats (updated by events)
total_orders                INTEGER
total_spent                 INTEGER
last_order_date             INTEGER

-- Status
status                      TEXT             -- 'active' | 'inactive' | 'blocked'

-- ══════════════════════════════════════════════════════════════════════
-- GEOSPATIAL FIELDS
-- ══════════════════════════════════════════════════════════════════════
service_area_geojson        TEXT             -- GeoJSON Polygon (delivery zones)
preferred_delivery_zone     TEXT             -- Geohash prefix
last_known_latitude         REAL
last_known_longitude        REAL
last_known_geohash          TEXT             -- For spatial indexing
last_location_accuracy      REAL             -- GPS accuracy (meters)
last_location_source        TEXT             -- 'gps' | 'network' | 'manual' | 'geocoded'
last_location_captured_at   INTEGER
last_location_captured_by   TEXT             -- Employee ID

-- ══════════════════════════════════════════════════════════════════════
-- DEMOGRAPHIC FIELDS
-- ══════════════════════════════════════════════════════════════════════
date_of_birth               INTEGER          -- Unix timestamp
age_estimate                INTEGER          -- From face recognition
age_range_min               INTEGER          -- Confidence range
age_range_max               INTEGER
gender                      TEXT             -- 'male' | 'female' | 'unknown'
gender_confidence           REAL             -- 0.0-1.0 from Rekognition
income_bracket              TEXT             -- 'low' | 'medium' | 'high' | 'premium'
occupation                  TEXT
education_level             TEXT

-- ══════════════════════════════════════════════════════════════════════
-- FACE RECOGNITION (AWS Rekognition)
-- ══════════════════════════════════════════════════════════════════════
face_id                     TEXT             -- Rekognition Face ID
face_photo_url              TEXT             -- S3 URL of indexed face
face_indexed_at             INTEGER          -- When face was indexed
face_match_confidence       REAL             -- Last match confidence
face_emotions               TEXT             -- JSON: last detected emotions
face_last_seen_at           INTEGER          -- Last face recognition

-- ══════════════════════════════════════════════════════════════════════
-- BEHAVIORAL ANALYTICS
-- ══════════════════════════════════════════════════════════════════════
avg_order_value             INTEGER          -- Average order amount
purchase_frequency_days     INTEGER          -- Days between purchases
preferred_shopping_day      TEXT             -- 'monday' | 'tuesday' | ...
preferred_shopping_hour     INTEGER          -- 0-23
preferred_payment_method    TEXT             -- 'cash' | 'transfer' | 'qris' | 'credit'
preferred_categories        TEXT             -- JSON array of category IDs
preferred_brands            TEXT             -- JSON array of brand IDs
basket_size_avg             REAL             -- Average items per order
discount_sensitivity        REAL             -- 0.0-1.0 (1.0 = always waits for discount)

-- ══════════════════════════════════════════════════════════════════════
-- ENGAGEMENT ANALYTICS
-- ══════════════════════════════════════════════════════════════════════
last_contact_date           INTEGER          -- Last interaction
last_contact_channel        TEXT             -- 'whatsapp' | 'email' | 'phone' | 'visit'
contact_response_rate       REAL             -- % that got response (0.0-1.0)
satisfaction_score          REAL             -- NPS/CSAT (1-10)
satisfaction_updated_at     INTEGER
preferred_contact_channel   TEXT             -- Best channel to reach
opt_in_whatsapp             INTEGER          -- Boolean (0/1)
opt_in_email                INTEGER          -- Boolean (0/1)
opt_in_sms                  INTEGER          -- Boolean (0/1)
opt_in_push                 INTEGER          -- Boolean (0/1)
feedback_count              INTEGER          -- Reviews/feedback given
complaint_count             INTEGER          -- Complaints filed

-- ══════════════════════════════════════════════════════════════════════
-- SOCIAL/NETWORK ANALYTICS
-- ══════════════════════════════════════════════════════════════════════
acquisition_source          TEXT             -- 'organic' | 'referral' | 'ads' | 'salesperson'
acquisition_campaign        TEXT             -- Campaign ID that acquired
referred_by_customer_id     TEXT             -- Who referred this customer
referred_customers_count    INTEGER          -- How many they referred
referral_revenue_generated  INTEGER          -- Total revenue from referrals
influence_score             REAL             -- Calculated influence metric
community_tags              TEXT             -- JSON: ['ibu_pkk', 'arisan_rt5']
social_connections          TEXT             -- JSON: connected customer IDs

-- ══════════════════════════════════════════════════════════════════════
-- PREDICTIVE ANALYTICS (ML Scores)
-- ══════════════════════════════════════════════════════════════════════
-- RFM Segmentation
rfm_recency_score           INTEGER          -- 1-5 (5 = recent buyer)
rfm_frequency_score         INTEGER          -- 1-5 (5 = frequent buyer)
rfm_monetary_score          INTEGER          -- 1-5 (5 = high spender)
rfm_segment                 TEXT             -- 'champion' | 'loyal' | 'at_risk' | 'lost'
rfm_updated_at              INTEGER

-- Customer Lifetime Value
clv_score                   INTEGER          -- Predicted lifetime value
clv_percentile              INTEGER          -- Ranking 0-100
clv_updated_at              INTEGER

-- Churn Prediction
churn_risk_score            REAL             -- 0.0-1.0 (1.0 = will churn)
churn_risk_factors          TEXT             -- JSON: factors contributing to risk
churn_risk_updated_at       INTEGER

-- Next Purchase Prediction
next_purchase_predicted_at  INTEGER          -- Predicted date
next_purchase_confidence    REAL             -- 0.0-1.0
recommended_products        TEXT             -- JSON: product IDs

-- Audit
created_at                  INTEGER NOT NULL
updated_at                  INTEGER NOT NULL
created_by                  TEXT
updated_by                  TEXT
```

### Customer Location History Table

```sql
-- For tracking customer visits and movement patterns
CREATE TABLE customer_location_history (
    id                  TEXT PRIMARY KEY,
    customer_id         TEXT NOT NULL,

    -- Location
    latitude            REAL NOT NULL,
    longitude           REAL NOT NULL,
    geohash             TEXT NOT NULL,

    -- Metadata
    accuracy            REAL,           -- Meters
    altitude            REAL,           -- Meters above sea level
    speed               REAL,           -- m/s (for delivery tracking)
    heading             REAL,           -- Degrees from north

    -- Source
    source              TEXT NOT NULL,  -- 'gps' | 'network' | 'manual' | 'checkin'
    captured_by         TEXT,           -- Employee ID
    device_id           TEXT,           -- Mobile device

    -- Context
    visit_type          TEXT,           -- 'sales_visit' | 'delivery' | 'survey'
    visit_notes         TEXT,
    photo_url           TEXT,           -- Proof of visit

    -- GeoJSON
    geojson             TEXT,           -- Full GeoJSON with properties

    -- Timestamps
    captured_at         INTEGER NOT NULL,
    created_at          INTEGER NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_location_history_customer ON customer_location_history(customer_id);
CREATE INDEX idx_location_history_geohash ON customer_location_history(geohash);
CREATE INDEX idx_location_history_captured ON customer_location_history(captured_at);
```

---

## Geospatial Analytics

### Geohash Precision Levels

| Precision | Cell Size | Use Case |
|-----------|-----------|----------|
| 1 | ±2500km | Country level |
| 4 | ±20km | City level |
| 5 | ±2.4km | Neighborhood/Kecamatan |
| 6 | ±610m | Street level |
| **7** | **±76m** | **Building level (DEFAULT)** |
| 8 | ±19m | Precise location |
| 9 | ±2.4m | Very precise |

### Geohash-Based Queries in D1

```sql
-- Find all customers in Jakarta Selatan area (geohash prefix: qqguw)
SELECT * FROM customers
WHERE last_known_geohash LIKE 'qqguw%';

-- Cluster customers by neighborhood
SELECT
    SUBSTR(last_known_geohash, 1, 5) as area,
    COUNT(*) as customer_count,
    SUM(total_spent) as total_revenue
FROM customers
WHERE last_known_geohash IS NOT NULL
GROUP BY SUBSTR(last_known_geohash, 1, 5);

-- Find customers within delivery zone
SELECT * FROM customers
WHERE preferred_delivery_zone = 'qqguw';
```

### GeoJSON Export for Apache Sedona

```typescript
// GET /api/geo/export/customers?format=geojson

{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [106.8456, -6.2088]
      },
      "properties": {
        "id": "cus-123",
        "code": "CUS-0001",
        "name": "Budi Santoso",
        "customerType": "retail",
        "totalSpent": 5000000,
        "geohash": "qqguwx7",
        "rfmSegment": "champion"
      }
    }
  ],
  "metadata": {
    "crs": { "type": "name", "properties": { "name": "EPSG:4326" } }
  }
}
```

### Apache Sedona Spatial Queries

```sql
-- Load GeoJSON into Sedona
CREATE TABLE customer_points AS
SELECT ST_GeomFromGeoJSON(geojson) as geometry, *
FROM customer_export;

-- Find customers within 5km of a store
SELECT c.*
FROM customer_points c
WHERE ST_Distance(
    c.geometry,
    ST_Point(106.8456, -6.2088)
) < 5000;

-- Cluster customers using DBSCAN
SELECT ST_DBSCAN(geometry, 500, 5) as cluster_id, *
FROM customer_points;

-- Create Voronoi diagram for delivery zones
SELECT ST_VoronoiPolygons(ST_Collect(geometry))
FROM store_locations;
```

---

## Demographic Analytics

### Age Estimation (AWS Rekognition)

```typescript
// When customer photo is captured via mobile app
const rekognitionResult = {
  AgeRange: { Low: 25, High: 32 },
  Gender: { Value: 'Female', Confidence: 99.5 },
  Emotions: [
    { Type: 'HAPPY', Confidence: 95.2 },
    { Type: 'CALM', Confidence: 4.8 }
  ]
};

// Update customer record
await db.update(customers).set({
  age_estimate: Math.round((25 + 32) / 2),  // 28
  age_range_min: 25,
  age_range_max: 32,
  gender: 'female',
  gender_confidence: 0.995,
  face_emotions: JSON.stringify(rekognitionResult.Emotions)
});
```

### Demographic Segmentation

```
              AGE GROUP
            18-25   26-35   36-45   46+
         ┌────────┬────────┬────────┬────────┐
  Male   │ Young  │ Prime  │ Mature │ Senior │
GENDER   │ Male   │ Male   │ Male   │ Male   │
         ├────────┼────────┼────────┼────────┤
  Female │ Young  │ Prime  │ Mature │ Senior │
         │ Female │ Female │ Female │ Female │
         └────────┴────────┴────────┴────────┘

Each segment has different:
- Product preferences
- Price sensitivity
- Communication style
- Shopping patterns
```

---

## Behavioral Analytics

### Purchase Pattern Analysis

```sql
-- Calculate behavioral metrics (run as scheduled job)
UPDATE customers SET
    avg_order_value = (
        SELECT AVG(total_amount)
        FROM orders
        WHERE customer_id = customers.id
    ),
    purchase_frequency_days = (
        SELECT AVG(days_between)
        FROM (
            SELECT JULIANDAY(created_at) - JULIANDAY(LAG(created_at) OVER (ORDER BY created_at)) as days_between
            FROM orders
            WHERE customer_id = customers.id
        )
    ),
    preferred_shopping_day = (
        SELECT CASE STRFTIME('%w', created_at)
            WHEN '0' THEN 'sunday'
            WHEN '1' THEN 'monday'
            -- ...
        END
        FROM orders
        WHERE customer_id = customers.id
        GROUP BY STRFTIME('%w', created_at)
        ORDER BY COUNT(*) DESC
        LIMIT 1
    );
```

### Discount Sensitivity Score

```
discount_sensitivity = 0.0 to 1.0

0.0 = Never waits for discount, buys at full price
0.5 = Sometimes buys on discount
1.0 = Only buys when discounted

Calculation:
discount_sensitivity = discounted_orders / total_orders
```

---

## Engagement Analytics

### Contact Effectiveness Tracking

```typescript
// Track every customer contact
interface ContactLog {
  customerId: string;
  channel: 'whatsapp' | 'email' | 'phone' | 'visit';
  purpose: 'promo' | 'follow_up' | 'support' | 'survey';
  sentAt: Date;
  respondedAt?: Date;
  converted?: boolean;  // Did they make a purchase?
}

// Calculate response rate
const responseRate = respondedContacts / totalContacts;

// Update customer engagement metrics
await db.update(customers).set({
  last_contact_date: Date.now(),
  last_contact_channel: 'whatsapp',
  contact_response_rate: responseRate
});
```

### Engagement Score Matrix

```
                    RESPONSE RATE
                Low (<30%)    High (>70%)
           ┌──────────────┬──────────────┐
    High   │   Passive    │   Engaged    │
SPENDING   │   Buyer      │   Champion   │
           │  "Just buys" │ "Advocates"  │
           ├──────────────┼──────────────┤
    Low    │    Cold      │   Potential  │
           │   "Lost"     │ "Nurture"    │
           └──────────────┴──────────────┘
```

---

## Social Network Analytics

### Referral Network Structure

```
                    ┌─────────────────┐
                    │   INFLUENCER    │
                    │ influence: 95   │
                    │ referred: 23    │
                    │ revenue: 50M    │
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │  Level 1    │   │  Level 1    │   │  Level 1    │
    │  referred:5 │   │  referred:8 │   │  referred:3 │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
    ┌──────┴──────┐   ┌──────┴──────┐         │
    ▼             ▼   ▼             ▼         ▼
┌───────┐   ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ L2    │   │ L2    │ │ L2    │ │ L2    │ │ L2    │
└───────┘   └───────┘ └───────┘ └───────┘ └───────┘
```

### Influence Score Calculation

```typescript
// Influence Score = f(referrals, referral_revenue, engagement)
const calculateInfluenceScore = (customer: Customer): number => {
  const referralWeight = 0.4;
  const revenueWeight = 0.4;
  const engagementWeight = 0.2;

  const normalizedReferrals = Math.min(customer.referred_customers_count / 20, 1);
  const normalizedRevenue = Math.min(customer.referral_revenue_generated / 100000000, 1);
  const normalizedEngagement = customer.contact_response_rate;

  return (
    normalizedReferrals * referralWeight +
    normalizedRevenue * revenueWeight +
    normalizedEngagement * engagementWeight
  ) * 100;  // 0-100 scale
};
```

### Community Detection (Apache Sedona/Spark GraphX)

```scala
// Build referral graph
val edges = referrals.map(r => Edge(r.referrerId, r.referredId, 1.0))
val graph = Graph.fromEdges(edges, defaultValue = 1)

// Run PageRank to find influencers
val pageRank = graph.pageRank(0.0001).vertices

// Run Connected Components to find communities
val communities = graph.connectedComponents().vertices

// Run Label Propagation for community detection
val labels = graph.labelPropagation(maxSteps = 5).vertices
```

---

## Predictive Analytics

### RFM Segmentation

```
RFM = Recency × Frequency × Monetary

Each scored 1-5:
- Recency: Days since last purchase (lower = better)
- Frequency: Number of purchases (higher = better)
- Monetary: Total spending (higher = better)
```

#### RFM Calculation

```typescript
const calculateRFM = (customer: Customer, allCustomers: Customer[]) => {
  // Sort for percentile calculation
  const recencies = allCustomers.map(c => daysSinceLastOrder(c)).sort((a, b) => a - b);
  const frequencies = allCustomers.map(c => c.total_orders).sort((a, b) => a - b);
  const monetaries = allCustomers.map(c => c.total_spent).sort((a, b) => a - b);

  // Calculate scores (1-5 based on quintiles)
  const rScore = 5 - Math.ceil(percentile(daysSinceLastOrder(customer), recencies) / 20);
  const fScore = Math.ceil(percentile(customer.total_orders, frequencies) / 20);
  const mScore = Math.ceil(percentile(customer.total_spent, monetaries) / 20);

  return { rScore, fScore, mScore };
};
```

#### RFM Segment Matrix

```
                         FREQUENCY + MONETARY
                    Low (2-4)         High (8-10)
               ┌─────────────────┬─────────────────┐
    Recent     │   Promising     │    Champions    │
RECENCY (4-5)  │   "New high     │   "Best custo-  │
               │    potential"   │    mers"        │
               ├─────────────────┼─────────────────┤
    Not Recent │   Hibernating   │    At Risk      │
    (1-3)      │   "Lost low     │   "Was good,    │
               │    value"       │    declining"   │
               └─────────────────┴─────────────────┘

Segment Actions:
- Champions (555): Reward, exclusive access, referral program
- Loyal (X4X-X5X): Upsell, cross-sell, loyalty program
- Promising (5XX low FM): Onboard, educate, first discount
- At Risk (1-2, 4-5, 4-5): Win-back campaign, personal contact
- Hibernating (111-222): Re-activation or let go
```

### Customer Lifetime Value (CLV)

```typescript
// Simple CLV calculation
const calculateCLV = (customer: Customer): number => {
  const avgOrderValue = customer.avg_order_value || 0;
  const purchaseFrequency = 365 / (customer.purchase_frequency_days || 365);
  const customerLifespan = 3; // years, can be predicted
  const profitMargin = 0.3; // 30% margin

  return avgOrderValue * purchaseFrequency * customerLifespan * profitMargin;
};

// Advanced CLV with churn probability (BG/NBD model in Spark)
// CLV = margin × (expected_transactions / (1 + discount_rate - retention_rate))
```

### Churn Prediction Model

```
Input Features:
├── Days since last order (recency)
├── Order frequency trend (increasing/decreasing)
├── Avg order value trend
├── Response rate to contacts
├── Complaint count
├── Satisfaction score
├── Age of customer relationship
└── Engagement metrics

Output:
├── churn_risk_score: 0.0 - 1.0
└── churn_risk_factors: ["decreasing_frequency", "low_satisfaction"]
```

#### Churn Risk Actions

| Risk Level | Score | Action |
|------------|-------|--------|
| Low | 0.0 - 0.3 | Standard engagement |
| Medium | 0.3 - 0.6 | Proactive check-in |
| High | 0.6 - 0.8 | Personal call + special offer |
| Critical | 0.8 - 1.0 | Manager intervention, VIP treatment |

---

## Face Recognition (AWS Rekognition)

### Integration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Mobile App │ ──► │   API GW    │ ──► │  Lambda     │
│  (Camera)   │     │             │     │  Function   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
            ┌───────────────┐
            │ AWS Rekognition│
            │               │
            │ • IndexFaces  │
            │ • SearchFaces │
            │ • DetectFaces │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  S3 Bucket    │
            │  (Face Store) │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Update D1 DB  │
            │ customer face │
            │ attributes    │
            └───────────────┘
```

### Use Cases

1. **Customer Identification at Store**
   - Camera captures face
   - Rekognition matches to indexed faces
   - POS shows customer profile, preferences, loyalty points

2. **Demographic Analysis**
   - Age/gender estimation for new customers
   - Aggregate demographics for store analytics

3. **Emotion Tracking**
   - Track customer emotions during service
   - Identify unhappy customers for intervention

4. **Visit Verification**
   - Salesperson visits verified by customer face match
   - Prevents fake visit reports

### AWS Rekognition API Usage

```typescript
// Index a new customer face
const indexFace = async (customerId: string, imageUrl: string) => {
  const result = await rekognition.indexFaces({
    CollectionId: 'kidkazz-customers',
    Image: { S3Object: { Bucket: 'faces', Name: imageUrl } },
    ExternalImageId: customerId,
    DetectionAttributes: ['ALL']
  }).promise();

  const face = result.FaceRecords[0];

  return {
    faceId: face.Face.FaceId,
    ageRange: face.FaceDetail.AgeRange,
    gender: face.FaceDetail.Gender,
    emotions: face.FaceDetail.Emotions
  };
};

// Search for a face
const searchFace = async (imageBytes: Buffer) => {
  const result = await rekognition.searchFacesByImage({
    CollectionId: 'kidkazz-customers',
    Image: { Bytes: imageBytes },
    FaceMatchThreshold: 90,
    MaxFaces: 1
  }).promise();

  if (result.FaceMatches.length > 0) {
    return {
      customerId: result.FaceMatches[0].Face.ExternalImageId,
      confidence: result.FaceMatches[0].Similarity
    };
  }
  return null;
};
```

---

## Data Pipeline & ML Integration

### Nightly Batch Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                    NIGHTLY BATCH JOB (2 AM)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Export from D1                                              │
│     └── customers, orders, location_history                     │
│                                                                  │
│  2. Load to Spark/Sedona                                        │
│     └── Parquet files in S3/R2                                  │
│                                                                  │
│  3. Run Analytics                                               │
│     ├── RFM calculation                                         │
│     ├── CLV prediction (XGBoost)                                │
│     ├── Churn prediction (Random Forest)                        │
│     ├── Social graph analysis (GraphX)                          │
│     └── Geospatial clustering (Sedona)                          │
│                                                                  │
│  4. Write back to D1                                            │
│     └── POST /api/analytics/batch-update                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Real-time Score Updates

```typescript
// POST /api/analytics/update-scores
// Called by Spark job after batch processing

interface ScoreUpdate {
  customerId: string;
  rfmSegment: string;
  rfmScores: { r: number; f: number; m: number };
  clvScore: number;
  clvPercentile: number;
  churnRiskScore: number;
  churnRiskFactors: string[];
  influenceScore: number;
  recommendedProducts: string[];
}

app.post('/api/analytics/update-scores', async (c) => {
  const updates: ScoreUpdate[] = await c.req.json();

  for (const update of updates) {
    await db.update(customers).set({
      rfm_segment: update.rfmSegment,
      rfm_recency_score: update.rfmScores.r,
      rfm_frequency_score: update.rfmScores.f,
      rfm_monetary_score: update.rfmScores.m,
      rfm_updated_at: Date.now(),
      clv_score: update.clvScore,
      clv_percentile: update.clvPercentile,
      clv_updated_at: Date.now(),
      churn_risk_score: update.churnRiskScore,
      churn_risk_factors: JSON.stringify(update.churnRiskFactors),
      churn_risk_updated_at: Date.now(),
      influence_score: update.influenceScore,
      recommended_products: JSON.stringify(update.recommendedProducts),
      updated_at: Date.now()
    }).where(eq(customers.id, update.customerId));
  }

  return c.json({ updated: updates.length });
});
```

---

## API Endpoints

### Geospatial Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/geo/export/customers` | Export customers as GeoJSON/WKT/CSV |
| GET | `/api/geo/export/addresses` | Export addresses with coordinates |
| GET | `/api/geo/export/location-history/:customerId` | Export location history as LineString |
| GET | `/api/geo/clusters/customers` | Cluster customers by geohash |
| GET | `/api/geo/nearby/customers` | Find customers near a point |
| POST | `/api/geo/capture` | Capture location from mobile app |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/segments` | Get customer segments summary |
| GET | `/api/analytics/at-risk` | Get high churn risk customers |
| GET | `/api/analytics/influencers` | Get top influencers |
| POST | `/api/analytics/update-scores` | Batch update ML scores |
| POST | `/api/analytics/face/index` | Index customer face |
| POST | `/api/analytics/face/search` | Search for customer by face |

---

## Apache Sedona Integration

### Setup

```python
from sedona.spark import SedonaContext

config = SedonaContext.builder() \
    .config("spark.jars.packages", "org.apache.sedona:sedona-spark-3.4_2.12:1.5.0") \
    .getOrCreate()

sedona = SedonaContext.create(config)
```

### Load Customer Data

```python
# Load GeoJSON from D1 export
customers_df = sedona.read.json("s3://kidkazz-exports/customers.geojson")

# Create geometry column
from sedona.sql.st_functions import ST_GeomFromGeoJSON

customers_geo = customers_df.withColumn(
    "geometry",
    ST_GeomFromGeoJSON("geometry")
)

customers_geo.createOrReplaceTempView("customers")
```

### Spatial Queries

```sql
-- Find customer clusters
SELECT
    ST_GeoHash(geometry, 5) as area,
    COUNT(*) as count,
    SUM(totalSpent) as revenue
FROM customers
GROUP BY ST_GeoHash(geometry, 5);

-- Distance to nearest store
SELECT
    c.id,
    c.name,
    MIN(ST_Distance(c.geometry, s.geometry)) as nearest_store_distance
FROM customers c
CROSS JOIN stores s
GROUP BY c.id, c.name;

-- Customers in delivery polygon
SELECT c.*
FROM customers c, delivery_zones d
WHERE ST_Contains(d.geometry, c.geometry)
  AND d.zone_name = 'Jakarta Selatan';
```

---

## Use Cases & Actions

### Automated Action Triggers

| Condition | Action | Channel |
|-----------|--------|---------|
| churn_risk > 0.7 | Send win-back offer | WhatsApp |
| rfm_segment = 'champion' && !referred_recently | Referral program invite | Email |
| next_purchase_predicted within 3 days | Product recommendation | Push notification |
| satisfaction_score < 5 | Manager follow-up | Phone call |
| influence_score > 80 | Ambassador program invite | Personal visit |
| birthday within 7 days | Birthday discount | WhatsApp |
| last_order > 30 days && rfm_monetary > 3 | Re-engagement campaign | Email |

### Dashboard Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER ANALYTICS DASHBOARD                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Total       │  │  At Risk     │  │  Champions   │          │
│  │  Customers   │  │  Customers   │  │              │          │
│  │    12,456    │  │     342      │  │    1,234     │          │
│  │   +5.2% ▲    │  │   +12% ▲     │  │   +8.3% ▲    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  RFM SEGMENT DISTRIBUTION                                │   │
│  │  ████████████████████ Champions (10%)                   │   │
│  │  ██████████████████████████████ Loyal (25%)            │   │
│  │  ████████████████ Promising (12%)                       │   │
│  │  ████████████████████ At Risk (15%)                     │   │
│  │  ██████████████████████████████████████ Others (38%)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CUSTOMER HEATMAP (Geohash Clusters)                     │   │
│  │  [Interactive map with customer density]                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-20 | Initial geospatial fields |
| 1.1 | 2024-01-20 | Added analytics fields (engagement, social, predictive) |
| 1.2 | 2024-01-20 | Added face recognition integration |

---

## References

- [Apache Sedona Documentation](https://sedona.apache.org/latest/)
- [AWS Rekognition Developer Guide](https://docs.aws.amazon.com/rekognition/)
- [Geohash Wikipedia](https://en.wikipedia.org/wiki/Geohash)
- [RFM Analysis](https://en.wikipedia.org/wiki/RFM_(market_research))
- [Customer Lifetime Value](https://en.wikipedia.org/wiki/Customer_lifetime_value)
