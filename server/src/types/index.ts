import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'org_admin' | 'facility_manager' | 'department_manager' | 'viewer';
export type MeterStatus = 'active' | 'warning' | 'offline' | 'maintenance';
export type AlertStatus = 'New' | 'Acknowledged' | 'Resolved';
export type AlertType = 'high_usage' | 'unusual_consumption' | 'meter_health' | 'budget_warning';
export type AlertSeverity = 'warning' | 'critical';

export interface AuthUserContext {
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  assignedBuildingIds: string[];
  assignedDepartmentIds: string[];
  assignedMeterIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
    }
  }
}

export type AuthenticatedRequest = Request & {
  user: AuthUserContext;
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  cached?: boolean;
}

export interface ApiResponseEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function toObjectId(id: string | string[] | Types.ObjectId): Types.ObjectId {
  if (Array.isArray(id)) {
    return new Types.ObjectId(id[0]);
  }
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
}
