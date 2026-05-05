import mongoose from 'mongoose';

export interface IGroup extends mongoose.Document {
  name: string;
  description?: string;
  avatar?: string;
  adminId: string;
  members: string[]; // Array of User IDs
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
}

const GroupSchema = new mongoose.Schema<IGroup>({
  name: { type: String, required: true },
  description: { type: String },
  avatar: { type: String },
  adminId: { type: String, required: true },
  members: [{ type: String, required: true }],
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Group = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
export default Group;
