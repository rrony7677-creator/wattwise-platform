import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from './error.middleware.js';
import { AuthUserContext, UserRole } from '../types/index.js';

export interface JwtPayloadClaims {
  userId: string;
  organizationId: string;
  role: UserRole;
}

export function signAuthToken(payload: JwtPayloadClaims): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies Bearer JWT (or ?token= query param for CSV downloads)
 * and attaches the live multi-tenant user & scope context to req.user.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (typeof req.query.token === 'string' && req.query.token.trim() !== '') {
      token = req.query.token.trim();
    }

    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication token is required.');
    }

    let decoded: JwtPayloadClaims;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayloadClaims;
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token.');
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user || !user.isActive) {
      throw new AppError(401, 'USER_INACTIVE', 'User account not found or deactivated.');
    }

    const userContext: AuthUserContext = {
      userId: String(user._id),
      organizationId: String(user.organizationId),
      email: user.email,
      name: user.name,
      role: user.role,
      assignedBuildingIds: (user.assignedBuildingIds || []).map((id) => String(id)),
      assignedDepartmentIds: (user.assignedDepartmentIds || []).map((id) => String(id)),
      assignedMeterIds: (user.assignedMeterIds || []).map((id) => String(id)),
    };

    req.user = userContext;
    next();
  } catch (error) {
    next(error);
  }
}
