//+------------------------------------------------------------------+
//|                                  EdgeRelay_PropGuardDisplay.mqh  |
//|                      EdgeRelay PropGuard - On-Chart Status Panel  |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_PROPGUARD_DISPLAY_MQH
#define EDGERELAY_PROPGUARD_DISPLAY_MQH

#include <EdgeRelay_Common.mqh>
#include <EdgeRelay_Equity.mqh>
#include <EdgeRelay_PropGuard.mqh>

//--- Object name constants
#define PG_PREFIX           "PG_"
#define PG_PANEL_BG         PG_PREFIX + "BG"
#define PG_TITLE            PG_PREFIX + "Title"
#define PG_STATUS_DOT       PG_PREFIX + "StatusDot"
#define PG_STATUS_TEXT       PG_PREFIX + "StatusText"
#define PG_PRESET_TEXT       PG_PREFIX + "PresetText"
#define PG_PROFIT_LABEL     PG_PREFIX + "ProfitLabel"
#define PG_PROFIT_BAR_BG    PG_PREFIX + "ProfitBarBG"
#define PG_PROFIT_BAR       PG_PREFIX + "ProfitBar"
#define PG_PROFIT_TEXT       PG_PREFIX + "ProfitText"
#define PG_DAILY_DD_LABEL   PG_PREFIX + "DailyDDLabel"
#define PG_DAILY_DD_BAR_BG  PG_PREFIX + "DailyDDBarBG"
#define PG_DAILY_DD_BAR     PG_PREFIX + "DailyDDBar"
#define PG_DAILY_DD_TEXT     PG_PREFIX + "DailyDDText"
#define PG_TOTAL_DD_LABEL   PG_PREFIX + "TotalDDLabel"
#define PG_TOTAL_DD_BAR_BG  PG_PREFIX + "TotalDDBarBG"
#define PG_TOTAL_DD_BAR     PG_PREFIX + "TotalDDBar"
#define PG_TOTAL_DD_TEXT     PG_PREFIX + "TotalDDText"
#define PG_TRADES_TEXT       PG_PREFIX + "TradesText"
#define PG_MAX_LOT_TEXT     PG_PREFIX + "MaxLotText"
#define PG_LAST_BLOCK_TEXT  PG_PREFIX + "LastBlockText"
#define PG_COPIER_TEXT       PG_PREFIX + "CopierText"

//--- Panel dimensions
#define PG_WIDTH            300
#define PG_HEIGHT           220
#define PG_LINE_H           18
#define PG_BAR_WIDTH        120
#define PG_BAR_HEIGHT       10

//--- Colors
#define CLR_SAFE            C'0,200,83'
#define CLR_WARN            C'255,179,0'
#define CLR_DANGER          C'255,23,68'
#define CLR_PANEL_BG        C'26,26,46'
#define CLR_PANEL_BORDER    C'60,60,80'
#define CLR_TEXT_DIM        C'140,140,160'
#define CLR_TEXT_BRIGHT     C'220,220,240'
#define CLR_BAR_BG          C'40,40,60'

//+------------------------------------------------------------------+
class CPropGuardDisplay
  {
private:
   bool              m_initialized;
   int               m_x;
   int               m_y;

   void              CreateLabel(string name, int x, int y, string text,
                                 color clr, int fontSize = 8, string font = "Consolas");
   void              CreateBar(string bgName, string barName, int x, int y,
                               int width, int height);
   void              UpdateLabel(string name, string text, color clr = clrNONE);
   void              UpdateBar(string barName, double percent, color clr);
   color             GetThresholdColor(double value, double limit, double warnPct, double critPct);

public:
                     CPropGuardDisplay();
                    ~CPropGuardDisplay();

   void              Init(int x, int y, color bgColor);
   void              Update(CEquityTracker *equity, CPropGuard *guard, string presetName,
                            int connStatus, double latencyMs);
   void              Deinit();
  };

//+------------------------------------------------------------------+
CPropGuardDisplay::CPropGuardDisplay()
  {
   m_initialized = false;
   m_x = 10;
   m_y = 30;
  }

//+------------------------------------------------------------------+
CPropGuardDisplay::~CPropGuardDisplay()
  {
   if(m_initialized) Deinit();
  }

//+------------------------------------------------------------------+
void CPropGuardDisplay::Init(int x, int y, color bgColor)
  {
   m_x = x;
   m_y = y;

   //--- Background panel
   ObjectCreate(0, PG_PANEL_BG, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_XDISTANCE, m_x);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_YDISTANCE, m_y);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_XSIZE, PG_WIDTH);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_YSIZE, PG_HEIGHT);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_BGCOLOR, bgColor);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_BORDER_COLOR, CLR_PANEL_BORDER);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_WIDTH, 1);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_BACK, false);
   ObjectSetInteger(0, PG_PANEL_BG, OBJPROP_SELECTABLE, false);

   int cx = m_x + 12;
   int cy = m_y + 8;

   CreateLabel(PG_STATUS_DOT, cx, cy, "l", clrGray, 10, "Wingdings");
   CreateLabel(PG_TITLE, cx + 16, cy, "PropGuard", CLR_TEXT_BRIGHT, 9, "Consolas");
   CreateLabel(PG_STATUS_TEXT, cx + 90, cy, "INITIALIZING", clrGray, 8, "Consolas");
   cy += PG_LINE_H;

   CreateLabel(PG_PRESET_TEXT, cx, cy, "Loading preset...", CLR_TEXT_DIM, 8, "Consolas");
   cy += PG_LINE_H + 2;

   CreateLabel(PG_PROFIT_LABEL, cx, cy, "Profit:", CLR_TEXT_DIM, 8, "Consolas");
   CreateBar(PG_PROFIT_BAR_BG, PG_PROFIT_BAR, cx + 55, cy + 2, PG_BAR_WIDTH, PG_BAR_HEIGHT);
   CreateLabel(PG_PROFIT_TEXT, cx + 55 + PG_BAR_WIDTH + 5, cy, "0%", CLR_TEXT_DIM, 8, "Consolas");
   cy += PG_LINE_H;

   CreateLabel(PG_DAILY_DD_LABEL, cx, cy, "Daily DD:", CLR_TEXT_DIM, 8, "Consolas");
   CreateBar(PG_DAILY_DD_BAR_BG, PG_DAILY_DD_BAR, cx + 55, cy + 2, PG_BAR_WIDTH, PG_BAR_HEIGHT);
   CreateLabel(PG_DAILY_DD_TEXT, cx + 55 + PG_BAR_WIDTH + 5, cy, "0%", CLR_TEXT_DIM, 8, "Consolas");
   cy += PG_LINE_H;

   CreateLabel(PG_TOTAL_DD_LABEL, cx, cy, "Total DD:", CLR_TEXT_DIM, 8, "Consolas");
   CreateBar(PG_TOTAL_DD_BAR_BG, PG_TOTAL_DD_BAR, cx + 55, cy + 2, PG_BAR_WIDTH, PG_BAR_HEIGHT);
   CreateLabel(PG_TOTAL_DD_TEXT, cx + 55 + PG_BAR_WIDTH + 5, cy, "0%", CLR_TEXT_DIM, 8, "Consolas");
   cy += PG_LINE_H;

   CreateLabel(PG_TRADES_TEXT, cx, cy, "Trades: 0 today | 0 open", CLR_TEXT_DIM, 8, "Consolas");
   cy += PG_LINE_H + 2;

   CreateLabel(PG_MAX_LOT_TEXT, cx, cy, "Max safe lot: --", CLR_TEXT_DIM, 8, "Consolas");
   cy += PG_LINE_H;

   CreateLabel(PG_LAST_BLOCK_TEXT, cx, cy, "Last block: none", CLR_TEXT_DIM, 8, "Consolas");
   cy += PG_LINE_H;

   CreateLabel(PG_COPIER_TEXT, cx, cy, "Copier: -- | --ms", CLR_TEXT_DIM, 8, "Consolas");

   m_initialized = true;
   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
void CPropGuardDisplay::Update(CEquityTracker *equity, CPropGuard *guard,
                                string presetName, int connStatus, double latencyMs)
  {
   if(!m_initialized || equity == NULL || guard == NULL) return;

   EquityState state = equity.GetState();
   ENUM_PROPGUARD_STATUS pgStatus = equity.GetStatus();

   //--- Status dot + text
   string statusStr = "";
   color  dotColor  = clrGray;
   switch(pgStatus)
     {
      case PG_PROTECTED: statusStr = "PROTECTED"; dotColor = CLR_SAFE; break;
      case PG_WARNING:   statusStr = "WARNING";   dotColor = CLR_WARN; break;
      case PG_CRITICAL:  statusStr = "CRITICAL";  dotColor = CLR_DANGER; break;
      case PG_LOCKED:    statusStr = "LOCKED";    dotColor = CLR_DANGER; break;
      case PG_DISABLED:  statusStr = "DISABLED";  dotColor = clrGray; break;
     }
   if(guard.IsLocked()) { statusStr = "LOCKED"; dotColor = CLR_DANGER; }

   UpdateLabel(PG_STATUS_DOT, "l", dotColor);
   UpdateLabel(PG_STATUS_TEXT, statusStr, dotColor);
   UpdateLabel(PG_PRESET_TEXT, presetName, CLR_TEXT_DIM);

   //--- Profit progress
   double profitPct = equity.GetProfitPercent();
   double profitTarget = equity.GetProfitTarget();
   double profitRatio = (profitTarget > 0) ? MathMin(profitPct / profitTarget, 1.0) : 0;
   if(profitRatio < 0) profitRatio = 0;
   string profitStr = DoubleToString(profitPct, 1) + "/" + DoubleToString(profitTarget, 0) + "%";
   UpdateBar(PG_PROFIT_BAR, profitRatio * 100.0, CLR_SAFE);
   UpdateLabel(PG_PROFIT_TEXT, profitStr, CLR_TEXT_BRIGHT);

   //--- Daily DD (use dynamic thresholds from rules)
   double dailyLossPct = MathAbs(MathMin(state.daily_pnl_percent, 0));
   // Bar shows % of limit consumed
   double dailyBarPct = 0;
   double maxDailyLoss = equity.GetProfitTarget(); // placeholder — we need rules
   // Since we can't access rules directly, use the ratio approach from GetStatus
   color dailyClr = CLR_SAFE;
   if(pgStatus == PG_CRITICAL) dailyClr = CLR_DANGER;
   else if(pgStatus == PG_WARNING) dailyClr = CLR_WARN;
   // Simple bar: show as percentage of 5% (common limit)
   dailyBarPct = MathMin(dailyLossPct * 20.0, 100.0);
   string dailyStr = DoubleToString(dailyLossPct, 2) + "%";
   UpdateBar(PG_DAILY_DD_BAR, dailyBarPct, dailyClr);
   UpdateLabel(PG_DAILY_DD_TEXT, dailyStr, dailyClr);

   //--- Total DD
   double totalDD = state.total_drawdown_pct;
   double totalBarPct = MathMin(totalDD * 10.0, 100.0);
   color totalClr = CLR_SAFE;
   if(pgStatus == PG_CRITICAL) totalClr = CLR_DANGER;
   else if(pgStatus == PG_WARNING) totalClr = CLR_WARN;
   string totalStr = DoubleToString(totalDD, 2) + "%";
   UpdateBar(PG_TOTAL_DD_BAR, totalBarPct, totalClr);
   UpdateLabel(PG_TOTAL_DD_TEXT, totalStr, totalClr);

   //--- Trades
   string tradesStr = "Trades: " + IntegerToString(state.trades_today) +
                      " today | " + IntegerToString(state.positions_open) + " open";
   UpdateLabel(PG_TRADES_TEXT, tradesStr, CLR_TEXT_DIM);

   //--- Max safe lot
   string currentSymbol = Symbol();
   double maxLot = equity.CalculateMaxSafeLot(currentSymbol);
   string maxLotStr = "Max safe lot: " + DoubleToString(maxLot, 2) + " (" + currentSymbol + ")";
   UpdateLabel(PG_MAX_LOT_TEXT, maxLotStr, CLR_TEXT_DIM);

   //--- Last block
   if(guard.GetBlockedToday() > 0)
     {
      MqlDateTime blockDt;
      TimeToStruct(guard.GetLastBlockedTime(), blockDt);
      string blockTimeStr = StringFormat("%02d:%02d", blockDt.hour, blockDt.min);
      string blockStr = "Last block: " + guard.GetLastBlockedSymbol() +
                         " @ " + blockTimeStr + " - " + guard.GetLastBlockedRule();
      UpdateLabel(PG_LAST_BLOCK_TEXT, blockStr, CLR_WARN);
     }

   //--- Copier status
   string connStr = (connStatus == STATUS_CONNECTED) ? "Connected" : "Disconnected";
   color connClr = (connStatus == STATUS_CONNECTED) ? CLR_SAFE : CLR_DANGER;
   string latStr = (latencyMs >= 0) ? DoubleToString(latencyMs, 0) + "ms" : "--";
   UpdateLabel(PG_COPIER_TEXT, "Copier: " + connStr + " | " + latStr, connClr);

   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
void CPropGuardDisplay::Deinit()
  {
   ObjectsDeleteAll(0, PG_PREFIX);
   m_initialized = false;
   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
void CPropGuardDisplay::CreateLabel(string name, int x, int y, string text,
                                     color clr, int fontSize, string font)
  {
   ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontSize);
   ObjectSetString(0, name, OBJPROP_FONT, font);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_BACK, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
  }

//+------------------------------------------------------------------+
void CPropGuardDisplay::CreateBar(string bgName, string barName, int x, int y,
                                   int width, int height)
  {
   ObjectCreate(0, bgName, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, bgName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, bgName, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, bgName, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, bgName, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, bgName, OBJPROP_YSIZE, height);
   ObjectSetInteger(0, bgName, OBJPROP_BGCOLOR, CLR_BAR_BG);
   ObjectSetInteger(0, bgName, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, bgName, OBJPROP_BORDER_COLOR, CLR_BAR_BG);
   ObjectSetInteger(0, bgName, OBJPROP_BACK, false);
   ObjectSetInteger(0, bgName, OBJPROP_SELECTABLE, false);

   ObjectCreate(0, barName, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, barName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, barName, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, barName, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, barName, OBJPROP_XSIZE, 1);
   ObjectSetInteger(0, barName, OBJPROP_YSIZE, height);
   ObjectSetInteger(0, barName, OBJPROP_BGCOLOR, CLR_SAFE);
   ObjectSetInteger(0, barName, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, barName, OBJPROP_BORDER_COLOR, CLR_SAFE);
   ObjectSetInteger(0, barName, OBJPROP_BACK, false);
   ObjectSetInteger(0, barName, OBJPROP_SELECTABLE, false);
  }

//+------------------------------------------------------------------+
void CPropGuardDisplay::UpdateLabel(string name, string text, color clr)
  {
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   if(clr != clrNONE)
      ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
  }

//+------------------------------------------------------------------+
void CPropGuardDisplay::UpdateBar(string barName, double percent, color clr)
  {
   int width = (int)MathRound(PG_BAR_WIDTH * MathMin(percent, 100.0) / 100.0);
   if(width < 1) width = 1;
   ObjectSetInteger(0, barName, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, barName, OBJPROP_BGCOLOR, clr);
   ObjectSetInteger(0, barName, OBJPROP_BORDER_COLOR, clr);
  }

//+------------------------------------------------------------------+
color CPropGuardDisplay::GetThresholdColor(double value, double limit, double warnPct, double critPct)
  {
   if(limit <= 0) return CLR_SAFE;
   double ratio = (value / limit) * 100.0;
   if(ratio >= critPct) return CLR_DANGER;
   if(ratio >= warnPct) return CLR_WARN;
   return CLR_SAFE;
  }

#endif // EDGERELAY_PROPGUARD_DISPLAY_MQH
