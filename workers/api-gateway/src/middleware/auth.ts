import type { MiddlewareHandler } from 'hono';
import type { Env, JwtPayload, SessionData } from '../types.js';

// ── JWT Helpers ─────────────────────────────────────────────────

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();

  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function verifyToken(token: string, secret: string, expiryGraceSeconds: number): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const valid = await crypto.subtle.verify('HMAC', await getSigningKey(secret), base64UrlDecode(signatureB64), new TextEncoder().encode(`${headerB64}.${payloadB64}`));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.sub !== 'string' || !payload.sub || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.iat > now + 60 || payload.exp <= payload.iat || payload.exp <= now - expiryGraceSeconds) return null;
    return payload;
  } catch { return null; }
}

export const REFRESH_GRACE_SECONDS = 30 * 24 * 3600;
export function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  return verifyToken(token, secret, 0);
}
export function verifyJwtIgnoreExpiry(token: string, secret: string): Promise<JwtPayload | null> {
  return verifyToken(token, secret, REFRESH_GRACE_SECONDS);
}

// ── Token Generation ────────────────────────────────────────────

export async function generateToken(
  userId: string,
  secret: string,
  expiryHours = 24,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: userId,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + expiryHours * 3600,
  };
  return signJwt(payload, secret);
}

// ── Password Hashing (PBKDF2 via Web Crypto) ───────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = parseInt(parts[1]!, 10);
  const saltHex = parts[2]!;
  const expectedHashHex = parts[3]!;

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (hashHex.length !== expectedHashHex.length) return false;
  let result = 0;
  for (let i = 0; i < hashHex.length; i++) {
    result |= hashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return result === 0;
}

// ── Auth Middleware ─────────────────────────────────────────────

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } },
      401,
    );
  }

  const token = authHeader.slice(7);

  // Verify JWT signature and expiration
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
      401,
    );
  }

  // Verify session exists in KV
  const session = await c.env.SESSIONS.get<SessionData>(`session:${payload.sub}:${token}`, 'json');
  if (!session) {
    return c.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Session expired or invalidated' } },
      401,
    );
  }

  c.set('userId', payload.sub);
  await next();
};
