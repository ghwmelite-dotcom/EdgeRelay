import { useState } from 'react';
import { BookOpen, ChevronDown, X } from 'lucide-react';
import { PATTERN_LIBRARY, type PatternExample, type PatternCategory } from '@/data/icc-pattern-library';

interface Props {
  onClose: () => void;
}

const CATEGORY_LABELS: Record<PatternCategory, { label: string; color: string; desc: string }> = {
  textbook: { label: 'Textbook', color: '#00ff9d', desc: 'Clean, standard ICC setups' },
  tricky: { label: 'Tricky', color: '#ffb800', desc: 'Edge cases and traps' },
  'no-trade': { label: 'No Trade', color: '#ff3d57', desc: 'When to sit out' },
};

const DIFF_COLORS: Record<string, string> = {
  beginner: '#00ff9d', intermediate: '#ffb800', advanced: '#ff3d57',
};

const ANNO_COLORS: Record<string, string> = {
  indication: '#00e5ff', correction: '#ffb800', continuation: '#00ff9d', 'no-trade-zone': '#ff3d57',
};

function MiniPatternChart({ example }: { example: PatternExample }) {
  const { candles, annotations } = example;
  const min = Math.min(...candles.map(c => Math.min(c.l, c.o, c.c)));
  const max = Math.max(...candles.map(c => Math.max(c.h, c.o, c.c)));
  const range = max - min || 1;
  const cw = 14;
  const w = candles.length * cw + 20;
  const h = 100;
  const toY = (p: number) => 8 + ((max - p) / range) * (h - 24);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="rounded-lg bg-[#0a0f16]">
      {/* Annotation zones */}
      {annotations.map((a, i) => {
        const x1 = 10 + a.startIndex * cw - 2;
        const x2 = 10 + a.endIndex * cw + cw - 2;
        return (
          <g key={i}>
            <rect x={x1} y={0} width={x2 - x1} height={h} fill={ANNO_COLORS[a.type] || '#fff'} opacity={0.08} rx={3} />
            <line x1={x1} y1={0} x2={x1} y2={h} stroke={ANNO_COLORS[a.type]} strokeWidth={1} strokeDasharray="3,2" opacity={0.4} />
            <line x1={x2} y1={0} x2={x2} y2={h} stroke={ANNO_COLORS[a.type]} strokeWidth={1} strokeDasharray="3,2" opacity={0.4} />
          </g>
        );
      })}
      {/* Candles */}
      {candles.map((c, i) => {
        const x = 10 + i * cw;
        const isBull = c.c >= c.o;
        const color = isBull ? '#00ff9d' : '#ff3d57';
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyH = Math.max(1.5, Math.abs(toY(c.o) - toY(c.c)));
        return (
          <g key={i}>
            <line x1={x + 3} y1={toY(c.h)} x2={x + 3} y2={toY(c.l)} stroke={color} strokeWidth={0.8} opacity={0.4} />
            <rect x={x} y={bodyTop} width={6} height={bodyH} fill={color} opacity={0.7} rx={0.5} />
          </g>
        );
      })}
    </svg>
  );
}

function PatternCard({ example }: { example: PatternExample }) {
  const [expanded, setExpanded] = useState(false);
  const biasColor = example.bias === 'bullish' ? '#00ff9d' : example.bias === 'bearish' ? '#ff3d57' : '#6b7f95';
  const diffColor = DIFF_COLORS[example.difficulty] || '#00e5ff';

  return (
    <div className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left cursor-pointer">
        {/* Chart preview */}
        <MiniPatternChart example={example} />

        {/* Info */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono-nums text-[10px] font-bold" style={{ color: biasColor }}>
              {example.bias === 'none' ? 'NO BIAS' : example.bias.toUpperCase()}
            </span>
            <span className="rounded-full border px-1.5 py-0.5 font-mono-nums text-[8px]" style={{ borderColor: `${diffColor}30`, color: diffColor }}>{example.difficulty}</span>
            <span className="text-[9px] text-terminal-muted ml-auto">{example.instrument}</span>
          </div>
          <h4 className="text-[13px] font-semibold text-white">{example.name}</h4>
          <div className="flex items-center gap-1 mt-1">
            <ChevronDown size={10} className={`text-terminal-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span className="text-[9px] text-terminal-muted">{expanded ? 'Less' : 'More'}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-terminal-border/15 px-4 py-3 space-y-3">
          <p className="text-[11px] text-slate-400 leading-relaxed">{example.description}</p>

          {/* Annotations legend */}
          <div className="space-y-1">
            {example.annotations.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ANNO_COLORS[a.type] }} />
                <span className="text-[10px] text-slate-300">{a.label}</span>
              </div>
            ))}
          </div>

          {/* What to look for */}
          <div>
            <p className="font-mono-nums text-[8px] uppercase tracking-widest text-terminal-muted mb-1.5">What to look for</p>
            <ul className="space-y-1">
              {example.whatToLookFor.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-neon-cyan text-[8px] mt-0.5 shrink-0">-</span>
                  <span className="text-[10px] text-slate-400">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function ICCPatternLibrary({ onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<PatternCategory>('textbook');
  const filtered = PATTERN_LIBRARY.filter(p => p.category === activeCategory);

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-neon-cyan" />
          <h3 className="text-sm font-semibold text-white">ICC Pattern Library</h3>
          <span className="font-mono-nums text-[9px] text-terminal-muted">{PATTERN_LIBRARY.length} examples</span>
        </div>
        <button onClick={onClose} className="text-terminal-muted hover:text-white cursor-pointer"><X size={14} /></button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {(Object.entries(CATEGORY_LABELS) as [PatternCategory, typeof CATEGORY_LABELS[PatternCategory]][]).map(([cat, cfg]) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`flex-1 rounded-xl py-2 text-center cursor-pointer transition-all ${
              activeCategory === cat
                ? 'border bg-terminal-card/50'
                : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
            }`}
            style={activeCategory === cat ? { borderColor: `${cfg.color}30`, color: cfg.color } : undefined}>
            <p className="text-[11px] font-semibold">{cfg.label}</p>
            <p className="text-[8px] text-terminal-muted">{cfg.desc}</p>
          </button>
        ))}
      </div>

      {/* Pattern cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map(p => (
          <PatternCard key={p.id} example={p} />
        ))}
      </div>
    </div>
  );
}
