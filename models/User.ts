import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: 'Administrator' | 'TL' | 'Admin' | 'User' | 'HR';
  designation: string;
  status: 'Active' | 'Inactive';
  avatar: string;
  joinedAt: Date;
  casualLeaveBalance: number;
  sickLeaveBalance: number;
  loyaltyLeaveBalance: number;
  earnedLeaveBalance: number;
  lastLoyaltyGrantYear: number;
  workingDaysCounter: number;
  lastEarnedLeaveUpdate: Date;
  refreshToken?: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  lastSeen: Date;
  // Privacy & Preferences
  publicProfile: boolean;
  showLeaveBalance: boolean;
  notifyLeaveDecisions: boolean;
  notifyWeeklyDigest: boolean;
  notifyNewHolidays: boolean;
  browserNotifications: boolean;
  timezone: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Administrator', 'TL', 'Admin', 'User', 'HR'], 
    default: 'User' 
  },
  designation: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  avatar: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now },
  casualLeaveBalance: { type: Number, default: 7.0, min: 0 },
  sickLeaveBalance: { type: Number, default: 7.0, min: 0 },
  loyaltyLeaveBalance: { type: Number, default: 0, min: 0 },
  earnedLeaveBalance: { type: Number, default: 0, min: 0 },
  lastLoyaltyGrantYear: { type: Number, default: 0 },
  workingDaysCounter: { type: Number, default: 0 },
  lastEarnedLeaveUpdate: { type: Date, default: Date.now },
  refreshToken: { type: String },
  failedLoginAttempts: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  
  // Privacy & Preferences
  publicProfile: { type: Boolean, default: true },
  showLeaveBalance: { type: Boolean, default: false },
  notifyLeaveDecisions: { type: Boolean, default: true },
  notifyWeeklyDigest: { type: Boolean, default: true },
  notifyNewHolidays: { type: Boolean, default: false },
  browserNotifications: { type: Boolean, default: true },
  timezone: { type: String, default: 'asia' }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Force delete model to avoid caching issues during dev with new fields
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
