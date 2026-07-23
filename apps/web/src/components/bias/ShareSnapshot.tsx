// Branded share card + "Share" button.
//
// The card renders offscreen-but-in-DOM at a fixed 1200x630 (standard OG
// image size). On click, we rasterise it with html-to-image, then:
//   - navigator.share on mobile (native share sheet)
//   - download + copy link to clipboard on desktop
//
// The card is self-contained: one asset, its bias, phase, confluence flag.
// Viral intent: a trader who sees their A+ SETUP wants to screenshot it.
// We remove the screenshotting step.
import { useRef, useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { AssetBias } from '@edgerelay/shared';
import { BIAS_COLOR, decimalsFor, fmtPrice } from './biasColors';

interface ShareSnapshotProps {
  asset: AssetBias;
}

export function ShareSnapshot({ asset }: ShareSnapshotProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'shared' | 'downloaded' | null>(null);

  const biasColor = BIAS_COLOR[asset.bias];
  const dec = decimalsFor(asset);
  const shareUrl = `https://trademetricspro.com/bias/${asset.symbol.toLowerCase()}`;
  const shareText =
    asset.confluence?.aligned
      ? `⚡ A+ ICC Setup on ${asset.symbol}: 4H + 1H both ${asset.bias}. Live read on TradeMetrics Pro.`
      : `${asset.symbol} 4H ICC bias: ${asset.bias} (${asset.icc.phase.current}). Live read on TradeMetrics Pro.`;

  const handleShare = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setDone(null);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#05080d',
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${asset.symbol}-bias.png`, { type: 'image/png' });

      const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof nav.canShare === 'function' &&
        typeof nav.share === 'function' &&
        nav.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({
          title: `${asset.symbol} 4H ICC Bias`,
          text: shareText,
          url: shareUrl,
          files: [file],
        });
        setDone('shared');
      } else {
        // Desktop: download the PNG + copy link
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${asset.symbol}-bias-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        try { await navigator.clipboard.writeText(`${shareText} ${shareUrl}`); } catch { /* ignore */ }
        setDone('downloaded');
      }
    } catch (err) {
      console.error('share failed', err);
    } finally {
      setBusy(false);
      setTimeout(() => setDone(null), 3000);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 px-2.5 py-1 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/15 transition-all disabled:opacity-60"
        aria-label={`Share ${asset.symbol} snapshot`}
      >
        {done === 'shared' ? (
          <><Check size={11} /> Shared</>
        ) : done === 'downloaded' ? (
          <><Check size={11} /> Downloaded</>
        ) : busy ? (
          <>Generating…</>
        ) : (
          <><Share2 size={11} /> Share</>
        )}
      </button>

      {/* Off-screen but in-DOM so html-to-image can rasterise. Fixed 1200x630
          matches standard OG image dimensions for the cleanest social preview. */}
      <div style={{ position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none' }} aria-hidden>
        <div
          ref={cardRef}
          style={{
            width: 1200,
            height: 630,
            background: 'linear-gradient(135deg, #05080d 0%, #0a0f17 100%)',
            color: '#fafafa',
            fontFamily: 'Outfit, system-ui, sans-serif',
            padding: 56,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle grid background */}
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage:
                'linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 40%, transparent 80%)',
            }}
          />
          {/* Glow */}
          <div
            style={{
              position: 'absolute', top: -200, right: -200, width: 600, height: 600,
              background: `radial-gradient(circle, ${biasColor}15 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Top row: wordmark + asset badge */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(0,229,255,0.12)',
                  border: '1px solid rgba(0,229,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#00e5ff', fontWeight: 900,
                }}
              >
                ◆
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#a3a3a3', fontWeight: 700 }}>
                  TradeMetrics Pro
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fafafa' }}>Market Bias Engine</div>
              </div>
            </div>

            <div
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: `${biasColor}15`,
                border: `1px solid ${biasColor}50`,
                color: biasColor,
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {asset.bias}
            </div>
          </div>

          {/* Hero: symbol + price */}
          <div style={{ position: 'relative', marginBottom: 36 }}>
            <div style={{ fontSize: 14, letterSpacing: 4, color: '#a3a3a3', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              {asset.label} · {asset.category} · 4H
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
              <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -2, fontFamily: '"IBM Plex Mono", monospace', color: '#fafafa', lineHeight: 1 }}>
                {asset.symbol}
              </div>
              <div style={{ fontSize: 56, fontWeight: 900, fontFamily: '"IBM Plex Mono", monospace', color: biasColor, lineHeight: 1, textShadow: `0 0 24px ${biasColor}40` }}>
                {fmtPrice(asset.price, dec)}
              </div>
            </div>
          </div>

          {/* A+ SETUP mega badge */}
          {asset.confluence?.aligned && (
            <div style={{ position: 'relative', marginBottom: 30 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: `${biasColor}18`,
                  border: `1px solid ${biasColor}`,
                  boxShadow: `0 0 30px ${biasColor}50`,
                  color: biasColor,
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ fontSize: 26 }}>⚡</span>
                A+ Setup · 4H + 1H Aligned
              </div>
            </div>
          )}

          {/* Phase + confidence block */}
          <div style={{ position: 'relative', display: 'flex', gap: 24, marginBottom: 24 }}>
            <StatBlock label="Phase" value={asset.icc.phase.current.replace('_', ' ')} color="#00e5ff" />
            <StatBlock label="State" value={asset.icc.marketState.state} color="#ffb800" />
            <StatBlock label="Score" value={`${asset.score > 0 ? '+' : ''}${asset.score}`} color={biasColor} />
            <StatBlock label="Confidence" value={`${asset.confidence}%`} color="#b18cff" />
          </div>

          {/* Trade plan strip — only present on live Continuation */}
          {(asset.tradePlan || asset.tradePlan1H) && (() => {
            const p = asset.tradePlan || asset.tradePlan1H!;
            return (
              <div style={{
                position: 'relative',
                display: 'flex',
                gap: 16,
                padding: 18,
                borderRadius: 12,
                border: `1px solid ${biasColor}50`,
                background: `${biasColor}10`,
                marginBottom: 24,
              }}>
                <PlanCell label="Entry" value={fmtPrice(p.entry, dec)} color="#fafafa" />
                <PlanCell label="Stop · 1R" value={fmtPrice(p.stopLoss, dec)} color="#ff3d57" />
                <PlanCell label="TP · 2R" value={fmtPrice(p.takeProfit1, dec)} color="#00ff9d" />
                <PlanCell label="TP · 3R" value={fmtPrice(p.takeProfit2, dec)} color="#00e5ff" />
              </div>
            );
          })()}

          {/* Narrative */}
          {asset.narrative && (
            <div
              style={{
                position: 'relative',
                padding: 20,
                borderRadius: 12,
                background: 'rgba(0,229,255,0.04)',
                border: '1px solid rgba(0,229,255,0.18)',
                marginBottom: 36,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(0,229,255,0.9)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                AI Read
              </div>
              <div style={{ fontSize: 20, color: '#e2e8f0', lineHeight: 1.4 }}>
                {asset.narrative}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ position: 'absolute', bottom: 56, left: 56, right: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, color: '#a3a3a3' }}>
              Live ICC bias · Indication · Correction · Continuation
            </div>
            <div style={{ fontSize: 14, color: '#00e5ff', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700 }}>
              trademetricspro.com/bias/{asset.symbol.toLowerCase()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '12px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 140 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: '#a3a3a3', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: '"IBM Plex Mono", monospace' }}>
        {value}
      </div>
    </div>
  );
}

function PlanCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: '#a3a3a3', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: '"IBM Plex Mono", monospace' }}>
        {value}
      </div>
    </div>
  );
}

