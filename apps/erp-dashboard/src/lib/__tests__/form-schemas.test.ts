import { describe, expect, it } from 'vitest';
import { customerFormSchema, employeeFormSchema, supplierFormSchema } from '../form-schemas';

describe('Phone Number Validation', () => {
  describe('Indonesian phone numbers', () => {
    it('should accept +62 format', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+6281234567890',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept 62 format (without +)', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '6281234567890',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept 08 local format', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '081234567890',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept phone with spaces', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+62 812 3456 7890',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept phone with dashes', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+62-812-3456-7890',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Indonesian landline numbers', () => {
    it('should accept Jakarta landline (021)', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '02172786383',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Jakarta landline with spaces', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '021 7278 6383',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Jakarta landline with dashes', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '021-7278-6383',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Bandung landline (022)', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '0221234567',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Surabaya landline (031)', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '03112345678',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept 3-digit area code landline (0274 Yogyakarta)', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '0274123456',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('International phone numbers (E.164)', () => {
    it('should accept US phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+12025551234',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept UK phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+442071234567',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Singapore phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+6591234567',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Malaysia phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+60123456789',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Australia phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+61412345678',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid phone numbers', () => {
    it('should reject phone number without country code or 08 prefix', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '12345678',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
    });

    it('should reject phone number that is too short', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+62812',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
    });

    it('should reject phone number with letters', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+62812abc4567',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
    });

    it('should reject phone number with invalid format (00 prefix)', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '001234567890',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Phone or Email Required (Customer)', () => {
    it('should accept with only phone provided', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+6281234567890',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with only email provided', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        email: 'customer@example.com',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with both phone and email provided', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+6281234567890',
        email: 'customer@example.com',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should reject when neither phone nor email is provided', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Either phone number or email is required');
      }
    });

    it('should reject when phone is empty string and no email', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
    });

    it('should reject when email is empty string and no phone', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        email: '',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty phone when email is provided', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '',
        email: 'customer@example.com',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty email when phone is provided', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+6281234567890',
        email: '',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Entity Type Validation (Customer)', () => {
    it('should accept person entity type without company name', () => {
      const result = customerFormSchema.safeParse({
        name: 'John Doe',
        phone: '+6281234567890',
        customerType: 'retail',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept company entity type with company name', () => {
      const result = customerFormSchema.safeParse({
        name: 'PT Example Corp',
        phone: '+6281234567890',
        customerType: 'wholesale',
        entityType: 'company',
        companyName: 'PT Example Corp',
      });
      expect(result.success).toBe(true);
    });

    it('should reject company entity type without company name', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test',
        phone: '+6281234567890',
        customerType: 'wholesale',
        entityType: 'company',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Company name is required for company entity');
      }
    });

    it('should reject company entity type with empty company name', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test',
        phone: '+6281234567890',
        customerType: 'wholesale',
        entityType: 'company',
        companyName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept person entity with optional company name', () => {
      const result = customerFormSchema.safeParse({
        name: 'John Doe',
        phone: '+6281234567890',
        customerType: 'retail',
        entityType: 'person',
        companyName: 'Freelancer Inc', // Person can optionally have company name
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Supplier form phone validation', () => {
    it('should validate phone in supplier form', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '+6281234567890',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone in supplier form', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: 'invalid',
        email: 'supplier@example.com', // Need email since phone is invalid
        entityType: 'person',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Phone or Email Required (Supplier)', () => {
    it('should accept with only phone provided', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '+6281234567890',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with only email provided', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        email: 'supplier@example.com',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with both phone and email provided', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '+6281234567890',
        email: 'supplier@example.com',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should reject when neither phone nor email is provided', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Either phone number or email is required');
      }
    });

    it('should reject when phone is empty string and no email', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '',
        entityType: 'person',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Entity Type Validation (Supplier)', () => {
    it('should accept person entity type without company name', () => {
      const result = supplierFormSchema.safeParse({
        name: 'John Supplier',
        phone: '+6281234567890',
        entityType: 'person',
      });
      expect(result.success).toBe(true);
    });

    it('should accept company entity type with company name', () => {
      const result = supplierFormSchema.safeParse({
        name: 'PT Supplier Corp',
        phone: '+6281234567890',
        entityType: 'company',
        companyName: 'PT Supplier Corp',
      });
      expect(result.success).toBe(true);
    });

    it('should reject company entity type without company name', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test',
        phone: '+6281234567890',
        entityType: 'company',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Company name is required for company entity');
      }
    });

    it('should reject company entity type with empty company name', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test',
        phone: '+6281234567890',
        entityType: 'company',
        companyName: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Employee form phone validation', () => {
    it('should validate phone in employee form', () => {
      const result = employeeFormSchema.safeParse({
        name: 'Test Employee',
        employeeNumber: 'EMP001',
        phone: '+6281234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone in employee form', () => {
      const result = employeeFormSchema.safeParse({
        name: 'Test Employee',
        employeeNumber: 'EMP001',
        phone: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
