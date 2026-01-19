# Sales Service Architecture

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase
**Refactored From**: Order Service

---

## Executive Summary

The Sales Service is a refactored and expanded version of the Order Service, designed to handle all sales channels in the Kidkazz omnichannel ERP system. This service manages sales transactions from multiple frontends including ERP Dashboard, POS terminals, retail/wholesale websites, and mobile applications.

### Key Objectives

1. **Unified Sales Management** - Single service handling all sales channels
2. **Multi-Channel Support** - ERP, POS, Web (retail/wholesale), Mobile
3. **Internationalization** - Dual language support (Indonesian/English) with geo-detection
4. **Real-Time Integration** - WebSocket for live inventory, live streaming sales
5. **Offline Capability** - POS and mobile app offline-first architecture

---

## Table of Contents

1. [Sales Channels Overview](#sales-channels-overview)
2. [Domain Model](#domain-model)
3. [Sales Channel Specifications](#sales-channel-specifications)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Frontend Applications](#frontend-applications)
7. [Integration Points](#integration-points)
8. [Internationalization Strategy](#internationalization-strategy)

---

## Sales Channels Overview

### Channel Classification

| Channel | Frontend | Category | Language | Target |
|---------|----------|----------|----------|--------|
| **Sales Order** | ERP Dashboard | Offline Sales | Indonesian | B2B/Internal |
| **POS** | POS App | Offline Sales | Indonesian | B2C Retail |
| **Retail Website** | Web App | Online Sales | ID/EN (IP-based) | B2C |
| **Wholesale Website** | Web App | Online Sales | ID/EN (IP-based) | B2B |
| **Mobile Retail** | Expo (Android/iOS) | Online Sales | Indonesian | B2C |
| **Admin Mobile** | Expo (Android) | Internal | Indonesian | Staff |

### Channel Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SALES SERVICE                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ ERP Dashboard│  │    POS       │  │   Websites   │  │  Mobile Apps │        │
│  │              │  │              │  │              │  │              │        │
│  │ Sales Order  │  │ Point of     │  │ Retail (B2C) │  │ Retail App   │        │
│  │ (B2B/Manual) │  │ Sales        │  │ Wholesale    │  │ Admin App    │        │
│  │              │  │              │  │ (B2B)        │  │              │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                 │                 │
│         ▼                 ▼                 ▼                 ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        SALES ORDER AGGREGATE                             │   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Order Header│  │ Order Items │  │  Payments   │  │  Shipment   │    │   │
│  │  │             │  │             │  │             │  │             │    │   │
│  │  │ - Channel   │  │ - Product   │  │ - Method    │  │ - Address   │    │   │
│  │  │ - Status    │  │ - Quantity  │  │ - Amount    │  │ - Carrier   │    │   │
│  │  │ - Customer  │  │ - Price     │  │ - Status    │  │ - Tracking  │    │   │
│  │  │ - Locale    │  │ - Discount  │  │             │  │             │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Domain Model

### Core Entities

#### 1. SalesOrder (Aggregate Root)

```typescript
interface SalesOrder {
  // Identity
  id: string;
  orderNumber: string;              // Format: {CHANNEL}-{YYYYMMDD}-{SEQ}

  // Channel Information
  channel: SalesChannel;            // ERP_DASHBOARD, POS, WEB_RETAIL, WEB_WHOLESALE, MOBILE_RETAIL, MOBILE_ADMIN
  channelCategory: ChannelCategory; // OFFLINE_SALES, ONLINE_SALES

  // Customer Information
  customerId?: string;              // Optional for walk-in POS
  customerType: CustomerType;       // RETAIL, WHOLESALE, WALK_IN
  guestInfo?: GuestInfo;            // For non-registered customers

  // Localization
  locale: Locale;                   // id-ID, en-US
  currency: Currency;               // IDR, USD

  // Order Details
  items: SalesOrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;

  // Status & Workflow
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;

  // Metadata
  warehouseId: string;              // Source warehouse
  salesPersonId?: string;           // For ERP/Admin sales
  posTerminalId?: string;           // For POS sales
  sessionId?: string;               // For web/mobile tracking

  // Timestamps
  orderDate: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
```

#### 2. SalesOrderItem (Entity)

```typescript
interface SalesOrderItem {
  id: string;
  salesOrderId: string;

  // Product Information
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;

  // Variant/UOM
  variantId?: string;
  variantName?: string;
  uomId: string;
  uomCode: string;
  conversionFactor: number;

  // Quantity & Pricing
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalPrice: number;

  // Batch Information (for FEFO)
  batchId?: string;
  batchNumber?: string;
  expirationDate?: Date;

  // Fulfillment
  fulfilledQuantity: number;
  returnedQuantity: number;

  // Notes
  notes?: string;
}
```

#### 3. SalesPayment (Entity)

```typescript
interface SalesPayment {
  id: string;
  salesOrderId: string;

  // Payment Details
  paymentMethod: PaymentMethod;     // CASH, BANK_TRANSFER, CREDIT_CARD, E_WALLET, COD
  paymentProvider?: string;         // Midtrans, BCA, BRI, CIMB, GoPay, OVO, etc.

  // Amount
  amount: number;
  currency: Currency;
  exchangeRate?: number;            // For foreign currency

  // Status
  status: PaymentStatus;            // PENDING, PAID, FAILED, REFUNDED, PARTIAL_REFUND

  // Reference
  transactionId?: string;           // From payment provider
  referenceNumber?: string;         // Bank reference

  // Timestamps
  paidAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;

  // Metadata
  metadata?: Record<string, any>;   // Provider-specific data
}
```

#### 4. SalesShipment (Entity)

```typescript
interface SalesShipment {
  id: string;
  salesOrderId: string;

  // Shipping Method
  shippingMethod: ShippingMethod;   // PICKUP, DELIVERY, SELF_PICKUP
  carrierId?: string;               // Lalamove, J&T, JNE, etc.
  carrierName?: string;
  serviceType?: string;             // REG, EXPRESS, SAME_DAY

  // Address
  shippingAddress: Address;

  // Tracking
  trackingNumber?: string;
  trackingUrl?: string;

  // Status
  status: ShipmentStatus;           // PENDING, PICKED, PACKED, SHIPPED, IN_TRANSIT, DELIVERED, RETURNED

  // Costs
  shippingCost: number;
  insuranceCost?: number;

  // Timestamps
  estimatedDelivery?: Date;
  pickedAt?: Date;
  packedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;

  // Proof
  deliveryProofUrl?: string;        // Photo proof
  receiverName?: string;
  receiverSignature?: string;
}
```

### Value Objects

```typescript
// Sales Channel Types
enum SalesChannel {
  ERP_DASHBOARD = 'ERP_DASHBOARD',    // Sales Order via ERP
  POS = 'POS',                         // Point of Sales
  WEB_RETAIL = 'WEB_RETAIL',           // Retail Website
  WEB_WHOLESALE = 'WEB_WHOLESALE',     // Wholesale Website
  MOBILE_RETAIL = 'MOBILE_RETAIL',     // Mobile App (Customer)
  MOBILE_ADMIN = 'MOBILE_ADMIN',       // Mobile App (Admin)
  LIVE_STREAMING = 'LIVE_STREAMING'    // Live Streaming Sales
}

// Channel Categories
enum ChannelCategory {
  OFFLINE_SALES = 'OFFLINE_SALES',           // ERP Dashboard, POS
  ONLINE_SALES = 'ONLINE_SALES',             // Websites, Mobile Apps
  OMNICHANNEL_SALES = 'OMNICHANNEL_SALES'    // Products available on both channels
}

// Note: Live Streaming is part of ONLINE_SALES (Mobile Retail)
// - Staff administers via Mobile Admin app
// - Customers view/order via Mobile Retail app or Web Retail

// Order Status
enum OrderStatus {
  DRAFT = 'DRAFT',                     // Being created
  PENDING = 'PENDING',                 // Awaiting payment
  CONFIRMED = 'CONFIRMED',             // Payment confirmed
  PROCESSING = 'PROCESSING',           // Being prepared
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

// Customer Types
enum CustomerType {
  RETAIL = 'RETAIL',                   // B2C
  WHOLESALE = 'WHOLESALE',             // B2B
  WALK_IN = 'WALK_IN'                  // Anonymous POS
}

// Locale Support
enum Locale {
  ID_ID = 'id-ID',                     // Indonesian
  EN_US = 'en-US',                     // English (US)
  EN_GB = 'en-GB'                      // English (UK)
}
```

### Domain Events

```typescript
// Sales Events
interface SalesOrderCreated {
  type: 'SalesOrderCreated';
  payload: {
    orderId: string;
    orderNumber: string;
    channel: SalesChannel;
    customerId?: string;
    totalAmount: number;
    items: Array<{productId: string; quantity: number}>;
  };
}

interface SalesOrderPaid {
  type: 'SalesOrderPaid';
  payload: {
    orderId: string;
    paymentId: string;
    amount: number;
    paymentMethod: PaymentMethod;
  };
}

interface SalesOrderShipped {
  type: 'SalesOrderShipped';
  payload: {
    orderId: string;
    shipmentId: string;
    trackingNumber: string;
    carrier: string;
  };
}

interface SalesOrderCompleted {
  type: 'SalesOrderCompleted';
  payload: {
    orderId: string;
    totalAmount: number;
    channel: SalesChannel;
    completedAt: Date;
  };
}

interface SalesOrderCancelled {
  type: 'SalesOrderCancelled';
  payload: {
    orderId: string;
    reason: string;
    cancelledBy: string;
    refundAmount?: number;
  };
}

// Inventory Integration Events
interface StockReserved {
  type: 'StockReserved';
  payload: {
    orderId: string;
    items: Array<{
      productId: string;
      warehouseId: string;
      quantity: number;
      batchId?: string;
    }>;
  };
}

interface StockDeducted {
  type: 'StockDeducted';
  payload: {
    orderId: string;
    items: Array<{
      productId: string;
      warehouseId: string;
      quantity: number;
    }>;
  };
}

interface StockReleased {
  type: 'StockReleased';
  payload: {
    orderId: string;
    reason: 'CANCELLED' | 'TIMEOUT' | 'PAYMENT_FAILED';
  };
}
```

---

## Sales Channel Specifications

### 1. Sales Order (ERP Dashboard)

**Description**: Manual sales entry by staff via ERP Dashboard for B2B customers, phone orders, or special orders.

**Characteristics**:
- **Frontend**: ERP Dashboard (TanStack + ShadCN)
- **Category**: Offline Sales
- **Language**: Indonesian
- **Customer Type**: Wholesale (B2B), Retail (special cases)
- **Payment**: All methods (can be credit/terms)
- **Fulfillment**: Delivery or Pickup

**Features**:
- Manual customer selection or walk-in
- Apply custom discounts with approval
- Set payment terms (Net 30, Net 60)
- Assign to salesperson for commission
- Bulk order import (CSV/Excel)
- Quote to Order conversion

**Order Number Format**: `SO-{YYYYMMDD}-{SEQ}` (e.g., SO-20250716-0001)

**Workflow**:
```
DRAFT → PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED
                ↘ CANCELLED
```

---

### 2. POS (Point of Sales)

**Description**: In-store retail sales via dedicated POS terminals.

**Characteristics**:
- **Frontend**: POS Application (TanStack + ShadCN, optimized for touch)
- **Category**: Offline Sales
- **Language**: Indonesian
- **Customer Type**: Walk-in (default), Registered Retail
- **Payment**: Cash, Card, E-Wallet
- **Fulfillment**: Immediate (customer takes product)

**Features**:
- Barcode scanning (product lookup)
- Quick product search
- Member card lookup
- Split payment support
- Cash drawer integration
- Receipt printing (thermal)
- Offline mode with sync
- Daily shift management
- Cash reconciliation

**Order Number Format**: `POS-{TERMINAL}-{YYYYMMDD}-{SEQ}` (e.g., POS-T01-20250716-0001)

**Workflow**:
```
DRAFT → PAID → COMPLETED (immediate for POS)
      ↘ CANCELLED (void)
```

**Special Rules**:
- Can create negative stock (customer always gets product)
- No shipping required (immediate fulfillment)
- Automatic completion on payment

---

### 3. Retail Website (B2C)

**Description**: E-commerce website for retail customers.

**Characteristics**:
- **Frontend**: Next.js / TanStack Web App
- **Category**: Online Sales
- **Language**: Dual (Indonesian/English with IP-based auto-detection)
- **Customer Type**: Retail (B2C)
- **Payment**: All digital methods
- **Fulfillment**: Delivery (multiple carriers)

**Features**:
- Product catalog with search & filters
- Shopping cart with persistence
- Guest checkout option
- Member registration & login
- Wishlist
- Order tracking
- Product reviews
- Promo code application
- Multi-address management
- Shipping cost calculation

**Order Number Format**: `WR-{YYYYMMDD}-{SEQ}` (e.g., WR-20250716-0001)

**Language Detection**:
```typescript
function detectLocale(request: Request): Locale {
  // 1. Check user preference (if logged in)
  const userPreference = getUserLocalePreference(request);
  if (userPreference) return userPreference;

  // 2. Check IP-based geolocation
  const country = getCountryFromIP(request.headers.get('CF-IPCountry'));

  // Indonesian IPs → Indonesian
  if (country === 'ID') return Locale.ID_ID;

  // All other countries → English
  return Locale.EN_US;
}

// Cloudflare Workers provides CF-IPCountry header automatically
```

**Workflow**:
```
CART → CHECKOUT → PENDING (payment) → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED
                                    ↘ CANCELLED (payment timeout/user cancel)
```

---

### 4. Wholesale Website (B2B)

**Description**: E-commerce website for wholesale/business customers.

**Characteristics**:
- **Frontend**: Next.js / TanStack Web App (separate instance or route)
- **Category**: Online Sales
- **Language**: Dual (Indonesian/English with IP-based auto-detection)
- **Customer Type**: Wholesale (B2B)
- **Payment**: Bank Transfer, Credit Terms
- **Fulfillment**: Delivery (bulk shipping)

**Features**:
- Wholesale pricing (hidden from retail)
- Minimum Order Quantity (MOQ) enforcement
- Tiered pricing based on quantity
- Company registration & verification
- Tax invoice (Faktur Pajak) generation
- Credit limit management
- Purchase order (PO) upload
- Bulk ordering interface
- Scheduled deliveries
- Account manager assignment

**Order Number Format**: `WW-{YYYYMMDD}-{SEQ}` (e.g., WW-20250716-0001)

**Wholesale Requirements**:
```typescript
interface WholesaleCustomer {
  companyName: string;
  npwp: string;                    // Tax ID (Indonesia)
  businessLicense?: string;        // SIUP/NIB
  creditLimit: number;
  paymentTerms: PaymentTerms;      // COD, NET_7, NET_14, NET_30
  accountManagerId?: string;
  isVerified: boolean;
  verifiedAt?: Date;
}

interface WholesaleOrder {
  // Must meet MOQ per product
  // Uses wholesale pricing
  // Can use credit terms if verified
  // Generates commercial invoice
}
```

**Workflow**:
```
CART → CHECKOUT → PENDING → CONFIRMED (credit approved) → PROCESSING → SHIPPED → DELIVERED → COMPLETED
                          ↘ CREDIT_REVIEW (for large orders)
```

---

### 5. Mobile Retail App (Expo - Android/iOS)

**Description**: Mobile application for retail customers.

**Characteristics**:
- **Frontend**: React Native (Expo) with EAS
- **Platform**: Android & iOS
- **Category**: Online Sales
- **Language**: Indonesian only
- **Customer Type**: Retail (B2C)
- **Payment**: All digital methods + in-app purchase
- **Fulfillment**: Delivery

**Features**:
- Native mobile experience
- Push notifications (order updates, promos)
- Barcode scanner (product lookup)
- Image search (AI-powered)
- Saved payment methods
- Biometric authentication
- Offline catalog browsing
- Deep linking to products
- App-exclusive promotions
- Loyalty points integration

**Order Number Format**: `MR-{YYYYMMDD}-{SEQ}` (e.g., MR-20250716-0001)

**Technical Stack**:
```typescript
// Expo + EAS Configuration
{
  "expo": {
    "name": "Kidkazz",
    "slug": "kidkazz-retail",
    "platforms": ["android", "ios"],
    "android": {
      "package": "com.kidkazz.retail"
    },
    "ios": {
      "bundleIdentifier": "com.kidkazz.retail"
    }
  }
}

// API Backend: Cloudflare Workers with EXS
// Real-time: WebSocket via Durable Objects
```

**Workflow**: Same as Retail Website

---

### 6. Mobile Admin App (Expo - Android)

**Description**: Internal mobile application for Kidkazz staff.

**Characteristics**:
- **Frontend**: React Native (Expo)
- **Platform**: Android only
- **Category**: Internal Operations
- **Language**: Indonesian
- **Users**: Employees (Staff, Warehouse, Sales)

**Features**:

#### A. Attendance (Absensi)
```typescript
interface AttendanceFeature {
  // Clock in/out with GPS verification
  clockIn: {
    timestamp: Date;
    location: GeoLocation;
    photoProof: string;         // Selfie
    deviceId: string;
  };

  clockOut: {
    timestamp: Date;
    location: GeoLocation;
    notes?: string;
  };

  // Geofencing
  allowedLocations: GeoFence[];  // Office, Warehouse, Store

  // Leave requests
  leaveRequest: {
    type: LeaveType;            // SICK, ANNUAL, PERMISSION
    startDate: Date;
    endDate: Date;
    reason: string;
    attachments?: string[];
  };
}
```

#### B. Stock Opname (Inventory Count)
```typescript
interface StockOpnameFeature {
  // Barcode scanning
  scanProduct: (barcode: string) => Product;

  // Count entry
  countEntry: {
    productId: string;
    warehouseId: string;
    locationId: string;         // Rack, Bin
    systemQuantity: number;
    countedQuantity: number;
    variance: number;
    notes?: string;
    photoEvidence?: string;
  };

  // Batch counting
  batchCount: {
    batchNumber: string;
    expirationDate: Date;
    quantity: number;
  };

  // Approval workflow
  submitCount: () => Promise<void>;
  approveVariance: (countId: string) => Promise<void>;
}
```

#### C. Product Media Upload
```typescript
interface ProductMediaFeature {
  // Photo capture & upload
  capturePhoto: {
    productId: string;
    imageType: 'PRIMARY' | 'GALLERY' | 'DETAIL';
    image: File;
    compressionQuality: number;
  };

  // Video capture
  captureVideo: {
    productId: string;
    duration: number;           // Max 60 seconds
    video: File;
  };

  // Bulk upload queue
  uploadQueue: MediaUploadJob[];

  // Background upload with retry
  uploadConfig: {
    maxRetries: 3;
    chunkSize: 1024 * 1024;     // 1MB chunks
    compressionEnabled: true;
  };
}
```

#### D. Live Streaming Sales
```typescript
interface LiveStreamingFeature {
  // Stream setup
  createStream: {
    title: string;
    description: string;
    scheduledAt?: Date;
    products: string[];         // Featured products
    thumbnail: string;
  };

  // Live broadcast
  broadcast: {
    streamKey: string;
    rtmpUrl: string;            // RTMP ingest
    hlsUrl: string;             // HLS playback
    status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  };

  // Real-time features
  liveFeatures: {
    viewerCount: number;
    comments: LiveComment[];
    productHighlight: (productId: string) => void;  // Show product on screen
    flashSale: (productId: string, discount: number) => void;  // Limited time offer
  };

  // Live orders
  liveOrders: {
    orderId: string;
    streamId: string;
    productId: string;
    quantity: number;
    claimedAt: Date;
  };
}

// Technical: Cloudflare Stream for video
// WebSocket for real-time comments/orders
```

**Order Number Format** (Live Streaming): `LS-{STREAM_ID}-{SEQ}` (e.g., LS-ABC123-0001)

---

## Database Schema

### Core Tables

```sql
-- Sales Orders
CREATE TABLE sales_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,

  -- Channel
  channel TEXT NOT NULL,                      -- ERP_DASHBOARD, POS, WEB_RETAIL, etc.
  channel_category TEXT NOT NULL,             -- OFFLINE_SALES, ONLINE_SALES

  -- Customer
  customer_id TEXT,
  customer_type TEXT NOT NULL,                -- RETAIL, WHOLESALE, WALK_IN
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,

  -- Localization
  locale TEXT NOT NULL DEFAULT 'id-ID',
  currency TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate REAL DEFAULT 1.0,

  -- Amounts
  subtotal REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  shipping_cost REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'DRAFT',
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  fulfillment_status TEXT NOT NULL DEFAULT 'PENDING',

  -- Source
  warehouse_id TEXT NOT NULL,
  sales_person_id TEXT,
  pos_terminal_id TEXT,
  session_id TEXT,
  stream_id TEXT,                             -- For live streaming sales

  -- Timestamps
  order_date TEXT NOT NULL,
  paid_at TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  cancelled_at TEXT,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  cancellation_reason TEXT,

  -- Audit
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1
);

-- Sales Order Items
CREATE TABLE sales_order_items (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),

  -- Product
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,

  -- Variant/UOM
  variant_id TEXT,
  variant_name TEXT,
  uom_id TEXT NOT NULL,
  uom_code TEXT NOT NULL,
  conversion_factor REAL NOT NULL DEFAULT 1,

  -- Quantity & Pricing
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  tax_percent REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_price REAL NOT NULL,

  -- Batch (FEFO)
  batch_id TEXT,
  batch_number TEXT,
  expiration_date TEXT,

  -- Fulfillment
  fulfilled_quantity INTEGER DEFAULT 0,
  returned_quantity INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sales Payments
CREATE TABLE sales_payments (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),

  -- Payment
  payment_method TEXT NOT NULL,
  payment_provider TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate REAL DEFAULT 1.0,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING',

  -- Reference
  transaction_id TEXT,
  reference_number TEXT,

  -- Timestamps
  paid_at TEXT,
  verified_at TEXT,
  verified_by TEXT,
  refunded_at TEXT,

  -- Metadata
  metadata TEXT,                              -- JSON

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sales Shipments
CREATE TABLE sales_shipments (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),

  -- Shipping
  shipping_method TEXT NOT NULL,
  carrier_id TEXT,
  carrier_name TEXT,
  service_type TEXT,

  -- Address
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Indonesia',

  -- Tracking
  tracking_number TEXT,
  tracking_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING',

  -- Costs
  shipping_cost REAL NOT NULL DEFAULT 0,
  insurance_cost REAL DEFAULT 0,

  -- Timestamps
  estimated_delivery TEXT,
  picked_at TEXT,
  packed_at TEXT,
  shipped_at TEXT,
  delivered_at TEXT,

  -- Proof
  delivery_proof_url TEXT,
  receiver_name TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- POS Terminals
CREATE TABLE pos_terminals (
  id TEXT PRIMARY KEY,
  terminal_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- POS Sessions (Shifts)
CREATE TABLE pos_sessions (
  id TEXT PRIMARY KEY,
  terminal_id TEXT NOT NULL REFERENCES pos_terminals(id),
  cashier_id TEXT NOT NULL,

  -- Shift
  opened_at TEXT NOT NULL,
  closed_at TEXT,

  -- Cash
  opening_cash REAL NOT NULL DEFAULT 0,
  closing_cash REAL,
  expected_cash REAL,
  cash_variance REAL,

  -- Summary
  total_sales REAL DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_refunds REAL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'OPEN',

  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Live Streams
CREATE TABLE live_streams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,

  -- Host
  host_id TEXT NOT NULL,

  -- Schedule
  scheduled_at TEXT,
  started_at TEXT,
  ended_at TEXT,

  -- Stream
  stream_key TEXT UNIQUE,
  rtmp_url TEXT,
  hls_url TEXT,
  thumbnail_url TEXT,

  -- Stats
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'SCHEDULED',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Live Stream Products
CREATE TABLE live_stream_products (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES live_streams(id),
  product_id TEXT NOT NULL,

  -- Special pricing
  stream_price REAL,                          -- Flash sale price
  stream_discount_percent REAL,
  max_quantity INTEGER,                        -- Limited quantity

  -- Stats
  sold_quantity INTEGER DEFAULT 0,

  -- Highlight
  highlighted_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_orders_channel ON sales_orders(channel);
CREATE INDEX idx_orders_status ON sales_orders(status);
CREATE INDEX idx_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_orders_date ON sales_orders(order_date);
CREATE INDEX idx_orders_warehouse ON sales_orders(warehouse_id);
CREATE INDEX idx_items_order ON sales_order_items(sales_order_id);
CREATE INDEX idx_items_product ON sales_order_items(product_id);
CREATE INDEX idx_payments_order ON sales_payments(sales_order_id);
CREATE INDEX idx_shipments_order ON sales_shipments(sales_order_id);
CREATE INDEX idx_sessions_terminal ON pos_sessions(terminal_id);
CREATE INDEX idx_streams_status ON live_streams(status);
```

---

## API Architecture

### RESTful Endpoints

#### Sales Orders
```typescript
// Core CRUD
POST   /api/sales/orders                      // Create order
GET    /api/sales/orders                      // List orders (with filters)
GET    /api/sales/orders/:id                  // Get order details
PUT    /api/sales/orders/:id                  // Update order
DELETE /api/sales/orders/:id                  // Cancel/delete order

// Items
POST   /api/sales/orders/:id/items            // Add item
PUT    /api/sales/orders/:id/items/:itemId    // Update item
DELETE /api/sales/orders/:id/items/:itemId    // Remove item

// Workflow
POST   /api/sales/orders/:id/confirm          // Confirm order
POST   /api/sales/orders/:id/process          // Start processing
POST   /api/sales/orders/:id/ship             // Mark as shipped
POST   /api/sales/orders/:id/deliver          // Mark as delivered
POST   /api/sales/orders/:id/complete         // Complete order
POST   /api/sales/orders/:id/cancel           // Cancel order
POST   /api/sales/orders/:id/refund           // Process refund

// Query
GET    /api/sales/orders/by-number/:orderNumber
GET    /api/sales/orders/by-customer/:customerId
GET    /api/sales/orders/by-channel/:channel
```

#### POS Specific
```typescript
// POS Terminal
GET    /api/sales/pos/terminals               // List terminals
POST   /api/sales/pos/terminals               // Register terminal
GET    /api/sales/pos/terminals/:id           // Get terminal
PUT    /api/sales/pos/terminals/:id           // Update terminal

// POS Sessions
POST   /api/sales/pos/sessions/open           // Open shift
POST   /api/sales/pos/sessions/close          // Close shift
GET    /api/sales/pos/sessions/current        // Get current session
GET    /api/sales/pos/sessions/:id            // Get session details

// POS Sales (optimized for speed)
POST   /api/sales/pos/quick-sale              // Quick sale (single API call)
POST   /api/sales/pos/scan                    // Scan barcode → product info
POST   /api/sales/pos/void/:id                // Void transaction
GET    /api/sales/pos/recent                  // Recent transactions

// Offline Sync
POST   /api/sales/pos/sync                    // Sync offline transactions
GET    /api/sales/pos/sync/status             // Get sync status
```

#### Web/Mobile Checkout
```typescript
// Cart
GET    /api/sales/cart                        // Get cart
POST   /api/sales/cart/items                  // Add to cart
PUT    /api/sales/cart/items/:id              // Update cart item
DELETE /api/sales/cart/items/:id              // Remove from cart
DELETE /api/sales/cart                        // Clear cart

// Checkout
POST   /api/sales/checkout/validate           // Validate cart
POST   /api/sales/checkout/shipping           // Calculate shipping
POST   /api/sales/checkout/promo              // Apply promo code
POST   /api/sales/checkout/place-order        // Place order
GET    /api/sales/checkout/payment-methods    // Available methods

// Tracking
GET    /api/sales/orders/:id/track            // Track order
GET    /api/sales/orders/:id/shipment         // Get shipment details
```

#### Live Streaming
```typescript
// Streams
POST   /api/sales/streams                     // Create stream
GET    /api/sales/streams                     // List streams
GET    /api/sales/streams/:id                 // Get stream details
PUT    /api/sales/streams/:id                 // Update stream
POST   /api/sales/streams/:id/start           // Start broadcasting
POST   /api/sales/streams/:id/end             // End stream

// Stream Products
POST   /api/sales/streams/:id/products        // Add featured product
PUT    /api/sales/streams/:id/products/:pid   // Update product (flash sale)
POST   /api/sales/streams/:id/highlight/:pid  // Highlight product

// Live Orders
POST   /api/sales/streams/:id/orders          // Place order from stream
GET    /api/sales/streams/:id/orders          // Get stream orders

// WebSocket
WS     /api/sales/streams/:id/live            // Real-time stream events
```

### WebSocket Events

```typescript
// Stream Events
interface StreamEvents {
  // Viewer events
  'viewer:join': { viewerId: string; timestamp: Date };
  'viewer:leave': { viewerId: string };

  // Comment events
  'comment:new': { userId: string; message: string; timestamp: Date };

  // Product events
  'product:highlight': { productId: string; product: Product };
  'product:flash_sale': { productId: string; discount: number; duration: number };

  // Order events
  'order:placed': { orderId: string; productId: string; quantity: number };

  // Stats
  'stats:update': { viewers: number; orders: number; revenue: number };
}
```

---

## Frontend Applications

### Technology Stack Overview

| Application | Framework | Platform | Language |
|-------------|-----------|----------|----------|
| ERP Dashboard | TanStack + ShadCN | Web | TypeScript |
| POS App | TanStack + ShadCN | Web (PWA) | TypeScript |
| Retail Website | Next.js / TanStack | Web | TypeScript |
| Wholesale Website | Next.js / TanStack | Web | TypeScript |
| Mobile Retail | Expo (React Native) | Android/iOS | TypeScript |
| Mobile Admin | Expo (React Native) | Android | TypeScript |

### Shared Components

```typescript
// Shared UI Components across all frontends
@kidkazz/ui-components
├── ProductCard
├── CartWidget
├── OrderSummary
├── PaymentMethodSelector
├── AddressForm
├── OrderStatusBadge
├── PriceDisplay (with locale formatting)
└── ...

// Shared API Client
@kidkazz/api-client
├── SalesClient
├── ProductClient
├── InventoryClient
├── AuthClient
└── WebSocketClient

// Shared Utilities
@kidkazz/shared
├── formatCurrency(amount, locale, currency)
├── formatDate(date, locale)
├── translateStatus(status, locale)
└── ...
```

---

## Integration Points

### Service Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SALES SERVICE                                │
│                                                                      │
│  Depends on:                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Product    │  │  Inventory   │  │   Business   │              │
│  │   Service    │  │   Service    │  │   Partner    │              │
│  │              │  │              │  │   Service    │              │
│  │ - Catalog    │  │ - Stock      │  │ - Customers  │              │
│  │ - Pricing    │  │ - Reserve    │  │ - Employees  │              │
│  │ - UOM        │  │ - Deduct     │  │ - Auth/RBAC  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Payment    │  │   Shipping   │  │  Accounting  │              │
│  │   Service    │  │   Service    │  │   Service    │              │
│  │              │  │              │  │              │              │
│  │ - Midtrans   │  │ - Lalamove   │  │ - Journal    │              │
│  │ - Bank APIs  │  │ - J&T        │  │ - Revenue    │              │
│  │              │  │ - JNE        │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Event Flow

```typescript
// Order Creation Flow
SalesOrderCreated → Inventory.ReserveStock → Payment.CreateInvoice

// Payment Flow
PaymentReceived → Sales.ConfirmOrder → Inventory.DeductStock → Accounting.CreateJournal

// Fulfillment Flow
OrderShipped → Shipping.TrackShipment → Customer.Notify

// Cancellation Flow
OrderCancelled → Inventory.ReleaseStock → Payment.ProcessRefund → Accounting.CreateReversal
```

---

## Internationalization Strategy

### Language Detection Flow

```typescript
// Cloudflare Worker middleware
export async function detectLocale(request: Request): Promise<Locale> {
  // 1. Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');

  // 2. Check Cloudflare country header
  const country = request.headers.get('CF-IPCountry');

  // 3. Check user preference (from cookie or auth)
  const userPreference = getCookie(request, 'locale');

  // Priority: User preference > IP-based > Accept-Language > Default
  if (userPreference && isValidLocale(userPreference)) {
    return userPreference as Locale;
  }

  // Indonesian IP → Indonesian
  if (country === 'ID') {
    return 'id-ID';
  }

  // Other countries → English
  return 'en-US';
}

// Currency mapping
const LOCALE_CURRENCY_MAP: Record<Locale, Currency> = {
  'id-ID': 'IDR',
  'en-US': 'USD',
  'en-GB': 'GBP'
};
```

### Translation Structure

```typescript
// Translation files structure
locales/
├── id-ID/
│   ├── common.json
│   ├── product.json
│   ├── checkout.json
│   ├── order.json
│   └── error.json
├── en-US/
│   ├── common.json
│   ├── product.json
│   ├── checkout.json
│   ├── order.json
│   └── error.json

// Example translations
// id-ID/checkout.json
{
  "cart": "Keranjang",
  "checkout": "Checkout",
  "subtotal": "Subtotal",
  "shipping": "Ongkos Kirim",
  "total": "Total",
  "place_order": "Pesan Sekarang",
  "payment_method": "Metode Pembayaran",
  "shipping_address": "Alamat Pengiriman"
}

// en-US/checkout.json
{
  "cart": "Cart",
  "checkout": "Checkout",
  "subtotal": "Subtotal",
  "shipping": "Shipping",
  "total": "Total",
  "place_order": "Place Order",
  "payment_method": "Payment Method",
  "shipping_address": "Shipping Address"
}
```

### Price/Currency Display

```typescript
// Price formatting utility
function formatPrice(amount: number, locale: Locale, currency: Currency): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2
  }).format(amount);
}

// Examples:
formatPrice(150000, 'id-ID', 'IDR');  // "Rp 150.000"
formatPrice(10.99, 'en-US', 'USD');   // "$10.99"
```

---

## Performance Considerations

### POS Optimization

```typescript
// Quick sale - single API call
POST /api/sales/pos/quick-sale
{
  "terminalId": "T01",
  "items": [
    { "barcode": "123456789", "quantity": 2 }
  ],
  "payment": {
    "method": "CASH",
    "amount": 50000,
    "tendered": 100000
  }
}

// Response includes:
{
  "orderId": "...",
  "orderNumber": "POS-T01-20250716-0001",
  "change": 50000,
  "receipt": { ... }  // Receipt data for printing
}

// Target: < 500ms total response time
```

### Offline Mode (POS & Mobile)

```typescript
// IndexedDB for offline storage
interface OfflineQueue {
  id: string;
  action: 'CREATE_ORDER' | 'UPDATE_ORDER' | 'SYNC_STOCK';
  payload: any;
  createdAt: Date;
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
}

// Background sync when online
navigator.serviceWorker.ready.then(registration => {
  registration.sync.register('sync-orders');
});
```

---

## Security Considerations

### Channel-Specific Security

| Channel | Authentication | Additional Security |
|---------|---------------|---------------------|
| ERP Dashboard | JWT + RBAC | IP whitelist (optional) |
| POS | JWT + Terminal ID | Device binding |
| Web Retail | JWT (optional guest) | CSRF, Rate limiting |
| Web Wholesale | JWT (required) | Company verification |
| Mobile Retail | JWT + Biometric | Device attestation |
| Mobile Admin | JWT + Biometric | Company device only |

### API Security

```typescript
// Rate limiting per channel
const RATE_LIMITS = {
  ERP_DASHBOARD: { window: '1m', max: 100 },
  POS: { window: '1m', max: 500 },           // Higher for quick sales
  WEB_RETAIL: { window: '1m', max: 60 },
  WEB_WHOLESALE: { window: '1m', max: 60 },
  MOBILE_RETAIL: { window: '1m', max: 60 },
  MOBILE_ADMIN: { window: '1m', max: 100 }
};
```

---

## Saga Pattern Orchestration

### Overview

Since Kidkazz uses a microservices architecture based on DDD, the Sales Service must orchestrate complex workflows across multiple bounded contexts using the **Saga Pattern**. Each sales order involves:

- **Inventory Service** - Stock reservation and deduction
- **Payment Service** - Payment processing
- **Business Partner Service** - Customer data, loyalty points
- **Shipping Service** - Shipment creation
- **Accounting Service** - Journal entries

### Saga Implementation: Cloudflare Workflows

We use **Cloudflare Workflows** (Durable Execution) to implement sagas with automatic retry, timeout handling, and compensating transactions.

```typescript
// Cloudflare Workflow Definition
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class SalesOrderSaga extends WorkflowEntrypoint<Env, SalesOrderSagaParams> {
  async run(event: WorkflowEvent<SalesOrderSagaParams>, step: WorkflowStep) {
    const { orderId, items, customerId, paymentMethod } = event.payload;

    // Step 1: Validate Customer
    const customer = await step.do('validate-customer', async () => {
      return await this.env.BUSINESS_PARTNER_SERVICE.validateCustomer(customerId);
    });

    // Step 2: Reserve Inventory
    const reservation = await step.do('reserve-inventory', async () => {
      return await this.env.INVENTORY_SERVICE.reserveStock({
        orderId,
        items,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    });

    // Step 3: Calculate Pricing (including loyalty discounts)
    const pricing = await step.do('calculate-pricing', async () => {
      return await this.env.PRODUCT_SERVICE.calculateOrderPricing({
        items,
        customerId,
        loyaltyPoints: customer.loyaltyPoints
      });
    });

    // Step 4: Process Payment
    let payment;
    try {
      payment = await step.do('process-payment', async () => {
        return await this.env.PAYMENT_SERVICE.processPayment({
          orderId,
          amount: pricing.totalAmount,
          method: paymentMethod,
          customerId
        });
      });
    } catch (error) {
      // Compensate: Release inventory reservation
      await step.do('compensate-release-inventory', async () => {
        await this.env.INVENTORY_SERVICE.releaseReservation(reservation.reservationId);
      });
      throw error;
    }

    // Step 5: Confirm Order & Deduct Inventory
    try {
      await step.do('deduct-inventory', async () => {
        return await this.env.INVENTORY_SERVICE.deductStock({
          reservationId: reservation.reservationId,
          orderId
        });
      });
    } catch (error) {
      // Compensate: Refund payment
      await step.do('compensate-refund-payment', async () => {
        await this.env.PAYMENT_SERVICE.refundPayment(payment.transactionId);
      });
      throw error;
    }

    // Step 6: Deduct Loyalty Points (if used)
    if (pricing.loyaltyPointsUsed > 0) {
      await step.do('deduct-loyalty-points', async () => {
        return await this.env.BUSINESS_PARTNER_SERVICE.deductLoyaltyPoints({
          customerId,
          points: pricing.loyaltyPointsUsed,
          orderId
        });
      });
    }

    // Step 7: Create Accounting Entries
    await step.do('create-journal-entries', async () => {
      return await this.env.ACCOUNTING_SERVICE.createSalesJournal({
        orderId,
        amount: pricing.totalAmount,
        tax: pricing.taxAmount,
        paymentMethod
      });
    });

    // Step 8: Award Loyalty Points
    await step.do('award-loyalty-points', async () => {
      return await this.env.BUSINESS_PARTNER_SERVICE.awardLoyaltyPoints({
        customerId,
        orderId,
        orderAmount: pricing.totalAmount
      });
    });

    return {
      success: true,
      orderId,
      paymentId: payment.transactionId,
      reservationId: reservation.reservationId
    };
  }
}
```

### Sales Order Saga Workflows

#### 1. Order Creation Saga (Online Channels)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ORDER CREATION SAGA                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ Validate │───▶│ Reserve  │───▶│ Calculate│───▶│ Process  │───▶│ Deduct   │ │
│  │ Customer │    │ Stock    │    │ Pricing  │    │ Payment  │    │ Stock    │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       │               │               │               │               │        │
│       │               │               │               │               │        │
│       ▼               ▼               ▼               ▼               ▼        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ Rollback │◀───│ Release  │◀───│ Cancel   │◀───│ Refund   │◀───│ Restore  │ │
│  │ Order    │    │ Reserve  │    │ Price    │    │ Payment  │    │ Stock    │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                                  │
│  │ Deduct   │───▶│ Create   │───▶│ Award    │───▶ SUCCESS                      │
│  │ Loyalty  │    │ Journal  │    │ Points   │                                  │
│  └──────────┘    └──────────┘    └──────────┘                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Steps**:
| Step | Service | Action | Compensating Action |
|------|---------|--------|---------------------|
| 1 | Business Partner | Validate customer exists & active | Mark order as invalid |
| 2 | Inventory | Reserve stock for items | Release reservation |
| 3 | Product | Calculate prices & discounts | N/A (stateless) |
| 4 | Payment | Process payment | Refund payment |
| 5 | Inventory | Deduct stock (confirm reservation) | Restore stock |
| 6 | Business Partner | Deduct loyalty points (if used) | Restore points |
| 7 | Accounting | Create sales journal entry | Create reversal entry |
| 8 | Business Partner | Award new loyalty points | Deduct awarded points |

---

#### 2. POS Quick Sale Saga (Optimized)

```typescript
export class POSQuickSaleSaga extends WorkflowEntrypoint<Env, POSSaleParams> {
  async run(event: WorkflowEvent<POSSaleParams>, step: WorkflowStep) {
    const { terminalId, items, payment, cashierId } = event.payload;

    // POS is optimized for speed - parallel where possible
    // Stock deduction happens immediately (can go negative)

    // Step 1: Create Order & Deduct Stock (parallel)
    const [order, stockResult] = await Promise.all([
      step.do('create-order', async () => {
        return await this.createPOSOrder(terminalId, items, cashierId);
      }),
      step.do('deduct-stock-pos', async () => {
        // POS allows negative stock
        return await this.env.INVENTORY_SERVICE.posDeductStock({
          items,
          warehouseId: await this.getWarehouseForTerminal(terminalId),
          allowNegative: true
        });
      })
    ]);

    // Step 2: Record Payment
    const paymentResult = await step.do('record-payment', async () => {
      return await this.env.PAYMENT_SERVICE.recordPOSPayment({
        orderId: order.id,
        method: payment.method,
        amount: payment.amount,
        tendered: payment.tendered
      });
    });

    // Step 3: Create Accounting Entry (async, non-blocking)
    step.do('create-journal-async', async () => {
      await this.env.ACCOUNTING_SERVICE.createSalesJournal({
        orderId: order.id,
        amount: payment.amount,
        paymentMethod: payment.method,
        channel: 'POS'
      });
    });

    // Step 4: Update Session Totals
    await step.do('update-session', async () => {
      await this.updatePOSSession(terminalId, payment.amount);
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      change: payment.tendered - payment.amount,
      receipt: this.generateReceipt(order, paymentResult)
    };
  }
}
```

**POS Saga Characteristics**:
- No reservation step (immediate deduction)
- Allows negative stock (customer always gets product)
- Optimized for < 500ms response
- Accounting entry is async (non-blocking)
- Minimal compensating actions needed

---

#### 3. Order Fulfillment Saga

```typescript
export class OrderFulfillmentSaga extends WorkflowEntrypoint<Env, FulfillmentParams> {
  async run(event: WorkflowEvent<FulfillmentParams>, step: WorkflowStep) {
    const { orderId, shipmentDetails } = event.payload;

    // Step 1: Validate Order Status
    const order = await step.do('validate-order', async () => {
      return await this.validateOrderForFulfillment(orderId);
    });

    // Step 2: Pick Items (FEFO)
    const pickedItems = await step.do('pick-items', async () => {
      return await this.env.INVENTORY_SERVICE.pickItems({
        orderId,
        items: order.items,
        warehouseId: order.warehouseId,
        strategy: 'FEFO' // First Expired, First Out
      });
    });

    // Step 3: Create Shipment
    let shipment;
    try {
      shipment = await step.do('create-shipment', async () => {
        return await this.env.SHIPPING_SERVICE.createShipment({
          orderId,
          carrier: shipmentDetails.carrier,
          serviceType: shipmentDetails.serviceType,
          address: order.shippingAddress,
          items: pickedItems
        });
      });
    } catch (error) {
      // Compensate: Unpick items
      await step.do('compensate-unpick', async () => {
        await this.env.INVENTORY_SERVICE.unpickItems(pickedItems);
      });
      throw error;
    }

    // Step 4: Update Order Status
    await step.do('update-order-shipped', async () => {
      await this.updateOrderStatus(orderId, 'SHIPPED', {
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier
      });
    });

    // Step 5: Send Notification
    await step.do('notify-customer', async () => {
      await this.env.NOTIFICATION_SERVICE.sendShipmentNotification({
        customerId: order.customerId,
        orderId,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl
      });
    });

    return {
      success: true,
      orderId,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber
    };
  }
}
```

---

#### 4. Order Cancellation Saga

```typescript
export class OrderCancellationSaga extends WorkflowEntrypoint<Env, CancellationParams> {
  async run(event: WorkflowEvent<CancellationParams>, step: WorkflowStep) {
    const { orderId, reason, cancelledBy, refundRequired } = event.payload;

    // Step 1: Validate Cancellation Allowed
    const order = await step.do('validate-cancellation', async () => {
      return await this.validateCancellationAllowed(orderId);
    });

    // Step 2: Release Inventory Reservation (if exists)
    if (order.reservationId) {
      await step.do('release-reservation', async () => {
        await this.env.INVENTORY_SERVICE.releaseReservation(order.reservationId);
      });
    }

    // Step 3: Restore Stock (if already deducted)
    if (order.status === 'CONFIRMED' || order.status === 'PROCESSING') {
      await step.do('restore-stock', async () => {
        await this.env.INVENTORY_SERVICE.restoreStock({
          orderId,
          items: order.items,
          warehouseId: order.warehouseId
        });
      });
    }

    // Step 4: Process Refund (if paid)
    if (refundRequired && order.paymentStatus === 'PAID') {
      await step.do('process-refund', async () => {
        await this.env.PAYMENT_SERVICE.processRefund({
          orderId,
          amount: order.totalAmount,
          reason
        });
      });
    }

    // Step 5: Restore Loyalty Points (if used)
    if (order.loyaltyPointsUsed > 0) {
      await step.do('restore-loyalty-points', async () => {
        await this.env.BUSINESS_PARTNER_SERVICE.restoreLoyaltyPoints({
          customerId: order.customerId,
          points: order.loyaltyPointsUsed,
          orderId
        });
      });
    }

    // Step 6: Revoke Awarded Points (if any)
    if (order.loyaltyPointsAwarded > 0) {
      await step.do('revoke-awarded-points', async () => {
        await this.env.BUSINESS_PARTNER_SERVICE.revokeAwardedPoints({
          customerId: order.customerId,
          points: order.loyaltyPointsAwarded,
          orderId
        });
      });
    }

    // Step 7: Create Reversal Journal Entry
    await step.do('create-reversal-journal', async () => {
      await this.env.ACCOUNTING_SERVICE.createReversalJournal({
        originalOrderId: orderId,
        amount: order.totalAmount,
        reason
      });
    });

    // Step 8: Update Order Status
    await step.do('update-order-cancelled', async () => {
      await this.updateOrderStatus(orderId, 'CANCELLED', {
        reason,
        cancelledBy,
        cancelledAt: new Date()
      });
    });

    // Step 9: Notify Customer
    await step.do('notify-cancellation', async () => {
      await this.env.NOTIFICATION_SERVICE.sendCancellationNotification({
        customerId: order.customerId,
        orderId,
        reason,
        refundAmount: refundRequired ? order.totalAmount : 0
      });
    });

    return {
      success: true,
      orderId,
      refundProcessed: refundRequired
    };
  }
}
```

---

#### 5. Live Streaming Order Saga

```typescript
export class LiveStreamOrderSaga extends WorkflowEntrypoint<Env, LiveOrderParams> {
  async run(event: WorkflowEvent<LiveOrderParams>, step: WorkflowStep) {
    const { streamId, productId, quantity, customerId, paymentMethod } = event.payload;

    // Step 1: Validate Stream & Product
    const streamProduct = await step.do('validate-stream-product', async () => {
      return await this.validateStreamProduct(streamId, productId, quantity);
    });

    // Step 2: Claim Flash Sale Stock (with lock)
    let claimed;
    try {
      claimed = await step.do('claim-flash-stock', {
        timeout: '10s',
        retries: { limit: 3, delay: '500ms' }
      }, async () => {
        return await this.env.INVENTORY_SERVICE.claimFlashSaleStock({
          streamId,
          productId,
          quantity,
          customerId,
          expiresIn: 15 * 60 * 1000 // 15 minutes to pay
        });
      });
    } catch (error) {
      // Stock not available
      return { success: false, error: 'SOLD_OUT' };
    }

    // Step 3: Create Order with Stream Price
    const order = await step.do('create-stream-order', async () => {
      return await this.createOrder({
        channel: 'LIVE_STREAMING',
        streamId,
        customerId,
        items: [{
          productId,
          quantity,
          unitPrice: streamProduct.streamPrice || streamProduct.regularPrice
        }]
      });
    });

    // Step 4: Process Payment (15 min timeout)
    let payment;
    try {
      payment = await step.do('process-payment', {
        timeout: '15m'
      }, async () => {
        return await this.env.PAYMENT_SERVICE.processPayment({
          orderId: order.id,
          amount: order.totalAmount,
          method: paymentMethod
        });
      });
    } catch (error) {
      // Payment failed or timeout - release stock
      await step.do('release-flash-stock', async () => {
        await this.env.INVENTORY_SERVICE.releaseFlashSaleStock(claimed.claimId);
      });
      await step.do('cancel-order', async () => {
        await this.updateOrderStatus(order.id, 'CANCELLED', {
          reason: 'Payment failed or timeout'
        });
      });
      throw error;
    }

    // Step 5: Confirm Stock Deduction
    await step.do('confirm-stock-deduction', async () => {
      await this.env.INVENTORY_SERVICE.confirmFlashSaleClaim(claimed.claimId);
    });

    // Step 6: Update Stream Stats
    await step.do('update-stream-stats', async () => {
      await this.updateStreamStats(streamId, {
        ordersCount: 1,
        revenue: order.totalAmount
      });
    });

    // Step 7: Broadcast Order Notification (WebSocket)
    await step.do('broadcast-order', async () => {
      await this.env.STREAM_ROOM.broadcast(streamId, {
        type: 'order:placed',
        data: {
          productId,
          quantity,
          customerName: await this.getCustomerDisplayName(customerId)
        }
      });
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber
    };
  }
}
```

---

### Saga State Management

```typescript
// Saga execution state stored in D1
CREATE TABLE saga_executions (
  id TEXT PRIMARY KEY,
  saga_type TEXT NOT NULL,               -- ORDER_CREATION, FULFILLMENT, CANCELLATION, etc.
  workflow_id TEXT NOT NULL,             -- Cloudflare Workflow instance ID
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,                  -- RUNNING, COMPLETED, FAILED, COMPENSATING
  current_step TEXT,
  completed_steps TEXT,                  -- JSON array
  failed_step TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saga_order ON saga_executions(order_id);
CREATE INDEX idx_saga_status ON saga_executions(status);
```

### Error Handling & Retry Strategy

```typescript
// Cloudflare Workflow retry configuration
const retryConfig = {
  // Transient errors (network, timeout) - retry
  retries: {
    limit: 3,
    delay: '1s',
    backoff: 'exponential'
  },
  // Timeout per step
  timeout: '30s'
};

// Business errors - no retry, compensate
const handleBusinessError = async (error: Error, step: WorkflowStep) => {
  if (error instanceof InsufficientStockError) {
    // Don't retry, notify user
    return { success: false, error: 'INSUFFICIENT_STOCK' };
  }
  if (error instanceof PaymentDeclinedError) {
    // Don't retry, notify user
    return { success: false, error: 'PAYMENT_DECLINED' };
  }
  // Unknown error - log and rethrow
  throw error;
};
```

### Idempotency

```typescript
// All saga operations must be idempotent
// Use idempotency keys to prevent duplicate processing

interface SagaStep {
  idempotencyKey: string;  // orderId + stepName + attempt
  execute: () => Promise<any>;
}

// Example: Payment processing with idempotency
await step.do('process-payment', async () => {
  return await this.env.PAYMENT_SERVICE.processPayment({
    idempotencyKey: `${orderId}-payment-${attempt}`,
    orderId,
    amount,
    method
  });
});

// Payment service checks idempotency key before processing
// Returns existing result if already processed
```

### Monitoring & Observability

```typescript
// Saga execution events for monitoring
interface SagaEvent {
  sagaId: string;
  sagaType: string;
  orderId: string;
  event: 'STARTED' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'COMPENSATING' | 'COMPLETED' | 'FAILED';
  step?: string;
  duration?: number;
  error?: string;
  timestamp: Date;
}

// Publish to analytics
await analytics.track('saga_event', sagaEvent);

// Alerting on failures
if (event === 'FAILED') {
  await alerting.notify({
    severity: 'HIGH',
    message: `Saga ${sagaType} failed for order ${orderId}`,
    error
  });
}
```

---

## Related Documents

- [Sales Service Business Rules](./BUSINESS_RULES.md)
- [Sales Service Implementation Plan](./SALES_IMPLEMENTATION_PLAN.md)
- [Saga Pattern Documentation](../../architecture/SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md)
- [Inventory Service Integration](../inventory/INVENTORY_SERVICE_ARCHITECTURE.md)
- [Business Partner Service](../business-partner/BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
- [Payment Service Integration](../payment/PAYMENT_SERVICE_ARCHITECTURE.md)
- [Shipping Service Integration](../shipping/SHIPPING_SERVICE_ARCHITECTURE.md)
