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
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });

    const userId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    const body = await req.json();

    const allowedUpdates = [
      'name', 
      'timezone', 
      'publicProfile', 
      'showLeaveBalance', 
      'notifyLeaveDecisions', 
      'notifyWeeklyDigest', 
      'notifyNewHolidays',
      'browserNotifications',
      'avatar'
    ];
    
    const updates: any = {};
    for (const key of Object.keys(body)) {
      if (allowedUpdates.includes(key)) {
        updates[key] = body[key];
      }
    }

    if (updates.name !== undefined && (!updates.name || !updates.name.trim())) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    const maxAge = 365 * 24 * 60 * 60; // Max cookie age (1 year)
    
    // Some values might need to just be checked in cookies if we want it fast, but we'll save to DB
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userObj = user.toObject();
    const { password, refreshToken, failedLoginAttempts, isLocked, ...safeUser } = userObj;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
