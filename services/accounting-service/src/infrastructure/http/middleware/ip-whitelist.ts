/**
 * TEMPORARY Country-based IP Filter Middleware
 *
 * ⚠️ REMOVE THIS FILE when proper authentication is implemented
 * See: docs/bounded-contexts/business-partner/TEMPORARY_IP_WHITELIST.md
 *
 * This middleware:
 * - Uses Cloudflare's cf-ipcountry header to allow only Indonesian IPs
 * - ALLOWS internal service-to-service calls (no cf-connecting-ip header)
 * - ALLOWS tRPC and service binding requests
 * - ALLOWS CI/E2E testing with X-CI-Bypass header (when CI_BYPASS_SECRET env is set)
 */

import type { Context, Next } from 'hono';

// Allowed countries - Indonesia only (for development)
const ALLOWED_COUNTRIES = ['ID'];

const BYPASS_PATHS = ['/health', '/favicon.ico', '/'];

export function ipWhitelist() {
  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname;
    if (BYPASS_PATHS.some((p) => path === p)) return next();

    // Check CI bypass header for E2E testing in GitHub Actions
    // The secret is read from environment variable CI_BYPASS_SECRET
    const ciBypassSecret = (c.env as { CI_BYPASS_SECRET?: string })?.CI_BYPASS_SECRET;
    if (ciBypassSecret) {
      const bypassHeader = c.req.header('x-ci-bypass');
      if (bypassHeader === ciBypassSecret) {
        return next();
      }
    }

    // Check if this is an internal service-to-service request
    // Service bindings don't have cf-connecting-ip header
    const cfConnectingIP = c.req.header('cf-connecting-ip');

    // Allow internal requests (service bindings, tRPC calls)
    if (!cfConnectingIP) {
      return next();
    }

    // External request - check country
    const country = c.req.header('cf-ipcountry');
    if (country && ALLOWED_COUNTRIES.includes(country)) return next();

    console.warn(`[BLOCKED] IP: ${cfConnectingIP}, Country: ${country || 'unknown'} -> ${path}`);
    return c.json({ error: 'Forbidden', country: country || 'unknown' }, 403);
  };
}
