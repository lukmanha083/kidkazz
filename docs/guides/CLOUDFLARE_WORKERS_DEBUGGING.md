# Cloudflare Workers Debugging Guide

This guide covers debugging techniques for KidKazz backend services running on Cloudflare Workers.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `wrangler tail <service>` | Real-time logs |
| `wrangler tail <service> --status error` | Only errors |
| `wrangler tail <service> --format json` | JSON output for parsing |
| `wrangler tail <service> --search "keyword"` | Filter by text |

---

## Real-Time Logs with Wrangler Tail

### Basic Usage

Stream real-time logs from a deployed worker:

```bash
# Navigate to service directory
cd services/accounting-service

# Start tailing logs
npx wrangler tail accounting-service --format pretty
```

### Available Services

| Service | Command |
|---------|---------|
| API Gateway | `wrangler tail api-gateway` |
| Accounting | `wrangler tail accounting-service` |
| Product | `wrangler tail product-service` |
| Inventory | `wrangler tail inventory-service` |
| Business Partner | `wrangler tail business-partner-service` |
| Order | `wrangler tail order-service` |
| Payment | `wrangler tail payment-service` |
| Shipping | `wrangler tail shipping-service` |

### Filtering Options

```bash
# Only show errors
npx wrangler tail accounting-service --status error

# Only show successful requests
npx wrangler tail accounting-service --status ok

# Filter by HTTP method
npx wrangler tail accounting-service --method POST

# Filter by search term (matches URL, headers, or body)
npx wrangler tail accounting-service --search "accounts"

# Filter by IP address
npx wrangler tail accounting-service --ip 180.252.172.69

# Combine filters
npx wrangler tail accounting-service --status error --method POST
```

### Output Formats

```bash
# Pretty print (human readable)
npx wrangler tail accounting-service --format pretty

# JSON (for parsing/scripting)
npx wrangler tail accounting-service --format json

# JSON piped to jq for filtering
npx wrangler tail accounting-service --format json | jq '.logs[]'
```

---

## Cloudflare Dashboard Logs

### Accessing Logs

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Select the worker (e.g., `accounting-service`)
4. Click **Logs** tab

### Log Explorer (Beta)

For advanced querying:

1. Go to **Analytics & Logs** → **Log Explorer**
2. Select your worker
3. Use SQL-like queries to filter logs

Example queries:
```sql
-- Find all errors in the last hour
SELECT * FROM workers_logs
WHERE Outcome = 'exception'
AND Timestamp > now() - interval '1 hour'

-- Find slow requests (>1s)
SELECT * FROM workers_logs
WHERE Duration > 1000
ORDER BY Duration DESC
```

---

## Adding Debug Logs to Workers

### Using console.log

Logs appear in `wrangler tail` output:

```typescript
app.get('/api/accounts', async (c) => {
  console.log('Fetching accounts...');

  try {
    const accounts = await repository.findAll();
    console.log(`Found ${accounts.length} accounts`);
    return c.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
});
```

### Log Levels

```typescript
console.log('Info message');      // General info
console.info('Info message');     // Same as log
console.warn('Warning message');  // Warnings
console.error('Error message');   // Errors (shows in --status error)
console.debug('Debug message');   // Debug info
```

### Structured Logging

For better log analysis:

```typescript
console.log(JSON.stringify({
  event: 'account_created',
  accountId: account.id,
  userId: c.get('userId'),
  timestamp: new Date().toISOString(),
}));
```

---

## Debugging D1 Database Issues

### Check Migration Status

```bash
# List applied migrations
npx wrangler d1 migrations list <database-name> --remote

# Example
npx wrangler d1 migrations list accounting-db --remote
```

### Execute SQL Queries

```bash
# Run a query on remote database
npx wrangler d1 execute <database-name> --remote --command "SELECT * FROM accounts LIMIT 5"

# Run from file
npx wrangler d1 execute <database-name> --remote --file query.sql
```

### Common D1 Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `SQLITE_ERROR: no such table` | Migration not applied | Run `wrangler d1 migrations apply` |
| `SQLITE_ERROR: no such column` | Schema mismatch | Check migration order |
| `Transaction not supported` | Using BEGIN/COMMIT in migration | Remove transaction statements |

---

## Debugging Request/Response Issues

### Test Endpoints with curl

```bash
# Basic GET request
curl -s "https://accounting-service.tesla-hakim.workers.dev/api/accounts" \
  -H "X-Forwarded-For: 180.252.172.69"

# POST request with body
curl -s "https://accounting-service.tesla-hakim.workers.dev/api/accounts" \
  -H "X-Forwarded-For: 180.252.172.69" \
  -H "Content-Type: application/json" \
  -d '{"code": "1000", "name": "Test Account"}'

# See response headers
curl -i "https://accounting-service.tesla-hakim.workers.dev/api/accounts" \
  -H "X-Forwarded-For: 180.252.172.69"
```

### Check Service Health

```bash
# Health endpoint
curl -s "https://accounting-service.tesla-hakim.workers.dev/health"

# Root endpoint (shows available routes)
curl -s "https://accounting-service.tesla-hakim.workers.dev/"
```

---

## Common Issues & Solutions

### 1. "Not Found" Errors

**Symptoms:** API returns `{"success":false,"error":"Not found"}`

**Causes:**
- Wrong endpoint path
- Service not deployed
- Route not registered

**Debug Steps:**
```bash
# Check available endpoints
curl -s "https://<service>.tesla-hakim.workers.dev/"

# Check if service is deployed
npx wrangler deployments list
```

### 2. Country-Based Filtering Blocked

**Symptoms:** Request blocked with 403 Forbidden, "country: unknown" in response

**Note:** IP whitelist has been replaced with country-based filtering using Cloudflare's `cf-ipcountry` header. Only Indonesian IPs (country code "ID") are allowed.

**Debug Steps:**
```bash
# Check your current IP and country
curl -s ifconfig.me
curl -s ipinfo.io/country

# Test with CF-IPCountry header (simulates Indonesian IP)
curl -s "https://<service>.tesla-hakim.workers.dev/api/endpoint" \
  -H "CF-IPCountry: ID"

# If you're outside Indonesia, use a VPN with Indonesian servers
# or the CF-IPCountry header for testing
```

### 3. Database Query Errors

**Symptoms:** 500 Internal Server Error

**Debug Steps:**
```bash
# Tail logs to see SQL errors
npx wrangler tail <service> --status error

# Check table exists
npx wrangler d1 execute <db-name> --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### 4. CORS Errors

**Symptoms:** Browser blocks request with CORS error

**Check:** Ensure CORS middleware is applied:
```typescript
import { cors } from 'hono/cors';
app.use('*', cors());
```

---

## Performance Debugging

### Check Request Duration

**Note:** `wrangler tail` does not provide request duration directly. Duration metrics require enabling Trace Events in Cloudflare Workers.

For basic timing, use console timing in your code:

```typescript
// In your route handler
const start = Date.now();
// ... your logic
console.log(`Request took ${Date.now() - start}ms`);
```

Then view in logs:

```bash
npx wrangler tail accounting-service --format json | \
  jq 'select(.outcome == "ok") | {url: .event.request.url, logs: .logs}'
```

For production metrics, use Cloudflare Workers Analytics or enable Trace Events for `WallTimeMs`/`CPUTimeMs`.

### D1 Query Performance

Add timing to queries:

```typescript
const start = Date.now();
const result = await db.execute(query);
console.log(`Query took ${Date.now() - start}ms`);
```

---

## Environment-Specific Debugging

### Local Development

```bash
# Run worker locally
npx wrangler dev

# With local D1 database
npx wrangler dev --local
```

### Production

```bash
# Always use --remote for production D1
npx wrangler d1 execute <db-name> --remote --command "..."

# Tail production logs
npx wrangler tail <service>
```

---

## Related Documentation

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [KidKazz Service Graph](../../SERVICE_GRAPH.yaml)

---

**Last Updated:** 2026-02-04
