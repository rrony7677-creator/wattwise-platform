import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';
import { signAuthToken } from '../middleware/auth.middleware.js';
import { seedDatabase } from '../seed/seedData.js';

export const registerSchema = z.object({
  organizationName: z.string().min(2).max(120),
  organizationCode: z
    .string()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9-_]+$/, 'Code must be alphanumeric with hyphens/underscores')
    .optional(),
  industry: z
    .enum(['Commercial', 'Manufacturing', 'University', 'Healthcare', 'Technology'])
    .default('Commercial'),
  address: z.string().min(3).default('100 Energy Plaza, Suite 400'),
  baseTariffPerKwh: z.coerce.number().min(0.01).max(5).default(0.14),
  peakTariffPerKwh: z.coerce.number().min(0.01).max(5).default(0.22),
  carbonFactorKgPerKwh: z.coerce.number().min(0.01).max(5).default(0.42),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  jobTitle: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function sanitizeUser(user: Record<string, unknown>) {
  return {
    _id: String(user._id),
    organizationId: String(user.organizationId),
    name: user.name,
    email: user.email,
    role: user.role,
    assignedBuildingIds: ((user.assignedBuildingIds as unknown[]) || []).map(String),
    assignedDepartmentIds: ((user.assignedDepartmentIds as unknown[]) || []).map(String),
    assignedMeterIds: ((user.assignedMeterIds as unknown[]) || []).map(String),
    jobTitle: user.jobTitle || '',
    phone: user.phone || '',
    preferences: user.preferences || { theme: 'dark', emailNotifications: true },
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = registerSchema.parse(req.body);
    const existingUser = await User.findOne({ email: payload.email.toLowerCase() }).lean();
    if (existingUser) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    }

    const generatedCode =
      payload.organizationCode?.toUpperCase() ||
      `${payload.organizationName
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 6)
        .toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const existingOrg = await Organization.findOne({ code: generatedCode }).lean();
    if (existingOrg) {
      throw new AppError(
        409,
        'ORG_CODE_EXISTS',
        `Organization code "${generatedCode}" is already registered.`
      );
    }

    const organization = await Organization.create({
      name: payload.organizationName,
      code: generatedCode,
      industry: payload.industry,
      address: payload.address,
      contactEmail: payload.email.toLowerCase(),
      baseTariffPerKwh: payload.baseTariffPerKwh,
      peakTariffPerKwh: payload.peakTariffPerKwh,
      carbonFactorKgPerKwh: payload.carbonFactorKgPerKwh,
    });

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await User.create({
      organizationId: organization._id,
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: 'org_admin',
      jobTitle: payload.jobTitle || 'Organization Administrator',
      lastLoginAt: new Date(),
    });

    const token = signAuthToken({
      userId: String(user._id),
      organizationId: String(organization._id),
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user.toObject() as unknown as Record<string, unknown>),
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const organization = await Organization.findById(user.organizationId).lean();
    if (!organization || !organization.isActive) {
      throw new AppError(403, 'ORG_INACTIVE', 'Your organization is currently inactive.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signAuthToken({
      userId: String(user._id),
      organizationId: String(user.organizationId),
      role: user.role,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user.toObject() as unknown as Record<string, unknown>),
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated.');
    }

    const [user, organization] = await Promise.all([
      User.findById(req.user.userId).lean(),
      Organization.findById(req.user.organizationId).lean(),
    ]);

    if (!user || !organization) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User or organization not found.');
    }

    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user as unknown as Record<string, unknown>),
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDemoAccounts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let users = await User.find({ isActive: true })
      .populate('organizationId', 'name code industry')
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    // Auto-seed on first request if deployed to a fresh Vercel + MongoDB Atlas instance
    if (users.length === 0) {
      await seedDatabase({ force: false });
      users = await User.find({ isActive: true })
        .populate('organizationId', 'name code industry')
        .sort({ createdAt: 1 })
        .limit(20)
        .lean();
    }

    const roleDescriptions: Record<string, string> = {
      org_admin: 'Full organization, building, floor, department, meter, user & analytics control',
      facility_manager: 'Meter management, threshold configuration, alert lifecycle & energy reports',
      department_manager: 'Department-scoped consumption, peer comparison, cost & saving insights',
      viewer: 'Read-only access to authorized dashboards, analytics & historical reports',
    };

    const demoAccounts = users.map((u) => {
      const org = u.organizationId as unknown as {
        _id: string;
        name: string;
        code: string;
        industry: string;
      };
      return {
        name: u.name,
        email: u.email,
        password: 'Password123!',
        role: u.role,
        organizationName: org?.name || 'WattWise Org',
        organizationCode: org?.code || 'ORG',
        scopeDescription: roleDescriptions[u.role] || '',
      };
    });

    res.status(200).json({
      success: true,
      data: demoAccounts,
    });
  } catch (error) {
    next(error);
  }
}
