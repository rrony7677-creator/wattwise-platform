'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bell,
  Building2,
  Cpu,
  FileBarChart,
  Gauge,
  Layers,
  LayoutDashboard,
  Settings,
  Users,
  Zap,
  Network,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatRoleLabel } from '@/lib/formatters';
import { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Organization Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Building Management', href: '/buildings', icon: Building2 },
  { label: 'Floor Management', href: '/floors', icon: Layers },
  { label: 'Department Management', href: '/departments', icon: Network },
  { label: 'Meter & Health Monitor', href: '/meters', icon: Cpu },
  { label: 'Energy Records', href: '/records', icon: Activity },
  { label: 'Analytics & Insights', href: '/analytics', icon: Gauge },
  { label: 'Alert Management', href: '/alerts', icon: Bell },
  { label: 'Reports & Exports', href: '/reports', icon: FileBarChart },
  { label: 'User Management', href: '/users', icon: Users, roles: ['org_admin'] },
  { label: 'Profile & Org Settings', href: '/profile', icon: Settings },
];

export function AppSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { user, organization } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Watt<span className="text-emerald-500">Wise</span>
            </span>
            <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              Energy Intelligence
            </p>
          </div>
        </div>

        {/* Active Organization Card */}
        {organization && (
          <div className="mx-3.5 mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                {organization.code}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {organization.industry}
              </span>
            </div>
            <p className="mt-1.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
              {organization.name}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Tariff: ${organization.baseTariffPerKwh}/kWh · Peak: ${organization.peakTariffPerKwh}
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-600 shadow-2xs dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-emerald-500' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Current User Role Footer */}
        {user && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Active Role
              </span>
              <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-500">
                {formatRoleLabel(user.role)}
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
