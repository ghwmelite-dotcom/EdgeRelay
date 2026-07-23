// "Alert replay" banner that appears above BiasAssetPage when the user
// arrives via a notification URL like /bias/us30?alert=1714123456&tf=4h.
//
// Fetches the exact bias_history snapshot from that timestamp and renders
// the phase, bias, and trade plan as-captured. Live engine state still
// renders below as usual — the banner just preserves the "what the alert
// said" context that would otherwise be lost the moment the OS dismisses
// the notification.
import { useEffect, useState } from 'react';
import { Bell, X as XIcon, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { BiasSnapshot, TradePlan } from '@edgerelay/shared';
import { BIAS_COLOR, fmtPrice } from './biasColors';

interface AlertReplayBannerProps {
  symbol: string;
  alertUnix: number;
  timeframe?: string;  // '4h' | '1h', from ?tf=
  decimals: number;
}

export function AlertReplayBanner({ symbol, alertUnix, timeframe, decimals }: AlertReplayBannerProps) {
  const [snapshot, setSnapshot] = useState<BiasSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.get<BiasSnapshot>(`/bias/snapshot/${symbol}/${alertUnix}`);
      if (cancelled) return;
      if (res.data) setSnapshot(res.data);
      else setError(res.error?.message ?? 'Alert snapshot not found');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [symbol, alertUnix]);

  if (dismissed) return null;

  if (loading) {
    return (
      <div className="glass-premium rounded-2xl p-4 border border-neon-cyan/30 bg-neon-cyan/[0.03] animate-pulse">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-neon-cyan" />
          <span className="text-[11px] text-terminal-muted">Loading alert snapshot…</span>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="rounded-2xl p-4 border border-neon-amber/25 bg-neon-amber/[0.04]">
        <div className="flex items-start gap-2">
          <Bell size={14} className="text-neon-amber mt-0.5" />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-neon-amber">Alert snapshot unavailable</p>
            <p className="text-[11px] text-terminal-muted mt-0.5">
              {error ?? 'Could not find the exact moment this alert fired. Live state is shown below.'}
            </p>
          </div>
          <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="text-terminal-muted hover:text-slate-200">
            <XIcon size={12} />
          </button>
        </div>
      </div>
    );
  }

  const asset = snapshot.asset;
  const direction =
    snapshot.bias === 'BULLISH' ? 'BULLISH' :
    snapshot.bias === 'BEARISH' ? 'BEARISH' :
    'NEUTRAL';
  const accent = BIAS_COLOR[direction];

  // Timeframe-specific trade plan: prefer the interval the alert was for;
  // fall back to the other if missing.
  const plan: TradePlan | null =
    (timeframe === '1h' ? asset?.tradePlan1H : asset?.tradePlan) ??
    asset?.tradePlan ??
    asset?.tradePlan1H ??
    null;

  const capturedDate = new Date(snapshot.capturedAt.replace(' ', 'T') + 'Z');
  const minsAgo = Math.max(0, Math.round((Date.now() - capturedDate.getTime()) / 60000));

  return (
    <div
      className="relative rounded-2xl border p-4 sm:p-5 animate-fade-in-up"
      style={{
        borderColor: `${accent}40`,
        background: `linear-gradient(135deg, ${accent}10, ${accent}02 60%)`,
        boxShadow: `0 0 24px ${accent}18`,
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss alert replay"
        className="absolute top-3 right-3 text-terminal-muted hover:text-slate-200 transition-colors"
      >
        <XIcon size={14} />
      </button>

      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl border flex-shrink-0"
          style={{ borderColor: `${accent}50`, background: `${accent}15` }}
        >
          <Bell size={15} style={{ color: accent }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
            <p
              className="text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ color: accent }}
            >
              Alert replay · {direction} · {snapshot.phase} on {(timeframe ?? snapshot.interval).toUpperCase()}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] text-terminal-muted font-mono-nums">
              <Clock size={9} />
              {minsAgo < 1 ? 'just now' : minsAgo < 60 ? `${minsAgo} min ago` : `${Math.round(minsAgo / 60)}h ago`}
              <span className="text-terminal-muted/60">· {capturedDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} UTC</span>
            </span>
          </div>

          <p className="text-[13px] text-slate-200 mt-1 leading-relaxed">
            This is what the engine reported at the moment this alert fired. Scroll down for current live state — compare to see if the setup is still valid.
          </p>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Price at alert" value={fmtPrice(snapshot.price, decimals)} color="#fafafa" />
            <Stat label="Score" value={`${snapshot.score > 0 ? '+' : ''}${snapshot.score}`} color={accent} />
            {asset?.confluence?.aligned && (
              <Stat label="Confluence" value="⚡ A+" color="#00ff9d" />
            )}
            {asset?.icc.correction.currentDepth !== null && asset?.icc.correction.currentDepth !== undefined && (
              <Stat label="Correction" value={`${asset.icc.correction.currentDepth}%`} color="#00e5ff" />
            )}
          </div>

          {plan && (
            <div
              className="mt-3 rounded-xl border px-3 py-2.5"
              style={{
                borderColor: `${accent}30`,
                background: `${accent}06`,
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold mb-1.5" style={{ color: accent }}>
                📍 Trade plan at alert time · {plan.direction.toUpperCase()}
              </p>
              <div className="grid grid-cols-4 gap-2 text-[11px]">
                <PlanStat label="Entry" value={fmtPrice(plan.entry, decimals)} color="#fafafa" />
                <PlanStat label="SL · 1R" value={fmtPrice(plan.stopLoss, decimals)} color="#ff3d57" />
                <PlanStat label="TP · 2R" value={fmtPrice(plan.takeProfit1, decimals)} color="#00ff9d" />
                <PlanStat label="TP · 3R" value={fmtPrice(plan.takeProfit2, decimals)} color="#00e5ff" />
              </div>
            </div>
          )}

          {asset?.narrative && (
            <p className="text-[11px] italic text-terminal-muted mt-2 leading-relaxed">
              "{asset.narrative}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
        {label}
      </p>
      <p className="font-mono-nums text-[14px] font-black mt-0.5" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function PlanStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.14em] text-terminal-muted font-semibold">
        {label}
      </p>
      <p className="font-mono-nums text-[12px] font-bold mt-0.5" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
