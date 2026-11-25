'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFilterState } from '@/hooks/useFilterState';
import { SIMULATION_TICK_EVENT } from '@/hooks/useRealtimeSim';
import {
  Building,
  Department,
  InsightsData,
  TimeSeriesPoint,
} from '@/types';
import {
  DateRangeToolbar,
  ErrorBanner,
  LoadingSkeleton,
  SectionCard,
} from '@/components/ui';
import { HourlyUsageChart } from '@/components/charts/HourlyUsageChart';
import { DailyUsageChart } from '@/components/charts/DailyUsageChart';
import { MonthlyUsageChart } from '@/components/charts/MonthlyUsageChart';
import {
  BuildingChartPoint,
  BuildingComparisonChart,
} from '@/components/charts/BuildingComparisonChart';
import {
  DepartmentChartPoint,
  DepartmentComparisonChart,
} from '@/components/charts/DepartmentComparisonChart';
import { CostCarbonTrendChart } from '@/components/charts/CostCarbonTrendChart';
import { ForecastAnomalyChart } from '@/components/charts/ForecastAnomalyChart';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { RecommendationsList } from '@/components/insights/RecommendationsList';

interface ComparisonResponse {
  buildingComparison: BuildingChartPoint[];
  departmentComparison: DepartmentChartPoint[];
  hourOfDayProfile: Array<{
    hour: number;
    label: string;
    avgKwh: number;
    totalKwh: number;
    totalCost: number;
    isPeakTariff: boolean;
  }>;
}

export default function EnergyAnalyticsPage() {
  const filters = useFilterState('30d');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [hourlySeries, setHourlySeries] = useState<TimeSeriesPoint[]>([]);
  const [dailySeries, setDailySeries] = useState<TimeSeriesPoint[]>([]);
  const [monthlySeries, setMonthlySeries] = useState<TimeSeriesPoint[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonResponse | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<Building[]>('/buildings', { params: { limit: 100 } }),
      apiFetch<Department[]>('/departments', { params: { limit: 200 } }),
    ])
      .then(([bRes, dRes]) => {
        setBuildings(bRes.data || []);
        setDepartments(dRes.data || []);
      })
      .catch(() => {});
  }, []);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const common = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        buildingId: filters.buildingId || undefined,
        departmentId: filters.departmentId || undefined,
      };

      const [hRes, dRes, mRes, compRes, insRes] = await Promise.all([
        apiFetch<TimeSeriesPoint[]>('/analytics/time-series', {
          params: { ...common, granularity: 'hourly' },
        }),
        apiFetch<TimeSeriesPoint[]>('/analytics/time-series', {
          params: { ...common, granularity: 'daily' },
        }),
        apiFetch<TimeSeriesPoint[]>('/analytics/time-series', {
          params: { ...common, granularity: 'weekly' },
        }),
        apiFetch<ComparisonResponse>('/analytics/comparisons', { params: common }),
        apiFetch<InsightsData>('/analytics/insights', { params: common }),
      ]);

      setHourlySeries((hRes.data || []).slice(-48));
      setDailySeries(dRes.data || []);
      setMonthlySeries(mRes.data || []);
      setComparisons(compRes.data);
      setInsights(insRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load energy analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [filters.startDate, filters.endDate, filters.buildingId, filters.departmentId]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const handler = () => void loadAnalytics();
    window.addEventListener(SIMULATION_TICK_EVENT, handler);
    return () => window.removeEventListener(SIMULATION_TICK_EVENT, handler);
  }, [loadAnalytics]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Energy Analytics, Forecasting & Intelligence
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Multi-granularity Recharts visualizations, building & department benchmarking, 7-day
          consumption forecasting, carbon estimation, and automated energy-saving recommendations.
        </p>
      </div>

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
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={filters.departmentId}
              onChange={(e) => filters.setDepartmentId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadAnalytics} />}

      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <>
          {/* Bonus Challenge: Automated Energy Saving Recommendations */}
          {insights && (
            <SectionCard
              title="Automated Energy Saving Recommendations"
              subtitle={`Quantified optimization opportunities — Potential monthly savings: ${insights.carbonMetrics.totalPotentialSavingsKwh.toLocaleString()} kWh ($${insights.carbonMetrics.totalPotentialSavingsUsd.toLocaleString()})`}
            >
              <RecommendationsList
                recommendations={insights.energySavingRecommendations}
              />
            </SectionCard>
          )}

          {/* Bonus Challenge: Energy Consumption Forecasting */}
          {insights && (
            <SectionCard
              title="Energy Consumption Forecasting (Next 7 Days Projection)"
              subtitle="Linear trend regression + day-of-week seasonality model with 95% confidence bounds"
            >
              <ForecastAnomalyChart data={insights.forecast} />
            </SectionCard>
          )}

          {/* Required Section 3E Charts: Hourly, Daily, Monthly/Weekly, Cost & Trend */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard
              title="Daily Usage & Cost Analysis Chart"
              subtitle="Daily electricity consumption (kWh) vs tariff cost ($)"
            >
              <DailyUsageChart data={dailySeries} />
            </SectionCard>

            <SectionCard
              title="Hourly Usage Profile Chart"
              subtitle="Granular hourly electricity demand intervals"
            >
              <HourlyUsageChart data={hourlySeries} />
            </SectionCard>

            <SectionCard
              title="Weekly / Monthly Usage & Carbon Chart"
              subtitle="Aggregated consumption (kWh) and carbon emissions (kg CO2e)"
            >
              <MonthlyUsageChart data={monthlySeries} />
            </SectionCard>

            <SectionCard
              title="Cost Analysis & Carbon Emission Trend"
              subtitle="Dual-axis tariff expenditure ($) and carbon footprint trajectory"
            >
              <CostCarbonTrendChart data={dailySeries} />
            </SectionCard>

            <SectionCard
              title="Building Comparison Chart"
              subtitle="Cross-facility consumption (kWh) and cost ($) benchmark"
            >
              <BuildingComparisonChart
                data={comparisons?.buildingComparison || []}
              />
            </SectionCard>

            <SectionCard
              title="Department Comparison Chart"
              subtitle="Departmental energy usage ranking across the organization"
            >
              <DepartmentComparisonChart
                data={comparisons?.departmentComparison || []}
              />
            </SectionCard>
          </div>

          {/* Section 3F Energy Insights & Unusual Consumption Detection */}
          {insights && <InsightsPanel insights={insights} />}
        </>
      )}
    </div>
  );
}
