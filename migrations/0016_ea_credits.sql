-- EA generation purchase credits (one-time Paystack payments)
CREATE TABLE IF NOT EXISTS ea_generation_credits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  reference TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  credited_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ea_credits_user ON ea_generation_credits(user_id);
