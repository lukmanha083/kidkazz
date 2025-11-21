# 🧹 Legacy Code Cleanup - apps/backend Directory

## Current Situation

The `apps/backend` directory contains the **old monolithic backend** that has been replaced by the microservices architecture.

### Old Monolithic Backend (`apps/backend`)
```
apps/backend/
├── src/
│   ├── routes/
│   │   ├── products.ts       ← Replaced by services/product-service
│   │   ├── warehouses.ts     ← Replaced by services/inventory-service
│   │   ├── auth.ts           ← Replaced by services/user-service
│   │   ├── retail.ts
│   │   ├── wholesale.ts
│   │   ├── orders.ts
│   │   ├── payments.ts
│   │   ├── accounting.ts
│   │   ├── quotes.ts
│   │   └── webhooks.ts
│   ├── db/
│   │   └── schema.ts
│   └── lib/
├── package.json             ← Uses "wholesale-db"
└── wrangler.toml

Database: wholesale-db (monolithic)
Port: Probably 8787 (old API_BASE_URL)
```

### New Microservices Architecture
```
services/
├── product-service/         ✅ ACTIVE
│   ├── Database: product-db
│   ├── Port: 8788
│   └── Features: Products, Categories, Variants, UOMs
│
├── inventory-service/       ✅ ACTIVE
│   ├── Database: inventory-db
│   ├── Port: 8792
│   └── Features: Warehouses, Inventory, Stock Movements
│
└── user-service/            ✅ ACTIVE (RBAC implemented)
    ├── Database: user-db
    ├── Port: TBD
    └── Features: Users, Roles, Permissions, Auth
```

---

## ⚠️ Why This is Problematic

### 1. Confusion
- Developers might accidentally work on the old backend
- Frontend might be calling the wrong endpoints
- Database conflicts (wholesale-db vs product-db/inventory-db)

### 2. Resource Waste
- Takes up disk space
- Appears in code searches
- Confuses CI/CD pipelines

### 3. Maintenance Burden
- Needs to keep dependencies updated
- Security vulnerabilities in unused code
- Confusing for new developers

---

## ✅ Recommended Actions

### Option 1: Archive the Old Backend (Recommended)

**Pros:**
- Preserves history for reference
- Can be restored if needed
- Removes clutter from main codebase

**Steps:**
```bash
# 1. Create archive branch
git checkout -b archive/old-monolithic-backend
git add apps/backend
git commit -m "Archive old monolithic backend - replaced by microservices"
git push origin archive/old-monolithic-backend

# 2. Return to main branch and remove directory
git checkout claude/apply-db-migrations-01MEBwH2fez9rGKB6x7Uzaae
git rm -rf apps/backend
git commit -m "Remove archived monolithic backend from main codebase"
git push

# 3. Document the archive
echo "Old monolithic backend archived in branch: archive/old-monolithic-backend" >> ARCHITECTURE.md
```

### Option 2: Keep for Reference (Temporary)

If you want to reference the old code while building new features:

```bash
# Rename to make it clear it's legacy
mv apps/backend apps/_LEGACY_backend_DO_NOT_USE

# Add a README
cat > apps/_LEGACY_backend_DO_NOT_USE/README_LEGACY.md <<EOF
# ⚠️ LEGACY CODE - DO NOT USE

This is the old monolithic backend. It has been replaced by:
- services/product-service
- services/inventory-service
- services/user-service

This directory is kept temporarily for reference only.
It will be removed in the next major cleanup.
EOF
```

### Option 3: Extract Useful Code

Before archiving, extract any features not yet migrated:

**Features still in apps/backend that may need migration:**
- `retail.ts` - Retail customer flows
- `wholesale.ts` - Wholesale customer flows
- `orders.ts` - Order management
- `payments.ts` - Xendit payment integration
- `accounting.ts` - Accounting/journal entries
- `quotes.ts` - Quote management
- `webhooks.ts` - Webhook handlers

**Migration Plan:**
1. Identify which features are still needed
2. Create new microservices OR add to existing ones:
   - `services/order-service` - Handle orders
   - `services/payment-service` - Handle payments
   - `services/accounting-service` - Handle accounting
   - Add retail/wholesale logic to product/inventory services

---

## 📋 Cleanup Checklist

### Before Archiving
- [ ] Verify all product features migrated to `product-service`
- [ ] Verify all inventory features migrated to `inventory-service`
- [ ] Verify all auth features migrated to `user-service`
- [ ] Document any missing features that need migration
- [ ] Update `ARCHITECTURE.md` to remove references to old backend

### After Archiving
- [ ] Remove `apps/backend` from main codebase
- [ ] Update frontend API client (remove references to port 8787)
- [ ] Update `start-dev.sh` script
- [ ] Update `README.md` and `SETUP.md`
- [ ] Update CI/CD configuration
- [ ] Search for any imports from `@wholesale/backend`

### Update Frontend Configuration

Check and update these files:
```bash
# Find all references to old backend
grep -r "8787" apps/admin-dashboard/
grep -r "wholesale" apps/admin-dashboard/
grep -r "API_BASE_URL" apps/admin-dashboard/

# Should only use:
VITE_PRODUCT_SERVICE_URL=http://localhost:8788
VITE_INVENTORY_SERVICE_URL=http://localhost:8792
VITE_USER_SERVICE_URL=http://localhost:8791 (or whatever port)
```

---

## 🎯 Decision Matrix

| Factor | Archive Now | Keep Temporarily | Extract First |
|--------|-------------|------------------|---------------|
| **Time Required** | 5 minutes | 2 minutes | 1-2 days |
| **Risk** | Low | Medium | Low |
| **Clutter** | Eliminated | Still present | Eliminated |
| **Reference Available** | Yes (branch) | Yes (folder) | Yes (new services) |
| **Recommended For** | Clean codebase | Ongoing migration | Complete features |

---

## 💡 Recommendation

**Immediate Action (Today):**
```bash
# Mark as legacy to prevent confusion
mv apps/backend apps/_LEGACY_backend_DO_NOT_USE
```

**Short Term (This Week):**
1. Review remaining features in old backend
2. Decide which features to migrate
3. Create migration plan for order/payment/accounting services

**Long Term (This Month):**
1. Complete feature migration
2. Archive old backend to git branch
3. Remove from main codebase
4. Update all documentation

---

## 📚 Related Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) - Microservices architecture overview
- [TESTING_ROADMAP.md](TESTING_ROADMAP.md) - Testing strategy
- [ECOMMERCE_WHOLESALE_ROADMAP.md](ECOMMERCE_WHOLESALE_ROADMAP.md) - Feature roadmap

---

## ⚠️ Important Notes

1. **Database Migration**: The old `wholesale-db` is separate from new databases
   - Don't try to migrate data automatically
   - Manual data migration required if old data is valuable

2. **Frontend Compatibility**:
   - Admin dashboard already updated to use microservices (api.ts)
   - Mobile app might still reference old backend - check it

3. **Xendit Integration**:
   - Payment webhook handlers in old backend
   - Need to migrate to new payment service before removing

4. **Deployment**:
   - Old backend might still be deployed to production
   - Check Cloudflare Workers dashboard
   - Don't delete if still serving prod traffic!

---

## 🔍 Check if Old Backend is Still Used

```bash
# Check if it's running locally
curl http://localhost:8787/health

# Check Cloudflare Workers (if deployed)
wrangler deployments list --name wholesale-backend

# Check if frontend calls it
grep -r "localhost:8787" apps/admin-dashboard/
grep -r "localhost:8787" apps/mobile-app/
```

If any of these return results, **don't remove yet** - migration is incomplete.
