# Dual-Market E-Commerce Platform (Retail + Wholesale)

A modern dual-market e-commerce platform supporting both **retail (B2C)** and **wholesale (B2B)** customers, built on Cloudflare's serverless infrastructure with TanStack Start and Hono.

## 📊 Project Status

**Current Phase**: Phase 4 (Advanced Features) - ✅ **70% Complete**

### ✅ Completed (Phase 1-4)
- ✅ Phase 1: Foundation & Setup
  - Project structure initialized (pnpm monorepo)
  - Backend API with Hono framework
  - Admin dashboard with TanStack Start + shadcn/ui
  - Cloudflare D1 database setup
  - Development environment configured

- ✅ Phase 2: Core Features
  - Complete database schema (13 tables)
  - Product management system
  - User management (4 roles: admin, supplier, retail_buyer, wholesale_buyer)
  - Dual-market architecture
  - Inventory tracking

- ✅ Phase 3: Payment & Checkout
  - Xendit payment gateway integration (Indonesia)
  - QRIS payment support (0.63% fee)
  - Virtual Account support (BCA, Mandiri, BNI, BRI, Permata, CIMB)
  - Webhook handlers for payment confirmation
  - Payment status tracking

- ✅ Phase 4: Advanced Features (Partial)
  - Admin dashboard UI with shadcn/ui components
  - API routes for admin, retail, and wholesale
  - Quote/RFQ system endpoints
  - Activity logging system

### 🚧 In Progress / Pending
- 🔄 JWT authentication middleware
- 🔄 Product image upload (Cloudflare R2)
- 🔄 Email notifications
- ⏳ Phase 5: Retail & Wholesale web frontends
- ⏳ Phase 6: Optimization & launch
- ⏳ Phase 7: Mobile apps (Expo) - Final phase

## 🎯 Dual-Market Strategy

This platform serves **TWO distinct markets**:

### 1. **Retail (B2C)** - Direct to Consumer
- Standard product pricing
- No minimum order quantities
- Simple checkout flow
- Individual customers
- Separate retail frontend

### 2. **Wholesale (B2B)** - Bulk Orders
- Tiered bulk pricing
- Minimum order quantities (MOQ)
- Request for Quote (RFQ) system
- Company accounts
- Separate wholesale frontend

### Key Architecture Features
- ✅ Two separate user logins (retail_buyer vs wholesale_buyer)
- ✅ Products can be retail-only, wholesale-only, or both
- ✅ **Retail users CANNOT see wholesale prices** (enforced at API level)
- ✅ Separate API endpoints (`/api/retail/*` vs `/api/wholesale/*`)
- ✅ Admin can manage both markets from single dashboard

**See**: [RETAIL_WHOLESALE_ARCHITECTURE.md](./RETAIL_WHOLESALE_ARCHITECTURE.md) for detailed architecture.

## 🏗️ Project Structure

```
kidkazz/
├── apps/
│   ├── backend/              # ✅ Hono API on Cloudflare Workers
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   └── schema.ts           # Complete database schema
│   │   │   ├── lib/
│   │   │   │   ├── xendit.ts          # Xendit payment client
│   │   │   │   ├── db.ts              # Database client
│   │   │   │   └── utils.ts           # Helper functions
│   │   │   ├── routes/
│   │   │   │   ├── admin.ts           # Admin dashboard API
│   │   │   │   ├── retail.ts          # ✅ Retail customer API
│   │   │   │   ├── wholesale.ts       # ✅ Wholesale buyer API
│   │   │   │   ├── auth.ts            # Authentication
│   │   │   │   ├── payments.ts        # ✅ Xendit integration
│   │   │   │   └── webhooks.ts        # ✅ Payment webhooks
│   │   │   └── index.ts               # Main Hono app
│   │   └── wrangler.toml              # Cloudflare config
│   │
│   └── admin-dashboard/      # ✅ Admin panel (TanStack Start)
│       ├── app/
│       │   ├── routes/admin/          # Admin pages
│       │   │   ├── index.tsx          # Dashboard
│       │   │   ├── products.tsx       # Product management
│       │   │   ├── orders.tsx         # Order management
│       │   │   └── users.tsx          # User management
│       │   └── components/ui/         # ✅ shadcn/ui components
│       │       ├── button.tsx
│       │       ├── badge.tsx
│       │       ├── card.tsx
│       │       ├── table.tsx
│       │       └── input.tsx
│       └── app.config.ts
│
├── docs/
│   ├── ECOMMERCE_WHOLESALE_ROADMAP.md      # Complete implementation roadmap
│   ├── RETAIL_WHOLESALE_ARCHITECTURE.md    # Dual-market architecture
│   ├── XENDIT_INTEGRATION.md               # Payment integration guide
│   ├── MOBILE_APP_EXPO_GUIDE.md            # Mobile app guide (Phase 7)
│   └── DATABASE_MIGRATION_*.md             # Migration guides
│
└── SETUP.md                   # Quick setup guide
```

## 🚀 Technology Stack

### Frontend (3 Applications)
- **Framework**: TanStack Start (React) - Cloudflare native
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS with custom design system
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: TanStack Router (file-based, type-safe)
- **Icons**: Lucide React
- **Deployment**: Cloudflare Pages

**Applications:**
1. ✅ **Admin Dashboard** - For admin/suppliers (Built)
2. ⏳ **Retail Frontend** - For retail customers (Planned)
3. ⏳ **Wholesale Frontend** - For wholesale buyers (Planned)

### Backend
- **Framework**: Hono (ultra-fast, 12KB, edge-optimized)
- **Runtime**: Cloudflare Workers (serverless edge)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **ORM**: Drizzle ORM (type-safe, edge-compatible)
- **Validation**: Zod schemas
- **Authentication**: JWT tokens (in progress)

### Infrastructure
- **Platform**: Cloudflare
  - Workers (Edge computing)
  - D1 (SQLite database)
  - R2 (S3-compatible storage)
  - KV (Key-value cache)
  - Pages (Frontend hosting)
- **Package Manager**: pnpm (monorepo-friendly)
- **Language**: TypeScript (full type safety)

### Payment Integration
- **Provider**: Xendit (Indonesia market)
- **Methods**:
  - QRIS (Quick Response Code Indonesian Standard) - 0.63% fee
  - Virtual Accounts (6 major Indonesian banks)
  - Webhook-based payment confirmation
- **See**: [XENDIT_INTEGRATION.md](./XENDIT_INTEGRATION.md)

### Mobile (Phase 7 - Final)
- **Framework**: Expo (React Native)
- **Authentication**: expo-secure-store
- **Deployment**: EAS Build
- **See**: [MOBILE_APP_EXPO_GUIDE.md](./MOBILE_APP_EXPO_GUIDE.md)

## 🗄️ Database Schema

**13 Tables** supporting dual-market architecture:

### Core Tables
- **users** - All user types (admin, supplier, retail_buyer, wholesale_buyer)
- **companies** - Company profiles for wholesale buyers
- **products** - Product catalog with dual pricing
  - `availableForRetail` - Show to retail customers
  - `availableForWholesale` - Show to wholesale buyers
  - `retailPrice` - Standard retail pricing
  - `basePrice` - Wholesale base price
  - `minimumOrderQuantity` - MOQ for wholesale

### Pricing Tables
- **pricing_tiers** - Bulk pricing (e.g., 100+ units = 15% off)
- **custom_pricing** - Per-customer special pricing

### Order & Payment Tables
- **orders** - All orders (retail + wholesale)
  - Payment fields for Xendit integration
  - Payment status tracking (pending, paid, failed, expired)
- **order_items** - Individual order line items

### Communication Tables
- **quotes** - Request for Quote system
- **quote_items** - Quote line items
- **categories** - Product categorization
- **activity_logs** - Audit trail
- **settings** - System configuration

**See schema**: `apps/backend/src/db/schema.ts`

## 🛠️ Setup Instructions

### Prerequisites

**Node.js 20+** and **pnpm** are required.

**For FreeBSD:**
```bash
pkg install node npm
npm install -g pnpm
```

**For Linux/Mac:**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Install Wrangler CLI
pnpm add -g wrangler

# 3. Login to Cloudflare
wrangler login

# 4. Create D1 database
cd apps/backend
wrangler d1 create wholesale-db
# Copy the database_id from output

# 5. Update wrangler.toml with your database_id

# 6. Create environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your Xendit keys

# 7. Run database migrations
pnpm db:generate
pnpm db:migrate

# 8. Start development servers
# Terminal 1:
cd apps/backend && pnpm dev

# Terminal 2:
cd apps/admin-dashboard && pnpm dev
```

**See**: [SETUP.md](./SETUP.md) for detailed step-by-step instructions.

## 📋 Features

### ✅ Completed Features

#### Admin Dashboard
- ✅ Dashboard with real-time statistics
- ✅ Product management (CRUD)
  - Dual pricing configuration (retail + wholesale)
  - Product availability toggles
  - MOQ settings
- ✅ Order management (view, update status)
- ✅ User management (all roles)
- ✅ Professional UI with shadcn/ui components

#### Backend API
- ✅ RESTful API with Hono
- ✅ Admin endpoints (`/api/admin/*`)
- ✅ Retail endpoints (`/api/retail/*`) - No wholesale prices exposed
- ✅ Wholesale endpoints (`/api/wholesale/*`) - With tiered pricing
- ✅ Authentication routes
- ✅ Payment integration (`/api/payments/*`)
- ✅ Webhook handlers (`/api/webhooks/xendit/*`)

#### Payment System
- ✅ Xendit payment gateway integration
- ✅ QRIS code generation
- ✅ Virtual Account creation (6 banks)
- ✅ Payment status webhooks
- ✅ Automatic order confirmation on payment

#### Database
- ✅ Complete schema with 13 tables
- ✅ Dual-market support
- ✅ Tiered pricing structure
- ✅ Custom pricing per customer
- ✅ Payment tracking fields
- ✅ Activity logging

### 🚧 In Progress / Pending

#### Authentication
- 🔄 JWT token generation
- 🔄 JWT middleware for protected routes
- 🔄 Role-based access control (RBAC)
- 🔄 Password hashing (bcrypt)

#### Storage
- ⏳ Product image upload to Cloudflare R2
- ⏳ Image optimization
- ⏳ CDN delivery

#### Frontend Applications
- ⏳ Retail frontend (TanStack Start)
- ⏳ Wholesale frontend (TanStack Start)

#### Advanced Features
- ⏳ Email notifications
- ⏳ SMS notifications (Twilio)
- ⏳ Analytics dashboard
- ⏳ Reporting system

#### Mobile Apps (Phase 7)
- ⏳ Retail mobile app (Expo)
- ⏳ Wholesale mobile app (Expo)
- ⏳ Push notifications

## 📖 API Endpoints

### Admin Routes (`/api/admin/*`)
**Purpose**: Manage entire platform

- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - User details
- `PATCH /api/admin/users/:id` - Update user
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - List all orders
- `PATCH /api/admin/orders/:id` - Update order status

### Retail Routes (`/api/retail/*`)
**Purpose**: Retail customers - NO wholesale prices exposed

- `GET /api/retail/products` - Products available for retail
- `GET /api/retail/products/:id` - Product with retail pricing only
- `POST /api/retail/orders` - Create retail order
- `GET /api/retail/orders/:id` - Get order details

### Wholesale Routes (`/api/wholesale/*`)
**Purpose**: Wholesale buyers - Tiered pricing

- `GET /api/wholesale/products` - Products available for wholesale
- `GET /api/wholesale/products/:id` - Product with tiered pricing
- `POST /api/wholesale/orders` - Create wholesale order
- `POST /api/wholesale/quotes` - Request for quote
- `GET /api/wholesale/quotes/:id` - Get quote details

### Payment Routes (`/api/payments/*`)
**Purpose**: Xendit payment integration

- `POST /api/payments/qris/create` - Create QRIS payment
- `POST /api/payments/virtual-account/create` - Create VA payment
- `GET /api/payments/status/:orderId` - Check payment status
- `GET /api/payments/banks` - List supported banks

### Webhook Routes (`/api/webhooks/*`)
**Purpose**: Payment provider callbacks

- `POST /api/webhooks/xendit/qris` - QRIS payment callback
- `POST /api/webhooks/xendit/va` - Virtual Account callback

### Authentication Routes (`/api/auth/*`)
**Purpose**: User authentication (in progress)

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

## 🧪 Development Tools

### Database Management

```bash
# Generate new migration after schema changes
cd apps/backend
pnpm db:generate

# Apply migrations locally
pnpm db:migrate

# Apply migrations to production
pnpm db:migrate:prod

# Open Drizzle Studio (visual database editor)
pnpm db:studio

# View remote database
wrangler d1 execute wholesale-db --remote --command "SELECT * FROM users"
```

### Type Checking

```bash
# Check all apps
pnpm type-check

# Check backend only
cd apps/backend && pnpm type-check

# Check frontend only
cd apps/admin-dashboard && pnpm type-check
```

### Testing

```bash
# Backend health check
curl http://localhost:8787/health

# Test QRIS payment creation
curl -X POST http://localhost:8787/api/payments/qris/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "orderId": "test-123"}'

# Test retail products API (should not show wholesale prices)
curl http://localhost:8787/api/retail/products

# Test wholesale products API (should show tiered pricing)
curl http://localhost:8787/api/wholesale/products
```

## 🚀 Deployment

### Backend to Cloudflare Workers

```bash
cd apps/backend

# Deploy to production
pnpm deploy

# Your API will be available at:
# https://wholesale-backend-prod.<YOUR_SUBDOMAIN>.workers.dev
```

### Frontend to Cloudflare Pages

```bash
cd apps/admin-dashboard

# Build for production
pnpm build

# Deploy to Cloudflare Pages
pnpm deploy

# Or connect via Cloudflare dashboard for automatic Git deployments
```

### Environment Variables (Production)

Set these in Cloudflare dashboard:

**Workers (Backend):**
- `ENVIRONMENT` = "production"
- `XENDIT_SECRET_KEY` = Your Xendit secret key
- `XENDIT_WEBHOOK_TOKEN` = Your webhook verification token
- `API_BASE_URL` = Your production API URL
- `JWT_SECRET` = Your JWT secret (generate strong random string)

**Pages (Frontend):**
- `VITE_API_URL` = Your backend API URL

## 🔐 Security Checklist

### ✅ Implemented
- ✅ Input validation with Zod schemas
- ✅ Webhook signature verification (Xendit)
- ✅ Separate API endpoints by user role
- ✅ Price segregation (retail cannot see wholesale)

### 🔄 In Progress
- 🔄 JWT authentication
- 🔄 Password hashing (bcrypt)
- 🔄 Role-based access control middleware
- 🔄 Rate limiting (Cloudflare Workers)

### ⏳ Pending
- ⏳ CSRF protection
- ⏳ SQL injection prevention (use parameterized queries)
- ⏳ Secure headers (CSP, HSTS)
- ⏳ API key rotation
- ⏳ Audit logging

## 📚 Documentation

### Primary Documentation
- **[ECOMMERCE_WHOLESALE_ROADMAP.md](./ECOMMERCE_WHOLESALE_ROADMAP.md)** - Complete 34-week roadmap (7 phases)
- **[SETUP.md](./SETUP.md)** - Step-by-step setup guide
- **[RETAIL_WHOLESALE_ARCHITECTURE.md](./RETAIL_WHOLESALE_ARCHITECTURE.md)** - Dual-market architecture details

### Integration Guides
- **[XENDIT_INTEGRATION.md](./XENDIT_INTEGRATION.md)** - Payment integration guide
- **[MOBILE_APP_EXPO_GUIDE.md](./MOBILE_APP_EXPO_GUIDE.md)** - Mobile app development (Phase 7)

### Migration Guides
- **DATABASE_MIGRATION_XENDIT.md** - Adding payment fields
- **DATABASE_MIGRATION_RETAIL_WHOLESALE.md** - Dual-market migration

### External Resources
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [TanStack Start](https://tanstack.com/start/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Xendit API](https://developers.xendit.co/)
- [Drizzle ORM](https://orm.drizzle.team/)

## 🎯 Next Steps

### Immediate Priorities (Phase 4 Completion)
1. 🔄 Implement JWT authentication middleware
2. 🔄 Add password hashing
3. 🔄 Set up Cloudflare R2 for image uploads
4. 🔄 Create image upload endpoints
5. 🔄 Test end-to-end payment flow

### Phase 5 (Weeks 13-18)
- Build Retail Frontend (TanStack Start)
- Build Wholesale Frontend (TanStack Start)
- Enhance Admin Dashboard with dual-pricing UI

### Phase 6 (Weeks 19-22)
- Performance optimization
- SEO implementation
- Security hardening
- Testing (unit, integration, e2e)
- Beta launch

### Phase 7 (Weeks 23-34)
- Build Retail mobile app (Expo)
- Build Wholesale mobile app (Expo)
- Push notifications
- App store deployment

## 🌍 FreeBSD Compatibility

✅ **Fully compatible!** This project can be developed on FreeBSD:
- Node.js runs natively on FreeBSD
- pnpm works without issues
- Cloudflare CLI (wrangler) is supported
- Development and production environments are separate
- All tools are cross-platform

## 💡 Development Best Practices

### Type Safety
```typescript
// Share types between frontend and backend
// apps/backend/src/types.ts
export type Product = {
  id: string;
  name: string;
  retailPrice: number;
  basePrice: number; // Wholesale only
  availableForRetail: boolean;
  availableForWholesale: boolean;
};

// Frontend imports
import type { Product } from '@/shared/types';
```

### Price Segregation
```typescript
// Retail API - NEVER expose wholesale prices
export const retailProducts = products.map(p => ({
  id: p.id,
  name: p.name,
  retailPrice: p.retailPrice, // ✅ Safe
  // basePrice: p.basePrice,  // ❌ NEVER expose
  // pricingTiers: p.tiers,   // ❌ NEVER expose
}));
```

### Validation
```typescript
// Use Zod for runtime validation
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().regex(/^[A-Z0-9-]+$/),
  retailPrice: z.number().positive(),
  basePrice: z.number().positive(),
});
```

## 📊 Project Timeline

- **Week 1-2**: Foundation & Setup ✅
- **Week 3-6**: Core Features ✅
- **Week 7-8**: Payment Integration ✅
- **Week 9-12**: Advanced Features ✅ (70%)
- **Week 13-18**: Retail & Wholesale Frontends ⏳
- **Week 19-22**: Optimization & Launch ⏳
- **Week 23-34**: Mobile Apps (Expo) ⏳

**Current Progress**: ~60% of Phase 1-4 complete

## 📄 License

MIT

## 🤝 Contributing

This is a private wholesale/retail platform. For questions or support, contact the development team.

---

**Built with ❤️ using:**
- Cloudflare Edge Platform
- TanStack Start (React Framework)
- Hono (Web Framework)
- Drizzle ORM
- shadcn/ui
- Xendit Payments
- TypeScript

**Document Version**: 2.0
**Last Updated**: 2025-11-13
**Status**: Active Development - Phase 4
