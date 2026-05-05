import mongoose from 'mongoose';

export interface IMessage extends mongoose.Document {
  conversationId: string; // [userId1, userId2].sort().join('-')
  senderId: string;
  receiverId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  pinned: boolean;
  pinnedBy?: string;
  isGroup?: boolean;
  replyTo?: {
    _id: string;
    text: string;
    senderName: string;
  };
}

const MessageSchema = new mongoose.Schema<IMessage>({
  conversationId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: '' },
  text: { type: String, required: true, maxlength: 1000 },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  pinned: { type: Boolean, default: false },
  pinnedBy: { type: String },
  isGroup: { type: Boolean, default: false },
  replyTo: {
    _id: { type: String },
    text: { type: String },
    senderName: { type: String }
  }
}, { minimize: false });

// TTL: auto-delete messages older than 90 days
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).Message;
}
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
