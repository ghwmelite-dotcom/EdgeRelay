-- Latest complete terminal snapshot. Empty positions clears previously open trades.
CREATE TABLE IF NOT EXISTS live_position_snapshots (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  captured_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL
);
