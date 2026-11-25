import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Organization } from '../models/Organization.js';
import { Building } from '../models/Building.js';
import { Floor } from '../models/Floor.js';
import { Department } from '../models/Department.js';
import { Meter } from '../models/Meter.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';
import { invalidateOrgCache } from '../middleware/cache.middleware.js';
import { toObjectId } from '../types/index.js';

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  industry: z
    .enum(['Commercial', 'Manufacturing', 'University', 'Healthcare', 'Technology'])
    .optional(),
  address: z.string().min(3).max(250).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(40).optional(),
  currency: z.string().min(1).max(10).optional(),
  baseTariffPerKwh: z.coerce.number().min(0.01).max(10).optional(),
  peakTariffPerKwh: z.coerce.number().min(0.01).max(10).optional(),
  carbonFactorKgPerKwh: z.coerce.number().min(0.01).max(10).optional(),
  timezone: z.string().max(60).optional(),
});

const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
  code: z
    .string()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9-_]+$/),
  industry: z
    .enum(['Commercial', 'Manufacturing', 'University', 'Healthcare', 'Technology'])
    .default('Commercial'),
  address: z.string().min(3).max(250),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  currency: z.string().default('USD'),
  baseTariffPerKwh: z.coerce.number().min(0.01).max(10).default(0.14),
  peakTariffPerKwh: z.coerce.number().min(0.01).max(10).default(0.22),
  carbonFactorKgPerKwh: z.coerce.number().min(0.01).max(10).default(0.42),
  timezone: z.string().default('UTC'),
});

export async function getCurrentOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = toObjectId(req.user!.organizationId);
    const [organization, buildingCount, floorCount, departmentCount, meterCount, userCount] =
      await Promise.all([
        Organization.findById(orgId).lean(),
        Building.countDocuments({ organizationId: orgId, isActive: true }),
        Floor.countDocuments({ organizationId: orgId }),
        Department.countDocuments({ organizationId: orgId }),
        Meter.countDocuments({ organizationId: orgId }),
        User.countDocuments({ organizationId: orgId, isActive: true }),
      ]);

    if (!organization) {
      throw new AppError(404, 'ORG_NOT_FOUND', 'Organization not found.');
    }

    res.status(200).json({
      success: true,
      data: {
        ...organization,
        stats: {
          buildingCount,
          floorCount,
          departmentCount,
          meterCount,
          userCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCurrentOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = toObjectId(req.user!.organizationId);
    const payload = updateOrgSchema.parse(req.body);

    const updated = await Organization.findByIdAndUpdate(
      orgId,
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      throw new AppError(404, 'ORG_NOT_FOUND', 'Organization not found.');
    }

    invalidateOrgCache(req.user!.organizationId);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function createOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = createOrgSchema.parse(req.body);
    const existing = await Organization.findOne({ code: payload.code.toUpperCase() }).lean();
    if (existing) {
      throw new AppError(409, 'ORG_CODE_EXISTS', 'An organization with this code already exists.');
    }

    const created = await Organization.create({
      ...payload,
      code: payload.code.toUpperCase(),
    });

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    next(error);
  }
}
