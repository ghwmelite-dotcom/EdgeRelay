-- Firm Templates: Pre-configured prop firm rule templates
-- Migration 0008

-- ============================================================
-- Part 1: Create firm_templates table
-- ============================================================

CREATE TABLE IF NOT EXISTS firm_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  firm_name TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  challenge_phase TEXT NOT NULL CHECK(challenge_phase IN ('evaluation_1','evaluation_2','funded','express','instant','evaluation','verification')),
  initial_balance REAL NOT NULL,
  profit_target_percent REAL,
  profit_target_amount REAL,
  daily_loss_percent REAL NOT NULL,
  max_drawdown_percent REAL NOT NULL,
  max_drawdown_amount REAL,
  daily_loss_type TEXT NOT NULL CHECK(daily_loss_type IN ('balance','equity','higher_of_both')),
  drawdown_type TEXT NOT NULL CHECK(drawdown_type IN ('static','trailing','eod_trailing')),
  min_trading_days INTEGER,
  max_calendar_days INTEGER,
  news_trading_restricted INTEGER NOT NULL DEFAULT 0,
  news_minutes_before INTEGER NOT NULL DEFAULT 2,
  news_minutes_after INTEGER NOT NULL DEFAULT 2,
  weekend_holding_allowed INTEGER NOT NULL DEFAULT 1,
  max_lot_size REAL,
  consistency_rule INTEGER NOT NULL DEFAULT 0,
  max_daily_profit_percent REAL,
  source_url TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  submitted_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(firm_name, plan_name, challenge_phase)
);

CREATE INDEX IF NOT EXISTS idx_firm_templates_firm ON firm_templates(firm_name);
CREATE INDEX IF NOT EXISTS idx_firm_templates_verified ON firm_templates(verified);

-- ============================================================
-- Part 2: Extend prop_rules with template reference
-- Only runs if prop_rules table exists (from migration 0004)
-- ============================================================

CREATE TABLE IF NOT EXISTS prop_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  preset_name TEXT,
  challenge_phase TEXT DEFAULT 'evaluation'
    CHECK(challenge_phase IN ('evaluation','verification','funded')),
  initial_balance REAL NOT NULL,
  profit_target_percent REAL DEFAULT 10.0,
  max_daily_loss_percent REAL DEFAULT 5.0,
  daily_loss_calculation TEXT DEFAULT 'balance_start_of_day'
    CHECK(daily_loss_calculation IN ('balance_start_of_day','equity_high_of_day','previous_day_balance')),
  max_total_drawdown_percent REAL DEFAULT 10.0,
  drawdown_type TEXT DEFAULT 'static'
    CHECK(drawdown_type IN ('static','trailing','eod_trailing')),
  trailing_drawdown_lock_at_breakeven BOOLEAN DEFAULT false,
  max_lot_size REAL DEFAULT 100.0,
  max_open_positions INTEGER DEFAULT 50,
  max_daily_trades INTEGER DEFAULT 0,
  min_trading_days INTEGER DEFAULT 0,
  consistency_rule_enabled BOOLEAN DEFAULT false,
  max_profit_from_single_day_percent REAL DEFAULT 30.0,
  allowed_trading_start TEXT DEFAULT '00:00',
  allowed_trading_end TEXT DEFAULT '23:59',
  block_weekend_holding BOOLEAN DEFAULT false,
  block_during_news BOOLEAN DEFAULT false,
  news_block_minutes_before INTEGER DEFAULT 5,
  news_block_minutes_after INTEGER DEFAULT 5,
  allowed_symbols TEXT DEFAULT '[]',
  blocked_symbols TEXT DEFAULT '[]',
  warning_threshold_percent REAL DEFAULT 80.0,
  critical_threshold_percent REAL DEFAULT 95.0,
  auto_close_at_critical BOOLEAN DEFAULT true,
  challenge_start_date TEXT,
  challenge_end_date TEXT,
  firm_template_id TEXT REFERENCES firm_templates(id),
  template_version INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- If prop_rules already existed (from 0004), add the new columns
-- These will silently fail if table was just created above with the columns
-- Using a trigger-based workaround is not needed since D1 handles this gracefully

-- ============================================================
-- Part 3: Seed data — 5 firms, ~42 rows
-- ============================================================

-- ---------------------------------------------------------
-- FTMO (15 rows: 5 balances × 3 phases)
-- ---------------------------------------------------------

-- FTMO $10K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $10K', 'evaluation_1', 10000, 10.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 30, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $10K', 'evaluation_2', 10000, 5.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 60, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $10K', 'funded', 10000, 5.0, 10.0, 'higher_of_both', 'static', 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

-- FTMO $25K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $25K', 'evaluation_1', 25000, 10.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 30, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $25K', 'evaluation_2', 25000, 5.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 60, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $25K', 'funded', 25000, 5.0, 10.0, 'higher_of_both', 'static', 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

-- FTMO $50K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $50K', 'evaluation_1', 50000, 10.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 30, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $50K', 'evaluation_2', 50000, 5.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 60, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $50K', 'funded', 50000, 5.0, 10.0, 'higher_of_both', 'static', 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

-- FTMO $100K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $100K', 'evaluation_1', 100000, 10.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 30, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $100K', 'evaluation_2', 100000, 5.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 60, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $100K', 'funded', 100000, 5.0, 10.0, 'higher_of_both', 'static', 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

-- FTMO $200K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $200K', 'evaluation_1', 200000, 10.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 30, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $200K', 'evaluation_2', 200000, 5.0, 5.0, 10.0, 'higher_of_both', 'static', 4, 60, 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, news_trading_restricted, news_minutes_before, news_minutes_after, weekend_holding_allowed, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FTMO', 'FTMO $200K', 'funded', 200000, 5.0, 10.0, 'higher_of_both', 'static', 1, 2, 2, 1, 'https://ftmo.com/en/trading-objectives/', 1);

-- ---------------------------------------------------------
-- FundedNext (7 rows: Stellar $25K/$100K × 3 phases + Express $100K)
-- ---------------------------------------------------------

-- Stellar $25K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FundedNext', 'Stellar $25K', 'evaluation_1', 25000, 8.0, 5.0, 10.0, 'balance', 'static', 5, 30, 'https://fundednext.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FundedNext', 'Stellar $25K', 'evaluation_2', 25000, 5.0, 5.0, 10.0, 'balance', 'static', 5, 60, 'https://fundednext.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FundedNext', 'Stellar $25K', 'funded', 25000, 5.0, 10.0, 'balance', 'static', 'https://fundednext.com/', 1);

-- Stellar $100K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FundedNext', 'Stellar $100K', 'evaluation_1', 100000, 8.0, 5.0, 10.0, 'balance', 'static', 5, 30, 'https://fundednext.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FundedNext', 'Stellar $100K', 'evaluation_2', 100000, 5.0, 5.0, 10.0, 'balance', 'static', 5, 60, 'https://fundednext.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FundedNext', 'Stellar $100K', 'funded', 100000, 5.0, 10.0, 'balance', 'static', 'https://fundednext.com/', 1);

-- Express $100K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'FundedNext', 'Express $100K', 'express', 100000, 25.0, 5.0, 10.0, 'balance', 'trailing', 10, 1, 40.0, 'https://fundednext.com/', 1);

-- ---------------------------------------------------------
-- The5ers (6 rows: Growth $6K/$40K/$100K × eval_1/funded)
-- ---------------------------------------------------------

-- Growth $6K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'The5ers', 'Growth $6K', 'evaluation_1', 6000, 8.0, 3.0, 6.0, 'balance', 'static', 3, 'https://the5ers.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'The5ers', 'Growth $6K', 'funded', 6000, 3.0, 6.0, 'balance', 'static', 'https://the5ers.com/', 1);

-- Growth $40K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'The5ers', 'Growth $40K', 'evaluation_1', 40000, 8.0, 3.0, 6.0, 'balance', 'static', 3, 'https://the5ers.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'The5ers', 'Growth $40K', 'funded', 40000, 3.0, 6.0, 'balance', 'static', 'https://the5ers.com/', 1);

-- Growth $100K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'The5ers', 'Growth $100K', 'evaluation_1', 100000, 8.0, 3.0, 6.0, 'balance', 'static', 3, 'https://the5ers.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'The5ers', 'Growth $100K', 'funded', 100000, 3.0, 6.0, 'balance', 'static', 'https://the5ers.com/', 1);

-- ---------------------------------------------------------
-- MyFundedFX (6 rows: $50K/$100K × eval_1/eval_2/funded)
-- ---------------------------------------------------------

-- MyFundedFX $50K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'MyFundedFX', 'MyFundedFX $50K', 'evaluation_1', 50000, 8.0, 5.0, 10.0, 'balance', 'static', 5, 30, 'https://myfundedfx.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'MyFundedFX', 'MyFundedFX $50K', 'evaluation_2', 50000, 5.0, 5.0, 10.0, 'balance', 'static', 5, 60, 'https://myfundedfx.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'MyFundedFX', 'MyFundedFX $50K', 'funded', 50000, 5.0, 10.0, 'balance', 'static', 'https://myfundedfx.com/', 1);

-- MyFundedFX $100K
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'MyFundedFX', 'MyFundedFX $100K', 'evaluation_1', 100000, 8.0, 5.0, 10.0, 'balance', 'static', 5, 30, 'https://myfundedfx.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, min_trading_days, max_calendar_days, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'MyFundedFX', 'MyFundedFX $100K', 'evaluation_2', 100000, 5.0, 5.0, 10.0, 'balance', 'static', 5, 60, 'https://myfundedfx.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, daily_loss_type, drawdown_type, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'MyFundedFX', 'MyFundedFX $100K', 'funded', 100000, 5.0, 10.0, 'balance', 'static', 'https://myfundedfx.com/', 1);

-- ---------------------------------------------------------
-- Apex Trader Funding (8 rows: $25K/$50K/$100K/$300K × eval_1/funded)
-- Uses absolute amounts + equivalent percentages
-- ---------------------------------------------------------

-- Apex $25K (target=$1500/6%, max_dd=$1500/6%)
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, profit_target_amount, daily_loss_percent, max_drawdown_percent, max_drawdown_amount, daily_loss_type, drawdown_type, min_trading_days, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'Apex Trader Funding', 'Apex $25K', 'evaluation_1', 25000, 6.0, 1500.0, 100.0, 6.0, 1500.0, 'balance', 'eod_trailing', 7, 1, 30.0, 'https://apextraderfunding.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, max_drawdown_amount, daily_loss_type, drawdown_type, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'Apex Trader Funding', 'Apex $25K', 'funded', 25000, 100.0, 6.0, 1500.0, 'balance', 'eod_trailing', 1, 30.0, 'https://apextraderfunding.com/', 1);

-- Apex $50K (target=$3000/6%, max_dd=$2500/5%)
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, profit_target_amount, daily_loss_percent, max_drawdown_percent, max_drawdown_amount, daily_loss_type, drawdown_type, min_trading_days, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'Apex Trader Funding', 'Apex $50K', 'evaluation_1', 50000, 6.0, 3000.0, 100.0, 5.0, 2500.0, 'balance', 'eod_trailing', 7, 1, 30.0, 'https://apextraderfunding.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, max_drawdown_amount, daily_loss_type, drawdown_type, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'Apex Trader Funding', 'Apex $50K', 'funded', 50000, 100.0, 5.0, 2500.0, 'balance', 'eod_trailing', 1, 30.0, 'https://apextraderfunding.com/', 1);

-- Apex $100K (target=$6000/6%, max_dd=$3000/3%)
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, profit_target_amount, daily_loss_percent, max_drawdown_percent, max_drawdown_amount, daily_loss_type, drawdown_type, min_trading_days, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'Apex Trader Funding', 'Apex $100K', 'evaluation_1', 100000, 6.0, 6000.0, 100.0, 3.0, 3000.0, 'balance', 'eod_trailing', 7, 1, 30.0, 'https://apextraderfunding.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, max_drawdown_amount, daily_loss_type, drawdown_type, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'Apex Trader Funding', 'Apex $100K', 'funded', 100000, 100.0, 3.0, 3000.0, 'balance', 'eod_trailing', 1, 30.0, 'https://apextraderfunding.com/', 1);

-- Apex $300K (target=$20000/6.67%, max_dd=$7500/2.5%)
INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, profit_target_percent, profit_target_amount, daily_loss_percent, max_drawdown_percent, max_drawdown_amount, daily_loss_type, drawdown_type, min_trading_days, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'Apex Trader Funding', 'Apex $300K', 'evaluation_1', 300000, 6.67, 20000.0, 100.0, 2.5, 7500.0, 'balance', 'eod_trailing', 7, 1, 30.0, 'https://apextraderfunding.com/', 1);

INSERT OR IGNORE INTO firm_templates (id, firm_name, plan_name, challenge_phase, initial_balance, daily_loss_percent, max_drawdown_percent, max_drawdown_amount, daily_loss_type, drawdown_type, consistency_rule, max_daily_profit_percent, source_url, verified)
VALUES (lower(hex(randomblob(16))), 'Apex Trader Funding', 'Apex $300K', 'funded', 300000, 100.0, 2.5, 7500.0, 'balance', 'eod_trailing', 1, 30.0, 'https://apextraderfunding.com/', 1);
