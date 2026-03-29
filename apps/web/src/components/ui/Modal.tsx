import { clsx } from 'clsx';
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl p-4 sm:p-6 shadow-2xl my-auto',
          'glass backdrop-blur-2xl border-gradient',
          'animate-fade-in-scale',
          className,
        )}
      >
        {/* Subtle scan-line effect */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, #00e5ff03 2px, #00e5ff03 4px)',
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-5 pb-5">
          <h2 className="text-lg font-semibold text-slate-100 font-display">
            {title}
          </h2>
          <button
            onClick={onClose}
            className={clsx(
              'rounded-xl p-1.5 text-terminal-muted',
              'hover:text-neon-cyan hover:bg-neon-cyan/5',
              'transition-all duration-300 ease-out',
              'focus-ring',
            )}
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="divider absolute bottom-0 left-0 right-0" />
        </div>

        {/* Content — scrollable */}
        <div className="relative z-10 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
