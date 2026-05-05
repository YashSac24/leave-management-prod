import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import Group from '@/models/Group';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded: any = await verifyAccessToken(token as string);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });

    const userId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;

    // 1. Get my groups
    const myGroups = await Group.find({ members: userId }).select('_id');
    const myGroupIds = myGroups.map(g => g._id.toString());

    // 2. Get unread counts
    // For DMs: receiverId is me
    // For Groups: conversationId is in myGroupIds AND (we'd need a seen mark per user, but for now we'll check receiverId === userId)
    const unreadMap: Record<string, number> = {};
    const unreadAgg = await Message.aggregate([
      { $match: { receiverId: userId, read: false, $expr: { $ne: ['$senderId', '$receiverId'] } } },
      { $group: { _id: { $cond: [{ $eq: ["$isGroup", true] }, "$conversationId", "$senderId"] }, count: { $sum: 1 } } }
    ]);
    unreadAgg.forEach(item => { unreadMap[item._id] = item.count; });

    // 3. Get last messages
    const lastMsgMap: Record<string, string> = {};
    const lastMsgTextMap: Record<string, string> = {};

    // Find all conversation IDs where I am involved
    // Involved means: 
    // - I am sender
    // - I am receiver (for DMs)
    // - The conversationId is one of my groups
    const convIds = await Message.distinct('conversationId', {
      $or: [
        { senderId: userId },
        { receiverId: userId },
        { conversationId: { $in: myGroupIds } }
      ]
    });

    for (const cid of convIds) {
      const lastMsg = await Message.findOne({ conversationId: cid })
        .sort({ createdAt: -1 })
        .select('createdAt text senderName isGroup senderId receiverId');

      if (lastMsg) {
        const msgSenderId = lastMsg.senderId.toString();
        const msgReceiverId = lastMsg.receiverId.toString();
        
        let roomId = cid;
        if (!lastMsg.isGroup) {
          // For DMs, the roomId in the sidebar is ALWAYS the other person's ID
          roomId = msgSenderId === userId ? msgReceiverId : msgSenderId;
        }

        lastMsgMap[roomId] = lastMsg.createdAt.toISOString();
        const prefix = lastMsg.isGroup ? `${lastMsg.senderName}: ` : '';
        const content = lastMsg.text.startsWith('STICKER:') ? 'Sent a sticker' : lastMsg.text;
        lastMsgTextMap[roomId] = prefix + content;
      }
    }

    return NextResponse.json({ success: true, unreadMap, lastMsgMap, lastMsgTextMap });
  } catch (error: any) {
    console.error('Error in unread API:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
