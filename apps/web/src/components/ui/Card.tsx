import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'elevated' | 'holographic';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'glass',
  elevated: [
    'glass backdrop-blur-2xl',
    'border-[#ffffff10]',
    'shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)]',
  ].join(' '),
  holographic: 'glass border-gradient overflow-visible',
};

export function Card({
  hover,
  glow,
  variant = 'default',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl p-5',
        variantClasses[variant],
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
    <div className={clsx('relative flex items-center justify-between mb-4 pb-4', className)} {...props}>
      {children}
      <div className="divider absolute bottom-0 left-0 right-0" />
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx(
        'text-sm font-semibold tracking-wide text-slate-200 font-display',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}
