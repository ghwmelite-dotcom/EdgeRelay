# EdgeRelay EA Setup Guide

## WebRequest URLs (Required)

Add **both** URLs to MT5: **Tools > Options > Expert Advisors > Allow WebRequest for listed URL**

```
https://edgerelay-signal-ingestion.ghwmelite.workers.dev
https://edgerelay-api.ghwmelite.workers.dev
```

Also ensure **Allow algorithmic trading** is checked.

---

## Master EA — `EdgeRelay_Master.ex5`

Attach to any chart on the **master** MT5 account. This EA monitors all trades and sends signals to the cloud.

### Inputs

| Input | Value | Notes |
|-------|-------|-------|
| `API_Key` | `er_d6b743a23e413cadd706ab2817a9f9f865d38a7c764c9b1e` | Master API key |
| `API_Secret` | `28adb4380e5d7668407f36d0727a01969c2905b2ff4919d7f654698779aa0e15` | For HMAC signing |
| `API_Endpoint` | `https://edgerelay-signal-ingestion.ghwmelite.workers.dev` | Signal ingestion worker |
| `AccountID` | `be7db3edeafc1f55d62af39dbf2881fb` | Master account ID |
| `HeartbeatIntervalMs` | `5000` | Heartbeat every 5 seconds |
| `CopyBuys` | `true` | Send BUY signals |
| `CopySells` | `true` | Send SELL signals |
| `CopyPendings` | `true` | Send pending order signals |
| `CopyModifications` | `true` | Send SL/TP modifications |
| `CopyCloses` | `true` | Send close signals |

### Expected Experts Tab Output
```
[EdgeRelay] Master EA initialized. Account=be7db3edeafc1f55d62af39dbf2881fb
[EdgeRelay] Connected
```

---

## Follower EA — `EdgeRelay_Follower.ex5`

Attach to any chart on the **follower** MT5 account. This EA receives signals and executes trades with PropGuard protection.

### Connection Inputs

| Input | Value | Notes |
|-------|-------|-------|
| `API_Key` | `er_aa44cb4033ed2539525dfed13e8f12d8a13a67e6a282c812` | Follower API key |
| `API_Secret` | `874e933b9df0ac9875c773b1157d4cd506ac504fea91182997bc062c6d9329bf` | For HMAC signing |
| `API_Endpoint` | `https://edgerelay-signal-ingestion.ghwmelite.workers.dev` | Signal ingestion (poll + heartbeat) |
| `API_Gateway` | `https://edgerelay-api.ghwmelite.workers.dev` | API gateway (PropGuard cloud sync) |
| `AccountID` | `b2c11d24c6e3eac6c370facb252b3cc7` | Follower account ID |
| `MasterAccountID` | `be7db3edeafc1f55d62af39dbf2881fb` | Master to follow |

### Copier Inputs

| Input | Value | Notes |
|-------|-------|-------|
| `LotMode` | `LOT_MIRROR` | Mirror master lot size exactly |
| `LotValue` | `1.0` | Multiplier/fixed value (depends on mode) |
| `MaxDailyLossPercent` | `5.0` | Legacy equity guard fallback |
| `MaxTotalDrawdownPercent` | `10.0` | Legacy equity guard fallback |
| `MaxSlippagePoints` | `30` | Max acceptable slippage |
| `AutoReconnect` | `true` | Auto-reconnect on failure |
| `SymbolSuffix` | `` | Leave empty unless broker uses suffixes (e.g. `.m`) |
| `PollIntervalMs` | `500` | Poll every 500ms |
| `CopyBuys` | `true` | Execute BUY signals |
| `CopySells` | `true` | Execute SELL signals |
| `CopyPendings` | `true` | Execute pending orders |
| `InvertDirection` | `false` | Flip buy/sell |

### PropGuard Inputs

| Input | Value | Notes |
|-------|-------|-------|
| `PropGuard_Enabled` | `true` | Enable PropGuard protection |
| `PropGuard_UseCloudRules` | `false` | `false` = use local inputs below; `true` = fetch from dashboard |
| `PropGuard_Preset` | `FTMO_200K` | Display label on chart panel |
| `PropGuard_InitialBalance` | `0` | `0` = auto-detect from account balance |
| `PropGuard_MaxDailyLoss` | `5.0` | Max daily loss % (FTMO = 5%) |
| `PropGuard_MaxDrawdown` | `10.0` | Max total drawdown % (FTMO = 10%) |
| `PropGuard_ProfitTarget` | `10.0` | Profit target % (FTMO Eval = 10%) |
| `PropGuard_DDType` | `DD_STATIC` | `DD_STATIC`, `DD_TRAILING`, or `DD_EOD_TRAILING` |
| `PropGuard_MaxLotSize` | `100.0` | Max lot size per trade |
| `PropGuard_MaxPositions` | `50` | Max open positions |
| `PropGuard_MaxDailyTrades` | `0` | `0` = unlimited |
| `PropGuard_BlockNews` | `false` | Block trades during high-impact news |
| `PropGuard_NewsMinBefore` | `5` | Minutes before news to block |
| `PropGuard_NewsMinAfter` | `5` | Minutes after news to block |
| `PropGuard_BlockWeekend` | `false` | Block new positions after Friday 22:00 |
| `PropGuard_WarnThreshold` | `80.0` | Warning at 80% of limit |
| `PropGuard_CritThreshold` | `95.0` | Critical at 95% of limit |
| `PropGuard_AutoClose` | `true` | Emergency close all at critical |
| `PropGuard_ShowPanel` | `true` | Show PropGuard panel on chart |
| `PropGuard_PanelX` | `10` | Panel X position (pixels from left) |
| `PropGuard_PanelY` | `30` | Panel Y position (pixels from top) |

### PropGuard Presets (Common Prop Firms)

Use these values for `PropGuard_MaxDailyLoss`, `PropGuard_MaxDrawdown`, `PropGuard_ProfitTarget`, and `PropGuard_DDType`:

| Firm & Phase | Daily Loss | Max DD | Target | DD Type |
|-------------|-----------|--------|--------|---------|
| FTMO Evaluation | 5% | 10% | 10% | `DD_STATIC` |
| FTMO Verification | 5% | 10% | 5% | `DD_STATIC` |
| FundedNext Evaluation | 5% | 10% | 10% | `DD_STATIC` |
| The5%ers High Stakes | 5% | 6% | 8% | `DD_TRAILING` |
| Apex Evaluation | 2.5% | 6% | 6% | `DD_EOD_TRAILING` |
| MyFundedFutures | 4% | 6% | 9% | `DD_EOD_TRAILING` |
| TopStep Combine | 2% | 4.5% | 6% | `DD_EOD_TRAILING` |

### Expected Experts Tab Output
```
[PropGuard] Equity tracker initialized. Balance=200000.00 HWM=200000.00 DD%=0.00
[PropGuard] Rule engine initialized. MaxDD=10.0% DailyLoss=5.0% DDType=DD_STATIC
[PropGuard] Initialized. Preset=FTMO_200K
[EdgeRelay] Follower EA initialized. Account=b2c11d24c6e3eac6c370facb252b3cc7 Master=be7db3edeafc1f55d62af39dbf2881fb
[EdgeRelay] LotMode=LOT_MIRROR LotValue=1.00 PollMs=500
```

### PropGuard Panel (On-Chart Display)
```
┌──────────────────────────────────────┐
│  PropGuard    ● PROTECTED            │
│  FTMO_200K                           │
│  Profit:  [████░░░░░░]  2.1/10%      │
│  Daily DD: [██░░░░░░░░]  0.85%       │
│  Total DD: [█░░░░░░░░░]  0.42%       │
│  Trades: 3 today | 2 open            │
│  Max safe lot: 1.25 (EURUSD)         │
│  Last block: none                    │
│  Copier: Connected | 142ms           │
└──────────────────────────────────────┘
```

Colors: Green = safe, Amber = warning (>80%), Red = critical (>95%)

---

## File Locations

### Compiled EAs (copy to VPS)
```
EdgeRelay\apps\ea\EdgeRelay_Master.ex5   → MQL5\Experts\EdgeRelay_Master.ex5
EdgeRelay\apps\ea\EdgeRelay_Follower.ex5 → MQL5\Experts\EdgeRelay_Follower.ex5
```

### Include Files (only needed if recompiling on VPS)
```
EdgeRelay\apps\ea\Include\*.mqh → MQL5\Include\
```

Required includes:
- `EdgeRelay_Common.mqh`
- `EdgeRelay_Crypto.mqh`
- `EdgeRelay_Display.mqh`
- `EdgeRelay_Equity.mqh`
- `EdgeRelay_Http.mqh`
- `EdgeRelay_JsonParser.mqh`
- `EdgeRelay_PropGuard.mqh`
- `EdgeRelay_PropGuardDisplay.mqh`
- `EdgeRelay_Queue.mqh`

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `WebRequest failed: error 4060` | URL not in allowed list | Add both URLs to Tools > Options > Expert Advisors |
| `Poll returned HTTP 404` | Old signal-ingestion worker (no poll route) | Worker has been updated — should be fixed |
| Panel not showing | `PropGuard_ShowPanel = false` or EA init failed | Check Experts tab for errors |
| `EMERGENCY CLOSE` triggered | Daily loss or DD hit critical threshold | Reduce position sizes or widen thresholds |
| `Session locked` after emergency | PropGuard locks after critical event | Remove and re-attach EA to unlock |
| Copier shows `Disconnected` | Normal if Master EA not running | Start Master EA on the other account |
