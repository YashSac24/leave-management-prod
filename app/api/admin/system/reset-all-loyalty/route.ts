import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = await verifyAccessToken(token);
    const allowedRoles = ['Administrator', 'Admin'];
    if (!decoded || !allowedRoles.includes(decoded.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    // Reset all active users
    const result = await User.updateMany(
      { status: 'Active' },
      { 
        $set: { 
          loyaltyLeaveBalance: 0,
          lastLoyaltyGrantYear: 0 
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: `Successfully reset loyalty data for ${result.modifiedCount} users.`,
      count: result.modifiedCount
    });

  } catch (error: any) {
    console.error('Bulk Reset API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
