'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { apiFetch, getCsvDownloadUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useFilterState } from '@/hooks/useFilterState';
import {
  downloadClientCsv,
  ExportableReportPayload,
  exportReportToPdf,
} from '@/lib/export-utils';
import { Building, Department, ScheduledReport } from '@/types';
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
  SectionCard,
  StatusBadge,
} from '@/components/ui';

export default function ReportsPage() {
  const { isViewer } = useAuth();
  const filters = useFilterState('30d');
  const [reportType, setReportType] = useState<string>('executive_summary');
  const [reportData, setReportData] = useState<ExportableReportPayload | null>(null);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Scheduled Report Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: 'Weekly Executive Energy & Cost Digest',
    reportType: 'executive_summary',
    frequency: 'weekly',
    format: 'PDF',
    buildingId: '',
    departmentId: '',
    recipientsText: 'admin@apex.wattwise.io, facility@apex.wattwise.io',
  });
  const [submitting, setSubmitting] = useState(false);

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

  const loadReportAndSchedules = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [repRes, schRes] = await Promise.all([
        apiFetch<ExportableReportPayload>('/reports/generate', {
          params: {
            reportType,
            startDate: filters.startDate,
            endDate: filters.endDate,
            buildingId: filters.buildingId || undefined,
            departmentId: filters.departmentId || undefined,
          },
        }),
        apiFetch<ScheduledReport[]>('/reports/scheduled'),
      ]);
      setReportData(repRes.data);
      setScheduledReports(schRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  }, [
    reportType,
    filters.startDate,
    filters.endDate,
    filters.buildingId,
    filters.departmentId,
  ]);

  useEffect(() => {
    void loadReportAndSchedules();
  }, [loadReportAndSchedules]);

  const handleDownloadCsv = () => {
    if (!reportData) return;
    downloadClientCsv(
      `wattwise-${reportData.reportType}-${reportData.period.startDate}.csv`,
      reportData.columns,
      reportData.rows
    );
  };

  const handleDownloadPdf = () => {
    if (!reportData) return;
    exportReportToPdf(reportData);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const recipients = scheduleForm.recipientsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await apiFetch('/reports/scheduled', {
        method: 'POST',
        body: JSON.stringify({
          name: scheduleForm.name,
          reportType: scheduleForm.reportType,
          frequency: scheduleForm.frequency,
          format: scheduleForm.format,
          buildingId: scheduleForm.buildingId || undefined,
          departmentId: scheduleForm.departmentId || undefined,
          recipients,
        }),
      });
      setScheduleModalOpen(false);
      await loadReportAndSchedules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create scheduled report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunScheduleNow = async (sch: ScheduledReport) => {
    try {
      const res = await apiFetch<{
        schedule: ScheduledReport;
        report: ExportableReportPayload;
      }>(`/reports/scheduled/${sch._id}/run-now`, { method: 'POST' });

      if (sch.format === 'PDF') {
        exportReportToPdf(res.data.report);
      } else {
        downloadClientCsv(
          `wattwise-scheduled-${sch.reportType}.csv`,
          res.data.report.columns,
          res.data.report.rows
        );
      }
      await loadReportAndSchedules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to run scheduled report.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Delete this scheduled report?')) return;
    try {
      await apiFetch(`/reports/scheduled/${id}`, { method: 'DELETE' });
      await loadReportAndSchedules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete schedule.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Custom Date Range Reports, CSV/PDF Exports & Schedules
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Generate executive consumption, building breakdown, department cost, anomaly audit,
            and carbon ESG reports with one-click CSV & PDF export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!reportData}
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Export CSV
          </button>

          <a
            href={getCsvDownloadUrl('/reports/export-csv', {
              reportType,
              startDate: filters.startDate,
              endDate: filters.endDate,
              buildingId: filters.buildingId || undefined,
              departmentId: filters.departmentId || undefined,
            })}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-4 w-4 text-cyan-500" />
            Stream Server CSV
          </a>

          <button
            type="button"
            disabled={!reportData}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Generate PDF Report
          </button>
        </div>
      </div>

      {/* Report Type & Date Range Controls */}
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
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <option value="executive_summary">Executive Summary Report</option>
              <option value="building_breakdown">Building Breakdown Report</option>
              <option value="department_cost">Department Cost & Budget Report</option>
              <option value="anomaly_audit">Anomaly & Unusual Usage Audit</option>
              <option value="carbon_esg">Carbon Emissions & Saving Recommendations</option>
            </select>

            <select
              value={filters.buildingId}
              onChange={(e) => filters.setBuildingId(e.target.value)}
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

      {error && <ErrorBanner message={error} onRetry={loadReportAndSchedules} />}

      {/* Live Report Preview Table */}
      {isLoading || !reportData ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <SectionCard
          title={reportData.title}
          subtitle={`Organization: ${reportData.organizationName} (${reportData.organizationCode}) · Period: ${reportData.period.startDate} to ${reportData.period.endDate}`}
        >
          {/* Report Summary KPI Strip */}
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 sm:grid-cols-5 dark:border-slate-800 dark:bg-slate-800/50">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Total Consumption
              </span>
              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                {formatKwhCompact(reportData.summary.totalConsumptionKwh)}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Total Cost
              </span>
              <p className="mt-0.5 text-sm font-bold text-amber-500">
                {formatCurrency(reportData.summary.totalCostUsd)}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Carbon Footprint
              </span>
              <p className="mt-0.5 text-sm font-bold text-emerald-500">
                {formatCarbon(reportData.summary.totalCarbonKg)}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Avg Daily Usage
              </span>
              <p className="mt-0.5 text-sm font-bold text-cyan-500">
                {formatKwhCompact(reportData.summary.averageDailyUsageKwh)}/d
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Peak Interval
              </span>
              <p className="mt-0.5 text-sm font-bold text-rose-500">
                {formatKwhCompact(reportData.summary.peakConsumptionKwh)}
              </p>
            </div>
          </div>

          {reportData.rows.length === 0 ? (
            <EmptyState title="No data rows in this report window" />
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {reportData.columns.map((col) => (
                      <th key={col} className="pb-2.5 pr-4 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {reportData.rows.slice(0, 60).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {reportData.columns.map((col) => (
                        <td
                          key={col}
                          className="py-2.5 pr-4 text-slate-700 dark:text-slate-300"
                        >
                          {String(row[col] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Bonus Challenge: Scheduled Energy Reports */}
      <SectionCard
        title="Scheduled Automated Energy Reports"
        subtitle="Configure recurring daily, weekly, or monthly energy reports in PDF or CSV format"
        action={
          !isViewer && (
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <Plus className="h-3.5 w-3.5" />
              New Scheduled Report
            </button>
          )
        }
      >
        {scheduledReports.length === 0 ? (
          <EmptyState title="No scheduled reports configured" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {scheduledReports.map((sch) => (
              <div
                key={sch._id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-500 uppercase">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {sch.frequency} · {sch.format}
                    </span>
                    <StatusBadge
                      status={sch.isActive ? 'Scheduled' : 'Paused'}
                      variant={sch.isActive ? 'success' : 'neutral'}
                    />
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    {sch.name}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Template: {sch.reportType.replace('_', ' ')}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Recipients: {sch.recipients.join(', ')}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                  <div>
                    Next Run: <strong className="text-slate-300">{formatDateTime(sch.nextRunAt)}</strong>
                  </div>
                  {!isViewer && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleRunScheduleNow(sch)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/25"
                      >
                        <Play className="h-3 w-3" />
                        Run & Download Now
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSchedule(sch._id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Create Scheduled Report Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Recurring Energy Report"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Schedule Name *
            </label>
            <input
              type="text"
              required
              value={scheduleForm.name}
              onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Report Template
              </label>
              <select
                value={scheduleForm.reportType}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, reportType: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="executive_summary">Executive Summary</option>
                <option value="building_breakdown">Building Breakdown</option>
                <option value="department_cost">Department Cost</option>
                <option value="anomaly_audit">Anomaly Audit</option>
                <option value="carbon_esg">Carbon ESG</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Frequency
              </label>
              <select
                value={scheduleForm.frequency}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, frequency: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Output Format
              </label>
              <select
                value={scheduleForm.format}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, format: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="PDF">PDF Document</option>
                <option value="CSV">CSV Spreadsheet</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Recipient Emails (comma-separated) *
            </label>
            <input
              type="text"
              required
              value={scheduleForm.recipientsText}
              onChange={(e) =>
                setScheduleForm({ ...scheduleForm, recipientsText: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Create Scheduled Report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
