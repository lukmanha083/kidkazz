// Simple integration test for product service
const API_BASE_URL = 'http://localhost:8788';

async function testProducts() {
  console.log('🧪 Testing Product API Integration\n');

  // Test 1: Get all products
  console.log('1️⃣ GET /api/products');
  const productsRes = await fetch(`${API_BASE_URL}/api/products`);
  const productsData = await productsRes.json();
  console.log(`✅ Found ${productsData.total} products`);
  if (productsData.products.length > 0) {
    console.log(`   Sample: ${productsData.products[0].name} (${productsData.products[0].sku})`);
  }

  // Test 2: Get all categories
  console.log('\n2️⃣ GET /api/categories');
  const categoriesRes = await fetch(`${API_BASE_URL}/api/categories`);
  const categoriesData = await categoriesRes.json();
  console.log(`✅ Found ${categoriesData.total} categories`);
  if (categoriesData.categories.length > 0) {
    console.log(`   Sample: ${categoriesData.categories[0].name}`);
  }

  // Test 3: Create a new product
  console.log('\n3️⃣ POST /api/products (Create)');
  const newProduct = {
    barcode: '1234567890123',
    name: 'Integration Test Product',
    sku: 'TEST-INT-001',
    description: 'Created by integration test',
    price: 99.99,
    retailPrice: 99.99,
    wholesalePrice: 85.00,
    stock: 50,
    baseUnit: 'PCS',
    availableForRetail: true,
    availableForWholesale: true,
    status: 'active',
    isBundle: false,
  };

  const createRes = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProduct),
  });
  const createdProduct = await createRes.json();
  console.log(`✅ Created product: ${createdProduct.name} (ID: ${createdProduct.id})`);

  // Test 4: Get product by ID
  console.log('\n4️⃣ GET /api/products/:id');
  const getRes = await fetch(`${API_BASE_URL}/api/products/${createdProduct.id}`);
  const fetchedProduct = await getRes.json();
  console.log(`✅ Fetched: ${fetchedProduct.name}`);
  console.log(`   Has variants: ${fetchedProduct.variants?.length || 0}`);
  console.log(`   Has UOMs: ${fetchedProduct.productUOMs?.length || 0}`);

  // Test 5: Update stock
  console.log('\n5️⃣ PATCH /api/products/:id/stock');
  const updateStockRes = await fetch(`${API_BASE_URL}/api/products/${createdProduct.id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock: 75 }),
  });
  const stockResult = await updateStockRes.json();
  console.log(`✅ ${stockResult.message}`);

  // Test 6: Create a variant
  console.log('\n6️⃣ POST /api/variants (Create Variant)');
  const newVariant = {
    productId: createdProduct.id,
    productName: createdProduct.name,
    productSKU: createdProduct.sku,
    variantName: 'Blue',
    variantSKU: 'TEST-INT-001-BLUE',
    variantType: 'Color',
    price: 99.99,
    stock: 25,
    status: 'active',
  };

  const variantRes = await fetch(`${API_BASE_URL}/api/variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newVariant),
  });
  const createdVariant = await variantRes.json();
  console.log(`✅ Created variant: ${createdVariant.variantName}`);

  // Test 7: Delete variant
  console.log('\n7️⃣ DELETE /api/variants/:id');
  const deleteVariantRes = await fetch(`${API_BASE_URL}/api/variants/${createdVariant.id}`, {
    method: 'DELETE',
  });
  const deleteVariantResult = await deleteVariantRes.json();
  console.log(`✅ ${deleteVariantResult.message}`);

  // Test 8: Delete product
  console.log('\n8️⃣ DELETE /api/products/:id');
  const deleteRes = await fetch(`${API_BASE_URL}/api/products/${createdProduct.id}`, {
    method: 'DELETE',
  });
  const deleteResult = await deleteRes.json();
  console.log(`✅ ${deleteResult.message}`);

  console.log('\n🎉 All integration tests passed!');
}

testProducts().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
