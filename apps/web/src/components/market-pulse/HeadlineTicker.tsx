import { Newspaper } from 'lucide-react';

interface Headline {
  headline: string;
  source: string;
  published_at: string;
  related_currencies: string | null;
  url: string | null;
}

interface Props {
  headlines: Headline[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function HeadlineTicker({ headlines }: Props) {
  return (
    <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
      <div className="flex items-center justify-between border-b border-terminal-border/20 px-5 py-3">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-neon-purple" />
          <span className="text-sm font-semibold text-white">Latest Headlines</span>
        </div>
        <span className="font-mono-nums text-[10px] text-terminal-muted">{headlines.length} stories</span>
      </div>

      <div className="divide-y divide-terminal-border/10">
        {headlines.map((h, i) => {
          const currencies = h.related_currencies?.split(',').filter(Boolean) || [];
          return (
            <div key={i} className="px-5 py-3 hover:bg-terminal-card/30 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-snug text-slate-300">{h.headline}</p>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="font-mono-nums text-[9px] text-terminal-muted">{timeAgo(h.published_at)}</span>
                    <span className="rounded-full bg-terminal-border/30 px-2 py-0.5 font-mono-nums text-[9px] text-terminal-muted">{h.source}</span>
                    {currencies.map(c => (
                      <span key={c} className="rounded-full bg-neon-cyan/10 border border-neon-cyan/15 px-1.5 py-0.5 font-mono-nums text-[8px] text-neon-cyan">{c.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {headlines.length === 0 && (
          <div className="p-8 text-center">
            <Newspaper size={24} className="mx-auto text-terminal-muted/20 mb-2" />
            <p className="text-[12px] text-terminal-muted">No headlines available</p>
          </div>
        )}
      </div>
    </div>
  );
}
