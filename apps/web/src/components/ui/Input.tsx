import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-terminal-card px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-terminal-muted',
            'border-terminal-border focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/30 focus:outline-none',
            'transition-colors duration-200',
            error && 'border-neon-red focus:border-neon-red focus:ring-neon-red/30',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-neon-red">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
