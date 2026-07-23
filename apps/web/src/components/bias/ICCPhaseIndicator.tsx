// Hero visualization for the ICC three-phase cycle. Three connected stages
// (Indication → Correction → Continuation). The active stage pulses and
// glows; inactive stages are dimmed. NO_SETUP and CONSOLIDATION render a
// flat "no setup" state rather than highlighting anything.
import type { ICCPhaseKind, MarketStateKind } from '@edgerelay/shared';

interface ICCPhaseIndicatorProps {
  phase: ICCPhaseKind;
  marketState: MarketStateKind;
  detail: string;
  size?: 'compact' | 'full';
}

const PHASE_META = {
  INDICATION:   { label: 'Indication',   color: '#ffb800', hint: 'Break evidence — don\'t enter yet' },
  CORRECTION:   { label: 'Correction',   color: '#00e5ff', hint: 'Pullback in progress — wait it out' },
  CONTINUATION: { label: 'Continuation', color: '#00ff9d', hint: 'Entry window — structure resuming' },
} as const;

export function ICCPhaseIndicator({ phase, marketState, detail, size = 'full' }: ICCPhaseIndicatorProps) {
  const consolidating = marketState === 'CONSOLIDATION';
  const noSetup = phase === 'NO_SETUP';
  const compact = size === 'compact';

  if (consolidating) {
    return (
      <div className="rounded-xl border border-neon-amber/20 bg-neon-amber/[0.05] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-neon-amber animate-pulse" style={{ boxShadow: '0 0 8px #ffb80080' }} />
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-neon-amber font-bold">Consolidation</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Market is sideways — ICC says do not trade.</p>
          </div>
        </div>
      </div>
    );
  }

  const stages: Array<keyof typeof PHASE_META> = ['INDICATION', 'CORRECTION', 'CONTINUATION'];

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, idx) => {
          const meta = PHASE_META[stage];
          const active = !noSetup && stage === phase;
          const dim = noSetup || !active;

          return (
            <div key={stage} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="relative flex-1 rounded-xl border px-2.5 py-2.5 text-center transition-all"
                style={{
                  borderColor: active ? meta.color + '80' : '#262626',
                  background: active ? `${meta.color}12` : '#0d0d0d',
                  boxShadow: active ? `0 0 16px ${meta.color}30, inset 0 0 16px ${meta.color}08` : 'none',
                }}
              >
                {active && (
                  <div
                    className="absolute inset-0 rounded-xl animate-pulse pointer-events-none"
                    style={{ boxShadow: `0 0 24px ${meta.color}25` }}
                  />
                )}
                <p
                  className={compact ? 'text-[9px]' : 'text-[10px]'}
                  style={{
                    color: dim ? '#525252' : meta.color,
                    letterSpacing: '0.16em',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {meta.label}
                </p>
                {!compact && (
                  <p
                    className="text-[9px] mt-1"
                    style={{ color: dim ? '#404040' : '#a3a3a3' }}
                  >
                    {active ? 'Active' : idx === stages.indexOf(phase as keyof typeof PHASE_META) ? '' : ''}
                  </p>
                )}
              </div>
              {idx < stages.length - 1 && (
                <div
                  className="h-px flex-shrink-0 transition-colors"
                  style={{
                    width: compact ? 10 : 18,
                    background: dim ? '#262626' : '#404040',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {!compact && (
        <p className="text-[12px] text-slate-400 leading-relaxed px-1">
          {noSetup ? (
            <span className="text-terminal-muted">No valid ICC setup — stay flat.</span>
          ) : (
            detail
          )}
        </p>
      )}
    </div>
  );
}

export function PhasePip({ phase, marketState }: { phase: ICCPhaseKind; marketState: MarketStateKind }) {
  if (marketState === 'CONSOLIDATION') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
        style={{ color: '#ffb800', background: '#ffb80015', border: '1px solid #ffb80030' }}>
        <span className="h-1.5 w-1.5 rounded-full bg-neon-amber" /> Consolidating
      </span>
    );
  }
  if (phase === 'NO_SETUP') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
        style={{ color: '#525252', background: '#525252' + '10', border: '1px solid #525252' + '30' }}>
        No Setup
      </span>
    );
  }
  const meta = PHASE_META[phase];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
      style={{ color: meta.color, background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 4px ${meta.color}` }} />
      {meta.label}
    </span>
  );
}
