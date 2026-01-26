import { describe, expect, it } from 'vitest';
import { Email } from '../../../src/domain/value-objects/Email';
import { PartnerCode } from '../../../src/domain/value-objects/PartnerCode';
import { Phone } from '../../../src/domain/value-objects/Phone';

describe('PartnerCode Value Object', () => {
  describe('create', () => {
    it('should create a valid customer code', () => {
      const code = PartnerCode.create('customer');
      expect(code.toString()).toMatch(/^CUS-\d{4}$/);
    });

    it('should create a valid supplier code', () => {
      const code = PartnerCode.create('supplier');
      expect(code.toString()).toMatch(/^SUP-\d{4}$/);
    });

    it('should create a valid employee code', () => {
      const code = PartnerCode.create('employee');
      expect(code.toString()).toMatch(/^EMP-\d{4}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const code = PartnerCode.create('customer');
        codes.add(code.toString());
      }
      expect(codes.size).toBe(100);
    });
  });

  describe('fromString', () => {
    it('should reconstitute from valid code string', () => {
      const code = PartnerCode.fromString('CUS-0001');
      expect(code.toString()).toBe('CUS-0001');
    });

    it('should throw error for invalid code format', () => {
      expect(() => PartnerCode.fromString('INVALID')).toThrow('Invalid partner code format');
      expect(() => PartnerCode.fromString('CUS0001')).toThrow('Invalid partner code format');
      expect(() => PartnerCode.fromString('XXX-0001')).toThrow('Invalid partner code format');
    });
  });

  describe('getPartnerType', () => {
    it('should return correct partner type', () => {
      expect(PartnerCode.fromString('CUS-0001').getPartnerType()).toBe('customer');
      expect(PartnerCode.fromString('SUP-0001').getPartnerType()).toBe('supplier');
      expect(PartnerCode.fromString('EMP-0001').getPartnerType()).toBe('employee');
    });
  });

  describe('equals', () => {
    it('should return true for equal codes', () => {
      const code1 = PartnerCode.fromString('CUS-0001');
      const code2 = PartnerCode.fromString('CUS-0001');
      expect(code1.equals(code2)).toBe(true);
    });

    it('should return false for different codes', () => {
      const code1 = PartnerCode.fromString('CUS-0001');
      const code2 = PartnerCode.fromString('CUS-0002');
      expect(code1.equals(code2)).toBe(false);
    });
  });
});

describe('Email Value Object', () => {
  describe('create', () => {
    it('should create a valid email', () => {
      const email = Email.create('john@example.com');
      expect(email.toString()).toBe('john@example.com');
    });

    it('should normalize email to lowercase', () => {
      const email = Email.create('John.Doe@Example.COM');
      expect(email.toString()).toBe('john.doe@example.com');
    });

    it('should throw error for invalid email format', () => {
      expect(() => Email.create('invalid')).toThrow('Invalid email format');
      expect(() => Email.create('invalid@')).toThrow('Invalid email format');
      expect(() => Email.create('@example.com')).toThrow('Invalid email format');
      expect(() => Email.create('test@.com')).toThrow('Invalid email format');
    });

    it('should throw error for empty email', () => {
      expect(() => Email.create('')).toThrow('Email is required');
    });
  });

  describe('getDomain', () => {
    it('should return email domain', () => {
      const email = Email.create('john@example.com');
      expect(email.getDomain()).toBe('example.com');
    });
  });

  describe('getLocalPart', () => {
    it('should return local part of email', () => {
      const email = Email.create('john.doe@example.com');
      expect(email.getLocalPart()).toBe('john.doe');
    });
  });

  describe('equals', () => {
    it('should return true for equal emails', () => {
      const email1 = Email.create('john@example.com');
      const email2 = Email.create('JOHN@EXAMPLE.COM');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = Email.create('john@example.com');
      const email2 = Email.create('jane@example.com');
      expect(email1.equals(email2)).toBe(false);
    });
  });
});

describe('Phone Value Object', () => {
  describe('create', () => {
    it('should create a valid phone number', () => {
      const phone = Phone.create('+62812345678');
      expect(phone.toString()).toBe('+62812345678');
    });

    it('should normalize phone number', () => {
      const phone1 = Phone.create('0812345678');
      expect(phone1.toString()).toBe('+62812345678');

      const phone2 = Phone.create('62812345678');
      expect(phone2.toString()).toBe('+62812345678');
    });

    it('should accept international format', () => {
      const phone = Phone.create('+12025551234');
      expect(phone.toString()).toBe('+12025551234');
    });

    it('should throw error for invalid phone format', () => {
      expect(() => Phone.create('123')).toThrow('Invalid phone number format');
      expect(() => Phone.create('abcdefghij')).toThrow('Invalid phone number format');
    });

    it('should throw error for empty phone', () => {
      expect(() => Phone.create('')).toThrow('Phone number is required');
    });
  });

  describe('getCountryCode', () => {
    it('should return country code', () => {
      const phone = Phone.create('+62812345678');
      expect(phone.getCountryCode()).toBe('+62');
    });
  });

  describe('getLocalNumber', () => {
    it('should return local number without country code', () => {
      const phone = Phone.create('+62812345678');
      expect(phone.getLocalNumber()).toBe('812345678');
    });
  });

  describe('format', () => {
    it('should format phone number for display', () => {
      const phone = Phone.create('+62812345678');
      expect(phone.format()).toMatch(/\+62\s?\d+/);
    });
  });

  describe('equals', () => {
    it('should return true for equal phone numbers', () => {
      const phone1 = Phone.create('+62812345678');
      const phone2 = Phone.create('0812345678');
      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should return false for different phone numbers', () => {
      const phone1 = Phone.create('+62812345678');
      const phone2 = Phone.create('+62812345679');
      expect(phone1.equals(phone2)).toBe(false);
    });
  });
});
