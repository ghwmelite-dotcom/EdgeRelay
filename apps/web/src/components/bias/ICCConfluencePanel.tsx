// Detail panel — three columns on desktop, stacked on mobile:
//   Left  : module score bars
//   Center: BiasGauge + ICCPhaseIndicator
//   Right : key structural levels + correction zone meter + session
import type { AssetBias, AccuracyBreakdown } from '@edgerelay/shared';
import { BiasGauge } from './BiasGauge';
import { ICCPhaseIndicator } from './ICCPhaseIndicator';
import { ConfluenceBar } from './ConfluenceBar';
import { CorrectionZoneMeter } from './CorrectionZoneMeter';
import { SessionIndicator } from './SessionIndicator';
import { ConfluenceBadge } from './ConfluenceBadge';
import { AccuracyStat } from './AccuracyStat';
import { ShareSnapshot } from './ShareSnapshot';
import { TradePlanCard } from './TradePlanCard';
import { decimalsFor, fmtPrice } from './biasColors';

interface ICCConfluencePanelProps {
  asset: AssetBias;
  accuracy?: AccuracyBreakdown;
}

const WEIGHTS = {
  marketState:     0.30,
  iccPhase:        0.25,
  swingStructure:  0.20,
  correctionZone:  0.15,
  sessionMomentum: 0.10,
};

export function ICCConfluencePanel({ asset, accuracy }: ICCConfluencePanelProps) {
  const dec = decimalsFor(asset);
  const icc = asset.icc;

  return (
    <div className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-terminal-border/40">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono-nums text-lg font-black text-slate-100">{asset.symbol}</p>
            <span className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              {asset.label} · {asset.category}
            </span>
          </div>
          <p className="font-mono-nums text-[11px] text-slate-400 mt-0.5">
            4H · ICC Engine v1 · Score <span style={{ color: '#00e5ff' }}>{asset.score > 0 ? '+' : ''}{asset.score}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <AccuracyStat breakdown={accuracy} />
          <SessionIndicator session={icc.session} />
          <ShareSnapshot asset={asset} />
        </div>
      </div>

      {accuracy && (
        <div className="mb-5 grid grid-cols-4 gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((w) => {
            const s = accuracy.byWindow[w];
            const verified = s.correct + s.incorrect;
            const color = verified < 5 ? '#525252'
              : s.winRate >= 65 ? '#00ff9d'
              : s.winRate >= 50 ? '#00e5ff'
              : s.winRate >= 40 ? '#ffb800'
              : '#ff3d57';
            return (
              <div
                key={w}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: `${color}30`, background: `${color}08` }}
              >
                <p className="text-[9px] uppercase tracking-[0.16em] text-terminal-muted font-bold">
                  {w === 'all' ? 'All time' : `Last ${w}`}
                </p>
                <p className="font-mono-nums text-[15px] font-black mt-0.5" style={{ color }}>
                  {verified >= 5 ? `${s.winRate}%` : '—'}
                </p>
                <p className="text-[9px] text-terminal-muted mt-0.5">
                  {verified} verified · avg {s.avgMovePct}%
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Trade plan cards — rendered at top when a live Continuation
          exists on either timeframe. Placed above the narrative so the
          actionable levels are the first thing the user sees. */}
      {(asset.tradePlan || asset.tradePlan1H) && (
        <div className="mb-5 space-y-3">
          {asset.tradePlan && (
            <TradePlanCard plan={asset.tradePlan} timeframe="4H" symbol={asset.symbol} decimals={dec} />
          )}
          {asset.tradePlan1H && (
            <TradePlanCard plan={asset.tradePlan1H} timeframe="1H" symbol={asset.symbol} decimals={dec} />
          )}
        </div>
      )}

      {asset.narrative && (
        <div className="mb-5 relative overflow-hidden rounded-xl border border-neon-cyan/20 bg-gradient-to-r from-neon-cyan/[0.04] to-transparent px-4 py-3">
          <div className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-neon-cyan/60 to-neon-cyan/10" />
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[15px]" aria-hidden>✨</span>
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-neon-cyan/80 font-bold mb-1">
                AI read · updated every 15 min
              </p>
              <p className="text-[13px] text-slate-200 leading-relaxed">{asset.narrative}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: module bars */}
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
            Module Scores
          </p>

          <ConfluenceBar
            label="Market State"
            score={icc.marketState.score}
            weight={WEIGHTS.marketState}
            detail={`${icc.marketState.state} — sequence ${icc.marketState.swingSequence}`}
          />
          <ConfluenceBar
            label="ICC Phase"
            score={icc.phase.score}
            weight={WEIGHTS.iccPhase}
            detail={icc.phase.detail}
          />
          <ConfluenceBar
            label="Structure"
            score={icc.structure.score}
            weight={WEIGHTS.swingStructure}
            detail={describeStructure(icc.structure, dec)}
          />
          <ConfluenceBar
            label="Correction"
            score={icc.correction.score}
            weight={WEIGHTS.correctionZone}
            detail={`Zone: ${icc.correction.zone}${icc.correction.currentDepth !== null ? ` · ${icc.correction.currentDepth}% depth` : ''}`}
          />
          <ConfluenceBar
            label="Session & Momentum"
            score={icc.session.score}
            weight={WEIGHTS.sessionMomentum}
            detail={icc.session.recentCandleProfile || `${icc.session.active} session · ${icc.session.momentum} momentum`}
          />
        </div>

        {/* Center: gauge(s) + phase indicator */}
        <div className="flex flex-col items-center gap-5">
          {asset.bias1H !== undefined ? (
            <div className="w-full flex flex-col items-center gap-3">
              {asset.confluence?.aligned && (
                <div className="animate-fade-in-up">
                  <ConfluenceBadge asset={asset} size="md" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-terminal-muted font-bold mb-1">4H</span>
                  <BiasGauge score={asset.score} size={150} label={asset.bias} />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-terminal-muted font-bold mb-1">1H</span>
                  <BiasGauge score={asset.score1H ?? 0} size={150} label={asset.bias1H} />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-snug px-2">
                {asset.confluence?.reason}
              </p>
            </div>
          ) : (
            <BiasGauge score={asset.score} size={200} label={asset.bias} />
          )}

          <div className="w-full">
            <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-3 text-center">
              ICC Phase Tracker · 4H
            </p>
            <ICCPhaseIndicator
              phase={icc.phase.current}
              marketState={icc.marketState.state}
              detail={icc.phase.detail}
              size="full"
            />
            {asset.icc1H && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-2 text-center">
                  1H Phase
                </p>
                <ICCPhaseIndicator
                  phase={asset.icc1H.phase.current}
                  marketState={asset.icc1H.marketState.state}
                  detail={asset.icc1H.phase.detail}
                  size="compact"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: key levels + correction meter */}
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
            Structural Levels
          </p>

          <div className="rounded-xl border border-terminal-border bg-terminal-surface/40 px-4 py-3 space-y-2">
            <KeyLevel label="Last swing high" price={icc.structure.keyLevels.lastSwingHigh} dec={dec} />
            <KeyLevel label="Last swing low"  price={icc.structure.keyLevels.lastSwingLow}  dec={dec} />
            <KeyLevel label="Prev. swing high" price={icc.structure.keyLevels.previousSwingHigh} dec={dec} faint />
            <KeyLevel label="Prev. swing low"  price={icc.structure.keyLevels.previousSwingLow}  dec={dec} faint />
            {icc.phase.indicationLevel !== null && (
              <KeyLevel
                label="Indication level"
                price={icc.phase.indicationLevel}
                dec={dec}
                accent="#ffb800"
              />
            )}
          </div>

          <CorrectionZoneMeter
            correction={icc.correction}
            marketState={icc.marketState.state}
            decimals={dec}
            height={240}
          />
        </div>
      </div>

      {asset.tradeable && icc.phase.entryReady && (
        <div className="mt-5 px-4 py-3 rounded-xl border border-neon-green/30 bg-neon-green/[0.06]">
          <p className="text-[11px] text-neon-green font-bold uppercase tracking-[0.18em]">
            Entry window open
          </p>
          <p className="text-[12px] text-slate-300 mt-1">
            4H bias supports entries in the Indication direction. Drop to 15M / 5M for your exact entry — 4H bias is not a signal.
          </p>
        </div>
      )}

      <p className="mt-5 text-[10px] text-terminal-muted/80 leading-relaxed">
        For educational purposes only. Not financial advice. Past performance does not indicate future results.
      </p>
    </div>
  );
}

function KeyLevel({
  label, price, dec, faint, accent,
}: { label: string; price: number | null; dec: number; faint?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span
        className="uppercase tracking-[0.14em] font-semibold"
        style={{ color: accent ?? (faint ? '#525252' : '#a3a3a3') }}
      >
        {label}
      </span>
      <span
        className="font-mono-nums font-bold"
        style={{ color: accent ?? (faint ? '#a3a3a3' : '#fafafa') }}
      >
        {price !== null ? fmtPrice(price, dec) : '—'}
      </span>
    </div>
  );
}

function describeStructure(
  structure: AssetBias['icc']['structure'],
  dec: number,
): string {
  const { keyLevels, recentBreaks } = structure;
  const parts: string[] = [];
  if (keyLevels.lastSwingHigh !== null && keyLevels.lastSwingLow !== null) {
    parts.push(`Range ${fmtPrice(keyLevels.lastSwingLow, dec)} → ${fmtPrice(keyLevels.lastSwingHigh, dec)}`);
  }
  if (recentBreaks.length > 0) {
    const b = recentBreaks[recentBreaks.length - 1]!;
    parts.push(`Break ${b.direction} ${fmtPrice(b.level, dec)} ${b.barsAgo}b ago`);
  } else {
    parts.push('No recent structural breaks');
  }
  return parts.join(' · ');
}
