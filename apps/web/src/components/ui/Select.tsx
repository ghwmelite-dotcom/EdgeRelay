import { clsx } from 'clsx';
import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2300e5ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-terminal-muted uppercase tracking-[0.12em]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full rounded-xl border bg-terminal-card/80 backdrop-blur-sm px-3.5 py-3 text-[15px] text-terminal-text',
            'border-terminal-border',
            'focus:border-neon-cyan focus:shadow-[0_0_15px_#00e5ff20,0_0_30px_#00e5ff08] focus:outline-none',
            'transition-all duration-300 ease-out',
            'appearance-none cursor-pointer',
            'bg-no-repeat bg-[length:16px_16px]',
            error && 'border-neon-red focus:border-neon-red focus:shadow-[0_0_15px_#ff3d5720]',
            className,
          )}
          style={{
            backgroundImage: chevronSvg,
            backgroundPosition: 'right 12px center',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-[11px] text-neon-red tracking-wide">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
