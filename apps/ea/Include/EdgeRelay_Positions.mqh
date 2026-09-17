// Read-only complete position snapshots. Never sends, changes or closes orders.
#ifndef EDGERELAY_POSITIONS_MQH
#define EDGERELAY_POSITIONS_MQH
#include <EdgeRelay_JournalSync.mqh>

int SendPositionSnapshot(string endpoint, string apiKey, string accountId, string apiSecret)
  {
   if(!TerminalInfoInteger(TERMINAL_CONNECTED)) return 0;
   int count = PositionsTotal();
   if(count > 200) { Print("[Journal] Position snapshot limit exceeded (200)."); return 0; }
   string body = "{\"version\":1,\"account_id\":\"" + JsonEscape(accountId) + "\",";
   body += "\"captured_at\":" + IntegerToString((long)TimeGMT()) + ",";
   body += "\"currency\":\"" + JsonEscape(AccountInfoString(ACCOUNT_CURRENCY)) + "\",";
   body += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 8) + ",";
   body += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 8) + ",";
   body += "\"floating_profit\":" + DoubleToString(AccountInfoDouble(ACCOUNT_PROFIT), 8) + ",";
   body += "\"positions\":[";
   for(int i = 0; i < count; i++)
     {
      ulong ticket = PositionGetTicket(i);
      // Do not publish an incomplete snapshot if selection fails.
      if(ticket == 0 || !PositionSelectByTicket(ticket)) return 0;
      if(i > 0) body += ",";
      body += "{\"ticket\":\"" + IntegerToString((long)ticket) + "\",";
      body += "\"position_id\":\"" + IntegerToString(PositionGetInteger(POSITION_IDENTIFIER)) + "\",";
      body += "\"symbol\":\"" + JsonEscape(PositionGetString(POSITION_SYMBOL)) + "\",";
      body += "\"direction\":\"" + (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell") + "\",";
      body += "\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 8) + ",";
      body += "\"price_open\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 8) + ",";
      body += "\"price_current\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_CURRENT), 8) + ",";
      body += "\"sl\":" + DoubleToString(PositionGetDouble(POSITION_SL), 8) + ",";
      body += "\"tp\":" + DoubleToString(PositionGetDouble(POSITION_TP), 8) + ",";
      body += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 8) + ",";
      body += "\"swap\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 8) + "}";
     }
   if(PositionsTotal() != count) return 0;
   body += "]}";
   string signature = HmacSha256(body, apiSecret, CP_UTF8);
   if(signature == "") return 0;
   char data[];
   StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1);
   string headers = "Content-Type: application/json\r\nX-API-Key: " + apiKey +
                    "\r\nX-Snapshot-Signature: " + signature + "\r\n";
   char result[];
   string resultHeaders;
   int status = WebRequest("POST", endpoint + "/v1/journal/positions", headers, 5000, data, result, resultHeaders);
   if(status != 200) PrintFormat("[Journal] Position snapshot status=%d. Check UTC clock and connection if this persists.", status);
   return status;
  }
#endif
