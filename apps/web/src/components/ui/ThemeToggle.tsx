import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`group relative flex items-center justify-center rounded-xl p-2 transition-all duration-200 hover:bg-neon-cyan/10 focus-ring ${className}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-terminal-muted group-hover:text-neon-cyan transition-colors" />
      ) : (
        <Moon size={16} className="text-terminal-muted group-hover:text-neon-cyan transition-colors" />
      )}
    </button>
  );
}
