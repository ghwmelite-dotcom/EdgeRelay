import { useState, useEffect } from 'react';
import { Play, RotateCcw } from 'lucide-react';

interface TradeStep {
  tradeNum: number;
  riskPct: number;
  balance: number;
  loss: number;
  cumLoss: number;
  recoveryNeeded: number;
}

function buildScenario(startBalance: number, riskPct: number, losses: number): TradeStep[] {
  const steps: TradeStep[] = [];
  let balance = startBalance;
  let cumLoss = 0;
  for (let i = 1; i <= losses; i++) {
    const loss = balance * (riskPct / 100);
    balance -= loss;
    cumLoss += loss;
    const recoveryNeeded = ((startBalance / balance) - 1) * 100;
    steps.push({ tradeNum: i, riskPct, balance: Math.round(balance * 100) / 100, loss: Math.round(loss * 100) / 100, cumLoss: Math.round(cumLoss * 100) / 100, recoveryNeeded: Math.round(recoveryNeeded * 10) / 10 });
  }
  return steps;
}

const SAFE = buildScenario(10000, 1, 5);
const DANGER = buildScenario(10000, 5, 5);

export function RiskMathAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<'safe' | 'danger'>('danger');

  const data = mode === 'safe' ? SAFE : DANGER;

  useEffect(() => {
    if (!playing) return;
    if (step >= data.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setStep(s => s + 1), 1200);
    return () => clearTimeout(timer);
  }, [playing, step, data.length]);

  const current = data[step];
  const barPct = (current.balance / 10000) * 100;
  const barColor = barPct > 80 ? '#00ff9d' : barPct > 60 ? '#ffb800' : '#ff3d57';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Micro-Lesson: The Math of Risk</p>
        <div className="flex gap-1.5">
          <button onClick={() => setMode(mode === 'safe' ? 'danger' : 'safe')}
            className={`rounded-md px-2 py-1 font-mono-nums text-[9px] cursor-pointer ${mode === 'safe' ? 'bg-neon-green/15 border border-neon-green/25 text-neon-green' : 'bg-neon-red/15 border border-neon-red/25 text-neon-red'}`}>
            {mode === 'safe' ? '1% Risk' : '5% Risk'}
          </button>
          <button onClick={() => { setStep(0); setPlaying(true); }} className="flex h-7 w-7 items-center justify-center rounded-md border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer">
            {step >= data.length - 1 ? <RotateCcw size={12} /> : <Play size={12} />}
          </button>
        </div>
      </div>

      {/* Equity bar */}
      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono-nums text-[11px] text-terminal-muted">Account Balance</span>
          <span className="font-mono-nums text-lg font-bold transition-colors duration-500" style={{ color: barColor }}>
            ${current.balance.toLocaleString()}
          </span>
        </div>
        <div className="h-6 rounded-full bg-terminal-border/20 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, backgroundColor: `${barColor}60`, boxShadow: `0 0 8px ${barColor}30` }} />
        </div>
        <div className="mt-2 flex justify-between font-mono-nums text-[9px] text-terminal-muted">
          <span>$0</span>
          <span>$10,000</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2">
          <p className="font-mono-nums text-sm font-bold text-neon-red">-${current.cumLoss.toLocaleString()}</p>
          <p className="text-[8px] text-terminal-muted">Total Lost</p>
        </div>
        <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2">
          <p className="font-mono-nums text-sm font-bold text-neon-amber">{current.recoveryNeeded}%</p>
          <p className="text-[8px] text-terminal-muted">To Recover</p>
        </div>
        <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2">
          <p className="font-mono-nums text-sm font-bold text-white">{current.tradeNum}/5</p>
          <p className="text-[8px] text-terminal-muted">Losses</p>
        </div>
      </div>

      <p className="text-[11px] text-terminal-muted">
        {mode === 'danger'
          ? `At 5% risk, 5 consecutive losses costs $${current.cumLoss.toLocaleString()} and needs ${current.recoveryNeeded}% gain to recover.`
          : `At 1% risk, 5 consecutive losses costs only $${current.cumLoss.toLocaleString()} — easily recoverable.`}
      </p>
    </div>
  );
}
