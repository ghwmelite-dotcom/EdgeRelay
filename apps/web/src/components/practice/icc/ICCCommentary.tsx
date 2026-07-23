import { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { generateCommentary, type CommentaryMessage } from '@/lib/icc-commentary-engine';
import type { Candle } from '@/lib/chart-simulator-engine';
import type { Timeframe } from '@/lib/icc-candle-generator';

interface Props {
  candles: Record<Timeframe, Candle[]>;
  visibleCounts: Record<Timeframe, number>;
  tickCount: number;
  enabled: boolean;
}

const MAX_MESSAGES = 5;
const CHECK_INTERVAL = 3; // Check every N ticks

const TYPE_COLORS: Record<string, string> = {
  bullish: '#00ff9d',
  bearish: '#ff3d57',
  neutral: '#ffb800',
  warning: '#b18cff',
  setup: '#00e5ff',
};

export function ICCCommentary({ candles, visibleCounts, tickCount, enabled }: Props) {
  const [messages, setMessages] = useState<CommentaryMessage[]>([]);
  const lastCheckRef = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    if (tickCount - lastCheckRef.current < CHECK_INTERVAL) return;
    lastCheckRef.current = tickCount;

    const msg = generateCommentary(candles, visibleCounts);
    if (msg) {
      setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), msg]);
    }
  }, [tickCount, candles, visibleCounts, enabled]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  if (!enabled || messages.length === 0) return null;

  return (
    <div className="rounded-xl border border-terminal-border/20 bg-terminal-card/15 overflow-hidden animate-fade-in-up">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-terminal-border/10">
        <MessageSquare size={10} className="text-neon-cyan" />
        <span className="font-mono-nums text-[8px] uppercase tracking-widest text-terminal-muted">Live Commentary</span>
      </div>
      <div ref={feedRef} className="px-3 py-2 space-y-1 max-h-[72px] overflow-y-auto scrollbar-thin">
        {messages.map((msg, i) => {
          const isLatest = i === messages.length - 1;
          return (
            <div key={msg.id} className={`flex items-start gap-2 ${isLatest ? 'opacity-100' : 'opacity-50'} transition-opacity`}>
              <span className="h-1.5 w-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: TYPE_COLORS[msg.type] }} />
              <p className="text-[10px] text-slate-400 leading-snug">{msg.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
