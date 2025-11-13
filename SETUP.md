# Complete Setup Guide - Phase 1-4

This guide covers the complete setup process for Phase 1-4 of the Dual-Market E-Commerce Platform, including backend, database, payment integration, and admin dashboard.

## 📋 Prerequisites

### System Requirements
- **Node.js**: v20.0.0 or higher
- **pnpm**: v9.0.0 or higher
- **Operating System**: FreeBSD, Linux, or macOS
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

### Cloudflare Account
- Sign up at https://dash.cloudflare.com
- Free tier is sufficient for development
- Credit card NOT required for free tier

### Xendit Account (Payment Gateway)
- Sign up at https://dashboard.xendit.co/register
- Get your test API keys for development
- No credit card required for testing

---

## Phase 1: Foundation & Setup

### Step 1.1: Install Prerequisites

**For FreeBSD:**
```bash
# Update package repository
pkg update

# Install Node.js and npm
pkg install node npm

# Verify installation
node --version   # Should be v20+
npm --version    # Should be v10+

# Install pnpm globally
npm install -g pnpm

# Verify pnpm installation
pnpm --version   # Should be v9+
```

**For Linux (Debian/Ubuntu):**
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Reload your shell
source ~/.bashrc  # or ~/.zshrc
```

**For macOS:**
```bash
# Using Homebrew
brew install node
npm install -g pnpm

# Or using fnm (Fast Node Manager)
brew install fnm
fnm install 20
fnm use 20
npm install -g pnpm
```

### Step 1.2: Clone and Install Project

```bash
# Navigate to your projects directory
cd ~/projects

# Clone the repository (or your actual git clone command)
# git clone <repository-url> kidkazz
cd kidkazz

# Install all dependencies (root + all apps)
pnpm install
```

This will install:
- Root workspace dependencies
- Backend dependencies (Hono, Drizzle ORM, Zod)
- Admin dashboard dependencies (TanStack Start, shadcn/ui)

**Expected output:**
```
Progress: resolved X, reused Y, downloaded Z, added W
Done in Xs
```

### Step 1.3: Install Cloudflare Wrangler CLI

```bash
# Install Wrangler globally
pnpm add -g wrangler

# Verify installation
wrangler --version

# Login to Cloudflare (opens browser for authentication)
wrangler login
```

**What happens:**
1. Browser opens to Cloudflare OAuth page
2. Click "Allow" to authorize Wrangler
3. You'll see "Successfully logged in" in terminal

### Step 1.4: Create Cloudflare D1 Database

```bash
# Navigate to backend directory
cd apps/backend

# Create D1 database
wrangler d1 create wholesale-db
```

**Expected output:**
```
✅ Successfully created DB 'wholesale-db' in region WNAM
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "wholesale-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # <-- COPY THIS!
```

**⚠️ IMPORTANT**: Copy the `database_id` - you'll need it in the next step!

### Step 1.5: Configure Backend

**Update `wrangler.toml`:**

Edit `apps/backend/wrangler.toml` and update the database_id:

```toml
name = "wholesale-backend"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# Development environment
[[d1_databases]]
binding = "DB"
database_name = "wholesale-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # <-- PASTE YOUR ID HERE

# Production environment
[env.production]
name = "wholesale-backend-prod"

[[env.production.d1_databases]]
binding = "DB"
database_name = "wholesale-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # <-- SAME ID HERE
```

**Create `.dev.vars` file:**

```bash
# Copy example file
cp .dev.vars.example .dev.vars

# Edit the file
nano .dev.vars  # or vim, code, etc.
```

**`.dev.vars` content:**
```bash
# Environment
ENVIRONMENT=development

# Xendit Payment Gateway (Get from https://dashboard.xendit.co)
XENDIT_SECRET_KEY=xnd_development_your_test_key_here
XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token_here

# API Configuration
API_BASE_URL=http://localhost:8787

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**How to get Xendit keys:**
1. Go to https://dashboard.xendit.co/settings/developers
2. Click "Generate secret key" for test mode
3. Copy the key (starts with `xnd_development_`)
4. Create a webhook verification token (any random string for development)

---

## Phase 2: Core Features - Database Setup

### Step 2.1: Review Database Schema

Before generating migrations, review the database schema:

```bash
# View the schema file
cat apps/backend/src/db/schema.ts
```

**Key tables:**
- `users` - 4 roles: admin, supplier, retail_buyer, wholesale_buyer
- `products` - Dual pricing (retail + wholesale)
- `pricing_tiers` - Bulk discounts
- `orders` - With payment tracking
- `quotes` - RFQ system
- `companies`, `categories`, `custom_pricing`, `order_items`, `quote_items`, `activity_logs`, `settings`

### Step 2.2: Generate Database Migrations

```bash
# Make sure you're in the backend directory
cd apps/backend

# Generate migrations from schema
pnpm db:generate
```

**Expected output:**
```
drizzle-kit: v0.24.0
drizzle-orm: v0.33.0

✔ Generating...
✔ Migrations generated!

📦 migrations/
  └─ 0000_initial_schema.sql
```

This creates SQL migration files in `apps/backend/drizzle/` directory.

### Step 2.3: Apply Migrations (Local Development)

```bash
# Apply migrations to local D1 database
pnpm db:migrate
```

**Expected output:**
```
🌀 Mapping SQL input into an array of statements
🌀 Executing on local database wholesale-db (xxxxx) from .wrangler/state/v3/d1:
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
├ [#1] ✅ 0000_initial_schema.sql (XXXms)
🚣 Executed 1 commands in XXXms
```

**What this does:**
- Creates all 13 tables in your local database
- Sets up indexes and foreign keys
- Initializes constraints

### Step 2.4: Verify Database Setup

```bash
# Open Drizzle Studio (visual database browser)
pnpm db:studio
```

**What happens:**
1. Studio opens in browser at https://local.drizzle.studio
2. You can see all 13 tables
3. You can browse data (currently empty)
4. Press Ctrl+C in terminal to close

**Alternative: Query with Wrangler**
```bash
# List all tables
wrangler d1 execute wholesale-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"

# View users table structure
wrangler d1 execute wholesale-db --local --command "PRAGMA table_info(users)"
```

---

## Phase 3: Payment Integration - Xendit Setup

### Step 3.1: Get Xendit Test Credentials

1. **Sign up for Xendit:**
   - Go to https://dashboard.xendit.co/register
   - Use your email (no credit card needed)
   - Verify your email

2. **Get Test API Key:**
   - Navigate to Settings → Developers → API Keys
   - Click "Generate secret key" under **Test Mode**
   - Copy the key (format: `xnd_development_xxxxxxxxxxxxx`)
   - Save it securely

3. **Create Webhook Token:**
   - Go to Settings → Developers → Webhooks
   - Create a verification token (any strong random string)
   - Example: `webhook_verify_abc123xyz789`

### Step 3.2: Update Environment Variables

Edit `apps/backend/.dev.vars`:

```bash
XENDIT_SECRET_KEY=xnd_development_O46JfOtygfd9kJlB6j8MvGE5UngmqLRELJZOY2ygP7pf
XENDIT_WEBHOOK_TOKEN=webhook_verify_your_secure_token_here
```

### Step 3.3: Test Xendit Integration

The backend includes these Xendit endpoints:

```bash
# After starting the dev server (see Step 4.1), test:

# 1. Create QRIS payment
curl -X POST http://localhost:8787/api/payments/qris/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "orderId": "test-order-001",
    "description": "Test QRIS Payment"
  }'

# Expected response:
{
  "success": true,
  "qrCodeUrl": "https://...",
  "expiresAt": "2025-11-13T12:00:00Z"
}

# 2. Create Virtual Account
curl -X POST http://localhost:8787/api/payments/virtual-account/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "orderId": "test-order-002",
    "bankCode": "BCA"
  }'

# 3. List supported banks
curl http://localhost:8787/api/payments/banks
```

### Step 3.4: Payment Webhook Testing

For local webhook testing, use ngrok or Cloudflare Tunnel:

```bash
# Option 1: Using Cloudflare Tunnel (recommended)
cloudflared tunnel --url http://localhost:8787

# Option 2: Using ngrok
ngrok http 8787
```

Copy the public URL and configure it in Xendit dashboard:
- Settings → Developers → Webhooks
- Set webhook URL: `https://your-url.trycloudflare.com/api/webhooks/xendit/qris`
- Set verification token: Your `XENDIT_WEBHOOK_TOKEN` value

**See**: [XENDIT_INTEGRATION.md](./XENDIT_INTEGRATION.md) for detailed payment integration guide.

---

## Phase 4: Admin Dashboard Setup

### Step 4.1: Install Frontend Dependencies

```bash
# Navigate to admin dashboard
cd apps/admin-dashboard

# Install dependencies (if not already done)
pnpm install
```

**Installed packages:**
- TanStack Start + Router + Query
- shadcn/ui components
- Radix UI primitives
- Tailwind CSS
- Lucide React icons

### Step 4.2: Verify shadcn/ui Components

Check that shadcn/ui components are present:

```bash
ls -la app/components/ui/
```

**Expected files:**
- `button.tsx` - Button variants
- `badge.tsx` - Status badges
- `card.tsx` - Container components
- `table.tsx` - Data tables
- `input.tsx` - Form inputs

### Step 4.3: Start Development Servers

**Terminal 1 - Backend API:**
```bash
cd apps/backend
pnpm dev
```

**Expected output:**
```
⎔ Starting local server...
⎔ Ready on http://localhost:8787
```

**Terminal 2 - Admin Dashboard:**
```bash
cd apps/admin-dashboard
pnpm dev
```

**Expected output:**
```
  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Step 4.4: Access Admin Dashboard

1. Open browser to: http://localhost:3000
2. Navigate to: http://localhost:3000/admin
3. You should see:
   - Dashboard with stats cards
   - Sidebar navigation
   - Product, Order, and User management pages

**Dashboard Features:**
- View statistics (total users, products, orders, revenue)
- Manage products (create, edit, delete)
- View and update orders
- Manage users and companies
- Professional UI with shadcn/ui components

---

## Verification & Testing

### Test 1: Backend Health Check

```bash
curl http://localhost:8787/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

### Test 2: Database Connection

```bash
cd apps/backend
pnpm db:studio
```

Should open Drizzle Studio showing all 13 tables.

### Test 3: API Endpoints

**Test retail products (no wholesale prices):**
```bash
curl http://localhost:8787/api/retail/products
```

**Test wholesale products (with tiered pricing):**
```bash
curl http://localhost:8787/api/wholesale/products
```

**Test admin stats:**
```bash
curl http://localhost:8787/api/admin/dashboard/stats
```

### Test 4: Frontend

Navigate to http://localhost:3000/admin and verify:
- ✅ Dashboard loads
- ✅ Sidebar navigation works
- ✅ shadcn/ui components render correctly
- ✅ No console errors

---

## Common Issues & Solutions

### Issue 1: "Command not found: wrangler"

**Solution:**
```bash
pnpm add -g wrangler
# or
npm install -g wrangler

# Verify
wrangler --version
```

### Issue 2: "Cannot find module 'drizzle-orm'"

**Solution:**
```bash
cd apps/backend
pnpm install
```

### Issue 3: Port Already in Use

**For backend (8787):**
```bash
# Find process using port
lsof -i :8787        # Linux/Mac
sockstat -4 -l | grep 8787  # FreeBSD

# Kill the process
kill -9 <PID>

# Or use different port
cd apps/backend
pnpm dev -- --port 8788
```

**For frontend (3000):**
```bash
# TanStack Start will automatically use next available port
# Or specify port in package.json dev script
```

### Issue 4: Database Not Found

**Solution:**
```bash
# Ensure database is created
cd apps/backend
wrangler d1 create wholesale-db

# Verify wrangler.toml has correct database_id

# Re-run migrations
pnpm db:migrate
```

### Issue 5: Xendit API Errors

**Check:**
1. ✅ API key starts with `xnd_development_` (test mode)
2. ✅ `.dev.vars` file exists and has correct keys
3. ✅ Environment variables are loaded (restart dev server)

**Test API key:**
```bash
curl https://api.xendit.co/v2/balance \
  -u xnd_development_YOUR_KEY:
```

Should return your test balance.

### Issue 6: Frontend Build Errors

**Solution:**
```bash
# Clear cache and reinstall
cd apps/admin-dashboard
rm -rf node_modules .vinxi .output
pnpm install
pnpm dev
```

### Issue 7: Database Migration Conflicts

**Solution:**
```bash
cd apps/backend

# Drop all tables (CAUTION: Deletes data!)
wrangler d1 execute wholesale-db --local --command "DROP TABLE IF EXISTS users"
# Repeat for all tables...

# Or delete local database and recreate
rm -rf .wrangler/state/v3/d1
pnpm db:migrate
```

---

## Advanced Configuration

### Remote Database (Production)

When ready to deploy:

```bash
# Apply migrations to production
cd apps/backend
pnpm db:migrate:prod

# Test remote database
wrangler d1 execute wholesale-db --remote --command "SELECT * FROM users LIMIT 5"
```

### Environment-Specific Configuration

**For staging:**
```bash
# Create staging environment in wrangler.toml
[env.staging]
name = "wholesale-backend-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "wholesale-db-staging"
database_id = "your-staging-db-id"

# Deploy to staging
wrangler deploy --env staging
```

### Cloudflare R2 Setup (Image Storage)

```bash
# Create R2 bucket
wrangler r2 bucket create wholesale-images

# Update wrangler.toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "wholesale-images"
```

---

## Development Workflow

### Daily Development

**1. Start backend:**
```bash
cd apps/backend
pnpm dev
```

**2. Start frontend:**
```bash
cd apps/admin-dashboard
pnpm dev
```

**3. Make changes and test**

**4. Check types:**
```bash
# From root
pnpm type-check
```

### Making Schema Changes

**1. Edit schema:**
```bash
nano apps/backend/src/db/schema.ts
```

**2. Generate migration:**
```bash
cd apps/backend
pnpm db:generate
```

**3. Apply migration:**
```bash
pnpm db:migrate
```

**4. Verify:**
```bash
pnpm db:studio
```

### Adding shadcn/ui Components

```bash
cd apps/admin-dashboard

# Add new component (example: dialog)
npx shadcn-ui@latest add dialog

# Component will be added to app/components/ui/dialog.tsx
```

---

## Phase Completion Checklist

### ✅ Phase 1: Foundation & Setup
- ✅ Node.js and pnpm installed
- ✅ Project dependencies installed
- ✅ Wrangler CLI installed and authenticated
- ✅ D1 database created
- ✅ wrangler.toml configured
- ✅ .dev.vars created with Xendit keys

### ✅ Phase 2: Core Features
- ✅ Database schema reviewed (13 tables)
- ✅ Migrations generated
- ✅ Migrations applied locally
- ✅ Database verified in Drizzle Studio
- ✅ Dual-market architecture implemented

### ✅ Phase 3: Payment Integration
- ✅ Xendit account created
- ✅ Test API keys obtained
- ✅ Environment variables configured
- ✅ Payment endpoints tested (QRIS, Virtual Account)
- ✅ Webhook handlers implemented

### ✅ Phase 4: Advanced Features
- ✅ Admin dashboard dependencies installed
- ✅ shadcn/ui components integrated
- ✅ Development servers running
- ✅ Admin dashboard accessible
- ✅ API endpoints functional

---

## Next Steps

**After completing Phase 1-4 setup:**

### Immediate Tasks
1. 🔄 Implement JWT authentication
2. 🔄 Add password hashing (bcrypt)
3. 🔄 Test end-to-end payment flow
4. 🔄 Set up Cloudflare R2 for images

### Phase 5 Planning
1. ⏳ Design Retail Frontend UI
2. ⏳ Design Wholesale Frontend UI
3. ⏳ Plan frontend routing structure
4. ⏳ Create API integration layer

**See:** [ECOMMERCE_WHOLESALE_ROADMAP.md](./ECOMMERCE_WHOLESALE_ROADMAP.md) for complete roadmap.

---

## Additional Resources

### Documentation
- **Project Overview**: [README.md](./README.md)
- **Roadmap**: [ECOMMERCE_WHOLESALE_ROADMAP.md](./ECOMMERCE_WHOLESALE_ROADMAP.md)
- **Architecture**: [RETAIL_WHOLESALE_ARCHITECTURE.md](./RETAIL_WHOLESALE_ARCHITECTURE.md)
- **Payment Guide**: [XENDIT_INTEGRATION.md](./XENDIT_INTEGRATION.md)
- **Mobile Guide**: [MOBILE_APP_EXPO_GUIDE.md](./MOBILE_APP_EXPO_GUIDE.md)

### External Documentation
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Hono Framework](https://hono.dev/)
- [TanStack Start](https://tanstack.com/start/latest)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Xendit API](https://developers.xendit.co/)

### Getting Help

**Issues or Questions:**
1. Check this SETUP.md guide
2. Review README.md
3. Check the roadmap document
4. Review Cloudflare/TanStack documentation
5. Check GitHub issues (if applicable)

---

## Development Environment Summary

**Backend (Hono + Cloudflare Workers):**
- **URL**: http://localhost:8787
- **Config**: `apps/backend/wrangler.toml`
- **Environment**: `apps/backend/.dev.vars`
- **Database**: Cloudflare D1 (local mode)
- **Payment**: Xendit (test mode)

**Frontend (TanStack Start + shadcn/ui):**
- **URL**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **Config**: `apps/admin-dashboard/app.config.ts`
- **UI Components**: `apps/admin-dashboard/app/components/ui/`

**Database Tools:**
- **Studio**: `pnpm db:studio` → https://local.drizzle.studio
- **Migrations**: `pnpm db:generate` + `pnpm db:migrate`
- **Query**: `wrangler d1 execute wholesale-db --local --command "..."`

---

**Setup Complete! 🎉**

You now have a fully functional development environment for Phase 1-4:
- ✅ Backend API running on Cloudflare Workers
- ✅ Database with 13 tables and dual-market support
- ✅ Payment integration with Xendit
- ✅ Admin dashboard with shadcn/ui
- ✅ Ready for Phase 5 (Retail & Wholesale Frontends)

**Happy coding!** 🚀
