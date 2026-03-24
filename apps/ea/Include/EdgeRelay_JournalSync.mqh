//+------------------------------------------------------------------+
//|                                      EdgeRelay_JournalSync.mqh   |
//|                 Shared journal sync logic: capture & enrichment   |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_JOURNAL_SYNC_MQH
#define EDGERELAY_JOURNAL_SYNC_MQH

#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Crypto.mqh>
#include <EdgeRelay_Http.mqh>

//+------------------------------------------------------------------+
//| Journal trade struct                                              |
//+------------------------------------------------------------------+
struct JournalTrade
  {
   ulong            deal_ticket;
   ulong            order_ticket;
   ulong            position_id;
   string           symbol;
   string           direction;      // "buy" or "sell"
   string           deal_entry;     // "in", "out", "inout"
   double           volume;
   double           price;
   double           sl;
   double           tp;
   datetime         time;
   double           profit;
   double           commission;
   double           swap;
   long             magic_number;
   string           comment;
   double           balance_at_trade;
   double           equity_at_trade;
   int              spread_at_entry;
   double           atr_at_entry;
   string           session_tag;    // "asian", "london", "new_york", "off_hours"
   int              duration_seconds;  // -1 = null
   double           pips;             // 0 with hasPips=false = null
   double           risk_reward_ratio; // 0 with hasRR=false = null
   bool             has_duration;
   bool             has_pips;
   bool             has_rr;
  };

//+------------------------------------------------------------------+
//| Determine session tag from hour (UTC)                             |
//+------------------------------------------------------------------+
string GetSessionTag(datetime tradeTime)
  {
   MqlDateTime dt;
   TimeToStruct(tradeTime, dt);
   int hour = dt.hour;

   // NY takes priority in 13-16 overlap with London
   if(hour >= 13 && hour < 21) return "new_york";
   if(hour >= 8 && hour < 13)  return "london";
   if(hour >= 0 && hour < 8)   return "asian";
   return "off_hours";
  }

//+------------------------------------------------------------------+
//| Get ATR value using MQL5 indicator handle pattern                 |
//+------------------------------------------------------------------+
double GetATR(string symbol, ENUM_TIMEFRAMES tf, int period)
  {
   int handle = iATR(symbol, tf, period);
   if(handle == INVALID_HANDLE)
      return 0.0;

   double buffer[];
   ArraySetAsSeries(buffer, true);
   int copied = CopyBuffer(handle, 0, 0, 1, buffer);
   IndicatorRelease(handle);

   if(copied <= 0)
      return 0.0;

   return buffer[0];
  }

//+------------------------------------------------------------------+
//| Capture and enrich a deal into a JournalTrade                     |
//+------------------------------------------------------------------+
bool CaptureDeal(ulong dealTicket, JournalTrade &trade)
  {
   //--- Ensure history is loaded (needed when called from OnTradeTransaction)
   HistorySelect(0, TimeCurrent());

   if(!HistoryDealSelect(dealTicket))
      return false;

   ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
      return false;

   ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

   //--- Core fields
   trade.deal_ticket   = dealTicket;
   trade.order_ticket  = (ulong)HistoryDealGetInteger(dealTicket, DEAL_ORDER);
   trade.position_id   = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   trade.symbol        = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   trade.direction     = (dealType == DEAL_TYPE_BUY) ? "buy" : "sell";
   trade.volume        = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   trade.price         = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   trade.time          = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   trade.profit        = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   trade.commission    = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   trade.swap          = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   trade.magic_number  = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
   trade.comment       = HistoryDealGetString(dealTicket, DEAL_COMMENT);

   //--- Deal entry
   if(dealEntry == DEAL_ENTRY_IN)        trade.deal_entry = "in";
   else if(dealEntry == DEAL_ENTRY_OUT)  trade.deal_entry = "out";
   else if(dealEntry == DEAL_ENTRY_INOUT) trade.deal_entry = "inout";
   else                                   trade.deal_entry = "in";

   //--- SL/TP from position if available
   trade.sl = 0;
   trade.tp = 0;
   if(PositionSelectByTicket(trade.position_id))
     {
      trade.sl = PositionGetDouble(POSITION_SL);
      trade.tp = PositionGetDouble(POSITION_TP);
     }

   //--- Enrichment: balance, equity
   trade.balance_at_trade = AccountInfoDouble(ACCOUNT_BALANCE);
   trade.equity_at_trade  = AccountInfoDouble(ACCOUNT_EQUITY);

   //--- Enrichment: spread (integer, in points)
   trade.spread_at_entry = (int)SymbolInfoInteger(trade.symbol, SYMBOL_SPREAD);

   //--- Enrichment: ATR(14, H1)
   trade.atr_at_entry = GetATR(trade.symbol, PERIOD_H1, 14);

   //--- Enrichment: session tag
   trade.session_tag = GetSessionTag(trade.time);

   //--- Enrichment: duration, pips, R:R (only for closing deals)
   trade.has_duration = false;
   trade.has_pips = false;
   trade.has_rr = false;
   trade.duration_seconds = 0;
   trade.pips = 0;
   trade.risk_reward_ratio = 0;

   if(dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_INOUT)
     {
      //--- Look up the entry deal for this position
      if(HistorySelectByPosition(trade.position_id))
        {
         int total = HistoryDealsTotal();
         for(int i = 0; i < total; i++)
           {
            ulong entryTicket = HistoryDealGetTicket(i);
            if(entryTicket == dealTicket) continue;
            ENUM_DEAL_ENTRY eEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(entryTicket, DEAL_ENTRY);
            if(eEntry == DEAL_ENTRY_IN)
              {
               datetime entryTime = (datetime)HistoryDealGetInteger(entryTicket, DEAL_TIME);
               double entryPrice = HistoryDealGetDouble(entryTicket, DEAL_PRICE);

               trade.duration_seconds = (int)(trade.time - entryTime);
               trade.has_duration = true;

               //--- Pips
               double point = SymbolInfoDouble(trade.symbol, SYMBOL_POINT);
               if(point > 0)
                 {
                  double rawPips = (trade.price - entryPrice) / point;
                  trade.pips = (trade.direction == "sell") ? -rawPips : rawPips;
                  trade.has_pips = true;
                 }

               //--- R:R from the order's SL/TP (deals don't have SL/TP in MQL5)
               double entrySL = 0;
               double entryTP = 0;
               ulong entryOrder = (ulong)HistoryDealGetInteger(entryTicket, DEAL_ORDER);
               if(entryOrder > 0 && HistoryOrderSelect(entryOrder))
                 {
                  entrySL = HistoryOrderGetDouble(entryOrder, ORDER_SL);
                  entryTP = HistoryOrderGetDouble(entryOrder, ORDER_TP);
                 }
               // Fallback to position SL/TP if order didn't have them
               if(entrySL == 0 && trade.sl != 0) entrySL = trade.sl;
               if(entryTP == 0 && trade.tp != 0) entryTP = trade.tp;

               if(entrySL != 0 && entryTP != 0)
                 {
                  double risk = MathAbs(entryPrice - entrySL);
                  double reward = MathAbs(entryTP - entryPrice);
                  if(risk > 0)
                    {
                     trade.risk_reward_ratio = reward / risk;
                     trade.has_rr = true;
                    }
                 }
               break; // Found the entry deal
              }
           }
        }
     }

   return true;
  }

//+------------------------------------------------------------------+
//| Convert a JournalTrade to JSON string                             |
//+------------------------------------------------------------------+
string JournalTradeToJson(JournalTrade &trade)
  {
   int digits = (int)SymbolInfoInteger(trade.symbol, SYMBOL_DIGITS);
   if(digits <= 0) digits = 5;

   string json = "{";
   json += "\"deal_ticket\":" + IntegerToString((long)trade.deal_ticket) + ",";
   json += "\"order_ticket\":" + IntegerToString((long)trade.order_ticket) + ",";
   json += "\"position_id\":" + IntegerToString((long)trade.position_id) + ",";
   json += "\"symbol\":\"" + JsonEscape(trade.symbol) + "\",";
   json += "\"direction\":\"" + trade.direction + "\",";
   json += "\"deal_entry\":\"" + trade.deal_entry + "\",";
   json += "\"volume\":" + DoubleToString(trade.volume, 8) + ",";
   json += "\"price\":" + DoubleToString(trade.price, digits) + ",";
   json += "\"sl\":" + DoubleToString(trade.sl, digits) + ",";
   json += "\"tp\":" + DoubleToString(trade.tp, digits) + ",";
   json += "\"time\":" + IntegerToString((long)trade.time) + ",";
   json += "\"profit\":" + DoubleToString(trade.profit, 2) + ",";
   json += "\"commission\":" + DoubleToString(trade.commission, 2) + ",";
   json += "\"swap\":" + DoubleToString(trade.swap, 2) + ",";
   json += "\"magic_number\":" + IntegerToString(trade.magic_number) + ",";
   json += "\"comment\":\"" + JsonEscape(trade.comment) + "\",";
   json += "\"balance_at_trade\":" + DoubleToString(trade.balance_at_trade, 2) + ",";
   json += "\"equity_at_trade\":" + DoubleToString(trade.equity_at_trade, 2) + ",";
   json += "\"spread_at_entry\":" + IntegerToString(trade.spread_at_entry) + ",";
   json += "\"atr_at_entry\":" + DoubleToString(trade.atr_at_entry, 6) + ",";
   json += "\"session_tag\":\"" + trade.session_tag + "\",";

   if(trade.has_duration)
      json += "\"duration_seconds\":" + IntegerToString(trade.duration_seconds) + ",";
   else
      json += "\"duration_seconds\":null,";

   if(trade.has_pips)
      json += "\"pips\":" + DoubleToString(trade.pips, 1) + ",";
   else
      json += "\"pips\":null,";

   if(trade.has_rr)
      json += "\"risk_reward_ratio\":" + DoubleToString(trade.risk_reward_ratio, 2);
   else
      json += "\"risk_reward_ratio\":null";

   json += "}";
   return json;
  }

//+------------------------------------------------------------------+
//| Build HMAC canonical string for a batch of trades                 |
//+------------------------------------------------------------------+
string BuildJournalHmacCanonical(string accountId, int tradeCount, ulong &dealTickets[], long timestamp)
  {
   //--- Sort deal tickets ascending
   for(int i = 0; i < tradeCount - 1; i++)
      for(int j = i + 1; j < tradeCount; j++)
         if(dealTickets[j] < dealTickets[i])
           {
            ulong tmp = dealTickets[i];
            dealTickets[i] = dealTickets[j];
            dealTickets[j] = tmp;
           }

   //--- Join with commas
   string ticketStr = "";
   for(int i = 0; i < tradeCount; i++)
     {
      if(i > 0) ticketStr += ",";
      ticketStr += IntegerToString((long)dealTickets[i]);
     }

   return "account_id:" + accountId + ":count:" + IntegerToString(tradeCount)
          + ":deals:" + ticketStr + ":ts:" + IntegerToString(timestamp);
  }

//+------------------------------------------------------------------+
//| Send journal heartbeat (uses /v1/journal/heartbeat path)         |
//+------------------------------------------------------------------+
int SendJournalHeartbeat(string endpoint, string apiKey, string accountId, string apiSecret)
  {
   string url = endpoint + "/v1/journal/heartbeat";
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   long ts = (long)TimeCurrent();
   string tsStr = IntegerToString(ts);

   string sigPayload = "{\"account_id\":\"" + accountId + "\",\"timestamp\":" + tsStr + "}";
   string hmac = HmacSha256(sigPayload, apiSecret);

   string jsonBody = "{";
   jsonBody += "\"account_id\":\"" + JsonEscape(accountId) + "\",";
   jsonBody += "\"timestamp\":" + tsStr + ",";
   jsonBody += "\"hmac_signature\":\"" + hmac + "\"";
   jsonBody += "}";

   char postData[];
   StringToCharArray(jsonBody, postData, 0, StringLen(jsonBody));

   char result[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("POST", url, headers, 5000, postData, result, resultHeaders);

   if(statusCode == -1)
     {
      int err = GetLastError();
      PrintFormat("[Journal] Heartbeat failed: error=%d", err);
     }

   return statusCode;
  }

#endif // EDGERELAY_JOURNAL_SYNC_MQH
