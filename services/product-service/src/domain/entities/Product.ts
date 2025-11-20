import { AggregateRoot } from '@kidkazz/ddd-core';
import { Money } from '../value-objects/Money';
import { SKU } from '../value-objects/SKU';
import { Stock } from '../value-objects/Stock';
import { ProductCreated } from '../events/ProductCreated';
import { StockAdjusted } from '../events/StockAdjusted';
import { PriceChanged } from '../events/PriceChanged';
import { ProductDiscontinued } from '../events/ProductDiscontinued';

export type ProductStatus = 'active' | 'inactive' | 'discontinued';

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
    availableForRetail?: boolean;
    availableForWholesale?: boolean;
    createdBy?: string;
  }): Product {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const sku = SKU.create(input.sku);
    const price = Money.create(input.price);
    const retailPrice = Money.create(input.retailPrice || input.price);
    const wholesalePrice = Money.create(input.wholesalePrice || input.price);

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
      rating: 0,
      reviews: 0,
      availableForRetail: input.availableForRetail !== false,
      availableForWholesale: input.availableForWholesale || false,
      status: 'active',
      isBundle: false,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    });

    // Raise domain event
    product.addDomainEvent(
      new ProductCreated(id, input.name, input.sku, input.price)
    );

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
  public adjustStock(adjustment: number, reason: string, performedBy: string): void {
    const previousStock = this.props.stock.getValue();

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
        reason,
        performedBy
      )
    );
  }

  /**
   * Business Logic: Change price
   */
  public changePrice(
    priceType: 'retail' | 'wholesale' | 'base',
    newPrice: number,
    performedBy: string
  ): void {
    // Business rule: Cannot change price of discontinued product
    if (this.props.status === 'discontinued') {
      throw new Error('Cannot change price of discontinued product');
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
    this.props.updatedBy = performedBy;

    // Raise domain event
    this.addDomainEvent(
      new PriceChanged(this.props.id, priceType, oldPrice, newPrice)
    );
  }

  /**
   * Business Logic: Discontinue product
   */
  public discontinue(reason?: string): void {
    // Business rule: Cannot discontinue if already discontinued
    if (this.props.status === 'discontinued') {
      throw new Error('Product is already discontinued');
    }

    this.props.status = 'discontinued';
    this.props.availableForRetail = false;
    this.props.availableForWholesale = false;
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(new ProductDiscontinued(this.props.id, reason));
  }

  /**
   * Business Logic: Activate product
   */
  public activate(): void {
    if (this.props.status === 'discontinued') {
      throw new Error('Cannot activate discontinued product');
    }
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  /**
   * Business Logic: Deactivate product
   */
  public deactivate(): void {
    if (this.props.status === 'discontinued') {
      throw new Error('Cannot deactivate discontinued product');
    }
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
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
    if (this.props.status !== 'active') {
      return false;
    }
    return type === 'retail'
      ? this.props.availableForRetail
      : this.props.availableForWholesale;
  }

  // Getters
  public getName(): string { return this.props.name; }
  public getSKU(): string { return this.props.sku.getValue(); }
  public getStock(): number { return this.props.stock.getValue(); }
  public getPrice(): number { return this.props.price.getValue(); }
  public getRetailPrice(): number { return this.props.retailPrice.getValue(); }
  public getWholesalePrice(): number { return this.props.wholesalePrice.getValue(); }
  public getStatus(): ProductStatus { return this.props.status; }
  public getBarcode(): string { return this.props.barcode; }
  public getCategoryId(): string | undefined { return this.props.categoryId; }

  /**
   * Convert to data for persistence
   */
  public toData() {
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
