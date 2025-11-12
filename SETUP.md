# Quick Setup Guide

## For FreeBSD Users

### 1. Install Prerequisites

```bash
# Update packages
pkg update

# Install Node.js and npm
pkg install node npm

# Install pnpm
npm install -g pnpm

# Verify installations
node --version   # Should be v20+
pnpm --version   # Should be v9+
```

### 2. Initial Project Setup

```bash
# Navigate to project directory
cd /path/to/kidkazz

# Install all dependencies
pnpm install
```

### 3. Cloudflare Setup

```bash
# Install Wrangler globally
pnpm add -g wrangler

# Login to Cloudflare (opens browser)
wrangler login

# Create D1 database
cd apps/backend
wrangler d1 create wholesale-db
```

**Important:** Copy the `database_id` from the output!

### 4. Configure Backend

Edit `apps/backend/wrangler.toml` and update:

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "wholesale-db"
database_id = "YOUR_DATABASE_ID_HERE"  # <-- Paste your ID here
```

Create `.dev.vars` file for local development:

```bash
cd apps/backend
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:
```
ENVIRONMENT=development
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_DATABASE_ID=your_database_id
CLOUDFLARE_D1_TOKEN=your_token
```

Get your account ID from: https://dash.cloudflare.com/ (right sidebar)

### 5. Initialize Database

```bash
cd apps/backend

# Generate migrations
pnpm db:generate

# Apply migrations locally
pnpm db:migrate

# Apply to production (optional, for later)
# pnpm db:migrate:prod
```

### 6. Install Frontend Dependencies

```bash
cd apps/admin-dashboard
pnpm install
```

### 7. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd apps/backend
pnpm dev
```

Backend will be available at: http://localhost:8787

**Terminal 2 - Frontend:**
```bash
cd apps/admin-dashboard
pnpm dev
```

Frontend will be available at: http://localhost:3000

### 8. Access the Admin Dashboard

Open browser: http://localhost:3000/admin

## Common Issues & Solutions

### Issue: "Command not found: wrangler"

**Solution:**
```bash
pnpm add -g wrangler
# or
npm install -g wrangler
```

### Issue: "Cannot find module 'drizzle-orm'"

**Solution:**
```bash
cd apps/backend
pnpm install
```

### Issue: Port already in use

**Solution:**
```bash
# For backend (default: 8787)
# Check what's using the port
sockstat -4 -l | grep 8787

# Kill the process or change port in wrangler dev command:
pnpm dev -- --port 8788

# For frontend (default: 3000)
# TanStack Start will automatically use next available port
```

### Issue: Database not found

**Solution:**
Make sure you've:
1. Created the D1 database with `wrangler d1 create wholesale-db`
2. Updated the `database_id` in `wrangler.toml`
3. Run migrations with `pnpm db:migrate`

## Verify Everything Works

1. **Backend Health Check:**
   ```bash
   curl http://localhost:8787/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. **Frontend:**
   Navigate to http://localhost:3000/admin
   You should see the admin dashboard

3. **Database:**
   ```bash
   cd apps/backend
   pnpm db:studio
   ```
   Opens Drizzle Studio to view your database

## Next Steps

1. Review the database schema in `apps/backend/src/db/schema.ts`
2. Explore the API routes in `apps/backend/src/routes/`
3. Check out the admin dashboard pages in `apps/admin-dashboard/app/routes/admin/`
4. Read the full roadmap in `ECOMMERCE_WHOLESALE_ROADMAP.md`

## Deployment

When ready to deploy:

**Backend:**
```bash
cd apps/backend
pnpm deploy
```

**Frontend:**
```bash
cd apps/admin-dashboard
pnpm build
pnpm deploy
```

## Getting Help

- Check the main README.md for detailed documentation
- Review the roadmap: ECOMMERCE_WHOLESALE_ROADMAP.md
- Cloudflare Docs: https://developers.cloudflare.com/
- TanStack Start Docs: https://tanstack.com/start/latest
- Hono Docs: https://hono.dev/

---

Happy coding! 🚀
