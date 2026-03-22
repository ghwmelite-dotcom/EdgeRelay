//+------------------------------------------------------------------+
//|                                            EdgeRelay_Http.mqh    |
//|                       EdgeRelay Master EA - HTTP Communication   |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_HTTP_MQH
#define EDGERELAY_HTTP_MQH

#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Crypto.mqh>

//+------------------------------------------------------------------+
//| Send a trade signal via HTTP POST                                 |
//| Returns HTTP status code, or -1 on failure                        |
//+------------------------------------------------------------------+
int SendSignal(string endpoint, string apiKey, Signal &signal)
  {
   string url = endpoint + "/v1/signals";
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   //--- Build JSON body
   string jsonBody = SignalToJson(signal);

   //--- Convert to char array for WebRequest
   char postData[];
   StringToCharArray(jsonBody, postData, 0, StringLen(jsonBody));

   //--- Response buffers
   char   result[];
   string resultHeaders;

   //--- Reset error
   ResetLastError();

   int statusCode = WebRequest(
                       "POST",
                       url,
                       headers,
                       5000,         // 5 second timeout
                       postData,
                       result,
                       resultHeaders
                    );

   if(statusCode == -1)
     {
      int err = GetLastError();
      PrintFormat("[EdgeRelay] SendSignal failed: error=%d, url=%s. "
                  "Ensure URL is added to Tools > Options > Expert Advisors > Allow WebRequest.",
                  err, url);
      return -1;
     }

   if(statusCode != 200 && statusCode != 201)
     {
      string responseBody = CharArrayToString(result);
      PrintFormat("[EdgeRelay] SendSignal HTTP %d: %s", statusCode, responseBody);
     }

   return statusCode;
  }

//+------------------------------------------------------------------+
//| Send heartbeat to server                                          |
//| Returns HTTP status code, or -1 on failure                        |
//+------------------------------------------------------------------+
int SendHeartbeat(string endpoint, string apiKey, string accountId, string apiSecret)
  {
   string url = endpoint + "/v1/heartbeat";
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   //--- Build heartbeat payload
   long ts = (long)TimeCurrent();
   string tsStr = IntegerToString(ts);

   //--- Sign the heartbeat: HMAC of "account_id={id}&timestamp={ts}"
   string sigPayload = "account_id=" + accountId + "&timestamp=" + tsStr;
   string hmac = HmacSha256(sigPayload, apiSecret);

   //--- Build JSON
   string jsonBody = "{";
   jsonBody += "\"account_id\":\"" + JsonEscape(accountId) + "\",";
   jsonBody += "\"timestamp\":" + tsStr + ",";
   jsonBody += "\"hmac_signature\":\"" + hmac + "\"";
   jsonBody += "}";

   //--- Convert to char array
   char postData[];
   StringToCharArray(jsonBody, postData, 0, StringLen(jsonBody));

   //--- Response buffers
   char   result[];
   string resultHeaders;

   ResetLastError();

   int statusCode = WebRequest(
                       "POST",
                       url,
                       headers,
                       5000,
                       postData,
                       result,
                       resultHeaders
                    );

   if(statusCode == -1)
     {
      int err = GetLastError();
      PrintFormat("[EdgeRelay] SendHeartbeat failed: error=%d", err);
      return -1;
     }

   return statusCode;
  }

//+------------------------------------------------------------------+
//| Check if the EdgeRelay server is reachable                        |
//| Quick GET to /v1/health, returns true if HTTP 200                 |
//+------------------------------------------------------------------+
bool IsServerReachable(string endpoint)
  {
   string url = endpoint + "/v1/health";
   string headers = "";

   char postData[];
   char result[];
   string resultHeaders;

   ResetLastError();

   int statusCode = WebRequest(
                       "GET",
                       url,
                       headers,
                       3000,        // 3 second timeout for health check
                       postData,
                       result,
                       resultHeaders
                    );

   return (statusCode == 200);
  }

//+------------------------------------------------------------------+
//| Sync equity state to cloud                                       |
//| POST /v1/propguard/equity/:accountId                             |
//+------------------------------------------------------------------+
int SyncEquityToCloud(string endpoint, string apiKey, string accountId, string equityJson)
  {
   string url = endpoint + "/v1/propguard/equity/" + accountId;
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   char postData[];
   StringToCharArray(equityJson, postData, 0, StringLen(equityJson));

   char   result[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);

   if(statusCode == -1)
     {
      int err = GetLastError();
      PrintFormat("[PropGuard] SyncEquity failed: error=%d", err);
     }

   return statusCode;
  }

//+------------------------------------------------------------------+
//| Post blocked trade to cloud                                      |
//| POST /v1/propguard/blocked/:accountId                            |
//+------------------------------------------------------------------+
int PostBlockedTrade(string endpoint, string apiKey, string accountId,
                     string ruleViolated, string ruleDetails,
                     string action, string symbol, double volume, double price,
                     double dailyLossPct, double totalDDPct, double equity)
  {
   string url = endpoint + "/v1/propguard/blocked/" + accountId;
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   string json = "{";
   json += "\"rule_violated\":\"" + JsonEscape(ruleViolated) + "\",";
   json += "\"rule_details\":\"" + JsonEscape(ruleDetails) + "\",";
   json += "\"attempted_action\":\"" + JsonEscape(action) + "\",";
   json += "\"attempted_symbol\":\"" + JsonEscape(symbol) + "\",";
   json += "\"attempted_volume\":" + DoubleToString(volume, 2) + ",";
   json += "\"attempted_price\":" + DoubleToString(price, 5) + ",";
   json += "\"current_daily_loss_percent\":" + DoubleToString(dailyLossPct, 4) + ",";
   json += "\"current_total_drawdown_percent\":" + DoubleToString(totalDDPct, 4) + ",";
   json += "\"current_equity\":" + DoubleToString(equity, 2);
   json += "}";

   char postData[];
   StringToCharArray(json, postData, 0, StringLen(json));

   char   result[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);
   return statusCode;
  }

//+------------------------------------------------------------------+
//| Post emergency close event to cloud                              |
//| POST /v1/propguard/emergency/:accountId                          |
//+------------------------------------------------------------------+
int PostEmergencyClose(string endpoint, string apiKey, string accountId,
                       string reason, double equityAtClose, int positionsClosed)
  {
   string url = endpoint + "/v1/propguard/emergency/" + accountId;
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   string json = "{";
   json += "\"reason\":\"" + JsonEscape(reason) + "\",";
   json += "\"equity_at_close\":" + DoubleToString(equityAtClose, 2) + ",";
   json += "\"positions_closed\":" + IntegerToString(positionsClosed);
   json += "}";

   char postData[];
   StringToCharArray(json, postData, 0, StringLen(json));

   char   result[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);
   return statusCode;
  }

//+------------------------------------------------------------------+
//| Fetch PropGuard rules from cloud                                 |
//| GET /v1/propguard/rules/:accountId                               |
//+------------------------------------------------------------------+
int FetchPropGuardRules(string endpoint, string apiKey, string accountId, string &response)
  {
   string url = endpoint + "/v1/propguard/rules/" + accountId;
   string headers = "X-API-Key: " + apiKey + "\r\n";

   char postData[];
   char resultData[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("GET", url, headers, 5000, postData, resultData, resultHeaders);

   if(statusCode == 200)
      response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
   else
      response = "";

   return statusCode;
  }

//+------------------------------------------------------------------+
//| Fetch news events from cloud                                     |
//| GET /v1/news/calendar?currency=USD,EUR,GBP                      |
//+------------------------------------------------------------------+
int FetchNewsEvents(string endpoint, string apiKey, string currencies, string &response)
  {
   string url = endpoint + "/v1/news/calendar?currency=" + currencies;
   string headers = "X-API-Key: " + apiKey + "\r\n";

   char postData[];
   char resultData[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("GET", url, headers, 5000, postData, resultData, resultHeaders);

   if(statusCode == 200)
      response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
   else
      response = "";

   return statusCode;
  }

#endif // EDGERELAY_HTTP_MQH
