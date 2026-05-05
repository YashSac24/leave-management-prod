import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import Pusher from 'pusher';

export const dynamic = 'force-dynamic';

// Lazy init — don't crash on module load if keys missing
function getPusher() {
  if (!process.env.PUSHER_APP_ID || process.env.PUSHER_APP_ID === 'your_app_id') return null;
  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true
  });
}

async function getDecoded() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;
  return await verifyAccessToken(token) as any;
}

function makeConversationId(id1: string, id2: string) {
  return [id1, id2].sort().join('-');
}

// GET /api/chat?with=otherUserId — fetch DM history
export async function GET(req: Request) {
  try {
    const decoded = await getDecoded();
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get('with');
    const groupId = searchParams.get('groupId');
    if (!withUserId && !groupId) return NextResponse.json({ error: 'Missing target' }, { status: 400 });

    const myId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    const conversationId = groupId || makeConversationId(myId, withUserId!);

    await dbConnect();

    if (groupId) {
      const Group = (await import('@/models/Group')).default;
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(myId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }
    const { Types } = await import('mongoose');
    const isValidId = (id: string) => Types.ObjectId.isValid(id);

    const query = groupId ? { conversationId: groupId } : {
      $or: [
        { senderId: myId, receiverId: withUserId },
        { senderId: withUserId, receiverId: myId },
        // Try with ObjectIds just in case
        ...(isValidId(myId) && isValidId(withUserId!) ? [
          { senderId: new Types.ObjectId(myId), receiverId: new Types.ObjectId(withUserId!) },
          { senderId: new Types.ObjectId(withUserId!), receiverId: new Types.ObjectId(myId) }
        ] : [])
      ]
    };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    // Mark messages from other user as read
    await Message.updateMany(
      { conversationId, receiverId: myId, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({ success: true, messages: messages.reverse() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/chat — send DM { receiverId, text }
export async function POST(req: Request) {
  try {
    const decoded = await getDecoded();
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { receiverId, text, replyTo, isGroup } = await req.json();

    if (!receiverId) return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });
    if (!text?.trim()) return NextResponse.json({ error: 'Message empty' }, { status: 400 });
    if (text.length > 1000) return NextResponse.json({ error: 'Too long (max 1000)' }, { status: 400 });

    const myId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    
    let conversationId: string;
    if (isGroup) {
      const Group = (await import('@/models/Group')).default;
      const group = await Group.findById(receiverId);
      if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      if (!group.members.includes(myId)) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
      conversationId = receiverId;
    } else {
      conversationId = makeConversationId(myId, receiverId);
    }

    const sender = await User.findById(myId).select('name avatar');
    if (!sender) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const message = await Message.create({
      conversationId,
      senderId: myId,
      receiverId,
      senderName: sender.name,
      senderAvatar: sender.avatar || '',
      text: text.trim(),
      isGroup: !!isGroup,
      // Self-messages are always read immediately
      read: myId === receiverId,
      replyTo: (replyTo && replyTo._id) ? {
        _id: replyTo._id.toString(),
        text: replyTo.text,
        senderName: replyTo.senderName
      } : undefined
    });

    const payload = {
      _id: message._id,
      conversationId,
      senderId: myId,
      receiverId,
      senderName: sender.name,
      senderAvatar: sender.avatar || '',
      text: message.text,
      createdAt: message.createdAt,
      read: false,
      pinned: false,
      isGroup: !!isGroup,
      replyTo: message.replyTo || undefined
    };

    // Broadcast via Pusher (non-fatal — message saved to DB regardless)
    try {
      const pusher = getPusher();
      if (pusher) {
        if (isGroup) {
          const Group = (await import('@/models/Group')).default;
          const group = await Group.findById(receiverId);
          await pusher.trigger(`group-${conversationId}`, 'new-message', payload);
          if (group) {
            group.members.forEach((mId: string) => {
              if (mId !== myId) pusher.trigger(`private-user-${mId}`, 'new-dm', payload);
            });
          }
        } else {
          await Promise.allSettled([
            pusher.trigger(`dm-${conversationId}`, 'new-message', payload),
            pusher.trigger(`private-user-${receiverId}`, 'new-dm', payload)
          ]);
        }
        console.log(`[Pusher] Broadcasted ${isGroup ? 'group' : 'dm'} message`);
      } else {
        console.warn('[Pusher] Skipping broadcast: PUSHER_APP_ID is missing or server not restarted.');
      }
    } catch (pusherErr) {
      console.warn('Pusher broadcast failed (keys not configured?):', pusherErr);
    }

    return NextResponse.json({ success: true, message: payload });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
