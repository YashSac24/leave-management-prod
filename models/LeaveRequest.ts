import mongoose, { Schema, model, models } from 'mongoose';

const LeaveRequestSchema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: 'Employee' },
    leaveType: { 
      type: String, 
      enum: ['Casual', 'Sick', 'LOP', '', 'Loyalty', 'Earned'], 
      default: 'Casual' 
    },
    duration: {
      type: String,
      enum: ['Full Day', 'Half Day'],
      default: 'Full Day'
    },
    halfDayOption: {
      type: String,
      enum: ['First Half', 'Second Half', 'None'],
      default: 'None'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['Pending', 'Approved', 'Rejected'], 
      default: 'Pending' 
    },
    comments: { type: String },
  },
  { timestamps: true }
);

// Force delete model to avoid caching issues during dev with enums
if (models.LeaveRequest) {
  delete models.LeaveRequest;
}

const LeaveRequest = model('LeaveRequest', LeaveRequestSchema);

export default LeaveRequest;
