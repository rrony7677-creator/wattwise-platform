'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Network, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import { Building, Department, Floor, PaginationMeta } from '@/types';
import { formatCurrency, formatKwhCompact } from '@/lib/formatters';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  Modal,
  PaginationBar,
  SearchInput,
  SectionCard,
} from '@/components/ui';

export default function DepartmentManagementPage() {
  const { canManageHierarchy } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState({
    buildingId: '',
    floorId: '',
    name: '',
    code: '',
    managerName: '',
    monthlyBudgetUsd: 3500,
    headcount: 25,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Building[]>('/buildings', { params: { limit: 100 } }),
      apiFetch<Floor[]>('/floors', { params: { limit: 200 } }),
    ])
      .then(([bRes, fRes]) => {
        setBuildings(bRes.data || []);
        setFloors(fRes.data || []);
      })
      .catch(() => {});
  }, []);

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch<Department[]>('/departments', {
        params: {
          page,
          limit: 20,
          buildingId: buildingFilter || undefined,
          floorId: floorFilter || undefined,
          q: debouncedSearch || undefined,
        },
      });
      setDepartments(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments.');
    } finally {
      setIsLoading(false);
    }
  }, [page, buildingFilter, floorFilter, debouncedSearch]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  const openCreateModal = () => {
    setEditingDept(null);
    const defaultBldg = buildingFilter || buildings[0]?._id || '';
    const matchingFloor = floors.find((f) => {
      const bId = typeof f.buildingId === 'object' ? f.buildingId._id : f.buildingId;
      return bId === defaultBldg;
    });
    setForm({
      buildingId: defaultBldg,
      floorId: matchingFloor?._id || '',
      name: '',
      code: '',
      managerName: '',
      monthlyBudgetUsd: 3500,
      headcount: 25,
    });
    setModalOpen(true);
  };

  const openEditModal = (d: Department) => {
    const bId = typeof d.buildingId === 'object' ? d.buildingId._id : d.buildingId;
    const fId = typeof d.floorId === 'object' ? d.floorId._id : d.floorId;
    setEditingDept(d);
    setForm({
      buildingId: bId,
      floorId: fId,
      name: d.name,
      code: d.code,
      managerName: d.managerName || '',
      monthlyBudgetUsd: d.monthlyBudgetUsd,
      headcount: d.headcount,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDept) {
        await apiFetch(`/departments/${editingDept._id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/departments', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await loadDepartments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (d: Department) => {
    if (!window.confirm(`Delete department "${d.name}"?`)) return;
    try {
      await apiFetch(`/departments/${d._id}`, { method: 'DELETE' });
      await loadDepartments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cannot delete department.');
    }
  };

  const formAvailableFloors = floors.filter((f) => {
    const bId = typeof f.buildingId === 'object' ? f.buildingId._id : f.buildingId;
    return bId === form.buildingId;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Department Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Track departmental energy consumption, monthly electricity budgets, headcount, and assigned meters.
          </p>
        </div>

        {canManageHierarchy && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </button>
        )}
      </div>

      <SectionCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search departments by name, code, or manager..."
            className="w-full sm:w-80"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={buildingFilter}
              onChange={(e) => {
                setBuildingFilter(e.target.value);
                setFloorFilter('');
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            <select
              value={floorFilter}
              onChange={(e) => {
                setFloorFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Floors</option>
              {floors
                .filter((f) => {
                  if (!buildingFilter) return true;
                  const bId = typeof f.buildingId === 'object' ? f.buildingId._id : f.buildingId;
                  return bId === buildingFilter;
                })
                .map((f) => (
                  <option key={f._id} value={f._id}>
                    L{f.floorNumber} - {f.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadDepartments} />}

        {isLoading ? (
          <LoadingSkeleton rows={6} />
        ) : departments.length === 0 ? (
          <EmptyState title="No departments found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-2.5 font-semibold">Code</th>
                    <th className="pb-2.5 font-semibold">Department Name</th>
                    <th className="pb-2.5 font-semibold">Building & Floor</th>
                    <th className="pb-2.5 font-semibold">Headcount</th>
                    <th className="pb-2.5 font-semibold">Meters</th>
                    <th className="pb-2.5 font-semibold">30d Usage</th>
                    <th className="pb-2.5 font-semibold">30d Cost vs Budget</th>
                    {canManageHierarchy && (
                      <th className="pb-2.5 text-right font-semibold">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {departments.map((d) => {
                    const bObj = typeof d.buildingId === 'object' ? d.buildingId : undefined;
                    const fObj = typeof d.floorId === 'object' ? d.floorId : undefined;
                    const cost = d.totalCostUsd ?? 0;
                    const budgetPct =
                      d.monthlyBudgetUsd > 0
                        ? Math.min(100, Math.round((cost / d.monthlyBudgetUsd) * 100))
                        : 0;

                    return (
                      <tr
                        key={d._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 font-mono font-bold text-emerald-500">
                          {d.code}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                            <Network className="h-3.5 w-3.5 text-cyan-500" />
                            {d.name}
                          </div>
                          {d.managerName && (
                            <p className="text-[11px] text-slate-400">Lead: {d.managerName}</p>
                          )}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          <p className="font-medium">{bObj?.name || 'Building'}</p>
                          <p className="text-[11px] text-slate-400">
                            Level {fObj?.floorNumber ?? 1}
                          </p>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {d.headcount} staff
                        </td>
                        <td className="py-3 font-semibold text-cyan-500">
                          {d.meterCount ?? 0}
                        </td>
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          {formatKwhCompact(d.totalConsumptionKwh)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-amber-500">
                              {formatCurrency(cost)}
                            </span>
                            <span className="text-slate-400">
                              / {formatCurrency(d.monthlyBudgetUsd)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                budgetPct > 90
                                  ? 'bg-rose-500'
                                  : budgetPct > 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${budgetPct}%` }}
                            />
                          </div>
                        </td>
                        {canManageHierarchy && (
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(d)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(d)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Create Department'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Building *
              </label>
              <select
                required
                value={form.buildingId}
                onChange={(e) => {
                  const nextBldg = e.target.value;
                  const firstFl = floors.find((f) => {
                    const bId =
                      typeof f.buildingId === 'object' ? f.buildingId._id : f.buildingId;
                    return bId === nextBldg;
                  });
                  setForm({
                    ...form,
                    buildingId: nextBldg,
                    floorId: firstFl?._id || '',
                  });
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Select Building --</option>
                {buildings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
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
                onChange={(e) => setForm({ ...form, floorId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Select Floor --</option>
                {formAvailableFloors.map((f) => (
                  <option key={f._id} value={f._id}>
                    Level {f.floorNumber} - {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Department Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Robotics & Automation Lab"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Department Code *
              </label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="DEPT-ROB-01"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Department Manager Name
              </label>
              <input
                type="text"
                value={form.managerName}
                onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                placeholder="David Chen"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Monthly Energy Budget ($)
              </label>
              <input
                type="number"
                min={0}
                required
                value={form.monthlyBudgetUsd}
                onChange={(e) =>
                  setForm({ ...form, monthlyBudgetUsd: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Staff Headcount
              </label>
              <input
                type="number"
                min={1}
                required
                value={form.headcount}
                onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) })}
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
              {submitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
