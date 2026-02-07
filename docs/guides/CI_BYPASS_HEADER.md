# CI Bypass Header for E2E Testing

**Status**: TEMPORARY - Remove when backend authentication is implemented

---

## Overview

This document describes the temporary CI bypass mechanism that allows GitHub Actions to run E2E tests against production backend services that have country-based IP filtering.

## Why This Exists

Our backend services use Cloudflare's `cf-ipcountry` header to restrict access to Indonesian IPs only. GitHub Actions runners are located in the US, causing E2E tests to fail with 403 Forbidden errors.

The CI bypass header (`X-CI-Bypass`) provides a temporary workaround until proper authentication (JWT, OAuth, etc.) is implemented.

---

## How It Works

1. **Backend Middleware**: Each service checks for `X-CI-Bypass` header
2. **Secret Validation**: Header value must match `CI_BYPASS_SECRET` environment variable
3. **Playwright Tests**: Intercept API requests and inject the header
4. **GitHub Actions**: Pass the secret via `CI_BYPASS_SECRET` env variable

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  GitHub Actions │ ──── │  Playwright     │ ──── │  Backend API    │
│  (US IP)        │      │  + X-CI-Bypass  │      │  (IP Filter)    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                │                        │
                                │  X-CI-Bypass: <secret> │
                                └────────────────────────┘
                                         ✓ Bypass
```

---

## Setup Instructions

### 1. Generate a Secret

```bash
# Generate a random 32-character secret
openssl rand -hex 16
# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 2. Add to Cloudflare Workers

For each service, add the secret as an environment variable:

```bash
# Using Wrangler CLI
cd services/accounting-service
wrangler secret put CI_BYPASS_SECRET
# Paste the secret when prompted

# Repeat for all services:
# - accounting-service
# - product-service
# - inventory-service
# - business-partner-service
# - order-service
# - payment-service
# - shipping-service
# - api-gateway
```

Or add to `wrangler.toml` (not recommended for secrets):
```toml
[vars]
CI_BYPASS_SECRET = "your-secret-here"  # Don't commit this!
```

### 3. Add to GitHub Secrets

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `CI_BYPASS_SECRET`
4. Value: Same secret used in Cloudflare Workers
5. Click **Add secret**

### 4. Verify Setup

Run the E2E workflow manually:
```bash
gh workflow run playwright-e2e.yml
```

---

## Security Considerations

- **Secret Rotation**: Rotate the secret periodically
- **Limited Scope**: Only bypasses IP filter, not authentication
- **Audit Logging**: Backend logs bypass usage for monitoring
- **Temporary**: Remove entirely when auth is implemented

---

## Files Modified

| File | Purpose |
|------|---------|
| `services/*/src/index.ts` | IP whitelist middleware with bypass check |
| `services/accounting-service/src/infrastructure/http/middleware/ip-whitelist.ts` | Extracted middleware |
| `apps/erp-dashboard/e2e/chart-of-accounts.spec.ts` | Playwright route interception |
| `.github/workflows/playwright-e2e.yml` | CI workflow with secret |

---

## Removal Checklist

When backend authentication is implemented:

- [ ] Remove `CI_BYPASS_SECRET` check from all service middlewares
- [ ] Remove `CI_BYPASS_SECRET` from Cloudflare Workers secrets
- [ ] Remove `CI_BYPASS_SECRET` from GitHub repository secrets
- [ ] Update Playwright tests to use proper auth tokens
- [ ] Delete this documentation file
- [ ] Update `.github/workflows/playwright-e2e.yml` to use auth

---

## Related Documentation

- [Temporary IP Whitelist](../bounded-contexts/business-partner/TEMPORARY_IP_WHITELIST.md)
- [Cloudflare Workers Debugging](./CLOUDFLARE_WORKERS_DEBUGGING.md)

---

**Last Updated**: 2026-02-06
