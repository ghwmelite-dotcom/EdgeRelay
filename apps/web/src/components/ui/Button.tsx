import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: [
    'bg-gradient-to-r from-neon-cyan to-[#00ffc8] text-terminal-bg font-semibold',
    'shadow-[0_0_20px_#00e5ff25,inset_0_1px_0_#ffffff30]',
    'hover:shadow-[0_0_30px_#00e5ff45,0_0_60px_#00e5ff15,inset_0_1px_0_#ffffff40]',
    'active:scale-[0.97] active:shadow-[0_0_12px_#00e5ff30]',
  ].join(' '),
  secondary: [
    'glass border border-terminal-border text-slate-200',
    'hover:border-[#00e5ff30] hover:shadow-[0_0_20px_#00e5ff08]',
    'hover:before:opacity-100',
    'active:scale-[0.98]',
  ].join(' '),
  ghost: [
    'text-slate-400 bg-transparent',
    'hover:text-neon-cyan hover:bg-neon-cyan/5',
    'active:bg-neon-cyan/10',
  ].join(' '),
  danger: [
    'bg-neon-red/8 text-neon-red border border-neon-red/20',
    'hover:bg-neon-red/15 hover:border-neon-red/40 hover:shadow-[0_0_20px_#ff3d5720]',
    'active:scale-[0.97]',
  ].join(' '),
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base tracking-wide uppercase',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus-ring',
        'disabled:opacity-40 disabled:pointer-events-none disabled:saturate-0',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span
          className={clsx(
            'h-1.5 w-1.5 rounded-full animate-pulse',
            variant === 'danger' ? 'bg-neon-red shadow-[0_0_6px_#ff3d57,0_0_12px_#ff3d5780]'
            : 'bg-neon-cyan shadow-[0_0_6px_#00e5ff,0_0_12px_#00e5ff80]',
          )}
        />
      )}
      {children}
    </button>
  );
}
