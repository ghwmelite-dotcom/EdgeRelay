-- migrations/0022_orb_engine.sql
--
-- Opening Range Breakout (ORB) — a complementary strategy to ICC that
-- captures session-based volatility expansions. The bell-icon inbox in
-- the UI is shared: we add a `strategy` column to bias_alert_history so
-- ORB and ICC rows coexist, distinguishable by a simple badge.
--
-- orb_history stores one row per (symbol × session × UTC date). The row
-- starts life when the opening range is observed (range_high / range_low
-- set), gets its signal_* fields populated the moment a 15-min candle
-- closes outside the range, and finally gets outcome_* filled in when
-- SL / TP / time-stop resolves.

-- 1. Unify the inbox: ORB alerts share bias_alert_history.
ALTER TABLE bias_alert_history ADD COLUMN strategy TEXT NOT NULL DEFAULT 'ICC';
CREATE INDEX IF NOT EXISTS idx_alert_hist_strategy
  ON bias_alert_history(user_id, strategy, fired_at_unix DESC);

-- 2. ORB signal log (also serves as the track-record data source).
CREATE TABLE IF NOT EXISTS orb_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  symbol TEXT NOT NULL,
  session TEXT NOT NULL CHECK(session IN ('london','newyork')),
  date TEXT NOT NULL,                   -- UTC date 'YYYY-MM-DD'

  -- Range phase
  range_high REAL,
  range_low REAL,
  range_formed_at_unix INTEGER,         -- when the range closed (30 min after open)
  range_atr REAL,                       -- ATR(14) over the last 14 M15 candles at range close
  range_pct REAL,                       -- (high - low) / low — size of range as percent

  -- Signal phase (populated when break occurs)
  signal_type TEXT CHECK(signal_type IN ('long','short') OR signal_type IS NULL),
  signal_price REAL,                    -- close of the M15 candle that broke out
  signal_at_unix INTEGER,
  stop_loss REAL,
  take_profit_1 REAL,                   -- 1× range size from entry
  take_profit_2 REAL,                   -- 2× range size from entry
  quality TEXT CHECK(quality IN ('A_PLUS','A','B','C') OR quality IS NULL),
  criteria_met INTEGER,
  criteria_total INTEGER,
  criteria_json TEXT,

  -- Outcome phase (populated by later cron ticks as price resolves)
  outcome TEXT CHECK(outcome IN ('tp1','tp2','sl','timeout','open') OR outcome IS NULL) DEFAULT 'open',
  outcome_price REAL,
  outcome_at_unix INTEGER,
  r_multiple REAL,

  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(symbol, session, date)
);

CREATE INDEX IF NOT EXISTS idx_orb_symbol_date ON orb_history(symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_orb_signal_time ON orb_history(signal_at_unix DESC) WHERE signal_at_unix IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orb_open ON orb_history(outcome) WHERE outcome = 'open';
