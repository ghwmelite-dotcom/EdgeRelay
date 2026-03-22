//+------------------------------------------------------------------+
//|                                          EdgeRelay_Crypto.mqh    |
//|                         EdgeRelay Master EA - HMAC-SHA256 Auth   |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_CRYPTO_MQH
#define EDGERELAY_CRYPTO_MQH

#include <EdgeRelay_Common.mqh>

//+------------------------------------------------------------------+
//| Convert byte array to hex string                                  |
//+------------------------------------------------------------------+
string BytesToHex(uchar &bytes[], int len)
  {
   string hex = "";
   for(int i = 0; i < len; i++)
     {
      string h = StringFormat("%02x", bytes[i]);
      hex += h;
     }
   return hex;
  }

//+------------------------------------------------------------------+
//| SHA256 hash wrapper                                               |
//+------------------------------------------------------------------+
bool Sha256(uchar &data[], uchar &hash[])
  {
   uchar key[];  // empty key for plain hashing
   return CryptEncode(CRYPT_HASH_SHA256, data, key, hash) > 0;
  }

//+------------------------------------------------------------------+
//| HMAC-SHA256 implementation                                        |
//| RFC 2104: HMAC(K, m) = H((K' ^ opad) || H((K' ^ ipad) || m))    |
//+------------------------------------------------------------------+
string HmacSha256(string message, string key)
  {
   int blockSize = 64;  // SHA256 block size

   //--- Convert key and message to byte arrays
   uchar keyBytes[];
   uchar msgBytes[];
   StringToCharArray(key, keyBytes, 0, StringLen(key));
   StringToCharArray(message, msgBytes, 0, StringLen(message));

   int keyLen = ArraySize(keyBytes);

   //--- If key is longer than block size, hash it
   if(keyLen > blockSize)
     {
      uchar hashedKey[];
      if(!Sha256(keyBytes, hashedKey))
         return "";
      ArrayResize(keyBytes, ArraySize(hashedKey));
      ArrayCopy(keyBytes, hashedKey);
      keyLen = ArraySize(keyBytes);
     }

   //--- Pad key to block size with zeros
   uchar keyPadded[];
   ArrayResize(keyPadded, blockSize);
   ArrayInitialize(keyPadded, 0);
   for(int i = 0; i < keyLen; i++)
      keyPadded[i] = keyBytes[i];

   //--- Create inner and outer padded keys
   uchar ipad[];
   uchar opad[];
   ArrayResize(ipad, blockSize);
   ArrayResize(opad, blockSize);

   for(int i = 0; i < blockSize; i++)
     {
      ipad[i] = (uchar)(keyPadded[i] ^ 0x36);
      opad[i] = (uchar)(keyPadded[i] ^ 0x5C);
     }

   //--- Inner hash: SHA256(ipad || message)
   int msgLen = ArraySize(msgBytes);
   uchar innerData[];
   ArrayResize(innerData, blockSize + msgLen);
   ArrayCopy(innerData, ipad, 0, 0, blockSize);
   ArrayCopy(innerData, msgBytes, blockSize, 0, msgLen);

   uchar innerHash[];
   if(!Sha256(innerData, innerHash))
      return "";

   //--- Outer hash: SHA256(opad || innerHash)
   int innerHashLen = ArraySize(innerHash);
   uchar outerData[];
   ArrayResize(outerData, blockSize + innerHashLen);
   ArrayCopy(outerData, opad, 0, 0, blockSize);
   ArrayCopy(outerData, innerHash, blockSize, 0, innerHashLen);

   uchar outerHash[];
   if(!Sha256(outerData, outerHash))
      return "";

   return BytesToHex(outerHash, ArraySize(outerHash));
  }

//+------------------------------------------------------------------+
//| Sign a signal payload with HMAC-SHA256                            |
//| Sorts fields alphabetically, concatenates key=value pairs         |
//+------------------------------------------------------------------+
string SignPayload(Signal &signal, string apiSecret)
  {
   //--- Build sorted key=value pairs (alphabetical order)
   string payload = "";

   payload += "account_id=" + signal.account_id;
   payload += "&action=" + ActionToString(signal.action);
   payload += "&comment=" + signal.comment;
   payload += "&magic_number=" + IntegerToString(signal.magic_number);
   payload += "&order_type=" + OrderTypeToStr(signal.order_type);

   int digits = (int)SymbolInfoInteger(signal.symbol, SYMBOL_DIGITS);
   if(digits <= 0)
      digits = 5;

   payload += "&price=" + DoubleToString(signal.price, digits);
   payload += "&sequence_num=" + IntegerToString(signal.sequence_num);
   payload += "&signal_id=" + signal.signal_id;
   payload += "&sl=" + DoubleToString(signal.sl, digits);
   payload += "&symbol=" + signal.symbol;
   payload += "&ticket=" + IntegerToString(signal.ticket);
   payload += "&timestamp=" + IntegerToString((long)signal.timestamp);
   payload += "&tp=" + DoubleToString(signal.tp, digits);
   payload += "&volume=" + DoubleToString(signal.volume, 8);

   return HmacSha256(payload, apiSecret);
  }

#endif // EDGERELAY_CRYPTO_MQH
