import { Schema, model, Types, Document } from 'mongoose';

export type BuildingType = 'Office' | 'Factory' | 'Academic' | 'DataCenter' | 'Warehouse';

export interface IBuilding {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  address: string;
  buildingType: BuildingType;
  totalFloors: number;
  areaSqFt: number;
  baselineDailyKwh: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BuildingDocument = IBuilding & Document;

const buildingSchema = new Schema<IBuilding>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    buildingType: {
      type: String,
      enum: ['Office', 'Factory', 'Academic', 'DataCenter', 'Warehouse'],
      default: 'Office',
    },
    totalFloors: { type: Number, required: true, min: 1, default: 1 },
    areaSqFt: { type: Number, required: true, min: 100, default: 10000 },
    baselineDailyKwh: { type: Number, required: true, min: 0, default: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

buildingSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Building = model<IBuilding>('Building', buildingSchema);
