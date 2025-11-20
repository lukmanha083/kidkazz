#!/usr/bin/env node

/**
 * DDD Integration Test
 * Tests Product Service and Inventory Service with new DDD + tRPC architecture
 */

const PRODUCT_SERVICE_URL = 'http://localhost:8788';
const INVENTORY_SERVICE_URL = 'http://localhost:8792';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🧪 Testing DDD + tRPC Integration\n');

  let results = [];

  // ============================================
  // PRODUCT SERVICE TESTS (DDD + tRPC)
  // ============================================
  console.log('📦 Product Service Tests\n');

  // Test 1: Create product via REST API (backward compatibility)
  let productId;
  results.push(await test('1️⃣ Create Product via REST API', async () => {
    const response = await fetch(`${PRODUCT_SERVICE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barcode: `TEST-${Date.now()}`,
        name: 'DDD Test Product',
        sku: `DDD-TEST-${Date.now()}`,
        price: 50000,
        retailPrice: 60000,
        wholesalePrice: 45000,
        baseUnit: 'pcs',
      }),
    });
    const data = await response.json();
    if (!data.id) throw new Error('No product ID returned');
    productId = data.id;
  }));

  // Test 2: Get product by ID
  results.push(await test('2️⃣ Get Product by ID (REST)', async () => {
    const response = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}`);
    const data = await response.json();
    if (data.id !== productId) throw new Error('Product ID mismatch');
    if (data.name !== 'DDD Test Product') throw new Error('Product name mismatch');
  }));

  // Test 3: Update stock (triggers domain event)
  results.push(await test('3️⃣ Update Stock (Domain Event)', async () => {
    const response = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: 100 }),
    });
    const data = await response.json();
    if (!data.message.includes('updated')) throw new Error('Stock update failed');
  }));

  // Test 4: Change price (business rule validation)
  results.push(await test('4️⃣ Change Price (Business Logic)', async () => {
    const response = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}/price`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceType: 'retail',
        newPrice: 75000
      }),
    });
    const data = await response.json();
    if (!data.message.includes('updated')) throw new Error('Price update failed');
  }));

  // ============================================
  // INVENTORY SERVICE TESTS (DDD + tRPC)
  // ============================================
  console.log('\n🏭 Inventory Service Tests\n');

  // Test 5: Create warehouse
  let warehouseId;
  results.push(await test('5️⃣ Create Warehouse (REST API)', async () => {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: `WH-DDD-${Date.now()}`,
        name: 'DDD Test Warehouse',
        addressLine1: 'Test Street 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        country: 'Indonesia',
      }),
    });
    const data = await response.json();
    if (!data.id) throw new Error('No warehouse ID returned');
    warehouseId = data.id;
  }));

  // Test 6: List warehouses
  results.push(await test('6️⃣ List Warehouses', async () => {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/warehouses`);
    const data = await response.json();
    if (!Array.isArray(data.warehouses)) throw new Error('No warehouses array');
    if (data.total === 0) throw new Error('No warehouses found');
  }));

  // Test 7: Adjust inventory (creates inventory record + triggers event)
  results.push(await test('7️⃣ Adjust Inventory IN (Domain Event)', async () => {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: productId,
        warehouseId: warehouseId,
        quantity: 50,
        movementType: 'in',
        reason: 'Initial stock for DDD test',
        performedBy: 'test-script',
      }),
    });
    const data = await response.json();
    if (!data.message.includes('successfully')) throw new Error('Inventory adjustment failed');
    if (data.newQuantity !== 50) throw new Error(`Expected 50, got ${data.newQuantity}`);
  }));

  // Test 8: Adjust inventory OUT (test negative stock business rule)
  results.push(await test('8️⃣ Adjust Inventory OUT - Allow Negative (Business Rule)', async () => {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: productId,
        warehouseId: warehouseId,
        quantity: 70, // More than available -> negative stock
        movementType: 'out',
        reason: 'Testing negative stock allowance',
        performedBy: 'test-script',
      }),
    });
    const data = await response.json();
    if (data.newQuantity !== -20) throw new Error(`Expected -20, got ${data.newQuantity}`);
  }));

  // Test 9: Get inventory for product
  results.push(await test('9️⃣ Get Inventory for Product', async () => {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/inventory/${productId}`);
    const data = await response.json();
    if (data.productId !== productId) throw new Error('Product ID mismatch');
    if (!Array.isArray(data.warehouses)) throw new Error('No warehouses array');
    if (data.totalAvailable !== -20) throw new Error(`Expected total -20, got ${data.totalAvailable}`);
  }));

  // Test 10: Get specific product-warehouse inventory
  results.push(await test('🔟 Get Specific Inventory Record', async () => {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/inventory/${productId}/${warehouseId}`);
    const data = await response.json();
    if (data.quantityAvailable !== -20) throw new Error(`Expected -20, got ${data.quantityAvailable}`);
  }));

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log(`\n📊 Test Results: ${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log(`❌ ${failed} test(s) failed\n`);
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    console.log('🎉 DDD + tRPC architecture is working correctly!\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
