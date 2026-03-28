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
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-terminal-muted uppercase tracking-[0.12em]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-xl border bg-terminal-card/80 backdrop-blur-sm px-3.5 py-3 text-[15px] text-terminal-text',
            'placeholder:text-terminal-muted/60',
            'border-terminal-border',
            'focus:border-neon-cyan focus:shadow-[0_0_15px_#00e5ff20,0_0_30px_#00e5ff08] focus:outline-none',
            'transition-all duration-300 ease-out',
            error && 'border-neon-red focus:border-neon-red focus:shadow-[0_0_15px_#ff3d5720,0_0_30px_#ff3d5708]',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-[11px] text-neon-red tracking-wide">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
