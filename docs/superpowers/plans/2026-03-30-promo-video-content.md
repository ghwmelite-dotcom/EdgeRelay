# Promotional Video Content — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete promo video production pipeline — folder structure, OBS setup guides, recording checklists, and 6 fully-scripted videos (3 YouTube tutorials + 3 short-form clips) for TradeMetrics Pro.

**Architecture:** Content lives in `promo/` at repo root. Guides teach OBS from scratch. Each script is a standalone markdown file with timestamped sections, exact voiceover lines, text overlays, and screen directions. OBS profiles are JSON exports importable via OBS Settings > Profile > Import.

**Tech Stack:** OBS Studio 30+, MKV/MP4 recording, markdown scripts, royalty-free asset references.

**Spec:** `docs/superpowers/specs/2026-03-30-promo-video-content-design.md`

---

## File Structure

```
promo/
├── README.md                                   # Project overview, quickstart
├── guides/
│   ├── obs-setup-guide.md                      # Full OBS install + config (beginner)
│   ├── recording-checklist.md                  # Pre-record checklist
│   └── editing-workflow.md                     # Post-recording: remux, crop, trim
├── obs-profiles/
│   ├── youtube-1080p.json                      # OBS profile: 1920x1080, 8Mbps
│   ├── tiktok-vertical.json                    # OBS profile: 1080x1920, 6Mbps
│   └── twitter-landscape.json                  # OBS profile: 1920x1080, 6Mbps
├── scripts/
│   ├── series-1-copy-trades/
│   │   ├── 01-full-setup-tutorial.md           # YouTube 5-7min
│   │   ├── 01-clip-wow-moment.md               # TikTok/Twitter 45s
│   │   ├── 02-dashboard-walkthrough.md         # YouTube 5-7min
│   │   └── 02-clip-live-copy.md                # TikTok/Twitter 45s
│   ├── series-2-prop-guard/
│   │   ├── 01-protect-funded-account.md        # YouTube 6-8min
│   │   ├── 01-clip-saved-my-account.md         # TikTok/Twitter 50s
│   │   ├── 02-drawdown-alerts.md               # YouTube 5-7min
│   │   └── 02-clip-drawdown-warning.md         # TikTok/Twitter 45s
│   ├── series-3-signal-provider/
│   │   ├── 01-monetize-your-edge.md            # YouTube 5-7min
│   │   ├── 01-clip-get-paid.md                 # TikTok/Twitter 40s
│   │   ├── 02-marketplace-setup.md             # YouTube 5-7min
│   │   └── 02-clip-first-subscriber.md         # TikTok/Twitter 40s
├── assets/
│   ├── thumbnails/                             # YouTube thumbnail guidance
│   │   └── thumbnail-guide.md
│   ├── overlays/                               # Text overlay specs
│   │   └── overlay-specs.md
│   └── music/                                  # Royalty-free music references
│       └── music-sources.md
└── recordings/
    ├── raw/                                    # .mkv files from OBS
    │   └── .gitkeep
    └── final/                                  # .mp4 exports per platform
        └── .gitkeep
```

---

## Task 1: Create folder structure and README

**Files:**
- Create: `promo/README.md`
- Create: `promo/recordings/raw/.gitkeep`
- Create: `promo/recordings/final/.gitkeep`

- [ ] **Step 1: Create all directories**

```bash
mkdir -p promo/{guides,obs-profiles,scripts/{series-1-copy-trades,series-2-prop-guard,series-3-signal-provider},assets/{thumbnails,overlays,music},recordings/{raw,final}}
```

- [ ] **Step 2: Create .gitkeep files for empty dirs**

```bash
touch promo/recordings/raw/.gitkeep promo/recordings/final/.gitkeep
```

- [ ] **Step 3: Write promo/README.md**

```markdown
# TradeMetrics Pro — Promotional Video Production

Screen-recorded how-to videos for TikTok, Twitter/X, and YouTube using OBS Studio.

## Quick Start

1. Install OBS Studio — see `guides/obs-setup-guide.md`
2. Import a profile from `obs-profiles/` (start with `youtube-1080p.json`)
3. Run through `guides/recording-checklist.md` before hitting record
4. Follow a script from `scripts/` — each has timestamped directions and voiceover lines
5. After recording, follow `guides/editing-workflow.md` to remux, crop, and export

## Video Series

| Series | Target Audience | Folder |
|--------|----------------|--------|
| 1. Copy My Trades | Retail traders | `scripts/series-1-copy-trades/` |
| 2. Protect Your Funded Account | Prop firm traders | `scripts/series-2-prop-guard/` |
| 3. Monetize Your Edge | Signal providers | `scripts/series-3-signal-provider/` |

## Structure

- `guides/` — OBS setup, recording checklist, editing workflow
- `obs-profiles/` — Importable OBS profile JSONs per platform
- `scripts/` — Video scripts organized by series
- `assets/` — Thumbnails, overlays, music references
- `recordings/` — Raw OBS output and final platform exports

## Platform Specs

| Platform | Resolution | Max Length | Bitrate |
|----------|-----------|-----------|---------|
| YouTube | 1920x1080 | 5-8 min | 8,000 Kbps |
| TikTok | 1080x1920 (crop from landscape) | 60s | 6,000 Kbps |
| Twitter/X | 1920x1080 | 2m 20s | 6,000 Kbps |
```

- [ ] **Step 4: Commit**

```bash
git add promo/
git commit -m "chore: scaffold promo video folder structure and README"
```

---

## Task 2: Write OBS setup guide

**Files:**
- Create: `promo/guides/obs-setup-guide.md`

- [ ] **Step 1: Write the full beginner OBS setup guide**

The guide must cover:
1. Downloading and installing OBS Studio (link to obsproject.com)
2. First-launch auto-config wizard — select "Optimize for recording"
3. Creating the 3 scenes (Intro Hook, Screen Demo, CTA Outro)
4. Adding sources to each scene (Display/Window Capture, Text overlay)
5. Audio setup — selecting laptop mic, adding the 4-filter chain:
   - Noise Suppression (RNNoise)
   - Gain (+5 to +10 dB)
   - Compressor (ratio 3:1, threshold -18dB)
   - Limiter (-1dB ceiling)
6. Output settings — MKV format, x264 or NVENC encoder, bitrate per profile
7. How to import profile JSONs from `obs-profiles/`
8. Test recording walkthrough — record 10s, remux to MP4, verify quality

Include screenshots guidance (where to click in menus) described as text paths: `Settings > Output > Recording`.

- [ ] **Step 2: Commit**

```bash
git add promo/guides/obs-setup-guide.md
git commit -m "docs: add OBS Studio beginner setup guide"
```

---

## Task 3: Write recording checklist

**Files:**
- Create: `promo/guides/recording-checklist.md`

- [ ] **Step 1: Write the pre-recording checklist**

Checklist to run before every recording session:

```markdown
# Recording Checklist

Run through this before every recording session.

## Before You Start

- [ ] Close all unnecessary apps (Slack, email, Discord) — reduces CPU and hides notifications
- [ ] Set Windows to Do Not Disturb (`Win + A` > Focus Assist > Alarms Only)
- [ ] Open only Chrome/Edge with TradeMetrics Pro logged in
- [ ] Hide browser bookmarks bar (`Ctrl+Shift+B`)
- [ ] Zoom browser to 110% (`Ctrl++`) for better readability on small screens
- [ ] Clear browser tabs — only trademetricspro.com open
- [ ] Make sure MT5 terminals are open with both EAs running (for Series 1 demos)

## OBS Checks

- [ ] Correct profile loaded (YouTube / TikTok / Twitter)
- [ ] Preview shows the right scene — no personal info visible
- [ ] Audio meter responding when you speak (green bars bouncing in mixer)
- [ ] Test record 5 seconds, play back, verify video and audio quality
- [ ] Disk space: at least 5 GB free

## Your Setup

- [ ] Glass of water nearby (dry mouth kills voiceover quality)
- [ ] Script open on second monitor or phone (don't tab away during recording)
- [ ] Quiet room — close windows, turn off fans if possible
- [ ] Phone on silent

## Ready

Hit Record. Follow the script. You can always re-record a section.
```

- [ ] **Step 2: Commit**

```bash
git add promo/guides/recording-checklist.md
git commit -m "docs: add pre-recording checklist"
```

---

## Task 4: Write editing workflow guide

**Files:**
- Create: `promo/guides/editing-workflow.md`

- [ ] **Step 1: Write the post-recording editing guide**

Cover:
1. **Remux MKV to MP4** — OBS menu: `File > Remux Recordings`, select the .mkv, click Remux
2. **Trim** — Using free tools: Shotcut (recommended, open source) or Windows Video Editor
   - Open the MP4, cut dead air at start/end, remove long pauses
3. **Crop for TikTok vertical** — In Shotcut: set project to 1080x1920, import landscape footage, use Size/Position/Rotate filter to zoom into the key area (browser center)
4. **Export settings per platform**:
   - YouTube: H.264, 1920x1080, 8Mbps, AAC audio
   - TikTok: H.264, 1080x1920, 6Mbps, AAC audio
   - Twitter: H.264, 1920x1080, 6Mbps, AAC audio, max 512MB
5. **File naming convention**: `series-1_01_youtube_how-to-copy-trades.mp4`
6. **Save raw to** `recordings/raw/`, **final to** `recordings/final/`

- [ ] **Step 2: Commit**

```bash
git add promo/guides/editing-workflow.md
git commit -m "docs: add post-recording editing workflow guide"
```

---

## Task 5: Create OBS profile JSONs

**Files:**
- Create: `promo/obs-profiles/youtube-1080p.json`
- Create: `promo/obs-profiles/tiktok-vertical.json`
- Create: `promo/obs-profiles/twitter-landscape.json`

- [ ] **Step 1: Write YouTube profile**

```json
{
  "name": "TradeMetrics - YouTube 1080p",
  "output": {
    "mode": "Advanced",
    "type": "Standard",
    "format": "mkv",
    "encoder": "x264",
    "rate_control": "CBR",
    "bitrate": 8000,
    "keyframe_interval": 2,
    "preset": "veryfast",
    "profile": "high"
  },
  "video": {
    "base_resolution": "1920x1080",
    "output_resolution": "1920x1080",
    "fps": 30
  },
  "audio": {
    "sample_rate": 48000,
    "channels": "Stereo",
    "bitrate": 192
  },
  "notes": "Record in MKV, remux to MP4 after. Target: 5-8 min tutorials."
}
```

- [ ] **Step 2: Write TikTok profile**

```json
{
  "name": "TradeMetrics - TikTok Vertical",
  "output": {
    "mode": "Advanced",
    "type": "Standard",
    "format": "mkv",
    "encoder": "x264",
    "rate_control": "CBR",
    "bitrate": 6000,
    "keyframe_interval": 2,
    "preset": "veryfast",
    "profile": "high"
  },
  "video": {
    "base_resolution": "1080x1920",
    "output_resolution": "1080x1920",
    "fps": 30
  },
  "audio": {
    "sample_rate": 48000,
    "channels": "Stereo",
    "bitrate": 128
  },
  "notes": "Vertical 9:16. Alternative: record landscape and crop in post (see editing-workflow.md). Target: 60s max."
}
```

- [ ] **Step 3: Write Twitter profile**

```json
{
  "name": "TradeMetrics - Twitter/X",
  "output": {
    "mode": "Advanced",
    "type": "Standard",
    "format": "mkv",
    "encoder": "x264",
    "rate_control": "CBR",
    "bitrate": 6000,
    "keyframe_interval": 2,
    "preset": "veryfast",
    "profile": "high"
  },
  "video": {
    "base_resolution": "1920x1080",
    "output_resolution": "1920x1080",
    "fps": 30
  },
  "audio": {
    "sample_rate": 48000,
    "channels": "Stereo",
    "bitrate": 128
  },
  "notes": "Same as YouTube but lower bitrate. Max 2m20s, max 512MB file size."
}
```

- [ ] **Step 4: Commit**

```bash
git add promo/obs-profiles/
git commit -m "docs: add OBS recording profiles for YouTube, TikTok, Twitter"
```

---

## Task 6: Write Series 1 scripts — Copy My Trades

**Files:**
- Create: `promo/scripts/series-1-copy-trades/01-full-setup-tutorial.md`
- Create: `promo/scripts/series-1-copy-trades/01-clip-wow-moment.md`
- Create: `promo/scripts/series-1-copy-trades/02-dashboard-walkthrough.md`
- Create: `promo/scripts/series-1-copy-trades/02-clip-live-copy.md`

- [ ] **Step 1: Write 01-full-setup-tutorial.md (YouTube, 5-7 min)**

Full script with:
- Title, platform, target duration at the top
- Timestamped table: timestamp | section name | screen directions (what to click/show) | full voiceover script (exact words to say)
- Sections: Hook (0:00-0:15), Problem (0:15-1:00), EA Installation (1:00-2:30), Connect & Go Green (2:30-3:30), Live Trade Copy Demo (3:30-5:00), Analytics Overview (5:00-5:45), CTA (5:45-6:15)
- Description template for YouTube (with keywords: trade copier, MT5, copy trading)
- Tags list
- Thumbnail concept (text + visual description)

Key voiceover lines from the spec — expand into natural, conversational full sentences. Not bullet points — write every word the narrator will say.

- [ ] **Step 2: Write 01-clip-wow-moment.md (TikTok/Twitter, 45s)**

Full script with:
- Title, platforms, target duration
- Second-by-second table: timestamp | screen directions | text overlay (exact words) | voiceover line
- Caption/description template with hashtags for TikTok and Twitter
- Hook in first 3 seconds is critical — must stop the scroll

- [ ] **Step 3: Write 02-dashboard-walkthrough.md (YouTube, 5-7 min)**

Full tutorial covering:
- Hook: Show the dashboard with real data — green master, active follower, signals flowing
- Dashboard layout tour: system status bar, master card (signals today, last signal), follower cards (P&L, drawdown gauge, lot mode)
- Real-time features: clock, heartbeat indicators, status dots
- Signal log: show recent signals, explain columns
- Journal: quick look at trade journal with P&L
- Analytics: show charts, win rate, performance metrics
- CTA: "This is what managing multiple accounts should look like"

- [ ] **Step 4: Write 02-clip-live-copy.md (TikTok/Twitter, 45s)**

Clip script:
- Show placing a trade on master MT5
- Quick cut to dashboard — signal appears
- Quick cut to follower MT5 — trade is there
- Text overlay: "From one account to another. Automatically."
- CTA: link in bio

- [ ] **Step 5: Commit**

```bash
git add promo/scripts/series-1-copy-trades/
git commit -m "docs: add Series 1 video scripts — Copy My Trades"
```

---

## Task 7: Write Series 2 scripts — Protect Your Funded Account

**Files:**
- Create: `promo/scripts/series-2-prop-guard/01-protect-funded-account.md`
- Create: `promo/scripts/series-2-prop-guard/01-clip-saved-my-account.md`
- Create: `promo/scripts/series-2-prop-guard/02-drawdown-alerts.md`
- Create: `promo/scripts/series-2-prop-guard/02-clip-drawdown-warning.md`

- [ ] **Step 1: Write 01-protect-funded-account.md (YouTube, 6-8 min)**

Full script covering:
- Hook: Risk Dashboard with gauges — "I almost lost my funded account"
- Problem: Prop firm rules are strict — daily loss, max drawdown, consistency. One mistake = account gone.
- Setup: Command Center > Firm Directory > select firm > pick plan > link to account. Step-by-step screen directions.
- Dashboard demo: drawdown gauge color coding (green/amber/red), daily loss tracking, health score
- Discipline page: real-time rule compliance, what each metric means
- Risk Dashboard: exposure by pair, by direction, correlation warnings
- CTA: "Stop guessing. Link in the description."
- YouTube description template, tags, thumbnail concept

- [ ] **Step 2: Write 01-clip-saved-my-account.md (TikTok/Twitter, 50s)**

Clip script with second-by-second breakdown, text overlays, voiceover, hashtags.
Hook: "I almost blew my prop firm account."

- [ ] **Step 3: Write 02-drawdown-alerts.md (YouTube, 5-7 min)**

Full tutorial covering:
- Hook: Show a drawdown gauge hitting amber zone
- Explain drawdown types: balance-based vs equity-based
- Show how the gauge updates as trades move
- Daily loss tracking — how it resets, what counts
- Discipline score — what affects it, how to improve
- Settings: configuring max drawdown thresholds
- CTA: "Know your limits before you hit them"

- [ ] **Step 4: Write 02-clip-drawdown-warning.md (TikTok/Twitter, 45s)**

Clip script:
- Show gauge going from green to amber to approaching red
- Text overlays building tension: "Green... safe" → "Amber... slow down" → "Red... STOP"
- CTA: "Don't trade blind. Link in bio."

- [ ] **Step 5: Commit**

```bash
git add promo/scripts/series-2-prop-guard/
git commit -m "docs: add Series 2 video scripts — Protect Your Funded Account"
```

---

## Task 8: Write Series 3 scripts — Monetize Your Edge

**Files:**
- Create: `promo/scripts/series-3-signal-provider/01-monetize-your-edge.md`
- Create: `promo/scripts/series-3-signal-provider/01-clip-get-paid.md`
- Create: `promo/scripts/series-3-signal-provider/02-marketplace-setup.md`
- Create: `promo/scripts/series-3-signal-provider/02-clip-first-subscriber.md`

- [ ] **Step 1: Write 01-monetize-your-edge.md (YouTube, 5-7 min)**

Full script covering:
- Hook: Marketplace page showing your listing — "What if you got paid every time another trader copied your trade?"
- Problem: Profitable traders leaving money on the table
- Provider Setup walkthrough: name, description, pricing, track record
- Marketplace listing: what subscribers see — verified stats, win rate
- Subscriber view: signals page, analytics, copy button
- Provider analytics: subscriber count, signals sent, revenue
- CTA: "Start sharing your edge"
- YouTube description template, tags, thumbnail concept

- [ ] **Step 2: Write 01-clip-get-paid.md (TikTok/Twitter, 40s)**

Clip script with second-by-second breakdown, text overlays, voiceover.
Hook: "I make money when I trade. But I also make money when OTHER people trade."

- [ ] **Step 3: Write 02-marketplace-setup.md (YouTube, 5-7 min)**

Full tutorial covering:
- Hook: Empty marketplace profile vs complete one — "Which would you subscribe to?"
- Optimizing your provider profile: compelling description, realistic pricing
- Track record: how verified stats work, why transparency builds trust
- Subscriber management: viewing who's following you
- Signal delivery: how signals flow from your MT5 to subscribers
- CTA: "Build your trading business"

- [ ] **Step 4: Write 02-clip-first-subscriber.md (TikTok/Twitter, 40s)**

Clip script:
- Show notification of a new subscriber
- Show subscriber count going up
- Text overlay: "Someone just started copying my trades. Automatically. And paying for it."
- CTA: link in bio

- [ ] **Step 5: Commit**

```bash
git add promo/scripts/series-3-signal-provider/
git commit -m "docs: add Series 3 video scripts — Monetize Your Edge"
```

---

## Task 9: Create asset guides

**Files:**
- Create: `promo/assets/thumbnails/thumbnail-guide.md`
- Create: `promo/assets/overlays/overlay-specs.md`
- Create: `promo/assets/music/music-sources.md`

- [ ] **Step 1: Write thumbnail guide**

Cover:
- YouTube thumbnail size: 1280x720, max 2MB
- Design principles: large text (3-5 words max), high contrast, face or dashboard screenshot, bright accent color
- Thumbnail concepts per video (text + visual description)
- Free tools: Canva (recommended), GIMP
- Consistent brand elements: use TradeMetrics Pro green (#00ff9d) as accent

- [ ] **Step 2: Write overlay specs**

Cover:
- Font: Inter Bold or similar clean sans-serif
- Text overlay sizes: hook text 72px, body text 48px, CTA 56px
- Colors: white text with dark semi-transparent background strip (rgba(0,0,0,0.7))
- Positioning: top-center for hooks, bottom-center for CTAs
- How to create text overlays in OBS: Add Source > Text (GDI+) > configure font/size/color
- Lower third spec for "trademetricspro.com" persistent URL

- [ ] **Step 3: Write music sources**

List royalty-free music sources suitable for trading/fintech content:
- YouTube Audio Library (free, built into YouTube Studio)
- Pixabay Music (free, no attribution required)
- Epidemic Sound (paid, $15/mo, best quality)
- Recommended genres: lo-fi, ambient electronic, minimal tech
- Volume level: -18 to -20 dB under voiceover

- [ ] **Step 4: Commit**

```bash
git add promo/assets/
git commit -m "docs: add thumbnail guide, overlay specs, and music sources"
```

---

## Task 10: Final commit and verify

- [ ] **Step 1: Verify all files exist**

```bash
find promo/ -type f | sort
```

Expected output: all files listed in the File Structure section above.

- [ ] **Step 2: Final commit if any unstaged changes**

```bash
git add promo/
git status
git commit -m "docs: complete promo video production kit"
```

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```
