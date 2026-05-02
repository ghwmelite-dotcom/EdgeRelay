import { RefreshCw } from 'lucide-react';

interface DeltaBlockBandProps {
  briefMd: string;
  hasDelta: boolean;
  isStreaming: boolean;
}

export function DeltaBlockBand({ briefMd, hasDelta, isStreaming }: DeltaBlockBandProps) {
  if (!hasDelta) return null;
  return (
    <section
      className="rounded-2xl border-l-2 p-5 animate-fade-in-up"
      style={{ borderLeftColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.04)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw size={12} className="text-emerald-400" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400 font-bold">
          Since you last looked
        </span>
      </div>
      <div
        className="prose-sage text-slate-100 text-[13px] leading-[1.65]"
        dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(briefMd) }}
      />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse align-text-bottom ml-1" />
      )}
    </section>
  );
}

// Same minimal renderer as AnchorBriefBand. Strips wrapper tags + supports
// both *italic* and _italic_ since Llama 3.3 alternates between them.
function renderInlineMarkdown(md: string): string {
  const stripped = md
    .replace(/<\/?delta>/gi, '')
    .replace(/<\/?brief>/gi, '')
    .replace(/<intent>[\s\S]*?(<\/intent>|$)/gi, '')
    .trim();
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return stripped
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0)
    .map(
      (para) =>
        `<p class="mb-2 last:mb-0">${escape(para)
          .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-50">$1</strong>')
          .replace(/(^|[\s(])\*(.+?)\*([\s).,!?]|$)/g, '$1<em class="text-emerald-400">$2</em>$3')
          .replace(/(^|[\s(])_(.+?)_([\s).,!?]|$)/g, '$1<em class="text-emerald-400">$2</em>$3')
          .replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
}
