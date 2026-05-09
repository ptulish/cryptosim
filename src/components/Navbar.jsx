import { NavLink } from 'react-router-dom';
import { Activity, History, LayoutDashboard, LineChart } from 'lucide-react';
import { classNames } from '../utils/format.js';
import { UserMenu } from './UserMenu.jsx';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/market', label: 'Market', icon: LineChart },
  { to: '/history', label: 'History', icon: History },
];

export function Navbar({ wsStatus }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500">
            <LineChart className="h-4 w-4 text-bg-base" strokeWidth={2.5} />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Crypto<span className="text-brand-400">Sim</span>
          </span>
        </NavLink>

        <nav className="hidden gap-1 sm:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                classNames(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-bg-elevated text-slate-100'
                    : 'text-slate-400 hover:bg-bg-elevated/60 hover:text-slate-200',
                )
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <StatusDot status={wsStatus} />
            <span className="hidden sm:inline">
              {wsStatus === 'open'
                ? 'Live'
                : wsStatus === 'connecting'
                  ? 'Connecting…'
                  : wsStatus === 'idle'
                    ? 'Idle'
                    : 'Reconnecting…'}
            </span>
          </div>
          <UserMenu />
        </div>

        <nav className="flex gap-1 sm:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                classNames(
                  'rounded-lg p-2 transition-colors',
                  isActive
                    ? 'bg-bg-elevated text-slate-100'
                    : 'text-slate-400 hover:bg-bg-elevated/60',
                )
              }
              aria-label={link.label}
            >
              <link.icon className="h-4 w-4" />
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function StatusDot({ status }) {
  const map = {
    open: 'bg-brand-500',
    connecting: 'bg-amber-400',
    closed: 'bg-slate-500',
    idle: 'bg-slate-600',
    error: 'bg-danger-500',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'open' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
      )}
      <span
        className={classNames(
          'relative inline-flex h-2.5 w-2.5 rounded-full',
          map[status] ?? 'bg-slate-600',
        )}
      />
      <Activity className="hidden" />
    </span>
  );
}
