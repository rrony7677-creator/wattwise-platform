import { Schema, model, Types, Document } from 'mongoose';

export type ThresholdScopeType = 'building' | 'department' | 'meter';
export type ThresholdMetric = 'consumption_kwh' | 'cost_usd' | 'unusual_spike_pct';
export type ThresholdPeriod = 'hourly' | 'daily' | 'monthly';

export interface IThreshold {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  scopeType: ThresholdScopeType;
  buildingId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  meterId?: Types.ObjectId;
  metric: ThresholdMetric;
  period: ThresholdPeriod;
  warningLimit: number;
  criticalLimit: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ThresholdDocument = IThreshold & Document;

const thresholdSchema = new Schema<IThreshold>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    scopeType: {
      type: String,
      enum: ['building', 'department', 'meter'],
      required: true,
    },
    buildingId: { type: Schema.Types.ObjectId, ref: 'Building' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    meterId: { type: Schema.Types.ObjectId, ref: 'Meter' },
    metric: {
      type: String,
      enum: ['consumption_kwh', 'cost_usd', 'unusual_spike_pct'],
      default: 'consumption_kwh',
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'monthly'],
      default: 'hourly',
    },
    warningLimit: { type: Number, required: true, min: 0 },
    criticalLimit: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

thresholdSchema.index({ organizationId: 1, scopeType: 1, isActive: 1 });

export const Threshold = model<IThreshold>('Threshold', thresholdSchema);
