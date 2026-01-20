import { describe, expect, it } from 'vitest';
import { Supplier } from '../../../src/domain/entities/Supplier';

describe('Supplier Entity', () => {
  describe('create', () => {
    it('should create a supplier with valid data', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
        email: 'contact@supplierjaya.com',
        phone: '+62215551234',
        companyName: 'PT Supplier Jaya',
        npwp: '01.234.567.8-901.000',
        paymentTermDays: 30,
        leadTimeDays: 7,
        minimumOrderAmount: 1000000,
      });

      expect(supplier.getId()).toBeDefined();
      expect(supplier.getCode()).toMatch(/^SUP-\d{4}$/);
      expect(supplier.getName()).toBe('PT Supplier Jaya');
      expect(supplier.getEmail()).toBe('contact@supplierjaya.com');
      expect(supplier.getCompanyName()).toBe('PT Supplier Jaya');
      expect(supplier.getPaymentTermDays()).toBe(30);
      expect(supplier.getLeadTimeDays()).toBe(7);
      expect(supplier.getMinimumOrderAmount()).toBe(1000000);
      expect(supplier.getStatus()).toBe('active');
    });

    it('should create a supplier with default values', () => {
      const supplier = Supplier.create({
        name: 'Simple Supplier',
      });

      expect(supplier.getPaymentTermDays()).toBe(30);
      expect(supplier.getLeadTimeDays()).toBe(7);
      expect(supplier.getMinimumOrderAmount()).toBe(0);
      expect(supplier.getRating()).toBeNull();
      expect(supplier.getTotalOrders()).toBe(0);
      expect(supplier.getTotalPurchased()).toBe(0);
    });

    it('should throw error if name is empty', () => {
      expect(() =>
        Supplier.create({
          name: '',
        })
      ).toThrow('Supplier name is required');
    });

    it('should throw error if payment term days is negative', () => {
      expect(() =>
        Supplier.create({
          name: 'Supplier',
          paymentTermDays: -1,
        })
      ).toThrow('Payment term days cannot be negative');
    });

    it('should throw error if lead time days is negative', () => {
      expect(() =>
        Supplier.create({
          name: 'Supplier',
          leadTimeDays: -1,
        })
      ).toThrow('Lead time days cannot be negative');
    });
  });

  describe('bank information', () => {
    it('should set bank information', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
      });

      supplier.setBankInfo({
        bankName: 'Bank BCA',
        bankAccountNumber: '1234567890',
        bankAccountName: 'PT Supplier Jaya',
      });

      expect(supplier.getBankName()).toBe('Bank BCA');
      expect(supplier.getBankAccountNumber()).toBe('1234567890');
      expect(supplier.getBankAccountName()).toBe('PT Supplier Jaya');
    });

    it('should throw error if bank account number is invalid', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
      });

      expect(() =>
        supplier.setBankInfo({
          bankName: 'Bank BCA',
          bankAccountNumber: '123',
          bankAccountName: 'PT Supplier Jaya',
        })
      ).toThrow('Bank account number must be at least 10 characters');
    });
  });

  describe('rating management', () => {
    it('should update supplier rating', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
      });

      supplier.updateRating(4.5);
      expect(supplier.getRating()).toBe(4.5);
    });

    it('should throw error if rating is out of range', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
      });

      expect(() => supplier.updateRating(0)).toThrow('Rating must be between 1 and 5');
      expect(() => supplier.updateRating(6)).toThrow('Rating must be between 1 and 5');
    });
  });

  describe('order statistics', () => {
    it('should record purchase order', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
      });

      supplier.recordPurchaseOrder(5000000);
      expect(supplier.getTotalOrders()).toBe(1);
      expect(supplier.getTotalPurchased()).toBe(5000000);

      supplier.recordPurchaseOrder(3000000);
      expect(supplier.getTotalOrders()).toBe(2);
      expect(supplier.getTotalPurchased()).toBe(8000000);
    });

    it('should validate minimum order amount', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
        minimumOrderAmount: 1000000,
      });

      expect(supplier.meetsMinimumOrder(500000)).toBe(false);
      expect(supplier.meetsMinimumOrder(1000000)).toBe(true);
      expect(supplier.meetsMinimumOrder(2000000)).toBe(true);
    });
  });

  describe('status management', () => {
    it('should block a supplier', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
      });

      supplier.block();
      expect(supplier.getStatus()).toBe('blocked');
    });

    it('should deactivate a supplier', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
      });

      supplier.deactivate();
      expect(supplier.getStatus()).toBe('inactive');
    });

    it('should reactivate a supplier', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
      });

      supplier.deactivate();
      supplier.activate();
      expect(supplier.getStatus()).toBe('active');
    });
  });

  describe('update', () => {
    it('should update supplier details', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
        paymentTermDays: 30,
        leadTimeDays: 7,
      });

      supplier.update({
        name: 'PT Supplier Jaya Updated',
        paymentTermDays: 45,
        leadTimeDays: 14,
      });

      expect(supplier.getName()).toBe('PT Supplier Jaya Updated');
      expect(supplier.getPaymentTermDays()).toBe(45);
      expect(supplier.getLeadTimeDays()).toBe(14);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute supplier from persistence data', () => {
      const data = {
        id: 'sup-123',
        code: 'SUP-0001',
        name: 'PT Supplier Jaya',
        email: 'contact@supplierjaya.com',
        phone: '+62215551234',
        companyName: 'PT Supplier Jaya',
        npwp: '01.234.567.8-901.000',
        paymentTermDays: 30,
        leadTimeDays: 7,
        minimumOrderAmount: 1000000,
        bankName: 'Bank BCA',
        bankAccountNumber: '1234567890',
        bankAccountName: 'PT Supplier Jaya',
        rating: 4.5,
        totalOrders: 50,
        totalPurchased: 500000000,
        lastOrderDate: new Date('2024-01-15'),
        status: 'active' as const,
        notes: 'Reliable supplier',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2024-01-15'),
        createdBy: 'admin',
        updatedBy: 'admin',
      };

      const supplier = Supplier.reconstitute(data);

      expect(supplier.getId()).toBe('sup-123');
      expect(supplier.getCode()).toBe('SUP-0001');
      expect(supplier.getName()).toBe('PT Supplier Jaya');
      expect(supplier.getRating()).toBe(4.5);
      expect(supplier.getTotalOrders()).toBe(50);
    });
  });

  describe('toData', () => {
    it('should convert supplier to persistence data', () => {
      const supplier = Supplier.create({
        name: 'PT Supplier Jaya',
        email: 'contact@supplierjaya.com',
        paymentTermDays: 30,
      });

      const data = supplier.toData();

      expect(data.id).toBeDefined();
      expect(data.code).toMatch(/^SUP-\d{4}$/);
      expect(data.name).toBe('PT Supplier Jaya');
      expect(data.email).toBe('contact@supplierjaya.com');
      expect(data.paymentTermDays).toBe(30);
      expect(data.createdAt).toBeInstanceOf(Date);
    });
  });
});
