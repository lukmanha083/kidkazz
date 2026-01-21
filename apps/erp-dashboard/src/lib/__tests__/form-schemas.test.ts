import { describe, expect, it } from 'vitest';
import { customerFormSchema, employeeFormSchema, supplierFormSchema } from '../form-schemas';

describe('Phone Number Validation', () => {
  describe('Indonesian phone numbers', () => {
    it('should accept +62 format', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+6281234567890',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });

    it('should accept 62 format (without +)', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '6281234567890',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });

    it('should accept 08 local format', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '081234567890',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });

    it('should accept phone with spaces', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+62 812 3456 7890',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });

    it('should accept phone with dashes', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+62-812-3456-7890',
        customerType: 'retail',
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
      });
      expect(result.success).toBe(true);
    });

    it('should accept UK phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+442071234567',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Singapore phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+6591234567',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Malaysia phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+60123456789',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });

    it('should accept Australia phone number', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+61412345678',
        customerType: 'retail',
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
      });
      expect(result.success).toBe(false);
    });

    it('should reject phone number that is too short', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+62812',
        customerType: 'retail',
      });
      expect(result.success).toBe(false);
    });

    it('should reject phone number with letters', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '+62812abc4567',
        customerType: 'retail',
      });
      expect(result.success).toBe(false);
    });

    it('should reject phone number starting with 0 but not 08', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '0212345678',
        customerType: 'retail',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Optional phone field', () => {
    it('should accept empty phone', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        phone: '',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });

    it('should accept undefined phone', () => {
      const result = customerFormSchema.safeParse({
        name: 'Test Customer',
        customerType: 'retail',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Supplier form phone validation', () => {
    it('should validate phone in supplier form', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: '+6281234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone in supplier form', () => {
      const result = supplierFormSchema.safeParse({
        name: 'Test Supplier',
        phone: 'invalid',
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
