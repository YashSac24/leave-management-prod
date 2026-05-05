import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeaveRequest from '@/models/LeaveRequest';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB();
    const { userId } = await params;

    // Fetch all leave requests for the user, sorted by date (newest first)
    const leaves = await LeaveRequest.find({ userId })
      .sort({ startDate: -1 })
      .lean();

    return NextResponse.json({ success: true, leaves });
  } catch (error: any) {
    console.error('Fetch user leaves error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user leaves' }, { status: 500 });
  }
}
