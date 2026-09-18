CREATE TABLE IF NOT EXISTS community_consent (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
