import { EnergyRecord } from '../models/EnergyRecord.js';
import { Organization } from '../models/Organization.js';
import {
  AggregationFilterParams,
  buildRecordMatchQuery,
  getDashboardOverview,
  getEntityComparisons,
  resolveDateWindow,
} from './aggregation.service.js';
import { getEnergyIntelligenceInsights } from './insights.service.js';
import { toObjectId } from '../types/index.js';

export type ReportType =
  | 'executive_summary'
  | 'building_breakdown'
  | 'department_cost'
  | 'anomaly_audit'
  | 'carbon_esg';

export interface GeneratedReportPayload {
  reportType: ReportType;
  title: string;
  organizationName: string;
  organizationCode: string;
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalConsumptionKwh: number;
    totalCostUsd: number;
    totalCarbonKg: number;
    averageDailyUsageKwh: number;
    peakConsumptionKwh: number;
    recordsCount: number;
  };
  columns: string[];
  rows: Array<Record<string, string | number>>;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function generateCustomReport(
  params: AggregationFilterParams & { reportType?: ReportType }
): Promise<GeneratedReportPayload> {
  const reportType: ReportType = params.reportType || 'executive_summary';
  const dateWindow = resolveDateWindow(params.startDate, params.endDate);
  const orgId = toObjectId(params.user.organizationId);

  const [organization, overview] = await Promise.all([
    Organization.findById(orgId).lean(),
    getDashboardOverview(params),
  ]);

  const orgName = organization?.name || 'WattWise Organization';
  const orgCode = organization?.code || 'ORG';

  let title = 'Executive Energy Consumption Summary Report';
  let columns: string[] = [];
  let rows: Array<Record<string, string | number>> = [];

  if (reportType === 'building_breakdown') {
    title = 'Building-Wise Energy & Carbon Performance Report';
    const comparisons = await getEntityComparisons(params);
    columns = [
      'Building Code',
      'Building Name',
      'Type',
      'Consumption (kWh)',
      'Electricity Cost ($)',
      'Carbon Emissions (kg CO2e)',
      'Peak Demand (kW)',
      'Intensity (kWh/sqFt)',
    ];
    rows = comparisons.buildingComparison.map((b) => ({
      'Building Code': b.code,
      'Building Name': b.name,
      Type: b.buildingType,
      'Consumption (kWh)': b.kwh,
      'Electricity Cost ($)': b.cost,
      'Carbon Emissions (kg CO2e)': b.carbonKg,
      'Peak Demand (kW)': b.peakKw,
      'Intensity (kWh/sqFt)': b.intensityKwhPerSqFt,
    }));
  } else if (reportType === 'department_cost') {
    title = 'Department Energy Consumption & Cost Allocation Report';
    const comparisons = await getEntityComparisons(params);
    columns = [
      'Department Code',
      'Department Name',
      'Building',
      'Consumption (kWh)',
      'Electricity Cost ($)',
      'Monthly Budget ($)',
      'Carbon (kg CO2e)',
      'kWh per Headcount',
      'Avg Power Factor',
    ];
    rows = comparisons.departmentComparison.map((d) => ({
      'Department Code': d.code,
      'Department Name': d.name,
      Building: d.buildingName,
      'Consumption (kWh)': d.kwh,
      'Electricity Cost ($)': d.cost,
      'Monthly Budget ($)': d.monthlyBudgetUsd,
      'Carbon (kg CO2e)': d.carbonKg,
      'kWh per Headcount': d.kwhPerHeadcount,
      'Avg Power Factor': d.avgPowerFactor,
    }));
  } else if (reportType === 'anomaly_audit') {
    title = 'Automated Energy Anomaly & Unusual Consumption Audit';
    const insights = await getEnergyIntelligenceInsights(params);
    columns = [
      'Timestamp',
      'Meter Code',
      'Meter Name',
      'Building',
      'Department',
      'Consumption (kWh)',
      'Cost ($)',
      'Z-Score (σ)',
    ];
    rows = insights.unusualConsumptionEvents.map((e) => ({
      Timestamp: new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 16),
      'Meter Code': e.meterCode,
      'Meter Name': e.meterName,
      Building: e.buildingName,
      Department: e.departmentName,
      'Consumption (kWh)': e.consumptionKwh,
      'Cost ($)': e.estimatedCost,
      'Z-Score (σ)': e.anomalyScore,
    }));
  } else if (reportType === 'carbon_esg') {
    title = 'Carbon Emissions (CO2e) & Sustainability Savings Report';
    const insights = await getEnergyIntelligenceInsights(params);
    columns = [
      'Recommendation Category',
      'Action Item',
      'Target Scope',
      'Priority',
      'Est. Monthly Savings (kWh)',
      'Est. Monthly Cost Savings ($)',
      'Est. Carbon Reduction (kg CO2e)',
    ];
    rows = insights.energySavingRecommendations.map((r) => ({
      'Recommendation Category': r.category,
      'Action Item': r.title,
      'Target Scope': r.targetEntityName,
      Priority: r.severity.toUpperCase(),
      'Est. Monthly Savings (kWh)': r.estimatedMonthlySavingsKwh,
      'Est. Monthly Cost Savings ($)': r.estimatedMonthlySavingsUsd,
      'Est. Carbon Reduction (kg CO2e)': r.estimatedCarbonReductionKg,
    }));
  } else {
    // Default: executive_summary (recent granular records + meter breakdown)
    const match = buildRecordMatchQuery(params, {
      start: dateWindow.start,
      end: dateWindow.end,
    });

    const records = await EnergyRecord.find(match)
      .populate('buildingId', 'name code')
      .populate('departmentId', 'name code')
      .populate('meterId', 'meterCode name')
      .sort({ timestamp: -1 })
      .limit(250)
      .lean();

    columns = [
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
    ];

    rows = records.map((r) => {
      const m = r.meterId as unknown as { meterCode?: string; name?: string } | undefined;
      const b = r.buildingId as unknown as { name?: string } | undefined;
      const d = r.departmentId as unknown as { name?: string } | undefined;
      return {
        Timestamp: new Date(r.timestamp).toISOString().replace('T', ' ').slice(0, 16),
        'Meter Code': m?.meterCode || 'MTR',
        'Meter Name': m?.name || 'Smart Meter',
        Building: b?.name || 'Building',
        Department: d?.name || 'Department',
        'Consumption (kWh)': Number((r.consumptionKwh || 0).toFixed(2)),
        'Estimated Cost ($)': Number((r.estimatedCost || 0).toFixed(2)),
        'Carbon (kg CO2e)': Number((r.carbonKg || 0).toFixed(2)),
        'Peak Demand (kW)': Number((r.peakDemandKw || 0).toFixed(2)),
        'Power Factor': Number((r.powerFactor || 0.94).toFixed(2)),
        Anomaly: r.isAnomaly ? 'YES' : 'NO',
      };
    });
  }

  return {
    reportType,
    title,
    organizationName: orgName,
    organizationCode: orgCode,
    generatedAt: new Date().toISOString(),
    period: {
      startDate: dateWindow.start.toISOString().slice(0, 10),
      endDate: dateWindow.end.toISOString().slice(0, 10),
    },
    summary: {
      totalConsumptionKwh: overview.totalConsumptionKwh,
      totalCostUsd: overview.totalCostUsd,
      totalCarbonKg: overview.totalCarbonKg,
      averageDailyUsageKwh: overview.averageDailyUsageKwh,
      peakConsumptionKwh: overview.peakConsumptionKwh,
      recordsCount: overview.recordsCount,
    },
    columns,
    rows,
  };
}

export function convertReportToCsv(report: GeneratedReportPayload): string {
  const lines: string[] = [];

  // Metadata Header Comment Block
  lines.push(`"Report Title",${escapeCsvCell(report.title)}`);
  lines.push(
    `"Organization",${escapeCsvCell(`${report.organizationName} (${report.organizationCode})`)}`
  );
  lines.push(
    `"Reporting Period",${escapeCsvCell(`${report.period.startDate} to ${report.period.endDate}`)}`
  );
  lines.push(`"Generated At",${escapeCsvCell(report.generatedAt)}`);
  lines.push(`"Total Consumption (kWh)",${report.summary.totalConsumptionKwh}`);
  lines.push(`"Total Electricity Cost ($)",${report.summary.totalCostUsd}`);
  lines.push(`"Total Carbon Emissions (kg CO2e)",${report.summary.totalCarbonKg}`);
  lines.push('');

  // Table Headers
  lines.push(report.columns.map(escapeCsvCell).join(','));

  // Table Rows
  for (const row of report.rows) {
    const line = report.columns.map((col) => escapeCsvCell(row[col])).join(',');
    lines.push(line);
  }

  return lines.join('\r\n');
}
