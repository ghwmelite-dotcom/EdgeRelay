-- Strategy Hub tables

CREATE TABLE IF NOT EXISTS strategy_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('trend','reversal','breakout','scalp','swing')),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner','intermediate','advanced')),
  recommended_pairs TEXT,
  recommended_timeframe TEXT,
  parameters_json TEXT NOT NULL DEFAULT '[]',
  backtest_results_json TEXT DEFAULT '{}',
  template_body TEXT NOT NULL,
  integration_block TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_strategy_templates_slug ON strategy_templates(slug);
CREATE INDEX IF NOT EXISTS idx_strategy_templates_published ON strategy_templates(is_published);

CREATE TABLE IF NOT EXISTS ea_generations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  strategy_id TEXT NOT NULL REFERENCES strategy_templates(id),
  parameters_json TEXT NOT NULL,
  generated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ea_generations_user ON ea_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ea_generations_strategy ON ea_generations(strategy_id);
