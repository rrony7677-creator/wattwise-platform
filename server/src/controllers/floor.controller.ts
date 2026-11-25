import { Request, Response, NextFunction } from 'express';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { Floor, IFloor } from '../models/Floor.js';
import { Building } from '../models/Building.js';
import { Department } from '../models/Department.js';
import { Meter } from '../models/Meter.js';
import { AppError } from '../middleware/error.middleware.js';
import { invalidateOrgCache } from '../middleware/cache.middleware.js';
import { toObjectId } from '../types/index.js';

const createFloorSchema = z.object({
  buildingId: z.string().min(1),
  floorNumber: z.coerce.number().int().min(-10).max(250),
  name: z.string().min(2).max(120),
  areaSqFt: z.coerce.number().min(50).default(5000),
});

const updateFloorSchema = z.object({
  floorNumber: z.coerce.number().int().min(-10).max(250).optional(),
  name: z.string().min(2).max(120).optional(),
  areaSqFt: z.coerce.number().min(50).optional(),
});

export async function listFloors(
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
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const filter: FilterQuery<IFloor> = {
      organizationId: orgId,
    };

    if (buildingId) {
      filter.buildingId = toObjectId(buildingId);
    } else if (user.role !== 'org_admin' && user.assignedBuildingIds.length > 0) {
      filter.buildingId = { $in: user.assignedBuildingIds.map(toObjectId) };
    }

    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }

    const [floors, total] = await Promise.all([
      Floor.find(filter)
        .populate('buildingId', 'name code buildingType')
        .sort({ buildingId: 1, floorNumber: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Floor.countDocuments(filter),
    ]);

    const floorIds = floors.map((f) => f._id);
    const [deptCounts, meterCounts] = await Promise.all([
      Department.aggregate([
        { $match: { organizationId: orgId, floorId: { $in: floorIds } } },
        { $group: { _id: '$floorId', count: { $sum: 1 } } },
      ]),
      Meter.aggregate([
        { $match: { organizationId: orgId, floorId: { $in: floorIds } } },
        { $group: { _id: '$floorId', count: { $sum: 1 } } },
      ]),
    ]);

    const deptMap = new Map(deptCounts.map((i) => [String(i._id), i.count as number]));
    const meterMap = new Map(meterCounts.map((i) => [String(i._id), i.count as number]));

    const enriched = floors.map((f) => ({
      ...f,
      departmentCount: deptMap.get(String(f._id)) || 0,
      meterCount: meterMap.get(String(f._id)) || 0,
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

export async function createFloor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const payload = createFloorSchema.parse(req.body);

    const building = await Building.findOne({
      _id: toObjectId(payload.buildingId),
      organizationId: orgId,
    }).lean();

    if (!building) {
      throw new AppError(
        400,
        'INVALID_BUILDING',
        'Specified building does not exist in your organization.'
      );
    }

    const existing = await Floor.findOne({
      buildingId: building._id,
      floorNumber: payload.floorNumber,
    }).lean();

    if (existing) {
      throw new AppError(
        409,
        'FLOOR_EXISTS',
        `Floor number ${payload.floorNumber} already exists in building "${building.name}".`
      );
    }

    const created = await Floor.create({
      organizationId: orgId,
      buildingId: building._id,
      floorNumber: payload.floorNumber,
      name: payload.name,
      areaSqFt: payload.areaSqFt,
    });

    const populated = await Floor.findById(created._id)
      .populate('buildingId', 'name code buildingType')
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

export async function updateFloor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const floorId = toObjectId(req.params.id);
    const payload = updateFloorSchema.parse(req.body);

    const updated = await Floor.findOneAndUpdate(
      { _id: floorId, organizationId: toObjectId(user.organizationId) },
      { $set: payload },
      { new: true, runValidators: true }
    )
      .populate('buildingId', 'name code buildingType')
      .lean();

    if (!updated) {
      throw new AppError(404, 'FLOOR_NOT_FOUND', 'Floor not found.');
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

export async function deleteFloor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const floorId = toObjectId(req.params.id);
    const orgId = toObjectId(user.organizationId);

    const [deptCount, meterCount] = await Promise.all([
      Department.countDocuments({ floorId, organizationId: orgId }),
      Meter.countDocuments({ floorId, organizationId: orgId }),
    ]);

    if (deptCount > 0 || meterCount > 0) {
      throw new AppError(
        400,
        'FLOOR_HAS_DEPENDENTS',
        `Cannot delete floor while ${deptCount} department(s) or ${meterCount} meter(s) are assigned to it.`
      );
    }

    const deleted = await Floor.findOneAndDelete({
      _id: floorId,
      organizationId: orgId,
    }).lean();

    if (!deleted) {
      throw new AppError(404, 'FLOOR_NOT_FOUND', 'Floor not found.');
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
