'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportableReportPayload {
  reportType: string;
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

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a browser CSV file download for any tabular dataset.
 */
export function downloadClientCsv(
  filename: string,
  columns: string[],
  rows: Array<Record<string, string | number>>
): void {
  const headerLine = columns.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) =>
    columns.map((col) => escapeCsvCell(row[col])).join(',')
  );
  const csvContent = [headerLine, ...bodyLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Bonus Challenge: PDF Report Generation
 * Generates an executive multi-section PDF energy report using jsPDF + jspdf-autotable.
 */
export function exportReportToPdf(report: ExportableReportPayload): void {
  const doc = new jsPDF({
    orientation: report.columns.length > 6 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 82, 'F');

  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('WATTWISE ENERGY INTELLIGENCE', 36, 32);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(report.title, 36, 52);

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Organization: ${report.organizationName} (${report.organizationCode})   |   Period: ${report.period.startDate} to ${report.period.endDate}   |   Generated: ${new Date(
      report.generatedAt
    ).toLocaleString()}`,
    36,
    70
  );

  // KPI Summary Strip
  const kpis = [
    {
      label: 'Total Consumption',
      value: `${report.summary.totalConsumptionKwh.toLocaleString()} kWh`,
    },
    {
      label: 'Estimated Cost',
      value: `$${report.summary.totalCostUsd.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
    {
      label: 'Carbon Emissions',
      value: `${report.summary.totalCarbonKg.toLocaleString()} kg CO2e`,
    },
    {
      label: 'Avg Daily Usage',
      value: `${report.summary.averageDailyUsageKwh.toLocaleString()} kWh/day`,
    },
    {
      label: 'Peak Reading',
      value: `${report.summary.peakConsumptionKwh.toLocaleString()} kWh`,
    },
  ];

  const boxWidth = (pageWidth - 72 - (kpis.length - 1) * 10) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 36 + idx * (boxWidth + 10);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, 96, boxWidth, 44, 4, 4, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(kpi.label.toUpperCase(), x + 8, 111);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(kpi.value, x + 8, 129);
  });

  // Data Table
  const tableBody = report.rows.map((row) =>
    report.columns.map((col) => String(row[col] ?? '—'))
  );

  autoTable(doc, {
    startY: 154,
    head: [report.columns],
    body: tableBody,
    margin: { left: 36, right: 36 },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const fileName = `wattwise-${report.reportType}-${report.period.startDate}.pdf`;
  doc.save(fileName);
}
