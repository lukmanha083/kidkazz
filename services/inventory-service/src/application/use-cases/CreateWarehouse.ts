import { Warehouse } from '../../domain/entities/Warehouse';
import { IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';
import { EventPublisher } from '../../infrastructure/events/EventPublisher';

interface CreateWarehouseInput {
  code: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface CreateWarehouseOutput {
  id: string;
  code: string;
  name: string;
}

/**
 * Use Case: Create Warehouse
 */
export class CreateWarehouse {
  constructor(
    private repository: IWarehouseRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(input: CreateWarehouseInput): Promise<CreateWarehouseOutput> {
    // Business validation: Check if code already exists
    const existingByCode = await this.repository.findByCode(input.code);
    if (existingByCode) {
      throw new Error(`Warehouse with code ${input.code} already exists`);
    }

    // Create domain entity
    const warehouse = Warehouse.create(input);

    // Persist
    await this.repository.save(warehouse);

    // Publish domain events
    await this.eventPublisher.publishAll(warehouse.getDomainEvents());
    warehouse.clearDomainEvents();

    return {
      id: warehouse.getId(),
      code: warehouse.getCode(),
      name: warehouse.getName(),
    };
  }
}
