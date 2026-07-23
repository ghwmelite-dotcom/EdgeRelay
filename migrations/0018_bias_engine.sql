-- migrations/0018_bias_engine.sql
--
-- Foundation tables for the ICC Bias Engine:
--   bias_history      — one row per asset per scheduled snapshot.
--                       Drives phase-transition alerts and historical accuracy.
--   bias_alert_prefs  — per-user opt-in: which symbols × which phase transitions
--                       should fire a Telegram alert.
--
-- bias_history is append-only. A separate cleanup job can prune rows older
-- than retention_days if the table grows unbounded, but at 5 assets × 4
-- snapshots/hour × 24h × 365d = ~175k rows/year — entirely fine for D1.

CREATE TABLE IF NOT EXISTS bias_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL DEFAULT '4h',           -- '4h' or '1h' when multi-TF lands
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  captured_unix INTEGER NOT NULL,                -- Unix seconds for fast range scans

  -- Headline numbers
  price REAL NOT NULL,
  score INTEGER NOT NULL,                        -- -100..+100
  bias TEXT NOT NULL CHECK(bias IN ('BULLISH','BEARISH','NEUTRAL')),
  confidence INTEGER NOT NULL,                   -- 0..100
  tradeable INTEGER NOT NULL DEFAULT 0,

  -- ICC breakdown (flat columns for cheap queries)
  market_state TEXT NOT NULL,                    -- UPTREND | DOWNTREND | CONSOLIDATION
  phase TEXT NOT NULL,                           -- INDICATION | CORRECTION | CONTINUATION | NO_SETUP
  indication_level REAL,                         -- NULL when no active indication
  correction_depth REAL,                         -- percentage retracement, or NULL

  -- Retained for later drill-down; full json so the UI can recompute anything
  -- without re-running the analyzer.
  snapshot_json TEXT                             -- full AssetBias object
);

CREATE INDEX IF NOT EXISTS idx_bias_history_symbol_time
  ON bias_history(symbol, captured_unix DESC);

CREATE INDEX IF NOT EXISTS idx_bias_history_symbol_interval_time
  ON bias_history(symbol, interval, captured_unix DESC);


CREATE TABLE IF NOT EXISTS bias_alert_prefs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  symbol TEXT NOT NULL,                          -- XAUUSD, NAS100, US30, EURUSD, GBPUSD
  -- Individual phase-transition opt-ins
  alert_on_indication INTEGER NOT NULL DEFAULT 0,
  alert_on_correction INTEGER NOT NULL DEFAULT 0,
  alert_on_continuation INTEGER NOT NULL DEFAULT 1,   -- the entry window — default on
  alert_on_consolidation INTEGER NOT NULL DEFAULT 0,  -- when trend breaks down
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_bias_alert_prefs_user
  ON bias_alert_prefs(user_id);

CREATE INDEX IF NOT EXISTS idx_bias_alert_prefs_symbol
  ON bias_alert_prefs(symbol);
