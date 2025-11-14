# KidKazz E-Commerce Platform - Development Setup Tutorial

Complete guide to set up and run the KidKazz dual-market e-commerce platform (Retail B2C + Wholesale B2B) from scratch.

## 📋 Prerequisites

Before starting, ensure you have these installed:

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **pnpm** v9+ (Install: `npm install -g pnpm`)
- **Git** ([Download](https://git-scm.com/))
- **Cloudflare Account** (Free tier works) - [Sign up](https://dash.cloudflare.com/sign-up)

---

## 🚀 Part 1: Clone and Install

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/lukmanha083/kidkazz.git
cd kidkazz

# Switch to the development branch
git checkout claude/ecommerce-wholesale-roadmap-011CV42qXsWjkKBHQ2TZTWPx
```

### Step 2: Install Dependencies

```bash
# Install all dependencies for all services
pnpm install

# This will install dependencies for:
# - API Gateway
# - 6 Microservices (Product, Order, Payment, User, Inventory, Shipping)
# - 3 Shared libraries (domain-events, types, utils)
```

**Expected output:**
```
✓ All dependencies installed successfully
✓ Packages: +1019
```

---

## 🗄️ Part 2: Database Setup

Our platform uses **Cloudflare D1** (SQLite at the edge) for each microservice.

### Step 1: Login to Cloudflare

```bash
# Login to your Cloudflare account
npx wrangler login

# Follow the browser prompt to authenticate
```

### Step 2: Create D1 Databases

Create a database for each service:

```bash
# Create Product Service database
npx wrangler d1 create product-db

# Create Order Service database
npx wrangler d1 create order-db

# Create Payment Service database
npx wrangler d1 create payment-db

# Create User Service database
npx wrangler d1 create user-db

# Create Inventory Service database
npx wrangler d1 create inventory-db

# Create Shipping Service database
npx wrangler d1 create shipping-db
```

**For each database created, you'll see output like:**
```
✅ Successfully created DB 'product-db' in region WEUR
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "product-db"
database_id = "abc123-def456-ghi789"
```

### Step 3: Update Database IDs in Configuration

Copy the `database_id` from each output and update the corresponding `wrangler.jsonc` file:

**Example for Product Service:**
```bash
# Open the config file
nano services/product-service/wrangler.jsonc

# Update the database_id (line 19):
"database_id": "abc123-def456-ghi789"  # Replace PLACEHOLDER with your ID
```

**Repeat for all services:**
- `services/order-service/wrangler.jsonc`
- `services/payment-service/wrangler.jsonc`
- `services/user-service/wrangler.jsonc`
- `services/inventory-service/wrangler.jsonc`
- `services/shipping-service/wrangler.jsonc`

### Step 4: Run Database Migrations

Apply SQL migrations to create tables:

```bash
# Product Service migration
cd services/product-service
npx wrangler d1 migrations apply product-db --local

# User Service migration (create it first)
cd ../user-service
cat > migrations/0001_initial_schema.sql << 'EOF'
-- User Service Schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  user_type TEXT NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  email_verified INTEGER DEFAULT 0,
  company_name TEXT,
  business_license TEXT,
  tax_id TEXT,
  last_login_at INTEGER,
  failed_login_attempts INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
EOF

npx wrangler d1 migrations apply user-db --local

# Return to root
cd ../..
```

**Note:** Migrations for other services will be created in the next phase.

---

## 🔐 Part 3: Environment Configuration

### Step 1: Set JWT Secret for User Service

```bash
# Generate a secure random secret
# On Linux/Mac:
JWT_SECRET=$(openssl rand -base64 32)
echo "Your JWT Secret: $JWT_SECRET"

# Set the secret in Wrangler
cd services/user-service
echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET

# For local development, create .dev.vars file
echo "JWT_SECRET=$JWT_SECRET" > .dev.vars
echo "ACCESS_TOKEN_EXPIRY=1h" >> .dev.vars
echo "REFRESH_TOKEN_EXPIRY=7d" >> .dev.vars

cd ../..
```

### Step 2: Configure Shipping Service (JET API)

```bash
cd services/shipping-service

# For now, we'll use placeholder values (until JET sandbox is ready)
cat > .dev.vars << 'EOF'
JET_API_KEY=placeholder-key-waiting-for-sandbox
JET_API_BASE_URL=https://sandbox-api.jet.co.id/v1
JET_MODE=sandbox
EOF

cd ../..
```

---

## 🎯 Part 4: Launch Development Environment

We'll run all services in separate terminal windows.

### Option A: Use tmux (Recommended - All in one window)

```bash
# Install tmux if not already installed
# Ubuntu/Debian: sudo apt-get install tmux
# Mac: brew install tmux

# Create a new tmux session
tmux new-session -s kidkazz

# Split into panes and run each service
# The script below will set up 7 panes (1 gateway + 6 services)
```

Create a startup script:
```bash
cat > start-dev.sh << 'EOF'
#!/bin/bash

# Start tmux session
tmux new-session -d -s kidkazz

# Split window into 7 panes
tmux split-window -h
tmux split-window -v
tmux select-pane -t 0
tmux split-window -v
tmux select-pane -t 2
tmux split-window -v
tmux select-pane -t 4
tmux split-window -v
tmux select-pane -t 6
tmux split-window -v

# Start services in each pane
tmux select-pane -t 0
tmux send-keys "cd services/api-gateway && pnpm dev" C-m

tmux select-pane -t 1
tmux send-keys "cd services/product-service && pnpm dev" C-m

tmux select-pane -t 2
tmux send-keys "cd services/user-service && pnpm dev" C-m

tmux select-pane -t 3
tmux send-keys "cd services/order-service && pnpm dev" C-m

tmux select-pane -t 4
tmux send-keys "cd services/payment-service && pnpm dev" C-m

tmux select-pane -t 5
tmux send-keys "cd services/inventory-service && pnpm dev" C-m

tmux select-pane -t 6
tmux send-keys "cd services/shipping-service && pnpm dev" C-m

# Attach to session
tmux attach-session -t kidkazz
EOF

chmod +x start-dev.sh
./start-dev.sh
```

**tmux Commands:**
- Switch panes: `Ctrl+b` then arrow keys
- Detach: `Ctrl+b` then `d`
- Reattach: `tmux attach -t kidkazz`
- Kill session: `tmux kill-session -t kidkazz`

### Option B: Manual Terminal Windows

Open 7 separate terminal windows/tabs:

**Terminal 1 - API Gateway (Port 8787):**
```bash
cd services/api-gateway
pnpm dev
```

**Terminal 2 - Product Service (Port 8788):**
```bash
cd services/product-service
pnpm dev
```

**Terminal 3 - User Service (Port 8791):**
```bash
cd services/user-service
pnpm dev
```

**Terminal 4 - Order Service (Port 8789):**
```bash
cd services/order-service
pnpm dev
```

**Terminal 5 - Payment Service (Port 8790):**
```bash
cd services/payment-service
pnpm dev
```

**Terminal 6 - Inventory Service (Port 8792):**
```bash
cd services/inventory-service
pnpm dev
```

**Terminal 7 - Shipping Service (Port 8793):**
```bash
cd services/shipping-service
pnpm dev
```

### Verify All Services Are Running

```bash
# Check health endpoints
curl http://localhost:8787/health  # API Gateway
curl http://localhost:8788/health  # Product Service
curl http://localhost:8791/health  # User Service
curl http://localhost:8789/health  # Order Service
curl http://localhost:8790/health  # Payment Service
curl http://localhost:8792/health  # Inventory Service
curl http://localhost:8793/health  # Shipping Service
```

**Expected output for each:**
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2025-11-14T12:00:00.000Z"
}
```

---

## 🎨 Part 5: Launch Admin Dashboard

### Step 1: Install Admin Dashboard

```bash
# From project root
cd apps/admin-dashboard
pnpm install
```

### Step 2: Start Admin Dashboard

```bash
# Start the development server
pnpm dev

# Dashboard will be available at http://localhost:5173
```

### Step 3: Open in Browser

```bash
# Open automatically (Mac/Linux)
open http://localhost:5173

# Or manually open: http://localhost:5173
```

---

## 🧪 Part 6: Test the Platform

### Test 1: Create Admin User

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kidkazz.com",
    "password": "Admin123!",
    "fullName": "Admin User",
    "userType": "admin"
  }'
```

**Expected response:**
```json
{
  "userId": "abc123",
  "email": "admin@kidkazz.com",
  "fullName": "Admin User",
  "userType": "admin",
  "status": "active"
}
```

### Test 2: Login and Get JWT Token

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kidkazz.com",
    "password": "Admin123!"
  }'
```

**Save the access token from response:**
```json
{
  "userId": "abc123",
  "email": "admin@kidkazz.com",
  "fullName": "Admin User",
  "userType": "admin",
  "accessToken": "eyJhbGci...",  # ← Copy this
  "refreshToken": "eyJhbGci...",
  "expiresIn": 3600
}
```

### Test 3: Create a Product

```bash
# Set your token
TOKEN="eyJhbGci..."  # Replace with your actual token

curl -X POST http://localhost:8787/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Premium T-Shirt",
    "sku": "TSHIRT-001",
    "description": "High quality cotton t-shirt",
    "retailPrice": 150000,
    "wholesalePrice": 100000,
    "availableForRetail": true,
    "availableForWholesale": true,
    "minimumOrderQuantity": 1
  }'
```

### Test 4: Get Shipping Rates

```bash
curl -X POST http://localhost:8787/api/shipping/rates \
  -H "Content-Type: application/json" \
  -d '{
    "origin_city_id": "Jakarta",
    "destination_city_id": "Bandung",
    "weight": 1000
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "courier_code": "jne",
      "courier_name": "JNE",
      "services": [
        {
          "service_code": "reg",
          "service_name": "Regular",
          "cost": 25000,
          "etd_min": 2,
          "etd_max": 3
        }
      ]
    }
  ],
  "mode": "sandbox",
  "note": "Using placeholder data - waiting for JET sandbox credentials"
}
```

---

## 📊 Service Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway :8787                         │
│                  (Service Bindings - FREE!)                  │
└──────┬──────┬──────┬──────┬──────┬──────┬──────────────────┘
       │      │      │      │      │      │
   ┌───▼──┐ ┌─▼───┐ ┌▼────┐ ┌▼───┐ ┌▼────┐ ┌▼────────┐
   │Product│ │User │ │Order│ │Pay │ │Inv  │ │Shipping │
   │ :8788 │ │:8791│ │:8789│ │:8790│ │:8792│ │  :8793  │
   └───┬──┘ └──┬──┘ └─┬───┘ └─┬──┘ └─┬───┘ └─┬───────┘
       │       │      │       │      │       │
   ┌───▼──┐ ┌─▼───┐ ┌▼────┐ ┌▼───┐ ┌▼────┐ ┌▼────────┐
   │ D1   │ │ D1  │ │ D1  │ │ D1 │ │ D1  │ │  D1     │
   └──────┘ └─────┘ └─────┘ └────┘ └─────┘ └─────────┘
```

---

## 🛠️ Troubleshooting

### Issue: "Port already in use"

```bash
# Find and kill process using the port
lsof -ti:8787 | xargs kill -9  # Replace 8787 with your port

# Or use a different port in wrangler.jsonc
```

### Issue: "Database not found"

```bash
# Check if database was created
npx wrangler d1 list

# Recreate if missing
npx wrangler d1 create product-db
```

### Issue: "Module not found"

```bash
# Reinstall dependencies
pnpm install --force

# Clear cache
pnpm store prune
```

### Issue: "JWT verification failed"

```bash
# Make sure .dev.vars file exists in user-service
cd services/user-service
cat .dev.vars

# Should contain JWT_SECRET
```

---

## 📚 Available API Endpoints

### Authentication (`/api/auth/`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT
- `GET /api/auth/me` - Get current user (requires JWT)
- `POST /api/auth/refresh` - Refresh access token

### Products (`/api/products/`)
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product
- `GET /api/products` - List products
- `PATCH /api/products/:id/price` - Update price

### Orders (`/api/orders/`)
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `GET /api/orders` - List orders

### Shipping (`/api/shipping/`)
- `POST /api/shipping/rates` - Get shipping rates
- `POST /api/shipping/shipments` - Create shipment
- `GET /api/shipping/shipments/:id/tracking` - Track shipment

### Admin Routes (`/api/admin/`)
- All service endpoints accessible via `/api/admin/{service}/`
- Example: `/api/admin/products`, `/api/admin/orders`

---

## 🎯 Next Steps

1. **Test all endpoints** using the Admin Dashboard
2. **Create test data** for products, users, and orders
3. **Implement Payment Service** with Xendit integration
4. **Implement Inventory Service** reservation logic
5. **Set up JET sandbox** when credentials arrive
6. **Deploy to Cloudflare** when ready for production

---

## 📞 Need Help?

- **Documentation**: Check `/docs` folder
- **Architecture**: See `ARCHITECTURE_DECISION.md`
- **Roadmap**: See `ECOMMERCE_WHOLESALE_ROADMAP.md`
- **Issues**: GitHub Issues

---

## 🚀 Quick Start Commands (Summary)

```bash
# 1. Clone and install
git clone https://github.com/lukmanha083/kidkazz.git
cd kidkazz
git checkout claude/ecommerce-wholesale-roadmap-011CV42qXsWjkKBHQ2TZTWPx
pnpm install

# 2. Login to Cloudflare
npx wrangler login

# 3. Create databases (run for each service)
npx wrangler d1 create product-db
npx wrangler d1 create user-db
# ... (copy database IDs to wrangler.jsonc files)

# 4. Run migrations
cd services/product-service && npx wrangler d1 migrations apply product-db --local

# 5. Set secrets
cd services/user-service && echo "your-secret" | npx wrangler secret put JWT_SECRET

# 6. Start all services (use tmux or separate terminals)
./start-dev.sh

# 7. Start admin dashboard
cd apps/admin-dashboard && pnpm dev

# 8. Test
curl http://localhost:8787/health
```

Happy coding! 🎉
