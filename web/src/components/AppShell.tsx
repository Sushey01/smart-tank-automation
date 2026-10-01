import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, Bell, LayoutDashboard, Moon, Network, Sun, Waves } from 'lucide-react';
import clsx from 'clsx';
import { getHealth } from '../api/health';
import { ApiError } from '../api/client';
import { useTheme } from '../lib/theme-context';
import { BackendDown } from './States';

const links = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/devices', label: 'Devices', icon: Waves },
  { to: '/telemetry', label: 'Telemetry', icon: Activity },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/cluster', label: 'Cluster', icon: Network },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

function navClass(active: boolean) {
  return clsx(
    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
    active ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-surface-muted',
  );
}

export function AppShell() {
  const { dark, toggle } = useTheme();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const unreachable = health.isError && health.error instanceof ApiError && health.error.status === 0;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="hidden border-r border-surface-border bg-surface-card md:flex md:flex-col md:px-4 md:py-6">
        <div className="px-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">IoThings</p>
          <p className="mt-1 text-lg font-semibold">Smart Tank</p>
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => navClass(isActive)}>
              <link.icon size={18} aria-hidden />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-surface-border bg-surface-card/90 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-sm font-semibold md:hidden">Smart Tank</p>
            <p className="text-sm text-ink-muted">Synthetic tank, climate, and power telemetry</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={health.isSuccess ? 'badge-ok' : 'badge-danger'}>
              <span className={health.isSuccess ? 'h-2 w-2 rounded-full bg-status-ok animate-pulse-ring' : 'h-2 w-2 rounded-full bg-status-danger'} aria-hidden />
              {health.isSuccess ? 'API connected' : 'API offline'}
            </span>
            <button type="button" onClick={toggle} className="rounded-xl border border-surface-border p-2" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-5 pb-24 md:px-8 md:pb-8">
          {unreachable ? <BackendDown /> : <Outlet />}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-surface-border bg-surface-card px-1 py-2 md:hidden" aria-label="Primary">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => clsx('flex flex-col items-center gap-1 text-[10px]', isActive ? 'text-brand-600' : 'text-ink-faint')}>
            <link.icon size={18} aria-hidden />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
