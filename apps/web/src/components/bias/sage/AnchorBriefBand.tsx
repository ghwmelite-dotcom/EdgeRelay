import { Sparkles, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnchorBriefBandProps {
  briefMd: string;
  isStreaming: boolean;
  level: 'L1' | 'L2' | null;
  error: string | null;
}

export function AnchorBriefBand({ briefMd, isStreaming, level, error }: AnchorBriefBandProps) {
  // Anonymous users — show a clear "sign in to unlock" CTA instead of pretending
  // to load forever. Sage requires auth so we can personalize and rate-limit.
  if (error === 'not_authenticated') {
    return (
      <section className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-neon-purple" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-neon-purple font-bold">
            Sage · Personalized Brief
          </span>
        </div>
        <p className="text-slate-200 text-[13px] leading-[1.65] mb-3">
          Every morning, Sage reads the bias engine and writes you a personalized briefing in
          plain English — citing your own win-rate per ICC phase once you've journaled trades.
        </p>
        <p className="text-slate-400 text-[12px] leading-[1.55] mb-4">
          <span className="text-neon-purple">Sign in</span> to unlock your morning brief, the
          "since you last looked" delta updates, and journal-aware coaching.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neon-purple/40 bg-neon-purple/15 px-4 py-2 text-[12px] font-semibold text-neon-purple hover:bg-neon-purple/25 transition-colors"
        >
          <LogIn size={12} />
          Sign in for your brief
        </Link>
      </section>
    );
  }
  if (error) {
    return (
      <section className="rounded-2xl border border-neon-red/20 bg-neon-red/[0.04] p-5 animate-fade-in-up">
        <p className="text-[12px] text-neon-red font-semibold">Sage is unavailable</p>
        <p className="text-[11px] text-slate-400 mt-1">{error}</p>
      </section>
    );
  }
  if (!briefMd) {
    return (
      <section className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-neon-purple animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-neon-purple font-bold">
            Sage is thinking…
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-700/50 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-slate-700/50 rounded w-full animate-pulse" />
          <div className="h-3 bg-slate-700/50 rounded w-5/6 animate-pulse" />
        </div>
      </section>
    );
  }
  return (
    <section className="glass-premium rounded-2xl p-5 sm:p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-neon-purple" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-neon-purple font-bold">
            Anchor Brief
          </span>
        </div>
        {level === 'L1' && (
          <span
            className="text-[10px] text-slate-500"
            title="Connect MT5 and journal trades to unlock journal-aware briefings"
          >
            L1 · context only
          </span>
        )}
      </div>
      <div
        className="prose-sage text-slate-100 text-[13px] leading-[1.7]"
        dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(briefMd) }}
      />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-neon-purple animate-pulse align-text-bottom ml-1" />
      )}
    </section>
  );
}

// Minimal renderer: paragraphs (\n\n), **bold**, *italic*. No links, no images.
// Inputs come from a constrained LLM prompt (see workers/bias-sage/src/voiceSpec.ts);
// HTML escape first, then apply tokens.
function renderInlineMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return md
    .split(/\n\n+/)
    .map(
      (para) =>
        `<p class="mb-3 last:mb-0">${escape(para)
          .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-50">$1</strong>')
          .replace(/(^|[\s(])\*(.+?)\*([\s).,!?]|$)/g, '$1<em class="text-neon-purple">$2</em>$3')
          .replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
}
