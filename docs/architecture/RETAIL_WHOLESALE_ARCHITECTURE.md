# Retail + Wholesale Architecture

## Overview

The platform now supports **dual markets**: **Retail (B2C)** and **Wholesale (B2B)** with separate frontends, pricing, and user experiences.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN/Edge                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Retail     │  │  Wholesale   │  │    Admin     │    │
│  │  Frontend    │  │  Frontend    │  │  Dashboard   │    │
│  │ (TanStack)   │  │ (TanStack)   │  │ (TanStack)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │             │
│         └─────────────────┴──────────────────┘             │
│                           │                                 │
│                  ┌────────▼────────┐                       │
│                  │  Unified API    │                       │
│                  │  (Hono)         │                       │
│                  └────────┬────────┘                       │
│                           │                                 │
│            ┌──────────────┼──────────────┐                │
│            │              │              │                 │
│       ┌────▼───┐    ┌────▼────┐    ┌───▼────┐           │
│       │  D1    │    │   KV    │    │   R2   │           │
│       │Database│    │  Cache  │    │ Images │           │
│       └────────┘    └─────────┘    └────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## User Types

| User Type | Role Code | Access | Features |
|-----------|-----------|--------|----------|
| **Retail Customer** | `retail_buyer` | Retail Frontend | - Browse retail products<br>- See retail prices<br>- Buy single units<br>- No MOQ required<br>- Standard checkout |
| **Wholesale Buyer** | `wholesale_buyer` | Wholesale Frontend | - Browse wholesale products<br>- See bulk pricing tiers<br>- Must meet MOQ<br>- Tiered discounts<br>- Request quotes (RFQ)<br>- Company verification required |
| **Supplier** | `supplier` | Real Time ERP Dashboard | - Manage products<br>- Set pricing (retail + wholesale)<br>- Fulfill orders |
| **Admin** | `admin` | Real Time ERP Dashboard | - Full access<br>- Manage all users<br>- View all orders |

---

## Product Availability Matrix

Products can be configured for different markets:

| Configuration | Retail Price | Wholesale Price | Retail Visible | Wholesale Visible |
|---------------|--------------|-----------------|----------------|-------------------|
| **Retail Only** | ✅ Set | ❌ Not set | ✅ Yes | ❌ No |
| **Wholesale Only** | ❌ Not set | ✅ Set (tiered) | ❌ No | ✅ Yes |
| **Both Markets** | ✅ Set | ✅ Set (tiered) | ✅ Yes | ✅ Yes |

**Business Rules:**
- Retail customers NEVER see wholesale prices
- Wholesale customers see wholesale prices (tiered based on quantity)
- Products can be exclusive to one market or available to both

---

## Pricing Structure

### Retail Pricing
```typescript
{
  "productId": "prod_123",
  "name": "Premium Widget",
  "retailPrice": 25.00,       // Fixed price per unit
  "retailDiscountPercent": 10, // Optional discount
  "currency": "USD"
}
```

**Example:**
- Product: Premium Widget
- Retail Price: $25.00
- Discount: 10% off
- **Customer Pays:** $22.50 per unit

### Wholesale Pricing (Tiered)
```typescript
{
  "productId": "prod_123",
  "name": "Premium Widget",
  "basePrice": 15.00,          // Base wholesale price
  "minimumOrderQuantity": 50,  // MOQ required
  "pricingTiers": [
    { "minQty": 50,  "maxQty": 99,  "pricePerUnit": 15.00, "discount": 0% },
    { "minQty": 100, "maxQty": 499, "pricePerUnit": 13.50, "discount": 10% },
    { "minQty": 500, "maxQty": null, "pricePerUnit": 12.00, "discount": 20% }
  ]
}
```

**Example:**
- Retail customer buys 1 unit: $25.00
- Wholesale buyer buys 50 units: $15.00 each = $750 total
- Wholesale buyer buys 500 units: $12.00 each = $6,000 total

**Retail customers cannot see:**
- Tiered pricing
- MOQ information
- Bulk discounts
- Wholesale base price

---

## Frontend Applications

### 1. Retail Frontend (`apps/retail-frontend`)

**Tech Stack:**
- TanStack Start (React)
- shadcn/ui components
- TanStack Query
- Tailwind CSS

**Features:**
- Public product catalog (retail products only)
- Product search & filtering
- Shopping cart
- Simple checkout
- Order tracking
- Customer account
- Standard payment methods (QRIS, VA, Credit Card)

**Routes:**
```
/                    - Homepage
/products            - Product catalog
/products/:id        - Product details
/cart                - Shopping cart
/checkout            - Checkout flow
/account             - Customer account
/orders              - Order history
/login               - Login
/register            - Register
```

### 2. Wholesale Frontend (`apps/wholesale-frontend`)

**Tech Stack:**
- TanStack Start (React)
- shadcn/ui components
- TanStack Query
- Tailwind CSS

**Features:**
- Wholesale product catalog
- Bulk pricing display (tiered)
- MOQ enforcement
- Request for Quote (RFQ) system
- Company profile
- Order history
- Invoice downloads
- Payment terms (Net-30/60)

**Routes:**
```
/                    - Wholesale homepage
/catalog             - Product catalog (wholesale only)
/catalog/:id         - Product details with tiered pricing
/cart                - Shopping cart (MOQ validation)
/checkout            - Wholesale checkout
/quotes              - RFQ management
/account             - Company account
/orders              - Order history
/invoices            - Invoice management
/login               - Wholesale login
/register            - Company registration
```

### 3. Real Time ERP Dashboard (`apps/erp-dashboard`) ✅ Already Built

**Features:**
- Manage all products (set retail + wholesale pricing)
- User management (retail + wholesale buyers)
- Order management (all orders)
- Analytics & reports
- Settings

---

## Database Schema Changes

### Updated `users` Table
```sql
role ENUM('admin', 'supplier', 'wholesale_buyer', 'retail_buyer')
-- Changed from: 'admin', 'supplier', 'buyer'
```

### Updated `products` Table
```sql
-- New fields for dual-market support
available_for_retail BOOLEAN DEFAULT TRUE
available_for_wholesale BOOLEAN DEFAULT TRUE
retail_price REAL                    -- For retail customers
retail_discount_percent REAL DEFAULT 0

-- Existing fields (now wholesale-specific)
base_price REAL                      -- Base wholesale price
minimum_order_quantity INT DEFAULT 1 -- MOQ for wholesale only
```

### Pricing Tiers (Wholesale Only)
```sql
pricing_tiers (
  product_id,
  min_quantity,
  max_quantity,
  price_per_unit,
  discount_percent
)
```

---

## API Endpoints by User Type

### Retail Endpoints
```
GET  /api/retail/products          - List retail products only
GET  /api/retail/products/:id      - Get retail product (retail price only)
POST /api/retail/orders            - Create retail order (no MOQ check)
GET  /api/retail/orders/:id        - Get retail order
```

### Wholesale Endpoints
```
GET  /api/wholesale/products       - List wholesale products only
GET  /api/wholesale/products/:id   - Get wholesale product (tiered pricing)
POST /api/wholesale/orders         - Create wholesale order (MOQ enforced)
POST /api/wholesale/quotes         - Request quote
GET  /api/wholesale/quotes/:id     - Get quote details
```

### Shared Endpoints
```
POST /api/auth/login               - Login (detects user type)
POST /api/payments/qris/create     - Create QRIS payment
POST /api/payments/virtual-account - Create VA payment
```

---

## Authentication Flow

### Login Process
1. User enters email/password
2. API checks `users.role`:
   - `retail_buyer` → Redirect to Retail Frontend
   - `wholesale_buyer` → Redirect to Wholesale Frontend
   - `admin` or `supplier` → Redirect to Real Time ERP Dashboard

### Session Management
```typescript
{
  userId: "user_123",
  role: "wholesale_buyer",  // or retail_buyer, admin, supplier
  email: "buyer@company.com",
  companyId: "company_456"  // For wholesale buyers
}
```

### JWT Token Claims
```json
{
  "sub": "user_123",
  "role": "wholesale_buyer",
  "email": "buyer@company.com",
  "companyId": "company_456",
  "iat": 1705123456,
  "exp": 1705209856
}
```

---

## Product Visibility Logic

### Backend (API)
```typescript
// Retail endpoint
if (userRole === 'retail_buyer') {
  products = products.filter(p => p.availableForRetail === true);
  // Remove wholesale pricing
  products = products.map(p => ({
    ...p,
    retailPrice: p.retailPrice,
    // Do NOT include: basePrice, pricingTiers, minimumOrderQuantity
  }));
}

// Wholesale endpoint
if (userRole === 'wholesale_buyer') {
  products = products.filter(p => p.availableForWholesale === true);
  // Include tiered pricing
  products = products.map(p => ({
    ...p,
    basePrice: p.basePrice,
    pricingTiers: p.pricingTiers,
    minimumOrderQuantity: p.minimumOrderQuantity,
    // Do NOT include: retailPrice
  }));
}
```

---

## Checkout Flow Differences

### Retail Checkout
1. Add to cart (any quantity)
2. Review cart
3. Enter shipping address
4. Select payment method (QRIS, VA, Card)
5. Complete payment
6. Order confirmed

### Wholesale Checkout
1. Add to cart (must meet MOQ)
2. System calculates tiered pricing
3. Review cart with bulk discount
4. Enter company shipping address
5. Select payment method OR request Net-30 terms
6. Upload PO (optional)
7. Complete payment OR wait for approval
8. Order confirmed

---

## Migration Path

### From Current State
**Current:** Single "buyer" role
**Target:** Dual "retail_buyer" + "wholesale_buyer"

**Migration Strategy:**
1. Update schema (add retail/wholesale fields)
2. Migrate existing buyers:
   - If company exists → `wholesale_buyer`
   - If no company → `retail_buyer`
3. Set product availability:
   - Default: Both retail + wholesale
   - Suppliers can configure per product
4. Build retail frontend (new)
5. Build wholesale frontend (new)

---

## Deployment Structure

```
Cloudflare Pages:
├── retail.yourdomain.com      → Retail Frontend
├── wholesale.yourdomain.com   → Wholesale Frontend
└── admin.yourdomain.com       → Real Time ERP Dashboard

Cloudflare Workers:
└── api.yourdomain.com         → Unified API (role-based routing)
```

**OR single domain with subpaths:**
```
yourdomain.com/               → Retail Frontend
yourdomain.com/wholesale/     → Wholesale Frontend
yourdomain.com/admin/         → Real Time ERP Dashboard
```

---

## Benefits of Dual-Market Strategy

✅ **Broader Market Reach**: Serve both B2C and B2B customers
✅ **Flexible Pricing**: Different pricing for different markets
✅ **Product Control**: Show/hide products per market
✅ **User Experience**: Tailored UX for retail vs wholesale
✅ **Revenue Maximization**: Retail margins + wholesale volume
✅ **Competitive Advantage**: One platform, two markets

---

## Implementation Priority

### Phase 1: Backend Updates ✅
- [x] Update user roles
- [x] Update product schema
- [x] Add retail/wholesale availability flags
- [x] Update API endpoints

### Phase 2: Retail Frontend
- [ ] Initialize TanStack Start app
- [ ] Product catalog (retail pricing only)
- [ ] Shopping cart
- [ ] Checkout flow
- [ ] User authentication

### Phase 3: Wholesale Frontend
- [ ] Initialize TanStack Start app
- [ ] Product catalog (tiered pricing)
- [ ] MOQ validation
- [ ] RFQ system
- [ ] Company profile

### Phase 4: Admin Enhancements
- [ ] Dual pricing management UI
- [ ] Product availability toggles
- [ ] User role management

---

**Last Updated:** January 2025
**Status:** Backend Schema Ready, Frontends In Progress
