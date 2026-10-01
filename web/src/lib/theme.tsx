import { useEffect, useMemo, useState } from 'react';
import { ThemeContext, type ThemeChoice, type ThemeContextValue } from './theme-context';

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(choice: ThemeChoice) {
  return choice === 'system' ? systemDark() : choice === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'system';
  });
  const [dark, setDark] = useState(() => resolve(choice));

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setDark(resolve(choice));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [choice]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    if (choice === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', choice);
  }, [choice, dark]);

  const value = useMemo<ThemeContextValue>(() => ({
    dark,
    choice,
    toggle: () => setChoice(dark ? 'light' : 'dark'),
  }), [choice, dark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
