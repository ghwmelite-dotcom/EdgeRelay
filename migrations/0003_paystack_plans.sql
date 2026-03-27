-- Paystack plan codes (populated after creating plans on Paystack dashboard)
CREATE TABLE IF NOT EXISTS paystack_plans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tier TEXT NOT NULL UNIQUE CHECK(tier IN ('starter','pro','unlimited','provider')),
  plan_code TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  interval TEXT DEFAULT 'monthly',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed with plan tiers (plan_code to be updated from Paystack dashboard)
INSERT OR IGNORE INTO paystack_plans (tier, plan_code, plan_name, amount_cents, currency) VALUES
  ('starter', 'PLN_starter_placeholder', 'Starter', 1900, 'USD'),
  ('pro', 'PLN_pro_placeholder', 'Pro', 4900, 'USD'),
  ('unlimited', 'PLN_unlimited_placeholder', 'Unlimited', 9900, 'USD'),
  ('provider', 'PLN_provider_placeholder', 'Signal Provider', 14900, 'USD');
