-- Referral System

-- Add referral code and referred_by to users table
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN referred_by TEXT REFERENCES users(id);

-- Commission ledger
CREATE TABLE IF NOT EXISTS referral_commissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  referrer_user_id TEXT NOT NULL REFERENCES users(id),
  referred_user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('ea_purchase', 'subscription')),
  source_amount_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  reference TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cancelled')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_commissions_referrer ON referral_commissions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referred ON referral_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON referral_commissions(status);
