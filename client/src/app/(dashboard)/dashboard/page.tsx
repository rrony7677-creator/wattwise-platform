'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Bell,
  Building2,
  Cpu,
  DollarSign,
  Flame,
  Leaf,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  Building,
  DashboardOverviewData,
  Department,
  TimeSeriesPoint,
} from '@/types';
import {
  formatCarbon,
  formatCurrency,
  formatKwh,
  formatKwhCompact,
} from '@/lib/formatters';
import { useFilterState } from '@/hooks/useFilterState';
import { SIMULATION_TICK_EVENT } from '@/hooks/useRealtimeSim';
import {
  DateRangeToolbar,
  ErrorBanner,
  KpiStatCard,
  LoadingSkeleton,
  SectionCard,
  StatusBadge,
} from '@/components/ui';
import { DailyUsageChart } from '@/components/charts/DailyUsageChart';
import { HourlyUsageChart } from '@/components/charts/HourlyUsageChart';
import { BuildingComparisonChart } from '@/components/charts/BuildingComparisonChart';
import { DepartmentComparisonChart } from '@/components/charts/DepartmentComparisonChart';

export default function OrganizationDashboardPage() {
  const filters = useFilterState('30d');
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [granularity, setGranularity] = useState<'daily' | 'hourly'>('daily');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFilterEntities = useCallback(async () => {
    try {
      const [bRes, dRes] = await Promise.all([
        apiFetch<Building[]>('/buildings', { params: { limit: 100 } }),
        apiFetch<Department[]>('/departments', { params: { limit: 100 } }),
      ]);
      setBuildings(bRes.data || []);
      setDepartments(dRes.data || []);
    } catch {
      // Non-fatal filter dropdown fetch
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryParams = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        buildingId: filters.buildingId || undefined,
        departmentId: filters.departmentId || undefined,
      };

      const [ovRes, tsRes] = await Promise.all([
        apiFetch<DashboardOverviewData>('/dashboard/overview', { params: queryParams }),
        apiFetch<TimeSeriesPoint[]>('/analytics/time-series', {
          params: { ...queryParams, granularity },
        }),
      ]);

      setOverview(ovRes.data);
      setTimeSeries(tsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.startDate,
    filters.endDate,
    filters.buildingId,
    filters.departmentId,
    granularity,
  ]);

  useEffect(() => {
    void loadFilterEntities();
  }, [loadFilterEntities]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Refresh automatically whenever a real-time simulation tick fires
  useEffect(() => {
    const handler = () => {
      void loadDashboardData();
    };
    window.addEventListener(SIMULATION_TICK_EVENT, handler);
    return () => window.removeEventListener(SIMULATION_TICK_EVENT, handler);
  }, [loadDashboardData]);

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Energy Monitoring Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Real-time and historical electricity consumption, tariff cost analysis, period
            comparisons, and hierarchy breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/analytics"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            View Deep Analytics & Forecasts →
          </Link>
          <Link
            href="/reports"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
          >
            Export Reports (CSV / PDF)
          </Link>
        </div>
      </div>

      {/* Date Range & Building/Department Filter Toolbar */}
      <DateRangeToolbar
        preset={filters.preset}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onPresetChange={filters.applyPreset}
        onStartDateChange={filters.setStartDate}
        onEndDateChange={filters.setEndDate}
        extraFilters={
          <>
            <select
              value={filters.buildingId}
              onChange={(e) => {
                filters.setBuildingId(e.target.value);
                filters.setDepartmentId('');
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            <select
              value={filters.departmentId}
              onChange={(e) => filters.setDepartmentId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Departments</option>
              {departments
                .filter((d) => {
                  if (!filters.buildingId) return true;
                  const bId =
                    typeof d.buildingId === 'object' ? d.buildingId._id : d.buildingId;
                  return bId === filters.buildingId;
                })
                .map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadDashboardData} />}

      {isLoading || !overview ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          {/* Primary Section 3C KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiStatCard
              title="Total Consumption"
              value={formatKwh(overview.totalConsumptionKwh)}
              deltaPct={overview.previousPeriodComparison.consumptionDeltaPct}
              subtitle={`Prev: ${formatKwhCompact(
                overview.previousPeriodComparison.previousTotalKwh
              )}`}
              icon={<Zap className="h-5 w-5" />}
              accent="emerald"
            />

            <KpiStatCard
              title="Total Electricity Cost"
              value={formatCurrency(overview.totalCostUsd)}
              deltaPct={overview.previousPeriodComparison.costDeltaPct}
              subtitle={`Prev: ${formatCurrency(
                overview.previousPeriodComparison.previousTotalCostUsd
              )}`}
              icon={<DollarSign className="h-5 w-5" />}
              accent="amber"
            />

            <KpiStatCard
              title="Average Daily Usage"
              value={`${formatKwhCompact(overview.averageDailyUsageKwh)}/d`}
              subtitle={`Across ${overview.recordsCount.toLocaleString()} readings`}
              icon={<Activity className="h-5 w-5" />}
              accent="cyan"
            />

            <KpiStatCard
              title="Peak Consumption"
              value={formatKwhCompact(overview.peakConsumptionKwh)}
              subtitle="Highest interval draw"
              icon={<Flame className="h-5 w-5" />}
              accent="rose"
            />

            <KpiStatCard
              title="Lowest Consumption"
              value={formatKwhCompact(overview.lowestConsumptionKwh)}
              subtitle="Off-peak baseload floor"
              icon={<TrendingDown className="h-5 w-5" />}
              accent="indigo"
            />

            <KpiStatCard
              title="Carbon & Active Alerts"
              value={formatCarbon(overview.totalCarbonKg)}
              subtitle={`${overview.activeAlertsCount.new} New · ${overview.activeAlertsCount.critical} Critical Alerts`}
              icon={<Leaf className="h-5 w-5" />}
              accent="emerald"
            />
          </div>

          {/* Consumption Trend Chart */}
          <SectionCard
            title="Energy Consumption & Estimated Cost Time-Series"
            subtitle={`Comparing ${filters.startDate} to ${filters.endDate} (${granularity} intervals)`}
            action={
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setGranularity('daily')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    granularity === 'daily'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Daily View
                </button>
                <button
                  type="button"
                  onClick={() => setGranularity('hourly')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    granularity === 'hourly'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Hourly View
                </button>
              </div>
            }
          >
            {granularity === 'daily' ? (
              <DailyUsageChart data={timeSeries} />
            ) : (
              <HourlyUsageChart data={timeSeries} />
            )}
          </SectionCard>

          {/* Building-wise & Department-wise Consumption Breakdowns */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard
              title="Building-wise Energy Consumption"
              subtitle="Distribution of kWh and electricity cost across buildings"
              action={
                <Link
                  href="/buildings"
                  className="text-xs font-semibold text-emerald-500 hover:underline"
                >
                  Manage Buildings →
                </Link>
              }
            >
              <BuildingComparisonChart data={overview.buildingWiseConsumption} />
              <div className="mt-4 space-y-2.5">
                {overview.buildingWiseConsumption.map((b) => (
                  <div key={b.buildingId} className="text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-slate-800 dark:text-slate-200">
                        {b.name} <span className="text-slate-400">({b.code})</span>
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {formatKwhCompact(b.kwh)} · {formatCurrency(b.cost)} ({b.percentage}%)
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, b.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Department-wise Energy Consumption"
              subtitle="Top consuming operational departments & cost share"
              action={
                <Link
                  href="/departments"
                  className="text-xs font-semibold text-cyan-500 hover:underline"
                >
                  Manage Departments →
                </Link>
              }
            >
              <DepartmentComparisonChart data={overview.departmentWiseConsumption} />
              <div className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
                {overview.departmentWiseConsumption.slice(0, 8).map((d) => (
                  <div
                    key={d.departmentId}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-slate-800/80"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {d.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{d.buildingName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-500">{formatKwhCompact(d.kwh)}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatCurrency(d.cost)} ({d.percentage}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Meter-wise Consumption Table */}
          <SectionCard
            title="Meter-wise Energy Consumption & Health Telemetry"
            subtitle="Top electricity meters ranked by period consumption"
            action={
              <Link
                href="/meters"
                className="text-xs font-semibold text-emerald-500 hover:underline"
              >
                All Smart Meters →
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-2.5 font-semibold">Meter Code</th>
                    <th className="pb-2.5 font-semibold">Meter Name</th>
                    <th className="pb-2.5 font-semibold">Type</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                    <th className="pb-2.5 font-semibold">Health Score</th>
                    <th className="pb-2.5 font-semibold">Consumption</th>
                    <th className="pb-2.5 font-semibold">Estimated Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {overview.meterWiseConsumption.map((m) => (
                    <tr
                      key={m.meterId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                        {m.meterCode}
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">{m.name}</td>
                      <td className="py-2.5">
                        <StatusBadge status={m.meterType} variant="info" />
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`font-bold ${
                            m.healthScore >= 90
                              ? 'text-emerald-500'
                              : m.healthScore >= 80
                              ? 'text-amber-500'
                              : 'text-rose-500'
                          }`}
                        >
                          {m.healthScore}%
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                        {formatKwhCompact(m.kwh)}
                      </td>
                      <td className="py-2.5 font-semibold text-amber-500">
                        {formatCurrency(m.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
