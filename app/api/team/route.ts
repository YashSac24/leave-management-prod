import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded: any = await verifyAccessToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const requesterId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    const requesterRole = decoded.role;

    // Fetch team members: Active + PublicProfile must be true (or not set, default ON)
    const query: any = { 
      _id: { $ne: requesterId }, // Exclude self
      status: 'Active', 
      publicProfile: { $ne: false } 
    };

    // SECURITY: Non-Administrators cannot see Administrator profiles in the directory
    if (requesterRole !== 'Administrator') {
      query.role = { $ne: 'Administrator' };
    }

    const fields = 'name email designation avatar joinedAt role lastSeen';

    const members = await User.find(query, fields)
    .sort({ name: 1 });

    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
