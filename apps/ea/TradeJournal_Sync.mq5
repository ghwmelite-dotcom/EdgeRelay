//+------------------------------------------------------------------+
//|                                        TradeJournal_Sync.mq5     |
//|                    EdgeRelay — Zero-Drop Trade Journal Sync       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property version   "1.00"
#property description "Syncs every trade to your EdgeRelay journal — zero drops guaranteed."
#property strict

#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Crypto.mqh>
#include <EdgeRelay_Http.mqh>
#include <EdgeRelay_JournalSync.mqh>
#include <EdgeRelay_JournalQueue.mqh>

//+------------------------------------------------------------------+
//| Input parameters                                                  |
//+------------------------------------------------------------------+
input string API_Key             = "";                                           // API Key
input string API_Secret          = "";                                           // API Secret
input string API_Endpoint        = "https://edgerelay-journal-sync.ghwmelite.workers.dev"; // Journal Endpoint
input string AccountID           = "";                                           // Account ID
input int    SyncIntervalSeconds = 60;                                           // History scan interval (s)
input int    HeartbeatIntervalMs = 30000;                                        // Heartbeat interval (ms)

//--- Global variables
CJournalQueue  g_journalQueue;
ENUM_CONNECTION_STATUS g_connStatus = STATUS_DISCONNECTED;

//--- Synced deal tracking
ulong          g_syncedDeals[];
int            g_syncedCount = 0;
string         g_gvLastDeal = "";
datetime       g_lastHistoryScan = 0;

//+------------------------------------------------------------------+
//| Check if a deal ticket has already been synced                    |
//+------------------------------------------------------------------+
bool IsDealSynced(ulong dealTicket)
  {
   for(int i = 0; i < g_syncedCount; i++)
      if(g_syncedDeals[i] == dealTicket)
         return true;
   return false;
  }

//+------------------------------------------------------------------+
//| Mark a deal ticket as synced                                      |
//+------------------------------------------------------------------+
void MarkDealSynced(ulong dealTicket)
  {
   ArrayResize(g_syncedDeals, g_syncedCount + 1);
   g_syncedDeals[g_syncedCount] = dealTicket;
   g_syncedCount++;
  }

//+------------------------------------------------------------------+
//| Expert initialization                                             |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(StringLen(API_Key) == 0 || StringLen(API_Secret) == 0 || StringLen(AccountID) == 0)
     {
      Alert("[Journal] API_Key, API_Secret, and AccountID are required.");
      return INIT_PARAMETERS_INCORRECT;
     }

   //--- Initialize queue
   string queueFile = "JournalSync_Queue_" + AccountID + ".txt";
   g_journalQueue.Init(queueFile);

   //--- Restore last synced deal from GlobalVariable
   g_gvLastDeal = "JournalSync_LastDeal_" + AccountID;

   //--- Set timer (use the shorter of heartbeat and sync interval)
   int timerMs = MathMin(HeartbeatIntervalMs, SyncIntervalSeconds * 1000);
   timerMs = MathMax(timerMs, 1000);
   if(!EventSetMillisecondTimer(timerMs))
      EventSetTimer(MathMax(timerMs / 1000, 1));

   //--- Initial heartbeat
   g_connStatus = STATUS_CONNECTING;
   if(IsServerReachable(API_Endpoint))
     {
      int hbResult = SendJournalHeartbeat(API_Endpoint, API_Key, AccountID, API_Secret);
      g_connStatus = (hbResult == 200 || hbResult == 201) ? STATUS_CONNECTED : STATUS_ERROR;
     }
   else
      g_connStatus = STATUS_DISCONNECTED;

   //--- Initial history scan
   g_lastHistoryScan = TimeCurrent();
   ScanHistory();

   PrintFormat("[Journal] TradeJournal_Sync initialized. Account=%s Endpoint=%s", AccountID, API_Endpoint);
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| Expert deinitialization                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   //--- Flush remaining queue
   if(!g_journalQueue.IsEmpty())
     {
      PrintFormat("[Journal] Flushing queue on shutdown (%d trades)...", g_journalQueue.Count());
      g_journalQueue.Flush(API_Endpoint, API_Key, API_Secret, AccountID);
     }

   EventKillTimer();
   Print("[Journal] TradeJournal_Sync deinitialized.");
  }

//+------------------------------------------------------------------+
//| Process a deal — capture, enrich, queue                           |
//+------------------------------------------------------------------+
void ProcessDeal(ulong dealTicket)
  {
   if(IsDealSynced(dealTicket))
      return;

   JournalTrade trade;
   if(!CaptureDeal(dealTicket, trade))
      return;

   g_journalQueue.Enqueue(trade);
   MarkDealSynced(dealTicket);
  }

//+------------------------------------------------------------------+
//| Real-time trade detection                                         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;

   ulong dealTicket = trans.deal;
   if(dealTicket == 0)
      return;

   ProcessDeal(dealTicket);
  }

//+------------------------------------------------------------------+
//| History scan catch-up                                             |
//+------------------------------------------------------------------+
void ScanHistory()
  {
   //--- Select history for the last 7 days (covers any missed deals)
   datetime from = TimeCurrent() - 7 * 24 * 60 * 60;
   datetime to = TimeCurrent();
   if(!HistorySelect(from, to))
      return;

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;

      //--- Only BUY/SELL deals
      ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         continue;

      ProcessDeal(dealTicket);
     }

   g_lastHistoryScan = TimeCurrent();
  }

//+------------------------------------------------------------------+
//| Timer handler                                                     |
//+------------------------------------------------------------------+
void OnTimer()
  {
   //--- Heartbeat
   static datetime lastHeartbeat = 0;
   if((TimeCurrent() - lastHeartbeat) >= HeartbeatIntervalMs / 1000)
     {
      int hbResult = SendJournalHeartbeat(API_Endpoint, API_Key, AccountID, API_Secret);
      g_connStatus = (hbResult == 200 || hbResult == 201) ? STATUS_CONNECTED : STATUS_ERROR;
      lastHeartbeat = TimeCurrent();
     }

   //--- History scan catch-up
   if((TimeCurrent() - g_lastHistoryScan) >= SyncIntervalSeconds)
      ScanHistory();

   //--- Flush queue
   if(!g_journalQueue.IsEmpty() && g_connStatus == STATUS_CONNECTED)
      g_journalQueue.Flush(API_Endpoint, API_Key, API_Secret, AccountID);
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   // Trade detection is handled by OnTradeTransaction.
  }
//+------------------------------------------------------------------+
