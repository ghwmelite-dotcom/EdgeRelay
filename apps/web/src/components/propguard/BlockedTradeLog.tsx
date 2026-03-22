interface BlockedTrade {
  id: string;
  rule_violated: string;
  rule_details: string;
  attempted_symbol: string;
  attempted_volume: number;
  attempted_action: string;
  blocked_at: string;
}

interface BlockedTradeLogProps {
  trades: BlockedTrade[];
}

const ruleColors: Record<string, string> = {
  daily_loss: 'text-red-400',
  max_drawdown: 'text-red-400',
  max_positions: 'text-amber-400',
  max_lot_size: 'text-amber-400',
  news_blackout: 'text-blue-400',
  weekend_holding: 'text-purple-400',
  trading_hours: 'text-zinc-400',
  max_daily_trades: 'text-amber-400',
  session_locked: 'text-red-400',
  emergency_close: 'text-red-400',
};

export function BlockedTradeLog({ trades }: BlockedTradeLogProps) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        No blocked trades yet. PropGuard is watching.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {trades.map((trade) => (
        <div key={trade.id} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-medium ${ruleColors[trade.rule_violated] ?? 'text-zinc-400'}`}
              >
                {trade.rule_violated.toUpperCase()}
              </span>
              <span className="text-xs text-zinc-400">
                {trade.attempted_action} {trade.attempted_symbol} {trade.attempted_volume}
              </span>
            </div>
            <span className="text-xs text-zinc-500">
              {new Date(trade.blocked_at).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{trade.rule_details}</p>
        </div>
      ))}
    </div>
  );
}
