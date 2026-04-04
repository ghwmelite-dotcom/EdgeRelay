import { Hono } from 'hono';
import type { ApiResponse } from '@edgerelay/shared';
import type { Env } from '../types.js';
import { generateToken, hashPassword, verifyPassword, verifyJwtIgnoreExpiry } from '../middleware/auth.js';
import { notifyLogin } from '../lib/notifyLogin.js';

const auth = new Hono<{ Bindings: Env }>();

// ── POST /auth/register ─────────────────────────────────────────
auth.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string; referral_code?: string }>();

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

  // Link referral if referral code provided
  const refCode = body.referral_code;
  if (refCode) {
    const referrer = await c.env.DB.prepare(
      'SELECT id FROM users WHERE referral_code = ?',
    )
      .bind(refCode)
      .first<{ id: string }>();

    if (referrer && referrer.id !== result.id) {
      await c.env.DB.prepare('UPDATE users SET referred_by = ? WHERE id = ?')
        .bind(referrer.id, result.id)
        .run();

      // Notify referrer via Telegram (non-blocking)
      try {
        const tgRaw = await c.env.BOT_STATE.get(`user:${referrer.id}:tg`);
        if (tgRaw) {
          const chatId = String((JSON.parse(tgRaw) as { chatId?: unknown }).chatId);
          const maskedEmail = body.email.slice(0, 3) + '***@' + body.email.split('@')[1];
          const msg = `🎉 <b>New Referral Signup!</b>\n\n${maskedEmail} just joined TradeMetrics Pro using your referral link. Keep sharing — you earn $0.50 for every EA they purchase! 💰`;
          fetch(`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
          }).catch(() => {});
        }
      } catch {}
    }
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

  // Send login alert via Telegram (non-blocking)
  c.executionCtx.waitUntil(
    notifyLogin(c.env, user.id, new Date().toISOString()),
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

// ── POST /auth/refresh ──────────────────────────────────────────
auth.post('/refresh', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Missing token' } },
      401,
    );
  }

  const oldToken = authHeader.slice(7);

  // Verify signature but allow expired tokens (up to 30 days)
  const payload = await verifyJwtIgnoreExpiry(oldToken, c.env.JWT_SECRET);
  if (!payload) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Token invalid or too old to refresh' } },
      401,
    );
  }

  // Verify user still exists
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, plan FROM users WHERE id = ?',
  )
    .bind(payload.sub)
    .first<{ id: string; email: string; name: string | null; plan: string }>();

  if (!user) {
    return c.json<ApiResponse>(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'User not found' } },
      401,
    );
  }

  // Delete old session
  await c.env.SESSIONS.delete(`session:${payload.sub}:${oldToken}`).catch(() => {});

  // Issue new token + session
  const expiryHours = parseInt(c.env.JWT_EXPIRY_HOURS || '24', 10);
  const newToken = await generateToken(user.id, c.env.JWT_SECRET, expiryHours);

  await c.env.SESSIONS.put(
    `session:${user.id}:${newToken}`,
    JSON.stringify({ userId: user.id, createdAt: Date.now() }),
    { expirationTtl: expiryHours * 3600 },
  );

  return c.json<ApiResponse>({
    data: {
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
      token: newToken,
    },
    error: null,
  });
});

// ── GET /auth/google — Redirect to Google OAuth ─────────────────
auth.get('/google', async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json<ApiResponse>({ data: null, error: { code: 'NOT_CONFIGURED', message: 'Google OAuth not configured' } }, 500);
  }

  const redirectUri = `https://edgerelay-api.ghwmelite.workers.dev/v1/auth/google/callback`;
  const scope = encodeURIComponent('openid email profile');
  const state = crypto.randomUUID(); // CSRF protection

  // Store state in KV for verification
  await c.env.SESSIONS.put(`google-oauth-state:${state}`, '1', { expirationTtl: 600 });

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&prompt=select_account`;

  return c.redirect(googleUrl);
});

// ── GET /auth/google/callback — Handle Google OAuth callback ────
auth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  const frontendUrl = 'https://trademetricspro.com';

  if (error || !code) {
    return c.redirect(`${frontendUrl}/login?error=google_denied`);
  }

  // Verify state
  if (state) {
    const valid = await c.env.SESSIONS.get(`google-oauth-state:${state}`);
    if (!valid) {
      return c.redirect(`${frontendUrl}/login?error=invalid_state`);
    }
    await c.env.SESSIONS.delete(`google-oauth-state:${state}`);
  }

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `https://edgerelay-api.ghwmelite.workers.dev/v1/auth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return c.redirect(`${frontendUrl}/login?error=google_token_failed`);
  }

  // Fetch user info
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const googleUser = await userInfoRes.json() as { email?: string; name?: string; picture?: string };
  if (!googleUser.email) {
    return c.redirect(`${frontendUrl}/login?error=google_no_email`);
  }

  const email = googleUser.email.toLowerCase().trim();
  const name = googleUser.name || email.split('@')[0];

  // Check if user exists
  let user = await c.env.DB.prepare(
    'SELECT id, email, name, plan FROM users WHERE email = ?',
  ).bind(email).first<{ id: string; email: string; name: string | null; plan: string }>();

  if (!user) {
    // Auto-register with random password (they'll use Google to login)
    const randomPassword = crypto.randomUUID();
    const passwordHash = await hashPassword(randomPassword);

    user = await c.env.DB.prepare(
      `INSERT INTO users (email, password_hash, name, plan) VALUES (?, ?, ?, 'free')
       RETURNING id, email, name, plan`,
    ).bind(email, passwordHash, name).first();

    if (!user) {
      return c.redirect(`${frontendUrl}/login?error=registration_failed`);
    }
  }

  // Issue JWT
  const expiryHours = parseInt(c.env.JWT_EXPIRY_HOURS || '24', 10);
  const token = await generateToken(user.id, c.env.JWT_SECRET, expiryHours);

  // Store session in KV
  await c.env.SESSIONS.put(
    `session:${user.id}:${token}`,
    JSON.stringify({ userId: user.id, createdAt: Date.now() }),
    { expirationTtl: expiryHours * 3600 },
  );

  // Redirect to frontend with token (use hash fragment for security — not in URL params)
  return c.redirect(`${frontendUrl}/auth/callback#token=${token}&user=${encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, name: user.name, plan: user.plan }))}`);
});

export { auth };
