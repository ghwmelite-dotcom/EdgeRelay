// Browser push notification controls — sits inside BiasAlertsCard.
//
// Three states the UI must handle:
//   1. unsupported (iOS Safari pre-16, old browsers) → show disabled tile
//   2. permission=denied → show tile with "unblock in browser settings" hint
//   3. permission=granted AND subscribed → show enabled state + test button
//   4. default/prompt → show enable button
import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import {
  isSupported,
  currentPermission,
  currentSubscription,
  enablePush,
  disablePush,
  sendTestPush,
} from '@/lib/pushSubscribe';

type State =
  | { kind: 'loading' }
  | { kind: 'unsupported' }
  | { kind: 'denied' }
  | { kind: 'ready'; subscribed: boolean };

export function BrowserPushToggle() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupported()) { setState({ kind: 'unsupported' }); return; }
    const perm = await currentPermission();
    if (perm === 'denied') { setState({ kind: 'denied' }); return; }
    const sub = await currentSubscription();
    setState({ kind: 'ready', subscribed: !!sub && perm === 'granted' });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleEnable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await enablePush();
      setMessage({ type: 'success', text: 'Browser notifications enabled' });
      await refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to enable' });
      await refresh();
    } finally { setBusy(false); }
  };

  const handleDisable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await disablePush();
      setMessage({ type: 'success', text: 'Browser notifications turned off' });
      await refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to disable' });
    } finally { setBusy(false); }
  };

  const handleTest = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await sendTestPush();
      if (res.sent === 0) {
        const firstErr = res.detail?.[0]?.error ?? res.detail?.[0]?.status ?? 'unknown';
        setMessage({ type: 'error', text: `Server couldn't deliver (${firstErr}). Check service worker in DevTools.` });
      } else {
        setMessage({
          type: 'success',
          text: `Delivered to ${res.sent}/${res.total} · if you don't see it: OS Do-Not-Disturb, site notifications blocked, or SW inactive. DevTools → Application → Service Workers.`,
        });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Test failed' });
    } finally { setBusy(false); }
  };

  // Header block shared across states
  const header = (
    <div className="flex items-start gap-2.5">
      <Bell size={14} className="text-neon-cyan mt-0.5" />
      <div>
        <p className="text-[12px] font-semibold text-slate-200">Browser notifications</p>
        <p className="text-[10px] text-terminal-muted mt-0.5 leading-snug">
          Native OS-level alerts on any signed-in device — fires even when the site isn't open.
        </p>
      </div>
    </div>
  );

  if (state.kind === 'loading') {
    return (
      <div className="mb-4 rounded-xl border border-terminal-border/40 bg-terminal-surface/30 px-4 py-3 animate-pulse">
        {header}
      </div>
    );
  }

  if (state.kind === 'unsupported') {
    return (
      <div className="mb-4 rounded-xl border border-terminal-border/40 bg-terminal-surface/30 px-4 py-3 opacity-60">
        {header}
        <p className="text-[11px] text-terminal-muted mt-2 flex items-start gap-1.5">
          <AlertTriangle size={11} className="text-neon-amber mt-0.5 flex-shrink-0" />
          Not supported by this browser. Try Chrome / Firefox / Edge on desktop, or Safari 16.4+ on iOS.
        </p>
      </div>
    );
  }

  if (state.kind === 'denied') {
    return (
      <div className="mb-4 rounded-xl border border-neon-red/25 bg-neon-red/[0.04] px-4 py-3">
        {header}
        <p className="text-[11px] text-neon-red/90 mt-2 flex items-start gap-1.5">
          <BellOff size={11} className="mt-0.5 flex-shrink-0" />
          Notifications are blocked for this site. Unblock in your browser settings (lock icon in address bar → Notifications → Allow), then reload.
        </p>
      </div>
    );
  }

  // ready state
  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 ${
        state.subscribed
          ? 'border-neon-green/25 bg-neon-green/[0.04]'
          : 'border-neon-cyan/20 bg-neon-cyan/[0.03]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {header}
        {state.subscribed ? (
          <CheckCircle2 size={14} className="text-neon-green mt-0.5" />
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {state.subscribed ? (
          <>
            <button
              type="button"
              onClick={handleDisable}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-terminal-border/60 bg-terminal-surface/50 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-neon-red hover:border-neon-red/40 transition-colors disabled:opacity-60"
            >
              <BellOff size={11} />
              Turn off
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 px-2.5 py-1 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/15 transition-colors disabled:opacity-60"
            >
              <Send size={11} />
              {busy ? 'Sending…' : 'Send test'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 px-3 py-1.5 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/25 transition-colors disabled:opacity-60"
          >
            <Bell size={11} />
            {busy ? 'Setting up…' : 'Enable browser notifications'}
          </button>
        )}

        {message && (
          <span className={`text-[10px] font-semibold ${message.type === 'success' ? 'text-neon-green' : 'text-neon-red'}`}>
            {message.text}
          </span>
        )}
      </div>

      {state.subscribed && (
        <p className="text-[10px] text-terminal-muted mt-2 leading-snug">
          Your phase-alert + Daily Brief preferences below also drive which pushes you get here. Alerts fire in parallel with Telegram.
        </p>
      )}
    </div>
  );
}
