/**
 * ICC Lesson Library — 14 lessons extracted from the ICC trading course.
 * Each lesson is a condensed, readable version of the video content.
 */

export interface ICCLesson {
  id: string;
  day: number;
  title: string;
  subtitle: string;
  summary: string;
  keyPoints: string[];
  rules: string[];
  quote: string;
  color: string;
  icon: 'basics' | 'trend' | 'indication' | 'correction' | 'continuation' | 'structure' | 'timeframe' | 'psychology' | 'markup' | 'decision';
}

export const ICC_LESSONS: ICCLesson[] = [
  {
    id: 'day-1',
    day: 1,
    title: 'What Is Trading?',
    subtitle: 'The basics — buy, sell, candlesticks, and trends',
    summary: 'Trading is predicting price direction. You buy if you think price goes up, sell if you think it goes down. These movements are shown through candlesticks that fluctuate fast or slow depending on your timeframe. Trading is NOT gambling — you can have a strategic, logical reason for every trade.',
    keyPoints: [
      'If you place a buy, price must go ABOVE your entry to profit',
      'If you place a sell, price must go BELOW your entry to profit',
      'Candlesticks show price movement — you will see them every day',
      'Timeframes control speed: higher = slower, lower = faster',
      'You need: a broker, TradingView, and Wi-Fi',
    ],
    rules: [
      'Trading is NOT gambling — you need a strategic reason for every trade',
      'Depending on what timeframe you are on, candles will move fast or slow',
    ],
    quote: "I'm going to show you that trading is not gambling. You can have a strategic logical reason of why you think price is going up or down.",
    color: '#00e5ff',
    icon: 'basics',
  },
  {
    id: 'day-1b',
    day: 1,
    title: 'Uptrends, Downtrends & Consolidation',
    subtitle: 'The 3 states of the market — know which one you\'re in',
    summary: 'Markets move in 3 ways: uptrends (higher highs, higher lows), downtrends (lower highs, lower lows), and consolidation (no clear direction). Price will NOT break trend structure unless it intends to reverse. Consolidation breaks the rules — never trade it.',
    keyPoints: [
      'Uptrend = higher highs + higher lows. Only look for BUYS',
      'Downtrend = lower highs + lower lows. Only look for SELLS',
      'Consolidation = price going sideways, breaking rules. DO NOT TRADE',
      'If you can\'t immediately see HH/HL or LH/LL, close the chart',
      'Everything in trading follows rules. Consolidation breaks them',
    ],
    rules: [
      'Price will NOT break trend structure unless it is reversing or consolidating',
      'If consolidation is breaking the rules, do NOT put yourself around it',
      'You wouldn\'t hang around criminals who break laws — don\'t trade assets breaking rules',
    ],
    quote: "Everything in trading has to follow a rule. If consolidation is breaking the rules, you do not want to put yourself around something that is breaking the rules.",
    color: '#00ff9d',
    icon: 'trend',
  },
  {
    id: 'day-2',
    day: 2,
    title: 'The Indication',
    subtitle: 'When price breaks a swing level — the trend is born',
    summary: 'An indication is when price breaks above a swing high or below a swing low, signaling a new trend direction. Use the 1H or 4H timeframe to identify indications. Do NOT trade the indication — it\'s information, not an entry. It shows you where your TP and entry zone will be later.',
    keyPoints: [
      'Indications can ONLY happen when price breaks a swing high or swing low',
      'Look for indications on the 1H and 4H timeframes',
      'The indication is NOT your entry — do NOT trade the breakout',
      'Use it as a blueprint: it shows where your entry and TP will be',
      'After every indication, expect a correction (liquidity grab)',
    ],
    rules: [
      'Indications can ONLY happen when breaking above or below swing highs/lows',
      'Do NOT trade the indication — use it as information only',
      'The indication shows you where the trend STARTS',
    ],
    quote: "The whole point is to look at the indication as a blueprint of what you're going to do. It shows where your entry is going to be and where your exit is going to be.",
    color: '#00e5ff',
    icon: 'indication',
  },
  {
    id: 'day-3',
    day: 3,
    title: 'The Correction',
    subtitle: 'The liquidity grab — patience is your edge',
    summary: 'After every indication, the market corrects to grab liquidity from FOMO traders who entered the breakout. The correction shakes out emotional traders. Monitor corrections on the 15-minute timeframe. The correction is when most beginners lose — they enter too early.',
    keyPoints: [
      'Corrections happen AFTER price makes a new high or new low',
      'The market grabs liquidity from breakout/FOMO traders',
      'Monitor corrections on the 15-minute timeframe',
      'Two groups get trapped: breakout traders and late FOMO traders',
      'Wait for the correction to END before entering',
    ],
    rules: [
      'Corrections happen after price makes a new high or new low',
      'Never enter during the indication — wait for the correction',
      'The correction on 15M shows you when it\'s safe to enter',
      'If you enter during the indication, you\'re buying at the worst price',
    ],
    quote: "Think of the indication and correction like opening a Coke bottle. Everything explodes everywhere, starts to slow down, dies off, and then there's a mess. That's the indication and correction.",
    color: '#ffb800',
    icon: 'correction',
  },
  {
    id: 'day-4',
    day: 4,
    title: 'The Continuation',
    subtitle: 'Your entry — when the trend resumes on the 5M',
    summary: 'The continuation is your entry model. After the correction ends, scale down to the 5-minute or 15-minute timeframe and wait for price to break structure back in the trend direction. You need the SECOND push — the first breakout is a trap. Enter when the lower timeframe confirms the higher timeframe direction.',
    keyPoints: [
      'Wait for the 5M/15M to change structure back in the trend direction',
      'Look for lower highs being broken (for buys) or higher lows broken (for sells)',
      'Your stop loss goes above the lower high (sells) or below the higher low (buys)',
      'Target the 1H level where the indication started',
      'The second push is safer than trading the first breakout',
    ],
    rules: [
      'Use 5M or 15M timeframe for entry — whichever shows clearer structure',
      'Your TP targets the 1H level where the indication ended',
      'Stop loss above the last lower high (for sells) or below the last higher low (for buys)',
      'Don\'t go off 5M structure for targets — use the higher timeframe levels',
    ],
    quote: "What people fail to remember is don't go off that 5-minute structure. Go off the higher timeframe. We're looking for the 1-hour to stop correcting by digging deeper inside the trend.",
    color: '#00ff9d',
    icon: 'continuation',
  },
  {
    id: 'day-5',
    day: 5,
    title: 'Market Structure & Reaction Levels',
    subtitle: 'Buyers and sellers — who controls the price?',
    summary: 'At every swing high, sellers push price down. At every swing low, buyers push price up. Above a swing low = potential bullish. Below a swing high = potential bearish. Follow the reactions — don\'t predict. The market shows you where buyers and sellers are fighting.',
    keyPoints: [
      'Anything above a swing low = potential bullish momentum',
      'Anything below a swing high = potential bearish momentum',
      'Sellers sit at highs pushing price down, buyers sit at lows pushing up',
      'Follow reactions at these levels — don\'t try to predict',
      'FOMO causes entries at breakouts, revenge trading causes entries at corrections',
    ],
    rules: [
      'Above a swing low = bullish potential. Below a swing high = bearish potential',
      'Every movement should NOT be your trade. Follow the trend',
      'Stop trying to be a genie — follow what price is doing',
    ],
    quote: "Stop trying to be a genie. You don't have a crystal ball. Just follow what price is doing. You're losing money because you want to be the all-see, all-know.",
    color: '#b18cff',
    icon: 'structure',
  },
  {
    id: 'day-6',
    day: 6,
    title: 'Timeframe Correlation',
    subtitle: 'How 4H, 1H, 15M, and 5M work together',
    summary: 'All timeframes must align. Mark levels on 1H/4H. When the 4H corrects, the 1H builds a counter-trend. When the 1H aligns back with the 4H, scale to 15M for entry confirmation. The 4H is always stronger than 1H, 1H stronger than 15M.',
    keyPoints: [
      '4H correction = 1H downtrend (temporary). When 4H resumes, 1H follows',
      'Mark your levels on 1H or 4H — never on 5M or 15M',
      'Scale down to 15M/5M ONLY for entries, not for structure',
      '4H bullish → wait for 1H to go bullish → wait for 15M to go bullish → enter',
      'Everything must correlate — if one timeframe disagrees, don\'t trade',
    ],
    rules: [
      'Higher timeframe is ALWAYS stronger — 4H > 1H > 15M > 5M',
      'Only scale down for the correction → continuation phase',
      '15M shall align with 1H. 1H shall align with 4H. Everything must align',
    ],
    quote: "If you're starting with the 4-hour, the 1-hour shall align with the 4-hour, the 15-minute shall align with the 1-hour. Everything should align.",
    color: '#00e5ff',
    icon: 'timeframe',
  },
  {
    id: 'day-7',
    day: 7,
    title: 'Marking Up Your Charts',
    subtitle: 'Clean charts, clear mind — only mark what matters',
    summary: 'Only use 1-3 sessions of data. Find swing highs and swing lows on the 1H. Between a high and low with no breakout = no trade zone. Wait for an indication to break out before entering. Keep your charts clean — you don\'t need indicators.',
    keyPoints: [
      'Only need 1-3 trading sessions of data — don\'t go back weeks',
      'Mark swing highs and swing lows on the 1H timeframe',
      'Between a high and low with no indication = NO TRADE ZONE',
      'Indication = price breaks the swing high or low',
      'Turn on sessions to trade during volume (London, New York)',
    ],
    rules: [
      'A no-trade zone is when price has a high and low with no indication',
      'Don\'t mark up every little thing — only significant swing points',
      'Your charts should have: grey boxes, circles, arrows, and a line. That\'s it',
    ],
    quote: "I be seeing y'all post charts and y'all charts be ugly. I can't read anything, I don't understand anything.",
    color: '#ffb800',
    icon: 'markup',
  },
  {
    id: 'day-8',
    day: 8,
    title: 'Trading is Simpler Than You Think',
    subtitle: 'Stop overcomplicating it — follow the reactions',
    summary: 'Everything taught so far is sufficient to trade profitably. The biggest obstacle is your own psychology — overthinking, not trusting higher timeframes, trading things with no volume. Trade volatile assets (gold, NASDAQ, crypto). Build capital on the side first.',
    keyPoints: [
      'If I haven\'t said it, I\'m not thinking about it — keep it that simple',
      'Trade things with volatility: gold, NASDAQ, crypto, indices',
      'Don\'t trade with your last dollars — save up capital first',
      'You only need 2 solid trades per week to replace your paycheck',
      'Follow the reactions at levels — don\'t predict the future',
    ],
    rules: [
      'Trade assets with volume — forex pairs are too stable for this style',
      'Save up capital before trading live — at least $2,000-$3,000',
      'Stop risking your last dollars. Stack money from a job first',
    ],
    quote: "If you don't understand this by now, you're just overthinking it. I've been doing this for four years. I haven't sold a course. I don't sell signals. This is just how I trade.",
    color: '#00ff9d',
    icon: 'psychology',
  },
  {
    id: 'day-9',
    day: 9,
    title: 'Identifying Trend Reversals',
    subtitle: 'When lower highs break — the trend is changing',
    summary: 'A trend reversal starts when price breaks a lower high (in a downtrend) or a higher low (in an uptrend). The moment this happens, stop thinking the old trend will continue. Wait for the new trend structure to confirm, then enter in the new direction using ICC.',
    keyPoints: [
      'When a lower high is broken in a downtrend → trend may be reversing to bullish',
      'When a higher low is broken in an uptrend → trend may be reversing to bearish',
      'Don\'t fight the reversal — accept it and trade the new direction',
      'Use the 5M/15M to find entries after the reversal confirms on 1H',
      'Trade during high-volume sessions (New York for gold/indices)',
    ],
    rules: [
      'The moment price breaks a lower high, stop thinking bearish',
      'Price should maintain structure — if it doesn\'t, the trend is changing',
      'Be open-minded to what the trend could possibly be',
    ],
    quote: "The moment price breaks that structure, you need to instantly stop thinking price is on the same trend. Take a look at what's going on afterwards.",
    color: '#ff3d57',
    icon: 'structure',
  },
  {
    id: 'day-10',
    day: 10,
    title: 'Clean Chart Markup',
    subtitle: 'Fresh start — only swing highs, swing lows, and sessions',
    summary: 'Clear everything off your chart. Turn on sessions. Find swing highs and swing lows from the last 1-3 sessions. Mark the no-trade zone. Wait for the indication. Market structure doesn\'t change just because you change timeframes.',
    keyPoints: [
      'Clear your charts completely — fresh start',
      'Turn on sessions (London, New York) for volume awareness',
      'Only need 1-3 sessions of price data',
      'Mark swing highs and swing lows — nothing else',
      'Market structure is the same on all timeframes — rules don\'t change',
    ],
    rules: [
      'Market structure doesn\'t change just because the timeframe changes',
      'A no-trade zone = high and low with no indication. Don\'t trade it',
      'Don\'t trade the indication — it\'s just a breakout. Wait for the second push',
    ],
    quote: "I want you guys to make your charts look like mine. Your charts be ugly — I can't read anything on them.",
    color: '#00e5ff',
    icon: 'markup',
  },
  {
    id: 'day-11',
    day: 11,
    title: 'Market Structure Deep Dive',
    subtitle: 'ICC is kindergarten-level price action — that\'s the point',
    summary: 'ICC is not a new strategy — it\'s the simplest way to explain market structure and price action. You don\'t need indicators or chart patterns. Just follow swing highs and swing lows. The trend will keep going until it stops. Stop trying to be creative with the markets.',
    keyPoints: [
      'ICC = kindergarten level price action. That\'s the whole point',
      'Trends keep going until they want to stop — don\'t fight them',
      'Don\'t sell on Monday then look for buys on Tuesday — stick with the trend',
      'Back-testing is less valuable than real-time market experience',
      'Put yourself in the fire to learn faster — trade demo in real-time',
    ],
    rules: [
      'If something works, keep doing it. Don\'t try to be creative',
      'Follow what price is doing. Stop trying to predict',
      'You learn faster from being in the fire than punching a bag',
    ],
    quote: "ICC is kindergarten level of price action. That's all it is. For people who take a very long time on learning things, ICC is mostly for them.",
    color: '#b18cff',
    icon: 'psychology',
  },
  {
    id: 'day-12',
    day: 12,
    title: 'Market Decision Making',
    subtitle: 'When to trade and when to sit on your hands',
    summary: 'Not every setup is worth trading. Check if multiple timeframes agree. Look for new incentives (new highs/lows that price is chasing). If there\'s no new incentive, the probability drops. Trade things people are investing in — investments drive volume and volatility.',
    keyPoints: [
      'If the 4H and 1H contradict each other, wait for alignment',
      'Price needs a new incentive (new high/low) to chase — no incentive = lower probability',
      'Trade what has volume: gold, NASDAQ, crypto, indices',
      'Volume comes from investments, hype, news, and economic events',
      'It\'s okay to miss a trade — there\'s always another one',
    ],
    rules: [
      'If there\'s no new high or low to chase, probability drops significantly',
      'Higher timeframe always overpowers lower timeframe',
      'It\'s okay to miss out — you can catch the next leg',
    ],
    quote: "I'm super picky about putting myself in the markets. The market is very risky. You have to be very careful with the market structure and price action you're looking at.",
    color: '#ffb800',
    icon: 'decision',
  },
  {
    id: 'day-13',
    day: 13,
    title: 'Psychology & Positioning',
    subtitle: 'Think in positions, not trades — trust the process',
    summary: 'Stop thinking "trades" and start thinking "positions." Put yourself in a good position so you have options — scale out, hold longer, or add more. Save capital from a job before trading live. You only need 2 trades per week. Trading will crush you and build you into a new person.',
    keyPoints: [
      'Think "position" not "trade" — positioning gives you options',
      'You only need 2 solid trades per WEEK to replace a job',
      'Stop-loss goes where your idea is invalidated, not random pips away',
      'Follow the trend — one trade can become a multi-day swing',
      'Trading builds character: eliminates greed, false hope, revenge trading',
    ],
    rules: [
      'Risk where your TREND is invalidated, not an arbitrary number',
      'If you miss one trade, the trend will give you another. Be patient',
      'Don\'t deposit trying to trade your way out of your job that week',
    ],
    quote: "Trading has truly made me build this mindset and eliminate greed, false hope, and revenge trading. These lessons have taught me how to think properly in life.",
    color: '#00ff9d',
    icon: 'psychology',
  },
  {
    id: 'day-14',
    day: 14,
    title: 'Market Structure is King',
    subtitle: 'Structure = respect. Higher timeframe = more respect',
    summary: 'Market structure tells you if price is getting stronger or weaker. Higher timeframe = highly respected. If price makes a higher high, it MUST make a higher low. Momentum is like a wave — it carries water down, hits the bottom, and pushes back up with double the force. The trend keeps going until it runs out of gas.',
    keyPoints: [
      'If price makes HH, it MUST make HL. If HL, it MUST make HH. Mandatory',
      'Higher timeframe is highly respected — lower timeframe loses respect',
      'Mark up charts on higher TF (respect). Enter on lower TF (precision)',
      'Momentum = wave. Comes down fast, hits bottom, pushes up with double force',
      'The trend keeps going until it runs out of gas — don\'t fight it',
    ],
    rules: [
      'HH → HL → HH → HL is MANDATORY in an uptrend',
      'Higher the timeframe = more highly respected the structure',
      'Mark up = higher TF. Entries = lower TF. They must correspond',
      'The higher the timeframe, the longer you wait for structure to play out',
    ],
    quote: "Structure right here is your key. This is your key. Price will not break trend structure unless it is reversing.",
    color: '#b18cff',
    icon: 'structure',
  },
];

/** The golden rules extracted across all 14 lessons */
export interface ICCRule {
  id: string;
  rule: string;
  category: 'trend' | 'indication' | 'correction' | 'continuation' | 'structure' | 'psychology' | 'risk';
  source: string;
  color: string;
}

export const ICC_RULES: ICCRule[] = [
  { id: 'r1', rule: 'Trading is NOT gambling — you need a strategic reason for every trade.', category: 'psychology', source: 'Day 1', color: '#00e5ff' },
  { id: 'r2', rule: 'Price will NOT break trend structure unless it is reversing or consolidating.', category: 'trend', source: 'Day 1', color: '#00ff9d' },
  { id: 'r3', rule: 'If consolidation is breaking the rules, do NOT trade it.', category: 'trend', source: 'Day 1', color: '#ff3d57' },
  { id: 'r4', rule: 'Indications can ONLY happen when price breaks a swing high or swing low.', category: 'indication', source: 'Day 2', color: '#00e5ff' },
  { id: 'r5', rule: 'Do NOT trade the indication — it is information, not an entry.', category: 'indication', source: 'Day 2', color: '#ffb800' },
  { id: 'r6', rule: 'Corrections happen AFTER price makes a new high or new low.', category: 'correction', source: 'Day 3', color: '#ffb800' },
  { id: 'r7', rule: 'Do NOT enter during the indication — wait for the correction to complete.', category: 'correction', source: 'Day 3', color: '#ff3d57' },
  { id: 'r8', rule: 'Monitor the correction on the 15-minute timeframe.', category: 'correction', source: 'Day 3', color: '#ffb800' },
  { id: 'r9', rule: 'Use 5M or 15M timeframe for entries — whichever shows clearer structure.', category: 'continuation', source: 'Day 4', color: '#00ff9d' },
  { id: 'r10', rule: 'Target the 1H level where the indication started — not 5M levels.', category: 'continuation', source: 'Day 4', color: '#00e5ff' },
  { id: 'r11', rule: 'Above a swing low = bullish potential. Below a swing high = bearish potential.', category: 'structure', source: 'Day 5', color: '#b18cff' },
  { id: 'r12', rule: 'Stop trying to predict — follow what price is showing you.', category: 'psychology', source: 'Day 5', color: '#00e5ff' },
  { id: 'r13', rule: 'Higher timeframe is ALWAYS stronger: 4H > 1H > 15M > 5M.', category: 'structure', source: 'Day 6', color: '#b18cff' },
  { id: 'r14', rule: 'All timeframes must align before entering a trade.', category: 'structure', source: 'Day 6', color: '#00e5ff' },
  { id: 'r15', rule: 'Only need 1-3 sessions of data. Don\'t go back weeks.', category: 'structure', source: 'Day 7', color: '#ffb800' },
  { id: 'r16', rule: 'No-trade zone = high and low with no indication. Stay out.', category: 'trend', source: 'Day 7', color: '#ff3d57' },
  { id: 'r17', rule: 'Trade assets with volume — gold, NASDAQ, crypto, indices.', category: 'psychology', source: 'Day 8', color: '#00ff9d' },
  { id: 'r18', rule: 'The moment price breaks a lower high, stop thinking bearish.', category: 'structure', source: 'Day 9', color: '#ff3d57' },
  { id: 'r19', rule: 'Market structure doesn\'t change just because the timeframe changes.', category: 'structure', source: 'Day 10', color: '#b18cff' },
  { id: 'r20', rule: 'If something works, keep doing it. Don\'t try to be creative.', category: 'psychology', source: 'Day 11', color: '#00ff9d' },
  { id: 'r21', rule: 'It\'s okay to miss a trade. The trend will give you another.', category: 'psychology', source: 'Day 12', color: '#00e5ff' },
  { id: 'r22', rule: 'You only need 2 solid trades per week. Stop overtrading.', category: 'risk', source: 'Day 13', color: '#ffb800' },
  { id: 'r23', rule: 'HH → HL → HH is MANDATORY. If it breaks, the trend is changing.', category: 'trend', source: 'Day 14', color: '#00ff9d' },
  { id: 'r24', rule: 'Mark up on higher TF (respect). Enter on lower TF (precision).', category: 'structure', source: 'Day 14', color: '#b18cff' },
];

/** Contextual tips for the Guided Walkthrough — keyed by ICC stage */
export const GUIDED_TIPS: Record<string, { quote: string; source: string }> = {
  bias: {
    quote: "The first thing you do before anything else: look at the 4H chart and ask 'Is this going up or down?' If the answer isn't obvious, you don't trade.",
    source: 'Day 1',
  },
  indication: {
    quote: "Indications can only happen when price breaks above or below swings — highs and lows. That's the starting point of a trend.",
    source: 'Day 2',
  },
  correction: {
    quote: "Think of it like opening a Coke bottle. Everything explodes, starts to slow down, dies off. That's the indication and correction. Don't chase the explosion.",
    source: 'Day 3',
  },
  continuation: {
    quote: "What people fail to remember: don't go off the 5-minute structure for targets. Use the higher timeframe. We're looking for that second push.",
    source: 'Day 4',
  },
  trade: {
    quote: "Your stop loss goes where your idea is invalidated. If it hits, the trend is changing. That's how you know you were wrong — not by random pips.",
    source: 'Day 13',
  },
};
