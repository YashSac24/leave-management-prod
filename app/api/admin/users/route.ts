import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function checkAdmin(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;
  
  const payload = await verifyAccessToken(token);
  if (!payload || !['Administrator', 'HR', 'Admin'].includes(payload.role as string)) {
    return null;
  }
  return payload;
}

export async function GET(req: Request) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    
    // Filter out Administrator profiles if the requester is not an Administrator
    const query: any = {};
    if (admin.role !== 'Administrator') {
      query.role = { $ne: 'Administrator' };
    }

    const users = await User.find(query).select('-password -refreshToken').sort({ createdAt: -1 });
    
    // Fetch leave stats for each user to show Total Earned vs Taken
    const LeaveRequest = (await import('@/models/LeaveRequest')).default;
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const taken = await LeaveRequest.find({
        userId: u._id.toString(),
        leaveType: 'Earned',
        status: 'Approved'
      });
      const totalTaken = taken.reduce((acc, curr) => acc + (curr.duration === 'Half Day' ? 0.5 : 1), 0);
      return {
        ...u.toObject(),
        earnedLeaveTaken: totalTaken,
        earnedLeaveTotal: u.earnedLeaveBalance + totalTaken
      };
    }));

    return NextResponse.json({ success: true, users: usersWithStats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { name, email, password, role, designation, casualLeaveBalance, sickLeaveBalance, loyaltyLeaveBalance, earnedLeaveBalance, joinedAt } = await req.json();
    
    // Security check: Only Administrators can create other Administrators
    if (role === 'Administrator' && admin.role !== 'Administrator') {
      return NextResponse.json({ success: false, error: 'Only Administrators can create Administrator accounts' }, { status: 403 });
    }

    if (!name?.trim() || !email || !password) return NextResponse.json({ success: false, error: 'Name, email, and password are required' }, { status: 400 });

    await dbConnect();
    const existingUser = await User.findOne({ email });
    if (existingUser) return NextResponse.json({ success: false, error: 'User already exists' }, { status: 400 });

    const user = await User.create({ 
        name, 
        email, 
        password, 
        role, 
        designation,
        joinedAt: joinedAt || new Date(),
        casualLeaveBalance: casualLeaveBalance ?? 7.0,
        sickLeaveBalance: sickLeaveBalance ?? 7.0,
        loyaltyLeaveBalance: loyaltyLeaveBalance ?? 0,
        earnedLeaveBalance: earnedLeaveBalance ?? 0,
        lastLoyaltyGrantYear: loyaltyLeaveBalance > 0 ? new Date().getFullYear() : 0
    });
    
    return NextResponse.json({ 
        success: true, 
        user: { 
            _id: user._id, 
            name, 
            email, 
            role, 
            designation,
            casualLeaveBalance: user.casualLeaveBalance,
            sickLeaveBalance: user.sickLeaveBalance,
            loyaltyLeaveBalance: user.loyaltyLeaveBalance,
            earnedLeaveBalance: user.earnedLeaveBalance
        } 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userId, ...updates } = body;
    
    if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    if (updates.name !== undefined && !updates.name.trim()) return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });

    await dbConnect();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Security check: If target is Administrator, requester must be Administrator
    if (user.role === 'Administrator' && admin.role !== 'Administrator') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to modify an Administrator' }, { status: 403 });
    }

    // Security check: Prevent non-Administrators from promoting someone to Administrator
    if (updates.role === 'Administrator' && admin.role !== 'Administrator') {
        return NextResponse.json({ success: false, error: 'Only Administrators can grant Administrator role' }, { status: 403 });
    }

    // Separate password if it exists and is not empty
    if (updates.password === '' || updates.password === undefined || updates.password === null) {
      delete updates.password;
    }

    // Whitelist: prevent injection of sensitive internal fields
    const allowedAdminUpdates = ['name', 'email', 'password', 'role', 'designation', 'status',
      'casualLeaveBalance', 'sickLeaveBalance', 'loyaltyLeaveBalance', 'earnedLeaveBalance',
      'joinedAt', 'workingDaysCounter', 'avatar', 'lastLoyaltyGrantYear'];

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (allowedAdminUpdates.includes(key) && updates[key] !== undefined) {
        user.set(key, updates[key]);
      }
    });

    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        casualLeaveBalance: user.casualLeaveBalance,
        sickLeaveBalance: user.sickLeaveBalance
      }
    });
  } catch (err: any) {
    console.error('USER_PATCH_ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });

    await dbConnect();
    const targetUser = await User.findById(userId);
    if (!targetUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const requesterRole = admin.role as string;
    const targetRole = targetUser.role as string;

    let canDelete = false;
    if (requesterRole === 'Administrator') {
        if (targetRole !== 'Administrator') canDelete = true;
    } else if (requesterRole === 'Admin') {
        if (['HR', 'TL', 'User'].includes(targetRole)) canDelete = true;
    } else if (requesterRole === 'HR') {
        if (['TL', 'User'].includes(targetRole) || targetRole === 'User') canDelete = true;
    }

    if (!canDelete) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to delete this user' }, { status: 403 });
    }

    await User.findByIdAndDelete(userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


