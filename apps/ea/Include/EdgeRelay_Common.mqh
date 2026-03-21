//+------------------------------------------------------------------+
//|                                          EdgeRelay_Common.mqh    |
//|                              EdgeRelay Master EA - Shared Types  |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_COMMON_MQH
#define EDGERELAY_COMMON_MQH

//--- Signal action enum
enum ENUM_SIGNAL_ACTION
  {
   SIGNAL_OPEN           = 0,
   SIGNAL_MODIFY         = 1,
   SIGNAL_PARTIAL_CLOSE  = 2,
   SIGNAL_CLOSE          = 3,
   SIGNAL_PENDING        = 4,
   SIGNAL_CANCEL_PENDING = 5
  };

//--- Connection status enum
enum ENUM_CONNECTION_STATUS
  {
   STATUS_CONNECTED    = 0,
   STATUS_DISCONNECTED = 1,
   STATUS_CONNECTING   = 2,
   STATUS_ERROR        = 3
  };

//--- Constants
#define MAX_QUEUE_SIZE        1000
#define HEARTBEAT_INTERVAL_MS 5000
#define MAX_SIGNAL_AGE_S      30

//--- Signal struct
struct Signal
  {
   string            signal_id;
   string            account_id;
   int               sequence_num;
   ENUM_SIGNAL_ACTION action;
   ENUM_ORDER_TYPE   order_type;
   string            symbol;
   double            volume;
   double            price;
   double            sl;
   double            tp;
   long              magic_number;
   long              ticket;
   string            comment;
   datetime          timestamp;
   string            hmac_signature;
  };

//--- Heartbeat struct
struct Heartbeat
  {
   string            account_id;
   datetime          timestamp;
   string            hmac_signature;
   int               queue_size;
   int               signals_sent;
  };

//+------------------------------------------------------------------+
//| Convert signal action to string                                   |
//+------------------------------------------------------------------+
string ActionToString(ENUM_SIGNAL_ACTION action)
  {
   switch(action)
     {
      case SIGNAL_OPEN:           return "OPEN";
      case SIGNAL_MODIFY:         return "MODIFY";
      case SIGNAL_PARTIAL_CLOSE:  return "PARTIAL_CLOSE";
      case SIGNAL_CLOSE:          return "CLOSE";
      case SIGNAL_PENDING:        return "PENDING";
      case SIGNAL_CANCEL_PENDING: return "CANCEL_PENDING";
     }
   return "UNKNOWN";
  }

//+------------------------------------------------------------------+
//| Convert order type to string                                      |
//+------------------------------------------------------------------+
string OrderTypeToString(ENUM_ORDER_TYPE type)
  {
   switch(type)
     {
      case ORDER_TYPE_BUY:             return "BUY";
      case ORDER_TYPE_SELL:            return "SELL";
      case ORDER_TYPE_BUY_LIMIT:       return "BUY_LIMIT";
      case ORDER_TYPE_SELL_LIMIT:      return "SELL_LIMIT";
      case ORDER_TYPE_BUY_STOP:        return "BUY_STOP";
      case ORDER_TYPE_SELL_STOP:       return "SELL_STOP";
      case ORDER_TYPE_BUY_STOP_LIMIT:  return "BUY_STOP_LIMIT";
      case ORDER_TYPE_SELL_STOP_LIMIT: return "SELL_STOP_LIMIT";
      case ORDER_TYPE_CLOSE_BY:        return "CLOSE_BY";
     }
   return "UNKNOWN";
  }

//+------------------------------------------------------------------+
//| Escape a string for JSON output                                   |
//+------------------------------------------------------------------+
string JsonEscape(string text)
  {
   string result = text;
   StringReplace(result, "\\", "\\\\");
   StringReplace(result, "\"", "\\\"");
   StringReplace(result, "\n", "\\n");
   StringReplace(result, "\r", "\\r");
   StringReplace(result, "\t", "\\t");
   return result;
  }

//+------------------------------------------------------------------+
//| Convert Signal struct to JSON string                              |
//+------------------------------------------------------------------+
string SignalToJson(Signal &signal)
  {
   string json = "{";

   json += "\"signal_id\":\"" + JsonEscape(signal.signal_id) + "\",";
   json += "\"account_id\":\"" + JsonEscape(signal.account_id) + "\",";
   json += "\"sequence_num\":" + IntegerToString(signal.sequence_num) + ",";
   json += "\"action\":\"" + ActionToString(signal.action) + "\",";
   json += "\"order_type\":\"" + OrderTypeToString(signal.order_type) + "\",";
   json += "\"symbol\":\"" + JsonEscape(signal.symbol) + "\",";
   json += "\"volume\":" + DoubleToString(signal.volume, 8) + ",";
   json += "\"price\":" + DoubleToString(signal.price, (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS)) + ",";
   json += "\"sl\":" + DoubleToString(signal.sl, (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS)) + ",";
   json += "\"tp\":" + DoubleToString(signal.tp, (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS)) + ",";
   json += "\"magic_number\":" + IntegerToString(signal.magic_number) + ",";
   json += "\"ticket\":" + IntegerToString(signal.ticket) + ",";
   json += "\"comment\":\"" + JsonEscape(signal.comment) + "\",";
   json += "\"timestamp\":" + IntegerToString((long)signal.timestamp) + ",";
   json += "\"hmac_signature\":\"" + JsonEscape(signal.hmac_signature) + "\"";

   json += "}";
   return json;
  }

//+------------------------------------------------------------------+
//| Generate a unique signal ID                                       |
//+------------------------------------------------------------------+
string GenerateSignalId(string accountId, int sequenceNum)
  {
   return accountId + "-" + IntegerToString(sequenceNum) + "-" + IntegerToString(GetTickCount());
  }

#endif // EDGERELAY_COMMON_MQH
