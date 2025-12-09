/**
 * Seed Test Data Script
 * Populates test data in Product and Inventory databases for migration testing
 *
 * Usage:
 * npx wrangler dev seed-test-data.ts --local --config wrangler-seed.toml
 * curl http://localhost:8788/seed
 */

interface Env {
  PRODUCT_DB: D1Database;
  INVENTORY_DB: D1Database;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getCurrentTimestamp(): number {
  return Date.now();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/seed') {
      try {
        const result = await seedTestData(env.PRODUCT_DB, env.INVENTORY_DB);
        return Response.json({
          success: true,
          result
        });
      } catch (error) {
        console.error('Error seeding data:', error);
        return Response.json({
          success: false,
          error: String(error)
        }, { status: 500 });
      }
    }

    if (url.pathname === '/clear') {
      try {
        await clearTestData(env.PRODUCT_DB, env.INVENTORY_DB);
        return Response.json({
          success: true,
          message: 'Test data cleared successfully'
        });
      } catch (error) {
        console.error('Error clearing data:', error);
        return Response.json({
          success: false,
          error: String(error)
        }, { status: 500 });
      }
    }

    return new Response(`
      Seed Test Data Script
      =====================

      Available endpoints:
      - POST /seed  - Seed test data
      - POST /clear - Clear test data

      Example:
      curl -X POST http://localhost:8788/seed
    `, { headers: { 'Content-Type': 'text/plain' } });
  }
};

async function seedTestData(productDB: D1Database, inventoryDB: D1Database) {
  console.log('=== Starting Test Data Seeding ===');
  const timestamp = getCurrentTimestamp();

  const result = {
    warehouses: 0,
    categories: 0,
    products: 0,
    variants: 0,
    uoms: 0,
    productLocations: 0,
    variantLocations: 0,
    uomLocations: 0,
    productsWithExpiration: 0
  };

  // Step 1: Create warehouses in inventory DB
  console.log('Step 1: Creating warehouses...');
  const warehouseIds: string[] = [];
  const warehouses = [
    {
      id: generateId(),
      code: 'WH-CENTRAL',
      name: 'Central Warehouse',
      addressLine1: '123 Main Street',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      contactName: 'John Doe',
      contactPhone: '+62-21-1234567',
      contactEmail: 'central@warehouse.com'
    },
    {
      id: generateId(),
      code: 'WH-NORTH',
      name: 'North Warehouse',
      addressLine1: '456 North Ave',
      city: 'Surabaya',
      province: 'East Java',
      postalCode: '67890',
      contactName: 'Jane Smith',
      contactPhone: '+62-31-7654321',
      contactEmail: 'north@warehouse.com'
    }
  ];

  for (const wh of warehouses) {
    await inventoryDB.prepare(`
      INSERT INTO warehouses (
        id, code, name, address_line1, city, province, postal_code,
        contact_name, contact_phone, contact_email, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
      wh.id, wh.code, wh.name, wh.addressLine1, wh.city, wh.province, wh.postalCode,
      wh.contactName, wh.contactPhone, wh.contactEmail, timestamp, timestamp
    ).run();
    warehouseIds.push(wh.id);
    result.warehouses++;
  }
  console.log(`  ✅ Created ${result.warehouses} warehouses`);

  // Step 2: Create categories in product DB
  console.log('Step 2: Creating categories...');
  const categoryId = generateId();
  await productDB.prepare(`
    INSERT INTO categories (id, name, description, icon, color, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `).bind(
    categoryId,
    'Beverages',
    'Drinks and beverages',
    '🥤',
    '#FF6B6B',
    timestamp,
    timestamp
  ).run();
  result.categories++;
  console.log(`  ✅ Created ${result.categories} categories`);

  // Step 3: Create products in product DB
  console.log('Step 3: Creating products...');
  const productIds: string[] = [];
  const products = [
    {
      id: generateId(),
      barcode: 'BAR-001',
      name: 'Coca Cola 330ml',
      sku: 'COKE-330',
      description: 'Classic Coca Cola',
      categoryId,
      price: 5000,
      stock: 100,
      expirationDate: '2026-12-31',
      alertDate: '2026-11-30'
    },
    {
      id: generateId(),
      barcode: 'BAR-002',
      name: 'Pepsi 330ml',
      sku: 'PEPSI-330',
      description: 'Pepsi Cola',
      categoryId,
      price: 4500,
      stock: 150,
      expirationDate: '2026-10-31',
      alertDate: '2026-09-30'
    },
    {
      id: generateId(),
      barcode: 'BAR-003',
      name: 'Sprite 330ml',
      sku: 'SPRITE-330',
      description: 'Lemon-lime soda',
      categoryId,
      price: 4800,
      stock: 120,
      expirationDate: null,
      alertDate: null
    }
  ];

  for (const product of products) {
    await productDB.prepare(`
      INSERT INTO products (
        id, barcode, name, sku, description, category_id, price, stock,
        base_unit, status, expiration_date, alert_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PCS', 'active', ?, ?, ?, ?)
    `).bind(
      product.id,
      product.barcode,
      product.name,
      product.sku,
      product.description,
      product.categoryId,
      product.price,
      product.stock,
      product.expirationDate,
      product.alertDate,
      timestamp,
      timestamp
    ).run();
    productIds.push(product.id);
    result.products++;
    if (product.expirationDate) {
      result.productsWithExpiration++;
    }
  }
  console.log(`  ✅ Created ${result.products} products (${result.productsWithExpiration} with expiration dates)`);

  // Step 4: Create product variants
  console.log('Step 4: Creating product variants...');
  const variantIds: string[] = [];
  const variants = [
    {
      id: generateId(),
      productId: productIds[0],
      productName: products[0].name,
      productSku: products[0].sku,
      variantName: 'Coke Zero',
      variantSku: 'COKE-ZERO-330',
      variantType: 'flavor',
      price: 5500,
      stock: 80
    },
    {
      id: generateId(),
      productId: productIds[1],
      productName: products[1].name,
      productSku: products[1].sku,
      variantName: 'Pepsi Max',
      variantSku: 'PEPSI-MAX-330',
      variantType: 'flavor',
      price: 5000,
      stock: 60
    }
  ];

  for (const variant of variants) {
    await productDB.prepare(`
      INSERT INTO product_variants (
        id, product_id, product_name, product_sku, variant_name, variant_sku,
        variant_type, price, stock, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(
      variant.id,
      variant.productId,
      variant.productName,
      variant.productSku,
      variant.variantName,
      variant.variantSku,
      variant.variantType,
      variant.price,
      variant.stock,
      timestamp
    ).run();
    variantIds.push(variant.id);
    result.variants++;
  }
  console.log(`  ✅ Created ${result.variants} product variants`);

  // Step 5: Create product UOMs
  console.log('Step 5: Creating product UOMs...');
  const uomIds: string[] = [];
  const uoms = [
    {
      id: generateId(),
      productId: productIds[0],
      uomCode: 'BOX6',
      uomName: 'Box of 6',
      barcode: 'BOX6-COKE-330',
      conversionFactor: 6,
      stock: 20
    },
    {
      id: generateId(),
      productId: productIds[1],
      uomCode: 'CARTON12',
      uomName: 'Carton of 12',
      barcode: 'CARTON12-PEPSI-330',
      conversionFactor: 12,
      stock: 15
    },
    {
      id: generateId(),
      productId: productIds[2],
      uomCode: 'BOX6',
      uomName: 'Box of 6',
      barcode: 'BOX6-SPRITE-330',
      conversionFactor: 6,
      stock: 18
    }
  ];

  for (const uom of uoms) {
    await productDB.prepare(`
      INSERT INTO product_uoms (
        id, product_id, uom_code, uom_name, barcode, conversion_factor,
        stock, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      uom.id,
      uom.productId,
      uom.uomCode,
      uom.uomName,
      uom.barcode,
      uom.conversionFactor,
      uom.stock,
      timestamp,
      timestamp
    ).run();
    uomIds.push(uom.id);
    result.uoms++;
  }
  console.log(`  ✅ Created ${result.uoms} product UOMs`);

  // Step 6: Create product locations
  console.log('Step 6: Creating product locations...');
  for (let i = 0; i < productIds.length; i++) {
    for (let j = 0; j < warehouseIds.length; j++) {
      const locationId = generateId();
      await productDB.prepare(`
        INSERT INTO product_locations (
          id, product_id, warehouse_id, rack, bin, zone, aisle,
          quantity, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        locationId,
        productIds[i],
        warehouseIds[j],
        `R${i + 1}`,
        `B${j + 1}`,
        `Z${i + 1}`,
        `A${j + 1}`,
        50 + (i * 10) + (j * 5),
        timestamp,
        timestamp
      ).run();
      result.productLocations++;
    }
  }
  console.log(`  ✅ Created ${result.productLocations} product locations`);

  // Step 7: Create variant locations
  console.log('Step 7: Creating variant locations...');
  for (let i = 0; i < variantIds.length; i++) {
    for (let j = 0; j < warehouseIds.length; j++) {
      const locationId = generateId();
      await productDB.prepare(`
        INSERT INTO variant_locations (
          id, variant_id, warehouse_id, rack, bin, zone, aisle,
          quantity, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        locationId,
        variantIds[i],
        warehouseIds[j],
        `RV${i + 1}`,
        `BV${j + 1}`,
        `ZV${i + 1}`,
        `AV${j + 1}`,
        30 + (i * 5) + (j * 3),
        timestamp,
        timestamp
      ).run();
      result.variantLocations++;
    }
  }
  console.log(`  ✅ Created ${result.variantLocations} variant locations`);

  // Step 8: Create product UOM locations
  console.log('Step 8: Creating product UOM locations...');
  for (let i = 0; i < uomIds.length; i++) {
    for (let j = 0; j < warehouseIds.length; j++) {
      const locationId = generateId();
      await productDB.prepare(`
        INSERT INTO product_uom_locations (
          id, product_uom_id, warehouse_id, rack, bin, zone, aisle,
          quantity, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        locationId,
        uomIds[i],
        warehouseIds[j],
        `RU${i + 1}`,
        `BU${j + 1}`,
        `ZU${i + 1}`,
        `AU${j + 1}`,
        10 + (i * 2) + j,
        timestamp,
        timestamp
      ).run();
      result.uomLocations++;
    }
  }
  console.log(`  ✅ Created ${result.uomLocations} UOM locations`);

  console.log('\n=== Test Data Seeding Complete ===');
  console.log(JSON.stringify(result, null, 2));

  return result;
}

async function clearTestData(productDB: D1Database, inventoryDB: D1Database) {
  console.log('=== Clearing Test Data ===');

  // Clear product DB tables
  await productDB.prepare('DELETE FROM product_uom_locations').run();
  await productDB.prepare('DELETE FROM variant_locations').run();
  await productDB.prepare('DELETE FROM product_locations').run();
  await productDB.prepare('DELETE FROM product_uoms').run();
  await productDB.prepare('DELETE FROM product_variants').run();
  await productDB.prepare('DELETE FROM products').run();
  await productDB.prepare('DELETE FROM categories').run();

  // Clear inventory DB tables
  await inventoryDB.prepare('DELETE FROM inventory_batches').run();
  await inventoryDB.prepare('DELETE FROM inventory').run();
  await inventoryDB.prepare('DELETE FROM warehouses').run();

  console.log('✅ Test data cleared successfully');
}
