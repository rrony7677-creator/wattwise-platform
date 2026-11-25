import { Schema, model, Types, Document } from 'mongoose';

export type RecordSource = 'seed' | 'manual' | 'iot_simulator';

export interface IEnergyRecord {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorId: Types.ObjectId;
  departmentId: Types.ObjectId;
  meterId: Types.ObjectId;
  timestamp: Date;
  consumptionKwh: number;
  estimatedCost: number;
  carbonKg: number;
  peakDemandKw: number;
  powerFactor: number;
  isAnomaly: boolean;
  anomalyScore: number;
  source: RecordSource;
  createdAt: Date;
}

export type EnergyRecordDocument = IEnergyRecord & Document;

const energyRecordSchema = new Schema<IEnergyRecord>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
    },
    floorId: {
      type: Schema.Types.ObjectId,
      ref: 'Floor',
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    meterId: {
      type: Schema.Types.ObjectId,
      ref: 'Meter',
      required: true,
    },
    timestamp: { type: Date, required: true },
    consumptionKwh: { type: Number, required: true, min: 0 },
    estimatedCost: { type: Number, required: true, min: 0 },
    carbonKg: { type: Number, required: true, min: 0 },
    peakDemandKw: { type: Number, required: true, min: 0, default: 0 },
    powerFactor: { type: Number, required: true, min: 0, max: 1, default: 0.94 },
    isAnomaly: { type: Boolean, default: false },
    anomalyScore: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ['seed', 'manual', 'iot_simulator'],
      default: 'seed',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// 1. Prevent duplicate energy records for the same meter + timestamp (Section 5)
energyRecordSchema.index({ meterId: 1, timestamp: 1 }, { unique: true });

// 2. Time-series primary dashboard & analytics compound indexes (Section 4)
energyRecordSchema.index({ organizationId: 1, timestamp: -1 });
energyRecordSchema.index({ organizationId: 1, buildingId: 1, timestamp: -1 });
energyRecordSchema.index({ organizationId: 1, departmentId: 1, timestamp: -1 });
energyRecordSchema.index({ organizationId: 1, isAnomaly: 1, timestamp: -1 });

export const EnergyRecord = model<IEnergyRecord>('EnergyRecord', energyRecordSchema);
