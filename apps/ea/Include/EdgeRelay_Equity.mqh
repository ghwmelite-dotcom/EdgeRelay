//+------------------------------------------------------------------+
//|                                         EdgeRelay_Equity.mqh     |
//|                      EdgeRelay PropGuard - Equity State Tracker   |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_EQUITY_MQH
#define EDGERELAY_EQUITY_MQH

#include <EdgeRelay_Common.mqh>

//+------------------------------------------------------------------+
//| Equity tracker class                                              |
//| Updates every 1 second via OnTimer, syncs to cloud every 30s     |
//+------------------------------------------------------------------+
class CEquityTracker
  {
private:
   EquityState       m_state;
   PropGuardRules    m_rules;
   bool              m_initialized;
   datetime          m_lastSyncTime;
   datetime          m_lastDayCheck;
   double            m_previousDayBalance;
   double            m_eodHighWaterMark;
   bool              m_hwmLockedAtBreakeven;

   void              ResetDailyCounters();
   double            GetDailyLossReference();

public:
                     CEquityTracker();
                    ~CEquityTracker();

   void              Init(const PropGuardRules &rules);
   void              SetRules(const PropGuardRules &rules);

   EquityState       GetState() const { return m_state; }
   double            GetDailyPnlPercent() const { return m_state.daily_pnl_percent; }
   double            GetTotalDrawdownPercent() const { return m_state.total_drawdown_pct; }
   double            GetHighWaterMark() const { return m_state.high_water_mark; }
   int               GetTradesToday() const { return m_state.trades_today; }
   int               GetPositionsOpen() const { return m_state.positions_open; }
   double            GetBalanceStartOfDay() const { return m_state.balance_start_of_day; }
   double            GetEquityHighOfDay() const { return m_state.equity_high_of_day; }
   ENUM_PROPGUARD_STATUS GetStatus();

   void              Update();
   void              OnTradeExecuted();
   void              OnDayEnd();

   bool              ShouldSync();
   string            ToJson();

   double            CalculateMaxSafeLot(string symbol);
   double            GetProfitPercent();
   double            GetProfitTarget();
  };

//+------------------------------------------------------------------+
CEquityTracker::CEquityTracker()
  {
   m_initialized = false;
   m_lastSyncTime = 0;
   m_lastDayCheck = 0;
   m_previousDayBalance = 0;
   m_eodHighWaterMark = 0;
   m_hwmLockedAtBreakeven = false;
   ZeroMemory(m_state);
   ZeroMemory(m_rules);
  }

//+------------------------------------------------------------------+
CEquityTracker::~CEquityTracker() {}

//+------------------------------------------------------------------+
void CEquityTracker::Init(const PropGuardRules &rules)
  {
   m_rules = rules;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);

   m_state.balance            = balance;
   m_state.equity             = equity;
   m_state.floating_pnl       = equity - balance;
   m_state.daily_pnl          = 0;
   m_state.daily_pnl_percent  = 0;
   m_state.balance_start_of_day = balance;
   m_state.equity_high_of_day = equity;
   m_state.day_start_time     = TimeCurrent();
   m_state.trades_today       = 0;
   m_state.positions_open     = PositionsTotal();

   double initialBal = (m_rules.initial_balance > 0) ? m_rules.initial_balance : balance;
   m_state.high_water_mark = MathMax(initialBal, equity);
   m_eodHighWaterMark = m_state.high_water_mark;
   m_previousDayBalance = balance;

   if(m_rules.drawdown_type == DD_STATIC)
     {
      double ddBase = (m_rules.initial_balance > 0) ? m_rules.initial_balance : balance;
      m_state.total_drawdown_pct = (ddBase > 0) ? ((ddBase - equity) / ddBase) * 100.0 : 0;
     }
   else
     {
      m_state.total_drawdown_pct = (m_state.high_water_mark > 0)
         ? ((m_state.high_water_mark - equity) / m_state.high_water_mark) * 100.0 : 0;
     }

   if(m_state.total_drawdown_pct < 0) m_state.total_drawdown_pct = 0;

   m_lastSyncTime = TimeCurrent();
   m_lastDayCheck = TimeCurrent();
   m_initialized = true;

   Print("[PropGuard] Equity tracker initialized. Balance=", DoubleToString(balance, 2),
         " HWM=", DoubleToString(m_state.high_water_mark, 2),
         " DD%=", DoubleToString(m_state.total_drawdown_pct, 2));
  }

//+------------------------------------------------------------------+
void CEquityTracker::SetRules(const PropGuardRules &rules)
  {
   m_rules = rules;
  }

//+------------------------------------------------------------------+
void CEquityTracker::Update()
  {
   if(!m_initialized) return;

   MqlDateTime dtNow, dtLast;
   TimeCurrent(dtNow);
   TimeToStruct(m_lastDayCheck, dtLast);

   if(dtNow.day != dtLast.day)
     {
      OnDayEnd();
      ResetDailyCounters();
      m_lastDayCheck = TimeCurrent();
     }

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);

   m_state.balance      = balance;
   m_state.equity       = equity;
   m_state.floating_pnl = equity - balance;
   m_state.positions_open = PositionsTotal();

   //--- Update equity high of day
   if(equity > m_state.equity_high_of_day)
      m_state.equity_high_of_day = equity;

   //--- Update high water mark for ALL drawdown types (not just trailing)
   if(m_rules.drawdown_type == DD_TRAILING)
     {
      if(equity > m_state.high_water_mark)
        {
         double initialBal = (m_rules.initial_balance > 0) ? m_rules.initial_balance : m_state.balance_start_of_day;
         if(m_rules.trailing_dd_lock_at_breakeven && m_hwmLockedAtBreakeven)
           {
            // HWM locked, don't update
           }
         else if(m_rules.trailing_dd_lock_at_breakeven && equity >= initialBal)
           {
            m_state.high_water_mark = initialBal;
            m_hwmLockedAtBreakeven = true;
           }
         else
           {
            m_state.high_water_mark = equity;
           }
        }
     }
   else
     {
      //--- For static/EOD trailing: still track HWM for reporting purposes
      if(equity > m_state.high_water_mark)
         m_state.high_water_mark = equity;
     }

   //--- Calculate daily P&L based on BALANCE change from start of day (not equity)
   //--- This avoids floating P&L distortion
   double dailyBalancePnl = balance - m_state.balance_start_of_day;
   double dailyFloatingPnl = equity - balance;
   m_state.daily_pnl = dailyBalancePnl + dailyFloatingPnl; // realized + unrealized today

   //--- Daily loss reference for PropGuard threshold checks
   double dailyRef = GetDailyLossReference();
   m_state.daily_pnl_percent = (dailyRef > 0) ? (m_state.daily_pnl / dailyRef) * 100.0 : 0;

   if(m_rules.drawdown_type == DD_STATIC)
     {
      double ddBase = (m_rules.initial_balance > 0) ? m_rules.initial_balance : m_state.balance_start_of_day;
      m_state.total_drawdown_pct = (ddBase > 0) ? ((ddBase - equity) / ddBase) * 100.0 : 0;
     }
   else if(m_rules.drawdown_type == DD_TRAILING)
     {
      m_state.total_drawdown_pct = (m_state.high_water_mark > 0)
         ? ((m_state.high_water_mark - equity) / m_state.high_water_mark) * 100.0 : 0;
     }
   else // DD_EOD_TRAILING
     {
      m_state.total_drawdown_pct = (m_eodHighWaterMark > 0)
         ? ((m_eodHighWaterMark - equity) / m_eodHighWaterMark) * 100.0 : 0;
     }

   if(m_state.total_drawdown_pct < 0) m_state.total_drawdown_pct = 0;
  }

//+------------------------------------------------------------------+
double CEquityTracker::GetDailyLossReference()
  {
   switch(m_rules.daily_loss_calculation)
     {
      case DL_BALANCE_START_OF_DAY:
         return m_state.balance_start_of_day;
      case DL_EQUITY_HIGH_OF_DAY:
         return m_state.equity_high_of_day;
      case DL_PREVIOUS_DAY_BALANCE:
         return m_previousDayBalance;
     }
   return m_state.balance_start_of_day;
  }

//+------------------------------------------------------------------+
void CEquityTracker::ResetDailyCounters()
  {
   m_previousDayBalance = m_state.balance;
   m_state.balance_start_of_day = m_state.balance;
   m_state.equity_high_of_day = m_state.equity;
   m_state.daily_pnl = 0;
   m_state.daily_pnl_percent = 0;
   m_state.trades_today = 0;
   m_state.day_start_time = TimeCurrent();

   Print("[PropGuard] Daily counters reset. New balance_start=",
         DoubleToString(m_state.balance_start_of_day, 2));
  }

//+------------------------------------------------------------------+
void CEquityTracker::OnDayEnd()
  {
   if(m_rules.drawdown_type == DD_EOD_TRAILING)
     {
      if(m_state.equity > m_eodHighWaterMark)
        {
         double initialBal = (m_rules.initial_balance > 0) ? m_rules.initial_balance : m_state.balance_start_of_day;
         if(m_rules.trailing_dd_lock_at_breakeven && m_state.equity >= initialBal)
           {
            m_eodHighWaterMark = initialBal;
            m_hwmLockedAtBreakeven = true;
           }
         else if(!m_hwmLockedAtBreakeven)
           {
            m_eodHighWaterMark = m_state.equity;
           }
        }
      m_state.high_water_mark = m_eodHighWaterMark;
     }

   Print("[PropGuard] Day end. HWM=", DoubleToString(m_state.high_water_mark, 2),
         " Daily PnL=", DoubleToString(m_state.daily_pnl, 2));
  }

//+------------------------------------------------------------------+
void CEquityTracker::OnTradeExecuted()
  {
   m_state.trades_today++;
  }

//+------------------------------------------------------------------+
ENUM_PROPGUARD_STATUS CEquityTracker::GetStatus()
  {
   double dailyLossPct = MathAbs(MathMin(m_state.daily_pnl_percent, 0));
   double dailyRatio = (m_rules.max_daily_loss_percent > 0)
      ? (dailyLossPct / m_rules.max_daily_loss_percent) * 100.0 : 0;

   double ddRatio = (m_rules.max_total_drawdown_percent > 0)
      ? (m_state.total_drawdown_pct / m_rules.max_total_drawdown_percent) * 100.0 : 0;

   double worstRatio = MathMax(dailyRatio, ddRatio);

   if(worstRatio >= m_rules.critical_threshold_pct)
      return PG_CRITICAL;
   if(worstRatio >= m_rules.warning_threshold_pct)
      return PG_WARNING;

   return PG_PROTECTED;
  }

//+------------------------------------------------------------------+
bool CEquityTracker::ShouldSync()
  {
   return (TimeCurrent() - m_lastSyncTime >= 30);
  }

//+------------------------------------------------------------------+
string CEquityTracker::ToJson()
  {
   m_lastSyncTime = TimeCurrent();

   string json = "{";
   json += "\"balance\":" + DoubleToString(m_state.balance, 2) + ",";
   json += "\"equity\":" + DoubleToString(m_state.equity, 2) + ",";
   json += "\"floating_pnl\":" + DoubleToString(m_state.floating_pnl, 2) + ",";
   json += "\"daily_pnl\":" + DoubleToString(m_state.daily_pnl, 2) + ",";
   json += "\"daily_pnl_percent\":" + DoubleToString(m_state.daily_pnl_percent, 4) + ",";
   json += "\"high_water_mark\":" + DoubleToString(m_state.high_water_mark, 2) + ",";
   json += "\"total_drawdown_percent\":" + DoubleToString(m_state.total_drawdown_pct, 4) + ",";
   json += "\"balance_start_of_day\":" + DoubleToString(m_state.balance_start_of_day, 2) + ",";
   json += "\"equity_high_of_day\":" + DoubleToString(m_state.equity_high_of_day, 2) + ",";
   json += "\"trades_today\":" + IntegerToString(m_state.trades_today) + ",";
   json += "\"positions_open\":" + IntegerToString(m_state.positions_open);
   json += "}";
   return json;
  }

//+------------------------------------------------------------------+
double CEquityTracker::CalculateMaxSafeLot(string symbol)
  {
   double dailyRef = GetDailyLossReference();
   double dailyLossRemaining = (m_rules.max_daily_loss_percent / 100.0 * dailyRef)
                                + m_state.daily_pnl;
   if(dailyLossRemaining < 0) dailyLossRemaining = 0;

   double ddRemaining = 0;
   if(m_rules.drawdown_type == DD_STATIC)
     {
      double ddBase = (m_rules.initial_balance > 0) ? m_rules.initial_balance : m_state.balance_start_of_day;
      double maxDDAmount = m_rules.max_total_drawdown_percent / 100.0 * ddBase;
      double currentDD = ddBase - m_state.equity;
      ddRemaining = maxDDAmount - currentDD;
     }
   else
     {
      double hwm = (m_rules.drawdown_type == DD_EOD_TRAILING) ? m_eodHighWaterMark : m_state.high_water_mark;
      double maxDDAmount = m_rules.max_total_drawdown_percent / 100.0 * hwm;
      double currentDD = hwm - m_state.equity;
      ddRemaining = maxDDAmount - currentDD;
     }
   if(ddRemaining < 0) ddRemaining = 0;

   double buffer = MathMin(dailyLossRemaining, ddRemaining);
   if(buffer <= 0) return 0;

   double pointSize = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);

   if(pointSize <= 0 || tickValue <= 0 || tickSize <= 0)
      return 0;

   double slDistancePoints = 100.0;
   double lossPerLot = slDistancePoints * (tickValue / tickSize) * pointSize;

   if(lossPerLot <= 0) return 0;

   double maxLot = buffer / lossPerLot;

   double lotMin  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double lotMax  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

   if(m_rules.max_lot_size > 0)
      lotMax = MathMin(lotMax, m_rules.max_lot_size);

   maxLot = MathMin(maxLot, lotMax);

   if(lotStep > 0)
      maxLot = MathFloor(maxLot / lotStep) * lotStep;

   if(maxLot < lotMin) maxLot = 0;

   return NormalizeDouble(maxLot, 2);
  }

//+------------------------------------------------------------------+
double CEquityTracker::GetProfitPercent()
  {
   double initialBal = (m_rules.initial_balance > 0) ? m_rules.initial_balance : m_state.balance_start_of_day;
   if(initialBal <= 0) return 0;
   double profit = m_state.equity - initialBal;
   return (profit / initialBal) * 100.0;
  }

//+------------------------------------------------------------------+
double CEquityTracker::GetProfitTarget()
  {
   return m_rules.profit_target_percent;
  }

#endif // EDGERELAY_EQUITY_MQH
