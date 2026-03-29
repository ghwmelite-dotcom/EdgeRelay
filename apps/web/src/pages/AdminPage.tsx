import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Crown,
  Users,
  Radio,
  DollarSign,
  Search,
  AlertTriangle,
  Activity,
  BookOpen,
  FlaskConical,
  Store,
  Zap,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Badge } from '@/components/ui/Badge';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface OverviewData {
  total_users: number;
  new_users_week: number;
  master_accounts: number;
  follower_accounts: number;
  total_signals: number;
  signals_today: number;
  total_trades: number;
  total_generations: number;
  ea_purchases: number;
  ea_revenue_cents: number;
  total_providers: number;
  active_subscriptions: number;
  total_strategies: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  created_at: string;
  account_count: number;
  ea_count: number;
}

interface Provider {
  id: string;
  display_name: string;
  user_email: string;
  instruments: string;
  is_listed: boolean;
  total_trades: number | null;
  win_rate: number | null;
  total_pnl: number | null;
  subscriber_count: number | null;
}

interface Payment {
  id: string;
  user_id: string;
  user_email: string;
  reference: string;
  amount_cents: number;
  credited_at: string;
}

interface Generation {
  id: string;
  user_email: string;
  strategy_name: string;
  slug: string;
  generated_at: string;
}

type TabId = 'overview' | 'users' | 'providers' | 'revenue';

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ================================================================== */
/*  Shared UI                                                          */
/* ================================================================== */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  valueClass = 'text-white glow-text-cyan',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  valueClass?: string;
}) {
  return (
    <div className="glass-premium rounded-2xl p-4 animate-fade-in-up">
      <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={12} className="text-neon-cyan" />}
        {!Icon && <span className="h-1 w-1 rounded-full bg-neon-cyan" />}
        {label}
      </p>
      <p className={`text-lg sm:text-2xl font-mono-nums font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-terminal-muted font-mono-nums mt-1">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-premium rounded-2xl p-5 animate-pulse">
      <div className="skeleton h-3 w-20 mb-3 rounded" />
      <div className="skeleton h-7 w-28 rounded" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-premium rounded-2xl p-8 text-center">
      <AlertTriangle size={32} className="text-neon-red mx-auto mb-3" />
      <p className="text-neon-red font-medium mb-1">Failed to load data</p>
      <p className="text-sm text-terminal-muted">{message}</p>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Overview                                                      */
/* ================================================================== */

function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<OverviewData>('/admin/overview').then((res) => {
      if (cancelled) return;
      if (res.error) { setError(res.error.message); setLoading(false); return; }
      setData(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 10 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Users + Accounts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={data.total_users.toLocaleString()}
          sub={`+${data.new_users_week} this week`}
        />
        <StatCard
          label="Master Accounts"
          value={data.master_accounts.toLocaleString()}
          valueClass="text-neon-cyan"
        />
        <StatCard
          label="Follower Accounts"
          value={data.follower_accounts.toLocaleString()}
          valueClass="text-neon-cyan"
        />
        <StatCard
          icon={Activity}
          label="Signals Processed"
          value={data.total_signals.toLocaleString()}
          sub={`${data.signals_today} today`}
        />
      </div>

      {/* Trading + EAs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={BookOpen}
          label="Journal Trades"
          value={data.total_trades.toLocaleString()}
        />
        <StatCard
          icon={Zap}
          label="EAs Generated"
          value={data.total_generations.toLocaleString()}
        />
        <StatCard
          icon={DollarSign}
          label="EA Revenue"
          value={fmtUsd(data.ea_revenue_cents)}
          sub={`${data.ea_purchases} purchases`}
          valueClass="text-neon-green glow-text-green"
        />
      </div>

      {/* Marketplace */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Radio}
          label="Active Providers"
          value={data.total_providers.toLocaleString()}
        />
        <StatCard
          icon={Store}
          label="Active Subscriptions"
          value={data.active_subscriptions.toLocaleString()}
        />
        <StatCard
          icon={FlaskConical}
          label="Published Strategies"
          value={data.total_strategies.toLocaleString()}
        />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Users                                                         */
/* ================================================================== */

function AddUserModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('free');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await api.post<unknown>('/admin/users', { email, password, name: name || undefined, plan });
    if (res.error) {
      setError(res.error.message);
      setSaving(false);
      return;
    }

    setEmail('');
    setPassword('');
    setName('');
    setPlan('free');
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md animate-fade-in-scale">
        <div className="glass-premium border-gradient rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
          <button onClick={onClose} className="absolute top-4 right-4 z-20 rounded-xl p-1.5 text-terminal-muted hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all">
            <X size={18} />
          </button>

          <h3 className="text-xl font-black text-white font-display mb-6">Add User</h3>

          {error && (
            <div className="glass rounded-xl border border-neon-red/30 bg-neon-red/5 px-4 py-3 text-sm text-neon-red mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-terminal-muted uppercase tracking-wider mb-1.5">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-xl glass pl-4 pr-4 py-2.5 text-sm text-white placeholder:text-terminal-muted outline-none focus:ring-1 focus:ring-neon-cyan/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-terminal-muted uppercase tracking-wider mb-1.5">Password *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl glass pl-4 pr-4 py-2.5 text-sm text-white placeholder:text-terminal-muted outline-none focus:ring-1 focus:ring-neon-cyan/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-terminal-muted uppercase tracking-wider mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl glass pl-4 pr-4 py-2.5 text-sm text-white placeholder:text-terminal-muted outline-none focus:ring-1 focus:ring-neon-cyan/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-terminal-muted uppercase tracking-wider mb-1.5">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full rounded-xl glass pl-4 pr-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-neon-cyan/40 transition-all bg-transparent"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-neon-cyan/10 text-neon-cyan font-semibold text-sm hover:bg-neon-cyan/20 transition-all disabled:opacity-50 shadow-[0_0_20px_#00e5ff15]"
            >
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchUsers = useCallback((searchTerm: string, off: number, append = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    params.set('limit', '50');
    params.set('offset', String(off));

    api.get<{ users: AdminUser[]; total: number }>(`/admin/users?${params}`).then((res) => {
      if (res.error) { setError(res.error.message); setLoading(false); return; }
      if (res.data) {
        setUsers((prev) => append ? [...prev, ...res.data!.users] : res.data!.users);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchUsers('', 0);
  }, [fetchUsers]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(val, 0);
    }, 300);
  };

  const handleShowMore = () => {
    const newOffset = offset + 50;
    setOffset(newOffset);
    fetchUsers(search, newOffset, true);
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Delete user ${userEmail}? This will deactivate all their accounts.`)) return;
    const res = await api.del<{ deleted: boolean }>(`/admin/users/${userId}`);
    if (res.error) {
      alert(res.error.message);
      return;
    }
    // Refresh the list
    setOffset(0);
    fetchUsers(search, 0);
  };

  const planVariant = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'pro': return 'cyan' as const;
      case 'enterprise': return 'purple' as const;
      case 'starter': return 'green' as const;
      default: return 'muted' as const;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Search + Add User */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full rounded-xl glass-premium pl-10 pr-4 py-3 text-sm text-white placeholder:text-terminal-muted outline-none focus:ring-1 focus:ring-neon-cyan/40 transition-all"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neon-cyan/10 text-neon-cyan text-sm font-semibold hover:bg-neon-cyan/20 transition-all whitespace-nowrap shadow-[0_0_15px_#00e5ff10]"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {error && <ErrorState message={error} />}

      {/* Table */}
      <div className="glass-premium rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-terminal-border/30">
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Email</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Name</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Plan</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Accounts</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">EAs</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Joined</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-terminal-border/10 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono-nums text-white">{u.email}</td>
                  <td className="px-4 py-3 text-terminal-text">{u.name || '—'}</td>
                  <td className="px-4 py-3"><Badge variant={planVariant(u.plan)}>{u.plan}</Badge></td>
                  <td className="px-4 py-3 font-mono-nums text-terminal-text">{u.account_count}</td>
                  <td className="px-4 py-3 font-mono-nums text-terminal-text">{u.ea_count}</td>
                  <td className="px-4 py-3 text-terminal-muted text-xs">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      className="rounded-lg p-1.5 text-terminal-muted hover:text-neon-red hover:bg-neon-red/10 transition-all"
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-terminal-muted">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show More */}
      {users.length < total && (
        <div className="flex justify-center">
          <button
            onClick={handleShowMore}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl glass-premium text-sm text-neon-cyan hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Show More (${users.length} of ${total})`}
          </button>
        </div>
      )}

      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => { setOffset(0); fetchUsers(search, 0); }}
      />
    </div>
  );
}

/* ================================================================== */
/*  Tab: Providers                                                     */
/* ================================================================== */

function ProvidersTab() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<{ providers: Provider[] }>('/admin/providers').then((res) => {
      if (cancelled) return;
      if (res.error) { setError(res.error.message); setLoading(false); return; }
      setProviders(res.data?.providers ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState message={error} />;

  const winRateColor = (rate: number | null) => {
    if (rate == null) return 'text-terminal-muted';
    if (rate >= 60) return 'text-neon-green';
    if (rate >= 40) return 'text-neon-amber';
    return 'text-neon-red';
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="glass-premium rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-terminal-border/30">
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Display Name</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Email</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Instruments</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Win Rate</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">P&L</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Subscribers</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Listed</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-b border-terminal-border/10 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{p.display_name}</td>
                  <td className="px-4 py-3 font-mono-nums text-terminal-text">{p.user_email}</td>
                  <td className="px-4 py-3 text-terminal-text text-xs">{p.instruments || '—'}</td>
                  <td className={`px-4 py-3 font-mono-nums font-semibold ${winRateColor(p.win_rate)}`}>
                    {p.win_rate != null ? `${p.win_rate.toFixed(1)}%` : '—'}
                  </td>
                  <td className={`px-4 py-3 font-mono-nums ${(p.total_pnl ?? 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                    {p.total_pnl != null ? `$${p.total_pnl.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono-nums text-terminal-text">{p.subscriber_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.is_listed ? 'green' : 'muted'}>
                      {p.is_listed ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {providers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-terminal-muted">No providers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Revenue                                                       */
/* ================================================================== */

function RevenueTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<{ payments: Payment[] }>('/admin/revenue'),
      api.get<{ generations: Generation[] }>('/admin/generations'),
    ]).then(([revRes, genRes]) => {
      if (cancelled) return;
      if (revRes.error) { setError(revRes.error.message); setLoading(false); return; }
      if (genRes.error) { setError(genRes.error.message); setLoading(false); return; }
      setPayments(revRes.data?.payments ?? []);
      setGenerations(genRes.data?.generations ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState message={error} />;

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Total Revenue */}
      <StatCard
        icon={DollarSign}
        label="Total Revenue"
        value={fmtUsd(totalRevenue)}
        sub={`${payments.length} transactions`}
        valueClass="text-neon-green glow-text-green"
      />

      {/* Payments Table */}
      <div className="glass-premium rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-terminal-border/30">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
            Payment History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-terminal-border/30">
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Email</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Reference</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Amount</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-terminal-border/10 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono-nums text-white">{p.user_email}</td>
                  <td className="px-4 py-3 text-terminal-text font-mono-nums text-xs">{p.reference}</td>
                  <td className="px-4 py-3 font-mono-nums text-neon-green font-semibold">{fmtUsd(p.amount_cents)}</td>
                  <td className="px-4 py-3 text-terminal-muted text-xs">{fmtDate(p.credited_at)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-terminal-muted">No payments yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generations Table */}
      <div className="glass-premium rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-terminal-border/30">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
            Recent EA Generations
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-terminal-border/30">
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Strategy</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Email</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-terminal-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {generations.map((g) => (
                <tr key={g.id} className="border-b border-terminal-border/10 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{g.strategy_name}</td>
                  <td className="px-4 py-3 font-mono-nums text-terminal-text">{g.user_email}</td>
                  <td className="px-4 py-3 text-terminal-muted text-xs">{fmtDate(g.generated_at)}</td>
                </tr>
              ))}
              {generations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-terminal-muted">No generations yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tabs config                                                        */
/* ================================================================== */

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Crown size={16} /> },
  { id: 'users', label: 'Users', icon: <Users size={16} /> },
  { id: 'providers', label: 'Providers', icon: <Radio size={16} /> },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign size={16} /> },
];

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (user?.email !== 'oh84dev@gmail.com') {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-neon-red font-semibold">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white font-display flex items-center gap-3">
          <Crown size={28} className="text-neon-amber" />
          Admin Dashboard
        </h1>
        <p className="text-sm text-terminal-muted mt-1">Platform overview and management</p>
      </div>

      {/* Tab Bar */}
      <div className="glass-premium rounded-xl p-1.5 flex gap-1 overflow-x-auto animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5'
                : 'text-terminal-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animationDelay: '120ms' }}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'providers' && <ProvidersTab />}
        {activeTab === 'revenue' && <RevenueTab />}
      </div>
    </div>
  );
}
