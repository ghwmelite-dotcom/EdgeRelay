import { useRef, useEffect, useState } from 'react';
import type { Candle, Position, ClosedTrade } from '@/lib/chart-simulator-engine';
import type { ICCMark } from '@/stores/iccStudio';
import type { Timeframe } from '@/lib/icc-candle-generator';

interface Props {
  candles: Candle[];
  visibleCount: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
  instrument: string;
  timeframe: Timeframe;
  marks: ICCMark[];
  markingMode: 'indication' | 'correction' | 'continuation' | null;
  onMarkRange?: (tf: Timeframe, start: number, end: number) => void;
  showGhost?: boolean;
  ghostRanges?: { indication?: [number, number]; correction?: [number, number]; continuation?: number };
}

const CANDLE_W = 8;
const GAP = 2;
const PADDING = 40;

const MARK_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  indication: { fill: 'rgba(0,229,255,0.12)', stroke: '#00e5ff', label: 'IND' },
  correction: { fill: 'rgba(255,184,0,0.12)', stroke: '#ffb800', label: 'COR' },
  continuation: { fill: 'rgba(0,255,157,0.12)', stroke: '#00ff9d', label: 'CON' },
};

const TF_COLORS: Record<Timeframe, string> = {
  '4H': '#b18cff', '1H': '#00e5ff', '15M': '#ffb800', '5M': '#00ff9d',
};

export function ICCChartCanvas({
  candles, visibleCount, positions, closedTrades, instrument, timeframe,
  marks, markingMode, onMarkRange, showGhost, ghostRanges,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [markStart, setMarkStart] = useState<number | null>(null);
  const visible = candles.slice(0, visibleCount);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollLeft = containerRef.current.scrollWidth;
  }, [visibleCount]);

  if (visible.length === 0) return null;

  const chartW = visible.length * (CANDLE_W + GAP) + PADDING * 2;
  const chartH = 240;

  const allPrices = visible.flatMap(c => [c.h, c.l]);
  positions.forEach(p => { allPrices.push(p.sl, p.tp); });
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 0.001;
  const margin = range * 0.05;

  const toY = (price: number) => PADDING + ((maxP + margin - price) / (range + margin * 2)) * (chartH - PADDING * 2);
  const toX = (i: number) => PADDING + i * (CANDLE_W + GAP);

  const currentPrice = visible[visible.length - 1]?.c || 0;
  const isJPY = instrument.includes('JPY');
  const isGold = instrument.toUpperCase().includes('XAU');
  const isIndex = instrument.includes('NAS') || instrument.includes('US30');
  const decimals = isIndex ? 1 : isGold ? 2 : isJPY ? 3 : 5;

  const handleCandleClick = (index: number) => {
    if (!markingMode || !onMarkRange) return;

    if (markingMode === 'continuation') {
      // Single candle mark
      onMarkRange(timeframe, index, index);
      setMarkStart(null);
      return;
    }

    if (markStart === null) {
      setMarkStart(index);
    } else {
      const start = Math.min(markStart, index);
      const end = Math.max(markStart, index);
      onMarkRange(timeframe, start, end);
      setMarkStart(null);
    }
  };

  // Filter marks for this timeframe
  const tfMarks = marks.filter(m => m.timeframe === timeframe);

  return (
    <div className="relative">
      {/* Timeframe label */}
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <span className="rounded-md px-2 py-0.5 font-mono-nums text-[10px] font-bold" style={{ backgroundColor: `${TF_COLORS[timeframe]}15`, color: TF_COLORS[timeframe], border: `1px solid ${TF_COLORS[timeframe]}30` }}>
          {timeframe}
        </span>
        <span className="font-mono-nums text-[10px] text-terminal-muted">{instrument}</span>
      </div>

      {/* Marking mode indicator */}
      {markingMode && (
        <div className="absolute top-2 right-3 z-10 rounded-md px-2 py-0.5 font-mono-nums text-[9px] animate-pulse"
          style={{ backgroundColor: `${MARK_COLORS[markingMode].stroke}20`, color: MARK_COLORS[markingMode].stroke, border: `1px solid ${MARK_COLORS[markingMode].stroke}40` }}>
          {markStart !== null ? `Tap end candle` : `Tap ${markingMode === 'continuation' ? 'entry' : 'start'} candle`}
        </div>
      )}

      <div ref={containerRef} className="overflow-x-auto rounded-xl border border-terminal-border/30 bg-terminal-bg/80">
        <svg width={chartW} height={chartH} style={{ cursor: markingMode ? 'crosshair' : 'default' }}>
          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => {
            const price = minP + (range * (i + 1)) / 6;
            const y = toY(price);
            return (
              <g key={i}>
                <line x1={PADDING} y1={y} x2={chartW - 10} y2={y} stroke="#151d28" strokeWidth="1" strokeDasharray="4,4" />
                <text x={chartW - 8} y={y + 3} fill="#6b7f95" fontSize="7" fontFamily="monospace" textAnchor="end">{price.toFixed(decimals)}</text>
              </g>
            );
          })}

          {/* ICC Mark overlays */}
          {tfMarks.map((mark, i) => {
            const color = MARK_COLORS[mark.type];
            const x1 = toX(mark.startIndex);
            const x2 = toX(mark.endIndex) + CANDLE_W;
            return (
              <g key={`mark-${i}`}>
                <rect x={x1} y={PADDING - 10} width={x2 - x1} height={chartH - PADDING * 2 + 20} fill={color.fill} rx="4" />
                <line x1={x1} y1={PADDING - 10} x2={x1} y2={chartH - PADDING + 10} stroke={color.stroke} strokeWidth="1.5" strokeDasharray="4,2" />
                <line x1={x2} y1={PADDING - 10} x2={x2} y2={chartH - PADDING + 10} stroke={color.stroke} strokeWidth="1.5" strokeDasharray="4,2" />
                <text x={x1 + 4} y={PADDING - 2} fill={color.stroke} fontSize="8" fontWeight="bold" fontFamily="monospace">{color.label}</text>
              </g>
            );
          })}

          {/* Ghost overlays */}
          {showGhost && ghostRanges && (
            <>
              {ghostRanges.indication && (
                <rect x={toX(ghostRanges.indication[0])} y={PADDING - 10}
                  width={toX(ghostRanges.indication[1]) - toX(ghostRanges.indication[0]) + CANDLE_W}
                  height={chartH - PADDING * 2 + 20} fill="rgba(0,229,255,0.06)" stroke="#00e5ff" strokeWidth="1" strokeDasharray="6,3" rx="4" />
              )}
              {ghostRanges.correction && (
                <rect x={toX(ghostRanges.correction[0])} y={PADDING - 10}
                  width={toX(ghostRanges.correction[1]) - toX(ghostRanges.correction[0]) + CANDLE_W}
                  height={chartH - PADDING * 2 + 20} fill="rgba(255,184,0,0.06)" stroke="#ffb800" strokeWidth="1" strokeDasharray="6,3" rx="4" />
              )}
            </>
          )}

          {/* Mark start indicator (when selecting range) */}
          {markStart !== null && (
            <rect x={toX(markStart) - 1} y={PADDING - 15} width={CANDLE_W + 2} height={chartH - PADDING * 2 + 30}
              fill="none" stroke="#ffffff40" strokeWidth="2" strokeDasharray="4,2" rx="3">
              <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
            </rect>
          )}

          {/* Candles */}
          {visible.map((c, i) => {
            const x = toX(i);
            const isBull = c.c >= c.o;
            const color = isBull ? '#00ff9d' : '#ff3d57';
            const bodyTop = toY(Math.max(c.o, c.c));
            const bodyBottom = toY(Math.min(c.o, c.c));
            const bodyH = Math.max(bodyBottom - bodyTop, 1);

            return (
              <g key={i} onClick={() => handleCandleClick(i)} style={{ cursor: markingMode ? 'crosshair' : 'default' }}>
                <line x1={x + CANDLE_W / 2} y1={toY(c.h)} x2={x + CANDLE_W / 2} y2={toY(c.l)} stroke={color} strokeWidth="1" opacity="0.6" />
                <rect x={x} y={bodyTop} width={CANDLE_W} height={bodyH} fill={`${color}40`} stroke={color} strokeWidth="1" rx="1" />
                {/* Invisible hit area for clicking */}
                {markingMode && <rect x={x - 2} y={0} width={CANDLE_W + 4} height={chartH} fill="transparent" />}
              </g>
            );
          })}

          {/* Current price line */}
          <line x1={PADDING} y1={toY(currentPrice)} x2={chartW - 10} y2={toY(currentPrice)} stroke={TF_COLORS[timeframe]} strokeWidth="1" strokeDasharray="6,3" opacity="0.4" />

          {/* Position SL/TP lines */}
          {positions.map(pos => (
            <g key={pos.id}>
              <line x1={toX(pos.entryIndex)} y1={toY(pos.sl)} x2={chartW - 10} y2={toY(pos.sl)} stroke="#ff3d57" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
              <line x1={toX(pos.entryIndex)} y1={toY(pos.tp)} x2={chartW - 10} y2={toY(pos.tp)} stroke="#00ff9d" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
              <circle cx={toX(pos.entryIndex) + CANDLE_W / 2} cy={toY(pos.entryPrice)} r="4" fill={pos.direction === 'buy' ? '#00ff9d' : '#ff3d57'} stroke="#0a0f16" strokeWidth="1" />
            </g>
          ))}

          {/* Closed trade markers */}
          {closedTrades.slice(-5).map(t => (
            <circle key={t.id} cx={toX(t.exitIndex) + CANDLE_W / 2} cy={toY(t.exitPrice)} r="3"
              fill={t.pnl >= 0 ? '#00ff9d' : '#ff3d57'} opacity="0.5" />
          ))}
        </svg>
      </div>
    </div>
  );
}
