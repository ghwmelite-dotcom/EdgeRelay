// V2 of /bias — Phase 1 of the goldmine plan.
//   Cover band (Sage hero) → Anchor brief (streamed) → Delta block → existing
//   5-asset constellation → ICC confluence panel → methodology footer.
// Pulse strip, Crowd consensus, Today's Plans bands and the asset star marker
// land in Phase 2.
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BackBreadcrumb } from '@/components/bias/BackBreadcrumb';
import { useBiasData } from '@/hooks/useBiasData';
import { useMarketBiasStore } from '@/stores/marketBias';
import { useBiasAccuracyStore } from '@/stores/biasAccuracy';
import { useSageBrief } from '@/hooks/useSageBrief';
import { useSageDelta } from '@/hooks/useSageDelta';
import { useAuthStore } from '@/stores/auth';
import { AssetBiasCard } from '@/components/bias/AssetBiasCard';
import { ICCConfluencePanel } from '@/components/bias/ICCConfluencePanel';
import { CoverBand } from '@/components/bias/sage/CoverBand';
import { AnchorBriefBand } from '@/components/bias/sage/AnchorBriefBand';
import { DeltaBlockBand } from '@/components/bias/sage/DeltaBlockBand';

export function BiasEnginePageV2() {
  const { data, isLoading } = useBiasData();
  const [params, setParams] = useSearchParams();
  const selectedSymbol = useMarketBiasStore((s) => s.selectedSymbol);
  const setSelected    = useMarketBiasStore((s) => s.setSelected);
  const accuracyData   = useBiasAccuracyStore((s) => s.data);
  const fetchAccuracy  = useBiasAccuracyStore((s) => s.fetchAccuracy);
  const userName       = useAuthStore((s) => s.user?.name ?? null);

  const brief = useSageBrief();
  const delta = useSageDelta();

  useEffect(() => { fetchAccuracy(); }, [fetchAccuracy]);

  useEffect(() => {
    const urlSymbol = params.get('symbol');
    if (urlSymbol && urlSymbol !== selectedSymbol) setSelected(urlSymbol.toUpperCase());
  }, [params, selectedSymbol, setSelected]);

  const handleSelect = (symbol: string) => {
    const next = selectedSymbol === symbol ? null : symbol;
    setSelected(next);
    if (next) setParams({ symbol: next });
    else setParams({});
  };

  const selected = useMemo(() => {
    if (!data || !selectedSymbol) return null;
    return data.assets.find((a) => a.symbol === selectedSymbol) ?? null;
  }, [data, selectedSymbol]);

  return (
    <div className="min-h-screen bg-terminal-bg">
      <div className="max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
        <BackBreadcrumb trail={[{ label: 'Market Bias Engine' }]} />

        {/* 1. Cover */}
        <CoverBand generatedAt={null} userName={userName} />

        {/* 2. Anchor brief */}
        <AnchorBriefBand
          briefMd={brief.briefMd}
          isStreaming={brief.isStreaming}
          level={null}
          error={brief.error}
        />

        {/* 3. Delta */}
        <DeltaBlockBand
          briefMd={delta.briefMd}
          hasDelta={delta.hasDelta}
          isStreaming={delta.isStreaming}
        />

        {/* 5. Asset constellation (existing 5-card grid, preserved) */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              Tracked Assets · 4H
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/15 to-transparent" />
          </div>
          {isLoading && (!data || data.assets.length === 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-premium rounded-2xl h-[200px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {data?.assets.map((asset, i) => (
                <AssetBiasCard
                  key={asset.symbol}
                  asset={asset}
                  selected={selectedSymbol === asset.symbol}
                  onSelect={handleSelect}
                  accuracy={accuracyData?.[asset.symbol]}
                  delay={i * 60}
                />
              ))}
            </div>
          )}
        </section>

        {/* 6. Detail panel (existing) */}
        {selected && (
          <ICCConfluencePanel asset={selected} accuracy={accuracyData?.[selected.symbol]} />
        )}

        {/* 8. Methodology footer */}
        <section className="glass-premium rounded-2xl p-5">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-3">
            How this engine works
          </h3>
          <p className="text-[11px] text-terminal-muted leading-relaxed">
            4H directional bias using the Indication · Correction · Continuation method.
            For educational purposes only. Not financial advice. Past performance does not
            indicate future results.
          </p>
        </section>
      </div>
    </div>
  );
}
