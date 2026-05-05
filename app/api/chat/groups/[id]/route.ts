// Forced rebuild breaker - v2
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getDecoded() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;
  return await verifyAccessToken(token) as any;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = await getDecoded();
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { avatar, name, description, members } = await req.json();

    await dbConnect();
    const group = await Group.findById(id);

    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const myId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    if (group.adminId !== myId) {
      return NextResponse.json({ error: 'Only administrators can update group info' }, { status: 403 });
    }

    if (avatar !== undefined) group.avatar = avatar;
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (members !== undefined) group.members = members;

    await group.save();

    return NextResponse.json({ success: true, group });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = await getDecoded();
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();
    const group = await Group.findById(id);

    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const myId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    if (group.adminId !== myId) {
      return NextResponse.json({ error: 'Only administrators can delete the group' }, { status: 403 });
    }

    await Group.findByIdAndDelete(id);

    // Optional: Delete all messages associated with this group
    // await Message.deleteMany({ conversationId: id, isGroup: true });

    return NextResponse.json({ success: true, message: 'Group deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
