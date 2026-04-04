import { useEffect, useState } from 'react';
import { Microscope, Newspaper, Clock, AlertTriangle, CheckCircle2, HelpCircle, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import type { JournalTrade } from '@/stores/journal';

interface NewsEvent {
  event_name: string;
  currency: string;
  impact: string;
  event_time: string;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
}

type Classification = 'news_driven' | 'execution_error' | 'strategy_failure' | 'market_randomness';

interface AutopsyResult {
  classification: Classification;
  confidence: 'high' | 'medium' | 'low';
  newsEvents: NewsEvent[];
  factors: string[];
}

const CLASSIFICATION_META: Record<Classification, { label: string; color: string; icon: typeof Zap; description: string }> = {
  news_driven: { label: 'News-Driven', color: '#ffb800', icon: Newspaper, description: 'A high-impact news event occurred during this trade, likely causing the adverse move.' },
  execution_error: { label: 'Execution Error', color: '#ff3d57', icon: AlertTriangle, description: 'The entry timing, stop placement, or position management deviated from optimal patterns.' },
  strategy_failure: { label: 'Strategy Failure', color: '#b18cff', icon: HelpCircle, description: 'The setup was valid but the market moved against the thesis. Consider if this pair/session combo has a persistent edge leak.' },
  market_randomness: { label: 'Market Randomness', color: '#00e5ff', icon: Zap, description: 'No identifiable cause. This appears to be a normal probabilistic outcome — part of the expected loss distribution.' },
};

function classifyTrade(trade: JournalTrade, newsEvents: NewsEvent[]): AutopsyResult {
  const factors: string[] = [];
  let classification: Classification = 'market_randomness';
  let confidence: 'high' | 'medium' | 'low' = 'medium';

  const isLoss = trade.profit < 0;
  if (!isLoss) {
    return { classification: 'market_randomness', confidence: 'low', newsEvents, factors: ['Trade was profitable — no autopsy needed.'] };
  }

  // Check for news events during the trade
  const highImpactNews = newsEvents.filter((e) => e.impact === 'high');
  if (highImpactNews.length > 0) {
    classification = 'news_driven';
    confidence = 'high';
    factors.push(`${highImpactNews.length} high-impact event(s) occurred during trade lifetime`);
    for (const e of highImpactNews) {
      factors.push(`${e.event_name} (${e.currency}) at ${e.event_time.slice(11, 16)} UTC`);
    }
  }

  // Check spread at entry (if abnormally high)
  if (trade.spread_at_entry && trade.spread_at_entry > 30) {
    if (classification === 'market_randomness') classification = 'execution_error';
    factors.push(`High spread at entry: ${trade.spread_at_entry} points — possible poor timing`);
  }

  // Check if session is user's weakest
  if (trade.session_tag === 'asian' || trade.session_tag === 'off_hours') {
    factors.push(`Trade taken during ${trade.session_tag.replace('_', ' ')} session — historically weaker for most traders`);
    if (classification === 'market_randomness') classification = 'strategy_failure';
  }

  // Check hold time extremes
  if (trade.duration_seconds && trade.duration_seconds < 60) {
    factors.push('Trade held less than 1 minute — possible impulse entry');
    if (classification === 'market_randomness') classification = 'execution_error';
  } else if (trade.duration_seconds && trade.duration_seconds > 28800) {
    factors.push('Trade held over 8 hours — possible failure to manage or exit');
  }

  // Check R:R
  if (trade.risk_reward_ratio && trade.risk_reward_ratio < 0.5) {
    factors.push(`Low R:R realized: ${trade.risk_reward_ratio.toFixed(2)} — stop may have been too tight`);
    if (classification === 'market_randomness') classification = 'execution_error';
  }

  // If no specific factors found
  if (factors.length === 0) {
    factors.push('No specific causal factors identified. This loss falls within normal probability distribution.');
    confidence = 'low';
  }

  return { classification, confidence, newsEvents, factors };
}

function extractCurrencies(symbol: string): string[] {
  const currencies: string[] = [];
  const majors = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD'];
  for (const c of majors) {
    if (symbol.toUpperCase().includes(c)) currencies.push(c);
  }
  // Handle gold/oil
  if (symbol.toUpperCase().includes('XAU')) currencies.push('XAU', 'USD');
  if (symbol.toUpperCase().includes('XAG')) currencies.push('XAG', 'USD');
  return [...new Set(currencies)];
}

interface Props {
  trade: JournalTrade;
  accountId: string;
}

export function TradeAutopsySection({ trade, accountId }: Props) {
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContext() {
      setLoading(true);
      try {
        // Fetch news events around the trade time window
        const tradeEnd = trade.time;
        const tradeStart = trade.duration_seconds ? trade.time - trade.duration_seconds : trade.time - 3600;
        const currencies = extractCurrencies(trade.symbol);

        const from = new Date((tradeStart - 1800) * 1000).toISOString();
        const to = new Date((tradeEnd + 1800) * 1000).toISOString();

        const res = await api.get<{ events: NewsEvent[] }>(
          `/news/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );

        if (res.data?.events) {
          // Filter to relevant currencies
          const relevant = currencies.length > 0
            ? res.data.events.filter((e) => currencies.includes(e.currency))
            : res.data.events;
          setNewsEvents(relevant);
        }
      } catch {
        // Silently fail — news context is supplementary
      }
      setLoading(false);
    }
    fetchContext();
  }, [trade.time, trade.duration_seconds, trade.symbol]);

  // Only show autopsy for losing trades
  if (trade.profit >= 0) return null;

  const autopsy = classifyTrade(trade, newsEvents);
  const meta = CLASSIFICATION_META[autopsy.classification];
  const Icon = meta.icon;

  return (
    <div className="mt-6 rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
      <div className="flex items-center justify-between border-b border-terminal-border/30 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neon-amber/20 bg-neon-amber/10">
            <Microscope size={14} className="text-neon-amber" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Trade Autopsy</h3>
            <p className="font-mono-nums text-[9px] text-terminal-muted">What caused this loss?</p>
          </div>
        </div>

        {/* Classification badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono-nums text-[10px] font-semibold"
            style={{ borderColor: `${meta.color}30`, backgroundColor: `${meta.color}10`, color: meta.color }}
          >
            <Icon size={11} />
            {meta.label}
          </span>
          <span className="font-mono-nums text-[9px] text-terminal-muted">
            {autopsy.confidence} confidence
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Description */}
        <p className="text-[13px] leading-relaxed text-slate-400">{meta.description}</p>

        {/* Contributing factors */}
        <div>
          <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Contributing Factors</p>
          <div className="space-y-1.5">
            {autopsy.factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                <p className="text-[12px] leading-relaxed text-slate-300">{f}</p>
              </div>
            ))}
          </div>
        </div>

        {/* News events during trade */}
        {newsEvents.length > 0 && (
          <div>
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">News Events During Trade</p>
            <div className="space-y-1.5">
              {newsEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-terminal-border/20 bg-terminal-bg/50 px-3 py-2">
                  <span className={`h-2 w-2 rounded-full ${e.impact === 'high' ? 'bg-neon-red' : e.impact === 'medium' ? 'bg-neon-amber' : 'bg-terminal-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{e.event_name}</p>
                    <p className="font-mono-nums text-[10px] text-terminal-muted">
                      {e.currency} · {e.event_time.slice(11, 16)} UTC
                      {e.actual && ` · Actual: ${e.actual}`}
                      {e.forecast && ` · Forecast: ${e.forecast}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <p className="text-[11px] text-terminal-muted animate-pulse">Loading market context...</p>
        )}
      </div>
    </div>
  );
}
