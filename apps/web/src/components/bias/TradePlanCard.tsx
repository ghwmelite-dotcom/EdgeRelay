// Trade plan reference card — renders entry/SL/TP when the engine is in
// a live CONTINUATION. Copy-to-clipboard on each value for quick paste
// into MT4/MT5 order panels. Disclaimer sits at the bottom, not hidden.
import { useState } from 'react';
import { Copy, Check, Target } from 'lucide-react';
import type { TradePlan } from '@edgerelay/shared';

interface TradePlanCardProps {
  plan: TradePlan;
  timeframe: '4H' | '1H';
  symbol: string;
  decimals: number;
}

export function TradePlanCard({ plan, timeframe, symbol, decimals }: TradePlanCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const fmt = (n: number) => n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* ignore */ }
  };

  const directionColor = plan.direction === 'long' ? '#00ff9d' : '#ff3d57';
  const directionLabel = plan.direction === 'long' ? 'LONG' : 'SHORT';

  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{
        borderColor: `${directionColor}30`,
        background: `linear-gradient(135deg, ${directionColor}08, transparent 60%)`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color: directionColor }} />
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold" style={{ color: directionColor }}>
            Trade plan · {timeframe} · {directionLabel} {symbol}
          </p>
        </div>
        <span className="text-[9px] uppercase tracking-[0.14em] text-terminal-muted font-semibold">
          Reference only
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <LevelCell
          label="Entry"
          value={fmt(plan.entry)}
          color="#fafafa"
          copied={copied === 'entry'}
          onCopy={() => copy('entry', String(plan.entry))}
        />
        <LevelCell
          label="Stop Loss"
          value={fmt(plan.stopLoss)}
          sub={`${plan.slDistancePct}% · 1R`}
          color="#ff3d57"
          copied={copied === 'sl'}
          onCopy={() => copy('sl', String(plan.stopLoss))}
        />
        <LevelCell
          label="TP1 · 2R"
          value={fmt(plan.takeProfit1)}
          sub={`+${plan.tp1DistancePct}%`}
          color="#00ff9d"
          copied={copied === 'tp1'}
          onCopy={() => copy('tp1', String(plan.takeProfit1))}
        />
        <LevelCell
          label="TP2 · 3R"
          value={fmt(plan.takeProfit2)}
          sub={`+${plan.tp2DistancePct}%`}
          color="#00e5ff"
          copied={copied === 'tp2'}
          onCopy={() => copy('tp2', String(plan.takeProfit2))}
        />
      </div>

      <p className="text-[10px] text-terminal-muted mt-2.5 italic leading-relaxed">
        {plan.rationaleSl}
      </p>
      <p className="text-[10px] text-neon-amber/80 mt-1 leading-relaxed">
        ⚠ Drop to 15M/5M for your actual entry trigger. These are reference levels for planning — not financial advice.
      </p>
    </div>
  );
}

function LevelCell({
  label, value, sub, color, copied, onCopy,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group relative text-left rounded-lg border border-terminal-border/50 bg-terminal-surface/40 px-3 py-2 hover:border-neon-cyan/30 transition-colors cursor-pointer"
      title="Click to copy"
    >
      <p className="text-[9px] uppercase tracking-[0.14em] text-terminal-muted font-semibold flex items-center gap-1">
        {label}
        {copied ? (
          <Check size={9} className="text-neon-green" />
        ) : (
          <Copy size={9} className="opacity-0 group-hover:opacity-60" />
        )}
      </p>
      <p className="font-mono-nums text-[14px] font-black mt-0.5" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="text-[9px] text-terminal-muted/80 mt-0.5 font-mono-nums">{sub}</p>
      )}
    </button>
  );
}
