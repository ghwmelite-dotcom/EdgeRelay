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

#endif // EDGERELAY_HTTP_MQH
