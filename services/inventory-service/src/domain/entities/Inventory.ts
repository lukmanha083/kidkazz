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
   * Business Logic: Adjust inventory (in/out/adjustment)
   */
  public adjust(
    quantity: number,
    movementType: 'in' | 'out' | 'adjustment',
    reason?: string,
    performedBy?: string
  ): void {
    const previousQuantity = this.props.quantityAvailable.getValue();
    let newQuantity: Quantity;

    if (movementType === 'in') {
      // Stock coming in (restock)
      newQuantity = this.props.quantityAvailable.increase(Math.abs(quantity));
      this.props.lastRestockedAt = new Date();
    } else if (movementType === 'out') {
      // Stock going out (sale/transfer)
      // Allow negative stock (business rule for POS)
      newQuantity = this.props.quantityAvailable.decrease(Math.abs(quantity));
    } else {
      // Direct adjustment/correction
      newQuantity = Quantity.create(quantity);
    }

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
        movementType === 'adjustment' ? quantity - previousQuantity : (movementType === 'in' ? quantity : -quantity),
        movementType,
        reason,
        performedBy
      )
    );
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
