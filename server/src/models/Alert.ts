import { Schema, model, Types, Document } from 'mongoose';
import { AlertSeverity, AlertStatus, AlertType } from '../types/index.js';

export interface IAlert {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  meterId?: Types.ObjectId;
  thresholdId?: Types.ObjectId;
  energyRecordId?: Types.ObjectId;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  actualValue: number;
  thresholdValue: number;
  timestamp: Date;
  acknowledgedBy?: Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertDocument = IAlert & Document;

const alertSchema = new Schema<IAlert>(
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
    floorId: { type: Schema.Types.ObjectId, ref: 'Floor' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    meterId: { type: Schema.Types.ObjectId, ref: 'Meter' },
    thresholdId: { type: Schema.Types.ObjectId, ref: 'Threshold' },
    energyRecordId: { type: Schema.Types.ObjectId, ref: 'EnergyRecord' },
    type: {
      type: String,
      enum: ['high_usage', 'unusual_consumption', 'meter_health', 'budget_warning'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['warning', 'critical'],
      required: true,
    },
    status: {
      type: String,
      enum: ['New', 'Acknowledged', 'Resolved'],
      default: 'New',
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    actualValue: { type: Number, required: true },
    thresholdValue: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

alertSchema.index({ organizationId: 1, status: 1, timestamp: -1 });
alertSchema.index({ organizationId: 1, buildingId: 1 });
alertSchema.index({ organizationId: 1, meterId: 1 });

export const Alert = model<IAlert>('Alert', alertSchema);
