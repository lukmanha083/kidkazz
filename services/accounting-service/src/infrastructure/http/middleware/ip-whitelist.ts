/**
 * TEMPORARY IP Whitelist Middleware
 *
 * ⚠️ REMOVE THIS FILE when proper authentication is implemented
 * See: docs/bounded-contexts/business-partner/TEMPORARY_IP_WHITELIST.md
 *
 * This middleware:
 * - Blocks external requests from non-whitelisted IPs
 * - ALLOWS internal service-to-service calls (no cf-connecting-ip header)
 * - ALLOWS tRPC and service binding requests
 */

import type { Context, Next } from 'hono';

// Whitelisted IPs - Development only
const WHITELISTED_IPS = [
  '180.252.172.69', // Development laptop
  '127.0.0.1',
  '::1',
];

const BYPASS_PATHS = ['/health', '/favicon.ico', '/'];

export function ipWhitelist() {
  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname;
    if (BYPASS_PATHS.some((p) => path === p)) return next();

    // Check if this is an internal service-to-service request
    // Service bindings don't have cf-connecting-ip header
    const cfConnectingIP = c.req.header('cf-connecting-ip');

    // Allow internal requests (service bindings, tRPC calls)
    if (!cfConnectingIP) {
      return next();
    }

    // External request - check whitelist
    if (WHITELISTED_IPS.includes(cfConnectingIP)) return next();

    console.warn(`[IP-BLOCKED] ${cfConnectingIP} -> ${path}`);
    return c.json({ error: 'Forbidden', message: 'IP not whitelisted', ip: cfConnectingIP }, 403);
  };
}
