import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { updateLeaveBalances } from '@/lib/leaveCalculations';

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

    // Step 1: Reset all users to start of 2026 with 0 balance
    await User.updateMany(
      {}, 
      { 
        $set: { 
          lastEarnedLeaveUpdate: new Date('2026-01-01T00:00:00Z'),
          earnedLeaveBalance: 0,
          workingDaysCounter: 0
        } 
      }
    );

    // Step 2: Fetch all active users and force a calculation loop
    const users = await User.find({ status: 'Active' });
    
    // We run them in sequence or small batches to avoid overloading the DB
    for (const user of users) {
      await updateLeaveBalances(user._id.toString());
    }

    return NextResponse.json({ 
      success: true, 
      message: `Success! Recalculated Earned Leaves for ${users.length} active users from Jan 1st, 2026 to today.`,
      modifiedCount: users.length
    });

  } catch (error: any) {
    console.error('Recalculate reset error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
