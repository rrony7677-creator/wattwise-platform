import { Schema, model, Types, Document } from 'mongoose';

export interface IFloor {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  buildingId: Types.ObjectId;
  floorNumber: number;
  name: string;
  areaSqFt: number;
  createdAt: Date;
  updatedAt: Date;
}

export type FloorDocument = IFloor & Document;

const floorSchema = new Schema<IFloor>(
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
    floorNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    areaSqFt: { type: Number, required: true, min: 50, default: 3500 },
  },
  { timestamps: true }
);

floorSchema.index({ buildingId: 1, floorNumber: 1 }, { unique: true });

export const Floor = model<IFloor>('Floor', floorSchema);
