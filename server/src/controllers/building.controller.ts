import { Request, Response, NextFunction } from 'express';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { Building, IBuilding } from '../models/Building.js';
import { Floor } from '../models/Floor.js';
import { Department } from '../models/Department.js';
import { Meter } from '../models/Meter.js';
import { EnergyRecord } from '../models/EnergyRecord.js';
import { AppError } from '../middleware/error.middleware.js';
import { assertEntityScopeAccess } from '../middleware/rbac.middleware.js';
import { invalidateOrgCache } from '../middleware/cache.middleware.js';
import { toObjectId } from '../types/index.js';

const createBuildingSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(24),
  address: z.string().min(3).max(250),
  buildingType: z
    .enum(['Office', 'Factory', 'Academic', 'DataCenter', 'Warehouse'])
    .default('Office'),
  totalFloors: z.coerce.number().int().min(1).max(200).default(3),
  areaSqFt: z.coerce.number().min(100).default(25000),
  baselineDailyKwh: z.coerce.number().min(0).default(850),
});

const updateBuildingSchema = createBuildingSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function listBuildings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const orgId = toObjectId(user.organizationId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const buildingType =
      typeof req.query.buildingType === 'string' ? req.query.buildingType.trim() : '';

    const filter: FilterQuery<IBuilding> = {
      organizationId: orgId,
      isActive: true,
    };

    if (user.role !== 'org_admin' && user.assignedBuildingIds.length > 0) {
      filter._id = { $in: user.assignedBuildingIds.map(toObjectId) };
    }

    if (
      buildingType &&
      ['Office', 'Factory', 'Academic', 'DataCenter', 'Warehouse'].includes(buildingType)
    ) {
      filter.buildingType = buildingType as IBuilding['buildingType'];
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
      ];
    }

    const [buildings, total] = await Promise.all([
      Building.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Building.countDocuments(filter),
    ]);

    const buildingIds = buildings.map((b) => b._id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [floorCounts, deptCounts, meterCounts, usageTotals] = await Promise.all([
      Floor.aggregate([
        { $match: { organizationId: orgId, buildingId: { $in: buildingIds } } },
        { $group: { _id: '$buildingId', count: { $sum: 1 } } },
      ]),
      Department.aggregate([
        { $match: { organizationId: orgId, buildingId: { $in: buildingIds } } },
        { $group: { _id: '$buildingId', count: { $sum: 1 } } },
      ]),
      Meter.aggregate([
        { $match: { organizationId: orgId, buildingId: { $in: buildingIds } } },
        { $group: { _id: '$buildingId', count: { $sum: 1 } } },
      ]),
      EnergyRecord.aggregate([
        {
          $match: {
            organizationId: orgId,
            buildingId: { $in: buildingIds },
            timestamp: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: '$buildingId',
            totalConsumptionKwh: { $sum: '$consumptionKwh' },
            totalCostUsd: { $sum: '$estimatedCost' },
          },
        },
      ]),
    ]);

    const floorMap = new Map(floorCounts.map((i) => [String(i._id), i.count as number]));
    const deptMap = new Map(deptCounts.map((i) => [String(i._id), i.count as number]));
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

    const enriched = buildings.map((b) => {
      const idStr = String(b._id);
      const usage = usageMap.get(idStr) || { kwh: 0, cost: 0 };
      return {
        ...b,
        floorCount: floorMap.get(idStr) || 0,
        departmentCount: deptMap.get(idStr) || 0,
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

export async function getBuildingById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const buildingId = toObjectId(req.params.id);
    const building = await Building.findOne({
      _id: buildingId,
      organizationId: toObjectId(user.organizationId),
    }).lean();

    if (!building) {
      throw new AppError(404, 'BUILDING_NOT_FOUND', 'Building not found.');
    }

    assertEntityScopeAccess(user, {
      organizationId: building.organizationId,
      buildingId: building._id,
    });

    const [floors, departmentCount, meterCount] = await Promise.all([
      Floor.find({ buildingId: building._id }).sort({ floorNumber: 1 }).lean(),
      Department.countDocuments({ buildingId: building._id }),
      Meter.countDocuments({ buildingId: building._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...building,
        floors,
        floorCount: floors.length,
        departmentCount,
        meterCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createBuilding(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const payload = createBuildingSchema.parse(req.body);
    const orgId = toObjectId(user.organizationId);

    const existing = await Building.findOne({
      organizationId: orgId,
      code: payload.code.toUpperCase(),
    }).lean();

    if (existing) {
      throw new AppError(
        409,
        'BUILDING_CODE_EXISTS',
        `Building with code "${payload.code.toUpperCase()}" already exists in your organization.`
      );
    }

    const building = await Building.create({
      ...payload,
      code: payload.code.toUpperCase(),
      organizationId: orgId,
      isActive: true,
    });

    invalidateOrgCache(user.organizationId);

    res.status(201).json({
      success: true,
      data: building,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBuilding(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const buildingId = toObjectId(req.params.id);
    const payload = updateBuildingSchema.parse(req.body);

    const updateFields: Record<string, unknown> = { ...payload };
    if (payload.code) {
      updateFields.code = payload.code.toUpperCase();
    }

    const updated = await Building.findOneAndUpdate(
      { _id: buildingId, organizationId: toObjectId(user.organizationId) },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      throw new AppError(404, 'BUILDING_NOT_FOUND', 'Building not found.');
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

export async function deleteBuilding(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const buildingId = toObjectId(req.params.id);
    const orgId = toObjectId(user.organizationId);

    const building = await Building.findOne({
      _id: buildingId,
      organizationId: orgId,
    });

    if (!building) {
      throw new AppError(404, 'BUILDING_NOT_FOUND', 'Building not found.');
    }

    building.isActive = false;
    await building.save();

    invalidateOrgCache(user.organizationId);

    res.status(200).json({
      success: true,
      data: { _id: building._id, isActive: false },
    });
  } catch (error) {
    next(error);
  }
}
