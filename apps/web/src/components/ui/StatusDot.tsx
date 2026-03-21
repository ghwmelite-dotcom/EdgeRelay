import { clsx } from 'clsx';

type Status = 'connected' | 'disconnected' | 'connecting' | 'idle';

interface StatusDotProps {
  status: Status;
  label?: string;
  className?: string;
}

const colors: Record<Status, string> = {
  connected: 'bg-neon-green text-neon-green',
  disconnected: 'bg-neon-red text-neon-red',
  connecting: 'bg-neon-amber text-neon-amber',
  idle: 'bg-terminal-muted text-terminal-muted',
};

export function StatusDot({ status, label, className }: StatusDotProps) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span
        className={clsx(
          'h-2 w-2 rounded-full',
          colors[status],
          status === 'connected' && 'animate-pulse-glow',
          status === 'connecting' && 'animate-pulse',
        )}
      />
      {label && (
        <span className="text-xs font-medium text-slate-400 capitalize">{label ?? status}</span>
      )}
    </span>
  );
}
