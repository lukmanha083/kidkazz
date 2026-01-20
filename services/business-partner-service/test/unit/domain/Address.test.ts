import { describe, expect, it } from 'vitest';
import { Address } from '../../../src/domain/value-objects/Address';

describe('Address Value Object', () => {
  describe('create', () => {
    it('should create an address with valid data', () => {
      const address = Address.create({
        ownerType: 'customer',
        ownerId: 'cust-123',
        addressType: 'shipping',
        addressLine1: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
      });

      expect(address.getOwnerType()).toBe('customer');
      expect(address.getOwnerId()).toBe('cust-123');
      expect(address.getAddressType()).toBe('shipping');
      expect(address.getAddressLine1()).toBe('Jl. Sudirman No. 123');
      expect(address.getCity()).toBe('Jakarta');
      expect(address.getProvince()).toBe('DKI Jakarta');
      expect(address.getPostalCode()).toBe('12345');
      expect(address.getCountry()).toBe('Indonesia');
      expect(address.isPrimary()).toBe(false);
    });

    it('should create address with all optional fields', () => {
      const address = Address.create({
        ownerType: 'supplier',
        ownerId: 'sup-123',
        addressType: 'office',
        isPrimary: true,
        label: 'Kantor Pusat',
        recipientName: 'John Doe',
        phone: '+62812345678',
        addressLine1: 'Jl. Sudirman No. 123',
        addressLine2: 'Gedung ABC Lt. 5',
        subdistrict: 'Setiabudi',
        district: 'Setiabudi',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        country: 'Indonesia',
        latitude: -6.2088,
        longitude: 106.8456,
        notes: 'Near the mall',
      });

      expect(address.isPrimary()).toBe(true);
      expect(address.getLabel()).toBe('Kantor Pusat');
      expect(address.getRecipientName()).toBe('John Doe');
      expect(address.getPhone()).toBe('+62812345678');
      expect(address.getAddressLine2()).toBe('Gedung ABC Lt. 5');
      expect(address.getSubdistrict()).toBe('Setiabudi');
      expect(address.getDistrict()).toBe('Setiabudi');
      expect(address.getLatitude()).toBe(-6.2088);
      expect(address.getLongitude()).toBe(106.8456);
      expect(address.getNotes()).toBe('Near the mall');
    });

    it('should throw error if address line 1 is empty', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: '',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
        })
      ).toThrow('Address line 1 is required');
    });

    it('should throw error if city is empty', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: '',
          province: 'DKI Jakarta',
          postalCode: '12345',
        })
      ).toThrow('City is required');
    });

    it('should throw error if province is empty', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: '',
          postalCode: '12345',
        })
      ).toThrow('Province is required');
    });

    it('should throw error if owner id is empty', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: '',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
        })
      ).toThrow('Owner ID is required');
    });

    it('should throw error if postal code is empty', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '',
        })
      ).toThrow('Postal code is required');
    });

    it('should throw error if owner type is invalid', () => {
      expect(() =>
        Address.create({
          ownerType: 'invalid' as any,
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
        })
      ).toThrow('Owner type must be customer, supplier, or employee');
    });

    it('should throw error if address type is invalid', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'invalid' as any,
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
        })
      ).toThrow('Address type must be billing, shipping, home, or office');
    });

    it('should throw error if latitude is out of range (too low)', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
          latitude: -91,
          longitude: 106.8456,
        })
      ).toThrow('Latitude must be between -90 and 90');
    });

    it('should throw error if latitude is out of range (too high)', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
          latitude: 91,
          longitude: 106.8456,
        })
      ).toThrow('Latitude must be between -90 and 90');
    });

    it('should throw error if longitude is out of range (too low)', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
          latitude: -6.2088,
          longitude: -181,
        })
      ).toThrow('Longitude must be between -180 and 180');
    });

    it('should throw error if longitude is out of range (too high)', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
          latitude: -6.2088,
          longitude: 181,
        })
      ).toThrow('Longitude must be between -180 and 180');
    });

    it('should throw error if latitude is not a finite number', () => {
      expect(() =>
        Address.create({
          ownerType: 'customer',
          ownerId: 'cust-123',
          addressType: 'shipping',
          addressLine1: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
          latitude: Number.NaN,
          longitude: 106.8456,
        })
      ).toThrow('Latitude must be between -90 and 90');
    });

    it('should accept valid coordinates at boundary values', () => {
      const address = Address.create({
        ownerType: 'customer',
        ownerId: 'cust-123',
        addressType: 'shipping',
        addressLine1: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        latitude: -90,
        longitude: 180,
      });

      expect(address.getLatitude()).toBe(-90);
      expect(address.getLongitude()).toBe(180);
    });
  });

  describe('getFullAddress', () => {
    it('should return formatted full address', () => {
      const address = Address.create({
        ownerType: 'customer',
        ownerId: 'cust-123',
        addressType: 'shipping',
        addressLine1: 'Jl. Sudirman No. 123',
        addressLine2: 'Gedung ABC Lt. 5',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        country: 'Indonesia',
      });

      const fullAddress = address.getFullAddress();
      expect(fullAddress).toContain('Jl. Sudirman No. 123');
      expect(fullAddress).toContain('Gedung ABC Lt. 5');
      expect(fullAddress).toContain('Jakarta');
      expect(fullAddress).toContain('DKI Jakarta');
      expect(fullAddress).toContain('12345');
    });

    it('should handle address without optional fields', () => {
      const address = Address.create({
        ownerType: 'customer',
        ownerId: 'cust-123',
        addressType: 'shipping',
        addressLine1: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
      });

      const fullAddress = address.getFullAddress();
      expect(fullAddress).toBe('Jl. Sudirman No. 123, Jakarta, DKI Jakarta 12345, Indonesia');
    });
  });

  describe('setAsPrimary / unsetAsPrimary', () => {
    it('should set address as primary', () => {
      const address = Address.create({
        ownerType: 'customer',
        ownerId: 'cust-123',
        addressType: 'shipping',
        addressLine1: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
      });

      expect(address.isPrimary()).toBe(false);

      const primaryAddress = address.setAsPrimary();
      expect(primaryAddress.isPrimary()).toBe(true);
    });

    it('should unset address as primary', () => {
      const address = Address.create({
        ownerType: 'customer',
        ownerId: 'cust-123',
        addressType: 'shipping',
        isPrimary: true,
        addressLine1: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
      });

      expect(address.isPrimary()).toBe(true);

      const nonPrimaryAddress = address.unsetAsPrimary();
      expect(nonPrimaryAddress.isPrimary()).toBe(false);
    });
  });

  describe('toData', () => {
    it('should convert address to persistence data', () => {
      const address = Address.create({
        ownerType: 'customer',
        ownerId: 'cust-123',
        addressType: 'shipping',
        addressLine1: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
      });

      const data = address.toData();

      expect(data.id).toBeDefined();
      expect(data.ownerType).toBe('customer');
      expect(data.ownerId).toBe('cust-123');
      expect(data.addressType).toBe('shipping');
      expect(data.addressLine1).toBe('Jl. Sudirman No. 123');
      expect(data.city).toBe('Jakarta');
      expect(data.province).toBe('DKI Jakarta');
      expect(data.postalCode).toBe('12345');
      expect(data.country).toBe('Indonesia');
      expect(data.createdAt).toBeInstanceOf(Date);
      expect(data.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute address from persistence data', () => {
      const data = {
        id: 'addr-123',
        ownerType: 'customer' as const,
        ownerId: 'cust-123',
        addressType: 'shipping' as const,
        isPrimary: true,
        label: 'Home',
        recipientName: 'John Doe',
        phone: '+62812345678',
        addressLine1: 'Jl. Sudirman No. 123',
        addressLine2: 'Gedung ABC',
        subdistrict: 'Setiabudi',
        district: 'Setiabudi',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        country: 'Indonesia',
        latitude: -6.2088,
        longitude: 106.8456,
        notes: 'Near mall',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const address = Address.reconstitute(data);

      expect(address.getId()).toBe('addr-123');
      expect(address.getOwnerType()).toBe('customer');
      expect(address.isPrimary()).toBe(true);
      expect(address.getLabel()).toBe('Home');
    });
  });
});
