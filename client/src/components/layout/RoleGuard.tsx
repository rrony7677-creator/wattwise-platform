'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/types';
import { formatRoleLabel } from '@/lib/formatters';

export function RoleGuard({
  allowedRoles,
  fallback,
  showBanner = false,
  children,
}: {
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  showBanner?: boolean;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) return null;

  if (allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showBanner) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
        <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
          Restricted Access
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Your current role (<span className="font-semibold">{formatRoleLabel(user.role)}</span>)
          does not have permission to access this management module. Required role:{' '}
          {allowedRoles.map(formatRoleLabel).join(' or ')}.
        </p>
      </div>
    );
  }

  return null;
}
