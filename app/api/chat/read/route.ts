import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded: any = await verifyAccessToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const myId = decoded.userId;
    const { contactId, isGroup } = await req.json();

    if (!contactId) return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });

    const now = new Date();

    if (isGroup) {
        // For groups, we might want a more complex structure, 
        // but for now let's just mark read for the current user's perspective if we had that logic.
        // Simple version: mark all messages in this group conversation where current user is NOT sender as read?
        // Actually, the current Message schema doesn't have a per-user read list for groups.
        // Let's stick to DMs for "Seen" status for now.
    } else {
        const conversationId = [myId, contactId].sort().join('-');
        
        // Mark all messages SENT BY contact TO me as read
        await Message.updateMany(
            { conversationId, receiverId: myId, read: false },
            { $set: { read: true, readAt: now } }
        );

        // Notify the SENDER that their messages were read
        await pusher.trigger(`dm-${conversationId}`, 'messages-read', {
            readerId: myId,
            readAt: now
        });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
