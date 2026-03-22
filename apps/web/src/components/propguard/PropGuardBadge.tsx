interface PropGuardBadgeProps {
  status: 'protected' | 'warning' | 'critical' | 'locked' | 'disconnected';
}

const statusConfig = {
  protected: { label: 'Protected', bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  warning: { label: 'Warning', bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  critical: { label: 'Critical', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400 animate-pulse' },
  locked: { label: 'Locked', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400 animate-pulse' },
  disconnected: { label: 'Disconnected', bg: 'bg-zinc-500/20', text: 'text-zinc-400', dot: 'bg-zinc-400' },
};

export function PropGuardBadge({ status }: PropGuardBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
