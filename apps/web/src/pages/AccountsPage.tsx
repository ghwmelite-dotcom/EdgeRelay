import { useEffect, useState, type FormEvent } from 'react';
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Settings,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useAccountsStore, type Account, type FollowerConfig } from '@/stores/accounts';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Modal } from '@/components/ui/Modal';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function maskApiKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function connectionStatus(account: Account) {
  if (!account.is_active) return 'disconnected' as const;
  if (!account.last_heartbeat) return 'idle' as const;
  const diff = Date.now() - new Date(account.last_heartbeat).getTime();
  if (diff < 30_000) return 'connected' as const;
  if (diff < 120_000) return 'connecting' as const;
  return 'disconnected' as const;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-terminal-muted hover:text-neon-cyan hover:bg-terminal-card transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

const LOT_MODE_OPTIONS = [
  { value: 'mirror', label: 'Mirror' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'multiplier', label: 'Multiplier' },
  { value: 'risk_percent', label: 'Risk %' },
];

/* ------------------------------------------------------------------ */
/*  Add Account Modal                                                 */
/* ------------------------------------------------------------------ */

function AddAccountModal({
  open,
  onClose,
  masters,
}: {
  open: boolean;
  onClose: () => void;
  masters: Account[];
}) {
  const createAccount = useAccountsStore((s) => s.createAccount);
  const [role, setRole] = useState<'master' | 'follower'>('master');
  const [alias, setAlias] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [masterAccountId, setMasterAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<Account | null>(null);

  const resetForm = () => {
    setRole('master');
    setAlias('');
    setBrokerName('');
    setMt5Login('');
    setMasterAccountId('');
    setCreatedAccount(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await createAccount({
      role,
      alias,
      broker_name: brokerName || undefined,
      mt5_login: mt5Login || undefined,
      master_account_id: role === 'follower' ? masterAccountId : undefined,
    });
    setIsSubmitting(false);
    if (result) {
      setCreatedAccount(result);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={createdAccount ? 'Account Created' : 'Add Account'}>
      {createdAccount ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-neon-green/30 bg-neon-green/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-neon-green text-sm font-medium">
              <Check size={16} />
              Account "{createdAccount.alias}" created successfully
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-xs text-terminal-muted uppercase tracking-wider">API Key</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="font-mono-nums text-sm text-slate-200 bg-terminal-bg rounded px-2 py-1 flex-1 truncate">
                    {createdAccount.api_key}
                  </code>
                  <CopyButton text={createdAccount.api_key} />
                </div>
              </div>

              <div>
                <span className="text-xs text-terminal-muted uppercase tracking-wider">API Secret</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="font-mono-nums text-sm text-slate-200 bg-terminal-bg rounded px-2 py-1 flex-1 truncate">
                    {createdAccount.api_secret}
                  </code>
                  <CopyButton text={createdAccount.api_secret} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-4">
            <AlertTriangle size={16} className="text-neon-amber mt-0.5 shrink-0" />
            <p className="text-sm text-neon-amber">
              Save your API Secret now — it won't be shown again.
            </p>
          </div>

          <Button variant="secondary" className="w-full" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role toggle */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Role</span>
            <div className="grid grid-cols-2 gap-2">
              {(['master', 'follower'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                    role === r
                      ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-[0_0_12px_rgba(0,212,255,0.15)]'
                      : 'border-terminal-border bg-terminal-card text-slate-400 hover:border-terminal-border-hover hover:text-slate-200'
                  }`}
                >
                  {r === 'master' ? 'Master' : 'Follower'}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Alias"
            placeholder="e.g. Gold Scalper"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            required
          />

          <Input
            label="Broker Name"
            placeholder="e.g. ICMarkets"
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
          />

          <Input
            label="MT5 Login"
            placeholder="e.g. 5012345"
            value={mt5Login}
            onChange={(e) => setMt5Login(e.target.value)}
          />

          {role === 'follower' && (
            <Select
              label="Master Account"
              options={[
                { value: '', label: 'Select a master...' },
                ...masters.map((m) => ({ value: m.id, label: m.alias })),
              ]}
              value={masterAccountId}
              onChange={(e) => setMasterAccountId(e.target.value)}
              required
            />
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            <Plus size={16} />
            Create Account
          </Button>
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Configure Follower Modal                                          */
/* ------------------------------------------------------------------ */

function ConfigureFollowerModal({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: Account | null;
}) {
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts);
  const config = account?.follower_config;

  const [lotMode, setLotMode] = useState(config?.lot_mode ?? 'mirror');
  const [lotValue, setLotValue] = useState(String(config?.lot_value ?? 1));
  const [maxDailyLoss, setMaxDailyLoss] = useState(String(config?.max_daily_loss_percent ?? 5));
  const [maxDrawdown, setMaxDrawdown] = useState(String(config?.max_total_drawdown_percent ?? 10));
  const [symbolSuffix, setSymbolSuffix] = useState(config?.symbol_suffix ?? '');
  const [copyBuys, setCopyBuys] = useState(config?.copy_buys ?? true);
  const [copySells, setCopySells] = useState(config?.copy_sells ?? true);
  const [copyPendings, setCopyPendings] = useState(config?.copy_pendings ?? false);
  const [invertDirection, setInvertDirection] = useState(config?.invert_direction ?? false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync form when account changes
  useEffect(() => {
    if (!account) return;
    const c = account.follower_config;
    setLotMode(c?.lot_mode ?? 'mirror');
    setLotValue(String(c?.lot_value ?? 1));
    setMaxDailyLoss(String(c?.max_daily_loss_percent ?? 5));
    setMaxDrawdown(String(c?.max_total_drawdown_percent ?? 10));
    setSymbolSuffix(c?.symbol_suffix ?? '');
    setCopyBuys(c?.copy_buys ?? true);
    setCopySells(c?.copy_sells ?? true);
    setCopyPendings(c?.copy_pendings ?? false);
    setInvertDirection(c?.invert_direction ?? false);
  }, [account]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setIsSaving(true);

    const payload: Partial<FollowerConfig> = {
      lot_mode: lotMode as FollowerConfig['lot_mode'],
      lot_value: Number(lotValue),
      max_daily_loss_percent: Number(maxDailyLoss),
      max_total_drawdown_percent: Number(maxDrawdown),
      symbol_suffix: symbolSuffix,
      copy_buys: copyBuys,
      copy_sells: copySells,
      copy_pendings: copyPendings,
      invert_direction: invertDirection,
    };

    await api.put(`/accounts/${account.id}`, { follower_config: payload });
    await fetchAccounts();
    setIsSaving(false);
    onClose();
  };

  if (!account) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Configure — ${account.alias}`}>
      <form onSubmit={handleSave} className="space-y-5">
        <Select
          label="Lot Mode"
          options={LOT_MODE_OPTIONS}
          value={lotMode}
          onChange={(e) => setLotMode(e.target.value as 'mirror' | 'fixed' | 'multiplier' | 'risk_percent')}
        />

        <Input
          label="Lot Value"
          type="number"
          step="0.01"
          min="0"
          value={lotValue}
          onChange={(e) => setLotValue(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Max Daily Loss %"
            type="number"
            step="0.1"
            min="0"
            value={maxDailyLoss}
            onChange={(e) => setMaxDailyLoss(e.target.value)}
          />
          <Input
            label="Max Drawdown %"
            type="number"
            step="0.1"
            min="0"
            value={maxDrawdown}
            onChange={(e) => setMaxDrawdown(e.target.value)}
          />
        </div>

        <Input
          label="Symbol Suffix"
          placeholder="e.g. .raw"
          value={symbolSuffix}
          onChange={(e) => setSymbolSuffix(e.target.value)}
        />

        {/* Checkboxes */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
            Copy Settings
          </span>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Copy Buys', checked: copyBuys, set: setCopyBuys },
              { label: 'Copy Sells', checked: copySells, set: setCopySells },
              { label: 'Copy Pendings', checked: copyPendings, set: setCopyPendings },
              { label: 'Invert Direction', checked: invertDirection, set: setInvertDirection },
            ].map(({ label, checked, set }) => (
              <label
                key={label}
                className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-terminal-border bg-terminal-card px-3 py-2.5 text-sm text-slate-300 hover:border-terminal-border-hover transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => set(e.target.checked)}
                  className="rounded border-terminal-border bg-terminal-bg text-neon-cyan focus:ring-neon-cyan/30 h-4 w-4"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" isLoading={isSaving} className="w-full">
          Save Configuration
        </Button>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Modal                                         */
/* ------------------------------------------------------------------ */

function DeleteConfirmModal({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: Account | null;
}) {
  const deleteAccount = useAccountsStore((s) => s.deleteAccount);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!account) return;
    setIsDeleting(true);
    await deleteAccount(account.id);
    setIsDeleting(false);
    onClose();
  };

  if (!account) return null;

  return (
    <Modal open={open} onClose={onClose} title="Delete Account">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-neon-red/30 bg-neon-red/5 p-4">
          <AlertTriangle size={18} className="text-neon-red mt-0.5 shrink-0" />
          <div className="text-sm text-slate-300">
            <p>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">{account.alias}</span>? This action
              cannot be undone.
            </p>
            {account.role === 'master' && (
              <p className="mt-2 text-neon-red">
                All follower accounts linked to this master will stop receiving signals.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" isLoading={isDeleting} onClick={handleDelete}>
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Master Card                                                       */
/* ------------------------------------------------------------------ */

function MasterCard({
  account,
  onDelete,
}: {
  account: Account;
  onDelete: (a: Account) => void;
}) {
  return (
    <Card hover className="group">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Header row */}
          <div className="flex items-center gap-3">
            <StatusDot status={connectionStatus(account)} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{account.alias}</h3>
              <p className="text-xs text-terminal-muted">{account.broker_name ?? '—'}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-terminal-muted">MT5 Login</span>
              <p className="font-mono-nums text-slate-300">{account.mt5_login ?? '—'}</p>
            </div>
            <div>
              <span className="text-terminal-muted">Signals Today</span>
              <p className="font-mono-nums text-slate-300">{account.signals_today}</p>
            </div>
          </div>

          {/* API Key */}
          <div className="flex items-center gap-2">
            <code className="rounded bg-terminal-bg px-2 py-1 text-xs font-mono-nums text-terminal-muted">
              {maskApiKey(account.api_key)}
            </code>
            <CopyButton text={account.api_key} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm">
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(account)}>
            <Trash2 size={14} className="text-neon-red" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Follower Card                                                     */
/* ------------------------------------------------------------------ */

function FollowerCard({
  account,
  masterAlias,
  onConfigure,
  onDelete,
}: {
  account: Account;
  masterAlias: string;
  onConfigure: (a: Account) => void;
  onDelete: (a: Account) => void;
}) {
  const config = account.follower_config;
  const lotLabel = LOT_MODE_OPTIONS.find((o) => o.value === config?.lot_mode)?.label ?? 'Mirror';

  return (
    <Card hover className="group">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <StatusDot status={connectionStatus(account)} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{account.alias}</h3>
              <p className="text-xs text-terminal-muted">{account.broker_name ?? '—'}</p>
            </div>
          </div>

          {/* Following */}
          <div className="text-xs">
            <span className="text-terminal-muted">Following: </span>
            <span className="text-neon-cyan font-medium">{masterAlias}</span>
          </div>

          {/* Config summary */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="purple">{lotLabel}</Badge>
            {config?.max_daily_loss_percent != null && (
              <Badge variant="amber">Max Loss {config.max_daily_loss_percent}%</Badge>
            )}
            {config?.symbol_suffix && (
              <Badge variant="muted">Suffix: {config.symbol_suffix}</Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => onConfigure(account)}>
            <Settings size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(account)}>
            <Trash2 size={14} className="text-neon-red" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  AccountsPage                                                      */
/* ------------------------------------------------------------------ */

export function AccountsPage() {
  const { accounts, isLoading, fetchAccounts } = useAccountsStore();

  const [addOpen, setAddOpen] = useState(false);
  const [configAccount, setConfigAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const masters = accounts.filter((a) => a.role === 'master');
  const followers = accounts.filter((a) => a.role === 'follower');

  const masterMap = new Map(masters.map((m) => [m.id, m.alias]));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">Accounts</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          Add Account
        </Button>
      </div>

      {isLoading && accounts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-terminal-muted text-sm">
          Loading accounts...
        </div>
      ) : (
        <>
          {/* Master Accounts */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Master Accounts
              </h2>
              <Badge variant="cyan">{masters.length}</Badge>
            </div>

            {masters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-terminal-border p-8 text-center text-sm text-terminal-muted">
                No master accounts yet. Create one to start relaying signals.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {masters.map((m) => (
                  <MasterCard key={m.id} account={m} onDelete={setDeleteTarget} />
                ))}
              </div>
            )}
          </section>

          {/* Follower Accounts */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Follower Accounts
              </h2>
              <Badge variant="purple">{followers.length}</Badge>
            </div>

            {followers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-terminal-border p-8 text-center text-sm text-terminal-muted">
                No follower accounts yet. Add one and link it to a master.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {followers.map((f) => (
                  <FollowerCard
                    key={f.id}
                    account={f}
                    masterAlias={masterMap.get(f.master_account_id ?? '') ?? 'Unknown'}
                    onConfigure={setConfigAccount}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modals */}
      <AddAccountModal open={addOpen} onClose={() => setAddOpen(false)} masters={masters} />
      <ConfigureFollowerModal
        open={configAccount !== null}
        onClose={() => setConfigAccount(null)}
        account={configAccount}
      />
      <DeleteConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        account={deleteTarget}
      />
    </div>
  );
}
