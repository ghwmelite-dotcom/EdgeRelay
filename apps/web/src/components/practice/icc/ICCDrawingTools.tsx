import { useState } from 'react';
import { Minus, GitBranch, TrendingUp, Trash2 } from 'lucide-react';

export type DrawingType = 'trendline' | 'horizontal' | 'fibonacci';

export interface DrawingObject {
  id: string;
  type: DrawingType;
  /** Candle indices */
  startIndex: number;
  endIndex: number;
  /** Price levels */
  startPrice: number;
  endPrice: number;
  color: string;
  timeframe: string;
}

interface Props {
  activeDrawing: DrawingType | null;
  onSelectTool: (tool: DrawingType | null) => void;
  drawings: DrawingObject[];
  onClearDrawings: () => void;
  onDeleteDrawing: (id: string) => void;
}

const TOOLS: { type: DrawingType; icon: typeof Minus; label: string; color: string }[] = [
  { type: 'trendline', icon: TrendingUp, label: 'Trendline', color: '#00e5ff' },
  { type: 'horizontal', icon: Minus, label: 'S/R Level', color: '#ffb800' },
  { type: 'fibonacci', icon: GitBranch, label: 'Fibonacci', color: '#b18cff' },
];

export function ICCDrawingToolbar({ activeDrawing, onSelectTool, drawings, onClearDrawings, onDeleteDrawing }: Props) {
  const [showList, setShowList] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono-nums text-[9px] uppercase tracking-wider text-terminal-muted hidden sm:inline">Draw:</span>
      {TOOLS.map(t => {
        const active = activeDrawing === t.type;
        return (
          <button
            key={t.type}
            onClick={() => onSelectTool(active ? null : t.type)}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold cursor-pointer transition-all ${
              active
                ? 'border shadow-[0_0_12px_var(--glow)]'
                : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
            }`}
            style={active ? {
              borderColor: `${t.color}40`,
              backgroundColor: `${t.color}12`,
              color: t.color,
              '--glow': `${t.color}20`,
            } as React.CSSProperties : undefined}
          >
            <t.icon size={10} /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}

      {drawings.length > 0 && (
        <>
          <button
            onClick={() => setShowList(!showList)}
            className="font-mono-nums text-[9px] text-terminal-muted hover:text-white cursor-pointer"
          >
            {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
          </button>
          <button
            onClick={onClearDrawings}
            className="text-[10px] text-terminal-muted hover:text-neon-red cursor-pointer"
          >
            <Trash2 size={10} />
          </button>
        </>
      )}

      {/* Drawing list popover */}
      {showList && drawings.length > 0 && (
        <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-terminal-border/40 bg-terminal-card p-2 shadow-xl min-w-[180px]">
          {drawings.map(d => (
            <div key={d.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-terminal-bg/50 group">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-slate-300 capitalize">{d.type}</span>
                <span className="text-[9px] text-terminal-muted">{d.timeframe}</span>
              </div>
              <button
                onClick={() => onDeleteDrawing(d.id)}
                className="text-terminal-muted hover:text-neon-red opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** SVG overlay for rendering drawings on a chart */
export function DrawingOverlay({
  drawings,
  timeframe,
  chartWidth,
  chartHeight,
  candleWidth,
  visibleStart,
  visibleCount,
  priceToY,
}: {
  drawings: DrawingObject[];
  timeframe: string;
  chartWidth: number;
  chartHeight: number;
  candleWidth: number;
  visibleStart: number;
  visibleCount: number;
  priceToY: (price: number) => number;
}) {
  const tfDrawings = drawings.filter(d => d.timeframe === timeframe);
  if (tfDrawings.length === 0) return null;

  const indexToX = (idx: number) => (idx - visibleStart + 0.5) * candleWidth;

  return (
    <g className="drawing-overlay">
      {tfDrawings.map(d => {
        if (d.type === 'horizontal') {
          const y = priceToY(d.startPrice);
          return (
            <g key={d.id}>
              <line x1={0} x2={chartWidth} y1={y} y2={y}
                stroke={d.color} strokeWidth={1} strokeDasharray="6,3" opacity={0.7} />
              <text x={4} y={y - 4} fill={d.color} fontSize={9} fontFamily="monospace" opacity={0.8}>
                S/R {d.startPrice.toFixed(d.startPrice > 100 ? 1 : 4)}
              </text>
            </g>
          );
        }

        if (d.type === 'trendline') {
          const x1 = indexToX(d.startIndex);
          const y1 = priceToY(d.startPrice);
          const x2 = indexToX(d.endIndex);
          const y2 = priceToY(d.endPrice);
          return (
            <g key={d.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={d.color} strokeWidth={1.5} opacity={0.8} />
              <circle cx={x1} cy={y1} r={3} fill={d.color} opacity={0.6} />
              <circle cx={x2} cy={y2} r={3} fill={d.color} opacity={0.6} />
            </g>
          );
        }

        if (d.type === 'fibonacci') {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const range = d.endPrice - d.startPrice;
          return (
            <g key={d.id}>
              {levels.map(level => {
                const price = d.startPrice + range * level;
                const y = priceToY(price);
                const opacity = level === 0 || level === 1 ? 0.8 : 0.5;
                return (
                  <g key={level}>
                    <line x1={0} x2={chartWidth} y1={y} y2={y}
                      stroke={d.color} strokeWidth={0.8} strokeDasharray="4,4" opacity={opacity} />
                    <text x={chartWidth - 60} y={y - 3} fill={d.color} fontSize={8} fontFamily="monospace" opacity={0.7}>
                      {(level * 100).toFixed(1)}%
                    </text>
                  </g>
                );
              })}
              {/* Shaded area between 0.382 and 0.618 */}
              <rect
                x={0} width={chartWidth}
                y={priceToY(d.startPrice + range * 0.618)}
                height={Math.abs(priceToY(d.startPrice + range * 0.382) - priceToY(d.startPrice + range * 0.618))}
                fill={d.color} opacity={0.04}
              />
            </g>
          );
        }

        return null;
      })}
    </g>
  );
}
