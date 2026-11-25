'use client';

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Cpu, Wrench } from 'lucide-react';
import { Meter } from '@/types';
import { formatDateTime } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui';

export interface MeterHealthSummaryData {
  totalMeters: number;
  averageHealthScore: number;
  statusBreakdown: {
    active: number;
    warning: number;
    offline: number;
    maintenance: number;
  };
  typeBreakdown: Record<string, number>;
  attentionRequiredMeters: Array<Meter & { diagnostic?: string }>;
}

export function MeterHealthGrid({ summary }: { summary: MeterHealthSummaryData | null }) {
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/90">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            Fleet Health Score
          </span>
          <p className="mt-1 text-2xl font-extrabold text-emerald-500">
            {summary.averageHealthScore}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Active</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {summary.statusBreakdown.active}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Warning</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1 text-xl font-bold text-amber-500">
            {summary.statusBreakdown.warning}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Maintenance
            </span>
            <Wrench className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="mt-1 text-xl font-bold text-cyan-500">
            {summary.statusBreakdown.maintenance}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Offline</span>
            <Activity className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-1 text-xl font-bold text-rose-500">
            {summary.statusBreakdown.offline}
          </p>
        </div>
      </div>

      {summary.attentionRequiredMeters.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h4 className="text-xs font-bold tracking-wider text-amber-500 uppercase">
            Smart Meters Requiring Attention ({summary.attentionRequiredMeters.length})
          </h4>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {summary.attentionRequiredMeters.slice(0, 6).map((m) => (
              <div
                key={m._id}
                className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {m.meterCode}
                  </span>
                  <StatusBadge status={`${m.healthScore}% · ${m.status}`} />
                </div>
                <p className="mt-1 font-medium text-slate-600 dark:text-slate-300">{m.name}</p>
                <p className="mt-1 text-[11px] text-amber-500">{m.diagnostic}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Firmware {m.firmwareVersion} · Last Ping: {formatDateTime(m.lastReadingAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
