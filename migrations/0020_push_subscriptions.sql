-- migrations/0020_push_subscriptions.sql
--
-- Web Push subscriptions for browser-level bias alerts. One row per
-- (user_id, endpoint) — users can subscribe multiple devices. When the
-- cron detects a phase transition, we look up the user's subscriptions
-- and fire a push notification to each endpoint in parallel with the
-- Telegram alert.
--
-- Payload encryption keys (p256dh, auth) are stored base64url-encoded
-- exactly as the browser returns them. The worker decodes them at
-- send-time for AES-128-GCM envelope encryption per RFC 8291.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,                  -- client public key (base64url)
  auth TEXT NOT NULL,                    -- authentication secret (base64url)
  ua_hint TEXT,                          -- optional browser UA for display in settings
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT,                     -- updated on successful send
  failure_count INTEGER DEFAULT 0,       -- incremented on each delivery failure
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
