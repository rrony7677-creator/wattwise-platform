import { Request, Response, NextFunction } from 'express';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { Alert, IAlert } from '../models/Alert.js';
import { Threshold, IThreshold } from '../models/Threshold.js';
import { Building } from '../models/Building.js';
import { Department } from '../models/Department.js';
import { Meter } from '../models/Meter.js';
import { AppError } from '../middleware/error.middleware.js';
import { assertEntityScopeAccess, buildScopedFilter } from '../middleware/rbac.middleware.js';
import { invalidateOrgCache } from '../middleware/cache.middleware.js';
import { toObjectId } from '../types/index.js';

const createThresholdSchema = z.object({
  name: z.string().min(2).max(120),
  scopeType: z.enum(['building', 'department', 'meter']),
  buildingId: z.string().optional(),
  departmentId: z.string().optional(),
  meterId: z.string().optional(),
  metric: z
    .enum(['consumption_kwh', 'cost_usd', 'unusual_spike_pct'])
    .default('consumption_kwh'),
  period: z.enum(['hourly', 'daily', 'monthly']).default('hourly'),
  warningLimit: z.coerce.number().min(0.1),
  criticalLimit: z.coerce.number().min(0.1),
  isActive: z.boolean().default(true),
});

const updateThresholdSchema = createThresholdSchema.partial();

const updateAlertStatusSchema = z.object({
  status: z.enum(['New', 'Acknowledged', 'Resolved']),
  resolutionNotes: z.string().max(500).optional(),
});

export async function listThresholds(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const scopeType =
      typeof req.query.scopeType === 'string' ? req.query.scopeType.trim() : '';

    const filter: FilterQuery<IThreshold> = {
      organizationId: orgId,
    };

    if (scopeType && ['building', 'department', 'meter'].includes(scopeType)) {
      filter.scopeType = scopeType as IThreshold['scopeType'];
    }

    if (user.role === 'department_manager' && user.assignedDepartmentIds.length > 0) {
      filter.departmentId = { $in: user.assignedDepartmentIds.map(toObjectId) };
    } else if (user.role === 'facility_manager' && user.assignedBuildingIds.length > 0) {
      filter.buildingId = { $in: user.assignedBuildingIds.map(toObjectId) };
    }

    const thresholds = await Threshold.find(filter)
      .populate('buildingId', 'name code')
      .populate('departmentId', 'name code')
      .populate('meterId', 'meterCode name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: thresholds,
    });
  } catch (error) {
    next(error);
  }
}

export async function createThreshold(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const payload = createThresholdSchema.parse(req.body);

    if (payload.criticalLimit < payload.warningLimit) {
      throw new AppError(
        400,
        'INVALID_LIMITS',
        'Critical threshold limit must be greater than or equal to the warning limit.'
      );
    }

    let resolvedBuildingId = payload.buildingId ? toObjectId(payload.buildingId) : undefined;
    let resolvedDeptId = payload.departmentId ? toObjectId(payload.departmentId) : undefined;
    let resolvedMeterId = payload.meterId ? toObjectId(payload.meterId) : undefined;

    if (payload.scopeType === 'meter') {
      if (!resolvedMeterId) {
        throw new AppError(400, 'METER_REQUIRED', 'meterId is required for meter thresholds.');
      }
      const meter = await Meter.findOne({ _id: resolvedMeterId, organizationId: orgId }).lean();
      if (!meter) {
        throw new AppError(404, 'METER_NOT_FOUND', 'Meter not found in your organization.');
      }
      resolvedBuildingId = meter.buildingId;
      resolvedDeptId = meter.departmentId;
    } else if (payload.scopeType === 'department') {
      if (!resolvedDeptId) {
        throw new AppError(
          400,
          'DEPARTMENT_REQUIRED',
          'departmentId is required for department thresholds.'
        );
      }
      const dept = await Department.findOne({ _id: resolvedDeptId, organizationId: orgId }).lean();
      if (!dept) {
        throw new AppError(
          404,
          'DEPARTMENT_NOT_FOUND',
          'Department not found in your organization.'
        );
      }
      resolvedBuildingId = dept.buildingId;
    } else if (payload.scopeType === 'building') {
      if (!resolvedBuildingId) {
        throw new AppError(
          400,
          'BUILDING_REQUIRED',
          'buildingId is required for building thresholds.'
        );
      }
      const bldg = await Building.findOne({
        _id: resolvedBuildingId,
        organizationId: orgId,
      }).lean();
      if (!bldg) {
        throw new AppError(404, 'BUILDING_NOT_FOUND', 'Building not found in your organization.');
      }
    }

    assertEntityScopeAccess(user, {
      organizationId: orgId,
      buildingId: resolvedBuildingId,
      departmentId: resolvedDeptId,
      meterId: resolvedMeterId,
    });

    const created = await Threshold.create({
      organizationId: orgId,
      name: payload.name,
      scopeType: payload.scopeType,
      buildingId: resolvedBuildingId,
      departmentId: resolvedDeptId,
      meterId: resolvedMeterId,
      metric: payload.metric,
      period: payload.period,
      warningLimit: payload.warningLimit,
      criticalLimit: payload.criticalLimit,
      isActive: payload.isActive,
      createdBy: toObjectId(user.userId),
    });

    const populated = await Threshold.findById(created._id)
      .populate('buildingId', 'name code')
      .populate('departmentId', 'name code')
      .populate('meterId', 'meterCode name')
      .lean();

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateThreshold(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const thresholdId = toObjectId(req.params.id);
    const orgId = toObjectId(user.organizationId);
    const payload = updateThresholdSchema.parse(req.body);

    const existing = await Threshold.findOne({
      _id: thresholdId,
      organizationId: orgId,
    });

    if (!existing) {
      throw new AppError(404, 'THRESHOLD_NOT_FOUND', 'Threshold configuration not found.');
    }

    assertEntityScopeAccess(user, {
      organizationId: existing.organizationId,
      buildingId: existing.buildingId,
      departmentId: existing.departmentId,
      meterId: existing.meterId,
    });

    if (payload.name !== undefined) existing.name = payload.name;
    if (payload.metric !== undefined) existing.metric = payload.metric;
    if (payload.period !== undefined) existing.period = payload.period;
    if (payload.warningLimit !== undefined) existing.warningLimit = payload.warningLimit;
    if (payload.criticalLimit !== undefined) existing.criticalLimit = payload.criticalLimit;
    if (payload.isActive !== undefined) existing.isActive = payload.isActive;

    if (existing.criticalLimit < existing.warningLimit) {
      throw new AppError(
        400,
        'INVALID_LIMITS',
        'Critical limit must be greater than or equal to warning limit.'
      );
    }

    await existing.save();

    const populated = await Threshold.findById(existing._id)
      .populate('buildingId', 'name code')
      .populate('departmentId', 'name code')
      .populate('meterId', 'meterCode name')
      .lean();

    res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteThreshold(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const thresholdId = toObjectId(req.params.id);
    const orgId = toObjectId(user.organizationId);

    const existing = await Threshold.findOne({
      _id: thresholdId,
      organizationId: orgId,
    }).lean();

    if (!existing) {
      throw new AppError(404, 'THRESHOLD_NOT_FOUND', 'Threshold configuration not found.');
    }

    assertEntityScopeAccess(user, {
      organizationId: existing.organizationId,
      buildingId: existing.buildingId,
      departmentId: existing.departmentId,
      meterId: existing.meterId,
    });

    await Threshold.deleteOne({ _id: thresholdId });

    res.status(200).json({
      success: true,
      data: { _id: thresholdId, deleted: true },
    });
  } catch (error) {
    next(error);
  }
}

export async function listAlerts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const severity = typeof req.query.severity === 'string' ? req.query.severity.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';
    const buildingId =
      typeof req.query.buildingId === 'string' ? req.query.buildingId.trim() : '';
    const departmentId =
      typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : '';
    const meterId = typeof req.query.meterId === 'string' ? req.query.meterId.trim() : '';
    const startDate =
      typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '';
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const filter: FilterQuery<IAlert> = buildScopedFilter<IAlert>(user, {
      includeBuildingScope: true,
      includeDepartmentScope: true,
      includeMeterScope: true,
    });

    if (status && ['New', 'Acknowledged', 'Resolved'].includes(status)) {
      filter.status = status as IAlert['status'];
    }
    if (severity && ['warning', 'critical'].includes(severity)) {
      filter.severity = severity as IAlert['severity'];
    }
    if (
      type &&
      ['high_usage', 'unusual_consumption', 'meter_health', 'budget_warning'].includes(type)
    ) {
      filter.type = type as IAlert['type'];
    }
    if (buildingId) filter.buildingId = toObjectId(buildingId);
    if (departmentId) filter.departmentId = toObjectId(departmentId);
    if (meterId) filter.meterId = toObjectId(meterId);

    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
      filter.timestamp = dateQuery;
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { message: { $regex: q, $options: 'i' } },
      ];
    }

    const [alerts, total, summaryCounts] = await Promise.all([
      Alert.find(filter)
        .populate('buildingId', 'name code')
        .populate('departmentId', 'name code')
        .populate('meterId', 'meterCode name')
        .populate('acknowledgedBy', 'name email')
        .populate('resolvedBy', 'name email')
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
      Alert.aggregate([
        {
          $match: buildScopedFilter(user, {
            includeBuildingScope: true,
            includeDepartmentScope: true,
            includeMeterScope: true,
          }),
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusSummary = {
      New: 0,
      Acknowledged: 0,
      Resolved: 0,
    };

    for (const s of summaryCounts) {
      if (s._id in statusSummary) {
        statusSummary[s._id as keyof typeof statusSummary] = s.count;
      }
    }

    res.status(200).json({
      success: true,
      data: alerts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        ...statusSummary,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAlertStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const alertId = toObjectId(req.params.id);
    const orgId = toObjectId(user.organizationId);
    const payload = updateAlertStatusSchema.parse(req.body);

    const alert = await Alert.findOne({
      _id: alertId,
      organizationId: orgId,
    });

    if (!alert) {
      throw new AppError(404, 'ALERT_NOT_FOUND', 'Alert not found.');
    }

    assertEntityScopeAccess(user, {
      organizationId: alert.organizationId,
      buildingId: alert.buildingId,
      departmentId: alert.departmentId,
      meterId: alert.meterId,
    });

    alert.status = payload.status;
    if (payload.status === 'Acknowledged') {
      alert.acknowledgedBy = toObjectId(user.userId);
      alert.acknowledgedAt = new Date();
    } else if (payload.status === 'Resolved') {
      if (!alert.acknowledgedBy) {
        alert.acknowledgedBy = toObjectId(user.userId);
        alert.acknowledgedAt = new Date();
      }
      alert.resolvedBy = toObjectId(user.userId);
      alert.resolvedAt = new Date();
    }

    if (payload.resolutionNotes !== undefined) {
      alert.resolutionNotes = payload.resolutionNotes;
    }

    await alert.save();

    const populated = await Alert.findById(alert._id)
      .populate('buildingId', 'name code')
      .populate('departmentId', 'name code')
      .populate('meterId', 'meterCode name')
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .lean();

    invalidateOrgCache(user.organizationId);

    res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}
