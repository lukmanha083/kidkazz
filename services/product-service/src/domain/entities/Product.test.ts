import { describe, expect, it } from 'vitest';
import { Product } from './Product';

describe('Product Entity', () => {
  describe('create', () => {
    it('should create a product with valid data', () => {
      // Arrange
      const input = {
        barcode: 'TEST-001',
        name: 'Test Product',
        sku: 'SKU-TEST-001',
        description: 'A test product',
        price: 50000,
        retailPrice: 60000,
        wholesalePrice: 45000,
        baseUnit: 'PCS',
        wholesaleThreshold: 100,
        minimumOrderQuantity: 1,
        availableForRetail: true,
        availableForWholesale: true,
        createdBy: 'test-user',
      };

      // Act
      const product = Product.create(input);

      // Assert
      expect(product).toBeDefined();
      expect(product.name).toBe('Test Product');
      expect(product.barcode).toBe('TEST-001');
      expect(product.baseUnit).toBe('PCS');
      expect(product.price.amount).toBe(50000);
      expect(product.retailPrice.amount).toBe(60000);
      expect(product.wholesalePrice.amount).toBe(45000);
      expect(product.availableForRetail).toBe(true);
      expect(product.availableForWholesale).toBe(true);
      expect(product.status).toBe('omnichannel sales');
    });

    it('should create product with default retail and wholesale prices', () => {
      // Arrange
      const input = {
        barcode: 'TEST-002',
        name: 'Test Product 2',
        sku: 'SKU-TEST-002',
        price: 50000,
        baseUnit: 'PCS',
      };

      // Act
      const product = Product.create(input);

      // Assert
      expect(product.price.amount).toBe(50000);
      expect(product.retailPrice.amount).toBe(50000); // Should default to price
      expect(product.wholesalePrice.amount).toBe(50000); // Should default to price
    });

    it('should create product with physical attributes', () => {
      // Arrange
      const input = {
        barcode: 'TEST-003',
        name: 'Test Product with Dimensions',
        sku: 'SKU-TEST-003',
        price: 50000,
        baseUnit: 'PCS',
        physicalAttributes: {
          weight: 2.5, // kg
          length: 30, // cm
          width: 20, // cm
          height: 15, // cm
        },
      };

      // Act
      const product = Product.create(input);

      // Assert
      expect(product.physicalAttributes).toBeDefined();
      expect(product.physicalAttributes?.weight).toBe(2.5);
      expect(product.physicalAttributes?.length).toBe(30);
      expect(product.physicalAttributes?.width).toBe(20);
      expect(product.physicalAttributes?.height).toBe(15);
    });

    it('should reject product with negative price', () => {
      // Arrange
      const input = {
        barcode: 'TEST-004',
        name: 'Test Product',
        sku: 'SKU-TEST-004',
        price: -100, // Invalid
        baseUnit: 'PCS',
      };

      // Act & Assert
      expect(() => Product.create(input)).toThrow();
    });

    it('should reject product with empty name', () => {
      // Arrange
      const input = {
        barcode: 'TEST-005',
        name: '', // Invalid
        sku: 'SKU-TEST-005',
        price: 50000,
        baseUnit: 'PCS',
      };

      // Act & Assert
      expect(() => Product.create(input)).toThrow();
    });
  });

  describe('changePrice', () => {
    it('should update product price', () => {
      // Arrange
      const product = Product.create({
        barcode: 'TEST-006',
        name: 'Test Product',
        sku: 'SKU-TEST-006',
        price: 50000,
        baseUnit: 'PCS',
      });

      // Act
      product.changePrice(75000, 'test-user');

      // Assert
      expect(product.price.amount).toBe(75000);
      expect(product.updatedBy).toBe('test-user');
    });

    it('should reject negative price update', () => {
      // Arrange
      const product = Product.create({
        barcode: 'TEST-007',
        name: 'Test Product',
        sku: 'SKU-TEST-007',
        price: 50000,
        baseUnit: 'PCS',
      });

      // Act & Assert
      expect(() => product.changePrice(-100, 'test-user')).toThrow();
    });
  });

  describe('adjustStock', () => {
    it('should increase stock', () => {
      // Arrange
      const product = Product.create({
        barcode: 'TEST-008',
        name: 'Test Product',
        sku: 'SKU-TEST-008',
        price: 50000,
        baseUnit: 'PCS',
      });

      // Act
      product.adjustStock(100, 'test-user');

      // Assert
      expect(product.stock.quantity).toBe(100);
    });

    it('should decrease stock', () => {
      // Arrange
      const product = Product.create({
        barcode: 'TEST-009',
        name: 'Test Product',
        sku: 'SKU-TEST-009',
        price: 50000,
        baseUnit: 'PCS',
      });
      product.adjustStock(100, 'test-user');

      // Act
      product.adjustStock(-50, 'test-user');

      // Assert
      expect(product.stock.quantity).toBe(50);
    });

    it('should prevent negative stock', () => {
      // Arrange
      const product = Product.create({
        barcode: 'TEST-010',
        name: 'Test Product',
        sku: 'SKU-TEST-010',
        price: 50000,
        baseUnit: 'PCS',
      });
      product.adjustStock(10, 'test-user');

      // Act & Assert
      expect(() => product.adjustStock(-20, 'test-user')).toThrow();
    });
  });

  describe('discontinue', () => {
    it('should mark product as discontinued', () => {
      // Arrange
      const product = Product.create({
        barcode: 'TEST-011',
        name: 'Test Product',
        sku: 'SKU-TEST-011',
        price: 50000,
        baseUnit: 'PCS',
      });

      // Act
      product.discontinue('test-user', 'Product discontinued');

      // Assert
      expect(product.status).toBe('discontinued');
      expect(product.updatedBy).toBe('test-user');
    });
  });

  describe('business rules', () => {
    it('should emit ProductCreated event on creation', () => {
      // Arrange & Act
      const product = Product.create({
        barcode: 'TEST-012',
        name: 'Test Product',
        sku: 'SKU-TEST-012',
        price: 50000,
        baseUnit: 'PCS',
      });

      // Assert
      const events = product.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ProductCreated');
    });

    it('should emit PriceChanged event when price changes', () => {
      // Arrange
      const product = Product.create({
        barcode: 'TEST-013',
        name: 'Test Product',
        sku: 'SKU-TEST-013',
        price: 50000,
        baseUnit: 'PCS',
      });
      product.markEventsAsCommitted();

      // Act
      product.changePrice(75000, 'test-user');

      // Assert
      const events = product.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('PriceChanged');
    });

    it('should emit StockAdjusted event when stock changes', () => {
      // Arrange
      const product = Product.create({
        barcode: 'TEST-014',
        name: 'Test Product',
        sku: 'SKU-TEST-014',
        price: 50000,
        baseUnit: 'PCS',
      });
      product.markEventsAsCommitted();

      // Act
      product.adjustStock(100, 'test-user');

      // Assert
      const events = product.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('StockAdjusted');
    });
  });
});
