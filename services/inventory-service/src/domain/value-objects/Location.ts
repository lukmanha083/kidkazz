import { ValueObject } from '@kidkazz/ddd-core';

/**
 * Location Value Object
 * Encapsulates warehouse address information
 */
interface LocationProps {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export class Location extends ValueObject<LocationProps> {
  protected validate(value: LocationProps): void {
    if (!value.addressLine1 || value.addressLine1.trim().length === 0) {
      throw new Error('Address line 1 is required');
    }
    if (!value.city || value.city.trim().length === 0) {
      throw new Error('City is required');
    }
    if (!value.province || value.province.trim().length === 0) {
      throw new Error('Province is required');
    }
    if (!value.postalCode || value.postalCode.trim().length === 0) {
      throw new Error('Postal code is required');
    }
    if (!value.country || value.country.trim().length === 0) {
      throw new Error('Country is required');
    }
  }

  public getAddressLine1(): string {
    return this._value.addressLine1;
  }

  public getAddressLine2(): string | undefined {
    return this._value.addressLine2;
  }

  public getCity(): string {
    return this._value.city;
  }

  public getProvince(): string {
    return this._value.province;
  }

  public getPostalCode(): string {
    return this._value.postalCode;
  }

  public getCountry(): string {
    return this._value.country;
  }

  public getFullAddress(): string {
    const parts = [
      this._value.addressLine1,
      this._value.addressLine2,
      this._value.city,
      this._value.province,
      this._value.postalCode,
      this._value.country,
    ].filter(Boolean);
    return parts.join(', ');
  }

  public static create(props: LocationProps): Location {
    return new Location(props);
  }
}
