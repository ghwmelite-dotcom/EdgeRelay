/**
 * ICC Flash Drill questions — static data for rapid pattern recognition training.
 * Candle data is simplified OHLC for inline SVG rendering.
 */

export type DrillType = 'identify-phase' | 'bias-direction' | 'entry-timing';

export interface DrillQuestion {
  id: string;
  type: DrillType;
  prompt: string;
  candles: { o: number; h: number; l: number; c: number }[];
  choices: string[];
  correctIndex: number;
  explanation: string;
}

// Helper: generate simple candle sequences
function bull(base: number, size: number, wick = 0.3): { o: number; h: number; l: number; c: number } {
  return { o: base, h: base + size + size * wick, l: base - size * wick * 0.5, c: base + size };
}
function bear(base: number, size: number, wick = 0.3): { o: number; h: number; l: number; c: number } {
  return { o: base, h: base + size * wick * 0.5, l: base - size - size * wick, c: base - size };
}
function doji(base: number, wick: number): { o: number; h: number; l: number; c: number } {
  return { o: base, h: base + wick, l: base - wick, c: base + 0.5 };
}

export const DRILL_QUESTIONS: DrillQuestion[] = [
  // === IDENTIFY PHASE ===
  {
    id: 'ip-1',
    type: 'identify-phase',
    prompt: 'What ICC phase is this chart showing?',
    candles: [bull(100, 3), bull(103, 4), bull(107, 5), bull(112, 6), bull(118, 5)],
    choices: ['Indication', 'Correction', 'Neither'],
    correctIndex: 0,
    explanation: '5 consecutive strong bullish candles with increasing size — this is a textbook indication (impulse move).',
  },
  {
    id: 'ip-2',
    type: 'identify-phase',
    prompt: 'What ICC phase is this chart showing?',
    candles: [bull(120, 2), bear(122, 3), bear(119, 2), bear(117, 1.5), doji(115.5, 1), bear(115, 1)],
    choices: ['Indication', 'Correction', 'Neither'],
    correctIndex: 1,
    explanation: 'After a high point, price pulls back with smaller bearish candles — this is a correction (retracement against the prior move).',
  },
  {
    id: 'ip-3',
    type: 'identify-phase',
    prompt: 'What ICC phase is this chart showing?',
    candles: [doji(100, 2), bull(100.5, 1), bear(101.5, 1.5), doji(100, 1.5), bull(100.5, 1), bear(101.5, 1)],
    choices: ['Indication', 'Correction', 'Neither'],
    correctIndex: 2,
    explanation: 'Choppy price action with no clear direction — dojis and alternating candles. This is a ranging market. No ICC setup here.',
  },
  {
    id: 'ip-4',
    type: 'identify-phase',
    prompt: 'What ICC phase is this chart showing?',
    candles: [bear(150, 4), bear(146, 5), bear(141, 6), bear(135, 5), bear(130, 4)],
    choices: ['Indication', 'Correction', 'Neither'],
    correctIndex: 0,
    explanation: 'Strong consecutive bearish candles with good body size — this is a bearish indication.',
  },
  {
    id: 'ip-5',
    type: 'identify-phase',
    prompt: 'What ICC phase is this chart showing?',
    candles: [bear(130, 2), bull(128, 1.5), bull(129.5, 2), bull(131.5, 1), doji(132.5, 0.8)],
    choices: ['Indication', 'Correction', 'Neither'],
    correctIndex: 1,
    explanation: 'After a bearish move, price bounces upward with smaller candles — this is a bullish correction against the bearish trend.',
  },
  {
    id: 'ip-6',
    type: 'identify-phase',
    prompt: 'What ICC phase is this chart showing?',
    candles: [doji(110, 1), bull(110.5, 1), bear(111.5, 2), bull(109.5, 1.5), bear(111, 1), bull(110, 0.5), doji(110.5, 0.8)],
    choices: ['Indication', 'Correction', 'Neither'],
    correctIndex: 2,
    explanation: 'Price is bouncing within a tight range with no conviction in either direction. This is consolidation — not tradeable with ICC.',
  },

  // === BIAS DIRECTION ===
  {
    id: 'bd-1',
    type: 'bias-direction',
    prompt: 'Looking at this 4H structure, what is the bias?',
    candles: [bull(100, 3), bear(103, 1.5), bull(101.5, 4), bear(105.5, 2), bull(103.5, 5), bear(108.5, 2), bull(106.5, 4)],
    choices: ['Bullish', 'Bearish', 'Ranging'],
    correctIndex: 0,
    explanation: 'Higher highs and higher lows — each swing high exceeds the previous one, and each pullback stays above the prior low. Bullish bias.',
  },
  {
    id: 'bd-2',
    type: 'bias-direction',
    prompt: 'Looking at this 4H structure, what is the bias?',
    candles: [bear(150, 4), bull(146, 2), bear(148, 5), bull(143, 2), bear(145, 6), bull(139, 1.5), bear(140.5, 4)],
    choices: ['Bullish', 'Bearish', 'Ranging'],
    correctIndex: 1,
    explanation: 'Lower highs and lower lows — the market is consistently making new lows. Bearish bias.',
  },
  {
    id: 'bd-3',
    type: 'bias-direction',
    prompt: 'Looking at this 4H structure, what is the bias?',
    candles: [bull(100, 3), bear(103, 3), bull(100, 2.5), bear(102.5, 2.5), bull(100, 3), bear(103, 3), bull(100, 2)],
    choices: ['Bullish', 'Bearish', 'Ranging'],
    correctIndex: 2,
    explanation: 'Price keeps bouncing between the same levels — no new highs or new lows. This is a range. Do NOT trade ICC in a range.',
  },
  {
    id: 'bd-4',
    type: 'bias-direction',
    prompt: 'What is the bias?',
    candles: [bull(80, 2), bull(82, 3), bear(85, 1), bull(84, 4), bear(88, 1.5), bull(86.5, 5), bear(91.5, 1)],
    choices: ['Bullish', 'Bearish', 'Ranging'],
    correctIndex: 0,
    explanation: 'Clear higher highs (85→88→91.5) and higher lows (82→84→86.5). Strong bullish structure.',
  },
  {
    id: 'bd-5',
    type: 'bias-direction',
    prompt: 'What is the bias?',
    candles: [bear(200, 5), bull(195, 3), bear(198, 7), bull(191, 2), bear(193, 8), bull(185, 3), bear(188, 6)],
    choices: ['Bullish', 'Bearish', 'Ranging'],
    correctIndex: 1,
    explanation: 'Aggressive lower lows with each bearish leg. The bullish corrections are weak. Strong bearish bias.',
  },
  {
    id: 'bd-6',
    type: 'bias-direction',
    prompt: 'What is the bias?',
    candles: [bull(100, 4), bear(104, 3.5), bull(100.5, 3.5), bear(104, 4), bull(100, 4), bear(104, 3)],
    choices: ['Bullish', 'Bearish', 'Ranging'],
    correctIndex: 2,
    explanation: 'Highs around 104, lows around 100 — equal highs and equal lows. Classic range. Wait for a breakout.',
  },

  // === ENTRY TIMING ===
  {
    id: 'et-1',
    type: 'entry-timing',
    prompt: 'The correction just completed. Which candle is the continuation entry?',
    candles: [bear(120, 2), bear(118, 1.5), bear(116.5, 1), doji(115.5, 0.8), doji(115, 0.5), bull(115.5, 2), bull(117.5, 3)],
    choices: ['Candle 4 (doji)', 'Candle 6 (first bull)', 'Candle 7 (second bull)'],
    correctIndex: 1,
    explanation: 'After the correction (bearish candles + dojis), candle 6 is the first candle that closes bullish — this breaks the correction structure and is your continuation entry.',
  },
  {
    id: 'et-2',
    type: 'entry-timing',
    prompt: 'Bearish trend. Correction is pulling back up. Where do you enter the sell?',
    candles: [bull(95, 2), bull(97, 1.5), bull(98.5, 1), doji(99.5, 0.5), bear(99, 2.5), bear(96.5, 3)],
    choices: ['Candle 4 (doji)', 'Candle 5 (first bear)', 'Candle 6 (second bear)'],
    correctIndex: 1,
    explanation: 'The correction moved price up (bullish candles). Candle 5 is the first strong bearish candle that breaks the upward correction — your sell entry.',
  },
  {
    id: 'et-3',
    type: 'entry-timing',
    prompt: 'When should you enter here?',
    candles: [bear(110, 1), bear(109, 0.8), doji(108.2, 0.5), doji(108, 0.4), doji(107.8, 0.3), bull(108, 1), bull(109, 2)],
    choices: ['Candle 3 (first doji)', 'Candle 6 (first bull)', 'Too early to tell'],
    correctIndex: 1,
    explanation: 'Dojis show indecision — NOT a continuation signal. Candle 6 is the first bullish close that breaks above the doji range. That is your entry.',
  },
  {
    id: 'et-4',
    type: 'entry-timing',
    prompt: 'Correction is deep. Is there a valid continuation?',
    candles: [bull(100, 2), bull(102, 3), bear(105, 4), bear(101, 3), bear(98, 2), bear(96, 1.5)],
    choices: ['Candle 5 (bearish)', 'Wait for bullish candle', 'No trade — correction too deep'],
    correctIndex: 2,
    explanation: 'The correction has retraced more than 100% of the indication move (went below the start). This invalidates the ICC setup. No trade.',
  },
  {
    id: 'et-5',
    type: 'entry-timing',
    prompt: 'The bullish correction is ending. Where is the sell continuation?',
    candles: [bull(140, 1.5), bull(141.5, 1), doji(142.5, 0.6), bear(142, 1.5), bear(140.5, 2.5), bear(138, 3)],
    choices: ['Candle 3 (doji)', 'Candle 4 (first bear)', 'Candle 5 (second bear)'],
    correctIndex: 1,
    explanation: 'Candle 4 is the first clear bearish candle after the correction stalls with a doji. This is the continuation signal for the sell.',
  },
  {
    id: 'et-6',
    type: 'entry-timing',
    prompt: 'Perfect pullback to the golden zone. Where do you enter?',
    candles: [bear(100, 1), bear(99, 0.8), doji(98.2, 0.5), bull(98.5, 0.3), bull(98.8, 1.5), bull(100.3, 2)],
    choices: ['Candle 4 (tiny bull)', 'Candle 5 (medium bull)', 'Candle 6 (strong bull)'],
    correctIndex: 1,
    explanation: 'Candle 4 is too small to confirm. Candle 5 closes bullish with good body size — this is your confirmation candle. Don\'t wait for candle 6 (that\'s chasing).',
  },
];
