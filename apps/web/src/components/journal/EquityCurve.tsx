import type { DailyPnl } from '@/stores/journal';

interface EquityCurveProps {
  data: DailyPnl[];
  height?: number;
}

const VIEW_WIDTH = 800;

export function EquityCurve({ data, height = 200 }: EquityCurveProps) {
  if (data.length === 0) {
    return (
      <svg
        width="100%"
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Equity curve chart — no data"
      >
        <text
          x={VIEW_WIDTH / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#64748b"
          fontSize="14"
        >
          No data
        </text>
      </svg>
    );
  }

  const padding = { top: 16, right: 16, bottom: 16, left: 16 };
  const chartW = VIEW_WIDTH - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.cumulative_profit);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin || 1;
  const yPad = range * 0.1;
  const yMin = rawMin - yPad;
  const yMax = rawMax + yPad;

  const toX = (i: number) =>
    padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);

  const toY = (v: number) =>
    padding.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.cumulative_profit)}`);
  const polylinePoints = points.join(' ');

  // Area polygon: line points + bottom-right + bottom-left
  const areaPoints = [
    ...points,
    `${toX(data.length - 1)},${padding.top + chartH}`,
    `${toX(0)},${padding.top + chartH}`,
  ].join(' ');

  // Zero line Y position (clamped to chart area)
  const zeroY = Math.max(padding.top, Math.min(padding.top + chartH, toY(0)));

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Equity curve chart"
    >
      <defs>
        <filter id="eq-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="eq-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.19" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Zero line */}
      <line
        x1={padding.left}
        y1={zeroY}
        x2={VIEW_WIDTH - padding.right}
        y2={zeroY}
        stroke="#ffffff15"
        strokeWidth="1"
        strokeDasharray="6 4"
      />

      {/* Area fill */}
      <polygon points={areaPoints} fill="url(#eq-area-grad)" />

      {/* Line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#eq-glow)"
      />
    </svg>
  );
}
