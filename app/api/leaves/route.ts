import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LeaveRequest from '@/models/LeaveRequest';
import User from '@/models/User';
import Holiday from '@/models/Holiday';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const decoded: any = await verifyAccessToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });

    const userId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    const leaves = await LeaveRequest.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: leaves });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    
    if (!token) {
      console.log('LEAVE_POST: No token found in cookies');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded: any = await verifyAccessToken(token);
    if (!decoded) {
      console.log('LEAVE_POST: Token verification failed');
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    const userId = typeof decoded.userId === 'object' ? decoded.userId.toString() : decoded.userId;
    const user = await User.findById(userId);
    if (!user) {
      console.log('LEAVE_POST: User not found for ID:', userId);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { leaveType, duration, startDate, endDate, reason, halfDayOption } = body;

    // Normalize dates to start and end of day for precise overlap checking
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    // Check for overlapping leaves for the same user (not rejected)
    // Check for overlapping leaves for the same user (not rejected)
    const existingLeaves = await LeaveRequest.find({
      userId,
      status: { $ne: 'Rejected' },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    for (const existing of existingLeaves) {
      // If either is a full day, it's a total overlap
      if (existing.duration === 'Full Day' || duration === 'Full Day') {
        return NextResponse.json({ 
          success: false, 
          error: 'A full-day leave request already exists or overlaps with these dates' 
        }, { status: 400 });
      }

      // If both are half days, check if they are on the same date and same half
      const existingDate = new Date(existing.startDate).toISOString().split('T')[0];
      const newDate = start.toISOString().split('T')[0];
      
      if (existingDate === newDate && existing.halfDayOption === halfDayOption) {
        return NextResponse.json({ 
          success: false, 
          error: `A half-day leave (${halfDayOption}) already exists for this date` 
        }, { status: 400 });
      }
    }

    // Fetch holidays for deduction calculation
    const holidays = await Holiday.find({});
    const holidayDates = holidays.map(h => new Date(h.date).toISOString().split('T')[0]);

    // Validation: Start and End shouldn't be Sunday or Holiday
    const isRestricted = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      return date.getUTCDay() === 0 || holidayDates.includes(dateStr);
    };

    if (isRestricted(start) || isRestricted(end)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Leave cannot start or end on a Sunday or Holiday' 
      }, { status: 400 });
    }

    // Calculate deduction skipping weekends and holidays
    let deduction = 0;
    if (duration === 'Half Day') {
      deduction = 0.5;
    } else {
      let count = 0;
      let cur = new Date(start);
      while (cur <= end) {
        if (!isRestricted(cur)) {
          count++;
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      deduction = count;
    }

    if (deduction === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'The selected date range contains no working days' 
      }, { status: 400 });
    }

    // Check and deduct balance
    const deductibleTypes = ['Casual', 'Sick', 'Loyalty', 'Earned'];
    if (deductibleTypes.includes(leaveType)) {
        let balanceField = '';
        switch(leaveType) {
          case 'Sick': balanceField = 'sickLeaveBalance'; break;
          case 'Casual': balanceField = 'casualLeaveBalance'; break;
          case 'Loyalty': balanceField = 'loyaltyLeaveBalance'; break;
          case 'Earned': balanceField = 'earnedLeaveBalance'; break;
        }

        const currentBalance = Number(user.get(balanceField) ?? 0);

        if (currentBalance < deduction) {
          return NextResponse.json({ 
            success: false, 
            error: `Insufficient ${leaveType} leave balance. Required: ${deduction}, Available: ${currentBalance}` 
          }, { status: 400 });
        }

        // Create request
        const leave = await LeaveRequest.create({
          userId,
          userName: user.name,
          leaveType,
          duration,
          halfDayOption: duration === 'Half Day' ? (halfDayOption || 'First Half') : 'None',
          startDate: start,
          endDate: end,
          reason,
          status: 'Approved'
        });

        // Deduct balance
        user.set(balanceField, parseFloat((currentBalance - deduction).toFixed(2)));
        await user.save();

        return NextResponse.json({ 
          success: true, 
          data: leave, 
          remainingBalance: user.get(balanceField),
          deducted: deduction 
        }, { status: 201 });
    } else {
        // LOP or other types don't deduct from balance
        const leave = await LeaveRequest.create({
          userId,
          userName: user.name,
          leaveType,
          duration,
          halfDayOption: duration === 'Half Day' ? (halfDayOption || 'First Half') : 'None',
          startDate: start,
          endDate: end,
          reason,
          status: 'Approved'
        });

        return NextResponse.json({ 
          success: true, 
          data: leave, 
          deducted: 0 
        }, { status: 201 });
    }
  } catch (error: any) {
    console.error('LEAVE_POST_ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
