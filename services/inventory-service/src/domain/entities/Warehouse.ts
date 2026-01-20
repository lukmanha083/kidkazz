import { AggregateRoot } from '@kidkazz/ddd-core';
import { WarehouseCreated } from '../events/WarehouseCreated';
import { Location } from '../value-objects/Location';

export type WarehouseStatus = 'active' | 'inactive';

interface WarehouseProps {
  id: string;
  code: string;
  name: string;
  location: Location;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: WarehouseStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Warehouse Aggregate Root
 * Represents a physical warehouse location
 */
export class Warehouse extends AggregateRoot {
  private props: WarehouseProps;

  private constructor(props: WarehouseProps) {
    super(props.id);
    this.props = props;
  }

  /**
   * Factory method to create a new warehouse
   */
  public static create(input: {
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
  }): Warehouse {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const location = Location.create({
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      province: input.province,
      postalCode: input.postalCode,
      country: input.country || 'Indonesia',
    });

    const warehouse = new Warehouse({
      id,
      code: input.code,
      name: input.name,
      location,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    // Raise domain event
    warehouse.addDomainEvent(new WarehouseCreated(id, input.code, input.name));

    return warehouse;
  }

  /**
   * Reconstitute warehouse from persistence
   */
  public static reconstitute(data: {
    id: string;
    code: string;
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    status: WarehouseStatus;
    createdAt: Date;
    updatedAt: Date;
  }): Warehouse {
    return new Warehouse({
      id: data.id,
      code: data.code,
      name: data.name,
      location: Location.create({
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        country: data.country,
      }),
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  /**
   * Business Logic: Update warehouse details
   */
  public update(input: {
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
  }): void {
    if (input.name) {
      this.props.name = input.name;
    }

    // Update location if any address fields changed
    if (input.addressLine1 || input.city || input.province || input.postalCode || input.country) {
      this.props.location = Location.create({
        addressLine1: input.addressLine1 || this.props.location.getAddressLine1(),
        addressLine2:
          input.addressLine2 !== undefined
            ? input.addressLine2
            : this.props.location.getAddressLine2(),
        city: input.city || this.props.location.getCity(),
        province: input.province || this.props.location.getProvince(),
        postalCode: input.postalCode || this.props.location.getPostalCode(),
        country: input.country || this.props.location.getCountry(),
      });
    }

    if (input.contactName !== undefined) {
      this.props.contactName = input.contactName;
    }
    if (input.contactPhone !== undefined) {
      this.props.contactPhone = input.contactPhone;
    }
    if (input.contactEmail !== undefined) {
      this.props.contactEmail = input.contactEmail;
    }

    this.props.updatedAt = new Date();
  }

  /**
   * Business Logic: Activate warehouse
   */
  public activate(): void {
    if (this.props.status === 'active') {
      throw new Error('Warehouse is already active');
    }
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  /**
   * Business Logic: Deactivate warehouse
   */
  public deactivate(): void {
    if (this.props.status === 'inactive') {
      throw new Error('Warehouse is already inactive');
    }
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
  }

  // Getters
  public getCode(): string {
    return this.props.code;
  }

  public getName(): string {
    return this.props.name;
  }

  public getStatus(): WarehouseStatus {
    return this.props.status;
  }

  public isActive(): boolean {
    return this.props.status === 'active';
  }

  /**
   * Convert to data for persistence
   */
  public toData() {
    return {
      id: this.props.id,
      code: this.props.code,
      name: this.props.name,
      addressLine1: this.props.location.getAddressLine1(),
      addressLine2: this.props.location.getAddressLine2(),
      city: this.props.location.getCity(),
      province: this.props.location.getProvince(),
      postalCode: this.props.location.getPostalCode(),
      country: this.props.location.getCountry(),
      contactName: this.props.contactName,
      contactPhone: this.props.contactPhone,
      contactEmail: this.props.contactEmail,
      status: this.props.status,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
