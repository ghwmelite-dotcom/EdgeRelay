import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const GROUPS = [
  {
    title: 'Playback',
    shortcuts: [
      { key: 'Space', action: 'Play / Pause' },
      { key: '→', action: 'Advance 1 tick' },
      { key: 'R', action: 'Reset scenario' },
    ],
  },
  {
    title: 'Trading',
    shortcuts: [
      { key: 'B', action: 'Buy at market' },
      { key: 'S', action: 'Sell at market' },
    ],
  },
  {
    title: 'ICC Marking',
    shortcuts: [
      { key: 'Q', action: 'Bullish bias' },
      { key: 'W', action: 'Bearish bias' },
      { key: '1', action: 'Indication mode' },
      { key: '2', action: 'Correction mode' },
      { key: '3', action: 'Continuation mode' },
    ],
  },
  {
    title: 'Drawing',
    shortcuts: [
      { key: 'T', action: 'Trendline tool' },
      { key: 'H', action: 'Horizontal S/R' },
      { key: 'F', action: 'Fibonacci tool' },
    ],
  },
  {
    title: 'Other',
    shortcuts: [
      { key: 'G', action: 'Ghost overlay' },
      { key: 'M', action: 'Add bookmark' },
      { key: 'Esc', action: 'Cancel mode' },
      { key: '?', action: 'This help' },
    ],
  },
];

export function ICCKeyboardHelp({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-terminal-border/40 bg-terminal-card shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-terminal-border/20 px-5 py-3">
          <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
          <button onClick={onClose} className="text-terminal-muted hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">{group.title}</p>
              <div className="space-y-1">
                {group.shortcuts.map((s) => (
                  <div key={s.key} className="flex items-center justify-between py-1">
                    <span className="text-[12px] text-slate-300">{s.action}</span>
                    <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md border border-terminal-border/40 bg-terminal-bg/80 px-2 font-mono-nums text-[10px] font-semibold text-neon-cyan">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-terminal-border/20 px-5 py-2.5 text-center">
          <p className="text-[10px] text-terminal-muted">Press <kbd className="inline-flex items-center justify-center min-w-[18px] h-4 rounded border border-terminal-border/30 bg-terminal-bg/80 px-1 font-mono-nums text-[8px] text-neon-cyan mx-0.5">?</kbd> to toggle</p>
        </div>
      </div>
    </div>
  );
}
