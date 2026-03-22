import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { User, Lock, Bell, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

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
  const [eaDisconnect, setEaDisconnect] = useState(true);
  const [equityGuard, setEquityGuard] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

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
    if (notifMsg) return autoClear(() => setNotifMsg(''));
  }, [notifMsg, autoClear]);

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

  const handleNotifSave = async () => {
    setNotifSaving(true);
    // Placeholder -- just simulate success
    await new Promise((r) => setTimeout(r, 300));
    setNotifSaving(false);
    setNotifMsg('Preferences saved successfully.');
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

        <div className="space-y-3">
          <ToggleSwitch
            label="Email when EA disconnects"
            checked={eaDisconnect}
            onChange={setEaDisconnect}
          />
          <ToggleSwitch
            label="Email when equity guard triggers"
            checked={equityGuard}
            onChange={setEquityGuard}
          />
          <ToggleSwitch
            label="Daily performance summary"
            checked={dailySummary}
            onChange={setDailySummary}
          />
          <ToggleSwitch
            label="Weekly analytics report"
            checked={weeklyReport}
            onChange={setWeeklyReport}
          />

          <p className="text-xs text-terminal-muted pt-1">
            Email notifications coming soon.
          </p>

          <div className="pt-1">
            <Button onClick={handleNotifSave} isLoading={notifSaving}>
              Save Preferences
            </Button>
            <StatusMessage message={notifMsg} type="success" />
          </div>
        </div>
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
