/**
 * ICC Practice Studio — Sound Effects Engine
 * Uses Web Audio API oscillators (no external audio files).
 */

let muted = false;
try { muted = localStorage.getItem('icc-sound-muted') === '1'; } catch {}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted(): boolean { return muted; }

export function toggleMute(): boolean {
  muted = !muted;
  try { localStorage.setItem('icc-sound-muted', muted ? '1' : '0'); } catch {}
  return muted;
}

function playTone(freq: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  if (muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {}
}

function playMultiTone(notes: { freq: number; start: number; dur: number }[], gain: number, type: OscillatorType = 'sine') {
  if (muted) return;
  try {
    const c = getCtx();
    for (const n of notes) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.value = n.freq;
      g.gain.value = gain;
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + n.start + n.dur);
      osc.connect(g).connect(c.destination);
      osc.start(c.currentTime + n.start);
      osc.stop(c.currentTime + n.start + n.dur);
    }
  } catch {}
}

/** Soft click on candle advance */
export function playTick() {
  playTone(800, 0.04, 0.03);
}

/** Warning alert for timer */
export function playAlert() {
  playTone(440, 0.15, 0.08, 'triangle');
}

/** Ascending chime for trade open */
export function playTradeOpen() {
  playMultiTone([
    { freq: 523, start: 0, dur: 0.08 },
    { freq: 659, start: 0.06, dur: 0.1 },
  ], 0.06, 'sine');
}

/** Descending chime for trade close */
export function playTradeClose() {
  playMultiTone([
    { freq: 659, start: 0, dur: 0.08 },
    { freq: 523, start: 0.06, dur: 0.1 },
  ], 0.06, 'sine');
}

/** Major chord arpeggio for good score */
export function playSuccess() {
  playMultiTone([
    { freq: 523, start: 0, dur: 0.12 },
    { freq: 659, start: 0.08, dur: 0.12 },
    { freq: 784, start: 0.16, dur: 0.2 },
  ], 0.05, 'sine');
}

/** Dissonant tone for poor score */
export function playFail() {
  playMultiTone([
    { freq: 330, start: 0, dur: 0.15 },
    { freq: 311, start: 0.1, dur: 0.15 },
  ], 0.04, 'triangle');
}

/** Soft blip for bookmark */
export function playBookmark() {
  playTone(1200, 0.05, 0.04);
}
