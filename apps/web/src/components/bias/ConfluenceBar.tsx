// Horizontal bar rendering a module's contribution, -100..+100 centered on 0.
// Used for the five module rows inside the confluence panel.
interface ConfluenceBarProps {
  label: string;
  score: number;
  detail: string;
  weight: number; // 0..1
}

export function ConfluenceBar({ label, score, detail, weight }: ConfluenceBarProps) {
  const clamped = Math.max(-100, Math.min(100, score));
  const pct = Math.abs(clamped) / 2; // 0..50 (half-width)
  const color =
    clamped > 0 ? '#00ff9d' :
    clamped < 0 ? '#ff3d57' :
    '#a3a3a3';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
            {label}
          </span>
          <span className="text-[9px] font-mono-nums text-terminal-muted/60">
            ·  {Math.round(weight * 100)}%
          </span>
        </div>
        <span
          className="font-mono-nums text-[11px] font-bold"
          style={{ color }}
        >
          {clamped > 0 ? '+' : ''}{clamped}
        </span>
      </div>

      <div className="relative h-1.5 rounded-full bg-terminal-border/40 overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-terminal-border/80" />
        {clamped !== 0 && (
          <div
            className="absolute top-0 bottom-0 rounded-full transition-all duration-500"
            style={{
              left: clamped > 0 ? '50%' : `${50 - pct}%`,
              width: `${pct}%`,
              background: `linear-gradient(to right, ${color}70, ${color})`,
              boxShadow: `0 0 6px ${color}40`,
            }}
          />
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">{detail}</p>
    </div>
  );
}
