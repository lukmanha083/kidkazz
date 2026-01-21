import { publicProcedure, router } from '@kidkazz/trpc';
import { and, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import { Employee } from '../../domain/entities/Employee';
import { employees } from '../db/schema';

/**
 * Employee tRPC Router
 * For service-to-service communication
 */
export const employeeRouter = router({
  // Query: Get employee by ID
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);
    const employee = await db.select().from(employees).where(eq(employees.id, input.id)).get();

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee;
  }),

  // Query: Get employee by code
  getByCode: publicProcedure.input(z.object({ code: z.string() })).query(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);
    const employee = await db.select().from(employees).where(eq(employees.code, input.code)).get();

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee;
  }),

  // Query: Get employee by employee number
  getByEmployeeNumber: publicProcedure
    .input(z.object({ employeeNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.employeeNumber, input.employeeNumber))
        .get();

      if (!employee) {
        throw new Error('Employee not found');
      }

      return employee;
    }),

  // Query: List employees with optional filters
  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          department: z.string().optional(),
          managerId: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);
      let query = db.select().from(employees).$dynamic();

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(employees.employmentStatus, input.status));
      }
      if (input?.department) {
        conditions.push(eq(employees.department, input.department));
      }
      if (input?.managerId) {
        conditions.push(eq(employees.managerId, input.managerId));
      }
      if (input?.search) {
        conditions.push(
          or(
            like(employees.name, `%${input.search}%`),
            like(employees.code, `%${input.search}%`),
            like(employees.employeeNumber, `%${input.search}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const allEmployees = await query.all();

      return {
        employees: allEmployees,
        total: allEmployees.length,
      };
    }),

  // Query: Get active employees (for user service / auth)
  getActive: publicProcedure.query(async ({ ctx }) => {
    const db = drizzle(ctx.db);
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.employmentStatus, 'active'))
      .all();

    return {
      employees: activeEmployees,
      total: activeEmployees.length,
    };
  }),

  // Query: Get employees by department
  getByDepartment: publicProcedure
    .input(z.object({ department: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);
      const departmentEmployees = await db
        .select()
        .from(employees)
        .where(
          and(eq(employees.department, input.department), eq(employees.employmentStatus, 'active'))
        )
        .all();

      return {
        employees: departmentEmployees,
        total: departmentEmployees.length,
      };
    }),

  // Query: Get subordinates (for RBAC / reporting)
  getSubordinates: publicProcedure
    .input(z.object({ managerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);
      const subordinates = await db
        .select()
        .from(employees)
        .where(eq(employees.managerId, input.managerId))
        .all();

      return {
        employees: subordinates,
        total: subordinates.length,
      };
    }),

  // Mutation: Create employee
  create: publicProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      // Check if employee number already exists
      const existingByNumber = await db
        .select()
        .from(employees)
        .where(eq(employees.employeeNumber, input.employeeNumber))
        .get();

      if (existingByNumber) {
        throw new Error('Employee number already exists');
      }

      const employee = Employee.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        employeeNumber: input.employeeNumber,
        department: input.department,
        position: input.position,
        managerId: input.managerId,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        gender: input.gender,
        nationalId: input.nationalId,
        npwp: input.npwp,
        joinDate: input.joinDate ? new Date(input.joinDate) : undefined,
        baseSalary: input.baseSalary,
      });

      const employeeData = employee.toData();

      await db
        .insert(employees)
        .values({
          id: employeeData.id,
          code: employeeData.code,
          name: employeeData.name,
          email: employeeData.email,
          phone: employeeData.phone,
          employeeNumber: employeeData.employeeNumber,
          department: employeeData.department,
          position: employeeData.position,
          managerId: employeeData.managerId,
          dateOfBirth: employeeData.dateOfBirth?.getTime() || null,
          gender: employeeData.gender,
          nationalId: employeeData.nationalId,
          npwp: employeeData.npwp,
          joinDate: employeeData.joinDate?.getTime() || null,
          endDate: employeeData.endDate?.getTime() || null,
          employmentStatus: employeeData.employmentStatus,
          baseSalary: employeeData.baseSalary,
          notes: employeeData.notes,
          createdAt: employeeData.createdAt.getTime(),
          updatedAt: employeeData.updatedAt.getTime(),
          createdBy: employeeData.createdBy,
          updatedBy: employeeData.updatedBy,
        })
        .run();

      return employeeData;
    }),

  // Mutation: Update employee
  update: publicProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(employees).where(eq(employees.id, input.id)).get();

      if (!existing) {
        throw new Error('Employee not found');
      }

      const updateData: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.email !== undefined) updateData.email = input.data.email;
      if (input.data.phone !== undefined) updateData.phone = input.data.phone;
      if (input.data.department !== undefined) updateData.department = input.data.department;
      if (input.data.position !== undefined) updateData.position = input.data.position;
      if (input.data.managerId !== undefined) updateData.managerId = input.data.managerId;
      if (input.data.dateOfBirth !== undefined)
        updateData.dateOfBirth = new Date(input.data.dateOfBirth).getTime();
      if (input.data.gender !== undefined) updateData.gender = input.data.gender;
      if (input.data.nationalId !== undefined) updateData.nationalId = input.data.nationalId;
      if (input.data.npwp !== undefined) updateData.npwp = input.data.npwp;
      if (input.data.joinDate !== undefined)
        updateData.joinDate = new Date(input.data.joinDate).getTime();
      if (input.data.baseSalary !== undefined) updateData.baseSalary = input.data.baseSalary;

      await db.update(employees).set(updateData).where(eq(employees.id, input.id)).run();

      const updated = await db.select().from(employees).where(eq(employees.id, input.id)).get();

      return updated;
    }),

  // Mutation: Terminate employee
  terminate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);

      const existing = await db.select().from(employees).where(eq(employees.id, input.id)).get();

      if (!existing) {
        throw new Error('Employee not found');
      }

      if (existing.employmentStatus !== 'active') {
        throw new Error('Employee is not active and cannot be terminated');
      }

      await db
        .update(employees)
        .set({
          employmentStatus: 'terminated',
          endDate: Date.now(),
          updatedAt: Date.now(),
        })
        .where(eq(employees.id, input.id))
        .run();

      const updated = await db.select().from(employees).where(eq(employees.id, input.id)).get();

      return updated;
    }),

  // Mutation: Resign employee
  resign: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);

    const existing = await db.select().from(employees).where(eq(employees.id, input.id)).get();

    if (!existing) {
      throw new Error('Employee not found');
    }

    if (existing.employmentStatus !== 'active') {
      throw new Error('Employee is not active and cannot resign');
    }

    await db
      .update(employees)
      .set({
        employmentStatus: 'resigned',
        endDate: Date.now(),
        updatedAt: Date.now(),
      })
      .where(eq(employees.id, input.id))
      .run();

    const updated = await db.select().from(employees).where(eq(employees.id, input.id)).get();

    return updated;
  }),

  // Mutation: Activate employee
  activate: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = drizzle(ctx.db);

    const existing = await db.select().from(employees).where(eq(employees.id, input.id)).get();

    if (!existing) {
      throw new Error('Employee not found');
    }

    await db
      .update(employees)
      .set({
        employmentStatus: 'active',
        endDate: null,
        updatedAt: Date.now(),
      })
      .where(eq(employees.id, input.id))
      .run();

    const updated = await db.select().from(employees).where(eq(employees.id, input.id)).get();

    return updated;
  }),

  // Query: Validate employee for auth (for user service)
  validateForAuth: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = drizzle(ctx.db);
      const employee = await db.select().from(employees).where(eq(employees.id, input.id)).get();

      if (!employee) {
        return {
          valid: false,
          reason: 'Employee not found',
        };
      }

      if (employee.employmentStatus !== 'active') {
        return {
          valid: false,
          reason: `Employee is ${employee.employmentStatus}`,
        };
      }

      return {
        valid: true,
        employee: {
          id: employee.id,
          code: employee.code,
          name: employee.name,
          email: employee.email,
          employeeNumber: employee.employeeNumber,
          department: employee.department,
          position: employee.position,
          managerId: employee.managerId,
        },
      };
    }),
});
