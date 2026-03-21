//+------------------------------------------------------------------+
//|                                           EdgeRelay_Queue.mqh    |
//|                        EdgeRelay Master EA - Offline Queue       |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_QUEUE_MQH
#define EDGERELAY_QUEUE_MQH

#include "EdgeRelay_Common.mqh"
#include "EdgeRelay_Http.mqh"

//+------------------------------------------------------------------+
//| Signal queue class — file-backed for crash resilience             |
//| File format: one JSON signal per line                             |
//+------------------------------------------------------------------+
class CSignalQueue
  {
private:
   string            m_filename;
   int               m_count;

   //--- Re-count lines in the queue file
   void              Recount();

   //--- Parse a JSON line back into a Signal struct
   bool              ParseSignalLine(string line, Signal &signal);

   //--- Extract a JSON string value by key
   string            ExtractJsonString(string &json, string key);

   //--- Extract a JSON numeric value by key (as string)
   string            ExtractJsonNumber(string &json, string key);

public:
                     CSignalQueue();
                    ~CSignalQueue();

   void              Init(string filename);
   bool              Enqueue(Signal &signal);
   bool              Dequeue(Signal &signal);
   int               Count();
   void              Clear();
   bool              IsEmpty();
   void              Flush(string endpoint, string apiKey);
  };

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CSignalQueue::CSignalQueue()
  {
   m_filename = "";
   m_count = 0;
  }

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CSignalQueue::~CSignalQueue()
  {
  }

//+------------------------------------------------------------------+
//| Initialize queue with file path                                   |
//+------------------------------------------------------------------+
void CSignalQueue::Init(string filename)
  {
   m_filename = filename;

   //--- Create file if it doesn't exist
   int handle = FileOpen(m_filename, FILE_READ | FILE_WRITE | FILE_TXT |
                         FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle != INVALID_HANDLE)
      FileClose(handle);

   Recount();
   PrintFormat("[EdgeRelay] Queue initialized: %s (%d signals pending)", m_filename, m_count);
  }

//+------------------------------------------------------------------+
//| Append a signal to the queue file                                 |
//+------------------------------------------------------------------+
bool CSignalQueue::Enqueue(Signal &signal)
  {
   if(m_count >= MAX_QUEUE_SIZE)
     {
      PrintFormat("[EdgeRelay] Queue full (%d/%d), dropping signal %s",
                  m_count, MAX_QUEUE_SIZE, signal.signal_id);
      return false;
     }

   int handle = FileOpen(m_filename, FILE_READ | FILE_WRITE | FILE_TXT |
                         FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE)
     {
      PrintFormat("[EdgeRelay] Failed to open queue file for write: %d", GetLastError());
      return false;
     }

   //--- Seek to end of file
   FileSeek(handle, 0, SEEK_END);

   //--- Write JSON line
   string json = SignalToJson(signal);
   FileWriteString(handle, json + "\n");

   FileClose(handle);

   m_count++;
   PrintFormat("[EdgeRelay] Signal enqueued: %s (queue size: %d)", signal.signal_id, m_count);
   return true;
  }

//+------------------------------------------------------------------+
//| Read and remove the oldest signal from the queue                  |
//+------------------------------------------------------------------+
bool CSignalQueue::Dequeue(Signal &signal)
  {
   if(m_count <= 0)
      return false;

   int handle = FileOpen(m_filename, FILE_READ | FILE_TXT |
                         FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE)
      return false;

   //--- Read all lines
   string lines[];
   int lineCount = 0;

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

   if(lineCount == 0)
     {
      m_count = 0;
      return false;
     }

   //--- Parse first line into signal
   if(!ParseSignalLine(lines[0], signal))
      return false;

   //--- Rewrite file without the first line
   handle = FileOpen(m_filename, FILE_WRITE | FILE_TXT |
                     FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE)
      return false;

   for(int i = 1; i < lineCount; i++)
      FileWriteString(handle, lines[i] + "\n");

   FileClose(handle);

   m_count = lineCount - 1;
   return true;
  }

//+------------------------------------------------------------------+
//| Return number of queued signals                                   |
//+------------------------------------------------------------------+
int CSignalQueue::Count()
  {
   return m_count;
  }

//+------------------------------------------------------------------+
//| Clear all queued signals                                          |
//+------------------------------------------------------------------+
void CSignalQueue::Clear()
  {
   int handle = FileOpen(m_filename, FILE_WRITE | FILE_TXT |
                         FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle != INVALID_HANDLE)
      FileClose(handle);

   m_count = 0;
   Print("[EdgeRelay] Queue cleared");
  }

//+------------------------------------------------------------------+
//| Check if queue is empty                                           |
//+------------------------------------------------------------------+
bool CSignalQueue::IsEmpty()
  {
   return (m_count <= 0);
  }

//+------------------------------------------------------------------+
//| Flush queue — attempt to send all queued signals                  |
//| Successfully sent signals are removed                             |
//+------------------------------------------------------------------+
void CSignalQueue::Flush(string endpoint, string apiKey)
  {
   if(m_count <= 0)
      return;

   PrintFormat("[EdgeRelay] Flushing queue (%d signals)...", m_count);

   int handle = FileOpen(m_filename, FILE_READ | FILE_TXT |
                         FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE)
      return;

   //--- Read all lines
   string lines[];
   int lineCount = 0;

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

   //--- Try to send each signal, keep failed ones
   string failedLines[];
   int failedCount = 0;
   int sentCount = 0;

   for(int i = 0; i < lineCount; i++)
     {
      Signal sig;
      if(!ParseSignalLine(lines[i], sig))
        {
         //--- Skip unparseable lines
         PrintFormat("[EdgeRelay] Skipping unparseable queue line %d", i);
         continue;
        }

      //--- Check signal age — drop signals older than MAX_SIGNAL_AGE_S
      if((long)TimeCurrent() - (long)sig.timestamp > MAX_SIGNAL_AGE_S)
        {
         PrintFormat("[EdgeRelay] Dropping expired signal: %s (age > %ds)",
                     sig.signal_id, MAX_SIGNAL_AGE_S);
         continue;
        }

      int httpCode = SendSignal(endpoint, apiKey, sig);
      if(httpCode == 200 || httpCode == 201)
        {
         sentCount++;
        }
      else
        {
         //--- Keep for retry
         ArrayResize(failedLines, failedCount + 1);
         failedLines[failedCount] = lines[i];
         failedCount++;
         //--- Stop trying if server is unreachable
         if(httpCode == -1)
           {
            //--- Keep remaining lines too
            for(int j = i + 1; j < lineCount; j++)
              {
               ArrayResize(failedLines, failedCount + 1);
               failedLines[failedCount] = lines[j];
               failedCount++;
              }
            break;
           }
        }
     }

   //--- Rewrite file with only failed lines
   handle = FileOpen(m_filename, FILE_WRITE | FILE_TXT |
                     FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle != INVALID_HANDLE)
     {
      for(int i = 0; i < failedCount; i++)
         FileWriteString(handle, failedLines[i] + "\n");
      FileClose(handle);
     }

   m_count = failedCount;
   PrintFormat("[EdgeRelay] Queue flush complete: %d sent, %d remaining", sentCount, failedCount);
  }

//+------------------------------------------------------------------+
//| Re-count lines in the queue file                                  |
//+------------------------------------------------------------------+
void CSignalQueue::Recount()
  {
   m_count = 0;

   int handle = FileOpen(m_filename, FILE_READ | FILE_TXT |
                         FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_ANSI);
   if(handle == INVALID_HANDLE)
      return;

   while(!FileIsEnding(handle))
     {
      string line = FileReadString(handle);
      if(StringLen(line) > 0)
         m_count++;
     }

   FileClose(handle);
  }

//+------------------------------------------------------------------+
//| Extract a JSON string value by key                                |
//+------------------------------------------------------------------+
string CSignalQueue::ExtractJsonString(string &json, string key)
  {
   string searchKey = "\"" + key + "\":\"";
   int pos = StringFind(json, searchKey);
   if(pos < 0)
      return "";

   int start = pos + StringLen(searchKey);
   int end = StringFind(json, "\"", start);
   if(end < 0)
      return "";

   return StringSubstr(json, start, end - start);
  }

//+------------------------------------------------------------------+
//| Extract a JSON numeric value by key                               |
//+------------------------------------------------------------------+
string CSignalQueue::ExtractJsonNumber(string &json, string key)
  {
   string searchKey = "\"" + key + "\":";
   int pos = StringFind(json, searchKey);
   if(pos < 0)
      return "";

   int start = pos + StringLen(searchKey);

   //--- Find end of number (comma, closing brace, or end of string)
   int end = start;
   int len = StringLen(json);
   while(end < len)
     {
      ushort ch = StringGetCharacter(json, end);
      if(ch == ',' || ch == '}' || ch == ' ' || ch == '\n' || ch == '\r')
         break;
      end++;
     }

   return StringSubstr(json, start, end - start);
  }

//+------------------------------------------------------------------+
//| Parse action string back to enum                                  |
//+------------------------------------------------------------------+
ENUM_SIGNAL_ACTION StringToAction(string action)
  {
   if(action == "OPEN")           return SIGNAL_OPEN;
   if(action == "MODIFY")         return SIGNAL_MODIFY;
   if(action == "PARTIAL_CLOSE")  return SIGNAL_PARTIAL_CLOSE;
   if(action == "CLOSE")          return SIGNAL_CLOSE;
   if(action == "PENDING")        return SIGNAL_PENDING;
   if(action == "CANCEL_PENDING") return SIGNAL_CANCEL_PENDING;
   return SIGNAL_OPEN;
  }

//+------------------------------------------------------------------+
//| Parse order type string back to enum                              |
//+------------------------------------------------------------------+
ENUM_ORDER_TYPE StringToOrderType(string orderType)
  {
   if(orderType == "BUY")              return ORDER_TYPE_BUY;
   if(orderType == "SELL")             return ORDER_TYPE_SELL;
   if(orderType == "BUY_LIMIT")        return ORDER_TYPE_BUY_LIMIT;
   if(orderType == "SELL_LIMIT")       return ORDER_TYPE_SELL_LIMIT;
   if(orderType == "BUY_STOP")         return ORDER_TYPE_BUY_STOP;
   if(orderType == "SELL_STOP")        return ORDER_TYPE_SELL_STOP;
   if(orderType == "BUY_STOP_LIMIT")   return ORDER_TYPE_BUY_STOP_LIMIT;
   if(orderType == "SELL_STOP_LIMIT")  return ORDER_TYPE_SELL_STOP_LIMIT;
   if(orderType == "CLOSE_BY")         return ORDER_TYPE_CLOSE_BY;
   return ORDER_TYPE_BUY;
  }

//+------------------------------------------------------------------+
//| Parse a JSON line back into a Signal struct                       |
//+------------------------------------------------------------------+
bool CSignalQueue::ParseSignalLine(string line, Signal &signal)
  {
   if(StringLen(line) < 10)
      return false;

   signal.signal_id      = ExtractJsonString(line, "signal_id");
   signal.account_id     = ExtractJsonString(line, "account_id");
   signal.sequence_num   = (int)StringToInteger(ExtractJsonNumber(line, "sequence_num"));
   signal.action         = StringToAction(ExtractJsonString(line, "action"));
   signal.order_type     = StringToOrderType(ExtractJsonString(line, "order_type"));
   signal.symbol         = ExtractJsonString(line, "symbol");
   signal.volume         = StringToDouble(ExtractJsonNumber(line, "volume"));
   signal.price          = StringToDouble(ExtractJsonNumber(line, "price"));
   signal.sl             = StringToDouble(ExtractJsonNumber(line, "sl"));
   signal.tp             = StringToDouble(ExtractJsonNumber(line, "tp"));
   signal.magic_number   = StringToInteger(ExtractJsonNumber(line, "magic_number"));
   signal.ticket         = StringToInteger(ExtractJsonNumber(line, "ticket"));
   signal.comment        = ExtractJsonString(line, "comment");
   signal.timestamp      = (datetime)StringToInteger(ExtractJsonNumber(line, "timestamp"));
   signal.hmac_signature = ExtractJsonString(line, "hmac_signature");

   return (StringLen(signal.signal_id) > 0);
  }

#endif // EDGERELAY_QUEUE_MQH
