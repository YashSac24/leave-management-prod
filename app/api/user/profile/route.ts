import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { updateLeaveBalances } from '@/lib/leaveCalculations';

export async function GET() {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded: any = await verifyAccessToken(token as string);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });

    const userId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    
    // Update leave balances before fetching user data
    await updateLeaveBalances(userId);
    
    // Update lastSeen and fetch user data
    const user = await User.findByIdAndUpdate(userId, { lastSeen: new Date() }, { new: true });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        name: user.name,
        casualLeaveBalance: user.casualLeaveBalance,
        sickLeaveBalance: user.sickLeaveBalance,
        loyaltyLeaveBalance: user.loyaltyLeaveBalance,
        earnedLeaveBalance: user.earnedLeaveBalance,
        joinedAt: user.joinedAt,
        timezone: user.get('timezone') || 'asia',
        publicProfile: user.get('publicProfile') !== false, // default true
        showLeaveBalance: user.get('showLeaveBalance') === true, // default false
        notifyLeaveDecisions: user.get('notifyLeaveDecisions') !== false,
        notifyWeeklyDigest: user.get('notifyWeeklyDigest') !== false,
        notifyNewHolidays: user.get('notifyNewHolidays') === true,
        browserNotifications: user.get('browserNotifications') !== false,
        avatar: user.avatar || '',
        designation: user.designation || ''
      } 
    });
  } catch (error: any) {
    console.error('PROFILE_API_ERROR:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded: any = await verifyAccessToken(token as string);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });

    const { role } = await req.json();

    const userId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
