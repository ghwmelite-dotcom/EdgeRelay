import { useEffect, useState, type FormEvent } from 'react';
import {
  Radio,
  TrendingUp,
  Target,
  BarChart3,
  Clock,
  Users,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useAccountsStore } from '@/stores/accounts';
import { useMarketplaceStore } from '@/stores/marketplace';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const STRATEGY_OPTIONS = [
  { value: 'scalper', label: 'Scalper' },
  { value: 'swing', label: 'Swing Trader' },
  { value: 'position', label: 'Position Trader' },
  { value: 'mixed', label: 'Mixed' },
];

function QualificationProgress({
  qualification,
}: {
  qualification: { trade_count: number; active_days: number; required_trades: number; required_days: number; qualified: boolean };
}) {
  const tradesPct = Math.min(100, (qualification.trade_count / qualification.required_trades) * 100);
  const daysPct = Math.min(100, (qualification.active_days / qualification.required_days) * 100);

  if (qualification.qualified) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-neon-green/30 bg-neon-green/5 p-3">
        <Check size={16} className="text-neon-green" />
        <span className="text-sm text-neon-green font-medium">Qualified — your signals are live on the marketplace</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-neon-amber" />
        <span className="text-sm text-neon-amber font-medium">Not yet qualified</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[11px] uppercase tracking-wider text-terminal-muted mb-1">
            <span>Closed Trades</span>
            <span>{qualification.trade_count}/{qualification.required_trades}</span>
          </div>
          <div className="h-1.5 rounded-full bg-terminal-border/50 overflow-hidden">
            <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${tradesPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] uppercase tracking-wider text-terminal-muted mb-1">
            <span>Active Days</span>
            <span>{qualification.active_days}/{qualification.required_days}</span>
          </div>
          <div className="h-1.5 rounded-full bg-terminal-border/50 overflow-hidden">
            <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${daysPct}%` }} />
          </div>
        </div>
      </div>
      <p className="text-xs text-terminal-muted">Keep trading to qualify. Stats update hourly.</p>
    </div>
  );
}

function StatBlock({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-premium rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-terminal-muted">{icon}</span>
        <span className="text-[11px] uppercase tracking-[2px] text-terminal-muted font-semibold">{label}</span>
      </div>
      <p className="text-xl font-bold font-mono-nums text-white">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function ProviderDashboard() {
  const { profile, stats, qualification, updateProfile } = useMarketplaceStore();
  const [isToggling, setIsToggling] = useState(false);

  if (!profile) return null;

  const handleToggleListing = async () => {
    if (!qualification?.qualified && !profile.is_listed) return;
    setIsToggling(true);
    await updateProfile({ is_listed: !profile.is_listed });
    setIsToggling(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{profile.display_name}</h2>
          <p className="text-sm text-terminal-muted">{profile.bio || 'No bio set'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={profile.is_listed ? 'green' : 'muted'}>
            {profile.is_listed ? 'Listed' : 'Unlisted'}
          </Badge>
          <Button
            variant="secondary"
            onClick={handleToggleListing}
            isLoading={isToggling}
            disabled={!qualification?.qualified && !profile.is_listed}
          >
            {profile.is_listed ? 'Unlist' : 'Go Live'}
          </Button>
        </div>
      </div>

      {qualification && <QualificationProgress qualification={qualification} />}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBlock label="Win Rate" value={`${stats.win_rate.toFixed(1)}%`} icon={<Target size={12} />} />
          <StatBlock label="Total P&L" value={`$${stats.total_pnl.toFixed(2)}`} icon={<TrendingUp size={12} />} />
          <StatBlock label="Profit Factor" value={stats.profit_factor.toFixed(2)} icon={<BarChart3 size={12} />} />
          <StatBlock label="Subscribers" value={String(stats.subscriber_count)} icon={<Users size={12} />} />
          <StatBlock label="Max Drawdown" value={`${stats.max_drawdown_pct.toFixed(1)}%`} icon={<AlertTriangle size={12} />} />
          <StatBlock label="Avg Duration" value={formatDuration(stats.avg_trade_duration_sec)} icon={<Clock size={12} />} />
          <StatBlock label="Total Trades" value={String(stats.total_trades)} icon={<Radio size={12} />} />
          <StatBlock label="Active Days" value={String(stats.active_days)} icon={<Check size={12} />} />
        </div>
      )}
    </div>
  );
}

export function ProviderSetupPage() {
  const { accounts, fetchAccounts } = useAccountsStore();
  const { profile, isLoading, fetchMyProfile, createProfile } = useMarketplaceStore();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [instruments, setInstruments] = useState('');
  const [strategyStyle, setStrategyStyle] = useState('mixed');
  const [masterAccountId, setMasterAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchMyProfile();
  }, [fetchAccounts, fetchMyProfile]);

  const masters = accounts.filter((a) => a.role === 'master' && a.is_active);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!displayName.trim()) { setFormError('Display name is required'); return; }
    if (!masterAccountId) { setFormError('Select a master account'); return; }

    setIsSubmitting(true);
    const success = await createProfile({
      display_name: displayName.trim(),
      bio: bio.trim() || undefined,
      instruments: instruments.trim() || undefined,
      strategy_style: strategyStyle,
      master_account_id: masterAccountId,
    });
    setIsSubmitting(false);
    if (!success) {
      setFormError(useMarketplaceStore.getState().error ?? 'Failed to create profile');
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center py-20 text-terminal-muted text-sm">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_6px_#00e5ff]" />
          Loading...
        </div>
      </div>
    );
  }

  if (profile) {
    return (
      <div className="space-y-8">
        <div className="animate-fade-in-up">
          <p className="text-[11px] uppercase tracking-[2px] text-terminal-muted font-semibold mb-1">Signal Provider</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">Provider Dashboard</h1>
        </div>
        <ProviderDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <p className="text-[11px] uppercase tracking-[2px] text-terminal-muted font-semibold mb-1">Signal Marketplace</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">Become a Provider</h1>
        <p className="text-sm text-terminal-muted mt-2 max-w-lg">
          Share your trading signals with the community. Your performance is verified through your trade journal — no fake screenshots, no BS.
        </p>
      </div>

      {masters.length === 0 ? (
        <Card className="glass-premium rounded-2xl p-8 text-center">
          <Radio size={32} className="text-terminal-muted mx-auto mb-4" />
          <p className="text-sm text-terminal-muted">
            You need a master account with trading history to become a provider.
          </p>
        </Card>
      ) : (
        <Card className="glass-premium rounded-2xl p-6">
          <form onSubmit={handleCreate} className="space-y-5 max-w-lg">
            <Input
              label="Display Name"
              placeholder="e.g. GoldEdge Trading"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neon-cyan" />
                Bio
              </label>
              <textarea
                placeholder="Describe your strategy in a sentence..."
                maxLength={280}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-terminal-border bg-terminal-surface/50 px-4 py-3 text-sm text-terminal-text placeholder:text-terminal-muted/50 focus:border-neon-cyan focus:outline-none resize-none h-20"
              />
              <p className="text-[10px] text-terminal-muted text-right">{bio.length}/280</p>
            </div>

            <Input
              label="Instruments"
              placeholder="e.g. XAUUSD, EURUSD, GBPJPY"
              value={instruments}
              onChange={(e) => setInstruments(e.target.value)}
            />

            <Select
              label="Strategy Style"
              options={STRATEGY_OPTIONS}
              value={strategyStyle}
              onChange={(e) => setStrategyStyle(e.target.value)}
            />

            <Select
              label="Signal Source (Master Account)"
              options={[
                { value: '', label: 'Select master account...' },
                ...masters.map((m) => ({ value: m.id, label: m.alias })),
              ]}
              value={masterAccountId}
              onChange={(e) => setMasterAccountId(e.target.value)}
            />

            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-neon-red/30 bg-neon-red/5 p-3">
                <AlertTriangle size={14} className="text-neon-red mt-0.5 shrink-0" />
                <p className="text-sm text-neon-red">{formError}</p>
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              <Radio size={14} /> Become a Provider
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
