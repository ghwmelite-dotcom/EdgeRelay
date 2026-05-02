import { Sparkles, MessageCircle } from 'lucide-react';

interface CoverBandProps {
  /** Unix seconds when the anchor brief was generated. null while loading. */
  generatedAt: number | null;
  /** User's display name, or null while loading. */
  userName: string | null;
}

export function CoverBand({ generatedAt, userName }: CoverBandProps) {
  const date = new Date();
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const stamp = generatedAt
    ? new Date(generatedAt * 1000).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;

  return (
    <section className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-neon-purple" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-neon-purple font-bold">
              Your ICC Brief
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100">
            {userName ? `Morning, ${userName}` : 'Good Morning'}
          </h1>
          <p className="text-[11px] text-slate-400 font-mono-nums mt-0.5">
            {dateStr}
            {stamp ? ` · anchor ${stamp}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Audio briefings — coming in Phase 1.5"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-neon-purple/20 bg-neon-purple/5 px-3 py-1.5 text-[11px] font-semibold text-neon-purple opacity-50 cursor-not-allowed"
          >
            🔊 Listen
          </button>
          <a
            href="#ask-sage"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neon-purple/30 bg-neon-purple/10 px-3 py-1.5 text-[11px] font-semibold text-neon-purple hover:bg-neon-purple/15 transition-colors"
          >
            <MessageCircle size={11} />
            Ask Sage
          </a>
        </div>
      </div>
    </section>
  );
}
