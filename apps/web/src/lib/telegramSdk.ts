let pending: Promise<void> | undefined;

/** Optional integration: never put this third-party request on the homepage startup path. */
export function loadTelegramSdk(): Promise<void> {
  if (window.Telegram?.WebApp) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    const timer = window.setTimeout(() => fail(), 8000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error('Telegram could not load. Check your connection and retry.'));
    }
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.Telegram?.WebApp) resolve(); else fail();
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => { pending = undefined; throw error; });
  return pending;
}
