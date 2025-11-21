/**
 * End-to-End Integration Test Suite
 * Tests complete workflows across Product and Inventory services
 *
 * Covers:
 * - Product CRUD with physical attributes
 * - Warehouse CRUD
 * - Inventory management with business rules
 * - Cross-service integration
 */

const PRODUCT_SERVICE_URL = 'http://localhost:8788';
const INVENTORY_SERVICE_URL = 'http://localhost:8792';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(message) {
  console.log(`\n${colors.yellow}${'='.repeat(80)}\n${message}\n${'='.repeat(80)}${colors.reset}\n`);
}

async function apiCall(service, endpoint, method = 'GET', body = null) {
  const baseUrl = service === 'product' ? PRODUCT_SERVICE_URL : INVENTORY_SERVICE_URL;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function runTests() {
  const timestamp = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;
  const testData = {};

  try {
    logSection('E2E INTEGRATION TEST SUITE - Complete Workflow');

    // ================================================================
    // TEST 1: Create Product with Physical Attributes
    // ================================================================
    logSection('TEST 1: Create Product with Physical Attributes');

    const productData = {
      barcode: `TEST-E2E-${timestamp}`,
      sku: `SKU-E2E-${timestamp}`,
      name: 'E2E Test Product with Dimensions',
      description: 'Product for end-to-end testing',
      price: 50000,
      retailPrice: 60000,
      wholesalePrice: 45000,
      baseUnit: 'PCS',
      weight: 2.5,    // 2.5 kg
      length: 30,     // 30 cm
      width: 20,      // 20 cm
      height: 15,     // 15 cm
    };

    const createProduct = await apiCall('product', '/api/products', 'POST', productData);

    // Product service returns the product directly (status 201), not wrapped
    if (createProduct.status === 201 && createProduct.data.id) {
      testData.productId = createProduct.data.id;
      log('✅ TEST 1 PASSED: Product created with physical attributes', 'green');
      log(`   Product ID: ${testData.productId}`, 'blue');
      log(`   Weight: ${productData.weight}kg, Dimensions: ${productData.length}x${productData.width}x${productData.height}cm`, 'blue');
      testsPassed++;
    } else {
      log('❌ TEST 1 FAILED: Could not create product', 'red');
      log(`   Status: ${createProduct.status}, Response: ${JSON.stringify(createProduct.data)}`, 'red');
      testsFailed++;
      throw new Error('Cannot continue without product');
    }

    // ================================================================
    // TEST 2: Verify Product Physical Attributes
    // ================================================================
    logSection('TEST 2: Verify Product Physical Attributes Persisted');

    const getProduct = await apiCall('product', `/api/products/${testData.productId}`, 'GET');

    if (getProduct.status === 200 &&
        getProduct.data.weight === productData.weight &&
        getProduct.data.length === productData.length) {
      log('✅ TEST 2 PASSED: Physical attributes correctly persisted', 'green');
      testsPassed++;
    } else {
      log('❌ TEST 2 FAILED: Physical attributes not correctly stored', 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 3: Create Two Warehouses
    // ================================================================
    logSection('TEST 3: Create Warehouses');

    const warehouse1Data = {
      code: `WH-E2E-1-${timestamp}`,
      name: 'E2E Test Warehouse 1',
      addressLine1: '123 Test Street',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      country: 'Indonesia',
    };

    const warehouse2Data = {
      code: `WH-E2E-2-${timestamp}`,
      name: 'E2E Test Warehouse 2',
      addressLine1: '456 Test Avenue',
      city: 'Bandung',
      province: 'Jawa Barat',
      postalCode: '40123',
      country: 'Indonesia',
    };

    const createWh1 = await apiCall('inventory', '/api/warehouses', 'POST', warehouse1Data);
    const createWh2 = await apiCall('inventory', '/api/warehouses', 'POST', warehouse2Data);

    // Inventory service returns status 201 (Created) and warehouse object directly
    if (createWh1.status === 201 && createWh2.status === 201) {
      testData.warehouse1Id = createWh1.data.id;
      testData.warehouse2Id = createWh2.data.id;
      log('✅ TEST 3 PASSED: Two warehouses created successfully', 'green');
      log(`   Warehouse 1 ID: ${testData.warehouse1Id}`, 'blue');
      log(`   Warehouse 2 ID: ${testData.warehouse2Id}`, 'blue');
      testsPassed++;
    } else {
      log('❌ TEST 3 FAILED: Could not create warehouses', 'red');
      log(`   Warehouse 1 status: ${createWh1.status}, Warehouse 2 status: ${createWh2.status}`, 'red');
      testsFailed++;
      throw new Error('Cannot continue without warehouses');
    }

    // ================================================================
    // TEST 4: Add Stock to Warehouse 1 (100 units)
    // ================================================================
    logSection('TEST 4: Add Initial Stock to Warehouse 1');

    const addStock = await apiCall('inventory', '/api/inventory/adjust', 'POST', {
      productId: testData.productId,
      warehouseId: testData.warehouse1Id,
      quantity: 100,
      movementType: 'in',
      reason: 'Initial stock for E2E test',
      performedBy: 'E2E Test Suite',
    });

    if (addStock.status === 200 && addStock.data.inventory.quantityAvailable === 100) {
      log('✅ TEST 4 PASSED: Stock added to Warehouse 1 (100 units)', 'green');
      testsPassed++;
    } else {
      log('❌ TEST 4 FAILED: Could not add stock', 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 5: Warehouse Transfer (Warehouse 1 → Warehouse 2: 40 units)
    // ================================================================
    logSection('TEST 5: Warehouse Transfer (40 units OUT from WH1, 40 units IN to WH2)');

    // OUT from Warehouse 1 (warehouse source - should succeed)
    const transferOut = await apiCall('inventory', '/api/inventory/adjust', 'POST', {
      productId: testData.productId,
      warehouseId: testData.warehouse1Id,
      quantity: 40,
      movementType: 'out',
      source: 'warehouse',
      reason: 'Transfer to Warehouse 2',
      performedBy: 'E2E Test Suite',
    });

    // IN to Warehouse 2
    const transferIn = await apiCall('inventory', '/api/inventory/adjust', 'POST', {
      productId: testData.productId,
      warehouseId: testData.warehouse2Id,
      quantity: 40,
      movementType: 'in',
      reason: 'Received from Warehouse 1',
      performedBy: 'E2E Test Suite',
    });

    if (transferOut.status === 200 && transferIn.status === 200 &&
        transferOut.data.inventory.quantityAvailable === 60 &&
        transferIn.data.inventory.quantityAvailable === 40) {
      log('✅ TEST 5 PASSED: Warehouse transfer completed successfully', 'green');
      log('   Warehouse 1: 100 → 60 units', 'blue');
      log('   Warehouse 2: 0 → 40 units', 'blue');
      testsPassed++;
    } else {
      log('❌ TEST 5 FAILED: Warehouse transfer did not complete correctly', 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 6: Attempt Warehouse OUT exceeding stock (Should FAIL)
    // ================================================================
    logSection('TEST 6: Warehouse OUT Exceeding Stock (Should FAIL)');

    const invalidOut = await apiCall('inventory', '/api/inventory/adjust', 'POST', {
      productId: testData.productId,
      warehouseId: testData.warehouse1Id,
      quantity: 100,  // Only 60 available
      movementType: 'out',
      source: 'warehouse',
      reason: 'Invalid warehouse operation',
      performedBy: 'E2E Test Suite',
    });

    if (invalidOut.status === 400 && invalidOut.data.error) {
      log('✅ TEST 6 PASSED: Warehouse operation correctly prevented negative stock', 'green');
      log(`   Error: ${invalidOut.data.error}`, 'blue');
      testsPassed++;
    } else {
      log('❌ TEST 6 FAILED: Warehouse operation should have been prevented!', 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 7: POS Sale Creating Negative Stock (Should SUCCEED)
    // ================================================================
    logSection('TEST 7: POS Sale Creating Negative Stock (Should SUCCEED)');

    const posSale = await apiCall('inventory', '/api/inventory/adjust', 'POST', {
      productId: testData.productId,
      warehouseId: testData.warehouse1Id,
      quantity: 70,  // Only 60 available, will go to -10
      movementType: 'out',
      source: 'pos',  // POS can create negative stock
      reason: 'POS Sale - First-pay-first-served',
      performedBy: 'POS System',
    });

    if (posSale.status === 200 && posSale.data.inventory.quantityAvailable === -10) {
      log('✅ TEST 7 PASSED: POS sale correctly allowed negative stock', 'green');
      log('   Warehouse 1: 60 → -10 units (NEGATIVE ALLOWED for POS)', 'blue');
      testsPassed++;
    } else {
      log('❌ TEST 7 FAILED: POS sale should allow negative stock', 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 8: Restock to Positive (120 units IN)
    // ================================================================
    logSection('TEST 8: Restock Warehouse 1 to Positive');

    const restock = await apiCall('inventory', '/api/inventory/adjust', 'POST', {
      productId: testData.productId,
      warehouseId: testData.warehouse1Id,
      quantity: 120,
      movementType: 'in',
      reason: 'Restock after POS sale',
      performedBy: 'E2E Test Suite',
    });

    if (restock.status === 200 && restock.data.inventory.quantityAvailable === 110) {
      log('✅ TEST 8 PASSED: Warehouse restocked successfully', 'green');
      log('   Warehouse 1: -10 → 110 units', 'blue');
      testsPassed++;
    } else {
      log('❌ TEST 8 FAILED: Restock did not complete correctly', 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 9: Get Inventory Across All Warehouses
    // ================================================================
    logSection('TEST 9: Get Total Inventory Across Warehouses');

    const totalInventory = await apiCall('inventory', `/api/inventory/${testData.productId}`, 'GET');

    if (totalInventory.status === 200) {
      const total = totalInventory.data.totalAvailable;
      const expected = 110 + 40; // WH1 (110) + WH2 (40) = 150

      if (total === expected) {
        log('✅ TEST 9 PASSED: Total inventory calculation correct', 'green');
        log(`   Total across warehouses: ${total} units`, 'blue');
        log(`   Warehouse 1: 110 units, Warehouse 2: 40 units`, 'blue');
        testsPassed++;
      } else {
        log('❌ TEST 9 FAILED: Total inventory mismatch', 'red');
        log(`   Expected: ${expected}, Got: ${total}`, 'red');
        testsFailed++;
      }
    } else {
      log('❌ TEST 9 FAILED: Could not fetch inventory', 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 10: Verify Movement History
    // ================================================================
    logSection('TEST 10: Verify Movement History Tracking');

    const movements = await apiCall('inventory', `/api/inventory/movements/${testData.productId}`, 'GET');

    if (movements.status === 200 && movements.data.movements.length >= 5) {
      const hasSource = movements.data.movements.every(m => m.source !== undefined);
      const hasPosMovement = movements.data.movements.some(m => m.source === 'pos');
      const hasWarehouseMovement = movements.data.movements.some(m => m.source === 'warehouse');

      if (hasSource && hasPosMovement && hasWarehouseMovement) {
        log('✅ TEST 10 PASSED: Movement history tracking working correctly', 'green');
        log(`   Total movements: ${movements.data.movements.length}`, 'blue');
        log('   Source field tracked: ✅', 'blue');
        log('   POS movements: ✅', 'blue');
        log('   Warehouse movements: ✅', 'blue');
        testsPassed++;
      } else {
        log('❌ TEST 10 FAILED: Movement history incomplete', 'red');
        testsFailed++;
      }
    } else {
      log('❌ TEST 10 FAILED: Could not fetch movement history', 'red');
      testsFailed++;
    }

  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    testsFailed++;
  }

  // ================================================================
  // SUMMARY
  // ================================================================
  logSection('TEST SUITE SUMMARY');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`${colors.green}✅ Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${colors.green}${'✅'.repeat(15)} ALL TESTS PASSED ${'✅'.repeat(15)}${colors.reset}\n`);
    console.log('✅ Product Service: Working correctly');
    console.log('✅ Inventory Service: Working correctly');
    console.log('✅ Physical Attributes: Persisted correctly');
    console.log('✅ Business Rules: Enforced correctly');
    console.log('✅ Warehouse Operations: Cannot create negative stock');
    console.log('✅ POS Operations: Can create negative stock');
    console.log('✅ Movement History: Tracked with source');
    console.log('✅ Cross-warehouse inventory: Calculated correctly\n');
  } else {
    console.log(`\n${colors.red}Some tests failed. Please review the output above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
console.log('\n' + colors.blue + 'Starting End-to-End Integration Test Suite...' + colors.reset);
console.log(colors.blue + 'Make sure both services are running:' + colors.reset);
console.log(colors.blue + '  - Product Service: http://localhost:8788' + colors.reset);
console.log(colors.blue + '  - Inventory Service: http://localhost:8792' + colors.reset + '\n');

runTests().catch(err => {
  console.error(colors.red + 'Fatal error: ' + err.message + colors.reset);
  process.exit(1);
});
