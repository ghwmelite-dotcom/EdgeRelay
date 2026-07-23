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

  /** ChartSage worker shared secret (set via wrangler secret) */
  CHARTSAGE_API_KEY: string;

  /** Workers AI binding */
  AI: Ai;

  /** Google OAuth client ID (set via wrangler secret) */
  GOOGLE_CLIENT_ID: string;

  /** Google OAuth client secret (set via wrangler secret) */
  GOOGLE_CLIENT_SECRET: string;

  /** Twelve Data API key for 4H candle fetches (set via wrangler secret) */
  TWELVE_DATA_KEY?: string;

  /** Public Telegram channel chat_id for A+ SETUP broadcasts. If unset,
   *  the broadcast is a no-op — all other alerts still fire. */
  PUBLIC_ALERT_CHAT_ID?: string;

  /** VAPID public key (base64url-encoded raw EC point) served to the
   *  browser when registering a push subscription. */
  VAPID_PUBLIC_KEY: string;

  /** VAPID JWT `sub` claim — mailto or https URL identifying the
   *  application owner. Required by Mozilla's autopush service. */
  VAPID_SUBJECT: string;

  /** VAPID private key JWK `d` value, base64url. Used to sign the
   *  authorization JWT attached to each push request. */
  VAPID_PRIVATE_KEY?: string;

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
