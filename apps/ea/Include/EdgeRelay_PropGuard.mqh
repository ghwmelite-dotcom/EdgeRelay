//+------------------------------------------------------------------+
//|                                      EdgeRelay_PropGuard.mqh     |
//|                  EdgeRelay PropGuard - Trade Rule Enforcement     |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_PROPGUARD_MQH
#define EDGERELAY_PROPGUARD_MQH

#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Equity.mqh>

//+------------------------------------------------------------------+
//| PropGuard rule engine class                                       |
//| All checks use cached data — NO WebRequest calls.                |
//| Must complete in <1ms.                                            |
//+------------------------------------------------------------------+
class CPropGuard
  {
private:
   PropGuardRules    m_rules;
   CEquityTracker   *m_equity;
   bool              m_enabled;
   bool              m_locked;

   //--- Cached news events
   struct NewsEvent
     {
      string         currency;
      datetime       event_time;
      string         event_name;
     };
   NewsEvent         m_newsEvents[];
   int               m_newsCount;
   datetime          m_newsLastFetch;

   //--- Blocked trade counters
   int               m_blockedToday;
   string            m_lastBlockedRule;
   string            m_lastBlockedSymbol;
   datetime          m_lastBlockedTime;

   //--- Individual checks (return true if ALLOWED)
   bool              CheckInstrument(string symbol, PropGuardVerdict &verdict);
   bool              CheckTradingHours(PropGuardVerdict &verdict);
   bool              CheckNewsBlackout(string symbol, PropGuardVerdict &verdict);
   bool              CheckMaxPositions(PropGuardVerdict &verdict);
   bool              CheckLotSize(double volume, PropGuardVerdict &verdict);
   bool              CheckDailyTradeCount(PropGuardVerdict &verdict);
   bool              CheckDailyLoss(double volume, double sl, double price,
                                    string symbol, ENUM_ORDER_TYPE type, PropGuardVerdict &verdict);
   bool              CheckTotalDrawdown(double volume, double sl, double price,
                                        string symbol, ENUM_ORDER_TYPE type, PropGuardVerdict &verdict);
   bool              CheckConsistency(PropGuardVerdict &verdict);
   bool              CheckWeekendHolding(PropGuardVerdict &verdict);

   //--- Helpers
   double            CalculateWorstCaseLoss(string symbol, double volume, double sl,
                                            double price, ENUM_ORDER_TYPE type);
   void              RecordBlock(PropGuardVerdict &verdict, string symbol);

public:
                     CPropGuard();
                    ~CPropGuard();

   void              Init(const PropGuardRules &rules, CEquityTracker *equity);
   void              SetRules(const PropGuardRules &rules);
   void              SetEnabled(bool enabled) { m_enabled = enabled; }
   bool              IsEnabled() const { return m_enabled; }
   bool              IsLocked() const { return m_locked; }
   void              Unlock() { m_locked = false; }

   PropGuardVerdict  EvaluateTrade(string symbol, ENUM_ORDER_TYPE type,
                                   double volume, double price, double sl, double tp);

   int               EmergencyCloseAll(string reason);

   void              UpdateNewsCache(const string &jsonEvents);
   bool              ShouldRefreshNews();

   int               GetBlockedToday() const { return m_blockedToday; }
   string            GetLastBlockedRule() const { return m_lastBlockedRule; }
   string            GetLastBlockedSymbol() const { return m_lastBlockedSymbol; }
   datetime          GetLastBlockedTime() const { return m_lastBlockedTime; }
   void              ResetDailyBlockCount() { m_blockedToday = 0; }
  };

//+------------------------------------------------------------------+
CPropGuard::CPropGuard()
  {
   m_enabled = false;
   m_locked = false;
   m_equity = NULL;
   m_newsCount = 0;
   m_newsLastFetch = 0;
   m_blockedToday = 0;
   m_lastBlockedRule = "";
   m_lastBlockedSymbol = "";
   m_lastBlockedTime = 0;
   ZeroMemory(m_rules);
  }

//+------------------------------------------------------------------+
CPropGuard::~CPropGuard() {}

//+------------------------------------------------------------------+
void CPropGuard::Init(const PropGuardRules &rules, CEquityTracker *equity)
  {
   m_rules = rules;
   m_equity = equity;
   m_enabled = true;
   m_locked = false;
   m_blockedToday = 0;
   Print("[PropGuard] Rule engine initialized. MaxDD=",
         DoubleToString(rules.max_total_drawdown_percent, 1), "%",
         " DailyLoss=", DoubleToString(rules.max_daily_loss_percent, 1), "%",
         " DDType=", EnumToString(rules.drawdown_type));
  }

//+------------------------------------------------------------------+
void CPropGuard::SetRules(const PropGuardRules &rules)
  {
   m_rules = rules;
  }

//+------------------------------------------------------------------+
PropGuardVerdict CPropGuard::EvaluateTrade(string symbol, ENUM_ORDER_TYPE type,
                                            double volume, double price, double sl, double tp)
  {
   PropGuardVerdict verdict;
   verdict.allowed = false;
   verdict.blocked_rule = "";
   verdict.blocked_reason = "";

   if(m_equity != NULL)
     {
      verdict.current_daily_loss_pct = MathAbs(MathMin(m_equity.GetDailyPnlPercent(), 0));
      verdict.current_drawdown_pct = m_equity.GetTotalDrawdownPercent();
     }
   else
     {
      verdict.current_daily_loss_pct = 0;
      verdict.current_drawdown_pct = 0;
     }
   verdict.projected_daily_loss_pct = verdict.current_daily_loss_pct;
   verdict.projected_drawdown_pct = verdict.current_drawdown_pct;

   if(!m_enabled)
     {
      verdict.allowed = true;
      return verdict;
     }

   if(m_locked)
     {
      verdict.blocked_rule = "session_locked";
      verdict.blocked_reason = "Session locked after critical event. Restart EA to unlock.";
      return verdict;
     }

   // 1. Instrument check
   if(!CheckInstrument(symbol, verdict)) { RecordBlock(verdict, symbol); return verdict; }
   // 2. Trading hours
   if(!CheckTradingHours(verdict)) { RecordBlock(verdict, symbol); return verdict; }
   // 3. News blackout
   if(!CheckNewsBlackout(symbol, verdict)) { RecordBlock(verdict, symbol); return verdict; }
   // 4. Max open positions
   if(!CheckMaxPositions(verdict)) { RecordBlock(verdict, symbol); return verdict; }
   // 5. Lot size
   if(!CheckLotSize(volume, verdict)) { RecordBlock(verdict, symbol); return verdict; }
   // 6. Daily trade count
   if(!CheckDailyTradeCount(verdict)) { RecordBlock(verdict, symbol); return verdict; }
   // 7. Daily loss projection
   if(!CheckDailyLoss(volume, sl, price, symbol, type, verdict)) { RecordBlock(verdict, symbol); return verdict; }
   // 8. Total drawdown projection
   if(!CheckTotalDrawdown(volume, sl, price, symbol, type, verdict)) { RecordBlock(verdict, symbol); return verdict; }
   // 9. Consistency check (warn only)
   CheckConsistency(verdict);
   // 10. Weekend holding
   if(!CheckWeekendHolding(verdict)) { RecordBlock(verdict, symbol); return verdict; }

   verdict.allowed = true;
   return verdict;
  }

//+------------------------------------------------------------------+
void CPropGuard::RecordBlock(PropGuardVerdict &verdict, string symbol)
  {
   m_blockedToday++;
   m_lastBlockedRule = verdict.blocked_rule;
   m_lastBlockedSymbol = symbol;
   m_lastBlockedTime = TimeCurrent();
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckInstrument(string symbol, PropGuardVerdict &verdict)
  {
   // Instrument filter — placeholder for symbol allow/block lists
   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckTradingHours(PropGuardVerdict &verdict)
  {
   if(m_rules.allowed_trading_start == "00:00" && m_rules.allowed_trading_end == "23:59")
      return true;

   MqlDateTime dt;
   TimeCurrent(dt);
   string currentTime = StringFormat("%02d:%02d", dt.hour, dt.min);

   if(currentTime < m_rules.allowed_trading_start || currentTime > m_rules.allowed_trading_end)
     {
      verdict.blocked_rule = "trading_hours";
      verdict.blocked_reason = "Outside trading hours (" + m_rules.allowed_trading_start +
                               " - " + m_rules.allowed_trading_end + "). Current: " + currentTime;
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckNewsBlackout(string symbol, PropGuardVerdict &verdict)
  {
   if(!m_rules.block_during_news || m_newsCount == 0)
      return true;

   datetime now = TimeCurrent();

   string base = StringSubstr(symbol, 0, 3);
   string quote = (StringLen(symbol) >= 6) ? StringSubstr(symbol, 3, 3) : "";

   for(int i = 0; i < m_newsCount; i++)
     {
      if(m_newsEvents[i].currency != base && m_newsEvents[i].currency != quote)
         continue;

      datetime eventTime = m_newsEvents[i].event_time;
      datetime blackoutStart = eventTime - m_rules.news_minutes_before * 60;
      datetime blackoutEnd   = eventTime + m_rules.news_minutes_after * 60;

      if(now >= blackoutStart && now <= blackoutEnd)
        {
         verdict.blocked_rule = "news_blackout";
         verdict.blocked_reason = "News blackout: " + m_newsEvents[i].event_name +
                                  " (" + m_newsEvents[i].currency + ") at " +
                                  TimeToString(eventTime, TIME_MINUTES);
         return false;
        }
     }

   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckMaxPositions(PropGuardVerdict &verdict)
  {
   if(m_rules.max_open_positions <= 0)
      return true;

   int currentPositions = (m_equity != NULL) ? m_equity.GetPositionsOpen() : PositionsTotal();

   if(currentPositions >= m_rules.max_open_positions)
     {
      verdict.blocked_rule = "max_positions";
      verdict.blocked_reason = "Max positions reached: " + IntegerToString(currentPositions) +
                               "/" + IntegerToString(m_rules.max_open_positions);
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckLotSize(double volume, PropGuardVerdict &verdict)
  {
   if(m_rules.max_lot_size <= 0)
      return true;

   if(volume > m_rules.max_lot_size)
     {
      verdict.blocked_rule = "max_lot_size";
      verdict.blocked_reason = "Lot size " + DoubleToString(volume, 2) +
                               " exceeds max " + DoubleToString(m_rules.max_lot_size, 2);
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckDailyTradeCount(PropGuardVerdict &verdict)
  {
   if(m_rules.max_daily_trades <= 0)
      return true;

   int tradesToday = (m_equity != NULL) ? m_equity.GetTradesToday() : 0;

   if(tradesToday >= m_rules.max_daily_trades)
     {
      verdict.blocked_rule = "max_daily_trades";
      verdict.blocked_reason = "Daily trade limit reached: " + IntegerToString(tradesToday) +
                               "/" + IntegerToString(m_rules.max_daily_trades);
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckDailyLoss(double volume, double sl, double price,
                                 string symbol, ENUM_ORDER_TYPE type, PropGuardVerdict &verdict)
  {
   if(m_rules.max_daily_loss_percent <= 0 || m_equity == NULL)
      return true;

   double worstCase = CalculateWorstCaseLoss(symbol, volume, sl, price, type);
   double dailyRef = m_equity.GetBalanceStartOfDay();

   if(m_rules.daily_loss_calculation == DL_EQUITY_HIGH_OF_DAY)
      dailyRef = m_equity.GetEquityHighOfDay();

   double currentLoss = MathAbs(MathMin(m_equity.GetState().daily_pnl, 0));
   double projectedLoss = currentLoss + worstCase;
   double projectedPct = (dailyRef > 0) ? (projectedLoss / dailyRef) * 100.0 : 0;

   verdict.projected_daily_loss_pct = projectedPct;

   if(projectedPct >= m_rules.max_daily_loss_percent)
     {
      verdict.blocked_rule = "daily_loss";
      verdict.blocked_reason = "Would breach daily loss: " + DoubleToString(projectedPct, 2) +
                               "% (limit " + DoubleToString(m_rules.max_daily_loss_percent, 1) + "%)";
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckTotalDrawdown(double volume, double sl, double price,
                                     string symbol, ENUM_ORDER_TYPE type, PropGuardVerdict &verdict)
  {
   if(m_rules.max_total_drawdown_percent <= 0 || m_equity == NULL)
      return true;

   double worstCase = CalculateWorstCaseLoss(symbol, volume, sl, price, type);
   double equity = m_equity.GetState().equity;
   double projectedEquity = equity - worstCase;

   double ddBase;
   if(m_rules.drawdown_type == DD_STATIC)
     {
      ddBase = (m_rules.initial_balance > 0) ? m_rules.initial_balance : m_equity.GetBalanceStartOfDay();
     }
   else
     {
      ddBase = m_equity.GetHighWaterMark();
     }

   double projectedDD = (ddBase > 0) ? ((ddBase - projectedEquity) / ddBase) * 100.0 : 0;
   if(projectedDD < 0) projectedDD = 0;

   verdict.projected_drawdown_pct = projectedDD;

   if(projectedDD >= m_rules.max_total_drawdown_percent)
     {
      verdict.blocked_rule = "max_drawdown";
      verdict.blocked_reason = "Would breach drawdown: " + DoubleToString(projectedDD, 2) +
                               "% (limit " + DoubleToString(m_rules.max_total_drawdown_percent, 1) + "%)";
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckConsistency(PropGuardVerdict &verdict)
  {
   if(!m_rules.consistency_rule_enabled || m_equity == NULL)
      return true;

   double todayPnl = m_equity.GetState().daily_pnl;
   if(todayPnl <= 0) return true;

   double totalProfit = m_equity.GetState().equity -
      ((m_rules.initial_balance > 0) ? m_rules.initial_balance : m_equity.GetBalanceStartOfDay());
   if(totalProfit <= 0) return true;

   double dayRatio = (todayPnl / totalProfit) * 100.0;
   if(dayRatio > m_rules.max_profit_single_day_pct)
     {
      Print("[PropGuard] CONSISTENCY WARNING: Today's profit is ",
            DoubleToString(dayRatio, 1), "% of total (max ",
            DoubleToString(m_rules.max_profit_single_day_pct, 1), "%)");
     }

   return true;
  }

//+------------------------------------------------------------------+
bool CPropGuard::CheckWeekendHolding(PropGuardVerdict &verdict)
  {
   if(!m_rules.block_weekend_holding)
      return true;

   MqlDateTime dt;
   TimeCurrent(dt);

   if(dt.day_of_week != 5)
      return true;

   string currentTime = StringFormat("%02d:%02d", dt.hour, dt.min);

   if(currentTime >= "22:00")
     {
      verdict.blocked_rule = "weekend_holding";
      verdict.blocked_reason = "No new positions after Friday 22:00 (weekend holding block)";
      return false;
     }

   return true;
  }

//+------------------------------------------------------------------+
double CPropGuard::CalculateWorstCaseLoss(string symbol, double volume, double sl,
                                           double price, ENUM_ORDER_TYPE type)
  {
   double pointSize = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);

   if(pointSize <= 0 || tickValue <= 0 || tickSize <= 0)
      return volume * 100.0;

   double slDistance = 0;

   if(sl > 0 && price > 0)
     {
      slDistance = MathAbs(price - sl);
     }
   else
     {
      slDistance = 100.0 * pointSize;
     }

   double lossPerPoint = (tickValue / tickSize);
   double worstCase = volume * slDistance * lossPerPoint;

   return MathAbs(worstCase);
  }

//+------------------------------------------------------------------+
int CPropGuard::EmergencyCloseAll(string reason)
  {
   int closed = 0;
   int total = PositionsTotal();

   Print("[PropGuard] EMERGENCY CLOSE ALL: ", reason, " Positions=", total);

   for(int i = total - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0) continue;

      string symbol = PositionGetString(POSITION_SYMBOL);
      double volume = PositionGetDouble(POSITION_VOLUME);
      ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

      MqlTradeRequest request = {};
      MqlTradeResult  result  = {};

      request.action   = TRADE_ACTION_DEAL;
      request.position = ticket;
      request.symbol   = symbol;
      request.volume   = volume;
      request.type     = (posType == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
      request.price    = (posType == POSITION_TYPE_BUY)
                         ? SymbolInfoDouble(symbol, SYMBOL_BID)
                         : SymbolInfoDouble(symbol, SYMBOL_ASK);
      request.deviation = 50;
      request.type_filling = ORDER_FILLING_IOC;
      request.comment  = "PG:EMERGENCY";

      if(OrderSend(request, result))
        {
         if(result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED)
            closed++;
        }
      else
        {
         Print("[PropGuard] Failed to close ticket ", ticket, " retcode=", result.retcode);
        }
     }

   m_locked = true;

   Print("[PropGuard] Emergency close complete. Closed=", closed, "/", total);
   return closed;
  }

//+------------------------------------------------------------------+
void CPropGuard::UpdateNewsCache(const string &jsonEvents)
  {
   m_newsCount = 0;
   ArrayResize(m_newsEvents, 50);

   int pos = 0;
   int len = StringLen(jsonEvents);

   while(pos < len && m_newsCount < 50)
     {
      int objStart = StringFind(jsonEvents, "{", pos);
      if(objStart < 0) break;
      int objEnd = StringFind(jsonEvents, "}", objStart);
      if(objEnd < 0) break;

      string obj = StringSubstr(jsonEvents, objStart, objEnd - objStart + 1);

      int curPos = StringFind(obj, "\"currency\":\"");
      if(curPos >= 0)
        {
         curPos += 12;
         int curEnd = StringFind(obj, "\"", curPos);
         m_newsEvents[m_newsCount].currency = StringSubstr(obj, curPos, curEnd - curPos);
        }

      int timePos = StringFind(obj, "\"event_time\":\"");
      if(timePos >= 0)
        {
         timePos += 14;
         int timeEnd = StringFind(obj, "\"", timePos);
         string timeStr = StringSubstr(obj, timePos, timeEnd - timePos);
         StringReplace(timeStr, "T", " ");
         m_newsEvents[m_newsCount].event_time = StringToTime(timeStr);
        }

      int namePos = StringFind(obj, "\"event_name\":\"");
      if(namePos >= 0)
        {
         namePos += 14;
         int nameEnd = StringFind(obj, "\"", namePos);
         m_newsEvents[m_newsCount].event_name = StringSubstr(obj, namePos, nameEnd - namePos);
        }

      m_newsCount++;
      pos = objEnd + 1;
     }

   ArrayResize(m_newsEvents, m_newsCount);
   m_newsLastFetch = TimeCurrent();

   Print("[PropGuard] News cache updated. Events=", m_newsCount);
  }

//+------------------------------------------------------------------+
bool CPropGuard::ShouldRefreshNews()
  {
   if(!m_rules.block_during_news)
      return false;
   return (TimeCurrent() - m_newsLastFetch >= 4 * 3600);
  }

#endif // EDGERELAY_PROPGUARD_MQH
