import { useState, useEffect } from 'react';
import { Play, RotateCcw, AlertTriangle } from 'lucide-react';

const STAGES = [
  { balance: 10000, trade: null, emotion: '😌 Calm', lotSize: '0.10', desc: 'Starting balance. Calm and disciplined.', risk: 'low' },
  { balance: 9750, trade: { dir: 'BUY', pnl: -250 }, emotion: '😐 Slight frustration', lotSize: '0.10', desc: 'Normal loss. -$250. Acceptable with proper risk management.', risk: 'low' },
  { balance: 9350, trade: { dir: 'SELL', pnl: -400 }, emotion: '😤 "I need to make it back"', lotSize: '0.20', desc: 'Doubled position size to recover. Bigger loss. -$400.', risk: 'medium' },
  { balance: 8550, trade: { dir: 'BUY', pnl: -800 }, emotion: '🔥 Full revenge mode', lotSize: '0.50', desc: 'Quadrupled original size. Massive loss. -$800.', risk: 'high' },
  { balance: 7050, trade: { dir: 'SELL', pnl: -1500 }, emotion: '😱 Panic', lotSize: '1.00', desc: '10× original size. Account in freefall. -$1,500.', risk: 'critical' },
  { balance: 7050, trade: null, emotion: '💔 Devastation', lotSize: '-', desc: '-$2,950 total. Started with one normal $250 loss. Revenge trading turned it into a $2,950 disaster.', risk: 'critical' },
];

export function RevengeTradingSpiral() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (stage >= STAGES.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setStage(s => s + 1), 2000);
    return () => clearTimeout(timer);
  }, [playing, stage]);

  const s = STAGES[stage];
  const barPct = (s.balance / 10000) * 100;
  const riskColors: Record<string, string> = { low: '#00ff9d', medium: '#ffb800', high: '#ff3d57', critical: '#ff3d57' };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Micro-Lesson: The Revenge Trading Spiral</p>
        <button onClick={() => { setStage(0); setPlaying(true); }} className="flex h-7 w-7 items-center justify-center rounded-md border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/10 cursor-pointer">
          {stage >= STAGES.length - 1 ? <RotateCcw size={12} /> : <Play size={12} />}
        </button>
      </div>

      {/* Equity bar */}
      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-3">
        <div className="flex justify-between mb-1.5">
          <span className="font-mono-nums text-[10px] text-terminal-muted">Account Equity</span>
          <span className="font-mono-nums text-lg font-bold transition-all duration-700" style={{ color: riskColors[s.risk] }}>
            ${s.balance.toLocaleString()}
          </span>
        </div>
        <div className="h-5 rounded-full bg-terminal-border/20 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, backgroundColor: `${riskColors[s.risk]}50` }} />
        </div>
      </div>

      {/* Trade info */}
      {s.trade && (
        <div className="rounded-lg border border-neon-red/20 bg-neon-red/[0.04] p-3 animate-fade-in-up">
          <div className="flex items-center justify-between font-mono-nums text-[11px]">
            <span className="text-white">{s.trade.dir} @ {s.lotSize} lots</span>
            <span className="text-neon-red font-bold">{s.trade.pnl >= 0 ? '+' : ''}${s.trade.pnl}</span>
          </div>
        </div>
      )}

      {/* Emotion + description */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{s.emotion.split(' ')[0]}</span>
        <div>
          <p className="text-[13px] font-semibold text-white">{s.emotion.substring(s.emotion.indexOf(' ') + 1)}</p>
          <p className="text-[12px] text-slate-400 mt-0.5">{s.desc}</p>
          {s.lotSize !== '-' && (
            <p className="font-mono-nums text-[10px] text-terminal-muted mt-1">Position size: {s.lotSize} lots</p>
          )}
        </div>
      </div>

      {/* Warning at the end */}
      {stage >= STAGES.length - 1 && (
        <div className="rounded-xl border border-neon-amber/20 bg-neon-amber/[0.04] p-3 flex items-start gap-2 animate-fade-in-up">
          <AlertTriangle size={14} className="text-neon-amber shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300">
            <strong className="text-neon-amber">The fix:</strong> After ANY loss, wait 15 minutes before your next trade. Set a daily loss limit. When you hit it, stop. Period.
          </p>
        </div>
      )}

      {/* Stage dots */}
      <div className="flex gap-1.5">
        {STAGES.map((_, i) => (
          <button key={i} onClick={() => setStage(i)}
            className={`h-2 w-2 rounded-full cursor-pointer transition-all ${i <= stage ? `shadow-[0_0_4px_${riskColors[STAGES[i].risk]}]` : ''}`}
            style={{ backgroundColor: i <= stage ? riskColors[STAGES[i].risk] : '#151d2880' }} />
        ))}
      </div>
    </div>
  );
}
