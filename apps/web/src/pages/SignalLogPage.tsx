import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Pause,
  Play,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface FollowerExecution {
  follower_alias: string;
  status: 'executed' | 'blocked' | 'failed';
  executed_price: number | null;
  slippage: number | null;
  execution_time_ms: number;
  block_reason?: string;
}

interface Signal {
  signal_id: string;
  sequence_num: number;
  magic_number: number;
  time: string;
  date: string;
  master_alias: string;
  symbol: string;
  action: 'OPEN BUY' | 'OPEN SELL' | 'CLOSE' | 'MODIFY';
  volume: number;
  price: number;
  sl: number | null;
  tp: number | null;
  latency_ms: number;
  status: 'executed' | 'blocked' | 'failed';
  block_reason?: string;
  executions: FollowerExecution[];
}

/* ------------------------------------------------------------------ */
/*  Mock data generator                                               */
/* ------------------------------------------------------------------ */

const SYMBOLS = ['XAUUSD', 'EURUSD', 'GBPJPY', 'USDJPY', 'BTCUSD', 'NAS100', 'US30'];
const MASTERS = ['Gold Scalper', 'Trend Hunter', 'News Sniper'];
const ACTIONS: Signal['action'][] = ['OPEN BUY', 'OPEN SELL', 'CLOSE', 'MODIFY'];
const STATUSES: Signal['status'][] = ['executed', 'executed', 'executed', 'blocked', 'failed'];
const BLOCK_REASONS = [
  'Max daily loss reached',
  'Symbol not mapped',
  'Outside trading hours',
  'Max drawdown exceeded',
];
const FOLLOWER_ALIASES = ['Copy Acc 1', 'Live Fund', 'Demo Tester', 'Prop Firm'];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function generateMockSignals(): Signal[] {
  const signals: Signal[] = [];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const d = new Date(now.getTime() - i * 47_000 - Math.random() * 30_000);
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];

    const isForex = ['EURUSD', 'GBPJPY', 'USDJPY'].includes(symbol);
    const basePrice = symbol === 'XAUUSD'
      ? randomBetween(2620, 2680)
      : symbol === 'BTCUSD'
        ? randomBetween(94000, 98000)
        : symbol === 'NAS100'
          ? randomBetween(19500, 20200)
          : symbol === 'US30'
            ? randomBetween(42000, 43500)
            : isForex
              ? randomBetween(0.9, 1.8)
              : randomBetween(140, 160);

    const pricePrecision = isForex ? 5 : symbol === 'BTCUSD' ? 1 : 2;
    const slDistance = basePrice * (isForex ? 0.002 : 0.003);
    const tpDistance = basePrice * (isForex ? 0.004 : 0.006);

    const executions: FollowerExecution[] = [];
    const followerCount = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < followerCount; j++) {
      const execStatus = status === 'blocked' ? 'blocked' : (['executed', 'executed', 'failed'] as const)[Math.floor(Math.random() * 3)];
      executions.push({
        follower_alias: FOLLOWER_ALIASES[j % FOLLOWER_ALIASES.length],
        status: execStatus,
        executed_price: execStatus === 'executed' ? Number((basePrice + randomBetween(-0.5, 0.5)).toFixed(pricePrecision)) : null,
        slippage: execStatus === 'executed' ? Number(randomBetween(-0.3, 0.5).toFixed(1)) : null,
        execution_time_ms: Math.floor(randomBetween(3, 45)),
        block_reason: execStatus === 'blocked' ? BLOCK_REASONS[Math.floor(Math.random() * BLOCK_REASONS.length)] : undefined,
      });
    }

    signals.push({
      signal_id: `sig_${crypto.randomUUID().slice(0, 8)}`,
      sequence_num: 1000 - i,
      magic_number: 100000 + Math.floor(Math.random() * 900000),
      time: d.toLocaleTimeString('en-GB', { hour12: false }),
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      master_alias: MASTERS[Math.floor(Math.random() * MASTERS.length)],
      symbol,
      action,
      volume: Number((Math.ceil(Math.random() * 10) * 0.1).toFixed(2)),
      price: Number(basePrice.toFixed(pricePrecision)),
      sl: action !== 'CLOSE' ? Number((basePrice - slDistance).toFixed(pricePrecision)) : null,
      tp: action !== 'CLOSE' ? Number((basePrice + tpDistance).toFixed(pricePrecision)) : null,
      latency_ms: Math.floor(randomBetween(3, 120)),
      status,
      block_reason: status === 'blocked' ? BLOCK_REASONS[Math.floor(Math.random() * BLOCK_REASONS.length)] : undefined,
      executions,
    });
  }

  return signals;
}

/* ------------------------------------------------------------------ */
/*  Action / Status badge helpers                                     */
/* ------------------------------------------------------------------ */

function ActionBadge({ action }: { action: Signal['action'] }) {
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

function StatusBadge({ status }: { status: Signal['status'] }) {
  const variant = status === 'executed' ? 'green' : status === 'blocked' ? 'amber' : 'red';
  return <Badge variant={variant}>{status}</Badge>;
}

/* ------------------------------------------------------------------ */
/*  Expandable Row                                                    */
/* ------------------------------------------------------------------ */

function ExpandedDetails({ signal }: { signal: Signal }) {
  return (
    <tr>
      <td colSpan={9} className="border-b border-terminal-border bg-terminal-surface/50 px-4 py-4">
        <div className="space-y-4 max-w-3xl">
          {/* Signal metadata */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-terminal-muted">Signal ID</span>
              <p className="font-mono-nums text-slate-300 mt-0.5">{signal.signal_id}</p>
            </div>
            <div>
              <span className="text-terminal-muted">Sequence</span>
              <p className="font-mono-nums text-slate-300 mt-0.5">{signal.sequence_num}</p>
            </div>
            <div>
              <span className="text-terminal-muted">Magic Number</span>
              <p className="font-mono-nums text-slate-300 mt-0.5">{signal.magic_number}</p>
            </div>
          </div>

          {signal.block_reason && (
            <div className="rounded-lg border border-neon-amber/30 bg-neon-amber/5 px-3 py-2 text-xs text-neon-amber">
              Blocked: {signal.block_reason}
            </div>
          )}

          {/* Execution chain */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Execution Chain
            </h4>
            <div className="space-y-1.5">
              {signal.executions.map((exec, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border border-terminal-border bg-terminal-card px-3 py-2 text-xs"
                >
                  <span className="text-slate-300 font-medium w-24 shrink-0">
                    {exec.follower_alias}
                  </span>
                  <StatusBadge status={exec.status} />
                  {exec.executed_price != null && (
                    <span className="font-mono-nums text-slate-400">
                      @ {exec.executed_price}
                    </span>
                  )}
                  {exec.slippage != null && (
                    <span
                      className={`font-mono-nums ${
                        exec.slippage > 0 ? 'text-neon-red' : 'text-neon-green'
                      }`}
                    >
                      {exec.slippage > 0 ? '+' : ''}
                      {exec.slippage} slip
                    </span>
                  )}
                  <span className="font-mono-nums text-terminal-muted ml-auto">
                    {exec.execution_time_ms}ms
                  </span>
                  {exec.block_reason && (
                    <span className="text-neon-amber">{exec.block_reason}</span>
                  )}
                </div>
              ))}
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

export function SignalLogPage() {
  const [signals] = useState<Signal[]>(() => generateMockSignals());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filters
  const [filterMaster, setFilterMaster] = useState('all');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Unique masters for filter dropdown
  const masterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Masters' },
      ...Array.from(new Set(signals.map((s) => s.master_alias))).map((m) => ({
        value: m,
        label: m,
      })),
    ],
    [signals],
  );

  const actionOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'OPEN BUY', label: 'Open Buy' },
    { value: 'OPEN SELL', label: 'Open Sell' },
    { value: 'CLOSE', label: 'Close' },
    { value: 'MODIFY', label: 'Modify' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'executed', label: 'Executed' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'failed', label: 'Failed' },
  ];

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      if (filterMaster !== 'all' && s.master_alias !== filterMaster) return false;
      if (filterSymbol && !s.symbol.toLowerCase().includes(filterSymbol.toLowerCase())) return false;
      if (filterAction !== 'all' && s.action !== filterAction) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      return true;
    });
  }, [signals, filterMaster, filterSymbol, filterAction, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Signal Log</h1>
          {autoRefresh && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon-cyan" />
            </span>
          )}
        </div>

        <Button
          variant={autoRefresh ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setAutoRefresh((v) => !v)}
        >
          {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
          {autoRefresh ? 'Pause' : 'Resume'}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-terminal-border bg-terminal-card p-4">
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
        <div className="w-36">
          <Select
            label="Status"
            options={statusOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw size={40} className="text-terminal-muted mb-4 opacity-30" />
          <p className="text-sm text-terminal-muted">
            No signals yet. Connect your Master EA to start receiving signals.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-terminal-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-terminal-surface sticky top-0 z-10">
                <th className="w-8 px-3 py-3" />
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  Time
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  Master
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  Symbol
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  Action
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  Volume
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  Price
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  SL / TP
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  Latency
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-terminal-muted">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((signal, idx) => {
                const isExpanded = expandedRow === signal.signal_id;
                return (
                  <>
                    <tr
                      key={signal.signal_id}
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : signal.signal_id)
                      }
                      className={`cursor-pointer border-b border-terminal-border transition-colors ${
                        idx % 2 === 0 ? 'bg-terminal-card' : 'bg-terminal-surface'
                      } hover:bg-terminal-card/50`}
                    >
                      <td className="px-3 py-2.5 text-terminal-muted">
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono-nums text-slate-200 block">
                          {signal.time}
                        </span>
                        <span className="font-mono-nums text-xs text-terminal-muted">
                          {signal.date}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="purple">{signal.master_alias}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="cyan">{signal.symbol}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <ActionBadge action={signal.action} />
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
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-nums text-slate-400">
                        {signal.latency_ms}ms
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StatusBadge status={signal.status} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <ExpandedDetails
                        key={`${signal.signal_id}-details`}
                        signal={signal}
                      />
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
