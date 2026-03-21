//+------------------------------------------------------------------+
//|                                          EdgeRelay_Setup.mq5     |
//|                         EdgeRelay - One-Click Setup Script        |
//|                                   https://www.edgerelay.io       |
//+------------------------------------------------------------------+
#property copyright "EdgeRelay"
#property link      "https://www.edgerelay.io"
#property version   "1.00"
#property description "One-click setup for EdgeRelay Follower EA."
#property description "Tests API connection and saves configuration to GlobalVariables."
#property script_show_inputs

//+------------------------------------------------------------------+
//| Script inputs                                                     |
//+------------------------------------------------------------------+
input string   InpAPIKey       = "";                             // API Key
input string   InpAPISecret    = "";                             // API Secret
input string   InpEndpoint     = "https://signal.edgerelay.io";  // API Endpoint
input string   InpAccountID    = "";                             // Follower Account ID
input string   InpMasterID     = "";                             // Master Account ID to follow

//+------------------------------------------------------------------+
//| Global variable key names                                         |
//+------------------------------------------------------------------+
#define GV_PREFIX       "EdgeRelay_"
#define GV_CONFIGURED   "EdgeRelay_Configured"
#define GV_TIMESTAMP    "EdgeRelay_ConfigTimestamp"

//+------------------------------------------------------------------+
//| Script start                                                      |
//+------------------------------------------------------------------+
void OnStart()
  {
   Print("==========================================================");
   Print("[EdgeRelay Setup] Starting configuration...");
   Print("==========================================================");

   //--- Step 1: Validate inputs
   if(!ValidateInputs())
      return;

   //--- Step 2: Test API connection
   Print("[EdgeRelay Setup] Testing connection to: ", InpEndpoint);
   bool connected = TestConnection();

   if(!connected)
     {
      int choice = MessageBox(
                      "Connection test failed!\n\n"
                      "This may be because the API endpoint URL has not been added\n"
                      "to the allowed WebRequest URLs in MetaTrader.\n\n"
                      "Go to: Tools > Options > Expert Advisors\n"
                      "Check 'Allow WebRequest for listed URL'\n"
                      "Add: " + InpEndpoint + "\n\n"
                      "Would you like to save settings anyway?",
                      "EdgeRelay Setup - Connection Failed",
                      MB_YESNO | MB_ICONWARNING);

      if(choice != IDYES)
        {
         Print("[EdgeRelay Setup] Setup cancelled by user.");
         return;
        }
     }
   else
     {
      Print("[EdgeRelay Setup] Connection test PASSED.");
     }

   //--- Step 3: Save settings to GlobalVariables
   SaveSettings();

   //--- Step 4: Show summary
   string summary = "EdgeRelay Setup Complete!\n\n";
   summary += "API Endpoint: " + InpEndpoint + "\n";
   summary += "Account ID: " + InpAccountID + "\n";
   summary += "Master ID: " + InpMasterID + "\n";
   summary += "Connection: " + (connected ? "OK" : "FAILED (check URL whitelist)") + "\n\n";
   summary += "Settings saved to GlobalVariables.\n";
   summary += "You can now attach the EdgeRelay_Follower EA to a chart.";

   MessageBox(summary, "EdgeRelay Setup Complete",
              MB_OK | (connected ? MB_ICONINFORMATION : MB_ICONWARNING));

   Print("[EdgeRelay Setup] Configuration saved successfully.");
   Print("==========================================================");
  }

//+------------------------------------------------------------------+
//| Validate user inputs                                              |
//+------------------------------------------------------------------+
bool ValidateInputs()
  {
   if(InpAPIKey == "")
     {
      MessageBox("API Key is required.\n\nPlease enter your EdgeRelay API Key.",
                 "EdgeRelay Setup - Error", MB_OK | MB_ICONERROR);
      Print("[EdgeRelay Setup] ERROR: API Key is empty.");
      return false;
     }

   if(InpAccountID == "")
     {
      MessageBox("Account ID is required.\n\nPlease enter your follower Account ID.",
                 "EdgeRelay Setup - Error", MB_OK | MB_ICONERROR);
      Print("[EdgeRelay Setup] ERROR: Account ID is empty.");
      return false;
     }

   if(InpMasterID == "")
     {
      MessageBox("Master Account ID is required.\n\nPlease enter the Master Account ID to follow.",
                 "EdgeRelay Setup - Error", MB_OK | MB_ICONERROR);
      Print("[EdgeRelay Setup] ERROR: Master Account ID is empty.");
      return false;
     }

   if(InpEndpoint == "")
     {
      MessageBox("API Endpoint is required.",
                 "EdgeRelay Setup - Error", MB_OK | MB_ICONERROR);
      Print("[EdgeRelay Setup] ERROR: API Endpoint is empty.");
      return false;
     }

   Print("[EdgeRelay Setup] Input validation passed.");
   return true;
  }

//+------------------------------------------------------------------+
//| Test connection to API endpoint /v1/health                        |
//+------------------------------------------------------------------+
bool TestConnection()
  {
   string url = InpEndpoint + "/v1/health";
   string headers = "Content-Type: application/json\r\nX-API-Key: " + InpAPIKey + "\r\n";
   int timeout = 10000;

   char   postData[];
   char   resultData[];
   string resultHeaders;

   ResetLastError();
   int res = WebRequest("GET", url, headers, timeout, postData, resultData, resultHeaders);

   if(res == -1)
     {
      int err = GetLastError();
      Print("[EdgeRelay Setup] WebRequest failed. Error=", err);

      if(err == 4060)
        {
         Print("[EdgeRelay Setup] URL not whitelisted. Add to Tools > Options > Expert Advisors:");
         Print("[EdgeRelay Setup]   ", InpEndpoint);
        }

      return false;
     }

   if(res != 200)
     {
      Print("[EdgeRelay Setup] Health check returned HTTP ", res);
      string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      Print("[EdgeRelay Setup] Response: ", response);
      return false;
     }

   string response = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
   Print("[EdgeRelay Setup] Health response: ", response);
   return true;
  }

//+------------------------------------------------------------------+
//| Save settings to MetaTrader GlobalVariables                       |
//+------------------------------------------------------------------+
void SaveSettings()
  {
   //--- GlobalVariables can only store doubles, so we store strings
   //    via GlobalVariableSet for flags and use file-based storage
   //    for string values.

   //--- Set configured flag
   GlobalVariableSet(GV_CONFIGURED, 1.0);
   GlobalVariableSet(GV_TIMESTAMP, (double)TimeCurrent());

   //--- Store string values in a settings file
   string filename = "EdgeRelay_Settings.ini";
   int handle = FileOpen(filename, FILE_WRITE | FILE_TXT | FILE_ANSI);

   if(handle == INVALID_HANDLE)
     {
      Print("[EdgeRelay Setup] WARNING: Could not create settings file. Error=", GetLastError());
      Print("[EdgeRelay Setup] Settings will only be available via EA input parameters.");
      return;
     }

   FileWriteString(handle, "[EdgeRelay]\r\n");
   FileWriteString(handle, "API_Key=" + InpAPIKey + "\r\n");
   FileWriteString(handle, "API_Secret=" + InpAPISecret + "\r\n");
   FileWriteString(handle, "API_Endpoint=" + InpEndpoint + "\r\n");
   FileWriteString(handle, "AccountID=" + InpAccountID + "\r\n");
   FileWriteString(handle, "MasterAccountID=" + InpMasterID + "\r\n");
   FileWriteString(handle, "ConfiguredAt=" + TimeToString(TimeCurrent()) + "\r\n");

   FileClose(handle);

   Print("[EdgeRelay Setup] Settings saved to: MQL5\\Files\\", filename);
   Print("[EdgeRelay Setup] GlobalVariable '", GV_CONFIGURED, "' set to 1.0");
  }
//+------------------------------------------------------------------+
