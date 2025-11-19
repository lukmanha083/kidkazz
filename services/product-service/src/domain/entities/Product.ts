import { Price, SKU, ProductId, Result, ResultFactory, InvalidOperationError } from '../../shared/types';
import { ProductCreated, ProductPriceUpdated, ProductAvailabilityChanged } from '../../shared/events';
import { generateId, generateTimestamp } from '../../shared/utils/helpers';

/**
 * Domain Event base type for Product
 */
export type ProductDomainEvent = ProductCreated | ProductPriceUpdated | ProductAvailabilityChanged;

/**
 * Product Availability Value Object
 */
export class ProductAvailability {
  private constructor(
    private readonly retail: boolean,
    private readonly wholesale: boolean
  ) {}

  static create(retail: boolean, wholesale: boolean): ProductAvailability {
    return new ProductAvailability(retail, wholesale);
  }

  isAvailableForRetail(): boolean {
    return this.retail;
  }

  isAvailableForWholesale(): boolean {
    return this.wholesale;
  }

  toJSON() {
    return {
      retail: this.retail,
      wholesale: this.wholesale,
    };
  }
}

/**
 * Product Entity (Domain Model)
 * Rich domain object with business logic
 */
export class Product {
  private domainEvents: ProductDomainEvent[] = [];

  private constructor(
    private readonly id: ProductId,
    private name: string,
    private sku: SKU,
    private description: string,
    private retailPrice: Price | null,
    private wholesalePrice: Price,
    private availability: ProductAvailability,
    private minimumOrderQuantity: number,
    private status: 'active' | 'inactive' | 'discontinued'
  ) {}

  /**
   * Factory method to create a new Product
   */
  static create(params: {
    name: string;
    sku: string;
    description: string;
    retailPrice: number | null;
    wholesalePrice: number;
    availability: { retail: boolean; wholesale: boolean };
    minimumOrderQuantity?: number;
  }): Result<Product> {
    // Business Rule: Product must be available for at least one market
    if (!params.availability.retail && !params.availability.wholesale) {
      return ResultFactory.fail(
        new InvalidOperationError('Product must be available for at least one market (retail or wholesale)')
      );
    }

    // Business Rule: If available for wholesale, must have valid wholesale price
    if (params.availability.wholesale && params.wholesalePrice <= 0) {
      return ResultFactory.fail(
        new InvalidOperationError('Wholesale products require valid base price')
      );
    }

    // Business Rule: If available for retail, must have retail price
    if (params.availability.retail && params.retailPrice === null) {
      return ResultFactory.fail(
        new InvalidOperationError('Retail products require valid retail price')
      );
    }

    const product = new Product(
      generateId(),
      params.name,
      SKU.create(params.sku),
      params.description,
      params.retailPrice ? Price.create(params.retailPrice) : null,
      Price.create(params.wholesalePrice),
      ProductAvailability.create(params.availability.retail, params.availability.wholesale),
      params.minimumOrderQuantity || 1,
      'active'
    );

    // Raise domain event
    product.addDomainEvent({
      eventId: generateId(),
      eventType: 'ProductCreated',
      aggregateId: product.id,
      timestamp: generateTimestamp(),
      version: 1,
      productId: product.id,
      name: product.name,
      sku: product.sku.getValue(),
      retailPrice: product.retailPrice?.getValue() || null,
      wholesalePrice: product.wholesalePrice.getValue(),
      availableForRetail: product.availability.isAvailableForRetail(),
      availableForWholesale: product.availability.isAvailableForWholesale(),
    } as ProductCreated);

    return ResultFactory.ok(product);
  }

  /**
   * Update retail price
   */
  updateRetailPrice(newPrice: number): Result<void> {
    if (!this.availability.isAvailableForRetail()) {
      return ResultFactory.fail(
        new InvalidOperationError('Cannot set retail price for wholesale-only product')
      );
    }

    this.retailPrice = Price.create(newPrice);

    this.addDomainEvent({
      eventId: generateId(),
      eventType: 'ProductPriceUpdated',
      aggregateId: this.id,
      timestamp: generateTimestamp(),
      version: 1,
      productId: this.id,
      newPrice,
      priceType: 'retail',
    } as ProductPriceUpdated);

    return ResultFactory.ok(undefined);
  }

  /**
   * Update wholesale price
   */
  updateWholesalePrice(newPrice: number): Result<void> {
    if (!this.availability.isAvailableForWholesale()) {
      return ResultFactory.fail(
        new InvalidOperationError('Cannot set wholesale price for retail-only product')
      );
    }

    this.wholesalePrice = Price.create(newPrice);

    this.addDomainEvent({
      eventId: generateId(),
      eventType: 'ProductPriceUpdated',
      aggregateId: this.id,
      timestamp: generateTimestamp(),
      version: 1,
      productId: this.id,
      newPrice,
      priceType: 'wholesale',
    } as ProductPriceUpdated);

    return ResultFactory.ok(undefined);
  }

  /**
   * Change product availability
   */
  changeAvailability(retail: boolean, wholesale: boolean): Result<void> {
    if (!retail && !wholesale) {
      return ResultFactory.fail(
        new InvalidOperationError('Product must be available for at least one market')
      );
    }

    this.availability = ProductAvailability.create(retail, wholesale);

    this.addDomainEvent({
      eventId: generateId(),
      eventType: 'ProductAvailabilityChanged',
      aggregateId: this.id,
      timestamp: generateTimestamp(),
      version: 1,
      productId: this.id,
      availableForRetail: retail,
      availableForWholesale: wholesale,
    } as ProductAvailabilityChanged);

    return ResultFactory.ok(undefined);
  }

  /**
   * Discontinue product
   */
  discontinue(): void {
    this.status = 'discontinued';
  }

  // Getters
  getId(): ProductId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getSKU(): SKU {
    return this.sku;
  }

  getRetailPrice(): Price | null {
    return this.retailPrice;
  }

  getWholesalePrice(): Price {
    return this.wholesalePrice;
  }

  getAvailability(): ProductAvailability {
    return this.availability;
  }

  getMinimumOrderQuantity(): number {
    return this.minimumOrderQuantity;
  }

  getStatus(): string {
    return this.status;
  }

  // Domain Events Management
  private addDomainEvent(event: ProductDomainEvent): void {
    this.domainEvents.push(event);
  }

  getDomainEvents(): ProductDomainEvent[] {
    return this.domainEvents;
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
