/**
 * ICC Guided Walkthrough Engine — Stage configs and validation logic.
 */
import type { ICCMark } from '@/stores/iccStudio';
import type { ICCAnswer } from '@/data/icc-scenarios';
import type { Timeframe } from '@/lib/icc-candle-generator';
import { overlapPercentage } from '@/lib/icc-scoring-engine';

export type GuidedStage = 'bias' | 'indication' | 'correction' | 'continuation' | 'trade';

export interface StageValidation {
  correct: boolean;
  feedback: string;
  overlapPct?: number;
}

export interface GuidedStageConfig {
  stage: GuidedStage;
  title: string;
  instruction: string;
  targetTimeframe: Timeframe;
  color: string;
}

export const GUIDED_STAGES: GuidedStageConfig[] = [
  {
    stage: 'bias',
    title: 'Step 1: Set Your Bias',
    instruction: 'Look at the 4H chart carefully. Are you seeing higher highs and higher lows (bullish) or lower highs and lower lows (bearish)? Click the Bullish or Bearish button in the toolbar above.',
    targetTimeframe: '4H',
    color: '#b18cff',
  },
  {
    stage: 'indication',
    title: 'Step 2: Mark the Indication',
    instruction: 'Now look at the 1H chart. Find the strong impulse move that confirms your bias — several strong candles moving decisively in one direction. Click "Indication" in the toolbar, then tap the first and last candle of the impulse.',
    targetTimeframe: '1H',
    color: '#00e5ff',
  },
  {
    stage: 'correction',
    title: 'Step 3: Mark the Correction',
    instruction: 'Switch to the 15M chart. Find where price pulls back against the indication — smaller candles moving the opposite direction. Click "Correction" in the toolbar, then tap the first and last candle of the pullback.',
    targetTimeframe: '15M',
    color: '#ffb800',
  },
  {
    stage: 'continuation',
    title: 'Step 4: Mark the Continuation',
    instruction: 'Now look at the 5M chart. Find the candle where price resumes moving in the indication direction — this is your entry point. Click "Continuation" then tap that candle.',
    targetTimeframe: '5M',
    color: '#00ff9d',
  },
  {
    stage: 'trade',
    title: 'Step 5: Execute the Trade',
    instruction: 'Time to trade! Set your SL below the correction low (for buys) or above the correction high (for sells). Set TP at 2x your SL distance. Then click BUY or SELL. Press Play to advance candles and watch your trade.',
    targetTimeframe: '5M',
    color: '#00e5ff',
  },
];

export function validateStage(
  stage: GuidedStage,
  marks: ICCMark[],
  biasSelection: 'bullish' | 'bearish' | null,
  answer: ICCAnswer,
  tradesTaken: number,
): StageValidation {
  switch (stage) {
    case 'bias':
      if (!biasSelection) return { correct: false, feedback: 'Select a bias — Bullish or Bearish.' };
      return biasSelection === answer.bias
        ? { correct: true, feedback: `Correct! The market bias is ${answer.bias}. You read the 4H structure accurately.` }
        : { correct: false, feedback: `Not quite — the 4H shows ${answer.bias} structure. Look at the swing highs and lows more carefully.` };

    case 'indication': {
      const mark = marks.find(m => m.type === 'indication');
      if (!mark) return { correct: false, feedback: 'Mark the indication — click "Indication" then tap the start and end candles of the impulse move.' };
      const overlap = overlapPercentage([mark.startIndex, mark.endIndex], answer.indicationRange);
      if (overlap >= 50) return { correct: true, feedback: `Great eye! ${Math.round(overlap)}% overlap with the optimal zone. You identified the impulse accurately.`, overlapPct: overlap };
      if (overlap >= 20) return { correct: false, feedback: `Close — ${Math.round(overlap)}% overlap. Your zone partially covers the impulse but try to include the strongest candles. The optimal range is [${answer.indicationRange.join('-')}].`, overlapPct: overlap };
      return { correct: false, feedback: `The impulse move is in a different area. Look for the candles with the most momentum — large bodies, minimal wicks, all in one direction. Optimal: [${answer.indicationRange.join('-')}].`, overlapPct: overlap };
    }

    case 'correction': {
      const mark = marks.find(m => m.type === 'correction');
      if (!mark) return { correct: false, feedback: 'Mark the correction — click "Correction" then tap the start and end candles of the pullback.' };
      const overlap = overlapPercentage([mark.startIndex, mark.endIndex], answer.correctionRange);
      if (overlap >= 50) return { correct: true, feedback: `Well done! ${Math.round(overlap)}% overlap. You found the correction zone accurately.`, overlapPct: overlap };
      if (overlap >= 20) return { correct: false, feedback: `Partially correct — ${Math.round(overlap)}% overlap. The pullback zone needs adjustment. Look for where price retraces 38-62% of the indication. Optimal: [${answer.correctionRange.join('-')}].`, overlapPct: overlap };
      return { correct: false, feedback: `The correction is in a different zone. Look for smaller candles moving against the indication direction. Optimal: [${answer.correctionRange.join('-')}].`, overlapPct: overlap };
    }

    case 'continuation': {
      const mark = marks.find(m => m.type === 'continuation');
      if (!mark) return { correct: false, feedback: 'Mark the continuation — click "Continuation" then tap the entry candle.' };
      const distance = Math.abs(mark.startIndex - answer.continuationCandle);
      if (distance <= 8) return { correct: true, feedback: `Excellent timing! Only ${distance} candles from the optimal entry at candle ${answer.continuationCandle}.` };
      if (distance <= 20) return { correct: false, feedback: `Close — ${distance} candles off. The optimal entry was candle ${answer.continuationCandle}. Look for the first strong candle that breaks the correction structure.` };
      return { correct: false, feedback: `Too far — ${distance} candles away from optimal (candle ${answer.continuationCandle}). Wait for the correction to complete, then enter on the first candle that moves in the trend direction.` };
    }

    case 'trade':
      if (tradesTaken > 0) return { correct: true, feedback: 'Trade placed! Now press Play and watch how the market responds to your entry. Good luck!' };
      return { correct: false, feedback: 'Place a trade — set your SL and TP, then click BUY or SELL.' };

    default:
      return { correct: false, feedback: '' };
  }
}
