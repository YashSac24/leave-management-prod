import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded: any = await verifyAccessToken(token as string);
    if (!decoded || !['Administrator', 'Admin', 'HR'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, type, earnedLeaveBalance, workingDaysCounter, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'update_balance') {
      user.earnedLeaveBalance = Number(earnedLeaveBalance);
      user.workingDaysCounter = Number(workingDaysCounter);
      // We don't change lastEarnedLeaveUpdate here to preserve the log timeline unless they want to reset it
      await user.save();
    }

    return NextResponse.json({ success: true, user });

  } catch (error: any) {
    console.error('Earned leave manual edit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
