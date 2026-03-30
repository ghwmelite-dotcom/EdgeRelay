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
