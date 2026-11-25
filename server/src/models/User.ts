import { Schema, model, Types, Document } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUser {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  assignedBuildingIds: Types.ObjectId[];
  assignedDepartmentIds: Types.ObjectId[];
  assignedMeterIds: Types.ObjectId[];
  jobTitle?: string;
  phone?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    emailNotifications: boolean;
  };
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = IUser & Document;

const userSchema = new Schema<IUser>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['org_admin', 'facility_manager', 'department_manager', 'viewer'],
      required: true,
      default: 'viewer',
    },
    assignedBuildingIds: [{ type: Schema.Types.ObjectId, ref: 'Building' }],
    assignedDepartmentIds: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    assignedMeterIds: [{ type: Schema.Types.ObjectId, ref: 'Meter' }],
    jobTitle: { type: String, default: '' },
    phone: { type: String, default: '' },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'dark',
      },
      emailNotifications: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ organizationId: 1, role: 1 });

export const User = model<IUser>('User', userSchema);
