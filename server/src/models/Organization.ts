import { Schema, model, Types, Document } from 'mongoose';

export type IndustryType =
  | 'Commercial'
  | 'Manufacturing'
  | 'University'
  | 'Healthcare'
  | 'Technology';

export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  code: string;
  industry: IndustryType;
  address: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  baseTariffPerKwh: number;
  peakTariffPerKwh: number;
  carbonFactorKgPerKwh: number;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationDocument = IOrganization & Document;

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    industry: {
      type: String,
      enum: ['Commercial', 'Manufacturing', 'University', 'Healthcare', 'Technology'],
      default: 'Commercial',
    },
    address: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, default: '' },
    currency: { type: String, default: 'USD' },
    baseTariffPerKwh: { type: Number, required: true, default: 0.14, min: 0 },
    peakTariffPerKwh: { type: Number, required: true, default: 0.22, min: 0 },
    carbonFactorKgPerKwh: { type: Number, required: true, default: 0.42, min: 0 },
    timezone: { type: String, default: 'UTC' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Organization = model<IOrganization>('Organization', organizationSchema);
