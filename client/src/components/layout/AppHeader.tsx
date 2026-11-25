'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Play,
  Radio,
  Sun,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useRealtimeSim } from '@/hooks/useRealtimeSim';
import { formatRoleLabel } from '@/lib/formatters';

export function AppHeader({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { user, logout, canCreateRecords } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    isAutoSimulating,
    isTickPending,
    lastTickResult,
    triggerSingleTick,
    toggleAutoSimulate,
  } = useRealtimeSim();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:px-6 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        {lastTickResult && (
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 md:flex dark:text-emerald-400">
            <Zap className="h-3.5 w-3.5" />
            <span>
              Live Tick: +{lastTickResult.recordsCreated} readings
              {lastTickResult.alertsTriggered > 0
                ? ` · ${lastTickResult.alertsTriggered} alert(s)`
                : ''}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Bonus Challenge: Real-Time Energy Monitoring Simulation Controls */}
        {canCreateRecords && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isTickPending}
              onClick={() => void triggerSingleTick()}
              title="Simulate a single real-time IoT meter reading batch now"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Play className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">
                {isTickPending ? 'Simulating...' : 'Simulate Tick'}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleAutoSimulate}
              title="Toggle continuous real-time energy monitoring simulation (every 10s)"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                isAutoSimulating
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${isAutoSimulating ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">
                {isAutoSimulating ? 'Live Sim: ON' : 'Live Sim'}
              </span>
            </button>
          </div>
        )}

        {/* Quick Link to Alert Management */}
        <Link
          href="/alerts"
          title="View Energy Alerts"
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell className="h-4 w-4" />
        </Link>

        {/* Bonus Challenge: Dark Mode Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </button>

        {/* User Badge & Logout */}
        {user && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-2.5 dark:border-slate-800">
            <Link
              href="/profile"
              className="hidden text-right sm:block"
            >
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {user.name}
              </p>
              <p className="text-[10px] text-emerald-500">
                {formatRoleLabel(user.role)}
              </p>
            </Link>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 dark:border-slate-700 dark:text-slate-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
