import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Pause,
  Play,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useAccountsStore } from '@/stores/accounts';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ApiSignal {
  id: string;
  master_account_id: string;
  sequence_num: number;
  action: string;
  order_type: string;
  symbol: string;
  volume: number;
  price: number;
  sl: number | null;
  tp: number | null;
  magic_number: number;
  ticket: number;
  comment: string;
  received_at: string;
}

type DisplayAction = 'OPEN BUY' | 'OPEN SELL' | 'CLOSE' | 'MODIFY';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function deriveDisplayAction(signal: ApiSignal): DisplayAction {
  const action = signal.action.toLowerCase();
  if (action === 'open') {
    const ot = signal.order_type?.toLowerCase();
    if (ot === 'sell') return 'OPEN SELL';
    return 'OPEN BUY';
  }
  if (action === 'close') return 'CLOSE';
  if (action === 'modify') return 'MODIFY';
  // Fallback: try to parse combined strings like "open_buy"
  if (action.includes('sell')) return 'OPEN SELL';
  if (action.includes('buy')) return 'OPEN BUY';
  return 'MODIFY';
}

function formatReceivedAt(receivedAt: string): { time: string; date: string } {
  const d = new Date(receivedAt.replace(' ', 'T') + 'Z');
  return {
    time: d.toLocaleTimeString('en-GB', { hour12: false }),
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
  };
}

/* ------------------------------------------------------------------ */
/*  Action / Status badge helpers                                     */
/* ------------------------------------------------------------------ */

function ActionBadge({ action }: { action: DisplayAction }) {
  const variant =
    action === 'OPEN BUY'
      ? 'green'
      : action === 'OPEN SELL'
        ? 'red'
        : action === 'MODIFY'
          ? 'amber'
          : 'muted';
  return <Badge variant={variant}>{action}</Badge>;
}

/* ------------------------------------------------------------------ */
/*  Expandable Row                                                    */
/* ------------------------------------------------------------------ */

function ExpandedDetails({
  signal,
  masterAlias,
}: {
  signal: ApiSignal;
  masterAlias: string;
}) {
  return (
    <tr>
      <td colSpan={9} className="border-b border-terminal-border p-0">
        <div className="bg-terminal-surface/50 border-l-2 border-neon-cyan px-6 py-5">
          <div className="space-y-4 max-w-3xl">
            {/* Signal metadata */}
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-neon-cyan" />
                  Signal ID
                </span>
                <p className="font-mono-nums text-slate-300 mt-1 truncate">
                  {signal.id}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-neon-cyan" />
                  Sequence
                </span>
                <p className="font-mono-nums text-slate-300 mt-1">
                  {signal.sequence_num}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-neon-cyan" />
                  Magic Number
                </span>
                <p className="font-mono-nums text-slate-300 mt-1">
                  {signal.magic_number}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-neon-cyan" />
                  Ticket
                </span>
                <p className="font-mono-nums text-slate-300 mt-1">
                  {signal.ticket}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-neon-purple" />
                  Master
                </span>
                <p className="text-slate-300 mt-1">{masterAlias}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-neon-purple" />
                  Order Type
                </span>
                <p className="text-slate-300 mt-1">{signal.order_type}</p>
              </div>
              {signal.comment && (
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-neon-purple" />
                    Comment
                  </span>
                  <p className="text-slate-300 mt-1">{signal.comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal Log Page                                                   */
/* ------------------------------------------------------------------ */

const LIMIT = 50;

export function SignalLogPage() {
  const [signals, setSignals] = useState<ApiSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filters
  const [filterMaster, setFilterMaster] = useState('all');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  // Accounts for alias mapping
  const { accounts, fetchAccounts } = useAccountsStore();

  const accountAliasMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const acc of accounts) {
      map.set(acc.id, acc.alias);
    }
    return map;
  }, [accounts]);

  const getMasterAlias = useCallback(
    (masterAccountId: string) =>
      accountAliasMap.get(masterAccountId) ?? masterAccountId.slice(0, 8),
    [accountAliasMap],
  );

  // Build query params from filters
  const buildQueryParams = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      params.set('limit', String(LIMIT));
      if (filterSymbol) params.set('symbol', filterSymbol.toUpperCase());
      if (filterAction !== 'all') params.set('action', filterAction);
      if (filterMaster !== 'all') params.set('master_account_id', filterMaster);
      if (cursor) params.set('cursor', cursor);
      return params.toString();
    },
    [filterSymbol, filterAction, filterMaster],
  );

  // Fetch signals
  const fetchSignals = useCallback(
    async (cursor?: string) => {
      setIsLoading(true);
      try {
        const qs = buildQueryParams(cursor);
        const res = await api.get<ApiSignal[]>(`/signals?${qs}`);
        if (res.data) {
          if (cursor) {
            setSignals((prev) => [...prev, ...res.data!]);
          } else {
            setSignals(res.data);
          }
          const meta = res.meta as
            | { has_more?: boolean; next_cursor?: string }
            | undefined;
          setHasMore(meta?.has_more ?? false);
          setNextCursor(meta?.next_cursor);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [buildQueryParams],
  );

  // Fetch accounts on mount
  useEffect(() => {
    if (accounts.length === 0) {
      fetchAccounts();
    }
  }, [accounts.length, fetchAccounts]);

  // Fetch signals on mount and when filters change
  useEffect(() => {
    setNextCursor(undefined);
    fetchSignals();
  }, [fetchSignals]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSignals();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSignals]);

  // Unique masters for filter dropdown (from accounts store)
  const masterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Masters' },
      ...accounts
        .filter((a) => a.role === 'master')
        .map((a) => ({ value: a.id, label: a.alias })),
    ],
    [accounts],
  );

  const actionOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'open', label: 'Open' },
    { value: 'close', label: 'Close' },
    { value: 'modify', label: 'Modify' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="flex items-center justify-between animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-white font-display">
            Signal Log
          </h1>
          {autoRefresh && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neon-cyan status-pulse" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon-cyan shadow-[0_0_6px_#00e5ff,0_0_12px_#00e5ff60]" />
            </span>
          )}
        </div>

        <Button
          variant={autoRefresh ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setAutoRefresh((v) => !v)}
          className="focus-ring"
        >
          {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
          {autoRefresh ? 'Pause' : 'Resume'}
        </Button>
      </div>

      {/* Filter bar */}
      <div
        className="glass rounded-2xl p-4 animate-fade-in-up"
        style={{ animationDelay: '60ms' }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Filter size={16} className="text-terminal-muted mb-2" />
          <div className="w-44">
            <Select
              label="Master"
              options={masterOptions}
              value={filterMaster}
              onChange={(e) => setFilterMaster(e.target.value)}
            />
          </div>
          <div className="w-36">
            <Input
              label="Symbol"
              placeholder="e.g. XAUUSD"
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
            />
          </div>
          <div className="w-36">
            <Select
              label="Action"
              options={actionOptions}
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading && signals.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up"
          style={{ animationDelay: '120ms' }}
        >
          <Loader2
            size={40}
            className="text-neon-cyan mb-4 animate-spin"
          />
          <p className="text-sm text-terminal-muted">Loading signals...</p>
        </div>
      ) : signals.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up"
          style={{ animationDelay: '120ms' }}
        >
          <RefreshCw size={40} className="text-terminal-muted mb-4 opacity-30" />
          <p className="text-sm text-terminal-muted">
            No signals yet. Connect your Master EA to start receiving signals.
          </p>
        </div>
      ) : (
        <div
          className="glass rounded-2xl overflow-hidden animate-fade-in-up"
          style={{ animationDelay: '120ms' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-terminal-surface/80 sticky top-0 z-10">
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">
                    Time
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">
                    Master
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">
                    Symbol
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">
                    Action
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">
                    Volume
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">
                    Price
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">
                    SL / TP
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">
                    Ticket
                  </th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => {
                  const isExpanded = expandedRow === signal.id;
                  const displayAction = deriveDisplayAction(signal);
                  const { time, date } = formatReceivedAt(signal.received_at);
                  const masterAlias = getMasterAlias(signal.master_account_id);
                  return (
                    <>
                      <tr
                        key={signal.id}
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : signal.id)
                        }
                        className="cursor-pointer border-b border-terminal-border/50 data-row transition-colors"
                      >
                        <td className="px-3 py-2.5 text-terminal-muted">
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-neon-cyan" />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono-nums text-neon-cyan/70 text-xs block">
                            {time}
                          </span>
                          <span className="font-mono-nums text-xs text-terminal-muted">
                            {date}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="purple">{masterAlias}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="cyan">{signal.symbol}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <ActionBadge action={displayAction} />
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-nums text-slate-200">
                          {signal.volume.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-nums text-slate-200">
                          {signal.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 5,
                          })}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-nums text-terminal-muted text-xs">
                          {signal.sl != null && signal.tp != null
                            ? `${signal.sl.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 5,
                              })} / ${signal.tp.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 5,
                              })}`
                            : '\u2014'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-nums text-slate-400 text-xs">
                          {signal.ticket}
                        </td>
                      </tr>
                      {isExpanded && (
                        <ExpandedDetails
                          key={`${signal.id}-details`}
                          signal={signal}
                          masterAlias={masterAlias}
                        />
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center py-4 border-t border-terminal-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchSignals(nextCursor)}
                disabled={isLoading}
                className="focus-ring"
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
