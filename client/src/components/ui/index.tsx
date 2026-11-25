'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  X,
} from 'lucide-react';
import { PaginationMeta } from '@/types';
import { DatePreset } from '@/hooks/useFilterState';

/* -------------------------------------------------------------------------- */
/* 1. KPI Stat Card                                                           */
/* -------------------------------------------------------------------------- */
export function KpiStatCard({
  title,
  value,
  subtitle,
  deltaPct,
  invertDeltaColor = false,
  icon,
  accent = 'emerald',
}: {
  title: string;
  value: string;
  subtitle?: string;
  deltaPct?: number;
  invertDeltaColor?: boolean;
  icon?: React.ReactNode;
  accent?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'indigo';
}) {
  const accentClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  };

  const isPositive = (deltaPct ?? 0) > 0;
  // For energy consumption/cost, an increase (+%) is typically an amber/rose warning unless inverted
  const deltaBadgeColor =
    deltaPct === undefined || deltaPct === 0
      ? 'bg-slate-500/10 text-slate-400'
      : (isPositive && !invertDeltaColor) || (!isPositive && invertDeltaColor)
      ? 'bg-amber-500/15 text-amber-400'
      : 'bg-emerald-500/15 text-emerald-400';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </h3>
        </div>
        {icon && (
          <div className={`rounded-lg border p-2.5 ${accentClasses[accent]}`}>{icon}</div>
        )}
      </div>

      {(subtitle || deltaPct !== undefined) && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          {deltaPct !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium ${deltaBadgeColor}`}
            >
              {deltaPct > 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : deltaPct < 0 ? (
                <ArrowDownRight className="h-3.5 w-3.5" />
              ) : null}
              {deltaPct > 0 ? `+${deltaPct.toFixed(1)}%` : `${deltaPct.toFixed(1)}%`} vs prev
            </span>
          )}
          {subtitle && (
            <span className="truncate text-slate-500 dark:text-slate-400">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Section Card                                                            */
/* -------------------------------------------------------------------------- */
export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800/80">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Status & Role Badges                                                    */
/* -------------------------------------------------------------------------- */
export function StatusBadge({
  status,
  variant,
}: {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  let resolvedVariant = variant;
  if (!resolvedVariant) {
    const lower = status.toLowerCase();
    if (['active', 'resolved', 'normal', 'healthy', 'true'].includes(lower)) {
      resolvedVariant = 'success';
    } else if (['warning', 'acknowledged', 'maintenance', 'medium'].includes(lower)) {
      resolvedVariant = 'warning';
    } else if (['critical', 'new', 'offline', 'anomaly', 'high'].includes(lower)) {
      resolvedVariant = 'danger';
    } else if (['org_admin', 'facility_manager'].includes(lower)) {
      resolvedVariant = 'info';
    } else {
      resolvedVariant = 'neutral';
    }
  }

  const styles: Record<string, string> = {
    success:
      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
    info: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
    neutral: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/25',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[resolvedVariant]}`}
    >
      {status}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Modal Dialog                                                            */
/* -------------------------------------------------------------------------- */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900`}
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Server-Side Pagination Bar                                              */
/* -------------------------------------------------------------------------- */
export function PaginationBar({
  meta,
  onPageChange,
}: {
  meta?: PaginationMeta;
  onPageChange: (nextPage: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = meta;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(total, page * limit);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <div>
        Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startItem}</span>{' '}
        to <span className="font-semibold text-slate-800 dark:text-slate-200">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {total.toLocaleString()}
        </span>{' '}
        records
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Debounced Search Input                                                  */
/* -------------------------------------------------------------------------- */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search records...',
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-8 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/90 dark:text-white"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Date Range & Preset Selector Bar                                        */
/* -------------------------------------------------------------------------- */
export function DateRangeToolbar({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  extraFilters,
}: {
  preset: DatePreset;
  startDate: string;
  endDate: string;
  onPresetChange: (p: DatePreset) => void;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  extraFilters?: React.ReactNode;
}) {
  const presets: Array<{ id: DatePreset; label: string }> = [
    { id: '7d', label: 'Last 7D' },
    { id: '30d', label: 'Last 30D' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Prev Month' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === p.id
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-1 flex items-center gap-1.5 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
      </div>
      {extraFilters && <div className="flex flex-wrap items-center gap-2">{extraFilters}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Loading Skeleton, Error State & Empty State                             */
/* -------------------------------------------------------------------------- */
export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-12 w-full animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70"
        />
      ))}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your filters or date range.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">
        <Inbox className="h-6 w-6" />
      </div>
      <h4 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
