import { Request, Response, NextFunction } from 'express';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { Department, IDepartment } from '../models/Department.js';
import { Building } from '../models/Building.js';
import { Floor } from '../models/Floor.js';
import { Meter } from '../models/Meter.js';
import { EnergyRecord } from '../models/EnergyRecord.js';
import { AppError } from '../middleware/error.middleware.js';
import { invalidateOrgCache } from '../middleware/cache.middleware.js';
import { toObjectId } from '../types/index.js';

const createDepartmentSchema = z.object({
  buildingId: z.string().min(1),
  floorId: z.string().min(1),
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(24),
  managerName: z.string().max(100).optional(),
  monthlyBudgetUsd: z.coerce.number().min(0).default(1500),
  headcount: z.coerce.number().int().min(1).default(15),
  operatingHours: z
    .object({
      startHour: z.coerce.number().int().min(0).max(23).default(8),
      endHour: z.coerce.number().int().min(0).max(23).default(18),
    })
    .optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

export async function listDepartments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const buildingId =
      typeof req.query.buildingId === 'string' ? req.query.buildingId.trim() : '';
    const floorId = typeof req.query.floorId === 'string' ? req.query.floorId.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const filter: FilterQuery<IDepartment> = {
      organizationId: orgId,
    };

    if (user.role === 'department_manager' && user.assignedDepartmentIds.length > 0) {
      filter._id = { $in: user.assignedDepartmentIds.map(toObjectId) };
    } else if (user.role !== 'org_admin' && user.assignedBuildingIds.length > 0) {
      filter.buildingId = { $in: user.assignedBuildingIds.map(toObjectId) };
    }

    if (buildingId) {
      filter.buildingId = toObjectId(buildingId);
    }

    if (floorId) {
      filter.floorId = toObjectId(floorId);
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { managerName: { $regex: q, $options: 'i' } },
      ];
    }

    const [departments, total] = await Promise.all([
      Department.find(filter)
        .populate('buildingId', 'name code')
        .populate('floorId', 'floorNumber name')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Department.countDocuments(filter),
    ]);

    const deptIds = departments.map((d) => d._id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [meterCounts, usageTotals] = await Promise.all([
      Meter.aggregate([
        { $match: { organizationId: orgId, departmentId: { $in: deptIds } } },
        { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      ]),
      EnergyRecord.aggregate([
        {
          $match: {
            organizationId: orgId,
            departmentId: { $in: deptIds },
            timestamp: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: '$departmentId',
            totalConsumptionKwh: { $sum: '$consumptionKwh' },
            totalCostUsd: { $sum: '$estimatedCost' },
          },
        },
      ]),
    ]);

    const meterMap = new Map(meterCounts.map((i) => [String(i._id), i.count as number]));
    const usageMap = new Map(
      usageTotals.map((i) => [
        String(i._id),
        {
          kwh: Number((i.totalConsumptionKwh || 0).toFixed(2)),
          cost: Number((i.totalCostUsd || 0).toFixed(2)),
        },
      ])
    );

    const enriched = departments.map((d) => {
      const idStr = String(d._id);
      const usage = usageMap.get(idStr) || { kwh: 0, cost: 0 };
      return {
        ...d,
        meterCount: meterMap.get(idStr) || 0,
        totalConsumptionKwh: usage.kwh,
        totalCostUsd: usage.cost,
      };
    });

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

export async function createDepartment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const payload = createDepartmentSchema.parse(req.body);

    const [building, floor] = await Promise.all([
      Building.findOne({ _id: toObjectId(payload.buildingId), organizationId: orgId }).lean(),
      Floor.findOne({ _id: toObjectId(payload.floorId), organizationId: orgId }).lean(),
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

    const existing = await Department.findOne({
      organizationId: orgId,
      code: payload.code.toUpperCase(),
    }).lean();

    if (existing) {
      throw new AppError(
        409,
        'DEPT_CODE_EXISTS',
        `Department with code "${payload.code.toUpperCase()}" already exists.`
      );
    }

    const created = await Department.create({
      organizationId: orgId,
      buildingId: building._id,
      floorId: floor._id,
      name: payload.name,
      code: payload.code.toUpperCase(),
      managerName: payload.managerName || '',
      monthlyBudgetUsd: payload.monthlyBudgetUsd,
      headcount: payload.headcount,
      operatingHours: payload.operatingHours || { startHour: 8, endHour: 18 },
    });

    const populated = await Department.findById(created._id)
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber name')
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

export async function updateDepartment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const deptId = toObjectId(req.params.id);
    const orgId = toObjectId(user.organizationId);
    const payload = updateDepartmentSchema.parse(req.body);

    const updateFields: Record<string, unknown> = { ...payload };
    if (payload.code) {
      updateFields.code = payload.code.toUpperCase();
    }
    if (payload.buildingId) {
      updateFields.buildingId = toObjectId(payload.buildingId);
    }
    if (payload.floorId) {
      updateFields.floorId = toObjectId(payload.floorId);
    }

    const updated = await Department.findOneAndUpdate(
      { _id: deptId, organizationId: orgId },
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate('buildingId', 'name code')
      .populate('floorId', 'floorNumber name')
      .lean();

    if (!updated) {
      throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
    }

    invalidateOrgCache(user.organizationId);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDepartment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const deptId = toObjectId(req.params.id);
    const orgId = toObjectId(user.organizationId);

    const meterCount = await Meter.countDocuments({
      departmentId: deptId,
      organizationId: orgId,
    });

    if (meterCount > 0) {
      throw new AppError(
        400,
        'DEPARTMENT_HAS_METERS',
        `Cannot delete department while ${meterCount} meter(s) are assigned to it.`
      );
    }

    const deleted = await Department.findOneAndDelete({
      _id: deptId,
      organizationId: orgId,
    }).lean();

    if (!deleted) {
      throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Department not found.');
    }

    invalidateOrgCache(user.organizationId);

    res.status(200).json({
      success: true,
      data: { _id: deleted._id, deleted: true },
    });
  } catch (error) {
    next(error);
  }
}
