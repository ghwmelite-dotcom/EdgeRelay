import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export function Card({ hover, glow, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-terminal-border bg-terminal-card p-5',
        hover && 'card-hover cursor-pointer',
        glow && 'glow-cyan',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-sm font-medium text-slate-300', className)} {...props}>
      {children}
    </h3>
  );
}
