import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Film, Loader2 } from 'lucide-react';
import { ChartCanvas } from '@/components/practice/ChartCanvas';
import { generateReplayCandles, type ReplayData } from '@/lib/trade-replay-engine';
import { api } from '@/lib/api';
import type { JournalTrade } from '@/stores/journal';
import type { Position, ClosedTrade } from '@/lib/chart-simulator-engine';
import { getPipMultiplier } from '@/lib/chart-simulator-engine';

interface Props {
  trade: JournalTrade;
  accountId: string;
}

const SPEEDS = [
  { label: '1x', value: 500 },
  { label: '2x', value: 250 },
  { label: '5x', value: 100 },
];

export function TradeReplaySection({ trade, accountId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [narration, setNarration] = useState<string | null>(null);
  const [narrationLoading, setNarrationLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Only show for closed trades with sufficient data
  if (trade.deal_entry !== 'out' || !trade.duration_seconds || !trade.price) return null;

  const handleOpen = () => {
    const data = generateReplayCandles(trade);
    setReplay(data);
    setVisibleCount(data.entryIndex + 1); // Show pre-entry + entry candle
    setIsOpen(true);
    setIsPlaying(false);
    setNarration(null);
    fetchNarration();
  };

  const fetchNarration = async () => {
    setNarrationLoading(true);
    try {
      const res = await api.post<{ narration: string }>(
        `/journal/trades/${accountId}/${trade.deal_ticket}/narrate`
      );
      if (res.data) setNarration(res.data.narration);
    } catch {}
    setNarrationLoading(false);
  };

  const advance = () => {
    if (!replay) return;
    setVisibleCount(prev => {
      if (prev >= replay.candles.length) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  };

  // Playback interval
  useEffect(() => {
    if (isPlaying && replay) {
      intervalRef.current = setInterval(advance, speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, replay]);

  // Auto-pause at exit
  useEffect(() => {
    if (replay && visibleCount >= replay.candles.length) {
      setIsPlaying(false);
    }
  }, [visibleCount, replay]);

  const handleReset = () => {
    if (!replay) return;
    setVisibleCount(replay.entryIndex + 1);
    setIsPlaying(false);
  };

  if (!isOpen) {
    return (
      <div className="mt-6">
        <button
          onClick={handleOpen}
          className="w-full rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.04] px-5 py-4 flex items-center gap-3 hover:border-neon-cyan/40 hover:bg-neon-cyan/[0.08] transition-all cursor-pointer group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/25 bg-neon-cyan/10 group-hover:shadow-[0_0_16px_rgba(0,229,255,0.15)] transition-shadow">
            <Film size={18} className="text-neon-cyan" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white group-hover:text-neon-cyan transition-colors">Replay This Trade</p>
            <p className="text-[11px] text-terminal-muted">Watch the trade unfold with AI narration</p>
          </div>
        </button>
      </div>
    );
  }

  const isFinished = replay ? visibleCount >= replay.candles.length : false;
  const progress = replay ? Math.round((visibleCount / replay.candles.length) * 100) : 0;
  const pipMult = getPipMultiplier(trade.symbol);

  // Build position/closedTrade for ChartCanvas
  const positions: Position[] = [];
  const closedTrades: ClosedTrade[] = [];

  if (replay) {
    if (!isFinished) {
      positions.push({
        id: `replay-${trade.deal_ticket}`,
        direction: trade.direction as 'buy' | 'sell',
        entryPrice: trade.price,
        lotSize: trade.volume,
        sl: trade.sl || 0,
        tp: trade.tp || 0,
        entryIndex: replay.entryIndex,
        unrealizedPnl: 0,
      });
    } else {
      closedTrades.push({
        id: `replay-${trade.deal_ticket}`,
        direction: trade.direction as 'buy' | 'sell',
        entryPrice: trade.price,
        exitPrice: replay.exitPrice,
        lotSize: trade.volume,
        sl: trade.sl || 0,
        tp: trade.tp || 0,
        pnl: trade.profit || 0,
        pips: trade.pips || 0,
        exitReason: replay.exitReason,
        entryIndex: replay.entryIndex,
        exitIndex: replay.exitIndex,
      });
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-neon-cyan/20 bg-terminal-card/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border/20 px-5 py-3">
        <div className="flex items-center gap-2">
          <Film size={16} className="text-neon-cyan" />
          <span className="text-sm font-semibold text-white">Trade Replay</span>
          <span className="font-mono-nums text-[10px] text-terminal-muted">{replay?.timeframeLabel}</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-terminal-muted hover:text-white transition-colors cursor-pointer text-[11px]">
          Close
        </button>
      </div>

      {/* Chart */}
      {replay && (
        <ChartCanvas
          candles={replay.candles}
          visibleCount={visibleCount}
          positions={positions}
          closedTrades={closedTrades}
          instrument={trade.symbol}
        />
      )}

      {/* Playback Controls */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-terminal-border/20">
        <button onClick={() => setIsPlaying(!isPlaying)} disabled={isFinished}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-30 cursor-pointer">
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={advance} disabled={isFinished}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-white disabled:opacity-30 cursor-pointer">
          <SkipForward size={12} />
        </button>
        <div className="flex gap-1">
          {SPEEDS.map(s => (
            <button key={s.label} onClick={() => setSpeed(s.value)}
              className={`rounded-md px-2 py-1 font-mono-nums text-[9px] cursor-pointer ${speed === s.value ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan' : 'text-terminal-muted hover:text-white'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
          <div className="h-full rounded-full bg-neon-cyan/50 transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={handleReset} className="text-terminal-muted hover:text-white cursor-pointer"><RotateCcw size={12} /></button>
      </div>

      {/* Narration + Summary */}
      <div className="px-5 py-4 space-y-3 border-t border-terminal-border/20">
        {/* AI Narration */}
        {narrationLoading ? (
          <div className="flex items-center gap-2 text-terminal-muted">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[12px]">AI analyzing this trade...</span>
          </div>
        ) : narration ? (
          <div className="rounded-xl border border-neon-purple/20 bg-neon-purple/[0.03] p-4">
            <p className="text-[13px] leading-relaxed text-slate-300 italic">{narration}</p>
          </div>
        ) : null}

        {/* Trade Summary */}
        {isFinished && replay && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2.5 text-center">
              <p className={`font-mono-nums text-sm font-bold ${trade.direction === 'buy' ? 'text-neon-green' : 'text-neon-red'}`}>{trade.direction.toUpperCase()}</p>
              <p className="text-[8px] text-terminal-muted">Direction</p>
            </div>
            <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2.5 text-center">
              <p className={`font-mono-nums text-sm font-bold ${(trade.profit || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
              </p>
              <p className="text-[8px] text-terminal-muted">P&L</p>
            </div>
            <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2.5 text-center">
              <p className="font-mono-nums text-sm font-bold text-neon-cyan">{(trade.pips || 0).toFixed(1)}p</p>
              <p className="text-[8px] text-terminal-muted">Pips</p>
            </div>
            <div className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2.5 text-center">
              <p className={`font-mono-nums text-sm font-bold ${replay.exitReason === 'tp' ? 'text-neon-green' : replay.exitReason === 'sl' ? 'text-neon-red' : 'text-neon-amber'}`}>
                {replay.exitReason.toUpperCase()}
              </p>
              <p className="text-[8px] text-terminal-muted">Exit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
