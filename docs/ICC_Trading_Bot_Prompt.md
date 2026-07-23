# ICC Trading Bot — Complete Build Prompt

Use this prompt with Claude, GPT, or any AI code assistant to generate a production-grade MQL5 Expert Advisor.

---

## THE PROMPT

```
Build a production-grade MQL5 Expert Advisor called "TradeMetrics_ICC_Bot" that implements the Indication-Correction-Continuation (ICC) trading methodology across multiple timeframes. This bot must be institutional-quality, prop-firm safe, and handle both live and funded accounts seamlessly.

=== CORE ICC METHODOLOGY ===

The ICC method identifies trend continuation entries using 4 timeframes in a top-down approach:

1. BIAS (H4): Determine overall market direction
   - Bullish bias: Higher highs AND higher lows on H4
   - Bearish bias: Lower highs AND lower lows on H4
   - Identify using swing point analysis (minimum 3 swing points)
   - Confirm with 50 EMA slope direction on H4
   - NO TRADE if H4 is ranging (ADX < 20 on H4)

2. INDICATION (H1): Find the strong impulse move that confirms the H4 bias
   - Bullish indication: 3+ consecutive bullish candles OR a single candle > 2x ATR(14)
   - Bearish indication: 3+ consecutive bearish candles OR a single candle > 2x ATR(14)
   - The indication must move in the SAME direction as the H4 bias
   - Measure the indication range (high to low of the impulse move)
   - Store indication_high, indication_low, indication_range

3. CORRECTION (M15): Wait for the pullback/retracement against the indication
   - Valid correction: Price retraces 38.2% to 78.6% of the indication range (Fibonacci levels)
   - Correction must contain at least 3 candles (not a single spike)
   - Correction should show decreasing volume/momentum (RSI divergence or lower ATR)
   - The correction must NOT break the indication's origin (start of the impulse)
   - If correction exceeds 78.6% retracement → INVALIDATE the setup, do not trade
   - Optimal zone: 50% to 61.8% retracement (golden zone)

4. CONTINUATION (M5): Entry trigger — price resumes in the direction of the bias
   - Bullish continuation: A bullish engulfing, pin bar (hammer), or break of the correction's high on M5
   - Bearish continuation: A bearish engulfing, shooting star, or break of the correction's low on M5
   - Entry candle must close beyond the correction structure
   - Volume/momentum should increase on the continuation candle (ATR expanding)

=== ENTRY RULES ===

- Enter ONLY when ALL 4 timeframes align (bias + indication + correction + continuation)
- Place a market order at the CLOSE of the continuation candle on M5
- Maximum 1 trade per setup (no pyramiding into the same ICC sequence)
- Do NOT enter if spread > 2x average spread for the symbol
- Do NOT enter within 5 minutes before or 5 minutes after high-impact news events
- Do NOT enter if the daily candle has already moved > 80% of its ADR (Average Daily Range, 14-period)

=== STOP LOSS PLACEMENT ===

- Bullish trade: SL = correction_low - (ATR(14, M15) * 0.5) — below the correction with ATR buffer
- Bearish trade: SL = correction_high + (ATR(14, M15) * 0.5) — above the correction with ATR buffer
- Minimum SL distance: 10 pips (forex), 50 points (indices), $1.00 (gold)
- Maximum SL distance: 50 pips (forex), 200 points (indices), $5.00 (gold)
- If calculated SL exceeds maximum → SKIP the trade (risk too high)

=== TAKE PROFIT & TRADE MANAGEMENT ===

- TP1 = 1:1.5 R:R (close 50% of position)
- TP2 = 1:3 R:R (close remaining 30% of position)
- Trail remaining 20% using:
  - Move SL to breakeven after TP1 is hit
  - Trail SL behind each new M15 swing point (bullish: below swing low, bearish: above swing high)
  - Close trailing portion if price closes beyond the 50 EMA on M15 against the trade direction
- Maximum trade duration: 48 hours (close at market if still open)

=== BROKER GMT AUTO-DETECTION ===

Implement automatic GMT offset detection:

```mql5
int DetectGMTOffset()
{
   // Method 1: Compare broker time to known GMT reference
   MqlDateTime broker_time, gmt_time;
   TimeToStruct(TimeCurrent(), broker_time);
   TimeToStruct(TimeGMT(), gmt_time);
   int offset = broker_time.hour - gmt_time.hour;
   
   // Handle day boundary edge cases
   if(offset > 12) offset -= 24;
   if(offset < -12) offset += 24;
   
   // Method 2: Validate using known market events
   // NY market opens at 13:30 GMT (9:30 ET during EST)
   // If we detect high volume spike, cross-reference with expected GMT time
   
   return offset;
}
```

- Run GMT detection on EA initialization AND re-validate daily at 00:00 broker time
- Store the offset as a global variable
- Use the offset to convert all session times to broker time
- Log the detected offset: Print("GMT Offset detected: GMT+", offset)
- Allow manual override via input parameter: input int ManualGMTOffset = 99; // 99 = auto-detect

=== SESSION-AWARE TRADING ===

Only trade during high-volume market sessions. Convert these GMT times using the detected offset:

FOREX PAIRS:
- London session: 07:00-11:00 GMT (primary window)
- New York session: 12:00-16:00 GMT (primary window)  
- London-New York overlap: 12:00-15:00 GMT (BEST window — highest volume)
- NO trading during Asian session for major pairs (unless AUD, NZD, JPY pairs)
- NO trading on Friday after 16:00 GMT (weekend risk)
- NO trading on Monday before 01:00 GMT (low liquidity)

GOLD (XAUUSD):
- London: 07:00-11:00 GMT
- New York: 13:00-17:00 GMT
- Best window: 13:00-15:00 GMT (US data releases + London still open)

INDICES (NAS100, US30, US500):
- Pre-market: 12:00-13:30 GMT (setup identification only, no entries)
- Regular session: 13:30-20:00 GMT (entries allowed)
- Best window: 13:30-16:00 GMT (opening volatility)
- NO trading in last 15 minutes before close (20:00 GMT)

=== ASSET SELECTION & VOLUME DETECTION ===

Implement dynamic asset selection based on current volume:

```mql5
// Assets to monitor (ranked by typical volume)
string ForexPairs[] = {"EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD",
                        "EURGBP","EURJPY","GBPJPY","EURAUD","GBPAUD"};
string Metals[]     = {"XAUUSD","XAGUSD"};
string Indices[]    = {"NAS100","US30","US500","GER40","UK100"};

// Volume scoring function
double GetVolumeScore(string symbol)
{
   double current_volume = iVolume(symbol, PERIOD_M5, 0);
   double avg_volume = 0;
   for(int i = 1; i <= 20; i++) avg_volume += iVolume(symbol, PERIOD_M5, i);
   avg_volume /= 20.0;
   
   if(avg_volume == 0) return 0;
   return current_volume / avg_volume; // Ratio > 1.0 = above average volume
}
```

- Calculate volume score for all monitored assets every 5 minutes
- Only scan for ICC setups on assets with volume score > 1.2 (20% above average)
- During London session: prioritize EUR, GBP pairs and XAUUSD
- During New York session: prioritize USD pairs, indices, and XAUUSD
- During overlap: all major pairs + gold + indices eligible

=== PROP FIRM COMPLIANCE MODULE ===

Implement built-in prop firm safety:

INPUT PARAMETERS:
- input double MaxDailyDrawdownPct = 5.0;     // % of starting balance
- input double MaxTotalDrawdownPct = 10.0;     // % of starting balance  
- input double DailyProfitTarget = 0.0;        // 0 = no daily target
- input int    MaxDailyTrades = 5;             // Maximum trades per day
- input int    MaxConcurrentTrades = 2;        // Maximum simultaneous positions
- input double MaxLotSize = 1.0;              // Hard lot size cap
- input bool   PropFirmMode = true;           // Enable/disable prop compliance

COMPLIANCE CHECKS (run before EVERY trade):
1. Calculate today's P&L → if loss exceeds MaxDailyDrawdownPct → STOP trading for the day
2. Calculate total drawdown from peak balance → if exceeds MaxTotalDrawdownPct → STOP ALL trading
3. Count today's trades → if >= MaxDailyTrades → STOP for the day
4. Count open positions → if >= MaxConcurrentTrades → WAIT
5. If DailyProfitTarget > 0 and today's profit >= target → STOP (lock in profit)

EMERGENCY SHUTDOWN:
- If equity drops below (starting_balance * (1 - MaxTotalDrawdownPct/100)) → close ALL positions immediately
- Log: "EMERGENCY: Max drawdown threshold reached. All positions closed."
- Set a global flag to prevent any new trades until EA is manually reset
- Send push notification to mobile: "ICC Bot: Emergency shutdown triggered"

=== POSITION SIZING ===

Calculate lot size dynamically based on risk:

```mql5
input double RiskPercentPerTrade = 1.0; // Risk % of balance per trade

double CalculateLotSize(string symbol, double sl_distance_points)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double risk_amount = balance * (RiskPercentPerTrade / 100.0);
   
   double tick_value = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tick_size = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   
   if(tick_size == 0 || tick_value == 0) return 0;
   
   double value_per_point = tick_value / tick_size * point;
   double lot_size = risk_amount / (sl_distance_points * value_per_point);
   
   // Normalize to broker's lot step
   double lot_step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   double min_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double max_lot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   
   lot_size = MathFloor(lot_size / lot_step) * lot_step;
   lot_size = MathMax(lot_size, min_lot);
   lot_size = MathMin(lot_size, max_lot);
   lot_size = MathMin(lot_size, MaxLotSize); // Prop firm cap
   
   return NormalizeDouble(lot_size, 2);
}
```

=== ON-CHART DISPLAY (MARKET ANALYSIS PANEL) ===

Draw a real-time analysis panel on the chart showing:

PANEL LAYOUT (top-left corner, 350x500 pixels):
┌─────────────────────────────────────┐
│  TradeMetrics ICC Bot v1.0          │
│  ─────────────────────────────────  │
│  Symbol: EURUSD    Spread: 0.8      │
│  Session: London-NY Overlap ✓       │
│  Volume Score: 1.47 (HIGH)          │
│  GMT Offset: +2 (auto-detected)     │
│  ─────────────────────────────────  │
│  H4 BIAS:        ▲ BULLISH   ✓     │
│  H1 INDICATION:  ▲ CONFIRMED ✓     │
│    Range: 1.0845 - 1.0892 (47p)    │
│  M15 CORRECTION: ◄ RETRACING       │
│    Depth: 52.3% (Golden Zone) ✓    │
│  M5 CONTINUATION: ⏳ WAITING        │
│  ─────────────────────────────────  │
│  Setup Quality:  ████████░░ 82%     │
│  ─────────────────────────────────  │
│  PROP FIRM STATUS                   │
│  Daily P&L:    +$127.40  (1.3%)    │
│  Daily DD:     -$0.00    (0.0%)    │
│  Total DD:     -$230.00  (2.3%)    │
│  Trades Today: 2 / 5               │
│  Open Trades:  1 / 2               │
│  ─────────────────────────────────  │
│  Last Signal: BUY EURUSD 1.0871    │
│  SL: 1.0842  TP1: 1.0914  TP2: 1.0957 │
│  Lot: 0.15   Risk: 1.0%           │
│  Status: TP1 HIT ✓ (trailing)      │
└─────────────────────────────────────┘

- Update panel every tick
- Color code: Green for bullish/positive, Red for bearish/negative, Amber for waiting, Gray for inactive
- Flash/highlight when a new ICC setup is detected
- Show checkmarks (✓) when each ICC phase is confirmed

=== CHART MARKINGS ===

Draw ICC analysis directly on the chart:

1. H4 BIAS: Draw trend lines connecting swing highs and swing lows on H4
2. H1 INDICATION: Draw a colored rectangle (cyan with 15% opacity) over the indication range
3. M15 CORRECTION: Draw Fibonacci retracement levels from indication high to low
   - Highlight the 50-61.8% zone in amber (golden zone)
4. M5 CONTINUATION: Draw an arrow marker at the entry point
5. SL/TP: Draw horizontal lines for stop loss (red dashed) and take profit levels (green dashed)
6. Label each marking with the ICC phase name

=== ERROR HANDLING ===

Every order operation must use this pattern:

```mql5
bool PlaceOrder(string symbol, ENUM_ORDER_TYPE type, double lots, double price, double sl, double tp, string comment)
{
   MqlTradeRequest request = {};
   MqlTradeResult result = {};
   
   request.action = TRADE_ACTION_DEAL;
   request.symbol = symbol;
   request.volume = lots;
   request.type = type;
   request.price = price;
   request.sl = sl;
   request.tp = tp;
   request.deviation = 10; // 1 pip slippage tolerance
   request.magic = MagicNumber;
   request.comment = comment;
   request.type_filling = ORDER_FILLING_IOC; // Try IOC first
   
   // Attempt 1
   if(!OrderSend(request, result))
   {
      // Try FOK filling if IOC rejected
      request.type_filling = ORDER_FILLING_FOK;
      if(!OrderSend(request, result))
      {
         // Try RETURN filling
         request.type_filling = ORDER_FILLING_RETURN;
         if(!OrderSend(request, result))
         {
            PrintFormat("ORDER FAILED: %s | Error: %d | %s", symbol, result.retcode, result.comment);
            return false;
         }
      }
   }
   
   if(result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED)
   {
      PrintFormat("ORDER OK: %s %s %.2f lots @ %.5f | SL: %.5f | TP: %.5f | Ticket: %d",
                  symbol, EnumToString(type), lots, result.price, sl, tp, result.deal);
      return true;
   }
   
   PrintFormat("ORDER REJECTED: %s | Retcode: %d | %s", symbol, result.retcode, result.comment);
   return false;
}
```

- Log every order attempt, success, and failure with full details
- Implement retry logic: 3 attempts with 500ms delay between retries
- Handle requotes: accept if within 2 points of requested price
- Handle connection loss: store pending signals, execute on reconnection
- Validate all prices against current market before sending (no stale prices)

=== INPUT PARAMETERS (FULL LIST) ===

// === ICC Settings ===
input string   ICC_Settings = "=== ICC Analysis ===";
input int      H4_SwingLookback = 50;          // H4 bars to analyze for swing points
input int      H1_IndicationMinCandles = 3;     // Minimum candles for indication
input double   H1_IndicationATRMultiple = 2.0;  // Single candle indication threshold
input double   CorrectionMinFib = 38.2;         // Minimum correction depth %
input double   CorrectionMaxFib = 78.6;         // Maximum correction depth %
input int      CorrectionMinCandles = 3;         // Minimum correction candles
input ENUM_TIMEFRAMES BiasTimeframe = PERIOD_H4;
input ENUM_TIMEFRAMES IndicationTimeframe = PERIOD_H1;
input ENUM_TIMEFRAMES CorrectionTimeframe = PERIOD_M15;
input ENUM_TIMEFRAMES EntryTimeframe = PERIOD_M5;

// === Risk Management ===
input string   Risk_Settings = "=== Risk Management ===";
input double   RiskPercentPerTrade = 1.0;       // Risk per trade (%)
input double   MaxLotSize = 1.0;                // Maximum lot size
input int      MaxTradeHoldHours = 48;          // Close trade after X hours

// === Prop Firm Compliance ===
input string   Prop_Settings = "=== Prop Firm ===";
input bool     PropFirmMode = true;             // Enable prop firm safety
input double   MaxDailyDrawdownPct = 5.0;       // Max daily drawdown %
input double   MaxTotalDrawdownPct = 10.0;      // Max total drawdown %
input int      MaxDailyTrades = 5;              // Max trades per day
input int      MaxConcurrentTrades = 2;         // Max open positions
input double   DailyProfitTarget = 0.0;         // Daily target (0=disabled)

// === Session & GMT ===
input string   Session_Settings = "=== Sessions ===";
input int      ManualGMTOffset = 99;            // 99 = auto-detect
input bool     TradeLondon = true;              // Trade London session
input bool     TradeNewYork = true;             // Trade New York session
input bool     TradeOverlapOnly = false;         // Only trade LDN-NY overlap

// === Asset Selection ===
input string   Asset_Settings = "=== Assets ===";
input bool     TradeForex = true;
input bool     TradeGold = true;
input bool     TradeIndices = true;
input double   MinVolumeScore = 1.2;            // Minimum volume ratio

// === Trade Management ===
input string   Trade_Settings = "=== Trade Management ===";
input double   TP1_RR = 1.5;                    // TP1 reward:risk ratio
input double   TP2_RR = 3.0;                    // TP2 reward:risk ratio
input int      TP1_ClosePercent = 50;            // % to close at TP1
input int      TP2_ClosePercent = 30;            // % to close at TP2
input bool     TrailAfterTP1 = true;             // Trail after TP1

// === Display ===
input string   Display_Settings = "=== Display ===";
input bool     ShowPanel = true;                 // Show analysis panel
input bool     ShowChartMarkings = true;         // Draw ICC zones on chart
input bool     SendPushNotifications = true;      // Mobile push alerts
input int      MagicNumber = 20260412;           // Unique EA identifier

=== LOGGING ===

Implement comprehensive logging:
- Log file: "TradeMetrics_ICC_Bot_YYYY-MM-DD.log" in Files folder
- Log every ICC phase detection with timestamp and values
- Log every order with full parameters
- Log every prop firm compliance check
- Log session opens/closes
- Log GMT offset detection results
- Log volume score calculations
- Daily summary at end of each trading day:
  "DAILY SUMMARY: Trades=3, Wins=2, Losses=1, P&L=$85.40, MaxDD=-$42.00, WinRate=66.7%"

=== ADDITIONAL REQUIREMENTS ===

1. Use CTrade class for order management (include Trade/Trade.mqh)
2. Use proper MQL5 event handlers: OnInit(), OnDeinit(), OnTick(), OnTimer()
3. Set EventSetTimer(1) for panel updates independent of ticks
4. Handle multi-symbol: attach to one chart (e.g., EURUSD) but scan ALL configured symbols
5. Use iCustom() sparingly — prefer native indicator handles (iMA, iATR, iRSI, iADX, iVolumes)
6. Pre-cache all indicator handles in OnInit() — never create handles in OnTick()
7. Normalize all prices with NormalizeDouble(price, _Digits)
8. All string parameters for symbol names must handle broker suffixes (e.g., "EURUSD.raw", "EURUSDm")
   - Implement: string CleanSymbol(string sym) to strip suffixes for comparison
9. The EA must compile with ZERO warnings and ZERO errors
10. Comment every function with its purpose
11. Use #property strict equivalent practices (explicit typing, no implicit conversions)
12. Magic number must be checked on ALL position operations to avoid interfering with manual trades

=== FILE STRUCTURE ===

Generate as a single .mq5 file with clear section comments:
// ========== SECTION: Includes & Defines ==========
// ========== SECTION: Input Parameters ==========
// ========== SECTION: Global Variables ==========
// ========== SECTION: GMT Detection ==========
// ========== SECTION: Session Management ==========
// ========== SECTION: Volume Analysis ==========
// ========== SECTION: ICC Analysis Engine ==========
// ========== SECTION: Entry Logic ==========
// ========== SECTION: Trade Management ==========
// ========== SECTION: Position Sizing ==========
// ========== SECTION: Prop Firm Compliance ==========
// ========== SECTION: Chart Display ==========
// ========== SECTION: Order Execution ==========
// ========== SECTION: Logging ==========
// ========== SECTION: Event Handlers ==========
```

---

## IMPORTANT DISCLAIMERS

- No trading bot guarantees profits. This bot implements a methodology — the edge comes from disciplined execution, not prediction certainty.
- Always backtest extensively across multiple market conditions before live trading.
- Always start with a demo account, then a small live account, before deploying on funded accounts.
- Past performance does not guarantee future results.
- The prop firm compliance module reduces risk but cannot eliminate it entirely.
- Market conditions change — regularly review and adjust parameters.
