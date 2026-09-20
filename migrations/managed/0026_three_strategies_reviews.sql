-- Additive: imported broker fills and legacy course history are unchanged.
CREATE TABLE IF NOT EXISTS strategy_reviews (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, version TEXT NOT NULL,
 strategy_id TEXT NOT NULL, session_date TEXT NOT NULL, symbol TEXT NOT NULL,
 provider TEXT NOT NULL, outcome TEXT NOT NULL CHECK(outcome IN ('preparation','skip','review')),
 session_json TEXT NOT NULL, checks_json TEXT NOT NULL, notes TEXT NOT NULL, account_id TEXT, deal_ticket INTEGER,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_strategy_reviews_owner ON strategy_reviews(user_id,created_at DESC);
