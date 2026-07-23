import { useState } from 'react';
import { Shield, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ICC_RULES, type ICCRule } from '@/data/icc-lessons';

interface Props {
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  trend: { label: 'Trends', color: '#00ff9d' },
  indication: { label: 'Indication', color: '#00e5ff' },
  correction: { label: 'Correction', color: '#ffb800' },
  continuation: { label: 'Continuation', color: '#00ff9d' },
  structure: { label: 'Structure', color: '#b18cff' },
  psychology: { label: 'Psychology', color: '#00e5ff' },
  risk: { label: 'Risk', color: '#ff3d57' },
};

export function ICCRulesCards({ onClose }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? ICC_RULES.filter(r => r.category === filter) : ICC_RULES;
  const rule = filtered[currentIdx] || filtered[0];
  const total = filtered.length;

  const prev = () => setCurrentIdx(i => (i - 1 + total) % total);
  const next = () => setCurrentIdx(i => (i + 1) % total);

  if (!rule) return null;

  const cat = CATEGORY_LABELS[rule.category];

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-neon-amber" />
          <h3 className="text-sm font-semibold text-white">Rules of ICC</h3>
          <span className="font-mono-nums text-[10px] text-terminal-muted">{total} rules</span>
        </div>
        <button onClick={onClose} className="text-terminal-muted hover:text-white cursor-pointer"><X size={14} /></button>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => { setFilter(null); setCurrentIdx(0); }}
          className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-all ${!filter ? 'bg-neon-amber/15 border border-neon-amber/30 text-neon-amber' : 'border border-terminal-border/20 text-terminal-muted hover:text-white'}`}>
          All
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, cfg]) => (
          <button key={key} onClick={() => { setFilter(filter === key ? null : key); setCurrentIdx(0); }}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-all ${filter === key ? `border bg-opacity-15` : 'border border-terminal-border/20 text-terminal-muted hover:text-white'}`}
            style={filter === key ? { borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}15`, color: cfg.color } : undefined}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${rule.color}25` }}>
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${rule.color}60, ${rule.color}20, transparent)` }} />
        <div className="p-6 text-center space-y-4">
          {/* Category badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono-nums text-[10px] font-bold" style={{ color: cat.color, backgroundColor: `${cat.color}12`, border: `1px solid ${cat.color}25` }}>
            {cat.label}
          </span>

          {/* Rule text */}
          <p className="text-[17px] font-semibold text-white leading-relaxed px-4">{rule.rule}</p>

          {/* Source */}
          <p className="text-[11px] text-terminal-muted">— {rule.source}</p>
        </div>

        {/* Navigation */}
        <div className="border-t border-terminal-border/15 px-4 py-3 flex items-center justify-between">
          <button onClick={prev} className="flex items-center gap-1 text-[11px] text-terminal-muted hover:text-white cursor-pointer">
            <ChevronLeft size={14} /> Prev
          </button>
          <div className="flex gap-1">
            {filtered.slice(Math.max(0, currentIdx - 3), currentIdx + 4).map((_, i) => {
              const actualIdx = Math.max(0, currentIdx - 3) + i;
              return (
                <button key={actualIdx} onClick={() => setCurrentIdx(actualIdx)}
                  className="h-1.5 w-1.5 rounded-full cursor-pointer transition-all"
                  style={{ backgroundColor: actualIdx === currentIdx ? rule.color : '#151d2880' }} />
              );
            })}
          </div>
          <button onClick={next} className="flex items-center gap-1 text-[11px] text-terminal-muted hover:text-white cursor-pointer">
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Counter */}
      <p className="text-center font-mono-nums text-[10px] text-terminal-muted">{currentIdx + 1} / {total}</p>
    </div>
  );
}
