import { Schema, model, Types, Document } from 'mongoose';

export interface IDepartment {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  name: string;
  code: string;
  managerName?: string;
  monthlyBudgetUsd: number;
  headcount: number;
  operatingHours: {
    startHour: number;
    endHour: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type DepartmentDocument = IDepartment & Document;

const departmentSchema = new Schema<IDepartment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
      index: true,
    },
    floorId: {
      type: Schema.Types.ObjectId,
      ref: 'Floor',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    managerName: { type: String, default: '' },
    monthlyBudgetUsd: { type: Number, required: true, min: 0, default: 1500 },
    headcount: { type: Number, required: true, min: 1, default: 15 },
    operatingHours: {
      startHour: { type: Number, default: 8, min: 0, max: 23 },
      endHour: { type: Number, default: 18, min: 0, max: 23 },
    },
  },
  { timestamps: true }
);

departmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });
departmentSchema.index({ buildingId: 1, floorId: 1 });

export const Department = model<IDepartment>('Department', departmentSchema);
