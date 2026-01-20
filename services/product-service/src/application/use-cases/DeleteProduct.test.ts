/**
 * DeleteProduct Use Case Tests
 *
 * Tests cascade delete behavior and validation logic
 */

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../infrastructure/db';
import {
  bundleItems,
  customPricing,
  productBundles,
  productImages,
  productUOMs,
  productVariants,
  products,
} from '../../infrastructure/db/schema';
import { DeleteProductUseCase } from './DeleteProduct';

describe('DeleteProduct Use Case', () => {
  let deleteProductUseCase: DeleteProductUseCase;
  let testProductId: string;

  beforeEach(async () => {
    deleteProductUseCase = new DeleteProductUseCase();

    // Create a test product
    testProductId = `test-product-${Date.now()}`;
    await db.insert(products).values({
      id: testProductId,
      barcode: `TEST-${Date.now()}`,
      name: 'Test Product for Deletion',
      sku: `SKU-TEST-${Date.now()}`,
      price: 100000,
      stock: 50,
      baseUnit: 'PCS',
      wholesaleThreshold: 10,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('Validation - Cannot Delete', () => {
    it('should prevent deletion if product is in active bundle', async () => {
      // Create a bundle with the test product
      const bundleId = `test-bundle-${Date.now()}`;
      await db.insert(productBundles).values({
        id: bundleId,
        bundleName: 'Test Bundle',
        bundleSKU: `BUNDLE-${Date.now()}`,
        bundlePrice: 250000,
        discountPercentage: 10,
        status: 'active',
        availableStock: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(bundleItems).values({
        id: `bundle-item-${Date.now()}`,
        bundleId,
        productId: testProductId,
        productSKU: 'SKU-TEST',
        productName: 'Test Product',
        barcode: 'TEST-BARCODE',
        quantity: 2,
        price: 100000,
        createdAt: new Date(),
      });

      // Attempt to delete
      const result = await deleteProductUseCase.execute({
        productId: testProductId,
        userId: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.cannotDeleteReasons).toHaveLength(1);
      expect(result.cannotDeleteReasons?.[0]).toContain('active bundle');

      // Verify product still exists
      const product = await db.select().from(products).where(eq(products.id, testProductId)).get();

      expect(product).toBeDefined();

      // Cleanup
      await db.delete(bundleItems).where(eq(bundleItems.bundleId, bundleId));
      await db.delete(productBundles).where(eq(productBundles.id, bundleId));
      await db.delete(products).where(eq(products.id, testProductId));
    });

    it('should prevent deletion if product has custom pricing', async () => {
      // Create custom pricing for the product
      const customPricingId = `custom-pricing-${Date.now()}`;
      await db.insert(customPricing).values({
        id: customPricingId,
        productId: testProductId,
        userId: 'customer-123',
        customPrice: 95000,
        createdAt: new Date(),
      });

      // Attempt to delete
      const result = await deleteProductUseCase.execute({
        productId: testProductId,
        userId: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.cannotDeleteReasons).toHaveLength(1);
      expect(result.cannotDeleteReasons?.[0]).toContain('custom pricing');

      // Verify product still exists
      const product = await db.select().from(products).where(eq(products.id, testProductId)).get();

      expect(product).toBeDefined();

      // Cleanup
      await db.delete(customPricing).where(eq(customPricing.id, customPricingId));
      await db.delete(products).where(eq(products.id, testProductId));
    });

    it('should return multiple validation errors when multiple blockers exist', async () => {
      // Create both bundle and custom pricing
      const bundleId = `test-bundle-${Date.now()}`;
      await db.insert(productBundles).values({
        id: bundleId,
        bundleName: 'Test Bundle',
        bundleSKU: `BUNDLE-${Date.now()}`,
        bundlePrice: 250000,
        discountPercentage: 10,
        status: 'active',
        availableStock: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(bundleItems).values({
        id: `bundle-item-${Date.now()}`,
        bundleId,
        productId: testProductId,
        productSKU: 'SKU-TEST',
        productName: 'Test Product',
        barcode: 'TEST-BARCODE',
        quantity: 2,
        price: 100000,
        createdAt: new Date(),
      });

      const customPricingId = `custom-pricing-${Date.now()}`;
      await db.insert(customPricing).values({
        id: customPricingId,
        productId: testProductId,
        userId: 'customer-123',
        customPrice: 95000,
        createdAt: new Date(),
      });

      // Attempt to delete
      const result = await deleteProductUseCase.execute({
        productId: testProductId,
        userId: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.cannotDeleteReasons).toHaveLength(2);
      expect(result.cannotDeleteReasons?.[0]).toContain('active bundle');
      expect(result.cannotDeleteReasons?.[1]).toContain('custom pricing');

      // Cleanup
      await db.delete(bundleItems).where(eq(bundleItems.bundleId, bundleId));
      await db.delete(productBundles).where(eq(productBundles.id, bundleId));
      await db.delete(customPricing).where(eq(customPricing.id, customPricingId));
      await db.delete(products).where(eq(products.id, testProductId));
    });
  });

  describe('Cascade Delete - Success Cases', () => {
    it('should successfully delete product without dependencies', async () => {
      const result = await deleteProductUseCase.execute({
        productId: testProductId,
        userId: 'test-user',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');

      // Verify product is deleted
      const product = await db.select().from(products).where(eq(products.id, testProductId)).get();

      expect(product).toBeUndefined();
    });

    it('should CASCADE delete to productUOMs when product is deleted', async () => {
      // Create product UOMs
      const uomId1 = `uom-${Date.now()}-1`;
      const uomId2 = `uom-${Date.now()}-2`;

      await db.insert(productUOMs).values([
        {
          id: uomId1,
          productId: testProductId,
          uomCode: 'DOZEN',
          uomName: 'Dozen',
          barcode: `DOZEN-${Date.now()}`,
          conversionFactor: 12,
          stock: 5,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uomId2,
          productId: testProductId,
          uomCode: 'BOX24',
          uomName: 'Box (24 PCS)',
          barcode: `BOX-${Date.now()}`,
          conversionFactor: 24,
          stock: 3,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Verify UOMs exist
      const uomsBefore = await db
        .select()
        .from(productUOMs)
        .where(eq(productUOMs.productId, testProductId))
        .all();

      expect(uomsBefore).toHaveLength(2);

      // Delete product
      const result = await deleteProductUseCase.execute({
        productId: testProductId,
        userId: 'test-user',
      });

      expect(result.success).toBe(true);

      // Verify UOMs are CASCADE deleted
      const uomsAfter = await db
        .select()
        .from(productUOMs)
        .where(eq(productUOMs.productId, testProductId))
        .all();

      expect(uomsAfter).toHaveLength(0);
    });

    it('should CASCADE delete to productVariants when product is deleted', async () => {
      // Create product variants
      const variantId1 = `variant-${Date.now()}-1`;
      const variantId2 = `variant-${Date.now()}-2`;

      await db.insert(productVariants).values([
        {
          id: variantId1,
          productId: testProductId,
          productName: 'Test Product',
          productSKU: 'SKU-TEST',
          variantName: 'Red',
          variantSKU: `SKU-TEST-RED-${Date.now()}`,
          variantType: 'Color',
          price: 105000,
          stock: 25,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: variantId2,
          productId: testProductId,
          productName: 'Test Product',
          productSKU: 'SKU-TEST',
          variantName: 'Blue',
          variantSKU: `SKU-TEST-BLUE-${Date.now()}`,
          variantType: 'Color',
          price: 105000,
          stock: 25,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Verify variants exist
      const variantsBefore = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, testProductId))
        .all();

      expect(variantsBefore).toHaveLength(2);

      // Delete product
      const result = await deleteProductUseCase.execute({
        productId: testProductId,
        userId: 'test-user',
      });

      expect(result.success).toBe(true);

      // Verify variants are CASCADE deleted
      const variantsAfter = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, testProductId))
        .all();

      expect(variantsAfter).toHaveLength(0);
    });

    it('should CASCADE delete to productImages when product is deleted', async () => {
      // Create product images
      const imageId1 = `image-${Date.now()}-1`;
      const imageId2 = `image-${Date.now()}-2`;

      await db.insert(productImages).values([
        {
          id: imageId1,
          productId: testProductId,
          filename: 'test-image-1.jpg',
          originalName: 'test-image-1.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          isPrimary: true,
          sortOrder: 0,
          thumbnailUrl: 'https://cdn.example.com/thumb-1.jpg',
          mediumUrl: 'https://cdn.example.com/medium-1.jpg',
          largeUrl: 'https://cdn.example.com/large-1.jpg',
          originalUrl: 'https://cdn.example.com/original-1.jpg',
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: imageId2,
          productId: testProductId,
          filename: 'test-image-2.jpg',
          originalName: 'test-image-2.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          isPrimary: false,
          sortOrder: 1,
          thumbnailUrl: 'https://cdn.example.com/thumb-2.jpg',
          mediumUrl: 'https://cdn.example.com/medium-2.jpg',
          largeUrl: 'https://cdn.example.com/large-2.jpg',
          originalUrl: 'https://cdn.example.com/original-2.jpg',
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Verify images exist
      const imagesBefore = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, testProductId))
        .all();

      expect(imagesBefore).toHaveLength(2);

      // Delete product
      const result = await deleteProductUseCase.execute({
        productId: testProductId,
        userId: 'test-user',
      });

      expect(result.success).toBe(true);

      // Verify images are CASCADE deleted
      const imagesAfter = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, testProductId))
        .all();

      expect(imagesAfter).toHaveLength(0);
    });

    it('should CASCADE delete all dependent data when product is deleted', async () => {
      // Create comprehensive set of dependent data
      const uomId = `uom-${Date.now()}`;
      const variantId = `variant-${Date.now()}`;
      const imageId = `image-${Date.now()}`;

      // Add UOM
      await db.insert(productUOMs).values({
        id: uomId,
        productId: testProductId,
        uomCode: 'DOZEN',
        uomName: 'Dozen',
        barcode: `DOZEN-${Date.now()}`,
        conversionFactor: 12,
        stock: 5,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add variant
      await db.insert(productVariants).values({
        id: variantId,
        productId: testProductId,
        productName: 'Test Product',
        productSKU: 'SKU-TEST',
        variantName: 'Green',
        variantSKU: `SKU-TEST-GREEN-${Date.now()}`,
        variantType: 'Color',
        price: 105000,
        stock: 25,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add image
      await db.insert(productImages).values({
        id: imageId,
        productId: testProductId,
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        isPrimary: true,
        sortOrder: 0,
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        mediumUrl: 'https://cdn.example.com/medium.jpg',
        largeUrl: 'https://cdn.example.com/large.jpg',
        originalUrl: 'https://cdn.example.com/original.jpg',
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Delete product
      const result = await deleteProductUseCase.execute({
        productId: testProductId,
        userId: 'test-user',
      });

      expect(result.success).toBe(true);

      // Verify ALL dependent data is CASCADE deleted
      const [uomsAfter, variantsAfter, imagesAfter] = await Promise.all([
        db.select().from(productUOMs).where(eq(productUOMs.productId, testProductId)).all(),
        db.select().from(productVariants).where(eq(productVariants.productId, testProductId)).all(),
        db.select().from(productImages).where(eq(productImages.productId, testProductId)).all(),
      ]);

      expect(uomsAfter).toHaveLength(0);
      expect(variantsAfter).toHaveLength(0);
      expect(imagesAfter).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should return error when trying to delete non-existent product', async () => {
      const result = await deleteProductUseCase.execute({
        productId: 'non-existent-id',
        userId: 'test-user',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });
});
