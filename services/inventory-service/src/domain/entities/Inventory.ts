import { AggregateRoot } from '@kidkazz/ddd-core';
import { Quantity } from '../value-objects/Quantity';
import { InventoryAdjusted } from '../events/InventoryAdjusted';
import { InventoryCreated } from '../events/InventoryCreated';

interface InventoryProps {
  id: string;
  warehouseId: string;
  productId: string;
  quantityAvailable: Quantity;
  quantityReserved: Quantity;
  quantityInTransit?: number;
  minimumStock: number;
  lastRestockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inventory Aggregate Root
 * Represents product stock at a specific warehouse
 */
export class Inventory extends AggregateRoot {
  private props: InventoryProps;

  private constructor(props: InventoryProps) {
    super(props.id);
    this.props = props;
  }

  /**
   * Factory method to create new inventory record
   */
  public static create(input: {
    warehouseId: string;
    productId: string;
    initialQuantity?: number;
  }): Inventory {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const inventory = new Inventory({
      id,
      warehouseId: input.warehouseId,
      productId: input.productId,
      quantityAvailable: Quantity.create(input.initialQuantity || 0),
      quantityReserved: Quantity.zero(),
      quantityInTransit: 0,
      minimumStock: 0,
      lastRestockedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Raise domain event
    inventory.addDomainEvent(
      new InventoryCreated(
        id,
        input.productId,
        input.warehouseId,
        input.initialQuantity || 0
      )
    );

    return inventory;
  }

  /**
   * Reconstitute inventory from persistence
   */
  public static reconstitute(data: {
    id: string;
    warehouseId: string;
    productId: string;
    quantityAvailable: number;
    quantityReserved: number;
    quantityInTransit?: number;
    minimumStock: number;
    lastRestockedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }): Inventory {
    return new Inventory({
      id: data.id,
      warehouseId: data.warehouseId,
      productId: data.productId,
      quantityAvailable: Quantity.create(data.quantityAvailable),
      quantityReserved: Quantity.create(data.quantityReserved),
      quantityInTransit: data.quantityInTransit,
      minimumStock: data.minimumStock,
      lastRestockedAt: data.lastRestockedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  /**
   * Business Logic: Adjust inventory IN (receiving stock)
   * This is for warehouse receiving operations
   */
  public adjustIn(
    quantity: number,
    reason?: string,
    performedBy?: string
  ): void {
    const previousQuantity = this.props.quantityAvailable.getValue();
    const newQuantity = this.props.quantityAvailable.increase(Math.abs(quantity));

    this.props.quantityAvailable = newQuantity;
    this.props.lastRestockedAt = new Date();
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(
      new InventoryAdjusted(
        this.props.id,
        this.props.productId,
        this.props.warehouseId,
        previousQuantity,
        newQuantity.getValue(),
        Math.abs(quantity),
        'in',
        reason,
        performedBy
      )
    );
  }

  /**
   * Business Logic: Warehouse adjustment OUT
   * STRICT VALIDATION: Cannot create negative stock
   * Use this for warehouse operations (transfers, manual adjustments, etc.)
   */
  public warehouseAdjustOut(
    quantity: number,
    reason?: string,
    performedBy?: string
  ): void {
    const previousQuantity = this.props.quantityAvailable.getValue();
    const absoluteQuantity = Math.abs(quantity);

    // BUSINESS RULE: Warehouse operations cannot create negative stock
    if (previousQuantity < absoluteQuantity) {
      throw new Error(
        `Insufficient stock for warehouse adjustment. Available: ${previousQuantity}, Requested: ${absoluteQuantity}`
      );
    }

    const newQuantity = this.props.quantityAvailable.decrease(absoluteQuantity);

    this.props.quantityAvailable = newQuantity;
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(
      new InventoryAdjusted(
        this.props.id,
        this.props.productId,
        this.props.warehouseId,
        previousQuantity,
        newQuantity.getValue(),
        -absoluteQuantity,
        'out',
        reason,
        performedBy
      )
    );
  }

  /**
   * Business Logic: POS Sale
   * ALLOWS NEGATIVE STOCK: First-pay-first-served business rule
   * Use this ONLY for Point of Sale transactions
   */
  public posSale(
    quantity: number,
    reason?: string,
    performedBy?: string
  ): void {
    const previousQuantity = this.props.quantityAvailable.getValue();
    const absoluteQuantity = Math.abs(quantity);

    // BUSINESS RULE: POS can create negative stock (first-pay-first-served)
    // No validation - allow negative
    const newQuantity = this.props.quantityAvailable.decrease(absoluteQuantity);

    this.props.quantityAvailable = newQuantity;
    this.props.updatedAt = new Date();

    // Raise domain event with special marker for POS
    this.addDomainEvent(
      new InventoryAdjusted(
        this.props.id,
        this.props.productId,
        this.props.warehouseId,
        previousQuantity,
        newQuantity.getValue(),
        -absoluteQuantity,
        'out',
        reason || 'POS Sale',
        performedBy
      )
    );
  }

  /**
   * Business Logic: Direct adjustment/correction
   * Use this for inventory corrections and audits
   */
  public directAdjustment(
    newQuantity: number,
    reason?: string,
    performedBy?: string
  ): void {
    const previousQuantity = this.props.quantityAvailable.getValue();
    const quantity = Quantity.create(newQuantity);

    this.props.quantityAvailable = quantity;
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(
      new InventoryAdjusted(
        this.props.id,
        this.props.productId,
        this.props.warehouseId,
        previousQuantity,
        quantity.getValue(),
        newQuantity - previousQuantity,
        'adjustment',
        reason,
        performedBy
      )
    );
  }

  /**
   * @deprecated Use specific methods: adjustIn, warehouseAdjustOut, posSale, or directAdjustment
   * Kept for backward compatibility
   */
  public adjust(
    quantity: number,
    movementType: 'in' | 'out' | 'adjustment',
    reason?: string,
    performedBy?: string
  ): void {
    if (movementType === 'in') {
      this.adjustIn(quantity, reason, performedBy);
    } else if (movementType === 'out') {
      // Default to strict warehouse validation
      this.warehouseAdjustOut(quantity, reason, performedBy);
    } else {
      this.directAdjustment(quantity, reason, performedBy);
    }
  }

  /**
   * Business Logic: Set minimum stock level
   */
  public setMinimumStock(minimumStock: number): void {
    if (minimumStock < 0) {
      throw new Error('Minimum stock cannot be negative');
    }
    this.props.minimumStock = minimumStock;
    this.props.updatedAt = new Date();
  }

  /**
   * Business Query: Check if stock is below minimum
   */
  public isBelowMinimum(): boolean {
    return this.props.quantityAvailable.isBelowMinimum(this.props.minimumStock);
  }

  /**
   * Business Query: Check if stock is negative
   */
  public isNegative(): boolean {
    return this.props.quantityAvailable.isNegative();
  }

  /**
   * Business Query: Get available quantity
   */
  public getAvailableQuantity(): number {
    return this.props.quantityAvailable.getValue();
  }

  // Getters
  public getProductId(): string {
    return this.props.productId;
  }

  public getWarehouseId(): string {
    return this.props.warehouseId;
  }

  public getMinimumStock(): number {
    return this.props.minimumStock;
  }

  /**
   * Convert to data for persistence
   */
  public toData() {
    return {
      id: this.props.id,
      warehouseId: this.props.warehouseId,
      productId: this.props.productId,
      quantityAvailable: this.props.quantityAvailable.getValue(),
      quantityReserved: this.props.quantityReserved.getValue(),
      quantityInTransit: this.props.quantityInTransit,
      minimumStock: this.props.minimumStock,
      lastRestockedAt: this.props.lastRestockedAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
