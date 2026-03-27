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
      document.documentElement.classList.toggle('light', next === 'light');
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
