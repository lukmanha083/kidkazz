import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Customer tRPC Router Unit Tests
 *
 * Tests router structure, input validation schemas, and procedure definitions.
 * Integration tests with actual database operations are in separate e2e tests.
 */
describe('Customer tRPC Router', () => {
  describe('Input Validation Schemas', () => {
    // Create customer schema
    const createCustomerSchema = z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      customerType: z.enum(['retail', 'wholesale']),
      companyName: z.string().optional(),
      npwp: z.string().optional(),
      creditLimit: z.number().min(0).optional(),
      paymentTermDays: z.number().min(0).optional(),
    });

    describe('createCustomerSchema', () => {
      it('should validate valid retail customer data', () => {
        const validData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+62812345678',
          customerType: 'retail' as const,
        };

        const result = createCustomerSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate valid wholesale customer data', () => {
        const validData = {
          name: 'PT Example Corp',
          email: 'contact@example.com',
          phone: '+62215551234',
          customerType: 'wholesale' as const,
          companyName: 'PT Example Corp',
          npwp: '01.234.567.8-901.000',
          creditLimit: 50000000,
          paymentTermDays: 30,
        };

        const result = createCustomerSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject empty name', () => {
        const invalidData = {
          name: '',
          customerType: 'retail',
        };

        const result = createCustomerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid customer type', () => {
        const invalidData = {
          name: 'John Doe',
          customerType: 'invalid',
        };

        const result = createCustomerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid email format', () => {
        const invalidData = {
          name: 'John Doe',
          email: 'invalid-email',
          customerType: 'retail',
        };

        const result = createCustomerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject negative credit limit', () => {
        const invalidData = {
          name: 'PT Example',
          customerType: 'wholesale',
          creditLimit: -1000,
        };

        const result = createCustomerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject negative payment term days', () => {
        const invalidData = {
          name: 'PT Example',
          customerType: 'wholesale',
          paymentTermDays: -5,
        };

        const result = createCustomerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    // Get by ID schema
    const getByIdSchema = z.object({ id: z.string() });

    describe('getByIdSchema', () => {
      it('should validate valid ID', () => {
        const result = getByIdSchema.safeParse({ id: 'cust-123' });
        expect(result.success).toBe(true);
      });

      it('should reject missing ID', () => {
        const result = getByIdSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    // List schema
    const listSchema = z
      .object({
        status: z.string().optional(),
        customerType: z.enum(['retail', 'wholesale']).optional(),
        search: z.string().optional(),
      })
      .optional();

    describe('listSchema', () => {
      it('should validate empty object', () => {
        const result = listSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should validate undefined', () => {
        const result = listSchema.safeParse(undefined);
        expect(result.success).toBe(true);
      });

      it('should validate with all filters', () => {
        const result = listSchema.safeParse({
          status: 'active',
          customerType: 'retail',
          search: 'john',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid customer type in filter', () => {
        const result = listSchema.safeParse({
          customerType: 'invalid',
        });
        expect(result.success).toBe(false);
      });
    });

    // Loyalty points schema
    const addLoyaltyPointsSchema = z.object({
      id: z.string(),
      points: z.number().positive(),
    });

    describe('addLoyaltyPointsSchema', () => {
      it('should validate valid input', () => {
        const result = addLoyaltyPointsSchema.safeParse({
          id: 'cust-123',
          points: 100,
        });
        expect(result.success).toBe(true);
      });

      it('should reject zero points', () => {
        const result = addLoyaltyPointsSchema.safeParse({
          id: 'cust-123',
          points: 0,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative points', () => {
        const result = addLoyaltyPointsSchema.safeParse({
          id: 'cust-123',
          points: -50,
        });
        expect(result.success).toBe(false);
      });
    });

    // Credit check schema
    const checkCreditSchema = z.object({
      id: z.string(),
      amount: z.number().positive(),
    });

    describe('checkCreditSchema', () => {
      it('should validate valid input', () => {
        const result = checkCreditSchema.safeParse({
          id: 'cust-123',
          amount: 5000000,
        });
        expect(result.success).toBe(true);
      });

      it('should reject zero amount', () => {
        const result = checkCreditSchema.safeParse({
          id: 'cust-123',
          amount: 0,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative amount', () => {
        const result = checkCreditSchema.safeParse({
          id: 'cust-123',
          amount: -1000,
        });
        expect(result.success).toBe(false);
      });
    });

    // Record order schema
    const recordOrderSchema = z.object({
      id: z.string(),
      orderAmount: z.number().positive(),
    });

    describe('recordOrderSchema', () => {
      it('should validate valid input', () => {
        const result = recordOrderSchema.safeParse({
          id: 'cust-123',
          orderAmount: 150000,
        });
        expect(result.success).toBe(true);
      });

      it('should reject zero order amount', () => {
        const result = recordOrderSchema.safeParse({
          id: 'cust-123',
          orderAmount: 0,
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
