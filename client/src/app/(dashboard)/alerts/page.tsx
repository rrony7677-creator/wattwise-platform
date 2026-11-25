'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Sliders,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { SIMULATION_TICK_EVENT } from '@/hooks/useRealtimeSim';
import {
  AlertItem,
  AlertStatus,
  Building,
  Department,
  Meter,
  PaginationMeta,
  Threshold,
} from '@/types';
import { formatDateTime } from '@/lib/formatters';
import {
  EmptyState,
  ErrorBanner,
  KpiStatCard,
  LoadingSkeleton,
  Modal,
  PaginationBar,
  SectionCard,
  StatusBadge,
} from '@/components/ui';

export default function AlertManagementPage() {
  const { canManageAlerts } = useAuth();
  const [activeTab, setActiveTab] = useState<'alerts' | 'thresholds'>('alerts');

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [meta, setMeta] = useState<
    (PaginationMeta & { New?: number; Acknowledged?: number; Resolved?: number }) | undefined
  >(undefined);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [buildingFilter, setBuildingFilter] = useState<string>('');

  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Threshold Creation Modal
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({
    name: '',
    scopeType: 'building' as 'building' | 'department' | 'meter',
    buildingId: '',
    departmentId: '',
    meterId: '',
    metric: 'consumption_kwh' as 'consumption_kwh' | 'cost_usd' | 'unusual_spike_pct',
    period: 'hourly' as 'hourly' | 'daily' | 'monthly',
    warningLimit: 65,
    criticalLimit: 90,
  });

  // Alert Resolution Modal
  const [resolveModalAlert, setResolveModalAlert] = useState<AlertItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
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

  const loadAlertsAndThresholds = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [aRes, tRes] = await Promise.all([
        apiFetch<AlertItem[]>('/alerts', {
          params: {
            page,
            limit: 20,
            status: statusFilter || undefined,
            severity: severityFilter || undefined,
            buildingId: buildingFilter || undefined,
          },
        }),
        apiFetch<Threshold[]>('/alerts/thresholds'),
      ]);
      setAlerts(aRes.data || []);
      setMeta(aRes.meta as typeof meta);
      setThresholds(tRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, severityFilter, buildingFilter]);

  useEffect(() => {
    void loadAlertsAndThresholds();
  }, [loadAlertsAndThresholds]);

  useEffect(() => {
    const handler = () => void loadAlertsAndThresholds();
    window.addEventListener(SIMULATION_TICK_EVENT, handler);
    return () => window.removeEventListener(SIMULATION_TICK_EVENT, handler);
  }, [loadAlertsAndThresholds]);

  const handleTransitionStatus = async (
    alertItem: AlertItem,
    nextStatus: AlertStatus,
    notes?: string
  ) => {
    try {
      await apiFetch(`/alerts/${alertItem._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, resolutionNotes: notes }),
      });
      setResolveModalAlert(null);
      setResolutionNotes('');
      await loadAlertsAndThresholds();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update alert status.');
    }
  };

  const handleCreateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/alerts/thresholds', {
        method: 'POST',
        body: JSON.stringify(thresholdForm),
      });
      setThresholdModalOpen(false);
      await loadAlertsAndThresholds();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create threshold.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleThreshold = async (t: Threshold) => {
    try {
      await apiFetch(`/alerts/thresholds/${t._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      await loadAlertsAndThresholds();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle threshold.');
    }
  };

  const handleDeleteThreshold = async (id: string) => {
    if (!window.confirm('Delete this threshold rule?')) return;
    try {
      await apiFetch(`/alerts/thresholds/${id}`, { method: 'DELETE' });
      await loadAlertsAndThresholds();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete threshold.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Alert Management & Threshold Configuration
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Configure building, department, and meter consumption limits; monitor high usage &
            anomaly alerts from New → Acknowledged → Resolved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'alerts'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Alert Queue ({meta?.total ?? alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('thresholds')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'thresholds'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Configured Thresholds ({thresholds.length})
            </button>
          </div>

          {canManageAlerts && (
            <button
              type="button"
              onClick={() => {
                setThresholdForm({
                  name: 'Peak Load Threshold Rule',
                  scopeType: 'building',
                  buildingId: buildings[0]?._id || '',
                  departmentId: departments[0]?._id || '',
                  meterId: meters[0]?._id || '',
                  metric: 'consumption_kwh',
                  period: 'hourly',
                  warningLimit: 70,
                  criticalLimit: 95,
                });
                setThresholdModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Configure Threshold
            </button>
          )}
        </div>
      </div>

      {/* Alert Lifecycle Status Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiStatCard
          title="New Unacknowledged Alerts"
          value={String(meta?.New ?? 0)}
          subtitle="Requires facility review"
          icon={<Bell className="h-5 w-5" />}
          accent="rose"
        />
        <KpiStatCard
          title="Acknowledged (In Progress)"
          value={String(meta?.Acknowledged ?? 0)}
          subtitle="Under active investigation"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="amber"
        />
        <KpiStatCard
          title="Resolved Alerts"
          value={String(meta?.Resolved ?? 0)}
          subtitle="Historical closed incidents"
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={loadAlertsAndThresholds} />}

      {activeTab === 'alerts' ? (
        <SectionCard
          title="Energy Alert Lifecycle History"
          subtitle="Filter by status (New, Acknowledged, Resolved), severity, or building"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
              </select>

              <select
                value={buildingFilter}
                onChange={(e) => {
                  setBuildingFilter(e.target.value);
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
            </div>
          }
        >
          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : alerts.length === 0 ? (
            <EmptyState title="No alerts match the selected filter" />
          ) : (
            <>
              <div className="space-y-3">
                {alerts.map((a) => {
                  const bObj = typeof a.buildingId === 'object' ? a.buildingId : undefined;
                  const mObj = typeof a.meterId === 'object' ? a.meterId : undefined;

                  return (
                    <div
                      key={a._id}
                      className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={a.status} />
                          <StatusBadge status={a.severity.toUpperCase()} />
                          <span className="text-xs font-semibold text-slate-400">
                            {a.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            · {formatDateTime(a.timestamp)}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {a.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {a.message}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Building: <strong className="text-slate-300">{bObj?.name || 'N/A'}</strong>
                          {mObj && (
                            <>
                              {' '}
                              · Meter:{' '}
                              <strong className="text-emerald-400">
                                {mObj.meterCode} ({mObj.name})
                              </strong>
                            </>
                          )}{' '}
                          · Recorded: <strong>{a.actualValue}</strong> (Limit: {a.thresholdValue})
                        </p>
                        {a.resolutionNotes && (
                          <p className="mt-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-500">
                            Resolution Note: {a.resolutionNotes}
                          </p>
                        )}
                      </div>

                      {canManageAlerts && (
                        <div className="flex items-center gap-2">
                          {a.status === 'New' && (
                            <button
                              type="button"
                              onClick={() => void handleTransitionStatus(a, 'Acknowledged')}
                              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/25"
                            >
                              Acknowledge
                            </button>
                          )}
                          {a.status !== 'Resolved' && (
                            <button
                              type="button"
                              onClick={() => {
                                setResolveModalAlert(a);
                                setResolutionNotes(a.resolutionNotes || '');
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <PaginationBar meta={meta} onPageChange={setPage} />
            </>
          )}
        </SectionCard>
      ) : (
        <SectionCard
          title="Configured Consumption Thresholds"
          subtitle="Building-specific, Department-specific, and Meter-specific alert triggers"
        >
          {thresholds.length === 0 ? (
            <EmptyState title="No threshold rules configured" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-2.5 font-semibold">Rule Name</th>
                    <th className="pb-2.5 font-semibold">Scope & Target</th>
                    <th className="pb-2.5 font-semibold">Metric & Period</th>
                    <th className="pb-2.5 font-semibold">Warning Limit</th>
                    <th className="pb-2.5 font-semibold">Critical Limit</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                    {canManageAlerts && (
                      <th className="pb-2.5 text-right font-semibold">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {thresholds.map((t) => {
                    const b = typeof t.buildingId === 'object' ? t.buildingId : undefined;
                    const d = typeof t.departmentId === 'object' ? t.departmentId : undefined;
                    const m = typeof t.meterId === 'object' ? t.meterId : undefined;
                    const targetLabel =
                      t.scopeType === 'meter'
                        ? `${m?.meterCode || ''} ${m?.name || ''}`
                        : t.scopeType === 'department'
                        ? d?.name || 'Department'
                        : b?.name || 'Building';

                    return (
                      <tr key={t._id}>
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          {t.name}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={t.scopeType.toUpperCase()} variant="info" />
                          <span className="ml-2 text-slate-600 dark:text-slate-300">
                            {targetLabel}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {t.metric} ({t.period})
                        </td>
                        <td className="py-3 font-bold text-amber-500">{t.warningLimit}</td>
                        <td className="py-3 font-bold text-rose-500">{t.criticalLimit}</td>
                        <td className="py-3">
                          <StatusBadge
                            status={t.isActive ? 'Active' : 'Paused'}
                            variant={t.isActive ? 'success' : 'neutral'}
                          />
                        </td>
                        {canManageAlerts && (
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleToggleThreshold(t)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                              >
                                {t.isActive ? 'Pause' : 'Enable'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteThreshold(t._id)}
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
          )}
        </SectionCard>
      )}

      {/* Resolve Alert Modal */}
      <Modal
        isOpen={Boolean(resolveModalAlert)}
        onClose={() => setResolveModalAlert(null)}
        title="Resolve Energy Alert"
        subtitle={resolveModalAlert?.title}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Resolution / Root Cause Notes
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Document action taken (e.g., re-balanced HVAC stage 2 load, inspected sub-feeder)..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResolveModalAlert(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                resolveModalAlert &&
                void handleTransitionStatus(resolveModalAlert, 'Resolved', resolutionNotes)
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              Mark as Resolved
            </button>
          </div>
        </div>
      </Modal>

      {/* Configure Threshold Modal */}
      <Modal
        isOpen={thresholdModalOpen}
        onClose={() => setThresholdModalOpen(false)}
        title="Configure Energy Consumption Threshold"
      >
        <form onSubmit={handleCreateThreshold} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Threshold Rule Name *
            </label>
            <input
              type="text"
              required
              value={thresholdForm.name}
              onChange={(e) => setThresholdForm({ ...thresholdForm, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Target Scope Type
              </label>
              <select
                value={thresholdForm.scopeType}
                onChange={(e) =>
                  setThresholdForm({
                    ...thresholdForm,
                    scopeType: e.target.value as 'building' | 'department' | 'meter',
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="building">Building-Specific</option>
                <option value="department">Department-Specific</option>
                <option value="meter">Meter-Specific</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Target Entity *
              </label>
              {thresholdForm.scopeType === 'building' && (
                <select
                  value={thresholdForm.buildingId}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, buildingId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {buildings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
              {thresholdForm.scopeType === 'department' && (
                <select
                  value={thresholdForm.departmentId}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, departmentId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              {thresholdForm.scopeType === 'meter' && (
                <select
                  value={thresholdForm.meterId}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, meterId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {meters.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.meterCode} - {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Monitored Metric
              </label>
              <select
                value={thresholdForm.metric}
                onChange={(e) =>
                  setThresholdForm({
                    ...thresholdForm,
                    metric: e.target.value as
                      | 'consumption_kwh'
                      | 'cost_usd'
                      | 'unusual_spike_pct',
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="consumption_kwh">Consumption (kWh)</option>
                <option value="cost_usd">Electricity Cost ($)</option>
                <option value="unusual_spike_pct">Unusual Spike (% above baseline)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Evaluation Period
              </label>
              <select
                value={thresholdForm.period}
                onChange={(e) =>
                  setThresholdForm({
                    ...thresholdForm,
                    period: e.target.value as 'hourly' | 'daily' | 'monthly',
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-amber-500">Warning Limit *</label>
              <input
                type="number"
                step="0.1"
                min={0.1}
                required
                value={thresholdForm.warningLimit}
                onChange={(e) =>
                  setThresholdForm({
                    ...thresholdForm,
                    warningLimit: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-rose-500">Critical Limit *</label>
              <input
                type="number"
                step="0.1"
                min={0.1}
                required
                value={thresholdForm.criticalLimit}
                onChange={(e) =>
                  setThresholdForm({
                    ...thresholdForm,
                    criticalLimit: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setThresholdModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Threshold Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
