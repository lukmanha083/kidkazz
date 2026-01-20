export type OwnerType = 'customer' | 'supplier' | 'employee';
export type AddressType = 'billing' | 'shipping' | 'home' | 'office';

interface AddressProps {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  addressType: AddressType;
  isPrimary: boolean;
  label?: string;
  recipientName?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  subdistrict?: string;
  district?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Address Value Object
 * Represents a physical address for business partners
 */
export class Address {
  private readonly props: AddressProps;

  private constructor(props: AddressProps) {
    this.props = props;
  }

  private static validate(props: Partial<AddressProps>): void {
    if (!props.addressLine1 || props.addressLine1.trim().length === 0) {
      throw new Error('Address line 1 is required');
    }
    if (!props.city || props.city.trim().length === 0) {
      throw new Error('City is required');
    }
    if (!props.province || props.province.trim().length === 0) {
      throw new Error('Province is required');
    }
    if (!props.ownerId || props.ownerId.trim().length === 0) {
      throw new Error('Owner ID is required');
    }
    if (!props.postalCode || props.postalCode.trim().length === 0) {
      throw new Error('Postal code is required');
    }

    const validOwnerTypes: OwnerType[] = ['customer', 'supplier', 'employee'];
    if (!validOwnerTypes.includes(props.ownerType as OwnerType)) {
      throw new Error('Owner type must be customer, supplier, or employee');
    }

    const validAddressTypes: AddressType[] = ['billing', 'shipping', 'home', 'office'];
    if (!validAddressTypes.includes(props.addressType as AddressType)) {
      throw new Error('Address type must be billing, shipping, home, or office');
    }
  }

  public static create(input: {
    ownerType: OwnerType;
    ownerId: string;
    addressType: AddressType;
    isPrimary?: boolean;
    label?: string;
    recipientName?: string;
    phone?: string;
    addressLine1: string;
    addressLine2?: string;
    subdistrict?: string;
    district?: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Address {
    Address.validate(input);

    const now = new Date();
    const id = `addr-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    return new Address({
      id,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      addressType: input.addressType,
      isPrimary: input.isPrimary ?? false,
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      subdistrict: input.subdistrict,
      district: input.district,
      city: input.city,
      province: input.province,
      postalCode: input.postalCode,
      country: input.country || 'Indonesia',
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstitute(data: AddressProps): Address {
    return new Address(data);
  }

  // Getters
  public getId(): string {
    return this.props.id;
  }

  public getOwnerType(): OwnerType {
    return this.props.ownerType;
  }

  public getOwnerId(): string {
    return this.props.ownerId;
  }

  public getAddressType(): AddressType {
    return this.props.addressType;
  }

  public isPrimary(): boolean {
    return this.props.isPrimary;
  }

  public getLabel(): string | undefined {
    return this.props.label;
  }

  public getRecipientName(): string | undefined {
    return this.props.recipientName;
  }

  public getPhone(): string | undefined {
    return this.props.phone;
  }

  public getAddressLine1(): string {
    return this.props.addressLine1;
  }

  public getAddressLine2(): string | undefined {
    return this.props.addressLine2;
  }

  public getSubdistrict(): string | undefined {
    return this.props.subdistrict;
  }

  public getDistrict(): string | undefined {
    return this.props.district;
  }

  public getCity(): string {
    return this.props.city;
  }

  public getProvince(): string {
    return this.props.province;
  }

  public getPostalCode(): string {
    return this.props.postalCode;
  }

  public getCountry(): string {
    return this.props.country;
  }

  public getLatitude(): number | undefined {
    return this.props.latitude;
  }

  public getLongitude(): number | undefined {
    return this.props.longitude;
  }

  public getNotes(): string | undefined {
    return this.props.notes;
  }

  public getFullAddress(): string {
    const parts = [
      this.props.addressLine1,
      this.props.addressLine2,
      this.props.city,
      `${this.props.province} ${this.props.postalCode}`,
      this.props.country,
    ].filter(Boolean);
    return parts.join(', ');
  }

  public setAsPrimary(): Address {
    return new Address({
      ...this.props,
      isPrimary: true,
      updatedAt: new Date(),
    });
  }

  public unsetAsPrimary(): Address {
    return new Address({
      ...this.props,
      isPrimary: false,
      updatedAt: new Date(),
    });
  }

  public toData() {
    return {
      id: this.props.id,
      ownerType: this.props.ownerType,
      ownerId: this.props.ownerId,
      addressType: this.props.addressType,
      isPrimary: this.props.isPrimary,
      label: this.props.label,
      recipientName: this.props.recipientName,
      phone: this.props.phone,
      addressLine1: this.props.addressLine1,
      addressLine2: this.props.addressLine2,
      subdistrict: this.props.subdistrict,
      district: this.props.district,
      city: this.props.city,
      province: this.props.province,
      postalCode: this.props.postalCode,
      country: this.props.country,
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      notes: this.props.notes,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
