-- Platform Bridge: add cross-platform support columns

-- 1. Add platform to follower_config
ALTER TABLE follower_config ADD COLUMN platform TEXT NOT NULL DEFAULT 'mt5';

-- 2. Add platform columns to symbol_mappings
ALTER TABLE symbol_mappings ADD COLUMN source_platform TEXT NOT NULL DEFAULT 'mt5';
ALTER TABLE symbol_mappings ADD COLUMN target_platform TEXT NOT NULL DEFAULT 'mt5';

-- 3. Recreate signals table to relax CHECK constraint and add platform columns.
-- The old table has CHECK(order_type IN (...)) which blocks future platform order types.

CREATE TABLE signals_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  master_account_id TEXT NOT NULL REFERENCES accounts(id),
  sequence_num INTEGER NOT NULL,
  action TEXT NOT NULL,
  order_type TEXT,
  symbol TEXT NOT NULL,
  volume REAL,
  price REAL,
  sl REAL,
  tp REAL,
  magic_number INTEGER,
  ticket INTEGER,
  comment TEXT,
  source_platform TEXT,
  normalized_order_type TEXT,
  received_at TEXT DEFAULT (datetime('now')),
  UNIQUE(master_account_id, sequence_num)
);

INSERT INTO signals_new (id, master_account_id, sequence_num, action, order_type, symbol, volume, price, sl, tp, magic_number, ticket, comment, received_at)
SELECT id, master_account_id, sequence_num, action, order_type, symbol, volume, price, sl, tp, magic_number, ticket, comment, received_at FROM signals;

DROP TABLE signals;
ALTER TABLE signals_new RENAME TO signals;

-- Recreate signals indexes
CREATE INDEX idx_signals_master ON signals(master_account_id, received_at);
CREATE INDEX idx_signals_dedup ON signals(master_account_id, sequence_num);
