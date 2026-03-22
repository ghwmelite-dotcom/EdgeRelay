//+------------------------------------------------------------------+
//|                                        EdgeRelay_Follower.mq5    |
//|                     EdgeRelay - Trade Signal Receiver & Executor  |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property version   "1.00"
#property description "EdgeRelay Follower EA - Receives and executes copied trades from a master account."
#property strict

#include <Trade\Trade.mqh>
#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_JsonParser.mqh>
#include <EdgeRelay_Http.mqh>
#include <EdgeRelay_Equity.mqh>
#include <EdgeRelay_PropGuard.mqh>
#include <EdgeRelay_PropGuardDisplay.mqh>

//+------------------------------------------------------------------+
//| Lot sizing mode                                                   |
//+------------------------------------------------------------------+
enum ENUM_LOT_MODE
  {
   LOT_MIRROR       = 0,  // Mirror master lot size exactly
   LOT_FIXED        = 1,  // Use fixed lot size
   LOT_MULTIPLIER   = 2,  // Multiply master lot by factor
   LOT_RISK_PERCENT = 3   // Risk % of balance per trade
  };

//+------------------------------------------------------------------+
//| Input parameters                                                  |
//+------------------------------------------------------------------+
input string   API_Key              = "";                             // API Key
input string   API_Secret           = "";                             // API Secret (HMAC)
input string   API_Endpoint         = "https://signal.edgerelay.io";  // API Endpoint
input string   AccountID            = "";                             // This follower account ID
input string   MasterAccountID      = "";                             // Master account to follow
input ENUM_LOT_MODE LotMode         = LOT_MIRROR;                    // Lot sizing mode
input double   LotValue             = 1.0;                            // Lot value (fixed/multiplier/risk%)
input double   MaxDailyLossPercent  = 5.0;                            // Max daily loss (% of equity)
input double   MaxTotalDrawdownPercent = 10.0;                        // Max total drawdown (% of equity)
input bool     RespectNewsFilter    = true;                           // Respect news filter
input int      MaxSlippagePoints    = 30;                             // Max slippage in points
input bool     AutoReconnect        = true;                           // Auto-reconnect on failure
input string   SymbolSuffix         = "";                             // Symbol suffix (e.g. ".m")
input int      PollIntervalMs       = 500;                            // Poll interval (ms)
input bool     CopyBuys             = true;                           // Copy BUY orders
input bool     CopySells            = true;                           // Copy SELL orders
input bool     CopyPendings         = true;                           // Copy pending orders
input bool     InvertDirection      = false;                          // Invert trade direction

//--- PropGuard Settings
input bool     PropGuard_Enabled       = true;                        // Enable PropGuard protection
input bool     PropGuard_UseCloudRules = true;                         // Fetch rules from dashboard
input string   PropGuard_Preset        = "Custom";                     // Preset name
input double   PropGuard_InitialBalance = 0;                           // 0 = auto-detect
input double   PropGuard_MaxDailyLoss  = 5.0;                          // % max daily loss
input double   PropGuard_MaxDrawdown   = 10.0;                          // % max total drawdown
input double   PropGuard_ProfitTarget  = 10.0;                          // % profit target
input ENUM_DD_TYPE PropGuard_DDType    = DD_STATIC;                    // Drawdown type
input double   PropGuard_MaxLotSize    = 100.0;                        // Max lot size
input int      PropGuard_MaxPositions  = 50;                           // Max open positions
input int      PropGuard_MaxDailyTrades = 0;                            // 0 = unlimited
input bool     PropGuard_BlockNews     = false;                        // Block during news
input int      PropGuard_NewsMinBefore = 5;                            // Minutes before news
input int      PropGuard_NewsMinAfter  = 5;                            // Minutes after news
input bool     PropGuard_BlockWeekend  = false;                        // Block weekend holding
input double   PropGuard_WarnThreshold = 80.0;                         // Warning threshold %
input double   PropGuard_CritThreshold = 95.0;                         // Critical threshold %
input bool     PropGuard_AutoClose     = true;                         // Auto-close at critical
input bool     PropGuard_ShowPanel     = true;                         // Show PropGuard panel
input int      PropGuard_PanelX        = 10;                           // Panel X position
input int      PropGuard_PanelY        = 30;                           // Panel Y position

//+------------------------------------------------------------------+
//| Execution result structure                                        |
//+------------------------------------------------------------------+
struct ExecutionResult
  {
   string            signal_id;
   bool              success;
   ulong             ticket;
   double            executed_price;
   double            executed_volume;
   int               slippage;
   string            error_message;
   uint              retcode;
  };

//+------------------------------------------------------------------+
//| Equity guard result                                               |
//+------------------------------------------------------------------+
struct EquityGuardResult
  {
   bool              allowed;
   string            reason;
  };

//+------------------------------------------------------------------+
//| Constants                                                         |
//+------------------------------------------------------------------+
#define MAX_SIGNALS_PER_POLL  50
#define HTTP_TIMEOUT          5000
#define COMMENT_PREFIX        "ER:"

//+------------------------------------------------------------------+
//| Global state                                                      |
//+------------------------------------------------------------------+
double   g_startingEquityToday   = 0.0;
double   g_startingEquityTotal   = 0.0;
datetime g_lastDayReset          = 0;
int      g_signalsProcessed      = 0;
int      g_signalsFailed         = 0;
int      g_consecutiveErrors     = 0;
ENUM_CONNECTION_STATUS g_connStatus = STATUS_DISCONNECTED;

CTrade   g_trade;

//--- PropGuard globals
CEquityTracker    g_equityTracker;
CPropGuard        g_propGuard;
CPropGuardDisplay g_pgDisplay;
bool              g_propGuardReady = false;

//+------------------------------------------------------------------+
//| Expert initialization                                             |
//+------------------------------------------------------------------+
int OnInit()
  {
   //--- Validate required inputs
   if(API_Key == "")
     {
      Print("[EdgeRelay] ERROR: API_Key is required.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(AccountID == "")
     {
      Print("[EdgeRelay] ERROR: AccountID is required.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(MasterAccountID == "")
     {
      Print("[EdgeRelay] ERROR: MasterAccountID is required.");
      return INIT_PARAMETERS_INCORRECT;
     }

   //--- Configure trade object
   g_trade.SetExpertMagicNumber(0);
   g_trade.SetDeviationInPoints(MaxSlippagePoints);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);
   g_trade.SetAsyncMode(false);

   //--- Record starting equity
   g_startingEquityToday  = AccountInfoDouble(ACCOUNT_EQUITY);
   g_startingEquityTotal  = g_startingEquityToday;
   g_lastDayReset         = TimeCurrent();
   g_signalsProcessed     = 0;
   g_signalsFailed        = 0;
   g_consecutiveErrors    = 0;
   g_connStatus           = STATUS_CONNECTING;

   //--- Initialize display panel
   InitDisplayPanel();

   //--- Set poll timer
   if(!EventSetMillisecondTimer(PollIntervalMs))
     {
      Print("[EdgeRelay] ERROR: Failed to set timer. Interval=", PollIntervalMs);
      return INIT_FAILED;
     }

   Print("[EdgeRelay] Follower EA initialized. Account=", AccountID,
         " Master=", MasterAccountID, " Endpoint=", API_Endpoint);
   Print("[EdgeRelay] LotMode=", EnumToString(LotMode),
         " LotValue=", DoubleToString(LotValue, 2),
         " PollMs=", PollIntervalMs);

   //--- Initialize PropGuard
   if(PropGuard_Enabled)
     {
      PropGuardRules pgRules;
      pgRules.initial_balance = (PropGuard_InitialBalance > 0)
                                 ? PropGuard_InitialBalance
                                 : AccountInfoDouble(ACCOUNT_BALANCE);
      pgRules.profit_target_percent = PropGuard_ProfitTarget;
      pgRules.max_daily_loss_percent = PropGuard_MaxDailyLoss;
      pgRules.daily_loss_calculation = DL_BALANCE_START_OF_DAY;
      pgRules.max_total_drawdown_percent = PropGuard_MaxDrawdown;
      pgRules.drawdown_type = PropGuard_DDType;
      pgRules.trailing_dd_lock_at_breakeven = false;
      pgRules.max_lot_size = PropGuard_MaxLotSize;
      pgRules.max_open_positions = PropGuard_MaxPositions;
      pgRules.max_daily_trades = PropGuard_MaxDailyTrades;
      pgRules.min_trading_days = 0;
      pgRules.consistency_rule_enabled = false;
      pgRules.max_profit_single_day_pct = 30.0;
      pgRules.allowed_trading_start = "00:00";
      pgRules.allowed_trading_end = "23:59";
      pgRules.block_weekend_holding = PropGuard_BlockWeekend;
      pgRules.block_during_news = PropGuard_BlockNews;
      pgRules.news_minutes_before = PropGuard_NewsMinBefore;
      pgRules.news_minutes_after = PropGuard_NewsMinAfter;
      pgRules.warning_threshold_pct = PropGuard_WarnThreshold;
      pgRules.critical_threshold_pct = PropGuard_CritThreshold;
      pgRules.auto_close_at_critical = PropGuard_AutoClose;

      g_equityTracker.Init(pgRules);
      g_propGuard.Init(pgRules, GetPointer(g_equityTracker));
      g_propGuardReady = true;

      if(PropGuard_ShowPanel)
         g_pgDisplay.Init(PropGuard_PanelX, PropGuard_PanelY, C'26,26,46');

      if(PropGuard_UseCloudRules)
        {
         string rulesResponse;
         int rc = FetchPropGuardRules(API_Endpoint, API_Key, AccountID, rulesResponse);
         if(rc == 200 && StringLen(rulesResponse) > 5)
            Print("[PropGuard] Cloud rules fetched successfully.");
         else
            Print("[PropGuard] Using local fallback rules.");
        }

      Print("[PropGuard] Initialized. Preset=", PropGuard_Preset);
     }

   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| Expert deinitialization                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   if(PropGuard_ShowPanel)
      g_pgDisplay.Deinit();
   EventKillTimer();
   CleanupDisplayPanel();
   Print("[EdgeRelay] Follower EA shutdown. Reason=", reason,
         " Processed=", g_signalsProcessed, " Failed=", g_signalsFailed);
  }

//+------------------------------------------------------------------+
//| Timer event - main poll loop                                      |
//+------------------------------------------------------------------+
void OnTimer()
  {
   //--- Reset daily equity at day boundary
   MqlDateTime dt;
   TimeCurrent(dt);
   MqlDateTime dtLast;
   TimeToStruct(g_lastDayReset, dtLast);
   if(dt.day != dtLast.day)
     {
      g_startingEquityToday = AccountInfoDouble(ACCOUNT_EQUITY);
      g_lastDayReset = TimeCurrent();
      Print("[EdgeRelay] Daily equity reset: ", DoubleToString(g_startingEquityToday, 2));
     }

   //--- Update PropGuard equity state
   if(g_propGuardReady)
     {
      g_equityTracker.Update();

      //--- Check for critical threshold — emergency close
      ENUM_PROPGUARD_STATUS pgStatus = g_equityTracker.GetStatus();
      if(pgStatus == PG_CRITICAL && PropGuard_AutoClose && !g_propGuard.IsLocked())
        {
         string reason = "Critical threshold breached. DD=" +
            DoubleToString(g_equityTracker.GetTotalDrawdownPercent(), 2) + "%";
         int closed = g_propGuard.EmergencyCloseAll(reason);

         PostEmergencyClose(API_Endpoint, API_Key, AccountID, reason,
                            AccountInfoDouble(ACCOUNT_EQUITY), closed);

         PlaySound("alert2.wav");
         Alert("[PropGuard] EMERGENCY CLOSE: ", reason);
        }

      //--- Cloud sync every 30 seconds
      if(g_equityTracker.ShouldSync())
        {
         string eqJson = g_equityTracker.ToJson();
         SyncEquityToCloud(API_Endpoint, API_Key, AccountID, eqJson);
        }

      //--- Refresh news cache if needed
      if(g_propGuard.ShouldRefreshNews())
        {
         string newsResponse;
         int rc = FetchNewsEvents(API_Endpoint, API_Key, "USD,EUR,GBP,JPY,CHF,AUD,NZD,CAD", newsResponse);
         if(rc == 200 && StringLen(newsResponse) > 5)
            g_propGuard.UpdateNewsCache(newsResponse);
        }

      //--- Update PropGuard display
      if(PropGuard_ShowPanel)
         g_pgDisplay.Update(GetPointer(g_equityTracker), GetPointer(g_propGuard),
                            PropGuard_Preset, (int)g_connStatus, -1);
     }

   //--- Poll for signals
   Signal signals[];
   int count = 0;
   if(!PollForSignals(signals, count))
     {
      g_consecutiveErrors++;
      g_connStatus = STATUS_ERROR;

      if(g_consecutiveErrors > 10 && !AutoReconnect)
        {
         Print("[EdgeRelay] Too many consecutive errors. AutoReconnect=false. Stopping.");
         EventKillTimer();
         return;
        }

      UpdateDisplayPanel();
      return;
     }

   //--- Connected successfully
   g_connStatus = STATUS_CONNECTED;
   g_consecutiveErrors = 0;

   //--- Process each signal
   for(int i = 0; i < count; i++)
     {
      //--- Map symbol with suffix
      string mappedSymbol = signals[i].symbol + SymbolSuffix;
      signals[i].symbol = mappedSymbol;

      //--- Check if symbol exists
      if(!SymbolSelect(mappedSymbol, true))
        {
         Print("[EdgeRelay] Symbol not found: ", mappedSymbol);
         ExecutionResult exRes;
         exRes.signal_id     = signals[i].signal_id;
         exRes.success       = false;
         exRes.error_message = "Symbol not found: " + mappedSymbol;
         exRes.retcode       = 0;
         exRes.ticket        = 0;
         exRes.executed_price = 0;
         exRes.executed_volume = 0;
         exRes.slippage      = 0;
         ReportExecution(exRes);
         g_signalsFailed++;
         continue;
        }

      //--- Filter by direction
      if(!ShouldCopySignal(signals[i]))
        {
         Print("[EdgeRelay] Signal filtered: ", signals[i].signal_id);
         continue;
        }

      //--- Calculate lot size (needed before PropGuard check)
      double lot = CalculateLotSize(signals[i]);

      //--- Check PropGuard
      if(g_propGuardReady)
        {
         double evalPrice = (signals[i].price > 0) ? signals[i].price : SymbolInfoDouble(mappedSymbol, SYMBOL_ASK);
         PropGuardVerdict pgVerdict = g_propGuard.EvaluateTrade(
            mappedSymbol, signals[i].order_type, lot, evalPrice, signals[i].sl, signals[i].tp);

         if(!pgVerdict.allowed)
           {
            Print("[PropGuard] BLOCKED: ", pgVerdict.blocked_rule, " - ", pgVerdict.blocked_reason);

            PostBlockedTrade(API_Endpoint, API_Key, AccountID,
               pgVerdict.blocked_rule, pgVerdict.blocked_reason,
               ActionToString(signals[i].action), mappedSymbol, lot, evalPrice,
               pgVerdict.current_daily_loss_pct, pgVerdict.current_drawdown_pct,
               AccountInfoDouble(ACCOUNT_EQUITY));

            ExecutionResult exRes;
            exRes.signal_id     = signals[i].signal_id;
            exRes.success       = false;
            exRes.error_message = "PropGuard: " + pgVerdict.blocked_reason;
            exRes.retcode       = 0;
            exRes.ticket        = 0;
            exRes.executed_price = 0;
            exRes.executed_volume = 0;
            exRes.slippage      = 0;
            ReportExecution(exRes);
            g_signalsFailed++;
            continue;
           }
        }
      else
        {
         //--- Fallback to simple equity guard if PropGuard not initialized
         EquityGuardResult guard = CheckEquityGuard();
         if(!guard.allowed)
           {
            Print("[EdgeRelay] Equity guard blocked: ", guard.reason);
            ExecutionResult exRes;
            exRes.signal_id     = signals[i].signal_id;
            exRes.success       = false;
            exRes.error_message = "Equity guard: " + guard.reason;
            exRes.retcode       = 0;
            exRes.ticket        = 0;
            exRes.executed_price = 0;
            exRes.executed_volume = 0;
            exRes.slippage      = 0;
            ReportExecution(exRes);
            g_signalsFailed++;
            continue;
           }
        }

      //--- Invert direction if enabled
      if(InvertDirection)
         signals[i].order_type = InvertOrderType(signals[i].order_type);

      //--- Execute the signal
      ExecutionResult execResult = ExecuteSignal(signals[i], lot);

      //--- Report result
      ReportExecution(execResult);

      if(execResult.success)
         g_signalsProcessed++;
      else
         g_signalsFailed++;
     }

   //--- Update display
   UpdateDisplayPanel();
  }

//+------------------------------------------------------------------+
//| Trade transaction handler — detect manual trades                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   if(!g_propGuardReady || !PropGuard_Enabled)
      return;

   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
     {
      g_equityTracker.Update();
      g_equityTracker.OnTradeExecuted();

      ENUM_PROPGUARD_STATUS status = g_equityTracker.GetStatus();
      if(status == PG_CRITICAL && PropGuard_AutoClose && !g_propGuard.IsLocked())
        {
         string reason = "Manual trade triggered critical threshold. DD=" +
            DoubleToString(g_equityTracker.GetTotalDrawdownPercent(), 2) + "%";
         int closed = g_propGuard.EmergencyCloseAll(reason);

         PostEmergencyClose(API_Endpoint, API_Key, AccountID, reason,
                            AccountInfoDouble(ACCOUNT_EQUITY), closed);

         PlaySound("alert2.wav");
         Alert("[PropGuard] EMERGENCY: ", reason);
        }
     }
  }

//+------------------------------------------------------------------+
//| Poll for signals via HTTP GET                                     |
//+------------------------------------------------------------------+
bool PollForSignals(Signal &signals[], int &count)
  {
   count = 0;

   string url = API_Endpoint + "/v1/poll/" + AccountID;
   string headers = "Content-Type: application/json\r\nX-API-Key: " + API_Key + "\r\n";
   int timeout = HTTP_TIMEOUT;

   char   postData[];
   char   resultData[];
   string resultHeaders;

   int res = WebRequest("GET", url, headers, timeout, postData, resultData, resultHeaders);

   if(res == -1)
     {
      int err = GetLastError();
      if(err == 4060)
         Print("[EdgeRelay] WebRequest failed: Add ", API_Endpoint,
               " to Tools > Options > Expert Advisors > Allow WebRequest for listed URL");
      else
         Print("[EdgeRelay] WebRequest failed. Error=", err);
      return false;
     }

   if(res != 200)
     {
      Print("[EdgeRelay] Poll returned HTTP ", res);
      return false;
     }

   string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);

   if(StringLen(response) < 5)
      return true;  // Empty or minimal response, no signals

   //--- Parse the response
   return ParsePollResponse(response, signals, count);
  }

//+------------------------------------------------------------------+
//| Parse poll response JSON into signal array                        |
//+------------------------------------------------------------------+
bool ParsePollResponse(const string &json, Signal &signals[], int &count)
  {
   count = 0;

   CJsonParser parser;
   if(!parser.Parse(json))
     {
      Print("[EdgeRelay] Failed to parse poll response JSON");
      return false;
     }

   int arrSize = parser.GetArraySize("signals");
   if(arrSize <= 0)
      return true;  // No signals

   if(arrSize > MAX_SIGNALS_PER_POLL)
      arrSize = MAX_SIGNALS_PER_POLL;

   ArrayResize(signals, arrSize);

   for(int i = 0; i < arrSize; i++)
     {
      string elemJson = parser.GetArrayElementByKey("signals", i);
      if(elemJson == "")
         continue;

      CJsonParser ep;
      if(!ep.Parse(elemJson))
         continue;

      signals[count].signal_id    = ep.GetString("signal_id");
      signals[count].account_id   = ep.GetString("account_id");
      signals[count].sequence_num = ep.GetInt("sequence_num");
      signals[count].symbol       = ep.GetString("symbol");
      signals[count].volume       = ep.GetDouble("volume");
      signals[count].price        = ep.GetDouble("price");
      signals[count].sl           = ep.GetDouble("sl");
      signals[count].tp           = ep.GetDouble("tp");
      signals[count].magic_number = ep.GetLong("magic_number");
      signals[count].ticket       = ep.GetLong("ticket");
      signals[count].comment      = ep.GetString("comment");
      signals[count].timestamp    = (datetime)ep.GetLong("timestamp");
      signals[count].hmac_signature = ep.GetString("hmac_signature");

      //--- Parse action
      string actionStr = ep.GetString("action");
      signals[count].action = ParseAction(actionStr);

      //--- Parse order type
      string typeStr = ep.GetString("order_type");
      signals[count].order_type = ParseOrderType(typeStr);

      count++;
     }

   return true;
  }

//+------------------------------------------------------------------+
//| Parse action string to enum                                       |
//+------------------------------------------------------------------+
ENUM_SIGNAL_ACTION ParseAction(const string &actionStr)
  {
   if(actionStr == "OPEN"           || actionStr == "open")           return SIGNAL_OPEN;
   if(actionStr == "MODIFY"         || actionStr == "modify")         return SIGNAL_MODIFY;
   if(actionStr == "PARTIAL_CLOSE"  || actionStr == "partial_close")  return SIGNAL_PARTIAL_CLOSE;
   if(actionStr == "CLOSE"          || actionStr == "close")          return SIGNAL_CLOSE;
   if(actionStr == "PENDING"        || actionStr == "pending")        return SIGNAL_PENDING;
   if(actionStr == "CANCEL_PENDING" || actionStr == "cancel_pending") return SIGNAL_CANCEL_PENDING;
   return SIGNAL_OPEN;
  }

//+------------------------------------------------------------------+
//| Parse order type string to enum                                   |
//+------------------------------------------------------------------+
ENUM_ORDER_TYPE ParseOrderType(const string &typeStr)
  {
   if(typeStr == "BUY"              || typeStr == "buy")              return ORDER_TYPE_BUY;
   if(typeStr == "SELL"             || typeStr == "sell")             return ORDER_TYPE_SELL;
   if(typeStr == "BUY_LIMIT"       || typeStr == "buy_limit")        return ORDER_TYPE_BUY_LIMIT;
   if(typeStr == "SELL_LIMIT"      || typeStr == "sell_limit")       return ORDER_TYPE_SELL_LIMIT;
   if(typeStr == "BUY_STOP"        || typeStr == "buy_stop")         return ORDER_TYPE_BUY_STOP;
   if(typeStr == "SELL_STOP"       || typeStr == "sell_stop")        return ORDER_TYPE_SELL_STOP;
   if(typeStr == "BUY_STOP_LIMIT"  || typeStr == "buy_stop_limit")   return ORDER_TYPE_BUY_STOP_LIMIT;
   if(typeStr == "SELL_STOP_LIMIT" || typeStr == "sell_stop_limit")   return ORDER_TYPE_SELL_STOP_LIMIT;
   return ORDER_TYPE_BUY;
  }

//+------------------------------------------------------------------+
//| Execute a signal                                                  |
//+------------------------------------------------------------------+
ExecutionResult ExecuteSignal(Signal &signal, double lot)
  {
   ExecutionResult execResult;
   execResult.signal_id       = signal.signal_id;
   execResult.success         = false;
   execResult.ticket          = 0;
   execResult.executed_price  = 0.0;
   execResult.executed_volume = 0.0;
   execResult.slippage        = 0;
   execResult.error_message   = "";
   execResult.retcode         = 0;

   string comment = COMMENT_PREFIX + signal.signal_id;

   switch(signal.action)
     {
      case SIGNAL_OPEN:
         execResult = ExecuteOpen(signal, lot, comment);
         break;

      case SIGNAL_MODIFY:
         execResult = ExecuteModify(signal);
         break;

      case SIGNAL_CLOSE:
         execResult = ExecuteClose(signal);
         break;

      case SIGNAL_PARTIAL_CLOSE:
         execResult = ExecutePartialClose(signal);
         break;

      case SIGNAL_PENDING:
         execResult = ExecutePending(signal, lot, comment);
         break;

      case SIGNAL_CANCEL_PENDING:
         execResult = ExecuteCancelPending(signal);
         break;

      default:
         execResult.error_message = "Unknown action";
         break;
     }

   return execResult;
  }

//+------------------------------------------------------------------+
//| Execute OPEN signal (market order)                                |
//+------------------------------------------------------------------+
ExecutionResult ExecuteOpen(Signal &signal, double lot, string comment)
  {
   ExecutionResult execResult;
   execResult.signal_id       = signal.signal_id;
   execResult.success         = false;
   execResult.ticket          = 0;
   execResult.executed_price  = 0.0;
   execResult.executed_volume = 0.0;
   execResult.slippage        = 0;
   execResult.error_message   = "";
   execResult.retcode         = 0;

   //--- Normalize lot
   lot = NormalizeLot(signal.symbol, lot);
   if(lot <= 0.0)
     {
      execResult.error_message = "Invalid lot size after normalization";
      return execResult;
     }

   //--- Get current price
   double price = 0.0;
   if(signal.order_type == ORDER_TYPE_BUY)
      price = SymbolInfoDouble(signal.symbol, SYMBOL_ASK);
   else if(signal.order_type == ORDER_TYPE_SELL)
      price = SymbolInfoDouble(signal.symbol, SYMBOL_BID);
   else
     {
      execResult.error_message = "Invalid order type for market open: " + OrderTypeToStr(signal.order_type);
      return execResult;
     }

   //--- Normalize SL/TP
   int digits = (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS);
   double sl = NormalizeDouble(signal.sl, digits);
   double tp = NormalizeDouble(signal.tp, digits);

   //--- Send order
   MqlTradeRequest tradeRequest = {};
   MqlTradeResult  tradeResult = {};

   tradeRequest.action    = TRADE_ACTION_DEAL;
   tradeRequest.symbol    = signal.symbol;
   tradeRequest.volume    = lot;
   tradeRequest.type      = signal.order_type;
   tradeRequest.price     = price;
   tradeRequest.sl        = sl;
   tradeRequest.tp        = tp;
   tradeRequest.deviation = (ulong)MaxSlippagePoints;
   tradeRequest.magic     = (ulong)signal.magic_number;
   tradeRequest.comment   = comment;
   tradeRequest.type_filling = ORDER_FILLING_IOC;

   if(!OrderSend(tradeRequest, tradeResult))
     {
      execResult.error_message = "OrderSend failed: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] OPEN failed: ", execResult.error_message,
            " Symbol=", signal.symbol, " Lot=", lot);
      return execResult;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE && tradeResult.retcode != TRADE_RETCODE_PLACED)
     {
      execResult.error_message = "OrderSend retcode: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] OPEN retcode: ", tradeResult.retcode, " Signal=", signal.signal_id);
      return execResult;
     }

   execResult.success         = true;
   execResult.ticket          = tradeResult.order;
   execResult.executed_price  = tradeResult.price;
   execResult.executed_volume = tradeResult.volume;
   execResult.retcode         = tradeResult.retcode;

   //--- Calculate slippage
   double pointSize = SymbolInfoDouble(signal.symbol, SYMBOL_POINT);
   if(pointSize > 0)
      execResult.slippage = (int)MathRound(MathAbs(tradeResult.price - price) / pointSize);

   Print("[EdgeRelay] OPEN success: Ticket=", execResult.ticket,
         " ", OrderTypeToStr(signal.order_type),
         " ", signal.symbol, " Lot=", lot,
         " Price=", tradeResult.price);

   return execResult;
  }

//+------------------------------------------------------------------+
//| Execute MODIFY signal                                             |
//+------------------------------------------------------------------+
ExecutionResult ExecuteModify(Signal &signal)
  {
   ExecutionResult execResult;
   execResult.signal_id       = signal.signal_id;
   execResult.success         = false;
   execResult.ticket          = 0;
   execResult.executed_price  = 0.0;
   execResult.executed_volume = 0.0;
   execResult.slippage        = 0;
   execResult.error_message   = "";
   execResult.retcode         = 0;

   //--- Find position
   ulong posTicket = FindPositionByMagic(signal.magic_number);
   if(posTicket == 0)
      posTicket = FindPositionByComment(COMMENT_PREFIX + IntegerToString(signal.ticket));

   if(posTicket == 0)
     {
      execResult.error_message = "Position not found for modify. Magic=" +
                             IntegerToString(signal.magic_number);
      Print("[EdgeRelay] MODIFY failed: ", execResult.error_message);
      return execResult;
     }

   //--- Normalize SL/TP
   int digits = (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS);
   double sl = NormalizeDouble(signal.sl, digits);
   double tp = NormalizeDouble(signal.tp, digits);

   MqlTradeRequest tradeRequest = {};
   MqlTradeResult  tradeResult = {};

   tradeRequest.action   = TRADE_ACTION_SLTP;
   tradeRequest.position = posTicket;
   tradeRequest.symbol   = signal.symbol;
   tradeRequest.sl       = sl;
   tradeRequest.tp       = tp;

   if(!OrderSend(tradeRequest, tradeResult))
     {
      execResult.error_message = "Modify failed: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] MODIFY failed: ", execResult.error_message);
      return execResult;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE)
     {
      execResult.error_message = "Modify retcode: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      return execResult;
     }

   execResult.success = true;
   execResult.ticket  = posTicket;
   execResult.retcode = tradeResult.retcode;
   Print("[EdgeRelay] MODIFY success: Ticket=", posTicket,
         " SL=", sl, " TP=", tp);

   return execResult;
  }

//+------------------------------------------------------------------+
//| Execute CLOSE signal                                              |
//+------------------------------------------------------------------+
ExecutionResult ExecuteClose(Signal &signal)
  {
   ExecutionResult execResult;
   execResult.signal_id       = signal.signal_id;
   execResult.success         = false;
   execResult.ticket          = 0;
   execResult.executed_price  = 0.0;
   execResult.executed_volume = 0.0;
   execResult.slippage        = 0;
   execResult.error_message   = "";
   execResult.retcode         = 0;

   //--- Find position
   ulong posTicket = FindPositionByMagic(signal.magic_number);
   if(posTicket == 0)
      posTicket = FindPositionByComment(COMMENT_PREFIX + IntegerToString(signal.ticket));

   if(posTicket == 0)
     {
      execResult.error_message = "Position not found for close. Magic=" +
                             IntegerToString(signal.magic_number);
      Print("[EdgeRelay] CLOSE failed: ", execResult.error_message);
      return execResult;
     }

   //--- Select position and get details
   if(!PositionSelectByTicket(posTicket))
     {
      execResult.error_message = "Cannot select position: " + IntegerToString((long)posTicket);
      return execResult;
     }

   double volume = PositionGetDouble(POSITION_VOLUME);
   ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   string symbol = PositionGetString(POSITION_SYMBOL);

   ENUM_ORDER_TYPE closeType = (posType == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
   double price = (closeType == ORDER_TYPE_SELL)
                  ? SymbolInfoDouble(symbol, SYMBOL_BID)
                  : SymbolInfoDouble(symbol, SYMBOL_ASK);

   MqlTradeRequest tradeRequest = {};
   MqlTradeResult  tradeResult = {};

   tradeRequest.action    = TRADE_ACTION_DEAL;
   tradeRequest.position  = posTicket;
   tradeRequest.symbol    = symbol;
   tradeRequest.volume    = volume;
   tradeRequest.type      = closeType;
   tradeRequest.price     = price;
   tradeRequest.deviation = (ulong)MaxSlippagePoints;
   tradeRequest.type_filling = ORDER_FILLING_IOC;

   if(!OrderSend(tradeRequest, tradeResult))
     {
      execResult.error_message = "Close OrderSend failed: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] CLOSE failed: ", execResult.error_message);
      return execResult;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE)
     {
      execResult.error_message = "Close retcode: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      return execResult;
     }

   execResult.success         = true;
   execResult.ticket          = posTicket;
   execResult.executed_price  = tradeResult.price;
   execResult.executed_volume = volume;
   execResult.retcode         = tradeResult.retcode;
   Print("[EdgeRelay] CLOSE success: Ticket=", posTicket,
         " Vol=", volume, " Price=", tradeResult.price);

   return execResult;
  }

//+------------------------------------------------------------------+
//| Execute PARTIAL_CLOSE signal                                      |
//+------------------------------------------------------------------+
ExecutionResult ExecutePartialClose(Signal &signal)
  {
   ExecutionResult execResult;
   execResult.signal_id       = signal.signal_id;
   execResult.success         = false;
   execResult.ticket          = 0;
   execResult.executed_price  = 0.0;
   execResult.executed_volume = 0.0;
   execResult.slippage        = 0;
   execResult.error_message   = "";
   execResult.retcode         = 0;

   //--- Find position
   ulong posTicket = FindPositionByMagic(signal.magic_number);
   if(posTicket == 0)
      posTicket = FindPositionByComment(COMMENT_PREFIX + IntegerToString(signal.ticket));

   if(posTicket == 0)
     {
      execResult.error_message = "Position not found for partial close.";
      Print("[EdgeRelay] PARTIAL_CLOSE failed: ", execResult.error_message);
      return execResult;
     }

   if(!PositionSelectByTicket(posTicket))
     {
      execResult.error_message = "Cannot select position: " + IntegerToString((long)posTicket);
      return execResult;
     }

   double currentVolume = PositionGetDouble(POSITION_VOLUME);
   ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   string symbol = PositionGetString(POSITION_SYMBOL);

   //--- Determine close volume
   double closeVol = signal.volume;
   if(closeVol <= 0 || closeVol > currentVolume)
      closeVol = currentVolume;

   closeVol = NormalizeLot(symbol, closeVol);
   if(closeVol <= 0)
     {
      execResult.error_message = "Invalid partial close volume";
      return execResult;
     }

   ENUM_ORDER_TYPE closeType = (posType == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
   double price = (closeType == ORDER_TYPE_SELL)
                  ? SymbolInfoDouble(symbol, SYMBOL_BID)
                  : SymbolInfoDouble(symbol, SYMBOL_ASK);

   MqlTradeRequest tradeRequest = {};
   MqlTradeResult  tradeResult = {};

   tradeRequest.action    = TRADE_ACTION_DEAL;
   tradeRequest.position  = posTicket;
   tradeRequest.symbol    = symbol;
   tradeRequest.volume    = closeVol;
   tradeRequest.type      = closeType;
   tradeRequest.price     = price;
   tradeRequest.deviation = (ulong)MaxSlippagePoints;
   tradeRequest.type_filling = ORDER_FILLING_IOC;

   if(!OrderSend(tradeRequest, tradeResult))
     {
      execResult.error_message = "Partial close failed: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      return execResult;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE)
     {
      execResult.error_message = "Partial close retcode: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      return execResult;
     }

   execResult.success         = true;
   execResult.ticket          = posTicket;
   execResult.executed_price  = tradeResult.price;
   execResult.executed_volume = closeVol;
   execResult.retcode         = tradeResult.retcode;
   Print("[EdgeRelay] PARTIAL_CLOSE success: Ticket=", posTicket,
         " ClosedVol=", closeVol, " Remaining=", currentVolume - closeVol);

   return execResult;
  }

//+------------------------------------------------------------------+
//| Execute PENDING order signal                                      |
//+------------------------------------------------------------------+
ExecutionResult ExecutePending(Signal &signal, double lot, string comment)
  {
   ExecutionResult execResult;
   execResult.signal_id       = signal.signal_id;
   execResult.success         = false;
   execResult.ticket          = 0;
   execResult.executed_price  = 0.0;
   execResult.executed_volume = 0.0;
   execResult.slippage        = 0;
   execResult.error_message   = "";
   execResult.retcode         = 0;

   lot = NormalizeLot(signal.symbol, lot);
   if(lot <= 0.0)
     {
      execResult.error_message = "Invalid lot for pending order";
      return execResult;
     }

   int digits = (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS);

   MqlTradeRequest tradeRequest = {};
   MqlTradeResult  tradeResult = {};

   tradeRequest.action       = TRADE_ACTION_PENDING;
   tradeRequest.symbol       = signal.symbol;
   tradeRequest.volume       = lot;
   tradeRequest.type         = signal.order_type;
   tradeRequest.price        = NormalizeDouble(signal.price, digits);
   tradeRequest.sl           = NormalizeDouble(signal.sl, digits);
   tradeRequest.tp           = NormalizeDouble(signal.tp, digits);
   tradeRequest.magic        = (ulong)signal.magic_number;
   tradeRequest.comment      = comment;
   tradeRequest.type_filling = ORDER_FILLING_IOC;

   if(!OrderSend(tradeRequest, tradeResult))
     {
      execResult.error_message = "Pending OrderSend failed: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] PENDING failed: ", execResult.error_message);
      return execResult;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE && tradeResult.retcode != TRADE_RETCODE_PLACED)
     {
      execResult.error_message = "Pending retcode: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      return execResult;
     }

   execResult.success = true;
   execResult.ticket  = tradeResult.order;
   execResult.retcode = tradeResult.retcode;
   Print("[EdgeRelay] PENDING success: Order=", execResult.ticket,
         " Type=", OrderTypeToStr(signal.order_type),
         " Price=", signal.price, " Lot=", lot);

   return execResult;
  }

//+------------------------------------------------------------------+
//| Execute CANCEL_PENDING signal                                     |
//+------------------------------------------------------------------+
ExecutionResult ExecuteCancelPending(Signal &signal)
  {
   ExecutionResult execResult;
   execResult.signal_id       = signal.signal_id;
   execResult.success         = false;
   execResult.ticket          = 0;
   execResult.executed_price  = 0.0;
   execResult.executed_volume = 0.0;
   execResult.slippage        = 0;
   execResult.error_message   = "";
   execResult.retcode         = 0;

   //--- Find the pending order by magic or comment
   ulong orderTicket = FindPendingOrderByMagic(signal.magic_number);
   if(orderTicket == 0)
      orderTicket = FindPendingOrderByComment(COMMENT_PREFIX + IntegerToString(signal.ticket));

   if(orderTicket == 0)
     {
      execResult.error_message = "Pending order not found for cancel.";
      Print("[EdgeRelay] CANCEL_PENDING failed: ", execResult.error_message);
      return execResult;
     }

   MqlTradeRequest tradeRequest = {};
   MqlTradeResult  tradeResult = {};

   tradeRequest.action = TRADE_ACTION_REMOVE;
   tradeRequest.order  = orderTicket;

   if(!OrderSend(tradeRequest, tradeResult))
     {
      execResult.error_message = "Cancel pending failed: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      return execResult;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE)
     {
      execResult.error_message = "Cancel retcode: " + IntegerToString(tradeResult.retcode);
      execResult.retcode       = tradeResult.retcode;
      return execResult;
     }

   execResult.success = true;
   execResult.ticket  = orderTicket;
   execResult.retcode = tradeResult.retcode;
   Print("[EdgeRelay] CANCEL_PENDING success: Order=", orderTicket);

   return execResult;
  }

//+------------------------------------------------------------------+
//| Check equity guard                                                |
//+------------------------------------------------------------------+
EquityGuardResult CheckEquityGuard()
  {
   EquityGuardResult guard;
   guard.allowed = true;
   guard.reason  = "";

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);

   //--- Daily loss check
   if(g_startingEquityToday > 0)
     {
      double dailyLoss    = g_startingEquityToday - equity;
      double dailyPct     = (dailyLoss / g_startingEquityToday) * 100.0;

      if(dailyPct >= MaxDailyLossPercent)
        {
         guard.allowed = false;
         guard.reason  = StringFormat("Daily loss %.2f%% exceeds max %.2f%%",
                                      dailyPct, MaxDailyLossPercent);
         return guard;
        }
     }

   //--- Total drawdown check
   if(g_startingEquityTotal > 0)
     {
      double totalDrawdown = g_startingEquityTotal - equity;
      double totalPct      = (totalDrawdown / g_startingEquityTotal) * 100.0;

      if(totalPct >= MaxTotalDrawdownPercent)
        {
         guard.allowed = false;
         guard.reason  = StringFormat("Total drawdown %.2f%% exceeds max %.2f%%",
                                      totalPct, MaxTotalDrawdownPercent);
         return guard;
        }
     }

   return guard;
  }

//+------------------------------------------------------------------+
//| Report execution result via HTTP POST                             |
//+------------------------------------------------------------------+
void ReportExecution(ExecutionResult &exResult)
  {
   string url = API_Endpoint + "/v1/execution";
   string headers = "Content-Type: application/json\r\nX-API-Key: " + API_Key + "\r\n";

   //--- Build JSON body
   string body = "{";
   body += "\"signal_id\":\"" + JsonEscape(exResult.signal_id) + "\",";
   body += "\"account_id\":\"" + JsonEscape(AccountID) + "\",";
   body += "\"success\":" + (exResult.success ? "true" : "false") + ",";
   body += "\"ticket\":" + IntegerToString((long)exResult.ticket) + ",";
   body += "\"executed_price\":" + DoubleToString(exResult.executed_price, 5) + ",";
   body += "\"executed_volume\":" + DoubleToString(exResult.executed_volume, 8) + ",";
   body += "\"slippage\":" + IntegerToString(exResult.slippage) + ",";
   body += "\"retcode\":" + IntegerToString(exResult.retcode) + ",";
   body += "\"error_message\":\"" + JsonEscape(exResult.error_message) + "\",";
   body += "\"timestamp\":" + IntegerToString((long)TimeCurrent());
   body += "}";

   char postData[];
   StringToCharArray(body, postData, 0, StringLen(body));

   char resultData[];
   string resultHeaders;

   //--- Fire and forget - log errors but don't block
   int res = WebRequest("POST", url, headers, HTTP_TIMEOUT, postData, resultData, resultHeaders);
   if(res != 200 && res != 201 && res != -1)
     {
      Print("[EdgeRelay] Report execution HTTP ", res, " for signal=", exResult.signal_id);
     }
  }

//+------------------------------------------------------------------+
//| Calculate lot size based on LotMode                               |
//+------------------------------------------------------------------+
double CalculateLotSize(Signal &signal)
  {
   double lot = 0.0;

   switch(LotMode)
     {
      case LOT_MIRROR:
         lot = signal.volume;
         break;

      case LOT_FIXED:
         lot = LotValue;
         break;

      case LOT_MULTIPLIER:
         lot = signal.volume * LotValue;
         break;

      case LOT_RISK_PERCENT:
        {
         //--- Risk-based: risk LotValue% of balance per trade
         double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
         double riskMoney = balance * (LotValue / 100.0);

         //--- Calculate risk in money per lot from SL distance
         double point = SymbolInfoDouble(signal.symbol, SYMBOL_POINT);
         double tickValue = SymbolInfoDouble(signal.symbol, SYMBOL_TRADE_TICK_VALUE);
         double tickSize  = SymbolInfoDouble(signal.symbol, SYMBOL_TRADE_TICK_SIZE);

         if(signal.sl > 0 && point > 0 && tickValue > 0 && tickSize > 0)
           {
            double price = signal.price;
            if(price <= 0)
              {
               if(signal.order_type == ORDER_TYPE_BUY)
                  price = SymbolInfoDouble(signal.symbol, SYMBOL_ASK);
               else
                  price = SymbolInfoDouble(signal.symbol, SYMBOL_BID);
              }

            double slDistance = MathAbs(price - signal.sl);
            double riskPerLot = (slDistance / tickSize) * tickValue;

            if(riskPerLot > 0)
               lot = riskMoney / riskPerLot;
            else
               lot = signal.volume; // Fallback to mirror
           }
         else
           {
            //--- No SL provided, fallback to mirror
            lot = signal.volume;
            Print("[EdgeRelay] RISK_PERCENT: No SL in signal, falling back to mirror. Signal=",
                  signal.signal_id);
           }
        }
        break;

      default:
         lot = signal.volume;
         break;
     }

   return lot;
  }

//+------------------------------------------------------------------+
//| Normalize lot to symbol constraints                               |
//+------------------------------------------------------------------+
double NormalizeLot(string symbol, double lot)
  {
   double minLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

   if(lotStep <= 0)
      lotStep = 0.01;

   //--- Round to lot step
   lot = MathFloor(lot / lotStep) * lotStep;

   //--- Clamp to min/max
   if(lot < minLot)
      lot = minLot;
   if(lot > maxLot)
      lot = maxLot;

   //--- Normalize decimal places
   int lotDigits = (int)MathMax(-MathLog10(lotStep), 0);
   lot = NormalizeDouble(lot, lotDigits);

   return lot;
  }

//+------------------------------------------------------------------+
//| Invert order type (buy<->sell)                                    |
//+------------------------------------------------------------------+
ENUM_ORDER_TYPE InvertOrderType(ENUM_ORDER_TYPE type)
  {
   switch(type)
     {
      case ORDER_TYPE_BUY:             return ORDER_TYPE_SELL;
      case ORDER_TYPE_SELL:            return ORDER_TYPE_BUY;
      case ORDER_TYPE_BUY_LIMIT:       return ORDER_TYPE_SELL_LIMIT;
      case ORDER_TYPE_SELL_LIMIT:      return ORDER_TYPE_BUY_LIMIT;
      case ORDER_TYPE_BUY_STOP:        return ORDER_TYPE_SELL_STOP;
      case ORDER_TYPE_SELL_STOP:       return ORDER_TYPE_BUY_STOP;
      case ORDER_TYPE_BUY_STOP_LIMIT:  return ORDER_TYPE_SELL_STOP_LIMIT;
      case ORDER_TYPE_SELL_STOP_LIMIT: return ORDER_TYPE_BUY_STOP_LIMIT;
     }
   return type;
  }

//+------------------------------------------------------------------+
//| Check if signal should be copied based on direction filters       |
//+------------------------------------------------------------------+
bool ShouldCopySignal(Signal &signal)
  {
   //--- Close/modify/cancel always allowed
   if(signal.action == SIGNAL_CLOSE || signal.action == SIGNAL_MODIFY ||
      signal.action == SIGNAL_PARTIAL_CLOSE || signal.action == SIGNAL_CANCEL_PENDING)
      return true;

   //--- Pending filter
   if(signal.action == SIGNAL_PENDING && !CopyPendings)
      return false;

   //--- Direction filter (consider inversion)
   ENUM_ORDER_TYPE type = signal.order_type;
   if(InvertDirection)
      type = InvertOrderType(type);

   bool isBuy  = (type == ORDER_TYPE_BUY || type == ORDER_TYPE_BUY_LIMIT ||
                   type == ORDER_TYPE_BUY_STOP || type == ORDER_TYPE_BUY_STOP_LIMIT);
   bool isSell = (type == ORDER_TYPE_SELL || type == ORDER_TYPE_SELL_LIMIT ||
                   type == ORDER_TYPE_SELL_STOP || type == ORDER_TYPE_SELL_STOP_LIMIT);

   if(isBuy && !CopyBuys)    return false;
   if(isSell && !CopySells)  return false;

   return true;
  }

//+------------------------------------------------------------------+
//| Find open position by magic number                                |
//+------------------------------------------------------------------+
ulong FindPositionByMagic(long magicNumber)
  {
   if(magicNumber == 0)
      return 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;

      if(PositionGetInteger(POSITION_MAGIC) == magicNumber)
         return ticket;
     }

   return 0;
  }

//+------------------------------------------------------------------+
//| Find open position by comment tag                                 |
//+------------------------------------------------------------------+
ulong FindPositionByComment(string tag)
  {
   if(tag == "")
      return 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;

      string comment = PositionGetString(POSITION_COMMENT);
      if(StringFind(comment, tag) >= 0)
         return ticket;
     }

   return 0;
  }

//+------------------------------------------------------------------+
//| Find pending order by magic number                                |
//+------------------------------------------------------------------+
ulong FindPendingOrderByMagic(long magicNumber)
  {
   if(magicNumber == 0)
      return 0;

   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      ulong ticket = OrderGetTicket(i);
      if(ticket == 0)
         continue;

      if(OrderGetInteger(ORDER_MAGIC) == magicNumber)
         return ticket;
     }

   return 0;
  }

//+------------------------------------------------------------------+
//| Find pending order by comment tag                                 |
//+------------------------------------------------------------------+
ulong FindPendingOrderByComment(string tag)
  {
   if(tag == "")
      return 0;

   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      ulong ticket = OrderGetTicket(i);
      if(ticket == 0)
         continue;

      string comment = OrderGetString(ORDER_COMMENT);
      if(StringFind(comment, tag) >= 0)
         return ticket;
     }

   return 0;
  }

//+------------------------------------------------------------------+
//| Display panel - Initialization                                    |
//+------------------------------------------------------------------+
void InitDisplayPanel()
  {
   string prefix = "ER_";

   ObjectCreate(0, prefix + "bg", OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_XDISTANCE, 10);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_YDISTANCE, 25);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_XSIZE, 280);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_YSIZE, 180);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_BGCOLOR, clrBlack);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_COLOR, clrDodgerBlue);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_BACK, false);

   CreateFollowerLabel(prefix + "title",    15, 30,  "EdgeRelay Follower", clrDodgerBlue, 10);
   CreateFollowerLabel(prefix + "status",   15, 50,  "Status: Connecting...", clrYellow, 9);
   CreateFollowerLabel(prefix + "master",   15, 70,  "Master: " + MasterAccountID, clrWhite, 9);
   CreateFollowerLabel(prefix + "lotmode",  15, 90,  "LotMode: " + EnumToString(LotMode), clrWhite, 9);
   CreateFollowerLabel(prefix + "signals",  15, 110, "Signals: 0 | Failed: 0", clrWhite, 9);
   CreateFollowerLabel(prefix + "equity",   15, 130, "Equity: " + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2), clrWhite, 9);
   CreateFollowerLabel(prefix + "drawdown", 15, 150, "Drawdown: 0.00%", clrWhite, 9);
   CreateFollowerLabel(prefix + "poll",     15, 170, "Poll: " + IntegerToString(PollIntervalMs) + "ms", clrGray, 8);

   ChartRedraw();
  }

//+------------------------------------------------------------------+
//| Create a text label on chart                                      |
//+------------------------------------------------------------------+
void CreateFollowerLabel(string name, int x, int y, string text, color clr, int fontSize)
  {
   ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontSize);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
  }

//+------------------------------------------------------------------+
//| Update display panel                                              |
//+------------------------------------------------------------------+
void UpdateDisplayPanel()
  {
   string prefix = "ER_";

   //--- Status
   string statusText = "Status: ";
   color  statusClr  = clrWhite;
   switch(g_connStatus)
     {
      case STATUS_CONNECTED:    statusText += "Connected";    statusClr = clrLime;    break;
      case STATUS_DISCONNECTED: statusText += "Disconnected"; statusClr = clrRed;     break;
      case STATUS_CONNECTING:   statusText += "Connecting...";statusClr = clrYellow;  break;
      case STATUS_ERROR:        statusText += "Error (" + IntegerToString(g_consecutiveErrors) + ")";
                                statusClr = clrOrangeRed;  break;
     }
   ObjectSetString(0, prefix + "status", OBJPROP_TEXT, statusText);
   ObjectSetInteger(0, prefix + "status", OBJPROP_COLOR, statusClr);

   //--- Signals
   ObjectSetString(0, prefix + "signals", OBJPROP_TEXT,
                   "Signals: " + IntegerToString(g_signalsProcessed) +
                   " | Failed: " + IntegerToString(g_signalsFailed));

   //--- Equity & Drawdown
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   ObjectSetString(0, prefix + "equity", OBJPROP_TEXT,
                   "Equity: " + DoubleToString(equity, 2));

   double ddPct = 0;
   if(g_startingEquityTotal > 0)
      ddPct = ((g_startingEquityTotal - equity) / g_startingEquityTotal) * 100.0;

   color ddClr = clrWhite;
   if(ddPct > MaxTotalDrawdownPercent * 0.75) ddClr = clrOrangeRed;
   else if(ddPct > MaxTotalDrawdownPercent * 0.5) ddClr = clrYellow;

   ObjectSetString(0, prefix + "drawdown", OBJPROP_TEXT,
                   "Drawdown: " + DoubleToString(ddPct, 2) + "%");
   ObjectSetInteger(0, prefix + "drawdown", OBJPROP_COLOR, ddClr);

   ChartRedraw();
  }

//+------------------------------------------------------------------+
//| Cleanup display panel                                             |
//+------------------------------------------------------------------+
void CleanupDisplayPanel()
  {
   string prefix = "ER_";
   ObjectDelete(0, prefix + "bg");
   ObjectDelete(0, prefix + "title");
   ObjectDelete(0, prefix + "status");
   ObjectDelete(0, prefix + "master");
   ObjectDelete(0, prefix + "lotmode");
   ObjectDelete(0, prefix + "signals");
   ObjectDelete(0, prefix + "equity");
   ObjectDelete(0, prefix + "drawdown");
   ObjectDelete(0, prefix + "poll");
   ChartRedraw();
  }

//+------------------------------------------------------------------+
//| OnTick - not used, polling is timer-based                         |
//+------------------------------------------------------------------+
void OnTick()
  {
   // No action - all polling handled in OnTimer
  }
//+------------------------------------------------------------------+
