export interface Env {
  DB: D1Database;
  BIAS_SAGE: KVNamespace;
  AI: Ai;
  SAGE_MODEL: string;
  DELTA_DAILY_CAP: string;
  N_PLATFORM_DIVERGENCE_THRESHOLD: string;
}
