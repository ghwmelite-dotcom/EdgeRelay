import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LIVE_POSITION_STALE_MS, type LivePositionsResponse } from '@edgerelay/shared';
import { api } from '@/lib/api';

export function LivePositionsWidget({ accountId }: { accountId: string }) {
  const [data, setData] = useState<LivePositionsResponse | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let disposed = false;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await api.get<LivePositionsResponse>(`/journal/positions/${encodeURIComponent(accountId)}`);
        if (result.error || !result.data) throw new Error('Snapshot unavailable');
        if (!disposed) { setData(result.data); setError(false); setNow(Date.now()); }
      } catch { if (!disposed) setError(true); }
      finally { pending = false; }
    };
    void load();
    const poll = window.setInterval(() => { void load(); }, 15_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { disposed = true; window.clearInterval(poll); window.clearInterval(clock); };
  }, [accountId]);
  const snapshot = data?.snapshot;
  const age = snapshot && data?.received_at ? Math.max(0, now - Math.min(data.received_at, snapshot.captured_at * 1000)) : null;
  const stale = error || data?.stale || age === null || age > LIVE_POSITION_STALE_MS;
  const amount = (value: number) => `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${snapshot?.currency ?? ''}`;
  return <section aria-label="Live positions" className="glass-premium rounded-2xl p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h2 className="text-base font-semibold text-terminal-text">Open Positions &amp; Floating P/L</h2>
      {snapshot && <span role="status" className={stale ? 'text-sm text-neon-amber' : 'text-sm text-neon-green'}>
        {stale ? 'Stale — last known values' : 'Live snapshot'} · {Math.floor((age ?? 0) / 1000)}s ago
      </span>}
    </div>
    {!snapshot ? <p className="text-sm text-terminal-muted">
      {error ? 'Unable to load live positions. Retrying automatically.' : !data ? 'Loading live positions...' : <>Waiting for MT5 live telemetry. Install <Link to="/downloads" className="text-neon-cyan underline">TradeJournal Sync v1.10</Link> and keep the terminal connected. Missing telemetry is not zero P/L.</>}
    </p> : <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {[['Floating P/L', snapshot.floating_profit], ['Equity', snapshot.equity], ['Balance', snapshot.balance]].map(([label, value]) => <div key={String(label)}>
          <p className="text-xs text-terminal-muted">{label}</p>
          <p className="font-mono-nums text-lg text-terminal-text">{amount(Number(value))}</p>
        </div>)}
      </div>
      {snapshot.positions.length === 0 ? <p className="text-sm text-terminal-muted">No open positions in the latest MT5 snapshot.</p> : <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-terminal-text">
          <thead><tr>{['Symbol', 'Side', 'Lots', 'Open', 'Current', 'Profit', 'Swap'].map((label) => <th scope="col" key={label} className="px-3 py-2 text-terminal-muted">{label}</th>)}</tr></thead>
          <tbody>{snapshot.positions.map((position) => <tr key={position.ticket} className="border-t border-terminal-border/40">
            <td className="px-3 py-3">{position.symbol}</td><td className="px-3 py-3 uppercase">{position.direction}</td>
            <td className="px-3 py-3">{position.volume}</td><td className="px-3 py-3">{position.price_open}</td><td className="px-3 py-3">{position.price_current}</td>
            <td className="px-3 py-3 whitespace-nowrap">{amount(position.profit)}</td><td className="px-3 py-3 whitespace-nowrap">{amount(position.swap)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <p className="text-xs text-terminal-muted mt-3">Reported by MT5 every 15 seconds in {snapshot.currency}. Position profit and swap are separate; commissions are not estimated. Closed trades remain in Journal Activity.</p>
    </>}
  </section>;
}
