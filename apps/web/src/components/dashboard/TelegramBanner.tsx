import { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications';

export function TelegramBanner() {
  const { telegramConnected, isLinking, generateDeepLink, checkTelegramStatus } =
    useNotificationStore();
  const [dismissed, setDismissed] = useState(false);
  const [pollTimeout, setPollTimeout] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('tg-banner-dismissed');
    if (dismissedAt) {
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissedAt, 10) < threeDays) {
        setDismissed(true);
      } else {
        localStorage.removeItem('tg-banner-dismissed');
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (telegramConnected || dismissed) return null;

  const handleConnect = async () => {
    const deepLink = await generateDeepLink();
    if (!deepLink) return;

    window.open(deepLink, '_blank');

    setPollTimeout(false);
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 2000;
      await checkTelegramStatus();
      const { telegramConnected: connected } = useNotificationStore.getState();
      if (connected || elapsed >= 30000) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        useNotificationStore.setState({ isLinking: false });
        if (!connected) setPollTimeout(true);
      }
    }, 2000);
  };

  const handleDismiss = () => {
    localStorage.setItem('tg-banner-dismissed', String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="glass-premium border-gradient rounded-2xl p-4 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0088cc] shadow-[0_0_12px_#0088cc40]">
            <Send size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Get instant trade alerts on Telegram
            </p>
            <p className="text-xs text-terminal-muted">
              Signals, P&amp;L summaries &amp; login alerts — one click to connect
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pollTimeout ? (
            <button
              onClick={handleConnect}
              className="rounded-xl bg-[#0088cc] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#0099dd] hover:shadow-[0_0_16px_#0088cc40]"
            >
              Retry
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLinking}
              className="rounded-xl bg-neon-cyan px-4 py-2 text-xs font-bold text-dark-base transition-all hover:shadow-[0_0_16px_#00e5ff40] disabled:opacity-50"
            >
              {isLinking ? 'Waiting...' : 'Connect Telegram'}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-terminal-muted hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {pollTimeout && (
        <p className="text-xs text-terminal-muted mt-2">
          Didn't complete? Try again or check Telegram.
        </p>
      )}
    </div>
  );
}
