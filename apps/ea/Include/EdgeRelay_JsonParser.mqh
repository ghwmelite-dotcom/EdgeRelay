//+------------------------------------------------------------------+
//|                                      EdgeRelay_JsonParser.mqh    |
//|                         EdgeRelay - Lightweight MQL5 JSON Parser |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_JSONPARSER_MQH
#define EDGERELAY_JSONPARSER_MQH

//+------------------------------------------------------------------+
//| CJsonParser - Simple string-based JSON parser for MQL5           |
//| Handles flat objects and arrays of objects.                       |
//| Not a full spec parser — tuned for EdgeRelay poll responses.     |
//+------------------------------------------------------------------+
class CJsonParser
  {
private:
   string            m_json;           // Raw JSON string
   int               m_len;            // Length cache

   int               SkipWhitespace(int pos);
   int               FindMatchingBrace(int openPos, char openChar, char closeChar);
   int               FindKeyValue(const string &key, int searchStart, int searchEnd);
   string            ExtractStringValue(int valueStart, int &valueEnd);
   string            ExtractRawValue(int valueStart, int &valueEnd);

public:
                     CJsonParser();
                    ~CJsonParser();

   //--- Core interface
   bool              Parse(const string &json);
   string            GetString(const string &key);
   double            GetDouble(const string &key);
   int               GetInt(const string &key);
   long              GetLong(const string &key);
   bool              GetBool(const string &key);

   //--- Array support
   int               GetArraySize(const string &key);
   string            GetArrayElement(int index);
   string            GetArrayElementByKey(const string &key, int index);

   //--- Nested object from substring
   static CJsonParser FromString(const string &json);

   //--- Utility
   string            GetRawJson()    { return m_json; }
  };

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CJsonParser::CJsonParser()
  {
   m_json = "";
   m_len  = 0;
  }

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CJsonParser::~CJsonParser()
  {
  }

//+------------------------------------------------------------------+
//| Parse - Load a JSON string                                        |
//+------------------------------------------------------------------+
bool CJsonParser::Parse(const string &json)
  {
   m_json = json;
   m_len  = StringLen(json);
   if(m_len < 2)
      return false;

   // Basic sanity: should start with { or [
   int start = SkipWhitespace(0);
   if(start >= m_len)
      return false;

   ushort ch = StringGetCharacter(m_json, start);
   if(ch != '{' && ch != '[')
      return false;

   return true;
  }

//+------------------------------------------------------------------+
//| Skip whitespace characters, return next non-WS position           |
//+------------------------------------------------------------------+
int CJsonParser::SkipWhitespace(int pos)
  {
   while(pos < m_len)
     {
      ushort ch = StringGetCharacter(m_json, pos);
      if(ch != ' ' && ch != '\t' && ch != '\r' && ch != '\n')
         break;
      pos++;
     }
   return pos;
  }

//+------------------------------------------------------------------+
//| Find matching close brace/bracket respecting nesting & strings    |
//+------------------------------------------------------------------+
int CJsonParser::FindMatchingBrace(int openPos, char openChar, char closeChar)
  {
   int depth = 0;
   bool inString = false;
   for(int i = openPos; i < m_len; i++)
     {
      ushort ch = StringGetCharacter(m_json, i);

      if(inString)
        {
         if(ch == '\\')
           {
            i++; // skip escaped char
            continue;
           }
         if(ch == '"')
            inString = false;
         continue;
        }

      if(ch == '"')
        {
         inString = true;
         continue;
        }
      if(ch == (ushort)openChar)
         depth++;
      if(ch == (ushort)closeChar)
        {
         depth--;
         if(depth == 0)
            return i;
        }
     }
   return -1;
  }

//+------------------------------------------------------------------+
//| Find the value-start position for a given key within a range      |
//| Returns position right after the colon (at value start)           |
//+------------------------------------------------------------------+
int CJsonParser::FindKeyValue(const string &key, int searchStart, int searchEnd)
  {
   string needle = "\"" + key + "\"";
   int keyPos = searchStart;

   while(keyPos < searchEnd)
     {
      int found = StringFind(m_json, needle, keyPos);
      if(found < 0 || found >= searchEnd)
         return -1;

      // Move past the key and find the colon
      int afterKey = found + StringLen(needle);
      int colonPos = SkipWhitespace(afterKey);
      if(colonPos < searchEnd && StringGetCharacter(m_json, colonPos) == ':')
        {
         return SkipWhitespace(colonPos + 1);
        }

      // Not a key:value pair, keep searching
      keyPos = afterKey;
     }
   return -1;
  }

//+------------------------------------------------------------------+
//| Extract a JSON string value (assumes pos is at opening quote)     |
//+------------------------------------------------------------------+
string CJsonParser::ExtractStringValue(int valueStart, int &valueEnd)
  {
   if(valueStart >= m_len || StringGetCharacter(m_json, valueStart) != '"')
     {
      valueEnd = valueStart;
      return "";
     }

   int i = valueStart + 1;
   string result = "";

   while(i < m_len)
     {
      ushort ch = StringGetCharacter(m_json, i);

      if(ch == '\\' && i + 1 < m_len)
        {
         ushort next = StringGetCharacter(m_json, i + 1);
         switch(next)
           {
            case '"':  result += "\""; break;
            case '\\': result += "\\"; break;
            case '/':  result += "/";  break;
            case 'n':  result += "\n"; break;
            case 'r':  result += "\r"; break;
            case 't':  result += "\t"; break;
            default:   result += StringSubstr(m_json, i, 2); break;
           }
         i += 2;
         continue;
        }

      if(ch == '"')
        {
         valueEnd = i + 1;
         return result;
        }

      result += ShortToString(ch);
      i++;
     }

   valueEnd = i;
   return result;
  }

//+------------------------------------------------------------------+
//| Extract a raw JSON value (number, bool, null, object, array)      |
//+------------------------------------------------------------------+
string CJsonParser::ExtractRawValue(int valueStart, int &valueEnd)
  {
   if(valueStart >= m_len)
     {
      valueEnd = valueStart;
      return "";
     }

   ushort ch = StringGetCharacter(m_json, valueStart);

   // String
   if(ch == '"')
      return ExtractStringValue(valueStart, valueEnd);

   // Object
   if(ch == '{')
     {
      int close = FindMatchingBrace(valueStart, '{', '}');
      if(close < 0) { valueEnd = m_len; return ""; }
      valueEnd = close + 1;
      return StringSubstr(m_json, valueStart, valueEnd - valueStart);
     }

   // Array
   if(ch == '[')
     {
      int close = FindMatchingBrace(valueStart, '[', ']');
      if(close < 0) { valueEnd = m_len; return ""; }
      valueEnd = close + 1;
      return StringSubstr(m_json, valueStart, valueEnd - valueStart);
     }

   // Primitive (number, true, false, null)
   int i = valueStart;
   while(i < m_len)
     {
      ushort c = StringGetCharacter(m_json, i);
      if(c == ',' || c == '}' || c == ']' || c == ' ' || c == '\r' || c == '\n' || c == '\t')
         break;
      i++;
     }
   valueEnd = i;
   return StringSubstr(m_json, valueStart, i - valueStart);
  }

//+------------------------------------------------------------------+
//| GetString - Get a string value by key                             |
//+------------------------------------------------------------------+
string CJsonParser::GetString(const string &key)
  {
   int valPos = FindKeyValue(key, 0, m_len);
   if(valPos < 0)
      return "";

   int endPos = 0;
   return ExtractStringValue(valPos, endPos);
  }

//+------------------------------------------------------------------+
//| GetDouble - Get a numeric value as double                         |
//+------------------------------------------------------------------+
double CJsonParser::GetDouble(const string &key)
  {
   int valPos = FindKeyValue(key, 0, m_len);
   if(valPos < 0)
      return 0.0;

   int endPos = 0;
   string raw = ExtractRawValue(valPos, endPos);
   return StringToDouble(raw);
  }

//+------------------------------------------------------------------+
//| GetInt - Get a numeric value as int                               |
//+------------------------------------------------------------------+
int CJsonParser::GetInt(const string &key)
  {
   int valPos = FindKeyValue(key, 0, m_len);
   if(valPos < 0)
      return 0;

   int endPos = 0;
   string raw = ExtractRawValue(valPos, endPos);
   return (int)StringToInteger(raw);
  }

//+------------------------------------------------------------------+
//| GetLong - Get a numeric value as long                             |
//+------------------------------------------------------------------+
long CJsonParser::GetLong(const string &key)
  {
   int valPos = FindKeyValue(key, 0, m_len);
   if(valPos < 0)
      return 0;

   int endPos = 0;
   string raw = ExtractRawValue(valPos, endPos);
   return StringToInteger(raw);
  }

//+------------------------------------------------------------------+
//| GetBool - Get a boolean value                                     |
//+------------------------------------------------------------------+
bool CJsonParser::GetBool(const string &key)
  {
   int valPos = FindKeyValue(key, 0, m_len);
   if(valPos < 0)
      return false;

   int endPos = 0;
   string raw = ExtractRawValue(valPos, endPos);
   return (raw == "true");
  }

//+------------------------------------------------------------------+
//| GetArraySize - Count elements in a JSON array value               |
//+------------------------------------------------------------------+
int CJsonParser::GetArraySize(const string &key)
  {
   int valPos = FindKeyValue(key, 0, m_len);
   if(valPos < 0)
      return 0;

   if(StringGetCharacter(m_json, valPos) != '[')
      return 0;

   int closePos = FindMatchingBrace(valPos, '[', ']');
   if(closePos < 0)
      return 0;

   // Check for empty array
   int inner = SkipWhitespace(valPos + 1);
   if(inner >= closePos)
      return 0;

   // Count top-level elements by counting commas at depth 0
   int count = 1;
   bool inStr = false;
   int depth = 0;
   for(int i = valPos + 1; i < closePos; i++)
     {
      ushort ch = StringGetCharacter(m_json, i);

      if(inStr)
        {
         if(ch == '\\') { i++; continue; }
         if(ch == '"') inStr = false;
         continue;
        }

      if(ch == '"')  { inStr = true; continue; }
      if(ch == '{' || ch == '[') { depth++; continue; }
      if(ch == '}' || ch == ']') { depth--; continue; }
      if(ch == ',' && depth == 0) count++;
     }

   return count;
  }

//+------------------------------------------------------------------+
//| GetArrayElement - Get nth element from root-level array           |
//+------------------------------------------------------------------+
string CJsonParser::GetArrayElement(int index)
  {
   if(m_len < 2)
      return "";

   int start = SkipWhitespace(0);
   if(StringGetCharacter(m_json, start) != '[')
      return "";

   return GetArrayElementByKey("", index);
  }

//+------------------------------------------------------------------+
//| GetArrayElementByKey - Get nth element of a named array           |
//+------------------------------------------------------------------+
string CJsonParser::GetArrayElementByKey(const string &key, int index)
  {
   int arrStart;

   if(key == "")
     {
      arrStart = SkipWhitespace(0);
     }
   else
     {
      arrStart = FindKeyValue(key, 0, m_len);
     }

   if(arrStart < 0 || arrStart >= m_len)
      return "";

   if(StringGetCharacter(m_json, arrStart) != '[')
      return "";

   int closeArr = FindMatchingBrace(arrStart, '[', ']');
   if(closeArr < 0)
      return "";

   // Walk through elements
   int elemIdx = 0;
   int pos = SkipWhitespace(arrStart + 1);

   while(pos < closeArr)
     {
      int endPos = 0;
      string val = ExtractRawValue(pos, endPos);

      if(elemIdx == index)
         return val;

      elemIdx++;

      // Skip to next element
      pos = SkipWhitespace(endPos);
      if(pos < closeArr && StringGetCharacter(m_json, pos) == ',')
         pos = SkipWhitespace(pos + 1);
     }

   return "";
  }

//+------------------------------------------------------------------+
//| FromString - Static helper to create parser from substring        |
//+------------------------------------------------------------------+
static CJsonParser CJsonParser::FromString(const string &json)
  {
   CJsonParser p;
   p.Parse(json);
   return p;
  }

#endif // EDGERELAY_JSONPARSER_MQH
