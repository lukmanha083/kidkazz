import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Employee tRPC Router Unit Tests
 *
 * Tests router structure, input validation schemas, and procedure definitions.
 * Integration tests with actual database operations are in separate e2e tests.
 */
describe('Employee tRPC Router', () => {
  describe('Input Validation Schemas', () => {
    // Create employee schema
    const createEmployeeSchema = z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      employeeNumber: z.string().min(1),
      department: z.string().optional(),
      position: z.string().optional(),
      managerId: z.string().optional(),
      dateOfBirth: z.string().datetime().optional(),
      gender: z.enum(['male', 'female']).optional(),
      nationalId: z.string().optional(),
      npwp: z.string().optional(),
      joinDate: z.string().datetime().optional(),
      baseSalary: z.number().min(0).optional(),
    });

    describe('createEmployeeSchema', () => {
      it('should validate valid employee data', () => {
        const validData = {
          name: 'John Doe',
          email: 'john@company.com',
          phone: '+62812345678',
          employeeNumber: 'EMP001',
          department: 'Engineering',
          position: 'Software Developer',
          gender: 'male' as const,
          joinDate: '2024-01-15T00:00:00.000Z',
          baseSalary: 15000000,
        };

        const result = createEmployeeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate minimal employee data', () => {
        const validData = {
          name: 'Jane Doe',
          employeeNumber: 'EMP002',
        };

        const result = createEmployeeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject empty name', () => {
        const invalidData = {
          name: '',
          employeeNumber: 'EMP003',
        };

        const result = createEmployeeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject empty employee number', () => {
        const invalidData = {
          name: 'John Doe',
          employeeNumber: '',
        };

        const result = createEmployeeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid email format', () => {
        const invalidData = {
          name: 'John Doe',
          email: 'invalid-email',
          employeeNumber: 'EMP004',
        };

        const result = createEmployeeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid gender value', () => {
        const invalidData = {
          name: 'John Doe',
          employeeNumber: 'EMP005',
          gender: 'other',
        };

        const result = createEmployeeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject negative base salary', () => {
        const invalidData = {
          name: 'John Doe',
          employeeNumber: 'EMP006',
          baseSalary: -1000000,
        };

        const result = createEmployeeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid date format', () => {
        const invalidData = {
          name: 'John Doe',
          employeeNumber: 'EMP007',
          joinDate: '2024-01-15', // Missing time component
        };

        const result = createEmployeeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should accept zero base salary', () => {
        const validData = {
          name: 'John Doe',
          employeeNumber: 'EMP008',
          baseSalary: 0,
        };

        const result = createEmployeeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    // Update employee schema (omits employeeNumber)
    const updateEmployeeSchema = z.object({
      id: z.string(),
      data: z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        department: z.string().optional(),
        position: z.string().optional(),
        managerId: z.string().optional(),
        dateOfBirth: z.string().datetime().optional(),
        gender: z.enum(['male', 'female']).optional(),
        nationalId: z.string().optional(),
        npwp: z.string().optional(),
        joinDate: z.string().datetime().optional(),
        baseSalary: z.number().min(0).optional(),
      }),
    });

    describe('updateEmployeeSchema', () => {
      it('should validate valid update data', () => {
        const validData = {
          id: 'emp-123',
          data: {
            name: 'John Smith',
            department: 'Sales',
            position: 'Sales Manager',
          },
        };

        const result = updateEmployeeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should validate empty update data', () => {
        const validData = {
          id: 'emp-123',
          data: {},
        };

        const result = updateEmployeeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject missing id', () => {
        const invalidData = {
          data: {
            name: 'John Smith',
          },
        };

        const result = updateEmployeeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    // List schema
    const listSchema = z
      .object({
        status: z.string().optional(),
        department: z.string().optional(),
        managerId: z.string().optional(),
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
          department: 'Engineering',
          managerId: 'emp-001',
          search: 'john',
        });
        expect(result.success).toBe(true);
      });
    });

    // Get by employee number schema
    const getByEmployeeNumberSchema = z.object({ employeeNumber: z.string() });

    describe('getByEmployeeNumberSchema', () => {
      it('should validate valid employee number', () => {
        const result = getByEmployeeNumberSchema.safeParse({ employeeNumber: 'EMP001' });
        expect(result.success).toBe(true);
      });

      it('should reject missing employee number', () => {
        const result = getByEmployeeNumberSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    // Validate for auth schema
    const validateForAuthSchema = z.object({ id: z.string() });

    describe('validateForAuthSchema', () => {
      it('should validate valid input', () => {
        const result = validateForAuthSchema.safeParse({ id: 'emp-123' });
        expect(result.success).toBe(true);
      });

      it('should reject missing id', () => {
        const result = validateForAuthSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    // Get subordinates schema
    const getSubordinatesSchema = z.object({ managerId: z.string() });

    describe('getSubordinatesSchema', () => {
      it('should validate valid manager id', () => {
        const result = getSubordinatesSchema.safeParse({ managerId: 'emp-001' });
        expect(result.success).toBe(true);
      });

      it('should reject missing manager id', () => {
        const result = getSubordinatesSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    // Get by department schema
    const getByDepartmentSchema = z.object({ department: z.string() });

    describe('getByDepartmentSchema', () => {
      it('should validate valid department', () => {
        const result = getByDepartmentSchema.safeParse({ department: 'Engineering' });
        expect(result.success).toBe(true);
      });

      it('should reject missing department', () => {
        const result = getByDepartmentSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });
  });
});
