/**
 * Scheduled Tasks (Cron Jobs) for Inventory Service
 *
 * Configured in wrangler.toml with cron triggers
 */

type Bindings = {
  DB: D1Database;
  PRODUCT_SERVICE: Fetcher;
  SLACK_WEBHOOK_URL?: string; // Optional: for alerts
};

interface OrphanCheckResult {
  totalOrphaned: number;
  orphanedData?: any;
  summary?: any;
  message?: string;
}

/**
 * Daily orphan check - runs at 8 AM UTC
 * Checks for orphaned inventory records and sends alerts if found
 */
export async function scheduledOrphanCheck(env: Bindings): Promise<void> {
  console.log('🔍 Running scheduled orphan check...');

  try {
    // Check orphaned inventory
    const inventoryCheckUrl = 'http://localhost:8792/api/cleanup/orphaned-inventory/check';
    const inventoryResponse = await fetch(inventoryCheckUrl);

    if (!inventoryResponse.ok) {
      throw new Error(`Inventory check failed: ${inventoryResponse.status}`);
    }

    const inventoryCheck: OrphanCheckResult = await inventoryResponse.json();

    // Check orphaned locations via Product Service
    const locationsCheckUrl = 'http://localhost:8788/api/cleanup/orphaned-locations/check';
    let locationsCheck: OrphanCheckResult | null = null;

    try {
      // This requires PRODUCT_SERVICE Fetcher binding
      // For internal service calls, use Fetcher instead of fetch
      const locationResponse = await env.PRODUCT_SERVICE.fetch(
        new Request('http://product-service/api/cleanup/orphaned-locations/check')
      );

      if (locationResponse.ok) {
        locationsCheck = await locationResponse.json();
      }
    } catch (error) {
      console.error('Failed to check locations:', error);
    }

    const totalOrphans =
      (inventoryCheck?.totalOrphaned || 0) +
      (locationsCheck?.totalOrphaned || 0);

    // Log results
    console.log('📊 Orphan Check Results:');
    console.log(`  - Orphaned Inventory: ${inventoryCheck.totalOrphaned}`);
    console.log(`  - Orphaned Locations: ${locationsCheck?.totalOrphaned || 'N/A'}`);
    console.log(`  - Total: ${totalOrphans}`);

    // Send alert if orphans found
    if (totalOrphans > 0) {
      const alertMessage = `⚠️ Orphaned Data Alert!\n\n` +
        `Orphaned Inventory: ${inventoryCheck.totalOrphaned}\n` +
        `Orphaned Locations: ${locationsCheck?.totalOrphaned || 0}\n` +
        `Total: ${totalOrphans}\n\n` +
        `Action Required: Review and clean up orphaned data at /admin/maintenance`;

      console.warn(alertMessage);

      // Send to Slack if webhook configured
      if (env.SLACK_WEBHOOK_URL) {
        await sendSlackAlert(env.SLACK_WEBHOOK_URL, {
          title: '⚠️ Database Maintenance Alert',
          message: alertMessage,
          severity: 'warning',
          orphanDetails: {
            inventory: inventoryCheck.totalOrphaned,
            locations: locationsCheck?.totalOrphaned || 0,
            total: totalOrphans,
          },
        });
      }
    } else {
      console.log('✅ No orphaned data detected - system healthy!');
    }
  } catch (error) {
    console.error('❌ Scheduled orphan check failed:', error);

    // Send error alert
    if (env.SLACK_WEBHOOK_URL) {
      await sendSlackAlert(env.SLACK_WEBHOOK_URL, {
        title: '❌ Orphan Check Failed',
        message: `Scheduled orphan check encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  }
}

/**
 * Weekly database health report - runs Sunday at 9 AM UTC
 */
export async function scheduledHealthReport(env: Bindings): Promise<void> {
  console.log('📋 Generating weekly health report...');

  try {
    const report = {
      timestamp: new Date().toISOString(),
      checks: {
        orphanedInventory: 0,
        orphanedLocations: 0,
        totalInventoryRecords: 0,
        totalWarehouses: 0,
      },
    };

    // Get inventory stats
    const inventoryResponse = await fetch('http://localhost:8792/api/cleanup/orphaned-inventory/check');
    if (inventoryResponse.ok) {
      const data = await inventoryResponse.json();
      report.checks.orphanedInventory = data.totalOrphaned;
      report.checks.totalInventoryRecords = data.summary?.totalInventoryRecords || 0;
    }

    // Get location stats
    try {
      const locationResponse = await env.PRODUCT_SERVICE.fetch(
        new Request('http://product-service/api/cleanup/orphaned-locations/check')
      );
      if (locationResponse.ok) {
        const data = await locationResponse.json();
        report.checks.orphanedLocations = data.totalOrphaned;
      }
    } catch (error) {
      console.error('Failed to get location stats:', error);
    }

    console.log('📊 Weekly Health Report:', JSON.stringify(report, null, 2));

    // Send to Slack
    if (env.SLACK_WEBHOOK_URL) {
      await sendSlackAlert(env.SLACK_WEBHOOK_URL, {
        title: '📋 Weekly Database Health Report',
        message: `Database Health Status:\n` +
          `- Orphaned Inventory: ${report.checks.orphanedInventory}\n` +
          `- Orphaned Locations: ${report.checks.orphanedLocations}\n` +
          `- Total Inventory Records: ${report.checks.totalInventoryRecords}\n` +
          `\nStatus: ${report.checks.orphanedInventory + report.checks.orphanedLocations === 0 ? '✅ Healthy' : '⚠️ Needs Attention'}`,
        severity: report.checks.orphanedInventory + report.checks.orphanedLocations === 0 ? 'info' : 'warning',
      });
    }
  } catch (error) {
    console.error('❌ Health report generation failed:', error);
  }
}

/**
 * Send alert to Slack
 */
async function sendSlackAlert(
  webhookUrl: string,
  alert: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    orphanDetails?: any;
  }
): Promise<void> {
  try {
    const color = {
      info: '#36a64f',      // Green
      warning: '#ff9800',   // Orange
      error: '#f44336',     // Red
    }[alert.severity];

    const payload = {
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: alert.orphanDetails ? [
            {
              title: 'Orphaned Inventory',
              value: alert.orphanDetails.inventory.toString(),
              short: true,
            },
            {
              title: 'Orphaned Locations',
              value: alert.orphanDetails.locations.toString(),
              short: true,
            },
          ] : undefined,
          footer: 'Kidkazz Database Monitoring',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send Slack alert:', response.status);
    } else {
      console.log('✅ Slack alert sent successfully');
    }
  } catch (error) {
    console.error('Error sending Slack alert:', error);
  }
}

/**
 * Main scheduled event handler
 * Called by Cloudflare Workers cron trigger
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  const cron = event.cron;

  console.log(`⏰ Cron trigger: ${cron}`);

  // Daily orphan check (8 AM UTC)
  if (cron === '0 8 * * *') {
    ctx.waitUntil(scheduledOrphanCheck(env));
  }

  // Weekly health report (Sunday 9 AM UTC)
  if (cron === '0 9 * * 0') {
    ctx.waitUntil(scheduledHealthReport(env));
  }
}
