# Cloudflare Workers Cron Triggers Configuration

## Overview

Cloudflare Workers support **Cron Triggers** for running scheduled tasks. This is perfect for automated monitoring, cleanup, and health checks.

---

## How to Configure Cron Jobs

### **1. Add to wrangler.toml**

Edit `services/inventory-service/wrangler.toml`:

```toml
name = "inventory-service"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# ... other configurations ...

# Cron Triggers for scheduled tasks
[triggers]
crons = [
  # Daily orphan check at 8 AM UTC
  "0 8 * * *",

  # Weekly health report on Sundays at 9 AM UTC
  "0 9 * * 0"
]

# Optional: Slack webhook for alerts
[vars]
SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

---

## Cron Syntax

Cloudflare uses standard cron syntax:

```
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
 │ │ │ │ │
 │ │ │ │ │
 * * * * *
```

### **Common Examples:**

```toml
# Every day at midnight UTC
"0 0 * * *"

# Every day at 8 AM UTC
"0 8 * * *"

# Every 6 hours
"0 */6 * * *"

# Every Monday at 9 AM UTC
"0 9 * * 1"

# Every Sunday at 9 AM UTC (weekly)
"0 9 * * 0"

# First day of month at midnight
"0 0 1 * *"

# Every 15 minutes
"*/15 * * * *"
```

---

## What the Cron Jobs Do

### **1. Daily Orphan Check (8 AM UTC)**

**Cron:** `"0 8 * * *"`

**What it does:**
- Checks for orphaned inventory records
- Checks for orphaned product locations
- Logs results to console
- Sends Slack alert if orphans found

**Output:**
```
🔍 Running scheduled orphan check...
📊 Orphan Check Results:
  - Orphaned Inventory: 0
  - Orphaned Locations: 0
  - Total: 0
✅ No orphaned data detected - system healthy!
```

**Alert (if orphans found):**
```
⚠️ Orphaned Data Alert!

Orphaned Inventory: 3
Orphaned Locations: 5
Total: 8

Action Required: Review and clean up orphaned data at /admin/maintenance
```

---

### **2. Weekly Health Report (Sunday 9 AM UTC)**

**Cron:** `"0 9 * * 0"`

**What it does:**
- Generates comprehensive database health report
- Includes inventory counts, warehouse counts
- Sends weekly summary to Slack

**Output:**
```
📋 Generating weekly health report...
📊 Weekly Health Report: {
  "timestamp": "2025-12-08T09:00:00.000Z",
  "checks": {
    "orphanedInventory": 0,
    "orphanedLocations": 0,
    "totalInventoryRecords": 1250,
    "totalWarehouses": 5
  }
}
```

---

## Slack Integration (Optional)

### **Setup Slack Webhook:**

1. Go to https://api.slack.com/messaging/webhooks
2. Create a new webhook for your workspace
3. Copy the webhook URL
4. Add to `wrangler.toml`:

```toml
[vars]
SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
```

### **Slack Message Format:**

**Alert Message:**
```
⚠️ Database Maintenance Alert

Database Health Status:
- Orphaned Inventory: 3
- Orphaned Locations: 5

Status: ⚠️ Needs Attention
```

**Weekly Report:**
```
📋 Weekly Database Health Report

Database Health Status:
- Orphaned Inventory: 0
- Orphaned Locations: 0
- Total Inventory Records: 1250

Status: ✅ Healthy
```

---

## Testing Cron Jobs

### **1. Test Locally (Wrangler)**

```bash
# Test the cron handler manually
npx wrangler dev

# In another terminal, trigger the cron
curl http://localhost:8787/__scheduled?cron=0+8+*+*+*
```

### **2. Test in Production**

```bash
# Deploy first
npx wrangler deploy

# View cron trigger logs
npx wrangler tail

# Cron will run automatically at scheduled times
```

### **3. Manual Trigger (Development)**

Add a test endpoint in `src/index.ts`:

```typescript
// Development only - manual cron trigger
app.post('/internal/trigger-cron', async (c) => {
  const { scheduled } = await import('./scheduled');

  await scheduled(
    { cron: '0 8 * * *', scheduledTime: Date.now() } as ScheduledEvent,
    c.env as any,
    { waitUntil: (p: Promise<any>) => {} } as ExecutionContext
  );

  return c.json({ message: 'Cron triggered manually' });
});
```

---

## Monitoring Cron Jobs

### **1. View Logs**

```bash
# Real-time logs
npx wrangler tail

# Filter for cron events
npx wrangler tail --format json | grep "Cron trigger"
```

### **2. Cloudflare Dashboard**

1. Go to Workers & Pages
2. Select your worker
3. Click "Logs" tab
4. Filter by cron events

---

## Best Practices

### **1. Timing Considerations**

- **UTC Time:** All cron times are in UTC
- **Avoid Peak Hours:** Run maintenance during low-traffic periods
- **Spread Load:** Don't schedule all crons at same time

### **2. Error Handling**

- Always wrap in try-catch
- Send alerts on failures
- Log detailed error messages

### **3. Performance**

- Keep cron jobs fast (< 30 seconds)
- Use `ctx.waitUntil()` for background work
- Don't block on external API calls

### **4. Alerts**

- Alert on failures
- Alert on unexpected conditions
- Include actionable information

---

## Recommended Schedule

```toml
[triggers]
crons = [
  # Daily orphan check (8 AM UTC = 3 PM Jakarta time)
  "0 8 * * *",

  # Weekly health report (Sunday 9 AM UTC = 4 PM Jakarta time)
  "0 9 * * 0",

  # Optional: Hourly health check (top of every hour)
  # "0 * * * *",

  # Optional: Batch cleanup (daily at 2 AM UTC = 9 AM Jakarta time)
  # "0 2 * * *",
]
```

---

## Disable Cron Jobs

### **Temporarily:**

Comment out in `wrangler.toml`:

```toml
# [triggers]
# crons = [
#   "0 8 * * *",
# ]
```

### **Permanently:**

Remove the `[triggers]` section from `wrangler.toml`.

---

## Cost Considerations

- **Free Tier:** 100,000 requests/day
- **Cron Triggers:** Count as requests
- **Daily orphan check:** 1 request/day
- **Weekly report:** 1 request/week
- **Total:** ~30 requests/month (well within free tier)

---

## Troubleshooting

### **Cron Not Running**

1. Check `wrangler.toml` syntax
2. Verify deployment: `npx wrangler deploy`
3. Check logs: `npx wrangler tail`
4. Verify cron syntax is valid

### **Slack Alerts Not Working**

1. Verify webhook URL is correct
2. Check webhook has proper permissions
3. Test webhook manually:
```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}' \
  YOUR_WEBHOOK_URL
```

### **Errors in Logs**

```bash
# View detailed error logs
npx wrangler tail --format json
```

---

## Additional Resources

- [Cloudflare Cron Triggers Docs](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cron Expression Generator](https://crontab.guru/)
- [Slack Webhook Guide](https://api.slack.com/messaging/webhooks)
