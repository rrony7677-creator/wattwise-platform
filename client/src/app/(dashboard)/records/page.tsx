'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, Play, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterState } from '@/hooks/useFilterState';
import { SIMULATION_TICK_EVENT, useRealtimeSim } from '@/hooks/useRealtimeSim';
import { downloadClientCsv } from '@/lib/export-utils';
import {
  Building,
  Department,
  EnergyRecord,
  Meter,
  PaginationMeta,
} from '@/types';
import {
  formatCarbon,
  formatCurrency,
  formatDateTime,
  formatKwhCompact,
} from '@/lib/formatters';
import {
  DateRangeToolbar,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  Modal,
  PaginationBar,
  SearchInput,
  SectionCard,
  StatusBadge,
} from '@/components/ui';

export default function EnergyRecordsPage() {
  const { canCreateRecords } = useAuth();
  const filters = useFilterState('30d');
  const { triggerSingleTick, isTickPending } = useRealtimeSim();

  const [records, setRecords] = useState<EnergyRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    meterId: '',
    consumptionKwh: 48.5,
    peakDemandKw: 56.2,
    powerFactor: 0.94,
    timestamp: new Date().toISOString().slice(0, 16),
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Building[]>('/buildings', { params: { limit: 100 } }),
      apiFetch<Department[]>('/departments', { params: { limit: 200 } }),
      apiFetch<Meter[]>('/meters', { params: { limit: 200 } }),
    ])
      .then(([bRes, dRes, mRes]) => {
        setBuildings(bRes.data || []);
        setDepartments(dRes.data || []);
        setMeters(mRes.data || []);
      })
      .catch(() => {});
  }, []);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch<EnergyRecord[]>('/energy-records', {
        params: {
          page,
          limit: 25,
          startDate: filters.startDate,
          endDate: filters.endDate,
          buildingId: filters.buildingId || undefined,
          departmentId: filters.departmentId || undefined,
          meterId: filters.meterId || undefined,
          isAnomaly: anomalyOnly ? 'true' : undefined,
          q: debouncedSearch || undefined,
        },
      });
      setRecords(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load energy records.');
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    filters.startDate,
    filters.endDate,
    filters.buildingId,
    filters.departmentId,
    filters.meterId,
    anomalyOnly,
    debouncedSearch,
  ]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const handler = () => void loadRecords();
    window.addEventListener(SIMULATION_TICK_EVENT, handler);
    return () => window.removeEventListener(SIMULATION_TICK_EVENT, handler);
  }, [loadRecords]);

  const handleExportCurrentCsv = () => {
    const columns = [
      'Timestamp',
      'Meter Code',
      'Meter Name',
      'Building',
      'Department',
      'Consumption (kWh)',
      'Estimated Cost ($)',
      'Carbon (kg CO2e)',
      'Peak Demand (kW)',
      'Power Factor',
      'Anomaly',
      'Source',
    ];
    const rows = records.map((r) => {
      const m = typeof r.meterId === 'object' ? r.meterId : undefined;
      const b = typeof r.buildingId === 'object' ? r.buildingId : undefined;
      const d = typeof r.departmentId === 'object' ? r.departmentId : undefined;
      return {
        Timestamp: r.timestamp,
        'Meter Code': m?.meterCode || 'MTR',
        'Meter Name': m?.name || '',
        Building: b?.name || '',
        Department: d?.name || '',
        'Consumption (kWh)': r.consumptionKwh,
        'Estimated Cost ($)': r.estimatedCost,
        'Carbon (kg CO2e)': r.carbonKg,
        'Peak Demand (kW)': r.peakDemandKw,
        'Power Factor': r.powerFactor,
        Anomaly: r.isAnomaly ? `YES (${r.anomalyScore}s)` : 'NO',
        Source: r.source,
      };
    });
    downloadClientCsv(`wattwise-energy-records-${filters.startDate}.csv`, columns, rows);
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/energy-records', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          timestamp: new Date(form.timestamp).toISOString(),
        }),
      });
      setModalOpen(false);
      await loadRecords();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create energy record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Time-Series Energy Consumption Records
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Preserved historical meter readings with automated tariff cost calculation, carbon
            emissions, and statistical anomaly detection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCurrentCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          {canCreateRecords && (
            <>
              <button
                type="button"
                disabled={isTickPending}
                onClick={() => void triggerSingleTick()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                {isTickPending ? 'Simulating...' : 'Simulate Live Reading Batch'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm({
                    meterId: meters[0]?._id || '',
                    consumptionKwh: 52.4,
                    peakDemandKw: 61.0,
                    powerFactor: 0.94,
                    timestamp: new Date().toISOString().slice(0, 16),
                  });
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Add Energy Record
              </button>
            </>
          )}
        </div>
      </div>

      <DateRangeToolbar
        preset={filters.preset}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onPresetChange={(p) => {
          filters.applyPreset(p);
          setPage(1);
        }}
        onStartDateChange={(s) => {
          filters.setStartDate(s);
          setPage(1);
        }}
        onEndDateChange={(e) => {
          filters.setEndDate(e);
          setPage(1);
        }}
        extraFilters={
          <>
            <select
              value={filters.buildingId}
              onChange={(e) => {
                filters.setBuildingId(e.target.value);
                setPage(1);
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
              onChange={(e) => {
                filters.setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={filters.meterId}
              onChange={(e) => {
                filters.setMeterId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Smart Meters</option>
              {meters.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.meterCode} - {m.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      <SectionCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by meter code or name..."
            className="w-full sm:w-80"
          />

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={anomalyOnly}
              onChange={(e) => {
                setAnomalyOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Show Only Unusual / Anomaly Spikes</span>
          </label>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadRecords} />}

        {isLoading ? (
          <LoadingSkeleton rows={8} />
        ) : records.length === 0 ? (
          <EmptyState title="No energy records match your filters" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-2.5 font-semibold">Timestamp</th>
                    <th className="pb-2.5 font-semibold">Meter</th>
                    <th className="pb-2.5 font-semibold">Building & Floor</th>
                    <th className="pb-2.5 font-semibold">Department</th>
                    <th className="pb-2.5 font-semibold">Consumption</th>
                    <th className="pb-2.5 font-semibold">Est. Cost</th>
                    <th className="pb-2.5 font-semibold">Carbon (CO₂e)</th>
                    <th className="pb-2.5 font-semibold">Pattern Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {records.map((r) => {
                    const m = typeof r.meterId === 'object' ? r.meterId : undefined;
                    const b = typeof r.buildingId === 'object' ? r.buildingId : undefined;
                    const f = typeof r.floorId === 'object' ? r.floorId : undefined;
                    const d = typeof r.departmentId === 'object' ? r.departmentId : undefined;

                    return (
                      <tr
                        key={r._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">
                          {formatDateTime(r.timestamp)}
                        </td>
                        <td className="py-2.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {m?.meterCode || 'MTR'}
                          </span>
                          <p className="text-[11px] text-slate-400">{m?.name}</p>
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">
                          <p className="font-medium">{b?.name || 'Building'}</p>
                          <p className="text-[11px] text-slate-400">
                            Level {f?.floorNumber ?? 1}
                          </p>
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">
                          {d?.name || 'Department'}
                        </td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                          {formatKwhCompact(r.consumptionKwh)}
                        </td>
                        <td className="py-2.5 font-semibold text-amber-500">
                          {formatCurrency(r.estimatedCost)}
                        </td>
                        <td className="py-2.5 text-emerald-500">
                          {formatCarbon(r.carbonKg)}
                        </td>
                        <td className="py-2.5">
                          {r.isAnomaly ? (
                            <StatusBadge
                              status={`Anomaly (${r.anomalyScore}σ)`}
                              variant="danger"
                            />
                          ) : (
                            <StatusBadge status="Normal" variant="success" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationBar meta={meta} onPageChange={setPage} />
          </>
        )}
      </SectionCard>

      {/* Manual Energy Record Ingestion Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Energy Consumption Record"
        subtitle="Cost, Carbon emissions, statistical anomaly check, and threshold alerts are computed automatically."
      >
        <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Select Smart Meter *
            </label>
            <select
              required
              value={form.meterId}
              onChange={(e) => setForm({ ...form, meterId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Choose Electricity Meter --</option>
              {meters.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.meterCode} — {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Consumption Value (kWh) *
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                required
                value={form.consumptionKwh}
                onChange={(e) =>
                  setForm({ ...form, consumptionKwh: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Reading Timestamp *
              </label>
              <input
                type="datetime-local"
                required
                value={form.timestamp}
                onChange={(e) => setForm({ ...form, timestamp: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Peak Demand (kW)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={form.peakDemandKw}
                onChange={(e) => setForm({ ...form, peakDemandKw: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Power Factor (0.50–1.00)
              </label>
              <input
                type="number"
                step="0.01"
                min={0.5}
                max={1}
                value={form.powerFactor}
                onChange={(e) => setForm({ ...form, powerFactor: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? 'Ingesting Record...' : 'Save Energy Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
