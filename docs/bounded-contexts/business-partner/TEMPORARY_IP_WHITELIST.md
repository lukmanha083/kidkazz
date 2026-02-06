# Temporary Country-based IP Filter

> ⚠️ **TEMPORARY MEASURE** - Remove when proper authentication is implemented

## Overview

This document describes the temporary country-based access control implemented to protect our deployed endpoints during development before proper authentication (JWT/OAuth) is in place.

## Current Configuration

**Allowed Countries:**
- `ID` - Indonesia

Uses Cloudflare's `cf-ipcountry` header for geo-location filtering.

## How It Works

The IP filter middleware:
1. **Allows** requests from Indonesian IPs (external requests with country code `ID`)
2. **Allows** all internal service-to-service calls (no `cf-connecting-ip` header)
3. **Blocks** all other external requests with 403 Forbidden

### Service-to-Service Communication

When services communicate via Cloudflare Service Bindings:
- The `cf-connecting-ip` header is **NOT present**
- This allows tRPC calls, REST API calls between services
- API Gateway routing to backend services works normally

### External Requests

When users/browsers access endpoints:
- Cloudflare adds `cf-connecting-ip` header with real client IP
- Cloudflare adds `cf-ipcountry` header with 2-letter country code
- Only requests from Indonesia (`ID`) can access protected endpoints
- `/health` and `/` endpoints are always accessible

## Affected Services

All services have this middleware:
- `accounting-service`
- `product-service`
- `inventory-service`
- `order-service`
- `payment-service`
- `shipping-service`
- `business-partner-service`
- `api-gateway`

## How to Add More Countries

If you need to allow access from other countries:

1. Update `ALLOWED_COUNTRIES` array in each service's `index.ts`:
   ```typescript
   const ALLOWED_COUNTRIES = ['ID', 'SG', 'MY']; // Add country codes
   ```
2. Redeploy affected services

**Country codes**: Use ISO 3166-1 alpha-2 codes (e.g., `ID`=Indonesia, `SG`=Singapore, `MY`=Malaysia)

## How to Remove (When Auth is Ready)

When proper authentication is implemented:

1. **Remove from each service's `index.ts`:**
   - Delete the `ALLOWED_COUNTRIES` constant
   - Delete the `ipWhitelist` function
   - Remove `app.use('/*', ipWhitelist());` line
   - Remove `import type { Context, Next } from 'hono';` if no longer needed

2. **For accounting-service only:**
   - Delete `src/infrastructure/http/middleware/ip-whitelist.ts`
   - Remove export from `src/infrastructure/http/middleware/index.ts`

3. **Delete this documentation file**

## Code Location

```
services/
├── accounting-service/src/
│   ├── index.ts                              # Middleware usage
│   └── infrastructure/http/middleware/
│       ├── index.ts                          # Export
│       └── ip-whitelist.ts                   # Implementation
├── product-service/src/index.ts              # Inline middleware
├── inventory-service/src/index.ts            # Inline middleware
├── order-service/src/index.ts                # Inline middleware
├── payment-service/src/index.ts              # Inline middleware
├── shipping-service/src/index.ts             # Inline middleware
├── business-partner-service/src/index.ts     # Inline middleware
└── api-gateway/src/index.ts                  # Inline middleware
```

## Future: Proper Authentication Plan

See `EMPLOYEE_AUTH_RBAC_PLAN.md` for the planned authentication system:
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Service-to-service authentication with signed tokens

---

**Created**: 2026-02-04
**Updated**: 2026-02-06 (Changed from IP whitelist to country-based filtering)
**Status**: Active (Temporary)
**Remove When**: Authentication system is implemented
