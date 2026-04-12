import { useState } from 'react';
import {
  ArrowRight, ArrowLeft, CheckCircle2, Eye, TrendingUp,
  TrendingDown, Clock, Target, ChevronRight, Sparkles,
} from 'lucide-react';

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to ICC Trading',
    subtitle: 'The simplest price action method that works',
    content: `ICC stands for **Indication, Correction, Continuation** — three steps to finding a trade. No indicators needed. No complicated patterns. Just reading how price moves.

This tutorial will teach you each step from scratch. By the end, you'll be able to spot ICC setups on any chart.`,
    visual: 'intro',
    color: '#00e5ff',
  },
  {
    id: 'what-is-trend',
    title: 'Step 0: What Is a Trend?',
    subtitle: 'Before ICC, you need to know this one thing',
    content: `Price moves in one of three ways:

**Uptrend** 📈 — Price makes Higher Highs and Higher Lows. Each swing up goes further than the last, and each pullback doesn't go as low as the previous one.

**Downtrend** 📉 — Price makes Lower Highs and Lower Lows. The opposite of an uptrend.

**Sideways/Range** ➡️ — Price bounces between two levels. No clear direction. **Don't trade this with ICC.**

The first thing you do before anything else: look at the 4H chart and ask "Is this going up or down?" If the answer isn't obvious, you don't trade.`,
    visual: 'trend',
    color: '#00ff9d',
  },
  {
    id: 'bias',
    title: 'Step 1: Set Your Bias (4H Chart)',
    subtitle: 'The 4H chart tells you which direction to trade',
    content: `Open the **4H chart**. This is your compass.

**If you see higher highs and higher lows** → Your bias is BULLISH. You will only look for BUY setups.

**If you see lower highs and lower lows** → Your bias is BEARISH. You will only look for SELL setups.

**If it's choppy with no clear structure** → No trade. Close the chart and come back later.

🎯 **Rule**: Never trade against the 4H bias. If the 4H says up, you do NOT sell. Period.`,
    visual: 'bias',
    color: '#b18cff',
  },
  {
    id: 'indication',
    title: 'Step 2: Find the Indication (1H Chart)',
    subtitle: 'A strong move that confirms the bias',
    content: `Now switch to the **1H chart**. You're looking for a strong, decisive move in the direction of your 4H bias.

**What does an Indication look like?**
- Several big candles in one direction
- Very little pullback during the move
- It "looks like the market made up its mind"

**What is NOT an Indication:**
- Small choppy candles going nowhere
- A gradual slow drift
- A move in the OPPOSITE direction of your bias

Think of it as the market saying: "I'm going THIS way." That's the Indication.`,
    visual: 'indication',
    color: '#00e5ff',
  },
  {
    id: 'correction',
    title: 'Step 3: Wait for the Correction (15M Chart)',
    subtitle: 'The pullback — this is where patience pays',
    content: `After the Indication, price ALWAYS pulls back. This pullback is called the **Correction**.

Switch to the **15M chart** and watch for:
- Price moving AGAINST the Indication direction
- Smaller candles, slower movement
- The pullback typically retraces 38-62% of the Indication move

**The hardest part**: WAITING. Most beginners see the Indication and immediately want to enter. But the Correction hasn't happened yet. If you enter during the Indication, you're buying at the worst possible price.

⏳ **Rule**: Do NOT touch the buy/sell button until you see the Correction complete.`,
    visual: 'correction',
    color: '#ffb800',
  },
  {
    id: 'continuation',
    title: 'Step 4: Enter on the Continuation (5M Chart)',
    subtitle: 'Price resumes the trend — NOW you trade',
    content: `The Correction is done. Price has pulled back and is starting to move in the original Indication direction again. This is the **Continuation** — your entry signal.

Switch to the **5M chart** for precision:
- Look for a candle that closes in the Indication direction
- This candle should break the short-term Correction structure
- THAT is your entry candle

**Stop Loss**: Place it just below the Correction low (for buys) or above the Correction high (for sells).

**Take Profit**: Target at least 2× your stop loss distance (1:2 risk-reward minimum).

🎯 **The full ICC flow**: 4H bias → 1H indication → 15M correction → 5M entry`,
    visual: 'continuation',
    color: '#00ff9d',
  },
  {
    id: 'when-not-to-trade',
    title: 'Equally Important: When NOT to Trade',
    subtitle: 'The best trade is sometimes no trade',
    content: `ICC doesn't work in every market condition. Here's when to sit out:

❌ **No clear 4H trend** — If you can't immediately see higher highs/lows or lower highs/lows, close the chart.

❌ **Indication is weak** — Small, choppy candles on the 1H don't count as an indication. You need STRONG, decisive movement.

❌ **Correction goes too deep** — If the pullback retraces more than 80% of the Indication, the setup is invalid. The trend may be reversing.

❌ **Major news in the next 30 minutes** — NFP, FOMC, CPI events create unpredictable volatility. Close positions or stay flat.

❌ **Wrong session** — Each asset has optimal trading hours. EURUSD during Asian session? Don't bother.

The best ICC traders take 1-3 trades per day. Quality over quantity, always.`,
    visual: 'no-trade',
    color: '#ff3d57',
  },
  {
    id: 'ready',
    title: 'You\'re Ready to Practice!',
    subtitle: 'Start with the beginner scenarios',
    content: `You now understand the ICC method:

1. **4H** → Set your bias (bullish or bearish)
2. **1H** → Find the indication (strong impulse move)
3. **15M** → Wait for the correction (pullback)
4. **5M** → Enter on the continuation (trend resumes)

In the practice studio:
- Start with **Scenario 1 (EURUSD Bullish)** — it's the clearest ICC setup
- Use the **Mark** buttons to highlight each ICC phase on the chart
- Turn on **Ghost Mode** (👁 button) to see where the optimal zones were
- After each session, the **scoring system** tells you exactly what you got right and wrong

Remember: The goal isn't to be right every time. It's to follow the process. ICC is simple — the hard part is having the patience to wait.

Good luck! 🤝`,
    visual: 'ready',
    color: '#00e5ff',
  },
];

export function ICCGuidedTutorial({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const progress = ((step + 1) / TUTORIAL_STEPS.length) * 100;

  // Simple visual indicators per step
  const VISUALS: Record<string, React.ReactNode> = {
    intro: (
      <div className="flex items-center justify-center gap-4 py-4">
        {['Indication', 'Correction', 'Continuation'].map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border text-lg font-black"
              style={{ borderColor: ['#00e5ff30', '#ffb80030', '#00ff9d30'][i], backgroundColor: ['#00e5ff10', '#ffb80010', '#00ff9d10'][i], color: ['#00e5ff', '#ffb800', '#00ff9d'][i] }}>
              {i + 1}
            </div>
            <span className="text-[10px] font-semibold" style={{ color: ['#00e5ff', '#ffb800', '#00ff9d'][i] }}>{label}</span>
          </div>
        ))}
      </div>
    ),
    trend: (
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="text-center">
          <TrendingUp size={32} className="mx-auto text-neon-green mb-1" />
          <span className="text-[10px] text-neon-green font-semibold">Uptrend</span>
        </div>
        <div className="text-center">
          <TrendingDown size={32} className="mx-auto text-neon-red mb-1" />
          <span className="text-[10px] text-neon-red font-semibold">Downtrend</span>
        </div>
        <div className="text-center">
          <ArrowRight size={32} className="mx-auto text-terminal-muted mb-1" />
          <span className="text-[10px] text-terminal-muted font-semibold">Range (skip)</span>
        </div>
      </div>
    ),
    bias: (
      <div className="rounded-xl border border-neon-purple/20 bg-neon-purple/[0.04] p-4 text-center">
        <p className="font-mono-nums text-lg font-bold text-neon-purple">4H Chart = Your Compass</p>
        <p className="text-[11px] text-slate-400 mt-1">Higher highs → BUY only | Lower lows → SELL only</p>
      </div>
    ),
    indication: (
      <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.04] p-4 text-center">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-neon-cyan mb-2">1H Chart</p>
        <div className="flex items-center justify-center gap-1">
          {[20, 35, 50, 65, 80].map((h, i) => (
            <div key={i} className="w-4 rounded-t bg-neon-cyan/40" style={{ height: `${h}%`, minHeight: h * 0.6, borderTop: '2px solid #00e5ff' }} />
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Strong consecutive candles = Indication</p>
      </div>
    ),
    correction: (
      <div className="rounded-xl border border-neon-amber/20 bg-neon-amber/[0.04] p-4 text-center">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-neon-amber mb-2">15M Chart — The Pullback</p>
        <div className="flex items-center justify-center gap-1">
          {[60, 50, 40, 35, 30, 33, 28].map((h, i) => (
            <div key={i} className="w-3 rounded-t" style={{ height: `${h}%`, minHeight: h * 0.5, backgroundColor: i < 4 ? '#ff3d5740' : '#ffb80040', borderTop: `2px solid ${i < 4 ? '#ff3d57' : '#ffb800'}` }} />
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Wait for the pullback to COMPLETE before entering</p>
      </div>
    ),
    continuation: (
      <div className="rounded-xl border border-neon-green/20 bg-neon-green/[0.04] p-4 text-center">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-neon-green mb-2">5M Chart — Your Entry</p>
        <div className="flex items-center justify-center gap-1">
          {[30, 35, 42, 50, 58, 66, 75].map((h, i) => (
            <div key={i} className="w-3 rounded-t bg-neon-green/40" style={{ height: `${h}%`, minHeight: h * 0.5, borderTop: '2px solid #00ff9d' }} />
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Price resumes trend → ENTER HERE</p>
      </div>
    ),
    'no-trade': (
      <div className="rounded-xl border border-neon-red/20 bg-neon-red/[0.04] p-4 text-center">
        <p className="font-mono-nums text-2xl font-bold text-neon-red">🛑</p>
        <p className="text-[11px] text-slate-400 mt-1">No setup = No trade. Discipline IS the edge.</p>
      </div>
    ),
    ready: (
      <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.04] p-4 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="font-mono-nums text-lg font-bold text-neon-cyan">4H → 1H → 15M → 5M</p>
        <p className="text-[11px] text-slate-400 mt-1">Bias → Indication → Correction → Entry</p>
      </div>
    ),
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: `${current.color}60` }} />
        </div>
        <span className="font-mono-nums text-[10px] text-terminal-muted">{step + 1}/{TUTORIAL_STEPS.length}</span>
        <button onClick={onSkip} className="text-[10px] text-terminal-muted hover:text-white cursor-pointer">Skip tutorial</button>
      </div>

      {/* Content card */}
      <div className="animate-fade-in-up rounded-2xl border bg-terminal-card/20 overflow-hidden" style={{ borderColor: `${current.color}25` }}>
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${current.color}60, ${current.color}20, transparent)` }} />

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-4">
            <span className="font-mono-nums text-[9px] uppercase tracking-widest" style={{ color: current.color }}>{current.subtitle}</span>
            <h2 className="font-display text-2xl font-bold text-white mt-1">{current.title}</h2>
          </div>

          {/* Visual */}
          <div className="mb-5">
            {VISUALS[current.visual]}
          </div>

          {/* Content — render markdown-like bold */}
          <div className="text-[14px] leading-[1.8] text-slate-300 space-y-3">
            {current.content.split('\n\n').map((para, i) => (
              <p key={i} dangerouslySetInnerHTML={{
                __html: para
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                  .replace(/\n/g, '<br/>')
              }} />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="border-t border-terminal-border/20 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
            className="flex items-center gap-1.5 text-[12px] text-terminal-muted hover:text-white disabled:opacity-30 cursor-pointer">
            <ArrowLeft size={14} /> Previous
          </button>

          {/* Step dots */}
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className="h-2 w-2 rounded-full cursor-pointer transition-all"
                style={{ backgroundColor: i <= step ? current.color : '#151d2880' }} />
            ))}
          </div>

          <button onClick={() => isLast ? onComplete() : setStep(step + 1)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-terminal-bg cursor-pointer"
            style={{ backgroundColor: current.color }}>
            {isLast ? 'Start Practicing' : 'Next'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
