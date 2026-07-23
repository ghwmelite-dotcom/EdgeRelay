# TradeMetrics Pro — Promotional Video Content Design

## Overview

Create a library of screen-recorded how-to promotional videos using OBS Studio, targeting TikTok, Twitter/X, and YouTube to drive signups for TradeMetrics Pro (trademetricspro.com).

## Decisions

- **Target audience**: Three personas — retail traders, prop firm traders, signal providers
- **Recording style**: Screen recording + voiceover (no facecam)
- **Format strategy**: Mixed — short-form teasers (30-60s) for TikTok/Twitter + full tutorials (5-8min) for YouTube
- **Audio**: Laptop built-in mic with OBS noise suppression filter chain
- **Recordings done on**: Live account with real data (MT5 500K master, MT5 50K follower)
- **OBS experience level**: Beginner — full setup guidance required

## Content Strategy

### Three Video Series

| Series | Persona | Core hook | Key pages shown |
|--------|---------|-----------|-----------------|
| 1. "Copy My Trades" | Retail traders | Trade copying between accounts in real-time | Dashboard, Downloads, Signal Log, Analytics |
| 2. "Protect Your Funded Account" | Prop firm traders | Never blow a funded account again | Command Center, Risk Dashboard, Discipline, Firm Directory |
| 3. "Monetize Your Edge" | Signal providers | Get paid when traders copy you | Marketplace, Provider Setup, Analytics |

**Priority order**: Series 1 first (broadest audience), then 2 (high pain = high conversion), then 3.

**Posting cadence**: 2 YouTube tutorials/week + 3-4 short-form clips cut from each tutorial.

## OBS Studio Setup

### Scenes

1. **Intro Hook** — Full screen capture + text overlay source (title/hook) + mic audio
2. **Screen Demo** — Browser window capture (trademetricspro.com) + mic audio + mouse highlight
3. **CTA Outro** — Landing page capture or static image + text overlay (signup URL)

### Audio Filter Chain (laptop mic)

Applied in order:
1. **Noise Suppression** — RNNoise (AI-based, built into OBS)
2. **Gain** — +5 to +10 dB
3. **Compressor** — Ratio 3:1, threshold -18dB
4. **Limiter** — -1dB ceiling

### Recording Profiles

| Setting | YouTube | TikTok | Twitter/X |
|---------|---------|--------|-----------|
| Resolution | 1920x1080 | 1080x1920 | 1920x1080 |
| FPS | 30 | 30 | 30 |
| Format | MKV (remux to MP4) | MKV (remux to MP4) | MKV (remux to MP4) |
| Encoder | x264 / NVENC | x264 / NVENC | x264 / NVENC |
| Bitrate | 8,000 Kbps | 6,000 Kbps | 6,000 Kbps |
| Max length | 5-8 min | 60s | 2 min 20s |

TikTok vertical: Record in landscape (1920x1080), crop + zoom for vertical in post.

## Folder Structure

```
promo/
├── obs-profiles/
│   ├── youtube-1080p.json
│   ├── tiktok-vertical.json
│   └── twitter-landscape.json
├── scripts/
│   ├── series-1-copy-trades/
│   │   ├── 01-full-setup-tutorial.md
│   │   ├── 01-clip-wow-moment.md
│   │   ├── 02-dashboard-walkthrough.md
│   │   └── 02-clip-live-copy.md
│   ├── series-2-prop-guard/
│   │   ├── 01-protect-funded-account.md
│   │   ├── 01-clip-saved-my-account.md
│   │   ├── 02-drawdown-alerts.md
│   │   └── 02-clip-drawdown-warning.md
│   └── series-3-signal-provider/
│       ├── 01-monetize-your-edge.md
│       ├── 01-clip-get-paid.md
│       ├── 02-marketplace-setup.md
│       └── 02-clip-first-subscriber.md
├── assets/
│   ├── thumbnails/
│   ├── overlays/
│   └── music/
├── recordings/
│   ├── raw/
│   └── final/
├── guides/
│   ├── obs-setup-guide.md
│   ├── recording-checklist.md
│   └── editing-workflow.md
└── README.md
```

## Video Scripts — Launch Batch (6 videos)

### Series 1, Video 1.1 — YouTube: "How to Copy Trades Between MT5 Accounts in Seconds"

| Timestamp | Section | What to show | Voiceover |
|-----------|---------|-------------|-----------|
| 0:00-0:15 | Hook | Dashboard with both accounts connected, green dots | "What if every trade on your main account instantly appeared on your second account? Let me show you exactly how." |
| 0:15-1:00 | Problem | The pain of manually duplicating trades | "Most traders managing multiple accounts waste time duplicating trades. Miss one entry, different fill price, it adds up." |
| 1:00-2:30 | Setup | Downloads page — install Master EA on 500K, Follower EA on 50K | Walk through EA installation, API key copy flow. |
| 2:30-3:30 | Connect | Dashboard — both terminals go green | "Once both EAs are running, you'll see them light up on your dashboard." |
| 3:30-5:00 | Live demo | Place a trade on 500K, watch it appear on 50K | Hero moment. Signal log updating. Lot sizing (mirror mode). |
| 5:00-5:45 | Analytics | Analytics page — P&L, win rate | "Full analytics across both accounts — no spreadsheets." |
| 5:45-6:15 | CTA | Landing page | "Link's in the description. Free to get started." |

### Series 1, Video 1.1-clip — TikTok/Twitter: "Watch This Trade Copy Itself" (45s)

| Second | What to show | Text overlay |
|--------|-------------|-------------|
| 0-5 | Dashboard, both accounts green | "I trade on 2 accounts. Here's my secret." |
| 5-15 | Open a buy on the 500K | "Opening a trade on my main account..." |
| 15-30 | Dashboard — follower shows same trade | "...and it instantly appears on my second account" |
| 30-40 | Signal log showing the copy | "Every trade. Every time. Automatic." |
| 40-45 | Landing page URL | "Link in bio — TradeMetrics Pro" |

### Series 2, Video 2.1 — YouTube: "How I Protect My Prop Firm Account from Blowing" (6-8 min)

| Timestamp | Section | What to show | Voiceover |
|-----------|---------|-------------|-----------|
| 0:00-0:20 | Hook | Risk Dashboard, drawdown gauge near caution | "I almost lost my funded account last month. Here's what saved it." |
| 0:20-1:15 | Problem | Explain prop firm rules | "One bad trade and your $50K funded account is gone. Most traders track this on a spreadsheet." |
| 1:15-3:00 | Setup | Command Center — link firm template | Walk through firm directory, pick firm/plan, link to account. |
| 3:00-4:30 | Dashboard | Drawdown gauge, daily loss tracking, health score | "Green means safe, amber means slow down, red means stop." |
| 4:30-5:30 | Discipline | Discipline page — rule compliance | "The discipline tab tracks every rule in real-time." |
| 5:30-6:30 | Risk | Risk Dashboard — exposure, correlation | "Full picture — exposure by pair, direction, correlation warnings." |
| 6:30-7:15 | CTA | Landing page | "Stop guessing whether you're safe. Link in the description." |

### Series 2, Video 2.1-clip — TikTok/Twitter: "This Saved My Funded Account" (50s)

| Second | What to show | Text overlay |
|--------|-------------|-------------|
| 0-5 | Risk dashboard | "I almost blew my prop firm account." |
| 5-15 | Drawdown gauge in amber | "My drawdown was creeping up and I didn't even notice." |
| 15-30 | Command Center with firm rules | "Then I set up automated prop firm rules..." |
| 30-40 | Dashboard green health, discipline score | "Now I see exactly where I stand. In real-time." |
| 40-50 | Landing page | "TradeMetrics Pro — link in bio" |

### Series 3, Video 3.1 — YouTube: "How to Get Paid When Traders Copy You" (5-7 min)

| Timestamp | Section | What to show | Voiceover |
|-----------|---------|-------------|-----------|
| 0:00-0:15 | Hook | Marketplace, your listing | "What if you got paid every time another trader copied your trade?" |
| 0:15-1:00 | Problem | Profitable traders leaving money on the table | "You're already making good trades. The only question is whether other people can follow them." |
| 1:00-2:30 | Setup | Provider Setup — profile, pricing | Full provider onboarding walkthrough. |
| 2:30-3:30 | Listing | Marketplace — your listing live | "Your profile shows up with real verified stats." |
| 3:30-4:30 | Follower view | What subscribers see — signals, analytics, copy | "Subscribers see your win rate, average return, copy with one click." |
| 4:30-5:30 | Analytics | Provider analytics — subscribers, signals | "Full dashboard of your subscribers and signal performance." |
| 5:30-6:15 | CTA | Landing page | "Start sharing your edge. Link in the description." |

### Series 3, Video 3.1-clip — TikTok/Twitter: "Get Paid Every Time Someone Copies Your Trade" (40s)

| Second | What to show | Text overlay |
|--------|-------------|-------------|
| 0-5 | Marketplace, your listing | "I make money when I trade." |
| 5-15 | Analytics — subscribers, signals | "But I also make money when OTHER people trade." |
| 15-25 | Provider setup page | "I listed my strategy on a marketplace..." |
| 25-35 | Follower copying your signal | "Now traders pay to copy me automatically." |
| 35-40 | Landing page | "TradeMetrics Pro — link in bio" |
