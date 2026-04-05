import { useState, useEffect } from 'react';
import { Play, RotateCcw } from 'lucide-react';

const STAGES = [
  { label: 'Market opens', open: 100, close: 100, high: 100, low: 100, desc: 'The candle starts at the opening price.' },
  { label: 'Buyers push up', open: 100, close: 100, high: 130, low: 100, desc: 'Buyers enter, pushing price to the high of the period.' },
  { label: 'Sellers fight back', open: 100, close: 100, high: 130, low: 75, desc: 'Sellers push price down past the open, creating the lower wick.' },
  { label: 'Buyers recover', open: 100, close: 120, high: 130, low: 75, desc: 'Buyers regain control. Price closes above the open — bullish candle.' },
  { label: 'Candle complete', open: 100, close: 120, high: 130, low: 75, desc: 'Green body = close > open. Wicks show the full battle range.' },
];

export function CandlestickForming() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (stage >= STAGES.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setStage(s => s + 1), 1500);
    return () => clearTimeout(timer);
  }, [playing, stage]);

  const s = STAGES[stage];
  const h = 160;
  const toY = (v: number) => h - v;
  const bodyTop = toY(Math.max(s.open, s.close));
  const bodyBottom = toY(Math.min(s.open, s.close));
  const bodyH = Math.max(bodyBottom - bodyTop, 2);
  const isBull = s.close >= s.open;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Micro-Lesson: How a Candle Forms</p>
        <div className="flex gap-1.5">
          <button onClick={() => { setStage(0); setPlaying(true); }} className="flex h-7 w-7 items-center justify-center rounded-md border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer">
            {stage >= STAGES.length - 1 ? <RotateCcw size={12} /> : <Play size={12} />}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-center">
        {/* SVG Candle */}
        <svg width="80" height="180" viewBox="0 0 80 180" className="shrink-0">
          {/* Grid */}
          <line x1="0" y1={toY(100)} x2="80" y2={toY(100)} stroke="#151d28" strokeWidth="1" strokeDasharray="4,4" />
          <text x="78" y={toY(100) - 4} fill="#6b7f95" fontSize="8" textAnchor="end">Open</text>

          {/* Upper wick */}
          <line x1="40" y1={toY(s.high)} x2="40" y2={bodyTop}
            stroke={isBull ? '#00ff9d' : '#ff3d57'} strokeWidth="2"
            className="transition-all duration-700" />

          {/* Body */}
          <rect x="20" y={bodyTop} width="40" height={bodyH}
            fill={isBull ? '#00ff9d25' : '#ff3d5725'} stroke={isBull ? '#00ff9d' : '#ff3d57'} strokeWidth="2" rx="2"
            className="transition-all duration-700" />

          {/* Lower wick */}
          <line x1="40" y1={bodyBottom} x2="40" y2={toY(s.low)}
            stroke={isBull ? '#00ff9d' : '#ff3d57'} strokeWidth="2"
            className="transition-all duration-700" />

          {/* Labels */}
          {stage >= 4 && (
            <>
              <text x="68" y={toY(s.high) + 3} fill="#00ff9d" fontSize="7" fontFamily="monospace">High</text>
              <text x="68" y={toY(s.low) + 3} fill="#ff3d57" fontSize="7" fontFamily="monospace">Low</text>
              <text x="68" y={bodyTop - 2} fill="#00ff9d" fontSize="7" fontFamily="monospace">Close</text>
            </>
          )}
        </svg>

        {/* Description */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{s.label}</p>
          <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">{s.desc}</p>
          {/* Stage dots */}
          <div className="mt-3 flex gap-1.5">
            {STAGES.map((_, i) => (
              <button key={i} onClick={() => setStage(i)}
                className={`h-2 w-2 rounded-full cursor-pointer transition-all ${i <= stage ? 'bg-neon-cyan shadow-[0_0_4px_#00e5ff]' : 'bg-terminal-border/40'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
