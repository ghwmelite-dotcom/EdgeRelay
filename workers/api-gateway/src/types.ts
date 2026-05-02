export interface Env {
  /** Cloudflare D1 database */
  DB: D1Database;

  /** KV namespace for session storage */
  SESSIONS: KVNamespace;

  /** R2 bucket for file storage */
  STORAGE: R2Bucket;

  /** Durable Object binding for account relay */
  ACCOUNT_RELAY: DurableObjectNamespace;

  /** KV namespace for Telegram bot state (chat IDs, verification tokens) */
  BOT_STATE: KVNamespace;

  /** Telegram bot token (set via wrangler secret) */
  TELEGRAM_BOT_TOKEN: string;

  /** Comma-separated allowed CORS origins */
  CORS_ORIGINS: string;

  /** JWT secret (set via wrangler secret) */
  JWT_SECRET: string;

  /** Paystack secret key (set via wrangler secret) */
  PAYSTACK_SECRET_KEY: string;

  /** JWT expiry in hours */
  JWT_EXPIRY_HOURS: string;

  /** Workers AI binding */
  AI: Ai;

  /** Google OAuth client ID (set via wrangler secret) */
  GOOGLE_CLIENT_ID: string;

  /** Google OAuth client secret (set via wrangler secret) */
  GOOGLE_CLIENT_SECRET: string;

  /** Service binding to the bias-sage worker (Sage anchor/delta SSE endpoints) */
  BIAS_SAGE_SERVICE: Fetcher;

}

export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

export interface SessionData {
  userId: string;
  createdAt: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
  }
}
