# Sales Service - Business Rules

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase
**Refactored From**: Order Service

---

## Overview

This document defines the business rules for the Sales Service, which manages all sales channels including ERP Dashboard sales orders, POS transactions, retail/wholesale websites, and mobile applications.

---

## Table of Contents

1. [Order Management Rules](#order-management-rules)
2. [Channel-Specific Rules](#channel-specific-rules)
3. [Pricing & Discount Rules](#pricing--discount-rules)
4. [Payment Rules](#payment-rules)
5. [Fulfillment Rules](#fulfillment-rules)
6. [POS-Specific Rules](#pos-specific-rules)
7. [Website Rules](#website-rules)
8. [Mobile App Rules](#mobile-app-rules)
9. [Live Streaming Rules](#live-streaming-rules)
10. [Internationalization Rules](#internationalization-rules)

---

## Order Management Rules

### Rule 1: Order Number Uniqueness and Format
**Statement**: Every sales order MUST have a unique order number following channel-specific format.

**Formats**:
| Channel | Format | Example |
|---------|--------|---------|
| ERP Dashboard | `SO-{YYYYMMDD}-{SEQ}` | SO-20250716-0001 |
| POS | `POS-{TERMINAL}-{YYYYMMDD}-{SEQ}` | POS-T01-20250716-0001 |
| Web Retail | `WR-{YYYYMMDD}-{SEQ}` | WR-20250716-0001 |
| Web Wholesale | `WW-{YYYYMMDD}-{SEQ}` | WW-20250716-0001 |
| Mobile Retail | `MR-{YYYYMMDD}-{SEQ}` | MR-20250716-0001 |
| Live Streaming | `LS-{STREAM_ID}-{SEQ}` | LS-ABC123-0001 |

**Enforcement**: Database unique constraint + application-level generation

---

### Rule 2: Order Status Transitions
**Statement**: Orders MUST follow valid state transitions based on channel.

**Standard Workflow** (ERP, Web, Mobile):
```
DRAFT → PENDING → CONFIRMED → PROCESSING → READY_FOR_PICKUP/SHIPPED → DELIVERED → COMPLETED
                ↘ CANCELLED
```

**POS Workflow** (Simplified):
```
DRAFT → PAID → COMPLETED
      ↘ CANCELLED (void)
```

**Invalid Transitions**:
- ❌ COMPLETED → Any status (except REFUNDED)
- ❌ CANCELLED → Any status
- ❌ DELIVERED → PROCESSING

---

### Rule 3: Order Cannot Be Modified After Confirmation
**Statement**: Once an order is CONFIRMED, core details cannot be modified.

**Immutable After Confirmation**:
- Order items (products, quantities, prices)
- Customer information
- Shipping address (can only update via amendment)
- Applied discounts

**Mutable After Confirmation**:
- Internal notes
- Shipment tracking information
- Fulfillment status

**Amendment Process**: Create order amendment document for changes

---

### Rule 4: Order Cancellation Rules
**Statement**: Orders can only be cancelled under specific conditions.

**Cancellation Allowed**:
- Status is DRAFT, PENDING, or CONFIRMED
- Payment not yet processed (or can be refunded)
- Items not yet shipped

**Cancellation Requires Approval**:
- Order total > Rp 1,000,000
- Items already being processed
- Wholesale orders with credit terms

**Cancellation NOT Allowed**:
- Status is SHIPPED, DELIVERED, or COMPLETED
- Special/custom orders
- Perishable items already prepared

**On Cancellation**:
1. Release reserved inventory
2. Process refund if paid
3. Create cancellation record
4. Notify customer
5. Create accounting reversal

---

### Rule 5: Order Expiration
**Statement**: Unpaid orders expire after defined period.

**Expiration Times**:
| Channel | Expiration | Action |
|---------|------------|--------|
| ERP Dashboard | No auto-expiry | Manual follow-up |
| POS | N/A (immediate) | N/A |
| Web Retail | 24 hours | Auto-cancel |
| Web Wholesale | 72 hours | Auto-cancel |
| Mobile Retail | 24 hours | Auto-cancel |
| Live Streaming | 15 minutes | Auto-cancel |

**Pre-Expiration**:
- Send reminder at 50% and 75% of expiration time
- Hold inventory until expiration

---

### Rule 6: Minimum Order Value
**Statement**: Orders must meet minimum value per channel.

**Minimum Values**:
| Channel | Minimum (IDR) | Notes |
|---------|---------------|-------|
| ERP Dashboard | None | Staff discretion |
| POS | None | Walk-in allowed |
| Web Retail | 50,000 | Before shipping |
| Web Wholesale | 500,000 | MOQ applies per product |
| Mobile Retail | 50,000 | Before shipping |
| Live Streaming | None | Quick purchase |

**Enforcement**: Prevent checkout if below minimum

---

## Channel-Specific Rules

### Rule 7: Channel Category Classification
**Statement**: Each channel MUST be classified as OFFLINE_SALES, ONLINE_SALES, or OMNICHANNEL_SALES (both).

**Classification**:
| Channel | Category | Characteristics |
|---------|----------|-----------------|
| ERP Dashboard | OFFLINE_SALES | Manual entry, B2B |
| POS | OFFLINE_SALES | In-store, immediate |
| Web Retail | ONLINE_SALES | Self-service, B2C |
| Web Wholesale | ONLINE_SALES | Self-service, B2B |
| Mobile Retail | ONLINE_SALES | Self-service, B2C |
| Mobile Admin | N/A (internal) | Staff tools (attendance, stock opname, media, live streaming administration) |
| Live Streaming | ONLINE_SALES | Real-time, B2C (part of Mobile Retail, administered via Mobile Admin) |

**Channel Categories**:
```typescript
enum ChannelCategory {
  OFFLINE_SALES = 'OFFLINE_SALES',      // ERP Dashboard, POS
  ONLINE_SALES = 'ONLINE_SALES',        // Websites, Mobile Apps
  OMNICHANNEL_SALES = 'OMNICHANNEL_SALES'  // Products available on both channels
}
```

**Live Streaming Note**:
- Live Streaming sales are categorized as ONLINE_SALES
- Orders placed during live streams are recorded under Mobile Retail channel
- Stream administration (setup, broadcast, product highlighting) is done via Mobile Admin app by staff
- Customers watch and order via Mobile Retail app or Web Retail

**Omnichannel Products**:
- Products can be set to OFFLINE_SALES, ONLINE_SALES, or OMNICHANNEL_SALES
- OMNICHANNEL_SALES products appear on all sales channels
- Channel-specific pricing may apply

**Impact**:
- Reporting segmentation (can filter by category)
- Tax treatment differences
- Fulfillment workflow differences
- Product visibility control

---

### Rule 8: Customer Type Per Channel
**Statement**: Each channel has allowed customer types.

**Allowed Customer Types**:
| Channel | RETAIL | WHOLESALE | WALK_IN |
|---------|--------|-----------|---------|
| ERP Dashboard | ✅ | ✅ | ✅ |
| POS | ✅ | ❌ | ✅ |
| Web Retail | ✅ | ❌ | ❌ (guest) |
| Web Wholesale | ❌ | ✅ | ❌ |
| Mobile Retail | ✅ | ❌ | ❌ |
| Live Streaming | ✅ | ❌ | ❌ |

**Walk-In**: No customer registration required (POS)
**Guest**: One-time checkout without account (Web Retail)

---

### Rule 9: Warehouse Assignment Per Channel
**Statement**: Each channel has default warehouse assignment rules.

**Assignment Rules**:
- **POS**: Warehouse linked to terminal (fixed)
- **Web Retail**: Nearest warehouse based on shipping address (or default)
- **Web Wholesale**: Designated wholesale warehouse
- **ERP Dashboard**: Manually selected by staff
- **Mobile Retail**: Same as Web Retail

**Multi-Warehouse Order**: Items can be split across warehouses if enabled

---

## Pricing & Discount Rules

### Rule 10: Price Type Per Customer Type
**Statement**: Different price types apply based on customer type.

**Price Application**:
| Customer Type | Price Used | Source |
|---------------|------------|--------|
| RETAIL | Retail Price | Product.retailPrice |
| WHOLESALE | Wholesale Price | Product.wholesalePrice |
| WALK_IN | Retail Price | Product.retailPrice |

**Price Hierarchy**:
1. Customer-specific price (negotiated)
2. Customer tier price
3. Standard price for customer type

---

### Rule 11: Discount Application Rules
**Statement**: Discounts follow a defined application order.

**Discount Types (in order)**:
1. **Item-Level Discount**: Per product discount
2. **Category Discount**: Promo on category
3. **Cart-Level Discount**: Order total discount
4. **Promo Code**: Manually applied code
5. **Loyalty Points**: Point redemption

**Stacking Rules**:
- Item and category discounts DO NOT stack (highest wins)
- Cart-level and promo code DO NOT stack (user chooses)
- Loyalty points CAN stack with one other discount
- Maximum total discount: 50% of order value

**Formula**:
```
Final Price = Base Price - Item Discount - Cart Discount + Tax + Shipping
```

---

### Rule 12: Promo Code Rules
**Statement**: Promo codes have validation rules.

**Validation**:
- Code must exist and be active
- Within validity period (start/end date)
- Usage limit not exceeded (per code or per user)
- Minimum order value met
- Applicable to channel/customer type
- Applicable products in cart

**One Promo Per Order**: Only one promo code per order

**Promo Types**:
- Percentage discount (e.g., 10% off)
- Fixed amount discount (e.g., Rp 50,000 off)
- Free shipping
- Free item (buy X get Y)

---

### Rule 13: Wholesale Pricing Rules
**Statement**: Wholesale has special pricing rules.

**Tiered Pricing**:
```typescript
interface TierPricing {
  minQuantity: number;
  maxQuantity: number;
  unitPrice: number;
}

// Example:
// 1-9 units: Rp 100,000
// 10-49 units: Rp 90,000
// 50+ units: Rp 80,000
```

**MOQ Enforcement**:
- Each product has minimum order quantity for wholesale
- Order rejected if any item below MOQ
- MOQ can be waived with manager approval (ERP only)

---

### Rule 14: Tax Calculation Rules
**Statement**: Tax is calculated based on customer and product.

**Tax Rules**:
- Standard PPN: 11% (Indonesia)
- Tax-exempt customers: 0% (with valid document)
- Tax-exempt products: 0% (certain categories)

**Wholesale Tax**:
- B2B sales include Faktur Pajak
- NPWP required for wholesale customers

---

## Payment Rules

### Rule 15: Payment Methods Per Channel
**Statement**: Available payment methods vary by channel.

**Payment Methods**:
| Method | ERP | POS | Web Retail | Web Wholesale | Mobile |
|--------|-----|-----|------------|---------------|--------|
| Cash | ✅ | ✅ | ❌ | ❌ | ❌ |
| Bank Transfer | ✅ | ❌ | ✅ | ✅ | ✅ |
| Credit Card | ✅ | ✅ | ✅ | ❌ | ✅ |
| Debit Card | ❌ | ✅ | ✅ | ❌ | ✅ |
| E-Wallet | ❌ | ✅ | ✅ | ❌ | ✅ |
| QRIS | ❌ | ✅ | ✅ | ❌ | ✅ |
| COD | ❌ | ❌ | ✅ | ❌ | ✅ |
| Credit Terms | ✅ | ❌ | ❌ | ✅ | ❌ |

---

### Rule 16: Split Payment Rules
**Statement**: Split payments allowed under conditions.

**Split Payment**:
- Allowed: POS, ERP Dashboard
- Not Allowed: Web, Mobile

**Rules**:
- Maximum 3 payment methods per order
- All payments must be completed before order confirmation
- Each payment records separately for reconciliation

---

### Rule 17: Credit Terms Rules (Wholesale)
**Statement**: Credit terms available for verified wholesale customers.

**Credit Term Types**:
- COD (Cash on Delivery)
- NET 7 (Due in 7 days)
- NET 14 (Due in 14 days)
- NET 30 (Due in 30 days)

**Eligibility**:
- Verified wholesale customer
- Active account in good standing
- Within credit limit
- No overdue invoices > 30 days

**Credit Limit Check**:
```
Available Credit = Credit Limit - Outstanding Balance - Pending Orders
Order Allowed if: Order Total <= Available Credit
```

---

### Rule 18: Payment Verification
**Statement**: Certain payments require verification.

**Auto-Verified**:
- Cash (POS)
- Credit/Debit Card (real-time)
- E-Wallet (real-time)
- QRIS (real-time)

**Manual Verification Required**:
- Bank Transfer (proof of payment)
- COD (on delivery)

**Verification Window**: 24 hours for bank transfer

---

## Fulfillment Rules

### Rule 19: Inventory Reservation
**Statement**: Inventory reserved on order creation, deducted on fulfillment.

**Reservation Flow**:
1. Order Created → Reserve inventory (quantityReserved += orderQuantity)
2. Order Paid → Stock still reserved
3. Order Fulfilled → Deduct stock (quantityAvailable -= orderQuantity, quantityReserved -= orderQuantity)
4. Order Cancelled → Release reservation (quantityReserved -= orderQuantity)

**Reservation Timeout**:
- Online orders: Release after 24 hours if unpaid
- POS: No reservation (immediate fulfillment)

---

### Rule 20: FEFO (First Expired, First Out)
**Statement**: Products with expiration dates MUST be fulfilled using FEFO.

**FEFO Logic**:
```typescript
function selectBatch(productId: string, warehouseId: string, quantity: number): Batch[] {
  const batches = await getBatches(productId, warehouseId)
    .filter(b => b.quantityAvailable > 0)
    .filter(b => b.expirationDate > today)  // Not expired
    .filter(b => b.expirationDate > today + 30)  // Buffer for delivery
    .sort((a, b) => a.expirationDate - b.expirationDate);  // Earliest first

  return allocateFromBatches(batches, quantity);
}
```

**Exception**: Customer may request specific batch (with approval)

---

### Rule 21: Shipping Method Rules
**Statement**: Shipping methods vary by order type and location.

**Methods**:
| Method | Description | Applicable To |
|--------|-------------|---------------|
| PICKUP | Customer picks up | POS (immediate), Web (scheduled) |
| DELIVERY | Carrier delivery | Web, Mobile, ERP |
| SELF_DELIVERY | Own fleet | Wholesale, Large orders |

**Carrier Selection**:
- Domestic: J&T, JNE, SiCepat, Anteraja
- Same-day: Lalamove, GoSend, GrabExpress
- International: DHL, FedEx

---

### Rule 22: Fulfillment Priority
**Statement**: Orders are fulfilled based on priority.

**Priority Order**:
1. POS (immediate)
2. Same-day delivery orders
3. Express orders
4. Regular orders (by order date)
5. Wholesale/bulk orders

**SLA Targets**:
- POS: Immediate
- Same-day: Within 4 hours
- Express: Within 24 hours
- Regular: Within 48 hours

---

## POS-Specific Rules

### Rule 23: POS Negative Stock Allowance
**Statement**: POS sales CAN create negative stock.

**Rationale**: Customer in-store must always receive purchased items. Stock discrepancy resolved later.

**Implementation**:
```typescript
// POS inventory deduction allows negative
if (channel === 'POS') {
  inventory.posSale(quantity);  // No stock check
} else {
  inventory.warehouseAdjust(quantity);  // Validates stock
}
```

**Post-Transaction**: Alert warehouse team if stock goes negative

---

### Rule 24: POS Session Management
**Statement**: POS terminals require session (shift) management.

**Session Rules**:
- Must open session before transactions
- One active session per terminal
- Opening cash must be declared
- Session closed at end of shift
- Cash reconciliation required at close

**Session Close**:
```typescript
interface SessionClose {
  closingCash: number;        // Physical count
  expectedCash: number;       // System calculated
  cashVariance: number;       // Difference
  varianceReason?: string;    // Required if variance > threshold
}
```

**Variance Threshold**: ± Rp 10,000 (requires explanation if exceeded)

---

### Rule 25: POS Void Rules
**Statement**: POS transactions can be voided under conditions.

**Void Allowed**:
- Within same session
- Within 30 minutes of transaction
- Before end of day close
- With supervisor approval (if > Rp 500,000)

**Void NOT Allowed**:
- After session close
- After daily reconciliation
- Transactions > 24 hours old

**Void Process**:
1. Request void with reason
2. Supervisor approval (if required)
3. Reverse inventory movement
4. Create void record
5. Generate void receipt

---

### Rule 26: POS Offline Mode
**Statement**: POS must function offline with later sync.

**Offline Capabilities**:
- Process sales (stored locally)
- Accept cash payments only
- Use cached product catalog
- Generate local receipts

**Offline Limitations**:
- No credit/debit card processing
- No loyalty points redemption
- No real-time stock validation
- No promo code validation

**Sync Rules**:
- Auto-sync when online
- Queue transactions in order
- Conflict resolution: Server wins for stock, Local wins for transaction data

---

## Website Rules

### Rule 27: Guest Checkout (Retail Website)
**Statement**: Retail website allows guest checkout.

**Guest Checkout Rules**:
- No account required
- Must provide email and phone
- Order tracking via email link
- Cannot use loyalty points
- Limited to 3 orders per email per day

**Guest Data**:
- Retained for order fulfillment
- Deleted after 90 days (unless converted to member)
- Can convert to member post-purchase

---

### Rule 28: Wholesale Website Verification
**Statement**: Wholesale website requires verified accounts.

**Verification Requirements**:
- Company name
- NPWP (Tax ID)
- Business license (SIUP/NIB)
- Company address verification
- Contact person details

**Verification Process**:
1. Submit registration with documents
2. Admin review (1-3 business days)
3. Account activated if approved
4. Credit limit assigned (based on assessment)

**Unverified Accounts**: Can browse but cannot checkout

---

### Rule 29: Cart Persistence
**Statement**: Shopping carts persist across sessions.

**Cart Rules**:
- Logged-in users: Cart stored in database (permanent)
- Guest users: Cart stored in cookie (30 days)
- Cart merge on login (if items in both)
- Price updates on cart view (notify if changed)
- Stock validation on checkout

**Cart Abandonment**:
- Reminder email after 1 hour
- Second reminder after 24 hours
- Cart cleared after 30 days

---

### Rule 30: Shipping Address Rules
**Statement**: Customers can have multiple shipping addresses.

**Address Rules**:
- Maximum 10 saved addresses per customer
- One default address
- Address validation against postal code database
- International addresses allowed (retail website)

**Wholesale Addresses**:
- Must match company registration
- Additional addresses require verification
- Delivery to non-registered address requires approval

---

## Mobile App Rules

### Rule 31: Mobile Authentication
**Statement**: Mobile apps require authentication.

**Authentication Methods**:
- Email + Password
- Phone OTP
- Social login (Google, Apple)
- Biometric (after initial login)

**Session Management**:
- Access token: 1 hour
- Refresh token: 30 days
- Biometric refresh: No expiry (device-bound)

---

### Rule 32: Push Notification Rules
**Statement**: Push notifications follow opt-in rules.

**Notification Types**:
| Type | Default | Can Disable |
|------|---------|-------------|
| Order updates | ON | No |
| Shipping updates | ON | No |
| Promotions | OFF | Yes |
| Price alerts | OFF | Yes |
| New arrivals | OFF | Yes |

**Frequency Limits**:
- Maximum 3 promotional notifications per day
- Quiet hours: 22:00 - 08:00 (configurable)

---

### Rule 33: Mobile Admin Features
**Statement**: Admin app has restricted features based on role.

**Feature Access**:
| Feature | Staff | Warehouse | Sales | Manager |
|---------|-------|-----------|-------|---------|
| Attendance | ✅ | ✅ | ✅ | ✅ |
| Stock Opname | ❌ | ✅ | ❌ | ✅ |
| Product Media | ❌ | ✅ | ✅ | ✅ |
| Live Streaming | ❌ | ❌ | ✅ | ✅ |
| Approve Variance | ❌ | ❌ | ❌ | ✅ |

---

### Rule 34: Attendance Rules (Admin App)
**Statement**: Attendance requires location and photo verification.

**Clock-In Requirements**:
- GPS location within geofence
- Selfie photo (face detection)
- Device ID verification

**Geofence Rules**:
- Radius: 100 meters from registered location
- Grace period: 15 minutes before/after shift
- Remote work: Must request approval in advance

---

### Rule 35: Stock Opname Rules (Admin App)
**Statement**: Stock opname follows specific workflow.

**Count Rules**:
- One active count per product-warehouse at a time
- Count must be completed within 24 hours
- Variance requires photo evidence if > 5%
- Manager approval required for variance > 10%

**Variance Handling**:
```
Variance% = (Counted - System) / System × 100

<= 2%: Auto-approve
2-5%: Supervisor approval
5-10%: Manager approval
> 10%: Director approval
```

---

## Live Streaming Rules

### Rule 36: Live Stream Creation
**Statement**: Live streams require setup and approval.

**Creation Requirements**:
- Host must be verified seller/staff
- Minimum 1 featured product
- Scheduled at least 1 hour in advance
- Title and description required
- Thumbnail image required

**Stream Limits**:
- Maximum duration: 4 hours
- Maximum concurrent streams: 3 (per company)
- Maximum products per stream: 50

---

### Rule 37: Live Stream Pricing
**Statement**: Live stream can have special pricing.

**Flash Sale Rules**:
- Maximum discount: 50%
- Minimum duration: 5 minutes
- Maximum duration: 30 minutes
- Limited quantity required

**Flash Sale Stock**:
- Reserved from inventory at stream start
- Released if not sold during stream
- Cannot exceed 50% of available stock

---

### Rule 38: Live Order Rules
**Statement**: Live stream orders have special rules.

**Order Rules**:
- 15-minute payment window
- Queue system for high-demand items
- One order per user per product per stream
- Maximum 5 units per product per order

**Order Priority**:
1. First come, first served
2. Loyalty members get 30-second early access

---

### Rule 39: Stream Moderation
**Statement**: Live streams are moderated.

**Auto-Moderation**:
- Profanity filter on comments
- Spam detection (repeated messages)
- Bot detection

**Manual Moderation**:
- Host can mute users
- Host can delete comments
- Report functionality for viewers

---

## Internationalization Rules

### Rule 40: Language Detection
**Statement**: Language is detected automatically for websites.

**Detection Priority**:
1. User preference (if logged in)
2. Session/cookie preference
3. IP-based geolocation
4. Accept-Language header
5. Default: Indonesian

**IP-Based Rules**:
```typescript
if (IPCountry === 'ID') {
  locale = 'id-ID';
  currency = 'IDR';
} else {
  locale = 'en-US';
  currency = 'USD';  // Or local currency
}
```

---

### Rule 41: Currency Handling
**Statement**: Prices displayed in detected/selected currency.

**Supported Currencies**:
- IDR (Indonesian Rupiah) - Primary
- USD (US Dollar) - International

**Exchange Rate**:
- Updated daily from bank rate
- Orders locked at checkout rate
- Settlement always in IDR

**Display Rules**:
- IDR: No decimals (Rp 150.000)
- USD: 2 decimals ($10.99)

---

### Rule 42: Content Translation
**Statement**: All user-facing content supports dual language.

**Translated Content**:
- UI labels and messages
- Product names and descriptions
- Category names
- Error messages
- Email notifications
- Invoices and receipts

**Non-Translated**:
- SKU codes
- Order numbers
- Technical identifiers

---

## Integration Rules

### Rule 43: Event Publishing
**Statement**: All state changes publish domain events.

**Published Events**:
- `SalesOrderCreated`
- `SalesOrderPaid`
- `SalesOrderConfirmed`
- `SalesOrderShipped`
- `SalesOrderDelivered`
- `SalesOrderCompleted`
- `SalesOrderCancelled`
- `SalesOrderRefunded`
- `POSSessionOpened`
- `POSSessionClosed`
- `LiveStreamStarted`
- `LiveStreamEnded`

---

### Rule 44: Inventory Integration
**Statement**: Sales Service integrates with Inventory Service.

**Integration Points**:
- Order Created → Reserve stock
- Order Confirmed → Validate stock (double-check)
- Order Fulfilled → Deduct stock
- Order Cancelled → Release reserved stock

**Saga Pattern**: Use compensating transactions on failure

---

### Rule 45: Accounting Integration
**Statement**: Sales create accounting entries.

**Journal Entries**:
1. **Sale Completed**:
   - Debit: Cash/AR (amount received)
   - Credit: Sales Revenue
   - Credit: Tax Payable (if applicable)

2. **Sale Refunded**:
   - Debit: Sales Returns
   - Credit: Cash/AR

---

## Data Retention Rules

### Rule 46: Order Data Retention
**Statement**: Order data retained based on regulations.

**Retention Periods**:
| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Order records | 10 years | Tax compliance |
| Payment records | 10 years | Tax compliance |
| Shipping records | 5 years | Dispute resolution |
| POS sessions | 2 years | Audit |
| Live stream records | 1 year | Analysis |
| Cart data (abandoned) | 90 days | Marketing |
| Guest data (no order) | 30 days | Privacy |

---

## Summary

This document contains 46 business rules organized across:
- Order Management (Rules 1-6)
- Channel-Specific Rules (Rules 7-9)
- Pricing & Discount Rules (Rules 10-14)
- Payment Rules (Rules 15-18)
- Fulfillment Rules (Rules 19-22)
- POS-Specific Rules (Rules 23-26)
- Website Rules (Rules 27-30)
- Mobile App Rules (Rules 31-35)
- Live Streaming Rules (Rules 36-39)
- Internationalization Rules (Rules 40-42)
- Integration Rules (Rules 43-45)
- Data Retention (Rule 46)

---

## Related Documents

- [Sales Service Architecture](./SALES_SERVICE_ARCHITECTURE.md)
- [Sales Service Implementation Plan](./SALES_IMPLEMENTATION_PLAN.md)
- [Inventory Business Rules](../inventory/BUSINESS_RULES.md)
- [Business Partner Business Rules](../business-partner/BUSINESS_RULES.md)
- [Accounting Business Rules](../accounting/BUSINESS_RULES.md)
- [Main Business Rules](../../ddd/BUSINESS_RULES.md)
