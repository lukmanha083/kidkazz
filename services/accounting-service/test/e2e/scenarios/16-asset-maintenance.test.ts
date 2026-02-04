/**
 * E2E Test: Asset Maintenance
 *
 * Tests maintenance management for fixed assets:
 * - List scheduled maintenance
 * - List overdue maintenance
 * - Create maintenance record
 * - Update maintenance record
 * - Start/Complete/Cancel maintenance workflow
 * - Delete maintenance record
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';

describe('E2E: Asset Maintenance', () => {
  let apiClient: AccountingApiClient;
  let testAssetId: string | null = null;
  let testMaintenanceId: string | null = null;
  let maintenanceToDelete: string | null = null;

  const TODAY = new Date().toISOString().split('T')[0];
  const NEXT_MONTH = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(`Accounting service not reachable. Error: ${health.error}`);
    }

    console.log('\n');
    console.log('======================================================');
    console.log('          ASSET MAINTENANCE E2E TEST                  ');
    console.log('======================================================');
    console.log('');

    // Get an existing asset to use for tests
    const assets = await apiClient.listAssets({ limit: 1 });
    if (assets.ok && assets.data && assets.data.length > 0) {
      testAssetId = assets.data[0].id;
      console.log(`  Using asset for tests: ${assets.data[0].name} (${testAssetId})`);
    } else {
      console.log('  Warning: No assets found. Some tests may be skipped.');
    }
  }, 60000);

  describe('Phase 1: List Maintenance Records', () => {
    it('should list scheduled maintenance', async () => {
      const response = await apiClient.listScheduledMaintenance();

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`  Found ${response.data?.length} scheduled maintenance records`);

      if (response.data && response.data.length > 0) {
        const sample = response.data[0];
        console.log(`  Sample: ${sample.maintenanceType} for ${sample.assetName}`);
        console.log(`    Scheduled: ${sample.scheduledDate}`);
      }
    });

    it('should list overdue maintenance', async () => {
      const response = await apiClient.listOverdueMaintenance();

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      console.log(`  Found ${response.data?.length} overdue maintenance records`);

      if (response.data && response.data.length > 0) {
        for (const record of response.data) {
          console.log(`    - ${record.assetName}: ${record.daysOverdue} days overdue`);
        }
      }
    });

    it('should list maintenance for specific asset', async () => {
      if (!testAssetId) {
        console.log('  Skipping: No asset available for testing');
        return;
      }

      const response = await apiClient.listAssetMaintenance(testAssetId);

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      // All records should be for the same asset
      if (response.data && response.data.length > 0) {
        for (const record of response.data) {
          expect(record.assetId).toBe(testAssetId);
        }
        console.log(`  Found ${response.data.length} maintenance records for asset`);
      } else {
        console.log('  No maintenance records found for asset');
      }
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await apiClient.listAssetMaintenance('non-existent-id');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      console.log('  Correctly returned 404 for non-existent asset');
    });
  });

  describe('Phase 2: Create Maintenance Record', () => {
    it('should create preventive maintenance record', async () => {
      if (!testAssetId) {
        console.log('  Skipping: No asset available for testing');
        return;
      }

      const response = await apiClient.createMaintenance({
        assetId: testAssetId,
        maintenanceType: 'PREVENTIVE',
        description: 'E2E Test - Quarterly preventive maintenance',
        scheduledDate: NEXT_MONTH,
        cost: 500000,
        vendorName: 'E2E Test Vendor',
        notes: 'Created by E2E test',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.id).toBeDefined();
      expect(response.data?.maintenanceType).toBe('PREVENTIVE');
      expect(response.data?.status).toBe('SCHEDULED');

      testMaintenanceId = response.data?.id || null;

      console.log(`  Created maintenance: ${response.data?.id}`);
      console.log(`    Type: ${response.data?.maintenanceType}`);
      console.log(`    Status: ${response.data?.status}`);
      console.log(`    Scheduled: ${response.data?.scheduledDate}`);
    });

    it('should create corrective maintenance record', async () => {
      if (!testAssetId) {
        console.log('  Skipping: No asset available for testing');
        return;
      }

      const response = await apiClient.createMaintenance({
        assetId: testAssetId,
        maintenanceType: 'CORRECTIVE',
        description: 'E2E Test - Equipment repair',
        scheduledDate: TODAY,
        cost: 1000000,
        isCapitalized: false,
        notes: 'Urgent repair needed',
      });

      expect(response.ok).toBe(true);
      expect(response.data?.maintenanceType).toBe('CORRECTIVE');

      // Save for deletion test
      maintenanceToDelete = response.data?.id || null;

      console.log(`  Created corrective maintenance: ${response.data?.id}`);
    });

    it('should fail to create maintenance for non-existent asset', async () => {
      const response = await apiClient.createMaintenance({
        assetId: 'non-existent-asset-id',
        maintenanceType: 'INSPECTION',
        description: 'This should fail',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      console.log('  Correctly rejected maintenance for non-existent asset');
    });
  });

  describe('Phase 3: Update Maintenance Record', () => {
    it('should update maintenance description and cost', async () => {
      if (!testMaintenanceId) {
        console.log('  Skipping: No maintenance record available');
        return;
      }

      const response = await apiClient.updateMaintenance(testMaintenanceId, {
        description: 'E2E Test - Updated quarterly maintenance',
        cost: 750000,
        vendorName: 'Updated Vendor Name',
        notes: 'Updated by E2E test',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.description).toBe('E2E Test - Updated quarterly maintenance');
      expect(response.data?.cost).toBe(750000);
      expect(response.data?.vendorName).toBe('Updated Vendor Name');

      console.log(`  Updated maintenance: ${response.data?.id}`);
      console.log(`    New cost: Rp ${response.data?.cost?.toLocaleString()}`);
    });

    it('should return 404 for non-existent maintenance', async () => {
      const response = await apiClient.updateMaintenance('non-existent-id', {
        description: 'This should fail',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      console.log('  Correctly returned 404 for non-existent maintenance');
    });
  });

  describe('Phase 4: Maintenance Workflow', () => {
    it('should get maintenance by ID', async () => {
      if (!testMaintenanceId) {
        console.log('  Skipping: No maintenance record available');
        return;
      }

      const response = await apiClient.getMaintenance(testMaintenanceId);

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.id).toBe(testMaintenanceId);

      console.log(`  Retrieved maintenance: ${response.data?.id}`);
      console.log(`    Asset: ${response.data?.assetName}`);
      console.log(`    Type: ${response.data?.maintenanceType}`);
      console.log(`    Status: ${response.data?.status}`);
    });

    it('should start maintenance', async () => {
      if (!testMaintenanceId) {
        console.log('  Skipping: No maintenance record available');
        return;
      }

      const response = await apiClient.startMaintenance(testMaintenanceId);

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.status).toBe('IN_PROGRESS');

      console.log(`  Started maintenance: ${response.data?.id}`);
      console.log(`    Status: ${response.data?.status}`);
    });

    it('should complete maintenance', async () => {
      if (!testMaintenanceId) {
        console.log('  Skipping: No maintenance record available');
        return;
      }

      const response = await apiClient.completeMaintenance(testMaintenanceId, {
        performedDate: TODAY,
        actualCost: 725000,
        notes: 'Completed by E2E test',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.status).toBe('COMPLETED');

      console.log(`  Completed maintenance: ${response.data?.id}`);
      console.log(`    Status: ${response.data?.status}`);
    });

    it('should cancel maintenance', async () => {
      if (!maintenanceToDelete) {
        console.log('  Skipping: No maintenance record available for cancellation');
        return;
      }

      const response = await apiClient.cancelMaintenance(maintenanceToDelete, {
        reason: 'E2E Test - Cancelled for testing purposes',
      });

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.status).toBe('CANCELLED');

      console.log(`  Cancelled maintenance: ${response.data?.id}`);
      console.log(`    Reason: ${response.data?.cancellationReason}`);
    });
  });

  describe('Phase 5: Delete Maintenance', () => {
    it('should delete maintenance record', async () => {
      if (!maintenanceToDelete) {
        console.log('  Skipping: No maintenance record available for deletion');
        return;
      }

      const response = await apiClient.deleteMaintenance(maintenanceToDelete);

      expect(response.ok).toBe(true);

      console.log(`  Deleted maintenance: ${maintenanceToDelete}`);

      // Verify deletion
      const getResponse = await apiClient.getMaintenance(maintenanceToDelete);
      expect(getResponse.ok).toBe(false);
      expect(getResponse.status).toBe(404);

      console.log('  Verified: Record no longer exists');
    });

    it('should return 404 when deleting non-existent record', async () => {
      const response = await apiClient.deleteMaintenance('non-existent-id');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      console.log('  Correctly returned 404 for non-existent record');
    });
  });

  describe('Phase 6: Summary', () => {
    it('should display test summary', async () => {
      const scheduledResponse = await apiClient.listScheduledMaintenance();
      const overdueResponse = await apiClient.listOverdueMaintenance();

      console.log('\n');
      console.log('======================================================');
      console.log('          ASSET MAINTENANCE E2E TEST SUMMARY          ');
      console.log('======================================================');
      console.log(`  Scheduled Maintenance: ${scheduledResponse.data?.length || 0}`);
      console.log(`  Overdue Maintenance: ${overdueResponse.data?.length || 0}`);
      if (testMaintenanceId) {
        console.log(`  Test Maintenance ID: ${testMaintenanceId}`);
      }
      console.log('======================================================');
      console.log('');

      expect(true).toBe(true);
    });
  });
});
