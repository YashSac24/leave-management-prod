import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import Pusher from 'pusher';

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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyAccessToken(token) as any;
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const mongoose = (await import('mongoose')).default;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid Message ID' }, { status: 400 });
    }

    const myId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    const User = (await import('@/models/User')).default;
    const me = await User.findById(myId).select('name').lean() as any;
    const myName = me?.name || 'Unknown';

    const message = await Message.findById(id);
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    let requestedPinned: boolean | undefined;
    try {
      const body = await req.json();
      if (typeof body.pinned === 'boolean') requestedPinned = body.pinned;
    } catch (e) {
      // No body or invalid JSON, fallback to toggle
    }

    const nextPinned = typeof requestedPinned === 'boolean' ? requestedPinned : !message.pinned;
    
    // Only update if state actually changes to avoid unnecessary broadcasts
    if (message.pinned !== nextPinned) {
      message.pinned = nextPinned;
      if (message.pinned) {
        message.pinnedBy = myName;
      } else {
        message.pinnedBy = undefined;
      }
      await message.save();
    }

    // Broadcast the pin toggle
    try {
      const pusher = getPusher();
      if (pusher) {
        const channelPrefix = message.isGroup ? 'group' : 'dm';
        await pusher.trigger(`${channelPrefix}-${message.conversationId}`, 'message-updated', {
          _id: message._id,
          pinned: message.pinned,
          pinnedBy: message.pinnedBy
        });
      }
    } catch (e) {
      console.warn('Pusher broadcast failed:', e);
    }

    return NextResponse.json({ success: true, pinned: message.pinned });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
