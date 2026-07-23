-- migrations/0019_bias_brief_pref.sql
--
-- Daily ICC Brief opt-in — a per-user toggle. Lives in
-- notification_preferences alongside the other daily/weekly toggles so
-- the settings UX stays cohesive.

ALTER TABLE notification_preferences ADD COLUMN icc_brief INTEGER DEFAULT 0;
