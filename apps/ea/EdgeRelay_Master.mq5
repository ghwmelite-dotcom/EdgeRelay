//+------------------------------------------------------------------+
//|                                         EdgeRelay_Master.mq5     |
//|                          EdgeRelay Master EA - Trade Sender      |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property version   "1.00"
#property description "EdgeRelay Master EA - sends trade signals to the EdgeRelay relay server."
#property strict

//--- Includes
#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Crypto.mqh>
#include <EdgeRelay_Http.mqh>
#include <EdgeRelay_Queue.mqh>
#include <EdgeRelay_Display.mqh>
#include <EdgeRelay_JournalSync.mqh>
#include <EdgeRelay_JournalQueue.mqh>

//+------------------------------------------------------------------+
//| Input parameters                                                  |
//+------------------------------------------------------------------+
input string API_Key             = "";                                  // API Key
input string API_Secret          = "";                                  // API Secret
input string API_Endpoint        = "https://edgerelay-signal-ingestion.ghwmelite.workers.dev";  // API Endpoint URL
input string AccountID           = "";                                  // Account ID
input int    HeartbeatIntervalMs = 5000;                                // Heartbeat interval (ms)
input bool   CopyBuys            = true;                                // Copy BUY trades
input bool   CopySells           = true;                                // Copy SELL trades
input string SymbolFilter        = "";                                  // Symbol filter (empty = all)
input double MinLotFilter        = 0.0;                                 // Minimum lot filter
input bool   CopyPendings        = true;                                // Copy pending orders
input bool   CopyModifications   = true;                                // Copy trade modifications
input bool   CopyCloses          = true;                                // Copy trade closes

//--- Journal sync settings
input bool   EnableJournal       = false;                                         // Enable trade journaling
input string JournalEndpoint     = "https://edgerelay-journal-sync.ghwmelite.workers.dev"; // Journal endpoint

//--- Global variables
CSignalQueue     g_queue;
CEdgeRelayDisplay g_display;
CJournalQueue  g_journalQueue;
ulong          g_journalSyncedDeals[];
int            g_journalSyncedCount = 0;

int              g_sequenceNum     = 0;
int              g_signalsSentToday = 0;
double           g_lastLatencyMs   = -1.0;
datetime         g_lastSignalTime  = 0;
ENUM_CONNECTION_STATUS g_connStatus = STATUS_DISCONNECTED;
datetime         g_lastDay         = 0;

//--- GlobalVariable name for sequence_num persistence
string           g_gvSeqName       = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
  {
   //--- Validate inputs
   if(StringLen(API_Key) == 0)
     {
      Alert("[EdgeRelay] API_Key is required.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(StringLen(API_Secret) == 0)
     {
      Alert("[EdgeRelay] API_Secret is required.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(StringLen(AccountID) == 0)
     {
      Alert("[EdgeRelay] AccountID is required.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(StringLen(API_Endpoint) == 0)
     {
      Alert("[EdgeRelay] API_Endpoint is required.");
      return INIT_PARAMETERS_INCORRECT;
     }

   //--- Initialize display
   g_display.Init();

   //--- Initialize queue
   string queueFile = "EdgeRelay_Queue_" + AccountID + ".txt";
   g_queue.Init(queueFile);

   //--- Restore sequence_num from GlobalVariable for crash recovery
   g_gvSeqName = "EdgeRelay_SeqNum_" + AccountID;
   if(GlobalVariableCheck(g_gvSeqName))
     {
      g_sequenceNum = (int)GlobalVariableGet(g_gvSeqName);
      PrintFormat("[EdgeRelay] Restored sequence_num: %d", g_sequenceNum);
     }
   else
     {
      g_sequenceNum = 0;
      GlobalVariableSet(g_gvSeqName, 0);
     }

   //--- Reset daily counter
   g_lastDay = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   g_signalsSentToday = 0;

   //--- Set timer for heartbeat
   int timerMs = MathMax(HeartbeatIntervalMs, 1000);
   if(!EventSetMillisecondTimer(timerMs))
     {
      PrintFormat("[EdgeRelay] Failed to set timer: %d", GetLastError());
      EventSetTimer(MathMax(timerMs / 1000, 1));
     }

   //--- Initial connection check and heartbeat
   g_connStatus = STATUS_CONNECTING;
   g_display.Update(g_connStatus, g_signalsSentToday, g_queue.Count(), g_lastLatencyMs, g_lastSignalTime);

   if(IsServerReachable(API_Endpoint))
     {
      int hbResult = SendHeartbeat(API_Endpoint, API_Key, AccountID, API_Secret);
      g_connStatus = (hbResult == 200 || hbResult == 201) ? STATUS_CONNECTED : STATUS_ERROR;
     }
   else
     {
      g_connStatus = STATUS_DISCONNECTED;
     }

   g_display.Update(g_connStatus, g_signalsSentToday, g_queue.Count(), g_lastLatencyMs, g_lastSignalTime);

   //--- Initialize journal if enabled
   if(EnableJournal)
     {
      string jQueueFile = "JournalSync_Queue_" + AccountID + ".txt";
      g_journalQueue.Init(jQueueFile);
      PrintFormat("[EdgeRelay] Journal sync enabled. Endpoint: %s", JournalEndpoint);
     }

   PrintFormat("[EdgeRelay] Master EA initialized. Account: %s, Endpoint: %s", AccountID, API_Endpoint);
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   //--- Flush remaining queue
   if(!g_queue.IsEmpty())
     {
      PrintFormat("[EdgeRelay] Flushing queue on shutdown (%d signals)...", g_queue.Count());
      g_queue.Flush(API_Endpoint, API_Key);
     }

   //--- Persist sequence_num
   GlobalVariableSet(g_gvSeqName, (double)g_sequenceNum);

   //--- Clean up timer and display
   EventKillTimer();
   g_display.Deinit();

   Print("[EdgeRelay] Master EA deinitialized.");
  }

//+------------------------------------------------------------------+
//| Timer event handler                                               |
//+------------------------------------------------------------------+
void OnTimer()
  {
   //--- Reset daily counter at day change
   datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   if(today != g_lastDay)
     {
      g_lastDay = today;
      g_signalsSentToday = 0;
     }

   //--- Send heartbeat
   uint startTick = GetTickCount();
   int hbResult = SendHeartbeat(API_Endpoint, API_Key, AccountID, API_Secret);
   uint elapsed = GetTickCount() - startTick;

   if(hbResult == 200 || hbResult == 201)
     {
      g_connStatus = STATUS_CONNECTED;
      g_lastLatencyMs = (double)elapsed;
     }
   else if(hbResult == -1)
     {
      g_connStatus = STATUS_DISCONNECTED;
     }
   else
     {
      g_connStatus = STATUS_ERROR;
      PrintFormat("[EdgeRelay] Heartbeat returned HTTP %d", hbResult);
     }

   //--- Attempt to flush queue if not empty
   if(!g_queue.IsEmpty() && g_connStatus == STATUS_CONNECTED)
      g_queue.Flush(API_Endpoint, API_Key);

   //--- Flush journal queue if enabled
   if(EnableJournal && !g_journalQueue.IsEmpty() && g_connStatus == STATUS_CONNECTED)
      g_journalQueue.Flush(JournalEndpoint, API_Key, API_Secret, AccountID);

   //--- Persist sequence_num periodically
   GlobalVariableSet(g_gvSeqName, (double)g_sequenceNum);

   //--- Update display
   g_display.Update(g_connStatus, g_signalsSentToday, g_queue.Count(), g_lastLatencyMs, g_lastSignalTime);
  }

//+------------------------------------------------------------------+
//| Check if a symbol passes the symbol filter                        |
//+------------------------------------------------------------------+
bool PassesSymbolFilter(string sym)
  {
   if(StringLen(SymbolFilter) == 0)
      return true;

   //--- Support comma-separated symbol list
   string filters[];
   int count = StringSplit(SymbolFilter, ',', filters);

   for(int i = 0; i < count; i++)
     {
      string f = filters[i];
      StringTrimLeft(f);
      StringTrimRight(f);
      if(StringLen(f) > 0 && StringFind(sym, f) >= 0)
         return true;
     }

   return false;
  }

//+------------------------------------------------------------------+
//| Check if an order type passes the direction filter                |
//+------------------------------------------------------------------+
bool PassesDirectionFilter(ENUM_ORDER_TYPE orderType)
  {
   switch(orderType)
     {
      case ORDER_TYPE_BUY:
      case ORDER_TYPE_BUY_LIMIT:
      case ORDER_TYPE_BUY_STOP:
      case ORDER_TYPE_BUY_STOP_LIMIT:
         return CopyBuys;

      case ORDER_TYPE_SELL:
      case ORDER_TYPE_SELL_LIMIT:
      case ORDER_TYPE_SELL_STOP:
      case ORDER_TYPE_SELL_STOP_LIMIT:
         return CopySells;
     }
   return true;
  }

//+------------------------------------------------------------------+
//| Check if an order type is a pending order                         |
//+------------------------------------------------------------------+
bool IsPendingOrderType(ENUM_ORDER_TYPE orderType)
  {
   return (orderType == ORDER_TYPE_BUY_LIMIT  ||
           orderType == ORDER_TYPE_SELL_LIMIT  ||
           orderType == ORDER_TYPE_BUY_STOP    ||
           orderType == ORDER_TYPE_SELL_STOP   ||
           orderType == ORDER_TYPE_BUY_STOP_LIMIT ||
           orderType == ORDER_TYPE_SELL_STOP_LIMIT);
  }

//+------------------------------------------------------------------+
//| Build, sign, and dispatch a signal                                |
//+------------------------------------------------------------------+
void DispatchSignal(Signal &signal)
  {
   //--- Set common fields
   signal.account_id = AccountID;
   signal.timestamp  = TimeCurrent();
   signal.sequence_num = ++g_sequenceNum;
   signal.signal_id  = GenerateSignalId(AccountID, g_sequenceNum);

   //--- Sign the signal
   signal.hmac_signature = SignPayload(signal, API_Secret);

   //--- Attempt to send
   uint startTick = GetTickCount();
   int httpCode = SendSignal(API_Endpoint, API_Key, signal);
   uint elapsed = GetTickCount() - startTick;

   if(httpCode == 200 || httpCode == 201)
     {
      g_connStatus = STATUS_CONNECTED;
      g_lastLatencyMs = (double)elapsed;
      g_lastSignalTime = TimeCurrent();
      g_signalsSentToday++;

      PrintFormat("[EdgeRelay] Signal sent: %s %s %s vol=%.2f (seq=%d, %dms)",
                  ActionToString(signal.action),
                  OrderTypeToStr(signal.order_type),
                  signal.symbol,
                  signal.volume,
                  signal.sequence_num,
                  elapsed);
     }
   else
     {
      //--- Enqueue on failure
      if(httpCode == -1)
         g_connStatus = STATUS_DISCONNECTED;
      else
         g_connStatus = STATUS_ERROR;

      g_queue.Enqueue(signal);
      PrintFormat("[EdgeRelay] Signal queued (HTTP %d): %s %s %s",
                  httpCode,
                  ActionToString(signal.action),
                  OrderTypeToStr(signal.order_type),
                  signal.symbol);
     }

   //--- Persist sequence_num
   GlobalVariableSet(g_gvSeqName, (double)g_sequenceNum);

   //--- Update display
   g_display.Update(g_connStatus, g_signalsSentToday, g_queue.Count(), g_lastLatencyMs, g_lastSignalTime);
  }

//+------------------------------------------------------------------+
//| TradeTransaction event handler                                    |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   //--- We process TRADE_TRANSACTION_DEAL_ADD for position opens/closes
   //--- and TRADE_TRANSACTION_ORDER_ADD for pending orders
   //--- and TRADE_TRANSACTION_POSITION for modifications

   Signal signal;
   signal.magic_number = 0;
   signal.ticket = 0;
   signal.volume = 0;
   signal.price = 0;
   signal.sl = 0;
   signal.tp = 0;
   signal.symbol = "";
   signal.comment = "";
   signal.order_type = ORDER_TYPE_BUY;
   signal.action = SIGNAL_OPEN;

   //--- Handle deal additions (position open, close, partial close)
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
     {
      //--- Get deal info
      ulong dealTicket = trans.deal;
      if(dealTicket == 0)
         return;

      if(!HistoryDealSelect(dealTicket))
         return;

      ENUM_DEAL_TYPE dealType  = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

      //--- Only process buy/sell deals
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         return;

      string sym     = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double vol     = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double dealPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      long   magic   = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
      long   posId   = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      string dealComment = HistoryDealGetString(dealTicket, DEAL_COMMENT);

      //--- Apply filters
      if(!PassesSymbolFilter(sym))
         return;
      if(vol < MinLotFilter)
         return;

      //--- Map deal type to order type
      ENUM_ORDER_TYPE ordType = (dealType == DEAL_TYPE_BUY) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;

      if(!PassesDirectionFilter(ordType))
         return;

      signal.symbol       = sym;
      signal.volume       = vol;
      signal.price        = dealPrice;
      signal.magic_number = magic;
      signal.ticket       = (long)posId;
      signal.comment      = dealComment;
      signal.order_type   = ordType;

      //--- Determine action based on deal entry
      if(dealEntry == DEAL_ENTRY_IN)
        {
         //--- New position opened
         signal.action = SIGNAL_OPEN;

         //--- Try to get SL/TP from the position
         if(PositionSelectByTicket((ulong)posId))
           {
            signal.sl = PositionGetDouble(POSITION_SL);
            signal.tp = PositionGetDouble(POSITION_TP);
           }
        }
      else if(dealEntry == DEAL_ENTRY_OUT)
        {
         //--- Position closed (full or partial)
         if(!CopyCloses)
            return;

         //--- Check if this is a partial close by seeing if position still exists
         if(PositionSelectByTicket((ulong)posId))
           {
            signal.action = SIGNAL_PARTIAL_CLOSE;
            signal.sl = PositionGetDouble(POSITION_SL);
            signal.tp = PositionGetDouble(POSITION_TP);
           }
         else
           {
            signal.action = SIGNAL_CLOSE;
           }
        }
      else if(dealEntry == DEAL_ENTRY_INOUT)
        {
         //--- Close-and-reverse: treat as close followed by open
         if(!CopyCloses)
            return;
         signal.action = SIGNAL_CLOSE;
        }
      else
        {
         return; // DEAL_ENTRY_STATE or unknown
        }

      DispatchSignal(signal);

      //--- Journal capture (if enabled)
      if(EnableJournal)
        {
         ulong jDeal = trans.deal;
         if(jDeal != 0)
           {
            bool jAlreadySynced = false;
            for(int ji = 0; ji < g_journalSyncedCount; ji++)
               if(g_journalSyncedDeals[ji] == jDeal) { jAlreadySynced = true; break; }

            if(!jAlreadySynced)
              {
               JournalTrade jTrade;
               if(CaptureDeal(jDeal, jTrade))
                 {
                  g_journalQueue.Enqueue(jTrade);
                  ArrayResize(g_journalSyncedDeals, g_journalSyncedCount + 1);
                  g_journalSyncedDeals[g_journalSyncedCount] = jDeal;
                  g_journalSyncedCount++;
                 }
              }
           }
        }

      return;
     }

   //--- Handle pending order placement
   if(trans.type == TRADE_TRANSACTION_ORDER_ADD)
     {
      if(!CopyPendings)
         return;

      ulong orderTicket = trans.order;
      if(orderTicket == 0)
         return;

      //--- Check if this is a pending order (not a market order)
      ENUM_ORDER_TYPE ordType = trans.order_type;
      if(!IsPendingOrderType(ordType))
         return;

      string sym = trans.symbol;
      if(!PassesSymbolFilter(sym))
         return;
      if(!PassesDirectionFilter(ordType))
         return;

      signal.symbol     = sym;
      signal.order_type = ordType;
      signal.volume     = trans.volume;
      signal.price      = trans.price;
      signal.sl         = trans.price_sl;
      signal.tp         = trans.price_tp;
      signal.ticket     = (long)orderTicket;
      signal.action     = SIGNAL_PENDING;

      if(signal.volume < MinLotFilter)
         return;

      DispatchSignal(signal);
      return;
     }

   //--- Handle position modification (SL/TP changes)
   if(trans.type == TRADE_TRANSACTION_POSITION)
     {
      if(!CopyModifications)
         return;

      ulong posTicket = trans.position;
      if(posTicket == 0)
         return;

      string sym = trans.symbol;
      if(!PassesSymbolFilter(sym))
         return;

      //--- Get current position details
      if(!PositionSelectByTicket(posTicket))
         return;

      ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      ENUM_ORDER_TYPE ordType = (posType == POSITION_TYPE_BUY) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;

      if(!PassesDirectionFilter(ordType))
         return;

      signal.symbol       = sym;
      signal.order_type   = ordType;
      signal.volume       = PositionGetDouble(POSITION_VOLUME);
      signal.price        = PositionGetDouble(POSITION_PRICE_OPEN);
      signal.sl           = trans.price_sl;
      signal.tp           = trans.price_tp;
      signal.magic_number = PositionGetInteger(POSITION_MAGIC);
      signal.ticket       = (long)posTicket;
      signal.action       = SIGNAL_MODIFY;

      DispatchSignal(signal);
      return;
     }

   //--- Handle pending order deletion
   if(trans.type == TRADE_TRANSACTION_ORDER_DELETE)
     {
      if(!CopyPendings)
         return;

      ulong orderTicket = trans.order;
      if(orderTicket == 0)
         return;

      //--- Only cancel if this was a pending order that was removed (not filled)
      ENUM_ORDER_TYPE ordType = trans.order_type;
      if(!IsPendingOrderType(ordType))
         return;

      string sym = trans.symbol;
      if(!PassesSymbolFilter(sym))
         return;
      if(!PassesDirectionFilter(ordType))
         return;

      signal.symbol     = sym;
      signal.order_type = ordType;
      signal.volume     = trans.volume;
      signal.price      = trans.price;
      signal.ticket     = (long)orderTicket;
      signal.action     = SIGNAL_CANCEL_PENDING;

      DispatchSignal(signal);
      return;
     }
  }

//+------------------------------------------------------------------+
//| Tick handler - not used for trade detection, but can be used      |
//| for additional monitoring if needed                               |
//+------------------------------------------------------------------+
void OnTick()
  {
   // Trade detection is handled by OnTradeTransaction.
   // OnTick is reserved for future use (e.g., price-based alerts).
  }
//+------------------------------------------------------------------+
