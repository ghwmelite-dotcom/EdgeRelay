import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Account } from '@/stores/accounts';
import type { JournalTrade } from '@/stores/journal';
import { Select } from '@/components/ui/Select';
import { FlightCheckWidget } from './FlightCheckWidget';
import { StrategyGenomeWidget } from './StrategyGenomeWidget';
import { CommunityPulseWidget } from './CommunityPulseWidget';

interface JournalSnapshot {
  accountId: string;
  trades: JournalTrade[];
  loading: boolean;
  error: string | null;
}

const EMPTY_TRADES: JournalTrade[] = [];
const ENTRY_LABELS: Record<string, string> = { in: 'Entry', out: 'Exit', inout: 'Reversal', out_by: 'Close by' };

export function JournalActivitySection({ accounts }: { accounts: Account[] }) {
  const [selection, setSelection] = useState('');
  // Include every account role; prefer an account that has actually connected.
  const preferred = accounts.find((account) => account.last_heartbeat) ?? accounts[0];
  const accountId = accounts.some((account) => account.id === selection) ? selection : preferred?.id;
  const [snapshot, setSnapshot] = useState<JournalSnapshot | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!accountId) return;
    let disposed = false;
    let pending = false;
    setSnapshot({ accountId, trades: [], loading: true, error: null });
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await api.get<{ trades: JournalTrade[] }>(
          `/journal/trades/${encodeURIComponent(accountId)}?limit=50`,
        );
        if (response.error) throw new Error(response.error.message);
        if (!Array.isArray(response.data?.trades)) throw new Error('Journal data is unavailable.');
        if (!disposed) setSnapshot({ accountId, trades: response.data.trades, loading: false, error: null });
      } catch {
        if (!disposed) setSnapshot({ accountId, trades: [], loading: false, error: 'Unable to refresh journal activity. Please try again.' });
      } finally {
        pending = false;
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 30_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [accountId, refreshKey]);

  const current = snapshot?.accountId === accountId ? snapshot : null;
  const trades = current?.trades ?? EMPTY_TRADES;

  return (
    <section aria-label="Journal activity" className="space-y-4">
      <div className="glass-premium rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-terminal-text">Recent Journal Activity</h2>
            <p className="text-xs text-terminal-muted mt-1">Synced entries and exits. Refreshes every 30 seconds.</p>
          </div>
          <Link to="/journal" className="text-sm text-neon-cyan hover:underline">Full journal</Link>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-terminal-muted">Connect an MT5 account to see journal activity.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <Select label="Journal account" id="dashboard-journal-account" value={accountId ?? ''}
                onChange={(event) => setSelection(event.target.value)}
                options={accounts.map((account) => ({ value: account.id, label: account.alias }))} />
              <button type="button" className="min-h-12 px-4 rounded-xl border border-terminal-border text-sm text-terminal-text focus-visible:outline focus-visible:outline-neon-cyan"
                onClick={() => setRefreshKey((value) => value + 1)}>Refresh journal</button>
            </div>
            <p className="text-xs text-terminal-muted mb-4">An entry records a trade opening; it does not confirm that the position is still open. Live positions and floating P&amp;L are not supplied by this sync.</p>
            {current?.error ? <p role="alert" className="text-sm text-neon-red">{current.error}</p>
              : !current || current.loading ? <p role="status" className="text-sm text-terminal-muted">Loading journal activity...</p>
              : trades.length === 0 ? <p className="text-sm text-terminal-muted">No synced trades for this account. Check the selected account and the MT5 journal connection.</p>
              : <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead><tr className="text-terminal-muted">
                    {['Symbol', 'Direction', 'Event', 'Lots', 'Deal price'].map((label) => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}
                  </tr></thead>
                  <tbody>{trades.slice(0, 10).map((trade) => <tr key={trade.deal_ticket} className="border-t border-terminal-border/40 text-terminal-text">
                    <td className="px-3 py-3 font-semibold">{trade.symbol}</td>
                    <td className="px-3 py-3 uppercase">{trade.direction}</td>
                    <td className="px-3 py-3">{ENTRY_LABELS[trade.deal_entry] ?? trade.deal_entry}</td>
                    <td className="px-3 py-3 font-mono-nums">{trade.volume?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-3 font-mono-nums">{trade.price?.toLocaleString(undefined, { maximumFractionDigits: 5 }) ?? '—'}</td>
                  </tr>)}</tbody>
                </table>
                <p className="text-xs text-terminal-muted mt-3">Showing the latest {Math.min(trades.length, 10)} synced deals.</p>
              </div>}
          </>
        )}
      </div>
      <p className="text-xs text-terminal-muted">Journal analytics below use the selected account’s latest 50 synced deals.</p>
      <FlightCheckWidget trades={trades} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CommunityPulseWidget />
        <StrategyGenomeWidget trades={trades} />
      </div>
    </section>
  );
}
