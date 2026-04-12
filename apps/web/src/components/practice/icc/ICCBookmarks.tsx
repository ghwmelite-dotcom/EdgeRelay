import { useState } from 'react';
import { Bookmark, ChevronDown, Trash2 } from 'lucide-react';

export interface BookmarkEntry {
  id: string;
  candleIndex: number;
  label: string;
  timestamp: number;
}

interface Props {
  bookmarks: BookmarkEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  isFinished: boolean;
  totalCandles: number;
  answerContinuation?: number;
}

export function ICCBookmarkList({ bookmarks, onRemove, onClear, isFinished, totalCandles, answerContinuation }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (bookmarks.length === 0) return null;

  return (
    <div className="rounded-xl border border-neon-cyan/20 bg-terminal-card/20 overflow-hidden animate-fade-in-up">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Bookmark size={12} className="text-neon-cyan" />
          <span className="text-[11px] font-semibold text-white">Bookmarks</span>
          <span className="font-mono-nums text-[9px] text-neon-cyan">{bookmarks.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-terminal-muted hover:text-neon-red cursor-pointer"
          >
            <Trash2 size={10} />
          </button>
          <ChevronDown size={12} className={`text-terminal-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-terminal-border/15 px-4 py-2 space-y-2">
          {/* Bookmark list */}
          <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-thin">
            {bookmarks.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between rounded-md bg-terminal-bg/40 px-2.5 py-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono-nums text-[9px] text-neon-cyan">#{i + 1}</span>
                  <span className="font-mono-nums text-[10px] text-slate-400">tick {b.candleIndex}</span>
                  {b.label && <span className="text-[10px] text-slate-300 truncate max-w-[120px]">{b.label}</span>}
                </div>
                <button onClick={() => onRemove(b.id)} className="text-terminal-muted hover:text-neon-red cursor-pointer">
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
          </div>

          {/* Post-session timeline */}
          {isFinished && totalCandles > 0 && (
            <div className="pt-1">
              <p className="font-mono-nums text-[8px] uppercase tracking-widest text-terminal-muted mb-1">Session Timeline</p>
              <svg width="100%" height={32} viewBox={`0 0 ${totalCandles} 32`} preserveAspectRatio="none" className="rounded overflow-hidden">
                {/* Background */}
                <rect x={0} y={0} width={totalCandles} height={32} fill="#0a0f16" rx={2} />
                {/* Progress bar */}
                <rect x={0} y={14} width={totalCandles} height={4} fill="#151d28" rx={1} />

                {/* Answer continuation marker */}
                {answerContinuation !== undefined && (
                  <g>
                    <line x1={answerContinuation} y1={8} x2={answerContinuation} y2={24} stroke="#00ff9d" strokeWidth={2} opacity={0.7} />
                    <text x={answerContinuation + 3} y={8} fill="#00ff9d" fontSize={5} fontFamily="monospace" opacity={0.6}>optimal</text>
                  </g>
                )}

                {/* Bookmark markers */}
                {bookmarks.map((b, i) => (
                  <g key={b.id}>
                    <line x1={b.candleIndex} y1={6} x2={b.candleIndex} y2={26} stroke="#00e5ff" strokeWidth={1.5} opacity={0.8} />
                    <circle cx={b.candleIndex} cy={6} r={2.5} fill="#00e5ff" opacity={0.9} />
                    <text x={b.candleIndex + 2} y={28} fill="#00e5ff" fontSize={4} fontFamily="monospace" opacity={0.5}>
                      #{i + 1}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
                  <span className="text-[8px] text-terminal-muted">Your bookmarks</span>
                </div>
                {answerContinuation !== undefined && (
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
                    <span className="text-[8px] text-terminal-muted">Optimal entry</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
