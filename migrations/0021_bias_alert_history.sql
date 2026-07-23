-- migrations/0021_bias_alert_history.sql
--
-- In-app alert inbox. Every time the cron fires a phase-transition alert
-- to a user (Telegram + web push), we also log a row here so the user's
-- /settings bell icon can surface a history of received alerts, tagged
-- with a quality tier so weak / partial-confluence setups are visually
-- distinct from A+ setups where all criteria aligned.

CREATE TABLE IF NOT EXISTS bias_alert_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  fired_at_unix INTEGER NOT NULL,        -- captured_unix of the triggering snapshot
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,                 -- '4h' | '1h'
  phase TEXT NOT NULL,                    -- the phase being entered
  bias TEXT NOT NULL,                     -- BULLISH | BEARISH | NEUTRAL
  previous_phase TEXT,                    -- the prior phase (for "from X to Y")
  quality TEXT NOT NULL CHECK(quality IN ('A_PLUS','A','B','C')),
  criteria_met INTEGER NOT NULL,          -- count of 8
  criteria_total INTEGER NOT NULL DEFAULT 8,
  criteria_json TEXT,                     -- { 'has_confluence': true, ... } for drill-down
  trade_plan_json TEXT,                   -- the TradePlan at alert moment (nullable)
  narrative TEXT,
  read_at_unix INTEGER,                   -- NULL until user opens the basket
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alert_hist_user_fired
  ON bias_alert_history(user_id, fired_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_alert_hist_user_unread
  ON bias_alert_history(user_id, read_at_unix) WHERE read_at_unix IS NULL;
