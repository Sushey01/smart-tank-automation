import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

const STORAGE_KEY = 'theme';

export interface Palette {
  bg: string;
  card: string;
  muted: string;
  border: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  brand: string;
  brandDark: string;
  ok: string;
  warn: string;
  danger: string;
  onBrand: string;
}

const light: Palette = {
  bg: '#f3f7f8',
  card: '#ffffff',
  muted: '#e7eef2',
  border: '#d5e1e8',
  ink: '#0f172a',
  inkMuted: '#334155',
  inkFaint: '#64748b',
  brand: '#0891b2',
  brandDark: '#0e7490',
  ok: '#16a34a',
  warn: '#f59e0b',
  danger: '#dc2626',
  onBrand: '#ffffff',
};

const dark: Palette = {
  bg: '#0b1220',
  card: '#121b2c',
  muted: '#1a2740',
  border: '#2a3b56',
  ink: '#e8eef7',
  inkMuted: '#c5d0e0',
  inkFaint: '#93a4bb',
  brand: '#22d3ee',
  brandDark: '#0891b2',
  ok: '#4ade80',
  warn: '#fbbf24',
  danger: '#f87171',
  onBrand: '#083344',
};

interface ThemeValue {
  dark: boolean;
  colors: Palette;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light') setMode(stored);
    }).catch(() => {
      /* keep the system choice */
    });
  }, []);

  const value = useMemo<ThemeValue>(() => ({
    dark: mode === 'dark',
    colors: mode === 'dark' ? dark : light,
    toggle: () => {
      setMode((current) => {
        const next = current === 'dark' ? 'light' : 'dark';
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
          /* the toggle still applies for this session */
        });
        return next;
      });
    },
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
