/**
 * Academy Homework Assignments
 * Each level has a practical assignment verified against real platform data.
 * No manual grading — the platform checks completion automatically.
 */

export interface HomeworkAssignment {
  id: string;
  levelId: number;
  title: string;
  description: string;
  objective: string;
  verificationMethod: 'journal_trades' | 'journal_session' | 'counselor_sessions' | 'simulator' | 'journal_risk';
  requiredCount: number;
  icon: string;
  accentColor: string;
  tips: string[];
}

export const HOMEWORK_ASSIGNMENTS: HomeworkAssignment[] = [
  {
    id: 'hw-1',
    levelId: 1,
    title: 'Your First 5 Trades',
    description: 'Place and close 5 trades on any instrument. It doesn\'t matter if they win or lose — what matters is that you execute.',
    objective: 'Complete 5 closed trades on your connected MT5 account.',
    verificationMethod: 'journal_trades',
    requiredCount: 5,
    icon: 'Zap',
    accentColor: 'neon-cyan',
    tips: [
      'Use a demo account if you\'re not ready for real money',
      'Start with EURUSD — it has the tightest spread',
      'Keep position sizes small (0.01 lots) while learning',
      'Set a stop loss on every trade — practice good habits from day one',
    ],
  },
  {
    id: 'hw-2',
    levelId: 2,
    title: 'Risk-Controlled Trading',
    description: 'Take 5 trades where your risk per trade stays under 2% of your account balance. The platform checks your actual position sizes against your balance.',
    objective: 'Complete 5 trades with risk per trade under 2% of balance.',
    verificationMethod: 'journal_risk',
    requiredCount: 5,
    icon: 'Shield',
    accentColor: 'neon-green',
    tips: [
      'Use the Position Size Calculator from Level 2 before every trade',
      'Check your account balance before calculating lot size',
      'A 2% risk on a $10,000 account = $200 max loss per trade',
      'If your SL is 25 pips on EURUSD, that means ~0.8 lots maximum at 2%',
    ],
  },
  {
    id: 'hw-3',
    levelId: 3,
    title: 'London Session Focus',
    description: 'Take 10 trades specifically during the London session (07:00–16:00 UTC). The platform verifies your trade timestamps automatically.',
    objective: 'Complete 10 trades tagged as London session.',
    verificationMethod: 'journal_session',
    requiredCount: 10,
    icon: 'Clock',
    accentColor: 'neon-amber',
    tips: [
      'London session runs 07:00–16:00 UTC (adjust for your timezone)',
      'The best setups usually form in the first 2 hours (07:00–09:00 UTC)',
      'Focus on EUR and GBP pairs — they\'re most active during London',
      'Use the Session Timezone Map widget to track session times',
    ],
  },
  {
    id: 'hw-4',
    levelId: 4,
    title: 'Journal 20 Trades',
    description: 'Build the journaling habit. Your MT5 auto-syncs trades, but the goal is to have 20 fully logged trades with session tags and P&L data.',
    objective: 'Accumulate 20 closed trades in your trade journal.',
    verificationMethod: 'journal_trades',
    requiredCount: 20,
    icon: 'BookOpen',
    accentColor: 'neon-purple',
    tips: [
      'Your MT5 trades sync automatically — no manual entry needed',
      'After each trade, check your journal to see the AI analysis',
      'Look for patterns: which sessions are profitable? Which pairs?',
      'Review your Flight Check weekly to spot edge leaks',
    ],
  },
  {
    id: 'hw-5',
    levelId: 5,
    title: 'Talk to Sage 3 Times',
    description: 'Have 3 meaningful conversations with Sage, your AI trading counselor. Talk about wins, losses, fears, or anything on your mind.',
    objective: 'Complete 3 Sage counselor sessions.',
    verificationMethod: 'counselor_sessions',
    requiredCount: 3,
    icon: 'Heart',
    accentColor: 'neon-purple',
    tips: [
      'Try the conversation starters: "I had a rough day" or "I keep overtrading"',
      'Sage sees your actual trading data — it understands your context',
      'There\'s no wrong topic — wins, losses, fears, discipline, anything',
      'The goal is to build the habit of processing trading emotions',
    ],
  },
  {
    id: 'hw-6',
    levelId: 6,
    title: 'Simulator Graduation',
    description: 'Complete any Chart Simulator scenario with a positive total P&L. Prove you can apply everything you\'ve learned in a simulated environment.',
    objective: 'Finish a simulator scenario with positive P&L.',
    verificationMethod: 'simulator',
    requiredCount: 1,
    icon: 'Target',
    accentColor: 'neon-cyan',
    tips: [
      'Start with the "Riding the Trend" scenario — it\'s the most forgiving',
      'Apply the 1% risk rule even in the simulator',
      'Don\'t overtrade — 15-20 trades per scenario is plenty',
      'Use SL/TP on every trade, just like you would with real money',
    ],
  },
];

export function getHomeworkForLevel(levelId: number): HomeworkAssignment | undefined {
  return HOMEWORK_ASSIGNMENTS.find(h => h.levelId === levelId);
}
