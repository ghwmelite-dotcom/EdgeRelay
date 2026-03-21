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
#include "Include\EdgeRelay_Common.mqh"
#include "Include\EdgeRelay_JsonParser.mqh"

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

   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| Expert deinitialization                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   CleanupDisplayPanel();
   Print("[EdgeRelay] Follower EA shutdown. Reason=", reason,
         " Processed=", g_signalsProcessed, " Failed=", g_signalsFailed);
  }

//+------------------------------------------------------------------+
//| Timer event — main poll loop                                      |
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

      //--- Check equity guard
      EquityGuardResult guard = CheckEquityGuard();
      if(!guard.allowed)
        {
         Print("[EdgeRelay] Equity guard blocked: ", guard.reason);
         ExecutionResult exRes;
         exRes.signal_id     = signals[i].signal_id;
         exRes.success       = false;
         exRes.error_message = "Equity guard: " + guard.reason;
         exRes.retcode       = 0;
         ReportExecution(exRes);
         g_signalsFailed++;
         continue;
        }

      //--- Calculate lot size
      double lot = CalculateLotSize(signals[i]);

      //--- Invert direction if enabled
      if(InvertDirection)
         signals[i].order_type = InvertOrderType(signals[i].order_type);

      //--- Execute the signal
      ExecutionResult result = ExecuteSignal(signals[i], lot);

      //--- Report result
      ReportExecution(result);

      if(result.success)
         g_signalsProcessed++;
      else
         g_signalsFailed++;
     }

   //--- Update display
   UpdateDisplayPanel();
  }

//+------------------------------------------------------------------+
//| Poll for signals via HTTP GET                                     |
//+------------------------------------------------------------------+
bool PollForSignals(Signal &signals[], int &count)
  {
   count = 0;

   string url = API_Endpoint + "/v1/poll/" + AccountID;
   string headers = "Content-Type: application/json\r\nX-API-Key: " + API_Key + "\r\n";
   string cookie = "";
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
   ExecutionResult result;
   result.signal_id       = signal.signal_id;
   result.success         = false;
   result.ticket          = 0;
   result.executed_price  = 0.0;
   result.executed_volume = 0.0;
   result.slippage        = 0;
   result.error_message   = "";
   result.retcode         = 0;

   string comment = COMMENT_PREFIX + signal.signal_id;

   switch(signal.action)
     {
      case SIGNAL_OPEN:
         result = ExecuteOpen(signal, lot, comment);
         break;

      case SIGNAL_MODIFY:
         result = ExecuteModify(signal);
         break;

      case SIGNAL_CLOSE:
         result = ExecuteClose(signal);
         break;

      case SIGNAL_PARTIAL_CLOSE:
         result = ExecutePartialClose(signal);
         break;

      case SIGNAL_PENDING:
         result = ExecutePending(signal, lot, comment);
         break;

      case SIGNAL_CANCEL_PENDING:
         result = ExecuteCancelPending(signal);
         break;

      default:
         result.error_message = "Unknown action";
         break;
     }

   return result;
  }

//+------------------------------------------------------------------+
//| Execute OPEN signal (market order)                                |
//+------------------------------------------------------------------+
ExecutionResult ExecuteOpen(Signal &signal, double lot, const string &comment)
  {
   ExecutionResult result;
   result.signal_id = signal.signal_id;
   result.success   = false;

   //--- Normalize lot
   lot = NormalizeLot(signal.symbol, lot);
   if(lot <= 0.0)
     {
      result.error_message = "Invalid lot size after normalization";
      return result;
     }

   //--- Get current price
   double price = 0.0;
   if(signal.order_type == ORDER_TYPE_BUY)
      price = SymbolInfoDouble(signal.symbol, SYMBOL_ASK);
   else if(signal.order_type == ORDER_TYPE_SELL)
      price = SymbolInfoDouble(signal.symbol, SYMBOL_BID);
   else
     {
      result.error_message = "Invalid order type for market open: " + OrderTypeToString(signal.order_type);
      return result;
     }

   //--- Normalize SL/TP
   int digits = (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS);
   double sl = NormalizeDouble(signal.sl, digits);
   double tp = NormalizeDouble(signal.tp, digits);

   //--- Send order
   MqlTradeRequest request = {};
   MqlTradeResult  tradeResult = {};

   request.action    = TRADE_ACTION_DEAL;
   request.symbol    = signal.symbol;
   request.volume    = lot;
   request.type      = signal.order_type;
   request.price     = price;
   request.sl        = sl;
   request.tp        = tp;
   request.deviation = (ulong)MaxSlippagePoints;
   request.magic     = (ulong)signal.magic_number;
   request.comment   = comment;
   request.type_filling = ORDER_FILLING_IOC;

   if(!OrderSend(request, tradeResult))
     {
      result.error_message = "OrderSend failed: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] OPEN failed: ", result.error_message,
            " Symbol=", signal.symbol, " Lot=", lot);
      return result;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE && tradeResult.retcode != TRADE_RETCODE_PLACED)
     {
      result.error_message = "OrderSend retcode: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] OPEN retcode: ", tradeResult.retcode, " Signal=", signal.signal_id);
      return result;
     }

   result.success         = true;
   result.ticket          = tradeResult.order;
   result.executed_price  = tradeResult.price;
   result.executed_volume = tradeResult.volume;
   result.retcode         = tradeResult.retcode;

   //--- Calculate slippage
   double pointSize = SymbolInfoDouble(signal.symbol, SYMBOL_POINT);
   if(pointSize > 0)
      result.slippage = (int)MathRound(MathAbs(tradeResult.price - price) / pointSize);

   Print("[EdgeRelay] OPEN success: Ticket=", result.ticket,
         " ", OrderTypeToString(signal.order_type),
         " ", signal.symbol, " Lot=", lot,
         " Price=", tradeResult.price);

   return result;
  }

//+------------------------------------------------------------------+
//| Execute MODIFY signal                                             |
//+------------------------------------------------------------------+
ExecutionResult ExecuteModify(Signal &signal)
  {
   ExecutionResult result;
   result.signal_id = signal.signal_id;
   result.success   = false;

   //--- Find position
   ulong posTicket = FindPositionByMagic(signal.magic_number);
   if(posTicket == 0)
      posTicket = FindPositionByComment(COMMENT_PREFIX + IntegerToString(signal.ticket));

   if(posTicket == 0)
     {
      result.error_message = "Position not found for modify. Magic=" +
                             IntegerToString(signal.magic_number);
      Print("[EdgeRelay] MODIFY failed: ", result.error_message);
      return result;
     }

   //--- Normalize SL/TP
   int digits = (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS);
   double sl = NormalizeDouble(signal.sl, digits);
   double tp = NormalizeDouble(signal.tp, digits);

   MqlTradeRequest request = {};
   MqlTradeResult  tradeResult = {};

   request.action   = TRADE_ACTION_SLTP;
   request.position = posTicket;
   request.symbol   = signal.symbol;
   request.sl       = sl;
   request.tp       = tp;

   if(!OrderSend(request, tradeResult))
     {
      result.error_message = "Modify failed: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] MODIFY failed: ", result.error_message);
      return result;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE)
     {
      result.error_message = "Modify retcode: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      return result;
     }

   result.success = true;
   result.ticket  = posTicket;
   result.retcode = tradeResult.retcode;
   Print("[EdgeRelay] MODIFY success: Ticket=", posTicket,
         " SL=", sl, " TP=", tp);

   return result;
  }

//+------------------------------------------------------------------+
//| Execute CLOSE signal                                              |
//+------------------------------------------------------------------+
ExecutionResult ExecuteClose(Signal &signal)
  {
   ExecutionResult result;
   result.signal_id = signal.signal_id;
   result.success   = false;

   //--- Find position
   ulong posTicket = FindPositionByMagic(signal.magic_number);
   if(posTicket == 0)
      posTicket = FindPositionByComment(COMMENT_PREFIX + IntegerToString(signal.ticket));

   if(posTicket == 0)
     {
      result.error_message = "Position not found for close. Magic=" +
                             IntegerToString(signal.magic_number);
      Print("[EdgeRelay] CLOSE failed: ", result.error_message);
      return result;
     }

   //--- Select position and get details
   if(!PositionSelectByTicket(posTicket))
     {
      result.error_message = "Cannot select position: " + IntegerToString((long)posTicket);
      return result;
     }

   double volume = PositionGetDouble(POSITION_VOLUME);
   ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   string symbol = PositionGetString(POSITION_SYMBOL);

   ENUM_ORDER_TYPE closeType = (posType == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
   double price = (closeType == ORDER_TYPE_SELL)
                  ? SymbolInfoDouble(symbol, SYMBOL_BID)
                  : SymbolInfoDouble(symbol, SYMBOL_ASK);

   MqlTradeRequest request = {};
   MqlTradeResult  tradeResult = {};

   request.action    = TRADE_ACTION_DEAL;
   request.position  = posTicket;
   request.symbol    = symbol;
   request.volume    = volume;
   request.type      = closeType;
   request.price     = price;
   request.deviation = (ulong)MaxSlippagePoints;
   request.type_filling = ORDER_FILLING_IOC;

   if(!OrderSend(request, tradeResult))
     {
      result.error_message = "Close OrderSend failed: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] CLOSE failed: ", result.error_message);
      return result;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE)
     {
      result.error_message = "Close retcode: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      return result;
     }

   result.success         = true;
   result.ticket          = posTicket;
   result.executed_price  = tradeResult.price;
   result.executed_volume = volume;
   result.retcode         = tradeResult.retcode;
   Print("[EdgeRelay] CLOSE success: Ticket=", posTicket,
         " Vol=", volume, " Price=", tradeResult.price);

   return result;
  }

//+------------------------------------------------------------------+
//| Execute PARTIAL_CLOSE signal                                      |
//+------------------------------------------------------------------+
ExecutionResult ExecutePartialClose(Signal &signal)
  {
   ExecutionResult result;
   result.signal_id = signal.signal_id;
   result.success   = false;

   //--- Find position
   ulong posTicket = FindPositionByMagic(signal.magic_number);
   if(posTicket == 0)
      posTicket = FindPositionByComment(COMMENT_PREFIX + IntegerToString(signal.ticket));

   if(posTicket == 0)
     {
      result.error_message = "Position not found for partial close.";
      Print("[EdgeRelay] PARTIAL_CLOSE failed: ", result.error_message);
      return result;
     }

   if(!PositionSelectByTicket(posTicket))
     {
      result.error_message = "Cannot select position: " + IntegerToString((long)posTicket);
      return result;
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
      result.error_message = "Invalid partial close volume";
      return result;
     }

   ENUM_ORDER_TYPE closeType = (posType == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
   double price = (closeType == ORDER_TYPE_SELL)
                  ? SymbolInfoDouble(symbol, SYMBOL_BID)
                  : SymbolInfoDouble(symbol, SYMBOL_ASK);

   MqlTradeRequest request = {};
   MqlTradeResult  tradeResult = {};

   request.action    = TRADE_ACTION_DEAL;
   request.position  = posTicket;
   request.symbol    = symbol;
   request.volume    = closeVol;
   request.type      = closeType;
   request.price     = price;
   request.deviation = (ulong)MaxSlippagePoints;
   request.type_filling = ORDER_FILLING_IOC;

   if(!OrderSend(request, tradeResult))
     {
      result.error_message = "Partial close failed: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      return result;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE)
     {
      result.error_message = "Partial close retcode: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      return result;
     }

   result.success         = true;
   result.ticket          = posTicket;
   result.executed_price  = tradeResult.price;
   result.executed_volume = closeVol;
   result.retcode         = tradeResult.retcode;
   Print("[EdgeRelay] PARTIAL_CLOSE success: Ticket=", posTicket,
         " ClosedVol=", closeVol, " Remaining=", currentVolume - closeVol);

   return result;
  }

//+------------------------------------------------------------------+
//| Execute PENDING order signal                                      |
//+------------------------------------------------------------------+
ExecutionResult ExecutePending(Signal &signal, double lot, const string &comment)
  {
   ExecutionResult result;
   result.signal_id = signal.signal_id;
   result.success   = false;

   lot = NormalizeLot(signal.symbol, lot);
   if(lot <= 0.0)
     {
      result.error_message = "Invalid lot for pending order";
      return result;
     }

   int digits = (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS);

   MqlTradeRequest request = {};
   MqlTradeResult  tradeResult = {};

   request.action       = TRADE_ACTION_PENDING;
   request.symbol       = signal.symbol;
   request.volume       = lot;
   request.type         = signal.order_type;
   request.price        = NormalizeDouble(signal.price, digits);
   request.sl           = NormalizeDouble(signal.sl, digits);
   request.tp           = NormalizeDouble(signal.tp, digits);
   request.magic        = (ulong)signal.magic_number;
   request.comment      = comment;
   request.type_filling = ORDER_FILLING_IOC;

   if(!OrderSend(request, tradeResult))
     {
      result.error_message = "Pending OrderSend failed: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      Print("[EdgeRelay] PENDING failed: ", result.error_message);
      return result;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE && tradeResult.retcode != TRADE_RETCODE_PLACED)
     {
      result.error_message = "Pending retcode: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      return result;
     }

   result.success = true;
   result.ticket  = tradeResult.order;
   result.retcode = tradeResult.retcode;
   Print("[EdgeRelay] PENDING success: Order=", result.ticket,
         " Type=", OrderTypeToString(signal.order_type),
         " Price=", signal.price, " Lot=", lot);

   return result;
  }

//+------------------------------------------------------------------+
//| Execute CANCEL_PENDING signal                                     |
//+------------------------------------------------------------------+
ExecutionResult ExecuteCancelPending(Signal &signal)
  {
   ExecutionResult result;
   result.signal_id = signal.signal_id;
   result.success   = false;

   //--- Find the pending order by magic or comment
   ulong orderTicket = FindPendingOrderByMagic(signal.magic_number);
   if(orderTicket == 0)
      orderTicket = FindPendingOrderByComment(COMMENT_PREFIX + IntegerToString(signal.ticket));

   if(orderTicket == 0)
     {
      result.error_message = "Pending order not found for cancel.";
      Print("[EdgeRelay] CANCEL_PENDING failed: ", result.error_message);
      return result;
     }

   MqlTradeRequest request = {};
   MqlTradeResult  tradeResult = {};

   request.action = TRADE_ACTION_REMOVE;
   request.order  = orderTicket;

   if(!OrderSend(request, tradeResult))
     {
      result.error_message = "Cancel pending failed: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      return result;
     }

   if(tradeResult.retcode != TRADE_RETCODE_DONE)
     {
      result.error_message = "Cancel retcode: " + IntegerToString(tradeResult.retcode);
      result.retcode       = tradeResult.retcode;
      return result;
     }

   result.success = true;
   result.ticket  = orderTicket;
   result.retcode = tradeResult.retcode;
   Print("[EdgeRelay] CANCEL_PENDING success: Order=", orderTicket);

   return result;
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
   StringToCharArray(body, postData, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove null terminator from char array for WebRequest
   int dataLen = ArraySize(postData);
   if(dataLen > 0 && postData[dataLen - 1] == 0)
      ArrayResize(postData, dataLen - 1);

   char resultData[];
   string resultHeaders;

   //--- Fire and forget — log errors but don't block
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
double NormalizeLot(const string &symbol, double lot)
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
//| Invert order type (buy↔sell)                                     |
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
ulong FindPositionByComment(const string &tag)
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
ulong FindPendingOrderByComment(const string &tag)
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
//| Display panel — Initialization                                    |
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

   CreateLabel(prefix + "title",    15, 30,  "EdgeRelay Follower", clrDodgerBlue, 10);
   CreateLabel(prefix + "status",   15, 50,  "Status: Connecting...", clrYellow, 9);
   CreateLabel(prefix + "master",   15, 70,  "Master: " + MasterAccountID, clrWhite, 9);
   CreateLabel(prefix + "lotmode",  15, 90,  "LotMode: " + EnumToString(LotMode), clrWhite, 9);
   CreateLabel(prefix + "signals",  15, 110, "Signals: 0 | Failed: 0", clrWhite, 9);
   CreateLabel(prefix + "equity",   15, 130, "Equity: " + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2), clrWhite, 9);
   CreateLabel(prefix + "drawdown", 15, 150, "Drawdown: 0.00%", clrWhite, 9);
   CreateLabel(prefix + "poll",     15, 170, "Poll: " + IntegerToString(PollIntervalMs) + "ms", clrGray, 8);

   ChartRedraw();
  }

//+------------------------------------------------------------------+
//| Create a text label on chart                                      |
//+------------------------------------------------------------------+
void CreateLabel(const string &name, int x, int y, const string &text, color clr, int fontSize)
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
//| OnTick — not used, polling is timer-based                         |
//+------------------------------------------------------------------+
void OnTick()
  {
   // No action — all polling handled in OnTimer
  }
//+------------------------------------------------------------------+
