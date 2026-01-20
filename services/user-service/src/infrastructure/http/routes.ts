import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { LoginUserUseCase } from '../../application/use-cases/LoginUser';
import { RegisterUserUseCase } from '../../application/use-cases/RegisterUser';
import { JWTService } from '../auth/JWTService';
import { DrizzleUserRepository } from '../repositories/DrizzleUserRepository';

type Bindings = {
  DB: D1Database;
  USER_EVENTS_QUEUE: Queue;
  JWT_SECRET: string;
  JWT_ALGORITHM: string;
  ACCESS_TOKEN_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phoneNumber: z.string().optional(),
  userType: z.enum(['retail', 'wholesale', 'admin']),
  // Wholesale-specific
  companyName: z.string().optional(),
  businessLicense: z.string().optional(),
  taxId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Register new user
 * POST /api/auth/register
 */
app.post('/api/auth/register', zValidator('json', registerSchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const db = c.env.DB;

    // Initialize dependencies
    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleUserRepository(drizzleDb);
    const useCase = new RegisterUserUseCase(repository);

    // Execute use case
    const result = await useCase.execute(input);

    if (!result.isSuccess) {
      const error = result.error || new Error('Unknown error');
      return c.json(
        {
          error: error.name,
          message: error.message,
        },
        400
      );
    }

    return c.json(result.value, 201);
  } catch (error) {
    console.error('Error registering user:', error);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
app.post('/api/auth/login', zValidator('json', loginSchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const db = c.env.DB;

    // Initialize dependencies
    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(db);
    const repository = new DrizzleUserRepository(drizzleDb);

    const jwtService = new JWTService(
      c.env.JWT_SECRET || 'dev-secret-change-in-production',
      c.env.ACCESS_TOKEN_EXPIRY || '1h',
      c.env.REFRESH_TOKEN_EXPIRY || '7d'
    );

    const useCase = new LoginUserUseCase(repository, jwtService);

    // Execute use case
    const result = await useCase.execute(input);

    if (!result.isSuccess) {
      const error = result.error || new Error('Unknown error');
      const statusCode = error.name === 'UnauthorizedError' ? 401 : 400;
      return c.json(
        {
          error: error.name,
          message: error.message,
        },
        statusCode
      );
    }

    return c.json(result.value);
  } catch (error) {
    console.error('Error logging in user:', error);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
app.get('/api/auth/me', async (c) => {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized', message: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);

    // Verify token
    const jwtService = new JWTService(c.env.JWT_SECRET || 'dev-secret-change-in-production');

    const payload = await jwtService.verifyToken(token);
    if (!payload) {
      return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }

    // Get user from database
    const { drizzle } = await import('drizzle-orm/d1');
    const drizzleDb = drizzle(c.env.DB);
    const repository = new DrizzleUserRepository(drizzleDb);

    const userResult = await repository.findById(payload.userId);
    if (!userResult.isSuccess || !userResult.value) {
      return c.json({ error: 'NotFound', message: 'User not found' }, 404);
    }

    const user = userResult.value;

    return c.json({
      userId: user.getId(),
      email: user.getEmail().getValue(),
      fullName: user.getFullName(),
      phoneNumber: user.getPhoneNumber(),
      userType: user.getUserType(),
      status: user.getStatus(),
      emailVerified: user.isEmailVerified(),
      companyName: user.getCompanyName(),
      businessLicense: user.getBusinessLicense(),
      taxId: user.getTaxId(),
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
app.post('/api/auth/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const refreshToken = body.refreshToken;

    if (!refreshToken) {
      return c.json({ error: 'ValidationError', message: 'Refresh token is required' }, 400);
    }

    // Verify refresh token
    const jwtService = new JWTService(
      c.env.JWT_SECRET || 'dev-secret-change-in-production',
      c.env.ACCESS_TOKEN_EXPIRY || '1h',
      c.env.REFRESH_TOKEN_EXPIRY || '7d'
    );

    const payload = await jwtService.verifyToken(refreshToken);
    if (!payload) {
      return c.json({ error: 'Unauthorized', message: 'Invalid refresh token' }, 401);
    }

    // TODO: Check if refresh token is revoked in database

    // Generate new token pair
    const tokens = await jwtService.generateTokenPair({
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
    });

    return c.json(tokens);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500
    );
  }
});

export default app;
