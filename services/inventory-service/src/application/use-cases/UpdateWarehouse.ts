import { IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';
import { EventPublisher } from '../../infrastructure/events/EventPublisher';

interface UpdateWarehouseInput {
  id: string;
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

/**
 * Use Case: Update Warehouse
 */
export class UpdateWarehouse {
  constructor(
    private repository: IWarehouseRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(input: UpdateWarehouseInput) {
    // Find warehouse
    const warehouse = await this.repository.findById(input.id);
    if (!warehouse) {
      throw new Error(`Warehouse ${input.id} not found`);
    }

    // Update warehouse (domain logic)
    warehouse.update({
      name: input.name,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      province: input.province,
      postalCode: input.postalCode,
      country: input.country,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
    });

    // Persist
    await this.repository.save(warehouse);

    // Publish domain events
    await this.eventPublisher.publishAll(warehouse.getDomainEvents());
    warehouse.clearDomainEvents();

    return warehouse.toData();
  }
}
