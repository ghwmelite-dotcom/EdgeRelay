import { useState, useEffect, useCallback } from 'react';
import { Send, X, ExternalLink, Loader2 } from 'lucide-react';
import { useNotificationStore } from '@/stores/notifications';

export function TelegramBanner() {
  const { telegramConnected, isLinking, generateDeepLink, checkTelegramStatus } =
    useNotificationStore();
  const [dismissed, setDismissed] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

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

  // When user returns to the tab, check connection status
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && deepLinkUrl) {
      setChecking(true);
      checkTelegramStatus().finally(() => setChecking(false));
    }
  }, [deepLinkUrl, checkTelegramStatus]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  if (telegramConnected || dismissed) return null;

  const handleConnect = async () => {
    const deepLink = await generateDeepLink();
    if (!deepLink) return;
    setDeepLinkUrl(deepLink);
    useNotificationStore.setState({ isLinking: false });
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
          {deepLinkUrl ? (
            <div className="flex items-center gap-2">
              <a
                href={deepLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-[#0088cc] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#0099dd] hover:shadow-[0_0_16px_#0088cc40]"
              >
                Open Telegram <ExternalLink size={12} />
              </a>
              {checking && <Loader2 size={14} className="text-neon-cyan animate-spin" />}
            </div>
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
      {deepLinkUrl && (
        <p className="text-xs text-neon-cyan mt-2">
          Click "Open Telegram" above, then tap <b>Start</b> in the bot. Come back here and it will update automatically.
        </p>
      )}
    </div>
  );
}
