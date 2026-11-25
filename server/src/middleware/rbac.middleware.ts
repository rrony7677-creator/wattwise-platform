import { Request, Response, NextFunction } from 'express';
import { FilterQuery, Types } from 'mongoose';
import { AppError } from './error.middleware.js';
import { AuthUserContext, toObjectId, UserRole } from '../types/index.js';

/**
 * Ensures the authenticated user holds one of the allowed roles.
 * Also blocks any mutating request (POST/PUT/PATCH/DELETE) for 'viewer'.
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
      return;
    }

    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
    if (user.role === 'viewer' && isMutation) {
      next(
        new AppError(
          403,
          'VIEWER_READ_ONLY',
          'Viewers have read-only access and cannot modify data.'
        )
      );
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      next(
        new AppError(
          403,
          'FORBIDDEN_ROLE',
          `Access denied. Required role(s): ${allowedRoles.join(', ')}`
        )
      );
      return;
    }

    next();
  };
}

/**
 * Builds a strict multi-tenant & role-scoped MongoDB query filter
 * for collections that have organizationId, buildingId, departmentId, and/or meterId.
 *
 * Rules from WattWise.md Section 2 & Section 5:
 * 1. Organization users must ONLY access their organization's data.
 * 2. Department managers must ONLY access authorized department information.
 * 3. Facility managers must ONLY configure/access authorized buildings & meters (when scoped).
 */
export interface ScopeFilterOptions {
  includeDepartmentScope?: boolean;
  includeBuildingScope?: boolean;
  includeMeterScope?: boolean;
  departmentField?: string;
  buildingField?: string;
  meterField?: string;
}

export function buildScopedFilter<T = Record<string, unknown>>(
  user: AuthUserContext,
  options: ScopeFilterOptions = {}
): FilterQuery<T> {
  const {
    includeDepartmentScope = true,
    includeBuildingScope = true,
    includeMeterScope = false,
    departmentField = 'departmentId',
    buildingField = 'buildingId',
    meterField = 'meterId',
  } = options;

  const filter: Record<string, unknown> = {
    organizationId: toObjectId(user.organizationId),
  };

  if (user.role === 'department_manager' && includeDepartmentScope) {
    if (user.assignedDepartmentIds.length > 0) {
      filter[departmentField] = {
        $in: user.assignedDepartmentIds.map((id) => toObjectId(id)),
      };
    } else if (user.assignedBuildingIds.length > 0 && includeBuildingScope) {
      filter[buildingField] = {
        $in: user.assignedBuildingIds.map((id) => toObjectId(id)),
      };
    }
  } else if (user.role === 'facility_manager') {
    if (includeMeterScope && user.assignedMeterIds.length > 0) {
      filter[meterField] = {
        $in: user.assignedMeterIds.map((id) => toObjectId(id)),
      };
    } else if (includeBuildingScope && user.assignedBuildingIds.length > 0) {
      filter[buildingField] = {
        $in: user.assignedBuildingIds.map((id) => toObjectId(id)),
      };
    }
  } else if (user.role === 'viewer') {
    if (includeDepartmentScope && user.assignedDepartmentIds.length > 0) {
      filter[departmentField] = {
        $in: user.assignedDepartmentIds.map((id) => toObjectId(id)),
      };
    } else if (includeBuildingScope && user.assignedBuildingIds.length > 0) {
      filter[buildingField] = {
        $in: user.assignedBuildingIds.map((id) => toObjectId(id)),
      };
    }
  }

  return filter as FilterQuery<T>;
}

/**
 * Verifies whether a Facility Manager or Department Manager is authorized
 * to access/configure a specific building, department, or meter.
 */
export function assertEntityScopeAccess(
  user: AuthUserContext,
  entity: {
    organizationId: Types.ObjectId | string;
    buildingId?: Types.ObjectId | string;
    departmentId?: Types.ObjectId | string;
    meterId?: Types.ObjectId | string;
  }
): void {
  if (String(entity.organizationId) !== String(user.organizationId)) {
    throw new AppError(
      403,
      'CROSS_ORG_FORBIDDEN',
      'You cannot access resources belonging to another organization.'
    );
  }

  if (user.role === 'org_admin') {
    return;
  }

  if (user.role === 'department_manager') {
    if (
      user.assignedDepartmentIds.length > 0 &&
      entity.departmentId &&
      !user.assignedDepartmentIds.includes(String(entity.departmentId))
    ) {
      throw new AppError(
        403,
        'FORBIDDEN_DEPARTMENT_SCOPE',
        'Department managers can only access their authorized departments.'
      );
    }
  }

  if (user.role === 'facility_manager') {
    if (
      user.assignedMeterIds.length > 0 &&
      entity.meterId &&
      !user.assignedMeterIds.includes(String(entity.meterId))
    ) {
      throw new AppError(
        403,
        'FORBIDDEN_METER_SCOPE',
        'Facility managers can only configure authorized meters.'
      );
    }
    if (
      user.assignedBuildingIds.length > 0 &&
      entity.buildingId &&
      !user.assignedBuildingIds.includes(String(entity.buildingId))
    ) {
      throw new AppError(
        403,
        'FORBIDDEN_BUILDING_SCOPE',
        'Facility managers can only configure resources in authorized buildings.'
      );
    }
  }
}
