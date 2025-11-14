import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

type Bindings = {
  DB: D1Database;
  USER_EVENTS_QUEUE: Queue;
  JWT_SECRET: string;
  JWT_ALGORITHM: string;
  ACCESS_TOKEN_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('/*', logger());
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
  });
});

// Placeholder routes - will be implemented later
app.post('/api/auth/register', (c) => {
  return c.json({ message: 'Register - coming soon' }, 501);
});

app.post('/api/auth/login', (c) => {
  return c.json({ message: 'Login - coming soon' }, 501);
});

app.post('/api/auth/refresh', (c) => {
  return c.json({ message: 'Refresh token - coming soon' }, 501);
});

app.get('/api/users/:id', (c) => {
  return c.json({ message: 'Get user - coming soon' }, 501);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: c.req.url,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('User Service Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

export default app;
