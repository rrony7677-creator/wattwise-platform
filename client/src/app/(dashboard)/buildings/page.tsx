'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Edit3, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import { Building, BuildingType, PaginationMeta } from '@/types';
import { formatCurrency, formatKwhCompact } from '@/lib/formatters';
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

export default function BuildingManagementPage() {
  const { canManageHierarchy } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    buildingType: 'Office' as BuildingType,
    totalFloors: 3,
    areaSqFt: 45000,
    baselineDailyKwh: 1200,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadBuildings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch<Building[]>('/buildings', {
        params: {
          page,
          limit: 12,
          q: debouncedSearch || undefined,
          buildingType: typeFilter || undefined,
        },
      });
      setBuildings(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buildings.');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, typeFilter]);

  useEffect(() => {
    void loadBuildings();
  }, [loadBuildings]);

  const openCreateModal = () => {
    setEditingBuilding(null);
    setForm({
      name: '',
      code: '',
      address: '',
      buildingType: 'Office',
      totalFloors: 3,
      areaSqFt: 45000,
      baselineDailyKwh: 1200,
    });
    setModalOpen(true);
  };

  const openEditModal = (b: Building) => {
    setEditingBuilding(b);
    setForm({
      name: b.name,
      code: b.code,
      address: b.address,
      buildingType: b.buildingType,
      totalFloors: b.totalFloors,
      areaSqFt: b.areaSqFt,
      baselineDailyKwh: b.baselineDailyKwh,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingBuilding) {
        await apiFetch(`/buildings/${editingBuilding._id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/buildings', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await loadBuildings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save building');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (b: Building) => {
    if (!window.confirm(`Deactivate building "${b.name}"?`)) return;
    try {
      await apiFetch(`/buildings/${b._id}`, { method: 'DELETE' });
      await loadBuildings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate building');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Building Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Manage organization facilities, physical footprint, floor hierarchies, and 30-day
            consumption performance.
          </p>
        </div>

        {canManageHierarchy && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Add Building
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
            placeholder="Search buildings by name, code, or address..."
            className="w-full sm:w-80"
          />

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">All Building Types</option>
            <option value="Office">Office</option>
            <option value="Factory">Factory</option>
            <option value="Academic">Academic</option>
            <option value="DataCenter">Data Center</option>
            <option value="Warehouse">Warehouse</option>
          </select>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadBuildings} />}

        {isLoading ? (
          <LoadingSkeleton rows={5} />
        ) : buildings.length === 0 ? (
          <EmptyState
            title="No buildings found"
            description="Create a building or clear your search filter."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {buildings.map((b) => (
                <div
                  key={b._id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-emerald-500/40 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-500">
                        {b.code}
                      </span>
                      <StatusBadge status={b.buildingType} variant="info" />
                    </div>

                    <h3 className="mt-2.5 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <Building2 className="h-4 w-4 text-emerald-500" />
                      {b.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {b.address}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-center text-xs dark:border-slate-700/70 dark:bg-slate-900/70">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Floors</p>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          {b.floorCount ?? b.totalFloors}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Depts</p>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          {b.departmentCount ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Meters</p>
                        <p className="font-bold text-cyan-500">{b.meterCount ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs dark:border-slate-800">
                    <div>
                      <span className="text-[11px] text-slate-400">30d Usage: </span>
                      <span className="font-bold text-emerald-500">
                        {formatKwhCompact(b.totalConsumptionKwh)}
                      </span>
                      <span className="ml-1.5 text-slate-400">
                        ({formatCurrency(b.totalCostUsd)})
                      </span>
                    </div>

                    {canManageHierarchy && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          title="Edit Building"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeactivate(b)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-500"
                          title="Deactivate Building"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <PaginationBar meta={meta} onPageChange={setPage} />
          </>
        )}
      </SectionCard>

      {/* Create / Edit Building Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBuilding ? 'Edit Building' : 'Register New Building'}
        subtitle="Configure facility details, floor count, and daily baseline consumption."
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Building Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="North Innovation Tower"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Building Code *
              </label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="BLD-NIT-01"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Street Address *
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="4500 Industrial Parkway"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Facility Type
              </label>
              <select
                value={form.buildingType}
                onChange={(e) =>
                  setForm({ ...form, buildingType: e.target.value as BuildingType })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="Office">Office</option>
                <option value="Factory">Factory</option>
                <option value="Academic">Academic</option>
                <option value="DataCenter">Data Center</option>
                <option value="Warehouse">Warehouse</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Total Floors
              </label>
              <input
                type="number"
                min={1}
                required
                value={form.totalFloors}
                onChange={(e) => setForm({ ...form, totalFloors: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Total Area (sq.ft)
              </label>
              <input
                type="number"
                min={100}
                required
                value={form.areaSqFt}
                onChange={(e) => setForm({ ...form, areaSqFt: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Baseline Daily Usage (kWh)
              </label>
              <input
                type="number"
                min={0}
                required
                value={form.baselineDailyKwh}
                onChange={(e) =>
                  setForm({ ...form, baselineDailyKwh: Number(e.target.value) })
                }
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
              {submitting ? 'Saving...' : editingBuilding ? 'Update Building' : 'Create Building'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
