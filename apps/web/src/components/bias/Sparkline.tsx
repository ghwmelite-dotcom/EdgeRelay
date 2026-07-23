// Tiny inline SVG sparkline. Auto-scales to the container, strokes in the
// trend color (green/red/muted) and stamps a subtle end-dot.
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 64,
  height = 22,
  color,
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ width, height }} className={className} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const trend = data[data.length - 1]! - data[0]!;
  const stroke = color ?? (trend > 0 ? '#00ff9d' : trend < 0 ? '#ff3d57' : '#a3a3a3');

  const lastX = (data.length - 1) * stepX;
  const lastY = height - ((data[data.length - 1]! - min) / range) * height;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{ filter: `drop-shadow(0 0 3px ${stroke}55)` }}
      />
      <circle cx={lastX} cy={lastY} r={1.8} fill={stroke} />
    </svg>
  );
}
