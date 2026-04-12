/**
 * ICC Scoring Engine — Validates student's ICC pattern marking
 * against the scenario answer key and produces a graded score.
 */

import type { ICCMark } from '@/stores/iccStudio';
import type { ICCAnswer } from '@/data/icc-scenarios';

export interface ScoreComponent {
  dimension: string;
  score: number;
  maxScore: number;
  feedback: string;
  color: string;
}

export interface ICCScore {
  components: ScoreComponent[];
  total: number;
  maxTotal: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  overallFeedback: string;
}

function overlapPercentage(a: [number, number], b: [number, number]): number {
  const start = Math.max(a[0], b[0]);
  const end = Math.min(a[1], b[1]);
  if (start > end) return 0;
  const overlapLen = end - start + 1;
  const aLen = a[1] - a[0] + 1;
  const bLen = b[1] - b[0] + 1;
  const maxLen = Math.max(aLen, bLen);
  return maxLen > 0 ? (overlapLen / maxLen) * 100 : 0;
}

export function scoreICCAttempt(
  marks: ICCMark[],
  biasSelection: 'bullish' | 'bearish' | null,
  answer: ICCAnswer,
  tradesTaken: number,
  totalPnl: number,
): ICCScore {
  const components: ScoreComponent[] = [];

  // 1. Bias (25 points)
  const biasCorrect = biasSelection === answer.bias;
  components.push({
    dimension: 'Bias (4H)',
    score: biasCorrect ? 25 : 0,
    maxScore: 25,
    feedback: biasCorrect
      ? `Correct — the market bias is ${answer.bias}. You read the 4H structure accurately.`
      : biasSelection
        ? `Incorrect — you marked ${biasSelection} but the bias is ${answer.bias}. Check the 4H higher highs/lower lows.`
        : 'Not marked — always declare your bias from the 4H chart before looking lower.',
    color: biasCorrect ? '#00ff9d' : '#ff3d57',
  });

  // 2. Indication (25 points)
  const indMark = marks.find(m => m.type === 'indication');
  let indScore = 0;
  let indFeedback = 'Not marked — look for a strong impulse move on the 1H that confirms the 4H bias.';
  if (indMark) {
    const overlap = overlapPercentage(
      [indMark.startIndex, indMark.endIndex],
      answer.indicationRange,
    );
    if (overlap >= 60) { indScore = 25; indFeedback = 'Excellent — you identified the indication impulse accurately.'; }
    else if (overlap >= 30) { indScore = 15; indFeedback = 'Partial — your indication zone overlaps but could be more precise. Focus on the strongest impulse candles.'; }
    else if (overlap > 0) { indScore = 8; indFeedback = 'Close but off — the indication zone you marked doesn\'t align well with the actual impulse. Look for the move with the most momentum.'; }
    else { indScore = 0; indFeedback = 'Missed — the impulse move was in a different area. Review the 1H chart for the strongest directional move.'; }
  }
  components.push({
    dimension: 'Indication (1H)',
    score: indScore,
    maxScore: 25,
    feedback: indFeedback,
    color: indScore >= 20 ? '#00ff9d' : indScore >= 10 ? '#ffb800' : '#ff3d57',
  });

  // 3. Correction (25 points)
  const corMark = marks.find(m => m.type === 'correction');
  let corScore = 0;
  let corFeedback = 'Not marked — look for the pullback against the indication move on the 15M chart.';
  if (corMark) {
    const overlap = overlapPercentage(
      [corMark.startIndex, corMark.endIndex],
      answer.correctionRange,
    );
    if (overlap >= 60) { corScore = 25; corFeedback = 'Excellent — you identified the correction zone accurately. Good patience waiting for the pullback.'; }
    else if (overlap >= 30) { corScore = 15; corFeedback = 'Partial — you found the correction area but the boundaries could be tighter. Wait for the pullback to complete.'; }
    else if (overlap > 0) { corScore = 8; corFeedback = 'Close but off — the correction you marked isn\'t quite right. The pullback typically retraces 38-62% of the indication.'; }
    else { corScore = 0; corFeedback = 'Missed — the actual correction was in a different zone. Look for price retracing against the impulse.'; }
  }
  components.push({
    dimension: 'Correction (15M)',
    score: corScore,
    maxScore: 25,
    feedback: corFeedback,
    color: corScore >= 20 ? '#00ff9d' : corScore >= 10 ? '#ffb800' : '#ff3d57',
  });

  // 4. Continuation / Entry (15 points)
  const conMark = marks.find(m => m.type === 'continuation');
  let conScore = 0;
  let conFeedback = 'Not marked — look for the moment price resumes the trend direction on the 5M chart.';
  if (conMark) {
    const distance = Math.abs(conMark.startIndex - answer.continuationCandle);
    if (distance <= 5) { conScore = 15; conFeedback = 'Excellent entry timing — very close to the optimal continuation point.'; }
    else if (distance <= 15) { conScore = 10; conFeedback = 'Good entry — slightly off from optimal but within acceptable range.'; }
    else if (distance <= 30) { conScore = 5; conFeedback = 'Late entry — you waited too long or entered too early. The optimal entry was closer to where the correction ended.'; }
    else { conScore = 0; conFeedback = 'Missed the continuation — too far from the optimal entry point.'; }
  }
  components.push({
    dimension: 'Continuation (5M)',
    score: conScore,
    maxScore: 15,
    feedback: conFeedback,
    color: conScore >= 12 ? '#00ff9d' : conScore >= 6 ? '#ffb800' : '#ff3d57',
  });

  // 5. Risk Management (10 points)
  let riskScore = 0;
  let riskFeedback = 'No trades taken — practice executing after marking your ICC zones.';
  if (tradesTaken > 0) {
    if (totalPnl > 0) { riskScore = 10; riskFeedback = 'Profitable session — good risk management.'; }
    else if (totalPnl > -50) { riskScore = 6; riskFeedback = 'Small loss — acceptable if you followed your stop loss.'; }
    else { riskScore = 2; riskFeedback = 'Significant loss — review your SL placement and position sizing.'; }
    if (tradesTaken > 5) { riskScore = Math.max(0, riskScore - 3); riskFeedback += ' You may be overtrading — ICC typically produces 1-3 trades per session.'; }
  }
  components.push({
    dimension: 'Risk Management',
    score: riskScore,
    maxScore: 10,
    feedback: riskFeedback,
    color: riskScore >= 8 ? '#00ff9d' : riskScore >= 4 ? '#ffb800' : '#ff3d57',
  });

  // Total
  const total = components.reduce((s, c) => s + c.score, 0);
  const maxTotal = components.reduce((s, c) => s + c.maxScore, 0);
  const percentage = Math.round((total / maxTotal) * 100);

  let grade: ICCScore['grade'];
  let overallFeedback: string;
  if (percentage >= 85) { grade = 'A'; overallFeedback = 'Outstanding ICC analysis! You\'re reading market structure with precision.'; }
  else if (percentage >= 70) { grade = 'B'; overallFeedback = 'Good work. Your ICC identification is solid — refine your entry timing for an A.'; }
  else if (percentage >= 55) { grade = 'C'; overallFeedback = 'Decent attempt. Focus on identifying the indication impulse more clearly before marking the correction.'; }
  else if (percentage >= 40) { grade = 'D'; overallFeedback = 'Needs improvement. Practice identifying clear trend structure on the 4H before moving to lower timeframes.'; }
  else { grade = 'F'; overallFeedback = 'Keep practicing. Start by getting the 4H bias correct, then work on the indication. Don\'t rush to the entry.'; }

  return { components, total, maxTotal, percentage, grade, overallFeedback };
}
