-- Phase 1 of /bias goldmine. See docs/superpowers/specs/2026-05-02-bias-goldmine-design.md.

-- Per-user analytics, materialized from journal_trades × bias_history.
-- Built by journal-sync after every sync completion.
CREATE TABLE IF NOT EXISTS user_bias_stats (
  user_id        TEXT NOT NULL,
  symbol         TEXT NOT NULL,
  icc_phase      TEXT NOT NULL,
  n_trades       INTEGER NOT NULL,
  n_wins         INTEGER NOT NULL,
  total_r        REAL NOT NULL,
  last_trade_at  INTEGER,
  updated_at     INTEGER NOT NULL,
  PRIMARY KEY (user_id, symbol, icc_phase)
);
CREATE INDEX IF NOT EXISTS idx_ubs_user ON user_bias_stats(user_id, updated_at DESC);

-- Per-user generated briefs (anchor + delta history).
CREATE TABLE IF NOT EXISTS sage_briefs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK(kind IN ('anchor','delta')),
  brief_md      TEXT NOT NULL,
  intent_json   TEXT NOT NULL,
  audio_r2_key  TEXT,
  inputs_hash   TEXT NOT NULL,
  trigger_kind  TEXT,
  generated_at  INTEGER NOT NULL,
  level         TEXT NOT NULL CHECK(level IN ('L1','L2'))
);
CREATE INDEX IF NOT EXISTS idx_sb_user_recent ON sage_briefs(user_id, generated_at DESC);

-- Plans Sage suggested (rendered in Phase 2; FK targets sage_briefs).
CREATE TABLE IF NOT EXISTS journal_plans (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  brief_id      TEXT REFERENCES sage_briefs(id),
  symbol        TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK(direction IN ('long','short')),
  entry         REAL NOT NULL,
  sl            REAL NOT NULL,
  tp            REAL NOT NULL,
  lot           REAL NOT NULL,
  status        TEXT NOT NULL CHECK(status IN ('saved','sent','filled','rejected','closed','expired')),
  signal_id     TEXT,
  created_at    INTEGER NOT NULL,
  closed_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_jp_user_recent ON journal_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jp_signal ON journal_plans(signal_id);
