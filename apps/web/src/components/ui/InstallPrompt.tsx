import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('pwa-install-dismissed') === '1'; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('pwa-install-dismissed', '1'); } catch {}
  };

  return (
    <div className="animate-fade-in-up fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-neon-cyan/25 bg-terminal-surface/95 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(0,229,255,0.1)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/25 bg-neon-cyan/10">
          <Download size={18} className="text-neon-cyan" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Install TradeMetrics Pro</p>
          <p className="mt-0.5 text-[12px] text-terminal-muted">Add to your home screen for faster access and offline Academy lessons</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-semibold text-terminal-bg cursor-pointer"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg border border-terminal-border px-4 py-2 text-[12px] text-terminal-muted cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-terminal-muted hover:text-white cursor-pointer">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
