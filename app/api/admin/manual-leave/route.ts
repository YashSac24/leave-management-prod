import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LeaveRequest from '@/models/LeaveRequest';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const decoded: any = await verifyAccessToken(token);
    
    // Only Admin/HR/Administrator can do this
    if (!decoded || !['Administrator', 'Admin', 'HR'].includes(decoded.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { userId, leaveType, duration, halfDayOption, startDate, endDate, reason, exactDeduction } = await request.json();

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Validate overlap
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    // Check for overlapping leaves for the same user (not rejected)
    const existingLeaves = await LeaveRequest.find({
      userId,
      status: { $ne: 'Rejected' },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    for (const existing of existingLeaves) {
      if (existing.duration === 'Full Day' || duration === 'Full Day') {
        return NextResponse.json({ success: false, error: 'A full-day leave request already exists or overlaps with these dates' }, { status: 400 });
      }

      const existingDate = new Date(existing.startDate).toISOString().split('T')[0];
      const newDate = start.toISOString().split('T')[0];
      
      if (existingDate === newDate && existing.halfDayOption === halfDayOption) {
        return NextResponse.json({ success: false, error: `A half-day leave (${halfDayOption}) already exists for this date` }, { status: 400 });
      }
    }

    // Process Deduction if applicable
    const deductibleTypes = ['Casual', 'Sick', 'Loyalty', 'Earned'];
    if (deductibleTypes.includes(leaveType) && exactDeduction > 0) {
      let balanceField = '';
      switch(leaveType) {
        case 'Sick': balanceField = 'sickLeaveBalance'; break;
        case 'Casual': balanceField = 'casualLeaveBalance'; break;
        case 'Loyalty': balanceField = 'loyaltyLeaveBalance'; break;
        case 'Earned': balanceField = 'earnedLeaveBalance'; break;
      }

      if (balanceField) {
        const currentBalance = Number(user.get(balanceField) ?? 0);
        if (currentBalance < exactDeduction) {
          return NextResponse.json({ success: false, error: `Insufficient ${leaveType} balance. Available: ${currentBalance}, Required: ${exactDeduction}` }, { status: 400 });
        }
        user.set(balanceField, parseFloat((currentBalance - exactDeduction).toFixed(2)));
        await user.save();
      }
    }

    // Insert Approved Leave
    const newLeave = await LeaveRequest.create({
      userId: user._id,
      userName: user.name,
      leaveType,
      duration,
      halfDayOption: halfDayOption || 'None',
      startDate: start,
      endDate: end,
      reason: reason || 'Manual Admin Entry',
      status: 'Approved'
    });

    return NextResponse.json({ success: true, data: newLeave });
  } catch (error: any) {
    console.error('MANUAL_LEAVE_ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
