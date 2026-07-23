/**
 * ICC Pattern Library — Annotated examples for reference study.
 */

export type PatternCategory = 'textbook' | 'tricky' | 'no-trade';

export interface PatternAnnotation {
  type: 'indication' | 'correction' | 'continuation' | 'no-trade-zone';
  startIndex: number;
  endIndex: number;
  label: string;
  color: string;
}

export interface PatternExample {
  id: string;
  name: string;
  category: PatternCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instrument: string;
  bias: 'bullish' | 'bearish' | 'none';
  description: string;
  whatToLookFor: string[];
  candles: { o: number; h: number; l: number; c: number }[];
  annotations: PatternAnnotation[];
}

function b(base: number, size: number): { o: number; h: number; l: number; c: number } {
  return { o: base, h: base + size * 1.2, l: base - size * 0.15, c: base + size };
}
function s(base: number, size: number): { o: number; h: number; l: number; c: number } {
  return { o: base, h: base + size * 0.15, l: base - size * 1.2, c: base - size };
}
function d(base: number, w: number): { o: number; h: number; l: number; c: number } {
  return { o: base, h: base + w, l: base - w, c: base + (Math.random() - 0.5) * 0.5 };
}

export const PATTERN_LIBRARY: PatternExample[] = [
  // ===== TEXTBOOK =====
  {
    id: 'tb-1',
    name: 'Classic Bullish ICC',
    category: 'textbook',
    difficulty: 'beginner',
    instrument: 'EURUSD',
    bias: 'bullish',
    description: 'A textbook bullish setup: clear uptrend bias, strong indication impulse, clean 50% correction, and decisive continuation.',
    whatToLookFor: [
      '4H shows clear higher highs and higher lows',
      '1H indication: 4+ consecutive bullish candles with good body size',
      '15M correction: retraces to 50% with smaller candles',
      '5M continuation: strong bullish candle breaks above correction high',
    ],
    candles: [b(100,2),b(102,3),b(105,4),b(109,5),b(114,4), s(118,2),s(116,1.5),s(114.5,1),d(113.5,0.8), b(114,2),b(116,3),b(119,4)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 4, label: 'Indication — strong bullish impulse', color: '#00e5ff' },
      { type: 'correction', startIndex: 5, endIndex: 8, label: 'Correction — 50% pullback', color: '#ffb800' },
      { type: 'continuation', startIndex: 9, endIndex: 11, label: 'Continuation — trend resumes', color: '#00ff9d' },
    ],
  },
  {
    id: 'tb-2',
    name: 'Classic Bearish ICC',
    category: 'textbook',
    difficulty: 'beginner',
    instrument: 'GBPUSD',
    bias: 'bearish',
    description: 'Clean bearish setup with strong downward indication, 38% retracement, and continuation to new lows.',
    whatToLookFor: [
      '4H shows lower highs and lower lows',
      'Indication: consecutive bearish candles with large bodies',
      'Correction: small bullish candles pulling back ~38%',
      'Continuation: bearish engulfing candle signals entry',
    ],
    candles: [s(150,3),s(147,4),s(143,5),s(138,4),s(134,3), b(131,2),b(133,1.5),d(134.5,0.8), s(134,2.5),s(131.5,3),s(128.5,4)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 4, label: 'Bearish indication', color: '#00e5ff' },
      { type: 'correction', startIndex: 5, endIndex: 7, label: '38% retracement', color: '#ffb800' },
      { type: 'continuation', startIndex: 8, endIndex: 10, label: 'Bearish continuation', color: '#00ff9d' },
    ],
  },
  {
    id: 'tb-3',
    name: 'Golden Zone Bounce',
    category: 'textbook',
    difficulty: 'beginner',
    instrument: 'XAUUSD',
    bias: 'bullish',
    description: 'Correction pulls back exactly to the 50-61.8% Fibonacci zone before bouncing — the ideal entry location.',
    whatToLookFor: [
      'Correction stalls at the 50-61.8% retracement level',
      'Doji or hammer candle at the golden zone = correction complete',
      'Next bullish candle = continuation entry',
    ],
    candles: [b(1900,10),b(1910,15),b(1925,20),b(1945,12), s(1957,8),s(1949,6),s(1943,4),d(1939,3), b(1940,8),b(1948,12),b(1960,15)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 3, label: 'Strong bullish impulse', color: '#00e5ff' },
      { type: 'correction', startIndex: 4, endIndex: 7, label: 'Golden zone (50-61.8%)', color: '#ffb800' },
      { type: 'continuation', startIndex: 8, endIndex: 10, label: 'Bounce from golden zone', color: '#00ff9d' },
    ],
  },
  {
    id: 'tb-4',
    name: 'V-Shape Recovery',
    category: 'textbook',
    difficulty: 'intermediate',
    instrument: 'NAS100',
    bias: 'bullish',
    description: 'Sharp correction that quickly reverses into a strong continuation — requires fast reaction.',
    whatToLookFor: [
      'Correction is sharp and fast (2-3 candles)',
      'V-shape bottom with immediate bullish reversal',
      'Don\'t wait for "perfect" pullback — enter on first bullish close',
    ],
    candles: [b(18000,50),b(18050,80),b(18130,60),b(18190,70), s(18260,80),s(18180,50), b(18130,70),b(18200,90),b(18290,60)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 3, label: 'Bullish impulse', color: '#00e5ff' },
      { type: 'correction', startIndex: 4, endIndex: 5, label: 'Sharp V-correction', color: '#ffb800' },
      { type: 'continuation', startIndex: 6, endIndex: 8, label: 'Quick continuation', color: '#00ff9d' },
    ],
  },
  {
    id: 'tb-5',
    name: 'Multi-Leg Indication',
    category: 'textbook',
    difficulty: 'intermediate',
    instrument: 'USDJPY',
    bias: 'bullish',
    description: 'Indication comes in two legs with a small pause in between — still counts as one indication.',
    whatToLookFor: [
      'Indication has a brief pause/consolidation in the middle',
      'Both legs move in the same direction',
      'Mark the ENTIRE move as one indication zone',
    ],
    candles: [b(148,0.3),b(148.3,0.5),b(148.8,0.4), d(149.2,0.2),d(149.3,0.15), b(149.4,0.5),b(149.9,0.6), s(150.5,0.3),s(150.2,0.2),d(150,0.1), b(150.1,0.4),b(150.5,0.5)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 6, label: 'Two-leg indication', color: '#00e5ff' },
      { type: 'correction', startIndex: 7, endIndex: 9, label: 'Shallow correction', color: '#ffb800' },
      { type: 'continuation', startIndex: 10, endIndex: 11, label: 'Continuation', color: '#00ff9d' },
    ],
  },
  {
    id: 'tb-6',
    name: 'Slow Grind Correction',
    category: 'textbook',
    difficulty: 'intermediate',
    instrument: 'EURUSD',
    bias: 'bearish',
    description: 'Correction unfolds slowly over many candles with small bodies — tests your patience.',
    whatToLookFor: [
      'Correction candles are small and slow (low momentum)',
      'Takes 6+ candles to complete the pullback',
      'Volume decreases during correction',
      'Patience is key — don\'t enter until correction is clearly over',
    ],
    candles: [s(1.09,0.003),s(1.087,0.004),s(1.083,0.005),s(1.078,0.004), b(1.074,0.001),b(1.075,0.001),b(1.076,0.0008),d(1.0768,0.0005),b(1.077,0.0008),d(1.0778,0.0004), s(1.077,0.002),s(1.075,0.003),s(1.072,0.004)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 3, label: 'Bearish impulse', color: '#00e5ff' },
      { type: 'correction', startIndex: 4, endIndex: 9, label: 'Slow grind correction (6 candles)', color: '#ffb800' },
      { type: 'continuation', startIndex: 10, endIndex: 12, label: 'Bearish continuation', color: '#00ff9d' },
    ],
  },
  {
    id: 'tb-7',
    name: 'Post-News ICC',
    category: 'textbook',
    difficulty: 'advanced',
    instrument: 'XAUUSD',
    bias: 'bullish',
    description: 'After a news spike creates the indication, price settles into a correction and then continues.',
    whatToLookFor: [
      'Single massive candle can be the entire indication',
      'Wait for volatility to settle before marking correction',
      'Correction may be deeper after news spikes (up to 61.8%)',
    ],
    candles: [d(1950,5),d(1952,4), b(1955,25), s(1980,8),s(1972,5),s(1967,3),d(1964,2), b(1966,6),b(1972,10),b(1982,12)],
    annotations: [
      { type: 'indication', startIndex: 2, endIndex: 2, label: 'News spike = indication', color: '#00e5ff' },
      { type: 'correction', startIndex: 3, endIndex: 6, label: '61.8% retracement', color: '#ffb800' },
      { type: 'continuation', startIndex: 7, endIndex: 9, label: 'Continuation above spike', color: '#00ff9d' },
    ],
  },

  // ===== TRICKY =====
  {
    id: 'tr-1',
    name: 'False Continuation Trap',
    category: 'tricky',
    difficulty: 'advanced',
    instrument: 'NAS100',
    bias: 'bullish',
    description: 'The first "continuation" candle fails and price drops back into the correction. Wait for the second attempt.',
    whatToLookFor: [
      'First bullish candle after correction FAILS to hold',
      'Price drops back into the correction zone',
      'Wait for the SECOND breakout attempt with stronger momentum',
      'False breakouts are common — don\'t panic, wait',
    ],
    candles: [b(18000,50),b(18050,60),b(18110,70), s(18180,30),s(18150,20),d(18130,10), b(18140,25),s(18165,30), b(18135,20),b(18155,40),b(18195,50)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 2, label: 'Bullish indication', color: '#00e5ff' },
      { type: 'correction', startIndex: 3, endIndex: 5, label: 'Correction zone', color: '#ffb800' },
      { type: 'no-trade-zone', startIndex: 6, endIndex: 7, label: 'False breakout — trap!', color: '#ff3d57' },
      { type: 'continuation', startIndex: 8, endIndex: 10, label: 'Real continuation (2nd attempt)', color: '#00ff9d' },
    ],
  },
  {
    id: 'tr-2',
    name: 'Overshoot Correction',
    category: 'tricky',
    difficulty: 'advanced',
    instrument: 'GBPUSD',
    bias: 'bullish',
    description: 'Correction overshoots the 61.8% level but stays within 78.6% — still valid but risky.',
    whatToLookFor: [
      'Correction goes past 61.8% but doesn\'t breach 78.6%',
      'Still valid but use tighter stop loss',
      'Wait for extra confirmation (stronger continuation candle)',
    ],
    candles: [b(1.26,0.003),b(1.263,0.004),b(1.267,0.005),b(1.272,0.004), s(1.276,0.004),s(1.272,0.003),s(1.269,0.003),s(1.266,0.002),d(1.264,0.001), b(1.265,0.003),b(1.268,0.004),b(1.272,0.005)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 3, label: 'Bullish impulse', color: '#00e5ff' },
      { type: 'correction', startIndex: 4, endIndex: 8, label: 'Deep correction (72% retracement)', color: '#ffb800' },
      { type: 'continuation', startIndex: 9, endIndex: 11, label: 'Valid but needs strong confirmation', color: '#00ff9d' },
    ],
  },
  {
    id: 'tr-3',
    name: 'Nested ICC',
    category: 'tricky',
    difficulty: 'advanced',
    instrument: 'EURUSD',
    bias: 'bearish',
    description: 'An ICC pattern inside a larger ICC pattern — the lower timeframe shows its own I-C-C within the higher TF correction.',
    whatToLookFor: [
      'The higher TF correction contains its own mini indication-correction-continuation',
      'Trade the LOWER TF ICC for a counter-trend scalp',
      'Or ignore the nested ICC and wait for the HIGHER TF continuation',
      'Multi-timeframe awareness is key',
    ],
    candles: [s(1.10,0.003),s(1.097,0.004),s(1.093,0.005), b(1.088,0.002),b(1.090,0.003),b(1.093,0.002),s(1.095,0.001),s(1.094,0.001),b(1.093,0.002),b(1.095,0.001), s(1.096,0.003),s(1.093,0.004)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 2, label: 'Main bearish indication', color: '#00e5ff' },
      { type: 'correction', startIndex: 3, endIndex: 9, label: 'Correction with nested mini-ICC inside', color: '#ffb800' },
      { type: 'continuation', startIndex: 10, endIndex: 11, label: 'Main continuation resumes', color: '#00ff9d' },
    ],
  },
  {
    id: 'tr-4',
    name: 'Gap After Indication',
    category: 'tricky',
    difficulty: 'advanced',
    instrument: 'NAS100',
    bias: 'bearish',
    description: 'A gap down after the indication makes the correction look shallow — adjust your expectations.',
    whatToLookFor: [
      'Gaps can replace part of the correction',
      'Measure retracement from the gap fill, not the close',
      'If gap fills completely, the setup may be invalid',
    ],
    candles: [s(18500,60),s(18440,80),s(18360,70), {o:18200,h:18220,l:18150,c:18170}, b(18170,30),b(18200,20),d(18220,15), s(18210,40),s(18170,60),s(18110,80)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 2, label: 'Bearish indication', color: '#00e5ff' },
      { type: 'no-trade-zone', startIndex: 3, endIndex: 3, label: 'Gap down', color: '#ff3d57' },
      { type: 'correction', startIndex: 4, endIndex: 6, label: 'Shallow correction (post-gap)', color: '#ffb800' },
      { type: 'continuation', startIndex: 7, endIndex: 9, label: 'Continuation', color: '#00ff9d' },
    ],
  },
  {
    id: 'tr-5',
    name: 'Double Correction',
    category: 'tricky',
    difficulty: 'advanced',
    instrument: 'USDJPY',
    bias: 'bullish',
    description: 'The correction comes in two waves (ABC pattern) before the true continuation.',
    whatToLookFor: [
      'First correction wave reverses briefly, then drops again',
      'Total retracement stays within valid range',
      'The second wave of correction often tests the first wave low',
      'Wait for CLEAR break of the correction structure',
    ],
    candles: [b(149,0.3),b(149.3,0.5),b(149.8,0.6),b(150.4,0.4), s(150.8,0.2),s(150.6,0.15), b(150.45,0.1), s(150.55,0.2),s(150.35,0.15),d(150.2,0.08), b(150.3,0.25),b(150.55,0.35),b(150.9,0.4)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 3, label: 'Bullish indication', color: '#00e5ff' },
      { type: 'correction', startIndex: 4, endIndex: 9, label: 'Double-wave correction (A-B-C)', color: '#ffb800' },
      { type: 'continuation', startIndex: 10, endIndex: 12, label: 'Continuation after 2nd wave', color: '#00ff9d' },
    ],
  },

  // ===== NO-TRADE =====
  {
    id: 'nt-1',
    name: 'Ranging Market — No Bias',
    category: 'no-trade',
    difficulty: 'beginner',
    instrument: 'EURUSD',
    bias: 'none',
    description: 'Price is bouncing between support and resistance with no higher highs or lower lows. There is no bias — do NOT trade.',
    whatToLookFor: [
      'Equal highs and equal lows on the 4H',
      'Alternating bullish and bearish candles of similar size',
      'No ICC setup is possible without a trend',
      'Close the chart and check another asset',
    ],
    candles: [b(1.08,0.002),s(1.082,0.002),b(1.08,0.0018),s(1.0818,0.0018),b(1.08,0.002),s(1.082,0.002),b(1.08,0.0015),s(1.0815,0.0015)],
    annotations: [
      { type: 'no-trade-zone', startIndex: 0, endIndex: 7, label: 'Range — no trend = no trade', color: '#ff3d57' },
    ],
  },
  {
    id: 'nt-2',
    name: 'Correction Too Deep (>78.6%)',
    category: 'no-trade',
    difficulty: 'intermediate',
    instrument: 'GBPUSD',
    bias: 'bullish',
    description: 'The correction retraces more than 78.6% of the indication — the setup is INVALID. The trend may be reversing.',
    whatToLookFor: [
      'Correction goes past the 78.6% Fibonacci level',
      'This often signals a trend reversal, not a pullback',
      'Do NOT enter — wait for a completely new ICC setup',
      'If it retraces 100%, the indication is fully negated',
    ],
    candles: [b(100,3),b(103,4),b(107,5),b(112,4), s(116,3),s(113,4),s(109,3),s(106,2.5),s(103.5,2)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 3, label: 'Bullish indication', color: '#00e5ff' },
      { type: 'no-trade-zone', startIndex: 4, endIndex: 8, label: 'Correction >78.6% — INVALID', color: '#ff3d57' },
    ],
  },
  {
    id: 'nt-3',
    name: 'Pre-News — Sit Out',
    category: 'no-trade',
    difficulty: 'beginner',
    instrument: 'XAUUSD',
    bias: 'bullish',
    description: 'A valid ICC setup exists, but high-impact news (NFP, FOMC) is 30 minutes away. Do NOT enter.',
    whatToLookFor: [
      'Even perfect ICC setups should be skipped before major news',
      'News can blow through your stop loss in seconds',
      'Wait for the news to pass, then look for a new setup',
      'Check the economic calendar before every trading session',
    ],
    candles: [b(1950,10),b(1960,15),b(1975,12), s(1987,5),s(1982,3),d(1979,2), b(1981,4)],
    annotations: [
      { type: 'indication', startIndex: 0, endIndex: 2, label: 'Valid indication', color: '#00e5ff' },
      { type: 'correction', startIndex: 3, endIndex: 5, label: 'Valid correction', color: '#ffb800' },
      { type: 'no-trade-zone', startIndex: 6, endIndex: 6, label: 'NFP in 30 min — DO NOT ENTER', color: '#ff3d57' },
    ],
  },
  {
    id: 'nt-4',
    name: 'Weak Indication',
    category: 'no-trade',
    difficulty: 'intermediate',
    instrument: 'USDJPY',
    bias: 'bullish',
    description: 'The "indication" is too weak — small candles, lots of wicks. This does not qualify as a strong impulse move.',
    whatToLookFor: [
      'Indication candles have small bodies relative to wicks',
      'Mixed colors (alternating bull/bear) during the "impulse"',
      'If you have to squint to see the indication, it\'s not one',
      'Strong indications are obvious — they jump off the chart',
    ],
    candles: [b(149,0.05),s(149.05,0.03),b(149.02,0.06),b(149.08,0.04),d(149.12,0.05),b(149.13,0.03),s(149.16,0.04),b(149.12,0.05)],
    annotations: [
      { type: 'no-trade-zone', startIndex: 0, endIndex: 7, label: 'Weak — not a valid indication', color: '#ff3d57' },
    ],
  },
  {
    id: 'nt-5',
    name: 'End of Session — Wrong Hours',
    category: 'no-trade',
    difficulty: 'beginner',
    instrument: 'EURUSD',
    bias: 'bearish',
    description: 'A valid setup appears in the Asian session for EURUSD. But EURUSD has minimal volume during Asian hours — skip it.',
    whatToLookFor: [
      'Each asset has optimal trading sessions',
      'EURUSD/GBPUSD: London + New York only',
      'USDJPY/AUDUSD: Asian + London overlap',
      'XAUUSD: London + NY overlap is best',
      'Trading in low-volume sessions = wider spreads and fake breakouts',
    ],
    candles: [s(1.09,0.001),s(1.089,0.001),s(1.088,0.0015), b(1.0865,0.0005),b(1.087,0.0005),d(1.0875,0.0003), s(1.087,0.001)],
    annotations: [
      { type: 'no-trade-zone', startIndex: 0, endIndex: 6, label: 'Asian session for EUR — low volume, skip', color: '#ff3d57' },
    ],
  },
];
