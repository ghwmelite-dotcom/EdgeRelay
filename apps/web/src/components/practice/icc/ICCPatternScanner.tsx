import { useState, useMemo } from 'react';
import { ScanSearch, ChevronDown, Lightbulb, Eye, EyeOff } from 'lucide-react';
import type { Candle } from '@/lib/chart-simulator-engine';
import type { Timeframe } from '@/lib/icc-candle-generator';

interface DetectedPattern {
  type: 'impulse_up' | 'impulse_down' | 'pullback_up' | 'pullback_down' | 'consolidation' | 'breakout';
  timeframe: Timeframe;
  startIndex: number;
  endIndex: number;
  strength: number; // 0-100
  description: string;
}

interface Props {
  candles: Record<Timeframe, Candle[]>;
  visibleCounts: Record<Timeframe, number>;
  enabled: boolean;
  onToggle: () => void;
}

function detectPatterns(candles: Candle[], count: number, tf: Timeframe): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (count < 10) return patterns;

  const visible = candles.slice(0, count);
  const atr = calculateATR(visible, 14);
  if (atr === 0) return patterns;

  // Detect strong impulse moves (indication candidates)
  for (let i = 3; i < visible.length - 2; i++) {
    const lookback = visible.slice(Math.max(0, i - 5), i + 1);
    const totalMove = lookback[lookback.length - 1].c - lookback[0].o;
    const absMove = Math.abs(totalMove);

    if (absMove > atr * 2.5) {
      // Count directional candles
      const dir = totalMove > 0 ? 1 : -1;
      const directional = lookback.filter(c => (c.c - c.o) * dir > 0).length;

      if (directional >= 4) {
        const strength = Math.min(100, Math.round((absMove / atr) * 20));
        patterns.push({
          type: dir > 0 ? 'impulse_up' : 'impulse_down',
          timeframe: tf,
          startIndex: Math.max(0, i - 5),
          endIndex: i,
          strength,
          description: `Strong ${dir > 0 ? 'bullish' : 'bearish'} impulse (${(absMove / atr).toFixed(1)}x ATR)`,
        });
      }
    }
  }

  // Detect pullbacks (correction candidates)
  for (let i = 8; i < visible.length - 2; i++) {
    const priorMove = visible[i - 3].c - visible[Math.max(0, i - 8)].o;
    if (Math.abs(priorMove) < atr * 1.5) continue;

    const pullback = visible[i].c - visible[i - 3].c;
    const retrace = priorMove !== 0 ? Math.abs(pullback / priorMove) : 0;

    if (retrace >= 0.25 && retrace <= 0.72 && Math.sign(pullback) !== Math.sign(priorMove)) {
      patterns.push({
        type: priorMove > 0 ? 'pullback_down' : 'pullback_up',
        timeframe: tf,
        startIndex: i - 3,
        endIndex: i,
        strength: Math.round((1 - Math.abs(retrace - 0.5) * 2) * 100),
        description: `${retrace > 0 ? 'Bullish' : 'Bearish'} pullback (${(retrace * 100).toFixed(0)}% retracement)`,
      });
    }
  }

  // Detect consolidation zones
  for (let i = 10; i < visible.length; i++) {
    const window = visible.slice(i - 8, i);
    const highs = window.map(c => c.h);
    const lows = window.map(c => c.l);
    const range = Math.max(...highs) - Math.min(...lows);

    if (range < atr * 1.2) {
      // Check if not already detected recently
      const alreadyHas = patterns.some(
        p => p.type === 'consolidation' && p.timeframe === tf && Math.abs(p.endIndex - i) < 5,
      );
      if (!alreadyHas) {
        patterns.push({
          type: 'consolidation',
          timeframe: tf,
          startIndex: i - 8,
          endIndex: i,
          strength: Math.round((1 - range / (atr * 2)) * 100),
          description: `Tight consolidation zone (${(range / atr).toFixed(1)}x ATR range)`,
        });
      }
    }
  }

  return patterns;
}

function calculateATR(candles: Candle[], period: number): number {
  if (candles.length < period + 1) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - (candles[i - 1]?.c ?? candles[i].o)),
      Math.abs(candles[i].l - (candles[i - 1]?.c ?? candles[i].o)),
    );
    sum += tr;
  }
  return sum / period;
}

const TYPE_COLORS: Record<string, string> = {
  impulse_up: '#00ff9d',
  impulse_down: '#ff3d57',
  pullback_up: '#00e5ff',
  pullback_down: '#ffb800',
  consolidation: '#b18cff',
  breakout: '#00e5ff',
};

const TYPE_LABELS: Record<string, string> = {
  impulse_up: 'Bullish Impulse',
  impulse_down: 'Bearish Impulse',
  pullback_up: 'Bullish Pullback',
  pullback_down: 'Bearish Pullback',
  consolidation: 'Consolidation',
  breakout: 'Breakout',
};

export function ICCPatternScanner({ candles, visibleCounts, enabled, onToggle }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showOnChart, setShowOnChart] = useState(true);

  const allPatterns = useMemo(() => {
    if (!enabled) return [];
    const patterns: DetectedPattern[] = [];
    for (const tf of ['4H', '1H', '15M', '5M'] as Timeframe[]) {
      if (visibleCounts[tf] > 0) {
        patterns.push(...detectPatterns(candles[tf], visibleCounts[tf], tf));
      }
    }
    // Sort by strength descending
    return patterns.sort((a, b) => b.strength - a.strength).slice(0, 12);
  }, [candles, visibleCounts, enabled]);

  if (!enabled) return null;

  const byTimeframe = allPatterns.reduce((acc, p) => {
    if (!acc[p.timeframe]) acc[p.timeframe] = [];
    acc[p.timeframe].push(p);
    return acc;
  }, {} as Record<string, DetectedPattern[]>);

  return (
    <div className="rounded-2xl border border-neon-cyan/20 bg-gradient-to-br from-neon-cyan/[0.03] to-transparent overflow-hidden animate-fade-in-up">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between border-b border-neon-cyan/15 px-5 py-3 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ScanSearch size={16} className="text-neon-cyan" />
          <span className="text-sm font-semibold text-white">Pattern Scanner</span>
          <span className="font-mono-nums text-[9px] text-neon-cyan">{allPatterns.length} detected</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowOnChart(!showOnChart); }}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition-all cursor-pointer ${showOnChart ? 'bg-neon-cyan/15 text-neon-cyan' : 'text-terminal-muted'}`}
            title="Show on chart"
          >
            {showOnChart ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <ChevronDown size={14} className={`text-terminal-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-3">
          {allPatterns.length === 0 ? (
            <div className="text-center py-4">
              <Lightbulb size={20} className="text-terminal-muted mx-auto mb-2 opacity-40" />
              <p className="text-[12px] text-terminal-muted">Advance more candles for pattern detection</p>
            </div>
          ) : (
            Object.entries(byTimeframe).map(([tf, patterns]) => (
              <div key={tf}>
                <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-1.5">{tf}</p>
                <div className="space-y-1">
                  {patterns.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-terminal-bg/40 px-3 py-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[p.type] }} />
                      <span className="text-[11px] text-slate-300 flex-1">{TYPE_LABELS[p.type]}</span>
                      <span className="font-mono-nums text-[9px] text-terminal-muted">[{p.startIndex}-{p.endIndex}]</span>
                      <div className="w-12 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.strength}%`, backgroundColor: TYPE_COLORS[p.type] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {allPatterns.length > 0 && (
            <div className="rounded-lg border border-neon-cyan/15 bg-neon-cyan/[0.03] p-3">
              <div className="flex items-start gap-2">
                <Lightbulb size={12} className="text-neon-cyan shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {allPatterns.some(p => p.type.startsWith('impulse'))
                    ? 'Strong impulse detected — look for the correction/pullback phase before entering.'
                    : allPatterns.some(p => p.type === 'consolidation')
                      ? 'Price consolidating — wait for a breakout before marking continuation.'
                      : 'Pullback in progress — watch for the continuation signal to confirm entry.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Export pattern detection for use in chart overlays */
export { detectPatterns, calculateATR, TYPE_COLORS };
export type { DetectedPattern };
