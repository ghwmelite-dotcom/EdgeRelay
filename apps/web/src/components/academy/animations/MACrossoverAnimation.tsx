import { useState, useEffect } from 'react';
import { Play, RotateCcw } from 'lucide-react';

// Pre-computed price + MA data for smooth animation
const DATA = Array.from({ length: 60 }, (_, i) => {
  const trend = Math.sin(i * 0.12) * 30;
  const noise = Math.sin(i * 0.5) * 8 + Math.cos(i * 0.3) * 5;
  const price = 100 + trend + noise;
  return price;
});

function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

const FAST_MA = sma(DATA, 5);
const SLOW_MA = sma(DATA, 15);

// Find crossovers
const SIGNALS: Array<{ index: number; type: 'buy' | 'sell' }> = [];
for (let i = 1; i < DATA.length; i++) {
  if (FAST_MA[i] !== null && SLOW_MA[i] !== null && FAST_MA[i - 1] !== null && SLOW_MA[i - 1] !== null) {
    if (FAST_MA[i - 1]! <= SLOW_MA[i - 1]! && FAST_MA[i]! > SLOW_MA[i]!) SIGNALS.push({ index: i, type: 'buy' });
    if (FAST_MA[i - 1]! >= SLOW_MA[i - 1]! && FAST_MA[i]! < SLOW_MA[i]!) SIGNALS.push({ index: i, type: 'sell' });
  }
}

export function MACrossoverAnimation() {
  const [frame, setFrame] = useState(15); // Start after slow MA is available
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (frame >= DATA.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setFrame(f => f + 1), 150);
    return () => clearTimeout(timer);
  }, [playing, frame]);

  const w = 400;
  const h = 140;
  const minP = Math.min(...DATA) - 5;
  const maxP = Math.max(...DATA) + 5;
  const toX = (i: number) => (i / (DATA.length - 1)) * w;
  const toY = (p: number) => h - ((p - minP) / (maxP - minP)) * h;

  const pricePath = DATA.slice(0, frame + 1).map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p)}`).join(' ');
  const fastPath = FAST_MA.slice(0, frame + 1).filter((v, i) => v !== null && i <= frame).map((p, i) => {
    const idx = FAST_MA.indexOf(p, i);
    return `${i === 0 ? 'M' : 'L'} ${toX(idx >= 0 ? idx : i + 4)} ${toY(p!)}`;
  }).join(' ');
  const slowPath = SLOW_MA.slice(0, frame + 1).filter((v, i) => v !== null && i <= frame).map((p, i) => {
    const idx = SLOW_MA.indexOf(p, i);
    return `${i === 0 ? 'M' : 'L'} ${toX(idx >= 0 ? idx : i + 14)} ${toY(p!)}`;
  }).join(' ');

  const visibleSignals = SIGNALS.filter(s => s.index <= frame);
  const latestSignal = visibleSignals[visibleSignals.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Micro-Lesson: MA Crossover Signals</p>
        <button onClick={() => { setFrame(15); setPlaying(true); }} className="flex h-7 w-7 items-center justify-center rounded-md border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer">
          {frame >= DATA.length - 1 ? <RotateCcw size={12} /> : <Play size={12} />}
        </button>
      </div>

      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
          <path d={pricePath} fill="none" stroke="#6b7f9530" strokeWidth="1" />
          <path d={fastPath} fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.8" />
          <path d={slowPath} fill="none" stroke="#ffb800" strokeWidth="1.5" opacity="0.8" />

          {visibleSignals.map((s, i) => (
            <g key={i}>
              <circle cx={toX(s.index)} cy={toY(DATA[s.index])} r="6"
                fill={s.type === 'buy' ? '#00ff9d' : '#ff3d57'} opacity="0.8">
                {s === latestSignal && <animate attributeName="r" values="6;9;6" dur="0.8s" repeatCount="3" />}
              </circle>
              <text x={toX(s.index)} y={toY(DATA[s.index]) - 10}
                fill={s.type === 'buy' ? '#00ff9d' : '#ff3d57'} fontSize="8" textAnchor="middle" fontWeight="bold">
                {s.type === 'buy' ? 'BUY' : 'SELL'}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-neon-cyan rounded" /> Fast MA (5)</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-neon-amber rounded" /> Slow MA (15)</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon-green" /> Buy Signal</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon-red" /> Sell Signal</span>
      </div>

      {latestSignal && (
        <div className={`rounded-lg border p-2.5 text-[11px] ${latestSignal.type === 'buy' ? 'border-neon-green/20 bg-neon-green/[0.04] text-neon-green' : 'border-neon-red/20 bg-neon-red/[0.04] text-neon-red'}`}>
          {latestSignal.type === 'buy' ? '🟢 Golden Cross — Fast MA crossed above Slow MA. Bullish signal.' : '🔴 Death Cross — Fast MA crossed below Slow MA. Bearish signal.'}
        </div>
      )}
    </div>
  );
}
