import { useEffect, useState, useCallback, type FormEvent } from 'react';
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Settings,
  Eye,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Radio,
  Wifi,
  Download,
  Users,
  X,
  TrendingUp,
  Target,
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
      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs text-terminal-muted hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all duration-200 focus-ring"
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
/*  Setup Copier Wizard — creates master + follower in one flow        */
/* ------------------------------------------------------------------ */

function CredentialBlock({ label, account }: { label: string; account: Account }) {
  return (
    <div className="rounded-xl border border-terminal-border/50 bg-terminal-surface/50 p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-[2px] font-semibold text-terminal-muted">{label}</p>
      <div>
        <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">API Key</span>
        <div className="flex items-center gap-2 mt-1">
          <code className="font-mono-nums text-xs text-slate-200 bg-terminal-bg/50 rounded-lg px-3 py-2 flex-1 truncate border border-terminal-border/50">
            {account.api_key}
          </code>
          <CopyButton text={account.api_key} />
        </div>
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">API Secret</span>
        <div className="flex items-center gap-2 mt-1">
          <code className="font-mono-nums text-xs text-slate-200 bg-terminal-bg/50 rounded-lg px-3 py-2 flex-1 truncate border border-terminal-border/50">
            {account.api_secret}
          </code>
          <CopyButton text={account.api_secret} />
        </div>
      </div>
    </div>
  );
}

function SetupCopierWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createAccount = useAccountsStore((s) => s.createAccount);
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Source
  const [srcAlias, setSrcAlias] = useState('');
  const [srcBroker, setSrcBroker] = useState('');
  const [srcLogin, setSrcLogin] = useState('');

  // Step 2: Destination
  const [dstAlias, setDstAlias] = useState('');
  const [dstBroker, setDstBroker] = useState('');
  const [dstLogin, setDstLogin] = useState('');

  // Step 3: Results
  const [createdMaster, setCreatedMaster] = useState<Account | null>(null);
  const [createdFollower, setCreatedFollower] = useState<Account | null>(null);

  const reset = () => {
    setStep(1);
    setFormError(null);
    setIsSubmitting(false);
    setSrcAlias(''); setSrcBroker(''); setSrcLogin('');
    setDstAlias(''); setDstBroker(''); setDstLogin('');
    setCreatedMaster(null); setCreatedFollower(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleNext = () => {
    setFormError(null);
    if (step === 1) {
      if (!srcAlias.trim()) { setFormError('Give your signal source a name'); return; }
      setStep(2);
    }
  };

  const handleBack = () => { setFormError(null); setStep(step - 1); };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!dstAlias.trim()) { setFormError('Give your copy destination a name'); return; }

    setIsSubmitting(true);
    try {
      // Create master
      const master = await createAccount({
        role: 'master',
        alias: srcAlias.trim(),
        broker_name: srcBroker || undefined,
        mt5_login: srcLogin || undefined,
      });
      if (!master) {
        setFormError(useAccountsStore.getState().error ?? 'Failed to create signal source');
        setIsSubmitting(false);
        return;
      }
      setCreatedMaster(master);

      // Create follower linked to master
      const follower = await createAccount({
        role: 'follower',
        alias: dstAlias.trim(),
        broker_name: dstBroker || undefined,
        mt5_login: dstLogin || undefined,
        master_account_id: master.id,
      });
      if (!follower) {
        setFormError(useAccountsStore.getState().error ?? 'Signal source created but follower failed');
        setIsSubmitting(false);
        setStep(3); // Still show master creds
        return;
      }
      setCreatedFollower(follower);
      setIsSubmitting(false);
      setStep(3);
    } catch {
      setIsSubmitting(false);
      setFormError('Network error — please try again');
    }
  };

  const stepTitles = ['Signal Source', 'Copy Destination', 'Your Credentials'];
  const title = step <= 3 ? stepTitles[step - 1] : '';

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {/* Progress bar */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-neon-cyan shadow-[0_0_6px_var(--color-neon-cyan)]' : 'bg-terminal-border/50'
              }`} />
            </div>
          ))}
          <span className="text-[10px] font-mono text-terminal-muted ml-1">{step}/3</span>
        </div>
      )}

      {/* Step 1: Signal Source */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-3">
            <Radio size={16} className="text-neon-cyan shrink-0" />
            <p className="text-sm text-terminal-text">Where are your trade signals coming from?</p>
          </div>

          <Input label="Account Name" placeholder="e.g. Gold Scalper" value={srcAlias} onChange={(e) => setSrcAlias(e.target.value)} />
          <Input label="Broker" placeholder="e.g. ICMarkets" value={srcBroker} onChange={(e) => setSrcBroker(e.target.value)} />
          <Input label="MT5 Login" placeholder="e.g. 5012345" value={srcLogin} onChange={(e) => setSrcLogin(e.target.value)} />

          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-neon-red/30 bg-neon-red/5 p-3">
              <AlertTriangle size={14} className="text-neon-red mt-0.5 shrink-0" />
              <p className="text-sm text-neon-red">{formError}</p>
            </div>
          )}

          <Button onClick={handleNext} className="w-full">
            Next — Copy Destination <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* Step 2: Copy Destination */}
      {step === 2 && (
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-neon-green/20 bg-neon-green/5 p-3">
            <Wifi size={16} className="text-neon-green shrink-0" />
            <p className="text-sm text-terminal-text">Where should trades be copied to?</p>
          </div>

          <Input label="Account Name" placeholder="e.g. FTMO Challenge" value={dstAlias} onChange={(e) => setDstAlias(e.target.value)} />
          <Input label="Broker" placeholder="e.g. FTMO" value={dstBroker} onChange={(e) => setDstBroker(e.target.value)} />
          <Input label="MT5 Login" placeholder="e.g. 9087654" value={dstLogin} onChange={(e) => setDstLogin(e.target.value)} />

          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-neon-red/30 bg-neon-red/5 p-3">
              <AlertTriangle size={14} className="text-neon-red mt-0.5 shrink-0" />
              <p className="text-sm text-neon-red">{formError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
              <ArrowLeft size={14} /> Back
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              Create Copier <ArrowRight size={14} />
            </Button>
          </div>
        </form>
      )}

      {/* Step 3: Credentials */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-neon-green text-sm font-medium">
            <Check size={16} />
            {createdFollower ? 'Copier setup complete!' : 'Signal source created'}
          </div>

          {createdMaster && (
            <CredentialBlock label="Signal Source — Master EA" account={createdMaster} />
          )}
          {createdFollower && (
            <CredentialBlock label="Copy Destination — Follower EA" account={createdFollower} />
          )}

          <div className="flex items-start gap-2 rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-3">
            <AlertTriangle size={14} className="text-neon-amber mt-0.5 shrink-0" />
            <p className="text-sm text-neon-amber">
              Save both API secrets now — they won't be shown again. Use them in the Master EA and Follower EA settings in MT5.
            </p>
          </div>

          <Button variant="secondary" className="w-full" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Follower Modal — for adding extra followers to existing master */
/* ------------------------------------------------------------------ */

function AddFollowerModal({
  open,
  onClose,
  masters,
}: {
  open: boolean;
  onClose: () => void;
  masters: Account[];
}) {
  const createAccount = useAccountsStore((s) => s.createAccount);
  const [alias, setAlias] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [masterAccountId, setMasterAccountId] = useState(masters[0]?.id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<Account | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const reset = () => {
    setAlias(''); setBrokerName(''); setMt5Login('');
    setMasterAccountId(masters[0]?.id ?? '');
    setCreatedAccount(null); setFormError(null);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!alias.trim()) { setFormError('Name is required'); return; }
    if (!masterAccountId) { setFormError('Select a signal source'); return; }

    setIsSubmitting(true);
    try {
      const result = await createAccount({
        role: 'follower',
        alias: alias.trim(),
        broker_name: brokerName || undefined,
        mt5_login: mt5Login || undefined,
        master_account_id: masterAccountId,
      });
      setIsSubmitting(false);
      if (result) { setCreatedAccount(result); }
      else { setFormError(useAccountsStore.getState().error ?? 'Failed to create account'); }
    } catch {
      setIsSubmitting(false);
      setFormError('Network error — please try again');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={createdAccount ? 'Follower Created' : 'Add Copy Destination'}>
      {createdAccount ? (
        <div className="space-y-5">
          <CredentialBlock label="Follower EA Credentials" account={createdAccount} />
          <div className="flex items-start gap-2 rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-3">
            <AlertTriangle size={14} className="text-neon-amber mt-0.5 shrink-0" />
            <p className="text-sm text-neon-amber">Save the API secret now — it won't be shown again.</p>
          </div>
          <Button variant="secondary" className="w-full" onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Copy signals from"
            options={masters.map((m) => ({ value: m.id, label: m.alias }))}
            value={masterAccountId}
            onChange={(e) => setMasterAccountId(e.target.value)}
          />
          <Input label="Account Name" placeholder="e.g. FTMO Challenge #2" value={alias} onChange={(e) => setAlias(e.target.value)} />
          <Input label="Broker" placeholder="e.g. FTMO" value={brokerName} onChange={(e) => setBrokerName(e.target.value)} />
          <Input label="MT5 Login" placeholder="e.g. 9087654" value={mt5Login} onChange={(e) => setMt5Login(e.target.value)} />

          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-neon-red/30 bg-neon-red/5 p-3">
              <AlertTriangle size={14} className="text-neon-red mt-0.5 shrink-0" />
              <p className="text-sm text-neon-red">{formError}</p>
            </div>
          )}
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            <Plus size={16} /> Add Follower
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
    <Modal open={open} onClose={onClose} title={`Configure \u2014 ${account.alias}`}>
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
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-neon-purple" />
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
                className="flex items-center gap-2 cursor-pointer select-none glass rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:border-terminal-border-hover transition-all duration-200"
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
        <div className="flex items-start gap-3 rounded-2xl border border-neon-red/30 bg-neon-red/5 p-4">
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
    <Card hover className="group border-l-2 border-l-neon-cyan">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Header row */}
          <div className="flex items-center gap-3">
            <StatusDot status={connectionStatus(account)} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{account.alias}</h3>
              <p className="text-xs text-terminal-muted">{account.broker_name ?? '\u2014'}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">MT5 Login</span>
              <p className="font-mono-nums text-slate-300">{account.mt5_login ?? '\u2014'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium">Signals Today</span>
              <p className="font-mono-nums text-slate-300">{account.signals_today}</p>
            </div>
          </div>

          {/* API Key */}
          <div className="flex items-center gap-2">
            <code className="font-mono-nums text-xs text-terminal-muted bg-terminal-bg/50 rounded-lg px-3 py-2 border border-terminal-border/50">
              {maskApiKey(account.api_key)}
            </code>
            <CopyButton text={account.api_key} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="focus-ring">
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(account)} className="focus-ring">
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
    <Card hover className="group border-l-2 border-l-neon-purple">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <StatusDot status={connectionStatus(account)} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{account.alias}</h3>
              <p className="text-xs text-terminal-muted">{account.broker_name ?? '\u2014'}</p>
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
          <Button variant="ghost" size="sm" onClick={() => onConfigure(account)} className="focus-ring">
            <Settings size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(account)} className="focus-ring">
            <Trash2 size={14} className="text-neon-red" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Marketplace Subscription Types & Card                             */
/* ------------------------------------------------------------------ */

interface MarketplaceSubscription {
  id: string;
  provider_id: string;
  status: string;
  subscribed_at: string;
  cancelled_at: string | null;
  provider_name: string;
  strategy_style: string;
  instruments: string | null;
  win_rate: number | null;
  total_pnl: number | null;
  subscriber_count: number | null;
}

const STRATEGY_BADGE_VARIANT: Record<string, 'cyan' | 'green' | 'purple' | 'amber' | 'muted'> = {
  scalper: 'purple',
  swing: 'cyan',
  position: 'green',
  mixed: 'amber',
};

function SubscriptionCard({
  sub,
  onUnsubscribe,
  isUnsubscribing,
}: {
  sub: MarketplaceSubscription;
  onUnsubscribe: (providerId: string) => void;
  isUnsubscribing: boolean;
}) {
  const isActive = sub.status === 'active';
  const badgeVariant = STRATEGY_BADGE_VARIANT[sub.strategy_style] ?? 'muted';

  return (
    <Card hover className={`group border-l-2 ${isActive ? 'border-l-neon-amber' : 'border-l-terminal-border'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-amber/10 text-neon-amber font-bold text-xs shrink-0">
              {sub.provider_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{sub.provider_name}</h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant={badgeVariant} className="text-[10px]">{sub.strategy_style}</Badge>
                {sub.instruments && (
                  <span className="text-[10px] text-terminal-muted">{sub.instruments}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1">
                <Target size={10} />Win Rate
              </span>
              <p className="font-mono-nums text-neon-cyan mt-0.5">
                {sub.win_rate != null ? `${sub.win_rate.toFixed(1)}%` : '\u2014'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1">
                <TrendingUp size={10} />P&L
              </span>
              <p className={`font-mono-nums mt-0.5 ${(sub.total_pnl ?? 0) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {sub.total_pnl != null ? `${sub.total_pnl >= 0 ? '+' : ''}$${Math.abs(sub.total_pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '\u2014'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1">
                <Users size={10} />Subs
              </span>
              <p className="font-mono-nums text-slate-300 mt-0.5">{sub.subscriber_count ?? 0}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'green' : 'muted'}>
              {isActive ? 'Active' : 'Cancelled'}
            </Badge>
            <span className="text-[10px] text-terminal-muted">
              since {new Date(sub.subscribed_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isActive && (
          <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnsubscribe(sub.provider_id)}
              disabled={isUnsubscribing}
              className="focus-ring"
            >
              <X size={14} className="text-neon-red" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  AccountsPage                                                      */
/* ------------------------------------------------------------------ */

export function AccountsPage() {
  const { accounts, isLoading, fetchAccounts } = useAccountsStore();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [addFollowerOpen, setAddFollowerOpen] = useState(false);
  const [configAccount, setConfigAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  // Marketplace subscriptions
  const [subscriptions, setSubscriptions] = useState<MarketplaceSubscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    async function fetchSubscriptions() {
      const res = await api.get<MarketplaceSubscription[]>('/marketplace/subscriptions');
      if (res.data && Array.isArray(res.data)) {
        setSubscriptions(res.data);
      }
      setSubsLoading(false);
    }
    fetchSubscriptions();
  }, []);

  const handleUnsubscribe = useCallback(async (providerId: string) => {
    setUnsubscribingId(providerId);
    const res = await api.del(`/marketplace/subscribe/${providerId}`);
    setUnsubscribingId(null);
    if (!res.error) {
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.provider_id === providerId ? { ...s, status: 'cancelled' } : s,
        ),
      );
      // Refresh accounts since the follower was deactivated
      fetchAccounts();
    }
  }, [fetchAccounts]);

  const masters = accounts.filter((a) => a.role === 'master');
  const followers = accounts.filter((a) => a.role === 'follower');

  const masterMap = new Map(masters.map((m) => [m.id, m.alias]));
  const hasMasters = masters.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="flex items-center justify-between animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">Copier</h1>
        <div className="flex items-center gap-2">
          {hasMasters && (
            <Button variant="secondary" onClick={() => setAddFollowerOpen(true)}>
              <Plus size={14} />
              Add Follower
            </Button>
          )}
          <Button onClick={() => setWizardOpen(true)} className="shadow-[0_0_20px_#00e5ff25]">
            <Plus size={16} />
            {hasMasters ? 'New Copier' : 'Setup Copier'}
          </Button>
        </div>
      </div>

      {isLoading && accounts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-terminal-muted text-sm">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_6px_#00e5ff]" />
            Loading accounts...
          </div>
        </div>
      ) : accounts.length === 0 ? (
        /* Empty state — first-time user */
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
          <div className="relative mb-6">
            <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-neon-cyan/30 flex items-center justify-center">
              <Radio size={32} className="text-neon-cyan/40" />
            </div>
            <div className="absolute -inset-4 rounded-3xl bg-neon-cyan/5 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Set up your first copier</h2>
          <p className="text-sm text-terminal-muted max-w-sm mb-6">
            Connect a signal source and a copy destination. Takes about 30 seconds.
          </p>
          <Button onClick={() => setWizardOpen(true)} className="shadow-[0_0_20px_#00e5ff25]">
            <Plus size={16} />
            Setup Copier
          </Button>
        </div>
      ) : (
        <>
          {/* Signal Sources */}
          <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center gap-3">
              <h2 className="text-[11px] sm:text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neon-cyan" />
                Signal Sources
              </h2>
              <Badge variant="cyan">{masters.length}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {masters.map((m) => (
                <MasterCard key={m.id} account={m} onDelete={setDeleteTarget} />
              ))}
            </div>
          </section>

          {/* Copy Destinations */}
          <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center gap-3">
              <h2 className="text-[11px] sm:text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neon-purple" />
                Copy Destinations
              </h2>
              <Badge variant="purple">{followers.length}</Badge>
            </div>

            {followers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-terminal-border bg-terminal-surface/30 p-8 text-center text-sm text-terminal-muted">
                No copy destinations yet.{' '}
                <button onClick={() => setAddFollowerOpen(true)} className="text-neon-cyan hover:underline underline-offset-4 cursor-pointer">
                  Add one
                </button>{' '}
                to start copying trades.
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

          {/* Marketplace Subscriptions */}
          <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
            <div className="flex items-center gap-3">
              <h2 className="text-[11px] sm:text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neon-amber" />
                Marketplace Subscriptions
              </h2>
              <Badge variant="amber">{subscriptions.length}</Badge>
            </div>

            {subsLoading ? (
              <div className="flex items-center gap-2 py-4 text-terminal-muted text-sm">
                <span className="h-2 w-2 rounded-full bg-neon-amber animate-pulse shadow-[0_0_6px_var(--color-neon-amber)]" />
                Loading subscriptions...
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-terminal-border bg-terminal-surface/30 p-8 text-center text-sm text-terminal-muted">
                No marketplace subscriptions yet. Browse the{' '}
                <a href="/app/marketplace" className="text-neon-cyan hover:underline underline-offset-4">
                  Signal Marketplace
                </a>{' '}
                to copy top traders.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {subscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    sub={sub}
                    onUnsubscribe={handleUnsubscribe}
                    isUnsubscribing={unsubscribingId === sub.provider_id}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modals */}
      <SetupCopierWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      <AddFollowerModal open={addFollowerOpen} onClose={() => setAddFollowerOpen(false)} masters={masters} />
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
