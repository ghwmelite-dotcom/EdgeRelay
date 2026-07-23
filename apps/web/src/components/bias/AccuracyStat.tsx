// Accuracy win-rate display. Renders gracefully during the data-warmup
// period ("building track record" with sample count) and switches to the
// real percentage once enough calls have been verified.
import type { AccuracyBreakdown } from '@edgerelay/shared';

interface AccuracyStatProps {
  breakdown: AccuracyBreakdown | undefined;
  /** Minimum verified calls before showing a percentage. */
  minSample?: number;
  compact?: boolean;
}

const WINDOWS: Array<keyof AccuracyBreakdown['byWindow']> = ['7d', '30d', '90d', 'all'];

export function AccuracyStat({ breakdown, minSample = 5, compact = false }: AccuracyStatProps) {
  if (!breakdown) {
    return null;
  }

  // Pick the tightest window with enough sample size; fall back to "all".
  const preferred =
    WINDOWS.find((w) => (breakdown.byWindow[w].correct + breakdown.byWindow[w].incorrect) >= minSample)
    ?? 'all';
  const stats = breakdown.byWindow[preferred];
  const verified = stats.correct + stats.incorrect;

  if (verified < minSample) {
    return (
      <div className={compact ? 'text-[9px]' : 'text-[10px]'}>
        <span className="uppercase tracking-[0.15em] text-terminal-muted font-semibold">
          Track record
        </span>
        <span className="ml-1 text-terminal-muted/70">
          building ({stats.directionalCalls} call{stats.directionalCalls === 1 ? '' : 's'})
        </span>
      </div>
    );
  }

  const color =
    stats.winRate >= 65 ? '#00ff9d' :
    stats.winRate >= 50 ? '#00e5ff' :
    stats.winRate >= 40 ? '#ffb800' :
    '#ff3d57';

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-mono-nums font-bold"
        style={{ color }}
        title={`${stats.winRate}% over ${preferred} (${verified} verified calls)`}
      >
        {stats.winRate}% · {preferred}
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col">
      <span className="text-[9px] uppercase tracking-[0.14em] text-terminal-muted font-semibold">
        Accuracy · {preferred}
      </span>
      <span
        className="font-mono-nums text-[13px] font-bold"
        style={{ color }}
      >
        {stats.winRate}%
        <span className="text-terminal-muted/70 text-[10px] font-medium ml-1">
          ({verified} calls)
        </span>
      </span>
    </div>
  );
}
