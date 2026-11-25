import { Schema, model, Types, Document } from 'mongoose';
import { MeterStatus } from '../types/index.js';

export type MeterType = 'Main' | 'Submeter' | 'HVAC' | 'Lighting' | 'Machinery' | 'ServerRack';

export interface IMeter {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  departmentId: Types.ObjectId;
  meterCode: string;
  name: string;
  meterType: MeterType;
  unit: 'kWh';
  status: MeterStatus;
  healthScore: number;
  lastReadingAt?: Date;
  firmwareVersion: string;
  installationDate: Date;
  maxCapacityKw: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MeterDocument = IMeter & Document;

const meterSchema = new Schema<IMeter>(
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
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    meterCode: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    meterType: {
      type: String,
      enum: ['Main', 'Submeter', 'HVAC', 'Lighting', 'Machinery', 'ServerRack'],
      default: 'Submeter',
    },
    unit: { type: String, enum: ['kWh'], default: 'kWh' },
    status: {
      type: String,
      enum: ['active', 'warning', 'offline', 'maintenance'],
      default: 'active',
    },
    healthScore: { type: Number, required: true, min: 0, max: 100, default: 98 },
    lastReadingAt: { type: Date },
    firmwareVersion: { type: String, default: 'v4.2.1' },
    installationDate: { type: Date, default: Date.now },
    maxCapacityKw: { type: Number, default: 100, min: 1 },
  },
  { timestamps: true }
);

meterSchema.index({ organizationId: 1, meterCode: 1 }, { unique: true });

export const Meter = model<IMeter>('Meter', meterSchema);
