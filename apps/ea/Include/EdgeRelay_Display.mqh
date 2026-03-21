//+------------------------------------------------------------------+
//|                                         EdgeRelay_Display.mqh    |
//|                        EdgeRelay Master EA - Chart Status Panel  |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property strict

#ifndef EDGERELAY_DISPLAY_MQH
#define EDGERELAY_DISPLAY_MQH

#include "EdgeRelay_Common.mqh"

//--- Object name constants
#define OBJ_PREFIX          "EdgeRelay_"
#define OBJ_PANEL_BG        OBJ_PREFIX + "PanelBG"
#define OBJ_STATUS_DOT      OBJ_PREFIX + "StatusDot"
#define OBJ_TITLE           OBJ_PREFIX + "Title"
#define OBJ_STATUS_TEXT      OBJ_PREFIX + "StatusText"
#define OBJ_SIGNALS_TEXT     OBJ_PREFIX + "SignalsText"
#define OBJ_QUEUE_TEXT       OBJ_PREFIX + "QueueText"
#define OBJ_LATENCY_TEXT     OBJ_PREFIX + "LatencyText"
#define OBJ_LAST_SIGNAL     OBJ_PREFIX + "LastSignalText"

//--- Panel dimensions
#define PANEL_WIDTH         220
#define PANEL_HEIGHT        155
#define PANEL_X_OFFSET      10
#define PANEL_Y_OFFSET      25
#define TEXT_X_OFFSET       25
#define LINE_HEIGHT         20

//+------------------------------------------------------------------+
//| On-chart status display class                                     |
//+------------------------------------------------------------------+
class CEdgeRelayDisplay
  {
private:
   bool              m_initialized;

   void              CreateLabel(string name, int x, int y, string text,
                                 color clr, int fontSize = 9, string font = "Consolas");
   void              UpdateLabel(string name, string text, color clr = clrNONE);

public:
                     CEdgeRelayDisplay();
                    ~CEdgeRelayDisplay();

   void              Init();
   void              Update(int status, int signalCount, int queueSize,
                            double lastLatencyMs, datetime lastSignalTime);
   void              Deinit();
  };

//+------------------------------------------------------------------+
//| Constructor                                                       |
//+------------------------------------------------------------------+
CEdgeRelayDisplay::CEdgeRelayDisplay()
  {
   m_initialized = false;
  }

//+------------------------------------------------------------------+
//| Destructor                                                        |
//+------------------------------------------------------------------+
CEdgeRelayDisplay::~CEdgeRelayDisplay()
  {
   if(m_initialized)
      Deinit();
  }

//+------------------------------------------------------------------+
//| Initialize chart display objects                                  |
//+------------------------------------------------------------------+
void CEdgeRelayDisplay::Init()
  {
   //--- Background panel
   ObjectCreate(0, OBJ_PANEL_BG, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_CORNER, CORNER_RIGHT_UPPER);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_XDISTANCE, PANEL_WIDTH + PANEL_X_OFFSET);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_YDISTANCE, PANEL_Y_OFFSET);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_XSIZE, PANEL_WIDTH);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_YSIZE, PANEL_HEIGHT);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_BGCOLOR, C'25,25,35');
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_BORDER_COLOR, C'60,60,80');
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_WIDTH, 1);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_BACK, false);
   ObjectSetInteger(0, OBJ_PANEL_BG, OBJPROP_SELECTABLE, false);

   int xBase = PANEL_WIDTH + PANEL_X_OFFSET - TEXT_X_OFFSET;
   int yBase = PANEL_Y_OFFSET + 8;

   //--- Status dot (Wingdings circle character 0x6C = 108)
   CreateLabel(OBJ_STATUS_DOT, xBase + 12, yBase, "l", clrGray, 12, "Wingdings");

   //--- Title
   CreateLabel(OBJ_TITLE, xBase - 15, yBase, "EdgeRelay Master v1.0", C'200,200,220', 9, "Consolas");

   //--- Status text
   CreateLabel(OBJ_STATUS_TEXT, xBase, yBase + LINE_HEIGHT, "Initializing...", clrGray);

   //--- Signals sent today
   CreateLabel(OBJ_SIGNALS_TEXT, xBase, yBase + LINE_HEIGHT * 2, "Signals sent: 0", C'160,160,180');

   //--- Queue size
   CreateLabel(OBJ_QUEUE_TEXT, xBase, yBase + LINE_HEIGHT * 3, "Queue size: 0", C'160,160,180');

   //--- Latency
   CreateLabel(OBJ_LATENCY_TEXT, xBase, yBase + LINE_HEIGHT * 4, "Last latency: --", C'160,160,180');

   //--- Last signal time
   CreateLabel(OBJ_LAST_SIGNAL, xBase, yBase + LINE_HEIGHT * 5, "Last signal: --:--:--", C'160,160,180');

   m_initialized = true;
   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
//| Update the display panel                                          |
//+------------------------------------------------------------------+
void CEdgeRelayDisplay::Update(int status, int signalCount, int queueSize,
                               double lastLatencyMs, datetime lastSignalTime)
  {
   if(!m_initialized)
      return;

   //--- Update status dot and text based on connection status
   string statusText = "";
   color  dotColor   = clrGray;

   switch((ENUM_CONNECTION_STATUS)status)
     {
      case STATUS_CONNECTED:
         statusText = "Connected";
         dotColor   = clrLime;
         break;
      case STATUS_DISCONNECTED:
         statusText = "Disconnected";
         dotColor   = clrRed;
         break;
      case STATUS_CONNECTING:
         statusText = "Connecting...";
         dotColor   = clrYellow;
         break;
      case STATUS_ERROR:
         statusText = "Error";
         dotColor   = clrOrangeRed;
         break;
     }

   UpdateLabel(OBJ_STATUS_DOT, "l", dotColor);
   UpdateLabel(OBJ_STATUS_TEXT, statusText);

   //--- Signals sent
   UpdateLabel(OBJ_SIGNALS_TEXT, "Signals sent: " + IntegerToString(signalCount));

   //--- Queue size
   color queueColor = (queueSize > 0) ? clrOrange : C'160,160,180';
   UpdateLabel(OBJ_QUEUE_TEXT, "Queue size: " + IntegerToString(queueSize), queueColor);

   //--- Latency
   string latencyStr = (lastLatencyMs >= 0)
                        ? DoubleToString(lastLatencyMs, 0) + "ms"
                        : "--";
   UpdateLabel(OBJ_LATENCY_TEXT, "Last latency: " + latencyStr);

   //--- Last signal time
   string timeStr = (lastSignalTime > 0)
                     ? TimeToString(lastSignalTime, TIME_SECONDS)
                     : "--:--:--";
   //--- Show only HH:MM:SS
   int spacePos = StringFind(timeStr, " ");
   if(spacePos >= 0)
      timeStr = StringSubstr(timeStr, spacePos + 1);
   UpdateLabel(OBJ_LAST_SIGNAL, "Last signal: " + timeStr);

   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
//| Remove all chart objects                                          |
//+------------------------------------------------------------------+
void CEdgeRelayDisplay::Deinit()
  {
   ObjectDelete(0, OBJ_PANEL_BG);
   ObjectDelete(0, OBJ_STATUS_DOT);
   ObjectDelete(0, OBJ_TITLE);
   ObjectDelete(0, OBJ_STATUS_TEXT);
   ObjectDelete(0, OBJ_SIGNALS_TEXT);
   ObjectDelete(0, OBJ_QUEUE_TEXT);
   ObjectDelete(0, OBJ_LATENCY_TEXT);
   ObjectDelete(0, OBJ_LAST_SIGNAL);

   m_initialized = false;
   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
//| Create a text label on the chart                                  |
//+------------------------------------------------------------------+
void CEdgeRelayDisplay::CreateLabel(string name, int x, int y, string text,
                                    color clr, int fontSize, string font)
  {
   ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_RIGHT_UPPER);
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
//| Update a label's text and optionally its color                    |
//+------------------------------------------------------------------+
void CEdgeRelayDisplay::UpdateLabel(string name, string text, color clr)
  {
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   if(clr != clrNONE)
      ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
  }

#endif // EDGERELAY_DISPLAY_MQH
