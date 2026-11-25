import { Schema, model, Types, Document } from 'mongoose';

export type ScheduledReportType =
  | 'executive_summary'
  | 'building_breakdown'
  | 'department_cost'
  | 'anomaly_audit'
  | 'carbon_esg';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'CSV' | 'PDF';

export interface IScheduledReport {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  name: string;
  reportType: ScheduledReportType;
  frequency: ReportFrequency;
  format: ReportFormat;
  scope: {
    buildingId?: Types.ObjectId;
    departmentId?: Types.ObjectId;
  };
  recipients: string[];
  lastGeneratedAt?: Date;
  nextRunAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduledReportDocument = IScheduledReport & Document;

const scheduledReportSchema = new Schema<IScheduledReport>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    reportType: {
      type: String,
      enum: [
        'executive_summary',
        'building_breakdown',
        'department_cost',
        'anomaly_audit',
        'carbon_esg',
      ],
      default: 'executive_summary',
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly',
    },
    format: {
      type: String,
      enum: ['CSV', 'PDF'],
      default: 'PDF',
    },
    scope: {
      buildingId: { type: Schema.Types.ObjectId, ref: 'Building' },
      departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    },
    recipients: [{ type: String, lowercase: true, trim: true }],
    lastGeneratedAt: { type: Date },
    nextRunAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ScheduledReport = model<IScheduledReport>(
  'ScheduledReport',
  scheduledReportSchema
);
