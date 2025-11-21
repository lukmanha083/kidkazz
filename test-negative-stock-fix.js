/**
 * Test Script: Verify Negative Stock Business Rule Fix
 *
 * Tests Issue #1: Negative Stock Prevention
 *
 * Business Rules:
 * 1. Warehouse operations (source='warehouse') CANNOT create negative stock
 * 2. POS operations (source='pos') CAN create negative stock (first-pay-first-served)
 * 3. Default source is 'warehouse' for backward compatibility
 */

const INVENTORY_SERVICE_URL = 'http://localhost:8792';

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${INVENTORY_SERVICE_URL}${endpoint}`, options);
  const data = await response.json();

  return { status: response.status, data };
}

// Test color helpers
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logSection(message) {
  console.log(`\n${colors.yellow}${'='.repeat(70)}\n${message}\n${'='.repeat(70)}${colors.reset}\n`);
}

// Test data (use random values to avoid conflicts)
const timestamp = Date.now();
const testWarehouse = {
  code: `WH-TEST-NEG-${timestamp}`,
  name: 'Test Warehouse for Negative Stock',
  addressLine1: '123 Test Street',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  postalCode: '12345',
  country: 'Indonesia',
};

const testProduct = {
  barcode: `TEST-NEG-${timestamp}`,
  sku: `SKU-NEG-${timestamp}`,
  name: 'Test Product for Negative Stock',
  categoryId: null, // Use categoryId instead of category
  price: 10000, // Use price instead of basePrice
  retailPrice: 15000,
  stock: 0, // Use stock instead of initialStock
};

async function runTests() {
  logSection('NEGATIVE STOCK BUSINESS RULE TEST - Issue #1');

  let warehouseId, productId, inventoryId;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Setup: Create warehouse
    logSection('SETUP: Creating Test Data');

    const warehouseRes = await apiCall('/api/warehouses', 'POST', testWarehouse);
    if (warehouseRes.status !== 200 && warehouseRes.status !== 201) {
      throw new Error('Failed to create test warehouse: ' + JSON.stringify(warehouseRes.data));
    }
    warehouseId = warehouseRes.data.warehouse?.id || warehouseRes.data.id;
    logSuccess(`Created test warehouse: ${warehouseId}`);

    // Setup: Create product (assuming product service is running)
    try {
      const productRes = await fetch('http://localhost:8788/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testProduct),
      });

      if (!productRes.ok) {
        const errorData = await productRes.json();
        throw new Error(`Product creation failed: ${JSON.stringify(errorData)}`);
      }

      const productData = await productRes.json();
      // Product service returns the product directly (not wrapped)
      productId = productData.id;

      if (!productId) {
        throw new Error(`Product ID not found in response: ${JSON.stringify(productData)}`);
      }

      logSuccess(`Created test product: ${productId}`);
    } catch (err) {
      logInfo(`Product service error: ${err.message}`);
      logInfo('Using mock product ID for testing');
      productId = 'mock-product-' + Date.now();
    }

    // =================================================================
    // TEST 1: Initial stock adjustment (IN) - Should succeed
    // =================================================================
    logSection('TEST 1: Add initial stock (50 units) - Should SUCCEED');

    const test1 = await apiCall('/api/inventory/adjust', 'POST', {
      productId,
      warehouseId,
      quantity: 50,
      movementType: 'in',
      reason: 'Initial stock',
      performedBy: 'Test Script',
    });

    if (test1.status === 200 && test1.data.inventory.quantityAvailable === 50) {
      logSuccess('Test 1 PASSED: Initial stock added successfully (50 units)');
      logInfo(`   Available: ${test1.data.inventory.quantityAvailable}`);
      testsPassed++;
    } else {
      logError('Test 1 FAILED: Could not add initial stock');
      logError(`   Status: ${test1.status}, Response: ${JSON.stringify(test1.data)}`);
      testsFailed++;
    }

    // =================================================================
    // TEST 2: Warehouse OUT exceeding available stock - Should FAIL
    // =================================================================
    logSection('TEST 2: Warehouse OUT 70 units (only 50 available) - Should FAIL');

    const test2 = await apiCall('/api/inventory/adjust', 'POST', {
      productId,
      warehouseId,
      quantity: 70,
      movementType: 'out',
      source: 'warehouse', // Explicit warehouse source
      reason: 'Warehouse transfer attempt',
      performedBy: 'Test Script',
    });

    if (test2.status === 400 && test2.data.error) {
      logSuccess('Test 2 PASSED: Warehouse operation correctly prevented negative stock');
      logInfo(`   Error: ${test2.data.error}`);
      logInfo(`   Available: ${test2.data.available}, Requested: ${test2.data.requested}`);
      testsPassed++;
    } else {
      logError('Test 2 FAILED: Warehouse operation should have been rejected!');
      logError(`   Status: ${test2.status}, Response: ${JSON.stringify(test2.data)}`);
      testsFailed++;
    }

    // =================================================================
    // TEST 3: Warehouse OUT within available stock - Should SUCCEED
    // =================================================================
    logSection('TEST 3: Warehouse OUT 30 units (50 available) - Should SUCCEED');

    const test3 = await apiCall('/api/inventory/adjust', 'POST', {
      productId,
      warehouseId,
      quantity: 30,
      movementType: 'out',
      source: 'warehouse',
      reason: 'Valid warehouse transfer',
      performedBy: 'Test Script',
    });

    if (test3.status === 200 && test3.data.inventory.quantityAvailable === 20) {
      logSuccess('Test 3 PASSED: Warehouse OUT within limits succeeded');
      logInfo(`   Previous: 50, Adjusted: -30, New: ${test3.data.inventory.quantityAvailable}`);
      testsPassed++;
    } else {
      logError('Test 3 FAILED: Valid warehouse operation should succeed');
      logError(`   Status: ${test3.status}, Response: ${JSON.stringify(test3.data)}`);
      testsFailed++;
    }

    // =================================================================
    // TEST 4: POS Sale exceeding available stock - Should SUCCEED (allows negative)
    // =================================================================
    logSection('TEST 4: POS Sale 40 units (only 20 available) - Should SUCCEED (allows negative)');

    const test4 = await apiCall('/api/inventory/adjust', 'POST', {
      productId,
      warehouseId,
      quantity: 40,
      movementType: 'out',
      source: 'pos', // POS can create negative stock
      reason: 'POS sale - first-pay-first-served',
      performedBy: 'POS System',
    });

    if (test4.status === 200 && test4.data.inventory.quantityAvailable === -20) {
      logSuccess('Test 4 PASSED: POS sale correctly allowed negative stock');
      logInfo(`   Previous: 20, Sold: 40, New: ${test4.data.inventory.quantityAvailable} (NEGATIVE ALLOWED)`);
      testsPassed++;
    } else {
      logError('Test 4 FAILED: POS operation should allow negative stock!');
      logError(`   Status: ${test4.status}, Response: ${JSON.stringify(test4.data)}`);
      testsFailed++;
    }

    // =================================================================
    // TEST 5: Default source (no source specified) - Should behave as warehouse
    // =================================================================
    logSection('TEST 5: Add 50 units, then OUT 60 with no source - Should FAIL (defaults to warehouse)');

    // First add stock to make it positive
    await apiCall('/api/inventory/adjust', 'POST', {
      productId,
      warehouseId,
      quantity: 70,
      movementType: 'in',
      reason: 'Restock for test 5',
    });

    // Now try to take out more than available without specifying source
    const test5 = await apiCall('/api/inventory/adjust', 'POST', {
      productId,
      warehouseId,
      quantity: 60,
      movementType: 'out',
      // No source specified - should default to 'warehouse'
      reason: 'Default source test',
      performedBy: 'Test Script',
    });

    if (test5.status === 400 && test5.data.error) {
      logSuccess('Test 5 PASSED: Default source correctly behaves as warehouse (prevents negative)');
      logInfo(`   Error: ${test5.data.error}`);
      testsPassed++;
    } else if (test5.status === 200) {
      logError('Test 5 FAILED: Default source should prevent negative stock!');
      logError(`   Allowed negative: ${test5.data.inventory.quantityAvailable}`);
      testsFailed++;
    } else {
      logError('Test 5 FAILED: Unexpected response');
      logError(`   Status: ${test5.status}, Response: ${JSON.stringify(test5.data)}`);
      testsFailed++;
    }

    // =================================================================
    // TEST 6: Check movement history includes source tracking
    // =================================================================
    logSection('TEST 6: Verify movement history tracks source field');

    const test6 = await apiCall(`/api/inventory/movements/${productId}`, 'GET');

    if (test6.status === 200 && test6.data.movements && test6.data.movements.length > 0) {
      const movements = test6.data.movements;
      const hasSourceField = movements.some(m => m.source !== undefined);

      if (hasSourceField) {
        logSuccess('Test 6 PASSED: Movement history includes source tracking');
        logInfo(`   Total movements: ${movements.length}`);
        logInfo(`   Sample: ${JSON.stringify(movements.slice(0, 2), null, 2)}`);
        testsPassed++;
      } else {
        logError('Test 6 FAILED: Source field not found in movement history');
        logError(`   Movements: ${JSON.stringify(movements.slice(0, 2), null, 2)}`);
        testsFailed++;
      }
    } else {
      logError('Test 6 FAILED: Could not retrieve movement history');
      logError(`   Status: ${test6.status}, Response: ${JSON.stringify(test6.data)}`);
      testsFailed++;
    }

  } catch (error) {
    logError(`Test execution error: ${error.message}`);
    testsFailed++;
  }

  // ===================================================================
  // SUMMARY
  // ===================================================================
  logSection('TEST SUMMARY');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`${colors.green}✅ Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${colors.green}${'✅'.repeat(10)} ALL TESTS PASSED ${'✅'.repeat(10)}${colors.reset}\n`);
    console.log('Issue #1 (Negative Stock Business Rule) is FIXED ✅\n');
  } else {
    console.log(`\n${colors.red}Some tests failed. Please review the output above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
console.log('\n' + colors.blue + 'Starting Negative Stock Business Rule Tests...' + colors.reset);
console.log(colors.blue + 'Make sure Inventory Service is running on http://localhost:8792' + colors.reset + '\n');

runTests().catch(err => {
  console.error(colors.red + 'Fatal error: ' + err.message + colors.reset);
  process.exit(1);
});
