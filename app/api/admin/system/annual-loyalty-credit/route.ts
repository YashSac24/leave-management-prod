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
    const allowedRoles = ['Administrator', 'Admin', 'HR'];
    if (!decoded || !allowedRoles.includes(decoded.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to trigger system credits' }, { status: 403 });
    }

    await connectDB();

    const currentYear = new Date().getFullYear();
    const users = await User.find({ status: 'Active' });

    let updatedCount = 0;
    const results: any[] = [];

    for (const user of users) {
      // Check if already credited this year
      if (user.lastLoyaltyGrantYear === currentYear) {
        continue;
      }

      const joinedYear = new Date(user.joinedAt).getFullYear();
      const firstEligibleYear = joinedYear + 2;

      // Calculate how many years they missed/are owed
      const lastCreditedYear = user.lastLoyaltyGrantYear ? Math.max(user.lastLoyaltyGrantYear, firstEligibleYear - 1) : firstEligibleYear - 1;
      const yearsOwed = currentYear - lastCreditedYear;

      if (yearsOwed > 0 && currentYear >= firstEligibleYear) {
        const grantAmount = yearsOwed * 2;
        const currentBalance = user.loyaltyLeaveBalance || 0;
        const newBalance = Math.min(10, currentBalance + grantAmount);
        
        await User.updateOne(
          { _id: user._id }, 
          { $set: { loyaltyLeaveBalance: newBalance, lastLoyaltyGrantYear: currentYear } }
        );
        
        updatedCount++;
        results.push({ name: user.name, newBalance: user.loyaltyLeaveBalance, amount: grantAmount });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed loyalty credits for ${currentYear}.`,
      updatedCount,
      details: results
    });

  } catch (error: any) {
    console.error('Annual Credit API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
