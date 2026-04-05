import { useState, useMemo } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Generate sample price data with a trend
function generatePriceData(length: number): number[] {
  const prices: number[] = [1.1000];
  for (let i = 1; i < length; i++) {
    const trend = Math.sin(i * 0.08) * 0.003;
    const noise = (Math.random() - 0.5) * 0.002;
    prices.push(prices[i - 1] + trend + noise);
  }
  return prices;
}

function calculateMA(prices: number[], period: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    return sum / period;
  });
}

const PRICE_DATA = generatePriceData(80);

export function MovingAverageCrossover() {
  const [fastPeriod, setFastPeriod] = useState(9);
  const [slowPeriod, setSlowPeriod] = useState(21);

  const fastMA = useMemo(() => calculateMA(PRICE_DATA, fastPeriod), [fastPeriod]);
  const slowMA = useMemo(() => calculateMA(PRICE_DATA, slowPeriod), [slowPeriod]);

  // Find crossover signals
  const signals = useMemo(() => {
    const sigs: Array<{ index: number; type: 'buy' | 'sell'; price: number }> = [];
    for (let i = 1; i < PRICE_DATA.length; i++) {
      if (fastMA[i] === null || slowMA[i] === null || fastMA[i - 1] === null || slowMA[i - 1] === null) continue;
      if (fastMA[i - 1]! <= slowMA[i - 1]! && fastMA[i]! > slowMA[i]!) {
        sigs.push({ index: i, type: 'buy', price: PRICE_DATA[i] });
      } else if (fastMA[i - 1]! >= slowMA[i - 1]! && fastMA[i]! < slowMA[i]!) {
        sigs.push({ index: i, type: 'sell', price: PRICE_DATA[i] });
      }
    }
    return sigs;
  }, [fastMA, slowMA]);

  // SVG dimensions
  const w = 600;
  const h = 180;
  const minP = Math.min(...PRICE_DATA) - 0.001;
  const maxP = Math.max(...PRICE_DATA) + 0.001;
  const toX = (i: number) => (i / (PRICE_DATA.length - 1)) * w;
  const toY = (p: number) => h - ((p - minP) / (maxP - minP)) * h;

  const pricePath = PRICE_DATA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p)}`).join(' ');
  const fastPath = fastMA.map((p, i) => p !== null ? `${fastMA.slice(0, i).filter(Boolean).length === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p)}` : '').filter(Boolean).join(' ');
  const slowPath = slowMA.map((p, i) => p !== null ? `${slowMA.slice(0, i).filter(Boolean).length === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p)}` : '').filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-neon-cyan" />
          <h4 className="text-sm font-semibold text-white">Moving Average Crossover Simulator</h4>
        </div>
      </div>

      {/* Period controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center justify-between text-[11px] text-terminal-muted mb-1">
            <span>Fast MA Period</span>
            <span className="font-mono-nums text-neon-cyan">{fastPeriod}</span>
          </label>
          <input type="range" min="3" max="30" value={fastPeriod} onChange={(e) => setFastPeriod(parseInt(e.target.value))}
            className="w-full accent-[#00e5ff]" />
        </div>
        <div>
          <label className="flex items-center justify-between text-[11px] text-terminal-muted mb-1">
            <span>Slow MA Period</span>
            <span className="font-mono-nums text-neon-amber">{slowPeriod}</span>
          </label>
          <input type="range" min="10" max="50" value={slowPeriod} onChange={(e) => setSlowPeriod(parseInt(e.target.value))}
            className="w-full accent-[#ffb800]" />
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-3 overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44" preserveAspectRatio="none">
          {/* Price line */}
          <path d={pricePath} fill="none" stroke="#6b7f9540" strokeWidth="1" />

          {/* Fast MA */}
          <path d={fastPath} fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.8" />

          {/* Slow MA */}
          <path d={slowPath} fill="none" stroke="#ffb800" strokeWidth="1.5" opacity="0.8" />

          {/* Crossover signals */}
          {signals.map((s, i) => (
            <g key={i}>
              <circle cx={toX(s.index)} cy={toY(s.price)} r="5" fill={s.type === 'buy' ? '#00ff9d' : '#ff3d57'} opacity="0.9" />
              <circle cx={toX(s.index)} cy={toY(s.price)} r="8" fill="none" stroke={s.type === 'buy' ? '#00ff9d' : '#ff3d57'} strokeWidth="1" opacity="0.4" />
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px]">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#6b7f9540] rounded" /> Price</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-neon-cyan rounded" /> Fast MA ({fastPeriod})</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-neon-amber rounded" /> Slow MA ({slowPeriod})</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon-green" /> Buy</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon-red" /> Sell</span>
      </div>

      {/* Signals list */}
      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-3">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Detected Signals ({signals.length})</p>
        <div className="flex flex-wrap gap-2">
          {signals.map((s, i) => (
            <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono-nums text-[10px] ${s.type === 'buy' ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green' : 'bg-neon-red/10 border border-neon-red/20 text-neon-red'}`}>
              {s.type === 'buy' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {s.type.toUpperCase()} @ {s.price.toFixed(4)}
            </span>
          ))}
          {signals.length === 0 && <span className="text-[11px] text-terminal-muted">No crossovers detected — try adjusting periods</span>}
        </div>
      </div>

      <p className="text-[11px] text-terminal-muted">
        Drag the sliders to see how different MA periods produce different signals. A shorter fast MA reacts quickly but gives more false signals. A longer slow MA filters noise but enters late.
      </p>
    </div>
  );
}
