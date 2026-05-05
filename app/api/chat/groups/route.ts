import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Group from '../../../../models/Group';
import { verifyAccessToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';

async function getDecoded() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;
  return await verifyAccessToken(token) as any;
}

export async function GET() {
  try {
    const decoded = await getDecoded();
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;

    await dbConnect();
    // Find all groups where I am a member
    const groups = await Group.find({ members: myId }).sort({ lastMessageAt: -1, createdAt: -1 });

    return NextResponse.json({ success: true, groups });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = await getDecoded();
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;

    await dbConnect();
    const { name, members, description, avatar } = await req.json();

    if (!name) return NextResponse.json({ error: 'Group name required' }, { status: 400 });

    // Admin is automatically a member
    const allMembers = Array.from(new Set([...(members || []), myId]));

    const group = await Group.create({
      name,
      description,
      avatar,
      adminId: myId,
      members: allMembers
    });

    return NextResponse.json({ success: true, group });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
