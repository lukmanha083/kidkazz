import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

/**
 * Global error handling middleware
 */
export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Unhandled error:', error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    // Handle HTTP exceptions
    if (error instanceof HTTPException) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        error.status
      );
    }

    // Handle generic errors
    if (error instanceof Error) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }

    // Unknown error
    return c.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      500
    );
  }
}
