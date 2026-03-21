/** Maximum signals per minute per account (rate limit) */
export const RATE_LIMIT_PER_MINUTE = 60;

/** Heartbeat interval in milliseconds */
export const HEARTBEAT_INTERVAL_MS = 5_000;

/** Long-poll timeout in seconds */
export const LONG_POLL_TIMEOUT_S = 25;

/** Maximum signal age in seconds before rejection (stale signal) */
export const MAX_SIGNAL_AGE_S = 30;

/** Maximum local queue size in EA */
export const MAX_LOCAL_QUEUE_SIZE = 1_000;

/** Maximum slippage points default */
export const DEFAULT_MAX_SLIPPAGE = 30;

/** API version prefix */
export const API_VERSION = 'v1';

/** Signal ingestion path */
export const INGEST_PATH = `/${API_VERSION}/ingest`;

/** Heartbeat path */
export const HEARTBEAT_PATH = `/${API_VERSION}/heartbeat`;

/** Poll path prefix (append /{account_id}) */
export const POLL_PATH = `/${API_VERSION}/poll`;

/** Execution report path */
export const EXECUTION_PATH = `/${API_VERSION}/execution`;
