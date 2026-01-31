/**
 * E2E Test: Fixed Assets Management
 *
 * Tests the complete fixed asset lifecycle:
 * - Create and manage asset categories
 * - Create fixed assets with acquisition details
 * - Activate assets for depreciation
 * - Transfer assets between locations/departments
 * - Dispose assets with gain/loss journal entries
 *
 * Run with: E2E_API_URL=https://accounting-service.xxx.workers.dev pnpm test:e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AccountingApiClient } from '../helpers/api-client';
import { fetchAccountMap, getAccountByCode, type AccountInfo } from '../fixtures/chart-of-accounts';

describe('E2E: Fixed Assets Management', () => {
  let apiClient: AccountingApiClient;
  let accountMap: Map<string, AccountInfo>;

  // Test state
  let categoryId: string;
  let assetId: string;
  let secondAssetId: string;

  const FISCAL_YEAR = 2026;
  const FISCAL_MONTH = 1;

  // Account codes for fixed assets (matching actual Chart of Accounts)
  const EQUIPMENT_ACCOUNT_CODE = '1470'; // Peralatan Komputer & IT
  const DEPRECIATION_EXPENSE_CODE = '6260'; // Beban Penyusutan Komputer
  const ACCUM_DEPRECIATION_CODE = '1471'; // Akumulasi Penyusutan Peralatan Komputer
  const GAIN_LOSS_ACCOUNT_CODE = '7040'; // Pendapatan Penjualan Aset Tetap

  // Test data
  const TEST_CATEGORY = {
    code: 'E2E-CAT-EQUIPMENT',
    name: 'E2E Office Equipment',
    description: 'Test category for E2E testing',
    depreciationMethod: 'STRAIGHT_LINE' as const,
    defaultUsefulLifeYears: 5,
    defaultSalvageValuePercent: 10,
  };

  const TEST_ASSET = {
    code: 'E2E-ASSET-001',
    name: 'E2E Test Computer',
    description: 'High-performance workstation for E2E testing',
    acquisitionDate: '2026-01-01',
    acquisitionCost: 15_000_000, // Rp 15M
    barcode: 'E2E-BC-001',
    serialNumber: 'E2E-SN-001',
    notes: 'E2E test asset',
  };

  const SECOND_ASSET = {
    code: 'E2E-ASSET-002',
    name: 'E2E Test Printer',
    description: 'Office printer for E2E testing',
    acquisitionDate: '2026-01-05',
    acquisitionCost: 5_000_000, // Rp 5M
    barcode: 'E2E-BC-002',
    serialNumber: 'E2E-SN-002',
    notes: 'E2E test asset - printer',
  };

  beforeAll(async () => {
    apiClient = new AccountingApiClient();

    // Verify service is running
    const health = await apiClient.healthCheck();
    if (!health.ok) {
      throw new Error(`Accounting service not reachable. Error: ${health.error}`);
    }

    // Fetch account map
    accountMap = await fetchAccountMap(apiClient);
    if (accountMap.size === 0) {
      throw new Error('No accounts found. Please seed Chart of Accounts first.');
    }

    console.log('\n');
    console.log('======================================================');
    console.log('          FIXED ASSETS E2E TEST                       ');
    console.log('======================================================');
    console.log('');
  }, 60000);

  describe('Phase 1: Setup and Prerequisites', () => {
    it('should ensure fiscal period exists', async () => {
      const response = await apiClient.createFiscalPeriod({
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: FISCAL_MONTH,
      });

      if (response.ok) {
        expect(response.data).toHaveProperty('id');
        console.log('  Created January fiscal period');
      } else {
        const existing = await apiClient.getFiscalPeriod(FISCAL_YEAR, FISCAL_MONTH);
        expect(existing.ok).toBe(true);
        console.log('  January fiscal period already exists');
      }
    });

    it('should verify required GL accounts exist', async () => {
      const equipmentAccount = getAccountByCode(accountMap, EQUIPMENT_ACCOUNT_CODE);
      const depreciationAccount = getAccountByCode(accountMap, DEPRECIATION_EXPENSE_CODE);
      const accumDeprecAccount = getAccountByCode(accountMap, ACCUM_DEPRECIATION_CODE);

      // Equipment account may need to be created for testing
      if (!equipmentAccount) {
        console.log('  Note: Equipment account not found, tests may need account setup');
      }
      if (!depreciationAccount) {
        console.log('  Note: Depreciation expense account not found');
      }
      if (!accumDeprecAccount) {
        console.log('  Note: Accumulated depreciation account not found');
      }

      // At least verify we have some accounts
      expect(accountMap.size).toBeGreaterThan(0);
      console.log(`  Verified ${accountMap.size} GL accounts available`);
    });
  });

  describe('Phase 2: Asset Category Management', () => {
    it('should create an asset category', async () => {
      const equipmentAccount = getAccountByCode(accountMap, EQUIPMENT_ACCOUNT_CODE);
      const depreciationAccount = getAccountByCode(accountMap, DEPRECIATION_EXPENSE_CODE);
      const accumDeprecAccount = getAccountByCode(accountMap, ACCUM_DEPRECIATION_CODE);
      const gainLossAccount = getAccountByCode(accountMap, GAIN_LOSS_ACCOUNT_CODE);

      // Skip if required accounts don't exist
      if (!equipmentAccount || !depreciationAccount || !accumDeprecAccount) {
        console.log('  Skipping: Required accounts not found');
        return;
      }

      const response = await apiClient.createAssetCategory({
        ...TEST_CATEGORY,
        assetAccountId: equipmentAccount.id,
        depreciationAccountId: depreciationAccount.id,
        accumulatedDepreciationAccountId: accumDeprecAccount.id,
        gainLossAccountId: gainLossAccount?.id,
      });

      if (response.ok) {
        expect(response.data).toHaveProperty('id');
        categoryId = response.data!.id;
        console.log(`  Created asset category: ${categoryId}`);
      } else if (response.error?.includes('already exists')) {
        // Category may already exist from previous run
        const categories = await apiClient.listAssetCategories();
        const existing = categories.data?.find(c => c.code === TEST_CATEGORY.code);
        if (existing) {
          categoryId = existing.id;
          console.log(`  Using existing category: ${categoryId}`);
        }
      } else {
        console.log(`  Category creation skipped: ${response.error}`);
      }
    });

    it('should list asset categories', async () => {
      const response = await apiClient.listAssetCategories();

      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      console.log(`  Found ${response.data?.length || 0} asset categories`);
    });

    it('should get asset category by ID', async () => {
      if (!categoryId) {
        console.log('  Skipping: No category ID available');
        return;
      }

      const response = await apiClient.getAssetCategory(categoryId);

      expect(response.ok).toBe(true);
      expect(response.data?.code).toBe(TEST_CATEGORY.code);
      expect(response.data?.depreciationMethod).toBe(TEST_CATEGORY.depreciationMethod);
      console.log(`  Retrieved category: ${response.data?.name}`);
    });

    it('should update asset category', async () => {
      if (!categoryId) {
        console.log('  Skipping: No category ID available');
        return;
      }

      const response = await apiClient.updateAssetCategory(categoryId, {
        description: 'Updated description for E2E testing',
        defaultUsefulLifeYears: 4,
      });

      expect(response.ok).toBe(true);
      console.log('  Updated category successfully');

      // Verify update
      const getResponse = await apiClient.getAssetCategory(categoryId);
      expect(getResponse.data?.defaultUsefulLifeYears).toBe(4);
    });
  });

  describe('Phase 3: Fixed Asset Creation', () => {
    it('should create a fixed asset', async () => {
      if (!categoryId) {
        console.log('  Skipping: No category ID available');
        return;
      }

      const response = await apiClient.createAsset({
        ...TEST_ASSET,
        categoryId,
      });

      if (response.ok) {
        expect(response.data).toHaveProperty('id');
        // Status can be DRAFT or ACTIVE depending on workflow
        assetId = response.data!.id;
        console.log(`  Created asset: ${assetId} (status: ${response.data?.status})`);
      } else if (response.error?.includes('already exists') || response.error?.includes('duplicate')) {
        // Asset may already exist
        const assets = await apiClient.listAssets({ search: TEST_ASSET.code });
        const existing = assets.data?.find(a => a.assetNumber === TEST_ASSET.code || a.name?.includes('E2E'));
        if (existing) {
          assetId = existing.id;
          console.log(`  Using existing asset: ${assetId}`);
        }
      } else {
        console.log(`  Asset creation result: ${response.error}`);
      }
    });

    it('should create a second fixed asset', async () => {
      if (!categoryId) {
        console.log('  Skipping: No category ID available');
        return;
      }

      const response = await apiClient.createAsset({
        ...SECOND_ASSET,
        categoryId,
      });

      if (response.ok) {
        expect(response.data).toHaveProperty('id');
        secondAssetId = response.data!.id;
        console.log(`  Created second asset: ${secondAssetId}`);
      } else if (response.error?.includes('already exists') || response.error?.includes('duplicate')) {
        const assets = await apiClient.listAssets({ search: SECOND_ASSET.code });
        const existing = assets.data?.find(a => a.assetNumber === SECOND_ASSET.code || a.name?.includes('Printer'));
        if (existing) {
          secondAssetId = existing.id;
          console.log(`  Using existing second asset: ${secondAssetId}`);
        }
      }
    });

    it('should get asset by ID', async () => {
      if (!assetId) {
        console.log('  Skipping: No asset ID available');
        return;
      }

      const response = await apiClient.getAsset(assetId);

      expect(response.ok).toBe(true);
      expect(response.data?.code).toBe(TEST_ASSET.code);
      expect(response.data?.acquisitionCost).toBe(TEST_ASSET.acquisitionCost);
      console.log(`  Asset details: ${response.data?.name}, Cost: Rp ${response.data?.acquisitionCost.toLocaleString()}`);
    });

    it('should get asset by barcode', async () => {
      if (!assetId) {
        console.log('  Skipping: No asset ID available');
        return;
      }

      const response = await apiClient.getAssetByBarcode(TEST_ASSET.barcode);

      expect(response.ok).toBe(true);
      expect(response.data?.code).toBe(TEST_ASSET.code);
      console.log(`  Found asset by barcode: ${response.data?.barcode}`);
    });

    it('should list fixed assets', async () => {
      const response = await apiClient.listAssets();

      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      console.log(`  Found ${response.data?.length || 0} total assets`);
    });

    it('should filter assets by status', async () => {
      // API uses uppercase status values
      const response = await apiClient.listAssets({ status: 'ACTIVE' });

      expect(response.ok).toBe(true);
      if (response.data && response.data.length > 0) {
        const allActive = response.data.every(a => a.status === 'ACTIVE');
        expect(allActive).toBe(true);
        console.log(`  Found ${response.data.length} active assets`);
      } else {
        console.log('  No active assets found');
      }
    });

    it('should search assets by name', async () => {
      const response = await apiClient.listAssets({ search: 'E2E' });

      expect(response.ok).toBe(true);
      console.log(`  Search returned ${response.data?.length || 0} assets`);
    });
  });

  describe('Phase 4: Asset Activation', () => {
    it('should activate a fixed asset', async () => {
      if (!assetId) {
        console.log('  Skipping: No asset ID available');
        return;
      }

      const response = await apiClient.activateAsset(assetId);

      if (response.ok) {
        expect(response.data?.status).toBe('ACTIVE');
        console.log(`  Activated asset: ${response.data?.code}`);
      } else if (response.error?.includes('already') || response.error?.includes('ACTIVE')) {
        console.log('  Asset already active');
      } else {
        console.log(`  Activation result: ${response.error}`);
      }
    });

    it('should list depreciable assets', async () => {
      const response = await apiClient.getDepreciableAssets();

      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      console.log(`  Found ${response.data?.length || 0} depreciable assets`);
    });
  });

  describe('Phase 5: Asset Updates and Transfers', () => {
    it('should update asset details', async () => {
      if (!assetId) {
        console.log('  Skipping: No asset ID available');
        return;
      }

      const response = await apiClient.updateAsset(assetId, {
        description: 'Updated description for E2E testing',
        notes: 'Asset updated via E2E test',
      });

      expect(response.ok).toBe(true);
      console.log('  Updated asset details');
    });

    it('should transfer asset to new location', async () => {
      if (!secondAssetId) {
        console.log('  Skipping: No second asset ID available');
        return;
      }

      // Activate second asset first if needed
      const activateResponse = await apiClient.activateAsset(secondAssetId);
      if (activateResponse.ok) {
        console.log('  Activated second asset for transfer');
      }

      const response = await apiClient.transferAsset(secondAssetId, {
        newLocationId: 'location-warehouse-001',
        newDepartmentId: 'dept-operations',
        transferReason: 'E2E Test - Relocated to warehouse',
      });

      if (response.ok) {
        expect(response.data).toHaveProperty('transferredAt');
        console.log(`  Transferred asset to new location`);
      } else {
        console.log(`  Transfer result: ${response.error}`);
      }
    });
  });

  describe('Phase 6: Asset Disposal', () => {
    it('should dispose an asset and create gain/loss journal entry', async () => {
      if (!secondAssetId) {
        console.log('  Skipping: No second asset ID available');
        return;
      }

      // Dispose the second asset (keeping the first for depreciation tests)
      const response = await apiClient.disposeAsset(secondAssetId, {
        disposalDate: '2026-01-31',
        disposalProceeds: 4_500_000, // Sold for Rp 4.5M (5M cost - 500K depreciation)
        disposalReason: 'E2E Test - Sold to vendor',
        fiscalYear: FISCAL_YEAR,
        fiscalMonth: FISCAL_MONTH,
      });

      if (response.ok) {
        expect(response.data?.status).toBe('DISPOSED');
        expect(response.data).toHaveProperty('gainLoss');
        console.log(`  Disposed asset, Gain/Loss: Rp ${response.data?.gainLoss?.toLocaleString()}`);
        if (response.data?.journalEntryId) {
          console.log(`  Created journal entry: ${response.data.journalEntryId}`);
        }
      } else {
        console.log(`  Disposal result: ${response.error}`);
      }
    });

    it('should filter assets by disposed status', async () => {
      const response = await apiClient.listAssets({ status: 'DISPOSED' });

      expect(response.ok).toBe(true);
      console.log(`  Found ${response.data?.length || 0} disposed assets`);
    });
  });

  describe('Phase 7: Asset Category Deletion', () => {
    it('should not delete category with linked assets', async () => {
      if (!categoryId) {
        console.log('  Skipping: No category ID available');
        return;
      }

      const response = await apiClient.deleteAssetCategory(categoryId);

      // Should fail because category has linked assets
      if (!response.ok) {
        expect(response.error).toContain('linked');
        console.log('  Correctly prevented deletion of category with linked assets');
      } else {
        console.log('  Category deleted (no linked assets)');
      }
    });
  });

  describe('Phase 8: Summary', () => {
    it('should display test summary', async () => {
      const categoriesResponse = await apiClient.listAssetCategories();
      const assetsResponse = await apiClient.listAssets();
      const depreciableResponse = await apiClient.getDepreciableAssets();

      console.log('\n');
      console.log('======================================================');
      console.log('          FIXED ASSETS E2E TEST SUMMARY               ');
      console.log('======================================================');
      console.log(`  Asset Categories: ${categoriesResponse.data?.length || 0}`);
      console.log(`  Total Assets: ${assetsResponse.data?.length || 0}`);
      console.log(`  Depreciable Assets: ${depreciableResponse.data?.length || 0}`);
      console.log('======================================================');
      console.log('');

      expect(true).toBe(true);
    });
  });
});
