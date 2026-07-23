// Small badge showing the current session + momentum class.
import type { SessionModule } from '@edgerelay/shared';

interface SessionIndicatorProps {
  session: SessionModule;
}

const SESSION_COLOR: Record<SessionModule['active'], string> = {
  'Asian':             '#b18cff',
  'London':            '#00e5ff',
  'New York':          '#00ff9d',
  'London-NY Overlap': '#00ff9d',
  'Off-Hours':         '#525252',
};

export function SessionIndicator({ session }: SessionIndicatorProps) {
  const color = SESSION_COLOR[session.active];
  const momentumColor =
    session.momentum === 'Strong'   ? '#00ff9d' :
    session.momentum === 'Moderate' ? '#00e5ff' :
    session.momentum === 'Weak'     ? '#ffb800' :
    '#525252';

  return (
    <div className="inline-flex items-center gap-2 text-[11px]">
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono-nums font-semibold"
        style={{ color, background: `${color}12`, border: `1px solid ${color}30` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
        {session.active}
      </span>
      <span className="font-mono-nums text-terminal-muted text-[10px]">·</span>
      <span
        className="font-mono-nums font-semibold text-[10px] uppercase tracking-[0.14em]"
        style={{ color: momentumColor }}
      >
        {session.momentum} momentum
      </span>
    </div>
  );
}
