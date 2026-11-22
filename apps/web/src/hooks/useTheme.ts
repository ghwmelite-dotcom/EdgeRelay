import { useState, useCallback } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Read from DOM class (set by inline script in index.html)
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const cl = document.documentElement.classList;
      cl.toggle('light', next === 'light');
      cl.toggle('dark', next === 'dark');
      try { localStorage.setItem('theme', next); } catch { /* Apply the theme even without storage. */ }
      return next;
    });
  }, []);

  return { theme, toggle };
}
