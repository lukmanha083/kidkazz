# E-Commerce Dual-Market Platform Roadmap

## 🎯 Updated Strategy: Retail + Wholesale

**IMPORTANT CHANGE:** The platform now supports **TWO markets**:
1. **Retail (B2C)** - Direct-to-consumer sales with standard pricing
2. **Wholesale (B2B)** - Bulk orders with tiered pricing and MOQ requirements

This dual-market approach allows the platform to:
- ✅ Maximize revenue streams (retail margins + wholesale volume)
- ✅ Serve broader customer base
- ✅ Flexible product availability (retail-only, wholesale-only, or both)
- ✅ Separate user experiences tailored to each market

**See:** `RETAIL_WHOLESALE_ARCHITECTURE.md` for complete dual-market architecture details.

## 🏛️ Architecture Evolution

**NEW**: The platform architecture has evolved to include modern microservices patterns:
- **Hexagonal Architecture (Ports & Adapters)** - Clean separation of concerns
- **Domain-Driven Design (DDD)** - 6 bounded contexts
- **Event-Driven Architecture** - Async communication via Cloudflare Queues
- **Saga Pattern** - Distributed transactions with Cloudflare Workflows

**See:** `ARCHITECTURE.md` for comprehensive architecture guide including:
- Microservices design with 6 bounded contexts
- Communication patterns (Service Bindings, Queues, Workflows)
- Migration strategies and implementation roadmap
- Cost analysis ($5-6/month vs AWS $154/month)

## Executive Summary
This roadmap outlines the development plan for a dual-market E-Commerce platform (Retail + Wholesale) built on Cloudflare's serverless infrastructure, utilizing modern web technologies and microservices architecture for optimal performance, scalability, and maintainability.

---

## Technology Stack

### Frontend (3 Applications)
- **Framework**: TanStack Start (React) - Cloudflare native
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **Applications**:
  1. **Retail Frontend** - For retail customers (B2C)
  2. **Wholesale Frontend** - For wholesale buyers (B2B)
  3. **Admin Dashboard** - For admin/suppliers ✅ (Already built)

### Backend
- **Runtime**: Cloudflare Workers (Edge Computing)
- **Framework**: **Hono** (Recommended)
  - Ultra-fast, lightweight (~12KB)
  - Purpose-built for edge runtimes
  - Excellent TypeScript support
  - Compatible with tRPC via `@hono/trpc-server`
- **API Layer**: tRPC or Hono RPC
  - tRPC: Full type-safety between frontend/backend
  - Hono RPC: Simpler, faster, built-in to Hono
- **Alternative**: Consider oRPC for REST + RPC hybrid

### Database
**Recommended: Cloudflare D1 (SQLite) + Turso for multi-region**

| Database | Pros | Cons | Best For |
|----------|------|------|----------|
| **Cloudflare D1** | - Native Cloudflare integration<br>- Zero latency to Workers<br>- Simple setup<br>- Free tier generous | - Limited to Cloudflare ecosystem<br>- 10GB per database limit<br>- SQLite limitations | Pure Cloudflare stack, getting started quickly |
| **Turso** | - Multi-region by default<br>- Embedded syncs<br>- Access from anywhere<br>- Based on libSQL | - Separate service to manage<br>- Additional cost | Global distribution, flexibility |
| **Neon (PostgreSQL)** | - Full PostgreSQL features<br>- Sub-10ms latency<br>- Familiar SQL | - Single-region read replicas<br>- Not SQLite-compatible | Complex queries, PostgreSQL expertise |

**Recommendation**: Start with **Cloudflare D1** for simplicity, migrate to **Turso** if you need multi-region or access from outside Cloudflare.

**Note**: MySQL is not recommended for Cloudflare Workers. PostgreSQL (via Neon) or SQLite (D1/Turso) are the best options.

### Storage & Communication
- **Images/Assets**: Cloudflare R2 (S3-compatible)
- **Cache**: Cloudflare KV (Key-Value store)
- **Sessions**: Cloudflare Durable Objects or KV
- **Service Bindings**: Zero-cost RPC between Workers (FREE, ~μs latency)
- **Cloudflare Queues**: Asynchronous messaging ($0.40/M operations)
- **Cloudflare Workflows**: Saga orchestration for distributed transactions (GA Nov 2024)
- **Durable Objects**: Stateful coordination ($0.15/M requests)

### Architecture Patterns
- **Hexagonal Architecture**: Clean separation between domain logic and infrastructure
- **Domain-Driven Design (DDD)**: 6 bounded contexts (Product, Order, Payment, User, Quote, Inventory)
- **Event-Driven Architecture**: Async communication via Cloudflare Queues
- **Saga Pattern**: Distributed transactions with compensating actions

### Package Manager
- **pnpm** (monorepo-friendly, fast, efficient)
  - Cloudflare Pages Build System v3 supports pnpm
  - Fallback: Use `npx pnpm i --store=node_modules/.pnpm-store && npm run build`

### Development Environment
**FreeBSD Compatibility**: ✅ **YES**
- Node.js runs on FreeBSD (install via ports or pkg)
- pnpm works on FreeBSD
- Development environment is separate from deployment (Cloudflare edge)
- You can develop on FreeBSD and deploy to Cloudflare without issues

---

## Phase 1: Foundation & Setup (Weeks 1-2)

### 1.1 Development Environment Setup
- [ ] Install Node.js on FreeBSD (`pkg install node npm`)
- [ ] Install pnpm globally (`npm install -g pnpm`)
- [ ] Set up Git repository
- [ ] Initialize monorepo structure (optional: Turborepo or pnpm workspaces)

### 1.2 Project Initialization
```bash
# Frontend (Next.js + Cloudflare Pages)
pnpm create next-app@latest wholesale-frontend
cd wholesale-frontend
pnpm add @tanstack/react-query
pnpx shadcn-ui@latest init

# Backend (Hono + Cloudflare Workers)
pnpm create hono@latest wholesale-backend
cd wholesale-backend
# Select "cloudflare-workers" template
```

### 1.3 Database Setup
- [ ] Create Cloudflare D1 database
```bash
npx wrangler d1 create wholesale-db
```
- [ ] Set up Drizzle ORM or Prisma (edge-compatible)
- [ ] Design initial schema:
  - Users (buyers, suppliers)
  - Products (bulk items)
  - Categories
  - Inventory
  - Orders
  - Pricing tiers (bulk pricing)

### 1.4 Authentication & Authorization
- [ ] Implement auth strategy:
  - Option A: Cloudflare Access + JWT
  - Option B: Auth.js (NextAuth) with edge adapter
  - Option C: Clerk (managed auth)
- [ ] Set up role-based access (wholesale buyers, suppliers, admin)

---

## Phase 2: Core Features (Weeks 3-6)

### 2.1 Product Management
- [ ] Product listing API (Hono endpoints)
  - Bulk quantities
  - Tiered pricing (min order quantities)
  - SKU management
- [ ] Product search & filtering
  - By category, price, MOQ (Minimum Order Quantity)
  - Full-text search (using D1 or external service)
- [ ] Product images (upload to R2)
- [ ] Inventory tracking

### 2.2 User Management
- [ ] Buyer registration & verification
  - Business license verification
  - Tax ID validation
- [ ] Supplier/vendor management
- [ ] User profiles & preferences
- [ ] Company profiles (B2B context)

### 2.3 Shopping Cart & Orders
- [ ] Cart system (KV storage for guest, D1 for authenticated)
- [ ] Bulk order calculations
- [ ] Quantity validation (MOQ enforcement)
- [ ] Order placement workflow
- [ ] Order status tracking
- [ ] Email notifications (Cloudflare Email Workers)

### 2.4 Pricing Engine
- [ ] Tiered pricing logic
  - Volume discounts
  - Custom pricing per buyer
- [ ] Quote system (RFQ - Request for Quote)
- [ ] Tax calculation
- [ ] Shipping cost estimation

---

## 🏛️ DECISION POINT: Architecture Refactoring Strategy

**After Phase 2**, you must decide on your architecture approach. Three options available:

### Option A: Refactor to Microservices Now (Week 3-8)
**Best for**: Long-term maintainability, team scaling, complex business logic

**Pros:**
- ✅ Clean architecture from the start
- ✅ Better testability and maintainability
- ✅ Easier to scale team (one service per developer)
- ✅ Prevents technical debt accumulation

**Cons:**
- ❌ Slower time to market (adds 5-6 weeks)
- ❌ More complex initial setup

**Timeline Impact**: +5-6 weeks before proceeding to Phase 3

### Option B: Keep Monolith, Refactor After Frontends (Week 19+)
**Best for**: Speed to market, MVP validation, small team

**Pros:**
- ✅ Fastest path to market
- ✅ Validate business model first
- ✅ Simpler initial development

**Cons:**
- ❌ Technical debt accumulates
- ❌ Harder to refactor later (more code)
- ❌ May need to pause feature development for refactoring

**Timeline Impact**: No delay, refactor happens in Week 19-26

### Option C: Hybrid Approach (Recommended)
**Best for**: Balance between speed and quality

**Phase 2b (Weeks 7-9)**: Apply Hexagonal Architecture to existing monolith
- Restructure code into domain/application/infrastructure layers
- Implement repository pattern
- Extract domain logic
- Set up bounded contexts (as modules, not separate services)

**Phase 6b (Week 19+)**: Split into microservices when needed
- Extract one service at a time
- Use Service Bindings for communication
- Implement Saga Pattern as complexity grows

**Pros:**
- ✅ Better code organization now
- ✅ Easier to test
- ✅ Smooth migration path to microservices
- ✅ No major timeline delay

**Timeline Impact**: +2-3 weeks for Hexagonal refactoring

**See**: `ARCHITECTURE.md` Section 10 for detailed decision matrix and cost analysis.

---

## Phase 2b (Optional): Hexagonal Architecture Refactoring (Weeks 7-9)

**Only if Option A or C chosen** - Refactor backend to Hexagonal Architecture:

### 2b.1 Domain Layer Setup
- [ ] Create domain entities (Product, Order, Payment, User, Quote, Inventory)
- [ ] Implement value objects (Price, SKU, ProductId)
- [ ] Define domain events (ProductCreated, OrderPlaced, PaymentCompleted)
- [ ] Add business rule validation

### 2b.2 Application Layer
- [ ] Create use cases (CreateProduct, PlaceOrder, ProcessPayment)
- [ ] Implement application services
- [ ] Define ports (interfaces) for repositories and external services
- [ ] Add command/query handlers

### 2b.3 Infrastructure Layer
- [ ] Implement repository adapters (D1Database implementation)
- [ ] Create external service adapters (Xendit payment adapter)
- [ ] Set up dependency injection
- [ ] Configure service bindings

### 2b.4 Testing Infrastructure
- [ ] Unit tests for domain logic
- [ ] Integration tests for repositories
- [ ] Mock implementations for testing
- [ ] E2E test suite

**Deliverable**: Clean, testable, maintainable codebase ready for either monolith continuation or microservices split.

---

## Phase 2c (Optional): Microservices Split (Weeks 7-12)

**Only if Option A chosen** - Full microservices architecture:

### 2c.1 Infrastructure Setup
- [ ] Create 6 Worker services (Product, Order, Payment, User, Quote, Inventory)
- [ ] Set up API Gateway Worker
- [ ] Configure Service Bindings between services
- [ ] Set up Cloudflare Queues for async communication
- [ ] Configure Cloudflare Workflows for saga orchestration

### 2c.2 Service Migration
- [ ] **Week 7**: Product Service
  - Extract product domain logic
  - Implement Hexagonal Architecture (domain/application/infrastructure)
  - Deploy as separate Worker
- [ ] **Week 8**: User Service
  - Extract authentication and user management
  - Implement JWT token generation
  - Deploy as separate Worker
- [ ] **Week 9**: Inventory Service
  - Extract inventory management
  - Implement multi-warehouse support
  - Implement reservation/release pattern
- [ ] **Week 10**: Payment Service
  - Extract Xendit integration
  - Implement payment processing saga
  - Set up webhook handlers
- [ ] **Week 11**: Order Service
  - Extract order management
  - Implement order creation saga (inventory → payment → confirmation)
  - Set up Cloudflare Workflows
- [ ] **Week 12**: Quote Service
  - Extract RFQ system
  - Implement quote workflow

### 2c.3 Communication Setup
- [ ] Implement Service Bindings for sync operations
- [ ] Set up Cloudflare Queues for async events
  - OrderEvents queue
  - PaymentEvents queue
  - InventoryEvents queue
- [ ] Configure Durable Objects for stateful operations (if needed)

### 2c.4 Saga Implementation
- [ ] Create OrderCreationSaga (Cloudflare Workflows)
  - Step 1: Reserve inventory
  - Step 2: Process payment
  - Step 3: Confirm order
  - Compensation: Refund payment, release inventory
- [ ] Create PaymentRefundSaga
- [ ] Add retry logic and dead letter queues

### 2c.5 Testing & Deployment
- [ ] Integration tests between services
- [ ] End-to-end workflow tests
- [ ] Load testing with Service Bindings
- [ ] Deploy all services to production

**Deliverable**: 6 independent microservices with event-driven communication and saga orchestration.

---

## Phase 3: Payment & Checkout (Weeks 7-8 or 13-14 depending on architecture choice)

### 3.1 Payment Integration
- [ ] Integrate payment gateway (Stripe recommended for Cloudflare)
  - Stripe Checkout
  - Payment intents API
- [ ] Support for:
  - Credit card
  - ACH/Bank transfer
  - Net-30/60 terms (invoice-based)
- [ ] Payment status webhooks
- [ ] Invoice generation (PDF via Workers)

### 3.2 Checkout Flow
- [ ] Multi-step checkout
- [ ] Address validation
- [ ] Shipping options
- [ ] Order summary & confirmation
- [ ] Receipt/invoice email

---

## Phase 4: Advanced Features (Weeks 9-12)

### 4.1 Analytics & Reporting
- [ ] Cloudflare Analytics integration
- [ ] Custom dashboards:
  - Sales reports
  - Inventory levels
  - Top products
  - Customer insights
- [ ] Export to CSV/Excel

### 4.2 Communication
- [ ] In-app messaging (buyer-supplier)
- [ ] Email notifications system
- [ ] SMS notifications (Twilio + Workers)
- [ ] Order updates & tracking

### 4.3 Supplier Portal
- [ ] Inventory management UI
- [ ] Order fulfillment dashboard
- [ ] Bulk product uploads (CSV import)
- [ ] Analytics for suppliers

### 4.4 Buyer Portal
- [ ] Purchase history
- [ ] Reorder functionality
- [ ] Saved lists/favorites
- [ ] Quick reorder from past orders

---

## Phase 5: Retail & Wholesale Frontends (Weeks 13-18)

### 5.1 Retail Frontend Development
- [ ] Initialize TanStack Start app for retail customers
- [ ] Implement product catalog (retail pricing only)
  - Product listing with search & filtering
  - Product detail pages
  - Category navigation
- [ ] Shopping cart & checkout
  - Add to cart functionality
  - Cart management
  - Simple checkout flow
- [ ] User authentication (retail_buyer role)
- [ ] Payment integration (QRIS, Virtual Account, Credit Card)
- [ ] Order tracking & history
- [ ] Customer account management
- [ ] shadcn/ui components integration

### 5.2 Wholesale Frontend Development
- [ ] Initialize TanStack Start app for wholesale buyers
- [ ] Implement wholesale product catalog
  - Tiered pricing display
  - MOQ enforcement
  - Bulk discount calculator
- [ ] Request for Quote (RFQ) system
- [ ] Wholesale shopping cart with MOQ validation
- [ ] Company profile management
- [ ] Wholesale checkout flow
  - Payment terms (Net-30/60)
  - Purchase order upload
- [ ] Invoice management
- [ ] Order history & reordering
- [ ] shadcn/ui components integration

### 5.3 Admin Dashboard Enhancements
- [ ] Dual-pricing management UI
  - Set retail prices
  - Configure wholesale tiered pricing
- [ ] Product availability toggles (retail/wholesale)
- [ ] User role management (retail_buyer vs wholesale_buyer)
- [ ] Separate order views (retail vs wholesale)
- [ ] Analytics dashboard (revenue by market type)

---

## Phase 6: Optimization & Launch (Weeks 19-22)

### 6.1 Performance Optimization
- [ ] Edge caching strategies (Cloudflare Cache API)
- [ ] Image optimization (Cloudflare Images)
- [ ] Code splitting & lazy loading
- [ ] Database query optimization
- [ ] KV caching for frequent reads

### 5.2 SEO & Marketing
- [ ] Meta tags & Open Graph
- [ ] Sitemap generation
- [ ] Schema.org markup (Product, Organization)
- [ ] Blog/content pages (wholesale tips, industry news)

### 5.3 Security
- [ ] Rate limiting (Cloudflare Workers)
- [ ] DDoS protection (included with Cloudflare)
- [ ] Input validation & sanitization
- [ ] CSRF protection
- [ ] SQL injection prevention (use parameterized queries)
- [ ] Secure headers (CSP, HSTS)

### 5.4 Testing
- [ ] Unit tests (Vitest)
- [ ] Integration tests (Cloudflare Workers test environment)
- [ ] E2E tests (Playwright)
- [ ] Load testing

### 5.5 DevOps & Deployment
- [ ] CI/CD pipeline (GitHub Actions)
  - Lint & format checks
  - Type checking
  - Tests
  - Deploy to staging
  - Deploy to production
- [ ] Environment management (dev, staging, prod)
- [ ] Monitoring & logging
  - Cloudflare Workers Analytics
  - Error tracking (Sentry)
  - Uptime monitoring

### 6.6 Launch Preparation
- [ ] Beta testing with select users
- [ ] Documentation (API docs, user guides)
- [ ] Customer support system
- [ ] Terms of service & privacy policy
- [ ] GDPR/CCPA compliance

---

## Phase 7: Mobile Apps (Weeks 23-34) 📱

**Note**: Mobile development is the FINAL phase after web frontends are complete.

### 7.1 Retail Mobile App (Android & iOS)
- [ ] Initialize Expo project for retail customers
- [ ] Set up development environment
  - Install Expo CLI
  - Configure EAS Build
  - Set up app.json configuration
- [ ] Implement core features
  - Product browsing (retail pricing)
  - Shopping cart
  - Checkout flow with payment integration
  - Order tracking
  - Push notifications for order updates
- [ ] Payment integration
  - Xendit QRIS (scan & pay)
  - Virtual Account (generate payment codes)
  - Credit card payments
- [ ] User authentication
  - JWT token storage (expo-secure-store)
  - Biometric authentication
- [ ] Testing & deployment
  - Test on Android devices
  - Test on iOS devices
  - Submit to Google Play Store
  - Submit to Apple App Store

### 7.2 Wholesale Mobile App (Android & iOS)
- [ ] Initialize Expo project for wholesale buyers
- [ ] Implement wholesale-specific features
  - Product catalog with tiered pricing
  - MOQ validation
  - Bulk order calculator
  - RFQ (Request for Quote) system
- [ ] Company account management
  - Company profile
  - Multiple user accounts per company
  - Purchase history
- [ ] Advanced features
  - Barcode scanner for quick ordering
  - Offline mode support
  - Invoice downloads
  - Push notifications for quote approvals
- [ ] Testing & deployment
  - Enterprise distribution (if needed)
  - App store submissions

### 7.3 Mobile Backend Integration
- [ ] Update API for mobile-specific needs
  - Push notification endpoints
  - Mobile-optimized responses
  - Image size optimization for mobile
- [ ] Implement push notifications
  - Expo Push Notification service
  - Order status updates
  - Payment confirmations
  - Quote approvals (wholesale)
- [ ] Analytics integration
  - Track mobile user behavior
  - Monitor app performance
  - Crash reporting

**See**: `MOBILE_APP_EXPO_GUIDE.md` for complete implementation details.

---

## Recommended Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN/Edge                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Retail Web   │  │ Wholesale Web│  │    Admin     │         │
│  │  (TanStack)   │  │  (TanStack)  │  │  Dashboard   │         │
│  │  Pages        │  │  Pages       │  │  (TanStack)  │         │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│          │                 │                  │                  │
│          └─────────────────┴──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │  Hono Backend   │                           │
│                   │  (Workers API)  │                           │
│                   └────────┬────────┘                           │
│                            │                                     │
│            ┌───────────────┼───────────────┐                   │
│            │               │               │                    │
│       ┌────▼───┐    ┌─────▼────┐    ┌────▼────┐              │
│       │   D1   │    │    KV    │    │   R2    │              │
│       │Database│    │  Cache   │    │ Images  │              │
│       └────────┘    └──────────┘    └─────────┘              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
           │                                      │
           │                                      │
    ┌──────▼───────┐                    ┌────────▼────────┐
    │ Mobile Apps  │                    │ External APIs   │
    │ (Expo)       │                    │                 │
    ├──────────────┤                    │ - Xendit        │
    │ - Retail App │                    │ - Email Service │
    │ - Wholesale  │                    │ - Push Notifs   │
    │   App        │                    │ - SMS (Twilio)  │
    └──────────────┘                    └─────────────────┘
```

---

## Key Considerations for Wholesale E-Commerce

### 1. Bulk Pricing Logic
```typescript
// Example tiered pricing structure
interface PriceTier {
  minQuantity: number;
  maxQuantity: number | null;
  pricePerUnit: number;
  discountPercent: number;
}

const productPricing: PriceTier[] = [
  { minQuantity: 1, maxQuantity: 99, pricePerUnit: 10.00, discountPercent: 0 },
  { minQuantity: 100, maxQuantity: 499, pricePerUnit: 8.50, discountPercent: 15 },
  { minQuantity: 500, maxQuantity: null, pricePerUnit: 7.00, discountPercent: 30 }
];
```

### 2. Minimum Order Quantities (MOQ)
- Enforce MOQ at cart level
- Clear messaging about MOQ requirements
- Suggest related products to meet MOQ

### 3. Custom Pricing
- Per-customer pricing contracts
- Volume commitment discounts
- Seasonal pricing

### 4. Quote/RFQ System
- Allow buyers to request custom quotes
- Negotiation workflow
- Quote expiration dates

### 5. Inventory Management
- Real-time inventory tracking
- Low stock alerts
- Backorder management
- Multi-warehouse support (if applicable)

---

## Development Best Practices

### 1. Type Safety
```typescript
// Share types between frontend and backend
// apps/backend/src/types.ts
export type Product = {
  id: string;
  name: string;
  sku: string;
  moq: number;
  pricing: PriceTier[];
};

// Frontend can import these types
import type { Product } from '@/shared/types';
```

### 2. Error Handling
```typescript
// Hono error handling
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: err.message }, 500);
});
```

### 3. Validation
```typescript
// Use Zod for runtime validation
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().regex(/^[A-Z0-9-]+$/),
  moq: z.number().int().positive(),
  price: z.number().positive()
});
```

### 4. Database Migrations
```bash
# Using Drizzle ORM
pnpm drizzle-kit generate:sqlite
pnpm drizzle-kit push:sqlite

# Or use Wrangler for D1
npx wrangler d1 migrations create wholesale-db add_products_table
npx wrangler d1 migrations apply wholesale-db
```

---

## Deployment Strategy

### Development Workflow
1. **Local Development**:
   - Use `wrangler dev` for Workers
   - Use `next dev` for frontend
   - FreeBSD native development

2. **Staging Environment**:
   - Deploy to Cloudflare Pages preview
   - Test with staging D1 database

3. **Production**:
   - Deploy via GitHub Actions
   - Blue-green deployment (Pages supports this)
   - Rollback capability

### Cloudflare Pages Deployment
```bash
# Frontend
pnpm build
npx wrangler pages deploy ./out

# Workers (Backend)
npx wrangler deploy
```

### Environment Variables
```toml
# wrangler.toml
name = "wholesale-backend"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[env.production]
name = "wholesale-backend-prod"

[[d1_databases]]
binding = "DB"
database_name = "wholesale-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "wholesale-images"
```

---

## Cost Estimation (Cloudflare)

### Free Tier Includes:
- **Workers**: 100,000 requests/day
- **Pages**: Unlimited requests
- **D1**: 5GB storage, 5M reads/day, 100K writes/day
- **R2**: 10GB storage, 1M reads/month
- **KV**: 100K reads/day, 1K writes/day

### Paid Plans (approximate):
- **Workers Paid**: $5/month + $0.50/million requests
- **D1**: $5/month for 5GB, then usage-based
- **R2**: $0.015/GB storage, operations-based pricing

---

## Success Metrics

### Technical KPIs
- Page load time < 1 second (edge computing advantage)
- API response time < 100ms (P95)
- Uptime > 99.9%
- Zero cold starts (Workers always warm at edge)

### Business KPIs
- Conversion rate (visitors to orders)
- Average order value (AOV)
- Customer acquisition cost (CAC)
- Customer lifetime value (LTV)
- Repeat purchase rate

---

## Next Steps

1. **Review & approve this roadmap**
2. **Set up FreeBSD development environment**
   ```bash
   # On FreeBSD
   pkg install node npm git
   npm install -g pnpm
   pnpm --version
   ```
3. **Create Cloudflare account & configure CLI**
   ```bash
   pnpm add -g wrangler
   wrangler login
   ```
4. **Initialize first project** (Phase 1.2)
5. **Start with Phase 1: Foundation & Setup**

---

## Resources & Documentation

### Backend & Infrastructure
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [tRPC](https://trpc.io/)

### Frontend (Web)
- [TanStack Start](https://tanstack.com/start/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Router](https://tanstack.com/router/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

### Mobile Development
- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)

### Payments
- [Xendit Documentation](https://developers.xendit.co/)
- [Xendit QRIS](https://developers.xendit.co/api-reference/qr-code/qr-code-object)
- [Xendit Virtual Accounts](https://developers.xendit.co/api-reference/virtual-account/virtual-account-object)

---

**Document Version**: 3.0
**Last Updated**: 2025-11-14
**Status**: Ready for Implementation
**Latest Addition**: Architecture Evolution - Hexagonal Architecture, DDD, Event-Driven, Saga Pattern (Phase 2b/2c)
