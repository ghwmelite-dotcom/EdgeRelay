import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthModal } from '@/components/AuthModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  ArrowLeftRight,
  ArrowRight,
  BrainCircuit,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudOff,
  FlaskConical,
  HardDriveDownload,
  Link2,
  Monitor,
  PackageOpen,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  WifiOff,
  Radio,
  Zap,
  Store,
  Sparkles,
  BarChart3,
  BookOpen,
  TrendingUp,
  Target,
  Brain,
  LineChart,
  Shield,
  Lightbulb,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────── */
/*  Data                                                         */
/* ────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Features', href: '#features', color: '#00ff9d' },
  { label: 'How It Works', href: '#how-it-works', color: '#00e5ff' },
  { label: 'Ecosystem', href: '#ecosystem', color: '#b18cff' },
  { label: 'Prop Firms', href: '/pass-prop-firm-challenge', color: '#ff3d57' },
  { label: 'Blog', href: '/blog', color: '#ffb800' },
];

const STATS = [
  { value: '300+', label: 'Edge Locations' },
  { value: '10', label: 'EA Strategies' },
  { value: '<500ms', label: 'Avg Latency' },
  { value: 'Free', label: 'Forever Plan' },
];

const ECOSYSTEM = [
  {
    icon: Radio,
    title: 'Edge Signal Copier',
    desc: 'The world\'s only free cross-VPS trade copier. Forex, gold, indices, oil, crypto — any MT5 instrument. Master on VPS 1, followers on VPS 2, 3, 4 — different servers, different brokers, different countries. Sub-500ms via Cloudflare\'s 300+ edge locations.',
    badge: 'LIVE' as const,
  },
  {
    icon: Store,
    title: 'Signal Marketplace',
    desc: 'Browse verified signal providers ranked by real performance. One-click copy any trader — their signals automatically execute on your account with PropGuard protection.',
    badge: 'LIVE' as const,
  },
  {
    icon: FlaskConical,
    title: 'Strategy Hub',
    desc: '10 battle-tested strategies with AI optimization. Generate custom EAs with multi-asset trading, auto-adaptive market regime detection, GMT auto-offset, and one-click prop firm presets (FTMO, The5ers, FundedNext). AI analyzes your live trades and recommends parameter tweaks for re-generation.',
    badge: 'LIVE' as const,
  },
  {
    icon: Sparkles,
    title: 'AI Trade Insights',
    desc: 'AI-powered analysis of your trading patterns. Identifies losing sessions, winning instruments, and hidden edge leaks. The AI Strategy Optimizer analyzes your results and recommends exact parameter changes — then re-generates your EA with one click.',
    badge: 'LIVE' as const,
  },
  {
    icon: ShieldCheck,
    title: 'PropGuard + Prop Firm Controls',
    desc: 'Built-in equity protection with prop firm presets — FTMO, The5ers, FundedNext, MyFundedFX, Apex. Auto daily loss limits, max drawdown caps, Friday close before weekend, and emergency trade blocking. Never breach a funded account again.',
    badge: 'LIVE' as const,
  },
  {
    icon: BrainCircuit,
    title: 'AI Trade Journal',
    desc: 'Zero-drop MT5 trade journal with native sync. Automatic trade logging, session analysis, equity curve tracking, and performance insights. Every trade is tagged for AI attribution analysis.',
    badge: 'LIVE' as const,
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    desc: 'Institutional-grade analytics — equity curve health (R\u00B2, Sharpe, recovery factor), edge validation with Monte Carlo simulation and bootstrap confidence intervals, performance attribution by session, day, and instrument. Statistical proof your edge is real.',
    badge: 'LIVE' as const,
  },
  {
    icon: Link2,
    title: 'Platform Bridge',
    desc: 'Cross-platform trade copier with universal signal format. Trade forex, metals, indices, commodities, and crypto across MT5, cTrader, DXTrade, and TradeLocker with automatic symbol normalization.',
    badge: 'LIVE' as const,
  },
];

const FEATURES = [
  {
    icon: FlaskConical,
    title: '10 Strategies, One Click',
    desc: 'MA Crossover, RSI Reversion, Bollinger Squeeze, Supply & Demand, Grid Recovery, and 5 more. Generate a production EA in 30 seconds — no coding.',
  },
  {
    icon: Sparkles,
    title: 'AI Optimizes Your EA',
    desc: 'Trade for a week, click Optimize. AI analyzes your results, recommends exact parameter changes, and re-generates a better EA. Your robot evolves.',
  },
  {
    icon: ShieldCheck,
    title: 'Prop Firm Presets',
    desc: 'One-click FTMO, The5ers, FundedNext, Apex rules. Auto daily loss caps, drawdown limits, Friday close. Never breach a funded account.',
  },
  {
    icon: Store,
    title: 'Copy Verified Traders',
    desc: 'Browse a marketplace of signal providers ranked by real, verified performance. One-click copy — their trades execute on your account automatically.',
  },
  {
    icon: BarChart3,
    title: 'Know If Your Edge Is Real',
    desc: 'Monte Carlo simulation, bootstrap confidence intervals, and statistical edge validation. Not gut feeling — math.',
  },
  {
    icon: CloudOff,
    title: 'Multi-Asset, One Chart',
    desc: 'Trade forex, gold, NAS100, US30, oil, and crypto simultaneously from a single EA. Auto-adaptive mode adjusts to trending, ranging, or volatile markets across any instrument.',
  },
];

const BENEFITS = [
  {
    icon: ShieldAlert,
    title: 'Built for Prop Firms',
    desc: 'One-click presets for FTMO, The5ers, FundedNext, Apex. Auto daily loss limits, max drawdown caps, and Friday close before weekend. PropGuard blocks trades that would breach your rules.',
  },
  {
    icon: Zap,
    title: 'AI That Makes You Better',
    desc: 'Generate an EA, trade it, then let AI analyze your results and recommend improvements. One click to re-generate a smarter version. Your robot evolves with every trade.',
  },
  {
    icon: PackageOpen,
    title: 'Zero Infrastructure',
    desc: 'No VPS to rent, no coding skills needed, no port forwarding. Generate an EA in 30 seconds, install it, and start trading. Everything runs on Cloudflare\'s edge.',
  },
  {
    icon: HardDriveDownload,
    title: 'Adapts to Any Market',
    desc: 'Auto-adaptive mode detects trending, ranging, or volatile conditions and adjusts SL, TP, and lot size automatically. Auto GMT offset handles any broker timezone.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'TradeMetrics Pro replaced my VPS setup entirely. Signals hit my 6 funded accounts faster than my old copier handled one.',
    name: 'Alex M.',
    context: 'Managing 6 FTMO accounts',
  },
  {
    quote: 'PropGuard saved me twice in one week. It blocked trades that would have breached my drawdown limit on a $200k account.',
    name: 'Sarah K.',
    context: 'Running 3 funded challenges',
  },
  {
    quote: 'Setup took 10 minutes. No VPS, no port forwarding, no headaches. Just install the EA and it works.',
    name: 'David R.',
    context: 'Prop firm trader',
  },
];

const FOOTER_LINKS_PLATFORM = [
  { label: 'Signal Copier', href: '#ecosystem' },
  { label: 'PropGuard', href: '#ecosystem' },
  { label: 'AI Journal', href: '#ecosystem' },
  { label: 'Platform Bridge', href: '#ecosystem' },
  { label: 'Pass Prop Firm Challenge', href: '/pass-prop-firm-challenge' },
];

const FOOTER_LINKS_RESOURCES = [
  { label: 'Documentation', href: '#' },
  { label: 'API Reference', href: '#' },
  { label: 'Blog', href: '/blog' },
  { label: 'Referral Program', href: '/referral' },
  { label: 'Status', href: '#' },
];

const FOOTER_LINKS_LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Risk Disclosure', href: '#risk-disclosure' },
];

/* ────────────────────────────────────────────────────────────── */
/*  Blog articles data                                           */
/* ────────────────────────────────────────────────────────────── */

const BLOG_CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Strategy', value: 'strategy' },
  { label: 'Risk Management', value: 'risk' },
  { label: 'Psychology', value: 'psychology' },
  { label: 'Education', value: 'education' },
  { label: 'Analysis', value: 'analysis' },
] as const;

const BLOG_POSTS = [
  {
    id: 'pass-prop-firm-challenge-guide',
    title: 'The Ultimate Guide to Passing Your Prop Firm Challenge on the First Attempt',
    excerpt: 'Why 87% of traders fail prop firm challenges — and the exact system that gives you the best shot at passing on your first attempt. Strategy, risk management, and AI optimization.',
    category: 'strategy',
    tag: 'Prop Firm Mastery',
    icon: ShieldCheck,
    readTime: '18 min',
    date: '2026-04-03',
    featured: true,
    accentColor: 'neon-green',
  },
  {
    id: 'backtesting-guide-2026',
    title: 'The Complete Guide to Backtesting Your Trading Strategy in 2026',
    excerpt: 'Learn how to properly backtest your forex strategies using historical data, avoid common pitfalls like curve fitting, and validate your edge with statistical confidence.',
    category: 'strategy',
    tag: 'Backtesting',
    icon: LineChart,
    readTime: '12 min',
    date: '2026-03-28',
    featured: true,
    accentColor: 'neon-cyan',
  },
  {
    id: 'prop-firm-risk-management',
    title: 'Risk Management Rules Every Prop Firm Trader Must Follow',
    excerpt: 'The #1 reason traders fail funded challenges isn\'t bad entries — it\'s poor risk management. Master daily drawdown limits, position sizing, and the 1% rule.',
    category: 'risk',
    tag: 'Prop Firms',
    icon: Shield,
    readTime: '9 min',
    date: '2026-03-25',
    featured: true,
    accentColor: 'neon-green',
  },
  {
    id: 'trading-psychology-discipline',
    title: 'Trading Psychology: Why Discipline Beats Intelligence Every Time',
    excerpt: 'Explore the mental frameworks used by consistently profitable traders. From revenge trading to FOMO, learn to master the emotions that sabotage your account.',
    category: 'psychology',
    tag: 'Mindset',
    icon: Brain,
    readTime: '8 min',
    date: '2026-03-22',
    accentColor: 'neon-purple',
  },
  {
    id: 'supply-demand-zones',
    title: 'How to Identify and Trade Supply & Demand Zones Like a Pro',
    excerpt: 'Supply and demand zones are where institutional orders cluster. Learn to spot fresh zones, measure their strength, and time entries with confluence.',
    category: 'strategy',
    tag: 'Price Action',
    icon: Target,
    readTime: '11 min',
    date: '2026-03-19',
    accentColor: 'neon-cyan',
  },
  {
    id: 'monte-carlo-edge-validation',
    title: 'Monte Carlo Simulation: Proving Your Trading Edge Is Real',
    excerpt: 'Gut feeling isn\'t proof. Use Monte Carlo simulation and bootstrap confidence intervals to statistically validate whether your strategy has a real, durable edge.',
    category: 'analysis',
    tag: 'Statistics',
    icon: BarChart3,
    readTime: '14 min',
    date: '2026-03-15',
    accentColor: 'neon-amber',
  },
  {
    id: 'beginner-forex-mistakes',
    title: '10 Forex Trading Mistakes That Blow Accounts (and How to Avoid Them)',
    excerpt: 'From overleveraging to ignoring the spread, these are the most common mistakes that destroy new traders. Each one comes with a concrete fix you can apply today.',
    category: 'education',
    tag: 'Beginners',
    icon: GraduationCap,
    readTime: '7 min',
    date: '2026-03-12',
    accentColor: 'neon-red',
  },
  {
    id: 'multi-timeframe-analysis',
    title: 'Multi-Timeframe Analysis: The Framework Profitable Traders Use',
    excerpt: 'Why single-timeframe trading leads to false signals. Learn the top-down approach: weekly for bias, daily for structure, H4 for entry — with real chart examples.',
    category: 'strategy',
    tag: 'Technical Analysis',
    icon: TrendingUp,
    readTime: '10 min',
    date: '2026-03-08',
    accentColor: 'neon-cyan',
  },
  {
    id: 'trading-journal-guide',
    title: 'How to Keep a Trading Journal That Actually Improves Your Results',
    excerpt: 'Most traders journal wrong — they log entries but never analyze patterns. Build a journal that reveals your edge leaks, best sessions, and optimal instruments.',
    category: 'education',
    tag: 'Journaling',
    icon: BookOpen,
    readTime: '8 min',
    date: '2026-03-05',
    accentColor: 'neon-green',
  },
  {
    id: 'ai-trading-strategies',
    title: 'AI-Powered Trading: How Machine Learning Is Changing Retail Forex',
    excerpt: 'From pattern recognition to adaptive parameter optimization, explore how AI tools are giving retail traders capabilities that were once reserved for hedge funds.',
    category: 'analysis',
    tag: 'AI & ML',
    icon: Sparkles,
    readTime: '13 min',
    date: '2026-03-01',
    accentColor: 'neon-purple',
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  Particles — reduced to 12 for surgical precision             */
/* ────────────────────────────────────────────────────────────── */

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: 1.5 + Math.random() * 2.5,
  x: Math.random() * 100,
  y: Math.random() * 100,
  opacity: 0.1 + Math.random() * 0.3,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 5,
}));

/* ────────────────────────────────────────────────────────────── */
/*  Terminal signal feed lines                                   */
/* ────────────────────────────────────────────────────────────── */

const SIGNAL_LINES = [
  { time: '14:32:07', pair: 'XAUUSD', action: 'BUY', lot: '1.00', status: 'ok' },
  { time: '14:31:44', pair: 'NAS100', action: 'SELL', lot: '0.50', status: 'ok' },
  { time: '14:28:19', pair: 'EURUSD', action: 'BUY', lot: '0.30', status: 'ok' },
  { time: '14:25:02', pair: 'USOIL', action: 'SELL', lot: '0.75', status: 'pending' },
  { time: '14:22:58', pair: 'GBPJPY', action: 'CLOSE', lot: '0.40', status: 'ok' },
  { time: '14:19:33', pair: 'US30', action: 'BUY', lot: '0.20', status: 'ok' },
];

/* ────────────────────────────────────────────────────────────── */
/*  Ecosystem Mini-Visualizations                                */
/* ────────────────────────────────────────────────────────────── */

function CopierViz() {
  const signals = [
    { time: '14:32', pair: 'XAUUSD', side: 'BUY', lot: '1.00' },
    { time: '14:31', pair: 'NAS100', side: 'SELL', lot: '0.50' },
    { time: '14:28', pair: 'EURUSD', side: 'BUY', lot: '0.30' },
  ];
  return (
    <div className="space-y-3" style={{ minHeight: 120 }}>
      {/* Mini signal rows */}
      <div className="space-y-1">
        {signals.map((s, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 font-mono-nums text-[10px]">
            <span className="text-terminal-muted">{s.time}</span>
            <span className="text-slate-300">{s.pair}</span>
            <span className={s.side === 'BUY' ? 'text-neon-green' : 'text-neon-red'}>{s.side}</span>
            <span className="text-slate-500">{s.lot}</span>
          </div>
        ))}
      </div>
      {/* VPS flow diagram */}
      <div className="flex items-center justify-center gap-1 pt-1">
        <div className="rounded border border-neon-cyan/20 bg-neon-cyan/10 px-2 py-1">
          <span className="font-mono-nums text-[9px] text-neon-cyan">VPS 1</span>
        </div>
        <div className="relative h-[2px] w-12 bg-terminal-border/50 sm:w-20">
          <div
            className="absolute top-[-2px] h-[6px] w-[6px] rounded-full bg-neon-cyan shadow-[0_0_6px_#00e5ff]"
            style={{ animation: 'travel-right 2s ease-in-out infinite' }}
          />
        </div>
        <div className="rounded border border-neon-purple/20 bg-neon-purple/10 px-2 py-1">
          <span className="font-mono-nums text-[9px] text-neon-purple">Edge</span>
        </div>
        <div className="relative h-[2px] w-12 bg-terminal-border/50 sm:w-20">
          <div
            className="absolute top-[-2px] h-[6px] w-[6px] rounded-full bg-neon-green shadow-[0_0_6px_#00ff9d]"
            style={{ animation: 'travel-right 2s ease-in-out infinite', animationDelay: '0.5s' }}
          />
        </div>
        <div className="rounded border border-neon-green/20 bg-neon-green/10 px-2 py-1">
          <span className="font-mono-nums text-[9px] text-neon-green">VPS 2</span>
        </div>
      </div>
    </div>
  );
}

function MarketplaceViz() {
  const leaders = [
    { rank: 1, name: 'AlphaEdge', wr: '78.4%', pnl: '+$12,847' },
    { rank: 2, name: 'GoldSniper', wr: '71.2%', pnl: '+$9,231' },
    { rank: 3, name: 'FxMachine', wr: '68.9%', pnl: '+$7,105' },
  ];
  return (
    <div style={{ minHeight: 120 }}>
      {/* Header */}
      <div className="mb-2 grid grid-cols-[20px_1fr_60px_80px] gap-2 font-mono-nums text-[9px] uppercase tracking-wider text-terminal-muted">
        <span>#</span><span>Provider</span><span>Win %</span><span className="text-right">P&L</span>
      </div>
      {leaders.map((l, i) => (
        <div
          key={i}
          className={`grid grid-cols-[20px_1fr_60px_80px] gap-2 rounded px-1 py-1.5 font-mono-nums text-[11px] ${
            i === 0 ? 'bg-neon-amber/5' : ''
          }`}
          style={i === 0 ? { boxShadow: '0 0 12px rgba(255,184,0,0.08)' } : undefined}
        >
          <span className={i === 0 ? 'text-neon-amber font-bold' : 'text-terminal-muted'}>{l.rank}</span>
          <span className="text-slate-300">{l.name}</span>
          <span className="text-neon-cyan">{l.wr}</span>
          <span className="text-right text-neon-green">{l.pnl}</span>
        </div>
      ))}
    </div>
  );
}

function StrategyHubViz() {
  const sliders = [
    { label: 'MA Period', value: 65 },
    { label: 'Risk %', value: 40 },
    { label: 'TP Pips', value: 75 },
  ];
  return (
    <div className="space-y-3" style={{ minHeight: 120 }}>
      {sliders.map((s, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between font-mono-nums text-[9px]">
            <span className="text-terminal-muted">{s.label}</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-terminal-border/40">
            <div
              className="h-full rounded-full bg-neon-cyan/60"
              style={{ width: `${s.value}%` }}
            />
            <div
              className="absolute top-[-2px] h-[10px] w-[10px] rounded-full border border-neon-cyan/40 bg-terminal-bg"
              style={{ left: `calc(${s.value}% - 5px)` }}
            />
          </div>
        </div>
      ))}
      {/* Generate button + code snippet */}
      <div className="flex items-center gap-3 pt-1">
        <div
          className="rounded border border-neon-green/30 bg-neon-green/10 px-2.5 py-1 font-mono-nums text-[9px] text-neon-green"
          style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
        >
          Generate EA
        </div>
        <code
          className="font-mono-nums text-[9px] text-neon-purple/70"
          style={{ animation: 'fade-in-up 2s ease-out infinite alternate' }}
        >
          {'// MA_Period = 14'}
        </code>
      </div>
    </div>
  );
}

function AIInsightsViz() {
  const insights = [
    { color: 'border-neon-green', text: 'GBP pairs +23% edge in London session', delay: '0s' },
    { color: 'border-neon-amber', text: 'Overtrading Fridays — 40% lower win rate', delay: '0.8s' },
    { color: 'border-neon-red', text: 'XAUUSD stop too tight — avg -1.2R slippage', delay: '1.6s' },
  ];
  return (
    <div className="space-y-2" style={{ minHeight: 120 }}>
      {insights.map((ins, i) => (
        <div
          key={i}
          className={`rounded border-l-2 ${ins.color} bg-terminal-card/40 px-3 py-2`}
          style={{
            animation: 'fade-in-up 0.6s ease-out both',
            animationDelay: ins.delay,
          }}
        >
          <span className="font-mono-nums text-[10px] text-slate-400">{ins.text}</span>
        </div>
      ))}
    </div>
  );
}

function PropGuardViz() {
  const used = 45;
  return (
    <div className="space-y-3" style={{ minHeight: 120 }}>
      {/* Shield + status */}
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-green/20 bg-neon-green/10"
          style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
        >
          <ShieldCheck className="h-4 w-4 text-neon-green" />
        </div>
        <div>
          <div className="font-mono-nums text-[10px] text-neon-green">PROTECTED</div>
          <div className="font-mono-nums text-[9px] text-terminal-muted">All rules passing</div>
        </div>
      </div>
      {/* Drawdown gauge */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between font-mono-nums text-[10px]">
          <span className="text-terminal-muted">Daily Drawdown</span>
          <span className="text-slate-300">4.5% / 10%</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-terminal-border/30">
          {/* Zones */}
          <div className="absolute inset-y-0 left-0 w-[60%] rounded-full bg-neon-green/10" />
          <div className="absolute inset-y-0 left-[60%] w-[25%] bg-neon-amber/10" />
          <div className="absolute inset-y-0 left-[85%] w-[15%] bg-neon-red/10" />
          {/* Fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-neon-green/50"
            style={{ width: `${used}%`, transition: 'width 1s ease-out' }}
          />
        </div>
      </div>
      {/* Mini rules */}
      <div className="flex gap-3 font-mono-nums text-[9px]">
        <span className="text-neon-green">&#10003; Max lots</span>
        <span className="text-neon-green">&#10003; Max trades</span>
        <span className="text-neon-green">&#10003; Equity floor</span>
      </div>
    </div>
  );
}

function JournalViz() {
  const trades = [
    { symbol: 'EURUSD', dir: 'BUY', pnl: '+$142', color: 'text-neon-green' },
    { symbol: 'XAUUSD', dir: 'SELL', pnl: '+$87', color: 'text-neon-green' },
    { symbol: 'GBPJPY', dir: 'SELL', pnl: '-$34', color: 'text-neon-red' },
  ];
  return (
    <div style={{ minHeight: 120 }}>
      <div className="mb-2 grid grid-cols-[1fr_44px_56px_20px] gap-2 font-mono-nums text-[9px] uppercase tracking-wider text-terminal-muted">
        <span>Symbol</span><span>Side</span><span>P&L</span><span></span>
      </div>
      {trades.map((t, i) => (
        <div key={i} className="grid grid-cols-[1fr_44px_56px_20px] gap-2 py-1.5 font-mono-nums text-[11px]">
          <span className="text-slate-300">{t.symbol}</span>
          <span className={t.dir === 'BUY' ? 'text-neon-green' : 'text-neon-red'}>{t.dir}</span>
          <span className={t.color}>{t.pnl}</span>
          <span
            className="text-neon-cyan"
            style={{
              animation: 'fade-in-up 0.4s ease-out both',
              animationDelay: `${i * 0.4}s`,
            }}
          >
            &#10003;
          </span>
        </div>
      ))}
      <div className="mt-2 font-mono-nums text-[9px] text-terminal-muted" style={{ animation: 'fade-in-up 0.5s ease-out 1.4s both' }}>
        <span className="text-neon-cyan">&#8635;</span> Synced 3 trades from MT5
      </div>
    </div>
  );
}

function AnalyticsViz() {
  // SVG sparkline points going up-right
  const points = '0,40 15,38 30,35 45,32 55,36 65,28 75,22 85,25 95,18 110,14 125,10 140,8 155,5 170,3';
  return (
    <div className="space-y-3" style={{ minHeight: 120 }}>
      {/* Equity curve sparkline */}
      <svg viewBox="0 0 180 50" className="h-14 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,50 ${points} 180,50`}
          fill="url(#eq-grad)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#00e5ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'R²', val: '0.87', c: 'text-neon-cyan' },
          { label: 'Sharpe', val: '1.4', c: 'text-neon-green' },
          { label: 'PF', val: '1.85', c: 'text-neon-amber' },
        ].map((s) => (
          <div key={s.label} className="rounded border border-terminal-border/40 bg-terminal-card/40 px-2 py-1 font-mono-nums text-[10px]">
            <span className="text-terminal-muted">{s.label}</span>{' '}
            <span className={s.c}>{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformBridgeViz() {
  return (
    <div className="space-y-3" style={{ minHeight: 120 }}>
      {/* Flow: MT5 → Bridge → cTrader */}
      <div className="flex items-center justify-center gap-1">
        <div className="rounded border border-neon-cyan/20 bg-neon-cyan/10 px-2.5 py-1.5">
          <span className="font-mono-nums text-[10px] font-semibold text-neon-cyan">MT5</span>
        </div>
        <div className="relative h-[2px] w-10 bg-terminal-border/50 sm:w-16">
          <div
            className="absolute top-[-2px] h-[6px] w-[6px] rounded-full bg-neon-cyan shadow-[0_0_6px_#00e5ff]"
            style={{ animation: 'travel-right 2.5s ease-in-out infinite' }}
          />
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-purple/30 bg-neon-purple/10"
          style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-neon-purple" />
        </div>
        <div className="relative h-[2px] w-10 bg-terminal-border/50 sm:w-16">
          <div
            className="absolute top-[-2px] h-[6px] w-[6px] rounded-full bg-neon-green shadow-[0_0_6px_#00ff9d]"
            style={{ animation: 'travel-right 2.5s ease-in-out infinite', animationDelay: '0.6s' }}
          />
        </div>
        <div className="rounded border border-neon-green/20 bg-neon-green/10 px-2.5 py-1.5">
          <span className="font-mono-nums text-[10px] font-semibold text-neon-green">cTrader</span>
        </div>
      </div>
      {/* Symbol mapping */}
      <div className="space-y-1 rounded border border-terminal-border/20 bg-terminal-card/30 p-2">
        <div className="font-mono-nums text-[9px] uppercase tracking-wider text-terminal-muted">Symbol Mapping</div>
        {[
          { from: 'EURUSD', to: 'EURUSD.m' },
          { from: 'XAUUSD', to: 'Gold' },
        ].map((m) => (
          <div key={m.from} className="flex items-center gap-2 font-mono-nums text-[10px]">
            <span className="text-neon-cyan">{m.from}</span>
            <span className="text-terminal-muted">→</span>
            <span className="text-neon-green">{m.to}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PRODUCT_VIZ: Record<string, () => JSX.Element> = {
  'Edge Signal Copier': CopierViz,
  'Signal Marketplace': MarketplaceViz,
  'Strategy Hub': StrategyHubViz,
  'AI Trade Insights': AIInsightsViz,
  'PropGuard': PropGuardViz,
  'AI Trade Journal': JournalViz,
  'Advanced Analytics': AnalyticsViz,
  'Platform Bridge': PlatformBridgeViz,
};

/* ────────────────────────────────────────────────────────────── */
/*  Component                                                    */
/* ────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({ open: false, mode: 'register' });
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
  const [blogCategory, setBlogCategory] = useState<string>('all');

  const filteredPosts = blogCategory === 'all'
    ? BLOG_POSTS
    : BLOG_POSTS.filter(p => p.category === blogCategory);

  const featuredPosts = BLOG_POSTS.filter(p => p.featured);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100 overflow-x-hidden">
      {/* Ambient glow orbs */}
      <div className="ambient-glow" />
      {/* Noise texture */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* ══════════════════════════════════════════════════════════
          1. NAV — Living Pulse
          ══════════════════════════════════════════════════════════ */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        {/* EKG Pulse Line — runs through entire header */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1200 72"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ekgGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="20%" stopColor="var(--color-neon-cyan)" stopOpacity="0.1" />
              <stop offset="40%" stopColor="var(--color-neon-cyan)" stopOpacity="0.35" />
              <stop offset="60%" stopColor="var(--color-neon-cyan)" stopOpacity="0.35" />
              <stop offset="80%" stopColor="var(--color-neon-cyan)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            className="ekg-line"
            d="M0,36 L280,36 L310,36 L325,10 L340,60 L355,24 L365,44 L378,36 L580,36 L610,36 L622,16 L634,54 L644,30 L652,42 L662,36 L1200,36"
            fill="none"
            stroke="url(#ekgGrad)"
            strokeWidth="1.5"
          />
          {/* Pulse glow dots at EKG peaks */}
          <circle className="ekg-glow" cx="325" cy="10" r="2.5" fill="var(--color-neon-cyan)" opacity="0.5" />
          <circle className="ekg-glow" cx="622" cy="16" r="2.5" fill="var(--color-neon-cyan)" opacity="0.5" />
        </svg>

        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo — monogram badge with live heartbeat dot */}
          <a href="#" className="flex items-center gap-3 font-display tracking-tight">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-neon-cyan/30 bg-terminal-surface">
                <div className="absolute inset-[3px] rounded-[7px] border border-neon-cyan/10" />
                <span className="relative text-[15px] font-black text-neon-cyan" style={{ textShadow: '0 0 12px var(--color-neon-cyan)' }}>
                  TM
                </span>
              </div>
              {/* Live heartbeat indicator */}
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-[1.5px] border-terminal-bg bg-neon-green shadow-[0_0_6px_var(--color-neon-green)]" />
              </span>
            </div>
            <div>
              <div className="text-[15px] font-bold text-white leading-none">TradeMetrics <span className="text-[10px] font-semibold text-terminal-muted uppercase tracking-widest">Pro</span></div>
              <div className="font-mono text-[8px] tracking-[3px] uppercase text-neon-cyan/60">
                Edge Network
              </div>
            </div>
          </a>

          {/* Nav links — each with colored signal dot */}
          <div className="hidden items-center gap-7 sm:flex">
            {NAV_LINKS.map((l) =>
              l.href.startsWith('/') ? (
                <Link
                  key={l.href}
                  to={l.href}
                  className="group flex items-center gap-2 text-[12px] font-medium text-terminal-muted transition-colors duration-200 hover:text-terminal-text"
                >
                  <span
                    className="nav-signal-dot shadow-[0_0_4px_currentColor]"
                    style={{ backgroundColor: l.color, boxShadow: `0 0 5px ${l.color}` }}
                  />
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  className="group flex items-center gap-2 text-[12px] font-medium text-terminal-muted transition-colors duration-200 hover:text-terminal-text"
                >
                  <span
                    className="nav-signal-dot shadow-[0_0_4px_currentColor]"
                    style={{ backgroundColor: l.color, boxShadow: `0 0 5px ${l.color}` }}
                  />
                  {l.label}
                </a>
              )
            )}
          </div>

          {/* Referral CTA — highlighted */}
          <a
            href="/referral"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-neon-green/30 bg-neon-green/[0.08] px-3 py-1.5 text-[11px] font-semibold text-neon-green tracking-wide uppercase transition-all hover:bg-neon-green/15 hover:border-neon-green/50 hover:shadow-[0_0_12px_rgba(0,255,157,0.15)]"
          >
            <span className="text-[13px]">💰</span>
            Earn Rewards
          </a>

          {/* Right side — latency badge + auth */}
          <div className="flex items-center gap-3">
            {/* Live latency badge */}
            <div className="latency-badge hidden items-center gap-1.5 rounded-md border border-neon-cyan/15 bg-neon-cyan/[0.05] px-2.5 py-1 sm:flex">
              <span className="flex h-[5px] w-[5px]">
                <span className="relative inline-flex h-full w-full rounded-full bg-neon-green shadow-[0_0_4px_var(--color-neon-green)]" />
              </span>
              <span className="font-mono text-[10px] font-medium text-neon-cyan">38ms</span>
            </div>

            <div className="hidden h-5 w-px bg-terminal-border/50 sm:block" />

            <ThemeToggle />
            <button
              onClick={() => setAuthModal({ open: true, mode: 'login' })}
              className="hidden text-[12px] font-medium text-terminal-muted transition-colors duration-200 hover:text-neon-cyan sm:inline cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => setAuthModal({ open: true, mode: 'register' })}
              className="btn-premium group relative hidden sm:inline-flex items-center gap-1.5 overflow-hidden rounded-lg bg-neon-cyan px-5 py-2 text-[12px] font-bold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.45)] cursor-pointer"
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(255,255,255,0.2),transparent)]" />
              <span className="relative">Launch App</span>
              <ArrowRight className="relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-white transition-colors cursor-pointer sm:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        <div
          className={`sm:hidden overflow-hidden transition-all duration-300 ease-out ${
            mobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-terminal-border/20 px-6 py-4 space-y-2">
            {NAV_LINKS.map((l) =>
              l.href.startsWith('/') ? (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-terminal-muted transition-colors hover:bg-terminal-card/50 hover:text-white"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color, boxShadow: `0 0 5px ${l.color}` }} />
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-terminal-muted transition-colors hover:bg-terminal-card/50 hover:text-white"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color, boxShadow: `0 0 5px ${l.color}` }} />
                  {l.label}
                </a>
              )
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setAuthModal({ open: true, mode: 'login' }); setMobileMenuOpen(false); }}
                className="flex-1 rounded-lg border border-terminal-border bg-terminal-card/60 py-2.5 text-sm font-semibold text-slate-200 cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => { setAuthModal({ open: true, mode: 'register' }); setMobileMenuOpen(false); }}
                className="flex-1 rounded-lg bg-neon-cyan py-2.5 text-sm font-semibold text-terminal-bg cursor-pointer"
              >
                Launch App
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          2. HERO — Split layout: editorial left, live terminal right
          ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen overflow-hidden px-6">
        {/* Layer 0: Grid */}
        <div className="bg-grid pointer-events-none absolute inset-0" />

        {/* Layer 1: Particles — 12, surgical */}
        <div className="pointer-events-none absolute inset-0">
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-neon-cyan"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.x}%`,
                top: `${p.y}%`,
                opacity: p.opacity,
                animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Layer 2: Large radial glow behind terminal area */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute right-0 top-1/3 h-[700px] w-[700px] -translate-y-1/4 translate-x-1/6 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, rgba(0,229,255,0.02) 40%, transparent 70%)',
              animation: 'breathe 8s ease-in-out infinite',
            }}
          />
        </div>

        {/* Hero content — split layout */}
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-12 pt-24 md:pt-32 lg:flex-row lg:items-center lg:gap-16 lg:pt-40">

          {/* LEFT — Editorial headline */}
          <div className="flex-1 lg:max-w-[560px]">
            {/* Classification badge */}
            <div
              className="animate-fade-in-up mb-8 inline-flex items-center gap-2.5 rounded-full border border-neon-cyan/20 bg-neon-cyan/[0.05] px-4 py-1.5"
              style={{ animationDelay: '0ms' }}
            >
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              <span className="font-mono-nums text-[10px] uppercase tracking-[0.2em] text-neon-cyan">
                The World&rsquo;s Only Free Cross-VPS Trade Copier
              </span>
            </div>

            <h1 className="font-display font-black leading-[1.05] tracking-tight">
              <span
                className="animate-fade-in-up block text-4xl md:text-5xl lg:text-6xl text-white"
                style={{ animationDelay: '100ms' }}
              >
                Copy Trades Across
              </span>
              <span
                className="animate-fade-in-up block text-4xl md:text-5xl lg:text-6xl text-white mt-1"
                style={{ animationDelay: '250ms' }}
              >
                Any VPS.{' '}
                <span className="text-neon-cyan glow-text-cyan">Any Broker.</span>
              </span>
              <span
                className="animate-fade-in-up block text-4xl md:text-5xl lg:text-6xl text-neon-green glow-text-green mt-1"
                style={{ animationDelay: '400ms' }}
              >
                Free for a Year.
              </span>
            </h1>

            <p
              className="animate-fade-in-up mt-8 max-w-lg text-lg leading-relaxed text-slate-400"
              style={{ animationDelay: '550ms' }}
            >
              Forex, gold, indices, oil, crypto — any MT5 instrument.
              Master EA on VPS 1, Follower EA on VPS 2 — different servers, different countries, different brokers.{' '}
              <span className="text-slate-200">Sub-500ms via Cloudflare&rsquo;s 300+ edge locations.</span>{' '}
              No port forwarding. No shared networks. Just connect and copy.
            </p>

            {/* CTA row */}
            <div
              className="animate-fade-in-up mt-10 flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: '700ms' }}
            >
              <button
                onClick={() => setAuthModal({ open: true, mode: 'register' })}
                className="btn-premium signal-pulse inline-flex items-center justify-center gap-2 rounded-xl bg-neon-cyan px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,229,255,0.4)] transition-all hover:shadow-[0_0_60px_rgba(0,229,255,0.6)] cursor-pointer"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-10 py-4 text-base font-semibold text-slate-200 backdrop-blur transition-all hover:border-terminal-border-hover hover:bg-terminal-border/40"
              >
                See How It Works
              </a>
            </div>

            {/* Trust badge */}
            <div
              className="animate-fade-in-up mt-8 inline-flex items-center gap-2"
              style={{ animationDelay: '850ms' }}
            >
              <ShieldCheck className="h-4 w-4 text-neon-cyan/60" />
              <span className="text-sm text-slate-500">
                Trusted by <span className="font-semibold text-slate-300">300+</span> prop firm traders
              </span>
            </div>
          </div>

          {/* RIGHT — Live terminal readout */}
          <div
            className="animate-fade-in-up w-full flex-1 lg:max-w-[520px]"
            style={{ animationDelay: '500ms' }}
          >
            <div
              className="relative overflow-hidden rounded-xl border border-neon-cyan/20 bg-terminal-bg/90"
              style={{
                boxShadow: '0 0 40px rgba(0,229,255,0.08), 0 0 80px rgba(0,229,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              {/* Terminal header bar */}
              <div className="flex items-center justify-between border-b border-terminal-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-neon-red/60" />
                  <div className="h-2 w-2 rounded-full bg-neon-amber/60" />
                  <div className="h-2 w-2 rounded-full bg-neon-green/60" />
                </div>
                <span className="font-mono-nums text-[10px] uppercase tracking-[0.15em] text-terminal-muted">
                  Signal Feed
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="live-dot" style={{ width: 5, height: 5 }} />
                  <span className="font-mono-nums text-[10px] text-neon-green/70">LIVE</span>
                </div>
              </div>

              {/* Column headers */}
              <div className="border-b border-terminal-border/50 px-4 py-2">
                <div className="grid grid-cols-[72px_80px_56px_52px_32px] gap-2 font-mono-nums text-[10px] uppercase tracking-widest text-terminal-muted">
                  <span>Time</span>
                  <span>Symbol</span>
                  <span>Side</span>
                  <span>Lots</span>
                  <span className="text-right">St</span>
                </div>
              </div>

              {/* Signal rows */}
              <div className="px-4 py-1">
                {SIGNAL_LINES.map((line, i) => (
                  <div
                    key={i}
                    className="data-row grid grid-cols-[72px_80px_56px_52px_32px] gap-2 rounded px-0 py-1.5 font-mono-nums text-[13px]"
                  >
                    <span className="text-terminal-muted">{line.time}</span>
                    <span className="font-semibold text-slate-200">{line.pair}</span>
                    <span
                      className={
                        line.action === 'BUY'
                          ? 'text-neon-green'
                          : line.action === 'SELL'
                            ? 'text-neon-red'
                            : 'text-neon-amber'
                      }
                    >
                      {line.action}
                    </span>
                    <span className="text-slate-400">{line.lot}</span>
                    <span className="text-right">
                      {line.status === 'ok' ? (
                        <span className="text-neon-green">&#10003;</span>
                      ) : (
                        <span className="text-neon-amber animate-pulse">&#9679;</span>
                      )}
                    </span>
                  </div>
                ))}

                {/* Blinking cursor line */}
                <div className="py-1.5 font-mono-nums text-[13px]">
                  <span
                    className="inline-block h-[15px] w-[8px] bg-neon-cyan/70"
                    style={{
                      animation: 'pulse-glow 1.2s step-start infinite',
                    }}
                  />
                </div>
              </div>

              {/* Terminal footer — status bar */}
              <div className="flex items-center justify-between border-t border-terminal-border px-4 py-2">
                <div className="flex items-center gap-4 font-mono-nums text-[10px] uppercase tracking-wider text-terminal-muted">
                  <span>
                    Latency:{' '}
                    <span className="text-neon-green">38ms</span>
                  </span>
                  <span className="text-terminal-border">|</span>
                  <span>
                    Uptime:{' '}
                    <span className="text-neon-cyan">99.9%</span>
                  </span>
                  <span className="text-terminal-border">|</span>
                  <span>
                    Signals:{' '}
                    <span className="text-slate-300">1,247</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Cross-VPS architecture indicator */}
            <div className="mt-4 hidden md:flex items-center justify-center gap-3 font-mono-nums text-[11px]">
              <div className="flex items-center gap-1.5 rounded-md border border-terminal-border bg-terminal-card/60 px-3 py-1.5">
                <span className="live-dot" style={{ width: 4, height: 4 }} />
                <span className="text-slate-400">VPS 1</span>
                <span className="text-terminal-muted">·</span>
                <span className="text-neon-cyan">Master</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-px w-4 bg-neon-cyan/30" />
                <Zap className="h-3 w-3 text-neon-cyan/60" />
                <div className="h-px w-4 bg-neon-cyan/30" />
              </div>
              <div className="rounded-md border border-neon-cyan/20 bg-neon-cyan/[0.05] px-3 py-1.5">
                <span className="text-neon-cyan">Cloudflare Edge</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-px w-4 bg-neon-cyan/30" />
                <Zap className="h-3 w-3 text-neon-cyan/60" />
                <div className="h-px w-4 bg-neon-cyan/30" />
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-terminal-border bg-terminal-card/60 px-3 py-1.5">
                <span className="live-dot" style={{ width: 4, height: 4 }} />
                <span className="text-slate-400">VPS 2</span>
                <span className="text-terminal-muted">·</span>
                <span className="text-neon-green">Follower</span>
              </div>
            </div>
            <p className="mt-2 text-center font-mono-nums text-[10px] text-terminal-muted/50">
              Forex · Gold · Indices · Oil · Crypto — Any MT5 instrument · Any broker · Zero configuration
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 text-terminal-muted/40">
            <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
            <div className="h-8 w-[1px] bg-gradient-to-b from-terminal-muted/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. STATS BAR — Cockpit instrument strip
          ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div
            className="glass-premium animate-fade-in-up flex flex-col items-stretch overflow-hidden rounded-2xl sm:flex-row"
            style={{
              boxShadow: '0 0 30px rgba(0,229,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-1 flex-col items-center justify-center px-6 py-6 ${
                  i < STATS.length - 1
                    ? 'border-b border-terminal-border/50 sm:border-b-0 sm:border-r'
                    : ''
                }`}
              >
                <span className="font-mono-nums text-2xl font-bold text-neon-cyan glow-text-cyan">
                  {s.value}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-terminal-muted">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3b. PROP FIRM CHALLENGE CTA — High-visibility banner
          ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/pass-prop-firm-challenge"
            className="group relative block overflow-hidden rounded-2xl border border-neon-green/20 transition-all duration-300 hover:border-neon-green/40 hover:shadow-[0_0_40px_rgba(0,255,157,0.08)]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,157,0.06) 0%, rgba(0,229,255,0.03) 50%, rgba(177,140,255,0.04) 100%)',
            }}
          >
            {/* Animated shimmer overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(0,255,157,0.05), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />

            <div className="relative flex flex-col items-center gap-6 p-8 md:flex-row md:justify-between md:p-10">
              {/* Left — Content */}
              <div className="flex items-center gap-5 text-center md:text-left">
                <div className="hidden md:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-neon-green/25 bg-neon-green/10 shadow-[0_0_20px_rgba(0,255,157,0.1)]">
                  <ShieldCheck className="h-7 w-7 text-neon-green" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-center gap-2 md:justify-start">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-red/30 bg-neon-red/10 px-2.5 py-0.5 font-mono-nums text-[9px] font-semibold uppercase tracking-wider text-neon-red">
                      87% of traders fail
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-white md:text-2xl">
                    Pass Your Prop Firm Challenge —{' '}
                    <span className="text-neon-green">First Try</span>
                  </h3>
                  <p className="mt-1.5 max-w-lg text-sm text-slate-400">
                    PropGuard enforces FTMO, The5ers, FundedNext & Apex rules in real-time.
                    AI optimizes your EA. Signal Copier scales to unlimited accounts.{' '}
                    <span className="text-white font-medium">100% free.</span>
                  </p>
                </div>
              </div>

              {/* Right — CTA */}
              <div className="flex shrink-0 items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-xl bg-neon-green px-6 py-3 text-sm font-bold text-terminal-bg shadow-[0_0_20px_rgba(0,255,157,0.25)] transition-all group-hover:shadow-[0_0_32px_rgba(0,255,157,0.4)]">
                  Learn How
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. PRODUCT ECOSYSTEM — PropGuard spans 2 cols
          ══════════════════════════════════════════════════════════ */}
      <section id="ecosystem" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Platform
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            The TradeMetrics Pro Ecosystem
          </h2>
          <p
            className="animate-fade-in-up mt-4 text-center text-slate-400"
            style={{ animationDelay: '60ms' }}
          >
            More than a copier — a complete trading infrastructure
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {ECOSYSTEM.map((item, i) => {
              const Viz = PRODUCT_VIZ[item.title];
              return (
                <div
                  key={item.title}
                  className={`glass-premium card-hover-premium animate-fade-in-up group overflow-hidden rounded-2xl ${
                    item.badge === 'LIVE' ? 'glow-cyan' : ''
                  } ${i === 0 ? 'border-gradient sm:col-span-2' : ''}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Mini-visualization */}
                  {Viz && (
                    <div className="border-b border-terminal-border/30 bg-terminal-bg/50 p-4">
                      <Viz />
                    </div>
                  )}

                  {/* Card content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_#00e5ff30]">
                        <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle,#00e5ff15_0%,transparent_70%)]" />
                        <item.icon className="relative z-10 h-6 w-6 text-neon-cyan" />
                      </div>
                      {item.badge === 'LIVE' ? (
                        <span className="chip border border-neon-green/30 bg-neon-green/20 text-neon-green shadow-[0_0_8px_#00ff9d20]">
                          <span className="live-dot mr-0.5" style={{ width: 5, height: 5 }} />
                          LIVE
                        </span>
                      ) : (
                        <span
                          className="chip border border-neon-amber/20 bg-neon-amber/10 text-neon-amber"
                          style={{
                            background:
                              'linear-gradient(90deg, #ffb80010, #ffb80020, #ffb80010)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 4s ease-in-out infinite',
                          }}
                        >
                          COMING SOON
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. HOW IT WORKS — ANIMATED SIGNAL FLOW
          ══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Architecture
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up font-display text-3xl font-bold md:text-4xl">
            How It Works
          </h2>

          <div
            className="animate-fade-in-up mt-16 flex flex-col items-center gap-0 md:flex-row md:items-stretch md:justify-center"
            style={{ animationDelay: '100ms' }}
          >
            {/* Master EA Card */}
            <div className="glass flex w-full flex-col items-center justify-center rounded-2xl p-6 md:w-[200px]">
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-terminal-muted">
                Source
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-white">Master EA</p>
            </div>

            {/* Connector 1 */}
            <div className="relative hidden items-center md:flex">
              <div
                className="h-px w-16 border-t-2 border-dashed border-neon-cyan/30"
                style={{ animation: 'shimmer 3s ease-in-out infinite' }}
              />
              <div
                className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-right 2s ease-in-out infinite' }}
              />
            </div>
            <div className="relative flex h-10 items-center justify-center md:hidden">
              <div className="h-full w-px border-l-2 border-dashed border-neon-cyan/30" />
              <div
                className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-down 2s ease-in-out infinite' }}
              />
            </div>

            {/* Cloudflare Edge Card */}
            <div className="glow-cyan-strong border-gradient glass z-10 flex w-full flex-col items-center rounded-2xl p-8 md:w-[300px] md:scale-110">
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-neon-cyan">
                Edge Network
              </p>
              <p className="mt-1 font-display text-xl font-bold text-white">Cloudflare Edge</p>
              <p className="font-mono-nums mt-0.5 text-sm text-terminal-muted">300+ PoPs</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['HMAC Auth', 'Dedup', 'Equity Guard', 'Lot Sizing'].map((label) => (
                  <span
                    key={label}
                    className="chip border border-neon-cyan/20 bg-neon-cyan/10 text-neon-cyan"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Connector 2 */}
            <div className="relative hidden items-center md:flex">
              <div
                className="h-px w-16 border-t-2 border-dashed border-neon-cyan/30"
                style={{ animation: 'shimmer 3s ease-in-out infinite 1s' }}
              />
              <div
                className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-right 2s ease-in-out infinite 1s' }}
              />
            </div>
            <div className="relative flex h-10 items-center justify-center md:hidden">
              <div className="h-full w-px border-l-2 border-dashed border-neon-cyan/30" />
              <div
                className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff]"
                style={{ animation: 'travel-down 2s ease-in-out infinite 1s' }}
              />
            </div>

            {/* Follower EA Card */}
            <div className="glass flex w-full flex-col items-center justify-center rounded-2xl p-6 md:w-[200px]">
              <p className="font-mono-nums text-[11px] uppercase tracking-widest text-terminal-muted">
                Destination
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-white">Follower EA</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. FEATURES — Alternating layout
          ══════════════════════════════════════════════════════════ */}
      <section id="features" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Capabilities
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Everything You Need
          </h2>

          <div className="mt-14 space-y-6">
            {FEATURES.map((f, i) => {
              const isEven = i % 2 === 0;
              return (
                <div
                  key={f.title}
                  className={`glass-premium card-hover-premium animate-fade-in-up flex flex-col items-start gap-6 rounded-2xl p-6 md:flex-row md:items-center ${
                    isEven ? '' : 'md:flex-row-reverse'
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Icon block */}
                  <div
                    className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 ${
                      isEven ? 'md:mr-2' : 'md:ml-2'
                    }`}
                  >
                    <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle,#00e5ff15_0%,transparent_70%)]" />
                    <f.icon className="relative z-10 h-7 w-7 text-neon-cyan" />
                  </div>

                  {/* Text */}
                  <div className={isEven ? 'text-left' : 'text-left md:text-right'}>
                    <h3 className="font-display text-lg font-semibold text-white">{f.title}</h3>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-400">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. WHY TRADEMETRICS PRO — 2x2 grid with large numbers
          ══════════════════════════════════════════════════════════ */}
      <section id="why-trademetrics" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Why Us
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Why Traders Choose TradeMetrics Pro
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Large number */}
                <span className="font-mono-nums text-5xl font-black leading-none text-terminal-border/40">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="mt-4 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 transition-shadow duration-300 group-hover:shadow-[0_0_20px_#00e5ff25]">
                    <b.icon className="h-5 w-5 text-neon-cyan" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">{b.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7b. INTELLIGENCE SUITE — 5 Innovative Features
          ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Intelligence Suite
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Features No Other Platform Has
          </h2>
          <p className="animate-fade-in-up mx-auto mt-4 max-w-2xl text-center text-slate-400" style={{ animationDelay: '60ms' }}>
            Institutional-grade intelligence built from your own trading data.
            Every insight is personal, every recommendation is actionable — and it's all free.
          </p>

          {/* Feature 1: Community Trading Pulse — Full width hero card */}
          <div
            className="animate-fade-in-up mt-14 overflow-hidden rounded-2xl border border-neon-purple/20 sm:col-span-2"
            style={{
              animationDelay: '100ms',
              background: 'linear-gradient(135deg, rgba(177,140,255,0.04) 0%, rgba(0,229,255,0.02) 100%)',
              boxShadow: '0 0 40px rgba(177,140,255,0.05)',
            }}
          >
            <div className="flex flex-col gap-0 md:flex-row">
              {/* Left — Content */}
              <div className="flex-1 p-8 md:p-10">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neon-purple/25 bg-neon-purple/10 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon-purple animate-pulse" />
                  <span className="font-mono-nums text-[9px] uppercase tracking-widest text-neon-purple">Live Sentiment</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-white">Community Trading Pulse</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                  Real-time sentiment data from actual trade executions — not Twitter polls or broker reports.
                  See what percentage of traders are long vs short on every major pair, detect volume surges,
                  and get crowded-trade alerts when consensus exceeds 80%.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['Live Sentiment Bars', 'Volume Spike Detection', 'Crowded Trade Alerts', 'Community Win Rate'].map((tag) => (
                    <span key={tag} className="chip border border-neon-purple/20 bg-neon-purple/10 text-neon-purple">{tag}</span>
                  ))}
                </div>
              </div>
              {/* Right — Mini viz */}
              <div className="flex-1 border-t border-neon-purple/10 bg-terminal-bg/50 p-6 md:border-l md:border-t-0">
                <div className="space-y-3">
                  {[
                    { pair: 'EURUSD', long: 62, color: '#00ff9d' },
                    { pair: 'XAUUSD', long: 74, color: '#ffb800' },
                    { pair: 'GBPUSD', long: 41, color: '#ff3d57' },
                    { pair: 'USDJPY', long: 58, color: '#00e5ff' },
                  ].map((p) => (
                    <div key={p.pair} className="flex items-center gap-3">
                      <span className="w-14 font-mono-nums text-[11px] font-semibold text-white">{p.pair}</span>
                      <div className="flex-1 flex h-4 rounded-full overflow-hidden bg-terminal-border/20">
                        <div className="flex items-center justify-end pr-1.5 rounded-l-full" style={{ width: `${p.long}%`, background: `linear-gradient(90deg, #00ff9d15, #00ff9d30)` }}>
                          <span className="font-mono-nums text-[8px] font-bold text-neon-green">{p.long}%</span>
                        </div>
                        <div className="flex items-center pl-1.5 rounded-r-full" style={{ width: `${100 - p.long}%`, background: `linear-gradient(90deg, #ff3d5730, #ff3d5715)` }}>
                          <span className="font-mono-nums text-[8px] font-bold text-neon-red">{100 - p.long}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-neon-green/15 bg-neon-green/[0.04] px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
                    <span className="font-mono-nums text-[10px] text-neon-green">Community Win Rate: 58%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features 2-5: 2x2 Grid */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {/* Feature 2: Pre-Trade Flight Check */}
            <div
              className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6"
              style={{ animationDelay: '200ms' }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_#00e5ff30]">
                <BarChart3 className="h-6 w-6 text-neon-cyan" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">Pre-Trade Flight Check</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Before you trade, know your edge. Your win rate by pair, by session, by day of week — computed from your own history.
                Overtrading warnings when you exceed your daily average. The 60-second decision upgrade.
              </p>
              {/* Mini viz — session bars */}
              <div className="mt-4 flex items-end gap-1.5 h-10">
                {[
                  { label: 'Mon', h: 65, c: '#00ff9d' },
                  { label: 'Tue', h: 55, c: '#00e5ff' },
                  { label: 'Wed', h: 78, c: '#00ff9d' },
                  { label: 'Thu', h: 45, c: '#ffb800' },
                  { label: 'Fri', h: 35, c: '#ff3d57' },
                ].map((d) => (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t" style={{ height: `${d.h}%`, backgroundColor: `${d.c}30`, borderTop: `2px solid ${d.c}` }} />
                    <span className="font-mono-nums text-[7px] text-terminal-muted">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 3: Trade Autopsy */}
            <div
              className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6"
              style={{ animationDelay: '280ms' }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-neon-amber/20 bg-neon-amber/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_#ffb80030]">
                <FlaskConical className="h-6 w-6 text-neon-amber" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">Trade Autopsy Reports</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Every losing trade gets a post-mortem. AI classifies the cause — news-driven, execution error, strategy failure, or market randomness.
                Cross-references with economic events. Finally answers: "Was I wrong, or was I unlucky?"
              </p>
              {/* Mini viz — classification badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: 'News-Driven', color: '#ffb800' },
                  { label: 'Execution Error', color: '#ff3d57' },
                  { label: 'Strategy Failure', color: '#b18cff' },
                  { label: 'Market Randomness', color: '#00e5ff' },
                ].map((c) => (
                  <span key={c.label} className="rounded-full border px-2.5 py-1 font-mono-nums text-[9px]" style={{ borderColor: `${c.color}25`, color: c.color, backgroundColor: `${c.color}08` }}>
                    {c.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Feature 4: Strategy DNA */}
            <div
              className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6"
              style={{ animationDelay: '360ms' }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-neon-green/20 bg-neon-green/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_#00ff9d30]">
                <Sparkles className="h-6 w-6 text-neon-green" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">Strategy DNA Fingerprint</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Your unique trading identity, visualized. Session focus, win rate, risk appetite, symbol concentration,
                hold style, consistency, and direction bias — computed from every trade you've ever taken.
              </p>
              {/* Mini viz — DNA bars */}
              <div className="mt-4 space-y-1.5">
                {[
                  { label: 'Session', pct: 72, color: '#00e5ff' },
                  { label: 'Win Rate', pct: 61, color: '#00ff9d' },
                  { label: 'R:R', pct: 55, color: '#ffb800' },
                  { label: 'Consistency', pct: 68, color: '#b18cff' },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className="w-16 font-mono-nums text-[8px] text-terminal-muted">{t.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: `${t.color}60`, boxShadow: `0 0 6px ${t.color}25` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 5: Funded Trader Blueprint */}
            <div
              className="glass-premium card-hover-premium animate-fade-in-up group rounded-2xl p-6"
              style={{ animationDelay: '440ms' }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-neon-red/20 bg-neon-red/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_#ff3d5730]">
                <Target className="h-6 w-6 text-neon-red" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">Funded Trader Blueprint</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Compare yourself to the archetype of successfully funded traders across 8 dimensions.
                Get a Readiness Score, see exactly where you fall short, and receive actionable recommendations to close the gap.
              </p>
              {/* Mini viz — score gauge */}
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-14 w-14">
                  <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-terminal-border)" strokeWidth="2.5" opacity="0.2" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#00ff9d" strokeWidth="2.5" strokeDasharray="66 94.2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ff9d50)' }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono-nums text-[13px] font-bold text-neon-green">72</span>
                </div>
                <div>
                  <p className="font-mono-nums text-[11px] font-semibold text-neon-green">Challenge Ready</p>
                  <p className="font-mono-nums text-[9px] text-terminal-muted">3 improvements identified</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 6: Sage AI Counselor — Full width hero card */}
          <div
            className="animate-fade-in-up mt-6 overflow-hidden rounded-2xl border border-neon-purple/20"
            style={{
              animationDelay: '520ms',
              background: 'linear-gradient(135deg, rgba(177,140,255,0.05) 0%, rgba(255,61,87,0.02) 50%, rgba(0,229,255,0.02) 100%)',
              boxShadow: '0 0 40px rgba(177,140,255,0.05)',
            }}
          >
            <div className="flex flex-col gap-0 md:flex-row">
              {/* Left — Content */}
              <div className="flex-1 p-8 md:p-10">
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-purple/25 bg-neon-purple/10 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-purple animate-pulse" />
                    <span className="font-mono-nums text-[9px] uppercase tracking-widest text-neon-purple">AI-Powered</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-neon-green/20 bg-neon-green/10 px-2.5 py-0.5 font-mono-nums text-[9px] text-neon-green">
                    Free &amp; Unlimited
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Meet Sage — Your AI Trading Counselor
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                  The first AI counselor built specifically for traders.
                  Sage understands revenge trading, FOMO, the fear of pulling the trigger, overtrading addiction,
                  and the emotional weight of blown accounts. It sees your real trading data and knows what you're going through — not generic advice, but personal, contextual support.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['Trading Psychology', 'Context-Aware', 'Conversation Memory', 'Data-Driven Empathy'].map((tag) => (
                    <span key={tag} className="chip border border-neon-purple/20 bg-neon-purple/10 text-neon-purple">{tag}</span>
                  ))}
                </div>
              </div>
              {/* Right — Chat preview */}
              <div className="flex-1 border-t border-neon-purple/10 bg-terminal-bg/50 p-6 md:border-l md:border-t-0">
                <div className="space-y-3">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-neon-cyan/10 border border-neon-cyan/15 px-4 py-2.5 text-[11px] leading-relaxed text-slate-300">
                      I turned a green day into a red one. I keep overtrading and I feel terrible about it.
                    </div>
                  </div>
                  {/* Sage response */}
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/25 mt-0.5">
                      <Brain className="h-3 w-3 text-neon-purple" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-terminal-card/40 border border-terminal-border/20 px-4 py-2.5 text-[11px] leading-relaxed text-slate-400">
                      <span className="text-slate-300">😔 I hear you. That cycle of giving back profits is one of the most frustrating patterns in trading.</span> I can see you've had 8 trades today — that's above your average. 💙 The skill is clearly there. Let's talk about what pulled you back in after you knew you should stop...
                    </div>
                  </div>
                  {/* Conversation starters */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['😔 Rough day', '🔄 Overtrading', '😰 Fear to trade', '🎉 Big win'].map((s) => (
                      <span key={s} className="rounded-full border border-terminal-border/30 bg-terminal-card/30 px-2.5 py-1 font-mono-nums text-[9px] text-terminal-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. TESTIMONIALS — Single featured testimonial
          ══════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Traders
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            What Traders Are Saying
          </h2>

          {/* Featured testimonial — the second one (PropGuard story) is most compelling */}
          <div
            className="glass-premium animate-fade-in-up mt-14 rounded-2xl p-8 md:p-12"
            style={{
              animationDelay: '100ms',
              borderLeft: '3px solid var(--color-neon-cyan)',
              boxShadow: '0 0 40px rgba(0,229,255,0.05)',
            }}
          >
            {/* Stars */}
            <div className="mb-6 flex gap-1">
              {[...Array(5)].map((_, si) => (
                <svg
                  key={si}
                  className="h-5 w-5 text-neon-cyan"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <blockquote className="text-xl leading-relaxed text-slate-200 md:text-2xl">
              &ldquo;{TESTIMONIALS[1].quote}&rdquo;
            </blockquote>

            <div className="mt-8 flex items-center gap-4">
              {/* Avatar placeholder */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neon-cyan/20 bg-neon-cyan/10">
                <span className="font-display text-lg font-bold text-neon-cyan">
                  {TESTIMONIALS[1].name[0]}
                </span>
              </div>
              <div>
                <p className="font-display text-base font-semibold text-white">
                  {TESTIMONIALS[1].name}
                </p>
                <p className="font-mono-nums text-sm text-neon-cyan/70">
                  {TESTIMONIALS[1].context}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary testimonials — smaller, below */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {[TESTIMONIALS[0], TESTIMONIALS[2]].map((t, i) => (
              <div
                key={t.name}
                className="glass-premium animate-fade-in-up rounded-xl p-6"
                style={{
                  animationDelay: `${200 + i * 80}ms`,
                  borderLeft: '2px solid var(--color-terminal-border)',
                }}
              >
                <p className="text-sm leading-relaxed text-slate-400">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4">
                  <p className="font-display text-sm font-semibold text-white">{t.name}</p>
                  <p className="font-mono-nums text-xs text-terminal-muted">{t.context}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          9. BLOG — AEO/SEO Optimized Trading Insights
          ══════════════════════════════════════════════════════════ */}
      <section id="blog" className="px-6 py-20 md:py-32">
        {/* JSON-LD Structured Data for AEO/SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Blog',
              name: 'TradeMetrics Pro Trading Insights',
              description: 'Expert trading education, strategy guides, risk management tips, and market analysis for forex and CFD traders.',
              url: 'https://trademetrics.pro/blog',
              publisher: {
                '@type': 'Organization',
                name: 'TradeMetrics Pro',
                url: 'https://trademetrics.pro',
              },
              blogPost: BLOG_POSTS.map(post => ({
                '@type': 'BlogPosting',
                headline: post.title,
                description: post.excerpt,
                datePublished: post.date,
                author: { '@type': 'Organization', name: 'TradeMetrics Pro' },
                articleSection: post.category,
                keywords: post.tag,
                timeRequired: `PT${parseInt(post.readTime)}M`,
              })),
            }),
          }}
        />

        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">
              Knowledge Base
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h2 className="animate-fade-in-up text-center font-display text-3xl font-bold md:text-4xl">
            Trading Insights & Education
          </h2>
          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-xl text-center text-slate-400"
            style={{ animationDelay: '60ms' }}
          >
            Level up your trading with expert guides on strategy, risk management, psychology, and market analysis
          </p>

          {/* Category filter pills */}
          <nav
            className="animate-fade-in-up mt-10 flex flex-wrap items-center justify-center gap-2"
            style={{ animationDelay: '120ms' }}
            aria-label="Blog categories"
          >
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setBlogCategory(cat.value)}
                className={`rounded-full px-4 py-1.5 font-mono-nums text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  blogCategory === cat.value
                    ? 'border border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                    : 'border border-terminal-border/40 bg-terminal-card/30 text-terminal-muted hover:border-terminal-border-hover hover:text-terminal-text'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </nav>

          {/* Featured posts — top row, 3 large cards */}
          {blogCategory === 'all' && (
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {featuredPosts.map((post, i) => {
                const accentMap: Record<string, string> = {
                  'neon-cyan': '#00e5ff',
                  'neon-green': '#00ff9d',
                  'neon-purple': '#b18cff',
                  'neon-amber': '#ffb800',
                  'neon-red': '#ff3d57',
                };
                const accent = accentMap[post.accentColor] || '#00e5ff';
                return (
                  <Link
                    to={`/blog/${post.id}`}
                    key={post.id}
                    className="glass-premium card-hover-premium animate-fade-in-up group relative flex flex-col overflow-hidden rounded-2xl"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {/* Top accent bar */}
                    <div
                      className="h-[3px] w-full"
                      style={{ background: `linear-gradient(90deg, ${accent}60, ${accent}20, transparent)` }}
                    />

                    {/* Featured badge */}
                    <div className="absolute right-4 top-5">
                      <span
                        className="chip border text-[9px]"
                        style={{
                          borderColor: `${accent}30`,
                          backgroundColor: `${accent}10`,
                          color: accent,
                        }}
                      >
                        Featured
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      {/* Icon + Category */}
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl border transition-shadow duration-300 group-hover:shadow-[0_0_16px_var(--glow)]"
                          style={{
                            borderColor: `${accent}25`,
                            backgroundColor: `${accent}10`,
                            '--glow': `${accent}30`,
                          } as React.CSSProperties}
                        >
                          <post.icon className="h-5 w-5" style={{ color: accent }} />
                        </div>
                        <span className="font-mono-nums text-[10px] uppercase tracking-widest text-terminal-muted">
                          {post.tag}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-display text-lg font-semibold leading-snug text-white group-hover:text-neon-cyan transition-colors duration-200">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
                        {post.excerpt}
                      </p>

                      {/* Footer meta */}
                      <div className="mt-5 flex items-center justify-between border-t border-terminal-border/30 pt-4">
                        <div className="flex items-center gap-3 font-mono-nums text-[10px] text-terminal-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.readTime}
                          </span>
                          <span className="text-terminal-border">|</span>
                          <time dateTime={post.date}>
                            {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </time>
                        </div>
                        <span
                          className="flex items-center gap-1 font-mono-nums text-[10px] font-medium transition-all duration-200 group-hover:gap-2"
                          style={{ color: accent }}
                        >
                          Read <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* All / filtered posts — compact list cards */}
          <div className={`${blogCategory === 'all' ? 'mt-8' : 'mt-12'} grid gap-4 md:grid-cols-2`}>
            {(blogCategory === 'all' ? BLOG_POSTS.filter(p => !p.featured) : filteredPosts).map((post, i) => {
              const accentMap: Record<string, string> = {
                'neon-cyan': '#00e5ff',
                'neon-green': '#00ff9d',
                'neon-purple': '#b18cff',
                'neon-amber': '#ffb800',
                'neon-red': '#ff3d57',
              };
              const accent = accentMap[post.accentColor] || '#00e5ff';
              return (
                <Link
                  to={`/blog/${post.id}`}
                  key={post.id}
                  className="glass-premium card-hover-premium animate-fade-in-up group flex items-start gap-4 overflow-hidden rounded-xl p-5"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Icon */}
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-shadow duration-300 group-hover:shadow-[0_0_14px_var(--glow)]"
                    style={{
                      borderColor: `${accent}20`,
                      backgroundColor: `${accent}08`,
                      '--glow': `${accent}25`,
                    } as React.CSSProperties}
                  >
                    <post.icon className="h-5 w-5" style={{ color: accent }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Tag + Read time */}
                    <div className="flex items-center gap-2 font-mono-nums text-[10px] text-terminal-muted">
                      <span
                        className="rounded-full border px-2 py-0.5"
                        style={{
                          borderColor: `${accent}20`,
                          color: accent,
                        }}
                      >
                        {post.tag}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {post.readTime}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-2 font-display text-[15px] font-semibold leading-snug text-white group-hover:text-neon-cyan transition-colors duration-200">
                      {post.title}
                    </h3>

                    {/* Excerpt — truncated */}
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* View all CTA */}
          <div className="animate-fade-in-up mt-10 flex justify-center" style={{ animationDelay: '200ms' }}>
            <Link to="/blog" className="group inline-flex items-center gap-2 rounded-xl border border-terminal-border bg-terminal-card/60 px-8 py-3 text-sm font-semibold text-slate-300 backdrop-blur transition-all hover:border-neon-cyan/30 hover:bg-neon-cyan/[0.05] hover:text-neon-cyan hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]">
              <BookOpen className="h-4 w-4" />
              View All Articles
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          10. FINAL CTA — Full-width, maximum breathing room
          ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 md:py-40">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="animate-fade-in-up font-display text-4xl font-bold text-white md:text-5xl">
            Free for a Full Year
          </h2>
          <p
            className="animate-fade-in-up mt-6 text-lg text-slate-400"
            style={{ animationDelay: '80ms' }}
          >
            TradeMetrics Pro is completely free until 2027 — no per-account fees, no monthly subscription, no credit card required.
            While competitors charge $20-100/month, you pay nothing.
          </p>
          <button
            onClick={() => setAuthModal({ open: true, mode: 'register' })}
            className="btn-premium signal-pulse animate-fade-in-up mt-10 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-12 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,229,255,0.4)] transition-all hover:shadow-[0_0_60px_rgba(0,229,255,0.6)] cursor-pointer"
            style={{ animationDelay: '160ms' }}
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          11. RISK DISCLAIMER — Visible, compliant, non-intrusive
          ══════════════════════════════════════════════════════════ */}
      <section
        id="risk-disclosure"
        className="relative px-6 py-10"
        role="contentinfo"
        aria-label="Risk Disclosure"
      >
        <div className="mx-auto max-w-4xl">
          <div
            className="overflow-hidden rounded-2xl border border-neon-amber/15 bg-gradient-to-br from-neon-amber/[0.03] to-transparent backdrop-blur-sm"
            style={{
              boxShadow: '0 0 30px rgba(255,184,0,0.04), inset 0 1px 0 rgba(255,184,0,0.06)',
            }}
          >
            {/* Header — always visible */}
            <button
              onClick={() => setDisclaimerExpanded(!disclaimerExpanded)}
              className="flex w-full items-center justify-between px-6 py-4 cursor-pointer group"
              aria-expanded={disclaimerExpanded}
              aria-controls="risk-disclaimer-content"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-amber/20 bg-neon-amber/10">
                  <TriangleAlert className="h-4 w-4 text-neon-amber" />
                </div>
                <div className="text-left">
                  <h3 className="font-display text-sm font-semibold text-neon-amber/90">
                    Risk Disclosure
                  </h3>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
                    CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-neon-amber/50 transition-transform duration-300 group-hover:text-neon-amber ${
                  disclaimerExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Expanded content */}
            <div
              id="risk-disclaimer-content"
              className={`overflow-hidden transition-all duration-500 ease-out ${
                disclaimerExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="border-t border-neon-amber/10 px-6 pb-6 pt-4">
                <div className="space-y-3 text-[13px] leading-relaxed text-slate-400">
                  <p>
                    <strong className="text-slate-300">High Risk Investment Warning:</strong>{' '}
                    Trading foreign exchange (Forex) and Contracts for Difference (CFDs) on margin carries a high level
                    of risk and may not be suitable for all investors. The high degree of leverage can work against you
                    as well as for you. Before deciding to trade Forex or CFDs, you should carefully consider your
                    investment objectives, level of experience, and risk appetite.
                  </p>
                  <p>
                    The possibility exists that you could sustain a loss of some or all of your initial investment and
                    therefore you should not invest money that you cannot afford to lose. You should be aware of all the
                    risks associated with foreign exchange and CFD trading, and seek advice from an independent financial
                    advisor if you have any doubts.
                  </p>
                  <p>
                    <strong className="text-slate-300">No Financial Advice:</strong>{' '}
                    TradeMetrics Pro provides tools for trade management, signal copying, and performance analytics.
                    Nothing on this platform constitutes financial advice, a recommendation, or a solicitation to buy
                    or sell any financial instrument. Past performance is not indicative of future results.
                  </p>
                  <p className="rounded-lg border border-neon-amber/10 bg-neon-amber/[0.04] px-4 py-3">
                    <span className="font-mono-nums text-[11px] uppercase tracking-wider text-neon-amber">
                      Between 74-89% of retail investor accounts lose money when trading CFDs.
                    </span>
                    <br />
                    <span className="text-[12px] text-slate-500">
                      You should consider whether you understand how CFDs work and whether you can afford to
                      take the high risk of losing your money.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          12. FOOTER — Mission Control
          ══════════════════════════════════════════════════════════ */}
      <footer className="relative z-10">
        {/* ── Telemetry Status Bar ─────────────────────────────── */}
        <div className="telemetry-bar border-y border-terminal-border bg-terminal-surface">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
            <div className="flex items-center gap-5 sm:gap-8">
              <div className="telemetry-item flex items-center gap-1.5" style={{ animationDelay: '0ms' }}>
                <span className="flex h-[5px] w-[5px] rounded-full bg-neon-green shadow-[0_0_6px_var(--color-neon-green)]" />
                <span className="font-mono text-[9px] tracking-wider text-terminal-muted">
                  EDGE: <span className="text-neon-green">327 NODES</span>
                </span>
              </div>
              <div className="telemetry-item flex items-center gap-1.5" style={{ animationDelay: '80ms' }}>
                <span className="flex h-[5px] w-[5px] rounded-full bg-neon-cyan shadow-[0_0_6px_var(--color-neon-cyan)]" />
                <span className="font-mono text-[9px] tracking-wider text-terminal-muted">
                  LATENCY: <span className="text-neon-cyan">38MS</span>
                </span>
              </div>
              <div className="telemetry-item hidden items-center gap-1.5 sm:flex" style={{ animationDelay: '160ms' }}>
                <span className="flex h-[5px] w-[5px] rounded-full bg-neon-amber shadow-[0_0_6px_var(--color-neon-amber)]" />
                <span className="font-mono text-[9px] tracking-wider text-terminal-muted">
                  SIGNALS: <span className="text-neon-amber">1,247 TODAY</span>
                </span>
              </div>
            </div>
            <span className="font-mono text-[9px] text-terminal-muted/40">v3.2.1</span>
          </div>
        </div>

        {/* ── Main Footer Content ──────────────────────────────── */}
        <div className="px-6 py-10 md:py-14">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.8fr_1fr_1fr_1fr]">
            {/* Brand column */}
            <div>
              <div className="mb-3 text-[26px] font-black leading-none tracking-tight">
                <span className="text-white">Trade</span>
                <span className="text-neon-cyan">Metrics</span>
              </div>
              <p className="max-w-[280px] text-[12px] leading-relaxed text-terminal-muted">
                The world&rsquo;s only free cross-VPS trade copier.
                Forex, gold, indices, oil &amp; crypto. Signals travel through
                Cloudflare&rsquo;s edge &mdash; not your VPS.
              </p>
              {/* Mini EKG signature */}
              <svg className="footer-ekg mt-4" width="140" height="20" viewBox="0 0 140 20" aria-hidden="true">
                <path
                  d="M0,10 L30,10 L40,3 L48,17 L56,8 L62,12 L68,10 L140,10"
                  fill="none"
                  stroke="var(--color-neon-cyan)"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Platform column */}
            <div>
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-[2px] text-terminal-muted">
                Platform
              </p>
              <div className="flex flex-col gap-2">
                {FOOTER_LINKS_PLATFORM.map((l) =>
                  l.href.startsWith('/') ? (
                    <Link
                      key={l.label}
                      to={l.href}
                      className="text-[12px] text-terminal-muted/60 transition-colors hover:text-neon-cyan"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.label}
                      href={l.href}
                      className="text-[12px] text-terminal-muted/60 transition-colors hover:text-neon-cyan"
                    >
                      {l.label}
                    </a>
                  )
                )}
              </div>
            </div>

            {/* Resources column */}
            <div>
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-[2px] text-terminal-muted">
                Resources
              </p>
              <div className="flex flex-col gap-2">
                {FOOTER_LINKS_RESOURCES.map((l) =>
                  l.href.startsWith('/') ? (
                    <Link
                      key={l.label}
                      to={l.href}
                      className="text-[12px] text-terminal-muted/60 transition-colors hover:text-neon-cyan"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.label}
                      href={l.href}
                      className="text-[12px] text-terminal-muted/60 transition-colors hover:text-neon-cyan"
                    >
                      {l.label}
                    </a>
                  )
                )}
              </div>
            </div>

            {/* Legal column */}
            <div>
              <p className="mb-3 text-[9px] font-semibold uppercase tracking-[2px] text-terminal-muted">
                Legal
              </p>
              <div className="flex flex-col gap-2">
                {FOOTER_LINKS_LEGAL.map((l) =>
                  l.href.startsWith('/') ? (
                    <Link
                      key={l.label}
                      to={l.href}
                      className="text-[12px] text-terminal-muted/60 transition-colors hover:text-neon-cyan"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.label}
                      href={l.href}
                      className="text-[12px] text-terminal-muted/60 transition-colors hover:text-neon-cyan"
                    >
                      {l.label}
                    </a>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Bar ───────────────────────────────────────── */}
        <div className="border-t border-terminal-border/30 px-6 py-4">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-[10px] text-terminal-muted/40">
              &copy; 2026 Hodges &amp; Co. Limited
            </span>
            <span className="font-mono text-[9px] text-terminal-muted/30">
              Built on Cloudflare&rsquo;s edge network
            </span>
          </div>
        </div>
      </footer>

      {/* Scroll to Top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        className={`fixed bottom-8 right-8 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-neon-cyan/25 bg-terminal-surface/90 text-neon-cyan shadow-[0_0_20px_rgba(0,229,255,0.15)] backdrop-blur-md transition-all duration-400 cursor-pointer hover:bg-neon-cyan/15 hover:border-neon-cyan/40 hover:shadow-[0_0_28px_rgba(0,229,255,0.3)] hover:scale-110 active:scale-95 ${
          showScrollTop
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        initialMode={authModal.mode}
      />
    </div>
  );
}
