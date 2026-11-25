'use client';

import React from 'react';
import {
  AlertOctagon,
  Building2,
  Clock,
  Cpu,
  Flame,
  Leaf,
  TreePine,
} from 'lucide-react';
import { InsightsData } from '@/types';
import {
  formatCarbon,
  formatCurrency,
  formatDateTime,
  formatKwhCompact,
} from '@/lib/formatters';
import { SectionCard, StatusBadge } from '@/components/ui';

export function InsightsPanel({ insights }: { insights: InsightsData }) {
  const { highestUsageEntities, carbonMetrics, unusualConsumptionEvents } = insights;

  return (
    <div className="space-y-6">
      {/* Highest Usage & Carbon Intelligence Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase">Highest Usage Building</span>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 truncate text-base font-bold text-slate-900 dark:text-white">
            {highestUsageEntities.peakBuilding?.name || 'N/A'}
          </p>
          <p className="mt-1 text-xs text-emerald-500">
            {formatKwhCompact(highestUsageEntities.peakBuilding?.kwh)} ·{' '}
            {formatCurrency(highestUsageEntities.peakBuilding?.cost)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase">Peak Demand Meter</span>
            <Cpu className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="mt-2 truncate text-base font-bold text-slate-900 dark:text-white">
            {highestUsageEntities.peakMeter?.meterCode || 'N/A'}
          </p>
          <p className="mt-1 truncate text-xs text-cyan-500">
            {highestUsageEntities.peakMeter?.name} (
            {formatKwhCompact(highestUsageEntities.peakMeter?.kwh)})
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase">Peak Hour of Day</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
            {highestUsageEntities.peakHourOfDay.label} UTC
          </p>
          <p className="mt-1 text-xs text-amber-500">
            Avg {formatKwhCompact(highestUsageEntities.peakHourOfDay.avgKwh)} per interval
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase">Carbon Footprint & Offset</span>
            <Leaf className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
            {formatCarbon(carbonMetrics.totalCarbonKg)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500">
            <TreePine className="h-3.5 w-3.5" />
            Equivalent to {carbonMetrics.treesEquivalent.toLocaleString()} mature trees/yr
          </p>
        </div>
      </div>

      {/* Automated Unusual Consumption & Statistical Anomalies Table */}
      <SectionCard
        title="Automated Energy Anomaly Detection (Z-Score Statistical Outliers)"
        subtitle="Readings exceeding 2.2σ above rolling meter baseline profile"
      >
        {unusualConsumptionEvents.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            No unusual consumption spikes detected in the selected time range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-2.5 font-semibold">Timestamp</th>
                  <th className="pb-2.5 font-semibold">Meter</th>
                  <th className="pb-2.5 font-semibold">Building</th>
                  <th className="pb-2.5 font-semibold">Department</th>
                  <th className="pb-2.5 font-semibold">Consumption</th>
                  <th className="pb-2.5 font-semibold">Est. Cost</th>
                  <th className="pb-2.5 font-semibold">Z-Score Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {unusualConsumptionEvents.map((ev) => (
                  <tr
                    key={ev.recordId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">
                      {formatDateTime(ev.timestamp)}
                    </td>
                    <td className="py-2.5">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {ev.meterCode}
                      </span>
                      <span className="ml-1.5 text-slate-400">{ev.meterName}</span>
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">
                      {ev.buildingName}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">
                      {ev.departmentName}
                    </td>
                    <td className="py-2.5 font-semibold text-rose-500">
                      {formatKwhCompact(ev.consumptionKwh)}
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">
                      {formatCurrency(ev.estimatedCost)}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge
                        status={`${ev.anomalyScore}σ Spike`}
                        variant={ev.anomalyScore >= 3.0 ? 'danger' : 'warning'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
