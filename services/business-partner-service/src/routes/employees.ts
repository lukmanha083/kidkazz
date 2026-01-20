import { zValidator } from '@hono/zod-validator';
import { and, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { Employee } from '../domain/entities/Employee';
import { employees } from '../infrastructure/db/schema';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
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

const updateEmployeeSchema = createEmployeeSchema.partial().omit({ employeeNumber: true });

// GET /api/employees - List all employees
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const status = c.req.query('status');
  const department = c.req.query('department');
  const managerId = c.req.query('managerId');
  const search = c.req.query('search');

  let query = db.select().from(employees).$dynamic();

  const conditions = [];
  if (status) {
    conditions.push(eq(employees.employmentStatus, status));
  }
  if (department) {
    conditions.push(eq(employees.department, department));
  }
  if (managerId) {
    conditions.push(eq(employees.managerId, managerId));
  }
  if (search) {
    conditions.push(
      or(
        like(employees.name, `%${search}%`),
        like(employees.code, `%${search}%`),
        like(employees.employeeNumber, `%${search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const allEmployees = await query.all();

  return c.json({
    employees: allEmployees,
    total: allEmployees.length,
  });
});

// GET /api/employees/:id - Get employee by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const employee = await db.select().from(employees).where(eq(employees.id, id)).get();

  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  return c.json(employee);
});

// POST /api/employees - Create new employee
app.post('/', zValidator('json', createEmployeeSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Check if employee number already exists
  const existingByNumber = await db
    .select()
    .from(employees)
    .where(eq(employees.employeeNumber, data.employeeNumber))
    .get();

  if (existingByNumber) {
    return c.json({ error: 'Employee number already exists' }, 400);
  }

  // Use domain entity to create employee
  const employee = Employee.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    employeeNumber: data.employeeNumber,
    department: data.department,
    position: data.position,
    managerId: data.managerId,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    gender: data.gender,
    nationalId: data.nationalId,
    npwp: data.npwp,
    joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
    baseSalary: data.baseSalary,
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

  return c.json(employeeData, 201);
});

// PUT /api/employees/:id - Update employee
app.put('/:id', zValidator('json', updateEmployeeSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(employees).where(eq(employees.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  const updateData: Record<string, unknown> = { updatedAt: Date.now() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.managerId !== undefined) updateData.managerId = data.managerId;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth).getTime();
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
  if (data.npwp !== undefined) updateData.npwp = data.npwp;
  if (data.joinDate !== undefined) updateData.joinDate = new Date(data.joinDate).getTime();
  if (data.baseSalary !== undefined) updateData.baseSalary = data.baseSalary;

  await db.update(employees).set(updateData).where(eq(employees.id, id)).run();

  const updated = await db.select().from(employees).where(eq(employees.id, id)).get();

  return c.json(updated);
});

// DELETE /api/employees/:id - Delete employee (soft delete via status)
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(employees).where(eq(employees.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  await db
    .update(employees)
    .set({ employmentStatus: 'terminated', endDate: Date.now(), updatedAt: Date.now() })
    .where(eq(employees.id, id))
    .run();

  return c.json({ message: 'Employee deleted successfully' });
});

// POST /api/employees/:id/terminate - Terminate employee
app.post('/:id/terminate', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(employees).where(eq(employees.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  if (existing.employmentStatus !== 'active') {
    return c.json({ error: 'Employee is not active and cannot be terminated' }, 400);
  }

  await db
    .update(employees)
    .set({ employmentStatus: 'terminated', endDate: Date.now(), updatedAt: Date.now() })
    .where(eq(employees.id, id))
    .run();

  const updated = await db.select().from(employees).where(eq(employees.id, id)).get();

  return c.json(updated);
});

// POST /api/employees/:id/resign - Resign employee
app.post('/:id/resign', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(employees).where(eq(employees.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  if (existing.employmentStatus !== 'active') {
    return c.json({ error: 'Employee is not active and cannot resign' }, 400);
  }

  await db
    .update(employees)
    .set({ employmentStatus: 'resigned', endDate: Date.now(), updatedAt: Date.now() })
    .where(eq(employees.id, id))
    .run();

  const updated = await db.select().from(employees).where(eq(employees.id, id)).get();

  return c.json(updated);
});

// POST /api/employees/:id/activate - Activate employee
app.post('/:id/activate', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(employees).where(eq(employees.id, id)).get();

  if (!existing) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  await db
    .update(employees)
    .set({ employmentStatus: 'active', endDate: null, updatedAt: Date.now() })
    .where(eq(employees.id, id))
    .run();

  const updated = await db.select().from(employees).where(eq(employees.id, id)).get();

  return c.json(updated);
});

export default app;
