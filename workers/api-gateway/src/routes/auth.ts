import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { generateToken, hashPassword, verifyPassword } from '../middleware/auth.js';

const auth = new Hono<{ Bindings: Env }>();

// ── POST /auth/register ─────────────────────────────────────────
auth.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string }>();

  if (!body.email || !body.password) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
      400,
    );
  }

  const email = body.email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } },
      400,
    );
  }

  if (body.password.length < 8) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } },
      400,
    );
  }

  // Check if user already exists
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'CONFLICT', message: 'An account with this email already exists' } },
      409,
    );
  }

  const passwordHash = await hashPassword(body.password);
  const name = body.name?.trim() || null;

  const result = await c.env.DB.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING id, email, name, plan, created_at',
  )
    .bind(email, passwordHash, name)
    .first<{ id: string; email: string; name: string | null; plan: string; created_at: string }>();

  if (!result) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } },
      500,
    );
  }

  const expiryHours = parseInt(c.env.JWT_EXPIRY_HOURS || '24', 10);
  const token = await generateToken(result.id, c.env.JWT_SECRET, expiryHours);

  // Store session in KV
  await c.env.SESSIONS.put(
    `session:${result.id}:${token}`,
    JSON.stringify({ userId: result.id, createdAt: Date.now() }),
    { expirationTtl: expiryHours * 3600 },
  );

  return c.json<ApiResponse>(
    {
      data: {
        user: { id: result.id, email: result.email, name: result.name, plan: result.plan },
        token,
      },
      error: null,
    },
    201,
  );
});

// ── POST /auth/login ────────────────────────────────────────────
auth.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
      400,
    );
  }

  const email = body.email.toLowerCase().trim();

  const user = await c.env.DB.prepare(
    'SELECT id, email, password_hash, name, plan FROM users WHERE email = ?',
  )
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; name: string | null; plan: string }>();

  if (!user) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
      401,
    );
  }

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
      401,
    );
  }

  const expiryHours = parseInt(c.env.JWT_EXPIRY_HOURS || '24', 10);
  const token = await generateToken(user.id, c.env.JWT_SECRET, expiryHours);

  // Store session in KV
  await c.env.SESSIONS.put(
    `session:${user.id}:${token}`,
    JSON.stringify({ userId: user.id, createdAt: Date.now() }),
    { expirationTtl: expiryHours * 3600 },
  );

  return c.json<ApiResponse>({
    data: {
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
      token,
    },
    error: null,
  });
});

// ── POST /auth/logout ───────────────────────────────────────────
auth.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } },
      401,
    );
  }

  const token = authHeader.slice(7);

  // We need to extract the userId from the token to build the KV key
  // Decode the payload without verification (we just want to delete the session)
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) throw new Error('Invalid token');
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr) as { sub: string };
    await c.env.SESSIONS.delete(`session:${payload.sub}:${token}`);
  } catch {
    // Even if token parsing fails, return success (idempotent logout)
  }

  return c.json<ApiResponse>({ data: { message: 'Logged out successfully' }, error: null });
});

export { auth };
