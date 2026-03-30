# Post-Recording Editing Workflow

A step-by-step guide for processing OBS recordings into platform-ready videos.

---

## 1. Remux MKV to MP4

OBS records in MKV format by default. MKV is safer — if OBS crashes mid-recording, the file is still recoverable. MP4 files recorded directly can be corrupted by a crash, which is why MKV is preferred as the capture format.

**Steps:**

1. After recording finishes, go to **File > Remux Recordings** in OBS
2. Click the folder icon and select your `.mkv` file
3. Click **Remux**
4. OBS creates an identical `.mp4` file — this is lossless and instant (no re-encoding)
5. Open the `.mp4` in your media player and confirm it plays correctly
6. Delete the `.mkv` once you are satisfied the `.mp4` is good

> The remuxed MP4 is byte-for-byte identical in video quality — nothing is lost.

---

## 2. Trimming with Shotcut (Free, Open Source)

Download Shotcut from **https://shotcut.org**

### Basic Trim Workflow

1. Open Shotcut, then drag and drop your `.mp4` file into the timeline
2. Play through the clip and identify the section you want to keep
3. Set the **In point** by pressing `I` at the start of the good section
4. Set the **Out point** by pressing `O` at the end of the good section
5. Cut dead air at the beginning and end of the recording

### Removing Mistakes and Pauses

- Navigate the playhead to the start of a bad section
- Press `S` to split the clip at the playhead
- Navigate to the end of the bad section and press `S` again
- Select the bad segment and delete it
- Right-click the gap and choose **Ripple Delete** (or press `X`) to close the gap and shift everything left

### Timeline Tips

- Zoom in for precise cuts: `Ctrl + Scroll Wheel`
- Use the playhead scrub bar at the top to jump quickly
- Enable snapping to make cut points align cleanly

---

## 3. Cropping for TikTok Vertical (1080x1920)

TikTok requires a vertical 9:16 frame. Your OBS recording is landscape (1920x1080), so you need to crop and reframe it.

### Setting Up a Vertical Project

1. In Shotcut: **Settings > Video Mode > Custom**
2. Set resolution to **1080 x 1920**, frame rate to match your recording (typically 30 fps)
3. Click **OK** — Shotcut will now work in a vertical canvas

### Reframing the Landscape Footage

1. Import your landscape `.mp4` and add it to the timeline
2. Select the clip on the timeline
3. Click **Filters > +** and search for **Size, Position & Rotate**
4. In the filter, set **Size** to **200%** (or higher, until the frame fills the vertical canvas with no black bars)
5. Adjust the **Position** to center the frame over the key area — usually the center of the browser where the TradeMetrics dashboard is visible
6. Preview the result and adjust position until all important UI elements (trade list, stats, copy buttons) are visible and readable

> Aim to keep the most action-relevant part of the UI — typically the center panel — in the middle third of the vertical frame.

---

## 4. Export Settings Per Platform

In Shotcut: **Export > H.264 High Profile**, then open the **Advanced** tab to adjust resolution and bitrate.

| Setting | YouTube | TikTok | Twitter/X |
|---|---|---|---|
| Codec | H.264 | H.264 | H.264 |
| Resolution | 1920x1080 | 1080x1920 | 1920x1080 |
| Bitrate | 8 Mbps | 6 Mbps | 6 Mbps |
| Audio | AAC 192 kbps | AAC 128 kbps | AAC 128 kbps |
| Max file size | 256 GB | 287 MB | 512 MB |

### Export Steps

1. Go to **Export** (top toolbar)
2. Select **H.264 High Profile** from the presets list
3. Click the **Advanced** tab
4. Under **Video**, set the resolution and bitrate to match the target platform
5. Under **Audio**, set codec to AAC and bitrate to the target value
6. Click **Export File** and choose a destination in `recordings/final/`

---

## 5. File Naming Convention

Use this format for all exported files:

```
series-N_NN_platform_short-title.mp4
```

- `series-N` — the series number (e.g. `series-1`, `series-2`)
- `NN` — zero-padded episode number within the series (e.g. `01`, `02`)
- `platform` — `youtube`, `tiktok`, or `twitter`
- `short-title` — lowercase, hyphen-separated description of the video content

### Examples

```
series-1_01_youtube_how-to-copy-trades.mp4
series-1_01_tiktok_watch-trade-copy-itself.mp4
series-1_02_youtube_set-up-risk-limits.mp4
series-2_01_youtube_protect-funded-account.mp4
series-2_01_tiktok_funded-account-risk-rules.mp4
```

> Keep the short title under 40 characters. Use only lowercase letters, numbers, and hyphens — no spaces or special characters.

---

## 6. File Organization

```
recordings/
  raw/        ← OBS output (.mp4 after remux, original .mkv before deletion)
  final/      ← Platform-ready exports, named per convention above
```

### Workflow Order

1. OBS records to `recordings/raw/` as `.mkv`
2. Remux to `.mp4` in `recordings/raw/`
3. Edit and export finished files to `recordings/final/`
4. Confirm all final exports play correctly on each platform
5. Archive or delete the raw files once finals are verified

> Never delete raw files before confirming the finals. One bad export means re-recording if the raw is gone.
