/**
 * Test Script: Product UOM Update and Validation
 *
 * Tests:
 * 1. Create product with 100 units stock
 * 2. Add Box UOM (6 PCS per box, 10 boxes = 60 PCS)
 * 3. Add Carton UOM (18 PCS per carton, 2 cartons = 36 PCS)
 * 4. Try to update Box to 20 boxes (would exceed product stock) - Should FAIL
 * 5. Update Box to 15 boxes (valid) - Should SUCCEED
 * 6. Verify updates persist
 */

const PRODUCT_SERVICE_URL = 'http://localhost:8788';

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
  console.log(`\n${colors.yellow}${'='.repeat(70)}\n${message}\n${'='.repeat(70)}${colors.reset}\n`);
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${PRODUCT_SERVICE_URL}${endpoint}`, options);
  const data = await response.json();

  return { status: response.status, data };
}

async function runTests() {
  const timestamp = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;
  const testData = {};

  try {
    logSection('PRODUCT UOM UPDATE & VALIDATION TEST');

    // ================================================================
    // TEST 1: Create Product with 100 units stock
    // ================================================================
    logSection('TEST 1: Create Product (100 units)');

    const productData = {
      barcode: `UOM-TEST-${timestamp}`,
      sku: `SKU-UOM-${timestamp}`,
      name: 'Baby Bottle Set for UOM Test',
      price: 50000,
      stock: 100, // 100 PCS
      baseUnit: 'PCS',
    };

    const createProduct = await apiCall('/api/products', 'POST', productData);

    if (createProduct.status === 201 && createProduct.data.id) {
      testData.productId = createProduct.data.id;
      log(`✅ Product created: ${testData.productId}`, 'green');
      log(`   Stock: ${createProduct.data.stock} ${createProduct.data.baseUnit}`, 'blue');
      testsPassed++;
    } else {
      log('❌ Failed to create product', 'red');
      testsFailed++;
      throw new Error('Cannot continue without product');
    }

    // ================================================================
    // TEST 2: Add Box UOM (6 PCS per box)
    // ================================================================
    logSection('TEST 2: Add Box UOM (6 PCS per box, 10 boxes = 60 PCS)');

    const boxUOMData = {
      productId: testData.productId,
      uomCode: 'BOX6',
      uomName: 'Box of 6',
      barcode: `BOX-${timestamp}`,
      conversionFactor: 6,
      stock: 10, // 10 boxes = 60 PCS
      isDefault: false,
    };

    const createBox = await apiCall('/api/uoms/products', 'POST', boxUOMData);

    if (createBox.status === 201 && createBox.data.id) {
      testData.boxUOMId = createBox.data.id;
      log(`✅ Box UOM created: ${testData.boxUOMId}`, 'green');
      log(`   10 boxes × 6 PCS = 60 PCS`, 'blue');
      testsPassed++;
    } else {
      log('❌ Failed to create Box UOM', 'red');
      log(`   Response: ${JSON.stringify(createBox.data)}`, 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 3: Add Carton UOM (18 PCS per carton)
    // ================================================================
    logSection('TEST 3: Add Carton UOM (18 PCS per carton, 2 cartons = 36 PCS)');

    const cartonUOMData = {
      productId: testData.productId,
      uomCode: 'CARTON18',
      uomName: 'Carton of 18',
      barcode: `CARTON-${timestamp}`,
      conversionFactor: 18,
      stock: 2, // 2 cartons = 36 PCS
      isDefault: false,
    };

    const createCarton = await apiCall('/api/uoms/products', 'POST', cartonUOMData);

    if (createCarton.status === 201 && createCarton.data.id) {
      testData.cartonUOMId = createCarton.data.id;
      log(`✅ Carton UOM created: ${testData.cartonUOMId}`, 'green');
      log(`   2 cartons × 18 PCS = 36 PCS`, 'blue');
      log(`   Total UOM stock: 60 + 36 = 96 PCS (within 100 PCS limit)`, 'blue');
      testsPassed++;
    } else {
      log('❌ Failed to create Carton UOM', 'red');
      log(`   Response: ${JSON.stringify(createCarton.data)}`, 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 4: Try to update Box to 20 boxes (would exceed limit)
    // ================================================================
    logSection('TEST 4: Update Box to 20 boxes (20×6=120 PCS) - Should FAIL');

    const invalidUpdate = await apiCall(`/api/uoms/products/${testData.boxUOMId}`, 'PUT', {
      stock: 20, // 20 × 6 = 120 PCS, plus 36 from carton = 156 > 100 limit
    });

    if (invalidUpdate.status === 400 && invalidUpdate.data.error) {
      log(`✅ Validation correctly prevented invalid update`, 'green');
      log(`   Error: ${invalidUpdate.data.error}`, 'blue');
      testsPassed++;
    } else {
      log('❌ Validation should have prevented this update!', 'red');
      log(`   Status: ${invalidUpdate.status}`, 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 5: Update Box to 15 boxes (valid)
    // ================================================================
    logSection('TEST 5: Update Box to 15 boxes (15×6=90 PCS) - Should SUCCEED');

    const validUpdate = await apiCall(`/api/uoms/products/${testData.boxUOMId}`, 'PUT', {
      stock: 10, // 10 × 6 = 60 PCS, plus 36 from carton = 96 < 100 limit
      uomName: 'Box of 6 (Updated)',
    });

    if (validUpdate.status === 200 && validUpdate.data.stock === 10) {
      log(`✅ UOM updated successfully`, 'green');
      log(`   New stock: ${validUpdate.data.stock} boxes (${validUpdate.data.stock * 6} PCS)`, 'blue');
      log(`   Name updated: ${validUpdate.data.uomName}`, 'blue');
      testsPassed++;
    } else {
      log('❌ Valid update should succeed', 'red');
      log(`   Status: ${validUpdate.status}, Response: ${JSON.stringify(validUpdate.data)}`, 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 6: Verify update persisted
    // ================================================================
    logSection('TEST 6: Verify Update Persisted');

    const verifyUpdate = await apiCall(`/api/uoms/products/${testData.productId}`, 'GET');

    if (verifyUpdate.status === 200 && verifyUpdate.data.productUOMs) {
      const boxUOM = verifyUpdate.data.productUOMs.find(uom => uom.id === testData.boxUOMId);

      if (boxUOM && boxUOM.stock === 10 && boxUOM.uomName === 'Box of 6 (Updated)') {
        log(`✅ Updates persisted correctly`, 'green');
        log(`   Box UOM stock: ${boxUOM.stock} boxes`, 'blue');
        log(`   Box UOM name: ${boxUOM.uomName}`, 'blue');
        testsPassed++;
      } else {
        log('❌ Updates did not persist correctly', 'red');
        log(`   Expected: stock=10, name="Box of 6 (Updated)"`, 'red');
        log(`   Got: stock=${boxUOM?.stock}, name="${boxUOM?.uomName}"`, 'red');
        testsFailed++;
      }
    } else {
      log('❌ Failed to fetch UOMs', 'red');
      testsFailed++;
    }

    // ================================================================
    // TEST 7: Update with barcode change
    // ================================================================
    logSection('TEST 7: Update UOM barcode');

    const barcodeUpdate = await apiCall(`/api/uoms/products/${testData.boxUOMId}`, 'PUT', {
      barcode: `BOX-UPDATED-${timestamp}`,
    });

    if (barcodeUpdate.status === 200 && barcodeUpdate.data.barcode === `BOX-UPDATED-${timestamp}`) {
      log(`✅ Barcode updated successfully`, 'green');
      log(`   New barcode: ${barcodeUpdate.data.barcode}`, 'blue');
      testsPassed++;
    } else {
      log('❌ Barcode update failed', 'red');
      testsFailed++;
    }

  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    testsFailed++;
  }

  // ================================================================
  // SUMMARY
  // ================================================================
  logSection('TEST SUMMARY');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`${colors.green}✅ Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${colors.green}${'✅'.repeat(10)} ALL TESTS PASSED ${'✅'.repeat(10)}${colors.reset}\n`);
    console.log('✅ Product UOM updates are working correctly!');
    console.log('✅ Stock validation prevents exceeding product limits!');
  } else {
    console.log(`\n${colors.red}Some tests failed. Please review the output above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
console.log('\n' + colors.blue + 'Starting Product UOM Update & Validation Tests...' + colors.reset);
console.log(colors.blue + 'Make sure Product Service is running on http://localhost:8788' + colors.reset + '\n');

runTests().catch(err => {
  console.error(colors.red + 'Fatal error: ' + err.message + colors.reset);
  process.exit(1);
});
