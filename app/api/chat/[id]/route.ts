import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyAccessToken(token) as any;
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    const { id } = await params;

    await dbConnect();
    const message = await Message.findById(id);
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // Only sender can delete
    if (message.senderId.toString() !== myId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Message.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
