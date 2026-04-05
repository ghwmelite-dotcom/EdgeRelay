import { useRef, useEffect } from 'react';
import type { Candle, Position, ClosedTrade } from '@/lib/chart-simulator-engine';

interface Props {
  candles: Candle[];
  visibleCount: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
  instrument: string;
}

const CANDLE_W = 10;
const GAP = 3;
const PADDING = 40;

export function ChartCanvas({ candles, visibleCount, positions, closedTrades, instrument }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visible = candles.slice(0, visibleCount);

  // Auto-scroll to latest candle
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [visibleCount]);

  if (visible.length === 0) return null;

  const chartW = visible.length * (CANDLE_W + GAP) + PADDING * 2;
  const chartH = 300;

  // Price range
  const allPrices = visible.flatMap(c => [c.h, c.l]);
  positions.forEach(p => { allPrices.push(p.sl, p.tp); });
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 0.001;
  const margin = range * 0.05;

  const toY = (price: number) => {
    return PADDING + ((maxP + margin - price) / (range + margin * 2)) * (chartH - PADDING * 2);
  };
  const toX = (i: number) => PADDING + i * (CANDLE_W + GAP);

  const currentPrice = visible[visible.length - 1]?.c || 0;
  const isGold = instrument.toUpperCase().includes('XAU');
  const isIndex = instrument.toUpperCase().includes('NAS') || instrument.toUpperCase().includes('US30');
  const decimals = isIndex ? 1 : isGold ? 2 : 5;

  return (
    <div ref={containerRef} className="overflow-x-auto rounded-xl border border-terminal-border/30 bg-terminal-bg/80">
      <svg width={chartW} height={chartH} className="min-h-[250px]">
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const price = minP + (range * (i + 1)) / 6;
          const y = toY(price);
          return (
            <g key={i}>
              <line x1={PADDING} y1={y} x2={chartW - 10} y2={y} stroke="#151d28" strokeWidth="1" strokeDasharray="4,4" />
              <text x={chartW - 8} y={y + 3} fill="#6b7f95" fontSize="8" fontFamily="monospace" textAnchor="end">
                {price.toFixed(decimals)}
              </text>
            </g>
          );
        })}

        {/* Candles */}
        {visible.map((c, i) => {
          const x = toX(i);
          const isBull = c.c >= c.o;
          const color = isBull ? '#00ff9d' : '#ff3d57';
          const bodyTop = toY(Math.max(c.o, c.c));
          const bodyBottom = toY(Math.min(c.o, c.c));
          const bodyH = Math.max(bodyBottom - bodyTop, 1);

          return (
            <g key={i}>
              {/* Wick */}
              <line x1={x + CANDLE_W / 2} y1={toY(c.h)} x2={x + CANDLE_W / 2} y2={toY(c.l)} stroke={color} strokeWidth="1" opacity="0.6" />
              {/* Body */}
              <rect x={x} y={bodyTop} width={CANDLE_W} height={bodyH} fill={isBull ? `${color}40` : `${color}40`} stroke={color} strokeWidth="1" rx="1" />
            </g>
          );
        })}

        {/* Current price line */}
        <line x1={PADDING} y1={toY(currentPrice)} x2={chartW - 10} y2={toY(currentPrice)} stroke="#00e5ff" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
        <rect x={PADDING - 2} y={toY(currentPrice) - 8} width={55} height={16} rx="3" fill="#00e5ff20" stroke="#00e5ff40" strokeWidth="0.5" />
        <text x={PADDING + 2} y={toY(currentPrice) + 4} fill="#00e5ff" fontSize="9" fontFamily="monospace">{currentPrice.toFixed(decimals)}</text>

        {/* Position SL/TP lines */}
        {positions.map((pos) => (
          <g key={pos.id}>
            {/* SL line */}
            <line x1={toX(pos.entryIndex)} y1={toY(pos.sl)} x2={chartW - 10} y2={toY(pos.sl)} stroke="#ff3d57" strokeWidth="1" strokeDasharray="4,4" opacity="0.7" />
            <text x={chartW - 8} y={toY(pos.sl) - 3} fill="#ff3d57" fontSize="8" fontFamily="monospace" textAnchor="end">SL</text>
            {/* TP line */}
            <line x1={toX(pos.entryIndex)} y1={toY(pos.tp)} x2={chartW - 10} y2={toY(pos.tp)} stroke="#00ff9d" strokeWidth="1" strokeDasharray="4,4" opacity="0.7" />
            <text x={chartW - 8} y={toY(pos.tp) - 3} fill="#00ff9d" fontSize="8" fontFamily="monospace" textAnchor="end">TP</text>
            {/* Entry marker */}
            <circle cx={toX(pos.entryIndex) + CANDLE_W / 2} cy={toY(pos.entryPrice)} r="4" fill={pos.direction === 'buy' ? '#00ff9d' : '#ff3d57'} stroke="#0a0f16" strokeWidth="1" />
          </g>
        ))}

        {/* Closed trade markers */}
        {closedTrades.slice(-10).map((t) => (
          <g key={t.id}>
            <circle cx={toX(t.exitIndex) + CANDLE_W / 2} cy={toY(t.exitPrice)} r="3"
              fill={t.pnl >= 0 ? '#00ff9d' : '#ff3d57'} opacity="0.5" />
          </g>
        ))}
      </svg>
    </div>
  );
}
