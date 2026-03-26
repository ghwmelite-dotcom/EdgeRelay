import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { useAccountsStore } from '@/stores/accounts';
import { useCommandCenterStore, type AccountHealthResult } from '@/stores/commandCenter';
import { HealthGauge } from '@/components/command/HealthGauge';
import { FirmLinkModal } from '@/components/command/FirmLinkModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// ── Helpers ────────────────────────────────────────────────────

function metricBarColor(usedPercent: number): string {
  if (usedPercent > 80) return 'bg-neon-red';
  if (usedPercent > 60) return 'bg-neon-amber';
  return 'bg-neon-green';
}

function statusChipVariant(status: 'safe' | 'caution' | 'danger'): 'green' | 'amber' | 'red' {
  if (status === 'safe') return 'green';
  if (status === 'caution') return 'amber';
  return 'red';
}

// ── Main Component ─────────────────────────────────────────────

export function CommandCenterPage() {
  const { accounts, fetchAccounts } = useAccountsStore();
  const { healthResults, isLoading, error, fetchHealth, fetchFirms } = useCommandCenterStore();

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkingAccountId, setLinkingAccountId] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchHealth();
    fetchFirms();
  }, [fetchAccounts, fetchHealth, fetchFirms]);

  // Derive status counts
  const safeCount = healthResults.filter((r) => r.health.status === 'safe').length;
  const cautionCount = healthResults.filter((r) => r.health.status === 'caution').length;
  const dangerCount = healthResults.filter((r) => r.health.status === 'danger').length;

  // Determine overall banner style
  const hasDanger = dangerCount > 0;
  const allSafe = healthResults.length > 0 && safeCount === healthResults.length;
  const bannerCard = hasDanger
    ? 'stat-card-red glow-red'
    : allSafe
      ? 'stat-card-green glow-green'
      : 'stat-card-cyan';

  // Unlinked accounts: accounts whose IDs are NOT in healthResults
  const linkedIds = new Set(healthResults.map((r) => r.account_id));
  const unlinkedAccounts = accounts.filter((a) => !linkedIds.has(a.id));

  const linkingAccount = accounts.find((a) => a.id === linkingAccountId);

  const handleOpenLink = (accountId: string) => {
    setLinkingAccountId(accountId);
    setLinkModalOpen(true);
  };

  const handleLinked = () => {
    fetchHealth();
  };

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading && healthResults.length === 0) {
    return (
      <div className="space-y-8">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-black tracking-tight text-white">Command Center</h1>
          <p className="text-slate-500 text-sm mt-1.5">Prop firm account health at a glance</p>
        </div>
        {/* Skeleton banner */}
        <div className="glass-premium stat-card-cyan rounded-2xl p-5 animate-fade-in-up">
          <div className="skeleton h-5 w-48 rounded mb-2" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="glass-premium rounded-2xl p-5 animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="skeleton h-4 w-32 rounded mb-3" />
              <div className="skeleton h-[90px] w-[90px] rounded-full mx-auto mb-3" />
              <div className="skeleton h-3 w-full rounded mb-2" />
              <div className="skeleton h-3 w-full rounded mb-2" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (error && healthResults.length === 0) {
    return (
      <div className="space-y-8">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-black tracking-tight text-white">Command Center</h1>
          <p className="text-slate-500 text-sm mt-1.5">Prop firm account health at a glance</p>
        </div>
        <div className="glass-premium rounded-2xl p-8 text-center animate-fade-in-up">
          <AlertTriangle size={36} className="text-neon-red mx-auto mb-4" />
          <p className="text-neon-red text-sm mb-4">{error}</p>
          <Button onClick={() => fetchHealth()} variant="secondary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Section 1: Header ──────────────────────────────────────── */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white">Command Center</h1>
        <p className="text-slate-500 text-sm mt-1.5">Prop firm account health at a glance</p>
      </div>

      {/* ── Section 2: Overall Status Banner ───────────────────────── */}
      {accounts.length === 0 ? (
        <div className="glass-premium card-hover-premium rounded-2xl flex flex-col items-center justify-center py-14 text-center animate-fade-in-up">
          <div className="relative mb-4">
            <Shield size={36} className="text-terminal-muted" />
            <div className="absolute -inset-4 rounded-full bg-neon-cyan/5 animate-pulse" />
          </div>
          <p className="text-slate-400 text-sm mb-4">No accounts yet</p>
          <Link
            to="/accounts"
            className="text-sm font-medium text-neon-cyan hover:underline underline-offset-4 glow-text-cyan inline-flex items-center gap-1.5"
          >
            <LinkIcon size={14} />
            Add your first account
          </Link>
        </div>
      ) : (
        <div
          className={`glass-premium ${bannerCard} rounded-2xl p-5 animate-fade-in-up`}
          style={{ animationDelay: '60ms' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="live-dot"
                  style={allSafe ? { background: '#00ff9d', boxShadow: '0 0 8px #00ff9d80' } : undefined}
                />
                <span className="text-neon-green font-mono-nums font-bold text-sm">
                  {safeCount} SAFE
                </span>
              </div>
              <span className="h-4 w-px bg-terminal-border" />
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-neon-amber"
                  style={{ boxShadow: '0 0 6px #ffb80060' }}
                />
                <span className="text-neon-amber font-mono-nums font-bold text-sm">
                  {cautionCount} CAUTION
                </span>
              </div>
              <span className="h-4 w-px bg-terminal-border" />
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-neon-red"
                  style={{ boxShadow: '0 0 6px #ff3d5760' }}
                />
                <span className="text-neon-red font-mono-nums font-bold text-sm">
                  {dangerCount} DANGER
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
              {healthResults.length} Account{healthResults.length !== 1 ? 's' : ''} Monitored
            </span>
          </div>
        </div>
      )}

      {/* ── Section 3: Account Health Cards ────────────────────────── */}
      {healthResults.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full bg-neon-cyan"
                style={{ boxShadow: '0 0 8px #00e5ff80, 0 0 20px #00e5ff40' }}
              />
              <h2 className="text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                Monitored Accounts
              </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/15 to-transparent" />
            <Badge variant="cyan">
              <Shield size={10} />
              {healthResults.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthResults.map((result, i) => (
              <AccountHealthCard key={result.account_id} result={result} delay={i * 80} />
            ))}
          </div>
        </section>
      )}

      {/* ── Section 4: Unlinked Accounts ───────────────────────────── */}
      {unlinkedAccounts.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full bg-neon-amber"
                style={{ boxShadow: '0 0 8px #ffb80080, 0 0 20px #ffb80040' }}
              />
              <h2 className="text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                Unlinked Accounts
              </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-neon-amber/15 to-transparent" />
            <Badge variant="amber">
              <LinkIcon size={10} />
              {unlinkedAccounts.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlinkedAccounts.map((account, i) => (
              <div
                key={account.id}
                className="glass-premium card-hover-premium rounded-2xl p-5 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-3">
                  <p className="font-semibold text-slate-100">{account.alias}</p>
                  <p className="text-xs text-slate-500">{account.broker_name ?? 'Unknown broker'}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenLink(account.id)}
                >
                  <LinkIcon size={12} />
                  Link to Firm
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Firm Link Modal ────────────────────────────────────────── */}
      {linkingAccountId && linkingAccount && (
        <FirmLinkModal
          isOpen={linkModalOpen}
          onClose={() => {
            setLinkModalOpen(false);
            setLinkingAccountId(null);
          }}
          accountId={linkingAccountId}
          accountAlias={linkingAccount.alias}
          onLinked={handleLinked}
        />
      )}
    </div>
  );
}

// ── Account Health Card ─────────────────────────────────────────

function AccountHealthCard({ result, delay }: { result: AccountHealthResult; delay: number }) {
  const { health, alias, firm_name, plan_name } = result;

  return (
    <div
      className="glass-premium card-hover-premium rounded-2xl p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header: alias + status chip */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-slate-100 truncate">{alias}</p>
        <Badge variant={statusChipVariant(health.status)}>
          {health.status === 'safe' && <CheckCircle size={10} />}
          {health.status === 'caution' && <AlertTriangle size={10} />}
          {health.status === 'danger' && <AlertTriangle size={10} />}
          <span className="uppercase font-bold text-[10px] tracking-wider">{health.status}</span>
        </Badge>
      </div>

      {/* Firm badges */}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="cyan">{firm_name}</Badge>
        <Badge variant="muted">{plan_name}</Badge>
      </div>

      {/* Health Gauge */}
      <div className="flex justify-center mb-4">
        <HealthGauge score={health.score} status={health.status} size={90} />
      </div>

      {/* Mini progress bars */}
      <div className="space-y-3">
        {health.daily_loss != null && (
          <MetricBar
            label="Daily Loss"
            percent={health.daily_loss.used_percent}
          />
        )}
        <MetricBar
          label="Drawdown"
          percent={health.drawdown.used_percent}
        />
        {health.profit_target != null && (
          <MetricBar
            label="Profit Target"
            percent={health.profit_target.progress_percent}
            isProgress
          />
        )}
      </div>

      {/* Warnings */}
      {health.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {health.warnings.map((warning, i) => (
            <p key={i} className="text-xs text-neon-amber flex items-start gap-1.5">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Metric Bar ──────────────────────────────────────────────────

function MetricBar({
  label,
  percent,
  isProgress = false,
}: {
  label: string;
  percent: number;
  isProgress?: boolean;
}) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  // For progress bars (profit target), green is good at high %; for risk bars, green is good at low %
  const barColor = isProgress
    ? clamped >= 80
      ? 'bg-neon-green'
      : clamped >= 40
        ? 'bg-neon-amber'
        : 'bg-terminal-muted'
    : metricBarColor(clamped);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted">
          {label}
        </span>
        <span className="font-mono-nums text-[10px] text-slate-400">
          {clamped.toFixed(1)}%
        </span>
      </div>
      <div className="h-[3px] rounded-full bg-terminal-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{
            width: `${clamped}%`,
          }}
        />
      </div>
    </div>
  );
}
