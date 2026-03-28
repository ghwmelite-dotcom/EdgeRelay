//+------------------------------------------------------------------+
//| TradeMetrics Integration Block                                    |
//| Injected into every Strategy Hub EA at {{TRADEMETRICS_BLOCK}}     |
//| All globals: g_tm_*   All functions: TM_*                         |
//+------------------------------------------------------------------+

//--- TradeMetrics global state
CSignalQueue     g_tm_queue;
CJournalQueue    g_tm_journalQueue;
ulong            g_tm_journalSyncedDeals[];
int              g_tm_journalSyncedCount   = 0;
int              g_tm_sequenceNum           = 0;
int              g_tm_signalsSentToday      = 0;
double           g_tm_lastLatencyMs         = -1.0;
datetime         g_tm_lastSignalTime        = 0;
ENUM_CONNECTION_STATUS g_tm_connStatus      = STATUS_DISCONNECTED;
datetime         g_tm_lastDay               = 0;
string           g_tm_gvSeqName             = "";

//--- Risk management state
double           g_tm_dailyPnl              = 0.0;
double           g_tm_dailyStartBalance     = 0.0;
int              g_tm_consecutiveLosses     = 0;
datetime         g_tm_lastBarTime           = 0;

//+------------------------------------------------------------------+
//| TM_OnInit — call from your OnInit()                               |
//+------------------------------------------------------------------+
int TM_OnInit()
  {
   //--- Validate required inputs
   if(StringLen(API_Key) == 0 || StringLen(API_Secret) == 0 || StringLen(AccountID) == 0)
     {
      Alert("[TradeMetrics] API_Key, API_Secret, and AccountID are required.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(StringLen(API_Endpoint) == 0)
     {
      Alert("[TradeMetrics] API_Endpoint is required.");
      return INIT_PARAMETERS_INCORRECT;
     }

   //--- Initialize signal queue
   string queueFile = "TM_Queue_" + AccountID + ".txt";
   g_tm_queue.Init(queueFile);

   //--- Initialize journal queue if enabled
   if(EnableJournal)
     {
      string jQueueFile = "TM_Journal_" + AccountID + ".txt";
      g_tm_journalQueue.Init(jQueueFile);
      PrintFormat("[TradeMetrics] Journal sync enabled. Endpoint: %s", JournalEndpoint);
     }

   //--- Restore sequence number for crash recovery
   g_tm_gvSeqName = "TM_SeqNum_" + AccountID;
   if(GlobalVariableCheck(g_tm_gvSeqName))
      g_tm_sequenceNum = (int)GlobalVariableGet(g_tm_gvSeqName);
   else
     {
      g_tm_sequenceNum = 0;
      GlobalVariableSet(g_tm_gvSeqName, 0);
     }

   //--- Initialize daily tracking
   g_tm_lastDay = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   g_tm_dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_tm_dailyPnl = 0.0;
   g_tm_signalsSentToday = 0;
   g_tm_consecutiveLosses = 0;

   //--- Set 5-second heartbeat timer
   if(!EventSetMillisecondTimer(5000))
     {
      PrintFormat("[TradeMetrics] Failed to set millisecond timer, falling back to 5s timer");
      EventSetTimer(5);
     }

   //--- Initial heartbeat
   g_tm_connStatus = STATUS_CONNECTING;
   if(IsServerReachable(API_Endpoint))
     {
      int hbResult = SendHeartbeat(API_Endpoint, API_Key, AccountID, API_Secret);
      g_tm_connStatus = (hbResult == 200 || hbResult == 201) ? STATUS_CONNECTED : STATUS_ERROR;
     }
   else
      g_tm_connStatus = STATUS_DISCONNECTED;

   PrintFormat("[TradeMetrics] Initialized. Account: %s, Endpoint: %s", AccountID, API_Endpoint);
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| TM_OnDeinit — call from your OnDeinit()                           |
//+------------------------------------------------------------------+
void TM_OnDeinit(const int reason)
  {
   //--- Flush remaining signals
   if(!g_tm_queue.IsEmpty())
     {
      PrintFormat("[TradeMetrics] Flushing queue on shutdown (%d signals)...", g_tm_queue.Count());
      g_tm_queue.Flush(API_Endpoint, API_Key);
     }

   //--- Persist sequence number
   GlobalVariableSet(g_tm_gvSeqName, (double)g_tm_sequenceNum);

   //--- Clean up timer
   EventKillTimer();

   Print("[TradeMetrics] Deinitialized.");
  }

//+------------------------------------------------------------------+
//| TM_OnTick — call from your OnTick()                               |
//| Handles heartbeat, queue flush, and daily reset                   |
//+------------------------------------------------------------------+
void TM_OnTick()
  {
   //--- Day rollover: reset daily P&L and counters
   datetime today = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   if(today != g_tm_lastDay)
     {
      g_tm_lastDay = today;
      g_tm_dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      g_tm_dailyPnl = 0.0;
      g_tm_signalsSentToday = 0;
      g_tm_consecutiveLosses = 0;
     }

   //--- Flush signal queue if connected
   if(!g_tm_queue.IsEmpty() && g_tm_connStatus == STATUS_CONNECTED)
      g_tm_queue.Flush(API_Endpoint, API_Key);

   //--- Flush journal queue if enabled and connected
   if(EnableJournal && !g_tm_journalQueue.IsEmpty() && g_tm_connStatus == STATUS_CONNECTED)
      g_tm_journalQueue.Flush(JournalEndpoint, API_Key, API_Secret, AccountID);
  }

//+------------------------------------------------------------------+
//| OnTimer — heartbeat (called by MT5 runtime, NOT by strategy)      |
//+------------------------------------------------------------------+
void OnTimer()
  {
   //--- Send heartbeat
   uint startTick = GetTickCount();
   int hbResult = SendHeartbeat(API_Endpoint, API_Key, AccountID, API_Secret);
   uint elapsed = GetTickCount() - startTick;

   if(hbResult == 200 || hbResult == 201)
     {
      g_tm_connStatus = STATUS_CONNECTED;
      g_tm_lastLatencyMs = (double)elapsed;
     }
   else if(hbResult == -1)
      g_tm_connStatus = STATUS_DISCONNECTED;
   else
     {
      g_tm_connStatus = STATUS_ERROR;
      PrintFormat("[TradeMetrics] Heartbeat HTTP %d", hbResult);
     }

   //--- Flush queues on timer too (backup path)
   if(!g_tm_queue.IsEmpty() && g_tm_connStatus == STATUS_CONNECTED)
      g_tm_queue.Flush(API_Endpoint, API_Key);

   if(EnableJournal && !g_tm_journalQueue.IsEmpty() && g_tm_connStatus == STATUS_CONNECTED)
      g_tm_journalQueue.Flush(JournalEndpoint, API_Key, API_Secret, AccountID);

   //--- Journal heartbeat
   if(EnableJournal && g_tm_connStatus == STATUS_CONNECTED)
      SendJournalHeartbeat(JournalEndpoint, API_Key, AccountID, API_Secret);

   //--- Persist sequence number periodically
   GlobalVariableSet(g_tm_gvSeqName, (double)g_tm_sequenceNum);
  }

//+------------------------------------------------------------------+
//| TM_CanTrade — returns false if any risk gate blocks entry         |
//+------------------------------------------------------------------+
bool TM_CanTrade()
  {
   //--- Spread filter
   if(MaxSpreadPoints > 0)
     {
      double spread = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
      if(spread > MaxSpreadPoints)
        {
         PrintFormat("[TradeMetrics] Spread blocked: %.0f > %d points", spread, MaxSpreadPoints);
         return false;
        }
     }

   //--- Session filter
   if(UseSessionFilter)
     {
      MqlDateTime dt;
      TimeToStruct(TimeCurrent(), dt);
      int hour = dt.hour;

      if(SessionStartHour < SessionEndHour)
        {
         //--- Normal range: e.g. 8-17
         if(hour < SessionStartHour || hour >= SessionEndHour)
           {
            return false;
           }
        }
      else
        {
         //--- Overnight range: e.g. 22-6
         if(hour < SessionStartHour && hour >= SessionEndHour)
           {
            return false;
           }
        }
     }

   //--- Daily loss limit
   if(MaxDailyLossPercent > 0.0)
     {
      //--- Include floating P&L in daily loss calculation
      double floatingPnl = 0.0;
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetTicket(i) > 0 &&
            PositionGetInteger(POSITION_MAGIC) == MagicNumber)
           {
            floatingPnl += PositionGetDouble(POSITION_PROFIT)
                         + PositionGetDouble(POSITION_SWAP);
           }
        }

      double totalDailyLoss = g_tm_dailyPnl + floatingPnl;
      double lossPct = 0.0;
      if(g_tm_dailyStartBalance > 0)
         lossPct = (-totalDailyLoss / g_tm_dailyStartBalance) * 100.0;

      if(lossPct >= MaxDailyLossPercent)
        {
         PrintFormat("[TradeMetrics] Daily loss limit reached: %.2f%% >= %.2f%%",
                     lossPct, MaxDailyLossPercent);
         return false;
        }
     }

   //--- Consecutive loss limit
   if(ConsecutiveLossLimit > 0 && g_tm_consecutiveLosses >= ConsecutiveLossLimit)
     {
      PrintFormat("[TradeMetrics] Consecutive loss limit reached: %d >= %d",
                  g_tm_consecutiveLosses, ConsecutiveLossLimit);
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
//| TM_OnTradeOpened — queue signal after opening a trade             |
//+------------------------------------------------------------------+
void TM_OnTradeOpened(ulong ticket, string symbol, string direction,
                      double volume, double price, double sl, double tp)
  {
   Signal signal;
   signal.account_id     = AccountID;
   signal.timestamp      = TimeCurrent();
   signal.sequence_num   = ++g_tm_sequenceNum;
   signal.signal_id      = GenerateSignalId(AccountID, g_tm_sequenceNum);
   signal.action         = SIGNAL_OPEN;
   signal.order_type     = (direction == "buy") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   signal.symbol         = symbol;
   signal.volume         = volume;
   signal.price          = price;
   signal.sl             = sl;
   signal.tp             = tp;
   signal.magic_number   = MagicNumber;
   signal.ticket         = (long)ticket;
   signal.comment        = "";
   signal.hmac_signature = SignPayload(signal, API_Secret);

   //--- Attempt to send
   uint startTick = GetTickCount();
   int httpCode = SendSignal(API_Endpoint, API_Key, signal);
   uint elapsed = GetTickCount() - startTick;

   if(httpCode == 200 || httpCode == 201)
     {
      g_tm_connStatus = STATUS_CONNECTED;
      g_tm_lastLatencyMs = (double)elapsed;
      g_tm_lastSignalTime = TimeCurrent();
      g_tm_signalsSentToday++;
     }
   else
     {
      g_tm_connStatus = (httpCode == -1) ? STATUS_DISCONNECTED : STATUS_ERROR;
      g_tm_queue.Enqueue(signal);
     }

   GlobalVariableSet(g_tm_gvSeqName, (double)g_tm_sequenceNum);
  }

//+------------------------------------------------------------------+
//| TM_OnTradeClosed — update P&L tracking, consecutive losses,       |
//|                     and journal sync                               |
//+------------------------------------------------------------------+
void TM_OnTradeClosed(ulong ticket, double profit)
  {
   //--- Update daily P&L (realized)
   g_tm_dailyPnl += profit;

   //--- Update consecutive loss counter
   if(profit < 0.0)
      g_tm_consecutiveLosses++;
   else
      g_tm_consecutiveLosses = 0;

   //--- Send close signal
   Signal signal;
   signal.account_id     = AccountID;
   signal.timestamp      = TimeCurrent();
   signal.sequence_num   = ++g_tm_sequenceNum;
   signal.signal_id      = GenerateSignalId(AccountID, g_tm_sequenceNum);
   signal.action         = SIGNAL_CLOSE;
   signal.order_type     = ORDER_TYPE_BUY;  // Direction not critical for close
   signal.symbol         = _Symbol;
   signal.volume         = 0;
   signal.price          = 0;
   signal.sl             = 0;
   signal.tp             = 0;
   signal.magic_number   = MagicNumber;
   signal.ticket         = (long)ticket;
   signal.comment        = "";
   signal.hmac_signature = SignPayload(signal, API_Secret);

   uint startTick = GetTickCount();
   int httpCode = SendSignal(API_Endpoint, API_Key, signal);
   uint elapsed = GetTickCount() - startTick;

   if(httpCode == 200 || httpCode == 201)
     {
      g_tm_connStatus = STATUS_CONNECTED;
      g_tm_lastLatencyMs = (double)elapsed;
      g_tm_lastSignalTime = TimeCurrent();
      g_tm_signalsSentToday++;
     }
   else
     {
      g_tm_connStatus = (httpCode == -1) ? STATUS_DISCONNECTED : STATUS_ERROR;
      g_tm_queue.Enqueue(signal);
     }

   GlobalVariableSet(g_tm_gvSeqName, (double)g_tm_sequenceNum);

   //--- Journal capture (if enabled)
   if(EnableJournal)
     {
      HistorySelect(0, TimeCurrent());
      int totalDeals = HistoryDealsTotal();
      for(int i = totalDeals - 1; i >= MathMax(0, totalDeals - 10); i--)
        {
         ulong dealTicket = HistoryDealGetTicket(i);
         if(dealTicket == 0) continue;

         //--- Match by position ID
         ulong posId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
         if(posId != ticket) continue;

         ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         if(dealEntry != DEAL_ENTRY_OUT && dealEntry != DEAL_ENTRY_INOUT) continue;

         //--- Check if already synced
         bool alreadySynced = false;
         for(int j = 0; j < g_tm_journalSyncedCount; j++)
            if(g_tm_journalSyncedDeals[j] == dealTicket) { alreadySynced = true; break; }

         if(!alreadySynced)
           {
            JournalTrade jTrade;
            if(CaptureDeal(dealTicket, jTrade))
              {
               g_tm_journalQueue.Enqueue(jTrade);
               ArrayResize(g_tm_journalSyncedDeals, g_tm_journalSyncedCount + 1);
               g_tm_journalSyncedDeals[g_tm_journalSyncedCount] = dealTicket;
               g_tm_journalSyncedCount++;
              }
           }
         break;
        }
     }
  }

//+------------------------------------------------------------------+
//| TM_ManageOpenTrades — breakeven + trailing stop on open positions |
//+------------------------------------------------------------------+
void TM_ManageOpenTrades()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

      double entry = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl    = PositionGetDouble(POSITION_SL);
      double tp    = PositionGetDouble(POSITION_TP);
      long   type  = PositionGetInteger(POSITION_TYPE);
      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      double tick  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
      if(point == 0 || tick == 0) continue;

      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);

      //--- Calculate risk distance (entry to original SL)
      double riskDist = 0.0;
      if(sl != 0)
         riskDist = MathAbs(entry - sl);

      //--- Breakeven management
      if(BreakevenTriggerRR > 0.0 && riskDist > 0.0)
        {
         double pipsInProfit = 0.0;

         if(type == POSITION_TYPE_BUY)
            pipsInProfit = bid - entry;
         else
            pipsInProfit = entry - ask;

         //--- Check if price has reached the trigger R:R
         if(pipsInProfit >= riskDist * BreakevenTriggerRR)
           {
            //--- Only move SL if it hasn't already been moved to breakeven
            double bePrice = entry + ((type == POSITION_TYPE_BUY) ? point : -point);
            bePrice = MathRound(bePrice / tick) * tick;

            bool shouldMove = false;
            if(type == POSITION_TYPE_BUY && sl < bePrice)
               shouldMove = true;
            else if(type == POSITION_TYPE_SELL && (sl > bePrice || sl == 0))
               shouldMove = true;

            if(shouldMove)
              {
               CTrade trade;
               trade.PositionModify(ticket, bePrice, tp);
              }
           }
        }

      //--- Trailing stop management
      if(TrailingStopPips > 0.0)
        {
         double trailDist = TrailingStopPips * 10.0 * point;  // Convert pips to points (5-digit)
         double newSl = 0.0;

         if(type == POSITION_TYPE_BUY)
           {
            newSl = bid - trailDist;
            newSl = MathRound(newSl / tick) * tick;
            //--- Only trail upward, and only if in profit
            if(newSl > sl && newSl > entry)
              {
               CTrade trade;
               trade.PositionModify(ticket, newSl, tp);
              }
           }
         else if(type == POSITION_TYPE_SELL)
           {
            newSl = ask + trailDist;
            newSl = MathRound(newSl / tick) * tick;
            //--- Only trail downward, and only if in profit
            if((newSl < sl || sl == 0) && newSl < entry)
              {
               CTrade trade;
               trade.PositionModify(ticket, newSl, tp);
              }
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| TM_IsNewBar — detect new bar on current chart timeframe           |
//+------------------------------------------------------------------+
bool TM_IsNewBar()
  {
   datetime currentBarTime = iTime(_Symbol, PERIOD_CURRENT, 0);
   if(currentBarTime != g_tm_lastBarTime)
     {
      g_tm_lastBarTime = currentBarTime;
      return true;
     }
   return false;
  }
//+------------------------------------------------------------------+
