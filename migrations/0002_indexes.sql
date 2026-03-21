-- EdgeRelay Indexes
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_master ON accounts(master_account_id);
CREATE INDEX idx_accounts_api_key ON accounts(api_key);
CREATE INDEX idx_signals_master ON signals(master_account_id, received_at);
CREATE INDEX idx_signals_dedup ON signals(master_account_id, sequence_num);
CREATE INDEX idx_executions_signal ON executions(signal_id);
CREATE INDEX idx_executions_follower ON executions(follower_account_id, executed_at);
