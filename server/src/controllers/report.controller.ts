import { Request, Response, NextFunction } from 'express';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { ScheduledReport, IScheduledReport } from '../models/ScheduledReport.js';
import {
  convertReportToCsv,
  generateCustomReport,
  ReportType,
} from '../services/reportGenerator.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { toObjectId } from '../types/index.js';

const createScheduledReportSchema = z.object({
  name: z.string().min(2).max(120),
  reportType: z
    .enum([
      'executive_summary',
      'building_breakdown',
      'department_cost',
      'anomaly_audit',
      'carbon_esg',
    ])
    .default('executive_summary'),
  frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  format: z.enum(['CSV', 'PDF']).default('PDF'),
  buildingId: z.string().optional(),
  departmentId: z.string().optional(),
  recipients: z.array(z.string().email()).min(1),
  isActive: z.boolean().default(true),
});

function parseReportType(raw: unknown): ReportType {
  const valid: ReportType[] = [
    'executive_summary',
    'building_breakdown',
    'department_cost',
    'anomaly_audit',
    'carbon_esg',
  ];
  return typeof raw === 'string' && valid.includes(raw as ReportType)
    ? (raw as ReportType)
    : 'executive_summary';
}

export async function generateReportData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const report = await generateCustomReport({
      user: req.user!,
      reportType: parseReportType(req.query.reportType),
      startDate:
        typeof req.query.startDate === 'string' ? req.query.startDate.trim() : undefined,
      endDate: typeof req.query.endDate === 'string' ? req.query.endDate.trim() : undefined,
      buildingId:
        typeof req.query.buildingId === 'string' ? req.query.buildingId.trim() : undefined,
      departmentId:
        typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : undefined,
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

export async function exportReportCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reportType = parseReportType(req.query.reportType);
    const report = await generateCustomReport({
      user: req.user!,
      reportType,
      startDate:
        typeof req.query.startDate === 'string' ? req.query.startDate.trim() : undefined,
      endDate: typeof req.query.endDate === 'string' ? req.query.endDate.trim() : undefined,
      buildingId:
        typeof req.query.buildingId === 'string' ? req.query.buildingId.trim() : undefined,
      departmentId:
        typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : undefined,
    });

    const csvContent = convertReportToCsv(report);
    const fileName = `wattwise-${reportType}-${report.period.startDate}-to-${report.period.endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

export async function listScheduledReports(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const filter: FilterQuery<IScheduledReport> = {
      organizationId: toObjectId(user.organizationId),
    };

    if (user.role === 'department_manager' && user.assignedDepartmentIds.length > 0) {
      filter['scope.departmentId'] = {
        $in: user.assignedDepartmentIds.map(toObjectId),
      };
    }

    const scheduled = await ScheduledReport.find(filter)
      .populate('scope.buildingId', 'name code')
      .populate('scope.departmentId', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: scheduled,
    });
  } catch (error) {
    next(error);
  }
}

export async function createScheduledReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const payload = createScheduledReportSchema.parse(req.body);

    const now = new Date();
    const daysToAdd =
      payload.frequency === 'daily' ? 1 : payload.frequency === 'weekly' ? 7 : 30;
    const nextRunAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const created = await ScheduledReport.create({
      organizationId: toObjectId(user.organizationId),
      createdBy: toObjectId(user.userId),
      name: payload.name,
      reportType: payload.reportType,
      frequency: payload.frequency,
      format: payload.format,
      scope: {
        buildingId: payload.buildingId ? toObjectId(payload.buildingId) : undefined,
        departmentId: payload.departmentId ? toObjectId(payload.departmentId) : undefined,
      },
      recipients: payload.recipients,
      nextRunAt,
      isActive: payload.isActive,
    });

    const populated = await ScheduledReport.findById(created._id)
      .populate('scope.buildingId', 'name code')
      .populate('scope.departmentId', 'name code')
      .populate('createdBy', 'name email')
      .lean();

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function runScheduledReportNow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const scheduleId = toObjectId(req.params.id);

    const schedule = await ScheduledReport.findOne({
      _id: scheduleId,
      organizationId: toObjectId(user.organizationId),
    });

    if (!schedule) {
      throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Scheduled report not found.');
    }

    const now = new Date();
    const daysToAdd =
      schedule.frequency === 'daily' ? 1 : schedule.frequency === 'weekly' ? 7 : 30;

    schedule.lastGeneratedAt = now;
    schedule.nextRunAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    await schedule.save();

    const reportData = await generateCustomReport({
      user,
      reportType: schedule.reportType,
      buildingId: schedule.scope?.buildingId ? String(schedule.scope.buildingId) : undefined,
      departmentId: schedule.scope?.departmentId
        ? String(schedule.scope.departmentId)
        : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        schedule,
        report: reportData,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteScheduledReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const scheduleId = toObjectId(req.params.id);

    const deleted = await ScheduledReport.findOneAndDelete({
      _id: scheduleId,
      organizationId: toObjectId(user.organizationId),
    }).lean();

    if (!deleted) {
      throw new AppError(404, 'SCHEDULE_NOT_FOUND', 'Scheduled report not found.');
    }

    res.status(200).json({
      success: true,
      data: { _id: scheduleId, deleted: true },
    });
  } catch (error) {
    next(error);
  }
}
