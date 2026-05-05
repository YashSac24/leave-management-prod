import mongoose, { Schema, model, models } from 'mongoose';

export interface IHoliday {
  _id?: string;
  name: string;
  date: Date;
  type: 'Public' | 'Optional' | 'Company';
  description?: string;
}

const HolidaySchema = new Schema<IHoliday>({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['Public', 'Optional', 'Company'], default: 'Public' },
  description: { type: String },
}, { timestamps: true });

const Holiday = models.Holiday || model('Holiday', HolidaySchema);

export default Holiday;
