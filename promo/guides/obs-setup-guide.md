# OBS Studio Setup Guide — TradeMetrics Pro Promo Videos

This guide walks you through setting up OBS Studio from scratch to record polished promotional videos for TradeMetrics Pro. No prior OBS experience needed.

---

## 1. Download and Install OBS Studio

1. Open your browser and go to **https://obsproject.com**
2. Click the **Windows** download button. The installer is roughly 100 MB.
3. Run the downloaded `.exe` file (e.g., `OBS-Studio-30.x.x-Full-Installer-x64.exe`).
4. Click **Next** through the installer wizard, accept the license agreement, and keep the default install path (`C:\Program Files\obs-studio`).
5. Click **Install** and wait for the progress bar to complete.
6. Click **Finish**. OBS Studio will launch automatically.

---

## 2. First Launch — Auto-Config Wizard

When OBS opens for the first time, the **Auto-Configuration Wizard** appears automatically.

1. On the first screen, select **"Optimize just for recording, I will not be streaming"**.
   - Do NOT choose the streaming option — this adjusts encoder settings for local disk recording instead of upload bandwidth.
2. Click **Next**.
3. On the **Video Settings** screen, the wizard will detect your screen resolution. Leave the defaults as detected — you will fine-tune them manually in Step 7.
4. Click **Next**, then **Apply Settings**.

The wizard closes and you are now in the main OBS window.

---

## 3. Create 3 Scenes

Scenes are the building blocks of your recording. Each scene is like a "slide" that shows different content. You will create three scenes for your promo video.

The **Scenes** panel is in the bottom-left corner of the OBS window.

### How to add a new scene
- Click the **+** button at the bottom of the Scenes panel.
- Type the scene name and press **Enter**.

---

### Scene 1 — Intro Hook

This scene opens your video with a branded title card over your screen.

1. Click **+** in the Scenes panel, name it `Intro Hook`, press Enter.
2. The scene is now selected. You will add sources to it in the next section.

**Sources needed:**
- **Display Capture** — captures your entire screen as the background
- **Text (GDI+)** — overlays a title like "TradeMetrics Pro — Know Your Edge"

---

### Scene 2 — Screen Demo

This scene shows a live browser window of the TradeMetrics Pro app with your microphone audio.

1. Click **+** in the Scenes panel, name it `Screen Demo`, press Enter.

**Sources needed:**
- **Window Capture** — captures only the Chrome or Edge window showing trademetricspro.com
- **Audio Input Capture** — your laptop microphone (see Section 5)

---

### Scene 3 — CTA Outro

This scene ends the video with the landing page and a visible sign-up URL.

1. Click **+** in the Scenes panel, name it `CTA Outro`, press Enter.

**Sources needed:**
- **Window Capture** (or **Image** if using a static screenshot) — showing the trademetricspro.com landing page
- **Text (GDI+)** — overlay displaying the signup URL, e.g., `Start free at trademetricspro.com`

---

## 4. Adding Sources to Each Scene

Sources are the individual video/audio inputs inside a scene. The **Sources** panel sits to the right of the Scenes panel at the bottom of OBS.

### How to add a Display Capture source (Intro Hook scene)

1. Click `Intro Hook` in the Scenes panel to select it.
2. Click the **+** button at the bottom of the Sources panel.
3. Select **Display Capture** from the menu.
4. In the dialog, name it `Full Screen` and click **OK**.
5. In the properties window, select the display you want to capture (usually `Display 1`). Click **OK**.
6. The source appears in the preview. Drag its corners in the preview canvas to fill the frame if needed.

### How to add a Text (GDI+) source (for title/CTA overlays)

1. Select the scene you want to add text to (`Intro Hook` or `CTA Outro`).
2. Click **+** in the Sources panel, select **Text (GDI+)**.
3. Name it (e.g., `Title Overlay` or `CTA Text`) and click **OK**.
4. In the properties window:
   - Check **"Use custom text area"** to control the size.
   - Click **Select Font** — choose a clean sans-serif (e.g., Segoe UI Bold, 48pt or larger).
   - In the **Text** field, type your overlay text (e.g., `TradeMetrics Pro — Know Your Edge`).
   - Set a contrasting color using the **Color** picker (white `#FFFFFF` on dark backgrounds works well).
5. Click **OK**. The text appears on the canvas. Drag it to position it (e.g., center-bottom).

### How to add a Window Capture source (Screen Demo and CTA Outro scenes)

1. Select the scene (`Screen Demo` or `CTA Outro`).
2. Click **+** in the Sources panel, select **Window Capture**.
3. Name it (e.g., `Chrome - TradeMetrics`) and click **OK**.
4. In the properties window, click the **Window** dropdown and select your open Chrome or Edge browser window showing `trademetricspro.com`.
   - If the window does not appear in the list, make sure the browser is open and not minimized, then click the dropdown again.
5. Leave **Capture Method** on the default (`Windows 10 (1903 and up)`). Click **OK**.
6. Resize the source in the canvas to fill the frame.

> **Tip:** Repeat the "add source" steps for any additional sources needed in each scene. Sources stack in the Sources panel — drag them to reorder (sources higher in the list appear in front).

---

## 5. Audio Setup

### Select your laptop microphone

1. In the **Audio Mixer** panel (bottom-center of OBS), look for **Mic/Aux** or **Audio Input Capture**.
   - If no mic input appears, go to `Settings > Audio` and under **Global Audio Devices**, set **Mic/Auxiliary Audio** to your laptop's built-in microphone or headset mic.
2. Speak into your mic — you should see the volume meter in the Audio Mixer moving green (good level) when you talk.

### Add audio filters to the mic source

Filters clean up your mic audio. You must add them **in this exact order** — OBS processes filters top to bottom.

1. In the Audio Mixer, click the **gear icon** next to your mic source and select **Filters**.
2. In the Filters window, click the **+** button at the bottom-left to add each filter.

---

#### Filter 1 — Noise Suppression

1. Click **+**, select **Noise Suppression**.
2. Name it `Noise Suppression`, click **OK**.
3. In the settings, set **Method** to **RNNoise**.
   - RNNoise is an AI-based suppression model built into OBS. It is far more effective than the older Speex method.
4. Click **Close** on the filter row (the filter stays active).

#### Filter 2 — Gain

1. Click **+**, select **Gain**.
2. Name it `Gain`, click **OK**.
3. Set **Gain (dB)** to **+6 dB** as a starting point.
   - Laptop microphones are typically quiet. If your voice still sounds low after a test recording, increase to +10 dB. If it sounds too loud or distorted, reduce toward +5 dB.

#### Filter 3 — Compressor

1. Click **+**, select **Compressor**.
2. Name it `Compressor`, click **OK**.
3. Set these values:
   - **Ratio**: `3.00:1`
   - **Threshold**: `-18.00 dB`
   - **Attack**: `6 ms`
   - **Release**: `60 ms`
   - **Output Gain**: `0.00 dB`
   - **Sidechain/Ducking Source**: `None`
4. The compressor evens out volume differences — loud words won't spike and quiet words won't disappear.

#### Filter 4 — Limiter

1. Click **+**, select **Limiter**.
2. Name it `Limiter`, click **OK**.
3. Set these values:
   - **Threshold**: `-1.00 dB`
   - **Release**: `60 ms`
4. The limiter is a hard ceiling — it prevents any audio peak from clipping (distorting) beyond -1 dB.

Your Filters panel should now list the four filters in this order from top to bottom:
1. Noise Suppression
2. Gain
3. Compressor
4. Limiter

Close the Filters window.

---

## 6. Output Settings

Navigate to `Settings > Output` (click **Settings** in the bottom-right Controls panel, then click **Output** in the left sidebar).

Switch the **Output Mode** dropdown at the top to **Advanced** for full control.

Click the **Recording** tab (next to "Streaming").

Set the following:

| Setting | Value |
|---|---|
| **Recording Format** | MKV |
| **Encoder** | x264 (software) — or NVENC H.264 if you have an NVIDIA GPU (see note below) |
| **Rate Control** | CBR |
| **Bitrate** | 8000 Kbps (YouTube) or 6000 Kbps (TikTok / Twitter / X) |

> **Why MKV?** If OBS crashes or your computer loses power mid-recording, an MKV file is still recoverable. MP4 files written this way become corrupted and unplayable. You will convert to MP4 after recording (see Step 9).

> **NVENC check:** If you have an NVIDIA GPU, go to `Settings > Output > Recording > Encoder` and look for `NVIDIA NVENC H.264`. NVENC offloads encoding to your GPU, reducing CPU load. If it does not appear in the list, use x264.

Click **Apply**, then **OK**.

---

## 7. Video Settings

Navigate to `Settings > Video` (click **Settings**, then **Video** in the left sidebar).

Set the following:

| Setting | Value |
|---|---|
| **Base (Canvas) Resolution** | 1920x1080 |
| **Output (Scaled) Resolution** | 1920x1080 |
| **Common FPS Values** | 30 |

- Keep Base and Output resolution identical to avoid any scaling artifacts.
- 30 FPS is standard for tutorial and promo content. There is no benefit to recording at 60 FPS for screen demos.

Click **Apply**, then **OK**.

---

## 8. How to Import Profile JSONs

Pre-built OBS profiles for this project are stored in the `obs-profiles/` folder of this repository. Importing a profile automatically sets all Output and Video settings to the correct values.

1. In the OBS menu bar, click **Profile**.
2. Select **Import**.
3. In the file browser, navigate to the `obs-profiles/` folder in this project directory.
4. Select the `.json` profile file you want to import and click **Open** (or **Select Folder**, depending on your OBS version — OBS profiles are folders, not single files).
5. OBS will list the imported profile in `Profile > [profile name]`. Click it to activate it.

> **Note:** After importing a profile, verify your settings in `Settings > Output` and `Settings > Video` to confirm the values loaded correctly.

---

## 9. Test Recording

Before recording your full promo video, do a short test to verify everything is working.

1. In the main OBS window, make sure the correct scene is selected in the Scenes panel.
2. Click **Start Recording** in the bottom-right Controls panel.
3. Speak a few sentences naturally into your mic. Move your mouse around the screen. Wait about 10 seconds.
4. Click **Stop Recording**.

### Convert MKV to MP4

OBS saves recordings as MKV. Before reviewing, remux to MP4 (this is lossless — no quality change):

1. In the OBS menu bar, go to `File > Remux Recordings`.
2. In the **OBS Recordings** field, click the three-dot browse button and select your `.mkv` file (OBS saves recordings to your Videos folder by default — the path is shown at `Settings > Output > Recording > Recording Path`).
3. The **Target File** field will auto-fill with an `.mp4` path. Click **Remux**.
4. When complete, click **Close**.

### Verify quality

Open the `.mp4` file in Windows Media Player or VLC and check:

- **Video**: Screen content is sharp and fills the frame at 1920x1080. No black borders or stretched content.
- **Audio**: Your voice is clear and present. Background hiss is removed (Noise Suppression working). No distortion on loud syllables (Limiter working). Volume is consistent sentence-to-sentence (Compressor working).

If audio is too quiet, return to the Gain filter and increase by 2-3 dB, then re-test. If video shows a black source, right-click the Window Capture source in OBS, select **Properties**, and reselect the browser window.

---

You are now ready to record. Proceed to the scene scripts in `promo/scripts/` for the exact words and transitions to use in each scene.
