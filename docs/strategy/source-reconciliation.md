# Source reconciliation — Three Strategies v1

The corrected source is **The Simplest Way To Start Day Trading In 2026 (Full Course)**, 44:08, supplied locally by the user. Video owner: [Scarface Trades](https://www.youtube.com/@ScarfaceTrades). The previous 18-minute video is excluded.

Reviewed the corrected transcript and chart frames at 13:55, 17:48, 21:15 and 32:20. Relevant sections: opening range ~13:10–17:01; previous-day high/low ~17:01–20:03; pre-market high/low ~20:03–22:31; further technical-analysis context follows. Automatic captions are labelled and may contain transcription errors.

The course teaches stocks using a five-minute breakout and one-minute retest, and discusses at least 2R examples. The supplied written playbook adds deterministic 15m pivots, a five-candle retest limit, exact trigger and next-open entry, one-tick invalidation, fixed 2R, 0.5% demo-equity risk including costs, one daily entry, 1% daily net-loss stop, the 11:00 exit, blackout and calendar gates. These are presented as practice additions, not quotations or performance claims by the video owner.

Per the user's correction, apply the framework across markets with **XAUUSD and USDJPY as primary practice instruments**. Each provider/contract needs separate verification and validation. Gold and FX do not open at 09:30 New York; this is the selected reference window. Nonlinear contract sizing must not reuse the linear sizing model. Preserve each provider's candles separately.

The original video is served unchanged from R2, with its title, owner and channel link beside every lesson player. Written lessons derive from the supplied playbook. Historical academy results remain in storage under their original IDs; new lessons have ts-v1 IDs.

## User timing correction — supersedes original timing rules

The user explicitly requires market-specific openings converted to UTC. Active replay now requires a verified instrument/session anchor, close, cutoff and optional pre-session start. Stock 09:30/16:00 and original practice 11:00 are reference-only. Continuous markets require a labelled daily reference. No usable pre-session data means no pre-session setup. Preserve one UTC risk-day limit across accounts. Five-minute replay bars are aligned to the actual minute anchor, including non-five-minute broker opens. This is an explicit adaptation and requires its own validation.

Sources checked 2026-09-20: https://www.ic.com/en/trading-pricing/trading-hours (terminal specification takes precedence; server GMT+2/+3; gold and FX schedules differ), https://www.cmegroup.com/trading-hours.html (contract-specific sessions and maintenance). Do not substitute COMEX hours for an XAUUSD CFD.
