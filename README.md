# Wholesale E-Commerce Platform

A modern wholesale e-commerce platform built on Cloudflare's serverless infrastructure with TanStack Start and Hono.

## 🏗️ Architecture

```
wholesale-ecommerce/
├── apps/
│   ├── backend/              # Hono API on Cloudflare Workers
│   └── admin-dashboard/      # TanStack Start admin panel
├── packages/                 # Shared packages (future)
└── ECOMMERCE_WHOLESALE_ROADMAP.md  # Complete implementation roadmap
```

## 🚀 Technology Stack

### Frontend (Admin Dashboard)
- **Framework**: TanStack Start (React)
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query
- **Routing**: TanStack Router
- **Deployment**: Cloudflare Pages

### Backend (API)
- **Framework**: Hono (ultra-fast web framework)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Validation**: Zod

### Infrastructure
- **Platform**: Cloudflare (Workers, Pages, D1, R2, KV)
- **Package Manager**: pnpm
- **Language**: TypeScript

## 📋 Features

### Admin Dashboard
- ✅ Dashboard with real-time stats
- ✅ Product management (CRUD)
- ✅ Order management
- ✅ User management (buyers & suppliers)
- ✅ Category management
- 🚧 Settings panel
- 🚧 Analytics & reports

### Backend API
- ✅ RESTful API with Hono
- ✅ Admin endpoints for dashboard
- ✅ Product catalog endpoints
- ✅ Order management endpoints
- ✅ Quote/RFQ system endpoints
- ✅ Authentication routes (placeholder)
- 🚧 JWT authentication middleware
- 🚧 Payment integration (Stripe)

### Database Schema
- ✅ Users & Companies
- ✅ Products & Categories
- ✅ Pricing Tiers (bulk pricing)
- ✅ Custom Pricing (per-customer)
- ✅ Orders & Order Items
- ✅ Quotes & Quote Items (RFQ)
- ✅ Activity Logs
- ✅ Settings

## 🛠️ Setup Instructions

### Prerequisites

**For FreeBSD:**
```bash
# Install Node.js and npm
pkg install node npm

# Install pnpm globally
npm install -g pnpm

# Verify installation
node --version
pnpm --version
```

**For Linux/Mac:**
```bash
# Install pnpm
npm install -g pnpm
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 1. Clone & Install

```bash
# Install dependencies
pnpm install
```

### 2. Set Up Cloudflare

```bash
# Install Wrangler CLI globally
pnpm add -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
cd apps/backend
wrangler d1 create wholesale-db

# Copy the database_id from output and update wrangler.toml
```

Update `apps/backend/wrangler.toml`:
```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "wholesale-db"
database_id = "YOUR_DATABASE_ID_HERE"  # <-- Add your ID here
```

### 3. Set Up Database

```bash
# Generate database migrations
cd apps/backend
pnpm db:generate

# Apply migrations locally (for development)
pnpm db:migrate

# Apply migrations to production
pnpm db:migrate:prod
```

### 4. Create Local Environment Variables

```bash
# Copy example env file
cd apps/backend
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your values
# (Get CLOUDFLARE_ACCOUNT_ID from Cloudflare dashboard)
```

### 5. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd apps/backend
pnpm dev
# Backend will run on http://localhost:8787
```

**Terminal 2 - Admin Dashboard:**
```bash
cd apps/admin-dashboard
pnpm install
pnpm dev
# Frontend will run on http://localhost:3000
```

### 6. Access Admin Dashboard

Open your browser to: http://localhost:3000

Navigate to: http://localhost:3000/admin

## 📚 Project Structure

### Backend (`apps/backend/`)

```
backend/
├── src/
│   ├── db/
│   │   └── schema.ts          # Drizzle ORM schema
│   ├── lib/
│   │   ├── db.ts              # Database client
│   │   └── utils.ts           # Helper functions
│   ├── routes/
│   │   ├── admin.ts           # Admin API routes
│   │   ├── auth.ts            # Authentication routes
│   │   ├── products.ts        # Product routes
│   │   ├── orders.ts          # Order routes
│   │   └── quotes.ts          # Quote/RFQ routes
│   └── index.ts               # Main Hono app
├── drizzle/                   # Database migrations
├── wrangler.toml              # Cloudflare Workers config
└── package.json
```

### Admin Dashboard (`apps/admin-dashboard/`)

```
admin-dashboard/
├── app/
│   ├── routes/
│   │   ├── __root.tsx         # Root layout
│   │   ├── index.tsx          # Landing page
│   │   └── admin/
│   │       ├── index.tsx      # Dashboard
│   │       ├── products.tsx   # Products page
│   │       ├── orders.tsx     # Orders page
│   │       └── users.tsx      # Users page
│   ├── components/
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── Header.tsx         # Top header
│   │   └── DashboardStats.tsx # Stats cards
│   ├── styles/
│   │   └── globals.css        # Tailwind styles
│   └── router.tsx             # Router config
├── app.config.ts              # TanStack Start config
└── package.json
```

## 🗄️ Database Schema Highlights

### Wholesale-Specific Features

1. **Tiered Pricing** (`pricing_tiers` table)
   - Bulk discounts based on quantity
   - Min/max quantity ranges
   - Discount percentages

2. **Custom Pricing** (`custom_pricing` table)
   - Per-customer special pricing
   - Time-limited contracts
   - Custom MOQ per customer

3. **Minimum Order Quantities** (MOQ)
   - Enforced at product level
   - Can be overridden per customer

4. **Quote System** (`quotes` table)
   - Request for Quote (RFQ) workflow
   - Buyer requests, supplier responds
   - Convert quotes to orders

## 🚀 Deployment

### Deploy Backend to Cloudflare Workers

```bash
cd apps/backend

# Deploy to production
pnpm deploy

# Your API will be available at:
# https://wholesale-backend-prod.YOUR_SUBDOMAIN.workers.dev
```

### Deploy Admin Dashboard to Cloudflare Pages

```bash
cd apps/admin-dashboard

# Build for production
pnpm build

# Deploy to Cloudflare Pages
pnpm deploy

# Or connect via Cloudflare dashboard for automatic deployments
```

## 🔐 Security TODO

- [ ] Implement JWT authentication
- [ ] Add password hashing (bcrypt)
- [ ] Role-based access control (RBAC) middleware
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] CORS configuration for production

## 📖 API Endpoints

### Admin Routes (`/api/admin/*`)

- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id` - Update user
- `GET /api/admin/products` - List products
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - List orders
- `PATCH /api/admin/orders/:id` - Update order

### Public Routes

- `GET /api/products` - List active products
- `GET /api/products/:id` - Get product details
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## 🧪 Testing

```bash
# Run type checks
pnpm type-check

# Backend type check
cd apps/backend && pnpm type-check

# Frontend type check
cd apps/admin-dashboard && pnpm type-check
```

## 📝 Development Notes

### FreeBSD Compatibility

✅ **Fully compatible!** This project can be developed on FreeBSD:
- Node.js runs natively on FreeBSD
- pnpm works without issues
- Cloudflare CLI (wrangler) is supported
- Development and production environments are separate

### Database Management

```bash
# Open Drizzle Studio (visual database editor)
cd apps/backend
pnpm db:studio

# Generate new migration after schema changes
pnpm db:generate

# View remote database
wrangler d1 execute wholesale-db --remote --command "SELECT * FROM users"
```

## 🎯 Next Steps

See [ECOMMERCE_WHOLESALE_ROADMAP.md](./ECOMMERCE_WHOLESALE_ROADMAP.md) for the complete 16-week implementation plan.

**Immediate priorities:**

1. ✅ ~~Set up project structure~~ (DONE)
2. ✅ ~~Create database schema~~ (DONE)
3. ✅ ~~Build admin dashboard~~ (DONE)
4. 🔄 Implement authentication & JWT
5. 🔄 Add product image upload (R2)
6. 🔄 Implement payment processing (Stripe)
7. 🔄 Build buyer-facing storefront

## 📄 License

MIT

## 🤝 Contributing

This is a private wholesale platform. For questions or support, contact the development team.

---

**Built with ❤️ using Cloudflare Edge, TanStack Start, and Hono**
