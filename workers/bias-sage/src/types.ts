export interface Env {
  DB: D1Database;
  BIAS_SAGE: KVNamespace;
  ANTHROPIC_API_KEY: string;
  SAGE_MODEL: string;
  DELTA_DAILY_CAP: string;
  N_PLATFORM_DIVERGENCE_THRESHOLD: string;
}
