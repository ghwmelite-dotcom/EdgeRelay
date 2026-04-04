/**
 * Research-backed benchmark data for the "ideal funded trader" archetype.
 * Derived from aggregated prop firm challenge pass rate data and
 * published performance statistics from FTMO, The5ers, and FundedNext.
 * Will be enriched with real platform user data as the user base grows.
 */

export interface BenchmarkDimension {
  label: string;
  key: string;
  ideal: number;
  range: [number, number];
  unit: string;
  direction: 'lower-is-better' | 'higher-is-better' | 'closer-is-better';
  weight: number; // 0-1, importance for similarity score
  description: string;
}

export const FUNDED_TRADER_BENCHMARKS: BenchmarkDimension[] = [
  {
    label: 'Trades Per Day',
    key: 'trades_per_day',
    ideal: 2.5,
    range: [1, 4],
    unit: 'trades',
    direction: 'closer-is-better',
    weight: 0.12,
    description: 'Funded traders average 2-3 quality trades per day. More than 5 signals overtrading.',
  },
  {
    label: 'Risk Per Trade',
    key: 'risk_per_trade',
    ideal: 0.75,
    range: [0.3, 1.0],
    unit: '%',
    direction: 'closer-is-better',
    weight: 0.18,
    description: 'Ideal challenge risk is 0.5-1.0% per trade. Below 0.3% is too slow; above 1.5% is dangerous.',
  },
  {
    label: 'Win Rate',
    key: 'win_rate',
    ideal: 58,
    range: [48, 70],
    unit: '%',
    direction: 'higher-is-better',
    weight: 0.15,
    description: 'A 50-65% win rate with proper R:R is the sweet spot. Above 70% often means cut winners too early.',
  },
  {
    label: 'Reward-to-Risk',
    key: 'risk_reward',
    ideal: 1.5,
    range: [1.2, 2.5],
    unit: 'R',
    direction: 'higher-is-better',
    weight: 0.15,
    description: 'Funded traders target at least 1.5R per trade. Below 1.0R requires very high win rate.',
  },
  {
    label: 'Avg Hold Time',
    key: 'hold_minutes',
    ideal: 90,
    range: [15, 240],
    unit: 'min',
    direction: 'closer-is-better',
    weight: 0.08,
    description: 'Most funded traders hold 15 minutes to 4 hours. Scalping (<5min) and swing (>8h) have lower pass rates.',
  },
  {
    label: 'Profit Factor',
    key: 'profit_factor',
    ideal: 1.8,
    range: [1.3, 3.0],
    unit: '',
    direction: 'higher-is-better',
    weight: 0.14,
    description: 'Profit factor above 1.3 is minimum. 1.5-2.5 is the funded trader sweet spot.',
  },
  {
    label: 'Daily Loss Discipline',
    key: 'daily_loss_usage',
    ideal: 35,
    range: [10, 50],
    unit: '%',
    direction: 'lower-is-better',
    weight: 0.10,
    description: 'Funded traders typically use only 30-40% of their daily loss limit. Using >70% signals poor risk control.',
  },
  {
    label: 'Consistency Score',
    key: 'consistency',
    ideal: 75,
    range: [50, 95],
    unit: '/100',
    direction: 'higher-is-better',
    weight: 0.08,
    description: 'Low variance in daily P&L indicates consistency. Funded traders avoid "hero days" followed by blowups.',
  },
];

export function computeSimilarityScore(
  userMetrics: Record<string, number>,
): { score: number; gaps: Array<{ dimension: BenchmarkDimension; userValue: number; delta: number; recommendation: string }> } {
  let totalWeight = 0;
  let weightedScore = 0;
  const gaps: Array<{ dimension: BenchmarkDimension; userValue: number; delta: number; recommendation: string }> = [];

  for (const dim of FUNDED_TRADER_BENCHMARKS) {
    const userVal = userMetrics[dim.key];
    if (userVal === undefined || isNaN(userVal)) continue;

    totalWeight += dim.weight;

    // Compute score for this dimension (0-100)
    let dimScore: number;
    const [low, high] = dim.range;

    if (dim.direction === 'closer-is-better') {
      const maxDist = Math.max(Math.abs(high - dim.ideal), Math.abs(low - dim.ideal));
      const dist = Math.abs(userVal - dim.ideal);
      dimScore = Math.max(0, 100 - (dist / maxDist) * 100);
    } else if (dim.direction === 'higher-is-better') {
      if (userVal >= dim.ideal) dimScore = 100;
      else if (userVal <= low) dimScore = 0;
      else dimScore = ((userVal - low) / (dim.ideal - low)) * 100;
    } else {
      // lower-is-better
      if (userVal <= dim.ideal) dimScore = 100;
      else if (userVal >= high) dimScore = 0;
      else dimScore = ((high - userVal) / (high - dim.ideal)) * 100;
    }

    dimScore = Math.min(100, Math.max(0, dimScore));
    weightedScore += dimScore * dim.weight;

    // Generate gap recommendation if score < 70
    if (dimScore < 70) {
      const delta = userVal - dim.ideal;
      let recommendation = '';
      if (dim.direction === 'higher-is-better' && delta < 0) {
        recommendation = `Increase your ${dim.label.toLowerCase()} from ${userVal.toFixed(1)}${dim.unit} toward ${dim.ideal}${dim.unit}`;
      } else if (dim.direction === 'lower-is-better' && delta > 0) {
        recommendation = `Reduce your ${dim.label.toLowerCase()} from ${userVal.toFixed(1)}${dim.unit} toward ${dim.ideal}${dim.unit}`;
      } else {
        recommendation = `Adjust your ${dim.label.toLowerCase()} from ${userVal.toFixed(1)}${dim.unit} closer to ${dim.ideal}${dim.unit}`;
      }
      gaps.push({ dimension: dim, userValue: userVal, delta, recommendation });
    }
  }

  const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  // Sort gaps by weight descending (most impactful first)
  gaps.sort((a, b) => b.dimension.weight - a.dimension.weight);

  return { score, gaps };
}
