'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Cpu, Edit3, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import { SIMULATION_TICK_EVENT } from '@/hooks/useRealtimeSim';
import {
  Building,
  Department,
  Floor,
  Meter,
  MeterStatus,
  MeterType,
  PaginationMeta,
} from '@/types';
import { formatDateTime, formatKwhCompact } from '@/lib/formatters';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  Modal,
  PaginationBar,
  SearchInput,
  SectionCard,
  StatusBadge,
} from '@/components/ui';
import {
  MeterHealthGrid,
  MeterHealthSummaryData,
} from '@/components/insights/MeterHealthGrid';

export default function MeterManagementPage() {
  const { canConfigureMeters } = useAuth();
  const [meters, setMeters] = useState<Meter[]>([]);
  const [healthSummary, setHealthSummary] = useState<MeterHealthSummaryData | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);

  const [buildingFilter, setBuildingFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<Meter | null>(null);
  const [form, setForm] = useState({
    buildingId: '',
    floorId: '',
    departmentId: '',
    meterCode: '',
    name: '',
    meterType: 'Submeter' as MeterType,
    status: 'active' as MeterStatus,
    healthScore: 98,
    firmwareVersion: 'v4.2.1',
    maxCapacityKw: 100,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Building[]>('/buildings', { params: { limit: 100 } }),
      apiFetch<Floor[]>('/floors', { params: { limit: 200 } }),
      apiFetch<Department[]>('/departments', { params: { limit: 200 } }),
    ])
      .then(([bRes, fRes, dRes]) => {
        setBuildings(bRes.data || []);
        setFloors(fRes.data || []);
        setDepartments(dRes.data || []);
      })
      .catch(() => {});
  }, []);

  const loadMetersAndHealth = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [mRes, hRes] = await Promise.all([
        apiFetch<Meter[]>('/meters', {
          params: {
            page,
            limit: 20,
            buildingId: buildingFilter || undefined,
            departmentId: departmentFilter || undefined,
            status: statusFilter || undefined,
            meterType: typeFilter || undefined,
            q: debouncedSearch || undefined,
          },
        }),
        apiFetch<MeterHealthSummaryData>('/meters/health-summary'),
      ]);
      setMeters(mRes.data || []);
      setMeta(mRes.meta);
      setHealthSummary(hRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load electricity meters.');
    } finally {
      setIsLoading(false);
    }
  }, [page, buildingFilter, departmentFilter, statusFilter, typeFilter, debouncedSearch]);

  useEffect(() => {
    void loadMetersAndHealth();
  }, [loadMetersAndHealth]);

  useEffect(() => {
    const handler = () => void loadMetersAndHealth();
    window.addEventListener(SIMULATION_TICK_EVENT, handler);
    return () => window.removeEventListener(SIMULATION_TICK_EVENT, handler);
  }, [loadMetersAndHealth]);

  const openCreateModal = () => {
    setEditingMeter(null);
    const defaultBldg = buildingFilter || buildings[0]?._id || '';
    const firstFl = floors.find((f) => {
      const bId = typeof f.buildingId === 'object' ? f.buildingId._id : f.buildingId;
      return bId === defaultBldg;
    });
    const firstDept = departments.find((d) => {
      const fId = typeof d.floorId === 'object' ? d.floorId._id : d.floorId;
      return fId === firstFl?._id;
    });

    setForm({
      buildingId: defaultBldg,
      floorId: firstFl?._id || '',
      departmentId: firstDept?._id || '',
      meterCode: `MTR-NEW-${Math.floor(100 + Math.random() * 899)}`,
      name: '',
      meterType: 'Submeter',
      status: 'active',
      healthScore: 98,
      firmwareVersion: 'v4.2.1',
      maxCapacityKw: 100,
    });
    setModalOpen(true);
  };

  const openEditModal = (m: Meter) => {
    const bId = typeof m.buildingId === 'object' ? m.buildingId._id : m.buildingId;
    const fId = typeof m.floorId === 'object' ? m.floorId._id : m.floorId;
    const dId = typeof m.departmentId === 'object' ? m.departmentId._id : m.departmentId;

    setEditingMeter(m);
    setForm({
      buildingId: bId,
      floorId: fId,
      departmentId: dId,
      meterCode: m.meterCode,
      name: m.name,
      meterType: m.meterType,
      status: m.status,
      healthScore: m.healthScore,
      firmwareVersion: m.firmwareVersion,
      maxCapacityKw: m.maxCapacityKw,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMeter) {
        await apiFetch(`/meters/${editingMeter._id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/meters', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await loadMetersAndHealth();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save meter.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableFloors = floors.filter((f) => {
    const bId = typeof f.buildingId === 'object' ? f.buildingId._id : f.buildingId;
    return bId === form.buildingId;
  });

  const availableDepts = departments.filter((d) => {
    const fId = typeof d.floorId === 'object' ? d.floorId._id : d.floorId;
    return fId === form.floorId;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Electricity Meter Management & Health Monitoring
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Register smart sub-meters, monitor telemetry health scores, firmware diagnostics, and
            30-day consumption totals.
          </p>
        </div>

        {canConfigureMeters && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Register Electricity Meter
          </button>
        )}
      </div>

      {/* Bonus Challenge: Meter Health Monitoring Overview */}
      <MeterHealthGrid summary={healthSummary} />

      <SectionCard
        title="Smart Electricity Meter Inventory"
        subtitle="Filter by building, department, operational status, or meter class"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by meter code, name, or firmware..."
            className="w-full sm:w-80"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={buildingFilter}
              onChange={(e) => {
                setBuildingFilter(e.target.value);
                setDepartmentFilter('');
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Types</option>
              <option value="Main">Main Feeder</option>
              <option value="Submeter">Submeter</option>
              <option value="HVAC">HVAC</option>
              <option value="Lighting">Lighting</option>
              <option value="Machinery">Machinery</option>
              <option value="ServerRack">Server Rack</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="warning">Warning</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadMetersAndHealth} />}

        {isLoading ? (
          <LoadingSkeleton rows={6} />
        ) : meters.length === 0 ? (
          <EmptyState title="No electricity meters found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-2.5 font-semibold">Meter Code</th>
                    <th className="pb-2.5 font-semibold">Name & Type</th>
                    <th className="pb-2.5 font-semibold">Location Hierarchy</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                    <th className="pb-2.5 font-semibold">Health Score</th>
                    <th className="pb-2.5 font-semibold">30d Usage</th>
                    <th className="pb-2.5 font-semibold">Last Telemetry</th>
                    {canConfigureMeters && (
                      <th className="pb-2.5 text-right font-semibold">Configure</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {meters.map((m) => {
                    const bObj = typeof m.buildingId === 'object' ? m.buildingId : undefined;
                    const fObj = typeof m.floorId === 'object' ? m.floorId : undefined;
                    const dObj =
                      typeof m.departmentId === 'object' ? m.departmentId : undefined;

                    return (
                      <tr
                        key={m._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <Cpu className="h-3.5 w-3.5 text-emerald-500" />
                            {m.meterCode}
                          </div>
                          <span className="text-[10px] font-normal text-slate-400">
                            FW {m.firmwareVersion} · Max {m.maxCapacityKw} kW
                          </span>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {m.name}
                          </p>
                          <div className="mt-0.5">
                            <StatusBadge status={m.meterType} variant="info" />
                          </div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          <p className="font-medium">{bObj?.name || 'Building'}</p>
                          <p className="text-[11px] text-slate-400">
                            L{fObj?.floorNumber ?? 1} · {dObj?.name || 'Department'}
                          </p>
                        </td>
                        <td className="py-3">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
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
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full ${
                                  m.healthScore >= 90
                                    ? 'bg-emerald-500'
                                    : m.healthScore >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${m.healthScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          {formatKwhCompact(m.recentConsumptionKwh)}
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">
                          {formatDateTime(m.lastReadingAt)}
                        </td>
                        {canConfigureMeters && (
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openEditModal(m)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                              title="Configure Meter"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
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

      {/* Register / Update Meter Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMeter ? `Configure Meter ${editingMeter.meterCode}` : 'Register Electricity Meter'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!editingMeter && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Building *
                  </label>
                  <select
                    required
                    value={form.buildingId}
                    onChange={(e) => {
                      const nextB = e.target.value;
                      const fl = floors.find((f) => {
                        const bId =
                          typeof f.buildingId === 'object' ? f.buildingId._id : f.buildingId;
                        return bId === nextB;
                      });
                      const dp = departments.find((d) => {
                        const fId =
                          typeof d.floorId === 'object' ? d.floorId._id : d.floorId;
                        return fId === fl?._id;
                      });
                      setForm({
                        ...form,
                        buildingId: nextB,
                        floorId: fl?._id || '',
                        departmentId: dp?._id || '',
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Choose Building --</option>
                    {buildings.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Floor *
                  </label>
                  <select
                    required
                    value={form.floorId}
                    onChange={(e) => {
                      const nextF = e.target.value;
                      const dp = departments.find((d) => {
                        const fId =
                          typeof d.floorId === 'object' ? d.floorId._id : d.floorId;
                        return fId === nextF;
                      });
                      setForm({
                        ...form,
                        floorId: nextF,
                        departmentId: dp?._id || '',
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Choose Floor --</option>
                    {availableFloors.map((f) => (
                      <option key={f._id} value={f._id}>
                        Level {f.floorNumber} - {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Department *
                  </label>
                  <select
                    required
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Choose Department --</option>
                    {availableDepts.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Meter Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.meterCode}
                    onChange={(e) =>
                      setForm({ ...form, meterCode: e.target.value.toUpperCase() })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </>
            )}

            <div className={editingMeter ? 'sm:col-span-2' : ''}>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Meter Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="HVAC Main Chiller Feeder"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Meter Type
              </label>
              <select
                value={form.meterType}
                onChange={(e) =>
                  setForm({ ...form, meterType: e.target.value as MeterType })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="Main">Main Feeder</option>
                <option value="Submeter">Submeter</option>
                <option value="HVAC">HVAC</option>
                <option value="Lighting">Lighting</option>
                <option value="Machinery">Machinery</option>
                <option value="ServerRack">Server Rack</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Operational Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as MeterStatus })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Health Score (0–100%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={form.healthScore}
                onChange={(e) => setForm({ ...form, healthScore: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Max Capacity (kW)
              </label>
              <input
                type="number"
                min={1}
                required
                value={form.maxCapacityKw}
                onChange={(e) => setForm({ ...form, maxCapacityKw: Number(e.target.value) })}
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
              {submitting ? 'Saving...' : editingMeter ? 'Update Meter' : 'Register Meter'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
