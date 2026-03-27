import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { User, Lock, Bell, AlertTriangle, Trash2, Send, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useNotificationStore } from '@/stores/notifications';

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none glass rounded-2xl px-4 py-3 hover:border-terminal-border-hover transition-all duration-200">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-all duration-300 focus-ring ${
          checked
            ? 'bg-neon-cyan shadow-[0_0_8px_#00e5ff40]'
            : 'bg-terminal-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Account Modal                                               */
/* ------------------------------------------------------------------ */

function DeleteAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const logout = useAuthStore((s) => s.logout);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    await api.del('/auth/account');
    setIsDeleting(false);
    logout();
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Delete Account">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-neon-red/30 bg-neon-red/5 p-4">
          <AlertTriangle size={18} className="text-neon-red mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300">
            This will permanently delete your account, all trading accounts, and
            signal history. This action cannot be undone.
          </p>
        </div>

        <div>
          <Input
            label='Type "DELETE" to confirm'
            placeholder="DELETE"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={
              canDelete
                ? 'border-neon-red focus:border-neon-red focus:shadow-[0_0_15px_#ff3d5720,0_0_30px_#ff3d5708]'
                : ''
            }
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={!canDelete}
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 size={14} />
            Delete Account
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Success / Error Message                                            */
/* ------------------------------------------------------------------ */

function StatusMessage({ message, type }: { message: string; type: 'success' | 'error' }) {
  if (!message) return null;
  return (
    <p className={`text-xs mt-2 ${type === 'success' ? 'text-neon-green' : 'text-neon-red'}`}>
      {message}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Page                                                      */
/* ------------------------------------------------------------------ */

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  /* -- Profile -- */
  const [name, setName] = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  /* -- Password -- */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' }>({
    text: '',
    type: 'success',
  });

  /* -- Notifications -- */
  const {
    telegramConnected,
    linkedAt,
    preferences,
    isLinking,
    checkTelegramStatus,
    generateDeepLink,
    unlinkTelegram,
    fetchPreferences,
    updatePreferences,
  } = useNotificationStore();
  const [tgDeepLink, setTgDeepLink] = useState<string | null>(null);
  const [tgChecking, setTgChecking] = useState(false);

  /* -- Danger Zone -- */
  const [deleteOpen, setDeleteOpen] = useState(false);

  /* -- Auto-clear success messages -- */
  const autoClear = useCallback((clearFn: () => void) => {
    const timer = setTimeout(clearFn, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (profileMsg) return autoClear(() => setProfileMsg(''));
  }, [profileMsg, autoClear]);

  useEffect(() => {
    if (passwordMsg.text) return autoClear(() => setPasswordMsg({ text: '', type: 'success' }));
  }, [passwordMsg.text, autoClear]);

  useEffect(() => {
    checkTelegramStatus();
    fetchPreferences();
  }, []);

  // When user returns to tab after clicking the Telegram deep link, re-check status
  const handleTgVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && tgDeepLink) {
      setTgChecking(true);
      checkTelegramStatus().finally(() => setTgChecking(false));
    }
  }, [tgDeepLink, checkTelegramStatus]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleTgVisibilityChange);
    window.addEventListener('focus', handleTgVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleTgVisibilityChange);
      window.removeEventListener('focus', handleTgVisibilityChange);
    };
  }, [handleTgVisibilityChange]);

  // Clear deep link once connected
  useEffect(() => {
    if (telegramConnected) setTgDeepLink(null);
  }, [telegramConnected]);

  /* -- Handlers -- */

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    await api.put('/accounts/profile', { name });
    setProfileSaving(false);
    setProfileMsg('Profile updated successfully.');
  };

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setPasswordMsg({ text: 'New password must be at least 8 characters.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    setPasswordSaving(true);
    const res = await api.put('/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    setPasswordSaving(false);

    if (res.error) {
      setPasswordMsg({ text: res.error.message ?? 'Failed to update password.', type: 'error' });
    } else {
      setPasswordMsg({ text: 'Password updated successfully.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page Title */}
      <h1
        className="text-3xl font-black tracking-tight text-white font-display animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        Settings
      </h1>

      {/* ---- Profile ---- */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon-cyan/10">
              <User size={16} className="text-neon-cyan" />
            </span>
            Profile
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Email"
            value={user?.email ?? ''}
            disabled
            className="opacity-60 cursor-not-allowed"
          />
          <div>
            <Button type="submit" isLoading={profileSaving}>
              Save Changes
            </Button>
            <StatusMessage message={profileMsg} type="success" />
          </div>
        </form>
      </Card>

      {/* ---- Security ---- */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon-cyan/10">
              <Lock size={16} className="text-neon-cyan" />
            </span>
            Security
          </CardTitle>
        </CardHeader>

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 8 characters"
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            required
          />
          <div>
            <Button type="submit" isLoading={passwordSaving}>
              Update Password
            </Button>
            {passwordMsg.text && (
              <StatusMessage message={passwordMsg.text} type={passwordMsg.type} />
            )}
          </div>
        </form>
      </Card>

      {/* ---- Notifications ---- */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon-cyan/10">
              <Bell size={16} className="text-neon-cyan" />
            </span>
            Notifications
          </CardTitle>
        </CardHeader>

        {!telegramConnected ? (
          /* ---- Disconnected State ---- */
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#0088cc]/20 bg-[#0088cc]/5 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0088cc]/15">
                <Send size={22} className="text-[#0088cc]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Connect Telegram</p>
                <p className="text-xs text-terminal-muted mt-1">
                  Receive instant trade alerts, equity guard warnings, and daily summaries straight to Telegram.
                </p>
              </div>
              {tgDeepLink ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <a
                    href={tgDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-[#0088cc] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0099dd]"
                  >
                    Open Telegram <ExternalLink size={14} />
                  </a>
                  {tgChecking && (
                    <span className="flex items-center gap-1.5 text-xs text-neon-cyan">
                      <Loader2 size={12} className="animate-spin" /> Checking connection…
                    </span>
                  )}
                  <p className="text-xs text-terminal-muted text-center mt-1">
                    Tap <b>Start</b> in the bot, then come back — this page will update automatically.
                  </p>
                </div>
              ) : (
                <button
                  disabled={isLinking}
                  onClick={async () => {
                    const link = await generateDeepLink();
                    if (link) {
                      useNotificationStore.setState({ isLinking: false });
                      setTgDeepLink(link);
                    }
                  }}
                  className="rounded-xl bg-[#0088cc] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0099dd] disabled:opacity-50"
                >
                  {isLinking ? 'Generating link…' : 'Connect Telegram'}
                </button>
              )}
            </div>

            {/* Preview toggles — greyed out */}
            <div className="space-y-2 opacity-40 pointer-events-none select-none">
              {[
                'Login alerts',
                'Signal executed',
                'Equity guard triggered',
                'Account disconnected',
                'Daily summary',
                'Weekly digest',
              ].map((label) => (
                <ToggleSwitch key={label} label={label} checked={false} onChange={() => {}} />
              ))}
            </div>
            <p className="text-xs text-terminal-muted text-center">
              Connect Telegram to manage preferences
            </p>
          </div>
        ) : (
          /* ---- Connected State ---- */
          <div className="space-y-4">
            {/* Status bar */}
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Connected</p>
                  {linkedAt && (
                    <p className="text-[10px] text-terminal-muted">
                      Since {new Date(linkedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={unlinkTelegram}
                className="rounded-lg border border-neon-red/30 bg-neon-red/5 px-3 py-1.5 text-xs font-semibold text-neon-red transition-all hover:bg-neon-red/15"
              >
                Disconnect
              </button>
            </div>

            {/* Preference toggles */}
            <div className="space-y-2">
              <div>
                <ToggleSwitch
                  label="Login alerts"
                  checked={preferences?.login_alerts ?? false}
                  onChange={(v) => updatePreferences({ login_alerts: v })}
                />
                <p className="text-xs text-terminal-muted mt-0.5 px-1">Get notified of new sign-ins</p>
              </div>
              <div>
                <ToggleSwitch
                  label="Signal executed"
                  checked={preferences?.signal_executed ?? false}
                  onChange={(v) => updatePreferences({ signal_executed: v })}
                />
                <p className="text-xs text-terminal-muted mt-0.5 px-1">Alert on every trade execution</p>
              </div>
              <div>
                <ToggleSwitch
                  label="Equity guard triggered"
                  checked={preferences?.equity_guard ?? false}
                  onChange={(v) => updatePreferences({ equity_guard: v })}
                />
                <p className="text-xs text-terminal-muted mt-0.5 px-1">Alert when equity guard halts trading</p>
              </div>
              <div>
                <ToggleSwitch
                  label="Account disconnected"
                  checked={preferences?.account_disconnected ?? false}
                  onChange={(v) => updatePreferences({ account_disconnected: v })}
                />
                <p className="text-xs text-terminal-muted mt-0.5 px-1">Alert when an EA loses connection</p>
              </div>
              <div>
                <ToggleSwitch
                  label="Daily summary"
                  checked={preferences?.daily_summary ?? false}
                  onChange={(v) => updatePreferences({ daily_summary: v })}
                />
                <p className="text-xs text-terminal-muted mt-0.5 px-1">End-of-day performance recap</p>
              </div>
              <div>
                <ToggleSwitch
                  label="Weekly digest"
                  checked={preferences?.weekly_digest ?? false}
                  onChange={(v) => updatePreferences({ weekly_digest: v })}
                />
                <p className="text-xs text-terminal-muted mt-0.5 px-1">Weekly analytics delivered every Monday</p>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Timezone</label>
              <select
                value={preferences?.timezone ?? 'UTC'}
                onChange={(e) => updatePreferences({ timezone: e.target.value })}
                className="w-full rounded-xl border border-terminal-border bg-terminal-card px-3 py-2.5 text-sm text-slate-200 focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_0_2px_#00e5ff20] transition-all"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (Eastern)</option>
                <option value="America/Chicago">America/Chicago (Central)</option>
                <option value="America/Denver">America/Denver (Mountain)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                <option value="Europe/Moscow">Europe/Moscow (MSK)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* ---- Danger Zone ---- */}
      <Card
        className="animate-fade-in-up border border-neon-red/20 shadow-[0_0_30px_#ff3d5708]"
        style={{ animationDelay: '180ms' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-neon-red">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon-red/10">
              <AlertTriangle size={16} />
            </span>
            Danger Zone
          </CardTitle>
        </CardHeader>

        <p className="text-sm text-slate-400 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>

        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={14} />
          Delete Account
        </Button>
      </Card>

      {/* Delete Modal */}
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
