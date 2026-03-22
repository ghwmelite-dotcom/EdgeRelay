import { clsx } from 'clsx';

type Status = 'connected' | 'disconnected' | 'connecting' | 'idle';

interface StatusDotProps {
  status: Status;
  label?: string;
  className?: string;
}

const dotStyles: Record<Status, string> = {
  connected: 'bg-neon-green text-neon-green shadow-[0_0_4px_#00ff9d,0_0_8px_#00ff9d60]',
  disconnected: 'bg-neon-red text-neon-red shadow-[0_0_4px_#ff3d57,0_0_8px_#ff3d5760]',
  connecting: 'bg-neon-amber text-neon-amber shadow-[0_0_4px_#ffb800,0_0_8px_#ffb80060]',
  idle: 'bg-terminal-muted text-terminal-muted',
};

const dotAnimations: Record<Status, string> = {
  connected: 'status-pulse',
  disconnected: '',
  connecting: 'animate-pulse',
  idle: '',
};

export function StatusDot({ status, label, className }: StatusDotProps) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span
        className={clsx(
          'h-2 w-2 rounded-full',
          dotStyles[status],
          dotAnimations[status],
        )}
      />
      {label && (
        <span className="font-mono text-[11px] tracking-wide text-slate-400">
          {label ?? status}
        </span>
      )}
    </span>
  );
}
