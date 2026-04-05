import { useState, useEffect } from 'react';
import { Play, RotateCcw } from 'lucide-react';

const PRICE_PATH = [
  120, 115, 108, 102, 98, 95, 92, 90, 88, 90, // Drop to support
  94, 98, 103, 108, 112, 118, 122, 126, 130, 133, // Bounce up
  136, 138, 140, 141, 140, 138, 135, 132, 128, 124, // Hit resistance
  120, 116, 112, 108, 104, 100, 96, 93, 91, 90, // Drop back to support
  92, 95, 99, 104, 110, 116, 122, 128, 134, 138, // Break through resistance
  141, 144, 148, 140, 136, 140, 143, 142, 141, 140, // Retest resistance as support
];

export function SupportResistanceBounce() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (frame >= PRICE_PATH.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setFrame(f => f + 1), 120);
    return () => clearTimeout(timer);
  }, [playing, frame]);

  const support = 90;
  const resistance = 140;
  const w = 400;
  const h = 160;
  const toX = (i: number) => (i / (PRICE_PATH.length - 1)) * w;
  const toY = (p: number) => h - ((p - 70) / 90) * h;

  const visible = PRICE_PATH.slice(0, frame + 1);
  const path = visible.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p)}`).join(' ');

  const currentPrice = visible[visible.length - 1];
  const phase = frame < 10 ? 'Approaching support...' :
    frame < 20 ? 'Bouncing off support! 🟢' :
    frame < 30 ? 'Hitting resistance...' :
    frame < 40 ? 'Rejected at resistance 🔴' :
    frame < 50 ? 'Breaking through resistance! 🚀' :
    'Resistance becomes support (role reversal) 💡';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Micro-Lesson: Support & Resistance</p>
        <button onClick={() => { setFrame(0); setPlaying(true); }} className="flex h-7 w-7 items-center justify-center rounded-md border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer">
          {frame >= PRICE_PATH.length - 1 ? <RotateCcw size={12} /> : <Play size={12} />}
        </button>
      </div>

      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
          {/* Support line */}
          <line x1="0" y1={toY(support)} x2={w} y2={toY(support)} stroke="#00ff9d" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
          <text x="4" y={toY(support) - 4} fill="#00ff9d" fontSize="9" fontFamily="monospace">Support</text>

          {/* Resistance line */}
          <line x1="0" y1={toY(resistance)} x2={w} y2={toY(resistance)} stroke="#ff3d57" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
          <text x="4" y={toY(resistance) - 4} fill="#ff3d57" fontSize="9" fontFamily="monospace">Resistance</text>

          {/* Price line */}
          <path d={path} fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />

          {/* Current dot */}
          <circle cx={toX(frame)} cy={toY(currentPrice)} r="4" fill="#00e5ff">
            <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      <p className="text-[12px] text-slate-300 font-medium">{phase}</p>
      <div className="h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
        <div className="h-full rounded-full bg-neon-cyan/50 transition-all duration-100" style={{ width: `${(frame / (PRICE_PATH.length - 1)) * 100}%` }} />
      </div>
    </div>
  );
}
