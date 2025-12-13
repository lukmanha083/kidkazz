#!/usr/bin/env npx tsx
/**
 * Seed Test Data Script
 *
 * Creates test data for inventory service to enable Phase 6 validation testing.
 *
 * Usage:
 *   npx tsx scripts/seed-test-data.ts [options]
 *
 * Options:
 *   --inventory-url <url>  - Inventory service URL (default: http://localhost:8792)
 *   --clean                - Clean existing data before seeding
 *
 * Examples:
 *   npx tsx scripts/seed-test-data.ts
 *   npx tsx scripts/seed-test-data.ts --inventory-url http://localhost:8792
 */

interface SeedResult {
  warehouses: number;
  inventory: number;
  batches: number;
  errors: string[];
}

// Parse CLI arguments
function parseArgs(args: string[]): {
  inventoryUrl: string;
  clean: boolean;
} {
  let inventoryUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8792';
  let clean = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--inventory-url' && args[i + 1]) {
      inventoryUrl = args[++i];
    } else if (arg === '--clean') {
      clean = true;
    }
  }

  return { inventoryUrl, clean };
}

// Test data definitions
const testWarehouses = [
  {
    code: 'WH-JKT-01',
    name: 'Jakarta Main Warehouse',
    addressLine1: 'Jl. Industri Raya No. 123',
    addressLine2: 'Kawasan Industri Pulogadung',
    city: 'Jakarta Timur',
    province: 'DKI Jakarta',
    postalCode: '13920',
    country: 'Indonesia',
    contactName: 'Budi Santoso',
    contactPhone: '+62-21-4567890',
    contactEmail: 'warehouse.jkt@kidkazz.com',
    status: 'active',
  },
  {
    code: 'WH-SBY-01',
    name: 'Surabaya Distribution Center',
    addressLine1: 'Jl. Rungkut Industri No. 45',
    city: 'Surabaya',
    province: 'Jawa Timur',
    postalCode: '60293',
    country: 'Indonesia',
    contactName: 'Dewi Lestari',
    contactPhone: '+62-31-8765432',
    contactEmail: 'warehouse.sby@kidkazz.com',
    status: 'active',
  },
  {
    code: 'WH-BDG-01',
    name: 'Bandung Storage Facility',
    addressLine1: 'Jl. Soekarno Hatta No. 789',
    city: 'Bandung',
    province: 'Jawa Barat',
    postalCode: '40286',
    country: 'Indonesia',
    contactName: 'Agus Wijaya',
    contactPhone: '+62-22-7654321',
    contactEmail: 'warehouse.bdg@kidkazz.com',
    status: 'active',
  },
];

// Test products (simulated - these would come from product service)
const testProducts = [
  { id: 'prod-001', name: 'Baby Diapers Size M', sku: 'DIAPER-M-001' },
  { id: 'prod-002', name: 'Baby Formula Milk 400g', sku: 'FORMULA-400-001' },
  { id: 'prod-003', name: 'Baby Wipes 80pcs', sku: 'WIPES-80-001' },
  { id: 'prod-004', name: 'Baby Shampoo 200ml', sku: 'SHAMPOO-200-001' },
  { id: 'prod-005', name: 'Baby Lotion 150ml', sku: 'LOTION-150-001' },
];

// Seed warehouses
async function seedWarehouses(baseUrl: string): Promise<{ ids: string[]; errors: string[] }> {
  const ids: string[] = [];
  const errors: string[] = [];

  console.log('\n📦 Seeding Warehouses...');

  for (const warehouse of testWarehouses) {
    try {
      const response = await fetch(`${baseUrl}/api/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouse),
      });

      if (response.ok) {
        const data = await response.json();
        ids.push(data.id);
        console.log(`   ✅ Created warehouse: ${warehouse.name} (${data.id})`);
      } else {
        const error = await response.text();
        // Check if it's a duplicate
        if (response.status === 409 || error.includes('UNIQUE constraint')) {
          // Try to fetch existing warehouse
          const listResponse = await fetch(`${baseUrl}/api/warehouses`);
          if (listResponse.ok) {
            const listData = await listResponse.json();
            const existing = listData.warehouses?.find((w: any) => w.code === warehouse.code);
            if (existing) {
              ids.push(existing.id);
              console.log(`   ⏭️  Warehouse exists: ${warehouse.name} (${existing.id})`);
              continue;
            }
          }
        }
        errors.push(`Failed to create warehouse ${warehouse.code}: ${error}`);
        console.log(`   ❌ Failed: ${warehouse.name} - ${error}`);
      }
    } catch (error) {
      errors.push(`Error creating warehouse ${warehouse.code}: ${error}`);
      console.log(`   ❌ Error: ${warehouse.name} - ${error}`);
    }
  }

  return { ids, errors };
}

// Seed inventory records
async function seedInventory(
  baseUrl: string,
  warehouseIds: string[]
): Promise<{ count: number; inventoryIds: string[]; errors: string[] }> {
  let count = 0;
  const inventoryIds: string[] = [];
  const errors: string[] = [];

  console.log('\n📊 Seeding Inventory Records...');

  for (const product of testProducts) {
    // Add inventory to first 2 warehouses for each product
    for (let i = 0; i < Math.min(2, warehouseIds.length); i++) {
      const warehouseId = warehouseIds[i];
      const quantity = Math.floor(Math.random() * 500) + 50; // 50-550 units

      try {
        const response = await fetch(`${baseUrl}/api/inventory/adjust`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouseId,
            productId: product.id,
            quantity,
            movementType: 'in',
            reason: 'Initial stock seeding',
            notes: 'Test data for Phase 6 validation',
            performedBy: 'seed-script',
            rack: `R${Math.floor(Math.random() * 10) + 1}`,
            bin: `B${Math.floor(Math.random() * 20) + 1}`,
            zone: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
            aisle: `${Math.floor(Math.random() * 5) + 1}`,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.inventoryId) {
            inventoryIds.push(data.inventoryId);
          }
          count++;
          console.log(`   ✅ Added ${quantity} units of ${product.sku} to warehouse ${i + 1}`);
        } else {
          const error = await response.text();
          errors.push(`Failed to add inventory for ${product.sku}: ${error}`);
          console.log(`   ❌ Failed: ${product.sku} - ${error}`);
        }
      } catch (error) {
        errors.push(`Error adding inventory for ${product.sku}: ${error}`);
        console.log(`   ❌ Error: ${product.sku} - ${error}`);
      }
    }
  }

  // Add some low stock items for testing low stock alerts
  if (warehouseIds.length > 0) {
    console.log('\n   Adding low stock items...');
    const lowStockProducts = [
      { id: 'prod-low-001', sku: 'LOWSTOCK-001', quantity: 5 },
      { id: 'prod-low-002', sku: 'LOWSTOCK-002', quantity: 3 },
    ];

    for (const product of lowStockProducts) {
      try {
        const response = await fetch(`${baseUrl}/api/inventory/adjust`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouseId: warehouseIds[0],
            productId: product.id,
            quantity: product.quantity,
            movementType: 'in',
            reason: 'Low stock test item',
            performedBy: 'seed-script',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.inventoryId) {
            inventoryIds.push(data.inventoryId);
          }
          count++;
          console.log(`   ✅ Added low stock item: ${product.sku} (${product.quantity} units)`);
        }
      } catch (error) {
        console.log(`   ⚠️ Could not add low stock item: ${product.sku}`);
      }
    }
  }

  return { count, inventoryIds, errors };
}

// Seed inventory batches (for products with expiration dates)
async function seedBatches(
  baseUrl: string,
  warehouseIds: string[]
): Promise<{ count: number; errors: string[] }> {
  let count = 0;
  const errors: string[] = [];

  console.log('\n📅 Seeding Inventory Batches...');

  // First, get inventory records to link batches to
  let inventoryRecords: any[] = [];
  try {
    const response = await fetch(`${baseUrl}/api/inventory`);
    if (response.ok) {
      const data = await response.json();
      inventoryRecords = data.inventory || [];
    }
  } catch (error) {
    console.log('   ⚠️ Could not fetch inventory records for batch creation');
    return { count, errors };
  }

  if (inventoryRecords.length === 0) {
    console.log('   ⚠️ No inventory records found to create batches for');
    return { count, errors };
  }

  // Create batches for perishable products (formula milk)
  const formulaInventory = inventoryRecords.filter((inv: any) =>
    inv.productId === 'prod-002'
  );

  for (const inv of formulaInventory) {
    // Create batch expiring in 30 days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + 23); // Alert 7 days before expiration

    try {
      const response = await fetch(`${baseUrl}/api/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: inv.id,
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          batchNumber: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          lotNumber: `LOT-2024-${Math.floor(Math.random() * 1000)}`,
          expirationDate: expirationDate.toISOString(),
          alertDate: alertDate.toISOString(),
          manufactureDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          quantityAvailable: Math.floor(inv.quantityAvailable / 2),
          receivedDate: new Date().toISOString(),
          supplier: 'PT Nutrisi Indonesia',
          cost: 45000, // IDR 45,000 per unit
          createdBy: 'seed-script',
        }),
      });

      if (response.ok) {
        count++;
        console.log(`   ✅ Created batch for product ${inv.productId} in warehouse ${inv.warehouseId}`);
      } else {
        const error = await response.text();
        errors.push(`Failed to create batch: ${error}`);
        console.log(`   ❌ Failed to create batch: ${error}`);
      }
    } catch (error) {
      errors.push(`Error creating batch: ${error}`);
      console.log(`   ❌ Error creating batch: ${error}`);
    }
  }

  // Create a batch expiring soon (for testing expiration alerts)
  if (formulaInventory.length > 0) {
    const inv = formulaInventory[0];
    const soonExpirationDate = new Date();
    soonExpirationDate.setDate(soonExpirationDate.getDate() + 7); // Expires in 7 days

    try {
      const response = await fetch(`${baseUrl}/api/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: inv.id,
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          batchNumber: `BATCH-EXPIRING-SOON-${Date.now()}`,
          lotNumber: 'LOT-2024-URGENT',
          expirationDate: soonExpirationDate.toISOString(),
          alertDate: new Date().toISOString(), // Alert now
          quantityAvailable: 10,
          supplier: 'PT Nutrisi Indonesia',
          cost: 45000,
          createdBy: 'seed-script',
        }),
      });

      if (response.ok) {
        count++;
        console.log(`   ✅ Created expiring-soon batch for testing`);
      }
    } catch (error) {
      console.log(`   ⚠️ Could not create expiring-soon batch`);
    }
  }

  return { count, errors };
}

// Main function
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { inventoryUrl, clean } = parseArgs(args);

  console.log('\n🌱 Seed Test Data Script');
  console.log('=' .repeat(60));
  console.log(`Inventory Service: ${inventoryUrl}`);
  console.log('='.repeat(60));

  // Check connection
  try {
    const response = await fetch(`${inventoryUrl}/api/inventory`);
    if (!response.ok) {
      console.error(`\n❌ Cannot connect to inventory service at ${inventoryUrl}`);
      console.error('   Make sure the inventory service is running.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Cannot connect to inventory service at ${inventoryUrl}`);
    console.error(`   Error: ${error}`);
    console.error('   Make sure the inventory service is running.');
    process.exit(1);
  }

  const result: SeedResult = {
    warehouses: 0,
    inventory: 0,
    batches: 0,
    errors: [],
  };

  // Seed warehouses
  const warehouseResult = await seedWarehouses(inventoryUrl);
  result.warehouses = warehouseResult.ids.length;
  result.errors.push(...warehouseResult.errors);

  // Seed inventory
  if (warehouseResult.ids.length > 0) {
    const inventoryResult = await seedInventory(inventoryUrl, warehouseResult.ids);
    result.inventory = inventoryResult.count;
    result.errors.push(...inventoryResult.errors);

    // Seed batches
    const batchResult = await seedBatches(inventoryUrl, warehouseResult.ids);
    result.batches = batchResult.count;
    result.errors.push(...batchResult.errors);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SEED SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Warehouses created: ${result.warehouses}`);
  console.log(`   Inventory records:  ${result.inventory}`);
  console.log(`   Batches created:    ${result.batches}`);

  if (result.errors.length > 0) {
    console.log(`\n   ⚠️ Errors: ${result.errors.length}`);
    result.errors.forEach((err, i) => console.log(`      ${i + 1}. ${err}`));
  }

  console.log('\n✅ Seed complete!\n');
  console.log('You can now run the Phase 6 validation:');
  console.log(`   pnpm dlx tsx scripts/phase6-validation.ts all --inventory-url ${inventoryUrl}\n`);
}

// Run
main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
