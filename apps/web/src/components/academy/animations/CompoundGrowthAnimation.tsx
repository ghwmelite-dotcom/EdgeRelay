import { useState, useEffect } from 'react';
import { Play, RotateCcw, TrendingUp } from 'lucide-react';

const MONTHS = 24;
const MONTHLY_RETURN = 0.05; // 5%
const START = 10000;

const DATA = Array.from({ length: MONTHS + 1 }, (_, i) => ({
  month: i,
  balance: START * Math.pow(1 + MONTHLY_RETURN, i),
}));

export function CompoundGrowthAnimation() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (frame >= DATA.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setFrame(f => f + 1), 200);
    return () => clearTimeout(timer);
  }, [playing, frame]);

  const w = 360;
  const h = 140;
  const maxBal = DATA[DATA.length - 1].balance;
  const toX = (i: number) => (i / MONTHS) * w;
  const toY = (b: number) => h - ((b - START * 0.8) / (maxBal * 1.1 - START * 0.8)) * h;

  const visible = DATA.slice(0, frame + 1);
  const path = visible.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(d.month)} ${toY(d.balance)}`).join(' ');
  const areaPath = path + ` L ${toX(visible[visible.length - 1].month)} ${h} L 0 ${h} Z`;

  const current = visible[visible.length - 1];
  const profit = current.balance - START;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Micro-Lesson: The Power of Compounding</p>
        <button onClick={() => { setFrame(0); setPlaying(true); }} className="flex h-7 w-7 items-center justify-center rounded-md border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer">
          {frame >= DATA.length - 1 ? <RotateCcw size={12} /> : <Play size={12} />}
        </button>
      </div>

      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
          {/* Area fill */}
          <path d={areaPath} fill="url(#compoundGrad)" opacity="0.3" />
          <defs>
            <linearGradient id="compoundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff9d" />
              <stop offset="100%" stopColor="#00ff9d" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Line */}
          <path d={path} fill="none" stroke="#00ff9d" strokeWidth="2" strokeLinecap="round" />

          {/* Start line */}
          <line x1="0" y1={toY(START)} x2={w} y2={toY(START)} stroke="#6b7f95" strokeWidth="0.5" strokeDasharray="4,4" />
          <text x={w - 2} y={toY(START) - 4} fill="#6b7f95" fontSize="7" textAnchor="end">$10K start</text>

          {/* Current dot */}
          <circle cx={toX(current.month)} cy={toY(current.balance)} r="4" fill="#00ff9d">
            <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
          </circle>

          {/* Current value label */}
          <text x={toX(current.month)} y={toY(current.balance) - 10}
            fill="#00ff9d" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
            ${Math.round(current.balance).toLocaleString()}
          </text>
        </svg>
        <div className="flex justify-between font-mono-nums text-[8px] text-terminal-muted mt-1">
          <span>Month 0</span>
          <span>Month {MONTHS}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2">
          <p className="font-mono-nums text-sm font-bold text-white">Month {current.month}</p>
          <p className="text-[8px] text-terminal-muted">Current</p>
        </div>
        <div className="rounded-lg bg-terminal-bg/50 border border-neon-green/20 p-2">
          <p className="font-mono-nums text-sm font-bold text-neon-green">${Math.round(current.balance).toLocaleString()}</p>
          <p className="text-[8px] text-terminal-muted">Balance</p>
        </div>
        <div className="rounded-lg bg-terminal-bg/50 border border-neon-cyan/20 p-2">
          <p className="font-mono-nums text-sm font-bold text-neon-cyan">+${Math.round(profit).toLocaleString()}</p>
          <p className="text-[8px] text-terminal-muted">Profit</p>
        </div>
      </div>

      <p className="text-[11px] text-terminal-muted">
        {frame >= DATA.length - 1
          ? `$10,000 → $${Math.round(current.balance).toLocaleString()} in ${MONTHS} months at just 5% monthly. Consistency beats heroics.`
          : '5% per month doesn\'t sound like much. Watch what happens when it compounds...'}
      </p>
    </div>
  );
}
