import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, 'templates');

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

const integrationBlock = readFileSync(join(TEMPLATES_DIR, 'integration-block.mq5'), 'utf-8');

// ── Common parameters shared by ALL strategies ──────────────────

const COMMON_PARAMS = [
  {"key":"LOT_SIZE","label":"Lot Size","type":"double","default":0.1,"min":0.01,"max":10.0,"step":0.01,"tooltip":"Trade volume in lots."},
  {"key":"SL_PIPS","label":"Stop Loss (pips)","type":"int","default":50,"min":5,"max":500,"step":5,"tooltip":"Stop loss distance in pips."},
  {"key":"TP_PIPS","label":"Take Profit (pips)","type":"int","default":100,"min":5,"max":1000,"step":5,"tooltip":"Take profit distance in pips."},
  {"key":"MAX_SPREAD","label":"Max Spread (points)","type":"int","default":30,"min":5,"max":100,"step":5,"tooltip":"Block entry if spread exceeds this."},
  {"key":"MAX_DAILY_LOSS","label":"Max Daily Loss %","type":"double","default":5.0,"min":1.0,"max":20.0,"step":0.5,"tooltip":"Stop trading after this % loss."},
  {"key":"CONSEC_LOSS_LIMIT","label":"Consecutive Loss Limit","type":"int","default":3,"min":1,"max":10,"step":1,"tooltip":"Pause after this many consecutive losses."},
  {"key":"BE_TRIGGER_RR","label":"Breakeven at R:R","type":"double","default":1.0,"min":0.0,"max":3.0,"step":0.1,"tooltip":"Move SL to breakeven at this R:R. 0 = disabled."},
  {"key":"TRAILING_STOP","label":"Trailing Stop (pips)","type":"int","default":0,"min":0,"max":200,"step":5,"tooltip":"Trailing stop distance. 0 = disabled."},
  {"key":"USE_SESSION_FILTER","label":"Session Filter","type":"bool","default":false,"tooltip":"Restrict trading to specific hours."},
  {"key":"SESSION_START","label":"Session Start (UTC)","type":"int","default":7,"min":0,"max":23,"step":1,"tooltip":"Trading starts at this hour."},
  {"key":"SESSION_END","label":"Session End (UTC)","type":"int","default":20,"min":0,"max":23,"step":1,"tooltip":"Trading stops at this hour."},
];

// ── Strategy definitions ────────────────────────────────────────

const strategies = [
  {
    id: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    name: 'MA Crossover',
    slug: 'ma-crossover',
    description: 'Classic trend-following strategy. Buys when fast moving average crosses above slow moving average, sells on cross below. Simple, reliable, and effective in trending markets.',
    category: 'trend',
    difficulty: 'beginner',
    recommended_pairs: 'EURUSD,GBPUSD,USDJPY',
    recommended_timeframe: 'H1',
    template_file: 'ma-crossover.mq5',
    unique_params: [
      {"key":"FAST_MA_PERIOD","label":"Fast MA Period","type":"int","default":10,"min":5,"max":50,"step":1,"tooltip":"Period for the fast moving average."},
      {"key":"SLOW_MA_PERIOD","label":"Slow MA Period","type":"int","default":50,"min":20,"max":200,"step":5,"tooltip":"Period for the slow moving average."},
      {"key":"MA_METHOD","label":"MA Type","type":"enum","options":["MODE_SMA","MODE_EMA","MODE_SMMA","MODE_LWMA"],"labels":["SMA","EMA","SMMA","LWMA"],"default":"MODE_EMA","tooltip":"Moving average calculation method."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M15","PERIOD_H1","PERIOD_H4","PERIOD_D1"],"labels":["M15","H1","H4","D1"],"default":"PERIOD_H1","tooltip":"Chart timeframe."},
    ],
  },
  {
    id: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    name: 'RSI Mean Reversion',
    slug: 'rsi-mean-reversion',
    description: 'Fades market extremes using RSI. Buys when RSI drops below oversold, sells when above overbought. Exits at the mean (RSI 50). Works best in ranging markets.',
    category: 'reversal',
    difficulty: 'beginner',
    recommended_pairs: 'EURUSD,GBPJPY,AUDUSD',
    recommended_timeframe: 'H1',
    template_file: 'rsi-mean-reversion.mq5',
    unique_params: [
      {"key":"RSI_PERIOD","label":"RSI Period","type":"int","default":14,"min":5,"max":50,"step":1,"tooltip":"Number of bars for RSI calculation."},
      {"key":"RSI_OVERBOUGHT","label":"Overbought Level","type":"int","default":70,"min":60,"max":90,"step":1,"tooltip":"RSI level to trigger sell signals."},
      {"key":"RSI_OVERSOLD","label":"Oversold Level","type":"int","default":30,"min":10,"max":40,"step":1,"tooltip":"RSI level to trigger buy signals."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M15","PERIOD_H1","PERIOD_H4","PERIOD_D1"],"labels":["M15","H1","H4","D1"],"default":"PERIOD_H1","tooltip":"Chart timeframe."},
    ],
  },
  {
    id: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    name: 'Breakout + Retest',
    slug: 'breakout-retest',
    description: 'Detects price ranges and trades the breakout with candle confirmation. Filters false breakouts by requiring multiple closes beyond the level. Best in volatile markets.',
    category: 'breakout',
    difficulty: 'intermediate',
    recommended_pairs: 'GBPUSD,XAUUSD,USDJPY',
    recommended_timeframe: 'H1',
    template_file: 'breakout-retest.mq5',
    unique_params: [
      {"key":"LOOKBACK_BARS","label":"Range Lookback Bars","type":"int","default":20,"min":10,"max":100,"step":5,"tooltip":"Number of bars to calculate the range."},
      {"key":"BREAKOUT_BUFFER_PIPS","label":"Breakout Buffer (pips)","type":"int","default":5,"min":0,"max":20,"step":1,"tooltip":"Extra distance beyond range for confirmation."},
      {"key":"CONFIRMATION_CANDLES","label":"Confirmation Candles","type":"int","default":1,"min":1,"max":3,"step":1,"tooltip":"Candles that must close beyond breakout level."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M15","PERIOD_H1","PERIOD_H4","PERIOD_D1"],"labels":["M15","H1","H4","D1"],"default":"PERIOD_H1","tooltip":"Chart timeframe."},
    ],
  },
  {
    id: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
    name: 'London Session Scalper',
    slug: 'london-session-scalper',
    description: 'Scalps during the London session using EMA direction and RSI momentum. Only trades within configurable session hours. Closes all positions at session end.',
    category: 'scalp',
    difficulty: 'intermediate',
    recommended_pairs: 'EURUSD,GBPUSD,EURGBP',
    recommended_timeframe: 'M15',
    template_file: 'london-session-scalper.mq5',
    unique_params: [
      {"key":"SCALP_SESSION_START","label":"Session Start (UTC)","type":"int","default":7,"min":5,"max":9,"step":1,"tooltip":"Hour to start scalping."},
      {"key":"SCALP_SESSION_END","label":"Session End (UTC)","type":"int","default":16,"min":14,"max":18,"step":1,"tooltip":"Hour to stop and close all."},
      {"key":"EMA_PERIOD","label":"EMA Period","type":"int","default":20,"min":10,"max":50,"step":1,"tooltip":"EMA period for trend direction."},
      {"key":"RSI_FILTER_PERIOD","label":"RSI Filter Period","type":"int","default":14,"min":7,"max":21,"step":1,"tooltip":"RSI period for momentum filter."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M5","PERIOD_M15"],"labels":["M5","M15"],"default":"PERIOD_M15","tooltip":"Scalping timeframe."},
    ],
  },
  {
    id: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    name: 'Multi-Timeframe Trend',
    slug: 'multi-tf-trend',
    description: 'Uses higher timeframe EMA for trend direction and lower timeframe Stochastic for pullback entries. Combines trend following with precise entry timing.',
    category: 'swing',
    difficulty: 'advanced',
    recommended_pairs: 'EURUSD,GBPUSD,AUDUSD,XAUUSD',
    recommended_timeframe: 'H1 entry / H4 trend',
    template_file: 'multi-tf-trend.mq5',
    unique_params: [
      {"key":"HIGHER_TF","label":"Trend Timeframe","type":"enum","options":["PERIOD_H4","PERIOD_D1"],"labels":["H4","D1"],"default":"PERIOD_H4","tooltip":"Higher timeframe for trend detection."},
      {"key":"LOWER_TF","label":"Entry Timeframe","type":"enum","options":["PERIOD_M15","PERIOD_H1"],"labels":["M15","H1"],"default":"PERIOD_H1","tooltip":"Lower timeframe for trade entry."},
      {"key":"TREND_EMA_PERIOD","label":"Trend EMA Period","type":"int","default":50,"min":20,"max":200,"step":10,"tooltip":"EMA period on higher timeframe."},
      {"key":"STOCH_K","label":"Stochastic %K","type":"int","default":14,"min":5,"max":21,"step":1,"tooltip":"Stochastic %K period."},
      {"key":"STOCH_D","label":"Stochastic %D","type":"int","default":3,"min":3,"max":7,"step":1,"tooltip":"Stochastic %D smoothing."},
      {"key":"STOCH_SLOWING","label":"Stochastic Slowing","type":"int","default":3,"min":3,"max":7,"step":1,"tooltip":"Stochastic slowing factor."},
    ],
  },
  {
    id: 'f1f2f3f4f5f6f7f8f9f0f1f2f3f4f5f6',
    name: 'Asian Range Breakout',
    slug: 'asian-range-breakout',
    description: 'Marks the Asian session high and low, then trades the breakout when London opens. One trade per day per direction with SL at the opposite range boundary. Simple, time-based strategy ideal for beginners.',
    category: 'breakout',
    difficulty: 'beginner',
    recommended_pairs: 'GBPUSD,EURJPY,GBPJPY',
    recommended_timeframe: 'M15',
    template_file: 'asian-range-breakout.mq5',
    unique_params: [
      {"key":"ASIAN_START","label":"Asian Start (UTC)","type":"int","default":0,"min":0,"max":6,"step":1,"tooltip":"Hour the Asian range tracking begins."},
      {"key":"ASIAN_END","label":"Asian End (UTC)","type":"int","default":6,"min":4,"max":10,"step":1,"tooltip":"Hour the Asian range tracking ends."},
      {"key":"BREAKOUT_BUFFER","label":"Breakout Buffer (pips)","type":"int","default":3,"min":0,"max":20,"step":1,"tooltip":"Extra pips beyond range for breakout confirmation."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M5","PERIOD_M15","PERIOD_H1"],"labels":["M5","M15","H1"],"default":"PERIOD_M15","tooltip":"Chart timeframe."},
    ],
  },
  {
    id: 'a2a3a4a5a6a7a8a9a0a1a2a3a4a5a6a7',
    name: 'Supply & Demand Zones',
    slug: 'supply-demand-zones',
    description: 'Detects supply and demand zones from strong impulse candles, then trades retests. Zones are invalidated when price breaks through. Up to 3 active zones per direction with 2:1 risk-reward targeting.',
    category: 'reversal',
    difficulty: 'advanced',
    recommended_pairs: 'EURUSD,GBPUSD,XAUUSD',
    recommended_timeframe: 'H1',
    template_file: 'supply-demand-zones.mq5',
    unique_params: [
      {"key":"ZONE_LOOKBACK","label":"Zone Lookback","type":"int","default":50,"min":10,"max":200,"step":10,"tooltip":"Number of bars to scan for impulse candles."},
      {"key":"MIN_ZONE_STRENGTH","label":"Min Body/Wick Ratio","type":"double","default":2.0,"min":1.0,"max":5.0,"step":0.5,"tooltip":"Minimum body-to-wick ratio for impulse detection."},
      {"key":"RETEST_TOLERANCE","label":"Retest Tolerance (pips)","type":"int","default":10,"min":1,"max":30,"step":1,"tooltip":"How close price must get to zone for a valid retest."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M15","PERIOD_H1","PERIOD_H4","PERIOD_D1"],"labels":["M15","H1","H4","D1"],"default":"PERIOD_H1","tooltip":"Chart timeframe."},
    ],
  },
  {
    id: 'b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7b8',
    name: 'Bollinger Band Squeeze',
    slug: 'bollinger-squeeze',
    description: 'Detects Bollinger Band squeeze (low volatility) and trades the expansion. Confirms direction with RSI. One trade per squeeze event — waits for the next squeeze before trading again.',
    category: 'breakout',
    difficulty: 'intermediate',
    recommended_pairs: 'XAUUSD,GBPUSD,EURUSD',
    recommended_timeframe: 'H1',
    template_file: 'bollinger-squeeze.mq5',
    unique_params: [
      {"key":"BB_PERIOD","label":"Bollinger Period","type":"int","default":20,"min":10,"max":50,"step":1,"tooltip":"Period for Bollinger Bands calculation."},
      {"key":"BB_DEVIATION","label":"Bollinger Deviation","type":"double","default":2.0,"min":1.0,"max":3.0,"step":0.5,"tooltip":"Standard deviation multiplier."},
      {"key":"SQUEEZE_THRESHOLD","label":"Squeeze Threshold %","type":"double","default":1.0,"min":0.3,"max":3.0,"step":0.1,"tooltip":"Bandwidth below this % signals a squeeze."},
      {"key":"RSI_CONFIRM","label":"RSI Period","type":"int","default":14,"min":5,"max":30,"step":1,"tooltip":"RSI period for direction confirmation."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M15","PERIOD_H1","PERIOD_H4","PERIOD_D1"],"labels":["M15","H1","H4","D1"],"default":"PERIOD_H1","tooltip":"Chart timeframe."},
    ],
  },
  {
    id: 'c4c5c6c7c8c9c0c1c2c3c4c5c6c7c8c9',
    name: 'Grid Recovery',
    slug: 'grid-recovery',
    description: 'Grid trading with configurable spacing, levels, and lot multiplier. Uses EMA for initial direction, adds recovery levels when price moves against. Closes all positions at grid take-profit. Hard safety limits prevent runaway grids.',
    category: 'swing',
    difficulty: 'advanced',
    recommended_pairs: 'EURUSD,USDJPY,AUDUSD',
    recommended_timeframe: 'H1',
    template_file: 'grid-recovery.mq5',
    unique_params: [
      {"key":"GRID_SPACING","label":"Grid Spacing (pips)","type":"int","default":20,"min":5,"max":100,"step":5,"tooltip":"Distance between grid levels in pips."},
      {"key":"MAX_GRID_LEVELS","label":"Max Grid Levels","type":"int","default":5,"min":2,"max":10,"step":1,"tooltip":"Maximum number of grid positions."},
      {"key":"LOT_MULTIPLIER","label":"Lot Multiplier","type":"double","default":1.5,"min":1.0,"max":3.0,"step":0.1,"tooltip":"Lot size multiplier for each new level."},
      {"key":"TP_GRID","label":"Grid TP (pips)","type":"int","default":15,"min":5,"max":50,"step":5,"tooltip":"Take profit distance from average entry."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M15","PERIOD_H1","PERIOD_H4"],"labels":["M15","H1","H4"],"default":"PERIOD_H1","tooltip":"Chart timeframe."},
    ],
  },
  {
    id: 'd5d6d7d8d9d0d1d2d3d4d5d6d7d8d9d0',
    name: 'News Spike Trader',
    slug: 'news-spike-trader',
    description: 'Detects volatility spikes using ATR and trades in the spike direction. Tight SL at half the spike candle with wide trailing stop. 3-bar cooldown between entries prevents overtrading during extended volatility.',
    category: 'scalp',
    difficulty: 'intermediate',
    recommended_pairs: 'XAUUSD,GBPUSD,EURUSD',
    recommended_timeframe: 'M5',
    template_file: 'news-spike-trader.mq5',
    unique_params: [
      {"key":"ATR_PERIOD","label":"ATR Period","type":"int","default":14,"min":5,"max":30,"step":1,"tooltip":"Period for ATR calculation."},
      {"key":"ATR_MULTIPLIER","label":"Spike Threshold (x ATR)","type":"double","default":2.0,"min":1.5,"max":4.0,"step":0.5,"tooltip":"Bar range must exceed this multiple of ATR."},
      {"key":"SPIKE_TRAIL","label":"Trailing Stop (pips)","type":"int","default":20,"min":5,"max":50,"step":5,"tooltip":"Trailing stop distance after spike entry."},
      {"key":"TIMEFRAME","label":"Timeframe","type":"enum","options":["PERIOD_M1","PERIOD_M5","PERIOD_M15"],"labels":["M1","M5","M15"],"default":"PERIOD_M5","tooltip":"Chart timeframe."},
    ],
  },
];

// ── Build SQL ───────────────────────────────────────────────────

const sqlStatements: string[] = [
  '-- Seed strategies for Strategy Hub',
  '-- Generated by seed-strategies.ts',
  '',
];

for (const s of strategies) {
  const templateBody = readFileSync(join(TEMPLATES_DIR, s.template_file), 'utf-8');
  const allParams = [...s.unique_params, ...COMMON_PARAMS];
  const paramsJson = JSON.stringify(allParams);

  sqlStatements.push(`INSERT OR REPLACE INTO strategy_templates (id, name, slug, description, category, difficulty, recommended_pairs, recommended_timeframe, parameters_json, template_body, integration_block, is_published)
VALUES (
  '${s.id}',
  '${escapeSql(s.name)}',
  '${escapeSql(s.slug)}',
  '${escapeSql(s.description)}',
  '${escapeSql(s.category)}',
  '${escapeSql(s.difficulty)}',
  '${escapeSql(s.recommended_pairs)}',
  '${escapeSql(s.recommended_timeframe)}',
  '${escapeSql(paramsJson)}',
  '${escapeSql(templateBody)}',
  '${escapeSql(integrationBlock)}',
  true
);
`);
}

const outputPath = join(__dirname, '..', '..', '..', 'migrations', '0014_seed_strategies.sql');
writeFileSync(outputPath, sqlStatements.join('\n'), 'utf-8');

console.log(`Wrote ${strategies.length} strategies to ${outputPath}`);
