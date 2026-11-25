'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Layers, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import { Building, Floor, PaginationMeta } from '@/types';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  Modal,
  PaginationBar,
  SearchInput,
  SectionCard,
} from '@/components/ui';

export default function FloorManagementPage() {
  const { canManageHierarchy } = useAuth();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [form, setForm] = useState({
    buildingId: '',
    floorNumber: 1,
    name: '',
    areaSqFt: 15000,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Building[]>('/buildings', { params: { limit: 100 } })
      .then((res) => setBuildings(res.data || []))
      .catch(() => {});
  }, []);

  const loadFloors = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch<Floor[]>('/floors', {
        params: {
          page,
          limit: 20,
          buildingId: buildingFilter || undefined,
          q: debouncedSearch || undefined,
        },
      });
      setFloors(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load floors.');
    } finally {
      setIsLoading(false);
    }
  }, [page, buildingFilter, debouncedSearch]);

  useEffect(() => {
    void loadFloors();
  }, [loadFloors]);

  const openCreateModal = () => {
    setEditingFloor(null);
    setForm({
      buildingId: buildingFilter || buildings[0]?._id || '',
      floorNumber: 1,
      name: 'Level 1 - Operations Zone',
      areaSqFt: 15000,
    });
    setModalOpen(true);
  };

  const openEditModal = (f: Floor) => {
    const bId = typeof f.buildingId === 'object' ? f.buildingId._id : f.buildingId;
    setEditingFloor(f);
    setForm({
      buildingId: bId,
      floorNumber: f.floorNumber,
      name: f.name,
      areaSqFt: f.areaSqFt,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingFloor) {
        await apiFetch(`/floors/${editingFloor._id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            floorNumber: form.floorNumber,
            name: form.name,
            areaSqFt: form.areaSqFt,
          }),
        });
      } else {
        await apiFetch('/floors', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await loadFloors();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save floor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (f: Floor) => {
    if (!window.confirm(`Delete floor "${f.name}"?`)) return;
    try {
      await apiFetch(`/floors/${f._id}`, { method: 'DELETE' });
      await loadFloors();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cannot delete floor.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Floor Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Organize building levels, square footage allocations, and department/meter assignments.
          </p>
        </div>

        {canManageHierarchy && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Add Floor
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
            placeholder="Search floors by name..."
            className="w-full sm:w-72"
          />

          <select
            value={buildingFilter}
            onChange={(e) => {
              setBuildingFilter(e.target.value);
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
        </div>

        {error && <ErrorBanner message={error} onRetry={loadFloors} />}

        {isLoading ? (
          <LoadingSkeleton rows={6} />
        ) : floors.length === 0 ? (
          <EmptyState title="No floors found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-2.5 font-semibold">Building</th>
                    <th className="pb-2.5 font-semibold">Floor #</th>
                    <th className="pb-2.5 font-semibold">Floor Name</th>
                    <th className="pb-2.5 font-semibold">Area (sq.ft)</th>
                    <th className="pb-2.5 font-semibold">Departments</th>
                    <th className="pb-2.5 font-semibold">Smart Meters</th>
                    {canManageHierarchy && (
                      <th className="pb-2.5 text-right font-semibold">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {floors.map((f) => {
                    const bObj =
                      typeof f.buildingId === 'object' ? f.buildingId : undefined;
                    return (
                      <tr
                        key={f._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {bObj?.name || 'Building'}{' '}
                          {bObj?.code && (
                            <span className="text-slate-400">({bObj.code})</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 font-bold text-cyan-500">
                            <Layers className="h-3 w-3" />L{f.floorNumber}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-slate-900 dark:text-white">
                          {f.name}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {f.areaSqFt.toLocaleString()} sq.ft
                        </td>
                        <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                          {f.departmentCount ?? 0}
                        </td>
                        <td className="py-3 font-semibold text-emerald-500">
                          {f.meterCount ?? 0}
                        </td>
                        {canManageHierarchy && (
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(f)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(f)}
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
        title={editingFloor ? 'Edit Floor' : 'Add Building Floor'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {!editingFloor && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Select Building *
              </label>
              <select
                required
                value={form.buildingId}
                onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Choose Building --</option>
                {buildings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Floor Number *
              </label>
              <input
                type="number"
                required
                value={form.floorNumber}
                onChange={(e) => setForm({ ...form, floorNumber: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Area (sq.ft) *
              </label>
              <input
                type="number"
                min={50}
                required
                value={form.areaSqFt}
                onChange={(e) => setForm({ ...form, areaSqFt: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Floor Label / Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Level 2 - Precision Assembly"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
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
              {submitting ? 'Saving...' : editingFloor ? 'Update Floor' : 'Create Floor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
