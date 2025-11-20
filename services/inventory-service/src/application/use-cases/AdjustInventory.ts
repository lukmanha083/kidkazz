import { Inventory } from '../../domain/entities/Inventory';
import { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { EventPublisher } from '../../infrastructure/events/EventPublisher';

interface AdjustInventoryInput {
  productId: string;
  warehouseId: string;
  quantity: number;
  movementType: 'in' | 'out' | 'adjustment';
  reason?: string;
  performedBy?: string;
}

interface AdjustInventoryOutput {
  inventoryId: string;
  productId: string;
  warehouseId: string;
  previousQuantity: number;
  newQuantity: number;
  message: string;
}

/**
 * Use Case: Adjust Inventory
 * Handles stock adjustments with event publishing
 */
export class AdjustInventory {
  constructor(
    private repository: IInventoryRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(input: AdjustInventoryInput): Promise<AdjustInventoryOutput> {
    // Find or create inventory record
    let inventory = await this.repository.findByProductAndWarehouse(
      input.productId,
      input.warehouseId
    );

    if (!inventory) {
      // Create new inventory record
      inventory = Inventory.create({
        productId: input.productId,
        warehouseId: input.warehouseId,
        initialQuantity: 0,
      });

      // Save the new record first
      await this.repository.save(inventory);

      // Publish creation event
      await this.eventPublisher.publishAll(inventory.getDomainEvents());
      inventory.clearDomainEvents();
    }

    const previousQuantity = inventory.getAvailableQuantity();

    // Adjust inventory (domain logic)
    inventory.adjust(
      input.quantity,
      input.movementType,
      input.reason,
      input.performedBy
    );

    // Persist
    await this.repository.save(inventory);

    // Publish domain events
    await this.eventPublisher.publishAll(inventory.getDomainEvents());
    inventory.clearDomainEvents();

    return {
      inventoryId: inventory.getId(),
      productId: input.productId,
      warehouseId: input.warehouseId,
      previousQuantity,
      newQuantity: inventory.getAvailableQuantity(),
      message: 'Inventory adjusted successfully',
    };
  }
}
