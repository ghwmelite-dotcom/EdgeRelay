//+------------------------------------------------------------------+
//|                                     EdgeRelay_JournalQueue.mqh   |
//|            File-backed journal trade queue — no expiry            |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_JOURNAL_QUEUE_MQH
#define EDGERELAY_JOURNAL_QUEUE_MQH

#include <EdgeRelay_JournalSync.mqh>

#define JOURNAL_MAX_QUEUE_SIZE   5000
#define JOURNAL_BATCH_SIZE       10

//+------------------------------------------------------------------+
//| Journal queue class                                               |
//+------------------------------------------------------------------+
class CJournalQueue
  {
private:
   string           m_filename;
   int              m_count;

   void             Recount();

public:
                    CJournalQueue() { m_filename = ""; m_count = 0; }

   void             Init(string filename);
   void             Enqueue(JournalTrade &trade);
   int              Count() { return m_count; }
   bool             IsEmpty() { return m_count == 0; }
   void             Clear();

   //--- Flush up to JOURNAL_BATCH_SIZE trades to the endpoint.
   //--- Returns number successfully sent.
   int              Flush(string endpoint, string apiKey, string apiSecret, string accountId);
  };

//+------------------------------------------------------------------+
void CJournalQueue::Init(string filename)
  {
   m_filename = filename;
   Recount();
   if(m_count > 0)
      PrintFormat("[Journal] Queue initialized: %s (%d trades pending)", m_filename, m_count);
  }

//+------------------------------------------------------------------+
void CJournalQueue::Recount()
  {
   m_count = 0;
   int handle = FileOpen(m_filename, FILE_READ | FILE_TXT | FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE) return;

   while(!FileIsEnding(handle))
     {
      string line = FileReadString(handle);
      if(StringLen(line) > 0) m_count++;
     }
   FileClose(handle);
  }

//+------------------------------------------------------------------+
void CJournalQueue::Enqueue(JournalTrade &trade)
  {
   if(m_count >= JOURNAL_MAX_QUEUE_SIZE)
     {
      PrintFormat("[Journal] Queue full (%d), dropping trade %d", m_count, trade.deal_ticket);
      return;
     }

   string json = JournalTradeToJson(trade);

   int handle = FileOpen(m_filename, FILE_READ | FILE_WRITE | FILE_TXT | FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE)
     {
      PrintFormat("[Journal] Failed to open queue file for write: %d", GetLastError());
      return;
     }

   FileSeek(handle, 0, SEEK_END);
   FileWriteString(handle, json + "\n");
   FileClose(handle);

   m_count++;
   PrintFormat("[Journal] Queued trade %d (%s %s %s) queue=%d",
               trade.deal_ticket, trade.deal_entry, trade.direction, trade.symbol, m_count);
  }

//+------------------------------------------------------------------+
void CJournalQueue::Clear()
  {
   int handle = FileOpen(m_filename, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(handle != INVALID_HANDLE)
      FileClose(handle);
   m_count = 0;
  }

//+------------------------------------------------------------------+
int CJournalQueue::Flush(string endpoint, string apiKey, string apiSecret, string accountId)
  {
   if(m_count == 0) return 0;

   //--- Read all lines
   string lines[];
   int lineCount = 0;

   int handle = FileOpen(m_filename, FILE_READ | FILE_TXT | FILE_SHARE_READ | FILE_ANSI);
   if(handle == INVALID_HANDLE) return 0;

   while(!FileIsEnding(handle))
     {
      string line = FileReadString(handle);
      if(StringLen(line) > 0)
        {
         ArrayResize(lines, lineCount + 1);
         lines[lineCount] = line;
         lineCount++;
        }
     }
   FileClose(handle);

   if(lineCount == 0) { m_count = 0; return 0; }

   //--- Take up to JOURNAL_BATCH_SIZE trades
   int batchSize = MathMin(lineCount, JOURNAL_BATCH_SIZE);
   JournalTrade batch[];
   ArrayResize(batch, batchSize);

   //--- Parse JSON lines back to JournalTrade structs (simplified — just send raw JSON)
   //--- Actually, we stored them as JSON, so we can build the batch JSON directly
   string tradesJson = "[";
   ulong dealTickets[];
   ArrayResize(dealTickets, batchSize);

   for(int i = 0; i < batchSize; i++)
     {
      if(i > 0) tradesJson += ",";
      tradesJson += lines[i];

      //--- Extract deal_ticket from the JSON line for HMAC
      //--- "deal_ticket": is 14 chars, value starts at dtPos + 14
      int dtPos = StringFind(lines[i], "\"deal_ticket\":");
      if(dtPos >= 0)
        {
         string sub = StringSubstr(lines[i], dtPos + 14, 20);
         int commaPos = StringFind(sub, ",");
         if(commaPos > 0) sub = StringSubstr(sub, 0, commaPos);
         dealTickets[i] = (ulong)StringToInteger(sub);
        }
     }
   tradesJson += "]";

   //--- Build HMAC
   long ts = (long)TimeCurrent();
   string canonical = BuildJournalHmacCanonical(accountId, batchSize, dealTickets, ts);
   string hmac = HmacSha256(canonical, apiSecret);

   //--- Build full payload
   string json = "{";
   json += "\"account_id\":\"" + JsonEscape(accountId) + "\",";
   json += "\"timestamp\":" + IntegerToString(ts) + ",";
   json += "\"trades\":" + tradesJson + ",";
   json += "\"hmac_signature\":\"" + hmac + "\"";
   json += "}";

   //--- Send
   string url = endpoint + "/v1/journal/sync";
   string headers = "Content-Type: application/json\r\n"
                     "X-API-Key: " + apiKey + "\r\n";

   char postData[];
   StringToCharArray(json, postData, 0, StringLen(json));

   char result[];
   string resultHeaders;

   ResetLastError();
   int statusCode = WebRequest("POST", url, headers, 10000, postData, result, resultHeaders);

   if(statusCode == 200 || statusCode == 201)
     {
      PrintFormat("[Journal] Batch synced: %d trades", batchSize);

      //--- Remove sent lines from queue file
      int wHandle = FileOpen(m_filename, FILE_WRITE | FILE_TXT | FILE_ANSI);
      if(wHandle != INVALID_HANDLE)
        {
         for(int i = batchSize; i < lineCount; i++)
            FileWriteString(wHandle, lines[i] + "\n");
         FileClose(wHandle);
        }
      m_count = lineCount - batchSize;
      return batchSize;
     }
   else
     {
      if(statusCode == -1)
         PrintFormat("[Journal] Batch send failed: network error %d", GetLastError());
      else
        {
         string responseBody = CharArrayToString(result);
         PrintFormat("[Journal] Batch send HTTP %d: %s", statusCode, responseBody);
        }
      return 0;
     }
  }

#endif // EDGERELAY_JOURNAL_QUEUE_MQH
