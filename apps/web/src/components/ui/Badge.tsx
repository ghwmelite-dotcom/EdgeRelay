import { clsx } from 'clsx';

type BadgeVariant = 'cyan' | 'green' | 'amber' | 'red' | 'purple' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  cyan: 'bg-neon-cyan-dim text-neon-cyan border-neon-cyan/20',
  green: 'bg-neon-green-dim text-neon-green border-neon-green/20',
  amber: 'bg-neon-amber-dim text-neon-amber border-neon-amber/20',
  red: 'bg-neon-red-dim text-neon-red border-neon-red/20',
  purple: 'bg-purple-500/10 text-neon-purple border-purple-500/20',
  muted: 'bg-terminal-border/50 text-terminal-muted border-terminal-border',
};

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
