import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import LeaveRequest from '@/models/LeaveRequest';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth();
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const cookieStore = await import('next/headers').then(h => h.cookies());
    const token = (await cookieStore).get('accessToken')?.value;
    let requesterRole = '';
    if (token) {
      const { verifyAccessToken } = await import('@/lib/auth');
      const decoded: any = await verifyAccessToken(token);
      if (decoded) requesterRole = decoded.role;
    }

    const users = await User.find({}, 'name email casualLeaveBalance sickLeaveBalance role avatar').lean();
    const filteredUsers = requesterRole === 'Administrator' 
      ? users 
      : users.filter((u: any) => u.role !== 'Administrator');

    // Fetch all requests that OVERLAP with the selected month
    const overlaps = await LeaveRequest.find({ 
      status: { $ne: 'Rejected' },
      startDate: { $lte: endOfMonth },
      endDate: { $gte: startOfMonth }
    }).lean();

    const calculateDaysInMonth = (req: any) => {
      // Find the intersection of leave range and month range
      const reqStart = new Date(req.startDate);
      const reqEnd = new Date(req.endDate);
      
      const intersectionStart = reqStart < startOfMonth ? startOfMonth : reqStart;
      const intersectionEnd = reqEnd > endOfMonth ? endOfMonth : reqEnd;

      if (intersectionStart > intersectionEnd) return 0;

      const diffTime = Math.abs(intersectionEnd.getTime() - intersectionStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      return req.duration === 'Half Day' ? 0.5 : diffDays;
    }

    const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

    const leaveSummary = filteredUsers.map((user: any) => {
      const userRequests = overlaps.filter((req: any) => req.userId === user._id.toString());
      
      let casual = 0, sick = 0, lop = 0;
      
      userRequests.forEach(r => {
        const days = calculateDaysInMonth(r);
        if (r.leaveType === 'Casual') casual += days;
        else if (r.leaveType === 'Sick') sick += days;
        else if (r.leaveType === 'LOP') lop += days;
      });

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        casualBalance: user.casualLeaveBalance ?? 7,
        sickBalance: user.sickLeaveBalance ?? 7,
        casualUsed: casual,
        sickUsed: sick,
        totalLop: lop,
        totalAssigned: (user.casualLeaveBalance ?? 7) + (user.sickLeaveBalance ?? 7)
      };
    });

    return NextResponse.json(leaveSummary);
  } catch (error: any) {
    console.error('Leave summary API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
