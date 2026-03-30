# Video Overlay Specifications

Text overlays used during screen recordings in OBS Studio.

## How to Add in OBS
1. Select your scene
2. In Sources panel, click `+` > `Text (GDI+)`
3. Name it (e.g., "Hook Text")
4. Configure font, size, color, and background
5. Position using the preview window (drag to place)

## Text Styles

### Hook Text (opening title)
- **Font:** Inter Bold (or Montserrat Bold)
- **Size:** 72px
- **Color:** White (#FFFFFF)
- **Background:** Semi-transparent dark strip — check "Use Custom Background Color" in OBS, set to black with opacity ~70%
- **Position:** Top center, 80px from top edge
- **Use:** First 3-5 seconds of every video

### Body Text (mid-video callouts)
- **Font:** Inter Semi-Bold
- **Size:** 48px
- **Color:** White (#FFFFFF)
- **Background:** Semi-transparent dark strip (same as hook)
- **Position:** Bottom third of screen, centered
- **Use:** Key points during the demo (e.g., "Trade copied in 0.3 seconds")

### CTA Text (call to action)
- **Font:** Inter Bold
- **Size:** 56px
- **Color:** TradeMetrics green (#00ff9d)
- **Background:** Semi-transparent dark strip
- **Position:** Center of screen
- **Use:** Final 5 seconds of every video

### Persistent URL (lower third)
- **Font:** Inter Medium
- **Size:** 28px
- **Color:** White (#FFFFFF) at 80% opacity
- **Background:** None (or very subtle dark strip)
- **Position:** Bottom-right corner, 20px padding from edges
- **Text:** "trademetricspro.com"
- **Use:** Always visible during Screen Demo scene

## Short-Form Video Overlays (TikTok/Twitter)

For short-form content, text overlays are MORE important since many viewers watch on mute:
- **Size:** Scale up to 84px for hook text (vertical video = smaller screen)
- **Position:** Center of screen (vertical safe zone — avoid top 15% and bottom 20% where platform UI overlaps)
- **Duration:** Each text overlay should stay on screen for 3-5 seconds minimum
- **Animation:** Use OBS "Slide" transition if available, or just hard cut

## Color Reference
| Use | Hex | Preview |
|-----|-----|---------|
| Primary green | #00ff9d | TradeMetrics accent |
| Warning amber | #ffb800 | Drawdown caution |
| Danger red | #ff3d57 | Drawdown critical |
| Text white | #FFFFFF | Default text |
| Background dark | #0a0f1a | Base background |
| Strip background | rgba(0,0,0,0.7) | Text strip |
