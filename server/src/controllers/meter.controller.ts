import { Request, Response, NextFunction } from 'express';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { Meter, IMeter } from '../models/Meter.js';
import { Building } from '../models/Building.js';
import { Floor } from '../models/Floor.js';
import { Department } from '../models/Department.js';
import { EnergyRecord } from '../models/EnergyRecord.js';
import { AppError } from '../middleware/error.middleware.js';
import { assertEntityScopeAccess, buildScopedFilter } from '../middleware/rbac.middleware.js';
import { invalidateOrgCache } from '../middleware/cache.middleware.js';
import { toObjectId } from '../types/index.js';

const createMeterSchema = z.object({
  buildingId: z.string().min(1),
  floorId: z.string().min(1),
  departmentId: z.string().min(1),
  meterCode: z.string().min(2).max(32),
  name: z.string().min(2).max(120),
  meterType: z
    .enum(['Main', 'Submeter', 'HVAC', 'Lighting', 'Machinery', 'ServerRack'])
    .default('Submeter'),
  status: z.enum(['active', 'warning', 'offline', 'maintenance']).default('active'),
  healthScore: z.coerce.number().min(0).max(100).default(98),
  firmwareVersion: z.string().default('v4.2.1'),
  maxCapacityKw: z.coerce.number().min(1).default(100),
});

const updateMeterSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  meterType: z
    .enum(['Main', 'Submeter', 'HVAC', 'Lighting', 'Machinery', 'ServerRack'])
    .optional(),
  status: z.enum(['active', 'warning', 'offline', 'maintenance']).optional(),
  healthScore: z.coerce.number().min(0).max(100).optional(),
  firmwareVersion: z.string().optional(),
  maxCapacityKw: z.coerce.number().min(1).optional(),
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  departmentId: z.string().optional(),
});

export async function listMeters(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));
    const buildingId =
      typeof req.query.buildingId === 'string' ? req.query.buildingId.trim() : '';
    const floorId = typeof req.query.floorId === 'string' ? req.query.floorId.trim() : '';
    const departmentId =
      typeof req.query.departmentId === 'string' ? req.query.departmentId.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const meterType =
      typeof req.query.meterType === 'string' ? req.query.meterType.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const filter: FilterQuery<IMeter> = buildScopedFilter<IMeter>(user, {
      includeBuildingScope: true,
      includeDepartmentScope: true,
      includeMeterScope: true,
      meterField: '_id',
    });

    if (buildingId) filter.buildingId = toObjectId(buildingId);
    if (floorId) filter.floorId = toObjectId(floorId);
    if (departmentId) filter.departmentId = toObjectId(departmentId);
    if (status && ['active', 'warning', 'offline', 'maintenance'].includes(status)) {
      filter.status = status as IMeter['status'];
    }
    if (
      meterType &&
      ['Main', 'Submeter', 'HVAC', 'Lighting', 'Machinery', 'ServerRack'].includes(meterType)
    ) {
      filter.meterType = meterType as IMeter['meterType'];
    }

    if (q) {
      filter.$or = [
        { meterCode: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { firmwareVersion: { $regex: q, $options: 'i' } },
      ];
    }

    const [meters, total] = await Promise.all([
      Meter.find(filter)
        .populate('buildingId', 'name code')
        .populate('floorId', 'floorNumber name')
        .populate('departmentId', 'name code')
        .sort({ meterCode: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Meter.countDocuments(filter),
    ]);

    const meterIds = meters.map((m) => m._id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentTotals = await EnergyRecord.aggregate([
      {
        $match: {
          organizationId: orgId,
          meterId: { $in: meterIds },
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$meterId',
          recentConsumptionKwh: { $sum: '$consumptionKwh' },
        },
      },
    ]);

    const usageMap = new Map(
      recentTotals.map((i) => [String(i._id), Number((i.recentConsumptionKwh || 0).toFixed(2))])
    );

    const enriched = meters.map((m) => ({
      ...m,
      recentConsumptionKwh: usageMap.get(String(m._id)) || 0,
    }));

    res.status(200).json({
      success: true,
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMeterHealthSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const filter: FilterQuery<IMeter> = buildScopedFilter<IMeter>(user, {
      includeBuildingScope: true,
      includeDepartmentScope: true,
      includeMeterScope: true,
      meterField: '_id',
    });

    const meters = await Meter.find(filter)
      .populate('buildingId', 'name code')
      .populate('departmentId', 'name code')
      .sort({ healthScore: 1 })
      .lean();

    const totalMeters = meters.length;
    const avgHealth =
      totalMeters > 0
        ? Number(
            (meters.reduce((sum, m) => sum + (m.healthScore || 0), 0) / totalMeters).toFixed(1)
          )
        : 100;

    const statusBreakdown = {
      active: 0,
      warning: 0,
      offline: 0,
      maintenance: 0,
    };

    const typeBreakdown: Record<string, number> = {};

    for (const m of meters) {
      statusBreakdown[m.status] = (statusBreakdown[m.status] || 0) + 1;
      typeBreakdown[m.meterType] = (typeBreakdown[m.meterType] || 0) + 1;
    }

    const attentionRequiredMeters = meters
      .filter((m) => m.status !== 'active' || m.healthScore < 88)
      .map((m) => {
        let diagnostic = 'Normal telemetry';
        if (m.status === 'offline') {
          diagnostic = 'Communication timeout — check gateway connectivity';
        } else if (m.status === 'maintenance') {
          diagnostic = 'Scheduled calibration / maintenance lock active';
        } else if (m.healthScore < 75) {
          diagnostic = 'High voltage drift & packet loss detected — inspect CT clamps';
        } else if (m.healthScore < 88 || m.status === 'warning') {
          diagnostic = 'Intermittent signal jitter or firmware update recommended';
        }
        return {
          ...m,
          diagnostic,
        };
      });

    res.status(200).json({
      success: true,
      data: {
        totalMeters,
        averageHealthScore: avgHealth,
        statusBreakdown,
        typeBreakdown,
        attentionRequiredMeters,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createMeter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const payload = createMeterSchema.parse(req.body);

    assertEntityScopeAccess(user, {
      organizationId: orgId,
      buildingId: payload.buildingId,
      departmentId: payload.departmentId,
    });

    const [building, floor, department] = await Promise.all([
      Building.findOne({ _id: toObjectId(payload.buildingId), organizationId: orgId }).lean(),
      Floor.findOne({ _id: toObjectId(payload.floorId), organizationId: orgId }).lean(),
      Department.findOne({ _id: toObjectId(payload.departmentId), organizationId: orgId }).lean(),
    ]);

    if (!building) {
      throw new AppError(400, 'INVALID_BUILDING', 'Building not found in your organization.');
    }
    if (!floor || String(floor.buildingId) !== String(building._id)) {
      throw new AppError(
        400,
        'INVALID_FLOOR_HIERARCHY',
        'Selected floor does not belong to the specified building.'
      );
    }
    if (
      !department ||
      String(department.buildingId) !== String(building._id) ||
      String(department.floorId) !== String(floor._id)
    ) {
      throw new AppError(
        400,
        'INVALID_DEPARTMENT_HIERARCHY',
        'Selected department does not belong to the specified building and floor.'
      );
    }

    const existing = await Meter.findOne({
      organizationId: orgId,
      meterCode: payload.meterCode.toUpperCase(),
    }).lean();

    if (existing) {
      throw new AppError(
        409,
        'METER_CODE_EXISTS',
        `Electricity meter with code "${payload.meterCode.toUpperCase()}" is already registered.`
      );
    }

    const created = await Meter.create({
      organizationId: orgId,
      buildingId: building._id,
      floorId: floor._id,
      departmentId: department._id,
      meterCode: payload.meterCode.toUpperCase(),
      name: payload.name,
      meterType: payload.meterType,
      status: payload.status,
      healthScore: payload.healthScore,
      firmwareVersion: payload.firmwareVersion,
      maxCapacityKw: payload.maxCapacityKw,
      lastReadingAt: new Date(),
    });

    const populated = await Meter.findById(created._id)
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber name')
      .populate('departmentId', 'name code')
      .lean();

    invalidateOrgCache(user.organizationId);

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMeter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const meterId = toObjectId(req.params.id);
    const orgId = toObjectId(user.organizationId);
    const payload = updateMeterSchema.parse(req.body);

    const existingMeter = await Meter.findOne({
      _id: meterId,
      organizationId: orgId,
    });

    if (!existingMeter) {
      throw new AppError(404, 'METER_NOT_FOUND', 'Electricity meter not found.');
    }

    assertEntityScopeAccess(user, {
      organizationId: existingMeter.organizationId,
      buildingId: existingMeter.buildingId,
      departmentId: existingMeter.departmentId,
      meterId: existingMeter._id,
    });

    if (payload.name !== undefined) existingMeter.name = payload.name;
    if (payload.meterType !== undefined) existingMeter.meterType = payload.meterType;
    if (payload.status !== undefined) existingMeter.status = payload.status;
    if (payload.healthScore !== undefined) existingMeter.healthScore = payload.healthScore;
    if (payload.firmwareVersion !== undefined) {
      existingMeter.firmwareVersion = payload.firmwareVersion;
    }
    if (payload.maxCapacityKw !== undefined) existingMeter.maxCapacityKw = payload.maxCapacityKw;
    if (payload.buildingId !== undefined) {
      existingMeter.buildingId = toObjectId(payload.buildingId);
    }
    if (payload.floorId !== undefined) {
      existingMeter.floorId = toObjectId(payload.floorId);
    }
    if (payload.departmentId !== undefined) {
      existingMeter.departmentId = toObjectId(payload.departmentId);
    }

    await existingMeter.save();

    const populated = await Meter.findById(existingMeter._id)
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber name')
      .populate('departmentId', 'name code')
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
