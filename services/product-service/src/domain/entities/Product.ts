import { AggregateRoot } from '@kidkazz/ddd-core';
import { PriceChanged } from '../events/PriceChanged';
import { ProductCreated } from '../events/ProductCreated';
import { ProductDiscontinued } from '../events/ProductDiscontinued';
import { StockAdjusted } from '../events/StockAdjusted';
import { Money } from '../value-objects/Money';
import { PhysicalAttributes } from '../value-objects/PhysicalAttributes';
import { SKU } from '../value-objects/SKU';
import { Stock } from '../value-objects/Stock';

export type ProductStatus =
  | 'online sales'
  | 'offline sales'
  | 'omnichannel sales'
  | 'inactive'
  | 'discontinued';

interface ProductProps {
  id: string;
  barcode: string;
  name: string;
  sku: SKU;
  description?: string;
  image?: string;
  categoryId?: string;
  price: Money;
  retailPrice: Money;
  wholesalePrice: Money;
  stock: Stock;
  baseUnit: string;
  wholesaleThreshold: number;
  minimumOrderQuantity: number;
  minimumStock?: number; // Minimum stock threshold for alert reports
  physicalAttributes?: PhysicalAttributes; // NEW: Physical dimensions and weight
  rating: number;
  reviews: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  status: ProductStatus;
  isBundle: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Product Aggregate Root
 * Encapsulates product business logic and invariants
 */
export class Product extends AggregateRoot {
  private props: ProductProps;

  private constructor(props: ProductProps) {
    super(props.id);
    this.props = props;
  }

  /**
   * Factory method to create a new product
   */
  public static create(input: {
    barcode: string;
    name: string;
    sku: string;
    description?: string;
    image?: string;
    categoryId?: string;
    price: number;
    retailPrice?: number;
    wholesalePrice?: number;
    baseUnit: string;
    wholesaleThreshold?: number;
    minimumOrderQuantity?: number;
    minimumStock?: number;
    physicalAttributes?: { weight: number; length: number; width: number; height: number }; // NEW
    availableForRetail?: boolean;
    availableForWholesale?: boolean;
    createdBy?: string;
  }): Product {
    // Validate name
    if (!input.name || input.name.trim() === '') {
      throw new Error('Product name cannot be empty');
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const sku = SKU.create(input.sku);
    const price = Money.create(input.price);
    const retailPrice = Money.create(input.retailPrice || input.price);
    const wholesalePrice = Money.create(input.wholesalePrice || input.price);

    // Create physical attributes if provided
    let physicalAttributes: PhysicalAttributes | undefined;
    if (input.physicalAttributes) {
      physicalAttributes = PhysicalAttributes.create(input.physicalAttributes);
    }

    // Determine availability flags
    const availableForRetail = input.availableForRetail !== false;
    const availableForWholesale = input.availableForWholesale || false;

    // Derive status from availability flags
    let status: ProductStatus;
    if (availableForRetail && availableForWholesale) {
      status = 'omnichannel sales';
    } else if (availableForRetail) {
      status = 'online sales';
    } else if (availableForWholesale) {
      status = 'offline sales';
    } else {
      status = 'inactive';
    }

    const product = new Product({
      id,
      barcode: input.barcode,
      name: input.name,
      sku,
      description: input.description,
      image: input.image,
      categoryId: input.categoryId,
      price,
      retailPrice,
      wholesalePrice,
      stock: Stock.zero(),
      baseUnit: input.baseUnit,
      wholesaleThreshold: input.wholesaleThreshold || 10,
      minimumOrderQuantity: input.minimumOrderQuantity || 1,
      minimumStock: input.minimumStock,
      physicalAttributes,
      rating: 0,
      reviews: 0,
      availableForRetail,
      availableForWholesale,
      status,
      isBundle: false,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    });

    // Raise domain event
    product.addDomainEvent(new ProductCreated(id, input.name, input.sku, input.price));

    return product;
  }

  /**
   * Reconstitute product from persistence
   */
  public static reconstitute(data: {
    id: string;
    barcode: string;
    name: string;
    sku: string;
    description?: string;
    image?: string;
    categoryId?: string;
    price: number;
    retailPrice: number;
    wholesalePrice: number;
    stock: number;
    baseUnit: string;
    wholesaleThreshold: number;
    minimumOrderQuantity: number;
    minimumStock?: number;
    weight?: number; // NEW
    length?: number; // NEW
    width?: number; // NEW
    height?: number; // NEW
    rating: number;
    reviews: number;
    availableForRetail: boolean;
    availableForWholesale: boolean;
    status: ProductStatus;
    isBundle: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
  }): Product {
    // Reconstitute physical attributes if data is present
    let physicalAttributes: PhysicalAttributes | undefined;
    if (
      data.weight !== null &&
      data.weight !== undefined &&
      data.length &&
      data.width &&
      data.height
    ) {
      physicalAttributes = PhysicalAttributes.create({
        weight: data.weight,
        length: data.length,
        width: data.width,
        height: data.height,
      });
    }

    return new Product({
      id: data.id,
      barcode: data.barcode,
      name: data.name,
      sku: SKU.create(data.sku),
      description: data.description,
      image: data.image,
      categoryId: data.categoryId,
      price: Money.create(data.price),
      retailPrice: Money.create(data.retailPrice),
      wholesalePrice: Money.create(data.wholesalePrice),
      stock: Stock.create(data.stock),
      baseUnit: data.baseUnit,
      wholesaleThreshold: data.wholesaleThreshold,
      minimumOrderQuantity: data.minimumOrderQuantity,
      minimumStock: data.minimumStock,
      physicalAttributes, // NEW
      rating: data.rating,
      reviews: data.reviews,
      availableForRetail: data.availableForRetail,
      availableForWholesale: data.availableForWholesale,
      status: data.status,
      isBundle: data.isBundle,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    });
  }

  /**
   * Business Logic: Adjust stock
   */
  public adjustStock(adjustment: number, performedBy: string, reason?: string): void {
    const previousStock = this.props.stock.getValue();

    // Business rule: Cannot adjust stock to negative value
    if (previousStock + adjustment < 0) {
      throw new Error('Cannot adjust stock to negative value');
    }

    if (adjustment > 0) {
      this.props.stock = this.props.stock.increase(Math.abs(adjustment));
    } else if (adjustment < 0) {
      this.props.stock = this.props.stock.decrease(Math.abs(adjustment));
    }

    this.props.updatedAt = new Date();
    this.props.updatedBy = performedBy;

    // Raise domain event
    this.addDomainEvent(
      new StockAdjusted(
        this.props.id,
        previousStock,
        this.props.stock.getValue(),
        adjustment,
        reason || 'Stock adjustment',
        performedBy
      )
    );
  }

  /**
   * Business Logic: Change price (base price by default)
   */
  public changePrice(newPrice: number, performedBy: string): void;
  public changePrice(
    priceType: 'retail' | 'wholesale' | 'base',
    newPrice: number,
    performedBy: string
  ): void;
  public changePrice(
    newPriceOrType: number | 'retail' | 'wholesale' | 'base',
    performedByOrPrice: string | number,
    performedBy?: string
  ): void {
    // Business rule: Cannot change price of discontinued product
    if (this.props.status === 'discontinued') {
      throw new Error('Cannot change price of discontinued product');
    }

    let priceType: 'retail' | 'wholesale' | 'base';
    let newPrice: number;
    let performedByUser: string;

    // Handle overloaded signatures
    if (typeof newPriceOrType === 'number') {
      // Simple signature: changePrice(newPrice, performedBy)
      priceType = 'base';
      newPrice = newPriceOrType;
      performedByUser = performedByOrPrice as string;
    } else {
      // Full signature: changePrice(priceType, newPrice, performedBy)
      priceType = newPriceOrType;
      newPrice = performedByOrPrice as number;
      performedByUser = performedBy!;
    }

    let oldPrice: number;
    const newMoney = Money.create(newPrice);

    switch (priceType) {
      case 'retail':
        oldPrice = this.props.retailPrice.getValue();
        this.props.retailPrice = newMoney;
        break;
      case 'wholesale':
        oldPrice = this.props.wholesalePrice.getValue();
        this.props.wholesalePrice = newMoney;
        break;
      case 'base':
        oldPrice = this.props.price.getValue();
        this.props.price = newMoney;
        break;
    }

    this.props.updatedAt = new Date();
    this.props.updatedBy = performedByUser;

    // Raise domain event
    this.addDomainEvent(new PriceChanged(this.props.id, priceType, oldPrice, newPrice));
  }

  /**
   * Business Logic: Discontinue product
   */
  public discontinue(performedBy: string, reason?: string): void {
    // Business rule: Cannot discontinue if already discontinued
    if (this.props.status === 'discontinued') {
      throw new Error('Product is already discontinued');
    }

    this.props.status = 'discontinued';
    this.props.availableForRetail = false;
    this.props.availableForWholesale = false;
    this.props.updatedAt = new Date();
    this.props.updatedBy = performedBy;

    // Raise domain event
    this.addDomainEvent(new ProductDiscontinued(this.props.id, reason));
  }

  /**
   * Business Logic: Change product status
   */
  public changeStatus(newStatus: ProductStatus, performedBy?: string): void {
    // Business rule: Cannot change status from discontinued to any other status
    if (this.props.status === 'discontinued' && newStatus !== 'discontinued') {
      throw new Error(
        'Cannot change status of discontinued product. Product is permanently discontinued.'
      );
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    if (performedBy) {
      this.props.updatedBy = performedBy;
    }

    // Update availability flags based on status
    switch (newStatus) {
      case 'online sales':
        this.props.availableForRetail = true;
        this.props.availableForWholesale = false; // Will be shown on wholesale if above threshold
        break;
      case 'offline sales':
        this.props.availableForRetail = false;
        this.props.availableForWholesale = true;
        break;
      case 'omnichannel sales':
        this.props.availableForRetail = true;
        this.props.availableForWholesale = true;
        break;
      case 'inactive':
      case 'discontinued':
        this.props.availableForRetail = false;
        this.props.availableForWholesale = false;
        break;
    }
  }

  /**
   * Business Logic: Activate product (set to omnichannel sales)
   * @deprecated Use changeStatus() instead
   */
  public activate(): void {
    this.changeStatus('omnichannel sales');
  }

  /**
   * Business Logic: Deactivate product
   * @deprecated Use changeStatus() instead
   */
  public deactivate(): void {
    this.changeStatus('inactive');
  }

  /**
   * Business Query: Check if stock is below minimum
   */
  public isStockBelowMinimum(): boolean {
    return this.props.stock.getValue() < this.props.minimumOrderQuantity;
  }

  /**
   * Business Query: Check if product is available for sale
   */
  public isAvailableForSale(type: 'retail' | 'wholesale'): boolean {
    // Discontinued and inactive products are never available
    if (this.props.status === 'discontinued' || this.props.status === 'inactive') {
      return false;
    }

    // Check availability based on sales channel
    if (type === 'retail') {
      return this.props.status === 'online sales' || this.props.status === 'omnichannel sales';
    }
    // Wholesale
    return this.props.status === 'offline sales' || this.props.status === 'omnichannel sales';
  }

  /**
   * Business Query: Check if product is available online
   */
  public isAvailableOnline(): boolean {
    return this.props.status === 'online sales' || this.props.status === 'omnichannel sales';
  }

  /**
   * Business Query: Check if product is available offline
   */
  public isAvailableOffline(): boolean {
    return this.props.status === 'offline sales' || this.props.status === 'omnichannel sales';
  }

  // Getters
  public getName(): string {
    return this.props.name;
  }
  public getSKU(): string {
    return this.props.sku.getValue();
  }
  public getStock(): number {
    return this.props.stock.getValue();
  }
  public getPrice(): number {
    return this.props.price.getValue();
  }
  public getRetailPrice(): number {
    return this.props.retailPrice.getValue();
  }
  public getWholesalePrice(): number {
    return this.props.wholesalePrice.getValue();
  }
  public getStatus(): ProductStatus {
    return this.props.status;
  }
  public getBarcode(): string {
    return this.props.barcode;
  }
  public getCategoryId(): string | undefined {
    return this.props.categoryId;
  }
  public getMinimumStock(): number | undefined {
    return this.props.minimumStock;
  }

  // Property getters for direct access (used by tests and external code)
  get name(): string {
    return this.props.name;
  }
  get barcode(): string {
    return this.props.barcode;
  }
  get baseUnit(): string {
    return this.props.baseUnit;
  }
  get price(): Money {
    return this.props.price;
  }
  get retailPrice(): Money {
    return this.props.retailPrice;
  }
  get wholesalePrice(): Money {
    return this.props.wholesalePrice;
  }
  get stock(): Stock {
    return this.props.stock;
  }
  get physicalAttributes(): PhysicalAttributes | undefined {
    return this.props.physicalAttributes;
  }
  get status(): ProductStatus {
    return this.props.status;
  }
  get availableForRetail(): boolean {
    return this.props.availableForRetail;
  }
  get availableForWholesale(): boolean {
    return this.props.availableForWholesale;
  }
  get updatedBy(): string | undefined {
    return this.props.updatedBy;
  }

  /**
   * Get physical attributes (weight and dimensions)
   */
  public getPhysicalAttributes(): PhysicalAttributes | undefined {
    return this.props.physicalAttributes;
  }

  /**
   * Set or update physical attributes
   */
  public setPhysicalAttributes(
    attrs: { weight: number; length: number; width: number; height: number },
    performedBy?: string
  ): void {
    this.props.physicalAttributes = PhysicalAttributes.create(attrs);
    this.props.updatedAt = new Date();
    if (performedBy) {
      this.props.updatedBy = performedBy;
    }
  }

  /**
   * Remove physical attributes
   */
  public removePhysicalAttributes(performedBy?: string): void {
    this.props.physicalAttributes = undefined;
    this.props.updatedAt = new Date();
    if (performedBy) {
      this.props.updatedBy = performedBy;
    }
  }

  /**
   * Convert to data for persistence
   */
  public toData() {
    // Extract physical attributes if present
    const physicalData = this.props.physicalAttributes
      ? this.props.physicalAttributes.toData()
      : { weight: null, length: null, width: null, height: null };

    return {
      id: this.props.id,
      barcode: this.props.barcode,
      name: this.props.name,
      sku: this.props.sku.getValue(),
      description: this.props.description,
      image: this.props.image,
      categoryId: this.props.categoryId,
      price: this.props.price.getValue(),
      retailPrice: this.props.retailPrice.getValue(),
      wholesalePrice: this.props.wholesalePrice.getValue(),
      stock: this.props.stock.getValue(),
      baseUnit: this.props.baseUnit,
      wholesaleThreshold: this.props.wholesaleThreshold,
      minimumOrderQuantity: this.props.minimumOrderQuantity,
      minimumStock: this.props.minimumStock,
      weight: physicalData.weight, // NEW
      length: physicalData.length, // NEW
      width: physicalData.width, // NEW
      height: physicalData.height, // NEW
      rating: this.props.rating,
      reviews: this.props.reviews,
      availableForRetail: this.props.availableForRetail,
      availableForWholesale: this.props.availableForWholesale,
      status: this.props.status,
      isBundle: this.props.isBundle,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      createdBy: this.props.createdBy,
      updatedBy: this.props.updatedBy,
    };
  }
}
