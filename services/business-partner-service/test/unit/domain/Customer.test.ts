import { describe, expect, it } from 'vitest';
import { Customer } from '../../../src/domain/entities/Customer';

describe('Customer Entity', () => {
  describe('create', () => {
    it('should create a retail customer with valid data', () => {
      const customer = Customer.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+62812345678',
        customerType: 'retail',
      });

      expect(customer.getId()).toBeDefined();
      expect(customer.getCode()).toMatch(/^CUS-\d{4}$/);
      expect(customer.getName()).toBe('John Doe');
      expect(customer.getEmail()).toBe('john@example.com');
      expect(customer.getPhone()).toBe('+62812345678');
      expect(customer.getCustomerType()).toBe('retail');
      expect(customer.getStatus()).toBe('active');
      expect(customer.getLoyaltyPoints()).toBe(0);
    });

    it('should create a wholesale customer with company info', () => {
      const customer = Customer.create({
        name: 'PT Example Corp',
        email: 'contact@example.com',
        phone: '+62215551234',
        customerType: 'wholesale',
        companyName: 'PT Example Corp',
        npwp: '01.234.567.8-901.000',
        creditLimit: 50000000,
        paymentTermDays: 30,
      });

      expect(customer.getCustomerType()).toBe('wholesale');
      expect(customer.getCompanyName()).toBe('PT Example Corp');
      expect(customer.getNpwp()).toBe('01.234.567.8-901.000');
      expect(customer.getCreditLimit()).toBe(50000000);
      expect(customer.getCreditUsed()).toBe(0);
      expect(customer.getPaymentTermDays()).toBe(30);
    });

    it('should throw error if name is empty', () => {
      expect(() =>
        Customer.create({
          name: '',
          customerType: 'retail',
        })
      ).toThrow('Customer name is required');
    });

    it('should throw error if customer type is invalid', () => {
      expect(() =>
        Customer.create({
          name: 'John Doe',
          customerType: 'invalid' as any,
        })
      ).toThrow('Customer type must be either retail or wholesale');
    });
  });

  describe('credit management (wholesale)', () => {
    it('should check if customer has available credit', () => {
      const customer = Customer.create({
        name: 'PT Example',
        customerType: 'wholesale',
        creditLimit: 10000000,
      });

      expect(customer.hasAvailableCredit(5000000)).toBe(true);
      expect(customer.hasAvailableCredit(10000000)).toBe(true);
      expect(customer.hasAvailableCredit(15000000)).toBe(false);
    });

    it('should update credit used', () => {
      const customer = Customer.create({
        name: 'PT Example',
        customerType: 'wholesale',
        creditLimit: 10000000,
      });

      customer.useCreditAmount(5000000);
      expect(customer.getCreditUsed()).toBe(5000000);
      expect(customer.getAvailableCredit()).toBe(5000000);
    });

    it('should throw error when exceeding credit limit', () => {
      const customer = Customer.create({
        name: 'PT Example',
        customerType: 'wholesale',
        creditLimit: 10000000,
      });

      expect(() => customer.useCreditAmount(15000000)).toThrow('Exceeds available credit limit');
    });

    it('should release credit amount', () => {
      const customer = Customer.create({
        name: 'PT Example',
        customerType: 'wholesale',
        creditLimit: 10000000,
      });

      customer.useCreditAmount(5000000);
      customer.releaseCreditAmount(3000000);
      expect(customer.getCreditUsed()).toBe(2000000);
    });

    it('should always return true for retail customer credit check', () => {
      const customer = Customer.create({
        name: 'John Doe',
        customerType: 'retail',
      });

      expect(customer.hasAvailableCredit(999999999)).toBe(true);
    });
  });

  describe('loyalty points (retail)', () => {
    it('should add loyalty points to retail customer', () => {
      const customer = Customer.create({
        name: 'John Doe',
        customerType: 'retail',
      });

      customer.addLoyaltyPoints(100);
      expect(customer.getLoyaltyPoints()).toBe(100);
    });

    it('should update membership tier based on loyalty points', () => {
      const customer = Customer.create({
        name: 'John Doe',
        customerType: 'retail',
      });

      expect(customer.getMembershipTier()).toBe('bronze');

      customer.addLoyaltyPoints(500);
      expect(customer.getMembershipTier()).toBe('silver');

      customer.addLoyaltyPoints(1500);
      expect(customer.getMembershipTier()).toBe('gold');
    });

    it('should throw error when adding loyalty points to wholesale customer', () => {
      const customer = Customer.create({
        name: 'PT Example',
        customerType: 'wholesale',
      });

      expect(() => customer.addLoyaltyPoints(100)).toThrow(
        'Loyalty points only apply to retail customers'
      );
    });
  });

  describe('status management', () => {
    it('should block a customer', () => {
      const customer = Customer.create({
        name: 'John Doe',
        customerType: 'retail',
      });

      customer.block();
      expect(customer.getStatus()).toBe('blocked');
    });

    it('should deactivate a customer', () => {
      const customer = Customer.create({
        name: 'John Doe',
        customerType: 'retail',
      });

      customer.deactivate();
      expect(customer.getStatus()).toBe('inactive');
    });

    it('should reactivate a customer', () => {
      const customer = Customer.create({
        name: 'John Doe',
        customerType: 'retail',
      });

      customer.deactivate();
      customer.activate();
      expect(customer.getStatus()).toBe('active');
    });
  });

  describe('order statistics', () => {
    it('should update order statistics', () => {
      const customer = Customer.create({
        name: 'John Doe',
        customerType: 'retail',
      });

      customer.recordOrder(150000);
      expect(customer.getTotalOrders()).toBe(1);
      expect(customer.getTotalSpent()).toBe(150000);

      customer.recordOrder(250000);
      expect(customer.getTotalOrders()).toBe(2);
      expect(customer.getTotalSpent()).toBe(400000);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute customer from persistence data', () => {
      const data = {
        id: 'cust-123',
        code: 'CUS-0001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+62812345678',
        customerType: 'retail' as const,
        companyName: null,
        npwp: null,
        creditLimit: 0,
        creditUsed: 0,
        paymentTermDays: 0,
        loyaltyPoints: 500,
        membershipTier: 'silver' as const,
        totalOrders: 10,
        totalSpent: 1500000,
        lastOrderDate: new Date('2024-01-15'),
        status: 'active' as const,
        notes: 'VIP customer',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2024-01-15'),
        createdBy: 'admin',
        updatedBy: 'admin',
      };

      const customer = Customer.reconstitute(data);

      expect(customer.getId()).toBe('cust-123');
      expect(customer.getCode()).toBe('CUS-0001');
      expect(customer.getName()).toBe('John Doe');
      expect(customer.getLoyaltyPoints()).toBe(500);
      expect(customer.getMembershipTier()).toBe('silver');
      expect(customer.getTotalOrders()).toBe(10);
    });
  });

  describe('toData', () => {
    it('should convert customer to persistence data', () => {
      const customer = Customer.create({
        name: 'John Doe',
        email: 'john@example.com',
        customerType: 'retail',
      });

      const data = customer.toData();

      expect(data.id).toBeDefined();
      expect(data.code).toMatch(/^CUS-\d{4}$/);
      expect(data.name).toBe('John Doe');
      expect(data.email).toBe('john@example.com');
      expect(data.customerType).toBe('retail');
      expect(data.createdAt).toBeInstanceOf(Date);
      expect(data.updatedAt).toBeInstanceOf(Date);
    });
  });
});
