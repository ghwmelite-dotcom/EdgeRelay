export interface Env {
  /** KV namespace for rate limiting */
  RATE_LIMIT: KVNamespace;

  /** D1 database for persistent storage */
  DB: D1Database;

  /** Durable Object binding for account relay */
  ACCOUNT_RELAY: DurableObjectNamespace;
}
