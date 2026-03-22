import { clsx } from 'clsx';

type BadgeVariant = 'cyan' | 'green' | 'amber' | 'red' | 'purple' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  cyan: 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 shadow-[0_0_8px_#00e5ff10]',
  green: 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[0_0_8px_#00ff9d10]',
  amber: 'bg-neon-amber/10 text-neon-amber border border-neon-amber/20 shadow-[0_0_8px_#ffb80010]',
  red: 'bg-neon-red/10 text-neon-red border border-neon-red/20 shadow-[0_0_8px_#ff3d5710]',
  purple: 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20 shadow-[0_0_8px_#b18cff10]',
  muted: 'bg-terminal-border/30 text-terminal-muted border border-terminal-border',
};

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'chip',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
