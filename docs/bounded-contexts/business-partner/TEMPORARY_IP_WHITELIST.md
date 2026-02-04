# Temporary IP Whitelist Security

> ⚠️ **TEMPORARY MEASURE** - Remove when proper authentication is implemented

## Overview

This document describes the temporary IP-based access control implemented to protect our deployed endpoints during development before proper authentication (JWT/OAuth) is in place.

## Current Configuration

**Whitelisted IPs:**
- `180.252.172.69` - Development laptop
- `127.0.0.1` - Localhost
- `::1` - Localhost IPv6

## How It Works

The IP whitelist middleware:
1. **Allows** requests from whitelisted IPs (external requests)
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
- Only whitelisted IPs can access protected endpoints
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

## How to Update Whitelisted IPs

1. Find your public IP: `curl ifconfig.me`
2. Update `WHITELISTED_IPS` array in each service's `index.ts`
3. Redeploy affected services

## How to Remove (When Auth is Ready)

When proper authentication is implemented:

1. **Remove from each service's `index.ts`:**
   - Delete the `WHITELISTED_IPS` constant
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
**Status**: Active (Temporary)
**Remove When**: Authentication system is implemented
