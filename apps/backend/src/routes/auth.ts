import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../lib/db';
import { users, companies } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '../lib/utils';
import type { Env } from '../index';

const authRoutes = new Hono<{ Bindings: Env }>();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Register schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['buyer', 'supplier']),
  companyName: z.string().min(1),
  taxId: z.string().optional(),
});

// POST /api/auth/login
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = createDb(c.env.DB);

  // TODO: Implement proper password hashing with bcrypt or similar
  // This is a placeholder implementation
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // TODO: Verify password hash
  // For now, just return success
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    // TODO: Generate JWT token
    token: 'placeholder-token',
  });
});

// POST /api/auth/register
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json');
  const db = createDb(c.env.DB);

  // Check if user already exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);

  if (existingUser) {
    return c.json({ error: 'Email already registered' }, 400);
  }

  // TODO: Hash password properly
  const userId = generateId();
  const companyId = generateId();

  // Create user
  await db.insert(users).values({
    id: userId,
    email: data.email,
    passwordHash: data.password, // TODO: Hash this!
    role: data.role,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    status: 'pending',
  });

  // Create company
  await db.insert(companies).values({
    id: companyId,
    userId,
    companyName: data.companyName,
    taxId: data.taxId,
    country: 'US',
    verified: false,
  });

  return c.json({
    message: 'Registration successful. Your account is pending verification.',
    user: {
      id: userId,
      email: data.email,
      role: data.role,
    },
  }, 201);
});

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  // TODO: Implement JWT verification
  // For now, return placeholder
  return c.json({ message: 'Authentication not yet implemented' }, 501);
});

export { authRoutes };
