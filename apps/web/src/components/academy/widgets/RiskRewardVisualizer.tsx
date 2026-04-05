import { useState } from 'react';
import { Target } from 'lucide-react';

export function RiskRewardVisualizer() {
  const [entry, setEntry] = useState(100);
  const [sl, setSl] = useState(25);
  const [tp, setTp] = useState(50);

  const rr = sl > 0 ? (tp / sl) : 0;
  const rrColor = rr >= 2 ? '#00ff9d' : rr >= 1.5 ? '#00e5ff' : rr >= 1 ? '#ffb800' : '#ff3d57';

  // Visual bar heights (normalized)
  const maxVal = Math.max(sl, tp, 10);
  const slHeight = (sl / maxVal) * 100;
  const tpHeight = (tp / maxVal) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target size={16} className="text-neon-green" />
        <h4 className="text-sm font-semibold text-white">Risk-to-Reward Visualizer</h4>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Entry Price</label>
          <input type="number" value={entry} onChange={(e) => setEntry(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Stop Loss (pips)</label>
          <input type="range" min="5" max="100" value={sl} onChange={(e) => setSl(parseInt(e.target.value))}
            className="w-full mt-2 accent-neon-red" />
          <p className="text-center font-mono-nums text-[12px] text-neon-red">{sl} pips</p>
        </div>
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Take Profit (pips)</label>
          <input type="range" min="5" max="200" value={tp} onChange={(e) => setTp(parseInt(e.target.value))}
            className="w-full mt-2 accent-neon-green" />
          <p className="text-center font-mono-nums text-[12px] text-neon-green">{tp} pips</p>
        </div>
      </div>

      {/* Visual bars */}
      <div className="flex items-end justify-center gap-8 h-32 pt-4">
        {/* SL bar */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 rounded-t-lg transition-all duration-300" style={{ height: `${slHeight}%`, backgroundColor: '#ff3d5740', borderTop: '3px solid #ff3d57' }} />
          <span className="font-mono-nums text-[10px] text-neon-red">Risk</span>
          <span className="font-mono-nums text-[10px] text-neon-red">{sl}p</span>
        </div>
        {/* Entry line */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-1 h-full bg-terminal-border/30 rounded" />
          <span className="font-mono-nums text-[10px] text-terminal-muted">Entry</span>
        </div>
        {/* TP bar */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 rounded-t-lg transition-all duration-300" style={{ height: `${tpHeight}%`, backgroundColor: '#00ff9d40', borderTop: '3px solid #00ff9d' }} />
          <span className="font-mono-nums text-[10px] text-neon-green">Reward</span>
          <span className="font-mono-nums text-[10px] text-neon-green">{tp}p</span>
        </div>
      </div>

      {/* R:R Display */}
      <div className="rounded-xl border p-4 text-center" style={{ borderColor: `${rrColor}25`, backgroundColor: `${rrColor}05` }}>
        <p className="font-mono-nums text-3xl font-bold" style={{ color: rrColor }}>
          1 : {rr.toFixed(1)}
        </p>
        <p className="text-[11px] text-terminal-muted mt-1">
          {rr >= 2 ? 'Excellent — your potential reward is at least 2× your risk' :
           rr >= 1.5 ? 'Good — favorable risk-to-reward ratio' :
           rr >= 1 ? 'Marginal — consider widening TP or tightening SL' :
           'Poor — you risk more than you stand to gain'}
        </p>
      </div>
    </div>
  );
}
