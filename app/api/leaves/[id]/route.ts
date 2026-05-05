import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LeaveRequest from '@/models/LeaveRequest';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 });
    }

    const User = (await import('@/models/User')).default;
    const user = await User.findById(leave.userId);
    
    if (user) {
        // Fetch holidays for deduction calculation
        const Holiday = (await import('@/models/Holiday')).default;
        const holidays = await Holiday.find({});
        const holidayDates = holidays.map(h => new Date(h.date).toISOString().split('T')[0]);

        const isRestricted = (date: Date) => {
            const dateStr = date.toISOString().split('T')[0];
            return date.getUTCDay() === 0 || holidayDates.includes(dateStr);
        };

        let refund = 0;
        if (leave.duration === 'Half Day') {
            refund = 0.5;
        } else {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            
            let count = 0;
            let cur = new Date(start);
            while (cur <= end) {
                if (!isRestricted(cur)) {
                    count++;
                }
                cur.setUTCDate(cur.getUTCDate() + 1);
            }
            refund = count;
        }

        // Refund all deductible leave types
        let balanceField = '';
        switch(leave.leaveType) {
          case 'Sick': balanceField = 'sickLeaveBalance'; break;
          case 'Casual': balanceField = 'casualLeaveBalance'; break;
          case 'Loyalty': balanceField = 'loyaltyLeaveBalance'; break;
          case 'Earned': balanceField = 'earnedLeaveBalance'; break;
        }

        if (balanceField) {
            const currentBalance = Number(user.get(balanceField) ?? 0);
            user.set(balanceField, parseFloat((currentBalance + refund).toFixed(2)));
            await user.save();
        }
    }

    await LeaveRequest.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Leave request deleted and balance restored' });
  } catch (error: any) {
    console.error('REFUND_ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
