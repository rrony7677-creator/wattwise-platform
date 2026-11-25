import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { User, IUser } from '../models/User.js';
import { Building } from '../models/Building.js';
import { Department } from '../models/Department.js';
import { Meter } from '../models/Meter.js';
import { AppError } from '../middleware/error.middleware.js';
import { toObjectId } from '../types/index.js';

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100).default('Password123!'),
  role: z.enum(['org_admin', 'facility_manager', 'department_manager', 'viewer']),
  assignedBuildingIds: z.array(z.string()).default([]),
  assignedDepartmentIds: z.array(z.string()).default([]),
  assignedMeterIds: z.array(z.string()).default([]),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['org_admin', 'facility_manager', 'department_manager', 'viewer']).optional(),
  assignedBuildingIds: z.array(z.string()).optional(),
  assignedDepartmentIds: z.array(z.string()).optional(),
  assignedMeterIds: z.array(z.string()).optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      emailNotifications: z.boolean().optional(),
    })
    .optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(100).optional(),
});

async function validateAssignedScopesBelongToOrg(
  organizationId: string,
  buildingIds?: string[],
  departmentIds?: string[],
  meterIds?: string[]
): Promise<void> {
  const orgObjId = toObjectId(organizationId);

  if (buildingIds && buildingIds.length > 0) {
    const count = await Building.countDocuments({
      _id: { $in: buildingIds.map(toObjectId) },
      organizationId: orgObjId,
    });
    if (count !== buildingIds.length) {
      throw new AppError(
        400,
        'INVALID_BUILDING_SCOPE',
        'One or more assigned buildings do not belong to your organization.'
      );
    }
  }

  if (departmentIds && departmentIds.length > 0) {
    const count = await Department.countDocuments({
      _id: { $in: departmentIds.map(toObjectId) },
      organizationId: orgObjId,
    });
    if (count !== departmentIds.length) {
      throw new AppError(
        400,
        'INVALID_DEPARTMENT_SCOPE',
        'One or more assigned departments do not belong to your organization.'
      );
    }
  }

  if (meterIds && meterIds.length > 0) {
    const count = await Meter.countDocuments({
      _id: { $in: meterIds.map(toObjectId) },
      organizationId: orgObjId,
    });
    if (count !== meterIds.length) {
      throw new AppError(
        400,
        'INVALID_METER_SCOPE',
        'One or more assigned meters do not belong to your organization.'
      );
    }
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const roleFilter = typeof req.query.role === 'string' ? req.query.role.trim() : '';

    const filter: FilterQuery<IUser> = {
      organizationId: toObjectId(user.organizationId),
    };

    if (roleFilter && ['org_admin', 'facility_manager', 'department_manager', 'viewer'].includes(roleFilter)) {
      filter.role = roleFilter as IUser['role'];
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { jobTitle: { $regex: q, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: users,
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

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = req.user!;
    const payload = createUserSchema.parse(req.body);

    const existing = await User.findOne({ email: payload.email.toLowerCase() }).lean();
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'A user with this email already exists.');
    }

    await validateAssignedScopesBelongToOrg(
      admin.organizationId,
      payload.assignedBuildingIds,
      payload.assignedDepartmentIds,
      payload.assignedMeterIds
    );

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const created = await User.create({
      organizationId: toObjectId(admin.organizationId),
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: payload.role,
      assignedBuildingIds: payload.assignedBuildingIds.map(toObjectId),
      assignedDepartmentIds: payload.assignedDepartmentIds.map(toObjectId),
      assignedMeterIds: payload.assignedMeterIds.map(toObjectId),
      jobTitle: payload.jobTitle || '',
      phone: payload.phone || '',
      isActive: true,
    });

    const userObj = created.toObject();
    const { passwordHash: _removed, ...safeUser } = userObj;

    res.status(201).json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = req.user!;
    const targetUserId = req.params.id;
    const payload = updateUserSchema.parse(req.body);

    const targetUser = await User.findOne({
      _id: toObjectId(targetUserId),
      organizationId: toObjectId(admin.organizationId),
    });

    if (!targetUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found in your organization.');
    }

    if (
      String(targetUser._id) === admin.userId &&
      (payload.isActive === false || (payload.role && payload.role !== 'org_admin'))
    ) {
      throw new AppError(
        400,
        'SELF_DEMOTION_FORBIDDEN',
        'You cannot deactivate or remove Organization Admin privileges from your own account.'
      );
    }

    await validateAssignedScopesBelongToOrg(
      admin.organizationId,
      payload.assignedBuildingIds,
      payload.assignedDepartmentIds,
      payload.assignedMeterIds
    );

    if (payload.name !== undefined) targetUser.name = payload.name;
    if (payload.role !== undefined) targetUser.role = payload.role;
    if (payload.assignedBuildingIds !== undefined) {
      targetUser.assignedBuildingIds = payload.assignedBuildingIds.map(toObjectId);
    }
    if (payload.assignedDepartmentIds !== undefined) {
      targetUser.assignedDepartmentIds = payload.assignedDepartmentIds.map(toObjectId);
    }
    if (payload.assignedMeterIds !== undefined) {
      targetUser.assignedMeterIds = payload.assignedMeterIds.map(toObjectId);
    }
    if (payload.jobTitle !== undefined) targetUser.jobTitle = payload.jobTitle;
    if (payload.phone !== undefined) targetUser.phone = payload.phone;
    if (payload.isActive !== undefined) targetUser.isActive = payload.isActive;
    if (payload.password) {
      targetUser.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    await targetUser.save();
    const { passwordHash: _removed, ...safeUser } = targetUser.toObject();

    res.status(200).json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authUser = req.user!;
    const payload = updateProfileSchema.parse(req.body);

    const userDoc = await User.findById(authUser.userId);
    if (!userDoc) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User account not found.');
    }

    if (payload.name !== undefined) userDoc.name = payload.name;
    if (payload.jobTitle !== undefined) userDoc.jobTitle = payload.jobTitle;
    if (payload.phone !== undefined) userDoc.phone = payload.phone;
    if (payload.preferences) {
      if (payload.preferences.theme !== undefined) {
        userDoc.preferences.theme = payload.preferences.theme;
      }
      if (payload.preferences.emailNotifications !== undefined) {
        userDoc.preferences.emailNotifications = payload.preferences.emailNotifications;
      }
    }

    if (payload.newPassword) {
      if (payload.currentPassword) {
        const matches = await bcrypt.compare(payload.currentPassword, userDoc.passwordHash);
        if (!matches) {
          throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect.');
        }
      }
      userDoc.passwordHash = await bcrypt.hash(payload.newPassword, 10);
    }

    await userDoc.save();
    const { passwordHash: _removed, ...safeUser } = userDoc.toObject();

    res.status(200).json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
}
